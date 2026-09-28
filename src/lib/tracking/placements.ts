/**
 * A „Megnézem a boltban” gombok helye és hivatkozása (ARCHITECTURE 4. pont, 6. lépés): csak naplózásra, engedélylistás
 * értékekkel. Ismeretlen értéket nem utasítunk el (a látogató ettől még a boltba jut), csak nem naplózzuk.
 */
export const PLACEMENTS = [
  /** termékoldal, legjobb ajánlat blokk */
  'product_best',
  /** termékoldal, összes ajánlat lista */
  'product_offers',
  /** ajándék-varázsló eredménye (F10) */
  'wizard_result',
  /** saját lista (F8) */
  'list',
  /** megosztott lista (F8) */
  'shared_list',
  /** Szépségpolc (F11) */
  'shelf',
  /** Neked most (F11) */
  'for_you',
  /** napi összesítő levél (F9) */
  'email_digest',
] as const
export type Placement = (typeof PLACEMENTS)[number]

const PLACEMENT_SET: ReadonlySet<string> = new Set(PLACEMENTS)

export function parsePlacement(raw: string | null | undefined): Placement | null {
  return raw && PLACEMENT_SET.has(raw) ? (raw as Placement) : null
}

/**
 * `ref` = a tartalom, ahonnan a kattintás jött: `{típus}:{azonosító}`, pl. `guide:az-elso-szerumod`,
 * `list:6f1c…`, `campaign:bf2026`. A típus engedélylistás, az azonosító kisbetűs slug vagy uuid (max. 64).
 */
export const REF_KINDS = ['guide', 'list', 'campaign', 'digest'] as const
export type RefKind = (typeof REF_KINDS)[number]
const REF_RE = new RegExp(`^(${REF_KINDS.join('|')}):([a-z0-9][a-z0-9-]{0,63})$`)

export function parseRef(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 80) return null
  return REF_RE.test(raw) ? raw : null
}

/** A bolt-gomb célja: mindig a követett átirányító (5. vasszabály: csak az adatbázisban tárolt URL-re visz). */
export function goHref(offerId: string, placement: Placement, ref?: `${RefKind}:${string}`): string {
  const p = new URLSearchParams({ placement })
  if (ref) {
    if (!parseRef(ref)) throw new Error(`Érvénytelen ref: ${ref}`)
    p.set('ref', ref)
  }
  return `/go/${offerId}?${p.toString()}`
}
