import { Price } from '@/components/app/PriceBlock'
import { PRICE_BAND_LABEL } from '@/content/labels'
import { PRICE_BANDS, type PriceBand } from '@/lib/search'

/** Ársáv felirata: a forintösszeg is a Price komponensből jön (minden „Ft” PriceBlock-ban, 1. vasszabály). */
export function PriceBandLabel({ band }: { band: PriceBand }) {
  if (band === 'u5') {
    return (
      <>
        <Price huf={(PRICE_BANDS.u5.max ?? 4999) + 1} className="font-normal" /> alatt
      </>
    )
  }
  return <>{PRICE_BAND_LABEL[band]}</>
}
