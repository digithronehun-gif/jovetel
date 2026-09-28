/**
 * A megjelenített terméknév: a feedek gyakran a márkával kezdik a nevet („Hajnalpír Rózsavizes arctonik”), a kártyán
 * viszont a márka külön sorban áll — a név elejéről levesszük, ha pontosan egyezik (kis-nagybetűtől függetlenül).
 */
export function displayProductName(name: string, brand: string | null | undefined): string {
  if (!brand) return name
  const b = brand.trim()
  if (b && name.length > b.length + 1 && name.toLocaleLowerCase('hu-HU').startsWith(`${b.toLocaleLowerCase('hu-HU')} `)) {
    const rest = name.slice(b.length + 1).trim()
    return rest ? rest.charAt(0).toLocaleUpperCase('hu-HU') + rest.slice(1) : name
  }
  return name
}

/** Kiszerelés: „50 ml”, „3,5 g”, „1 db” (magyar tizedesvesszővel). */
export function formatSize(value: number | null | undefined, unit: 'ml' | 'g' | 'db' | null | undefined): string | null {
  if (value == null || !unit) return null
  return `${value.toLocaleString('hu-HU', { maximumFractionDigits: 2 })}\u00a0${unit}`
}
