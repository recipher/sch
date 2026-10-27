import * as s from 'remix/data-schema'

// Shared by the client, legal entity and payroll forms.
export const requiredName = s
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length > 0, 'Enter a name')

// Two capital letters, as legal entity locations store them, such as GB.
export function isCountryCode(value: string): boolean {
  return /^[A-Z]{2}$/.test(value)
}
