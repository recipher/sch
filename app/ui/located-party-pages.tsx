import type { Handle } from 'remix/component'
import type { Issue } from 'remix/data-schema'

import type { PartyLocation } from '../scheduling/parties.ts'
import { AppPage, emptyClass, Section, tableClass } from './app-page.tsx'
import { TextField } from './form-field.tsx'
import { formatLocation } from './format.ts'
import { LocationFields, Locations } from './locations.tsx'
import { alertClass, buttonClass, formClass, linkClass } from './page-card.tsx'

// Providers and service centres share their pages: a named party with one or more locations.

export interface LocatedParty {
  id: string
  name: string
  locations: PartyLocation[]
}

export interface LocatedPartiesPageProps {
  csrfToken: string
  // "Providers" or "Service centres"
  title: string
  // "provider" or "service centre"
  noun: string
  parties: LocatedParty[]
  showHref: (id: string) => string
  createHref: string
  values?: { name: string; country: string; region: string }
  issues?: readonly Issue[]
}

export function LocatedPartiesPage(handle: Handle<LocatedPartiesPageProps>) {
  return () => {
    let { csrfToken, title, noun, parties, showHref, createHref, values, issues = [] } = handle.props

    return (
      <AppPage title={title}>
        <Section title={`All ${title.toLowerCase()}`}>
          {parties.length === 0 ? (
            <p class={emptyClass}>No {title.toLowerCase()} yet.</p>
          ) : (
            <table class={tableClass}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Locations</th>
                </tr>
              </thead>
              <tbody>
                {parties.map((party) => (
                  <tr key={party.id}>
                    <td>
                      <a class={linkClass} href={showHref(party.id)}>
                        {party.name}
                      </a>
                    </td>
                    <td>{party.locations.map(formatLocation).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
        <Section title={`Add a ${noun}`}>
          {issues.length > 0 && (
            <p role="alert" class={alertClass}>
              Please correct the fields below.
            </p>
          )}
          <form method="post" action={createHref} class={formClass}>
            <input type="hidden" name="_csrf" value={csrfToken} />
            <TextField id="party-name" name="name" label="Name" value={values?.name} required issues={issues} />
            <LocationFields idPrefix="party" values={values} issues={issues} />
            <button type="submit" class={buttonClass}>
              Add {noun}
            </button>
          </form>
        </Section>
      </AppPage>
    )
  }
}

export interface LocatedPartyPageProps {
  csrfToken: string
  party: LocatedParty
  crumb: { label: string; href: string }
  renameHref: string
  addLocationHref: string
  removeLocationHref: (locationId: string) => string
  name?: string
  renameIssues?: readonly Issue[]
  location?: { country: string; region: string }
  locationIssues?: readonly Issue[]
  locationError?: string
}

export function LocatedPartyPage(handle: Handle<LocatedPartyPageProps>) {
  return () => {
    let {
      csrfToken,
      party,
      crumb,
      renameHref,
      addLocationHref,
      removeLocationHref,
      name,
      renameIssues = [],
      location,
      locationIssues,
      locationError,
    } = handle.props

    return (
      <AppPage title={party.name} crumbs={[crumb]}>
        <Section title="Locations">
          <Locations
            csrfToken={csrfToken}
            locations={party.locations}
            addHref={addLocationHref}
            removeHref={removeLocationHref}
            values={location}
            issues={locationIssues}
            error={locationError}
          />
        </Section>
        <Section title="Rename">
          {renameIssues.length > 0 && (
            <p role="alert" class={alertClass}>
              Please correct the fields below.
            </p>
          )}
          <form method="post" action={renameHref} class={formClass}>
            <input type="hidden" name="_csrf" value={csrfToken} />
            <TextField
              id="party-name"
              name="name"
              label="Name"
              value={name ?? party.name}
              required
              issues={renameIssues}
            />
            <button type="submit" class={buttonClass}>
              Rename
            </button>
          </form>
        </Section>
      </AppPage>
    )
  }
}
