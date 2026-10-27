import type { Database } from 'remix/data-table'
import { getCsrfToken } from 'remix/middleware/csrf'
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { requireUser } from '../../middleware/auth.ts'
import { routes } from '../../routes.ts'
import { findClient, findLegalEntity } from '../../scheduling/parties.ts'
import { findPayroll } from '../../scheduling/payrolls.ts'
import { generateSchedules, listPayRuns } from '../../scheduling/schedules.ts'
import { readText } from '../../ui/form-field.tsx'
import { NotFoundPage } from '../not-found-page.tsx'
import { parseGenerationRange } from './schema.ts'
import { PayrollPage } from './show-page.tsx'

export default createController(routes.payrolls, {
  middleware: [requireUser()],
  actions: {
    async show(context) {
      let page = await loadPage(context.db, context.params.payrollId)
      if (!page) return context.render(<NotFoundPage what="payroll" />, { status: 404 })

      return context.render(<PayrollPage csrfToken={getCsrfToken(context)} {...page} />)
    },
    async generate(context) {
      let page = await loadPage(context.db, context.params.payrollId)
      if (!page) return context.render(<NotFoundPage what="payroll" />, { status: 404 })

      let parsed = parseGenerationRange(context.formData)
      if (!parsed.success) {
        return context.render(
          <PayrollPage
            csrfToken={getCsrfToken(context)}
            {...page}
            range={{ start: readText(context.formData, 'start'), end: readText(context.formData, 'end') }}
            issues={parsed.issues}
          />,
          { status: 400 },
        )
      }

      let result = await generateSchedules(context.db, context.holidaySource, page.payroll.id, parsed.value)
      if (!result.generated) {
        return context.render(
          <PayrollPage
            csrfToken={getCsrfToken(context)}
            {...page}
            range={parsed.value}
            missingHolidayCalendars={result.missingHolidayCalendars}
          />,
          { status: 422 },
        )
      }

      return redirect(routes.payrolls.show.href({ payrollId: page.payroll.id }), 303)
    },
  },
})

async function loadPage(db: Database, payrollId: string) {
  let payroll = await findPayroll(db, payrollId)
  if (!payroll) return null

  let legalEntity = await findLegalEntity(db, payroll.legalEntityId)
  if (!legalEntity) return null

  let client = await findClient(db, legalEntity.clientId)
  if (!client) return null

  let payRuns = await listPayRuns(db, payroll.id)
  return { client, legalEntity, payroll, payRuns }
}
