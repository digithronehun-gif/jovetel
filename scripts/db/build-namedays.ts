/**
 * A magyar névnaptár seed-adatának előállítása három nyilvános forrásból (egyszeri; a kimenet commitolva):
 *
 *  1. MEK — az Országos Széchényi Könyvtár Magyar Elektronikus Könyvtárának névnap-gyűjteménye,
 *     JSON-ba alakítva: github.com/davidfegyver/nevnapok-json (nevnapok.json). A fő névnapot
 *     „*” jelöli a forrásban → `is_primary`. EZ AZ ELSŐDLEGES FORRÁS.
 *  2. Magyar Wikipedia, „Magyar névnapok listája dátum szerint” (a közkeletű naptár napi nevei),
 *     a `nevnap` npm-csomag generált adata: github.com/nevadavid/nevnap (src/namedays.json, MIT)
 *     → `in_calendar` és `calendar_rank` (a név helye a nap listájában).
 *  3. Magyar Wikipedia, „Magyar névnapok listája betűrendben”: github.com/smega/nevnap-json-adatbazis
 *     (nev_nap.json) → a MEK-ből hiányzó (főleg újabb) nevek és napok.
 *
 * Futtatás: NODE_USE_ENV_PROXY=1 pnpm tsx scripts/db/build-namedays.ts
 * Kimenet:  src/lib/db/seed/data/namedays.json (forrásokkal, SHA-256-tal, egyezési statisztikával)
 */
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SOURCES = {
  mek: 'https://raw.githubusercontent.com/davidfegyver/nevnapok-json/main/nevnapok.json',
  wikiByDate: 'https://raw.githubusercontent.com/nevadavid/nevnap/main/src/namedays.json',
  wikiAlpha: 'https://raw.githubusercontent.com/smega/nevnap-json-adatbazis/master/nev_nap.json',
} as const

type Key = `${string}|${number}|${number}`
interface Row {
  name: string
  month: number
  day: number
  isPrimary: boolean
  inCalendar: boolean
  calendarRank: number | null
  sources: Set<'mek' | 'wiki'>
}

async function get(url: string): Promise<{ json: unknown; sha256: string }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  const text = await res.text()
  return { json: JSON.parse(text), sha256: createHash('sha256').update(text).digest('hex') }
}

// A forrásban két név néha egybeíródott („PannaAnna”): nagybetűnél szétválasztjuk.
function splitGlued(name: string): string[] {
  return name
    .split(/(?<=[a-záéíóöőúüű])(?=[A-ZÁÉÍÓÖŐÚÜŰ])/u)
    .map((s) => s.trim())
    .filter(Boolean)
}

const clean = (n: string) => n.normalize('NFC').replace(/\s+/g, ' ').trim()
const valid = (n: string) => /^[A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüűA-ZÁÉÍÓÖŐÚÜŰ-]+$/u.test(n)

const [mek, wikiByDate, wikiAlpha] = await Promise.all([
  get(SOURCES.mek),
  get(SOURCES.wikiByDate),
  get(SOURCES.wikiAlpha),
])

const rows = new Map<Key, Row>()
function upsert(name: string, month: number, day: number): Row {
  const key: Key = `${name}|${month}|${day}`
  let r = rows.get(key)
  if (!r) {
    r = {
      name,
      month,
      day,
      isPrimary: false,
      inCalendar: false,
      calendarRank: null,
      sources: new Set(),
    }
    rows.set(key, r)
  }
  return r
}

// 1. MEK
const mekData = mek.json as Record<string, Record<string, { main?: string[]; other?: string[] }>>
const mekPairs = new Set<Key>()
const mekNames = new Set<string>()
for (const [m, days] of Object.entries(mekData)) {
  for (const [d, v] of Object.entries(days)) {
    for (const [kind, list] of [
      ['main', v.main ?? []],
      ['other', v.other ?? []],
    ] as const) {
      for (const raw of list) {
        for (const name of splitGlued(clean(raw))) {
          if (!valid(name)) continue
          const r = upsert(name, Number(m), Number(d))
          r.sources.add('mek')
          if (kind === 'main') r.isPrimary = true
          mekPairs.add(`${name}|${Number(m)}|${Number(d)}`)
          mekNames.add(name)
        }
      }
    }
  }
}

