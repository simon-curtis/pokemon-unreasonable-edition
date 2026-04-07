import type { Cell, ConnectionInfo, MapObject, OverlayState, ProvenanceEntry, SelectionRange } from './types'
import { CATEGORY_COLORS, OBJ_COLORS, OBJ_SYMBOLS } from './constants'
import { getCanvasTheme } from './canvas-theme'

export interface ConnectionImage {
  info: ConnectionInfo
  img: HTMLImageElement
}

export interface DragPreview {
  eventArray: string
  eventIndex: number
  x: number
  y: number
}

export interface PlacementPreview {
  kind: string
  x: number
  y: number
}

export interface DrawMapState {
  scale: number
  overlays: OverlayState
  hoverCell: number | null
  selection: SelectionRange | null
  selectDrag: SelectionRange | null
  highlightMetatile: number | null
  spriteImages: Record<string, HTMLImageElement>
  connectionImages: ConnectionImage[]
  cameraX: number
  cameraY: number
  viewportW: number
  viewportH: number
  selectedObject: { eventArray: string; eventIndex: number } | null
  dragPreview: DragPreview | null
  placementPreview: PlacementPreview | null
  /* Pre-computed by caller (memoized) to avoid per-frame work */
  sortedObjects: MapObject[]
  spriteKeys: string[]
  objByEvent: Map<string, MapObject>
}

/** Compute where each connection sits relative to the main map origin (in metatile coords) */
export function getConnectionPosition(conn: ConnectionInfo, mainW: number, mainH: number) {
  switch (conn.direction) {
    case 'up': return { x: conn.offset, y: -conn.height }
    case 'down': return { x: conn.offset, y: mainH }
    case 'left': return { x: -conn.width, y: conn.offset }
    case 'right': return { x: mainW, y: conn.offset }
  }
}

/** Compute the expanded canvas bounds to fit all connections */
export function getCanvasBounds(
  mainW: number,
  mainH: number,
  connections: ConnectionInfo[],
): { totalW: number; totalH: number; originX: number; originY: number } {
  let minX = 0, minY = 0, maxX = mainW, maxY = mainH
  for (const conn of connections) {
    const pos = getConnectionPosition(conn, mainW, mainH)
    minX = Math.min(minX, pos.x)
    minY = Math.min(minY, pos.y)
    maxX = Math.max(maxX, pos.x + conn.width)
    maxY = Math.max(maxY, pos.y + conn.height)
  }
  return {
    totalW: maxX - minX,
    totalH: maxY - minY,
    originX: -minX,
    originY: -minY,
  }
}

function isObjMatch(obj: MapObject, id: { eventArray: string; eventIndex: number }): boolean {
  return obj.eventArray === id.eventArray && obj.eventIndex === id.eventIndex
}

/* Reusable result object — avoids allocation per object per frame */
const _drawPos = { x: 0, y: 0, dragging: false }

function getObjDrawPos(obj: MapObject, dragPreview: DragPreview | null): { x: number; y: number; dragging: boolean } {
  if (dragPreview && isObjMatch(obj, dragPreview)) {
    _drawPos.x = dragPreview.x
    _drawPos.y = dragPreview.y
    _drawPos.dragging = true
  } else {
    _drawPos.x = obj.x
    _drawPos.y = obj.y
    _drawPos.dragging = false
  }
  return _drawPos
}

/* Hoisted outside drawMap to avoid re-creating every frame */
const GROUND_KINDS = new Set(['item', 'warp', 'trigger', 'coord', 'sign', 'hidden'])
const SPRITE_KINDS = new Set(['npc', 'trainer', 'item'])
const EVENT_KINDS = new Set(['warp', 'trigger', 'coord', 'sign', 'hidden'])

