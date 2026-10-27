import type { Cookie } from 'remix/cookie'
import type { Database } from 'remix/data-table'
import { createRouter, type RouterContext } from 'remix/router'
import { compression } from 'remix/middleware/compression'
import { csrf } from 'remix/middleware/csrf'
import { formData } from 'remix/middleware/form-data'
import { render } from 'remix/middleware/render'
import { session } from 'remix/middleware/session'
import { staticFiles } from 'remix/middleware/static'
import type { SessionStorage } from 'remix/session'

import controller from './actions/controller.tsx'
import loginController from './actions/login/controller.tsx'
import signupController from './actions/signup/controller.tsx'
import { assets } from './assets.ts'
import { loadCurrentUser } from './middleware/auth.ts'
import { loadDatabase } from './middleware/database.ts'
import { routes } from './routes.ts'

export interface AppRouterOptions {
  db: Database
  sessionCookie: Cookie
  sessionStorage: SessionStorage
}

export function createAppRouter(options: AppRouterOptions) {
  let router = createRouter({
    middleware: [
      compression(),
      staticFiles('./public', { index: false }),
      session(options.sessionCookie, options.sessionStorage),
      loadDatabase(options.db),
      formData(),
      csrf(),
      loadCurrentUser(options.db),
      render({ assets }),
    ],
  })

  router.map(routes, controller)
  router.map(routes.signup, signupController)
  router.map(routes.login, loginController)

  return router
}

export type AppContext = RouterContext<ReturnType<typeof createAppRouter>>

declare module 'remix' {
  interface RouterTypes {
    context: AppContext
  }
}
