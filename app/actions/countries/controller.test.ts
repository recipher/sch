import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { createClient } from '../../../test/client.ts'
import { createTestRouter } from '../../../test/router.ts'
import { routes } from '../../routes.ts'

type Browser = ReturnType<typeof createClient>

async function signUp(browser: Browser) {
  await browser.submit(routes.signup.index.href(), routes.signup.action.href(), {
    email: 'pat@example.com',
    password: 'correct horse',
  })
}

// The values of the working week checkboxes that are ticked.
function checkedDays(html: string): string[] {
  return [...html.matchAll(/<input\b[^>]*name="days"[^>]*>/g)]
    .map(([input]) => input)
    .filter((input) => /\schecked\b/.test(input))
    .map((input) => input.match(/\bvalue="([^"]*)"/)?.[1] ?? '')
}

describe('country pages', () => {
  it('sends signed-out visitors to log in', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    let browser = createClient(router)

    let response = await browser.get(routes.countries.show.href({ country: 'GB' }))

    assert.equal(response.status, 303)
    assert.match(response.headers.get('Location') ?? '', /^\/login\?returnTo=/)
  })

  it("links a legal entity to its country, which works Monday to Friday until changed", async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    let browser = createClient(router)
    await signUp(browser)
    let clientPath = (await browser.submit(routes.clients.index.href(), routes.clients.create.href(), { name: 'Acme Group' }))
      .headers.get('Location')!
    let clientId = clientPath.slice(clientPath.lastIndexOf('/') + 1)
    let legalEntityPath = (
      await browser.submit(clientPath, routes.clients.createLegalEntity.href({ clientId }), {
        name: 'Acme UK Ltd',
        country: 'GB',
        region: '',
      })
    ).headers.get('Location')!

    let legalEntityHtml = await (await browser.get(legalEntityPath)).text()
    assert.match(legalEntityHtml, new RegExp(`href="${routes.countries.show.href({ country: 'GB' })}"[^>]*>United Kingdom<`))

    let countryHtml = await (await browser.get(routes.countries.show.href({ country: 'GB' }))).text()
    assert.match(countryHtml, /United Kingdom/)
    assert.deepEqual(checkedDays(countryHtml), ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
  })

  it("edits a country's working week", async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    let browser = createClient(router)
    await signUp(browser)
    let countryPath = routes.countries.show.href({ country: 'AE' })

    let response = await browser.submit(countryPath, routes.countries.updateWorkingWeek.href({ country: 'AE' }), {
      days: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    })

    assert.equal(response.status, 303)
    assert.equal(response.headers.get('Location'), countryPath)
    let html = await (await browser.get(countryPath)).text()
    assert.deepEqual(checkedDays(html), ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'])
    let otherCountry = await (await browser.get(routes.countries.show.href({ country: 'GB' }))).text()
    assert.deepEqual(checkedDays(otherCountry), ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
  })

  it('rejects a working week with no days and keeps the one already set', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    let browser = createClient(router)
    await signUp(browser)
    let countryPath = routes.countries.show.href({ country: 'AE' })

    let response = await browser.submit(countryPath, routes.countries.updateWorkingWeek.href({ country: 'AE' }), {})

    assert.equal(response.status, 400)
    assert.match(await response.text(), /Choose at least one working day/)
    let html = await (await browser.get(countryPath)).text()
    assert.deepEqual(checkedDays(html), ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
  })

  it('returns 404 for something that is not a country code', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    let browser = createClient(router)
    await signUp(browser)

    for (let country of ['narnia', 'gb', 'G1']) {
      let response = await browser.get(routes.countries.show.href({ country }))
      assert.equal(response.status, 404, country)
    }
  })
})
