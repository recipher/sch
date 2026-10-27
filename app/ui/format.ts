import type { CalendarDate } from '../scheduling/calendar-date.ts'
import type { Location } from '../scheduling/parties.ts'
import type { PayDayRule, PayFrequency } from '../scheduling/pay-periods.ts'
import type { ScheduleStatus } from '../scheduling/schedules.ts'
import type { DayOfWeek } from '../scheduling/working-weeks.ts'

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })

// "Germany (BY)", or just "United Kingdom" when there is no region.
export function formatLocation(location: Location): string {
  let country = countryNames.of(location.country) ?? location.country
  return location.region ? `${country} (${location.region})` : country
}

// "Fri 29 Jan 2027"
export function formatDate(date: CalendarDate): string {
  return new Date(`${date}T00:00:00Z`)
    .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .replace(',', '')
}

// "Monday"
export function formatDayOfWeek(day: DayOfWeek): string {
  return day[0].toUpperCase() + day.slice(1)
}

export function formatPayFrequency(frequency: PayFrequency): string {
  switch (frequency) {
    case 'monthly':
      return 'Monthly'
  }
}

export function formatPayDayRule(rule: PayDayRule): string {
  switch (rule.kind) {
    case 'last-working-day':
      return 'Last working day of the pay period'
  }
}

export function formatScheduleStatus(status: ScheduleStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft'
  }
}
