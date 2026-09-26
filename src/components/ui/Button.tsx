import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'soft' | 'danger' | 'success'
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  leading?: ReactNode
  trailing?: ReactNode
  block?: boolean
  loading?: boolean
}

const base =
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,color,box-shadow,transform,opacity,border-color] duration-150 ease-out active:scale-[0.97] disabled:opacity-45 disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring)'

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-fg shadow-[0_1px_0_rgb(255_255_255/0.25)_inset,0_6px_18px_-8px_var(--accent)] hover:bg-accent-strong',
  secondary: 'bg-surface-2 text-ink ring-1 ring-line hover:bg-surface-3',
  ghost: 'text-muted hover:text-ink hover:bg-surface-2',
  outline: 'text-ink ring-1 ring-line-strong hover:bg-surface-2',
  soft: 'bg-accent-soft text-accent hover:bg-accent/20',
  danger: 'bg-danger/12 text-danger ring-1 ring-danger/25 hover:bg-danger/20',
  success: 'bg-success text-white hover:brightness-110',
}

const sizes: Record<Size, string> = {
  xs: 'h-7 rounded-lg px-2.5 text-xs',
  sm: 'h-9 rounded-xl px-3 text-sm',
  md: 'h-11 rounded-xl px-4 text-[15px]',
  lg: 'h-13 rounded-2xl px-6 text-base',
  icon: 'h-10 w-10 rounded-xl',
  'icon-sm': 'h-8 w-8 rounded-lg',
  'icon-lg': 'h-12 w-12 rounded-2xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', leading, trailing, block, loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(base, variants[variant], sizes[size], block && 'w-full', className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />
      ) : (
        leading
      )}
      {children}
      {trailing}
    </button>
  )
})
