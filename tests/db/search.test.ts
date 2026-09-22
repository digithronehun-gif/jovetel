import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { testSql } from './helpers'

const sql = testSql()

const PRODUCTS = [
  ['fp-parfum', 'Fehér Pézsma Eau de Parfüm 50 ml', 'Illatház', 'Szépségápolás Parfüm'],
  ['fp-parfumok', 'Illatos parfümök ajándékszettben', 'Illatház', 'Szépségápolás Parfüm'],
  ['cipo-noi', 'Női bőr cipő, konyak', 'Lépés', 'Divat'],
  ['cipok-tavasz', 'Tavaszi cipők könnyű talppal', 'Lépés', 'Divat'],
  ['szerum-c', 'C-vitaminos szérum 30 ml', 'Hajnalpír', 'Szépségápolás Arcápolás Szérum'],
  ['szerum-hial', 'Hialuronsavas szérumok duo', 'Hajnalpír', 'Szépségápolás Arcápolás Szérum'],
  ['krem', 'Mattító arckrém zsíros bőrre 50 ml', 'Mezei Derm', 'Szépségápolás Arcápolás Arckrém'],
] as const

async function find(q: string): Promise<string[]> {
  const rows = await sql<{ slug: string }[]>`
    select slug from public.products
    where slug in ${sql(PRODUCTS.map((p) => p[0]))} and search_vector @@ public.search_tsquery(${q})`
  return rows.map((r) => r.slug).sort()
}

beforeAll(async () => {
  for (const [slug, name, brand, cat] of PRODUCTS) {
    await sql`insert into public.products (slug, name, brand_name, category_text) values (${slug}, ${name}, ${brand}, ${cat})
      on conflict (slug) do nothing`
  }
})
afterAll(async () => {
  await sql`delete from public.products where slug in ${sql(PRODUCTS.map((p) => p[0]))}`
  await sql.end()
})

describe('ékezet- és ragozásfüggetlen keresés (F1 elfogadási kritérium)', () => {
  it('„parfum” megtalálja a „parfüm”-öt (és a „parfümök”-et)', async () => {
    expect(await find('parfum')).toEqual(['fp-parfum', 'fp-parfumok'])
  })
  it('„parfümök” és „parfum” ugyanarra fut (DATA_MODEL 1. pont)', async () => {
    expect(await find('parfümök')).toEqual(await find('parfum'))
  })
  it('„cipők” megtalálja a „cipő”-t', async () => {
    expect(await find('cipők')).toEqual(['cipo-noi', 'cipok-tavasz'])
  })
  it('„szerum” megtalálja a „szérum”-ot, és fordítva', async () => {
    expect(await find('szerum')).toEqual(['szerum-c', 'szerum-hial'])
    expect(await find('szérum')).toEqual(['szerum-c', 'szerum-hial'])
  })
  it('több szó: ÉS kapcsolat, ékezet nélkül is', async () => {
    expect(await find('arckrem zsiros')).toEqual(['krem'])
    expect(await find('szérum zsíros')).toEqual([])
  })
  it('töltelékszó önmagában nem ad találatot, és nem hibázik', async () => {
    expect(await find('a az')).toEqual([])
    expect(await find("'); drop table products; --")).toEqual([])
  })
  it('trigram-hasonlóság elírásra (név, ékezetmentesen)', async () => {
    const [r] = await sql<{ slug: string }[]>`
      select slug from public.products where name_normalized % public.f_normalize('hialuronsavs szerumk')
      order by similarity(name_normalized, public.f_normalize('hialuronsavs szerumk')) desc limit 1`
    expect(r?.slug).toBe('szerum-hial')
  })
})

describe('search_products (a keresőszolgáltatás alapja)', () => {
  it('relevancia szerint rendez, és elírásra trigrammal visszaesik', async () => {
    const hits = await sql<{ product_id: string; matched_by: string }[]>`
      select s.product_id, s.matched_by from public.search_products('hialuronsavs szerumk', 5) s`
    const [p] = await sql<
      { id: string }[]
    >`select id from public.products where slug = 'szerum-hial'`
    expect(hits.map((h) => h.product_id)).toContain(p!.id)
    expect(hits.find((h) => h.product_id === p!.id)?.matched_by).toBe('trigram')
  })
  it('üres és töltelékszavas kérdésre üres eredmény', async () => {
    expect(await sql`select * from public.search_products('', 5)`).toHaveLength(0)
    expect(await sql`select * from public.search_products('a', 5)`).toHaveLength(0)
  })
})
