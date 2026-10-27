import { completeAuth } from 'remix/auth'
import type { Database } from 'remix/data-table'
import { auth, createSessionAuthScheme, requireAuth } from 'remix/middleware/auth'
import { redirect } from 'remix/response/redirect'
import type { RequestContext } from 'remix/router'
import type { Session } from 'remix/session'

import { users } from '../data/tables.ts'
import { routes } from '../routes.ts'

export interface CurrentUser {
  id: string
  email: string
}

interface SessionAuth {
  userId: string
}

export function loadCurrentUser(db: Database) {
  return auth({
    schemes: [
      createSessionAuthScheme<CurrentUser, SessionAuth>({
        read(session) {
          return (session.get('auth') as SessionAuth | undefined) ?? null
        },
        async verify({ userId }) {
          let user = await db.find(users, userId)
          return user && { id: user.id, email: user.email }
        },
        invalidate(session) {
          session.unset('auth')
        },
      }),
    ],
  })
}

// Sends anonymous visitors to the login page, then back here once they sign in.
export function requireUser() {
  return requireAuth<CurrentUser>({
    onFailure(context) {
      let returnTo = context.url.pathname + context.url.search
      return redirect(`${routes.login.index.href()}?${new URLSearchParams({ returnTo })}`, 303)
    },
  })
}

// Rotates the session id before writing the identity, to prevent session fixation.
export function signIn(context: RequestContext<any, any>, userId: string) {
  completeAuth(context).set('auth', { userId } satisfies SessionAuth)
}

export function signOut(session: Session) {
  session.destroy()
}

// Only same-origin paths are accepted, so `returnTo` can't become an open redirect.
export function safeReturnTo(value: FormDataEntryValue | string | null | undefined): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return null
  }

  let base = 'http://localhost'
  let url = new URL(value, base)
  return url.origin === base ? url.pathname + url.search + url.hash : null
}
