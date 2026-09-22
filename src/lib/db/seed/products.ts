/**
 * Valósághű, de KITALÁLT minta-termékek (kitalált márkák, hogy valódi márkához ne kössünk hamis árat).
 * A kereskedők nevében mindig ott a [DEMO] jelölés (DATA_MODEL 6. pont).
 */
import { slugify } from '../../format/slug'
import { ean13, roundPrice, type Rng } from './random'

export const DEMO_BRANDS = [
  'Lumen Botanica',
  'Hajnalpír',
  'Mezei Derm',
  'Aura Skin Lab',
  'Tiszta Forrás',
  'Selyemméz',
  'Nordfény',
  'Pannon Gyógyfű',
  'Aranyhíd',
  'Fehér Lótusz',
  'Kamilla & Társa',
  'Dermavera',
  'Barka Naturals',
  'Sóvirág',
  'Levendulakert',
  'Borostyán Műhely',
] as const

interface Template {
  path: string
  make: (r: Rng) => {
    name: string
    size: [number, 'ml' | 'g' | 'db'] | null
    price: [number, number]
    tags: string[]
  }
  describe: (name: string) => string
}

const SCENTS = [
  'levendula',
  'narancsvirág',
  'vanília',
  'fehér tea',
  'citromfű',
  'fügés',
  'szantálfa',
  'rózsa',
]

const serums = [
  { k: 'C-vitaminos', tags: ['concern:pigmentfolt', 'concern:fakosag'] },
  { k: 'Hialuronsavas', tags: ['concern:szarazsag', 'skin_type:szaraz'] },
  { k: 'Niacinamidos', tags: ['concern:tag_porusok', 'skin_type:zsiros', 'skin_type:kombinalt'] },
  { k: 'Retinolos', tags: ['concern:rancok'] },
  { k: 'Peptides', tags: ['concern:rancok', 'skin_type:normal'] },
  { k: 'Szalicilsavas', tags: ['concern:pattanasok', 'skin_type:zsiros'] },
  { k: 'Nyugtató centellás', tags: ['concern:pirossag', 'skin_type:erzekeny'] },
]
const creams = [
  { k: 'Hidratáló nappali arckrém', tags: ['skin_type:normal', 'concern:szarazsag'] },
  { k: 'Tápláló éjszakai arckrém', tags: ['skin_type:szaraz', 'concern:rancok'] },
  { k: 'Mattító arckrém', tags: ['skin_type:zsiros', 'skin_type:kombinalt'] },
  { k: 'Nyugtató arckrém érzékeny bőrre', tags: ['skin_type:erzekeny', 'concern:pirossag'] },
  { k: 'Könnyű gél-krém', tags: ['skin_type:kombinalt', 'skin_type:zsiros'] },
  {
    k: 'Ceramidos barrier-krém',
    tags: ['skin_type:szaraz', 'skin_type:erzekeny', 'concern:szarazsag'],
  },
]
const perfumeNames = [
  'Hajnali Rózsa',
  'Esti Kert',
  'Borostyán Fény',
  'Fehér Pézsma',
  'Narancsvirág',
  'Nyári Zápor',
  'Fügeliget',
  'Csendes Erdő',
]
const shades = ['világos', 'közepes', 'meleg bézs', 'sötét']
const lipColors = ['rózsafa', 'téglavörös', 'mályva', 'korall', 'klasszikus piros']
const jewels = [
  'karika fülbevaló',
  'gyöngyös fülbevaló',
  'vékony karkötő',
  'medál nyaklánccal',
  'pecsétgyűrű',
]
const bagColors = ['konyak', 'fekete', 'bézs', 'bordó']
const giftThemes = [
  'Wellness este',
  'Téli kényeztetés',
  'Kávés reggel',
  'Kerti délután',
  'Utazó szett',
]

const withFree = (r: Rng, tags: string[]) => {
  const extra = [...tags]
  if (r.chance(0.3)) extra.push('free_from:illatanyag')
  if (r.chance(0.2)) extra.push('free_from:parabenek')
  if (r.chance(0.15)) extra.push('free_from:alkohol')
  if (r.chance(0.1)) extra.push('free_from:szilikonok')
  return extra
}

