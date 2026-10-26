import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';
import { Pool, PoolClient } from 'pg';
import { pool } from '../db';

export function getJwtSecretBytes(): Uint8Array {
  const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET is not configured');
  return new TextEncoder().encode(secret);
}

// Access token lifetime target: ~15 minutes (C7 §6, PD-002)
export const ACCESS_TOKEN_EXPIRY = '15m';

// D1: Rolling refresh lifetime (30 days) and absolute session maximum (90 days)
export const REFRESH_TOKEN_ROLLING_DAYS = 30;
export const SESSION_ABSOLUTE_DAYS = 90;

// D3: Configurable grace window in seconds (default: 15s)
export function getReplayGraceSeconds(): number {
  const val = parseInt(process.env.REFRESH_REPLAY_GRACE_SECONDS || '15', 10);
  return isNaN(val) || val <= 0 ? 15 : val;
}

// Key management for AES-256-GCM replay buffer
export function getBufferKeyId(): string {
  return process.env.BUFFER_KEY_ID || 'BUFFER_KEY_V1';
}

export function getBufferKey(keyId: string): Buffer {
  const customKey = process.env.BUFFER_ENCRYPTION_KEY;
  if (customKey && customKey.length >= 32) {
    return Buffer.from(customKey.slice(0, 32), 'utf8');
  }
  // Derive deterministic 32-byte key from JWT_SECRET + keyId
  return crypto.createHmac('sha256', getJwtSecretBytes()).update(`REPLAY_BUFFER:${keyId}`).digest();
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  tag: string;
  keyId: string;
}

export function encryptReplacementToken(
  rawToken: string,
  keyId: string,
  key: Buffer,
  aad: string
): EncryptedPayload {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(aad, 'utf8'));
  let enc = cipher.update(rawToken, 'utf8', 'base64');
  enc += cipher.final('base64');
  const tag = cipher.getAuthTag();
  return {
    ciphertext: enc,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    keyId,
  };
}

export function decryptReplacementToken(
  payload: { ciphertext: string; iv: string; tag: string; keyId: string },
  key: Buffer,
  aad: string
): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(payload.iv, 'base64')
  );
  decipher.setAAD(Buffer.from(aad, 'utf8'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  let dec = decipher.update(payload.ciphertext, 'base64', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}

export interface TokenUserPayload {
  id: string;
  email: string;
  role: string;
  tokenVersion?: number;
}

export interface VerifiedClaims {
  userId: string;
  email: string;
  role: string;
  tokenVersion: number;
}

/**
 * Computes SHA-256 hash of a raw token for secure database storage.
 * The raw token is NEVER stored in plaintext in the database.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Issues a short-lived access JWT using "jose" (HS256).
 * Payload contains: sub (userId), email, role, tokenVersion.
 */
export async function generateAccessToken(user: TokenUserPayload): Promise<string> {
  return new SignJWT({
    email: user.email,
    role: user.role,
    tokenVersion: typeof user.tokenVersion === 'number' ? user.tokenVersion : 1,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(getJwtSecretBytes());
}

/**
 * Verifies an access JWT using "jose".
 * Rejects invalid signatures, expired tokens, or tokens missing subject.
 */
export async function verifyAccessToken(token: string): Promise<VerifiedClaims> {
  const { payload } = await jwtVerify(token, getJwtSecretBytes(), {
    algorithms: ['HS256'],
  });

  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Token missing valid subject (sub)');
  }

  return {
    userId: payload.sub,
    email: (payload.email as string) || '',
    role: (payload.role as string) || 'student',
    tokenVersion: typeof payload.tokenVersion === 'number' ? (payload.tokenVersion as number) : 1,
  };
}

/**
 * Generates a high-entropy cryptographically secure refresh token,
 * stores its SHA-256 hash in the database, and returns the raw token.
 */
export async function createRefreshToken(
  userId: string,
  db: PoolClient | Pool = pool,
  sessionId?: string,
  sessionCreatedAt?: Date
): Promise<{ rawToken: string; sessionId: string; sessionCreatedAt: Date; expiresAt: Date }> {
  const id = crypto.randomUUID();
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const sid = sessionId || crypto.randomUUID();
  const sCreatedAt = sessionCreatedAt || new Date();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_ROLLING_DAYS * 24 * 60 * 60 * 1000);

  await db.query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, session_id, session_created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, userId, tokenHash, expiresAt, sid, sCreatedAt]
  );

  return { rawToken, sessionId: sid, sessionCreatedAt: sCreatedAt, expiresAt };
}

