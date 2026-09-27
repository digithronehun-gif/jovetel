import { describe, expect, it } from 'vitest'
import { countWords, guideIndexability, paragraphs } from '@/lib/content/guides'

const words = (n: number) => Array.from({ length: n }, (_, i) => `szó${i}`).join(' ')

describe('útmutató-indexelés (PRODUCT_SPEC 9.)', () => {
  it('szavak: a számok és jelek nem számítanak', () => {
    expect(countWords('Az első szérumod: 5 biztos választás – 10 ezer alatt')).toBe(7)
    expect(countWords('')).toBe(0)
    expect(countWords(null)).toBe(0)
  })
  it('≥ 5 tétel és ≥ 150 szó kell; pont a határon már indexelhető', () => {
    expect(guideIndexability({ intro: words(100), notes: [words(10), words(10), words(10), words(10), words(10)] })).toMatchObject({
      indexable: true,
      words: 150,
      items: 5,
    })
    const short = guideIndexability({ intro: words(100), notes: [words(10), words(10), words(10), words(10), words(9)] })
    expect(short.indexable).toBe(false)
    expect(short.reasons.join(' ')).toMatch(/150 szó/)
    const few = guideIndexability({ intro: words(400), notes: [null, null, null, null] })
    expect(few.indexable).toBe(false)
    expect(few.reasons.join(' ')).toMatch(/5 tétel/)
  })
  it('kitöltendő helyőrzővel nem indexelhető', () => {
    const r = guideIndexability({ intro: `[KITÖLTENDŐ] ${words(200)}`, notes: Array(5).fill('jó') })
    expect(r.indexable).toBe(false)
    expect(r.reasons.join(' ')).toMatch(/helyőrző/)
  })
  it('bekezdések üres sorral elválasztva, összevont szóközökkel', () => {
    expect(paragraphs('Első  sor\nfolytatás\n\n\nMásodik')).toEqual(['Első sor folytatás', 'Második'])
  })
})
