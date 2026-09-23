import type { ReactNode } from 'react'
import { cn } from '@/components/ui/cn'
import { SlotImage } from '@/components/ui/SlotImage'
import type { SlotId } from '@/lib/assets'

/**
 * Editorial kép–szöveg sáv (DESIGN_SYSTEM 7. pont): keretezett kép (--r-xl, max. ~480 CSS px, mert a képek
 * 736 px szélesek), mellette a szöveg; `flip` esetén a kép jobbra kerül.
 */
export function Band({
  id,
  slot,
  flip = false,
  children,
  className,
  imageAspect = '4/5',
}: {
  id?: string
  slot: SlotId
  flip?: boolean
  children: ReactNode
  className?: string
  imageAspect?: string
}) {
  return (
    <section id={id} className={cn('mx-auto max-w-landing scroll-mt-20 px-4 sm:px-6 md:px-8', className)}>
      <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-16">
        <div className={cn('mx-auto w-[82%] max-w-[26rem] md:w-full md:max-w-[30rem]', flip && 'md:order-2')}>
          <SlotImage
            slot={slot}
            sizes="(min-width: 900px) 480px, (min-width: 640px) 416px, 82vw"
            aspect={imageAspect}
            className="rounded-xl"
          />
        </div>
        <div className={cn('flex flex-col gap-6', flip && 'md:order-1')}>{children}</div>
      </div>
    </section>
  )
}

export function DemoFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative flex flex-col gap-3 rounded-xl border border-line bg-paper p-4 sm:p-5', className)} data-demo-frame>
      <span className="absolute -top-2.5 right-4 rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
        Példa
      </span>
      {children}
    </div>
  )
}
