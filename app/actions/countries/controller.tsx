import * as s from 'remix/data-schema'
import { getCsrfToken } from 'remix/middleware/csrf'
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { requireUser } from '../../middleware/auth.ts'
import { routes } from '../../routes.ts'
import { daysOfWeek, findWorkingWeek, setWorkingWeek } from '../../scheduling/working-weeks.ts'
import type { DayOfWeek } from '../../scheduling/working-weeks.ts'
import { isCountryCode } from '../form-schema.ts'
import { NotFoundPage } from '../not-found-page.tsx'
import { workingWeekForm } from './schema.ts'
import { CountryPage } from './show-page.tsx'

export default createController(routes.countries, {
  middleware: [requireUser()],
  actions: {
    async show(context) {
      let { country } = context.params
      if (!isCountryCode(country)) return context.render(<NotFoundPage what="country" />, { status: 404 })

      let workingWeek = await findWorkingWeek(context.db, country)
      return context.render(<CountryPage csrfToken={getCsrfToken(context)} workingWeek={workingWeek} />)
    },
    async updateWorkingWeek(context) {
      let { country } = context.params
      if (!isCountryCode(country)) return context.render(<NotFoundPage what="country" />, { status: 404 })

      let parsed = s.parseSafe(workingWeekForm, context.formData)
      if (!parsed.success) {
        let workingWeek = await findWorkingWeek(context.db, country)
        let submitted = context.formData.getAll('days')
        return context.render(
          <CountryPage
            csrfToken={getCsrfToken(context)}
            workingWeek={workingWeek}
            days={daysOfWeek.filter((day): day is DayOfWeek => submitted.includes(day))}
            issues={parsed.issues}
          />,
          { status: 400 },
        )
      }

      await setWorkingWeek(context.db, country, parsed.value.days)
      return redirect(routes.countries.show.href({ country }), 303)
    },
  },
})
