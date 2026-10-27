import type { Handle } from 'remix/component'
import type { Issue } from 'remix/data-schema'

import { routes } from '../../routes.ts'
import { daysOfWeek } from '../../scheduling/working-weeks.ts'
import type { DayOfWeek, WorkingWeek } from '../../scheduling/working-weeks.ts'
import { AppPage, emptyClass, Section } from '../../ui/app-page.tsx'
import { formatDayOfWeek, formatLocation } from '../../ui/format.ts'
import { alertClass, buttonClass, fieldErrorClass, formClass, labelClass } from '../../ui/page-card.tsx'

export interface CountryPageProps {
  csrfToken: string
  workingWeek: WorkingWeek
  // The days submitted with a rejected form, shown in place of the saved working week.
  days?: DayOfWeek[]
  issues?: readonly Issue[]
}

export function CountryPage(handle: Handle<CountryPageProps>) {
  return () => {
    let { csrfToken, workingWeek, days = workingWeek.days, issues = [] } = handle.props
    let { country } = workingWeek
    let issue = issues.find((candidate) => candidate.path?.[0] === 'days')

    return (
      <AppPage title={formatLocation({ country })} crumbs={[{ label: 'Clients', href: routes.clients.index.href() }]}>
        <Section title="Working week">
          <p class={emptyClass}>
            The days on which business is normally done. Pay days generated for legal entities in this country only
            fall on these days. Existing draft schedules change when they are next generated.
          </p>
          {issue && (
            <p role="alert" class={alertClass}>
              Please correct the fields below.
            </p>
          )}
          <form method="post" action={routes.countries.updateWorkingWeek.href({ country })} class={formClass}>
            <input type="hidden" name="_csrf" value={csrfToken} />
            <fieldset
              class="flex flex-col gap-2"
              aria-invalid={issue ? 'true' : undefined}
              aria-describedby={issue ? 'working-week-error' : undefined}
            >
              <legend class={`${labelClass} mb-2`}>Working days</legend>
              {daysOfWeek.map((day) => (
                <label key={day} class="flex items-center gap-3">
                  <input type="checkbox" name="days" value={day} checked={days.includes(day)} />
                  {formatDayOfWeek(day)}
                </label>
              ))}
              {issue && (
                <p id="working-week-error" class={fieldErrorClass}>
                  {issue.message}
                </p>
              )}
            </fieldset>
            <button type="submit" class={buttonClass}>
              Save working week
            </button>
          </form>
        </Section>
      </AppPage>
    )
  }
}
