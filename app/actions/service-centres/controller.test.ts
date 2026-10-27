import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { createClient } from '../../../test/client.ts'
import { formActionNear, lastSegment, signUp, submitForRedirect } from '../../../test/pages.ts'
import { createTestRouter } from '../../../test/router.ts'
import { routes } from '../../routes.ts'

function createLisbon(browser: ReturnType<typeof createClient>) {
  return submitForRedirect(browser, routes.serviceCentres.index.href(), routes.serviceCentres.create.href(), {
    name: 'Lisbon',
    country: 'PT',
    region: '',
  })
}

describe('service centre pages', () => {
  it('creates a service centre and lists it with its location', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    let browser = createClient(router)
    await signUp(browser)

    await createLisbon(browser)

    assert.match(await (await browser.get(routes.serviceCentres.index.href())).text(), /Lisbon[\s\S]*Portugal/)
  })

  it('refuses a location the service centre already has', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    let browser = createClient(router)
    await signUp(browser)
    let centrePath = await createLisbon(browser)

    let response = await browser.submit(
      centrePath,
      routes.serviceCentres.addLocation.href({ serviceCentreId: lastSegment(centrePath) }),
      { country: 'pt', region: '' },
    )

    assert.equal(response.status, 400)
    assert.match(await response.text(), /This service centre already has that location/)
  })

  it("refuses to remove a service centre's last location", async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    let browser = createClient(router)
    await signUp(browser)
    let centrePath = await createLisbon(browser)
    let html = await (await browser.get(centrePath)).text()

    let response = await browser.submit(centrePath, formActionNear(html, 'Remove Portugal'), {})

    assert.equal(response.status, 400)
    assert.match(await response.text(), /A service centre must keep at least one location/)
  })

  it('rejects a service centre without a valid country', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    let browser = createClient(router)
    await signUp(browser)

    let response = await browser.submit(routes.serviceCentres.index.href(), routes.serviceCentres.create.href(), {
      name: 'Nowhere',
      country: 'Narnia',
      region: '',
    })

    assert.equal(response.status, 400)
    assert.match(await response.text(), /Enter a two-letter country code/)
  })
})
