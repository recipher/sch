import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { createClient } from '../../../test/client.ts'
import { lastSegment, signUp, submitForRedirect } from '../../../test/pages.ts'
import { createTestRouter } from '../../../test/router.ts'
import { routes } from '../../routes.ts'

type Browser = ReturnType<typeof createClient>

async function createLocatedParty(browser: Browser, kind: 'providers' | 'serviceCentres', name: string, country: string) {
  let path = await submitForRedirect(browser, routes[kind].index.href(), routes[kind].create.href(), {
    name,
    country,
    region: '',
  })
  return lastSegment(path)
}

async function setUp(browser: Browser) {
  await signUp(browser)
  let clientPath = await submitForRedirect(browser, routes.clients.index.href(), routes.clients.create.href(), {
    name: 'Acme Group',
  })
  let legalEntityPath = await submitForRedirect(
    browser,
    clientPath,
    routes.clients.createLegalEntity.href({ clientId: lastSegment(clientPath) }),
    { name: 'Acme UK Ltd', country: 'GB', region: '' },
  )
  let legalEntityId = lastSegment(legalEntityPath)
  let payrollPath = await submitForRedirect(
    browser,
    legalEntityPath,
    routes.legalEntities.createPayroll.href({ legalEntityId }),
    {
      name: 'Monthly salaried',
      payFrequency: 'monthly',
      payDayRule: 'last-working-day',
      payDayOffset: '0',
      payDayWeekday: '5',
      payDayOfMonth: '',
      payDayRoll: 'earlier',
    },
  )
  return { legalEntityPath, legalEntityId, payrollPath, payrollId: lastSegment(payrollPath) }
}

describe('payroll provider and service centre pages', () => {
  it("shows a payroll inheriting its legal entity's defaults, then overriding the provider", async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    let browser = createClient(router)
    let { legalEntityPath, legalEntityId, payrollPath, payrollId } = await setUp(browser)
    let payCo = await createLocatedParty(browser, 'providers', 'PayCo', 'GB')
    let bureau = await createLocatedParty(browser, 'providers', 'Bureau One', 'FR')
    let lisbon = await createLocatedParty(browser, 'serviceCentres', 'Lisbon', 'PT')

    await submitForRedirect(browser, legalEntityPath, routes.legalEntities.assignDefaults.href({ legalEntityId }), {
      providerId: payCo,
      serviceCentreId: lisbon,
    })
    let html = await (await browser.get(payrollPath)).text()
    assert.match(html, /PayCo \(inherited from Acme UK Ltd\)/)
    assert.match(html, /Lisbon \(inherited from Acme UK Ltd\)/)

    await submitForRedirect(browser, payrollPath, routes.payrolls.assignParties.href({ payrollId }), {
      providerId: bureau,
      serviceCentreId: '',
    })
    html = await (await browser.get(payrollPath)).text()
    assert.match(html, /Bureau One \(overridden for this payroll\)/)
    assert.match(html, /Lisbon \(inherited from Acme UK Ltd\)/)
  })

  it('shows none when neither the payroll nor its legal entity has a provider', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    let browser = createClient(router)
    let { payrollPath } = await setUp(browser)

    let text = (await (await browser.get(payrollPath)).text()).replace(/<[^>]+>/g, ' ')

    assert.match(text, /Provider\s+None\s+Service centre\s+None/)
  })

  it('rejects an unknown provider', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    let browser = createClient(router)
    let { legalEntityPath, legalEntityId } = await setUp(browser)

    let response = await browser.submit(legalEntityPath, routes.legalEntities.assignDefaults.href({ legalEntityId }), {
      providerId: 'missing',
      serviceCentreId: '',
    })

    assert.equal(response.status, 400)
    assert.match(await response.text(), /Choose a listed provider and service centre/)
  })
})
