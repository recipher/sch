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

// Submits a form and returns the path it redirects to.
async function submitForRedirect(browser: Browser, formPath: string, action: string, fields: Record<string, string>) {
  let response = await browser.submit(formPath, action, fields)
  assert.equal(response.status, 303)
  let location = response.headers.get('Location')
  assert.ok(location)
  return location
}

function lastSegment(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

async function setUpPayroll(browser: Browser) {
  await signUp(browser)
  let clientPath = await submitForRedirect(browser, routes.clients.index.href(), routes.clients.create.href(), {
    name: 'Acme Group',
  })
  let clientId = lastSegment(clientPath)
  let legalEntityPath = await submitForRedirect(
    browser,
    clientPath,
    routes.clients.createLegalEntity.href({ clientId }),
    { name: 'Acme UK Ltd', country: 'gb', region: '' },
  )
  let legalEntityId = lastSegment(legalEntityPath)
  let payrollPath = await submitForRedirect(
    browser,
    legalEntityPath,
    routes.legalEntities.createPayroll.href({ legalEntityId }),
    { name: 'Monthly salaried', payFrequency: 'monthly', payDayRule: 'last-working-day' },
  )
  return { payrollPath, payrollId: lastSegment(payrollPath) }
}

describe('payroll scheduling pages', () => {
  it('sends signed-out visitors to log in', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    let browser = createClient(router)

    for (let path of [
      routes.clients.index.href(),
      routes.clients.show.href({ clientId: 'any' }),
      routes.legalEntities.show.href({ legalEntityId: 'any' }),
      routes.payrolls.show.href({ payrollId: 'any' }),
    ]) {
      let response = await browser.get(path)
      assert.equal(response.status, 303, path)
      assert.match(response.headers.get('Location') ?? '', /^\/login\?returnTo=/, path)
    }
  })

  it('creates a client, legal entity and payroll, then generates draft schedules', async (t) => {
    let { router, close } = await createTestRouter({
      holidays: { 'GB 2027': [{ date: '2027-03-31', name: 'Spring Day', region: null }] },
    })
    t.after(close)
    let browser = createClient(router)
    let { payrollPath, payrollId } = await setUpPayroll(browser)

    let response = await browser.submit(payrollPath, routes.payrolls.generate.href({ payrollId }), {
      start: '2027-01-01',
      end: '2027-03-31',
    })
    assert.equal(response.status, 303)
    assert.equal(response.headers.get('Location'), payrollPath)

    let html = await (await browser.get(payrollPath)).text()
    assert.match(html, /Monthly salaried/)
    assert.match(html, /January 2027[\s\S]*Fri 29 Jan 2027[\s\S]*Draft/)
    assert.match(html, /February 2027[\s\S]*Fri 26 Feb 2027/)
    assert.match(html, /March 2027[\s\S]*Tue 30 Mar 2027/)
  })

  it('blocks generation and links to the holiday calendar when holiday data is missing', async (t) => {
    let { router, close } = await createTestRouter({ holidays: { 'GB 2027': [] } })
    t.after(close)
    let browser = createClient(router)
    let { payrollPath, payrollId } = await setUpPayroll(browser)

    let response = await browser.submit(payrollPath, routes.payrolls.generate.href({ payrollId }), {
      start: '2027-12-01',
      end: '2028-01-31',
    })

    assert.equal(response.status, 422)
    let html = await response.text()
    assert.match(html, /role="alert"[^>]*>[\s\S]*United Kingdom 2028[\s\S]*No holiday data for GB 2028/)
    assert.ok(html.includes(`href="${routes.holidayCalendars.show.href({ country: 'GB' }, { searchParams: { year: '2028' } })}"`))
    assert.doesNotMatch(html, /December 2027/)
  })

  it('shows the legal entity location on the client page', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    let browser = createClient(router)
    await signUp(browser)
    let clientPath = await submitForRedirect(browser, routes.clients.index.href(), routes.clients.create.href(), {
      name: 'Acme Group',
    })
    let clientId = lastSegment(clientPath)
    await submitForRedirect(browser, clientPath, routes.clients.createLegalEntity.href({ clientId }), {
      name: 'Acme GmbH',
      country: 'DE',
      region: 'BY',
    })

    let html = await (await browser.get(clientPath)).text()

    assert.match(html, /Acme GmbH[\s\S]*Germany \(BY\)/)
  })

  it('rejects a generation range that ends before it starts', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    let browser = createClient(router)
    let { payrollPath, payrollId } = await setUpPayroll(browser)

    let response = await browser.submit(payrollPath, routes.payrolls.generate.href({ payrollId }), {
      start: '2027-03-31',
      end: '2027-01-01',
    })

    assert.equal(response.status, 400)
    let html = await response.text()
    assert.match(html, /End date must not be before the start date/)
    assert.doesNotMatch(html, /January 2027/)
  })

  it('rejects a legal entity without a valid country', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    let browser = createClient(router)
    await signUp(browser)
    let clientPath = await submitForRedirect(browser, routes.clients.index.href(), routes.clients.create.href(), {
      name: 'Acme Group',
    })
    let clientId = lastSegment(clientPath)

    let response = await browser.submit(clientPath, routes.clients.createLegalEntity.href({ clientId }), {
      name: 'Acme Nowhere',
      country: 'Narnia',
      region: '',
    })

    assert.equal(response.status, 400)
    assert.match(await response.text(), /Enter a two-letter country code/)
  })

  it('returns 404 for an unknown payroll', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    let browser = createClient(router)
    await signUp(browser)

    let response = await browser.get(routes.payrolls.show.href({ payrollId: 'missing' }))

    assert.equal(response.status, 404)
  })
})
