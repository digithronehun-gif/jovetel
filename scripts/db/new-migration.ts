/** pnpm db:generate -- <név> — új, üres fel/le migrációs pár a következő sorszámmal. */
import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { slugify } from '../../src/lib/format/slug'

const dir = join(import.meta.dirname, '../../src/lib/db/migrations')
const name = slugify(process.argv.slice(2).join(' ') || 'valtozas').replace(/-/g, '_')
const last = readdirSync(dir)
  .map((f) => Number(f.slice(0, 4)))
  .filter(Number.isFinite)
  .reduce((a, b) => Math.max(a, b), 0)
const base = `${String(last + 1).padStart(4, '0')}_${name}`
for (const [suffix, body] of [
  ['up', `-- ${base} · \nset search_path = "$user", public, extensions;\n`],
  ['down', `-- ${base} visszavonása\n`],
] as const) {
  const file = join(dir, `${base}.${suffix}.sql`)
  if (existsSync(file)) throw new Error(`Már létezik: ${file}`)
  writeFileSync(file, body)
}
console.log(
  `Létrehozva: src/lib/db/migrations/${base}.{up,down}.sql — frissítsd a Drizzle sémát is (src/lib/db/schema).`,
)
