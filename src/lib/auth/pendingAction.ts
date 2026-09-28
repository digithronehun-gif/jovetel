import { z } from 'zod'

/**
 * Belépés előtt elindított művelet (PRODUCT_SPEC 2. „Elv”, 4.1): a vendég a gombra kattint → belépés → a művelet a
 * belépés után végrehajtódik (F7–F8), és a felhasználó a `returnTo` oldalra kerül vissza. URL-paraméterben utazik,
 * ezért Zoddal ellenőrzött, rövid, szöveges formátum:
 *   price_alert:<termék-slug>:pct:<5|10|20>   ·   price_alert:<termék-slug>:huf:<célár>
 *   list:<termék-slug>   ·   shelf:<termék-slug>
 */
export type PendingAction =
  | { kind: 'price_alert'; productSlug: string; targetPct: 5 | 10 | 20 }
  | { kind: 'price_alert'; productSlug: string; targetHuf: number }
  | { kind: 'list'; productSlug: string }
  | { kind: 'shelf'; productSlug: string }

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]{0,119}$/)

export function encodePendingAction(a: PendingAction): string {
  switch (a.kind) {
    case 'price_alert':
      return 'targetPct' in a ? `price_alert:${a.productSlug}:pct:${a.targetPct}` : `price_alert:${a.productSlug}:huf:${a.targetHuf}`
    case 'list':
      return `list:${a.productSlug}`
    case 'shelf':
      return `shelf:${a.productSlug}`
  }
}

export function parsePendingAction(value: string | null | undefined): PendingAction | null {
  if (!value || value.length > 200) return null
  const [kind, s, mode, amount, ...rest] = value.split(':')
  if (rest.length || !slug.safeParse(s).success) return null
  if ((kind === 'list' || kind === 'shelf') && mode === undefined) return { kind, productSlug: s! }
  if (kind === 'price_alert' && mode === 'pct' && ['5', '10', '20'].includes(amount ?? '')) {
    return { kind, productSlug: s!, targetPct: Number(amount) as 5 | 10 | 20 }
  }
  if (kind === 'price_alert' && mode === 'huf') {
    const n = z.coerce.number().int().min(1).max(10_000_000).safeParse(amount)
    if (n.success) return { kind, productSlug: s!, targetHuf: n.data }
  }
  return null
}

/** A `returnTo` csak saját, relatív útvonal lehet (open redirect ellen, 5. vasszabály szellemében). */
export function safeReturnTo(value: string | null | undefined): string | null {
  if (!value || value.length > 500) return null
  if (!value.startsWith('/') || value.includes('\\') || /[\u0000-\u001f\u007f\s]/.test(value)) return null
  try {
    const u = new URL(value, 'https://jovetel.invalid')
    if (u.origin !== 'https://jovetel.invalid') return null
    // a pont-szegmensek feloldása után sem lehet protokoll-relatív (pl. „/.//evil.example” → „//evil.example”)
    if (u.pathname.startsWith('//')) return null
    return `${u.pathname}${u.search}`
  } catch {
    return null
  }
}
