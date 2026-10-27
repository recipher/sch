import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { createClient } from '../../../test/client.ts'
import { createTestRouter } from '../../../test/router.ts'
import { verifyPassword } from '../../data/passwords.ts'
import { users } from '../../data/tables.ts'
import { routes } from '../../routes.ts'

function signup(client: ReturnType<typeof createClient>, fields: Record<string, string>) {
  return client.submit(routes.signup.index.href(), routes.signup.action.href(), fields)
}

describe('signup', () => {
  it('GET /signup renders the form', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)

    let response = await createClient(router).get(routes.signup.index.href())

    assert.equal(response.status, 200)
    let html = await response.text()
    assert.match(html, /<form[^>]*method="post"/)
    assert.match(html, /name="email"/)
    assert.match(html, /name="password"/)
    assert.match(html, /name="_csrf"/)
  })

  it('creates a user with a hashed password and signs them in', async (t) => {
    let { router, db, close } = await createTestRouter()
    t.after(close)
    let client = createClient(router)

    let response = await signup(client, { email: '  Pat@Example.com ', password: 'correct horse' })

    assert.equal(response.status, 303)
    assert.equal(response.headers.get('Location'), routes.account.href())

    let user = await db.findOne(users, { where: { email: 'pat@example.com' } })
    assert.ok(user)
    assert.notEqual(user.password_hash, 'correct horse')
    assert.equal(await verifyPassword('correct horse', user.password_hash), true)
    assert.equal(await verifyPassword('wrong password', user.password_hash), false)

    let account = await client.get(routes.account.href())
    assert.equal(account.status, 200)
    let html = await account.text()
    assert.match(html, /Signed in as/)
    assert.match(html, /pat@example\.com/)
  })

  it('rejects invalid input without creating a user', async (t) => {
    let { router, db, close } = await createTestRouter()
    t.after(close)

    let response = await signup(createClient(router), { email: 'not-an-email', password: 'short' })

    assert.equal(response.status, 400)
    let html = await response.text()
    assert.match(html, /Enter a valid email address/)
    assert.match(html, /Password must be at least 8 characters/)
    assert.doesNotMatch(html, /value="short"/)
    // Must be the string "true": an empty aria-invalid reads as valid to assistive tech.
    assert.equal(html.match(/aria-invalid="true"/g)?.length, 2)
    assert.equal((await db.findMany(users, {})).length, 0)
  })

  it('rejects a duplicate email', async (t) => {
    let { router, db, close } = await createTestRouter()
    t.after(close)

    await signup(createClient(router), { email: 'sam@example.com', password: 'password one' })
    let response = await signup(createClient(router), {
      email: 'SAM@example.com',
      password: 'password two',
    })

    assert.equal(response.status, 409)
    assert.match(await response.text(), /already exists/)
    assert.equal((await db.findMany(users, {})).length, 1)
  })

  it('rejects a submission without a CSRF token', async (t) => {
    let { router, db, close } = await createTestRouter()
    t.after(close)

    let response = await createClient(router).post(routes.signup.action.href(), {
      email: 'pat@example.com',
      password: 'correct horse',
    })

    assert.equal(response.status, 403)
    assert.equal((await db.findMany(users, {})).length, 0)
  })

  it('sends signed-in users to their account', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    let client = createClient(router)
    await signup(client, { email: 'pat@example.com', password: 'correct horse' })

    let response = await client.get(routes.signup.index.href())

    assert.equal(response.status, 303)
    assert.equal(response.headers.get('Location'), routes.account.href())
  })

  it('returns 409 when a concurrent signup takes the email first', async (t) => {
    let { router, db, close } = await createTestRouter()
    t.after(close)
    await signup(createClient(router), { email: 'sam@example.com', password: 'password one' })

    // Simulate the race: the duplicate check sees no user, so only the UNIQUE constraint catches it.
    let lookup = t.mock.method(db, 'findOne', async () => null)
    let response = await signup(createClient(router), {
      email: 'sam@example.com',
      password: 'password two',
    })

    assert.equal(lookup.mock.calls.length, 1)
    assert.equal(response.status, 409)
    assert.match(await response.text(), /already exists/)
    assert.equal((await db.findMany(users, {})).length, 1)
  })

  it('returns 500 without details when the user cannot be saved', async (t) => {
    let { router, db, close } = await createTestRouter()
    t.after(close)
    t.mock.method(db, 'create', async () => {
      throw new Error('disk I/O error at /var/data/app.sqlite')
    })
    let logged = t.mock.method(console, 'error', () => {})

    let response = await signup(createClient(router), {
      email: 'pat@example.com',
      password: 'correct horse',
    })

    assert.equal(response.status, 500)
    let body = await response.text()
    assert.equal(body, 'Unable to create account')
    assert.doesNotMatch(body, /disk I\/O|app\.sqlite/)
    assert.equal(logged.mock.calls.length, 1)
  })
})
