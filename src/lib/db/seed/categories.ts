import type { SlotId } from '../../assets/manifest'

export interface CategoryDef {
  slug: string
  name: string
  slot?: SlotId
  children?: CategoryDef[]
}

/** Kategóriafa: szépségápolás és ajándék, képhelyekkel (DATA_MODEL 6. pont). */
export const CATEGORY_TREE: CategoryDef[] = [
  {
    slug: 'szepsegapolas',
    name: 'Szépségápolás',
    slot: 'kategoria.szepsegapolas',
    children: [
      {
        slug: 'arcapolas',
        name: 'Arcápolás',
        slot: 'kategoria.arcapolas',
        children: [
          { slug: 'szerum', name: 'Szérum' },
          { slug: 'arckrem', name: 'Arckrém' },
          { slug: 'arctisztito', name: 'Arctisztító' },
          { slug: 'arcmaszk', name: 'Arcmaszk' },
        ],
      },
      { slug: 'szemkornyek', name: 'Szemkörnyékápolás', slot: 'kategoria.szemkornyek' },
      {
        slug: 'napvedelem',
        name: 'Napvédelem',
        slot: 'kategoria.napvedelem',
        children: [
          { slug: 'fenyvedo-arcra', name: 'Fényvédő arcra' },
          { slug: 'fenyvedo-testre', name: 'Fényvédő testre' },
        ],
      },
      {
        slug: 'testapolas',
        name: 'Testápolás',
        slot: 'kategoria.testapolas',
        children: [
          { slug: 'tusfurdo', name: 'Tusfürdő' },
          { slug: 'testapolo', name: 'Testápoló' },
        ],
      },
      {
        slug: 'hajapolas',
        name: 'Hajápolás',
        children: [
          { slug: 'sampon', name: 'Sampon' },
          { slug: 'hajbalzsam', name: 'Hajbalzsam' },
        ],
      },
      {
        slug: 'smink',
        name: 'Smink',
        slot: 'kategoria.smink',
        children: [
          { slug: 'alapozo', name: 'Alapozó' },
          { slug: 'ruzs', name: 'Rúzs' },
          { slug: 'szempillaspiral', name: 'Szempillaspirál' },
        ],
      },
      {
        slug: 'parfum',
        name: 'Parfüm',
        slot: 'kategoria.parfum',
        children: [
          { slug: 'noi-parfum', name: 'Női parfüm' },
          { slug: 'ferfi-parfum', name: 'Férfi parfüm' },
        ],
      },
    ],
  },
  {
    slug: 'ajandek',
    name: 'Ajándék',
    slot: 'kategoria.ajandek',
    children: [
      {
        slug: 'otthon',
        name: 'Otthon',
        slot: 'kategoria.otthon',
        children: [
          { slug: 'illatgyertya', name: 'Illatgyertya' },
          { slug: 'illatosito', name: 'Illatosító' },
        ],
      },
      {
        slug: 'divat',
        name: 'Divat',
        slot: 'kategoria.divat',
        children: [
          { slug: 'kendo', name: 'Kendő, sál' },
          { slug: 'taska', name: 'Táska' },
        ],
      },
      { slug: 'ekszer', name: 'Ékszer', slot: 'kategoria.ekszer' },
      { slug: 'ajandekcsomag', name: 'Ajándékcsomag' },
      { slug: 'nyari-kedvencek', name: 'Nyári kedvencek', slot: 'kategoria.nyar' },
    ],
  },
]

export interface FlatCategory {
  slug: string
  name: string
  path: string
  parentPath: string | null
  slot: SlotId | null
  sort: number
  depth: number
}

export function flattenCategories(
  tree = CATEGORY_TREE,
  parent: FlatCategory | null = null,
): FlatCategory[] {
  return tree.flatMap((c, i) => {
    const path = parent ? `${parent.path}/${c.slug}` : c.slug
    const flat: FlatCategory = {
      slug: c.slug,
      name: c.name,
      path,
      parentPath: parent?.path ?? null,
      slot: c.slot ?? parent?.slot ?? null,
      sort: i,
      depth: parent ? parent.depth + 1 : 0,
    }
    return [flat, ...flattenCategories(c.children ?? [], flat)]
  })
}

/** Fogyási alapértékek (PRODUCT_SPEC 7.5) — [BECSLÉS], az adminban szerkeszthető. */
export const USAGE_DEFAULTS: { path: string; unit: 'ml' | 'g'; daily: number }[] = [
  { path: 'szepsegapolas/arcapolas/szerum', unit: 'ml', daily: 0.3 },
  { path: 'szepsegapolas/arcapolas/arckrem', unit: 'ml', daily: 0.6 },
  { path: 'szepsegapolas/szemkornyek', unit: 'ml', daily: 0.1 },
  { path: 'szepsegapolas/napvedelem/fenyvedo-arcra', unit: 'ml', daily: 1.0 },
  { path: 'szepsegapolas/testapolas/tusfurdo', unit: 'ml', daily: 8 },
  { path: 'szepsegapolas/testapolas/testapolo', unit: 'ml', daily: 4 },
  { path: 'szepsegapolas/hajapolas/sampon', unit: 'ml', daily: 7 },
  { path: 'szepsegapolas/parfum/noi-parfum', unit: 'ml', daily: 0.3 },
  { path: 'szepsegapolas/parfum/ferfi-parfum', unit: 'ml', daily: 0.3 },
  { path: 'szepsegapolas/smink/alapozo', unit: 'ml', daily: 0.4 },
]
