import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { createTestDatabase } from '../../test/database.ts'
import { createFakeHolidaySource } from '../../test/holiday-source.ts'
import {
  addPublicHoliday,
  ensureHolidayCalendarsImported,
  listHolidayCalendar,
  loadWorkingDays,
  removePublicHoliday,
  resyncHolidayCalendar,
} from './holiday-calendars.ts'

const GB_2027 = [
  { date: '2027-01-01', name: "New Year's Day", region: null },
  { date: '2027-01-04', name: 'Second of January', region: 'SCT' },
  { date: '2027-03-17', name: "St Patrick's Day", region: 'NIR' },
]

async function setUp(t: { after(fn: () => unknown): void }) {
  let { db, close } = await createTestDatabase()
  t.after(close)
  let holidays = createFakeHolidaySource({ 'GB 2027': GB_2027 })
  await ensureHolidayCalendarsImported(db, holidays.source, 'GB', [2027])
  return { db, holidays }
}

function summarise(calendar: Awaited<ReturnType<typeof listHolidayCalendar>>) {
  return calendar.entries.map((entry) => [entry.date, entry.name, entry.status])
}

describe('holiday calendars', () => {
  it("lists a region's calendar as the national holidays plus its own", async (t) => {
    let { db } = await setUp(t)

    let calendar = await listHolidayCalendar(db, { country: 'GB', region: 'SCT' }, 2027)

    assert.equal(calendar.imported, true)
    assert.deepEqual(summarise(calendar), [
      ['2027-01-01', "New Year's Day", 'imported'],
      ['2027-01-04', 'Second of January', 'imported'],
    ])
  })

  it('reports a year that has not been imported', async (t) => {
    let { db } = await setUp(t)

    let calendar = await listHolidayCalendar(db, { country: 'GB' }, 2028)

    assert.equal(calendar.imported, false)
    assert.deepEqual(calendar.entries, [])
  })

  it('applies a holiday added to a country in every region', async (t) => {
    let { db } = await setUp(t)

    await addPublicHoliday(db, { country: 'GB' }, { date: '2027-06-03', name: 'Jubilee' })

    let isWorkingDay = await loadWorkingDays(db, { country: 'GB', region: 'NIR' }, [2027])
    assert.equal(isWorkingDay('2027-06-03'), false)
    assert.deepEqual(summarise(await listHolidayCalendar(db, { country: 'GB' }, 2027)), [
      ['2027-01-01', "New Year's Day", 'imported'],
      ['2027-06-03', 'Jubilee', 'added'],
    ])
  })

  it('lets a region remove a national holiday for itself only', async (t) => {
    let { db } = await setUp(t)

    await removePublicHoliday(db, { country: 'GB', region: 'SCT' }, '2027-01-01')

    let inScotland = await loadWorkingDays(db, { country: 'GB', region: 'SCT' }, [2027])
    let inEngland = await loadWorkingDays(db, { country: 'GB', region: 'ENG' }, [2027])
    assert.equal(inScotland('2027-01-01'), true)
    assert.equal(inEngland('2027-01-01'), false)
    assert.deepEqual(summarise(await listHolidayCalendar(db, { country: 'GB', region: 'SCT' }, 2027)), [
      ['2027-01-01', "New Year's Day", 'removed'],
      ['2027-01-04', 'Second of January', 'imported'],
    ])
  })

  it('lets a region keep a holiday the country removed', async (t) => {
    let { db } = await setUp(t)

    await removePublicHoliday(db, { country: 'GB' }, '2027-01-01')
    await addPublicHoliday(db, { country: 'GB', region: 'SCT' }, { date: '2027-01-01', name: "New Year's Day" })

    assert.equal((await loadWorkingDays(db, { country: 'GB', region: 'SCT' }, [2027]))('2027-01-01'), false)
    assert.equal((await loadWorkingDays(db, { country: 'GB', region: 'ENG' }, [2027]))('2027-01-01'), true)
  })

  it('forgets a locally added holiday when it is removed', async (t) => {
    let { db } = await setUp(t)
    await addPublicHoliday(db, { country: 'GB' }, { date: '2027-06-03', name: 'Jubilee' })

    await removePublicHoliday(db, { country: 'GB' }, '2027-06-03')

    assert.deepEqual(summarise(await listHolidayCalendar(db, { country: 'GB' }, 2027)), [
      ['2027-01-01', "New Year's Day", 'imported'],
    ])
  })

  it('keeps local additions and removals when re-synced', async (t) => {
    let { db, holidays } = await setUp(t)
    await addPublicHoliday(db, { country: 'GB' }, { date: '2027-06-03', name: 'Jubilee' })
    await removePublicHoliday(db, { country: 'GB' }, '2027-01-01')
    holidays.calendars['GB 2027'] = [
      { date: '2027-01-01', name: "New Year's Day", region: null },
      { date: '2027-05-03', name: 'Early May bank holiday', region: null },
    ]

    let missing = await resyncHolidayCalendar(db, holidays.source, 'GB', 2027)

    assert.equal(missing, null)
    assert.deepEqual(summarise(await listHolidayCalendar(db, { country: 'GB' }, 2027)), [
      ['2027-01-01', "New Year's Day", 'removed'],
      ['2027-05-03', 'Early May bank holiday', 'imported'],
      ['2027-06-03', 'Jubilee', 'added'],
    ])
  })

  it('leaves the calendar untouched when a re-sync finds no data', async (t) => {
    let { db, holidays } = await setUp(t)
    delete holidays.calendars['GB 2027']

    let missing = await resyncHolidayCalendar(db, holidays.source, 'GB', 2027)

    assert.deepEqual(missing, { country: 'GB', year: 2027, reason: 'No holiday data for GB 2027' })
    assert.equal((await listHolidayCalendar(db, { country: 'GB' }, 2027)).entries.length, 1)
  })

  it("keeps a holiday observed in a neighbouring year when that year is imported", async (t) => {
    let { db, holidays } = await setUp(t)
    holidays.calendars['GB 2027'] = [{ date: '2026-12-31', name: 'Hogmanay (observed)', region: null }]
    holidays.calendars['GB 2026'] = []
    await resyncHolidayCalendar(db, holidays.source, 'GB', 2027)

    await resyncHolidayCalendar(db, holidays.source, 'GB', 2026)

    let isWorkingDay = await loadWorkingDays(db, { country: 'GB' }, [2026, 2027])
    assert.equal(isWorkingDay('2026-12-31'), false)
  })

  it('remembers a removal made before the year is imported', async (t) => {
    let { db, holidays } = await setUp(t)
    holidays.calendars['GB 2028'] = [{ date: '2028-01-03', name: "New Year's Day (observed)", region: null }]

    await removePublicHoliday(db, { country: 'GB' }, '2028-01-03')
    await ensureHolidayCalendarsImported(db, holidays.source, 'GB', [2028])

    assert.equal((await loadWorkingDays(db, { country: 'GB' }, [2028]))('2028-01-03'), true)
  })

  it('refuses to answer for dates outside the years it loaded', async (t) => {
    let { db } = await setUp(t)

    let isWorkingDay = await loadWorkingDays(db, { country: 'GB' }, [2027])

    assert.throws(() => isWorkingDay('2028-01-03'))
  })
})
