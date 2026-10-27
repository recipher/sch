import * as s from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'

import { requiredName } from '../form-schema.ts'

export const payrollForm = f.object({
  name: f.field(requiredName),
  payFrequency: f.field(s.enum_(['monthly'])),
  payDayRule: f.field(s.enum_(['last-working-day'])),
})
