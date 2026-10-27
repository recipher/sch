import type { Handle } from 'remix/component'
import type { Issue } from 'remix/data-schema'

import { routes } from '../../routes.ts'
import type { HolidayCalendarEntry } from '../../scheduling/holiday-calendars.ts'
import type { Location } from '../../scheduling/parties.ts'
import { AppPage, emptyClass, Section, tableClass } from '../../ui/app-page.tsx'
import { TextField } from '../../ui/form-field.tsx'
import { formatDate, formatLocation } from '../../ui/format.ts'
import { alertClass, buttonClass, formClass, inputClass, linkClass, secondaryButtonClass } from '../../ui/page-card.tsx'
import { holidayCalendarHref } from './href.ts'

export interface HolidayCalendarPageProps {
  csrfToken: string
  location: Location
  year: number
  imported: boolean
  entries: HolidayCalendarEntry[]
  // Shown when importing failed.
  importProblem?: string
  values?: { date: string; name: string }
  issues?: readonly Issue[]
}

const STATUS_LABELS: Record<HolidayCalendarEntry['status'], string> = {
  imported: 'Imported',
  added: 'Added locally',
  removed: 'Removed',
}

export function HolidayCalendarPage(handle: Handle<HolidayCalendarPageProps>) {
  return () => {
    let { csrfToken, location, year, imported, entries, importProblem, values, issues = [] } = handle.props
    let { country } = location
    let scopeFields = (
      <>
        <input type="hidden" name="_csrf" value={csrfToken} />
        <input type="hidden" name="year" value={String(year)} />
        <input type="hidden" name="region" value={location.region ?? ''} />
      </>
    )

    return (
      <AppPage title={`Holiday calendar: ${formatLocation(location)} ${year}`}>
        <nav aria-label="Year" class="flex gap-4">
          <a class={linkClass} href={holidayCalendarHref(location, year - 1)}>
            ← {year - 1}
          </a>
          <a class={linkClass} href={holidayCalendarHref(location, year + 1)}>
            {year + 1} →
          </a>
          {location.region && (
            <a class={linkClass} href={holidayCalendarHref({ country }, year)}>
              Whole country
            </a>
          )}
        </nav>
        {!location.region && (
          <form method="get" action={routes.holidayCalendars.show.href({ country })} class="flex items-end gap-2">
            <input type="hidden" name="year" value={String(year)} />
            <label class="flex flex-col gap-2">
              <span class="text-xs font-bold tracking-wider uppercase">Region code</span>
              <input name="region" required class={inputClass} placeholder="For example SCT" />
            </label>
            <button type="submit" class={secondaryButtonClass + ' w-auto'}>
              View region
            </button>
          </form>
        )}
        {importProblem && (
          <p role="alert" class={alertClass}>
            Couldn't import the holiday calendar: {importProblem}
          </p>
        )}
        <Section title="Public holidays">
          {!imported && <p class={emptyClass}>Public holidays for {year} have not been imported yet.</p>}
          {entries.length === 0 ? (
            imported && <p class={emptyClass}>No public holidays.</p>
          ) : (
            <table class={tableClass}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>
                    <span class="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.date} class={entry.status === 'removed' ? 'text-fg-muted line-through' : undefined}>
                    <td>{formatDate(entry.date)}</td>
                    <td>{entry.name}</td>
                    <td>{STATUS_LABELS[entry.status]}</td>
                    <td>
                      {entry.status !== 'removed' && (
                        <form method="post" action={routes.holidayCalendars.removePublicHoliday.href({ country })}>
                          {scopeFields}
                          <input type="hidden" name="date" value={entry.date} />
                          <button type="submit" class={linkClass}>
                            Remove
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <form method="post" action={routes.holidayCalendars.resync.href({ country })}>
            {scopeFields}
            <button type="submit" class={secondaryButtonClass}>
              {imported ? 'Re-sync from Holiday API' : 'Import from Holiday API'}
            </button>
          </form>
          <p class={emptyClass}>Re-syncing replaces imported public holidays for the whole country. Local additions and removals are kept.</p>
        </Section>
        <Section title={location.region ? `Add a public holiday for ${location.region}` : 'Add a public holiday for the whole country'}>
          {issues.length > 0 && (
            <p role="alert" class={alertClass}>
              Please correct the fields below.
            </p>
          )}
          <form method="post" action={routes.holidayCalendars.addPublicHoliday.href({ country })} class={formClass}>
            {scopeFields}
            <TextField id="public-holiday-date" name="date" label="Date" type="date" value={values?.date} required issues={issues} />
            <TextField id="public-holiday-name" name="name" label="Name" value={values?.name} required issues={issues} />
            <button type="submit" class={buttonClass}>
              Add public holiday
            </button>
          </form>
        </Section>
      </AppPage>
    )
  }
}
