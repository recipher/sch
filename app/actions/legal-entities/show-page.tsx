import type { Handle } from 'remix/component'
import type { Issue } from 'remix/data-schema'

import { routes } from '../../routes.ts'
import { currentYear } from '../../scheduling/calendar-date.ts'
import type { Client, LegalEntity, Provider, ServiceCentre } from '../../scheduling/parties.ts'
import type { Payroll } from '../../scheduling/payrolls.ts'
import { AppPage, emptyClass, Section, tableClass } from '../../ui/app-page.tsx'
import { SelectField, TextField } from '../../ui/form-field.tsx'
import { formatLocation, formatPayDayRule, formatPayFrequency } from '../../ui/format.ts'
import { alertClass, buttonClass, fieldClass, formClass, inputClass, labelClass, linkClass } from '../../ui/page-card.tsx'
import { holidayCalendarHref } from '../holiday-calendars/href.ts'

export interface LegalEntityPageProps {
  csrfToken: string
  client: Client
  legalEntity: LegalEntity
  payrolls: Payroll[]
  providers: Provider[]
  serviceCentres: ServiceCentre[]
  name?: string
  defaultsError?: string
  issues?: readonly Issue[]
}

export function LegalEntityPage(handle: Handle<LegalEntityPageProps>) {
  return () => {
    let { csrfToken, client, legalEntity, payrolls, providers, serviceCentres, name, defaultsError, issues = [] } =
      handle.props

    return (
      <AppPage
        title={legalEntity.name}
        crumbs={[
          { label: 'Clients', href: routes.clients.index.href() },
          { label: client.name, href: routes.clients.show.href({ clientId: client.id }) },
        ]}
      >
        <p>
          Location: {formatLocation(legalEntity.location)} ·{' '}
          <a class={linkClass} href={holidayCalendarHref(legalEntity.location, currentYear())}>
            Holiday calendar
          </a>
        </p>
        <Section title="Default provider and service centre">
          <p class={emptyClass}>Payrolls use these unless they choose their own.</p>
          {defaultsError && (
            <p role="alert" class={alertClass}>
              {defaultsError}
            </p>
          )}
          <form
            method="post"
            action={routes.legalEntities.assignDefaults.href({ legalEntityId: legalEntity.id })}
            class={formClass}
          >
            <input type="hidden" name="_csrf" value={csrfToken} />
            <SelectField
              id="default-provider"
              name="providerId"
              label="Default provider"
              options={[{ value: '', label: 'None' }, ...providers.map(toOption)]}
              value={legalEntity.defaultProviderId ?? ''}
            />
            <SelectField
              id="default-service-centre"
              name="serviceCentreId"
              label="Default service centre"
              options={[{ value: '', label: 'None' }, ...serviceCentres.map(toOption)]}
              value={legalEntity.defaultServiceCentreId ?? ''}
            />
            <button type="submit" class={buttonClass}>
              Save defaults
            </button>
          </form>
        </Section>
        <Section title="Payrolls">
          {payrolls.length === 0 ? (
            <p class={emptyClass}>No payrolls yet.</p>
          ) : (
            <table class={tableClass}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Pay frequency</th>
                  <th>Pay day rule</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map((payroll) => (
                  <tr key={payroll.id}>
                    <td>
                      <a class={linkClass} href={routes.payrolls.show.href({ payrollId: payroll.id })}>
                        {payroll.name}
                      </a>
                    </td>
                    <td>{formatPayFrequency(payroll.payFrequency)}</td>
                    <td>{formatPayDayRule(payroll.payDayRule)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
        <Section title="Add a payroll">
          {issues.length > 0 && (
            <p role="alert" class={alertClass}>
              Please correct the fields below.
            </p>
          )}
          <form
            method="post"
            action={routes.legalEntities.createPayroll.href({ legalEntityId: legalEntity.id })}
            class={formClass}
          >
            <input type="hidden" name="_csrf" value={csrfToken} />
            <TextField id="payroll-name" name="name" label="Name" value={name} required issues={issues} />
            <div class={fieldClass}>
              <label htmlFor="payroll-pay-frequency" class={labelClass}>
                Pay frequency
              </label>
              <select id="payroll-pay-frequency" name="payFrequency" class={inputClass}>
                <option value="monthly">{formatPayFrequency('monthly')}</option>
              </select>
            </div>
            <div class={fieldClass}>
              <label htmlFor="payroll-pay-day-rule" class={labelClass}>
                Pay day rule
              </label>
              <select id="payroll-pay-day-rule" name="payDayRule" class={inputClass}>
                <option value="last-working-day">{formatPayDayRule({ kind: 'last-working-day' })}</option>
              </select>
            </div>
            <button type="submit" class={buttonClass}>
              Add payroll
            </button>
          </form>
        </Section>
      </AppPage>
    )
  }
}

function toOption(party: { id: string; name: string }) {
  return { value: party.id, label: party.name }
}
