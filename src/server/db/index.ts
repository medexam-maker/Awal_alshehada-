import dotenv from 'dotenv';
dotenv.config({ override: true });
import { Pool, PoolConfig } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import path from 'path';
import fs from 'fs';
import { hashPassword } from '../lib/password';

let pgliteInstance: PGlite | null = null;

class PGlitePoolWrapper {
  private pglite: PGlite;
  constructor(pglite: PGlite) {
    this.pglite = pglite;
  }
  async query(text: string, params?: any[]) {
    const res = await this.pglite.query(text, params);
    return {
      rows: res.rows,
      rowCount: res.rows.length,
      command: res.command || 'SELECT',
      fields: res.fields || [],
    };
  }
  async connect() {
    return {
      query: (text: string, params?: any[]) => this.query(text, params),
      release: () => {},
      begin: async () => { await this.pglite.query('BEGIN'); },
      commit: async () => { await this.pglite.query('COMMIT'); },
      rollback: async () => { await this.pglite.query('ROLLBACK'); },
    };
  }
  async end() {
    await this.pglite.close();
  }
}

async function initPgliteDb(): Promise<PGlitePoolWrapper> {
  const dataDir = path.resolve(process.cwd(), '.data/pglite');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const db = new PGlite(dataDir);
  await db.waitReady;

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      google_id TEXT UNIQUE,
      phone TEXT,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role TEXT NOT NULL DEFAULT 'student',
      status TEXT NOT NULL DEFAULT 'active',
      token_version INT DEFAULT 1,
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      session_id TEXT,
      session_created_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS refresh_replay_buffer (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      old_token_hash TEXT NOT NULL,
      user_id TEXT NOT NULL,
      encrypted_raw_replacement TEXT NOT NULL,
      encryption_iv TEXT NOT NULL,
      encryption_tag TEXT NOT NULL,
      encryption_key_id TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE refresh_replay_buffer ADD COLUMN IF NOT EXISTS encrypted_raw_replacement TEXT;
    ALTER TABLE refresh_replay_buffer ADD COLUMN IF NOT EXISTS encryption_iv TEXT;
    ALTER TABLE refresh_replay_buffer ADD COLUMN IF NOT EXISTS encryption_tag TEXT;
    ALTER TABLE refresh_replay_buffer ADD COLUMN IF NOT EXISTS encryption_key_id TEXT;
    ALTER TABLE refresh_replay_buffer ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ;

    CREATE TABLE IF NOT EXISTS auth_operation_log (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      operation_id TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      recovery_secret_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_auth_op_user_operation UNIQUE (user_id, operation_id)
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name_ar TEXT NOT NULL,
      name_en TEXT,
      slug TEXT UNIQUE NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      display_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS question_bank (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      question_type TEXT NOT NULL,
      content TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      primary_interaction_mode TEXT NOT NULL,
      secondary_interaction_mode TEXT,
      marks NUMERIC(8,2) NOT NULL DEFAULT 1,
      bank_type TEXT NOT NULL DEFAULT 'comprehensive',
      status TEXT NOT NULL DEFAULT 'approved',
      difficulty INT DEFAULT 1,
      explanation TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exam_attempts (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      exam_mode TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'in_progress',
      score NUMERIC(8,2),
      total_questions INT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Ensure session columns exist in case table was created earlier without them
    ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS session_id TEXT;
    ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS session_created_at TIMESTAMPTZ;
  `);

    /*
    try {
      const defaultPassHash = await hashPassword('Password123!');
      const adminPassHash = await hashPassword('AdminPassword123!');
      await db.query(
        `INSERT INTO users (id, email, password_hash, full_name, role, status)
         VALUES 
         ('00000000-0000-0000-0000-000000000001', 'student@firstcertificate.sd', $1, 'طالب أول الشهادة', 'student', 'active'),
         ('00000000-0000-0000-0000-000000000002', 'admin@firstcertificate.sd', $2, 'مسؤول النظام', 'admin', 'active')
         ON CONFLICT (email) DO NOTHING`,
        [defaultPassHash, adminPassHash]
      );
    } catch (err) {
      console.warn('[DB] User seeding warning:', err);
    }
    */

  return new PGlitePoolWrapper(db);
}

class DatabaseProxy {
  private delegate: any = null;

  private async getDelegate() {
    if (this.delegate) return this.delegate;

    const connectionString = process.env.DATABASE_URL;
    const hasUnreachableHost = connectionString && (
      connectionString.includes('ehdchhfnlidvvyhdoqzz') ||
      connectionString.includes('placeholder') ||
      connectionString.includes('[YOUR-HOST]')
    );

    if (!connectionString || hasUnreachableHost) {
      console.log('[DB] Using embedded PGlite storage (no valid remote DATABASE_URL configured).');
      this.delegate = await initPgliteDb();
      return this.delegate;
    }

    try {
      const isRemoteDb = Boolean(
        connectionString.includes('supabase.co') ||
        connectionString.includes('neon.tech') ||
        connectionString.includes('sslmode=require')
      );
      const cleanConnectionString = connectionString.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '');
      const poolConfig: PoolConfig = {
        connectionString: cleanConnectionString,
        ssl: isRemoteDb ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 3000,
      };

      const testPool = new Pool(poolConfig);
      await testPool.query('SELECT 1 AS ok');
      console.log('[DB] Connected to remote PostgreSQL successfully.');
      this.delegate = testPool;
      return this.delegate;
    } catch (err) {
      console.warn('[DB] Remote PostgreSQL connection failed (falling back to embedded PGlite):', err);
      this.delegate = await initPgliteDb();
      return this.delegate;
    }
  }

  async query(text: string, params?: any[]) {
    const del = await this.getDelegate();
    return del.query(text, params);
  }

  async connect() {
    const del = await this.getDelegate();
    return del.connect();
  }

  async end() {
    if (this.delegate && typeof this.delegate.end === 'function') {
      await this.delegate.end();
    }
  }
}

export const pool = new DatabaseProxy() as unknown as Pool;

export async function testConnection(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT 1 AS ok');
    return Boolean(result.rows && result.rows.length > 0);
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
