import { fileURLToPath } from 'node:url'
import type { Database } from 'remix/data-table'
import { loadMigrations } from 'remix/data-table/migrations/node'
import { createSqliteDatabase } from 'remix/data-table/sqlite'

export function openDatabase(): Database {
  return createSqliteDatabase({
    filename: fileURLToPath(new URL('../../db/app.sqlite', import.meta.url)),
    foreignKeys: true,
  })
}

export async function migrateDatabase(db: Database) {
  let migrations = await loadMigrations(fileURLToPath(new URL('../../db/migrations/', import.meta.url)))
  await db.migrate(migrations)
}
