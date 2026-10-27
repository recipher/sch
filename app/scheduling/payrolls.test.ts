import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { createTestDatabase } from '../../test/database.ts'
import { assignLegalEntityDefaults, createClient, createLegalEntity, createProvider, createServiceCentre } from './parties.ts'
import { assignPayrollParties, createPayroll, findEffectiveParties } from './payrolls.ts'

async function setUp() {
  let { db, close } = await createTestDatabase()
  let client = await createClient(db, { name: 'Acme Group' })
  let legalEntity = await createLegalEntity(db, { clientId: client.id, name: 'Acme UK Ltd', location: { country: 'GB' } })
  let payroll = await createPayroll(db, {
    legalEntityId: legalEntity.id,
    name: 'Monthly salaried',
    payFrequency: 'monthly',
    payDayRule: { kind: 'last-working-day', offset: 0 },
  })
  let provider = await createProvider(db, { name: 'PayCo', location: { country: 'GB' } })
  let serviceCentre = await createServiceCentre(db, { name: 'Lisbon', location: { country: 'PT' } })
  return { db, close, legalEntity, payroll, provider, serviceCentre }
}

describe('effective parties of a payroll', () => {
  it("inherits its legal entity's default provider and service centre", async (t) => {
    let { db, close, legalEntity, payroll, provider, serviceCentre } = await setUp()
    t.after(close)
    await assignLegalEntityDefaults(db, legalEntity.id, { providerId: provider.id, serviceCentreId: serviceCentre.id })

    let effective = await findEffectiveParties(db, payroll.id)

    assert.equal(effective?.provider.party?.name, 'PayCo')
    assert.equal(effective?.provider.source, 'inherited')
    assert.equal(effective?.serviceCentre.party?.name, 'Lisbon')
    assert.equal(effective?.serviceCentre.source, 'inherited')
  })

  it('overrides one party while still inheriting the other', async (t) => {
    let { db, close, legalEntity, payroll, provider, serviceCentre } = await setUp()
    t.after(close)
    await assignLegalEntityDefaults(db, legalEntity.id, { providerId: provider.id, serviceCentreId: serviceCentre.id })
    let otherProvider = await createProvider(db, { name: 'Bureau One', location: { country: 'FR' } })

    await assignPayrollParties(db, payroll.id, { providerId: otherProvider.id, serviceCentreId: null })

    let effective = await findEffectiveParties(db, payroll.id)
    assert.equal(effective?.provider.party?.name, 'Bureau One')
    assert.equal(effective?.provider.source, 'overridden')
    assert.equal(effective?.serviceCentre.party?.name, 'Lisbon')
    assert.equal(effective?.serviceCentre.source, 'inherited')
  })

  it("goes back to inheriting once an override is cleared", async (t) => {
    let { db, close, legalEntity, payroll, provider, serviceCentre } = await setUp()
    t.after(close)
    await assignLegalEntityDefaults(db, legalEntity.id, { providerId: provider.id, serviceCentreId: null })
    let otherProvider = await createProvider(db, { name: 'Bureau One', location: { country: 'FR' } })
    await assignPayrollParties(db, payroll.id, { providerId: otherProvider.id, serviceCentreId: serviceCentre.id })

    await assignPayrollParties(db, payroll.id, { providerId: null, serviceCentreId: null })

    let effective = await findEffectiveParties(db, payroll.id)
    assert.equal(effective?.provider.party?.name, 'PayCo')
    assert.equal(effective?.provider.source, 'inherited')
    assert.equal(effective?.serviceCentre.party, null)
    assert.equal(effective?.serviceCentre.source, 'inherited')
  })

  it('follows a change to the legal entity default', async (t) => {
    let { db, close, legalEntity, payroll, provider } = await setUp()
    t.after(close)
    await assignLegalEntityDefaults(db, legalEntity.id, { providerId: provider.id, serviceCentreId: null })
    let otherProvider = await createProvider(db, { name: 'Bureau One', location: { country: 'FR' } })

    await assignLegalEntityDefaults(db, legalEntity.id, { providerId: otherProvider.id, serviceCentreId: null })

    let effective = await findEffectiveParties(db, payroll.id)
    assert.equal(effective?.provider.party?.name, 'Bureau One')
    assert.equal(effective?.provider.source, 'inherited')
  })

  it('returns null for an unknown payroll', async (t) => {
    let { db, close } = await setUp()
    t.after(close)

    assert.equal(await findEffectiveParties(db, 'missing'), null)
  })
})
