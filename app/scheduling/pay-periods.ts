import { addDays, dayOfWeek, endOfMonth, formatMonth, startOfMonth } from './calendar-date.ts'
import type { CalendarDate } from './calendar-date.ts'

export type PayFrequency = 'monthly'

// weekday is 0 for Sunday to 6 for Saturday.
export type PayDayRule =
  | { kind: 'last-working-day'; offset: number }
  | { kind: 'last-weekday'; weekday: number; roll: RollDirection }
  | { kind: 'fixed-date'; day: number; roll: RollDirection }
  | { kind: 'next-period-first-working-day'; offset: number }

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
    case 'last-working-day':
      return moveWorkingDays(rollToWorkingDay(payPeriod.end, 'earlier', isWorkingDay), -rule.offset, isWorkingDay)
    case 'last-weekday': {
      let day = addDays(payPeriod.end, -((dayOfWeek(payPeriod.end) - rule.weekday + 7) % 7))
      return rollToWorkingDay(day, rule.roll, isWorkingDay)
    }
    case 'fixed-date': {
      // A day the month doesn't have, such as the 31st of February, falls on its last day.
      let day = addDays(payPeriod.start, rule.day - 1)
      return rollToWorkingDay(day < payPeriod.end ? day : payPeriod.end, rule.roll, isWorkingDay)
    }
    case 'next-period-first-working-day': {
      let nextPayPeriodStart = addDays(payPeriod.end, 1)
      return moveWorkingDays(rollToWorkingDay(nextPayPeriodStart, 'later', isWorkingDay), rule.offset, isWorkingDay)
    }
  }
}

export type RollDirection = 'earlier' | 'later'

export const payDayRuleKinds = ['last-working-day', 'last-weekday', 'fixed-date', 'next-period-first-working-day'] as const

function rollToWorkingDay(
  date: CalendarDate,
  direction: RollDirection,
  isWorkingDay: (date: CalendarDate) => boolean,
): CalendarDate {
  let step = direction === 'earlier' ? -1 : 1
  while (!isWorkingDay(date)) date = addDays(date, step)
  return date
}

// Moves from a working day by the given number of working days, backwards when negative.
function moveWorkingDays(
  date: CalendarDate,
  workingDays: number,
  isWorkingDay: (date: CalendarDate) => boolean,
): CalendarDate {
  let step = Math.sign(workingDays)
  for (let remaining = Math.abs(workingDays); remaining > 0; remaining--) {
    date = rollToWorkingDay(addDays(date, step), step < 0 ? 'earlier' : 'later', isWorkingDay)
  }
  return date
}
