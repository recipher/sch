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

import clientsController from './actions/clients/controller.tsx'
import controller from './actions/controller.tsx'
import holidayCalendarsController from './actions/holiday-calendars/controller.tsx'
import legalEntitiesController from './actions/legal-entities/controller.tsx'
import loginController from './actions/login/controller.tsx'
import payrollsController from './actions/payrolls/controller.tsx'
import providersController from './actions/providers/controller.tsx'
import serviceCentresController from './actions/service-centres/controller.tsx'
import signupController from './actions/signup/controller.tsx'
import { assets } from './assets.ts'
import { loadCurrentUser } from './middleware/auth.ts'
import { loadDatabase } from './middleware/database.ts'
import { loadHolidaySource } from './middleware/holiday-source.ts'
import { routes } from './routes.ts'
import type { HolidaySource } from './scheduling/holiday-source.ts'

export interface AppRouterOptions {
  db: Database
  holidaySource: HolidaySource
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
      loadHolidaySource(options.holidaySource),
      formData(),
      csrf(),
      loadCurrentUser(options.db),
      render({ assets }),
    ],
  })

  router.map(routes, controller)
  router.map(routes.signup, signupController)
  router.map(routes.login, loginController)
  router.map(routes.clients, clientsController)
  router.map(routes.legalEntities, legalEntitiesController)
  router.map(routes.holidayCalendars, holidayCalendarsController)
  router.map(routes.payrolls, payrollsController)
  router.map(routes.providers, providersController)
  router.map(routes.serviceCentres, serviceCentresController)

  return router
}

export type AppContext = RouterContext<ReturnType<typeof createAppRouter>>

declare module 'remix' {
  interface RouterTypes {
    context: AppContext
  }
}