export const TEMPLATES: Template[] = [
  {
    path: 'szepsegapolas/arcapolas/szerum',
    make: (r) => {
      const s = r.pick(serums)
      const size = r.pick([15, 30, 30, 50])
      return {
        name: `${s.k} arcszérum ${size} ml`,
        size: [size, 'ml'],
        price: [3990, 14990],
        tags: withFree(r, [
          ...s.tags,
          'interest:borapolas',
          'recipient:baratno',
          'recipient:magamnak',
        ]),
      }
    },
    describe: (n) =>
      `${n}. Könnyű textúrájú, gyorsan beszívódó szérum a napi rutinhoz; reggel és este is használható, fényvédővel kiegészítve.`,
  },
  {
    path: 'szepsegapolas/arcapolas/arckrem',
    make: (r) => {
      const c = r.pick(creams)
      return {
        name: `${c.k} 50 ml`,
        size: [50, 'ml'],
        price: [2990, 12990],
        tags: withFree(r, [
          ...c.tags,
          'interest:borapolas',
          'recipient:anya',
          'recipient:magamnak',
        ]),
      }
    },
    describe: (n) => `${n}. Kényelmes, nem ragadó krém, ami egész nap komfortérzetet ad a bőrnek.`,
  },
  {
    path: 'szepsegapolas/arcapolas/arctisztito',
    make: (r) => {
      const v = r.pick([
        ['Kíméletes arctisztító gél', 150, ['skin_type:zsiros', 'skin_type:kombinalt']],
        ['Micellás víz', 400, ['skin_type:erzekeny', 'skin_type:normal']],
        ['Sminklemosó olaj', 200, ['skin_type:szaraz']],
        ['Enzimes arctisztító por', 60, ['concern:fakosag']],
      ] as const)
      return {
        name: `${v[0]} ${v[1]} ml`,
        size: [v[1], 'ml'],
        price: [1990, 6990],
        tags: withFree(r, [...v[2], 'interest:borapolas']),
      }
    },
    describe: (n) => `${n}. Alaposan, mégis gyengéden tisztít, nem hagy feszülő érzést.`,
  },
  {
    path: 'szepsegapolas/arcapolas/arcmaszk',
    make: (r) => {
      const v = r.pick([
        ['Agyagos arcmaszk 75 ml', [75, 'ml'], ['skin_type:zsiros', 'concern:tag_porusok']],
        ['Hidratáló fátyolmaszk', [1, 'db'], ['concern:szarazsag']],
        ['Éjszakai hidratáló maszk 50 ml', [50, 'ml'], ['skin_type:szaraz']],
      ] as const)
      return {
        name: v[0],
        size: v[1] as [number, 'ml' | 'db'],
        price: [990, 4990],
        tags: withFree(r, [...v[2], 'interest:borapolas', 'interest:wellness']),
      }
    },
    describe: (n) => `${n}. Heti egy-két alkalommal egy kis extra törődés a bőrnek.`,
  },
  {
    path: 'szepsegapolas/szemkornyek',
    make: (r) => {
      const v = r.pick([
        'Koffeines szemkörnyékápoló',
        'Peptides szemkörnyékápoló krém',
        'Hűsítő szemkörnyékápoló gél',
      ])
      return {
        name: `${v} 15 ml`,
        size: [15, 'ml'],
        price: [3490, 11990],
        tags: withFree(r, ['concern:rancok', 'interest:borapolas', 'recipient:anya']),
      }
    },
    describe: (n) => `${n}. Vékony réteg reggel és este a szem körüli bőrre.`,
  },
  {
    path: 'szepsegapolas/napvedelem/fenyvedo-arcra',
    make: (r) => {
      const spf = r.pick(['SPF 30', 'SPF 50', 'SPF 50+'])
      const v = r.pick([
        'Fényvédő fluid arcra',
        'Színezett fényvédő krém',
        'Könnyű fényvédő gél arcra',
      ])
      return {
        name: `${v} ${spf} 50 ml`,
        size: [50, 'ml'],
        price: [4490, 9990],
        tags: withFree(r, ['concern:pigmentfolt', 'interest:borapolas', 'recipient:magamnak']),
      }
    },
    describe: (n) => `${n}. Mindennapi fényvédelem, smink alá is jó.`,
  },
  {
    path: 'szepsegapolas/napvedelem/fenyvedo-testre',
    make: (r) => {
      const size = r.pick([150, 200])
      return {
        name: `Napozó spray ${r.pick(['SPF 30', 'SPF 50'])} ${size} ml`,
        size: [size, 'ml'],
        price: [3990, 8990],
        tags: ['interest:utazas', 'interest:sport'],
      }
    },
    describe: (n) =>
      `${n}. Egyenletesen eloszlatható, gyorsan beszívódik, strandra és kirándulásra.`,
  },
  {
    path: 'szepsegapolas/testapolas/tusfurdo',
    make: (r) => {
      const scent = r.pick(SCENTS)
      return {
        name: `Krémtusfürdő ${scent} 250 ml`,
        size: [250, 'ml'],
        price: [890, 2990],
        tags: ['interest:wellness', 'recipient:kollega'],
      }
    },
    describe: (n) => `${n}. Kellemes illatú, kíméletes tusfürdő mindennapi használatra.`,
  },
  {
    path: 'szepsegapolas/testapolas/testapolo',
    make: (r) => {
      const scent = r.pick(SCENTS)
      return {
        name: `Testápoló tej ${scent} 400 ml`,
        size: [400, 'ml'],
        price: [1490, 4990],
        tags: withFree(r, ['concern:szarazsag', 'interest:wellness', 'recipient:anya']),
      }
    },
    describe: (n) => `${n}. Gyorsan beszívódik, puha és bársonyos érzést hagy.`,
  },
  {
    path: 'szepsegapolas/hajapolas/sampon',
    make: (r) => {
      const t = r.pick([
        'festett hajra',
        'zsíros fejbőrre',
        'száraz hajra',
        'érzékeny fejbőrre',
        'mindennapi használatra',
      ])
      return {
        name: `Sampon ${t} 250 ml`,
        size: [250, 'ml'],
        price: [1290, 4490],
        tags: withFree(r, []),
      }
    },
    describe: (n) => `${n}. Enyhe habzású, kíméletes formula.`,
  },
  {
    path: 'szepsegapolas/hajapolas/hajbalzsam',
    make: (r) => ({
      name: `Hajbalzsam ${r.pick(['hidratáló', 'fényesítő', 'erősítő'])} 200 ml`,
      size: [200, 'ml'],
      price: [1290, 3990],
      tags: [],
    }),
    describe: (n) => `${n}. Könnyebben kifésülhető, puha haj.`,
  },
  {
    path: 'szepsegapolas/smink/alapozo',
    make: (r) => ({
      name: `Folyékony alapozó ${r.pick(shades)} 30 ml`,
      size: [30, 'ml'],
      price: [3990, 12990],
      tags: withFree(r, ['interest:smink']),
    }),
    describe: (n) => `${n}. Természetes hatású, rétegezhető fedés.`,
  },
  {
    path: 'szepsegapolas/smink/ruzs',
    make: (r) => ({
      name: `Krémes rúzs ${r.pick(lipColors)} 3,5 g`,
      size: [3.5, 'g'],
      price: [1990, 6990],
      tags: ['interest:smink', 'recipient:baratno'],
    }),
    describe: (n) => `${n}. Kényelmes, nem szárító rúzs szatén fénnyel.`,
  },
  {
    path: 'szepsegapolas/smink/szempillaspiral',
    make: (r) => ({
      name: `${r.pick(['Dúsító', 'Hosszabbító', 'Vízálló'])} szempillaspirál 10 ml`,
      size: [10, 'ml'],
      price: [1990, 6490],
      tags: ['interest:smink'],
    }),
    describe: (n) => `${n}. Pergésmentes, egész napos tartás.`,
  },
  {
    path: 'szepsegapolas/parfum/noi-parfum',
    make: (r) => {
      const size = r.pick([30, 50, 100])
      return {
        name: `${r.pick(perfumeNames)} Eau de Parfum ${size} ml`,
        size: [size, 'ml'],
        price: [9990, 45990],
        tags: [
          'interest:parfum',
          'recipient:baratno',
          'recipient:anya',
          'recipient:par',
          'occasion:szuletesnap',
          'occasion:karacsony',
        ],
      }
    },
    describe: (n) => `${n}. Virágos-meleg illat, ami a bőrön szépen kibontakozik.`,
  },
  {
    path: 'szepsegapolas/parfum/ferfi-parfum',
    make: (r) => ({
      name: `${r.pick(['Csendes Erdő', 'Tengeri Szél', 'Cédrus', 'Fekete Tea'])} Eau de Toilette 100 ml`,
      size: [100, 'ml'],
      price: [8990, 34990],
      tags: ['interest:parfum', 'recipient:apa', 'recipient:par', 'occasion:karacsony'],
    }),
    describe: (n) => `${n}. Fás, friss illat mindennapokra.`,
  },
  {
    path: 'ajandek/otthon/illatgyertya',
    make: (r) => ({
      name: `Illatgyertya ${r.pick(SCENTS)} 200 g`,
      size: [200, 'g'],
      price: [2990, 9990],
      tags: [
        'interest:otthon',
        'recipient:kollega',
        'recipient:baratno',
        'occasion:karacsony',
        'occasion:mikulas',
      ],
    }),
    describe: (n) => `${n}. Szójaviasz, pamutkanóc, hosszú égési idő.`,
  },
  {
    path: 'ajandek/otthon/illatosito',
    make: (r) => ({
      name: `Pálcás illatosító ${r.pick(SCENTS)} 100 ml`,
      size: [100, 'ml'],
      price: [3490, 11990],
      tags: ['interest:otthon', 'recipient:anya', 'occasion:nevnap'],
    }),
    describe: (n) => `${n}. Hetekig tartó, finom illat a lakásban.`,
  },
  {
    path: 'ajandek/divat/kendo',
    make: (r) => ({
      name: `Selyemkendő ${r.pick(['virágmintás', 'pöttyös', 'geometrikus', 'egyszínű'])}`,
      size: [1, 'db'],
      price: [4990, 16990],
      tags: ['interest:divat', 'recipient:anya', 'recipient:baratno'],
    }),
    describe: (n) => `${n}. Könnyű, sokféleképpen köthető kiegészítő.`,
  },
  {
    path: 'ajandek/divat/taska',
    make: (r) => ({
      name: `Bőr kézitáska ${r.pick(bagColors)}`,
      size: [1, 'db'],
      price: [14990, 39990],
      tags: ['interest:divat', 'recipient:par', 'recipient:anya'],
    }),
    describe: (n) => `${n}. Időtálló forma, belső zsebekkel.`,
  },
  {
    path: 'ajandek/ekszer',
    make: (r) => ({
      name: `Ezüst ${r.pick(jewels)}`,
      size: [1, 'db'],
      price: [5990, 24990],
      tags: [
        'interest:ekszer',
        'recipient:par',
        'recipient:baratno',
        'occasion:valentin',
        'occasion:evfordulo',
      ],
    }),
    describe: (n) => `${n}. 925-ös ezüst, díszdobozban.`,
  },
  {
    path: 'ajandek/ajandekcsomag',
    make: (r) => ({
      name: `Ajándékcsomag: ${r.pick(giftThemes)}`,
      size: [1, 'db'],
      price: [4990, 19990],
      tags: [
        'interest:wellness',
        'recipient:kollega',
        'recipient:anya',
        'occasion:karacsony',
        'occasion:mikulas',
        'occasion:nevnap',
      ],
    }),
    describe: (n) => `${n}. Összeválogatott, ajándékba csomagolt szett.`,
  },
  {
    path: 'ajandek/nyari-kedvencek',
    make: (r) => ({
      name: `${r.pick(['Strandtáska fonott', 'Napszemüveg tok bőr', 'Frissítő arcpermet 100 ml'])}`,
      size: null,
      price: [2990, 12990],
      tags: ['interest:utazas', 'recipient:baratno'],
    }),
    describe: (n) => `${n}. Nyári napokra, útra, strandra.`,
  },
]

