import type { HolidaySource, SourcedPublicHoliday } from '../app/scheduling/holiday-source.ts'

// A holiday source serving fixed data, keyed by "<country> <year>" (for example "GB 2027").
// Any country and year not listed has no data. Every request is recorded.
export function createFakeHolidaySource(calendars: Record<string, SourcedPublicHoliday[]> = {}) {
  let requests: string[] = []
  let source: HolidaySource = {
    async fetchPublicHolidays(country, year) {
      let key = `${country} ${year}`
      requests.push(key)
      let publicHolidays = calendars[key]
      return publicHolidays
        ? { found: true, publicHolidays }
        : { found: false, reason: `No holiday data for ${key}` }
    },
  }
  return { source, requests, calendars }
}
