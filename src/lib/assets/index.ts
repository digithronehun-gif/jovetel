/**
 * Képhely-rendszer (CLAUDE.md 7. vasszabály, DESIGN_SYSTEM 8. pont).
 * A komponensek képet csak képhelyen keresztül kérnek; fájlnévre soha nem hivatkoznak.
 */
import { manifest, SLOT_IDS, type AssetManifest, type BrandImage, type SlotId } from './manifest'

export type { AssetLicense, BrandImage, SlotId } from './manifest'
export { SLOT_IDS } from './manifest'

export interface LicenseContext {
  /** Engedélyezett-e a `moodboard-dev-only` licenc (fejlesztés vagy ALLOW_DEV_IMAGES=true). */
  allowDevImages: boolean
  now: Date
}

/** A futási környezetből: fejlesztésben igen; production buildben csak ALLOW_DEV_IMAGES=true mellett. */
export function devImagesAllowed(env?: Record<string, string | undefined>): boolean {
  // Literális `process.env.ALLOW_DEV_IMAGES`: a next.config `env` blokkja így build-időben beégeti,
  // vagyis a build-kori tudatos döntés érvényes a `next start` futásidejében is.
  const allow = env ? env.ALLOW_DEV_IMAGES : process.env.ALLOW_DEV_IMAGES
  const nodeEnv = env ? env.NODE_ENV : process.env.NODE_ENV
  if (allow === 'true') return true
  if (allow === 'false') return false
  return nodeEnv !== 'production'
}

export function currentLicenseContext(): LicenseContext {
  return { allowDevImages: devImagesAllowed(), now: new Date() }
}

export function isLicenseAllowed(image: BrandImage, ctx: LicenseContext): boolean {
  switch (image.license) {
    case 'own':
    case 'licensed':
      return true
    case 'partner':
      return !image.validUntil || new Date(image.validUntil).getTime() >= ctx.now.getTime()
    case 'moodboard-dev-only':
      return ctx.allowDevImages
    default:
      return false
  }
}

const byId = new Map(manifest.assets.map((a) => [a.id, a]))

function candidates(slot: SlotId, m: AssetManifest = manifest): BrandImage[] {
  const ids = m.slots[slot]
  if (!ids) throw new Error(`Ismeretlen képhely: ${slot}`)
  const map = m === manifest ? byId : new Map(m.assets.map((a) => [a.id, a]))
  return ids.map((id) => {
    const img = map.get(id)
    if (!img) throw new Error(`A(z) ${slot} képhely nem létező képre hivatkozik: ${id}`)
    return img
  })
}

export class SlotUnavailableError extends Error {
  constructor(public readonly slot: SlotId) {
    super(
      `A(z) „${slot}” képhelynek nincs az aktuális környezetben engedélyezett képe. ` +
        'Tegyél a listája elejére own / licensed / partner licencű képet (lásd DESIGN_SYSTEM 8. pont).',
    )
  }
}

/**
 * A képhely listájának első, az aktuális környezetben engedélyezett eleme.
 * Ha tájolást kérsz, először az annak megfelelő engedélyezett képet keresi, különben az elsőt adja.
 */
export function getSlotImage(
  slot: SlotId,
  opts: {
    orientation?: 'portrait' | 'landscape'
    ctx?: LicenseContext
    manifest?: AssetManifest
  } = {},
): BrandImage {
  const ctx = opts.ctx ?? currentLicenseContext()
  const allowed = candidates(slot, opts.manifest).filter((img) => isLicenseAllowed(img, ctx))
  const match = opts.orientation
    ? allowed.find((i) => i.orientation === opts.orientation)
    : undefined
  const img = match ?? allowed[0]
  if (!img) throw new SlotUnavailableError(slot)
  return img
}

/** A képhely első `count` engedélyezett képe (kevesebb is lehet, ha nincs annyi). */
export function getSlotImages(
  slot: SlotId,
  count: number,
  opts: { ctx?: LicenseContext; manifest?: AssetManifest } = {},
): BrandImage[] {
  const ctx = opts.ctx ?? currentLicenseContext()
  const allowed = candidates(slot, opts.manifest).filter((img) => isLicenseAllowed(img, ctx))
  if (allowed.length === 0) throw new SlotUnavailableError(slot)
  return allowed.slice(0, Math.max(0, count))
}

export interface SlotReport {
  slot: SlotId
  imageId: string | null
  license: BrandImage['license'] | null
  usesDevImage: boolean
  /** production-ben (dev képek nélkül) marad-e engedélyezett kép */
  productionReady: boolean
}

/** Képhelyenkénti állapot a check:assets és az admin felület számára. */
export function slotReport(
  opts: { ctx?: LicenseContext; manifest?: AssetManifest } = {},
): SlotReport[] {
  const ctx = opts.ctx ?? currentLicenseContext()
  const prodCtx: LicenseContext = { allowDevImages: false, now: ctx.now }
  const m = opts.manifest ?? manifest
  return (Object.keys(m.slots) as SlotId[]).map((slot) => {
    const list = candidates(slot, m)
    const current = list.find((i) => isLicenseAllowed(i, ctx)) ?? null
    const prod = list.find((i) => isLicenseAllowed(i, prodCtx)) ?? null
    return {
      slot,
      imageId: current?.id ?? null,
      license: current?.license ?? null,
      usesDevImage: current?.license === 'moodboard-dev-only',
      productionReady: prod !== null,
    }
  })
}

export class UnlicensedImagesError extends Error {
  constructor(public readonly slots: SlotId[]) {
    super(
      'A production buildben moodboard-dev-only (fejlesztési) képek maradtak ezeken a képhelyeken:\n' +
        slots.map((s) => `  - ${s}`).join('\n') +
        '\nCseréld őket own / licensed / partner képre (docs/SEGEDPROMPTOK.md → „Képek cseréje”),\n' +
        'vagy tudatos döntéssel állítsd be: ALLOW_DEV_IMAGES=true.',
    )
  }
}

/**
 * Build közben fut (7. vasszabály). Production buildben ALLOW_DEV_IMAGES=true nélkül hibát dob,
 * ha bármely képhely csak fejlesztési képpel oldható fel.
 */
export function assertLicensedForProduction(
  env: Record<string, string | undefined> = process.env,
  opts: { manifest?: AssetManifest; now?: Date } = {},
): { devImagesInUse: SlotId[] } {
  const now = opts.now ?? new Date()
  const report = slotReport({ ctx: { allowDevImages: true, now }, manifest: opts.manifest })
  const devOnly = report.filter((r) => !r.productionReady).map((r) => r.slot)
  const isProductionBuild = env.NODE_ENV === 'production'
  if (isProductionBuild && env.ALLOW_DEV_IMAGES !== 'true' && devOnly.length > 0) {
    throw new UnlicensedImagesError(devOnly)
  }
  return { devImagesInUse: devOnly }
}

export const ALL_SLOTS: readonly SlotId[] = SLOT_IDS
