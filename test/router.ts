import { DatabaseSync } from 'node:sqlite'
import { createSqliteDatabase } from 'remix/data-table/sqlite'
import { createMemorySessionStorage } from 'remix/session-storage/memory'

import { migrateDatabase } from '../app/data/db.ts'
import { createSessionCookie } from '../app/middleware/session.ts'
import { createAppRouter } from '../app/router.ts'
import { createFakeHolidaySource } from './holiday-source.ts'

// A router backed by a fresh, migrated in-memory database, in-memory sessions and a fake holiday
// source. Pass the holiday data a test needs; anything else has no data.
export async function createTestRouter(options: { holidays?: Parameters<typeof createFakeHolidaySource>[0] } = {}) {
  let sqlite = new DatabaseSync(':memory:')
  let db = createSqliteDatabase(sqlite)
  await migrateDatabase(db)

  let holidays = createFakeHolidaySource(options.holidays)
  let router = createAppRouter({
    db,
    holidaySource: holidays.source,
    sessionCookie: createSessionCookie(['test-secret']),
    sessionStorage: createMemorySessionStorage(),
  })
  let close = async () => {
    await db.close()
    sqlite.close()
  }

  return { router, db, holidays, close }
}
