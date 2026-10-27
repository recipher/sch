import type { Handle } from 'remix/component'
import type { Issue } from 'remix/data-schema'

import { routes } from '../../routes.ts'
import type { MissingHolidayCalendar } from '../../scheduling/holiday-calendars.ts'
import type { Client, LegalEntity } from '../../scheduling/parties.ts'
import type { Payroll } from '../../scheduling/payrolls.ts'
import type { PayRun } from '../../scheduling/schedules.ts'
import { AppPage, emptyClass, Section, tableClass } from '../../ui/app-page.tsx'
import { TextField } from '../../ui/form-field.tsx'
import { formatDate, formatLocation, formatPayDayRule, formatPayFrequency, formatScheduleStatus } from '../../ui/format.ts'
import { alertClass, buttonClass, formClass, linkClass } from '../../ui/page-card.tsx'
import { holidayCalendarHref } from '../holiday-calendars/href.ts'

export interface PayrollPageProps {
  csrfToken: string
  client: Client
  legalEntity: LegalEntity
  payroll: Payroll
  payRuns: PayRun[]
  range?: { start: string; end: string }
  issues?: readonly Issue[]
  missingHolidayCalendars?: MissingHolidayCalendar[]
}

export function PayrollPage(handle: Handle<PayrollPageProps>) {
  return () => {
    let { csrfToken, client, legalEntity, payroll, payRuns, range, issues = [], missingHolidayCalendars = [] } = handle.props

    return (
      <AppPage
        title={payroll.name}
        crumbs={[
          { label: 'Clients', href: routes.clients.index.href() },
          { label: client.name, href: routes.clients.show.href({ clientId: client.id }) },
          { label: legalEntity.name, href: routes.legalEntities.show.href({ legalEntityId: legalEntity.id }) },
        ]}
      >
        <p>
          {formatPayFrequency(payroll.payFrequency)} · {formatPayDayRule(payroll.payDayRule)}
        </p>
        <Section title="Pay runs">
          {payRuns.length === 0 ? (
            <p class={emptyClass}>No schedules generated yet.</p>
          ) : (
            <table class={tableClass}>
              <thead>
                <tr>
                  <th>Pay period</th>
                  <th>Pay day</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payRuns.map((payRun) => (
                  <tr key={payRun.id}>
                    <td>{payRun.payPeriod.label}</td>
                    <td>{payRun.schedule ? formatDate(payRun.schedule.payDay) : '—'}</td>
                    <td>{payRun.schedule ? formatScheduleStatus(payRun.schedule.status) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
        <Section title="Generate schedules">
          <p class={emptyClass}>
            Creates a draft schedule for every pay period that starts within the generation range. Existing draft
            schedules in the range are replaced.
          </p>
          {issues.length > 0 && (
            <p role="alert" class={alertClass}>
              Please correct the fields below.
            </p>
          )}
          {missingHolidayCalendars.length > 0 && (
            <div role="alert" class={alertClass}>
              <p>No schedules were generated because these holiday calendars could not be imported:</p>
              <ul class="mt-2 list-disc pl-5">
                {missingHolidayCalendars.map((missing) => (
                  <li key={`${missing.country} ${missing.year}`}>
                    <a class={linkClass} href={holidayCalendarHref({ country: missing.country }, missing.year)}>
                      {formatLocation({ country: missing.country })} {missing.year}
                    </a>{' '}
                    ({missing.reason})
                  </li>
                ))}
              </ul>
            </div>
          )}
          <form method="post" action={routes.payrolls.generate.href({ payrollId: payroll.id })} class={formClass}>
            <input type="hidden" name="_csrf" value={csrfToken} />
            <TextField id="generation-start" name="start" label="Start date" type="date" value={range?.start} required issues={issues} />
            <TextField id="generation-end" name="end" label="End date" type="date" value={range?.end} required issues={issues} />
            <button type="submit" class={buttonClass}>
              Generate draft schedules
            </button>
          </form>
        </Section>
      </AppPage>
    )
  }
}
