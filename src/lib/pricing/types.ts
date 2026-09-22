/** Egy ajánlat teljes költségének bontása (PRODUCT_SPEC 7.4). Minden érték egész forint. */
export interface CostBreakdown {
  priceHuf: number
  shippingHuf: number
  customsHuf: number
  totalHuf: number
  freeShipping: boolean
}

export type VerdictKind = 'deal' | 'usual' | 'pricier' | 'collecting'
