/**
 * Egy feed teljes futása (ARCHITECTURE 3. pont, 9 lépés):
 *  1. letöltés → a nyers fájl tömörített másolata a pillanatkép-tárba (30 nap)
 *  2. streaming parse → normalizálás → elutasított sorok mintája (`error_sample`)
 *  3–4. normalizálás és hash (a publikáláskor csak a változott tétel íródik)
 *  5–7. publikálás egy tranzakcióban (termék-összerendelés, ajánlatok, ártörténet, kihagyott ajánlatok)
 *  8. MINŐSÉGI KAPU a publikálás ELŐTT: 60% alatti tételszám vagy 20% feletti elutasítás → `blocked`, riasztás
 *  9. statisztika, `feeds.last_success_at` (= az ár ellenőrzésének ideje minden látott ajánlatra)
 * A hibás sor nem állítja meg a futást; a teljes futás csak letöltési/infrastruktúra-hibánál `failed`.
 */
import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createGzip } from 'node:zlib'
import type { Sql } from 'postgres'
import { budapestDayKey } from '../../format/date'
import { getAdapter } from '../adapters'
import { isParseFailure } from '../parse/csv'
import { normalizeItem, type NormalizeContext } from '../normalize/item'
import { cleanLine } from '../normalize/text'
import { evaluateGate } from '../quality/gate'
import { isRejection, type AdapterContext, type FeedRow, type MerchantRow, type Rejection, type RejectReason } from '../types'
import { publish, type PublishStats } from './publish'
import { rawObjectPath, type RawStore } from './raw-store'
import { StagingWriter } from './staging'

export const ERROR_SAMPLE_SIZE = 20

export interface RunDeps {
  sql: Sql
  rawStore: RawStore
  /** `file:` forrás gyökérkönyvtárai (csak fixture / teszt) */
  fileRoots?: string[]
  now?: () => Date
  log?: (msg: string) => void
}

export interface RunSummary {
  runId: string
  feedId: string
  merchantSlug: string
  status: 'success' | 'failed' | 'blocked' | 'skipped'
  seen: number
  valid: number
  rejected: number
  changed: number
  blockedReason?: string
  error?: string
  durationMs: number
  publish?: PublishStats
  rejectReasons: Partial<Record<RejectReason, number>>
  flags: Record<string, number>
}

interface Loaded {
  feed: FeedRow & { isActive: boolean; lastItemCount: number | null }
  merchant: MerchantRow
}

async function load(sql: Sql, feedId: string): Promise<Loaded> {
  const [r] = await sql<
    {
      id: string
      merchant_id: string
      format: FeedRow['format']
      url: string | null
      adapter: string
      config: Record<string, unknown>
      is_active: boolean
      last_item_count: number | null
      slug: string
      program_id: string | null
      domain_allowlist: string[]
      network_code: string
      subid_param: string | null
      subid_max_len: number | null
      tracking_domains: string[]
    }[]
  >`
    select f.id, f.merchant_id, f.format, f.url, f.adapter, f.config, f.is_active, f.last_item_count,
      m.slug, m.program_id, m.domain_allowlist, n.code as network_code, n.subid_param, n.subid_max_len, n.tracking_domains
    from public.feeds f join public.merchants m on m.id = f.merchant_id join public.networks n on n.id = m.network_id
    where f.id = ${feedId}`
  if (!r) throw new Error(`Nincs ilyen feed: ${feedId}`)
  return {
    feed: { id: r.id, merchantId: r.merchant_id, format: r.format, url: r.url, adapter: r.adapter, config: r.config ?? {}, isActive: r.is_active, lastItemCount: r.last_item_count },
    merchant: {
      id: r.merchant_id,
      slug: r.slug,
      programId: r.program_id,
      domainAllowlist: r.domain_allowlist,
      networkCode: r.network_code,
      subidParam: r.subid_param,
      subidMaxLen: r.subid_max_len,
      trackingDomains: r.tracking_domains,
    },
  }
}

async function normalizeContext(sql: Sql, merchant: MerchantRow) {
  const cats = await sql<{ id: string; path: string; name: string }[]>`select id, path, name from public.categories`
  const byPath = new Map(cats.map((c) => [c.path, c]))
  const categoryText = new Map(
    cats.map((c) => [
      c.id,
      c.path
        .split('/')
        .map((_, i, parts) => byPath.get(parts.slice(0, i + 1).join('/'))?.name)
        .filter(Boolean)
        .join(' '),
    ]),
  )
  const mappings = await sql<{ source_category: string; category_id: string }[]>`
    select source_category, category_id from public.category_mappings where merchant_id = ${merchant.id}`
  const ctx: NormalizeContext = {
    merchantDomains: merchant.domainAllowlist,
    trackingDomains: merchant.trackingDomains,
    categoryMappings: new Map(mappings.map((m) => [m.source_category, m.category_id])),
    categoryIdsByPath: new Map(cats.map((c) => [c.path, c.id])),
    categoryPathsById: new Map(cats.map((c) => [c.id, c.path])),
  }
  return { ctx, categoryText }
}

