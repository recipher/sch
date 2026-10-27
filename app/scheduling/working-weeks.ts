import type { Database } from 'remix/data-table'

import { workingWeeks } from '../data/tables.ts'

// In the order of dayOfWeek, so a day's index is its day of the week.
export const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

export type DayOfWeek = (typeof daysOfWeek)[number]

export interface WorkingWeek {
  country: string
  days: DayOfWeek[]
}

const DEFAULT_DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

// A country's working week, or Monday to Friday if none has been set.
export async function findWorkingWeek(db: Database, country: string): Promise<WorkingWeek> {
  let row = await db.find(workingWeeks, country)
  return { country, days: row ? (row.days.split(',') as DayOfWeek[]) : DEFAULT_DAYS }
}

export async function setWorkingWeek(db: Database, country: string, days: DayOfWeek[]): Promise<WorkingWeek> {
  let ordered = daysOfWeek.filter((day) => days.includes(day))
  if (ordered.length === 0) throw new Error('A working week needs at least one day')

  await db.transaction(async (tx) => {
    await tx.deleteMany(workingWeeks, { where: { country } })
    await tx.create(workingWeeks, { country, days: ordered.join(','), updated_at: Date.now() })
  })
  return { country, days: ordered }
}
