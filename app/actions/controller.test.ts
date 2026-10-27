import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { createClient } from '../../test/client.ts'
import { createTestRouter } from '../../test/router.ts'
import { routes } from '../routes.ts'

describe('root controller', () => {
  it('GET / returns the home page', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)

    let response = await router.fetch(new URL(routes.home.href(), 'http://localhost'))

    assert.equal(response.status, 200)
    assert.match(response.headers.get('Content-Type') ?? '', /text\/html/)
    assert.match(await response.text(), /<html[\s>]/)
  })

  it('links signed-out visitors to log in and sign up', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)

    let html = await (await createClient(router).get(routes.home.href())).text()

    assert.match(html, new RegExp(`href="${routes.login.index.href()}"`))
    assert.match(html, new RegExp(`href="${routes.signup.index.href()}"`))
    assert.doesNotMatch(html, new RegExp(`href="${routes.account.href()}"`))
  })

  it('links signed-in visitors to their account instead', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    let client = createClient(router)
    await client.submit(routes.signup.index.href(), routes.signup.action.href(), {
      email: 'pat@example.com',
      password: 'correct horse',
    })

    let html = await (await client.get(routes.home.href())).text()

    assert.match(html, new RegExp(`href="${routes.account.href()}"`))
    assert.doesNotMatch(html, new RegExp(`href="${routes.login.index.href()}"`))
    assert.doesNotMatch(html, new RegExp(`href="${routes.signup.index.href()}"`))
  })

  it('GET /styles.css serves the compiled Tailwind stylesheet', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)

    let response = await router.fetch(new URL(routes.styles.href(), 'http://localhost'))

    assert.equal(response.status, 200)
    assert.match(response.headers.get('Content-Type') ?? '', /text\/css/)
    let css = await response.text()
    assert.match(css, /tailwindcss v4/)
    // A utility only used in app markup, so its presence proves the app's files were scanned.
    assert.match(css, /\.bg-surface-0\b/)
  })
})
