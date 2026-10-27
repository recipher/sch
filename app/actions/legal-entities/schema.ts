import * as s from 'remix/data-schema'
import type { Issue } from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'

import { payDayRuleKinds } from '../../scheduling/pay-periods.ts'
import type { PayDayRule, PayFrequency } from '../../scheduling/pay-periods.ts'
import { requiredName } from '../form-schema.ts'

function wholeNumber(min: number, max: number, message: string) {
  return s
    .string()
    .transform((value) => value.trim())
    .refine((value) => /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max, message)
    .transform(Number)
}

const payrollForm = f.object({
  name: f.field(requiredName),
  payFrequency: f.field(s.enum_(['monthly'])),
  payDayRule: f.field(s.enum_(payDayRuleKinds)),
})

// The form sends every pay day rule setting; only those of the chosen rule are read.
const offsetForm = f.object({
  payDayOffset: f.field(wholeNumber(0, 99, 'Enter a whole number of working days from 0 to 99')),
})
const payDayRoll = f.field(s.enum_(['earlier', 'later']))
const lastWeekdayForm = f.object({ payDayWeekday: f.field(wholeNumber(0, 6, 'Choose a weekday')), payDayRoll })
const fixedDateForm = f.object({
  payDayOfMonth: f.field(wholeNumber(1, 31, 'Enter a day of the month from 1 to 31')),
  payDayRoll,
})

export interface PayrollInput {
  name: string
  payFrequency: PayFrequency
  payDayRule: PayDayRule
}

export function parsePayroll(
  formData: FormData,
): { success: true; value: PayrollInput } | { success: false; issues: readonly Issue[] } {
  let parsed = s.parseSafe(payrollForm, formData)
  if (!parsed.success) return parsed
  let { name, payFrequency, payDayRule: kind } = parsed.value

  let payDayRule = parsePayDayRule(kind, formData)
  if (!payDayRule.success) return payDayRule
  return { success: true, value: { name, payFrequency, payDayRule: payDayRule.value } }
}

function parsePayDayRule(
  kind: PayDayRule['kind'],
  formData: FormData,
): { success: true; value: PayDayRule } | { success: false; issues: readonly Issue[] } {
  switch (kind) {
    case 'last-working-day':
    case 'next-period-first-working-day': {
      let parsed = s.parseSafe(offsetForm, formData)
      return parsed.success ? { success: true, value: { kind, offset: parsed.value.payDayOffset } } : parsed
    }
    case 'last-weekday': {
      let parsed = s.parseSafe(lastWeekdayForm, formData)
      return parsed.success
        ? { success: true, value: { kind, weekday: parsed.value.payDayWeekday, roll: parsed.value.payDayRoll } }
        : parsed
    }
    case 'fixed-date': {
      let parsed = s.parseSafe(fixedDateForm, formData)
      return parsed.success
        ? { success: true, value: { kind, day: parsed.value.payDayOfMonth, roll: parsed.value.payDayRoll } }
        : parsed
    }
  }
}
