import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { createTestDatabase } from '../../test/database.ts'
import { createFakeHolidaySource } from '../../test/holiday-source.ts'
import type { SourcedPublicHoliday } from './holiday-source.ts'
import { createClient, createLegalEntity } from './parties.ts'
import type { Location } from './parties.ts'
import type { PayDayRule } from './pay-periods.ts'
import { createPayroll } from './payrolls.ts'
import { generateSchedules, listPayRuns } from './schedules.ts'
import { setWorkingWeek } from './working-weeks.ts'

async function setUpMonthlyPayroll(
  t: { after(fn: () => unknown): void },
  options: { location?: Location; calendars?: Record<string, SourcedPublicHoliday[]>; payDayRule?: PayDayRule } = {},
) {
  let { db, close } = await createTestDatabase()
  t.after(close)
  let holidays = createFakeHolidaySource(options.calendars ?? { 'GB 2027': [] })
  let client = await createClient(db, { name: 'Acme Group' })
  let legalEntity = await createLegalEntity(db, {
    clientId: client.id,
    name: 'Acme Ltd',
    location: options.location ?? { country: 'GB' },
  })
  let payroll = await createPayroll(db, {
    legalEntityId: legalEntity.id,
    name: 'Monthly salaried',
    payFrequency: 'monthly',
    payDayRule: options.payDayRule ?? { kind: 'last-working-day', offset: 0 },
  })
  return { db, holidays, payroll, generate: (range: { start: string; end: string }) => generateSchedules(db, holidays.source, payroll.id, range) }
}

