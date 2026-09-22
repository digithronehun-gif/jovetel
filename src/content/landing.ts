/**
 * A landing szövegei (PRODUCT_SPEC 3. pont — végleges kiinduló szövegek) és a mini-demók MINTA-adatai.
 * A minta-árak nem valódi ajánlatok: a felületen „Példa” jelölés van mellettük.
 */
import type { CostBreakdown } from '@/lib/pricing/types'

export const HERO = {
  eyebrow: 'Személyes vásárlási társ',
  titleStrong: 'Rávilágítunk',
  titleItalic: 'a jó vételre.',
  subtitle:
    'Mondd el, kinek és mire keresel. Megmutatjuk, mi éri meg valóban magyar boltokban, és szólunk, amikor eljön az ideje.',
  primary: 'Kezdjük el, ingyenes',
  secondary: 'Ajándékötlet regisztráció nélkül',
  trust: ['Ingyenes', 'Nem a jutalék rangsorol', 'Magyar boltok valódi árai'],
} as const

export const PROMISES = [
  {
    key: 'arak',
    title: 'Valódi árak',
    text: 'Több magyar bolt egy helyen, szállítással együtt. Saját ártörténetünkből látod, valódi-e az akció.',
  },
  {
    key: 'emlekszik',
    title: 'Emlékszik rád',
    text: 'Tudja, milyen a bőröd, kiket ajándékozol és mikor. Nem kell mindig elölről kezdened.',
  },
  {
    key: 'atlathato',
    title: 'Átlátható',
    text: 'Nem a jutalék dönti el a sorrendet. Minden partnerlinket jelölünk, és az AI nem talál ki árat.',
  },
] as const

export const DEMOS = {
  radar: {
    eyebrow: 'Ajándék-radar',
    title: 'Anyu névnapja 10 nap múlva.',
    titleItalic: 'Már van három ötleted.',
    text: 'Mentsd el a szeretteidet. A névnapot a keresztnévből magunk kikeressük, és időben szólunk, raktáron lévő ötletekkel a kereteden belül.',
  },
  deal: {
    eyebrow: 'Valódi akció?',
    title: 'A 30 napos ár',
    titleItalic: 'nem hazudik.',
    text: 'Minden terméknél látod, hogyan alakult az ára. Ha valóban most a legolcsóbb, megmondjuk. Ha nem, azt is.',
  },
  shelf: {
    eyebrow: 'Szépségpolc',
    title: 'Mielőtt elfogy,',
    titleItalic: 'szólunk.',
    text: 'Tedd a polcodra, amit használsz. Kiszámoljuk, nagyjából mikor fogy el, és előtte megmutatjuk a legjobb aktuális árat.',
  },
  lists: {
    eyebrow: 'Kívánságlista',
    title: 'Karácsonyi lista,',
    titleItalic: 'dupla ajándék nélkül.',
    text: 'Állítsd össze, oszd meg a családdal. Ők titokban lefoglalhatják, amit megvesznek, te pedig meglepődhetsz.',
  },
} as const

export const AI = {
  eyebrow: 'AI tanácsadó',
  title: 'Kérdezz úgy,',
  titleItalic: 'mint egy barátodtól.',
  chips: [
    'Ajándék a barátnőmnek 15 ezerből, szereti a parfümöket',
    'Szérum zsíros bőrre 10 ezer alatt',
    'Mit vegyek anyák napjára?',
  ],
} as const

export const TRUST = {
  eyebrow: 'Bizalom',
  title: 'Így rangsorolunk.',
  text: 'A sorrendet a te szempontjaid döntik el: ár szállítással, elérhetőség, a profilodhoz illés és a bolt megbízhatósága. A jutalék mértéke nem szempont. Partnerlinkeken keresztül jutalékot kaphatunk; ezt minden gomb mellett jelöljük.',
  link: 'A teljes leírás →',
} as const

export const FAQ = [
  {
    q: 'Tényleg ingyenes?',
    a: 'Igen. A boltoktól kaphatunk jutalékot, ha rajtunk keresztül vásárolsz. Neked ez semmibe nem kerül, és nem változtat az árakon.',
  },
  {
    q: 'Honnan jönnek az árak?',
    a: 'A boltok hivatalos termékadataiból, naponta többször frissítve. Minden árnál látod, mikor ellenőriztük.',
  },
  {
    q: 'Mit csináltok az adataimmal?',
    a: 'Csak arra használjuk, hogy jobb ajánlatot és időben emlékeztetőt kapj. Bármikor letöltheted vagy törölheted őket.',
  },
  {
    q: 'Honnan tudjátok a névnapot?',
    a: 'A magyar névnaptárból. Ha egy névnek több napja is van, kiválaszthatod, melyiket tartja.',
  },
  {
    q: 'Mi az a „Valódi akció”?',
    a: 'Azt jelenti, hogy a saját ármérésünk szerint az elmúlt 30 napban nem volt ennyire olcsó ennél a boltnál.',
  },
] as const

export const FINAL_CTA = {
  title: 'Kezdjük el.',
  titleItalic: 'Egy perc az egész.',
  button: 'Kezdjük el, ingyenes',
  waitlistIntro: 'Hamarosan indulunk. Iratkozz fel, és elsőként szólunk.',
} as const

// --- Mini-demók minta-adatai ------------------------------------------------------------------

const cost = (price: number, shipping: number): CostBreakdown => ({
  priceHuf: price,
  shippingHuf: shipping,
  customsHuf: 0,
  totalHuf: price + shipping,
  freeShipping: shipping === 0,
})

export const DEMO_IDEAS = [
  { slug: 'pelda-illatgyertya', name: 'Illatgyertya fügés 200 g', brandName: 'Borostyán Műhely', cost: cost(6490, 990), whyTags: ['A kereteden belül'] },
  { slug: 'pelda-selyemkendo', name: 'Selyemkendő virágmintás', brandName: 'Aranyhíd', cost: cost(12990, 0), whyTags: ['Szereti: divat'] },
  { slug: 'pelda-kezkrem', name: 'Ajándékcsomag: Téli kényeztetés', brandName: 'Kamilla & Társa', cost: cost(8990, 990), whyTags: ['A kereteden belül'] },
] as const

/** 30 nap szintetikus ár a „Valódi akció” demóhoz: stabil ár, a végén valódi esés. */
export function demoPriceSeries(today = new Date('2026-09-22T12:00:00Z')) {
  const points: { day: string; priceHuf: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 864e5)
    const base = i > 18 ? 11990 : i > 8 ? 11490 : 11990
    points.push({ day: d.toISOString().slice(0, 10), priceHuf: i === 0 ? 9490 : base })
  }
  const second = points.map((p, idx) => ({ day: p.day, priceHuf: idx === points.length - 1 ? 10490 : p.priceHuf + 500 }))
  return {
    series: [
      { merchantName: 'Példa Bolt A', points },
      { merchantName: 'Példa Bolt B', points: second },
    ],
    min30Huf: 11490,
    currentHuf: 9490,
  }
}
