'use client'

import { SlidersHorizontal } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Sheet, SheetContent } from '@/components/ui/Dialog'

/**
 * Mobilon a szűrők alsó lapban (PRODUCT_SPEC 5.2, DESIGN_SYSTEM 6. „Sheet”). A tartalom szerveroldali (linkek), így
 * egy szűrő kiválasztása után a lap nyitva marad és frissül; a „Találatok mutatása” zárja be.
 */
export function FilterSheet({ activeCount, total, children }: { activeCount: number; total: number; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  return (
    <>
      <Button ref={button} variant="secondary" size="sm" onClick={() => setOpen(true)} aria-haspopup="dialog" data-filter-open>
        <SlidersHorizontal aria-hidden />
        Szűrők{activeCount > 0 ? <span className="tabular-nums"> ({activeCount})</span> : null}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          title="Szűrők"
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            button.current?.focus()
          }}
        >
          {children}
          <div className="sticky bottom-0 -mx-6 -mb-6 border-t border-line bg-surface px-6 py-4">
            <Button className="w-full" onClick={() => setOpen(false)}>
              {total > 0 ? `${total.toLocaleString('hu-HU')} találat mutatása` : 'Bezárás'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
