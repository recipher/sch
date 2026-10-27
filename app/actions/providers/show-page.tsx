import type { Handle } from 'remix/component'

import { routes } from '../../routes.ts'
import { LocatedPartyPage, type LocatedPartyPageProps } from '../../ui/located-party-pages.tsx'

export type ProviderPageProps = Omit<
  LocatedPartyPageProps,
  'crumb' | 'renameHref' | 'addLocationHref' | 'removeLocationHref'
>

export function ProviderPage(handle: Handle<ProviderPageProps>) {
  return () => {
    let providerId = handle.props.party.id

    return (
      <LocatedPartyPage
        {...handle.props}
        crumb={{ label: 'Providers', href: routes.providers.index.href() }}
        renameHref={routes.providers.rename.href({ providerId })}
        addLocationHref={routes.providers.addLocation.href({ providerId })}
        removeLocationHref={(locationId) => routes.providers.removeLocation.href({ providerId, locationId })}
      />
    )
  }
}
