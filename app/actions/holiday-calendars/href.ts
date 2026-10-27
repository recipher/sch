import { routes } from '../../routes.ts'
import type { Location } from '../../scheduling/parties.ts'

// The holiday calendar page for a location and year.
export function holidayCalendarHref(location: Location, year: number): string {
  let searchParams: Record<string, string> = { year: String(year) }
  if (location.region) searchParams.region = location.region
  return routes.holidayCalendars.show.href({ country: location.country }, { searchParams })
}
