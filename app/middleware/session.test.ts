import * as assert from 'remix/assert'
import { createCookie } from 'remix/cookie'
import { describe, it } from 'remix/test'
import type { TestContext } from 'remix/test'

import { createSessionCookie } from './session.ts'

// Sets env vars for one test and restores the previous values afterwards.
function setEnv(t: TestContext, values: Record<string, string | undefined>) {
  let previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]))
  t.after(() => applyEnv(previous))
  applyEnv(values)
}

function applyEnv(values: Record<string, string | undefined>) {
  for (let [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

// The `name=value` pair a browser would send back for a Set-Cookie header.
async function signedWith(secrets: string[]) {
  let header = await createCookie('__session', { secrets }).serialize('session-id')
  return header.split(';', 1)[0]
}

describe('session cookie', () => {
  it('signs with SESSION_SECRET', async (t) => {
    setEnv(t, { SESSION_SECRET: 'prod-secret', NODE_ENV: 'production' })
    let cookie = createSessionCookie()

    assert.equal(cookie.signed, true)
    assert.equal(await cookie.parse(await signedWith(['prod-secret'])), 'session-id')
    assert.equal(await cookie.parse(await signedWith(['some-other-secret'])), null)
  })

  it('rotates secrets: signs with the first, still accepts the older ones', async (t) => {
    setEnv(t, { SESSION_SECRET: ' new-secret , old-secret ', NODE_ENV: 'production' })
    let cookie = createSessionCookie()

    assert.equal(await cookie.parse(await signedWith(['old-secret'])), 'session-id')

    let fresh = (await cookie.serialize('session-id')).split(';', 1)[0]
    assert.equal(await createCookie('__session', { secrets: ['new-secret'] }).parse(fresh), 'session-id')
    assert.equal(await createCookie('__session', { secrets: ['old-secret'] }).parse(fresh), null)
  })

  it('refuses to start in production without SESSION_SECRET', (t) => {
    setEnv(t, { SESSION_SECRET: undefined, NODE_ENV: 'production' })
    for (let missing of [undefined, '', ' , ']) {
      applyEnv({ SESSION_SECRET: missing })
      assert.throws(() => createSessionCookie(), /SESSION_SECRET must be set in production/)
    }
  })

  it('falls back to a dev secret outside production', async (t) => {
    setEnv(t, { SESSION_SECRET: undefined, NODE_ENV: 'development' })
    let cookie = createSessionCookie()

    assert.equal(cookie.signed, true)
    assert.equal(await cookie.parse(await signedWith(['dev-only-session-secret'])), 'session-id')
  })

  it('sets protective cookie attributes', async () => {
    let header = await createSessionCookie(['test-secret']).serialize('session-id')

    assert.match(header, /HttpOnly/i)
    assert.match(header, /SameSite=Lax/i)
    assert.match(header, /Path=\//)
    assert.match(header, /Max-Age=2592000/)
  })
})
