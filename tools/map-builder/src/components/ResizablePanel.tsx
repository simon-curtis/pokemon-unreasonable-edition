import { useRef, useCallback } from 'react'

interface ResizablePanelProps {
  /** Which screen edge the panel is anchored to */
  side: 'left' | 'right'
  /** Current width in px */
  width: number
  /** Called during drag with the new width */
  onWidthChange: (w: number) => void
  /** Minimum allowed width (default 120) */
  minWidth?: number
  /** Maximum allowed width (default 600) */
  maxWidth?: number
  /** Distance from the screen edge in px (e.g. rail width) */
  offset: number
  /** Panel contents */
  children: React.ReactNode
  /** Extra classes merged onto the outer div */
  className?: string
}

export default function ResizablePanel({
  side,
  width,
  onWidthChange,
  minWidth = 120,
  maxWidth = 600,
  offset,
  children,
  className = '',
}: ResizablePanelProps) {
  const resizeRef = useRef({ active: false, startX: 0, startW: 0 })

  const clamp = useCallback(
    (w: number) => Math.max(minWidth, Math.min(maxWidth, w)),
    [minWidth, maxWidth],
  )

  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      resizeRef.current = { active: true, startX: e.clientX, startW: width }

      const onMove = (ev: MouseEvent) => {
        if (!resizeRef.current.active) return
        const dx = ev.clientX - resizeRef.current.startX
        /* left-side panels grow rightward (+dx), right-side panels grow leftward (-dx) */
        const newW = resizeRef.current.startW + (side === 'left' ? dx : -dx)
        onWidthChange(clamp(newW))
      }
      const onUp = () => {
        resizeRef.current.active = false
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [width, side, onWidthChange, clamp],
  )

  const posStyle: React.CSSProperties =
    side === 'left' ? { left: offset, width } : { right: offset, width }

  const handlePosition =
    side === 'left'
      ? 'right-0'
      : 'left-0'

  return (
    <div
      className={`absolute top-0 bottom-0 bg-hud-panel hud-animate-in ${
        side === 'left' ? 'border-r' : 'border-l'
      } border-hud-border z-40 flex flex-col overflow-hidden ${className}`}
      style={posStyle}
    >
      {children}
      <div
        className={`absolute top-0 ${handlePosition} w-[5px] h-full cursor-col-resize hover:bg-hud-fg hover:opacity-10 z-50`}
        onMouseDown={onResizeStart}
      />
    </div>
  )
}
