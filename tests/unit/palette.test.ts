import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrastRatio } from '@/lib/brand/contrast'
import { COLOR_TOKENS, palette } from '@/lib/brand/palette'

const css = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf8')

function block(selectorStart: string): string {
  const i = css.indexOf(selectorStart)
  if (i < 0) throw new Error(`nincs blokk: ${selectorStart}`)
  const open = css.indexOf('{', i)
  const close = css.indexOf('}', open)
  return css.slice(open + 1, close)
}

function readTokens(src: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of src.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\b/gi))
    out[m[1]!] = m[2]!.toLowerCase()
  return out
}

describe('palette.ts tükrözi a tokens.css-t', () => {
  const light = readTokens(block(':root,'))
  const dark = readTokens(block("[data-theme='dark'] {"))
  const media = readTokens(block(":root:not([data-theme='light'])"))
  it.each(COLOR_TOKENS)('%s', (token) => {
    expect(light[token]).toBe(palette.light[token])
    expect(dark[token]).toBe(palette.dark[token])
    expect(media[token]).toBe(palette.dark[token])
  })
})

describe('kontrasztarányok (WCAG AA ≥ 4,5 : 1 szövegre, DESIGN_SYSTEM 2. pont)', () => {
  for (const mode of ['light', 'dark'] as const) {
    const t = palette[mode]
    it(`${mode}: szövegtokenek a papíron és a felületen`, () => {
      for (const fg of ['ink', 'ink-muted', 'amber-deep', 'sky-deep', 'pricier', 'deal'] as const) {
        expect(contrastRatio(t[fg], t.paper)).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(t[fg], t.surface)).toBeGreaterThanOrEqual(4.5)
      }
    })
    it(`${mode}: ítélet-jelvények a saját hátterükön`, () => {
      expect(contrastRatio(t.deal, t['deal-bg'])).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(t.usual, t['usual-bg'])).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(t.pricier, t['pricier-bg'])).toBeGreaterThanOrEqual(4.5)
    })
    it(`${mode}: gombok`, () => {
      expect(contrastRatio(t.paper, t.ink)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(t['on-accent'], t['amber-deep'])).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(t.ink, t.peach)).toBeGreaterThanOrEqual(4.5)
    })
  }
  it('az --amber szövegre nem használható (dekorációs szín)', () => {
    expect(contrastRatio(palette.light.amber, palette.light.paper)).toBeLessThan(4.5)
  })
  it('a spec szerinti mért arányok', () => {
    expect(contrastRatio(palette.light.ink, palette.light.paper)).toBeCloseTo(14.2, 1)
    expect(contrastRatio(palette.light['ink-muted'], palette.light.paper)).toBeCloseTo(5.9, 1)
    expect(contrastRatio(palette.light['amber-deep'], palette.light.paper)).toBeCloseTo(4.6, 1)
  })
})
