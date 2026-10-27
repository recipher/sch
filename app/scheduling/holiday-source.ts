import type { CalendarDate } from './calendar-date.ts'

// A public holiday as a holiday source reports it. `date` is the observed date, and `region` is
// set only for public holidays that apply to one region of the country.
export interface SourcedPublicHoliday {
  date: CalendarDate
  name: string
  region: string | null
}

export type HolidaySourceResult =
  | { found: true; publicHolidays: SourcedPublicHoliday[] }
  | { found: false; reason: string }

// Supplies a country's public holidays for one year, including regional ones.
export interface HolidaySource {
  fetchPublicHolidays(country: string, year: number): Promise<HolidaySourceResult>
}
