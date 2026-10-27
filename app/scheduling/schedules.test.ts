import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { createTestDatabase } from '../../test/database.ts'
import { createClient, createLegalEntity } from './parties.ts'
import type { Location } from './parties.ts'
import { createPayroll } from './payrolls.ts'
import { generateSchedules, listPayRuns } from './schedules.ts'
import { setWorkingWeek } from './working-weeks.ts'

async function setUpMonthlyPayroll(t: { after(fn: () => unknown): void }, location: Location = { country: 'GB' }) {
  let { db, close } = await createTestDatabase()
  t.after(close)
  let client = await createClient(db, { name: 'Acme Group' })
  let legalEntity = await createLegalEntity(db, {
    clientId: client.id,
    name: 'Acme Ltd',
    location,
  })
  let payroll = await createPayroll(db, {
    legalEntityId: legalEntity.id,
    name: 'Monthly salaried',
    payFrequency: 'monthly',
    payDayRule: { kind: 'last-working-day' },
  })
  return { db, payroll }
}

describe('generating schedules', () => {
  it('creates a draft schedule for each monthly pay period in the generation range, paid on its last working day', async (t) => {
    let { db, payroll } = await setUpMonthlyPayroll(t)

    await generateSchedules(db, payroll.id, { start: '2027-01-01', end: '2027-03-31' })

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
    let { db, payroll } = await setUpMonthlyPayroll(t, { country: 'AE', region: 'DU' })
    await setWorkingWeek(db, 'AE', ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'])

    await generateSchedules(db, payroll.id, { start: '2027-01-01', end: '2027-04-30' })

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
    let { db, payroll } = await setUpMonthlyPayroll(t)

    await generateSchedules(db, payroll.id, { start: '2027-01-15', end: '2027-03-01' })

    let payRuns = await listPayRuns(db, payroll.id)
    assert.deepEqual(
      payRuns.map((payRun) => payRun.payPeriod.label),
      ['February 2027', 'March 2027'],
    )
  })

  it('replaces draft schedules rather than duplicating pay runs when ranges overlap', async (t) => {
    let { db, payroll } = await setUpMonthlyPayroll(t)

    await generateSchedules(db, payroll.id, { start: '2027-01-01', end: '2027-02-28' })
    await generateSchedules(db, payroll.id, { start: '2027-02-01', end: '2027-03-31' })

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
    let { db, payroll } = await setUpMonthlyPayroll(t)

    await assert.rejects(generateSchedules(db, payroll.id, { start: '2027-03-31', end: '2027-01-01' }))

    assert.deepEqual(await listPayRuns(db, payroll.id), [])
  })
})
