import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { closeDb } from '../../src/lib/db/client'
import { findNamedayRows } from '../../src/lib/db/queries/catalog/namedays'
import { importNamedays } from '../../src/lib/db/seed/run'
import { suggestNameday } from '../../src/lib/occasions'
import { testSql } from './helpers'

const sql = testSql()

// START_PROMPT F1: a névnap-tesztek listája
const EXPECTED: [string, number, number][] = [
  ['István', 8, 20],
  ['Katalin', 11, 25],
  ['Anna', 7, 26],
  ['László', 6, 27],
  ['Péter', 6, 29],
  ['Erzsébet', 11, 19],
  ['Miklós', 12, 6],
  ['János', 6, 24],
  ['József', 3, 19],
  ['Márton', 11, 11],
  ['András', 11, 30],
  ['Luca', 12, 13],
  ['Éva', 12, 24],
]

beforeAll(async () => {
  await importNamedays(sql)
})
afterAll(async () => {
  await sql.end()
  await closeDb()
})

describe('névnaptár', () => {
  it('a teljes naptár betöltődött (minden nap, minden hónap)', async () => {
    const [r] = await sql<{ n: number; d: number }[]>`
      select count(*)::int as n, count(distinct (month, day))::int as d from public.namedays`
    expect(r!.n).toBeGreaterThan(7000)
    expect(r!.d).toBe(365) // február 29. nincs: szökőévben a február 24–28-i napok eltolódnak
  })

  it.each(EXPECTED)(
    '%s – %i. %i. szerepel, és a választóban is megjelenik',
    async (name, month, day) => {
      const rows = await findNamedayRows(name)
      expect(rows.some((r) => r.month === month && r.day === day)).toBe(true)
      const s = suggestNameday(rows)
      expect(s.options.some((o) => o.month === month && o.day === day)).toBe(true)
    },
  )

  it('ékezet- és kisbetű-független keresés', async () => {
    for (const q of ['eva', 'EVA', 'Éva', ' éva ']) {
      const rows = await findNamedayRows(q)
      expect(
        rows.some((r) => r.month === 12 && r.day === 24),
        q,
      ).toBe(true)
    }
    expect((await findNamedayRows('istvan')).some((r) => r.month === 8 && r.day === 20)).toBe(true)
  })

  it('egyértelmű fő nap: Erzsébet → november 19. javaslat', async () => {
    const s = suggestNameday(await findNamedayRows('Erzsébet'))
    expect(s.suggestion).toMatchObject({ month: 11, day: 19 })
  })

  it('több fő nap: Katalin → választó (április 30. / november 25.)', async () => {
    const s = suggestNameday(await findNamedayRows('Katalin'))
    expect(s.needsChoice).toBe(true)
    expect(s.options.filter((o) => o.isPrimary).map((o) => `${o.month}.${o.day}`)).toEqual([
      '4.30',
      '11.25',
    ])
  })

  it('ismeretlen név: üres, hiba nélkül', async () => {
    expect(await findNamedayRows('Xyzqw')).toEqual([])
    expect(await findNamedayRows('')).toEqual([])
  })
})
