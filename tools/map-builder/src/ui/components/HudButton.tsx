const base = 'inline-flex items-center justify-center cursor-pointer border p-hud-btn-p'

interface ButtonProps {
  onClick: () => void
  title: string
  children: React.ReactNode
  className?: string
}

export function HudButton({ onClick, title, children, className = '' }: ButtonProps) {
  return (
    <button
      className={`${base} bg-transparent text-hud-muted border-hud-border hover:border-hud-muted hover:text-hud-fg active:bg-hud-surface ${className}`}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  )
}

interface ToggleButtonProps extends ButtonProps {
  active: boolean
}

export function ToggleButton({ onClick, title, active, children, className = '' }: ToggleButtonProps) {
  return (
    <button
      className={`${base} ${
        active
          ? 'bg-hud-active text-hud-active-fg border-hud-active-border shadow-[0_0_6px_var(--hud-glow)]'
          : 'bg-transparent text-hud-muted border-hud-border hover:border-hud-muted hover:text-hud-fg'
      } ${className}`}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  )
}
