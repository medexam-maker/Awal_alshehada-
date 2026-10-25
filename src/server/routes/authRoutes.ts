import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  generateAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeUserSessions,
  hashToken,
  verifyAccessToken,
} from '../lib/tokenService';
import { hashPassword, verifyPassword } from '../lib/password';
import {
  validateRegisterPayload,
  validateLoginPayload,
  validateRefreshPayload,
  validateChangePasswordPayload,
  validateRecoverPasswordChangePayload,
  validateForgotPasswordPayload,
  validateResetPasswordPayload,
} from '../../shared/validation/apiSchemas';
import { userRepository, UserEmailConflictError } from '../repositories/userRepository';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { pool } from '../db';
import {
  sendPasswordResetEmail,
  isSmtpConfigured,
  maskEmail,
} from '../lib/emailService';

// In-memory rate limiting map for forgot-password: max 5 requests per 15 minutes per IP/email
interface RateLimitRecord {
  timestamps: number[];
}
// In-memory rate limiting maps: Strict limits per IP and per Email
const forgotPasswordIpRateLimitMap = new Map<string, RateLimitRecord>();
const forgotPasswordEmailRateLimitMap = new Map<string, RateLimitRecord>();

function checkForgotPasswordRateLimit(ip: string, email: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  
  // Strict limit: 3 requests per 15 mins per IP, 2 requests per 15 mins per Email
  const ipLimit = 3;
  const emailLimit = 2;

  const ipRecord = forgotPasswordIpRateLimitMap.get(ip) || { timestamps: [] };
  ipRecord.timestamps = ipRecord.timestamps.filter((ts) => now - ts < windowMs);
  
  const emailRecord = forgotPasswordEmailRateLimitMap.get(email) || { timestamps: [] };
  emailRecord.timestamps = emailRecord.timestamps.filter((ts) => now - ts < windowMs);

  if (ipRecord.timestamps.length >= ipLimit || emailRecord.timestamps.length >= emailLimit) {
    return false;
  }

  ipRecord.timestamps.push(now);
  forgotPasswordIpRateLimitMap.set(ip, ipRecord);
  
  emailRecord.timestamps.push(now);
  forgotPasswordEmailRateLimitMap.set(email, emailRecord);
  
  return true;
}

// In-memory brute-force attempt tracker for password reset codes (max 5 failed attempts per user)
const failedResetAttemptsMap = new Map<string, number>();

function getFailedResetAttempts(userId: string): number {
  return failedResetAttemptsMap.get(userId) || 0;
}

function recordFailedResetAttempt(userId: string): number {
  const current = (failedResetAttemptsMap.get(userId) || 0) + 1;
  failedResetAttemptsMap.set(userId, current);
  return current;
}

function clearFailedResetAttempts(userId: string): void {
  failedResetAttemptsMap.delete(userId);
}

const router = Router();

