import { SLOT_IDS, type SlotId } from './manifest'

/** Adatbázisból (pl. categories.slot_id, lists.cover_slot) jövő képhely-azonosító ellenőrzése. */
export function asSlotId(value: string | null | undefined): SlotId | null {
  return value && (SLOT_IDS as readonly string[]).includes(value) ? (value as SlotId) : null
}
