import { NextResponse, type NextRequest } from 'next/server'
import { parseSearchState } from '@/lib/search/state'
import { searchProvider } from '@/lib/search/provider'
import { clientIp, hashIdentifier } from '@/lib/security/ip'
import { rateLimit, RULES } from '@/lib/security/ratelimit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/search — ugyanaz a keresés, mint a /kereses oldalé (URL-paraméterek: lib/search/state.ts), JSON-ban.
 * Rate limit: 120 kérés / perc / IP-hash (CLAUDE.md 11. pont). Vendég-keresés: a CDN 60 másodpercig gyorsítótárazhatja.
 * Minden ár és ítélet az adatbázisból jön (1. vasszabály); a jutalék nem szempont (3. vasszabály).
 */
export async function GET(req: NextRequest) {
  const limit = await rateLimit(RULES.search, hashIdentifier(clientIp(req.headers)))
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Túl sok keresés rövid idő alatt. Próbáld újra egy perc múlva.' },
      { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))) } },
    )
  }
  const state = parseSearchState(req.nextUrl.searchParams)
  try {
    const r = await searchProvider().search(state)
    return NextResponse.json(
      {
        state: r.state,
        total: r.total,
        page: r.state.page,
        pageCount: r.pageCount,
        relaxed: r.relaxed,
        hits: r.hits.map((h) => ({
          slug: h.slug,
          name: h.name,
          brandName: h.brandName,
          imageUrl: h.imageUrl,
          merchantName: h.merchantName,
          cost: h.cost,
          inStock: h.inStock,
          checkedAt: h.checkedAt.toISOString(),
          verdict: h.verdict,
          realDiscountPct: h.realDiscountPct,
          why: h.why,
          url: `/termek/${h.slug}`,
        })),
        facets: r.facets,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    )
  } catch (e) {
    console.error('Keresési hiba:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'A keresés most nem érhető el.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
