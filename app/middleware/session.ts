import { createCookie } from 'remix/cookie'
import type { Cookie } from 'remix/cookie'
import { createCookieSessionStorage } from 'remix/session-storage/cookie'

const DEV_SECRET = 'dev-only-session-secret'

// Secure is set per request by the session middleware: on for HTTPS, off for local HTTP.
export function createSessionCookie(secrets = readSecrets()): Cookie {
  return createCookie('__session', {
    secrets,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export function createSessionStorage() {
  return createCookieSessionStorage()
}

// SESSION_SECRET may hold a comma-separated list, newest first, to rotate secrets.
function readSecrets(): string[] {
  let secrets = (process.env.SESSION_SECRET ?? '')
    .split(',')
    .map((secret) => secret.trim())
    .filter(Boolean)
  if (secrets.length > 0) return secrets

  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set in production')
  }
  return [DEV_SECRET]
}
