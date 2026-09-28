import type { VerdictKind } from './types'

/**
 * „Valódi akció?” ítélet (PRODUCT_SPEC 7.3) — KIZÁRÓLAG a saját napi ártörténetünkből (6. vasszabály).
 * A feed „régi ár” mezője az ítéletet SOHA nem változtatja (nem tesz egy árat valódi akcióvá, és a „Most drágább”-at
 * sem teszi „Szokásos ár”-rá); csak a tényszerű kiegészítő mondatot váltja ki.
 *
 * A küszöbök egész számokkal számolnak (lebegőpontos kerekítés nélkül), hogy az SQL-pár
 * (`refresh_catalog_stats()`, 0009 migráció) pontosan ugyanazt adja; egy DB-teszt ezt ellenőrzi:
 *   valódi akció:  jelen < min30 × 0,97   ⇔  100 · jelen < 97 · min30
 *   most drágább:  jelen > med30 × 1,05   ⇔  200 · jelen > 105 · (2 · med30)
 */

/** Ennyi nap ártörténet kell az ítélethez (a mai napot nem számítva). */
export const VERDICT_MIN_DAYS = 14
/** Az ablak hossza napokban. */
export const VERDICT_WINDOW_DAYS = 30

export interface DailyPrice {
  /** budapesti naptári nap, YYYY-MM-DD */
  day: string
  minHuf: number
  lastHuf: number
}

export interface VerdictStats {
  currentHuf: number
  /** a feed szerinti régi ár (csak a kiegészítő mondathoz) */
  oldPriceHuf?: number | null
  /** napok száma ártörténettel az ablakban */
  daysTracked: number
  /** a napi minimumok minimuma (null, ha nincs adat) */
  min30Huf: number | null
  /** a napi utolsó árak mediánjának KÉTSZERESE (egész szám; páros elemszámnál a két középső összege) */
  med30Twice: number | null
}

export interface Verdict {
  kind: VerdictKind
  daysTracked: number
  min30Huf: number | null
  /** a napi utolsó árak mediánja (lehet ,5) */
  med30Huf: number | null
  /** „A bolt kedvezményt jelez, de az elmúlt 30 napban volt már ennyi vagy kevesebb is.” */
  feedDiscountNote: boolean
  /** valódi akciónál a szokásos (medián) árhoz mért kedvezmény egész %-ban (lefelé kerekítve), egyébként null */
  realDiscountPct: number | null
}

/** A medián kétszerese egész számként (üres listára null). */
export function median2(values: number[]): number | null {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 === 1 ? 2 * s[mid]! : s[mid - 1]! + s[mid]!
}

function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

/** Az ablak statisztikája a napi sorokból: a [ma − 30, ma − 1] napok (a mai nap nem számít). */
export function windowStats(history: DailyPrice[], today: string): Omit<VerdictStats, 'currentHuf' | 'oldPriceHuf'> {
  const from = shiftDay(today, -VERDICT_WINDOW_DAYS)
  const byDay = new Map<string, DailyPrice>()
  for (const h of history) if (h.day >= from && h.day < today) byDay.set(h.day, h)
  const rows = [...byDay.values()]
  return {
    daysTracked: rows.length,
    min30Huf: rows.length ? Math.min(...rows.map((r) => r.minHuf)) : null,
    med30Twice: median2(rows.map((r) => r.lastHuf)),
  }
}

export function verdictFromStats(s: VerdictStats): Verdict {
  const base = {
    daysTracked: s.daysTracked,
    min30Huf: s.min30Huf,
    med30Huf: s.med30Twice === null ? null : s.med30Twice / 2,
    feedDiscountNote: false,
    realDiscountPct: null,
  }
  if (s.daysTracked < VERDICT_MIN_DAYS || s.min30Huf === null || s.med30Twice === null) {
    return { ...base, kind: 'collecting' }
  }
  const cur = s.currentHuf
  if (100 * cur < 97 * s.min30Huf) {
    return {
      ...base,
      kind: 'deal',
      realDiscountPct: Math.floor(((s.med30Twice - 2 * cur) * 100) / s.med30Twice),
    }
  }
  // a feed kedvezményt jelez, de a saját 30 napunk szerint volt már ennyi vagy kevesebb (jelen ≥ min30): csak a
  // tényszerű kiegészítő mondat — az ítéletet a feed mezője nem változtatja (6. vasszabály; F6-átnézés, 0010 migráció)
  const feedDiscountNote = s.oldPriceHuf != null && s.oldPriceHuf > cur && cur >= s.min30Huf
  if (200 * cur > 105 * s.med30Twice) return { ...base, kind: 'pricier', feedDiscountNote }
  return { ...base, kind: 'usual', feedDiscountNote }
}

/** Ítélet egy ajánlatra a napi ártörténetéből. */
export function verdict(input: {
  currentHuf: number
  oldPriceHuf?: number | null
  history: DailyPrice[]
  /** budapesti naptári nap, YYYY-MM-DD */
  today: string
}): Verdict {
  return verdictFromStats({ currentHuf: input.currentHuf, oldPriceHuf: input.oldPriceHuf, ...windowStats(input.history, input.today) })
}
