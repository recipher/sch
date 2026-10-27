import type { Database } from 'remix/data-table'
import { getCsrfToken } from 'remix/middleware/csrf'
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { requireUser } from '../../middleware/auth.ts'
import { routes } from '../../routes.ts'
import { findClient, findLegalEntity } from '../../scheduling/parties.ts'
import { createPayroll, listPayrolls } from '../../scheduling/payrolls.ts'
import { readText } from '../../ui/form-field.tsx'
import { NotFoundPage } from '../not-found-page.tsx'
import { parsePayroll } from './schema.ts'
import { LegalEntityPage, readPayDayRuleFields } from './show-page.tsx'

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

      let parsed = parsePayroll(context.formData)
      if (!parsed.success) {
        return context.render(
          <LegalEntityPage
            csrfToken={getCsrfToken(context)}
            {...page}
            name={readText(context.formData, 'name')}
            payDayRule={readPayDayRuleFields(context.formData)}
            issues={parsed.issues}
          />,
          { status: 400 },
        )
      }

      let payroll = await createPayroll(context.db, { legalEntityId: page.legalEntity.id, ...parsed.value })
      return redirect(routes.payrolls.show.href({ payrollId: payroll.id }), 303)
    },
  },
})

async function loadPage(db: Database, legalEntityId: string) {
  let legalEntity = await findLegalEntity(db, legalEntityId)
  if (!legalEntity) return null

  let client = await findClient(db, legalEntity.clientId)
  if (!client) return null

  let payrolls = await listPayrolls(db, legalEntity.id)
  return { client, legalEntity, payrolls }
}
