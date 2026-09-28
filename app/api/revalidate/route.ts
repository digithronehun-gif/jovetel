import { revalidateTag } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { CATALOG_TAG } from '@/lib/db/queries/catalog/product'
import { verifySignedBody } from '@/lib/security/hmac'

export const dynamic = 'force-dynamic'

const Body = z.object({
  tags: z
    .array(z.string().regex(/^(catalog|product:[a-z0-9][a-z0-9-]{0,119})$/))
    .min(1)
    .max(1000),
})

/**
 * POST /api/revalidate — az ingest után a változott termékek gyorsítótárának célzott érvénytelenítése
 * (`product:<slug>` vagy az egész katalógus: `catalog`). Csak HMAC-aláírt kérés (CRON_SECRET, időbélyeg ± 5 perc).
 */
export async function POST(req: NextRequest) {
  const raw = await req.text()
  const ok = verifySignedBody(process.env.CRON_SECRET, { timestamp: req.headers.get('x-jv-timestamp'), signature: req.headers.get('x-jv-signature') }, raw)
  if (!ok) return NextResponse.json({ error: 'Érvénytelen aláírás.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  let body: z.infer<typeof Body>
  try {
    body = Body.parse(JSON.parse(raw))
  } catch {
    return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }
  const tags = body.tags.includes(CATALOG_TAG) ? [CATALOG_TAG] : [...new Set(body.tags)]
  for (const t of tags) revalidateTag(t, { expire: 0 })
  return NextResponse.json({ revalidated: tags.length }, { headers: { 'Cache-Control': 'no-store' } })
}
