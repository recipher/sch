import * as s from 'remix/data-schema'
import { getCsrfToken } from 'remix/middleware/csrf'
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { requireUser } from '../../middleware/auth.ts'
import { routes } from '../../routes.ts'
import { createClient, createLegalEntity, findClient, listClients } from '../../scheduling/parties.ts'
import { readText } from '../../ui/form-field.tsx'
import { NotFoundPage } from '../not-found-page.tsx'
import { ClientsPage } from './index-page.tsx'
import { clientForm, legalEntityForm } from './schema.ts'
import { ClientPage } from './show-page.tsx'

export default createController(routes.clients, {
  middleware: [requireUser()],
  actions: {
    async index(context) {
      let clients = await listClients(context.db)
      return context.render(<ClientsPage csrfToken={getCsrfToken(context)} clients={clients} />)
    },
    async create(context) {
      let parsed = s.parseSafe(clientForm, context.formData)
      if (!parsed.success) {
        let clients = await listClients(context.db)
        return context.render(
          <ClientsPage
            csrfToken={getCsrfToken(context)}
            clients={clients}
            name={readText(context.formData, 'name')}
            issues={parsed.issues}
          />,
          { status: 400 },
        )
      }

      let client = await createClient(context.db, parsed.value)
      return redirect(routes.clients.show.href({ clientId: client.id }), 303)
    },
    async show(context) {
      let client = await findClient(context.db, context.params.clientId)
      if (!client) return context.render(<NotFoundPage what="client" />, { status: 404 })

      return context.render(<ClientPage csrfToken={getCsrfToken(context)} client={client} />)
    },
    async createLegalEntity(context) {
      let client = await findClient(context.db, context.params.clientId)
      if (!client) return context.render(<NotFoundPage what="client" />, { status: 404 })

      let parsed = s.parseSafe(legalEntityForm, context.formData)
      if (!parsed.success) {
        return context.render(
          <ClientPage
            csrfToken={getCsrfToken(context)}
            client={client}
            values={{
              name: readText(context.formData, 'name'),
              country: readText(context.formData, 'country'),
              region: readText(context.formData, 'region'),
            }}
            issues={parsed.issues}
          />,
          { status: 400 },
        )
      }

      let { name, country, region } = parsed.value
      let legalEntity = await createLegalEntity(context.db, {
        clientId: client.id,
        name,
        location: { country, region },
      })
      return redirect(routes.legalEntities.show.href({ legalEntityId: legalEntity.id }), 303)
    },
  },
})
