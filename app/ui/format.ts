import type { CalendarDate } from '../scheduling/calendar-date.ts'
import type { Location } from '../scheduling/parties.ts'
import type { PayDayRule, PayFrequency, RollDirection } from '../scheduling/pay-periods.ts'
import type { ScheduleStatus } from '../scheduling/schedules.ts'

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

export function formatPayFrequency(frequency: PayFrequency): string {
  switch (frequency) {
    case 'monthly':
      return 'Monthly'
  }
}

// "Last Friday of the pay period, or the working day before"
export function formatPayDayRule(rule: PayDayRule): string {
  switch (rule.kind) {
    case 'last-working-day':
      return `Last working day of the pay period${formatOffset('less', rule.offset)}`
    case 'last-weekday':
      return `Last ${formatWeekday(rule.weekday)} of the pay period, ${formatRoll(rule.roll)}`
    case 'fixed-date':
      return `The ${formatOrdinal(rule.day)} of the pay period, ${formatRoll(rule.roll)}`
    case 'next-period-first-working-day':
      return `First working day of the following pay period${formatOffset('plus', rule.offset)}`
  }
}

export function formatPayDayRuleKind(kind: PayDayRule['kind']): string {
  switch (kind) {
    case 'last-working-day':
      return 'Last working day of the pay period, less N working days'
    case 'last-weekday':
      return 'Last given weekday of the pay period'
    case 'fixed-date':
      return 'Fixed date of the pay period'
    case 'next-period-first-working-day':
      return 'First working day of the following pay period, plus N working days'
  }
}

// 0 is Sunday, 6 is Saturday.
export function formatWeekday(weekday: number): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][weekday]
}

function formatOffset(direction: 'less' | 'plus', workingDays: number): string {
  if (workingDays === 0) return ''
  return `, ${direction} ${workingDays} working ${workingDays === 1 ? 'day' : 'days'}`
}

function formatRoll(roll: RollDirection): string {
  return roll === 'earlier' ? 'or the working day before' : 'or the working day after'
}

// "1st", "22nd", "25th"
function formatOrdinal(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`
  switch (day % 10) {
    case 1:
      return `${day}st`
    case 2:
      return `${day}nd`
    case 3:
      return `${day}rd`
    default:
      return `${day}th`
  }
}

export function formatScheduleStatus(status: ScheduleStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft'
  }
}
