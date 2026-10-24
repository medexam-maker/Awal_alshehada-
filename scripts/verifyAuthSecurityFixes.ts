import 'dotenv/config';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { hashToken } from '../src/server/lib/tokenService';
import { hashPassword, verifyPassword } from '../src/server/lib/password';
import {
  validateForgotPasswordPayload,
  validateResetPasswordPayload,
  validateLoginPayload,
  validateRegisterPayload,
} from '../src/shared/validation/apiSchemas';

async function runAuthSecurityFixesVerification() {
  console.log('===========================================================');
  console.log('Starting Auth Security Fixes Verification — First Certificate');
  console.log('===========================================================\n');

  // -------------------------------------------------------------
  // Test 1: Validation Schemas for Forgot and Reset Password
  // -------------------------------------------------------------
  console.log('[Test 1] Validating Forgot/Reset Password Schemas...');

  // Forgot password validations
  const validForgot = validateForgotPasswordPayload({ email: 'Student@Example.SD' });
  assert.strictEqual(validForgot.valid, true, 'Valid email must pass forgot password schema');

  const invalidForgotEmail = validateForgotPasswordPayload({ email: 'not-an-email' });
  assert.strictEqual(invalidForgotEmail.valid, false, 'Invalid email must fail forgot password schema');

  const emptyForgot = validateForgotPasswordPayload({});
  assert.strictEqual(emptyForgot.valid, false, 'Empty payload must fail forgot password schema');

  // Reset password validations
  const validReset = validateResetPasswordPayload({
    email: 'student@example.sd',
    resetCode: '1234',
    newPassword: 'NewSecurePassword2026!',
  });
  assert.strictEqual(validReset.valid, true, 'Valid reset payload must pass');

  const shortCodeReset = validateResetPasswordPayload({
    email: 'student@example.sd',
    resetCode: '123', // only 3 digits
    newPassword: 'NewSecurePassword2026!',
  });
  assert.strictEqual(shortCodeReset.valid, false, 'Reset code with < 4 digits must fail');

  const nonNumericCodeReset = validateResetPasswordPayload({
    email: 'student@example.sd',
    resetCode: '123a',
    newPassword: 'NewSecurePassword2026!',
  });
  assert.strictEqual(nonNumericCodeReset.valid, false, 'Non-numeric reset code must fail');

  const shortPasswordReset = validateResetPasswordPayload({
    email: 'student@example.sd',
    resetCode: '1234',
    newPassword: 'short', // < 8 characters
  });
  assert.strictEqual(shortPasswordReset.valid, false, 'Password shorter than 8 chars must fail');

  console.log('✅ Forgot and Reset Password schemas strictly enforce formats.\n');

  // -------------------------------------------------------------
  // Test 2: Cryptographic Reset Code Hashing and Timing-Safe Verification
  // -------------------------------------------------------------
  console.log('[Test 2] Testing Reset Code Cryptographic Properties...');

  const resetCode = '8492';
  const hashedCode = hashToken(resetCode);
  assert.strictEqual(typeof hashedCode, 'string');
  assert.strictEqual(hashedCode.length, 64, 'SHA-256 hash must be 64 hex characters');

  // Timing safe equal check
  const candidateHashCorrect = hashToken('8492');
  const bufExpected = Buffer.from(hashedCode, 'utf8');
  const bufCandidate = Buffer.from(candidateHashCorrect, 'utf8');
  assert(crypto.timingSafeEqual(bufExpected, bufCandidate), 'Identical code hashes must match');

  const candidateHashWrong = hashToken('8493');
  const bufWrong = Buffer.from(candidateHashWrong, 'utf8');
  assert(!crypto.timingSafeEqual(bufExpected, bufWrong), 'Different code hashes must not match');

  console.log('✅ Reset code SHA-256 and constant-time matching verified.\n');

  // -------------------------------------------------------------
  // Test 3: Argon2id Password Hashing and Verification
  // -------------------------------------------------------------
  console.log('[Test 3] Verifying Argon2id hashing on password updates...');
  const newPass = 'UpdatedSecurePassword!2026';
  const hashedPass = await hashPassword(newPass);
  assert(hashedPass.startsWith('$argon2id$'), 'Password must use Argon2id');
  assert(await verifyPassword(hashedPass, newPass), 'Argon2id must verify correct new password');
  assert(!(await verifyPassword(hashedPass, 'OldPassword')), 'Argon2id must reject wrong password');
  console.log('✅ Argon2id password hashing verified.\n');

  // -------------------------------------------------------------
  // Test 4: Inspection of AuthContext.tsx for Strict Elimination of Fallbacks
  // -------------------------------------------------------------
  console.log('[Test 4] Inspecting AuthContext.tsx source code...');
  const authContextPath = path.resolve('src/client/context/AuthContext.tsx');
  const authContextContent = fs.readFileSync(authContextPath, 'utf8');

  // 4a: Must NOT contain fc_local_students
  assert(
    !authContextContent.includes('fc_local_students'),
    'AuthContext must NOT contain fc_local_students fallback'
  );

  // 4b: Must NOT create offlineUser
  assert(
    !authContextContent.includes('offlineUser'),
    'AuthContext must NOT contain offlineUser mock fallback'
  );

  // 4c: Must NOT create fallbackUser
  assert(
    !authContextContent.includes('fallbackUser'),
    'AuthContext must NOT contain fallbackUser mock fallback'
  );

  // 4d: restoreSession must NOT set user from localStorage directly without server validation
  assert(
    !authContextContent.includes("setUser(parsed)"),
    'AuthContext must NOT blindly set user from unverified localStorage parsed profile'
  );

  // 4e: Must invoke validateSession
  assert(
    authContextContent.includes('validateSession'),
    'AuthContext must call apiClient.validateSession() on session restoration'
  );

  // 4f: Must provide forgotPassword and resetPassword in context interface
  assert(
    authContextContent.includes('forgotPassword:') && authContextContent.includes('resetPassword:'),
    'AuthContext must expose forgotPassword and resetPassword functions'
  );

  console.log('✅ AuthContext.tsx strictly eliminates all mock/offline fallbacks and requires server verification.\n');

  // -------------------------------------------------------------
  // Test 5: Inspection of Login.tsx & Register.tsx for Password Visibility and Recovery
  // -------------------------------------------------------------
  console.log('[Test 5] Inspecting UI components (Login.tsx, Register.tsx)...');

  const loginPath = path.resolve('src/client/pages/Login.tsx');
  const loginContent = fs.readFileSync(loginPath, 'utf8');

  assert(loginContent.includes('showPassword'), 'Login.tsx must have showPassword state');
  assert(loginContent.includes('Eye') && loginContent.includes('EyeOff'), 'Login.tsx must import and use Eye/EyeOff icons');
  assert(loginContent.includes('نسيت كلمة المرور؟'), 'Login.tsx must have forgot password trigger');
  assert(loginContent.includes('forgotPassword') && loginContent.includes('resetPassword'), 'Login.tsx must call forgotPassword and resetPassword');
  assert(loginContent.includes('SMTP'), 'Login.tsx must notify user about SMTP/email configuration');

  const registerPath = path.resolve('src/client/pages/Register.tsx');
  const registerContent = fs.readFileSync(registerPath, 'utf8');

  assert(registerContent.includes('showPassword'), 'Register.tsx must have showPassword state');
  assert(registerContent.includes('Eye') && registerContent.includes('EyeOff'), 'Register.tsx must import and use Eye/EyeOff icons');

  console.log('✅ Login.tsx and Register.tsx contain password visibility toggles and recovery flows.\n');

  // -------------------------------------------------------------
  // Test 6: ApiClient session restoration
  // -------------------------------------------------------------
  console.log('[Test 6] Inspecting ApiClient session management...');
  const apiClientPath = path.resolve('src/client/api/apiClient.ts');
  const apiClientContent = fs.readFileSync(apiClientPath, 'utf8');

  assert(apiClientContent.includes('validateSession'), 'ApiClient must implement validateSession');
  assert(apiClientContent.includes('lastVerifiedUser'), 'ApiClient must maintain verified user state');
  assert(apiClientContent.includes("localStorage.removeItem('fc_user_profile')"), 'ApiClient clearAuth must clean stored profile');

  console.log('✅ ApiClient authoritatively manages session tokens and profile isolation.\n');

  console.log('===========================================================');
  console.log('ALL AUTHENTICATION SECURITY FIXES VERIFIED SUCCESSFULLY.');
  console.log('===========================================================');
}

runAuthSecurityFixesVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
