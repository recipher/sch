// A calendar date with no time or time zone, written as YYYY-MM-DD.
export type CalendarDate = string

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isCalendarDate(value: string): value is CalendarDate {
  if (!ISO_DATE.test(value)) return false
  let date = toUtc(value)
  return !Number.isNaN(date.getTime()) && fromUtc(date) === value
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  let utc = toUtc(date)
  utc.setUTCDate(utc.getUTCDate() + days)
  return fromUtc(utc)
}

// 0 is Sunday, 6 is Saturday.
export function dayOfWeek(date: CalendarDate): number {
  return toUtc(date).getUTCDay()
}

export function startOfMonth(date: CalendarDate): CalendarDate {
  return `${date.slice(0, 7)}-01`
}

export function endOfMonth(date: CalendarDate): CalendarDate {
  let utc = toUtc(startOfMonth(date))
  utc.setUTCMonth(utc.getUTCMonth() + 1)
  utc.setUTCDate(0)
  return fromUtc(utc)
}

export function formatMonth(date: CalendarDate): string {
  return toUtc(date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function toUtc(date: CalendarDate): Date {
  return new Date(`${date}T00:00:00Z`)
}

function fromUtc(date: Date): CalendarDate {
  return date.toISOString().slice(0, 10)
}