describe('generating schedules', () => {
  it('creates a draft schedule for each monthly pay period in the generation range, paid on its last working day', async (t) => {
    let { db, payroll, generate } = await setUpMonthlyPayroll(t)

    await generate({ start: '2027-01-01', end: '2027-03-31' })

    let payRuns = await listPayRuns(db, payroll.id)
    assert.deepEqual(
      payRuns.map((payRun) => ({
        payPeriod: payRun.payPeriod.label,
        status: payRun.schedule?.status,
        payDay: payRun.schedule?.payDay,
      })),
      [
        { payPeriod: 'January 2027', status: 'draft', payDay: '2027-01-29' },
        { payPeriod: 'February 2027', status: 'draft', payDay: '2027-02-26' },
        { payPeriod: 'March 2027', status: 'draft', payDay: '2027-03-31' },
      ],
    )
  })

  it("pays on the last working day of the legal entity's country's working week", async (t) => {
    let { db, payroll, generate } = await setUpMonthlyPayroll(t, {
      location: { country: 'AE', region: 'DU' },
      calendars: { 'AE 2027': [] },
    })
    await setWorkingWeek(db, 'AE', ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'])

    await generate({ start: '2027-01-01', end: '2027-04-30' })

    let payRuns = await listPayRuns(db, payroll.id)
    assert.deepEqual(
      payRuns.map((payRun) => [payRun.payPeriod.label, payRun.schedule?.payDay]),
      [
        ['January 2027', '2027-01-31'],
        ['February 2027', '2027-02-28'],
        ['March 2027', '2027-03-31'],
        ['April 2027', '2027-04-29'],
      ],
    )
  })

  it('includes only pay periods that start inside the generation range', async (t) => {
    let { db, payroll, generate } = await setUpMonthlyPayroll(t)

    await generate({ start: '2027-01-15', end: '2027-03-01' })

    let payRuns = await listPayRuns(db, payroll.id)
    assert.deepEqual(
      payRuns.map((payRun) => payRun.payPeriod.label),
      ['February 2027', 'March 2027'],
    )
  })

  it('replaces draft schedules rather than duplicating pay runs when ranges overlap', async (t) => {
    let { db, payroll, generate } = await setUpMonthlyPayroll(t)

    await generate({ start: '2027-01-01', end: '2027-02-28' })
    await generate({ start: '2027-02-01', end: '2027-03-31' })

    let payRuns = await listPayRuns(db, payroll.id)
    assert.deepEqual(
      payRuns.map((payRun) => [payRun.payPeriod.label, payRun.schedule?.payDay]),
      [
        ['January 2027', '2027-01-29'],
        ['February 2027', '2027-02-26'],
        ['March 2027', '2027-03-31'],
      ],
    )
  })

  it('refuses a generation range that ends before it starts', async (t) => {
    let { db, payroll, generate } = await setUpMonthlyPayroll(t)

    await assert.rejects(generate({ start: '2027-03-31', end: '2027-01-01' }))

    assert.deepEqual(await listPayRuns(db, payroll.id), [])
  })

  it('moves pay day off a public holiday, importing the holiday calendar on demand', async (t) => {
    let { db, holidays, payroll, generate } = await setUpMonthlyPayroll(t, {
      calendars: { 'GB 2027': [{ date: '2027-01-29', name: 'Founders Day', region: null }] },
    })

    await generate({ start: '2027-01-01', end: '2027-01-31' })
    await generate({ start: '2027-01-01', end: '2027-01-31' })

    let [payRun] = await listPayRuns(db, payroll.id)
    assert.equal(payRun.schedule?.payDay, '2027-01-28')
    assert.deepEqual(holidays.requests, ['GB 2027'])
  })

  it("applies a regional holiday only to legal entities in that region", async (t) => {
    let calendars = { 'GB 2027': [{ date: '2027-01-29', name: 'Regional Day', region: 'SCT' }] }
    let scotland = await setUpMonthlyPayroll(t, { location: { country: 'GB', region: 'SCT' }, calendars })
    let england = await setUpMonthlyPayroll(t, { location: { country: 'GB', region: 'ENG' }, calendars })

    await scotland.generate({ start: '2027-01-01', end: '2027-01-31' })
    await england.generate({ start: '2027-01-01', end: '2027-01-31' })

    assert.equal((await listPayRuns(scotland.db, scotland.payroll.id))[0].schedule?.payDay, '2027-01-28')
    assert.equal((await listPayRuns(england.db, england.payroll.id))[0].schedule?.payDay, '2027-01-29')
  })

  it('blocks generation and names the gap when a year has no holiday data', async (t) => {
    let { db, payroll, generate } = await setUpMonthlyPayroll(t, { calendars: { 'GB 2027': [] } })

    let result = await generate({ start: '2027-12-01', end: '2028-01-31' })

    assert.deepEqual(result, {
      generated: false,
      missingHolidayCalendars: [{ country: 'GB', year: 2028, reason: 'No holiday data for GB 2028' }],
    })
    assert.deepEqual(await listPayRuns(db, payroll.id), [])
  })
  it('applies the pay day rule chosen for the payroll', async (t) => {
    // Thu 25 Mar 2027 is a public holiday.
    let calendars = { 'GB 2027': [{ date: '2027-03-25', name: 'Spring Day', region: null }] }
    let cases: [PayDayRule, string][] = [
      [{ kind: 'last-working-day', offset: 3 }, '2027-03-26'],
      [{ kind: 'last-weekday', weekday: 4, roll: 'earlier' }, '2027-03-24'],
      [{ kind: 'last-weekday', weekday: 4, roll: 'later' }, '2027-03-26'],
      [{ kind: 'fixed-date', day: 25, roll: 'earlier' }, '2027-03-24'],
      [{ kind: 'next-period-first-working-day', offset: 1 }, '2027-04-02'],
    ]

    for (let [payDayRule, payDay] of cases) {
      let { db, payroll, generate } = await setUpMonthlyPayroll(t, { calendars, payDayRule })

      await generate({ start: '2027-03-01', end: '2027-03-31' })

      let payRuns = await listPayRuns(db, payroll.id)
      assert.deepEqual(
        payRuns.map((payRun) => [payRun.payPeriod.label, payRun.schedule?.payDay]),
        [['March 2027', payDay]],
        payDayRule.kind,
      )
    }
  })

  it("keeps December's pay run in December when it is paid in the new year", async (t) => {
    let { db, holidays, payroll, generate } = await setUpMonthlyPayroll(t, {
      calendars: { 'GB 2027': [], 'GB 2028': [{ date: '2028-01-03', name: 'New Year', region: null }] },
      payDayRule: { kind: 'next-period-first-working-day', offset: 0 },
    })

    let result = await generate({ start: '2027-12-01', end: '2027-12-31' })

    assert.deepEqual(result, { generated: true })
    let payRuns = await listPayRuns(db, payroll.id)
    assert.deepEqual(
      payRuns.map((payRun) => [payRun.payPeriod.label, payRun.schedule?.payDay]),
      [['December 2027', '2028-01-04']],
    )
    assert.deepEqual(holidays.requests, ['GB 2027', 'GB 2028'])
  })

  it('uses the previous year\'s public holidays when January rolls back into December', async (t) => {
    let { db, payroll, generate } = await setUpMonthlyPayroll(t, {
      // Fri 1 Jan 2027 is a holiday, and so is Thu 31 Dec 2026.
      calendars: {
        'GB 2026': [{ date: '2026-12-31', name: 'Year End', region: null }],
        'GB 2027': [{ date: '2027-01-01', name: 'New Year', region: null }],
      },
      payDayRule: { kind: 'fixed-date', day: 1, roll: 'earlier' },
    })

    await generate({ start: '2027-01-01', end: '2027-01-31' })

    let [payRun] = await listPayRuns(db, payroll.id)
    assert.equal(payRun.payPeriod.label, 'January 2027')
    assert.equal(payRun.schedule?.payDay, '2026-12-30')
  })

  it('blocks generation when the year a pay day lands in has no holiday data', async (t) => {
    let { db, payroll, generate } = await setUpMonthlyPayroll(t, {
      calendars: { 'GB 2027': [] },
      payDayRule: { kind: 'next-period-first-working-day', offset: 0 },
    })

    let result = await generate({ start: '2027-12-01', end: '2027-12-31' })

    assert.deepEqual(result, {
      generated: false,
      missingHolidayCalendars: [{ country: 'GB', year: 2028, reason: 'No holiday data for GB 2028' }],
    })
    assert.deepEqual(await listPayRuns(db, payroll.id), [])
  })
})
