import { useEffect, useMemo } from 'react'
import { useAtomValue, useSetAtom } from 'jotai/react'
import { selectedObjectAtom, activeToolAtom } from '#/atoms/viewer'
import { useSignal, hoverCellSignal } from '#/lib/canvas-signals'
import { setSegmentAtom, removeSegmentAtom } from '#/atoms/statusbar'
import type { MapMetadata } from '#/lib/types'

/**
 * Publishes tile-hover and selected-object info to the status bar.
 * Mount this in the map viewer — it reads from viewer atoms/signals and writes to statusbar atoms.
 */
export function useMapStatusBar(metadata: MapMetadata | undefined) {
  const hoverCell = useSignal(hoverCellSignal)
  const selectedObject = useAtomValue(selectedObjectAtom)
  const activeTool = useAtomValue(activeToolAtom)
  const setSegment = useSetAtom(setSegmentAtom)
  const removeSegment = useSetAtom(removeSegmentAtom)

  const cells = metadata?.cells
  const objects = metadata?.objects

  const objsByCoord = useMemo(() => {
    const map = new Map<string, NonNullable<typeof objects>>()
    for (const o of objects || []) {
      const key = `${o.x},${o.y}`
      const arr = map.get(key)
      if (arr) arr.push(o)
      else map.set(key, [o])
    }
    return map
  }, [objects])

  const objByEvent = useMemo(() => {
    const map = new Map<string, NonNullable<typeof objects>[0]>()
    for (const o of objects || []) map.set(`${o.eventArray}:${o.eventIndex}`, o)
    return map
  }, [objects])

  /* Publish cursor / selection info */
  useEffect(() => {
    let info = ''

    if (activeTool === 'object' && selectedObject) {
      const obj = objByEvent.get(`${selectedObject.eventArray}:${selectedObject.eventIndex}`)
      if (obj) {
        info = `[${obj.kind}] "${obj.label}"  (${obj.x}, ${obj.y})  ${obj.eventArray}[${obj.eventIndex}]`
        if (obj.gfx) info += `  gfx=${obj.gfx}`
      }
    }

    if (!info && hoverCell !== null && cells && hoverCell < cells.length) {
      const c = cells[hoverCell]
      info = `(${c.x}, ${c.y})  mid=${c.metatile_id}  collision=${c.collision}  elev=${c.elevation}  behavior=${c.behavior}  cat=${c.category}`
      const objs = objsByCoord.get(`${c.x},${c.y}`)
      if (objs?.length) {
        info += `  OBJ: ${objs.map((o) => `${o.kind}(${o.label})`).join(', ')}`
      }
    }

    if (!info) {
      info = activeTool === 'object'
        ? 'Click an object to select — Drag to move'
        : 'Hover over a tile for details — Click to copy metadata'
    }

    setSegment('cursor', { text: info, position: 0 })
  }, [hoverCell, selectedObject, activeTool, cells, objsByCoord, objByEvent, setSegment])

  /* Publish map dimensions */
  useEffect(() => {
    if (metadata) {
      setSegment('dimensions', { text: `${metadata.width}×${metadata.height}`, side: 'right', position: 0, muted: true })
    }
    return () => removeSegment('dimensions')
  }, [metadata?.width, metadata?.height, setSegment, removeSegment])

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      removeSegment('cursor')
      removeSegment('dimensions')
    }
  }, [removeSegment])
}
