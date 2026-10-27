import * as s from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'

import { requiredName } from '../form-schema.ts'

const country = s
  .string()
  .transform((value) => value.trim().toUpperCase())
  .refine((value) => /^[A-Z]{2}$/.test(value), 'Enter a two-letter country code, such as GB')

const region = s
  .defaulted(s.string(), '')
  .transform((value) => value.trim().toUpperCase())
  .transform((value) => (value === '' ? null : value))

export const clientForm = f.object({
  name: f.field(requiredName),
})

export const legalEntityForm = f.object({
  name: f.field(requiredName),
  country: f.field(country),
  region: f.field(region),
})
