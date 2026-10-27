import { addDays, endOfMonth, formatMonth, startOfMonth } from './calendar-date.ts'
import type { CalendarDate } from './calendar-date.ts'

export type PayFrequency = 'monthly'

export type PayDayRule = { kind: 'last-working-day' }

export interface GenerationRange {
  start: CalendarDate
  end: CalendarDate
}

export interface PayPeriod {
  start: CalendarDate
  end: CalendarDate
  label: string
}

// Every pay period that starts inside the generation range. Only monthly pay periods exist so far.
export function payPeriodsStartingIn(frequency: PayFrequency, range: GenerationRange): PayPeriod[] {
  let payPeriods: PayPeriod[] = []
  let start = startOfMonth(range.start)
  if (start < range.start) start = addDays(endOfMonth(start), 1)

  while (start <= range.end) {
    payPeriods.push(payPeriod(frequency, start, endOfMonth(start)))
    start = addDays(endOfMonth(start), 1)
  }

  return payPeriods
}

export function payPeriod(frequency: PayFrequency, start: CalendarDate, end: CalendarDate): PayPeriod {
  switch (frequency) {
    case 'monthly':
      return { start, end, label: formatMonth(start) }
  }
}

export function choosePayDay(
  rule: PayDayRule,
  payPeriod: PayPeriod,
  isWorkingDay: (date: CalendarDate) => boolean,
): CalendarDate {
  switch (rule.kind) {
    case 'last-working-day': {
      let day = payPeriod.end
      while (!isWorkingDay(day)) day = addDays(day, -1)
      return day
    }
  }
}
