import type { Handle } from 'remix/component'

import type { CurrentUser } from '../middleware/auth.ts'
import { routes } from '../routes.ts'
import { linkClass, PageCard, secondaryButtonClass } from '../ui/page-card.tsx'
import { Document } from './document.tsx'

export interface AccountPageProps {
  csrfToken: string
  user: CurrentUser
}

export function AccountPage(handle: Handle<AccountPageProps>) {
  return () => {
    let { csrfToken, user } = handle.props

    return (
      <Document title="Your account">
        <PageCard
          title="Your account"
          footer={
            <a class={linkClass} href={routes.home.href()}>
              Back to home
            </a>
          }
        >
          <div class="flex flex-col gap-1 rounded-xl bg-surface-4 px-4 py-3">
            <span class="text-xs font-bold tracking-wider text-fg-muted uppercase">Signed in as</span>
            <span class="break-all">{user.email}</span>
          </div>
          <form method="post" action={routes.logout.href()}>
            <input type="hidden" name="_csrf" value={csrfToken} />
            <button type="submit" class={secondaryButtonClass}>
              Log out
            </button>
          </form>
        </PageCard>
      </Document>
    )
  }
}
