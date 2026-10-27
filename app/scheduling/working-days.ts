import { dayOfWeek } from './calendar-date.ts'
import type { CalendarDate } from './calendar-date.ts'
import { daysOfWeek } from './working-weeks.ts'
import type { WorkingWeek } from './working-weeks.ts'

// Public holidays (#3) are still to come, so for now any day in the working week is a working day.
export function isWorkingDay(workingWeek: WorkingWeek, date: CalendarDate): boolean {
  return workingWeek.days.includes(daysOfWeek[dayOfWeek(date)])
}
