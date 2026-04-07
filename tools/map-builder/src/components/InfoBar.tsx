import { useMemo } from 'react'
import { useAtomValue } from 'jotai/react'
import { segmentsAtom, type StatusSegment } from '#/atoms/statusbar'

export default function InfoBar() {
  const segments = useAtomValue(segmentsAtom)

  const left = useMemo(() => sortSegments(segments, 'left'), [segments])
  const right = useMemo(() => sortSegments(segments, 'right'), [segments])

  return (
    <div className="z-50 bg-hud-bg px-4 py-1.5 text-sm border-t border-hud-border uppercase tracking-widest flex items-center gap-4" style={{ fontFamily: 'var(--font-hud-display)' }}>
      <span className="text-hud-muted" style={{ fontSize: 8 }}>&#x25C6;</span>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {left.length === 0 && (
          <span className="tabular-nums truncate text-hud-muted">Select a map to get started</span>
        )}
        {left.map(([key, seg], i) => (
          <span key={key} className="flex items-center gap-4">
            {i > 0 && <span className="w-px h-3 bg-hud-border" />}
            <span className={`tabular-nums truncate ${seg.muted ? 'text-hud-muted' : ''}`}>
              {seg.text}
            </span>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-4 shrink-0">
        {right.map(([key, seg]) => (
          <span key={key} className={`tabular-nums ${seg.muted ? 'text-hud-muted' : ''}`}>
            {seg.text}
          </span>
        ))}
        <div className="w-px h-3 bg-hud-border" />
        <span className="text-hud-muted flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-hud-accent hud-pulse" />
          HUD SYSTEM
        </span>
      </div>
      <span className="text-hud-muted" style={{ fontSize: 8 }}>&#x25C6;</span>
    </div>
  )
}

function sortSegments(segments: Record<string, StatusSegment>, side: 'left' | 'right') {
  return Object.entries(segments)
    .filter(([, seg]) => (seg.side || 'left') === side)
    .sort(([ka, a], [kb, b]) => (a.position ?? 0) - (b.position ?? 0) || ka.localeCompare(kb))
}
