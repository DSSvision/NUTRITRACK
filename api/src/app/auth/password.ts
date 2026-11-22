import argon2 from 'argon2';

/**
 * Hash a password using Argon2id.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
  });
}
console.log(argon2.argon2id, 'hash password');

/**
 * Verify a plain-text password against
 * an Argon2id password hash.
 */
export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return argon2.verify(passwordHash, password);
}
