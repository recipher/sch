import * as s from 'remix/data-schema'
import type { Database } from 'remix/data-table'
import { getCsrfToken } from 'remix/middleware/csrf'
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { requireUser } from '../../middleware/auth.ts'
import { routes } from '../../routes.ts'
import {
  assignLegalEntityDefaults,
  findClient,
  findLegalEntity,
  listProviders,
  listServiceCentres,
} from '../../scheduling/parties.ts'
import { createPayroll, listPayrolls } from '../../scheduling/payrolls.ts'
import { readText } from '../../ui/form-field.tsx'
import { partyAssignmentForm } from '../form-schema.ts'
import { NotFoundPage } from '../not-found-page.tsx'
import { payrollForm } from './schema.ts'
import { LegalEntityPage } from './show-page.tsx'

export default createController(routes.legalEntities, {
  middleware: [requireUser()],
  actions: {
    async show(context) {
      let page = await loadPage(context.db, context.params.legalEntityId)
      if (!page) return context.render(<NotFoundPage what="legal entity" />, { status: 404 })

      return context.render(<LegalEntityPage csrfToken={getCsrfToken(context)} {...page} />)
    },
    async createPayroll(context) {
      let page = await loadPage(context.db, context.params.legalEntityId)
      if (!page) return context.render(<NotFoundPage what="legal entity" />, { status: 404 })

      let parsed = s.parseSafe(payrollForm, context.formData)
      if (!parsed.success) {
        return context.render(
          <LegalEntityPage
            csrfToken={getCsrfToken(context)}
            {...page}
            name={readText(context.formData, 'name')}
            issues={parsed.issues}
          />,
          { status: 400 },
        )
      }

      let { name, payFrequency, payDayRule } = parsed.value
      let payroll = await createPayroll(context.db, {
        legalEntityId: page.legalEntity.id,
        name,
        payFrequency,
        payDayRule: { kind: payDayRule },
      })
      return redirect(routes.payrolls.show.href({ payrollId: payroll.id }), 303)
    },
    async assignDefaults(context) {
      let page = await loadPage(context.db, context.params.legalEntityId)
      if (!page) return context.render(<NotFoundPage what="legal entity" />, { status: 404 })

      let parsed = s.parseSafe(partyAssignmentForm, context.formData)
      let known =
        parsed.success &&
        isKnown(page.providers, parsed.value.providerId) &&
        isKnown(page.serviceCentres, parsed.value.serviceCentreId)
      if (!parsed.success || !known) {
        return context.render(
          <LegalEntityPage csrfToken={getCsrfToken(context)} {...page} defaultsError="Choose a listed provider and service centre." />,
          { status: 400 },
        )
      }

      await assignLegalEntityDefaults(context.db, page.legalEntity.id, parsed.value)
      return redirect(routes.legalEntities.show.href({ legalEntityId: page.legalEntity.id }), 303)
    },
  },
})

async function loadPage(db: Database, legalEntityId: string) {
  let legalEntity = await findLegalEntity(db, legalEntityId)
  if (!legalEntity) return null

  let client = await findClient(db, legalEntity.clientId)
  if (!client) return null

  let payrolls = await listPayrolls(db, legalEntity.id)
  let providers = await listProviders(db)
  let serviceCentres = await listServiceCentres(db)
  return { client, legalEntity, payrolls, providers, serviceCentres }
}

function isKnown(parties: { id: string }[], id: string | null): boolean {
  return id === null || parties.some((party) => party.id === id)
}
