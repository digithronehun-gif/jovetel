/**
 * A rangsor súlyai (PRODUCT_SPEC 7.2) — EGY HELYEN. A varázsló, a keresés „Legjobb egyezés” rendezése és a
 * nyilvános „Így rangsorolunk” oldal is ebből olvas. A JUTALÉK MÉRTÉKE NEM SZEREPELHET (3. vasszabály);
 * egy teszt ellenőrzi.
 */
export const RANKING_WEIGHTS = {
  relevance: 0.35,
  profileFit: 0.25,
  value: 0.15,
  verdict: 0.1,
  merchantQuality: 0.1,
  freshness: 0.05,
} as const

export type RankingFactor = keyof typeof RANKING_WEIGHTS

export const RANKING_FACTORS: { key: RankingFactor; label: string; description: string }[] = [
  {
    key: 'relevance',
    label: 'Egyezés a kereséssel',
    description:
      'Mennyire illik a termék a keresett szavakhoz (magyar szótövezéssel, ékezet nélkül is), vagy a varázslóban megadott kategóriához és érdeklődéshez.',
  },
  {
    key: 'profileFit',
    label: 'Illik hozzád',
    description:
      'Belépve: egyezik-e a bőrtípusoddal, a kerülendő összetevőiddel és a fő gondjaiddal (lásd „Miért neked” címkék).',
  },
  {
    key: 'value',
    label: 'Ár-érték a keretedhez',
    description: 'A teljes ár (szállítással) a megadott kerethez képest. Minél több marad a keretből, annál jobb.',
  },
  {
    key: 'verdict',
    label: 'Valódi akció',
    description: 'Ha a saját 30 napos ártörténetünk szerint most valóban olcsóbb, előrébb kerül; ha drágább a szokásosnál, hátrébb.',
  },
  {
    key: 'merchantQuality',
    label: 'A bolt megbízhatósága',
    description: 'Kézzel beállított érték a szállítási idő és a visszaküldési feltételek alapján.',
  },
  {
    key: 'freshness',
    label: 'Az ár frissessége',
    description: 'A 12 óránál frissebb ár teljes súllyal számít, a 48 óránál régebbi ár nem kerül a legjobb ajánlatba.',
  },
]
