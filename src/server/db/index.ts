import { Pool, PoolConfig } from 'pg';

const isProduction = process.env.NODE_ENV === 'production';
const hasSslInUrl = Boolean(
  process.env.DATABASE_URL?.includes('sslmode=require') ||
  process.env.DATABASE_URL?.includes('ssl=true')
);
const isServerless = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);

// Explicit SSL configuration to avoid Supabase/Node TLS verification failures in serverless environments
const sslConfig = isProduction || hasSslInUrl || isServerless
  ? { rejectUnauthorized: false }
  : undefined;

const config: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
};

export const pool = new Pool(config);

/**
 * Validates the database connection.
 * Required by IMPLEMENTATION_PLAN.md (Phase 2.2).
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT 1 AS ok');
    return result.rows[0].ok === 1;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
