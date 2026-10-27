import { DatabaseSync } from 'node:sqlite'
import { createSqliteDatabase } from 'remix/data-table/sqlite'

import { migrateDatabase } from '../app/data/db.ts'

// A fresh, migrated in-memory database for testing domain services directly.
export async function createTestDatabase() {
  let sqlite = new DatabaseSync(':memory:')
  let db = createSqliteDatabase(sqlite)
  await migrateDatabase(db)

  let close = async () => {
    await db.close()
    sqlite.close()
  }

  return { db, close }
}
