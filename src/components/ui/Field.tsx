import type { ReactNode } from 'react'
import { cn } from './cn'

/**
 * Űrlapmező-keret: látható címke, segédszöveg, hibaüzenet a mező alatt (`aria-describedby`).
 * DESIGN_SYSTEM 11. pont.
 */
export function Field({
  id,
  label,
  hint,
  error,
  optional,
  className,
  children,
}: {
  id: string
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  optional?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-small text-ink">
        {label}
        {optional ? <span className="ml-1 font-normal text-ink-muted">(nem kötelező)</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-small font-normal text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-small text-pricier">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function describedBy(id: string, hint?: unknown, error?: unknown): string | undefined {
  const ids = [error ? `${id}-error` : null, hint && !error ? `${id}-hint` : null].filter(Boolean)
  return ids.length ? ids.join(' ') : undefined
}
