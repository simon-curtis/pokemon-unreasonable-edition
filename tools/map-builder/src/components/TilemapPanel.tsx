import { useRef, useEffect, useCallback, useMemo } from 'react'
import { useAtomValue, useSetAtom } from 'jotai/react'
import {
  tilemapOpenAtom,
  tilemapScaleAtom,
  tilemapFilterAtom,
  highlightMetatileAtom,
  setSelectedMetatileAtom,
  rightPanelWidthAtom,
  setRightPanelWidthAtom,
} from '#/atoms/viewer'
import { drawTilemap, getVisibleIndices, buildIndexLookup, getAtlasIdxAt } from '#/lib/draw-tilemap'
import type { MapMetadata } from '#/lib/types'
import ResizablePanel from './ResizablePanel'

interface Props {
  metadata: MapMetadata
  atlasPngBase64: string
}

export default function TilemapPanel({ metadata, atlasPngBase64 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const open = useAtomValue(tilemapOpenAtom)
  const tmScale = useAtomValue(tilemapScaleAtom)
  const tmFilter = useAtomValue(tilemapFilterAtom)
  const setTilemapScale = useSetAtom(tilemapScaleAtom)
  const setTilemapFilter = useSetAtom(tilemapFilterAtom)
  const setHighlightMetatile = useSetAtom(highlightMetatileAtom)
  const setSelectedMetatile = useSetAtom(setSelectedMetatileAtom)
  const rightPanelWidth = useAtomValue(rightPanelWidthAtom)
  const setRightPanelWidth = useSetAtom(setRightPanelWidthAtom)

  const hoverIdxRef = useRef<number | null>(null)
  const selectedIdxRef = useRef<number | null>(null)

  const { metatile_info, pri_count, atlas_cols } = metadata

  /* panel inner width for column calculation (subtract 2*4px padding) */
  const panelWidth = rightPanelWidth - 8

  /* Memoize visible indices and reverse lookup — only recompute when filter/data changes */
  const visibleIndices = useMemo(
    () => getVisibleIndices(metatile_info, tmFilter, pri_count),
    [metatile_info, tmFilter, pri_count],
  )
  const indexLookup = useMemo(
    () => buildIndexLookup(visibleIndices),
    [visibleIndices],
  )

  useEffect(() => {
    if (!open) return
    const img = new Image()
    img.src = `data:image/png;base64,${atlasPngBase64}`
    img.onload = () => {
      imgRef.current = img
      redraw()
    }
  }, [atlasPngBase64, open])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawTilemap(ctx, img, metatile_info, visibleIndices, indexLookup, {
      scale: tmScale,
      atlasCols: atlas_cols,
      panelWidth,
      hoverIdx: hoverIdxRef.current,
      selectedIdx: selectedIdxRef.current,
    })
  }, [tmScale, metatile_info, visibleIndices, indexLookup, atlas_cols, panelWidth])

  useEffect(() => {
    if (open) redraw()
  }, [open, redraw])

  const rafRef = useRef<number>(0)
  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const idx = getAtlasIdxAt(e, canvas, tmScale, panelWidth, visibleIndices)
    if (idx === hoverIdxRef.current) return /* skip if unchanged */
    hoverIdxRef.current = idx
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0
        redraw()
      })
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const idx = getAtlasIdxAt(e, canvas, tmScale, panelWidth, visibleIndices)
    if (idx === null) return
    const info = metatile_info[idx]
    if (!info) return

    if (selectedIdxRef.current === idx) {
      selectedIdxRef.current = null
      setHighlightMetatile(null)
      setSelectedMetatile(null)
    } else {
      selectedIdxRef.current = idx
      setHighlightMetatile(info.id)
      setSelectedMetatile(info.id)
    }
    redraw()
  }

  if (!open) return null

  return (
    <ResizablePanel
      side="right"
      width={rightPanelWidth}
      onWidthChange={setRightPanelWidth}
      minWidth={200}
      maxWidth={700}
      offset={44}
    >
      <div className="hud-panel-header flex-wrap">
        <span className="hud-panel-title">Tilemap</span>
        <label className="flex items-center gap-1 ml-auto">
          <span>Show</span>
          <select
            value={tmFilter}
            onChange={(e) => setTilemapFilter(e.target.value as any)}
            className="hud-select text-xs"
          >
            <option value="all">All</option>
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
            <option value="used">Used</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          <span>Scale</span>
          <select
            value={tmScale}
            onChange={(e) => setTilemapScale(parseInt(e.target.value))}
            className="hud-select text-xs"
          >
            <option value={2}>2x</option>
            <option value={3}>3x</option>
            <option value={4}>4x</option>
          </select>
        </label>
      </div>
      <div className="overflow-y-auto flex-1 p-1">
        <canvas
          ref={canvasRef}
          className="cursor-pointer"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            hoverIdxRef.current = null
            redraw()
          }}
          onClick={handleClick}
        />
      </div>
    </ResizablePanel>
  )
}
