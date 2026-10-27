import * as s from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'

import { daysOfWeek } from '../../scheduling/working-weeks.ts'

export const workingWeekForm = f.object({
  days: f.fields(
    s.array(s.enum_(daysOfWeek)).refine((days) => days.length > 0, 'Choose at least one working day'),
  ),
})
