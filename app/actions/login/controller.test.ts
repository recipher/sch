import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { createClient } from '../../../test/client.ts'
import { createTestRouter } from '../../../test/router.ts'
import { users } from '../../data/tables.ts'
import { routes } from '../../routes.ts'

const credentials = { email: 'pat@example.com', password: 'correct horse' }

// Creates an account in its own browser, so the caller starts signed out.
async function createUser(router: Parameters<typeof createClient>[0]) {
  let response = await createClient(router).submit(
    routes.signup.index.href(),
    routes.signup.action.href(),
    credentials,
  )
  assert.equal(response.status, 303)
}

function login(client: ReturnType<typeof createClient>, fields: Record<string, string>, formPath = routes.login.index.href()) {
  return client.submit(formPath, routes.login.action.href(), fields)
}

describe('login and logout', () => {
  it('redirects anonymous visitors from /account to login', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)

    let response = await createClient(router).get(routes.account.href())

    assert.equal(response.status, 303)
    assert.equal(response.headers.get('Location'), '/login?returnTo=%2Faccount')
  })

  it('signs in with valid credentials and rotates the session', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    await createUser(router)
    let client = createClient(router)

    await client.get(routes.login.index.href())
    let anonymousSession = client.cookies.get('__session')
    let response = await login(client, { email: ' PAT@example.com', password: credentials.password })

    assert.equal(response.status, 303)
    assert.equal(response.headers.get('Location'), routes.account.href())
    assert.notEqual(client.cookies.get('__session'), anonymousSession)

    let account = await client.get(routes.account.href())
    assert.equal(account.status, 200)
    let html = await account.text()
    assert.match(html, /Signed in as/)
    assert.match(html, /pat@example\.com/)
  })

  it('rejects a wrong password and an unknown email with the same message', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    await createUser(router)
    let client = createClient(router)

    for (let fields of [
      { email: credentials.email, password: 'wrong password' },
      { email: 'nobody@example.com', password: credentials.password },
    ]) {
      let response = await login(client, fields)
      assert.equal(response.status, 401)
      let html = await response.text()
      assert.match(html, /Incorrect email or password/)
      assert.doesNotMatch(html, new RegExp(fields.password))
    }

    let account = await client.get(routes.account.href())
    assert.equal(account.status, 303)
  })

  it('returns to the requested page after signing in', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    await createUser(router)
    let client = createClient(router)

    // /account is also the default destination, so use a different page to prove returnTo is used.
    let formPath = `${routes.login.index.href()}?returnTo=${encodeURIComponent('/?tab=recent#top')}`
    let response = await login(client, credentials, formPath)

    assert.equal(response.status, 303)
    assert.equal(response.headers.get('Location'), '/?tab=recent#top')
  })

  it('ignores a returnTo that points off-site', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    await createUser(router)

    for (let returnTo of ['//evil.example', 'https://evil.example', '/\\evil.example']) {
      let response = await login(createClient(router), { ...credentials, returnTo })
      assert.equal(response.headers.get('Location'), routes.account.href())
    }
  })

  it('logs out and ends the session', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    await createUser(router)
    let client = createClient(router)
    await login(client, credentials)

    let response = await client.submit(routes.account.href(), routes.logout.href(), {})

    assert.equal(response.status, 303)
    assert.equal(response.headers.get('Location'), routes.login.index.href())
    let account = await client.get(routes.account.href())
    assert.equal(account.status, 303)
  })

  it('rejects a logout without a CSRF token', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    await createUser(router)
    let client = createClient(router)
    await login(client, credentials)

    let response = await client.post(routes.logout.href(), {})

    assert.equal(response.status, 403)
    assert.equal((await client.get(routes.account.href())).status, 200)
  })

  it('sends signed-in users from /login to their account', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    await createUser(router)
    let client = createClient(router)
    await login(client, credentials)

    let response = await client.get(routes.login.index.href())

    assert.equal(response.status, 303)
    assert.equal(response.headers.get('Location'), routes.account.href())
  })

  it('treats a session whose user was deleted as signed out', async (t) => {
    let { router, db, close } = await createTestRouter()
    t.after(close)
    await createUser(router)
    let client = createClient(router)
    await login(client, credentials)

    let user = await db.findOne(users, { where: { email: credentials.email } })
    assert.ok(user)
    await db.delete(users, user.id)

    let account = await client.get(routes.account.href())
    assert.equal(account.status, 303)
    assert.equal(account.headers.get('Location'), '/login?returnTo=%2Faccount')

    // The stale identity must be removed from the session, not just ignored on that request:
    // if it lingered, recreating a user with the same id would silently sign this browser back in.
    await db.create(users, { ...user, email: 'someone-new@example.com' })
    assert.equal((await client.get(routes.account.href())).status, 303)
  })
})
