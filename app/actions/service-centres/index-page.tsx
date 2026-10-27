import type { Handle } from 'remix/component'
import type { Issue } from 'remix/data-schema'

import { routes } from '../../routes.ts'
import type { ServiceCentre } from '../../scheduling/parties.ts'
import { LocatedPartiesPage } from '../../ui/located-party-pages.tsx'

export interface ServiceCentresPageProps {
  csrfToken: string
  serviceCentres: ServiceCentre[]
  values?: { name: string; country: string; region: string }
  issues?: readonly Issue[]
}

export function ServiceCentresPage(handle: Handle<ServiceCentresPageProps>) {
  return () => {
    let { csrfToken, serviceCentres, values, issues } = handle.props

    return (
      <LocatedPartiesPage
        csrfToken={csrfToken}
        title="Service centres"
        noun="service centre"
        parties={serviceCentres}
        showHref={(serviceCentreId) => routes.serviceCentres.show.href({ serviceCentreId })}
        createHref={routes.serviceCentres.create.href()}
        values={values}
        issues={issues}
      />
    )
  }
}
