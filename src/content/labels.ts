import { formatHuf } from '@/lib/pricing/format'

/** Felületi címkék a kódolt értékekhez (egy helyen, magyarul). */
export const RELATION_LABEL = {
  anya: 'Anya',
  apa: 'Apa',
  par: 'Pár',
  barat: 'Barát',
  baratno: 'Barátnő',
  testver: 'Testvér',
  gyerek: 'Gyerek',
  nagyszulo: 'Nagyszülő',
  kollega: 'Kolléga',
  egyeb: 'Egyéb',
} as const

export const BUDGET_BAND_LABEL = {
  // a pénzösszeg is a formatHuf-ból (nem törő szóközök, CLAUDE.md 9. pont)
  u5: `${formatHuf(5000)} alatt`,
  '5_15': '5–15 ezer',
  '15_30': '15–30 ezer',
  o30: '30 ezer felett',
} as const

export const OCCASION_LABEL = {
  birthday: 'születésnap',
  nameday: 'névnap',
  christmas: 'karácsony',
  mothers_day: 'anyák napja',
  fathers_day: 'apák napja',
  valentines: 'Valentin-nap',
  womens_day: 'nőnap',
  mikulas: 'Mikulás',
  anniversary: 'évforduló',
  custom: 'egyéni alkalom',
} as const

/** Bőrtípus (szűrő és onboarding, PRODUCT_SPEC 4.2). */
export const SKIN_TYPE_LABEL = {
  normal: 'Normál',
  szaraz: 'Száraz',
  zsiros: 'Zsíros',
  kombinalt: 'Kombinált',
  erzekeny: 'Érzékeny',
  nem_tudom: 'Nem tudom',
} as const

/** „Miért neked” címke a bőrtípus-egyezésre (PRODUCT_SPEC 7.1). */
export const SKIN_TYPE_WHY = {
  normal: 'Normál bőrre',
  szaraz: 'Száraz bőrre',
  zsiros: 'Zsíros bőrre',
  kombinalt: 'Kombinált bőrre',
  erzekeny: 'Érzékeny bőrre',
} as const

export const SKIN_CONCERN_LABEL = {
  pattanasok: 'Pattanások',
  pigmentfolt: 'Pigmentfoltok',
  rancok: 'Ráncok',
  tag_porusok: 'Tág pórusok',
  szarazsag: 'Szárazság',
  pirossag: 'Pirosság',
  fakosag: 'Fakóság',
} as const

export const SKIN_CONCERN_WHY = {
  pattanasok: 'Pattanásokra',
  pigmentfolt: 'Pigmentfoltokra',
  rancok: 'Ráncokra',
  tag_porusok: 'Tág pórusokra',
  szarazsag: 'Szárazság ellen',
  pirossag: 'Pirosságra',
  fakosag: 'Fakó bőrre',
} as const

/** Kerülendő összetevő (onboarding) és a „mentes” szűrő / címke párja. */
export const AVOID_INGREDIENT_LABEL = {
  illatanyag: 'Illatanyag',
  alkohol: 'Alkohol',
  paraben: 'Parabének',
  szilikon: 'Szilikonok',
  illoolaj: 'Illóolajok',
} as const

export const FREE_FROM_LABEL = {
  illatanyag: 'Illatmentes',
  alkohol: 'Alkoholmentes',
  paraben: 'Parabénmentes',
  szilikon: 'Szilikonmentes',
  illoolaj: 'Illóolajmentes',
} as const

export const SORT_LABEL = {
  relevancia: 'Legjobb egyezés',
  ar: 'Legalacsonyabb teljes ár',
  kedvezmeny: 'Legnagyobb valódi kedvezmény',
  uj: 'Legújabb',
} as const

/** Ársávok (a „Kényelmes keret” sávjai) a szűrőben. */
export const PRICE_BAND_LABEL = BUDGET_BAND_LABEL

/** A „Miért neked” címkék 4–6. szabálya (PRODUCT_SPEC 7.1). */
export const WHY_LABEL = {
  budget: 'A kereteden belül',
  deal: '30 napja nem volt ilyen olcsó',
  favoriteMerchant: 'A kedvenc boltodban',
} as const
