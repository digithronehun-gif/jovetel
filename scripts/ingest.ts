/**
 * pnpm ingest -- --feed <id> | --all | --fixtures        (ARCHITECTURE 3. pont)
 *   --feed <id>   egy feed futtatása
 *   --all         minden aktív feed (a `file:` fixture-feedek kivételével), utána a régi pillanatképek törlése
 *   --fixtures    a fixture-feedek regisztrálása és futtatása (`tests/fixtures/feeds/`); production DB-n nem fut
 *   --quiet       csak az összesítő
 * Blokkolt vagy hibás futásnál riasztó levél megy az ADMIN_ALERT_EMAIL címre. Kilépési kód: 1, ha bármelyik
 * futás `failed` (a `blocked` kezelt állapot: riasztás megy, a kód 0).
 */
import { join } from 'node:path'
import postgres from 'postgres'
import { createElement } from 'react'
import FeedAlert, { feedAlertSubject } from '../emails/FeedAlert'
import { ensureFixtureFeeds } from '../src/lib/db/seed/fixture-feeds'
import { sendEmail } from '../src/lib/email/send'
import { defaultRawStore } from '../src/lib/ingestion/pipeline/raw-store'
import { runFeed, type RunSummary } from '../src/lib/ingestion/pipeline/run'
import { siteUrl } from '../src/lib/env'
import { requireEnv } from './_env'

const args = process.argv.slice(2)
const has = (f: string) => args.includes(f)
const opt = (f: string) => {
  const i = args.indexOf(f)
  return i >= 0 ? args[i + 1] : undefined
}
const quiet = has('--quiet')
const FIXTURES_DIR = join(import.meta.dirname, '../tests/fixtures/feeds')

if (!has('--feed') && !has('--all') && !has('--fixtures')) {
  console.error('Használat: pnpm ingest -- --feed <id> | --all | --fixtures')
  process.exit(2)
}

// Session-képes kapcsolat kell (Supabase: a pooler session módja, 5432-es port, vagy a közvetlen cím).
const url = process.env.INGEST_DATABASE_URL || process.env.DIRECT_DATABASE_URL || requireEnv('DATABASE_URL')
const sql = postgres(url, { max: 4, prepare: false, onnotice: () => {}, idle_timeout: 20 })
const rawStore = defaultRawStore()

async function alert(s: RunSummary) {
  const to = process.env.ADMIN_ALERT_EMAIL
  if (!to) {
    console.warn(`Riasztás (ADMIN_ALERT_EMAIL nincs beállítva): ${s.merchantSlug} ${s.status} — ${s.blockedReason ?? s.error}`)
    return
  }
  const [m] = await sql<{ name: string }[]>`select name from public.merchants where slug = ${s.merchantSlug}`
  const props = {
    merchant: m?.name ?? s.merchantSlug,
    status: s.status as 'blocked' | 'failed',
    reason: s.blockedReason ?? s.error ?? 'Ismeretlen hiba.',
    seen: s.seen,
    valid: s.valid,
    rejected: s.rejected,
    adminUrl: `${siteUrl()}/admin/feedek/${s.feedId}`,
  }
  await sendEmail({ to, subject: feedAlertSubject(props), react: createElement(FeedAlert, props), tags: [{ name: 'type', value: 'feed_alert' }] })
}

async function main() {
  let feeds: { id: string }[]
  let fileRoots: string[] = []
  if (has('--fixtures')) {
    feeds = await ensureFixtureFeeds(sql, FIXTURES_DIR)
    fileRoots = [FIXTURES_DIR]
  } else if (has('--feed')) {
    feeds = [{ id: opt('--feed') ?? '' }]
  } else {
    feeds = await sql<{ id: string }[]>`
      select f.id from public.feeds f join public.merchants m on m.id = f.merchant_id
      where f.is_active and m.status = 'active' and coalesce(f.url, '') not like 'file:%' order by f.created_at`
  }

  const results: RunSummary[] = []
  for (const f of feeds) {
    const s = await runFeed(f.id, { sql, rawStore, fileRoots, log: quiet ? undefined : (m) => console.log(m) })
    results.push(s)
    if (s.status === 'blocked' || s.status === 'failed') await alert(s).catch((e) => console.error(`Riasztás sikertelen: ${(e as Error).message}`))
  }
  if (has('--all')) {
    const removed = await rawStore.prune().catch((e) => {
      console.error(`Pillanatkép-takarítás sikertelen: ${(e as Error).message}`)
      return 0
    })
    if (!quiet) console.log(`Régi nyers pillanatképek törölve: ${removed}`)
  }

  console.table(
    results.map((r) => ({
      kereskedő: r.merchantSlug,
      állapot: r.status,
      látott: r.seen,
      érvényes: r.valid,
      elutasított: r.rejected,
      változott: r.changed,
      'idő (s)': (r.durationMs / 1000).toFixed(1),
      megjegyzés: r.blockedReason ?? r.error ?? '',
    })),
  )
  return results.some((r) => r.status === 'failed') ? 1 : 0
}

main()
  .then(async (code) => {
    await sql.end({ timeout: 5 })
    process.exit(code)
  })
  .catch(async (e) => {
    console.error(e instanceof Error ? e.message : e)
    await sql.end({ timeout: 5 })
    process.exit(1)
  })
