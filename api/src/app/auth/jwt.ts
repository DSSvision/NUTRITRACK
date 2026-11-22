import jwt from 'jsonwebtoken';

export interface AccessTokenPayload {
  sub: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}

function getAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is not configured');
  }

  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;

  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not configured');
  }

  return secret;
}

/**
 * Create a short-lived access token.
 */
export function createAccessToken(userId: string): string {
  return jwt.sign(
    {
      sub: userId,
      type: 'access',
    },
    getAccessSecret(),
    {
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ??
        '15m') as jwt.SignOptions['expiresIn'],
    },
  );
}

/**
 * Create a refresh token.
 *
 * jti is stored in our database so that
 * refresh tokens can later be revoked/rotated.
 */
export function createRefreshToken(userId: string, tokenId: string): string {
  return jwt.sign(
    {
      sub: userId,
      jti: tokenId,
      type: 'refresh',
    },
    getRefreshSecret(),
    {
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ??
        '30d') as jwt.SignOptions['expiresIn'],
    },
  );
}

/**
 * Verify an access token.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, getAccessSecret());

  if (
    typeof payload === 'string' ||
    payload.type !== 'access' ||
    typeof payload.sub !== 'string'
  ) {
    throw new Error('Invalid access token');
  }

  return payload as AccessTokenPayload;
}

/**
 * Verify a refresh token.
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = jwt.verify(token, getRefreshSecret());

  if (
    typeof payload === 'string' ||
    payload.type !== 'refresh' ||
    typeof payload.sub !== 'string' ||
    typeof payload.jti !== 'string'
  ) {
    throw new Error('Invalid refresh token');
  }

  return payload as RefreshTokenPayload;
}
