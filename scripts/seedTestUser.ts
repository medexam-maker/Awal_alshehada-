import 'dotenv/config';
import { pool } from '../src/server/db';
import { hashPassword } from '../src/server/lib/password';

/**
 * Dedicated development and test user seed script.
 * Conforms to C7 §57, §58 and Contract baseline.
 * - Isolated from production: reads credentials from environment variables or safe dev defaults.
 * - Uses the exact same Argon2id hashing path as production registration.
 * - Does not create mock auth or bypass authentication.
 */
async function seedTestUser(): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';
  const email = process.env.TEST_USER_EMAIL || 'test.student@example.com';
  const rawPassword = process.env.TEST_USER_PASSWORD || (isProduction ? null : 'TestPass123!');
  const fullName = process.env.TEST_USER_NAME || 'طالب اختباري';
  const role = process.env.TEST_USER_ROLE || 'student';

  if (!rawPassword) {
    console.error('ERROR: TEST_USER_PASSWORD environment variable is required in production.');
    process.exit(1);
  }

  console.log(`Seeding test user: ${email} (role: ${role})...`);

  // Compute Argon2id hash using canonical production hashing path
  const passwordHash = await hashPassword(rawPassword);

  const client = await pool.connect();
  try {
    const res = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, status)
       VALUES ($1, $2, $3, $4, 'active')
       ON CONFLICT (email) DO UPDATE
       SET password_hash = $2,
           full_name = $3,
           role = $4,
           status = 'active',
           updated_at = NOW()
       RETURNING id, email, role, status, updated_at`,
      [email.toLowerCase().trim(), passwordHash, fullName, role]
    );

    const user = res.rows[0];
    console.log(`Test user successfully seeded!`);
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Status: ${user.status}`);
  } catch (error) {
    console.error('Failed to seed test user:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedTestUser().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { seedTestUser };
