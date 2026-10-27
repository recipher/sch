import { and, between, eq, isNull } from 'remix/data-table'
import type { Database } from 'remix/data-table'

import { holidayCalendarEdits, holidayCalendarImports, importedPublicHolidays } from '../data/tables.ts'
import { yearOf } from './calendar-date.ts'
import type { CalendarDate } from './calendar-date.ts'
import type { HolidaySource, SourcedPublicHoliday } from './holiday-source.ts'
import type { Location } from './parties.ts'
import { isWorkingWeekDay } from './working-days.ts'
import { findWorkingWeek } from './working-weeks.ts'

// A country and year whose holiday calendar the holiday source could not supply.
export interface MissingHolidayCalendar {
  country: string
  year: number
  reason: string
}

// One day in a location's holiday calendar. Removed public holidays are listed so the removal shows.
export interface HolidayCalendarEntry {
  date: CalendarDate
  name: string
  status: 'imported' | 'added' | 'removed'
}

// Imports each year of the country's holiday calendar that hasn't been imported yet.
export async function ensureHolidayCalendarsImported(
  db: Database,
  source: HolidaySource,
  country: string,
  years: number[],
): Promise<MissingHolidayCalendar[]> {
  let missing: MissingHolidayCalendar[] = []

  for (let year of years) {
    if (await isImported(db, country, year)) continue

    let gap = await resyncHolidayCalendar(db, source, country, year)
    if (gap) missing.push(gap)
  }

  return missing
}

// Replaces the imported public holidays for one country and year. Local edits are kept.
export async function resyncHolidayCalendar(
  db: Database,
  source: HolidaySource,
  country: string,
  year: number,
): Promise<MissingHolidayCalendar | null> {
  let result = await source.fetchPublicHolidays(country, year)
  if (!result.found) return { country, year, reason: result.reason }

  await storeImport(db, country, year, result.publicHolidays)
  return null
}

export async function listHolidayCalendar(
  db: Database,
  location: Location,
  year: number,
): Promise<{ imported: boolean; entries: HolidayCalendarEntry[] }> {
  let entries = await resolveHolidayCalendar(db, location, [year])

  return {
    imported: await isImported(db, location.country, year),
    entries: [...entries.values()].sort((a, b) => a.date.localeCompare(b.date)),
  }
}

// Answers whether a date is a working day at the location. Only dates in the given years can be
// answered, so a date outside them is never mistaken for a day with no public holiday.
export async function loadWorkingDays(
  db: Database,
  location: Location,
  years: number[],
): Promise<(date: CalendarDate) => boolean> {
  let workingWeek = await findWorkingWeek(db, location.country)
  let entries = await resolveHolidayCalendar(db, location, years)
  let isPublicHoliday = (date: CalendarDate) => {
    let status = entries.get(date)?.status
    return status === 'imported' || status === 'added'
  }

  return (date) => {
    if (!years.includes(yearOf(date))) throw new Error(`Working days for ${date} were not loaded`)
    return isWorkingWeekDay(workingWeek, date) && !isPublicHoliday(date)
  }
}

// Adds a public holiday to a location: the whole country, or one region when the location has one.
export async function addPublicHoliday(
  db: Database,
  location: Location,
  publicHoliday: { date: CalendarDate; name: string },
) {
  await db.transaction(async (tx) => {
    await deleteEdit(tx, location, publicHoliday.date)
    await createEdit(tx, location, publicHoliday.date, { kind: 'add', name: publicHoliday.name })
  })
}

// Removes a public holiday from a location. Removing a locally added one forgets it; removing an
// imported or inherited one records the removal, as does removing from a year not yet imported.
export async function removePublicHoliday(db: Database, location: Location, date: CalendarDate) {
  await db.transaction(async (tx) => {
    await deleteEdit(tx, location, date)

    let year = yearOf(date)
    let remaining = (await resolveHolidayCalendar(tx, location, [year])).get(date)
    let stillAHoliday = remaining !== undefined && remaining.status !== 'removed'
    if (stillAHoliday || !(await isImported(tx, location.country, year))) {
      await createEdit(tx, location, date, { kind: 'remove', name: null })
    }
  })
}

// Layers apply from broadest to most specific: imported public holidays, then country edits, then region edits.
async function resolveHolidayCalendar(
  db: Database,
  location: Location,
  years: number[],
): Promise<Map<CalendarDate, HolidayCalendarEntry>> {
  let region = location.region ?? null
  let appliesHere = (row: { region: string | null }) => row.region === null || row.region === region
  let inCountryAndYears = and(
    eq('country', location.country),
    between('date', `${Math.min(...years)}-01-01`, `${Math.max(...years)}-12-31`),
  )

  let imported = (await db.findMany(importedPublicHolidays, { where: inCountryAndYears })).filter(appliesHere)
  let edits = (await db.findMany(holidayCalendarEdits, { where: inCountryAndYears })).filter(appliesHere)
  let countryEdits = edits.filter((edit) => edit.region === null)
  let regionEdits = edits.filter((edit) => edit.region !== null)

  let entries = new Map<CalendarDate, HolidayCalendarEntry>()
  for (let row of imported) {
    entries.set(row.date, { date: row.date, name: row.name, status: 'imported' })
  }
  for (let edit of [...countryEdits, ...regionEdits]) {
    let existing = entries.get(edit.date)
    if (edit.kind === 'add') entries.set(edit.date, { date: edit.date, name: edit.name ?? '', status: 'added' })
    else if (existing) entries.set(edit.date, { ...existing, status: 'removed' })
  }

  return entries
}

async function isImported(db: Database, country: string, year: number): Promise<boolean> {
  return (await db.findOne(holidayCalendarImports, { where: { country, year } })) !== null
}

async function storeImport(db: Database, country: string, year: number, publicHolidays: SourcedPublicHoliday[]) {
  await db.transaction(async (tx) => {
    await tx.deleteMany(importedPublicHolidays, { where: { country, import_year: year } })
    if (publicHolidays.length > 0) {
      await tx.createMany(
        importedPublicHolidays,
        publicHolidays.map((publicHoliday) => ({
          id: crypto.randomUUID(),
          country,
          import_year: year,
          region: publicHoliday.region,
          date: publicHoliday.date,
          name: publicHoliday.name,
        })),
      )
    }
    await tx.deleteMany(holidayCalendarImports, { where: { country, year } })
    await tx.create(holidayCalendarImports, { id: crypto.randomUUID(), country, year, imported_at: Date.now() })
  })
}

async function createEdit(
  db: Database,
  location: Location,
  date: CalendarDate,
  edit: { kind: 'add'; name: string } | { kind: 'remove'; name: null },
) {
  await db.create(holidayCalendarEdits, {
    id: crypto.randomUUID(),
    country: location.country,
    region: location.region ?? null,
    date,
    ...edit,
    created_at: Date.now(),
  })
}

async function deleteEdit(db: Database, location: Location, date: CalendarDate) {
  let region = location.region ?? null
  await db.deleteMany(holidayCalendarEdits, {
    where:
      region === null
        ? and(eq('country', location.country), eq('date', date), isNull('region'))
        : { country: location.country, region, date },
  })
}
