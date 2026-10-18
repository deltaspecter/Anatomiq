import type { ComponentType, ReactNode } from 'react'

type Props = {
  icon: ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean }>
  label: string
  onClick: () => void
  pressed?: boolean
  className?: string
  /** Sichtbare Beschriftung unter dem Symbol */
  caption?: ReactNode
  disabled?: boolean
}

/** Rundes Symbol-Bedienelement, mindestens 44 × 44 px, mit zugänglicher Beschriftung */
export function IconButton({ icon: Icon, label, onClick, pressed, className = '', caption, disabled }: Props) {
  if (caption)
    return (
      <button
        type="button"
        className={`flex min-w-[56px] flex-col items-center gap-1 rounded-xl px-0.5 py-1 text-[11px] tracking-[-0.01em] text-muted transition-colors hover:text-ink disabled:opacity-40 aria-pressed:text-accent ${className}`}
        onClick={onClick}
        aria-label={label}
        aria-pressed={pressed}
        disabled={disabled}
        title={label}
      >
        <span className={`grid h-10 w-10 place-items-center rounded-full ${pressed ? 'bg-accent/15 text-accent' : 'bg-white/5 text-ink'}`}>
          <Icon size={19} strokeWidth={1.8} aria-hidden />
        </span>
        <span className="leading-none">{caption}</span>
      </button>
    )
  return (
    <button type="button" className={`icon-btn ${className}`} onClick={onClick} aria-label={label} aria-pressed={pressed} title={label} disabled={disabled}>
      <Icon size={20} strokeWidth={1.8} aria-hidden />
    </button>
  )
}
