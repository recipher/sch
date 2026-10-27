import * as s from 'remix/data-schema'
import { getCsrfToken } from 'remix/middleware/csrf'
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { requireUser } from '../../middleware/auth.ts'
import { routes } from '../../routes.ts'
import {
  addLocation,
  createProvider,
  findProvider,
  listProviders,
  removeLocation,
  renameProvider,
} from '../../scheduling/parties.ts'
import { readText } from '../../ui/form-field.tsx'
import { describeLocationRefusal, readLocationValues } from '../../ui/locations.tsx'
import { locatedPartyForm, locationForm, nameForm } from '../form-schema.ts'
import { NotFoundPage } from '../not-found-page.tsx'
import { ProvidersPage } from './index-page.tsx'
import { ProviderPage } from './show-page.tsx'

export default createController(routes.providers, {
  middleware: [requireUser()],
  actions: {
    async index(context) {
      return context.render(<ProvidersPage csrfToken={getCsrfToken(context)} providers={await listProviders(context.db)} />)
    },
    async create(context) {
      let parsed = s.parseSafe(locatedPartyForm, context.formData)
      if (!parsed.success) {
        return context.render(
          <ProvidersPage
            csrfToken={getCsrfToken(context)}
            providers={await listProviders(context.db)}
            values={{ name: readText(context.formData, 'name'), ...readLocationValues(context.formData) }}
            issues={parsed.issues}
          />,
          { status: 400 },
        )
      }

      let { name, country, region } = parsed.value
      let provider = await createProvider(context.db, { name, location: { country, region } })
      return redirect(routes.providers.show.href({ providerId: provider.id }), 303)
    },
    async show(context) {
      let provider = await findProvider(context.db, context.params.providerId)
      if (!provider) return context.render(<NotFoundPage what="provider" />, { status: 404 })

      return context.render(<ProviderPage csrfToken={getCsrfToken(context)} party={provider} />)
    },
    async rename(context) {
      let provider = await findProvider(context.db, context.params.providerId)
      if (!provider) return context.render(<NotFoundPage what="provider" />, { status: 404 })

      let parsed = s.parseSafe(nameForm, context.formData)
      if (!parsed.success) {
        return context.render(
          <ProviderPage
            csrfToken={getCsrfToken(context)}
            party={provider}
            name={readText(context.formData, 'name')}
            renameIssues={parsed.issues}
          />,
          { status: 400 },
        )
      }

      await renameProvider(context.db, provider.id, parsed.value.name)
      return redirect(routes.providers.show.href({ providerId: provider.id }), 303)
    },
    async addLocation(context) {
      let provider = await findProvider(context.db, context.params.providerId)
      if (!provider) return context.render(<NotFoundPage what="provider" />, { status: 404 })

      let parsed = s.parseSafe(locationForm, context.formData)
      let result = parsed.success
        ? await addLocation(context.db, { role: 'provider', id: provider.id }, parsed.value)
        : null
      if (!result?.ok) {
        return context.render(
          <ProviderPage
            csrfToken={getCsrfToken(context)}
            party={provider}
            location={readLocationValues(context.formData)}
            locationIssues={parsed.success ? undefined : parsed.issues}
            locationError={result ? describeLocationRefusal(result.reason, 'provider') : undefined}
          />,
          { status: 400 },
        )
      }

      return redirect(routes.providers.show.href({ providerId: provider.id }), 303)
    },
    async removeLocation(context) {
      let provider = await findProvider(context.db, context.params.providerId)
      if (!provider) return context.render(<NotFoundPage what="provider" />, { status: 404 })

      let result = await removeLocation(
        context.db,
        { role: 'provider', id: provider.id },
        context.params.locationId,
      )
      if (!result.ok) {
        return context.render(
          <ProviderPage
            csrfToken={getCsrfToken(context)}
            party={provider}
            locationError={describeLocationRefusal(result.reason, 'provider')}
          />,
          { status: 400 },
        )
      }

      return redirect(routes.providers.show.href({ providerId: provider.id }), 303)
    },
  },
})
