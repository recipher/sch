import * as s from 'remix/data-schema'
import * as coerce from 'remix/data-schema/coerce'
import * as f from 'remix/data-schema/form-data'

import { isCalendarDate } from '../../scheduling/calendar-date.ts'
import { requiredName } from '../form-schema.ts'

export const year = coerce
  .number()
  .refine((value) => Number.isInteger(value) && value >= 1900 && value <= 2200, 'Enter a year')

const region = s
  .defaulted(s.string(), '')
  .transform((value) => value.trim().toUpperCase())
  .transform((value) => (value === '' ? null : value))

const calendarDate = s.string().refine(isCalendarDate, 'Enter a date')

// Which calendar a page or form is about: a year, optionally narrowed to one region.
export const calendarScope = f.object({
  year: f.field(year),
  region: f.field(region),
})

export const addPublicHolidayForm = f.object({
  date: f.field(calendarDate),
  name: f.field(requiredName),
})

export const removePublicHolidayForm = f.object({
  year: f.field(year),
  region: f.field(region),
  date: f.field(calendarDate),
})