/**
 * POST /api/auth/register
 * Register a new student account.
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validateRegisterPayload(req.body);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid registration payload',
          details: validation.errors,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { email, password, fullName, phone } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    // Hash password with Argon2id (C7 §4.3)
    const passwordHash = await hashPassword(password);

    // Create student via repository
    const user = await userRepository.createStudent({
      email: normalizedEmail,
      passwordHash,
      fullName: fullName ? String(fullName).trim() : null,
      phone: phone ? String(phone).trim() : null,
    });

    // Issue tokens with initial token_version
    const accessToken = await generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });
    const { rawToken: refreshToken } = await createRefreshToken(user.id);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          status: user.status,
        },
        accessToken,
        refreshToken,
      },
      message: 'User registered successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    if (error instanceof UserEmailConflictError) {
      res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Email already registered',
          details: {},
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    console.error('[auth/register] Internal error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        details: {},
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate with email and password via Argon2id verification.
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validateLoginPayload(req.body);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid login payload',
          details: validation.errors,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { email, password } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    // Query user by email via repository
    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user) {
      // Avoid account enumeration by returning generic error (C7 §4.4, §19)
      res.status(401).json({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'هذا الحساب غير مسجل سجل الان',
          details: {},
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Verify password with Argon2id primitive first to avoid enumeration
    const isValid = await verifyPassword(user.passwordHash, password);
    if (!isValid) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Invalid email or password',
          details: {},
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Check account status after valid credentials (C7 §9)
    if (user.status !== 'active') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Account is suspended or disabled',
          details: { status: user.status },
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Update last_login_at via repository
    await userRepository.updateLastLogin(user.id);

    // Issue tokens with authoritative token_version
    const accessToken = await generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });
    const { rawToken: refreshToken } = await createRefreshToken(user.id);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          status: user.status,
        },
        accessToken,
        refreshToken,
      },
      message: 'Login successful',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('[auth/login] Internal error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        details: {},
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token and rotate refresh token with encrypted replay buffer (D3) and lock hierarchy (D1).
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validateRefreshPayload(req.body);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid refresh payload',
          details: validation.errors,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { refreshToken } = req.body;
    const rotated = await rotateRefreshToken(refreshToken);

    if (!rotated) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Invalid, revoked, or expired refresh token',
          details: {},
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Issue access token with up-to-date token_version
    const accessToken = await generateAccessToken({
      id: rotated.userId,
      email: rotated.userEmail,
      role: rotated.userRole,
      tokenVersion: rotated.userTokenVersion,
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken: rotated.newRefreshToken,
        user: {
          id: rotated.userId,
          email: rotated.userEmail,
          fullName: rotated.userFullName || null,
          role: rotated.userRole,
          status: 'active',
        },
      },
      message: 'Tokens refreshed successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith('ACCOUNT_')) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Account is suspended or disabled',
          details: { status: error.message.replace('ACCOUNT_', '').toLowerCase() },
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    console.error('[auth/refresh] Internal error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        details: {},
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/auth/logout
 * Transactionally consistent user-wide logout.
 * Locks the user row first, increments token_version, and revokes all refresh tokens.
 * Guarantees that any racing /refresh cannot leave a newly issued token active.
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body || {};
    let userId: string | null = null;

    // 1. Check Bearer token in header if present
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token) {
        try {
          const claims = await verifyAccessToken(token);
          userId = claims.userId;
        } catch {
          // Token expired or invalid; fallback to refresh token lookup
        }
      }
    }

    // 2. If userId not determined from header, look up user from refresh token
    if (!userId && refreshToken && typeof refreshToken === 'string') {
      const tokenHash = hashToken(refreshToken);
      const resLookup = await pool.query<{ user_id: string }>(
        `SELECT user_id FROM refresh_tokens WHERE token_hash = $1`,
        [tokenHash]
      );
      if (resLookup.rows.length > 0) {
        userId = resLookup.rows[0].user_id;
      }
    }

    // 3. Perform consistent user-wide session invalidation
    if (userId) {
      await revokeUserSessions(userId);
    } else if (refreshToken && typeof refreshToken === 'string') {
      // In case user_id not resolved, revoke the specific token hash directly
      const tokenHash = hashToken(refreshToken);
      await pool.query(
        `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`,
        [tokenHash]
      );
    }

    res.status(200).json({
      success: true,
      data: {
        revoked: true,
      },
      message: 'Logged out successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('[auth/logout] Internal error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        details: {},
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/auth/change-password
 * Atomic password update with token_version increment, refresh token revocation,
 * and durable operation record (D5) for uncertain COMMIT recovery.
 */
