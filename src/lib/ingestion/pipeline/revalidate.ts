import type { Sql } from 'postgres'
import { signBody } from '../../security/hmac'

/** Ennél több változott termék esetén az egész katalógus gyorsítótára érvénytelenül (egy kérés). */
export const MAX_TARGETED = 2000

/**
 * 11. lépés: a változott termékek (a `product_stats` sorai, amelyek a frissítés óta íródtak) termékoldal-gyorsítótárának
 * célzott érvénytelenítése a webalkalmazásban (POST /api/revalidate, HMAC-aláírással). Ha nincs beállítva a site URL
 * vagy a CRON_SECRET, kihagyja (az adat-gyorsítótár 1 óra múlva magától is lejár).
 */
export async function notifyRevalidation(
  sql: Sql,
  since: Date,
  opts: { siteUrl?: string; secret?: string; fetchImpl?: typeof fetch; now?: () => number },
): Promise<{ status: 'skipped' | 'sent' | 'failed'; tags: number; error?: string }> {
  if (!opts.siteUrl || !opts.secret) return { status: 'skipped', tags: 0 }
  const rows = await sql<{ slug: string }[]>`
    select p.slug from public.product_stats ps join public.products p on p.id = ps.product_id
    where ps.updated_at >= ${since.toISOString()}::timestamptz`
  if (rows.length === 0) return { status: 'sent', tags: 0 }
  const tags = rows.length > MAX_TARGETED ? ['catalog'] : rows.map((r) => `product:${r.slug}`)
  const doFetch = opts.fetchImpl ?? fetch
  let sent = 0
  for (let i = 0; i < tags.length; i += 1000) {
    const body = JSON.stringify({ tags: tags.slice(i, i + 1000) })
    const ts = Math.floor((opts.now?.() ?? Date.now()) / 1000)
    try {
      const res = await doFetch(new URL('/api/revalidate', opts.siteUrl), {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-jv-timestamp': String(ts), 'x-jv-signature': signBody(opts.secret, ts, body) },
        body,
        signal: AbortSignal.timeout(15_000),
      })
      if (!res.ok) return { status: 'failed', tags: sent, error: `HTTP ${res.status}` }
      sent += Math.min(1000, tags.length - i)
    } catch (e) {
      return { status: 'failed', tags: sent, error: (e as Error).message }
    }
  }
  return { status: 'sent', tags: sent }
}
