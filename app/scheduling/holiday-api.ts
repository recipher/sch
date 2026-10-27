import type { HolidaySource, SourcedPublicHoliday } from './holiday-source.ts'

const HOLIDAYS_URL = 'https://holidayapi.com/v1/holidays'

interface ApiHoliday {
  name: string
  date: string
  observed?: string
  public: boolean
  // ISO 3166-1 for country-wide holidays, ISO 3166-2 (for example "GB-SCT") for regional ones.
  country: string
  // Present with `subdivisions=true`; lists the regions a holiday applies to, or none for all of them.
  subdivisions?: string[]
}

export interface HolidayApiSourceOptions {
  apiKey: string | undefined
  fetch?: (input: string | URL | Request) => Promise<Response>
}

// Public holidays from holidayapi.com, including regional ones, keyed by observed date.
export function createHolidayApiSource(options: HolidayApiSourceOptions): HolidaySource {
  let fetch = options.fetch ?? globalThis.fetch

  return {
    async fetchPublicHolidays(country, year) {
      if (!options.apiKey) return { found: false, reason: 'No Holiday API key is configured' }

      let url = new URL(HOLIDAYS_URL)
      url.search = new URLSearchParams({
        key: options.apiKey,
        country,
        year: String(year),
        public: 'true',
        subdivisions: 'true',
      }).toString()

      let response: Response
      try {
        response = await fetch(url)
      } catch {
        return { found: false, reason: 'Holiday API could not be reached' }
      }

      let body = (await response.json().catch(() => null)) as { holidays?: ApiHoliday[]; error?: string } | null
      if (!response.ok || !body?.holidays) {
        let detail = body?.error ? `: ${body.error}` : ''
        return { found: false, reason: `Holiday API returned ${response.status}${detail}` }
      }

      let publicHolidays = body.holidays.filter((holiday) => holiday.public).flatMap(toSourcedPublicHolidays)
      return { found: true, publicHolidays }
    },
  }
}

function toSourcedPublicHolidays(holiday: ApiHoliday): SourcedPublicHoliday[] {
  let date = holiday.observed ?? holiday.date
  let regions = holiday.country.includes('-') ? [holiday.country] : (holiday.subdivisions ?? [])
  if (regions.length === 0) return [{ date, name: holiday.name, region: null }]

  return regions.map((code) => ({ date, name: holiday.name, region: code.slice(code.indexOf('-') + 1) }))
}
