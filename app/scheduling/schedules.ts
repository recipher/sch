import type { Database } from 'remix/data-table'

import { payRuns, schedules } from '../data/tables.ts'
import type { CalendarDate } from './calendar-date.ts'
import { choosePayDay, payPeriod, payPeriodsStartingIn } from './pay-periods.ts'
import type { GenerationRange, PayPeriod } from './pay-periods.ts'
import { findPayroll } from './payrolls.ts'
import { isWorkingDay } from './working-days.ts'

export type ScheduleStatus = 'draft'

export interface Schedule {
  status: ScheduleStatus
  payDay: CalendarDate
}

export interface PayRun {
  id: string
  payPeriod: PayPeriod
  schedule: Schedule | null
}

// Creates or replaces the draft schedule of every pay run whose pay period starts in the range.
export async function generateSchedules(db: Database, payrollId: string, range: GenerationRange): Promise<void> {
  if (range.end < range.start) throw new Error('The generation range ends before it starts')

  let payroll = await findPayroll(db, payrollId)
  if (!payroll) throw new Error(`Payroll ${payrollId} not found`)

  let payPeriods = payPeriodsStartingIn(payroll.payFrequency, range)

  await db.transaction(async (tx) => {
    for (let payPeriod of payPeriods) {
      let payRun = await tx.findOne(payRuns, {
        where: { payroll_id: payroll.id, pay_period_start: payPeriod.start },
      })
      if (!payRun) {
        payRun = await tx.create(
          payRuns,
          {
            id: crypto.randomUUID(),
            payroll_id: payroll.id,
            pay_period_start: payPeriod.start,
            pay_period_end: payPeriod.end,
          },
          { returnRow: true },
        )
      }

      await tx.deleteMany(schedules, { where: { pay_run_id: payRun.id, status: 'draft' } })
      await tx.create(schedules, {
        id: crypto.randomUUID(),
        pay_run_id: payRun.id,
        status: 'draft',
        pay_day: choosePayDay(payroll.payDayRule, payPeriod, isWorkingDay),
        created_at: Date.now(),
      })
    }
  })
}

export async function listPayRuns(db: Database, payrollId: string): Promise<PayRun[]> {
  let payroll = await findPayroll(db, payrollId)
  if (!payroll) return []

  let rows = await db.findMany(payRuns, {
    where: { payroll_id: payroll.id },
    orderBy: ['pay_period_start', 'asc'],
  })

  return Promise.all(
    rows.map(async (row) => {
      let schedule = await db.findOne(schedules, { where: { pay_run_id: row.id, status: 'draft' } })
      return {
        id: row.id,
        payPeriod: payPeriod(payroll.payFrequency, row.pay_period_start, row.pay_period_end),
        schedule: schedule && { status: schedule.status, payDay: schedule.pay_day },
      }
    }),
  )
}
