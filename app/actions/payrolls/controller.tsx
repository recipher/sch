import * as s from 'remix/data-schema'
import type { Database } from 'remix/data-table'
import { getCsrfToken } from 'remix/middleware/csrf'
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { requireUser } from '../../middleware/auth.ts'
import { routes } from '../../routes.ts'
import { findClient, findLegalEntity, listProviders, listServiceCentres } from '../../scheduling/parties.ts'
import { assignPayrollParties, findEffectiveParties, findPayroll } from '../../scheduling/payrolls.ts'
import { generateSchedules, listPayRuns } from '../../scheduling/schedules.ts'
import { readText } from '../../ui/form-field.tsx'
import { partyAssignmentForm } from '../form-schema.ts'
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
    async assignParties(context) {
      let page = await loadPage(context.db, context.params.payrollId)
      if (!page) return context.render(<NotFoundPage what="payroll" />, { status: 404 })

      let parsed = s.parseSafe(partyAssignmentForm, context.formData)
      let known =
        parsed.success &&
        isKnown(page.providers, parsed.value.providerId) &&
        isKnown(page.serviceCentres, parsed.value.serviceCentreId)
      if (!parsed.success || !known) {
        return context.render(
          <PayrollPage csrfToken={getCsrfToken(context)} {...page} partiesError="Choose a listed provider and service centre." />,
          { status: 400 },
        )
      }

      await assignPayrollParties(context.db, page.payroll.id, parsed.value)
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

  let effectiveParties = await findEffectiveParties(db, payroll.id)
  if (!effectiveParties) return null

  let payRuns = await listPayRuns(db, payroll.id)
  let providers = await listProviders(db)
  let serviceCentres = await listServiceCentres(db)
  return { client, legalEntity, payroll, payRuns, effectiveParties, providers, serviceCentres }
}

function isKnown(parties: { id: string }[], id: string | null): boolean {
  return id === null || parties.some((party) => party.id === id)
}