export interface SeedProduct {
  slug: string
  name: string
  brand: string
  categoryPath: string
  gtin: string
  sizeValue: number | null
  sizeUnit: 'ml' | 'g' | 'db' | null
  basePriceHuf: number
  description: string
  tags: string[]
}

/** `count` darab determinisztikus termék; a slug egyedi (sorszám-utótaggal, ha kell). */
export function generateProducts(r: Rng, count: number): SeedProduct[] {
  const used = new Set<string>()
  const out: SeedProduct[] = []
  for (let i = 0; i < count; i++) {
    const t = TEMPLATES[i % TEMPLATES.length]!
    const brand = r.pick(DEMO_BRANDS)
    const made = t.make(r)
    const name = `${brand} ${made.name}`
    let slug = slugify(name)
    if (used.has(slug)) slug = `${slug}-${i}`
    used.add(slug)
    const [min, max] = made.price
    out.push({
      slug,
      name,
      brand,
      categoryPath: t.path,
      gtin: ean13(r),
      sizeValue: made.size?.[0] ?? null,
      sizeUnit: made.size?.[1] ?? null,
      basePriceHuf: roundPrice(min + r.next() * (max - min)),
      description: t.describe(name),
      tags: [...new Set(made.tags)],
    })
  }
  return out
}
