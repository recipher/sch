import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { createClient } from '../../../test/client.ts'
import { formActionNear, lastSegment, signUp, submitForRedirect } from '../../../test/pages.ts'
import { createTestRouter } from '../../../test/router.ts'
import { routes } from '../../routes.ts'

describe('provider pages', () => {
  it('creates a provider, edits its locations and renames it', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)
    let browser = createClient(router)
    await signUp(browser)

    let providerPath = await submitForRedirect(browser, routes.providers.index.href(), routes.providers.create.href(), {
      name: 'PayCo',
      country: 'gb',
      region: '',
    })
    let providerId = lastSegment(providerPath)
    await submitForRedirect(browser, providerPath, routes.providers.addLocation.href({ providerId }), {
      country: 'DE',
      region: 'by',
    })
    let html = await (await browser.get(providerPath)).text()
    await submitForRedirect(browser, providerPath, formActionNear(html, 'Remove United Kingdom'), {})
    await submitForRedirect(browser, providerPath, routes.providers.rename.href({ providerId }), { name: 'PayCo Europe' })

    html = await (await browser.get(providerPath)).text()
    assert.match(html, /PayCo Europe/)
    assert.match(html, /Germany \(BY\)/)
    assert.doesNotMatch(html, /United Kingdom/)
    assert.match(await (await browser.get(routes.providers.index.href())).text(), /PayCo Europe[\s\S]*Germany \(BY\)/)
  })
})
