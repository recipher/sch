import * as s from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'

const email = s
  .string()
  .transform((value) => value.trim().toLowerCase())
  .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Enter a valid email address')

// Not trimmed: spaces are legitimate password characters.
const password = s
  .string()
  .refine((value) => value.length >= 8, 'Password must be at least 8 characters')
  .refine((value) => value.length <= 128, 'Password must be at most 128 characters')

export const signupForm = f.object({
  email: f.field(email),
  password: f.field(password),
})
