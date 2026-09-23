import { describe, expect, it } from 'vitest'
import { AVOID_INGREDIENTS, SKIN_CONCERNS, SKIN_TYPES } from '@/lib/db/schema/users'
import { TAG_RULES } from '@/lib/ingestion/normalize/tags'

describe('címkeszótár', () => {
  it('a szabályok csak a profil szótárának értékeit használják', () => {
    for (const { tag } of TAG_RULES) {
      const [kind, value] = tag.split(':') as [string, string]
      const allowed =
        kind === 'skin_type' ? SKIN_TYPES : kind === 'concern' ? SKIN_CONCERNS : kind === 'free_from' ? AVOID_INGREDIENTS : []
      expect(allowed as readonly string[], tag).toContain(value)
    }
  })
  it('minden gondra és kerülendő összetevőre van szabály', () => {
    const tags = new Set(TAG_RULES.map((r) => r.tag))
    for (const c of SKIN_CONCERNS) expect(tags.has(`concern:${c}`), c).toBe(true)
    for (const a of AVOID_INGREDIENTS) expect(tags.has(`free_from:${a}`), a).toBe(true)
  })
})
