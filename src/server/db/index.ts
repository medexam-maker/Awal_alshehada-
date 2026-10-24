import dotenv from 'dotenv';
dotenv.config({ override: true });
import { Pool, PoolConfig } from 'pg';

const isProduction = process.env.NODE_ENV === 'production';
const hasSslInUrl = Boolean(
  process.env.DATABASE_URL?.includes('sslmode=require') ||
  process.env.DATABASE_URL?.includes('ssl=true')
);
const isServerless = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);

const isRemoteDb = Boolean(
  process.env.DATABASE_URL?.includes('supabase.co') ||
  process.env.DATABASE_URL?.includes('supabase.com') ||
  process.env.DATABASE_URL?.includes('neon.tech') ||
  hasSslInUrl ||
  isProduction ||
  isServerless
);

// Explicit SSL configuration to avoid Supabase/Node TLS verification failures in cloud/serverless environments
const sslConfig = isRemoteDb
  ? { rejectUnauthorized: false }
  : undefined;

// Strip conflicting sslmode query param so pg honors { rejectUnauthorized: false } for Supabase intermediate certs
const cleanConnectionString = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '')
  : undefined;

const config: PoolConfig = {
  connectionString: cleanConnectionString,
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
