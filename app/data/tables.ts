import { column as c, table } from 'remix/data-table'
import type { TableRow } from 'remix/data-table'

export const users = table({
  name: 'users',
  columns: {
    id: c.text(),
    email: c.text(),
    password_hash: c.text(),
    created_at: c.integer(),
  },
})

export type User = TableRow<typeof users>

export const clients = table({
  name: 'clients',
  columns: {
    id: c.text(),
    name: c.text(),
    created_at: c.integer(),
  },
})

export const legalEntities = table({
  name: 'legal_entities',
  columns: {
    id: c.text(),
    client_id: c.text(),
    name: c.text(),
    country: c.text(),
    region: c.text().nullable(),
    default_provider_id: c.text().nullable(),
    default_service_centre_id: c.text().nullable(),
    created_at: c.integer(),
  },
})

export const providers = table({
  name: 'providers',
  columns: {
    id: c.text(),
    name: c.text(),
    created_at: c.integer(),
  },
})

export const serviceCentres = table({
  name: 'service_centres',
  columns: {
    id: c.text(),
    name: c.text(),
    created_at: c.integer(),
  },
})

export const partyLocations = table({
  name: 'party_locations',
  columns: {
    id: c.text(),
    party_role: c.enum(['client', 'provider', 'service-centre'] as const),
    party_id: c.text(),
    country: c.text(),
    region: c.text().nullable(),
    created_at: c.integer(),
  },
})

export const payrolls = table({
  name: 'payrolls',
  columns: {
    id: c.text(),
    legal_entity_id: c.text(),
    name: c.text(),
    pay_frequency: c.enum(['monthly'] as const),
    pay_day_rule: c.enum(['last-working-day', 'last-weekday', 'fixed-date', 'next-period-first-working-day'] as const),
    pay_day_offset: c.integer().nullable(),
    pay_day_weekday: c.integer().nullable(),
    pay_day_of_month: c.integer().nullable(),
    pay_day_roll: c.enum(['earlier', 'later'] as const).nullable(),
    provider_id: c.text().nullable(),
    service_centre_id: c.text().nullable(),
    created_at: c.integer(),
  },
})

export const payRuns = table({
  name: 'pay_runs',
  columns: {
    id: c.text(),
    payroll_id: c.text(),
    pay_period_start: c.text(),
    pay_period_end: c.text(),
  },
})

export const schedules = table({
  name: 'schedules',
  columns: {
    id: c.text(),
    pay_run_id: c.text(),
    status: c.enum(['draft'] as const),
    pay_day: c.text(),
    created_at: c.integer(),
  },
})

export const holidayCalendarImports = table({
  name: 'holiday_calendar_imports',
  columns: {
    id: c.text(),
    country: c.text(),
    year: c.integer(),
    imported_at: c.integer(),
  },
})

export const importedPublicHolidays = table({
  name: 'imported_public_holidays',
  columns: {
    id: c.text(),
    country: c.text(),
    import_year: c.integer(),
    region: c.text().nullable(),
    date: c.text(),
    name: c.text(),
  },
})

export const holidayCalendarEdits = table({
  name: 'holiday_calendar_edits',
  columns: {
    id: c.text(),
    country: c.text(),
    region: c.text().nullable(),
    date: c.text(),
    kind: c.enum(['add', 'remove'] as const),
    name: c.text().nullable(),
    created_at: c.integer(),
  },
})
