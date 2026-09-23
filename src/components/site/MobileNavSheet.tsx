'use client'

import Link from 'next/link'
import type { RefObject } from 'react'
import { Sheet, SheetContent } from '@/components/ui/Dialog'

/** A mobilmenü lapja: külön csomag, csak az első megnyitás előtt töltődik be (MobileNav). */
export function MobileNavSheet({
  links,
  open,
  onOpenChange,
  returnFocusRef,
}: {
  links: { href: string; label: string }[]
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Trigger nélkül a Radix nem tudja, hová adja vissza a fókuszt: a menü gombjára */
  returnFocusRef: RefObject<HTMLButtonElement | null>
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title="Menü"
        hideTitle
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          returnFocusRef.current?.focus()
        }}
      >
        <nav aria-label="Mobil navigáció" className="flex flex-col pt-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => onOpenChange(false)}
              className="flex min-h-12 items-center border-b border-line text-body-l text-ink last:border-b-0"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
