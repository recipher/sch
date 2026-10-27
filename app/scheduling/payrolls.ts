import type { Database, TableRow } from 'remix/data-table'

import { payrolls } from '../data/tables.ts'
import { findLegalEntity, findProvider, findServiceCentre } from './parties.ts'
import type { Provider, ServiceCentre } from './parties.ts'
import type { PayDayRule, PayFrequency } from './pay-periods.ts'

export interface Payroll {
  id: string
  legalEntityId: string
  name: string
  payFrequency: PayFrequency
  payDayRule: PayDayRule
  // Overrides of the legal entity's defaults; null means the payroll inherits them.
  providerId: string | null
  serviceCentreId: string | null
}

export interface EffectiveParty<T> {
  party: T | null
  source: 'inherited' | 'overridden'
}

export interface EffectiveParties {
  provider: EffectiveParty<Provider>
  serviceCentre: EffectiveParty<ServiceCentre>
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

// Pass null for either party to inherit the legal entity's default instead.
export async function assignPayrollParties(
  db: Database,
  payrollId: string,
  overrides: { providerId: string | null; serviceCentreId: string | null },
): Promise<void> {
  await db.update(payrolls, payrollId, {
    provider_id: overrides.providerId,
    service_centre_id: overrides.serviceCentreId,
  })
}

// The provider and service centre a payroll actually uses: its own, or else its legal entity's.
export async function findEffectiveParties(db: Database, payrollId: string): Promise<EffectiveParties | null> {
  let payroll = await findPayroll(db, payrollId)
  if (!payroll) return null
  let legalEntity = await findLegalEntity(db, payroll.legalEntityId)
  if (!legalEntity) return null

  let providerId = payroll.providerId ?? legalEntity.defaultProviderId
  let serviceCentreId = payroll.serviceCentreId ?? legalEntity.defaultServiceCentreId
  return {
    provider: {
      party: providerId ? await findProvider(db, providerId) : null,
      source: payroll.providerId ? 'overridden' : 'inherited',
    },
    serviceCentre: {
      party: serviceCentreId ? await findServiceCentre(db, serviceCentreId) : null,
      source: payroll.serviceCentreId ? 'overridden' : 'inherited',
    },
  }
}

function toPayroll(row: TableRow<typeof payrolls>): Payroll {
  return {
    id: row.id,
    legalEntityId: row.legal_entity_id,
    name: row.name,
    payFrequency: row.pay_frequency,
    payDayRule: { kind: row.pay_day_rule },
    providerId: row.provider_id,
    serviceCentreId: row.service_centre_id,
  }
}
