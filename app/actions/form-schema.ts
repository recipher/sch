import * as s from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'

// Shared by the client, legal entity, payroll, provider and service centre forms.
export const requiredName = s
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length > 0, 'Enter a name')

export const country = s
  .string()
  .transform((value) => value.trim().toUpperCase())
  .refine(isCountryCode, 'Enter a two-letter country code, such as GB')

export const region = s
  .defaulted(s.string(), '')
  .transform((value) => value.trim().toUpperCase())
  .transform((value) => (value === '' ? null : value))

export const nameForm = f.object({
  name: f.field(requiredName),
})

export const locationForm = f.object({
  country: f.field(country),
  region: f.field(region),
})

// A provider or service centre is created with its first location.
export const locatedPartyForm = f.object({
  name: f.field(requiredName),
  country: f.field(country),
  region: f.field(region),
})

// An empty choice means "none" on a legal entity and "inherit" on a payroll.
const optionalId = s
  .defaulted(s.string(), '')
  .transform((value) => value.trim())
  .transform((value) => (value === '' ? null : value))

export const partyAssignmentForm = f.object({
  providerId: f.field(optionalId),
  serviceCentreId: f.field(optionalId),
})

// Two capital letters, as legal entity locations store them, such as GB.
export function isCountryCode(value: string): boolean {
  return /^[A-Z]{2}$/.test(value)
}
