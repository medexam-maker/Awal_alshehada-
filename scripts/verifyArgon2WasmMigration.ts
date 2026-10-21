import assert from 'assert';
import { hashPassword, verifyPassword } from '../src/server/lib/password';

async function runArgon2WasmVerification() {
  console.log('======================================================================');
  console.log('   HASH-WASM (ARGON2ID) COMPATIBILITY & MIGRATION VERIFICATION SUITE  ');
  console.log('======================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  async function runAsyncTest(name: string, fn: () => Promise<void>) {
    totalTests++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passedTests++;
    } catch (err: any) {
      console.error(`❌ [FAIL] ${name}`);
      console.error('   Error:', err?.message || err);
      throw err;
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1: Backward Compatibility with Authentic Native Argon2 Hashes
  // -------------------------------------------------------------------------
  // Reference hash produced by native C++ argon2 binary (v1.3, m=65536, p=4, t=3)
  // for plaintext password 'StudentPassword@2026'
  const NATIVE_ARGON2_REFERENCE_HASH =
    '$argon2id$v=19$m=65536,p=4,t=3$Dr6Et6q+jhQ3gbZ+WvEVEg$6vFFzFDQglrZ847JBaJJ7ejERAWUKzn3uIFm790kTaA';
  const KNOWN_PLAINTEXT_PWD = 'StudentPassword@2026';

  await runAsyncTest(
    '1. Backward Compatibility: verifyPassword() successfully accepts authentic native argon2 hash',
    async () => {
      // 1. Correct password must match native hash
      const isValid = await verifyPassword(NATIVE_ARGON2_REFERENCE_HASH, KNOWN_PLAINTEXT_PWD);
      assert.strictEqual(
        isValid,
        true,
        'hash-wasm argon2Verify must verify real native argon2 hash with correct password'
      );

      // 2. Incorrect password must be rejected
      const isWrongRejected = await verifyPassword(
        NATIVE_ARGON2_REFERENCE_HASH,
        'IncorrectPassword!999'
      );
      assert.strictEqual(
        isWrongRejected,
        false,
        'hash-wasm argon2Verify must reject incorrect password against native hash'
      );
    }
  );

  // -------------------------------------------------------------------------
  // TEST 2: New Hash Creation and Verification for New Users via hash-wasm
  // -------------------------------------------------------------------------
  const NEW_USER_PASSWORD = 'NewStudentSecurePass#2026!';

  await runAsyncTest(
    '2. New User Creation: hashPassword() creates valid Argon2id PHC string and verifyPassword() validates it',
    async () => {
      const generatedHash = await hashPassword(NEW_USER_PASSWORD);

      // Verify PHC string structure
      assert(
        generatedHash.startsWith('$argon2id$v=19$'),
        `Generated hash must adhere to standard Argon2id PHC header: got ${generatedHash}`
      );
      assert(
        generatedHash.includes('$m=65536,'),
        'Generated hash must include standard memory parameter m=65536'
      );

      // Verify matching password
      const matchNew = await verifyPassword(generatedHash, NEW_USER_PASSWORD);
      assert.strictEqual(matchNew, true, 'verifyPassword must validate newly generated hash');

      // Verify mismatching password
      const mismatchNew = await verifyPassword(generatedHash, 'WrongNewPassword!123');
      assert.strictEqual(mismatchNew, false, 'verifyPassword must reject wrong password for newly generated hash');
    }
  );

  // -------------------------------------------------------------------------
  // TEST 3: Multiple unique hashes with unique salts verify deterministically
  // -------------------------------------------------------------------------
  await runAsyncTest(
    '3. Salt Uniqueness & Deterministic Verification across multiple executions',
    async () => {
      const hash1 = await hashPassword('TestPassword@123');
      const hash2 = await hashPassword('TestPassword@123');

      // Salts must differ
      assert.notStrictEqual(hash1, hash2, 'Two hashes of the same password must have different salts');

      // Both must verify
      assert.strictEqual(await verifyPassword(hash1, 'TestPassword@123'), true);
      assert.strictEqual(await verifyPassword(hash2, 'TestPassword@123'), true);
    }
  );

  console.log('\n----------------------------------------------------------------------');
  console.log(`Summary: ${passedTests}/${totalTests} tests passed successfully.`);
  console.log('Argon2id WASM migration and backward compatibility verified at 100%.');
  console.log('----------------------------------------------------------------------\n');
}

runArgon2WasmVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
