'use client'

import { Bell, Heart, Library } from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { AlertTarget } from './PriceAlertDialog'

export type { AlertTarget } from './PriceAlertDialog'

// A célár-választó (Radix Dialog) csak akkor töltődik le, amikor a gomb fölé ér az ujj/egér vagy fókuszt kap:
// a termékoldal első betöltéséből így kimarad (mobil LCP, F5).
const PriceAlertDialog = dynamic(() => import('./PriceAlertDialog').then((m) => m.PriceAlertDialog), { ssr: false })

/**
 * A termékoldal műveletei (PRODUCT_SPEC 5.3): Szólj, ha olcsóbb lesz (célár: −5% / −10% / −20% / egyéni) · Listára ·
 * Polcra teszem. Vendégnél belépésre visznek `returnTo` + `pendingAction` paraméterrel (waitlist módban a várólistára);
 * a végrehajtás belépve az F7–F8-ban készül el. A linkek szerveroldalon készülnek (`loginHref`).
 */
export function ProductActions({
  targets,
  customHrefTemplate,
  listHref,
  shelfHref,
  mode,
  showShelf,
}: {
  targets: AlertTarget[]
  /** a `__AMOUNT__` helyére kerül az egyéni célár */
  customHrefTemplate: string
  listHref: string
  shelfHref: string
  mode: 'login' | 'waitlist'
  /** a Szépségpolc csak szépségápolási terméknél értelmes */
  showShelf: boolean
}) {
  const [open, setOpen] = useState(false)
  const [wanted, setWanted] = useState(false)
  const prepare = () => setWanted(true)
  const note =
    mode === 'login'
      ? 'Belépés után elmentjük, és szólunk, ha az ár a célár alá megy.'
      : 'A figyeléshez ingyenes tagság kell. Most várólistával indulunk: iratkozz fel, és szólunk, amikor bekapcsolhatod.'
  return (
    <div className="flex flex-wrap gap-2" data-product-actions>
      <Button
        aria-haspopup="dialog"
        onPointerEnter={prepare}
        onTouchStart={prepare}
        onFocus={prepare}
        onClick={() => {
          setWanted(true)
          setOpen(true)
        }}
        data-action="price-alert"
      >
        <Bell aria-hidden />
        Szólj, ha olcsóbb lesz
      </Button>
      <Button asChild variant="secondary">
        <Link href={listHref} data-action="list">
          <Heart aria-hidden />
          Listára
        </Link>
      </Button>
      {showShelf ? (
        <Button asChild variant="secondary">
          <Link href={shelfHref} data-action="shelf">
            <Library aria-hidden />
            Polcra teszem
          </Link>
        </Button>
      ) : null}
      {wanted ? (
        <PriceAlertDialog
          open={open}
          onOpenChange={setOpen}
          targets={targets}
          customHrefTemplate={customHrefTemplate}
          note={note}
        />
      ) : null}
    </div>
  )
}
