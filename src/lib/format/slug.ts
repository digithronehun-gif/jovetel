/**
 * Ékezetmentes, kisbetűs, kötőjeles slug (CLAUDE.md 9. pont): ő→o, ű→u, á→a…
 */
export function stripAccents(input: string): string {
  return input.normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

export function slugify(input: string, maxLength = 80): string {
  const base = stripAccents(input)
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/&/g, ' es ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (base.length <= maxLength) return base
  return base.slice(0, maxLength).replace(/-+[^-]*$/, '') || base.slice(0, maxLength)
}

/** Keresésre normalizált szöveg: ékezetmentes, kisbetűs, egyszerű szóközökkel. */
export function normalizeForSearch(input: string): string {
  return stripAccents(input).toLowerCase().replace(/\s+/g, ' ').trim()
}
