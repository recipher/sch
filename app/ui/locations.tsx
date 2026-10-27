import type { Handle } from 'remix/component'
import type { Issue } from 'remix/data-schema'

import type { AddLocationResult, PartyLocation, PartyRole, RemoveLocationResult } from '../scheduling/parties.ts'
import { emptyClass, tableClass } from './app-page.tsx'
import { readText, TextField } from './form-field.tsx'
import { formatLocation } from './format.ts'
import { alertClass, buttonClass, formClass, secondaryButtonClass } from './page-card.tsx'

export interface LocationsProps {
  csrfToken: string
  locations: PartyLocation[]
  addHref: string
  removeHref: (locationId: string) => string
  values?: { country: string; region: string }
  issues?: readonly Issue[]
  // Why the last add or remove was refused, such as a duplicate location.
  error?: string
}

// A party's locations, each with its own remove button, followed by a form to add another.
export function Locations(handle: Handle<LocationsProps>) {
  return () => {
    let { csrfToken, locations, addHref, removeHref, values, issues = [], error } = handle.props

    return (
      <>
        {error && (
          <p role="alert" class={alertClass}>
            {error}
          </p>
        )}
        {locations.length === 0 ? (
          <p class={emptyClass}>No locations yet.</p>
        ) : (
          <table class={tableClass}>
            <tbody>
              {locations.map((location) => (
                <tr key={location.id}>
                  <td>{formatLocation(location)}</td>
                  <td class="text-right">
                    <form method="post" action={removeHref(location.id)}>
                      <input type="hidden" name="_csrf" value={csrfToken} />
                      <button
                        type="submit"
                        class={secondaryButtonClass}
                        aria-label={`Remove ${formatLocation(location)}`}
                      >
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {issues.length > 0 && (
          <p role="alert" class={alertClass}>
            Please correct the fields below.
          </p>
        )}
        <form method="post" action={addHref} class={formClass}>
          <input type="hidden" name="_csrf" value={csrfToken} />
          <LocationFields idPrefix="location" values={values} issues={issues} />
          <button type="submit" class={buttonClass}>
            Add location
          </button>
        </form>
      </>
    )
  }
}

export interface LocationFieldsProps {
  idPrefix: string
  values?: { country: string; region: string }
  issues?: readonly Issue[]
}

export function LocationFields(handle: Handle<LocationFieldsProps>) {
  return () => {
    let { idPrefix, values, issues = [] } = handle.props

    return (
      <>
        <TextField
          id={`${idPrefix}-country`}
          name="country"
          label="Country code"
          value={values?.country}
          required
          issues={issues}
        />
        <TextField
          id={`${idPrefix}-region`}
          name="region"
          label="Region code (optional)"
          value={values?.region}
          issues={issues}
        />
      </>
    )
  }
}

export function readLocationValues(formData: FormData): { country: string; region: string } {
  return { country: readText(formData, 'country'), region: readText(formData, 'region') }
}

type LocationRefusal = Extract<AddLocationResult | RemoveLocationResult, { ok: false }>['reason']

const partyNouns: Record<PartyRole, string> = {
  client: 'client',
  provider: 'provider',
  'service-centre': 'service centre',
}

// Why adding or removing a location of a party was refused.
export function describeLocationRefusal(reason: LocationRefusal, role: PartyRole): string {
  switch (reason) {
    case 'duplicate':
      return `This ${partyNouns[role]} already has that location.`
    case 'last-location':
      return `A ${partyNouns[role]} must keep at least one location.`
  }
}
