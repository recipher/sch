import { DatabaseSync } from 'node:sqlite'
import { createSqliteDatabase } from 'remix/data-table/sqlite'
import { createMemorySessionStorage } from 'remix/session-storage/memory'

import { migrateDatabase } from '../app/data/db.ts'
import { createSessionCookie } from '../app/middleware/session.ts'
import { createAppRouter } from '../app/router.ts'

// A router backed by a fresh, migrated in-memory database and in-memory sessions.
export async function createTestRouter() {
  let sqlite = new DatabaseSync(':memory:')
  let db = createSqliteDatabase(sqlite)
  await migrateDatabase(db)

  let router = createAppRouter({
    db,
    sessionCookie: createSessionCookie(['test-secret']),
    sessionStorage: createMemorySessionStorage(),
  })
  let close = async () => {
    await db.close()
    sqlite.close()
  }

  return { router, db, close }
}
