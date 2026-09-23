/**
 * Szabályalapú címkézés (`product_tags`, `source = rule`). Bemenet: a név, a kategória és a leírás
 * ékezetmentes, kisbetűs szövege. Csak egyértelmű, szó szerinti kifejezésekre címkéz; kozmetikai jellemző,
 * nem egészségügyi állítás (CLAUDE.md 10. pont).
 */
export interface TagRule {
  tag: string
  test: RegExp
}

export const TAG_RULES: TagRule[] = [
  // bőrtípus (SKIN_TYPES)
  { tag: 'skin_type:zsiros', test: /zsiros(,| es| vagy)? ?(es )?(kombinalt |vegyes )?bor|oily skin/ },
  { tag: 'skin_type:szaraz', test: /szaraz(,| es| vagy)? ?bor|dry skin/ },
  { tag: 'skin_type:erzekeny', test: /erzekeny(,| es| vagy)? ?bor|sensitive skin/ },
  { tag: 'skin_type:kombinalt', test: /(kombinalt|vegyes)(,| es| vagy)? ?bor|combination skin/ },
  { tag: 'skin_type:normal', test: /normal(,| es| vagy)? ?bor|normal skin/ },
  // kerülendő összetevők (AVOID_INGREDIENTS)
  { tag: 'free_from:illatanyag', test: /illatanyag-?mentes|illatmentes|parfummentes|fragrance[- ]free|parfum nelkul|illatanyag nelkul/ },
  { tag: 'free_from:alkohol', test: /alkoholmentes|alcohol[- ]free|alkohol nelkul/ },
  { tag: 'free_from:paraben', test: /parabenmentes|paraben[- ]free|parabent nem tartalmaz|paraben nelkul/ },
  { tag: 'free_from:szilikon', test: /szilikonmentes|silicone[- ]free|szilikon nelkul/ },
  { tag: 'free_from:illoolaj', test: /illoolaj-?mentes|essential oil[- ]free|illoolaj nelkul/ },
  // fő gondok (SKIN_CONCERNS)
  { tag: 'concern:pigmentfolt', test: /pigmentfolt|hiperpigment|foltok halvanyit|sotet foltok/ },
  { tag: 'concern:pattanasok', test: /pattanas|akne|\bacne\b|mitesszer/ },
  { tag: 'concern:rancok', test: /\branc|anti[- ]?aging|oregedesgatlo|oregedes elleni/ },
  { tag: 'concern:tag_porusok', test: /tag porus|porusszukit|porusok/ },
  { tag: 'concern:szarazsag', test: /szarazsag|kiszarad|intenziv hidrata|hialuron|hyaluron/ },
  { tag: 'concern:pirossag', test: /pirossag|borpir|nyugtato|centella/ },
  { tag: 'concern:fakosag', test: /fakosag|fako bor|ragyogo|ragyogas|c-vitamin/ },
]

/** Kategória-útvonal → érdeklődés-címke (az ajándék-varázsló „Mit szeret?” lépéséhez). */
const INTEREST_BY_PATH: [prefix: string, tag: string][] = [
  ['szepsegapolas/parfum', 'interest:parfum'],
  ['szepsegapolas/smink', 'interest:smink'],
  ['szepsegapolas', 'interest:borapolas'],
  ['ajandek/otthon', 'interest:otthon'],
  ['ajandek/divat', 'interest:divat'],
  ['ajandek/ekszer', 'interest:ekszer'],
]

export function ruleTags(normalizedText: string, categoryPath: string | null): string[] {
  const tags = new Set(TAG_RULES.filter((r) => r.test.test(normalizedText)).map((r) => r.tag))
  if (categoryPath) {
    const hit = INTEREST_BY_PATH.find(([p]) => categoryPath === p || categoryPath.startsWith(`${p}/`))
    if (hit) tags.add(hit[1])
  }
  return [...tags].sort()
}
