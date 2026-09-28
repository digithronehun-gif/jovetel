/**
 * Konverzió-szinkron (ARCHITECTURE 3. pont vége, DATA_MODEL 4. pont): a hálózatok tranzakciós API-jának válasza
 * közös alakra. A `click_id` a subID mezőből jön, és csak a saját formátumunkban fogadjuk el (`parseClickId`).
 * A hálózati válasz nem megbízható adat (2. vasszabály): Zod-dal ellenőrizzük, a `raw`-ba csak engedélyezett mezők
 * kerülnek (személyes adat nem).
 */
export type ConversionStatus = 'pending' | 'approved' | 'rejected'

export interface NormalizedConversion {
  networkTransactionId: string
  clickId: string | null
  /** a hálózat program-/hirdető-azonosítója (a kereskedő ebből is feloldható: `merchants.program_id`) */
  programId: string | null
  /** csak HUF-ban; más pénznemnél null (a `raw.currency` megőrzi) */
  orderValueHuf: number | null
  commissionHuf: number | null
  status: ConversionStatus
  occurredAt: Date
  updatedAt: Date | null
  raw: Record<string, unknown>
}

export interface ParseResult {
  items: NormalizedConversion[]
  /** érvénytelen tételek (séma-hiba, hiányzó azonosító vagy dátum) */
  rejected: number
}

export interface FetchWindow {
  from: Date
  to: Date
}

export interface NetworkConversionSource {
  code: string
  /** a szükséges környezeti változók (hiányuk esetén a hálózat kimarad, hibát nem jelez) */
  env: string[]
  /** a tranzakciós API nyers válaszai az ablakra (lapozva, a hálózat időablak-korlátja szerint darabolva) */
  fetch(window: FetchWindow, deps: { env: Record<string, string | undefined>; fetchImpl: typeof fetch }): Promise<unknown[]>
  parse(payload: unknown): ParseResult
}

/** Pénzösszeg egész forintra (a hálózatok tizedes értéket adnak). Negatív vagy nem véges → null. */
export function toHuf(amount: unknown, currency: unknown): number | null {
  if (typeof currency === 'string' && currency.toUpperCase() !== 'HUF') return null
  const n = typeof amount === 'string' ? Number(amount.replace(',', '.')) : typeof amount === 'number' ? amount : NaN
  if (!Number.isFinite(n) || n < 0 || n > 1e10) return null
  return Math.round(n)
}

/** Időpont: ISO (eltolással vagy anélkül — eltolás nélkül UTC-nek vesszük) vagy `YYYY-MM-DD HH:mm:ss`. */
export function toDate(v: unknown): Date | null {
  if (typeof v !== 'string' || !v.trim()) return null
  let s = v.trim().replace(' ', 'T')
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += 'T00:00:00'
  if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) s += 'Z'
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Az ablak darabolása a hálózat időablak-korlátja szerint (pl. Awin, CJ: legfeljebb 31 nap kérésenként). */
export function splitWindow(w: FetchWindow, maxDays: number): FetchWindow[] {
  const out: FetchWindow[] = []
  let from = w.from
  while (from < w.to) {
    const to = new Date(Math.min(w.to.getTime(), from.getTime() + maxDays * 86_400_000))
    out.push({ from, to })
    from = to
  }
  return out
}

export function pickFields(o: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of keys) if (o[k] !== undefined) out[k] = o[k]
  return out
}
