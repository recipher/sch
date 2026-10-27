import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { createClient } from '../../../test/client.ts'
import { createTestRouter } from '../../../test/router.ts'
import { routes } from '../../routes.ts'

const GB_2027 = [
  { date: '2027-01-01', name: "New Year's Day", region: null },
  { date: '2027-11-30', name: "St Andrew's Day", region: 'SCT' },
]

async function signedIn() {
  let { router, holidays, close } = await createTestRouter({ holidays: { 'GB 2027': GB_2027 } })
  let browser = createClient(router)
  await browser.submit(routes.signup.index.href(), routes.signup.action.href(), {
    email: 'pat@example.com',
    password: 'correct horse',
  })
  return { browser, holidays, close }
}

function calendarHref(search: Record<string, string>) {
  return routes.holidayCalendars.show.href({ country: 'GB' }, { searchParams: search })
}

describe('holiday calendar pages', () => {
  it('sends signed-out visitors to log in', async (t) => {
    let { router, close } = await createTestRouter()
    t.after(close)

    let response = await createClient(router).get(calendarHref({ year: '2027' }))

    assert.equal(response.status, 303)
    assert.match(response.headers.get('Location') ?? '', /^\/login\?returnTo=/)
  })

  it('imports a year that has not been imported yet', async (t) => {
    let { browser, holidays, close } = await signedIn()
    t.after(close)
    let page = calendarHref({ year: '2027' })

    let before = await (await browser.get(page)).text()
    assert.match(before, /not been imported/)

    let response = await browser.submit(page, routes.holidayCalendars.resync.href({ country: 'GB' }), { year: '2027' })
    assert.equal(response.status, 303)
    assert.equal(response.headers.get('Location'), page)

    let after = await (await browser.get(page)).text()
    assert.match(after, /New Year&#39;s Day|New Year's Day/)
    assert.doesNotMatch(after, /St Andrew/)
    assert.deepEqual(holidays.requests, ['GB 2027'])
  })

  it("shows a region's own holidays alongside the national ones", async (t) => {
    let { browser, close } = await signedIn()
    t.after(close)
    let page = calendarHref({ year: '2027', region: 'SCT' })
    await browser.submit(page, routes.holidayCalendars.resync.href({ country: 'GB' }), { year: '2027' })

    let html = await (await browser.get(page)).text()

    assert.match(html, /United Kingdom \(SCT\)/)
    assert.match(html, /New Year[\s\S]*St Andrew/)
  })

  it('adds and removes public holidays', async (t) => {
    let { browser, close } = await signedIn()
    t.after(close)
    let page = calendarHref({ year: '2027' })
    await browser.submit(page, routes.holidayCalendars.resync.href({ country: 'GB' }), { year: '2027' })

    await browser.submit(page, routes.holidayCalendars.addPublicHoliday.href({ country: 'GB' }), {
      year: '2027',
      date: '2027-06-03',
      name: 'Jubilee',
    })
    let removed = await browser.submit(page, routes.holidayCalendars.removePublicHoliday.href({ country: 'GB' }), {
      year: '2027',
      date: '2027-01-01',
    })
    assert.equal(removed.status, 303)

    let html = await (await browser.get(page)).text()
    assert.match(html, /New Year[\s\S]*Removed/)
    assert.match(html, /Jubilee[\s\S]*Added locally/)
  })

  it('rejects a public holiday without a name', async (t) => {
    let { browser, close } = await signedIn()
    t.after(close)
    let page = calendarHref({ year: '2027' })

    let response = await browser.submit(page, routes.holidayCalendars.addPublicHoliday.href({ country: 'GB' }), {
      year: '2027',
      date: '2027-06-03',
      name: ' ',
    })

    assert.equal(response.status, 400)
    assert.match(await response.text(), /Enter a name/)
  })

  it('reports a re-sync that finds no data', async (t) => {
    let { browser, close } = await signedIn()
    t.after(close)
    let page = calendarHref({ year: '2030' })

    let response = await browser.submit(page, routes.holidayCalendars.resync.href({ country: 'GB' }), { year: '2030' })

    assert.equal(response.status, 422)
    assert.match(await response.text(), /No holiday data for GB 2030/)
  })
})
