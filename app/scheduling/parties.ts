import type { Database, TableRow } from 'remix/data-table'

import { clients, legalEntities, partyLocations, providers, serviceCentres } from '../data/tables.ts'

export interface Location {
  country: string
  region?: string | null
}

// A location held in its own right by a client, provider or service centre, so it can be removed by id.
export interface PartyLocation extends Location {
  id: string
}

export interface Provider {
  id: string
  name: string
  locations: PartyLocation[]
}

export interface ServiceCentre {
  id: string
  name: string
  locations: PartyLocation[]
}

export type PartyRole = 'client' | 'provider' | 'service-centre'

export interface Client {
  id: string
  name: string
}

export interface LegalEntity {
  id: string
  clientId: string
  name: string
  location: Location
  defaultProviderId: string | null
  defaultServiceCentreId: string | null
}

export async function createClient(db: Database, input: { name: string }): Promise<Client> {
  let row = await db.create(
    clients,
    { id: crypto.randomUUID(), name: input.name, created_at: Date.now() },
    { returnRow: true },
  )
  return { id: row.id, name: row.name }
}

export async function createLegalEntity(
  db: Database,
  input: { clientId: string; name: string; location: Location },
): Promise<LegalEntity> {
  let row = await db.create(
    legalEntities,
    {
      id: crypto.randomUUID(),
      client_id: input.clientId,
      name: input.name,
      country: input.location.country,
      region: input.location.region ?? null,
      created_at: Date.now(),
    },
    { returnRow: true },
  )
  return toLegalEntity(row)
}

// The provider and service centre that the legal entity's payrolls use unless they override them.
export async function assignLegalEntityDefaults(
  db: Database,
  legalEntityId: string,
  defaults: { providerId: string | null; serviceCentreId: string | null },
): Promise<void> {
  await db.update(legalEntities, legalEntityId, {
    default_provider_id: defaults.providerId,
    default_service_centre_id: defaults.serviceCentreId,
  })
}

export async function listClients(db: Database): Promise<Client[]> {
  let rows = await db.findMany(clients, { orderBy: ['name', 'asc'] })
  return rows.map((row) => ({ id: row.id, name: row.name }))
}

export async function findClient(
  db: Database,
  id: string,
): Promise<(Client & { locations: PartyLocation[]; legalEntities: LegalEntity[] }) | null> {
  let row = await db.find(clients, id)
  if (!row) return null

  let legalEntityRows = await db.findMany(legalEntities, { where: { client_id: id }, orderBy: ['name', 'asc'] })
  return {
    id: row.id,
    name: row.name,
    locations: await listLocations(db, row.id),
    legalEntities: legalEntityRows.map(toLegalEntity),
  }
}

export async function findLegalEntity(db: Database, id: string): Promise<LegalEntity | null> {
  let row = await db.find(legalEntities, id)
  return row && toLegalEntity(row)
}

function toLegalEntity(row: TableRow<typeof legalEntities>): LegalEntity {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    location: { country: row.country, region: row.region },
    defaultProviderId: row.default_provider_id,
    defaultServiceCentreId: row.default_service_centre_id,
  }
}

// Providers and service centres are stored alike: a named party with one or more locations.
type LocatedPartyTable = typeof providers | typeof serviceCentres

export function createProvider(db: Database, input: { name: string; location: Location }): Promise<Provider> {
  return createLocatedParty(db, providers, 'provider', input)
}

export function findProvider(db: Database, id: string): Promise<Provider | null> {
  return findLocatedParty(db, providers, id)
}

export function listProviders(db: Database): Promise<Provider[]> {
  return listLocatedParties(db, providers, 'provider')
}

export async function renameProvider(db: Database, id: string, name: string): Promise<void> {
  await db.update(providers, id, { name })
}

export function createServiceCentre(db: Database, input: { name: string; location: Location }): Promise<ServiceCentre> {
  return createLocatedParty(db, serviceCentres, 'service-centre', input)
}

export function findServiceCentre(db: Database, id: string): Promise<ServiceCentre | null> {
  return findLocatedParty(db, serviceCentres, id)
}

export function listServiceCentres(db: Database): Promise<ServiceCentre[]> {
  return listLocatedParties(db, serviceCentres, 'service-centre')
}

export async function renameServiceCentre(db: Database, id: string, name: string): Promise<void> {
  await db.update(serviceCentres, id, { name })
}

async function createLocatedParty(
  db: Database,
  table: LocatedPartyTable,
  role: PartyRole,
  input: { name: string; location: Location },
) {
  let row = await db.create(table, { id: crypto.randomUUID(), name: input.name, created_at: Date.now() }, { returnRow: true })
  await insertLocation(db, role, row.id, input.location)
  return { id: row.id, name: row.name, locations: await listLocations(db, row.id) }
}

async function findLocatedParty(db: Database, table: LocatedPartyTable, id: string) {
  let row = await db.find(table, id)
  return row && { id: row.id, name: row.name, locations: await listLocations(db, row.id) }
}

async function listLocatedParties(db: Database, table: LocatedPartyTable, role: PartyRole) {
  let rows = await db.findMany(table, { orderBy: ['name', 'asc'] })
  let locationRows = await db.findMany(partyLocations, {
    where: { party_role: role },
    orderBy: [
      ['country', 'asc'],
      ['region', 'asc'],
    ],
  })
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    locations: locationRows.filter((location) => location.party_id === row.id).map(toPartyLocation),
  }))
}

export interface PartyRef {
  role: PartyRole
  id: string
}

export type AddLocationResult = { ok: true } | { ok: false; reason: 'duplicate' }

export async function addLocation(db: Database, party: PartyRef, location: Location): Promise<AddLocationResult> {
  let region = location.region ?? null
  let existing = await listLocations(db, party.id)
  if (existing.some((other) => other.country === location.country && other.region === region)) {
    return { ok: false, reason: 'duplicate' }
  }

  await insertLocation(db, party.role, party.id, location)
  return { ok: true }
}

export type RemoveLocationResult = { ok: true } | { ok: false; reason: 'last-location' }

// Providers and service centres are created with a location and always keep at least one. Clients start
// with none, so they may go back to none.
export async function removeLocation(
  db: Database,
  party: PartyRef,
  locationId: string,
): Promise<RemoveLocationResult> {
  let existing = await listLocations(db, party.id)
  if (!existing.some((location) => location.id === locationId)) return { ok: true }
  if (party.role !== 'client' && existing.length === 1) return { ok: false, reason: 'last-location' }

  await db.deleteMany(partyLocations, { where: { id: locationId, party_id: party.id } })
  return { ok: true }
}

async function insertLocation(db: Database, role: PartyRole, partyId: string, location: Location) {
  await db.create(partyLocations, {
    id: crypto.randomUUID(),
    party_role: role,
    party_id: partyId,
    country: location.country,
    region: location.region ?? null,
    created_at: Date.now(),
  })
}

async function listLocations(db: Database, partyId: string): Promise<PartyLocation[]> {
  let rows = await db.findMany(partyLocations, {
    where: { party_id: partyId },
    orderBy: [
      ['country', 'asc'],
      ['region', 'asc'],
    ],
  })
  return rows.map(toPartyLocation)
}

function toPartyLocation(row: TableRow<typeof partyLocations>): PartyLocation {
  return { id: row.id, country: row.country, region: row.region }
}
