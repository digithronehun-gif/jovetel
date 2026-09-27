import { describe, expect, it } from 'vitest'
import { RANKING_FACTORS, RANKING_WEIGHTS } from '@/lib/search/weights'

describe('rangsor-súlyok (PRODUCT_SPEC 7.2, 3. vasszabály)', () => {
  it('a súlyok összege 1', () => {
    const sum = Object.values(RANKING_WEIGHTS).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 10)
  })
  it('a spec szerinti értékek', () => {
    expect(RANKING_WEIGHTS).toEqual({ relevance: 0.35, profileFit: 0.25, value: 0.15, verdict: 0.1, merchantQuality: 0.1, freshness: 0.05 })
  })
  it('a jutalék nem szempont', () => {
    const keys = Object.keys(RANKING_WEIGHTS).join(' ').toLowerCase()
    expect(keys).not.toMatch(/commission|jutalek|epc|payout|margin/)
  })
  it('minden tényezőnek van nyilvános magyarázata', () => {
    expect(RANKING_FACTORS.map((f) => f.key).sort()).toEqual(Object.keys(RANKING_WEIGHTS).sort())
  })
})

describe('a keresés SQL-je nem néz jutalékot (3. vasszabály)', () => {
  it('a keresőmodul és a 0009 migráció egyetlen jutalék-jellegű oszlopot vagy táblát sem említ', async () => {
    const { readFileSync, readdirSync } = await import('node:fs')
    const { join } = await import('node:path')
    const root = join(import.meta.dirname, '../..')
    const files = [
      ...readdirSync(join(root, 'src/lib/search')).filter((f) => f.endsWith('.ts')).map((f) => join(root, 'src/lib/search', f)),
      join(root, 'src/lib/db/migrations/0009_search_stats.up.sql'),
    ]
    for (const f of files) {
      // a megjegyzésekben szerepelhet a tilalom („a jutalék nem szempont”), a kódban nem
      const code = readFileSync(f, 'utf8')
        .split('\n')
        .filter((l) => !/^\s*(\/\/|\*|\/\*\*|--)/.test(l))
        .join('\n')
        .replace(/\/\/.*$/gm, '')
        .replace(/--.*$/gm, '')
      expect(code, f).not.toMatch(/commission|conversions|clicks|epc|payout|jutal/i)
    }
  })
})
