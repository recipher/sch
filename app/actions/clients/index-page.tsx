import type { Handle } from 'remix/component'
import type { Issue } from 'remix/data-schema'

import { routes } from '../../routes.ts'
import type { Client } from '../../scheduling/parties.ts'
import { AppPage, emptyClass, Section } from '../../ui/app-page.tsx'
import { TextField } from '../../ui/form-field.tsx'
import { alertClass, buttonClass, formClass, linkClass } from '../../ui/page-card.tsx'

export interface ClientsPageProps {
  csrfToken: string
  clients: Client[]
  name?: string
  issues?: readonly Issue[]
}

export function ClientsPage(handle: Handle<ClientsPageProps>) {
  return () => {
    let { csrfToken, clients, name, issues = [] } = handle.props

    return (
      <AppPage title="Clients">
        <Section title="All clients">
          {clients.length === 0 ? (
            <p class={emptyClass}>No clients yet.</p>
          ) : (
            <ul class="flex flex-col gap-2">
              {clients.map((client) => (
                <li key={client.id}>
                  <a class={linkClass} href={routes.clients.show.href({ clientId: client.id })}>
                    {client.name}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Add a client">
          {issues.length > 0 && (
            <p role="alert" class={alertClass}>
              Please correct the fields below.
            </p>
          )}
          <form method="post" action={routes.clients.create.href()} class={formClass}>
            <input type="hidden" name="_csrf" value={csrfToken} />
            <TextField id="client-name" name="name" label="Name" value={name} required issues={issues} />
            <button type="submit" class={buttonClass}>
              Add client
            </button>
          </form>
        </Section>
      </AppPage>
    )
  }
}
