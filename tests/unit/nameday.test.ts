import { describe, expect, it } from 'vitest'
import { rankNamedays, suggestNameday, type NamedayRowLike } from '@/lib/occasions'

const row = (
  month: number,
  day: number,
  isPrimary = false,
  inCalendar = false,
  calendarRank: number | null = null,
): NamedayRowLike => ({
  month,
  day,
  isPrimary,
  inCalendar,
  calendarRank,
})

describe('névnap-javaslat', () => {
  it('egyetlen fő nap → azonnali javaslat, választó nélkül', () => {
    const s = suggestNameday([row(11, 19, true, true, 0), row(7, 4), row(8, 24)])
    expect(s.suggestion).toMatchObject({ month: 11, day: 19 })
    expect(s.needsChoice).toBe(false)
    expect(s.more).toHaveLength(2)
  })
  it('több fő nap → választó („Melyiket tartja?”)', () => {
    const s = suggestNameday([
      row(4, 30, true, true, 0),
      row(11, 25, true, true, 0),
      row(2, 13, false, true, 3),
    ])
    expect(s.suggestion).toBeNull()
    expect(s.needsChoice).toBe(true)
    expect(s.options.map((o) => `${o.month}.${o.day}`)).toEqual(['4.30', '11.25', '2.13'])
  })
  it('egy fő nap + más naptári napok → a fő napot javasolja, de választható', () => {
    const s = suggestNameday([row(6, 24, false, true, 0), row(12, 27, true, true, 0)])
    expect(s.suggestion).toMatchObject({ month: 12, day: 27 })
    expect(s.needsChoice).toBe(true)
  })
  it('ismeretlen név → üres', () => {
    expect(suggestNameday([])).toEqual({
      suggestion: null,
      needsChoice: false,
      options: [],
      more: [],
    })
  })
  it('rangsor: fő → naptári → helyezés → dátum', () => {
    const r = rankNamedays([
      row(1, 5),
      row(3, 1, false, true, 2),
      row(2, 1, false, true, 0),
      row(9, 9, true),
    ])
    expect(r.map((x) => `${x.month}.${x.day}`)).toEqual(['9.9', '2.1', '3.1', '1.5'])
  })
})
