import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { createTestDatabase } from '../../test/database.ts'
import { findWorkingWeek, setWorkingWeek } from './working-weeks.ts'

describe('working weeks', () => {
  it('defaults a country to a Monday to Friday working week', async (t) => {
    let { db, close } = await createTestDatabase()
    t.after(close)

    let workingWeek = await findWorkingWeek(db, 'GB')

    assert.deepEqual(workingWeek, { country: 'GB', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] })
  })

  it("saves a country's working week, in week order, without affecting other countries", async (t) => {
    let { db, close } = await createTestDatabase()
    t.after(close)

    await setWorkingWeek(db, 'AE', ['thursday', 'sunday', 'monday', 'tuesday', 'wednesday'])

    assert.deepEqual(await findWorkingWeek(db, 'AE'), {
      country: 'AE',
      days: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    })
    assert.deepEqual((await findWorkingWeek(db, 'GB')).days, ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
  })

  it('replaces a working week that was saved before', async (t) => {
    let { db, close } = await createTestDatabase()
    t.after(close)

    await setWorkingWeek(db, 'AE', ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'])
    await setWorkingWeek(db, 'AE', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])

    assert.deepEqual((await findWorkingWeek(db, 'AE')).days, ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])
  })

  it('refuses a working week with no days', async (t) => {
    let { db, close } = await createTestDatabase()
    t.after(close)

    await assert.rejects(setWorkingWeek(db, 'AE', []))

    assert.deepEqual((await findWorkingWeek(db, 'AE')).days, ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
  })
})
