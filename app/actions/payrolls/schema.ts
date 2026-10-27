import * as s from 'remix/data-schema'
import type { Issue } from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'

import { isCalendarDate } from '../../scheduling/calendar-date.ts'
import type { GenerationRange } from '../../scheduling/pay-periods.ts'

const calendarDate = s.string().refine(isCalendarDate, 'Enter a date')

const generationRangeForm = f.object({
  start: f.field(calendarDate),
  end: f.field(calendarDate),
})

const END_BEFORE_START: Issue[] = [{ message: 'End date must not be before the start date', path: ['end'] }]

export function parseGenerationRange(
  formData: FormData,
): { success: true; value: GenerationRange } | { success: false; issues: readonly Issue[] } {
  let parsed = s.parseSafe(generationRangeForm, formData)
  if (!parsed.success) return parsed
  if (parsed.value.end < parsed.value.start) return { success: false, issues: END_BEFORE_START }
  return parsed
}
