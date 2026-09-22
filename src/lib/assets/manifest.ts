import manifestJson from '../../content/brand/assets.manifest.json'

export type AssetLicense = 'moodboard-dev-only' | 'own' | 'licensed' | 'partner'

export interface BrandImage {
  id: string
  src: string
  width: number
  height: number
  orientation: 'portrait' | 'landscape' | 'square'
  collection?: string
  alt: string
  dominantColor: string
  blurDataURL: string
  source: string
  license: AssetLicense
  /** partnerkép lejárata (ISO dátum) */
  validUntil?: string
  partnerProgramId?: string
  licenseId?: string
  originalFilename?: string
}

/** Minden képhely azonosítója a manifestből — elgépelés fordítási hiba. */
export type SlotId = keyof typeof manifestJson.slots

export interface AssetManifest {
  version: number
  assets: BrandImage[]
  slots: Record<SlotId, string[]>
}

export const manifest = manifestJson as unknown as AssetManifest

export const SLOT_IDS = Object.keys(manifest.slots) as SlotId[]
