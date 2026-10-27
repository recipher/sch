import type { Handle } from 'remix/component'
import type { Issue } from 'remix/data-schema'

import { routes } from '../../routes.ts'
import type { Client, LegalEntity, PartyLocation } from '../../scheduling/parties.ts'
import { AppPage, emptyClass, Section, tableClass } from '../../ui/app-page.tsx'
import { TextField } from '../../ui/form-field.tsx'
import { formatLocation } from '../../ui/format.ts'
import { Locations } from '../../ui/locations.tsx'
import { alertClass, buttonClass, formClass, linkClass } from '../../ui/page-card.tsx'

export interface ClientPageProps {
  csrfToken: string
  client: Client & { locations: PartyLocation[]; legalEntities: LegalEntity[] }
  values?: { name: string; country: string; region: string }
  issues?: readonly Issue[]
  location?: { country: string; region: string }
  locationIssues?: readonly Issue[]
  locationError?: string
}

export function ClientPage(handle: Handle<ClientPageProps>) {
  return () => {
    let { csrfToken, client, values, issues = [], location, locationIssues, locationError } = handle.props

    return (
      <AppPage title={client.name} crumbs={[{ label: 'Clients', href: routes.clients.index.href() }]}>
        <Section title="Locations">
          <Locations
            csrfToken={csrfToken}
            locations={client.locations}
            addHref={routes.clients.addLocation.href({ clientId: client.id })}
            removeHref={(locationId) => routes.clients.removeLocation.href({ clientId: client.id, locationId })}
            values={location}
            issues={locationIssues}
            error={locationError}
          />
        </Section>
        <Section title="Legal entities">
          {client.legalEntities.length === 0 ? (
            <p class={emptyClass}>No legal entities yet.</p>
          ) : (
            <table class={tableClass}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {client.legalEntities.map((legalEntity) => (
                  <tr key={legalEntity.id}>
                    <td>
                      <a class={linkClass} href={routes.legalEntities.show.href({ legalEntityId: legalEntity.id })}>
                        {legalEntity.name}
                      </a>
                    </td>
                    <td>{formatLocation(legalEntity.location)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
        <Section title="Add a legal entity">
          {issues.length > 0 && (
            <p role="alert" class={alertClass}>
              Please correct the fields below.
            </p>
          )}
          <form method="post" action={routes.clients.createLegalEntity.href({ clientId: client.id })} class={formClass}>
            <input type="hidden" name="_csrf" value={csrfToken} />
            <TextField id="legal-entity-name" name="name" label="Name" value={values?.name} required issues={issues} />
            <TextField
              id="legal-entity-country"
              name="country"
              label="Country code"
              value={values?.country}
              required
              issues={issues}
            />
            <TextField
              id="legal-entity-region"
              name="region"
              label="Region code (optional)"
              value={values?.region}
              issues={issues}
            />
            <button type="submit" class={buttonClass}>
              Add legal entity
            </button>
          </form>
        </Section>
      </AppPage>
    )
  }
}
