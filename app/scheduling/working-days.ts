import { dayOfWeek } from './calendar-date.ts'
import type { CalendarDate } from './calendar-date.ts'
import { daysOfWeek } from './working-weeks.ts'
import type { WorkingWeek } from './working-weeks.ts'

export function isWorkingWeekDay(workingWeek: WorkingWeek, date: CalendarDate): boolean {
  return workingWeek.days.includes(daysOfWeek[dayOfWeek(date)])
}
