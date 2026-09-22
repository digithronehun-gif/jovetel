'use client'

import { X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from './cn'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

function Overlay() {
  return (
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay data-[state=open]:animate-[fade-in_250ms_var(--ease-sun)]" />
  )
}

interface ContentProps extends Omit<ComponentProps<typeof DialogPrimitive.Content>, 'title'> {
  title: ReactNode
  description?: ReactNode
  hideTitle?: boolean
}

function Header({
  title,
  description,
  hideTitle,
}: Pick<ContentProps, 'title' | 'description' | 'hideTitle'>) {
  return (
    <div className={cn('flex flex-col gap-1 pr-10', hideTitle && 'sr-only')}>
      <DialogPrimitive.Title className="text-title text-ink">{title}</DialogPrimitive.Title>
      {description ? (
        <DialogPrimitive.Description className="text-body text-ink-muted">
          {description}
        </DialogPrimitive.Description>
      ) : null}
    </div>
  )
}

function CloseButton() {
  return (
    <DialogPrimitive.Close
      aria-label="Bezárás"
      className="absolute top-3 right-3 inline-flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-stone hover:text-ink focus-visible:outline-2 focus-visible:outline-amber-deep"
    >
      <X aria-hidden className="size-5" />
    </DialogPrimitive.Close>
  )
}

/** Középre igazított párbeszédablak, fókuszcsapdával (Radix). */
export function DialogContent({
  className,
  children,
  title,
  description,
  hideTitle,
  ...props
}: ContentProps) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-5 overflow-y-auto rounded-xl bg-surface p-6 shadow-lift',
          'data-[state=open]:animate-[rise-in_250ms_var(--ease-sun)]',
          className,
        )}
        {...props}
      >
        <Header title={title} description={description} hideTitle={hideTitle} />
        {children}
        <CloseButton />
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close

/** Mobilon alsó lap (szűrők, célár-választó); desktopon jobb oldali panel. */
export function SheetContent({
  className,
  children,
  title,
  description,
  hideTitle,
  ...props
}: ContentProps) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col gap-5 overflow-y-auto rounded-t-xl bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-lift',
          'md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[26rem] md:rounded-l-xl md:rounded-tr-none',
          'data-[state=open]:animate-[sheet-up_250ms_var(--ease-sun)]',
          className,
        )}
        {...props}
      >
        <div aria-hidden className="mx-auto -mt-2 h-1 w-10 rounded-full bg-line md:hidden" />
        <Header title={title} description={description} hideTitle={hideTitle} />
        {children}
        <CloseButton />
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
