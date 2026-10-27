import type { Database, TableRow } from 'remix/data-table'

import { clients, legalEntities } from '../data/tables.ts'

export interface Location {
  country: string
  region?: string | null
}

export interface Client {
  id: string
  name: string
}

export interface LegalEntity {
  id: string
  clientId: string
  name: string
  location: Location
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

export async function listClients(db: Database): Promise<Client[]> {
  let rows = await db.findMany(clients, { orderBy: ['name', 'asc'] })
  return rows.map((row) => ({ id: row.id, name: row.name }))
}

export async function findClient(
  db: Database,
  id: string,
): Promise<(Client & { legalEntities: LegalEntity[] }) | null> {
  let row = await db.find(clients, id)
  if (!row) return null

  let legalEntityRows = await db.findMany(legalEntities, { where: { client_id: id }, orderBy: ['name', 'asc'] })
  return { id: row.id, name: row.name, legalEntities: legalEntityRows.map(toLegalEntity) }
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
  }
}
