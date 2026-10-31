import dotenv from 'dotenv';
// In production/Netlify, preserve existing environment variables without overriding
dotenv.config();
import { Pool, PoolConfig } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import path from 'path';
import fs from 'fs';
import { seedDatabase } from './seed';

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
  if (process.env.NODE_ENV === 'production' || process.env.NETLIFY) {
    throw new Error('[DB Security] Embedded PGlite storage is strictly forbidden in production environments.');
  }
  const dataDir = path.resolve(process.cwd(), '.data/pglite');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const db = new PGlite(dataDir);
  await db.waitReady;

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
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
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      bank_type TEXT NOT NULL DEFAULT 'comprehensive',
      exam_mode TEXT NOT NULL,
      training_set_id TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      submitted_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      total_marks NUMERIC(8,2) NOT NULL DEFAULT 0,
      obtained_marks NUMERIC(8,2),
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exam_attempt_questions (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      attempt_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      position INT NOT NULL,
      marks NUMERIC(8,2) NOT NULL DEFAULT 1,
      question_snapshot TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exam_question_history (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      attempt_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exam_answers (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      attempt_id TEXT NOT NULL,
      attempt_question_id TEXT NOT NULL,
      answer TEXT NOT NULL,
      grading_status TEXT NOT NULL,
      obtained_marks NUMERIC(8,2) NOT NULL DEFAULT 0,
      grader_type TEXT NOT NULL DEFAULT 'system',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS training_exam_sets (
      id TEXT PRIMARY KEY,
      title TEXT,
      exam_category TEXT NOT NULL DEFAULT 'regular',
      subject_id TEXT,
      exam_year INT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS training_set_questions (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      training_set_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      position INT NOT NULL,
      marks_override NUMERIC(8,2),
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      metadata TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Ensure session and attempt columns exist in case table was created earlier without them
    ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS session_id TEXT;
    ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS session_created_at TIMESTAMPTZ;
    ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS user_id TEXT;
    ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS bank_type TEXT;
    ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS training_set_id TEXT;
    ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
    ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
    ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS total_marks NUMERIC(8,2) DEFAULT 0;
    ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS obtained_marks NUMERIC(8,2);
    ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS canonical_content_hash TEXT;
    ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS approved_content_hash TEXT;
    ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS grading_mode TEXT DEFAULT 'auto';
    ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS partial_threshold NUMERIC(3,2) DEFAULT 0.50;

    CREATE TABLE IF NOT EXISTS exam_step_answers (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      attempt_id TEXT NOT NULL,
      attempt_question_id TEXT NOT NULL,
      step_id TEXT NOT NULL,
      selected_option_id TEXT NOT NULL,
      is_correct BOOLEAN NOT NULL DEFAULT false,
      awarded_marks NUMERIC(8,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS essay_manual_grades (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      attempt_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      grader_user_id TEXT NOT NULL,
      assigned_score NUMERIC(8,2) NOT NULL,
      max_score NUMERIC(8,2) NOT NULL,
      feedback_note TEXT,
      graded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(attempt_id, question_id)
    );
  `);

  const wrapper = new PGlitePoolWrapper(db);
  // Only seed PGlite if in local development
  if (process.env.NODE_ENV !== 'production' && !process.env.NETLIFY) {
    await seedDatabase(wrapper);
  }
  return wrapper;
}

function sanitizeDbError(error: unknown): string {
  if (!error) return 'Unknown database error';
  const raw = error instanceof Error ? error.message : String(error);
  // Redact passwords, connection string credentials or tokens
  return raw
    .replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+(@)/gi, '$1***$2')
    .replace(/password=[^\s;&]+/gi, 'password=***');
}

class DatabaseProxy {
  private delegate: any = null;

  private async getDelegate() {
    if (this.delegate) return this.delegate;

    const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.NETLIFY);
    const connectionString = process.env.DATABASE_URL;
    const hasUnreachableHost = connectionString && (
      connectionString.includes('placeholder') ||
      connectionString.includes('[YOUR-HOST]') ||
      connectionString.includes('ehdchhfnlidvvyhdoqzz') ||
      connectionString.includes('invalid')
    );

    if (!connectionString || hasUnreachableHost) {
      const reason = !connectionString
        ? 'DATABASE_URL environment variable is not defined.'
        : 'DATABASE_URL contains an unreachable or placeholder host.';

      if (isProduction) {
        console.error(`[DB Fatal] Production database configuration error: ${reason}`);
        throw new Error(`[Database Error] Connection failed: ${reason} Falling back to embedded database is disabled in production.`);
      }

      console.log(`[DB] Using embedded PGlite storage for local development.`);
      this.delegate = await initPgliteDb();
      return this.delegate;
    }

    try {
      const isRemoteDb = Boolean(
        connectionString.includes('supabase.co') ||
        connectionString.includes('neon.tech') ||
        connectionString.includes('sslmode=require') ||
        connectionString.includes('pooler')
      );
      const cleanConnectionString = connectionString.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '');
      const poolConfig: PoolConfig = {
        connectionString: cleanConnectionString,
        ssl: isRemoteDb ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 5000,
        max: isProduction ? 5 : 10,
      };

      const testPool = new Pool(poolConfig);
      await testPool.query('SELECT 1 AS ok');

      // In production, do NOT automatically alter database contents on connect
      if (!isProduction && process.env.AUTO_SEED === 'true') {
        await seedDatabase(testPool);
      }

      console.log('[DB] Connected to PostgreSQL database successfully.');
      this.delegate = testPool;
      return this.delegate;
    } catch (err: unknown) {
      const safeError = sanitizeDbError(err);

      if (isProduction) {
        console.error('[DB Error] Failed to connect to remote PostgreSQL database:', safeError);
        // Strictly fail in production without attempting any filesystem write or PGlite fallback
        throw new Error(`[Database Error] Remote PostgreSQL connection failed in production: ${safeError}`);
      }

      console.log('[DB] Remote PostgreSQL unavailable in local environment; using embedded PGlite database.');
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
    console.error('Database connection test failed:', sanitizeDbError(error));
    return false;
  }
}
