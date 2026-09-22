'use client'

import { Menu } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/Dialog'
import { IconButton } from '@/components/ui/IconButton'

export function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <IconButton aria-label="Menü" className="md:hidden">
          <Menu aria-hidden />
        </IconButton>
      </SheetTrigger>
      <SheetContent title="Menü" hideTitle>
        <nav aria-label="Mobil navigáció" className="flex flex-col pt-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
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