export function drawMap(
  ctx: CanvasRenderingContext2D,
  mapImg: HTMLImageElement,
  fgImg: HTMLImageElement | null,
  width: number,
  height: number,
  cells: Cell[],
  objects: MapObject[],
  provenance: (ProvenanceEntry | null)[] | null,
  state: DrawMapState,
) {
  const { scale, overlays, hoverCell, highlightMetatile, connectionImages, cameraX, cameraY, viewportW, viewportH } = state
  const theme = getCanvasTheme()
  const ts = 16 * scale /* tileSize — precomputed */
  const pw = width * 16
  const ph = height * 16
  /* Pre-compute font strings to avoid template allocation in tight loops */
  const fontIds = `${8 * scale}px monospace`
  const fontObjSymbol = `bold ${10 * scale}px monospace`

  const fontProvenance = `${7 * scale}px monospace`
  const fontConnLabel = `${9 * scale}px monospace`

  /* Size canvas to viewport — only resize when dimensions change to avoid layout thrash */
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const targetW = viewportW * dpr
  const targetH = viewportH * dpr
  if (ctx.canvas.width !== targetW || ctx.canvas.height !== targetH) {
    ctx.canvas.width = targetW
    ctx.canvas.height = targetH
    ctx.canvas.style.width = viewportW + 'px'
    ctx.canvas.style.height = viewportH + 'px'
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.imageSmoothingEnabled = false

  /* Clear with HUD background */
  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, viewportW, viewportH)

  /* Apply camera transform: shift world so camera position is at viewport origin */
  ctx.save()
  ctx.translate(-cameraX, -cameraY)

  /* Compute visible tile range for viewport culling */
  const visMinX = Math.max(0, Math.floor(cameraX / ts))
  const visMinY = Math.max(0, Math.floor(cameraY / ts))
  const visMaxX = Math.min(width - 1, Math.floor((cameraX + viewportW) / ts))
  const visMaxY = Math.min(height - 1, Math.floor((cameraY + viewportH) / ts))

  /* Draw connection maps at reduced opacity */
  ctx.globalAlpha = 0.3
  for (const { info, img } of connectionImages) {
    const pos = getConnectionPosition(info, width, height)
    ctx.drawImage(img, pos.x * ts, pos.y * ts, info.width * ts, info.height * ts)
  }
  ctx.globalAlpha = 1.0

  /* Draw main map (origin at 0,0 in world space) */
  ctx.drawImage(mapImg, 0, 0, pw * scale, ph * scale)

  /* collision / category / ids — only iterate visible cells */
  const showCollision = overlays.collision
  const showCategory = overlays.category
  const showIds = overlays.ids
  if (showCollision || showCategory || showIds) {
    if (showIds) {
      ctx.font = fontIds
    }
    for (let y = visMinY; y <= visMaxY; y++) {
      for (let x = visMinX; x <= visMaxX; x++) {
        const c = cells[y * width + x]
        const sx = x * ts
        const sy = y * ts

        if (showCollision && c.collision > 0) {
          ctx.fillStyle = 'rgba(255,0,0,0.35)'
          ctx.fillRect(sx, sy, ts, ts)
        }
        if (showCategory) {
          ctx.fillStyle = CATEGORY_COLORS[c.category] || 'rgba(128,128,128,0.2)'
          ctx.fillRect(sx, sy, ts, ts)
        }
        if (showIds) {
          ctx.fillStyle = theme.idText
          ctx.fillText(String(c.metatile_id), sx + 1, sy + 10 * scale)
        }
      }
    }
  }

  /* grid — single path for all lines, only visible range */
  if (overlays.grid) {
    ctx.strokeStyle = theme.grid
    ctx.lineWidth = 1
    ctx.beginPath()
    const gridTop = visMinY * ts
    const gridBot = (visMaxY + 1) * ts
    const gridLeft = visMinX * ts
    const gridRight = (visMaxX + 1) * ts
    for (let x = visMinX; x <= visMaxX + 1; x++) {
      const px = x * ts
      ctx.moveTo(px, gridTop)
      ctx.lineTo(px, gridBot)
    }
    for (let y = visMinY; y <= visMaxY + 1; y++) {
      const py = y * ts
      ctx.moveTo(gridLeft, py)
      ctx.lineTo(gridRight, py)
    }
    ctx.stroke()
  }

  /* highlight metatile from tilemap — only visible cells */
  if (highlightMetatile !== null) {
    ctx.fillStyle = theme.overlayFill
    ctx.strokeStyle = theme.activeBorder
    ctx.lineWidth = 1
    for (let y = visMinY; y <= visMaxY; y++) {
      for (let x = visMinX; x <= visMaxX; x++) {
        const c = cells[y * width + x]
        if (c.metatile_id === highlightMetatile) {
          const sx = x * ts
          const sy = y * ts
          ctx.fillRect(sx, sy, ts, ts)
          ctx.strokeRect(sx, sy, ts, ts)
        }
      }
    }
  }

  /* provenance on hover */
  if (overlays.provenance && hoverCell !== null && provenance) {
    const c = cells[hoverCell]
    const prov = provenance[hoverCell]
    if (prov?.sources) {
      const cx = (c.x * 16 + 8) * scale
      const cy = (c.y * 16 + 8) * scale
      ctx.strokeStyle = theme.fg
      ctx.lineWidth = 1
      ctx.strokeRect(c.x * ts, c.y * ts, ts, ts)
      ctx.strokeStyle = theme.muted
      for (const src of prov.sources) {
        const sx = (src.x * 16 + 8) * scale
        const sy = (src.y * 16 + 8) * scale
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(cx, cy)
        ctx.stroke()
        const angle = Math.atan2(cy - sy, cx - sx)
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx - 8 * Math.cos(angle - 0.4), cy - 8 * Math.sin(angle - 0.4))
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx - 8 * Math.cos(angle + 0.4), cy - 8 * Math.sin(angle + 0.4))
        ctx.stroke()
        ctx.fillStyle = theme.muted
        ctx.font = fontProvenance
        ctx.fillText(src.reason, sx + 4, sy - 4)
      }
      ctx.fillStyle = theme.fg
      ctx.font = fontProvenance
      ctx.fillText(prov.method || '', cx + 4, cy - 4)
    }
  }

  /* Use pre-sorted objects and pre-computed sprite keys from caller */
  const { spriteImages, dragPreview, selectedObject, sortedObjects: callerSorted, spriteKeys: callerKeys, objByEvent: callerIndex } = state
  const showSprites = overlays.sprites
  const showEvents = overlays.events
  const sortedObjects = (showSprites || showEvents) && callerSorted.length > 0
    ? callerSorted
    : [] as MapObject[]
  const spriteKeys = callerKeys
  const objByEvent = callerIndex

  /* Trainer sight zones — subtle overlay showing detection range */
  if (sortedObjects.length > 0 && showSprites) {
    for (let si = 0; si < sortedObjects.length; si++) {
      const obj = sortedObjects[si]
      if (obj.kind !== 'trainer') continue
      const range = Number(obj.rawData.trainer_sight_or_berry_tree_id) || 0
      if (range <= 0) continue

      const dp = getObjDrawPos(obj, dragPreview)
      /* facing: 0=down, 1=up, 2=left, 3=right */
      const dx = obj.facing === 2 ? -1 : obj.facing === 3 ? 1 : 0
      const dy = obj.facing === 0 ? 1 : obj.facing === 1 ? -1 : 0

      ctx.fillStyle = 'rgba(255,70,70,0.3)'
      for (let step = 1; step <= range; step++) {
        const tx = dp.x + dx * step
        const ty = dp.y + dy * step
        if (tx < 0 || ty < 0 || tx >= width || ty >= height) break
        ctx.fillRect(tx * ts, ty * ts, ts, ts)
      }
    }
  }

  /* Tall NPC/trainer sprites — drawn before foreground so they go behind tree crowns */
  if (sortedObjects.length > 0) {
    for (let si = 0; si < sortedObjects.length; si++) {
      const obj = sortedObjects[si]
      if (GROUND_KINDS.has(obj.kind)) continue
      if (SPRITE_KINDS.has(obj.kind) && !showSprites) continue
      if (EVENT_KINDS.has(obj.kind) && !showEvents) continue
      const spriteKey = spriteKeys[si]
      const spriteImg = spriteKey ? spriteImages[spriteKey] : undefined
      if (!spriteImg) continue

      const dp = getObjDrawPos(obj, dragPreview)

      /* Ghost at original position while dragging */
      if (dp.dragging) {
        ctx.globalAlpha = 0.25
        const gx = obj.x * ts
        const gy = obj.y * ts
        const offsetY = (spriteImg.naturalHeight - 16) * scale
        ctx.drawImage(spriteImg, gx, gy - offsetY, spriteImg.naturalWidth * scale, spriteImg.naturalHeight * scale)
        ctx.globalAlpha = 1.0
      }

      const sx = dp.x * ts
      const sy = dp.y * ts
      const spriteW = spriteImg.naturalWidth * scale
      const spriteH = spriteImg.naturalHeight * scale
      const offsetY = (spriteImg.naturalHeight - 16) * scale
      ctx.drawImage(spriteImg, sx, sy - offsetY, spriteW, spriteH)
    }
  }

  /* Grass wading effect — redraw bottom half of base tile over NPC feet */
  if (showSprites || showEvents) {
    for (let si = 0; si < sortedObjects.length; si++) {
      const obj = sortedObjects[si]
      if (GROUND_KINDS.has(obj.kind)) continue
      if (SPRITE_KINDS.has(obj.kind) && !showSprites) continue
      if (EVENT_KINDS.has(obj.kind) && !showEvents) continue
      const spriteKey = spriteKeys[si]
      if (!spriteKey || !spriteImages[spriteKey]) continue
      const dp = getObjDrawPos(obj, dragPreview)
      const cellIdx = dp.y * width + dp.x
      if (cellIdx >= cells.length || cellIdx < 0) continue
      if (cells[cellIdx].category === 'grass') {
        ctx.drawImage(
          mapImg,
          dp.x * 16, dp.y * 16 + 9, 16, 7,
          dp.x * ts, (dp.y * 16 + 9) * scale, ts, 7 * scale,
        )
      }
    }
  }

  /* foreground overlay — metatile top layers (tree crowns etc.) in front of sprites */
  if (fgImg) {
    ctx.drawImage(fgImg, 0, 0, pw * scale, ph * scale)
  }

  /* Ground-level objects — drawn after foreground so they're always visible */
  if (sortedObjects.length > 0) {
    for (let si = 0; si < sortedObjects.length; si++) {
      const obj = sortedObjects[si]
      if (!GROUND_KINDS.has(obj.kind)) continue
      if (SPRITE_KINDS.has(obj.kind) && !showSprites) continue
      if (EVENT_KINDS.has(obj.kind) && !showEvents) continue

      const dp = getObjDrawPos(obj, dragPreview)
      const sx = dp.x * ts
      const sy = dp.y * ts
      const color = OBJ_COLORS[obj.kind] || '#fff'
      const spriteKey = spriteKeys[si]
      const spriteImg = spriteKey ? spriteImages[spriteKey] : undefined

      /* Ghost at original position while dragging */
      if (dp.dragging) {
        ctx.globalAlpha = 0.25
        const gx = obj.x * ts
        const gy = obj.y * ts
        if (spriteImg) {
          const offsetY = (spriteImg.naturalHeight - 16) * scale
          ctx.drawImage(spriteImg, gx, gy - offsetY, spriteImg.naturalWidth * scale, spriteImg.naturalHeight * scale)
        } else {
          ctx.fillStyle = color + '55'
          ctx.fillRect(gx, gy, ts, ts)
          ctx.strokeStyle = color
          ctx.strokeRect(gx + 1, gy + 1, ts - 2, ts - 2)
        }
        ctx.globalAlpha = 1.0
      }

      if (spriteImg) {
        const spriteW = spriteImg.naturalWidth * scale
        const spriteH = spriteImg.naturalHeight * scale
        const offsetY = (spriteImg.naturalHeight - 16) * scale
        ctx.drawImage(spriteImg, sx, sy - offsetY, spriteW, spriteH)
      } else {
        ctx.fillStyle = color + '55'
        ctx.fillRect(sx, sy, ts, ts)
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.strokeRect(sx + 1, sy + 1, ts - 2, ts - 2)

        ctx.fillStyle = color
        ctx.font = fontObjSymbol
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(OBJ_SYMBOLS[obj.kind] || '?', sx + ts / 2, sy + ts / 2)
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
      }

      /* Labels shown via hover tooltip in MapCanvas */
    }

    /* Grass wading for ground-level objects */
    for (let si = 0; si < sortedObjects.length; si++) {
      const obj = sortedObjects[si]
      if (!GROUND_KINDS.has(obj.kind)) continue
      if (SPRITE_KINDS.has(obj.kind) && !showSprites) continue
      if (EVENT_KINDS.has(obj.kind) && !showEvents) continue
      const spriteKey = spriteKeys[si]
      if (!spriteKey || !spriteImages[spriteKey]) continue
      const dp = getObjDrawPos(obj, dragPreview)
      const cellIdx = dp.y * width + dp.x
      if (cellIdx >= cells.length || cellIdx < 0) continue
      if (cells[cellIdx].category === 'grass') {
        ctx.drawImage(
          mapImg,
          dp.x * 16, dp.y * 16 + 9, 16, 7,
          dp.x * ts, (dp.y * 16 + 9) * scale, ts, 7 * scale,
        )
      }
    }
  }

  /* Selected object highlight — O(1) lookup */
  if (selectedObject && sortedObjects.length > 0) {
    const selObj = objByEvent.get(`${selectedObject.eventArray}:${selectedObject.eventIndex}`)
    if (selObj && !(SPRITE_KINDS.has(selObj.kind) && !showSprites) && !(EVENT_KINDS.has(selObj.kind) && !showEvents)) {
      const dp = getObjDrawPos(selObj, dragPreview)
      const spriteKey = selObj.gfx ? `${selObj.gfx}:${selObj.facing}` : ''
      const spriteImg = spriteKey ? spriteImages[spriteKey] : undefined
      const sx = dp.x * ts
      const sy = dp.y * ts
      const sw = spriteImg ? spriteImg.naturalWidth * scale : ts
      const sh = spriteImg ? spriteImg.naturalHeight * scale : ts
      const offsetY = spriteImg ? (spriteImg.naturalHeight - 16) * scale : 0
      ctx.strokeStyle = theme.activeFg
      ctx.lineWidth = 1
      ctx.setLineDash([4, 3])
      ctx.strokeRect(sx - 1, sy - offsetY - 1, sw + 2, sh + 2)
      ctx.setLineDash([])
    }
  }

  /* selection range */
  const sel = state.selectDrag || state.selection
  if (sel) {
    ctx.strokeStyle = theme.activeFg
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.strokeRect(
      sel.x1 * ts,
      sel.y1 * ts,
      (sel.x2 - sel.x1 + 1) * ts,
      (sel.y2 - sel.y1 + 1) * ts,
    )
    ctx.setLineDash([])
    ctx.fillStyle = theme.selectionFill
    ctx.fillRect(
      sel.x1 * ts,
      sel.y1 * ts,
      (sel.x2 - sel.x1 + 1) * ts,
      (sel.y2 - sel.y1 + 1) * ts,
    )
  }

  /* Placement preview — entity being dragged in from the palette */
  if (state.placementPreview) {
    const pp = state.placementPreview
    const px = pp.x * ts
    const py = pp.y * ts
    const color = OBJ_COLORS[pp.kind] || '#fff'
    ctx.globalAlpha = 0.7
    ctx.fillStyle = color + '55'
    ctx.fillRect(px, py, ts, ts)
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.strokeRect(px + 1, py + 1, ts - 2, ts - 2)
    ctx.fillStyle = color
    ctx.font = fontObjSymbol
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(OBJ_SYMBOLS[pp.kind] || '?', px + ts / 2, py + ts / 2)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.globalAlpha = 1.0
  }

  /* hover highlight */
  if (hoverCell !== null && hoverCell < cells.length) {
    const c = cells[hoverCell]
    ctx.strokeStyle = theme.fg
    ctx.lineWidth = 1
    ctx.strokeRect(c.x * ts + 1, c.y * ts + 1, ts - 2, ts - 2)
  }

  /* Connection map labels */
  for (const { info } of connectionImages) {
    const pos = getConnectionPosition(info, width, height)
    const lx = (pos.x + info.width / 2) * ts
    const ly = (pos.y + info.height / 2) * ts
    ctx.fillStyle = theme.overlayLabel
    ctx.font = fontConnLabel
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(info.mapName.toUpperCase(), lx, ly)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
  }

  ctx.restore()
}
