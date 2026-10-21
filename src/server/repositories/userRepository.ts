import { Pool, PoolClient } from 'pg';
import { pool } from '../db';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string | null;
  phone: string | null;
  role: string;
  status: string;
  tokenVersion: number;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRepository {
  findByEmail(email: string, db?: PoolClient | Pool): Promise<UserRecord | null>;
  findById(id: string, db?: PoolClient | Pool): Promise<UserRecord | null>;
  createStudent(
    payload: {
      email: string;
      passwordHash: string;
      fullName: string | null;
      phone: string | null;
    },
    db?: PoolClient | Pool
  ): Promise<UserRecord>;
  updateLastLogin(userId: string, db?: PoolClient | Pool): Promise<void>;
  incrementTokenVersion(userId: string, db?: PoolClient | Pool): Promise<number>;
  updatePasswordAndIncrementVersion(
    userId: string,
    newPasswordHash: string,
    db?: PoolClient | Pool
  ): Promise<number>;
}

export class UserEmailConflictError extends Error {
  constructor(message = 'Email already registered') {
    super(message);
    this.name = 'UserEmailConflictError';
  }
}

interface UserDbRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  status: string;
  token_version?: number | null;
  last_login_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface PostgresErrorLike {
  code?: string;
  constraint?: string;
  detail?: string;
}

function isDatabaseError(err: unknown): err is PostgresErrorLike {
  return typeof err === 'object' && err !== null && 'code' in err;
}

function mapRowToUserRecord(row: UserDbRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    fullName: row.full_name,
    phone: row.phone,
    role: row.role,
    status: row.status,
    tokenVersion: typeof row.token_version === 'number' ? row.token_version : 1,
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class PostgresUserRepository implements UserRepository {
  async findByEmail(email: string, db: PoolClient | Pool = pool): Promise<UserRecord | null> {
    const result = await db.query<UserDbRow>(
      `SELECT id, email, password_hash, full_name, phone, role, status,
              COALESCE(token_version, 1) AS token_version,
              last_login_at, created_at, updated_at
       FROM users
       WHERE email = $1`,
      [email]
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToUserRecord(result.rows[0]);
  }

  async findById(id: string, db: PoolClient | Pool = pool): Promise<UserRecord | null> {
    const result = await db.query<UserDbRow>(
      `SELECT id, email, password_hash, full_name, phone, role, status,
              COALESCE(token_version, 1) AS token_version,
              last_login_at, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToUserRecord(result.rows[0]);
  }

  async createStudent(
    payload: {
      email: string;
      passwordHash: string;
      fullName: string | null;
      phone: string | null;
    },
    db: PoolClient | Pool = pool
  ): Promise<UserRecord> {
    try {
      const result = await db.query<UserDbRow>(
        `INSERT INTO users (email, password_hash, full_name, phone, role, status, token_version)
         VALUES ($1, $2, $3, $4, 'student', 'active', 1)
         RETURNING id, email, password_hash, full_name, phone, role, status,
                   token_version, last_login_at, created_at, updated_at`,
        [payload.email, payload.passwordHash, payload.fullName, payload.phone]
      );
      return mapRowToUserRecord(result.rows[0]);
    } catch (error: unknown) {
      if (
        isDatabaseError(error) &&
        error.code === '23505' &&
        error.constraint === 'users_email_key'
      ) {
        throw new UserEmailConflictError('Email already registered');
      }
      throw error;
    }
  }

  async updateLastLogin(userId: string, db: PoolClient | Pool = pool): Promise<void> {
    await db.query(
      `UPDATE users
       SET last_login_at = NOW()
       WHERE id = $1`,
      [userId]
    );
  }

  async incrementTokenVersion(userId: string, db: PoolClient | Pool = pool): Promise<number> {
    const result = await db.query<{ token_version: number }>(
      `UPDATE users
       SET token_version = COALESCE(token_version, 1) + 1,
           updated_at = NOW()
       WHERE id = $1
       RETURNING token_version`,
      [userId]
    );
    return result.rows[0]?.token_version ?? 1;
  }

  async updatePasswordAndIncrementVersion(
    userId: string,
    newPasswordHash: string,
    db: PoolClient | Pool = pool
  ): Promise<number> {
    const result = await db.query<{ token_version: number }>(
      `UPDATE users
       SET password_hash = $1,
           token_version = COALESCE(token_version, 1) + 1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING token_version`,
      [newPasswordHash, userId]
    );
    return result.rows[0]?.token_version ?? 1;
  }
}

export const userRepository = new PostgresUserRepository();