// 2. Wikipedia, dátum szerint (a közkeletű naptár)
const byDate = wikiByDate.json as string[][][]
const calendarPairs = new Set<Key>()
byDate.forEach((month, mi) =>
  month.forEach((names, di) => {
    let rank = 0
    for (const raw of names) {
      for (const name of splitGlued(clean(raw))) {
        if (!valid(name)) continue
        const r = upsert(name, mi + 1, di + 1)
        r.sources.add('wiki')
        r.inCalendar = true
        r.calendarRank = r.calendarRank === null ? rank : Math.min(r.calendarRank, rank)
        calendarPairs.add(`${name}|${mi + 1}|${di + 1}`)
        rank++
      }
    }
  }),
)

// 3. Wikipedia, betűrendben
const alpha = wikiAlpha.json as Record<string, string[]>
const alphaPairs = new Set<Key>()
for (const [rawName, dates] of Object.entries(alpha)) {
  for (const name of splitGlued(clean(rawName))) {
    if (!valid(name)) continue
    for (const md of dates) {
      const [m, d] = md.split('-').map(Number) as [number, number]
      if (!m || !d) continue
      upsert(name, m, d).sources.add('wiki')
      alphaPairs.add(`${name}|${m}|${d}`)
    }
  }
}

// Fő névnap a MEK-ben nem szereplő neveknél: ha a névnek egy napja van, az; ha pontosan egy napja
// szerepel a közkeletű naptárban, az. Egyébként nincs fő nap (a felület választót mutat).
const byName = new Map<string, Row[]>()
for (const r of rows.values()) byName.set(r.name, [...(byName.get(r.name) ?? []), r])
for (const [name, list] of byName) {
  if (mekNames.has(name)) continue
  if (list.length === 1) list[0]!.isPrimary = true
  else {
    const cal = list.filter((r) => r.inCalendar)
    if (cal.length === 1) cal[0]!.isPrimary = true
  }
}

// Egyezési statisztika a források között
const mekMain = [...rows.values()].filter((r) => r.isPrimary && r.sources.has('mek'))
const mekMainInWiki = mekMain.filter(
  (r) =>
    alphaPairs.has(`${r.name}|${r.month}|${r.day}`) ||
    calendarPairs.has(`${r.name}|${r.month}|${r.day}`),
)
const calInMek = [...calendarPairs].filter((k) => mekPairs.has(k))
const stats = {
  rows: rows.size,
  names: byName.size,
  primaryRows: [...rows.values()].filter((r) => r.isPrimary).length,
  mekPairs: mekPairs.size,
  calendarPairs: calendarPairs.size,
  alphaPairs: alphaPairs.size,
  mekPrimaryAlsoInWikipedia: `${mekMainInWiki.length}/${mekMain.length} (${((100 * mekMainInWiki.length) / mekMain.length).toFixed(1)}%)`,
  calendarAlsoInMek: `${calInMek.length}/${calendarPairs.size} (${((100 * calInMek.length) / calendarPairs.size).toFixed(1)}%)`,
  onlyInWikipedia: [...rows.values()].filter((r) => !r.sources.has('mek')).length,
}

const out = {
  $comment:
    'GENERÁLT FÁJL — scripts/db/build-namedays.ts. Elsődleges forrás: MEK (OSZK) névnaptár; kiegészítés: magyar Wikipedia (dátum szerint és betűrendben). Szökőévben a február 24–28-i névnapok egy nappal később vannak (ezt a lib/occasions számolja).',
  retrievedAt: new Date().toISOString().slice(0, 10),
  sources: {
    mek: {
      url: SOURCES.mek,
      sha256: mek.sha256,
      description: 'MEK (Magyar Elektronikus Könyvtár, OSZK) névnap-gyűjteménye; fő névnap = „*”',
    },
    wikiByDate: {
      url: SOURCES.wikiByDate,
      sha256: wikiByDate.sha256,
      description: 'Magyar Wikipedia: Magyar névnapok listája dátum szerint (nevnap npm, MIT)',
    },
    wikiAlpha: {
      url: SOURCES.wikiAlpha,
      sha256: wikiAlpha.sha256,
      description: 'Magyar Wikipedia: Magyar névnapok listája betűrendben',
    },
  },
  stats,
  // [név, hónap, nap, fő?, naptári?, naptári helyezés, forrás]
  rows: [...rows.values()]
    .sort((a, b) => a.month - b.month || a.day - b.day || a.name.localeCompare(b.name, 'hu'))
    .map((r) => [
      r.name,
      r.month,
      r.day,
      r.isPrimary ? 1 : 0,
      r.inCalendar ? 1 : 0,
      r.calendarRank,
      [...r.sources].sort().join('+'),
    ]),
}

const file = join(import.meta.dirname, '../../src/lib/db/seed/data/namedays.json')
writeFileSync(file, JSON.stringify(out) + '\n')
console.log('Névnaptár kész:', stats)
