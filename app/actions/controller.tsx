import { Auth } from 'remix/middleware/auth'
import type { GoodAuth } from 'remix/middleware/auth'
import { getCsrfToken } from 'remix/middleware/csrf'
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { assets } from '../assets.ts'
import { requireUser, signOut } from '../middleware/auth.ts'
import type { CurrentUser } from '../middleware/auth.ts'
import { routes } from '../routes.ts'
import { stylesheet } from '../styles.ts'
import { AccountPage } from './account-page.tsx'
import { HomePage } from './home-page.tsx'

export default createController(routes, {
  actions: {
    async assets(context) {
      return (await assets.fetch(context.request)) ?? new Response('Not Found', { status: 404 })
    },
    async styles() {
      return new Response(await stylesheet.css(), {
        headers: {
          'Content-Type': 'text/css; charset=utf-8',
          'Cache-Control': stylesheet.cacheControl,
        },
      })
    },
    home(context) {
      return context.render(<HomePage user={context.auth.ok ? context.auth.identity : null} />)
    },
    account: {
      middleware: [requireUser()],
      handler(context) {
        // requireUser() has already rejected anonymous requests.
        let { identity } = context.get(Auth) as GoodAuth<CurrentUser>

        return context.render(<AccountPage csrfToken={getCsrfToken(context)} user={identity} />)
      },
    },
    logout(context) {
      signOut(context.session)
      return redirect(routes.login.index.href(), 303)
    },
  },
})
