'use client'

import { Menu } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useRef, useState } from 'react'
import { IconButton } from '@/components/ui/IconButton'

// A lap (Radix Dialog) csak akkor töltődik le, amikor a menü gombja fölé ér az ujj/egér vagy fókuszt kap:
// a landing első betöltéséből így kimarad.
const MobileNavSheet = dynamic(() => import('./MobileNavSheet').then((m) => m.MobileNavSheet), { ssr: false })

export function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false)
  const [wanted, setWanted] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const prepare = () => setWanted(true)
  return (
    <>
      <IconButton
        ref={button}
        aria-label="Menü"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="md:hidden"
        onPointerEnter={prepare}
        onTouchStart={prepare}
        onFocus={prepare}
        onClick={() => {
          setWanted(true)
          setOpen(true)
        }}
      >
        <Menu aria-hidden />
      </IconButton>
      {wanted ? <MobileNavSheet links={links} open={open} onOpenChange={setOpen} returnFocusRef={button} /> : null}
    </>
  )
}
