import { createContextKey } from 'remix/router'
import type { Middleware } from 'remix/router'

import type { HolidaySource } from '../scheduling/holiday-source.ts'

export const holidaySourceContext = createContextKey<HolidaySource>()

export function loadHolidaySource(holidaySource: HolidaySource): Middleware<{
  key: typeof holidaySourceContext
  value: HolidaySource
  property: 'holidaySource'
}> {
  return (context, next) => {
    context.set(holidaySourceContext, holidaySource, { property: 'holidaySource' })
    return next()
  }
}
