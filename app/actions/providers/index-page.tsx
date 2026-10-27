import type { Handle } from 'remix/component'
import type { Issue } from 'remix/data-schema'

import { routes } from '../../routes.ts'
import type { Provider } from '../../scheduling/parties.ts'
import { LocatedPartiesPage } from '../../ui/located-party-pages.tsx'

export interface ProvidersPageProps {
  csrfToken: string
  providers: Provider[]
  values?: { name: string; country: string; region: string }
  issues?: readonly Issue[]
}

export function ProvidersPage(handle: Handle<ProvidersPageProps>) {
  return () => {
    let { csrfToken, providers, values, issues } = handle.props

    return (
      <LocatedPartiesPage
        csrfToken={csrfToken}
        title="Providers"
        noun="provider"
        parties={providers}
        showHref={(providerId) => routes.providers.show.href({ providerId })}
        createHref={routes.providers.create.href()}
        values={values}
        issues={issues}
      />
    )
  }
}
