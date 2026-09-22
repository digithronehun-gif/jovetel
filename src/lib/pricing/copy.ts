import type { VerdictKind } from './types'

/**
 * A „Valódi akció?” ítélet szövegei (PRODUCT_SPEC 7.3). Semleges, tényszerű nyelv;
 * kereskedőt minősítő szó nincs (6. vasszabály).
 */
export const VERDICT_LABEL: Record<VerdictKind, string> = {
  deal: 'Valódi akció',
  usual: 'Szokásos ár',
  pricier: 'Most drágább',
  collecting: 'Gyűjtjük',
}

export function verdictExplanation(kind: VerdictKind, daysTracked?: number): string {
  switch (kind) {
    case 'deal':
      return '30 napja nem volt ilyen olcsó ennél a boltnál.'
    case 'pricier':
      return 'Most drágább a szokásosnál.'
    case 'usual':
      return 'Nagyjából ennyibe szokott kerülni.'
    case 'collecting':
      return `Még gyűjtjük az ártörténetet (${daysTracked ?? 0} napja figyeljük).`
  }
}

/** Ha a feed kedvezményt jelez, de a saját ártörténetünk szerint nem valódi. */
export const FEED_DISCOUNT_NOTE =
  'A bolt kedvezményt jelez, de az elmúlt 30 napban volt már ennyi vagy kevesebb is.'
