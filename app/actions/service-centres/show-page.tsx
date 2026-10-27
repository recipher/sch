import type { Handle } from 'remix/component'

import { routes } from '../../routes.ts'
import { LocatedPartyPage, type LocatedPartyPageProps } from '../../ui/located-party-pages.tsx'

export type ServiceCentrePageProps = Omit<
  LocatedPartyPageProps,
  'crumb' | 'renameHref' | 'addLocationHref' | 'removeLocationHref'
>

export function ServiceCentrePage(handle: Handle<ServiceCentrePageProps>) {
  return () => {
    let serviceCentreId = handle.props.party.id

    return (
      <LocatedPartyPage
        {...handle.props}
        crumb={{ label: 'Service centres', href: routes.serviceCentres.index.href() }}
        renameHref={routes.serviceCentres.rename.href({ serviceCentreId })}
        addLocationHref={routes.serviceCentres.addLocation.href({ serviceCentreId })}
        removeLocationHref={(locationId) => routes.serviceCentres.removeLocation.href({ serviceCentreId, locationId })}
      />
    )
  }
}
