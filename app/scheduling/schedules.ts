import type { Database } from 'remix/data-table'

import { payRuns, schedules } from '../data/tables.ts'
import { yearOf } from './calendar-date.ts'
import type { CalendarDate } from './calendar-date.ts'
import type { HolidaySource } from './holiday-source.ts'
import { ensureHolidayCalendarsImported, loadWorkingDays } from './holiday-calendars.ts'
import type { MissingHolidayCalendar } from './holiday-calendars.ts'
import { findLegalEntity } from './parties.ts'
import type { Location } from './parties.ts'
import { choosePayDay, payPeriod, payPeriodsStartingIn } from './pay-periods.ts'
import type { GenerationRange, PayDayRule, PayPeriod } from './pay-periods.ts'
import { findPayroll } from './payrolls.ts'

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

export type GenerationResult =
  | { generated: true }
  | { generated: false; missingHolidayCalendars: MissingHolidayCalendar[] }

// Creates or replaces the draft schedule of every pay run whose pay period starts in the range.
// Missing holiday calendars are imported first; if any can't be, nothing is generated.
export async function generateSchedules(
  db: Database,
  holidaySource: HolidaySource,
  payrollId: string,
  range: GenerationRange,
): Promise<GenerationResult> {
  if (range.end < range.start) throw new Error('The generation range ends before it starts')

  let payroll = await findPayroll(db, payrollId)
  if (!payroll) throw new Error(`Payroll ${payrollId} not found`)
  let legalEntity = await findLegalEntity(db, payroll.legalEntityId)
  if (!legalEntity) throw new Error(`Legal entity ${payroll.legalEntityId} not found`)

  let payPeriods = payPeriodsStartingIn(payroll.payFrequency, range)
  if (payPeriods.length === 0) return { generated: true }

  let payDays = await choosePayDays(db, holidaySource, legalEntity.location, payroll.payDayRule, payPeriods)
  if (!payDays.chosen) return { generated: false, missingHolidayCalendars: payDays.missingHolidayCalendars }

  await db.transaction(async (tx) => {
    for (let [index, payPeriod] of payPeriods.entries()) {
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
        pay_day: payDays.payDays[index],
        created_at: Date.now(),
      })
    }
  })

  return { generated: true }
}

// A pay day can land in a year its pay period doesn't touch (December paid in January, or the 1st
// of January rolled back into December), which only shows while walking working days. Each further
// year's holiday calendar is imported as the walk reaches it.
async function choosePayDays(
  db: Database,
  holidaySource: HolidaySource,
  location: Location,
  rule: PayDayRule,
  payPeriods: PayPeriod[],
): Promise<
  { chosen: true; payDays: CalendarDate[] } | { chosen: false; missingHolidayCalendars: MissingHolidayCalendar[] }
> {
  let years = yearsCovered(payPeriods)

  while (true) {
    let missingHolidayCalendars = await ensureHolidayCalendarsImported(db, holidaySource, location.country, years)
    if (missingHolidayCalendars.length > 0) return { chosen: false, missingHolidayCalendars }

    let isLoadedWorkingDay = await loadWorkingDays(db, location, years)
    let isWorkingDay = (date: CalendarDate) => {
      if (!years.includes(yearOf(date))) throw new YearNotLoaded(yearOf(date))
      return isLoadedWorkingDay(date)
    }

    try {
      return { chosen: true, payDays: payPeriods.map((payPeriod) => choosePayDay(rule, payPeriod, isWorkingDay)) }
    } catch (error) {
      if (!(error instanceof YearNotLoaded)) throw error
      years = [...years, error.year]
    }
  }
}

class YearNotLoaded extends Error {
  constructor(readonly year: number) {
    super(`Working days for ${year} were not loaded`)
  }
}

function yearsCovered(payPeriods: PayPeriod[]): number[] {
  let first = yearOf(payPeriods[0].start)
  let last = yearOf(payPeriods[payPeriods.length - 1].end)
  return Array.from({ length: last - first + 1 }, (_, index) => first + index)
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
