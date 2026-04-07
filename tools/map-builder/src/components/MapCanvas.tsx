import { useRef, useEffect, useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { drawMap, getConnectionPosition } from '#/lib/draw-map'
import type { ConnectionImage, DragPreview, PlacementPreview } from '#/lib/draw-map'
import type { MapMetadata, MapObject } from '#/lib/types'
import { moveObject, addObject, deleteObject, paintTiles } from '#/server/functions'
import { useAtomValue, useSetAtom } from 'jotai/react'
import { attachContextAtom } from '#/atoms/chat'
import {
  scaleAtom,
  overlaysAtom,
  selectionAtom,
  highlightMetatileAtom,
  selectedMetatileAtom,
  activeToolAtom,
  selectedObjectAtom,
  setRightPanelAtom,
  rightPanelAtom,
  mapListOpenAtom,
  entitiesOpenAtom,
  leftPanelWidthAtom,
  rightPanelWidthAtom,
} from '#/atoms/viewer'
import { hoverCellSignal, cameraSignal } from '#/lib/canvas-signals'
import { draggingEntityKind } from './EntityPalettePanel'

/* Hoisted outside component — avoids recreation on every mousemove */
const GROUND_KINDS = new Set(['item', 'warp', 'trigger', 'coord', 'sign', 'hidden'])

interface Props {
  mapName: string
  metadata: MapMetadata
  mapPngBase64: string
  foregroundPngBase64?: string
}

export default function MapCanvas({ mapName, metadata, mapPngBase64, foregroundPngBase64 }: Props) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const fgImgRef = useRef<HTMLImageElement | null>(null)
  const rafRef = useRef<number>(0)
  /* Refs for high-frequency values — avoids recreating requestDraw on every mousemove */
  const hoverCellRef = useRef<number | null>(null)
  const dragPreviewRef = useRef<DragPreview | null>(null)
  const placementPreviewRef = useRef<PlacementPreview | null>(null)
  const [spriteImages, setSpriteImages] = useState<Record<string, HTMLImageElement>>({})
  const [connectionImages, setConnectionImages] = useState<ConnectionImage[]>([])
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null)
  const [objTooltip, setObjTooltip] = useState<{ label: string; x: number; y: number } | null>(null)
  const [viewportSize, setViewportSize] = useState({ w: 800, h: 600 })
  /* dragPreview is ref-only — avoids re-renders on every mouse move during drag */
  const [cursorClass, setCursorClass] = useState('cursor-crosshair')
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; obj: MapObject } | null>(null)

  /* Pan + drag refs for high-freq updates */
  const panRef = useRef<{ active: boolean; startX: number; startY: number; camStartX: number; camStartY: number }>({
    active: false, startX: 0, startY: 0, camStartX: 0, camStartY: 0,
  })
  const wheelZoomRef = useRef(false)

  const touchRef = useRef<{ startDist: number; startScale: number; startMidX: number; startMidY: number; startCamX: number; startCamY: number } | null>(null)
  const objDragRef = useRef<{
    active: boolean
    eventArray: string
    eventIndex: number
    startWorldX: number
    startWorldY: number
    objOrigX: number
    objOrigY: number
    lastSnapX: number
    lastSnapY: number
    didMove: boolean
  } | null>(null)
  const paintBufRef = useRef<Map<string, { x: number; y: number; metatileId: number }>>(new Map())
  const paintActiveRef = useRef(false)

  const scale = useAtomValue(scaleAtom)
  const overlays = useAtomValue(overlaysAtom)
  const selection = useAtomValue(selectionAtom)
  const highlightMetatile = useAtomValue(highlightMetatileAtom)
  const activeTool = useAtomValue(activeToolAtom)
  const selectedObject = useAtomValue(selectedObjectAtom)
  const selectedMetatile = useAtomValue(selectedMetatileAtom)
  const setSelection = useSetAtom(selectionAtom)
  const setScale = useSetAtom(scaleAtom)
  const setSelectedObject = useSetAtom(selectedObjectAtom)
  const setRightPanel = useSetAtom(setRightPanelAtom)

  const rightPanel = useAtomValue(rightPanelAtom)
  const mapListOpen = useAtomValue(mapListOpenAtom)
  const entitiesOpen = useAtomValue(entitiesOpenAtom)
  const leftPanelWidth = useAtomValue(leftPanelWidthAtom)
  const rightPanelWidth = useAtomValue(rightPanelWidthAtom)

  const attachContext = useSetAtom(attachContextAtom)

  const cameraRef = useRef({ x: 0, y: 0 })
  const selectStartRef = useRef<{ x: number; y: number } | null>(null)
  const selectEndRef = useRef<{ x: number; y: number } | null>(null)

  const { width, height, cells, objects, provenance, sprites, connections } = metadata

  /* Pre-sort objects once when they change, reuse for hit-testing and drawing */
  const sortedObjects = useMemo(() => [...objects].sort((a, b) => a.y - b.y), [objects])
  const spriteKeys = useMemo(() => sortedObjects.map(obj => obj.gfx ? `${obj.gfx}:${obj.facing}` : ''), [sortedObjects])
  const objByEvent = useMemo(() => {
    const m = new Map<string, typeof objects[0]>()
    for (const obj of sortedObjects) m.set(`${obj.eventArray}:${obj.eventIndex}`, obj)
    return m
  }, [sortedObjects])

  /* Measure viewport size */
  useEffect(() => {
    const measure = () => {
      const top = 55
      const bottom = 32
      const rail = 44
      const right = rail + (rightPanel ? rightPanelWidth : 0)
      const left = rail + ((mapListOpen || entitiesOpen) ? leftPanelWidth : 0)
      setViewportSize({
        w: window.innerWidth - right - left,
        h: window.innerHeight - top - bottom,
      })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [rightPanel, mapListOpen, entitiesOpen, leftPanelWidth, rightPanelWidth])

  /* Center camera on main map when map changes or viewport resizes */
  useEffect(() => {
    if (wheelZoomRef.current) {
      wheelZoomRef.current = false
      return
    }
    const mapPixelW = width * 16 * scale
    const mapPixelH = height * 16 * scale
    setCamera(
      -(viewportSize.w - mapPixelW) / 2,
      -(viewportSize.h - mapPixelH) / 2,
    )
  }, [width, height, scale, viewportSize.w, viewportSize.h])

  /* Escape to deselect, Delete/Backspace to delete selected object */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Escape') {
        setSelectedObject(null)
        setSelection(null)
        setTooltip(null)
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObject) {
        e.preventDefault()
        deleteObject({ data: { mapName, eventArray: selectedObject.eventArray, eventIndex: selectedObject.eventIndex } }).then(() => {
          setSelectedObject(null)
          queryClient.invalidateQueries({ queryKey: ['metadata', mapName] })
        })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedObject, mapName])

  /* Space to temporarily enter pan mode.
     Linux libinput disables trackpad while keys are held (DWT),
     so we can't require holding space during drag. Instead:
     space-down → enter pan mode, stays until next drag completes. */
  const spaceHeldRef = useRef(false)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const spacePanUsed = useRef(false)
  const exitSpacePan = useCallback(() => {
    spaceHeldRef.current = false
    spacePanUsed.current = false
    setSpaceHeld(false)
  }, [])
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key !== ' ' || e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
      e.preventDefault()
      if (spaceHeldRef.current) {
        exitSpacePan()
      } else {
        spaceHeldRef.current = true
        spacePanUsed.current = false
        setSpaceHeld(true)
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [exitSpacePan])

  /* load map image */
  useEffect(() => {
    const img = new Image()
    img.src = `data:image/png;base64,${mapPngBase64}`
    img.onload = () => {
      imgRef.current = img
      requestDraw()
    }
  }, [mapPngBase64])

  /* load foreground overlay image */
  useEffect(() => {
    if (!foregroundPngBase64) { fgImgRef.current = null; return }
    const img = new Image()
    img.src = `data:image/png;base64,${foregroundPngBase64}`
    img.onload = () => {
      fgImgRef.current = img
      requestDraw()
    }
  }, [foregroundPngBase64])

  /* load sprite images */
  useEffect(() => {
    const loaded: Record<string, HTMLImageElement> = {}
    const keys = Object.keys(sprites)
    let remaining = keys.length
    if (remaining === 0) {
      setSpriteImages({})
      return
    }
    for (const key of keys) {
      const frame = sprites[key]
      const img = new Image()
      img.src = `data:image/png;base64,${frame.png}`
      img.onload = () => {
        loaded[key] = img
        remaining--
        if (remaining === 0) setSpriteImages({ ...loaded })
      }
      img.onerror = () => {
        remaining--
        if (remaining === 0) setSpriteImages({ ...loaded })
      }
    }
  }, [sprites])

  /* load connection map images */
  useEffect(() => {
    if (!connections.length) {
      setConnectionImages([])
      return
    }
    const loaded: ConnectionImage[] = []
    let remaining = connections.length
    for (const conn of connections) {
      const img = new Image()
      img.src = `data:image/png;base64,${conn.png}`
      img.onload = () => {
        loaded.push({ info: conn, img })
        remaining--
        if (remaining === 0) setConnectionImages([...loaded])
      }
      img.onerror = () => {
        remaining--
        if (remaining === 0) setConnectionImages([...loaded])
      }
    }
  }, [connections])

  const requestDraw = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current
      const img = imgRef.current
      if (!canvas || !img) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const ss = selectStartRef.current
      const se = selectEndRef.current
      const selectDrag =
        ss && se
          ? {
              x1: Math.min(ss.x, se.x),
              y1: Math.min(ss.y, se.y),
              x2: Math.max(ss.x, se.x),
              y2: Math.max(ss.y, se.y),
            }
          : null

      drawMap(ctx, img, fgImgRef.current, width, height, cells, objects, provenance, {
        scale,
        overlays,
        hoverCell: hoverCellRef.current,
        selection,
        selectDrag,
        highlightMetatile,
        spriteImages,
        connectionImages,
        cameraX: cameraRef.current.x,
        cameraY: cameraRef.current.y,
        viewportW: viewportSize.w,
        viewportH: viewportSize.h,
        selectedObject,
        dragPreview: dragPreviewRef.current,
        placementPreview: placementPreviewRef.current,
        sortedObjects,
        spriteKeys,
        objByEvent,
      })
    })
  }, [
    scale, overlays, selection,
    highlightMetatile, spriteImages, connectionImages,
    width, height, cells, objects, provenance,
    viewportSize.w, viewportSize.h,
    selectedObject, sortedObjects, spriteKeys, objByEvent,
  ])

  const requestDrawRef = useRef(requestDraw)
  requestDrawRef.current = requestDraw

  useEffect(() => {
    requestDraw()
  }, [requestDraw])

  /** Schedule a lightweight redraw (for ref-only changes like hover/drag) */
  const scheduleRedraw = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => requestDrawRef.current())
  }, [])

  const setCamera = useCallback((x: number, y: number) => {
    cameraRef.current.x = x
    cameraRef.current.y = y
    cameraSignal.set({ x, y })
    scheduleRedraw()
  }, [scheduleRedraw])

  /** Canvas rect cache — updated on resize/layout changes, avoids getBoundingClientRect per mousemove */
  const canvasRectRef = useRef<DOMRect | null>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) canvasRectRef.current = canvas.getBoundingClientRect()
  }, [viewportSize, rightPanel, mapListOpen, entitiesOpen, leftPanelWidth, rightPanelWidth])

  /* Reusable result objects — avoids allocation per mousemove */
  const _worldResult = useRef({ worldX: 0, worldY: 0 })
  const _cellResult = useRef({ x: 0, y: 0 })

  /** Convert screen pixel to world-space metatile coords (main map) */
  const screenToWorld = (e: React.MouseEvent) => {
    const rect = canvasRectRef.current || canvasRef.current!.getBoundingClientRect()
    _worldResult.current.worldX = (e.clientX - rect.left) + cameraRef.current.x
    _worldResult.current.worldY = (e.clientY - rect.top) + cameraRef.current.y
    return _worldResult.current
  }

  const getCellAt = (e: React.MouseEvent): { x: number; y: number } | null => {
    const { worldX, worldY } = screenToWorld(e)
    const mx = Math.floor(worldX / (16 * scale))
    const my = Math.floor(worldY / (16 * scale))
    if (mx >= 0 && mx < width && my >= 0 && my < height) {
      _cellResult.current.x = mx
      _cellResult.current.y = my
      return _cellResult.current
    }
    return null
  }

  /** Hit-test objects at screen position. Returns topmost (reverse render order). */
  const getObjectAt = (e: React.MouseEvent): MapObject | null => {
    const { worldX, worldY } = screenToWorld(e)
    /* GROUND_KINDS hoisted to module scope */

    /* Check in reverse to get topmost first (sortedObjects is pre-sorted) */
    for (let i = sortedObjects.length - 1; i >= 0; i--) {
      const obj = sortedObjects[i]
      const spriteKey = obj.gfx ? `${obj.gfx}:${obj.facing}` : ''
      const spriteImg = spriteKey ? spriteImages[spriteKey] : undefined

      const ox = obj.x * 16 * scale
      const oy = obj.y * 16 * scale

      let hitX: number, hitY: number, hitW: number, hitH: number
      if (spriteImg) {
        hitW = spriteImg.naturalWidth * scale
        hitH = spriteImg.naturalHeight * scale
        const offsetY = (spriteImg.naturalHeight - 16) * scale
        hitX = ox
        hitY = oy - offsetY
      } else if (GROUND_KINDS.has(obj.kind) || !obj.gfx) {
        hitX = ox
        hitY = oy
        hitW = 16 * scale
        hitH = 16 * scale
      } else {
        continue
      }

      if (worldX >= hitX && worldX < hitX + hitW && worldY >= hitY && worldY < hitY + hitH) {
        return obj
      }
    }
    return null
  }

  const getConnectionAt = (e: React.MouseEvent): string | null => {
    const { worldX, worldY } = screenToWorld(e)
    const mx = Math.floor(worldX / (16 * scale))
    const my = Math.floor(worldY / (16 * scale))
    for (const conn of connections) {
      const pos = getConnectionPosition(conn, width, height)
      if (mx >= pos.x && mx < pos.x + conn.width && my >= pos.y && my < pos.y + conn.height) {
        return conn.mapName
      }
    }
    return null
  }

  /* ---------- Mouse handlers ---------- */

  const handleMouseMove = (e: React.MouseEvent) => {
    /* Panning */
    if (panRef.current.active) {
      const dx = e.clientX - panRef.current.startX
      const dy = e.clientY - panRef.current.startY
      setCamera(panRef.current.camStartX - dx, panRef.current.camStartY - dy)
      return
    }

    /* Object dragging */
    if (objDragRef.current?.active) {
      const { worldX, worldY } = screenToWorld(e)
      const dx = worldX - objDragRef.current.startWorldX
      const dy = worldY - objDragRef.current.startWorldY
      const snapX = objDragRef.current.objOrigX + Math.round(dx / (16 * scale))
      const snapY = objDragRef.current.objOrigY + Math.round(dy / (16 * scale))
      const clampX = Math.max(0, Math.min(width - 1, snapX))
      const clampY = Math.max(0, Math.min(height - 1, snapY))

      if (clampX !== objDragRef.current.lastSnapX || clampY !== objDragRef.current.lastSnapY) {
        objDragRef.current.lastSnapX = clampX
        objDragRef.current.lastSnapY = clampY
        objDragRef.current.didMove = true
        const dp = {
          eventArray: objDragRef.current.eventArray,
          eventIndex: objDragRef.current.eventIndex,
          x: clampX,
          y: clampY,
        }
        dragPreviewRef.current = dp
        scheduleRedraw()
      }
      return
    }

    /* Paint drag — add cells to paint buffer as mouse moves */
    if (paintActiveRef.current && selectedMetatile !== null) {
      const cell = getCellAt(e)
      if (cell) {
        const key = `${cell.x},${cell.y}`
        if (!paintBufRef.current.has(key)) {
          paintBufRef.current.set(key, { x: cell.x, y: cell.y, metatileId: selectedMetatile })
        }
      }
      return
    }

    /* Normal hover / select drag */
    const cell = getCellAt(e)
    if (cell) {
      const idx = cell.y * width + cell.x
      if (hoverCellRef.current !== idx) {
        hoverCellRef.current = idx
        hoverCellSignal.set(idx)
        scheduleRedraw()
      }
      if (selectStartRef.current) { selectEndRef.current = cell; scheduleRedraw() }
    } else if (hoverCellRef.current !== null) {
      hoverCellRef.current = null
      hoverCellSignal.set(null)
      scheduleRedraw()
    }

    /* Update cursor in object mode */
    if (activeTool === 'object') {
      const obj = getObjectAt(e)
      setCursorClass(obj ? 'cursor-grab' : 'cursor-default')
    }

    /* Object hover tooltip */
    const hovObj = getObjectAt(e)
    if (hovObj?.label) {
      const rect = canvasRectRef.current || canvasRef.current!.getBoundingClientRect()
      setObjTooltip({ label: hovObj.label, x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 8 })
    } else {
      setObjTooltip(null)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (ctxMenu) { setCtxMenu(null); return }
    /* Middle/right-click = pan, or left-click in pan mode / space-hold */
    const isPanTool = activeTool === 'pan' || spaceHeldRef.current
    if (e.button === 1 || e.button === 2 || (e.button === 0 && isPanTool)) {
      e.preventDefault()
      if (spaceHeldRef.current) spacePanUsed.current = true
      panRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        camStartX: cameraRef.current.x,
        camStartY: cameraRef.current.y,
      }
      if (isPanTool) setCursorClass('cursor-grabbing')
      return
    }

    if (activeTool === 'paint') {
      if (selectedMetatile === null) return
      const cell = getCellAt(e)
      if (!cell) return
      paintBufRef.current.clear()
      paintActiveRef.current = true
      const key = `${cell.x},${cell.y}`
      paintBufRef.current.set(key, { x: cell.x, y: cell.y, metatileId: selectedMetatile })
      return
    }

    if (activeTool === 'object') {
      const obj = getObjectAt(e)
      if (obj) {
        setSelectedObject({ eventArray: obj.eventArray, eventIndex: obj.eventIndex })
        const { worldX, worldY } = screenToWorld(e)
        objDragRef.current = {
          active: true,
          eventArray: obj.eventArray,
          eventIndex: obj.eventIndex,
          startWorldX: worldX,
          startWorldY: worldY,
          objOrigX: obj.x,
          objOrigY: obj.y,
          lastSnapX: obj.x,
          lastSnapY: obj.y,
          didMove: false,
        }
        setCursorClass('cursor-grabbing')
      } else {
        setSelectedObject(null)
      }
      return
    }

    /* Select tool */
    const cell = getCellAt(e)
    if (cell) {
      selectStartRef.current = cell
      selectEndRef.current = cell
      scheduleRedraw()
      setSelection(null)
      setTooltip(null)
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    /* End panning */
    if (panRef.current.active) {
      panRef.current.active = false
      if (spacePanUsed.current) exitSpacePan()
      else if (activeTool === 'pan') setCursorClass('cursor-grab')
      return
    }

    /* End paint stroke — flush to server */
    if (paintActiveRef.current) {
      paintActiveRef.current = false
      const tiles = [...paintBufRef.current.values()]
      paintBufRef.current.clear()
      if (tiles.length > 0) {
        paintTiles({ data: { mapName, tiles } }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['metadata', mapName] })
          queryClient.invalidateQueries({ queryKey: ['mapPng', mapName] })
          queryClient.invalidateQueries({ queryKey: ['foregroundPng', mapName] })
        })
      }
      return
    }

    /* End object drag */
    if (objDragRef.current?.active) {
      const drag = objDragRef.current
      objDragRef.current = null
      setCursorClass('cursor-grab')

      if (drag.didMove && (drag.lastSnapX !== drag.objOrigX || drag.lastSnapY !== drag.objOrigY)) {
        /* Optimistically update cached position so there's no snap-back */
        queryClient.setQueryData<MapMetadata>(
          ['metadata', mapName],
          (old) => {
            if (!old) return old
            return {
              ...old,
              objects: old.objects.map((obj) =>
                obj.eventArray === drag.eventArray && obj.eventIndex === drag.eventIndex
                  ? { ...obj, x: drag.lastSnapX, y: drag.lastSnapY }
                  : obj,
              ),
            }
          },
        )
        /* Persist to server */
        moveObject({
          data: {
            mapName,
            eventArray: drag.eventArray,
            eventIndex: drag.eventIndex,
            x: drag.lastSnapX,
            y: drag.lastSnapY,
          },
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['metadata', mapName] })
        })
      }
      dragPreviewRef.current = null
      scheduleRedraw()
      return
    }

    /* Connection click */
    if (activeTool !== 'select' && !selectStartRef.current) {
      const connMap = getConnectionAt(e)
      if (connMap) {
        navigate({ to: '/map/$name', params: { name: connMap } })
      }
      return
    }

    /* End cell selection */
    if (!selectStartRef.current) {
      const connMap = getConnectionAt(e)
      if (connMap) {
        navigate({ to: '/map/$name', params: { name: connMap } })
      }
      return
    }

    const end = getCellAt(e) || selectEndRef.current
    if (end && selectStartRef.current) {
      const sel = {
        x1: Math.min(selectStartRef.current.x, end.x),
        y1: Math.min(selectStartRef.current.y, end.y),
        x2: Math.max(selectStartRef.current.x, end.x),
        y2: Math.max(selectStartRef.current.y, end.y),
      }
      setSelection(sel)

      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        const tx = rect.left + (sel.x2 + 1) * 16 * scale - cameraRef.current.x + 8
        const ty = rect.top + (sel.y2 + 1) * 16 * scale - cameraRef.current.y + 8
        setTooltip({ x: tx, y: ty })
      }
    }
    selectStartRef.current = null
    selectEndRef.current = null
    scheduleRedraw()
  }

  const handleCopy = () => {
    if (!selection) return
    const selCells = []
    for (let cy = selection.y1; cy <= selection.y2; cy++) {
      for (let cx = selection.x1; cx <= selection.x2; cx++) {
        selCells.push(cells[cy * width + cx])
      }
    }
    const text = JSON.stringify(selCells.length === 1 ? selCells[0] : selCells, null, 2)
    navigator.clipboard.writeText(text).catch(() => {})
    setTooltip(null)
  }

  const handleDelete = () => {
    if (!selection) return
    const selCells = []
    for (let cy = selection.y1; cy <= selection.y2; cy++) {
      for (let cx = selection.x1; cx <= selection.x2; cx++) {
        selCells.push({ x: cx, y: cy })
      }
    }
    const text = JSON.stringify(selCells, null, 2)
    navigator.clipboard.writeText(text).catch(() => {})
    setTooltip(null)
    setSelection(null)
  }

  /* Dismiss tooltip on click outside */
  useEffect(() => {
    if (!tooltip) return
    const handler = (e: MouseEvent) => {
      const wrapper = wrapperRef.current
      if (wrapper && !wrapper.contains(e.target as Node)) {
        setTooltip(null)
        setSelection(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [tooltip])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()

    /* Pinch-to-zoom: browsers report as ctrlKey + wheel */
    if (e.ctrlKey) {
      const zoomSpeed = 0.01
      const newScale = Math.max(1, Math.min(4, scale * (1 - e.deltaY * zoomSpeed)))
      if (newScale === scale) return

      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const worldX = (mouseX + cameraRef.current.x) / scale
      const worldY = (mouseY + cameraRef.current.y) / scale
      const newCamX = worldX * newScale - mouseX
      const newCamY = worldY * newScale - mouseY

      wheelZoomRef.current = true
      setScale(newScale)
      setCamera(newCamX, newCamY)
      return
    }

    /* Two-finger drag / mouse wheel: pan the canvas */
    setCamera(cameraRef.current.x + e.deltaX, cameraRef.current.y + e.deltaY)
  }, [scale, setScale, setCamera])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  /* Touch pinch-to-zoom + two-finger pan for touchscreens */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        const t0 = e.touches[0], t1 = e.touches[1]
        const dx = t1.clientX - t0.clientX
        const dy = t1.clientY - t0.clientY
        const midX = (t0.clientX + t1.clientX) / 2
        const midY = (t0.clientY + t1.clientY) / 2
        touchRef.current = {
          startDist: Math.hypot(dx, dy),
          startScale: scale,
          startMidX: midX,
          startMidY: midY,
          startCamX: cameraRef.current.x,
          startCamY: cameraRef.current.y,
        }
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchRef.current) {
        e.preventDefault()
        const t0 = e.touches[0], t1 = e.touches[1]
        const dx = t1.clientX - t0.clientX
        const dy = t1.clientY - t0.clientY
        const dist = Math.hypot(dx, dy)
        const midX = (t0.clientX + t1.clientX) / 2
        const midY = (t0.clientY + t1.clientY) / 2

        /* Pan: move camera by the distance the midpoint shifted */
        const panDx = midX - touchRef.current.startMidX
        const panDy = midY - touchRef.current.startMidY
        const newCamX = touchRef.current.startCamX - panDx
        const newCamY = touchRef.current.startCamY - panDy

        /* Zoom: continuous scale clamped to 1-4 */
        const ratio = dist / touchRef.current.startDist
        const newScale = Math.max(1, Math.min(4, touchRef.current.startScale * ratio))

        /* Zoom towards the midpoint between fingers */
        const rect = canvas.getBoundingClientRect()
        const fingerX = midX - rect.left
        const fingerY = midY - rect.top
        const worldX = (fingerX + newCamX) / scale
        const worldY = (fingerY + newCamY) / scale
        wheelZoomRef.current = true
        setScale(newScale)
        setCamera(worldX * newScale - fingerX, worldY * newScale - fingerY)
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        touchRef.current = null
      }
    }

    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)
    canvas.addEventListener('touchcancel', onTouchEnd)
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
      canvas.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [scale, setScale, setCamera])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    if (activeTool === 'object' || activeTool === 'select') {
      const obj = getObjectAt(e)
      if (obj) {
        setCtxMenu({ x: e.clientX, y: e.clientY, obj })
        return
      }
    }
    setCtxMenu(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('application/entity-kind')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'

    const canvas = canvasRef.current!
    const rect = canvasRectRef.current || canvas.getBoundingClientRect()
    const worldX = (e.clientX - rect.left) + cameraRef.current.x
    const worldY = (e.clientY - rect.top) + cameraRef.current.y
    const mx = Math.floor(worldX / (16 * scale))
    const my = Math.floor(worldY / (16 * scale))

    const prev = placementPreviewRef.current
    if (!prev || prev.x !== mx || prev.y !== my) {
      const kind = draggingEntityKind || ''
      placementPreviewRef.current = { kind, x: mx, y: my }
      scheduleRedraw()
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    /* Only clear when actually leaving the canvas, not entering a child */
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    placementPreviewRef.current = null
    scheduleRedraw()
  }

  const handleDrop = (e: React.DragEvent) => {
    placementPreviewRef.current = null
    scheduleRedraw()

    const kind = e.dataTransfer.getData('application/entity-kind')
    const eventArray = e.dataTransfer.getData('application/entity-array')
    if (!kind || !eventArray) return
    e.preventDefault()

    const canvas = canvasRef.current!
    const rect = canvasRectRef.current || canvas.getBoundingClientRect()
    const worldX = (e.clientX - rect.left) + cameraRef.current.x
    const worldY = (e.clientY - rect.top) + cameraRef.current.y
    const mx = Math.floor(worldX / (16 * scale))
    const my = Math.floor(worldY / (16 * scale))
    if (mx < 0 || mx >= width || my < 0 || my >= height) return

    addObject({ data: { mapName, kind, eventArray, x: mx, y: my } }).then((res) => {
      queryClient.invalidateQueries({ queryKey: ['metadata', mapName] })
      if (res.ok) {
        setSelectedObject({ eventArray, eventIndex: res.eventIndex })
      }
    })
  }

  const isPanning = activeTool === 'pan' || spaceHeld
  const effectiveCursor = isPanning
    ? (panRef.current.active ? 'cursor-grabbing' : 'cursor-grab')
    : activeTool === 'paint' ? 'cursor-crosshair'
    : activeTool === 'select' ? 'cursor-crosshair'
    : cursorClass

  return (
    <div ref={wrapperRef} className="relative">
      <canvas
        ref={canvasRef}
        className={`${effectiveCursor} block`}
        style={{ width: viewportSize.w, height: viewportSize.h, touchAction: 'none' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          hoverCellRef.current = null
          hoverCellSignal.set(null)
          setObjTooltip(null)
          scheduleRedraw()
          panRef.current.active = false
          paintActiveRef.current = false
        }}
        onContextMenu={handleContextMenu}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />
      {tooltip && selection && (
        <div
          className="fixed z-[100] flex gap-0.5 bg-hud-bg border border-hud-fg p-0.5"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <button
            onClick={handleCopy}
            className="px-2 py-0.5 text-sm uppercase tracking-widest bg-transparent text-hud-fg border border-hud-border hover:bg-hud-active hover:text-hud-active-fg cursor-pointer"
          >
            Copy
          </button>
          <button
            onClick={handleDelete}
            className="px-2 py-0.5 text-sm uppercase tracking-widest bg-transparent text-hud-fg border border-hud-border hover:bg-hud-active hover:text-hud-active-fg cursor-pointer"
          >
            Delete
          </button>
        </div>
      )}
      {objTooltip && !ctxMenu && (
        <div
          className="absolute z-50 px-1.5 py-0.5 text-sm font-mono bg-hud-bg text-hud-fg border border-hud-border pointer-events-none whitespace-nowrap"
          style={{ left: objTooltip.x, top: objTooltip.y }}
        >
          {objTooltip.label}
        </div>
      )}
      {ctxMenu && (
        <div
          className="fixed z-[100] flex flex-col bg-hud-bg border border-hud-border shadow-lg"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
        >
          <div className="px-3 py-1 text-xs uppercase tracking-widest text-hud-muted border-b border-hud-border">
            {ctxMenu.obj.kind} ({ctxMenu.obj.x}, {ctxMenu.obj.y})
          </div>
          <button
            onClick={() => {
              setSelectedObject({ eventArray: ctxMenu.obj.eventArray, eventIndex: ctxMenu.obj.eventIndex })
              setCtxMenu(null)
            }}
            className="px-3 py-1.5 text-sm uppercase tracking-widest bg-transparent text-hud-fg border-none text-left hover:bg-hud-active hover:text-hud-active-fg cursor-pointer"
          >
            Select
          </button>
          <button
            onClick={() => {
              const obj = ctxMenu.obj
              const SKIP = new Set(['x', 'y'])
              const props = Object.entries(obj.rawData)
                .filter(([k]) => !SKIP.has(k))
                .map(([k, v]) => `${k}=${String(v)}`)
                .join(', ')
              attachContext({
                label: `${obj.kind} @ (${obj.x},${obj.y})`,
                detail: `${obj.eventArray}[${obj.eventIndex}] ${props}`,
              })
              setRightPanel('ai')
              setCtxMenu(null)
            }}
            className="px-3 py-1.5 text-sm uppercase tracking-widest bg-transparent text-hud-fg border-none text-left hover:bg-hud-active hover:text-hud-active-fg cursor-pointer"
          >
            Add to Chat
          </button>
          <button
            onClick={() => {
              const obj = ctxMenu.obj
              deleteObject({ data: { mapName, eventArray: obj.eventArray, eventIndex: obj.eventIndex } }).then(() => {
                queryClient.invalidateQueries({ queryKey: ['metadata', mapName] })
              })
              setSelectedObject(null)
              setCtxMenu(null)
            }}
            className="px-3 py-1.5 text-sm uppercase tracking-widest bg-transparent text-red-400 border-none text-left hover:bg-red-900/40 hover:text-red-300 cursor-pointer"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
