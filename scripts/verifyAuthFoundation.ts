import 'dotenv/config';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { hashPassword, verifyPassword } from '../src/server/lib/password';
import {
  generateAccessToken,
  verifyAccessToken,
  createRefreshToken,
  hashToken,
} from '../src/server/lib/tokenService';
import { SignJWT } from 'jose';
import { QUESTION_TYPE_REGISTRY } from '../src/shared/questionTypeRegistry';
import { QuestionType } from '../src/shared/constants';

async function runTests() {
  console.log('--- Starting Authentication Foundation Verification ---');

  // Test 1: Argon2id Password Hashing
  console.log('\n[1] Verifying Argon2id password hashing...');
  const testPassword = 'SecureStudentPassword!2026';
  const hashed = await hashPassword(testPassword);
  assert(
    hashed.startsWith('$argon2id$'),
    'Password hash must strictly start with $argon2id$'
  );
  assert(
    !hashed.includes(testPassword),
    'Plaintext password must never appear in hash'
  );
  const isValid = await verifyPassword(hashed, testPassword);
  assert.strictEqual(isValid, true, 'Valid password must verify');
  const isInvalid = await verifyPassword(hashed, 'WrongPassword123');
  assert.strictEqual(isInvalid, false, 'Invalid password must be rejected');
  console.log('✅ Argon2id password hashing verified.');

  // Test 2: Access Token using "jose"
  console.log('\n[2] Verifying access token issuance and verification...');
  const testUser = {
    id: '11111111-2222-3333-4444-555555555555',
    email: 'test@example.com',
    role: 'student',
  };
  const token = await generateAccessToken(testUser);
  assert(typeof token === 'string' && token.length > 50, 'Token must be non-empty JWT string');

  const claims = await verifyAccessToken(token);
  assert.strictEqual(claims.userId, testUser.id, 'Token sub claim must match userId');
  assert.strictEqual(claims.email, testUser.email, 'Token email claim must match email');
  assert.strictEqual(claims.role, testUser.role, 'Token role claim must match role');

  // Test 2b: Expired token rejection
  const jwtSecret = process.env.JWT_SECRET;
  assert(jwtSecret && jwtSecret.trim() !== '', 'JWT_SECRET must be configured in environment');
  const secretKey = new TextEncoder().encode(jwtSecret);
  const expiredToken = await new SignJWT({ email: testUser.email, role: testUser.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(testUser.id)
    .setIssuedAt(Math.floor(Date.now() / 1000) - 100)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 10) // expired 10 seconds ago
    .sign(secretKey);

  let expiredFailed = false;
  try {
    await verifyAccessToken(expiredToken);
  } catch {
    expiredFailed = true;
  }
  assert.strictEqual(expiredFailed, true, 'Expired access token must be rejected');

  // Test 2c: Tampered signature rejection
  let tamperedFailed = false;
  try {
    const tampered = token.slice(0, -5) + 'xxxxx';
    await verifyAccessToken(tampered);
  } catch {
    tamperedFailed = true;
  }
  assert.strictEqual(tamperedFailed, true, 'Tampered access token must be rejected');
  console.log('✅ Access token issuance, expiration, and signature security verified.');

  // Test 3: Refresh Token Hashing Security
  console.log('\n[3] Verifying refresh token hashing (non-plaintext persistence)...');
  const rawTokenA = 'a8f5c9e2b1d40763528190fabcde1234567890abcdef1234567890abcdef12';
  const hashA = hashToken(rawTokenA);
  assert(
    hashA !== rawTokenA,
    'Hash must never equal raw token'
  );
  assert.strictEqual(hashA.length, 64, 'SHA-256 hash must be 64 hex characters');
  assert.strictEqual(
    hashA,
    hashToken(rawTokenA),
    'Hash must be deterministic for identical input'
  );
  console.log('✅ Refresh token cryptographic hashing verified.');

  // Test 4: Migration 005 Syntax & Existence
  console.log('\n[4] Verifying migration 005_auth_refresh_tokens.sql...');
  const migrationPath = path.resolve('migrations/005_auth_refresh_tokens.sql');
  assert(fs.existsSync(migrationPath), 'Migration 005 file must exist');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  assert(migrationSql.includes('CREATE TABLE refresh_tokens'), 'Must create refresh_tokens table');
  assert(migrationSql.includes('token_hash TEXT NOT NULL UNIQUE'), 'Must include token_hash constraint');
  assert(migrationSql.includes('user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE'), 'Must reference users(id)');
  assert(migrationSql.includes('expires_at TIMESTAMPTZ NOT NULL'), 'Must include expires_at');
  assert(migrationSql.includes('revoked_at TIMESTAMPTZ'), 'Must include revoked_at');
  console.log('✅ Migration 005 structure and constraints verified.');

  // Test 5: Verify Mock Identity Elimination & POST /finish Route
  console.log('\n[5] Verifying mock identity elimination and finish route in examRoutes.ts...');
  const examRoutesPath = path.resolve('src/server/routes/examRoutes.ts');
  const examRoutesContent = fs.readFileSync(examRoutesPath, 'utf8');
  assert(
    !examRoutesContent.includes('00000000-0000-0000-0000-000000000000'),
    'Mock UUID 00000000-0000-0000-0000-000000000000 must NOT exist in examRoutes.ts'
  );
  assert(
    examRoutesContent.includes("import { requireAuth, AuthenticatedRequest } from '../middleware/auth'"),
    'examRoutes.ts must import requireAuth from middleware/auth'
  );
  assert(
    examRoutesContent.includes("router.post('/finish'"),
    "examRoutes.ts must define router.post('/finish', ...) per C4 §6.3"
  );
  assert(
    !examRoutesContent.includes("router.post('/:attemptId/finish'"),
    "examRoutes.ts must NOT use /:attemptId/finish"
  );
  console.log('✅ Mock identity completely eliminated and POST /finish route verified.');

  // Test 6: Verify C4 Auth & Exam Payload Validators
  console.log('\n[6] Verifying C4 auth and exam finish payload validators...');
  const {
    validateRegisterPayload,
    validateLoginPayload,
    validateRefreshPayload,
    validateFinishExamPayload,
  } = await import('../src/shared/validation/apiSchemas');

  // Register validation
  const validReg = validateRegisterPayload({ email: 'student@example.com', password: 'Password123!' });
  assert.strictEqual(validReg.valid, true, 'Valid registration payload must pass');
  const shortPassReg = validateRegisterPayload({ email: 'student@example.com', password: 'short' });
  assert.strictEqual(shortPassReg.valid, false, 'Password < 8 chars must fail validation');

  // Login validation
  const validLog = validateLoginPayload({ email: 'student@example.com', password: 'Password123!' });
  assert.strictEqual(validLog.valid, true, 'Valid login payload must pass');
  const missingPassLog = validateLoginPayload({ email: 'student@example.com' });
  assert.strictEqual(missingPassLog.valid, false, 'Missing password must fail validation');

  // Refresh validation
  const validRef = validateRefreshPayload({ refreshToken: 'some-token' });
  assert.strictEqual(validRef.valid, true, 'Valid refresh payload must pass');
  const emptyRef = validateRefreshPayload({});
  assert.strictEqual(emptyRef.valid, false, 'Missing refresh token must fail validation');

  // Finish exam validation with attemptId in body per C4 §6.3 / §22
  const validFinish = validateFinishExamPayload({
    attemptId: '11111111-2222-3333-4444-555555555555',
    answers: {},
    timeTakenSeconds: 120,
  });
  assert.strictEqual(validFinish.valid, true, 'Valid finish payload with attemptId in body must pass');
  const invalidFinish = validateFinishExamPayload({
    answers: {},
    timeTakenSeconds: 120,
  });
  assert.strictEqual(invalidFinish.valid, false, 'Finish payload missing attemptId must fail validation');
  console.log('✅ C4 auth and exam finish payload validators verified.');

  // Test 7: Verify requireAuth Middleware Rejection Envelopes
  console.log('\n[7] Verifying requireAuth middleware rejection envelopes...');
  const { requireAuth } = await import('../src/server/middleware/auth');

  // Missing Authorization header
  let resStatus = 0;
  let resBody: any = null;
  const mockRes = {
    status: (s: number) => {
      resStatus = s;
      return {
        json: (b: any) => {
          resBody = b;
        },
      };
    },
  };

  await requireAuth({ headers: {} } as any, mockRes as any, () => {});
  assert.strictEqual(resStatus, 401, 'Missing token must return 401');
  assert.strictEqual(resBody.success, false, 'Error envelope must have success: false');
  assert.strictEqual(resBody.error.code, 'AUTH_REQUIRED', 'Error code must be AUTH_REQUIRED');

  // Invalid token
  resStatus = 0;
  resBody = null;
  await requireAuth({ headers: { authorization: 'Bearer invalid.token.value' } } as any, mockRes as any, () => {});
  assert.strictEqual(resStatus, 401, 'Invalid token must return 401');
  assert.strictEqual(resBody.success, false);
  assert.strictEqual(resBody.error.code, 'AUTH_REQUIRED');
  console.log('✅ requireAuth C4 envelope compliance verified.');

  // Test 8: Verify Phase 2.1–2.3 Invariance
  console.log('\n[8] Verifying accepted Phase 2.1–2.3 functionality remains intact...');
  assert.strictEqual(
    Object.keys(QUESTION_TYPE_REGISTRY).length,
    15,
    'All 15 question types must remain registered'
  );
  assert(
    QUESTION_TYPE_REGISTRY[QuestionType.CALCULATION] !== undefined,
    'Calculation question type must remain registered'
  );
  console.log('✅ Phase 2.1–2.3 integrity preserved.');

  console.log('\n======================================================');
  console.log('ALL AUTHENTICATION FOUNDATION VERIFICATIONS PASSED ✅');
  console.log('======================================================');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