function byteCounter(onBytes: (n: number) => void): Transform {
  return new Transform({
    transform(chunk: Buffer, _e, cb) {
      onBytes(chunk.length)
      cb(null, chunk)
    },
  })
}

export async function runFeed(feedId: string, deps: RunDeps): Promise<RunSummary> {
  const { sql } = deps
  const log = deps.log ?? (() => {})
  const t0 = Date.now()
  const { feed, merchant } = await load(sql, feedId)
  const base: RunSummary = {
    runId: '',
    feedId,
    merchantSlug: merchant.slug,
    status: 'skipped',
    seen: 0,
    valid: 0,
    rejected: 0,
    changed: 0,
    durationMs: 0,
    rejectReasons: {},
    flags: {},
  }
  if (!feed.isActive) return { ...base, durationMs: Date.now() - t0 }

  // Egy feedre egyszerre csak egy futás. Élesben minden futás a GitHub Actions `ingest` workflow-ban megy
  // (concurrency-csoporttal, az admin „Futtatás most” is ezt indítja); itt a 2 óránál frissebb `running` futás
  // is kizár. A megszakadt (2 óránál régebbi) futásokat lezárjuk. Advisory lockot szándékosan nem használunk:
  // a Supabase tranzakciós poolerén a munkamenet-szintű zár beragadhat.
  await sql`
    update public.feed_runs set status = 'failed', finished_at = now(),
      stats = stats || ${sql.json({ error: 'A futás megszakadt (2 óránál régebben indult, nem fejeződött be).' } as never)}
    where feed_id = ${feedId} and status = 'running' and started_at < now() - interval '2 hours'`
  const [busy] = await sql`
    select 1 from public.feed_runs where feed_id = ${feedId} and status = 'running' and started_at >= now() - interval '2 hours' limit 1`
  if (busy) {
    log(`${merchant.slug}: már fut egy import erre a feedre, kihagyva`)
    return { ...base, error: 'Már fut egy import erre a feedre.', durationMs: Date.now() - t0 }
  }
  return runLocked(feed, merchant, base, deps, t0)
}

