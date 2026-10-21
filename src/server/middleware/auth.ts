import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/tokenService';
import { userRepository } from '../repositories/userRepository';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  status: string;
  tokenVersion: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Reusable authentication middleware adhering strictly to C4 and C7.
 * 1. Reads the Bearer access token from the Authorization header.
 * 2. Cryptographically verifies it using "jose".
 * 3. Enforces server-authoritative identity from JWT "sub".
 * 4. Queries repository to verify user account status (status === 'active').
 * 5. Checks token_version for immediate server-side session invalidation (D4 / PD-003).
 * 6. Rejects missing, expired, or invalid credentials with C4 error envelopes.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Bearer authorization token is required',
        details: {},
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Bearer authorization token is empty',
        details: {},
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const claims = await verifyAccessToken(token);

    // Verify current account status and token_version via repository (C7 §9, §10, C4 §40, PD-003 D4)
    const user = await userRepository.findById(claims.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'User account not found',
          details: {},
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

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

    // D4: Immediate Server-Side Invalidation check against authoritative database
    if (user.tokenVersion !== claims.tokenVersion) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Token has been revoked by a security event',
          details: {},
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Attach trusted server-authoritative identity context (excluding sensitive fields)
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      tokenVersion: user.tokenVersion,
    };

    next();
  } catch (err: unknown) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Invalid or expired authorization token',
        details: {},
      },
      timestamp: new Date().toISOString(),
    });
  }
}
