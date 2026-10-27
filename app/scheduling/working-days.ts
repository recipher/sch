import { dayOfWeek } from './calendar-date.ts'
import type { CalendarDate } from './calendar-date.ts'

// Monday to Friday everywhere for now. Working weeks per country are still to come (#4).
export function isWorkingWeekDay(date: CalendarDate): boolean {
  let day = dayOfWeek(date)
  return day >= 1 && day <= 5
}
