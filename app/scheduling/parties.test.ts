import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { createTestDatabase } from '../../test/database.ts'
import {
  addLocation,
  createClient,
  createLegalEntity,
  createProvider,
  createServiceCentre,
  findClient,
  findLegalEntity,
  findProvider,
  findServiceCentre,
  listClients,
  listProviders,
  listServiceCentres,
  removeLocation,
  renameProvider,
  renameServiceCentre,
} from './parties.ts'
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
      payDayRule: { kind: 'last-working-day', offset: 0 },
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

  it('creates a provider with its first location', async (t) => {
    let { db, close } = await createTestDatabase()
    t.after(close)

    let provider = await createProvider(db, { name: 'PayCo', location: { country: 'DE', region: 'BY' } })
    let found = await findProvider(db, provider.id)

    assert.equal(found?.name, 'PayCo')
    assert.deepEqual(
      found?.locations.map((location) => [location.country, location.region]),
      [['DE', 'BY']],
    )
  })

  it('adds further locations to a provider', async (t) => {
    let { db, close } = await createTestDatabase()
    t.after(close)
    let provider = await createProvider(db, { name: 'PayCo', location: { country: 'GB' } })

    let added = await addLocation(db, { role: 'provider', id: provider.id }, { country: 'DE', region: 'BY' })

    assert.deepEqual(added, { ok: true })
    let found = await findProvider(db, provider.id)
    assert.deepEqual(
      found?.locations.map((location) => [location.country, location.region]),
      [
        ['DE', 'BY'],
        ['GB', null],
      ],
    )
  })

  it('refuses a location the party already has', async (t) => {
    let { db, close } = await createTestDatabase()
    t.after(close)
    let provider = await createProvider(db, { name: 'PayCo', location: { country: 'GB' } })

    let duplicate = await addLocation(db, { role: 'provider', id: provider.id }, { country: 'GB' })

    assert.deepEqual(duplicate, { ok: false, reason: 'duplicate' })
    assert.equal((await findProvider(db, provider.id))?.locations.length, 1)
  })

  it("removes a provider's location but never its last one", async (t) => {
    let { db, close } = await createTestDatabase()
    t.after(close)
    let provider = await createProvider(db, { name: 'PayCo', location: { country: 'GB' } })
    await addLocation(db, { role: 'provider', id: provider.id }, { country: 'IE' })
    let [britain, ireland] = (await findProvider(db, provider.id))?.locations ?? []

    let removed = await removeLocation(db, { role: 'provider', id: provider.id }, ireland.id)
    let refused = await removeLocation(db, { role: 'provider', id: provider.id }, britain.id)

    assert.deepEqual(removed, { ok: true })
    assert.deepEqual(refused, { ok: false, reason: 'last-location' })
    let found = await findProvider(db, provider.id)
    assert.deepEqual(found?.locations.map((location) => location.country), ['GB'])
  })

  it('creates, renames and lists service centres by name', async (t) => {
    let { db, close } = await createTestDatabase()
    t.after(close)
    let manila = await createServiceCentre(db, { name: 'Manila hub', location: { country: 'PH' } })
    await createServiceCentre(db, { name: 'Lisbon', location: { country: 'PT' } })

    await renameServiceCentre(db, manila.id, 'Manila')

    assert.deepEqual((await listServiceCentres(db)).map((centre) => centre.name), ['Lisbon', 'Manila'])
    let found = await findServiceCentre(db, manila.id)
    assert.equal(found?.name, 'Manila')
    assert.deepEqual(found?.locations.map((location) => location.country), ['PH'])
  })

  it('renames and lists providers by name', async (t) => {
    let { db, close } = await createTestDatabase()
    t.after(close)
    let provider = await createProvider(db, { name: 'Zed Payroll', location: { country: 'GB' } })
    await createProvider(db, { name: 'Bureau One', location: { country: 'FR' } })

    await renameProvider(db, provider.id, 'Alpha Payroll')

    assert.deepEqual((await listProviders(db)).map((provider) => provider.name), ['Alpha Payroll', 'Bureau One'])
  })

  it('gives a client locations of its own', async (t) => {
    let { db, close } = await createTestDatabase()
    t.after(close)
    let client = await createClient(db, { name: 'Acme Group' })

    await addLocation(db, { role: 'client', id: client.id }, { country: 'US', region: 'NY' })
    await addLocation(db, { role: 'client', id: client.id }, { country: 'GB' })

    let found = await findClient(db, client.id)
    assert.deepEqual(
      found?.locations.map((location) => [location.country, location.region]),
      [
        ['GB', null],
        ['US', 'NY'],
      ],
    )
  })

  it('lets a client, which starts with no locations, remove its last one', async (t) => {
    let { db, close } = await createTestDatabase()
    t.after(close)
    let client = await createClient(db, { name: 'Acme Group' })
    await addLocation(db, { role: 'client', id: client.id }, { country: 'GB' })
    let [britain] = (await findClient(db, client.id))?.locations ?? []

    let removed = await removeLocation(db, { role: 'client', id: client.id }, britain.id)

    assert.deepEqual(removed, { ok: true })
    assert.deepEqual((await findClient(db, client.id))?.locations, [])
  })
})
