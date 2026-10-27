import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { createHolidayApiSource } from './holiday-api.ts'

function stubFetch(status: number, body: unknown) {
  let urls: URL[] = []
  let fetch = async (input: string | URL | Request) => {
    urls.push(new URL(input instanceof Request ? input.url : input))
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  }
  return { fetch, urls }
}

describe('Holiday API source', () => {
  it('requests public holidays with subdivisions for a country and year', async () => {
    let stub = stubFetch(200, { status: 200, holidays: [] })
    let source = createHolidayApiSource({ apiKey: 'test-key', fetch: stub.fetch })

    await source.fetchPublicHolidays('GB', 2027)

    let [url] = stub.urls
    assert.equal(url.origin + url.pathname, 'https://holidayapi.com/v1/holidays')
    assert.equal(url.searchParams.get('key'), 'test-key')
    assert.equal(url.searchParams.get('country'), 'GB')
    assert.equal(url.searchParams.get('year'), '2027')
    assert.equal(url.searchParams.get('public'), 'true')
    assert.equal(url.searchParams.get('subdivisions'), 'true')
  })

  it('uses observed dates and splits regional holidays by region', async () => {
    let stub = stubFetch(200, {
      status: 200,
      holidays: [
        { name: 'Christmas Day', date: '2027-12-25', observed: '2027-12-27', public: true, country: 'GB', subdivisions: [] },
        { name: 'St Andrew’s Day', date: '2027-11-30', observed: '2027-11-30', public: true, country: 'GB-SCT' },
        {
          name: 'Easter Monday',
          date: '2027-03-29',
          observed: '2027-03-29',
          public: true,
          country: 'GB',
          subdivisions: ['GB-ENG', 'GB-NIR', 'GB-WLS'],
        },
        { name: "Valentine's Day", date: '2027-02-14', observed: '2027-02-14', public: false, country: 'GB' },
      ],
    })
    let source = createHolidayApiSource({ apiKey: 'test-key', fetch: stub.fetch })

    let result = await source.fetchPublicHolidays('GB', 2027)

    assert.deepEqual(result, {
      found: true,
      publicHolidays: [
        { date: '2027-12-27', name: 'Christmas Day', region: null },
        { date: '2027-11-30', name: 'St Andrew’s Day', region: 'SCT' },
        { date: '2027-03-29', name: 'Easter Monday', region: 'ENG' },
        { date: '2027-03-29', name: 'Easter Monday', region: 'NIR' },
        { date: '2027-03-29', name: 'Easter Monday', region: 'WLS' },
      ],
    })
  })

  it('reports the API error as having no data', async () => {
    let stub = stubFetch(402, { status: 402, error: 'Upgrade required' })
    let source = createHolidayApiSource({ apiKey: 'test-key', fetch: stub.fetch })

    assert.deepEqual(await source.fetchPublicHolidays('GB', 2027), {
      found: false,
      reason: 'Holiday API returned 402: Upgrade required',
    })
  })

  it('reports a missing API key without calling the API', async () => {
    let stub = stubFetch(200, { status: 200, holidays: [] })
    let source = createHolidayApiSource({ apiKey: undefined, fetch: stub.fetch })

    assert.deepEqual(await source.fetchPublicHolidays('GB', 2027), {
      found: false,
      reason: 'No Holiday API key is configured',
    })
    assert.equal(stub.urls.length, 0)
  })

  it('reports an unreachable API as having no data', async () => {
    let source = createHolidayApiSource({
      apiKey: 'test-key',
      fetch: async () => {
        throw new TypeError('fetch failed')
      },
    })

    assert.deepEqual(await source.fetchPublicHolidays('GB', 2027), {
      found: false,
      reason: 'Holiday API could not be reached',
    })
  })
})
