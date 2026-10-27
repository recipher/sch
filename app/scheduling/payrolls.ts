import type { Database, TableRow } from 'remix/data-table'

import { payrolls } from '../data/tables.ts'
import type { PayDayRule, PayFrequency } from './pay-periods.ts'

export interface Payroll {
  id: string
  legalEntityId: string
  name: string
  payFrequency: PayFrequency
  payDayRule: PayDayRule
}

export async function createPayroll(
  db: Database,
  input: { legalEntityId: string; name: string; payFrequency: PayFrequency; payDayRule: PayDayRule },
): Promise<Payroll> {
  let row = await db.create(
    payrolls,
    {
      id: crypto.randomUUID(),
      legal_entity_id: input.legalEntityId,
      name: input.name,
      pay_frequency: input.payFrequency,
      pay_day_rule: input.payDayRule.kind,
      created_at: Date.now(),
    },
    { returnRow: true },
  )
  return toPayroll(row)
}

export async function findPayroll(db: Database, id: string): Promise<Payroll | null> {
  let row = await db.find(payrolls, id)
  return row && toPayroll(row)
}

export async function listPayrolls(db: Database, legalEntityId: string): Promise<Payroll[]> {
  let rows = await db.findMany(payrolls, { where: { legal_entity_id: legalEntityId }, orderBy: ['name', 'asc'] })
  return rows.map(toPayroll)
}

function toPayroll(row: TableRow<typeof payrolls>): Payroll {
  return {
    id: row.id,
    legalEntityId: row.legal_entity_id,
    name: row.name,
    payFrequency: row.pay_frequency,
    payDayRule: { kind: row.pay_day_rule },
  }
}
