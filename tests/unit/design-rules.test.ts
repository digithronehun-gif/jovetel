import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Szabályok, amiket a teljes forráskódon gépileg ellenőrzünk (CLAUDE.md 3. és 8. pont).
 */
const ROOT = process.cwd()
const DIRS = ['app', 'src', 'emails']
// Az egyetlen fájlok, ahol literál szín állhat (tokenek és tükrük)
const HEX_ALLOWED = new Set(['src/styles/tokens.css', 'src/lib/brand/palette.ts'])

function files(dir: string, out: string[] = []): string[] {
  let entries: string[] = []
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const name of entries) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) files(p, out)
    else if (/\.(tsx?|css)$/.test(name) && !name.endsWith('.generated.ts')) out.push(p)
  }
  return out
}

const all = DIRS.flatMap((d) => files(join(ROOT, d))).map((p) => ({
  path: relative(ROOT, p),
  text: readFileSync(p, 'utf8'),
}))

describe('design- és biztonsági szabályok a teljes kódon', () => {
  it('nincs literál hex szín a tokeneken kívül', () => {
    const offenders = all
      .filter((f) => !HEX_ALLOWED.has(f.path))
      .flatMap((f) =>
        [
          ...f.text.matchAll(
            /(?<![&\w])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b(?![-\w])/g,
          ),
        ]
          .filter((m) => !/^#\d+$/.test(m[0]) || m[0].length > 4)
          .map((m) => `${f.path}: ${m[0]}`),
      )
    expect(offenders).toEqual([])
  })
  it('nincs dangerouslySetInnerHTML (2. vasszabály)', () => {
    const offenders = all
      .filter(
        (f) => /dangerouslySetInnerHTML/.test(f.text) && !f.path.endsWith('design-rules.test.ts'),
      )
      .map((f) => f.path)
    expect(offenders).toEqual([])
  })
  it('komponens nem hivatkozik márkakép fájlnevére (7. vasszabály)', () => {
    const offenders = all
      .filter((f) => !f.path.startsWith('src/lib/assets') && !f.path.startsWith('src/content'))
      .filter((f) => /\/brand\/moodboard|\.(webp|jpe?g|avif)['"`]/.test(f.text))
      .map((f) => f.path)
    expect(offenders).toEqual([])
  })
  it('nincs szikra / sparkles ikon (az AI jele a RayIcon)', () => {
    const offenders = all.filter((f) => /Sparkle|✦/.test(f.text)).map((f) => f.path)
    expect(offenders).toEqual([])
  })
  it('a next/font hívások latin-ext készletet kérnek', () => {
    const fontFiles = all.filter((f) => /from 'next\/font\/google'/.test(f.text))
    expect(fontFiles.length).toBeGreaterThan(0)
    for (const f of fontFiles) {
      const calls = f.text.match(/\w+\(\{[\s\S]*?\}\)/g) ?? []
      for (const c of calls)
        expect(c, f.path).toMatch(/subsets:\s*\[\s*'latin',\s*'latin-ext'\s*\]/)
    }
  })
})