export interface RotateResult {
  newRefreshToken: string;
  userId: string;
  userEmail: string;
  userRole: string;
  userFullName?: string | null;
  userTokenVersion: number;
}


/**
 * Validates an existing refresh token, revokes it, and issues a new refresh token (token rotation).
 * Enforces:
 * 1. Consistent Hierarchical Lock Order: Lock `users` row FIRST, then `refresh_tokens` row SECOND.
 * 2. Active user account status (C7 §9).
 * 3. Encrypted replay buffer (D3) for recovery within configurable grace window.
 * 4. Bounded legacy token migration (D1).
 * 5. Absolute session lifetime ceiling (90 days).
 */
export async function rotateRefreshToken(oldRawToken: string): Promise<RotateResult | null> {
  const oldHash = hashToken(oldRawToken);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Step 1: Query token hash to identify the user
    const tokenLookup = await client.query(
      `SELECT id, user_id, expires_at, revoked_at, session_id, session_created_at
       FROM refresh_tokens
       WHERE token_hash = $1`,
      [oldHash]
    );

    if (tokenLookup.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const initialToken = tokenLookup.rows[0];

    // Step 2: HIERARCHICAL LOCK ORDER — Lock the `users` row FIRST
    const userRes = await client.query(
      `SELECT id, status, token_version, email, role, full_name
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [initialToken.user_id]
    );


    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const userRow = userRes.rows[0];

    // Step 3: HIERARCHICAL LOCK ORDER — Lock the `refresh_tokens` row SECOND
    const lockedTokenRes = await client.query(
      `SELECT id, user_id, expires_at, revoked_at, session_id, session_created_at
       FROM refresh_tokens
       WHERE id = $1
       FOR UPDATE`,
      [initialToken.id]
    );

    if (lockedTokenRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const lockedToken = lockedTokenRes.rows[0];

    // Must be active account
    if (userRow.status !== 'active') {
      await client.query('ROLLBACK');
      throw new Error(`ACCOUNT_${userRow.status.toUpperCase()}`);
    }

    // Handle Already Revoked Tokens: Check Replay Buffer (D3)
    if (lockedToken.revoked_at !== null) {
      const bufferRes = await client.query(
        `SELECT encrypted_raw_replacement, encryption_iv, encryption_tag, encryption_key_id, expires_at
         FROM refresh_replay_buffer
         WHERE old_token_hash = $1`,
        [oldHash] // Use oldHash (token hash)
      );

      if (bufferRes.rows.length > 0) {
        const buf = bufferRes.rows[0];
        const now = new Date();
        if (new Date(buf.expires_at) > now) {
          // Within grace window! Recover replacement token
          try {
            const key = getBufferKey(buf.encryption_key_id);
            const aad = `${lockedToken.id}:${lockedToken.user_id}`;
            const recoveredToken = decryptReplacementToken(
              {
                ciphertext: buf.encrypted_raw_replacement,
                iv: buf.encryption_iv,
                tag: buf.encryption_tag,
                keyId: buf.encryption_key_id,
              },
              key,
              aad
            );

            await client.query(
              `UPDATE refresh_replay_buffer SET consumed_at = NOW() WHERE old_token_hash = $1`,
              [oldHash]
            );

            await client.query('COMMIT');

            return {
              newRefreshToken: recoveredToken,
              userId: userRow.id,
              userEmail: userRow.email,
              userRole: userRow.role,
              userFullName: userRow.full_name,
              userTokenVersion: userRow.token_version ?? 1,
            };

          } catch (decErr) {
            console.error('[rotateRefreshToken] Replay buffer decryption failed (fail-closed):', decErr);
            await client.query('ROLLBACK');
            return null;
          }
        }
      }

      // Ambiguous replay outside grace window: reject with 401 without cascading revocation (D2 / D3)
      await client.query('ROLLBACK');
      return null;
    }

    // Must not be expired
    const now = new Date();
    if (new Date(lockedToken.expires_at) <= now) {
      await client.query('ROLLBACK');
      return null;
    }

    // Bounded Lifetime and Legacy Session Migration (D1)
    let sessionId = lockedToken.session_id;
    let sessionCreatedAt = lockedToken.session_created_at
      ? new Date(lockedToken.session_created_at)
      : null;
    let newExpiresAt: Date;

    if (!sessionId || !sessionCreatedAt) {
      // Legacy token: cap strictly to original token's recorded expiry
      const legacyExpiry = new Date(lockedToken.expires_at);
      const standardExpiry = new Date(Date.now() + REFRESH_TOKEN_ROLLING_DAYS * 24 * 60 * 60 * 1000);
      newExpiresAt = legacyExpiry < standardExpiry ? legacyExpiry : standardExpiry;

      if (newExpiresAt <= now) {
        // Safe rotation cannot be completed -> require normal login
        await client.query('ROLLBACK');
        return null;
      }

      sessionId = crypto.randomUUID();
      sessionCreatedAt = now;
    } else {
      // Standard session: enforce absolute maximum (e.g. 90 days)
      const absoluteExpiry = new Date(
        sessionCreatedAt.getTime() + SESSION_ABSOLUTE_DAYS * 24 * 60 * 60 * 1000
      );

      if (now >= absoluteExpiry) {
        await client.query('ROLLBACK');
        return null;
      }

      const standardExpiry = new Date(Date.now() + REFRESH_TOKEN_ROLLING_DAYS * 24 * 60 * 60 * 1000);
      newExpiresAt = absoluteExpiry < standardExpiry ? absoluteExpiry : standardExpiry;
    }

    // Revoke old token
    await client.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
      [lockedToken.id]
    );

    // Issue new refresh token
    const newId = crypto.randomUUID();
    const newRawToken = crypto.randomBytes(32).toString('hex');
    const newHash = hashToken(newRawToken);

    await client.query(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, session_id, session_created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [newId, lockedToken.user_id, newHash, newExpiresAt, sessionId, sessionCreatedAt]
    );

    // Encrypt replacement token for replay buffer (D3)
    const keyId = getBufferKeyId();
    const key = getBufferKey(keyId);
    const aad = `${lockedToken.id}:${lockedToken.user_id}`;
    const encrypted = encryptReplacementToken(newRawToken, keyId, key, aad);

    const graceSeconds = getReplayGraceSeconds();
    const graceExpiresAt = new Date(Date.now() + graceSeconds * 1000);

    await client.query(
      `INSERT INTO refresh_replay_buffer (
         id, old_token_hash, user_id, encrypted_raw_replacement, encryption_iv,
         encryption_tag, encryption_key_id, expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        crypto.randomUUID(),
        hashToken(oldRawToken),
        lockedToken.user_id,
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.tag,
        encrypted.keyId,
        graceExpiresAt,
      ]
    );

    await client.query('COMMIT');

    return {
      newRefreshToken: newRawToken,
      userId: userRow.id,
      userEmail: userRow.email,
      userRole: userRow.role,
      userFullName: userRow.full_name,
      userTokenVersion: userRow.token_version ?? 1,
    };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Transaction-consistent user session revocation (Logout / Logout-All / Security Invalidation).
 * Locks `users` row FIRST, increments `token_version`, and revokes all refresh tokens.
 * Guarantees that any racing `/refresh` either commits before or is completely revoked.
 */
export async function revokeUserSessions(userId: string, db?: PoolClient | Pool): Promise<void> {
  const runner = async (client: PoolClient | Pool) => {
    // 1. Lock user row first
    await client.query(
      `SELECT id, token_version FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );

    // 2. Increment token_version for immediate access token invalidation
    await client.query(
      `UPDATE users
       SET token_version = COALESCE(token_version, 1) + 1,
           updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );

    // 3. Revoke all active refresh tokens for the user
    await client.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );

    // 4. Remove active replay buffers for this user
    await client.query(
      `DELETE FROM refresh_replay_buffer WHERE user_id = $1`,
      [userId]
    );
  };

  if (db && 'release' in db) {
    await runner(db);
  } else {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await runner(client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

/**
 * Revokes a single refresh token by its raw value.
 */
export async function revokeRefreshToken(rawToken: string): Promise<boolean> {
  const tokenHash = hashToken(rawToken);
  const result = await pool.query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Revokes all active refresh tokens for a user.
 */
export async function revokeAllUserRefreshTokens(userId: string, db: PoolClient | Pool = pool): Promise<void> {
  await db.query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

/**
 * Cleans up expired replay buffer records.
 */
export async function cleanupExpiredReplayBuffers(): Promise<number> {
  const result = await pool.query(
    `DELETE FROM refresh_replay_buffer WHERE expires_at < NOW()`
  );
  return result.rowCount ?? 0;
}

/**
 * Cleans up expired auth operation logs.
 */
export async function cleanupExpiredAuthOperationLogs(): Promise<number> {
  const result = await pool.query(
    `DELETE FROM auth_operation_log WHERE expires_at < NOW()`
  );
  return result.rowCount ?? 0;
}
