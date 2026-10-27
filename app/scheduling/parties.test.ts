import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { createTestDatabase } from '../../test/database.ts'
import { createClient, createLegalEntity, findClient, findLegalEntity, listClients } from './parties.ts'
import { createPayroll, listPayrolls } from './payrolls.ts'

describe('parties', () => {
  it('lists clients by name', async (t) => {
    let { db, close } = await createTestDatabase()
    t.after(close)
    await createClient(db, { name: 'Zenith Holdings' })
    await createClient(db, { name: 'Acme Group' })

    let names = (await listClients(db)).map((client) => client.name)

    assert.deepEqual(names, ['Acme Group', 'Zenith Holdings'])
  })

  it("finds a client with its legal entities and their locations", async (t) => {
    let { db, close } = await createTestDatabase()
    t.after(close)
    let client = await createClient(db, { name: 'Acme Group' })
    await createLegalEntity(db, { clientId: client.id, name: 'Acme GmbH', location: { country: 'DE', region: 'BY' } })
    await createLegalEntity(db, { clientId: client.id, name: 'Acme UK Ltd', location: { country: 'GB' } })

    let found = await findClient(db, client.id)

    assert.equal(found?.name, 'Acme Group')
    assert.deepEqual(
      found?.legalEntities.map((legalEntity) => [legalEntity.name, legalEntity.location]),
      [
        ['Acme GmbH', { country: 'DE', region: 'BY' }],
        ['Acme UK Ltd', { country: 'GB', region: null }],
      ],
    )
  })

  it('finds a legal entity and its payrolls', async (t) => {
    let { db, close } = await createTestDatabase()
    t.after(close)
    let client = await createClient(db, { name: 'Acme Group' })
    let legalEntity = await createLegalEntity(db, { clientId: client.id, name: 'Acme UK Ltd', location: { country: 'GB' } })
    await createPayroll(db, {
      legalEntityId: legalEntity.id,
      name: 'Monthly salaried',
      payFrequency: 'monthly',
      payDayRule: { kind: 'last-working-day' },
    })

    let found = await findLegalEntity(db, legalEntity.id)
    let payrolls = await listPayrolls(db, legalEntity.id)

    assert.equal(found?.name, 'Acme UK Ltd')
    assert.equal(found?.clientId, client.id)
    assert.deepEqual(payrolls.map((payroll) => payroll.name), ['Monthly salaried'])
  })

  it('returns null for unknown clients and legal entities', async (t) => {
    let { db, close } = await createTestDatabase()
    t.after(close)

    assert.equal(await findClient(db, 'missing'), null)
    assert.equal(await findLegalEntity(db, 'missing'), null)
  })
})
