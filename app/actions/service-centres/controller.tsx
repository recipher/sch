import * as s from 'remix/data-schema'
import { getCsrfToken } from 'remix/middleware/csrf'
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { requireUser } from '../../middleware/auth.ts'
import { routes } from '../../routes.ts'
import {
  addLocation,
  createServiceCentre,
  findServiceCentre,
  listServiceCentres,
  removeLocation,
  renameServiceCentre,
} from '../../scheduling/parties.ts'
import { readText } from '../../ui/form-field.tsx'
import { describeLocationRefusal, readLocationValues } from '../../ui/locations.tsx'
import { locatedPartyForm, locationForm, nameForm } from '../form-schema.ts'
import { NotFoundPage } from '../not-found-page.tsx'
import { ServiceCentresPage } from './index-page.tsx'
import { ServiceCentrePage } from './show-page.tsx'

export default createController(routes.serviceCentres, {
  middleware: [requireUser()],
  actions: {
    async index(context) {
      return context.render(<ServiceCentresPage csrfToken={getCsrfToken(context)} serviceCentres={await listServiceCentres(context.db)} />)
    },
    async create(context) {
      let parsed = s.parseSafe(locatedPartyForm, context.formData)
      if (!parsed.success) {
        return context.render(
          <ServiceCentresPage
            csrfToken={getCsrfToken(context)}
            serviceCentres={await listServiceCentres(context.db)}
            values={{ name: readText(context.formData, 'name'), ...readLocationValues(context.formData) }}
            issues={parsed.issues}
          />,
          { status: 400 },
        )
      }

      let { name, country, region } = parsed.value
      let serviceCentre = await createServiceCentre(context.db, { name, location: { country, region } })
      return redirect(routes.serviceCentres.show.href({ serviceCentreId: serviceCentre.id }), 303)
    },
    async show(context) {
      let serviceCentre = await findServiceCentre(context.db, context.params.serviceCentreId)
      if (!serviceCentre) return context.render(<NotFoundPage what="service centre" />, { status: 404 })

      return context.render(<ServiceCentrePage csrfToken={getCsrfToken(context)} party={serviceCentre} />)
    },
    async rename(context) {
      let serviceCentre = await findServiceCentre(context.db, context.params.serviceCentreId)
      if (!serviceCentre) return context.render(<NotFoundPage what="service centre" />, { status: 404 })

      let parsed = s.parseSafe(nameForm, context.formData)
      if (!parsed.success) {
        return context.render(
          <ServiceCentrePage
            csrfToken={getCsrfToken(context)}
            party={serviceCentre}
            name={readText(context.formData, 'name')}
            renameIssues={parsed.issues}
          />,
          { status: 400 },
        )
      }

      await renameServiceCentre(context.db, serviceCentre.id, parsed.value.name)
      return redirect(routes.serviceCentres.show.href({ serviceCentreId: serviceCentre.id }), 303)
    },
    async addLocation(context) {
      let serviceCentre = await findServiceCentre(context.db, context.params.serviceCentreId)
      if (!serviceCentre) return context.render(<NotFoundPage what="service centre" />, { status: 404 })

      let parsed = s.parseSafe(locationForm, context.formData)
      let result = parsed.success
        ? await addLocation(context.db, { role: 'service-centre', id: serviceCentre.id }, parsed.value)
        : null
      if (!result?.ok) {
        return context.render(
          <ServiceCentrePage
            csrfToken={getCsrfToken(context)}
            party={serviceCentre}
            location={readLocationValues(context.formData)}
            locationIssues={parsed.success ? undefined : parsed.issues}
            locationError={result ? describeLocationRefusal(result.reason, 'service-centre') : undefined}
          />,
          { status: 400 },
        )
      }

      return redirect(routes.serviceCentres.show.href({ serviceCentreId: serviceCentre.id }), 303)
    },
    async removeLocation(context) {
      let serviceCentre = await findServiceCentre(context.db, context.params.serviceCentreId)
      if (!serviceCentre) return context.render(<NotFoundPage what="service centre" />, { status: 404 })

      let result = await removeLocation(
        context.db,
        { role: 'service-centre', id: serviceCentre.id },
        context.params.locationId,
      )
      if (!result.ok) {
        return context.render(
          <ServiceCentrePage
            csrfToken={getCsrfToken(context)}
            party={serviceCentre}
            locationError={describeLocationRefusal(result.reason, 'service-centre')}
          />,
          { status: 400 },
        )
      }

      return redirect(routes.serviceCentres.show.href({ serviceCentreId: serviceCentre.id }), 303)
    },
  },
})