async function runLocked(feed: Loaded['feed'], merchant: MerchantRow, base: RunSummary, deps: RunDeps, t0: number): Promise<RunSummary> {
  const { sql } = deps
  const feedId = feed.id
  const now = deps.now ?? (() => new Date())
  const log = deps.log ?? (() => {})
  const startedAt = now()
  const [run] = await sql<{ id: string }[]>`
    insert into public.feed_runs (feed_id, started_at, status) values (${feedId}, ${startedAt}, 'running') returning id`
  const runId = run!.id
  const work = await mkdtemp(join(tmpdir(), 'jovetel-ingest-'))
  const summary: RunSummary = { ...base, runId, status: 'failed' }
  const sample: Rejection[] = []
  const unmapped = new Map<string, number>()
  let rawBytes = 0
  let rawPath: string | null = null
  let cleanup: () => void = () => {}
  const reject = (r: Rejection) => {
    summary.rejected++
    summary.rejectReasons[r.reason] = (summary.rejectReasons[r.reason] ?? 0) + 1
    if (sample.length < ERROR_SAMPLE_SIZE) sample.push({ ...r, detail: cleanLine(r.detail, 160) ?? undefined })
  }

  try {
    // a mai és a következő hónapok partíciói (a price_daily írása előtt)
    await sql`select public.ensure_price_daily_partitions(current_date, 3)`
    const { ctx: nctx, categoryText } = await normalizeContext(sql, merchant)
    const adapter = getAdapter(feed.adapter)
    const actx: AdapterContext = { feed, merchant, fileRoots: deps.fileRoots ?? [] }
    const source = await adapter.fetch(actx)
    log(`${merchant.slug}: letöltés (${source.origin})`)

    // 1. a nyers tartalom tömörített másolata a pillanatképhez, párhuzamosan a feldolgozással
    //    (a több célú pipe kezeli a visszanyomást: a forrás megáll, amíg bármelyik cél tele van)
    const rawFile = join(work, `raw.${source.ext}.gz`)
    const toParse = new PassThrough()
    const counter = byteCounter((n) => (rawBytes += n))
    source.stream.pipe(toParse)
    source.stream.pipe(counter)
    source.stream.on('error', (e) => toParse.destroy(e))
    cleanup = () => source.stream.destroy()
    const rawDone = pipeline(counter, createGzip(), createWriteStream(rawFile))

    // 2–4. feldolgozás a lemezre írt átmeneti fájlba
    const staging = new StagingWriter(join(work, 'items.ndjson'))
    const seenSkus = new Set<string>()
    const flags: Record<string, number> = {}
    for await (const raw of adapter.parse(toParse, actx)) {
      summary.seen++
      if (isParseFailure(raw as never)) {
        reject({ reason: 'parse_error', detail: (raw as unknown as { __parseError: string }).__parseError })
        continue
      }
      let mapped
      try {
        mapped = adapter.map(raw, actx)
      } catch (e) {
        reject({ reason: 'parse_error', detail: (e as Error).message })
        continue
      }
      const item = isRejection(mapped) ? mapped : normalizeItem(mapped, nctx)
      if (isRejection(item)) {
        reject(item)
        continue
      }
      if (seenSkus.has(item.sku)) {
        reject({ reason: 'duplicate_sku', sku: item.sku })
        continue
      }
      seenSkus.add(item.sku)
      for (const f of item.flags) flags[f] = (flags[f] ?? 0) + 1
      if (item.sourceCategory && !item.categoryId) unmapped.set(item.sourceCategory, (unmapped.get(item.sourceCategory) ?? 0) + 1)
      await staging.write(item)
    }
    await staging.close()
    toParse.resume()
    await rawDone
    summary.valid = staging.count
    summary.flags = flags

    try {
      rawPath = await deps.rawStore.save(rawObjectPath(feedId, runId, source.ext), rawFile)
    } catch (e) {
      // a pillanatkép hiánya nem állítja meg az árgyűjtést, de a statisztikában látszik
      log(`${merchant.slug}: a nyers pillanatkép mentése sikertelen: ${(e as Error).message}`)
    }

    // 8. minőségi kapu — a publikálás ELŐTT
    const gate = evaluateGate({ seen: summary.seen, valid: summary.valid, rejected: summary.rejected, previousCount: feed.lastItemCount })
    const stats = {
      rejectReasons: summary.rejectReasons,
      flags,
      unmappedCategories: [...unmapped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20),
      rawBytes,
      rawStore: deps.rawStore.kind,
      compressedBytes: (await stat(rawFile).catch(() => null))?.size ?? null,
    }
    if (!gate.ok) {
      summary.status = 'blocked'
      summary.blockedReason = gate.reason
      summary.durationMs = Date.now() - t0
      await sql`
        update public.feed_runs set status = 'blocked', finished_at = ${now()}, items_seen = ${summary.seen},
          items_valid = ${summary.valid}, items_rejected = ${summary.rejected}, items_changed = 0,
          error_sample = ${sql.json(sample as never)}, raw_object_path = ${rawPath}, blocked_reason = ${gate.reason},
          stats = ${sql.json({ ...stats, durationMs: summary.durationMs } as never)}
        where id = ${runId}`
      log(`${merchant.slug}: BLOKKOLVA — ${gate.reason}`)
      return summary
    }

    // 5–7. publikálás
    const pub = await publish(sql, {
      feedId,
      merchantId: merchant.id,
      stagingPath: staging.path,
      seenAt: startedAt,
      day: budapestDayKey(startedAt),
      seenSkus,
      categoryText,
    })
    summary.publish = pub
    summary.changed = pub.changed
    summary.status = 'success'
    summary.durationMs = Date.now() - t0

    // 9. statisztika; a last_success_at a letöltés ideje = az ár ellenőrzésének ideje
    await sql`update public.feeds set last_success_at = ${startedAt}, last_item_count = ${summary.valid} where id = ${feedId}`
    await sql`
      update public.feed_runs set status = 'success', finished_at = ${now()}, items_seen = ${summary.seen},
        items_valid = ${summary.valid}, items_rejected = ${summary.rejected}, items_changed = ${pub.changed},
        error_sample = ${sql.json(sample as never)}, raw_object_path = ${rawPath},
        stats = ${sql.json({ ...stats, publish: pub, durationMs: summary.durationMs } as never)}
      where id = ${runId}`
    log(`${merchant.slug}: kész — ${summary.valid} érvényes, ${summary.rejected} elutasítva, ${pub.changed} változott`)
    return summary
  } catch (e) {
    cleanup()
    const message = cleanLine((e as Error).message, 500) ?? 'Ismeretlen hiba'
    summary.status = 'failed'
    summary.error = message
    summary.durationMs = Date.now() - t0
    await sql`
      update public.feed_runs set status = 'failed', finished_at = ${now()}, items_seen = ${summary.seen},
        items_valid = ${summary.valid}, items_rejected = ${summary.rejected},
        error_sample = ${sql.json([...sample, { reason: 'failed', detail: message }] as never)},
        raw_object_path = ${rawPath}, stats = ${sql.json({ error: message, durationMs: summary.durationMs } as never)}
      where id = ${runId}`
    log(`${merchant.slug}: HIBA — ${message}`)
    return summary
  } finally {
    await rm(work, { recursive: true, force: true })
  }
}

export function newRunId(): string {
  return randomUUID()
}
