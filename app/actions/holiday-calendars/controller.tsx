import * as s from 'remix/data-schema'
import type { Database } from 'remix/data-table'
import { getCsrfToken } from 'remix/middleware/csrf'
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { requireUser } from '../../middleware/auth.ts'
import { routes } from '../../routes.ts'
import { currentYear } from '../../scheduling/calendar-date.ts'
import {
  addPublicHoliday,
  listHolidayCalendar,
  removePublicHoliday,
  resyncHolidayCalendar,
} from '../../scheduling/holiday-calendars.ts'
import type { Location } from '../../scheduling/parties.ts'
import { readText } from '../../ui/form-field.tsx'
import { NotFoundPage } from '../not-found-page.tsx'
import { holidayCalendarHref } from './href.ts'
import { addPublicHolidayForm, calendarScope, removePublicHolidayForm } from './schema.ts'
import { HolidayCalendarPage } from './show-page.tsx'
import type { HolidayCalendarPageProps } from './show-page.tsx'

const notFound = <NotFoundPage what="holiday calendar" />

export default createController(routes.holidayCalendars, {
  middleware: [requireUser()],
  actions: {
    async show(context) {
      let country = parseCountry(context.params.country)
      let scope = s.parseSafe(calendarScope, withDefaultYear(context.url.searchParams))
      if (!country || !scope.success) return context.render(notFound, { status: 404 })

      let { year, region } = scope.value
      let props = await loadPage(context.db, { country, region }, year)
      return context.render(<HolidayCalendarPage csrfToken={getCsrfToken(context)} {...props} />)
    },
    async addPublicHoliday(context) {
      let country = parseCountry(context.params.country)
      let scope = s.parseSafe(calendarScope, context.formData)
      if (!country) return context.render(notFound, { status: 404 })
      if (!scope.success) return new Response('Bad Request', { status: 400 })

      let location = { country, region: scope.value.region }
      let parsed = s.parseSafe(addPublicHolidayForm, context.formData)
      if (!parsed.success) {
        let props = await loadPage(context.db, location, scope.value.year)
        return context.render(
          <HolidayCalendarPage
            csrfToken={getCsrfToken(context)}
            {...props}
            values={{ date: readText(context.formData, 'date'), name: readText(context.formData, 'name') }}
            issues={parsed.issues}
          />,
          { status: 400 },
        )
      }

      let { date, name } = parsed.value
      await addPublicHoliday(context.db, location, { date, name })
      return redirect(holidayCalendarHref(location, scope.value.year), 303)
    },
    async removePublicHoliday(context) {
      let country = parseCountry(context.params.country)
      let parsed = s.parseSafe(removePublicHolidayForm, context.formData)
      if (!country) return context.render(notFound, { status: 404 })
      if (!parsed.success) return new Response('Bad Request', { status: 400 })

      let { year, region, date } = parsed.value
      await removePublicHoliday(context.db, { country, region }, date)
      return redirect(holidayCalendarHref({ country, region }, year), 303)
    },
    async resync(context) {
      let country = parseCountry(context.params.country)
      let parsed = s.parseSafe(calendarScope, context.formData)
      if (!country) return context.render(notFound, { status: 404 })
      if (!parsed.success) return new Response('Bad Request', { status: 400 })

      let { year, region } = parsed.value
      let gap = await resyncHolidayCalendar(context.db, context.holidaySource, country, year)
      if (gap) {
        let props = await loadPage(context.db, { country, region }, year)
        return context.render(
          <HolidayCalendarPage csrfToken={getCsrfToken(context)} {...props} importProblem={gap.reason} />,
          { status: 422 },
        )
      }

      return redirect(holidayCalendarHref({ country, region }, year), 303)
    },
  },
})

async function loadPage(
  db: Database,
  location: Location,
  year: number,
): Promise<Omit<HolidayCalendarPageProps, 'csrfToken'>> {
  let calendar = await listHolidayCalendar(db, location, year)
  return { location, year, ...calendar }
}

function parseCountry(value: string): string | null {
  let country = value.toUpperCase()
  return /^[A-Z]{2}$/.test(country) ? country : null
}

// The current year unless the URL names one.
function withDefaultYear(searchParams: URLSearchParams): URLSearchParams {
  if (searchParams.get('year')) return searchParams
  let withYear = new URLSearchParams(searchParams)
  withYear.set('year', String(currentYear()))
  return withYear
}
