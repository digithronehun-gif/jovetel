import { describe, expect, it } from 'vitest'
import { AVOID_INGREDIENTS, SKIN_TYPES } from '@/lib/db/schema/users'
import {
  activeBand,
  cleanQuery,
  DEFAULT_STATE,
  FREE_FILTERS,
  hasFilters,
  MAX_PAGE,
  parseSearchState,
  searchHref,
  SKIN_FILTERS,
  toggle,
  toSearchParams,
  whyForYou,
  withChange,
  type SearchProfile,
} from '@/lib/search'

const parse = (qs: string) => parseSearchState(new URLSearchParams(qs))

describe('URL-állapot (PRODUCT_SPEC 5.2)', () => {
  it('üres URL → alapállapot', () => {
    expect(parse('')).toEqual(DEFAULT_STATE)
  })
  it('minden szűrő beolvasása és kanonikus visszaírása', () => {
    const s = parse('q=szérum+zsíros+bőrre&kategoria=szepsegapolas/arcapolas&marka=hajnalpir,lumen-botanica&bolt=demo-illat-haza&ar_min=1000&ar_max=9999&keszleten=1&akcio=1&bor=zsiros,kombinalt&mentes=illatanyag&rendezes=ar&oldal=3')
    expect(s).toEqual({
      q: 'szérum zsíros bőrre',
      category: 'szepsegapolas/arcapolas',
      brands: ['hajnalpir', 'lumen-botanica'],
      merchants: ['demo-illat-haza'],
      priceMin: 1000,
      priceMax: 9999,
      inStock: true,
      deal: true,
      skin: ['kombinalt', 'zsiros'],
      free: ['illatanyag'],
      sort: 'ar',
      page: 3,
    })
    // oda-vissza ugyanaz az állapot
    expect(parseSearchState(toSearchParams(s))).toEqual(s)
  })
  it('ismételt paraméter és vessző is működik; ismétlődés és kis-nagybetű normalizálva', () => {
    expect(parse('marka=B&marka=a,b').brands).toEqual(['a', 'b'])
  })
  it('hibás értékek csendben kimaradnak (nincs hibaoldal egy elgépelt linkre)', () => {
    const s = parse("marka=<script>,ok-slug&bor=lila,zsiros&mentes=semmi&rendezes=jutalek&oldal=-2&ar_min=abc&ar_max=1e99&kategoria=../../etc&keszleten=igen")
    expect(s).toMatchObject({ brands: ['ok-slug'], skin: ['zsiros'], free: [], sort: 'relevancia', page: 1, priceMin: null, priceMax: null, category: null, inStock: false })
  })
  it('fordított ártartomány felcserélve; a lapozás felső korlátja', () => {
    expect(parse('ar_min=9000&ar_max=1000')).toMatchObject({ priceMin: 1000, priceMax: 9000 })
    expect(parse('oldal=9999').page).toBe(MAX_PAGE)
  })
  it('a keresőszöveg tisztítva és hosszra vágva', () => {
    expect(cleanQuery('  szérum\u0000​  zsíros \n bőrre ')).toBe('szérum zsíros bőrre')
    expect(cleanQuery('a'.repeat(500))).toHaveLength(120)
  })
  it('kanonikus URL: az alapértékek kimaradnak, a kategóriaoldalon a kategória az útvonalban van', () => {
    expect(searchHref('/kereses', DEFAULT_STATE)).toBe('/kereses')
    const s = { ...DEFAULT_STATE, category: 'ajandek', deal: true }
    expect(searchHref('/kategoria/ajandek', s, { omitCategory: true })).toBe('/kategoria/ajandek?akcio=1')
    expect(searchHref('/kereses', { ...s, q: 'gyertya' })).toBe('/kereses?q=gyertya&kategoria=ajandek&akcio=1')
  })
  it('szűrőváltás az 1. oldalra visz; toggle; ársáv; hasFilters', () => {
    expect(withChange({ ...DEFAULT_STATE, page: 4 }, { deal: true })).toMatchObject({ page: 1, deal: true })
    expect(toggle(['a', 'c'], 'b')).toEqual(['a', 'b', 'c'])
    expect(toggle(['a', 'b'], 'a')).toEqual(['b'])
    expect(activeBand({ priceMin: 5000, priceMax: 14999 })).toBe('5_15')
    expect(activeBand({ priceMin: 5000, priceMax: 15000 })).toBeNull()
    expect(hasFilters(DEFAULT_STATE)).toBe(false)
    expect(hasFilters({ ...DEFAULT_STATE, q: 'x', category: 'ajandek' })).toBe(false)
    expect(hasFilters({ ...DEFAULT_STATE, free: ['alkohol'] })).toBe(true)
  })
  it('a szűrők szótára a profil szótára (bőrtípus a „nem tudom” nélkül, kerülendő összetevők)', () => {
    expect([...SKIN_FILTERS]).toEqual(SKIN_TYPES.filter((s) => s !== 'nem_tudom'))
    expect([...FREE_FILTERS]).toEqual([...AVOID_INGREDIENTS])
  })
})

describe('„Miért neked” címkék (PRODUCT_SPEC 7.1)', () => {
  const profile: SearchProfile = {
    skinType: 'zsiros',
    skinConcerns: ['pigmentfolt'],
    avoidIngredients: ['alkohol', 'illatanyag'],
    budgetMaxHuf: 10000,
    favoriteMerchantIds: ['m1'],
  }
  const tags = ['skin_type:zsiros', 'free_from:illatanyag', 'concern:pigmentfolt']
  it('prioritás szerint, legfeljebb 3', () => {
    expect(whyForYou({ tags, totalHuf: 5000, verdict: 'deal', merchantId: 'm1' }, { profile })).toEqual([
      'Zsíros bőrre',
      'Illatmentes',
      'Pigmentfoltokra',
    ])
    expect(whyForYou({ tags: [], totalHuf: 5000, verdict: 'deal', merchantId: 'm1' }, { profile })).toEqual([
      'A kereteden belül',
      '30 napja nem volt ilyen olcsó',
      'A kedvenc boltodban',
    ])
  })
  it('vendégnél csak a keret (ha a szűrőben megadta) és az ítélet', () => {
    expect(whyForYou({ tags, totalHuf: 5000, verdict: 'deal', merchantId: 'm1' }, {})).toEqual(['30 napja nem volt ilyen olcsó'])
    expect(whyForYou({ tags, totalHuf: 5000, verdict: 'usual', merchantId: 'm1' }, { budgetMaxHuf: 5000 })).toEqual(['A kereteden belül'])
    expect(whyForYou({ tags, totalHuf: 5001, verdict: 'pricier', merchantId: 'm1' }, { budgetMaxHuf: 5000 })).toEqual([])
  })
  it('nem egyező címke nem ad indoklást', () => {
    expect(whyForYou({ tags: ['skin_type:szaraz'], totalHuf: 20000, verdict: null, merchantId: 'x' }, { profile })).toEqual([])
  })
})
