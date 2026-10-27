import { dayOfWeek } from './calendar-date.ts'
import type { CalendarDate } from './calendar-date.ts'

// Monday to Friday everywhere for now. Working weeks per country (#4) and public holidays (#3) are still to come.
export function isWorkingDay(date: CalendarDate): boolean {
  let day = dayOfWeek(date)
  return day >= 1 && day <= 5
}
