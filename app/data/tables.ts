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
