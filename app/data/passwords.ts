import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>

const KEY_LENGTH = 64

// Stored as `scrypt$<salt>$<hash>` with base64url-encoded parts.
export async function hashPassword(password: string): Promise<string> {
  let salt = randomBytes(16)
  let hash = await scryptAsync(password, salt, KEY_LENGTH)
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  let parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false

  // Reject anything hashPassword() wouldn't have written. Invalid base64 decodes to fewer
  // bytes, and comparing a short (or empty) derived key would accept wrong passwords.
  let salt = Buffer.from(parts[1], 'base64url')
  let expected = Buffer.from(parts[2], 'base64url')
  if (salt.length === 0 || expected.length !== KEY_LENGTH) return false

  let actual = await scryptAsync(password, salt, KEY_LENGTH)
  return timingSafeEqual(actual, expected)
}
