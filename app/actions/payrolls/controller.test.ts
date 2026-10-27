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

const LAST_WORKING_DAY = { payDayRule: 'last-working-day', payDayOffset: '0' }

async function setUpLegalEntity(browser: Browser) {
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
  return { legalEntityPath, legalEntityId: lastSegment(legalEntityPath) }
}

// The payroll form as a browser sends it: every pay day rule setting, used or not.
function payrollFields(payDayRule: Record<string, string>) {
  return {
    name: 'Monthly salaried',
    payFrequency: 'monthly',
    payDayOffset: '',
    payDayWeekday: '5',
    payDayOfMonth: '',
    payDayRoll: 'earlier',
    ...payDayRule,
  }
}

async function setUpPayroll(browser: Browser, payDayRule: Record<string, string> = LAST_WORKING_DAY) {
  let { legalEntityPath, legalEntityId } = await setUpLegalEntity(browser)
  let payrollPath = await submitForRedirect(
    browser,
    legalEntityPath,
    routes.legalEntities.createPayroll.href({ legalEntityId }),
    payrollFields(payDayRule),
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
  it('creates payrolls with each pay day rule and describes the rule', async (t) => {
    let cases: [Record<string, string>, string][] = [
      [LAST_WORKING_DAY, 'Last working day of the pay period'],
      [
        { payDayRule: 'last-working-day', payDayOffset: '2' },
        'Last working day of the pay period, less 2 working days',
      ],
      [
        { payDayRule: 'last-weekday', payDayWeekday: '5', payDayRoll: 'earlier' },
        'Last Friday of the pay period, or the working day before',
      ],
      [
        { payDayRule: 'fixed-date', payDayOfMonth: '25', payDayRoll: 'later' },
        'The 25th of the pay period, or the working day after',
      ],
      [
        { payDayRule: 'next-period-first-working-day', payDayOffset: '1' },
        'First working day of the following pay period, plus 1 working day',
      ],
    ]

    for (let [payDayRule, description] of cases) {
      let { router, close } = await createTestRouter()
      t.after(close)
      let browser = createClient(router)
      let { payrollPath } = await setUpPayroll(browser, payDayRule)

      let html = await (await browser.get(payrollPath)).text()
      assert.ok(html.includes(description), `${payDayRule.payDayRule}: expected "${description}"`)
    }
  })

  it('pays March in April under the next pay period rule, keeping it as March\'s pay run', async (t) => {
    let { router, close } = await createTestRouter({ holidays: { 'GB 2027': [] } })
    t.after(close)
    let browser = createClient(router)
    let { payrollPath, payrollId } = await setUpPayroll(browser, {
      payDayRule: 'next-period-first-working-day',
      payDayOffset: '0',
    })

    await browser.submit(payrollPath, routes.payrolls.generate.href({ payrollId }), {
      start: '2027-03-01',
      end: '2027-03-31',
    })

    let html = await (await browser.get(payrollPath)).text()
    assert.match(html, /March 2027[\s\S]*Thu 1 Apr 2027/)
    assert.doesNotMatch(html, /April 2027/)
  })

  it('rejects pay day rule settings that are out of range', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    let browser = createClient(router)
    let { legalEntityPath, legalEntityId } = await setUpLegalEntity(browser)
    let action = routes.legalEntities.createPayroll.href({ legalEntityId })

    let cases: [Record<string, string>, RegExp][] = [
      [{ payDayRule: 'last-working-day', payDayOffset: '-1' }, /Enter a whole number of working days from 0 to 99/],
      [{ payDayRule: 'next-period-first-working-day', payDayOffset: '' }, /Enter a whole number of working days from 0 to 99/],
      [{ payDayRule: 'fixed-date', payDayOfMonth: '32' }, /Enter a day of the month from 1 to 31/],
    ]

    for (let [payDayRule, message] of cases) {
      let response = await browser.submit(legalEntityPath, action, payrollFields(payDayRule))
      assert.equal(response.status, 400, payDayRule.payDayRule)
      assert.match(await response.text(), message)
    }

    let rejected = await (
      await browser.submit(legalEntityPath, action, payrollFields({ payDayRule: 'fixed-date', payDayOfMonth: '32', payDayRoll: 'later' }))
    ).text()
    assert.match(rejected, /<option[^>]*value="fixed-date"[^>]*selected|<option[^>]*selected[^>]*value="fixed-date"/)
    assert.match(rejected, /<option[^>]*value="later"[^>]*selected|<option[^>]*selected[^>]*value="later"/)
    assert.match(rejected, /name="payDayOfMonth"[^>]*value="32"|value="32"[^>]*name="payDayOfMonth"/)

    let html = await (await browser.get(legalEntityPath)).text()
    assert.match(html, /No payrolls yet/)
  })
})
