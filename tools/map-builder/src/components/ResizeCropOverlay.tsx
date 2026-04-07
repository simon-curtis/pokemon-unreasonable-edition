import { useState, useRef, useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAtomValue, useSetAtom } from 'jotai/react'
import { resizeModeAtom, scaleAtom } from '#/atoms/viewer'
import { useSignal, cameraSignal } from '#/lib/canvas-signals'
import { resizeMap } from '#/server/functions'
import type { ConnectionInfo } from '#/lib/types'

interface Props {
  mapName: string
  mapWidth: number
  mapHeight: number
  connections: ConnectionInfo[]
}

type Edge = 'left' | 'right' | 'top' | 'bottom'
type Handle = Edge | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

const HANDLE_SIZE = 8

/**
 * Apple Photos-style crop overlay.
 * Renders edge/corner handles over the map canvas.
 * Dragging handles adjusts the crop bounds.
 */
export default function ResizeCropOverlay({ mapName, mapWidth, mapHeight, connections }: Props) {
  const resizeMode = useAtomValue(resizeModeAtom)
  const setResizeMode = useSetAtom(resizeModeAtom)
  const exitResizeMode = useCallback(() => setResizeMode(false), [setResizeMode])
  const scale = useAtomValue(scaleAtom)
  const camera = useSignal(cameraSignal)
  const cameraX = camera.x
  const cameraY = camera.y
  const queryClient = useQueryClient()

  /* Crop edges: how many metatiles to trim (positive) or grow (negative) from each side */
  const [cropLeft, setCropLeft] = useState(0)
  const [cropTop, setCropTop] = useState(0)
  const [cropRight, setCropRight] = useState(0)
  const [cropBottom, setCropBottom] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* Drag state */
  const dragRef = useRef<{
    handle: Handle
    startX: number
    startY: number
    startCropLeft: number
    startCropTop: number
    startCropRight: number
    startCropBottom: number
  } | null>(null)

  /* Reset crop when entering resize mode */
  useEffect(() => {
    if (resizeMode) {
      setCropLeft(0)
      setCropTop(0)
      setCropRight(0)
      setCropBottom(0)
      setError(null)
    }
  }, [resizeMode])

  /* Escape to exit */
  useEffect(() => {
    if (!resizeMode) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitResizeMode()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [resizeMode, exitResizeMode])

  /* Pointer move/up handlers (attached to window during drag) */
  const handlePointerMove = useCallback((e: PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    e.preventDefault()

    const ts = 16 * scale
    const dxPx = e.clientX - drag.startX
    const dyPx = e.clientY - drag.startY
    /* Convert pixel delta to metatile units, snapping */
    const dxTiles = Math.round(dxPx / ts)
    const dyTiles = Math.round(dyPx / ts)

    const h = drag.handle
    /* Compute new crop values based on handle being dragged.
       Moving left edge right = trimming = positive cropLeft.
       Moving left edge left = growing = negative cropLeft. */
    if (h === 'left' || h === 'top-left' || h === 'bottom-left') {
      const newCrop = drag.startCropLeft + dxTiles
      /* Prevent collapsing to zero width */
      const maxCrop = mapWidth - drag.startCropRight - 1
      setCropLeft(Math.min(maxCrop, newCrop))
    }
    if (h === 'right' || h === 'top-right' || h === 'bottom-right') {
      const newCrop = drag.startCropRight - dxTiles
      const maxCrop = mapWidth - drag.startCropLeft - 1
      setCropRight(Math.min(maxCrop, newCrop))
    }
    if (h === 'top' || h === 'top-left' || h === 'top-right') {
      const newCrop = drag.startCropTop + dyTiles
      const maxCrop = mapHeight - drag.startCropBottom - 1
      setCropTop(Math.min(maxCrop, newCrop))
    }
    if (h === 'bottom' || h === 'bottom-left' || h === 'bottom-right') {
      const newCrop = drag.startCropBottom - dyTiles
      const maxCrop = mapHeight - drag.startCropTop - 1
      setCropBottom(Math.min(maxCrop, newCrop))
    }
  }, [scale, mapWidth, mapHeight])

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
  }, [handlePointerMove])

  const startDrag = useCallback((handle: Handle, e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startCropLeft: cropLeft,
      startCropTop: cropTop,
      startCropRight: cropRight,
      startCropBottom: cropBottom,
    }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }, [cropLeft, cropTop, cropRight, cropBottom, handlePointerMove, handlePointerUp])

  if (!resizeMode) return null

  const ts = 16 * scale
  /* New map bounds in world pixels (relative to current map origin) */
  const newLeft = cropLeft * ts
  const newTop = cropTop * ts
  const newRight = (mapWidth - cropRight) * ts
  const newBottom = (mapHeight - cropBottom) * ts
  /* Original map bounds */
  const origRight = mapWidth * ts
  const origBottom = mapHeight * ts

  /* Convert to screen space (canvas-local, accounting for camera) */
  const toScreenX = (wx: number) => wx - cameraX
  const toScreenY = (wy: number) => wy - cameraY

  const sLeft = toScreenX(newLeft)
  const sTop = toScreenY(newTop)
  const sRight = toScreenX(newRight)
  const sBottom = toScreenY(newBottom)
  const cropW = sRight - sLeft
  const cropH = sBottom - sTop

  /* For the dim overlay, also compute the original map edges on screen */
  const soLeft = toScreenX(Math.min(0, newLeft))
  const soTop = toScreenY(Math.min(0, newTop))
  const soRight = toScreenX(Math.max(origRight, newRight))
  const soBottom = toScreenY(Math.max(origBottom, newBottom))

  const newW = mapWidth - cropLeft - cropRight
  const newH = mapHeight - cropTop - cropBottom
  const hasChanges = cropLeft !== 0 || cropRight !== 0 || cropTop !== 0 || cropBottom !== 0

  /* For resizeMap: dx = -cropLeft (content shifts right when trimming left) */
  const dx = -cropLeft
  const dy = -cropTop

  const handleApply = async () => {
    if (!hasChanges || busy) return
    setBusy(true)
    setError(null)
    try {
      await resizeMap({
        data: { mapName, newWidth: newW, newHeight: newH, dx, dy, fillTile: 0 },
      })
      queryClient.invalidateQueries({ queryKey: ['metadata', mapName] })
      queryClient.invalidateQueries({ queryKey: ['mapPng', mapName] })
      queryClient.invalidateQueries({ queryKey: ['foregroundPng', mapName] })
      for (const conn of connections) {
        queryClient.invalidateQueries({ queryKey: ['metadata', conn.mapName] })
        queryClient.invalidateQueries({ queryKey: ['mapPng', conn.mapName] })
      }
      exitResizeMode()
    } catch (e: any) {
      setError(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  const cursorForHandle = (h: Handle): string => {
    switch (h) {
      case 'left': case 'right': return 'ew-resize'
      case 'top': case 'bottom': return 'ns-resize'
      case 'top-left': case 'bottom-right': return 'nwse-resize'
      case 'top-right': case 'bottom-left': return 'nesw-resize'
    }
  }

  return (
    <div className="absolute inset-0 z-[60]" style={{ pointerEvents: 'none' }}>
      {/* Dim overlay — 4 rects around the crop area covering the original map extent */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="crop-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect x={sLeft} y={sTop} width={cropW} height={cropH} fill="black" />
          </mask>
        </defs>
        {/* Dim the area outside the crop rect but within map bounds */}
        <rect
          x={toScreenX(0)} y={toScreenY(0)}
          width={origRight - 0} height={origBottom - 0}
          fill="rgba(0,0,0,0.5)"
          mask="url(#crop-mask)"
        />
        {/* If growing, show the grow region with a subtle pattern */}
        {cropLeft < 0 && (
          <rect x={sLeft} y={sTop} width={-cropLeft * ts} height={cropH}
            fill="rgba(77,142,247,0.08)" stroke="rgba(77,142,247,0.3)" strokeWidth="1" strokeDasharray="4 3" />
        )}
        {cropRight < 0 && (
          <rect x={toScreenX(origRight)} y={sTop} width={-cropRight * ts} height={cropH}
            fill="rgba(77,142,247,0.08)" stroke="rgba(77,142,247,0.3)" strokeWidth="1" strokeDasharray="4 3" />
        )}
        {cropTop < 0 && (
          <rect x={sLeft} y={sTop} width={cropW} height={-cropTop * ts}
            fill="rgba(77,142,247,0.08)" stroke="rgba(77,142,247,0.3)" strokeWidth="1" strokeDasharray="4 3" />
        )}
        {cropBottom < 0 && (
          <rect x={sLeft} y={toScreenY(origBottom)} width={cropW} height={-cropBottom * ts}
            fill="rgba(77,142,247,0.08)" stroke="rgba(77,142,247,0.3)" strokeWidth="1" strokeDasharray="4 3" />
        )}
      </svg>

      {/* Crop boundary */}
      <div
        className="absolute border-2 border-hud-accent"
        style={{
          left: sLeft, top: sTop,
          width: cropW, height: cropH,
          pointerEvents: 'none',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.3)',
        }}
      />

      {/* Edge handles */}
      {renderEdgeHandle('top', sLeft, sTop - HANDLE_SIZE / 2, cropW, HANDLE_SIZE, startDrag, cursorForHandle)}
      {renderEdgeHandle('bottom', sLeft, sBottom - HANDLE_SIZE / 2, cropW, HANDLE_SIZE, startDrag, cursorForHandle)}
      {renderEdgeHandle('left', sLeft - HANDLE_SIZE / 2, sTop, HANDLE_SIZE, cropH, startDrag, cursorForHandle)}
      {renderEdgeHandle('right', sRight - HANDLE_SIZE / 2, sTop, HANDLE_SIZE, cropH, startDrag, cursorForHandle)}

      {/* Corner handles */}
      {renderCornerHandle('top-left', sLeft, sTop, startDrag, cursorForHandle)}
      {renderCornerHandle('top-right', sRight, sTop, startDrag, cursorForHandle)}
      {renderCornerHandle('bottom-left', sLeft, sBottom, startDrag, cursorForHandle)}
      {renderCornerHandle('bottom-right', sRight, sBottom, startDrag, cursorForHandle)}

      {/* Dimension labels on edges */}
      <div
        className="absolute text-xs tabular-nums text-hud-accent uppercase tracking-widest"
        style={{
          left: sLeft + cropW / 2, top: sTop - 20,
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          fontFamily: 'var(--font-hud-display)',
        }}
      >
        {newW}
      </div>
      <div
        className="absolute text-xs tabular-nums text-hud-accent uppercase tracking-widest"
        style={{
          left: sLeft - 24, top: sTop + cropH / 2,
          transform: 'translateY(-50%) rotate(-90deg)',
          pointerEvents: 'none',
          fontFamily: 'var(--font-hud-display)',
        }}
      >
        {newH}
      </div>

      {/* Floating action bar at bottom */}
      <div
        className="absolute left-1/2 bottom-4 -translate-x-1/2 flex items-center gap-3 bg-hud-panel border border-hud-border px-4 py-2 uppercase tracking-widest text-sm"
        style={{ pointerEvents: 'auto', fontFamily: 'var(--font-hud-display)' }}
      >
        <span className="text-hud-muted tabular-nums">
          {mapWidth}{'\u00D7'}{mapHeight}
        </span>
        {hasChanges && (
          <>
            <span className="text-hud-muted">{'\u2192'}</span>
            <span className="text-hud-fg tabular-nums">{newW}{'\u00D7'}{newH}</span>
          </>
        )}

        {/* Connection offset preview */}
        {hasChanges && connections.length > 0 && (dx !== 0 || dy !== 0) && (
          <>
            <span className="w-px h-4 bg-hud-border" />
            <div className="flex gap-2 text-xs text-hud-muted">
              {connections.map((conn, i) => {
                const delta = (conn.direction === 'up' || conn.direction === 'down') ? dx : dy
                if (delta === 0) return null
                return (
                  <span key={i} className="tabular-nums">
                    {conn.direction[0].toUpperCase()}:{conn.offset}{'\u2192'}{conn.offset + delta}
                  </span>
                )
              })}
            </div>
          </>
        )}

        <span className="w-px h-4 bg-hud-border" />

        <button
          onClick={exitResizeMode}
          className="px-2 py-0.5 text-sm border border-hud-border hover:border-hud-fg cursor-pointer bg-transparent text-hud-fg"
        >
          Cancel
        </button>
        <button
          onClick={handleApply}
          disabled={!hasChanges || busy}
          className={`px-2 py-0.5 text-sm border cursor-pointer ${
            !hasChanges || busy
              ? 'border-hud-border text-hud-muted opacity-50 bg-transparent pointer-events-none'
              : 'border-hud-active-border bg-hud-active text-hud-active-fg hover:shadow-[0_0_6px_var(--hud-glow)]'
          }`}
        >
          {busy ? 'Applying...' : 'Apply'}
        </button>

        {error && (
          <span className="text-red-400 text-xs normal-case">{error}</span>
        )}
      </div>
    </div>
  )
}

function renderEdgeHandle(
  handle: Handle,
  x: number, y: number, w: number, h: number,
  startDrag: (h: Handle, e: React.PointerEvent) => void,
  cursorForHandle: (h: Handle) => string,
) {
  return (
    <div
      className="absolute"
      style={{
        left: x, top: y, width: w, height: h,
        cursor: cursorForHandle(handle),
        pointerEvents: 'auto',
      }}
      onPointerDown={(e) => startDrag(handle, e)}
    />
  )
}

function renderCornerHandle(
  handle: Handle,
  x: number, y: number,
  startDrag: (h: Handle, e: React.PointerEvent) => void,
  cursorForHandle: (h: Handle) => string,
) {
  const size = 12
  return (
    <div
      className="absolute bg-hud-accent border border-hud-panel"
      style={{
        left: x - size / 2, top: y - size / 2,
        width: size, height: size,
        cursor: cursorForHandle(handle),
        pointerEvents: 'auto',
      }}
      onPointerDown={(e) => startDrag(handle, e)}
    />
  )
}
