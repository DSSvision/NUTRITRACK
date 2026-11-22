import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from './jwt';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authorization header is required',
        },
      });
      return;
    }

    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid authorization header',
        },
      });
      return;
    }

    const payload = verifyAccessToken(token);

    req.userId = payload.sub;

    next();
  } catch {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired access token',
      },
    });
    return;
  }
}
