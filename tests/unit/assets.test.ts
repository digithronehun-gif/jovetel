import { describe, expect, it } from 'vitest'
import {
  assertLicensedForProduction,
  devImagesAllowed,
  getSlotImage,
  getSlotImages,
  SLOT_IDS,
  slotReport,
  SlotUnavailableError,
  UnlicensedImagesError,
  type BrandImage,
} from '@/lib/assets'
import type { AssetManifest } from '@/lib/assets/manifest'
import { manifest } from '@/lib/assets/manifest'

const DEV = { allowDevImages: true, now: new Date('2026-09-22') }
const PROD = { allowDevImages: false, now: new Date('2026-09-22') }

function img(
  id: string,
  license: BrandImage['license'],
  extra: Partial<BrandImage> = {},
): BrandImage {
  return {
    id,
    src: `/x/${id}.webp`,
    width: 736,
    height: 920,
    orientation: 'portrait',
    alt: id,
    dominantColor: '#000000',
    blurDataURL: 'data:,',
    source: 'test',
    license,
    ...extra,
  }
}

const testManifest: AssetManifest = {
  version: 1,
  assets: [
    img('dev1', 'moodboard-dev-only'),
    img('own1', 'own', { orientation: 'landscape' }),
    img('partnerOld', 'partner', { validUntil: '2026-01-01' }),
    img('partnerNew', 'partner', { validUntil: '2027-01-01' }),
  ],
  slots: {
    'landing.hero': ['dev1', 'own1'],
    'landing.ai': ['partnerOld', 'dev1'],
    'landing.bizalom': ['partnerOld', 'partnerNew'],
  } as AssetManifest['slots'],
}

describe('képhely-feloldás', () => {
  it('a valódi manifest mind a 42 képhelye létező képre mutat', () => {
    expect(SLOT_IDS.length).toBe(42)
    expect(manifest.assets.length).toBe(38)
    for (const slot of SLOT_IDS) expect(() => getSlotImage(slot, { ctx: DEV })).not.toThrow()
  })
  it('fejlesztésben az első elemet adja, productionben átugorja a dev-only képet', () => {
    expect(getSlotImage('landing.hero', { ctx: DEV, manifest: testManifest }).id).toBe('dev1')
    expect(getSlotImage('landing.hero', { ctx: PROD, manifest: testManifest }).id).toBe('own1')
  })
  it('lejárt partnerkép automatikusan kiesik', () => {
    expect(getSlotImage('landing.bizalom', { ctx: PROD, manifest: testManifest }).id).toBe(
      'partnerNew',
    )
  })
  it('engedélyezett kép nélkül hibát dob', () => {
    expect(() => getSlotImage('landing.ai', { ctx: PROD, manifest: testManifest })).toThrow(
      SlotUnavailableError,
    )
  })
  it('tájolás szerinti választás', () => {
    expect(
      getSlotImage('landing.hero', { ctx: DEV, orientation: 'landscape', manifest: testManifest })
        .id,
    ).toBe('own1')
  })
  it('getSlotImages több képet ad sorrendben', () => {
    expect(
      getSlotImages('landing.hero', 5, { ctx: DEV, manifest: testManifest }).map((i) => i.id),
    ).toEqual(['dev1', 'own1'])
  })
  it('jelentés: melyik képhely nem élesíthető', () => {
    const r = slotReport({ ctx: DEV, manifest: testManifest })
    expect(r.find((x) => x.slot === 'landing.ai')?.productionReady).toBe(false)
    expect(r.find((x) => x.slot === 'landing.hero')?.usesDevImage).toBe(true)
  })
})

describe('assertLicensedForProduction (7. vasszabály)', () => {
  it('production buildben ALLOW_DEV_IMAGES nélkül leáll és listázza a képhelyeket', () => {
    try {
      assertLicensedForProduction({ NODE_ENV: 'production' }, { manifest: testManifest })
      expect.unreachable()
    } catch (e) {
      expect(e).toBeInstanceOf(UnlicensedImagesError)
      expect((e as UnlicensedImagesError).slots).toEqual(['landing.ai'])
    }
  })
  it('ALLOW_DEV_IMAGES=true tudatos döntéssel átengedi, de jelzi', () => {
    const r = assertLicensedForProduction(
      { NODE_ENV: 'production', ALLOW_DEV_IMAGES: 'true' },
      { manifest: testManifest },
    )
    expect(r.devImagesInUse).toEqual(['landing.ai'])
  })
  it('a jelenlegi manifest production-ben (flag nélkül) megállítja a buildet', () => {
    expect(() => assertLicensedForProduction({ NODE_ENV: 'production' })).toThrow(
      UnlicensedImagesError,
    )
  })
  it('devImagesAllowed a környezetből', () => {
    expect(devImagesAllowed({ NODE_ENV: 'development' })).toBe(true)
    expect(devImagesAllowed({ NODE_ENV: 'production' })).toBe(false)
    expect(devImagesAllowed({ NODE_ENV: 'production', ALLOW_DEV_IMAGES: 'true' })).toBe(true)
  })
})

describe('imageServingRules (7. vasszabály a nyilvános fájlokra)', () => {
  it('fejlesztési képek engedélyezve: nincs tiltás, nincs szűkítés', async () => {
    const { imageServingRules } = await import('@/lib/assets')
    expect(imageServingRules(true)).toEqual({ blockedPrefixes: [], localPatterns: undefined })
  })
  it('nem engedélyezve: a moodboard könyvtár tiltott, az optimalizáló csak a licencelt képeket és az ikonokat kapja', async () => {
    const { imageServingRules } = await import('@/lib/assets')
    const r = imageServingRules(false)
    expect(r.blockedPrefixes).toContain('/brand/moodboard')
    expect(r.localPatterns?.some((p) => p.pathname.startsWith('/brand/moodboard'))).toBe(false)
    expect(r.localPatterns).toContainEqual({ pathname: '/icons/**' })
  })
})
