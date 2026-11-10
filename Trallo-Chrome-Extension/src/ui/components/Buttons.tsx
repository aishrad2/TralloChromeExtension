import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode
  block?: boolean
  small?: boolean
}

function classes(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

export function PrimaryButton({ icon, block, small, children, className, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={classes('btn', 'btn--primary', block && 'btn--block', small && 'btn--small', className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

export function GhostButton({ icon, block, small, children, className, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={classes('btn', 'btn--ghost', block && 'btn--block', small && 'btn--small', className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

export function OutlineButton({ icon, block, small, children, className, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={classes('btn', 'btn--outline', block && 'btn--block', small && 'btn--small', className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

export function DangerButton({ icon, block, small, children, className, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={classes('btn', 'btn--danger', block && 'btn--block', small && 'btn--small', className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  danger?: boolean
}

export function IconButton({ label, danger, children, className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={classes('iconbtn', danger && 'iconbtn--danger', className)}
      {...rest}
    >
      {children}
    </button>
  )
}

export function LinkButton({ children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={classes('linkbtn', className)} {...rest}>
      {children}
    </button>
  )
}
