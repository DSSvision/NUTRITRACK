import crypto from 'crypto';

import { prisma } from '../prisma';

import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} from './jwt';

import { hashPassword, verifyPassword } from './password';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

/**
 * Hash a refresh token before storing it.
 *
 * We never store the actual refresh token
 * in MongoDB.
 */
function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create a refresh token record.
 */
async function createRefreshTokenRecord(userId: string) {
  const tokenId = crypto.randomBytes(12).toString('hex');

  const refreshToken = createRefreshToken(userId, tokenId);

  const tokenHash = hashRefreshToken(refreshToken);

  const expiresAt = new Date();

  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.refreshToken.create({
    data: {
      id: tokenId,
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return refreshToken;
}

/**
 * Create access + refresh tokens.
 */
async function createAuthSession(userId: string) {
  const accessToken = createAccessToken(userId);

  const refreshToken = await createRefreshTokenRecord(userId);

  return {
    accessToken,
    refreshToken,
  };
}

/**
 * Register a new email/password user.
 */
export async function registerUser(input: RegisterInput) {
  const email = input.email.trim().toLowerCase();

  const name = input.name.trim();

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw new Error('An account with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      authProvider: 'email',
    },
  });

  const tokens = await createAuthSession(user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    ...tokens,
  };
}

/**
 * Login using email/password.
 */
export async function loginUser(input: LoginInput) {
  const email = input.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  /**
   * Don't reveal whether an email
   * exists in the database.
   */
  if (!user || !user.passwordHash) {
    throw new Error(
      'Email not found or password login not enabled for this account',
    );
  }

  const valid = await verifyPassword(user.passwordHash, input.password);

  if (!valid) {
    throw new Error('Invalid password');
  }

  const tokens = await createAuthSession(user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    ...tokens,
  };
}

/**
 * Refresh an access token.
 *
 * The old refresh token is revoked and
 * a new refresh token is issued.
 */
export async function refreshSession(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);

  const tokenHash = hashRefreshToken(refreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash,
    },
  });

  if (
    !storedToken ||
    storedToken.id !== payload.jti ||
    storedToken.userId !== payload.sub ||
    storedToken.revokedAt ||
    storedToken.expiresAt <= new Date()
  ) {
    throw new Error('Invalid or expired refresh token');
  }

  /**
   * Refresh-token rotation:
   *
   * Revoke old token first.
   */
  await prisma.refreshToken.update({
    where: {
      id: storedToken.id,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return createAuthSession(storedToken.userId);
}

/**
 * Revoke a refresh token.
 */
export async function logoutUser(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}
