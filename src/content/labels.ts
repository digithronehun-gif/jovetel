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
