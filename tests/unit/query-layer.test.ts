import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 4. vasszabály: minden felhasználói adatot olvasó/író exportált függvény első paramétere `userId`.
 * A felhasználói lekérdezések csak a src/lib/db/queries/user/ alatt élhetnek.
 */
const DIR = join(process.cwd(), 'src/lib/db/queries/user')
const files = readdirSync(DIR).filter((f) => f.endsWith('.ts'))

describe('lekérdező réteg: userId-scope', () => {
  it('van legalább egy felhasználói lekérdező modul', () => {
    expect(files.length).toBeGreaterThan(0)
  })
  for (const f of files) {
    it(`${f}: minden exportált függvény első paramétere userId: string`, () => {
      const src = readFileSync(join(DIR, f), 'utf8')
      const fns = [...src.matchAll(/export\s+(?:async\s+)?function\s+(\w+)\s*\(\s*([^,)]*)/g)]
      expect(fns.length, `${f}: nincs exportált függvény`).toBeGreaterThan(0)
      for (const [, name, first] of fns) {
        expect(first?.replace(/\s+/g, ''), `${f} → ${name}`).toBe('userId:string')
      }
      expect(src, `${f}: nyílfüggvény-export nem engedett (nem ellenőrizhető)`).not.toMatch(
        /export\s+const\s+\w+\s*=\s*(async\s*)?\(/,
      )
    })
  }
  it('felhasználói táblát csak a queries/user modul kérdez le (a többi query-modulban nincs user_id szűrés nélküli hozzáférés)', () => {
    const userTables = [
      'lovedOnes',
      'occasions',
      'giftHistory',
      'priceAlerts',
      'shelfItems',
      'notifications',
      'reservations',
      'consents',
    ]
    const catalogDir = join(process.cwd(), 'src/lib/db/queries/catalog')
    for (const f of readdirSync(catalogDir)) {
      const src = readFileSync(join(catalogDir, f), 'utf8')
      const imported = [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'[^']*schema'/g)]
        .map((m) => m[1]!)
        .join(',')
      for (const t of userTables)
        expect(imported, `${f} → ${t}`).not.toMatch(new RegExp(`\\b${t}\\b`))
    }
  })
})
