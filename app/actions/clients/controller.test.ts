import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { createClient } from '../../../test/client.ts'
import { formActionNear, lastSegment, signUp, submitForRedirect } from '../../../test/pages.ts'
import { createTestRouter } from '../../../test/router.ts'
import { routes } from '../../routes.ts'

describe('client pages', () => {
  it("edits a client's locations", async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    let browser = createClient(router)
    await signUp(browser)
    let clientPath = await submitForRedirect(browser, routes.clients.index.href(), routes.clients.create.href(), {
      name: 'Acme Group',
    })
    let clientId = lastSegment(clientPath)

    for (let location of [
      { country: 'US', region: 'ny' },
      { country: 'GB', region: '' },
    ]) {
      await submitForRedirect(browser, clientPath, routes.clients.addLocation.href({ clientId }), location)
    }
    let html = await (await browser.get(clientPath)).text()
    await submitForRedirect(browser, clientPath, formActionNear(html, 'Remove United Kingdom'), {})

    html = await (await browser.get(clientPath)).text()
    assert.match(html, /United States \(NY\)/)
    assert.doesNotMatch(html, /United Kingdom/)
  })
})
