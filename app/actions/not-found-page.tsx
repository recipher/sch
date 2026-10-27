import type { Handle } from 'remix/component'

import { routes } from '../routes.ts'
import { AppPage } from '../ui/app-page.tsx'
import { linkClass } from '../ui/page-card.tsx'

export function NotFoundPage(handle: Handle<{ what: string }>) {
  return () => (
    <AppPage title="Not found">
      <p>
        We couldn't find that {handle.props.what}.{' '}
        <a class={linkClass} href={routes.clients.index.href()}>
          Back to clients
        </a>
      </p>
    </AppPage>
  )
}