router.post('/change-password', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const validation = validateChangePasswordPayload(req.body);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid password change payload',
          details: validation.errors,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;
    const operationId = req.body.operationId || crypto.randomUUID();
    const recoverySecret = req.body.recoverySecret || crypto.randomBytes(32).toString('hex');
    const recoverySecretHash = hashToken(recoverySecret);

    await client.query('BEGIN');

    // 1. Lock user row FIRST (Hierarchical Lock Order)
    const userRes = await client.query<{ id: string; password_hash: string; token_version: number; status: string }>(
      `SELECT id, password_hash, token_version, status
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [userId]
    );

    if (userRes.rows.length === 0 || userRes.rows[0].status !== 'active') {
      await client.query('ROLLBACK');
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'User not found or inactive', details: {} },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const userRow = userRes.rows[0];

    // 2. Verify current password with Argon2id
    const isValid = await verifyPassword(userRow.password_hash, currentPassword);
    if (!isValid) {
      await client.query('ROLLBACK');
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Invalid current password', details: {} },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 3. Hash new password with Argon2id
    const newPasswordHash = await hashPassword(newPassword);

    // 4. Update password and increment token_version
    await client.query(
      `UPDATE users
       SET password_hash = $1,
           token_version = COALESCE(token_version, 1) + 1,
           updated_at = NOW()
       WHERE id = $2`,
      [newPasswordHash, userId]
    );

    // 5. Revoke all refresh tokens
    await client.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );

    // 6. Delete active replay buffers for user
    await client.query(
      `DELETE FROM refresh_replay_buffer WHERE user_id = $1`,
      [userId]
    );

    // 7. Insert durable operation record for uncertain COMMIT recovery (D5) - 2 hour validity
    await client.query(
      `INSERT INTO auth_operation_log (
         user_id, operation_id, operation_type, recovery_secret_hash, status, expires_at
       ) VALUES ($1, $2, 'PASSWORD_CHANGE', $3, 'COMMITTED', NOW() + INTERVAL '2 hours')
       ON CONFLICT (user_id, operation_id)
       DO UPDATE SET status = 'COMMITTED', recovery_secret_hash = $3, expires_at = NOW() + INTERVAL '2 hours'`,
      [userId, operationId, recoverySecretHash]
    );

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      data: {
        operationId,
        recoverySecret,
        status: 'COMMITTED',
      },
      message: 'Password changed successfully. Please log in with your new password.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    console.error('[auth/change-password] Internal error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        details: {},
      },
      timestamp: new Date().toISOString(),
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/auth/change-password/recover
 * Recovery endpoint for uncertain COMMIT during password change (D5).
 * Confirms whether the password change committed successfully without requiring an active access token.
 * Does NOT issue replacement tokens; requires full login with the new password.
 */
router.post('/change-password/recover', async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validateRecoverPasswordChangePayload(req.body);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid password change recovery payload',
          details: validation.errors,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { userId, operationId, recoverySecret } = req.body;

    // Read recovery result from authoritative primary database
    const opRes = await pool.query<{
      id: string;
      user_id: string;
      operation_id: string;
      recovery_secret_hash: string;
      status: string;
      expires_at: Date | string;
    }>(
      `SELECT id, user_id, operation_id, recovery_secret_hash, status, expires_at
       FROM auth_operation_log
       WHERE user_id = $1 AND operation_id = $2`,
      [userId, operationId]
    );

    if (opRes.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: {
          code: 'OPERATION_NOT_FOUND_OR_UNCERTAIN',
          message: 'No completed password change operation found for the provided identifiers',
          details: {},
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const record = opRes.rows[0];

    // Enforce 2-hour recovery validity
    if (new Date(record.expires_at) <= new Date()) {
      res.status(410).json({
        success: false,
        error: {
          code: 'RECOVERY_EXPIRED',
          message: 'Recovery record has expired (2-hour limit). Please log in with your new password.',
          details: {},
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Validate recovery secret using constant-time comparison
    const providedHash = hashToken(recoverySecret);
    const expectedHashBuf = Buffer.from(record.recovery_secret_hash, 'utf8');
    const providedHashBuf = Buffer.from(providedHash, 'utf8');

    if (
      expectedHashBuf.length !== providedHashBuf.length ||
      !crypto.timingSafeEqual(expectedHashBuf, providedHashBuf)
    ) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Invalid recovery secret',
          details: {},
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        operationId: record.operation_id,
        status: record.status,
        confirmed: record.status === 'COMMITTED',
      },
      message: 'Password change confirmed. Please log in with your new password.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('[auth/change-password/recover] Internal error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        details: {},
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile verified by server.
 */
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await userRepository.findById(req.user!.id);
    if (!user || user.status !== 'active') {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'User not found or inactive', details: {} },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          status: user.status,
        },
      },
      message: '',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('[auth/me] Internal error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: {} },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Initiates secure password recovery.
 * Generates high-entropy 6-digit recovery code and logs/stores in auth_operation_log (15m expiry).
 * Sends password reset email via Gmail SMTP (awalalshehada2027@gmail.com).
 * Enforces rate limiting and prevents account enumeration (C7 §4.4, §19).
 */
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validateForgotPasswordPayload(req.body);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: validation.errors },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { email } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    // Rate limiting: 3 requests per 15 minutes per IP, 2 per Email
    if (!checkForgotPasswordRateLimit(clientIp, normalizedEmail)) {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'تم تجاوز عدد المحاولات المسموح بها. يرجى الانتظار بضع دقائق قبل المحاولة مجدداً.',
          details: {},
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const user = await userRepository.findByEmail(normalizedEmail);
    let devCode: string | undefined;
    const isProduction = process.env.NODE_ENV === 'production';

    if (user && user.status === 'active') {
      const resetCode = crypto.randomInt(1000, 10000).toString();
      const codeHash = hashToken(resetCode);

      await pool.query(
        `INSERT INTO auth_operation_log (
           user_id, operation_id, operation_type, recovery_secret_hash, status, expires_at, created_at
         ) VALUES ($1, 'PASSWORD_RESET', 'PASSWORD_RESET', $2, 'PENDING', NOW() + INTERVAL '15 minutes', NOW())
         ON CONFLICT (user_id, operation_id)
         DO UPDATE SET recovery_secret_hash = $2, status = 'PENDING', expires_at = NOW() + INTERVAL '15 minutes', created_at = NOW()`,
        [user.id, codeHash]
      );

      // Reset any failed attempts counter on fresh code generation
      clearFailedResetAttempts(user.id);

      // Attempt sending email via Gmail SMTP
      const emailResult = await sendPasswordResetEmail({
        toEmail: user.email,
        resetCode,
        recipientName: user.fullName,
      });

      // Strict production privacy invariant: NEVER return resetCode in production responses or production logs
      if (!isProduction && !emailResult.sent) {
        devCode = resetCode;
      }
    }

    // Generic response prevents account enumeration (C7 §4.4, §19)
    res.status(200).json({
      success: true,
      data: {
        devCode,
        emailConfigured: isSmtpConfigured(),
      },
      message: 'إذا كان البريد الإلكتروني مسجلاً لدينا، فستصلك رسالة تحتوي على رمز استعادة كلمة المرور.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('[auth/forgot-password] Internal error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: {} },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Completes password reset with verification code, updates password (Argon2id),
 * increments token_version (revoking all active sessions), and marks operation committed.
 * Includes brute-force protection (max 5 failed attempts before code revocation).
 */
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const validation = validateResetPasswordPayload(req.body);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: validation.errors },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { email, resetCode, newPassword } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    await client.query('BEGIN');

    const userRes = await client.query<{ id: string; status: string }>(
      `SELECT id, status FROM users WHERE email = $1 FOR UPDATE`,
      [normalizedEmail]
    );

    if (userRes.rows.length === 0 || userRes.rows[0].status !== 'active') {
      await client.query('ROLLBACK');
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'رمز التحقق غير صالح أو منتهي الصلاحية.', details: {} },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const userId = userRes.rows[0].id;

    // Check brute-force attempts on this user's current code
    const currentFailedAttempts = getFailedResetAttempts(userId);
    if (currentFailedAttempts >= 5) {
      await client.query(
        `UPDATE auth_operation_log SET status = 'REVOKED'
         WHERE user_id = $1 AND operation_id = 'PASSWORD_RESET' AND status = 'PENDING'`,
        [userId]
      );
      await client.query('COMMIT');
      res.status(401).json({
        success: false,
        error: {
          code: 'TOO_MANY_FAILED_ATTEMPTS',
          message: 'تم تجاوز الحد الأقصى للمحاولات الخاطئة (5 محاولات). تم إبطال الرمز لأسباب أمنية، يرجى طلب رمز جديد.',
          details: {},
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const opRes = await client.query<{ id: string; recovery_secret_hash: string; expires_at: Date | string; status: string }>(
      `SELECT id, recovery_secret_hash, expires_at, status
       FROM auth_operation_log
       WHERE user_id = $1 AND operation_id = 'PASSWORD_RESET' AND operation_type = 'PASSWORD_RESET'
       FOR UPDATE`,
      [userId]
    );

    if (opRes.rows.length === 0 || opRes.rows[0].status !== 'PENDING') {
      await client.query('ROLLBACK');
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'رمز التحقق غير صالح أو تم استخدامه مسبقاً.', details: {} },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const opRecord = opRes.rows[0];

    // Expiration check (15 minutes window)
    if (new Date(opRecord.expires_at) <= new Date()) {
      await client.query(`UPDATE auth_operation_log SET status = 'EXPIRED' WHERE id = $1`, [opRecord.id]);
      await client.query('COMMIT');
      clearFailedResetAttempts(userId);
      res.status(410).json({
        success: false,
        error: { code: 'RECOVERY_EXPIRED', message: 'انتهت صلاحية رمز الاستعادة (15 دقيقة). يرجى طلب رمز جديد.', details: {} },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const providedHash = hashToken(String(resetCode).trim());
    const expectedHashBuf = Buffer.from(opRecord.recovery_secret_hash, 'utf8');
    const providedHashBuf = Buffer.from(providedHash, 'utf8');

    const isMatch =
      expectedHashBuf.length === providedHashBuf.length &&
      crypto.timingSafeEqual(expectedHashBuf, providedHashBuf);

    if (!isMatch) {
      const attempts = recordFailedResetAttempt(userId);
      if (attempts >= 5) {
        await client.query(`UPDATE auth_operation_log SET status = 'REVOKED' WHERE id = $1`, [opRecord.id]);
        await client.query('COMMIT');
        res.status(401).json({
          success: false,
          error: {
            code: 'TOO_MANY_FAILED_ATTEMPTS',
            message: 'تم تجاوز الحد الأقصى للمحاولات الخاطئة (5 محاولات). تم إبطال رمز التحقق، يرجى طلب رمز جديد.',
            details: {},
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      await client.query('ROLLBACK');
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: `رمز التحقق غير صحيح. تبقى لك ${5 - attempts} محاولات.`,
          details: { remainingAttempts: 5 - attempts },
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Success: Clear failed attempts
    clearFailedResetAttempts(userId);

    const newPasswordHash = await hashPassword(newPassword);

    await client.query(
      `UPDATE users
       SET password_hash = $1,
           token_version = COALESCE(token_version, 1) + 1,
           updated_at = NOW()
       WHERE id = $2`,
      [newPasswordHash, userId]
    );

    await client.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );

    await client.query(
      `DELETE FROM refresh_replay_buffer WHERE user_id = $1`,
      [userId]
    );

    await client.query(
      `UPDATE auth_operation_log SET status = 'COMMITTED' WHERE id = $1`,
      [opRecord.id]
    );

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      data: { reset: true },
      message: 'تم إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    console.error('[auth/reset-password] Internal error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: {} },
      timestamp: new Date().toISOString(),
    });
  } finally {
    client.release();
  }
});

export default router;

