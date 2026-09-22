'use client'

import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { Toast as ToastPrimitive } from 'radix-ui'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { cn } from './cn'

type ToastTone = 'success' | 'info' | 'error'

interface ToastItem {
  id: number
  title: ReactNode
  description?: ReactNode
  tone: ToastTone
}

interface ToastApi {
  toast: (t: Omit<ToastItem, 'id' | 'tone'> & { tone?: ToastTone }) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const icons = { success: CircleCheck, info: Info, error: CircleAlert } as const
const tones = {
  success: 'text-deal',
  info: 'text-sky-deep',
  error: 'text-pricier',
} as const

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const toast = useCallback<ToastApi['toast']>((t) => {
    setItems((prev) => [...prev, { id: Date.now() + Math.random(), tone: 'success', ...t }])
  }, [])
  const api = useMemo(() => ({ toast }), [toast])
  return (
    <ToastContext.Provider value={api}>
      <ToastPrimitive.Provider swipeDirection="down" duration={5000} label="Értesítés">
        {children}
        {items.map((item) => {
          const Icon = icons[item.tone]
          return (
            <ToastPrimitive.Root
              key={item.id}
              onOpenChange={(open) => {
                if (!open) setItems((prev) => prev.filter((p) => p.id !== item.id))
              }}
              className="flex w-full items-start gap-3 rounded-lg border border-line bg-surface p-4 pr-12 shadow-lift data-[state=open]:animate-[rise-in_250ms_var(--ease-sun)] data-[swipe=move]:translate-y-[var(--radix-toast-swipe-move-y)]"
            >
              <Icon aria-hidden className={cn('mt-0.5 size-5 shrink-0', tones[item.tone])} />
              <div className="flex flex-col gap-0.5">
                <ToastPrimitive.Title className="text-body font-semibold text-ink">
                  {item.title}
                </ToastPrimitive.Title>
                {item.description ? (
                  <ToastPrimitive.Description className="text-small font-normal text-ink-muted">
                    {item.description}
                  </ToastPrimitive.Description>
                ) : null}
              </div>
              <ToastPrimitive.Close
                aria-label="Bezárás"
                className="absolute top-2 right-2 inline-flex size-10 items-center justify-center rounded-full text-ink-muted hover:bg-stone"
              >
                <X aria-hidden className="size-4" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          )
        })}
        <ToastPrimitive.Viewport className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-md flex-col gap-2 outline-none md:right-6 md:bottom-6 md:left-auto md:mx-0 md:w-96" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('A useToast csak ToastProvider-en belül használható.')
  return ctx
}
