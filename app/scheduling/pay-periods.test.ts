import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import type { CalendarDate } from './calendar-date.ts'
import { choosePayDay, payPeriod } from './pay-periods.ts'
import type { PayDayRule } from './pay-periods.ts'
import { isWorkingWeekDay } from './working-days.ts'

// Monday to Friday, less the given public holidays.
function workingDaysExcept(...publicHolidays: CalendarDate[]) {
  return (date: CalendarDate) => isWorkingWeekDay(date) && !publicHolidays.includes(date)
}

function payDayFor(month: string, rule: PayDayRule, publicHolidays: CalendarDate[] = []) {
  let start = `${month}-01`
  let end = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10)
  return choosePayDay(rule, payPeriod('monthly', start, end), workingDaysExcept(...publicHolidays))
}

describe('choosing a monthly pay day', () => {
  describe('last working day of the pay period, less N working days', () => {
    it('is the last working day when N is 0', () => {
      // 31 Jan 2027 is a Sunday.
      assert.equal(payDayFor('2027-01', { kind: 'last-working-day', offset: 0 }), '2027-01-29')
    })

    it('counts N working days back, skipping weekends and public holidays', () => {
      // Last working day Wed 31 Mar 2027; Tue 30 Mar is a public holiday.
      assert.equal(payDayFor('2027-03', { kind: 'last-working-day', offset: 2 }, ['2027-03-30']), '2027-03-26')
    })

    it('counts back out of the pay period when N is large', () => {
      // February 2027 has 20 working days, from Mon 1 to Fri 26 Feb.
      assert.equal(payDayFor('2027-02', { kind: 'last-working-day', offset: 20 }), '2027-01-29')
    })
  })

  describe('last given weekday of the pay period', () => {
    it('is the last such weekday in the month', () => {
      // Fridays in April 2027: 2, 9, 16, 23, 30.
      assert.equal(payDayFor('2027-04', { kind: 'last-weekday', weekday: 5, roll: 'earlier' }), '2027-04-30')
    })

    it('finds the last weekday even when the month ends just before it', () => {
      // 31 Jan 2027 is a Sunday, so the last Monday is the 25th.
      assert.equal(payDayFor('2027-01', { kind: 'last-weekday', weekday: 1, roll: 'earlier' }), '2027-01-25')
    })

    it('rolls earlier to a working day when that weekday is a public holiday', () => {
      assert.equal(
        payDayFor('2027-04', { kind: 'last-weekday', weekday: 5, roll: 'earlier' }, ['2027-04-30']),
        '2027-04-29',
      )
    })

    it('rolls later when configured, even out of the pay period', () => {
      // Fri 30 Apr is a holiday; the next working day is Mon 3 May.
      assert.equal(
        payDayFor('2027-04', { kind: 'last-weekday', weekday: 5, roll: 'later' }, ['2027-04-30']),
        '2027-05-03',
      )
    })

    it('rolls when the chosen weekday is outside the working week', () => {
      // Last Saturday of July 2027 is the 31st.
      assert.equal(payDayFor('2027-07', { kind: 'last-weekday', weekday: 6, roll: 'earlier' }), '2027-07-30')
      assert.equal(payDayFor('2027-07', { kind: 'last-weekday', weekday: 6, roll: 'later' }), '2027-08-02')
    })
  })
  describe('fixed date of the pay period', () => {
    it('is that date when it is a working day', () => {
      // Thu 25 Mar 2027.
      assert.equal(payDayFor('2027-03', { kind: 'fixed-date', day: 25, roll: 'earlier' }), '2027-03-25')
    })

    it('rolls earlier by default and later when configured', () => {
      // Sat 25 Sep 2027.
      assert.equal(payDayFor('2027-09', { kind: 'fixed-date', day: 25, roll: 'earlier' }), '2027-09-24')
      assert.equal(payDayFor('2027-09', { kind: 'fixed-date', day: 25, roll: 'later' }), '2027-09-27')
    })

    it('is the last day of a month that is too short for it', () => {
      // Fri 26 Feb 2027 is the last working day; 28 Feb is a Sunday.
      assert.equal(payDayFor('2027-02', { kind: 'fixed-date', day: 31, roll: 'earlier' }), '2027-02-26')
      // Tue 29 Feb 2028, a leap year.
      assert.equal(payDayFor('2028-02', { kind: 'fixed-date', day: 30, roll: 'earlier' }), '2028-02-29')
      // 30 Apr 2027 is a Friday holiday; rolling later leaves the pay period.
      assert.equal(payDayFor('2027-04', { kind: 'fixed-date', day: 31, roll: 'later' }, ['2027-04-30']), '2027-05-03')
    })

    it('rolls earlier out of the pay period from the 1st', () => {
      // Sun 1 Aug 2027.
      assert.equal(payDayFor('2027-08', { kind: 'fixed-date', day: 1, roll: 'earlier' }), '2027-07-30')
    })
  })
  describe('first working day of the following pay period, plus N working days', () => {
    it('is the first working day of the next month when N is 0', () => {
      // March is paid on Thu 1 Apr 2027.
      assert.equal(payDayFor('2027-03', { kind: 'next-period-first-working-day', offset: 0 }), '2027-04-01')
    })

    it('counts N working days forward, skipping weekends and public holidays', () => {
      // 1 May 2027 is a Saturday, Mon 3 May a holiday: first working day Tue 4 May, plus 2 is Thu 6 May.
      assert.equal(
        payDayFor('2027-04', { kind: 'next-period-first-working-day', offset: 2 }, ['2027-05-03']),
        '2027-05-06',
      )
    })

    it('crosses into the next year from December', () => {
      // Fri 1 Jan 2027 is a holiday, so the first working day is Mon 4 Jan.
      assert.equal(
        payDayFor('2026-12', { kind: 'next-period-first-working-day', offset: 1 }, ['2027-01-01']),
        '2027-01-05',
      )
    })
  })
})
