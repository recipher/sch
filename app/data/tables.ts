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
    pay_day_rule: c.enum(['last-working-day'] as const),
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

// days holds the working week's day names in week order, comma-separated.
export const workingWeeks = table({
  name: 'working_weeks',
  primaryKey: 'country',
  columns: {
    country: c.text(),
    days: c.text(),
    updated_at: c.integer(),
  },
})
