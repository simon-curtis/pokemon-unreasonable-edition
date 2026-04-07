import type { TileCell } from './map-data'
import type { TilesetData } from './tileset'
import { getBehavior, classifyBehavior } from './tileset'
import type { MapJson } from './map-data'

/* ---------- types (shared with client) ---------- */

export interface Cell {
  x: number
  y: number
  metatile_id: number
  collision: number
  elevation: number
  behavior: number
  category: string
}

export interface MapObject {
  x: number
  y: number
  kind: 'npc' | 'trainer' | 'item' | 'warp' | 'trigger' | 'coord' | 'sign' | 'hidden'
  label: string
  gfx: string
  facing: number
  eventArray: string
  eventIndex: number
  rawData: Record<string, unknown>
}

export interface MetatileInfo {
  id: number
  behavior: number
  category: string
  count: number
}

/* ---------- build cell metadata ---------- */

export function buildCellMetadata(
  grid: TileCell[][],
  width: number,
  height: number,
  ts: TilesetData,
): Cell[] {
  const cells: Cell[] = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [mid, collision, elevation] = grid[y][x]
      const behavior = getBehavior(mid, ts.primaryAttrs, ts.secondaryAttrs)
      const category = classifyBehavior(behavior)
      cells.push({ x, y, metatile_id: mid, collision, elevation, behavior, category })
    }
  }
  return cells
}

/* ---------- movement type → facing frame index ---------- */
/* Frame layout: 0=down, 1=up, 2=left, 3=right */

function movementTypeToFacing(movementType: string): number {
  if (movementType.includes('FACE_UP') || movementType.includes('FACE_NORTH')) return 1
  if (movementType.includes('FACE_LEFT') || movementType.includes('FACE_WEST')) return 2
  if (movementType.includes('FACE_RIGHT') || movementType.includes('FACE_EAST')) return 3
  return 0 /* down/south is default */
}

/* ---------- build object data from map.json ---------- */

export function buildObjectData(mapData: MapJson): MapObject[] {
  const objects: MapObject[] = []

  const objEvents = mapData.object_events || []
  for (let i = 0; i < objEvents.length; i++) {
    const obj = objEvents[i]
    const gfx = (obj.graphics_id || '').replace('OBJ_EVENT_GFX_', '')
    const isItem = gfx.includes('ITEM_BALL')
    const isTrainer = (obj.trainer_type || 'TRAINER_TYPE_NONE') !== 'TRAINER_TYPE_NONE'
    const kind = isItem ? 'item' : isTrainer ? 'trainer' : 'npc'
    const label = (obj.script || '').split('_EventScript_').pop() || ''
    const facing = movementTypeToFacing(obj.movement_type || '')
    objects.push({ x: obj.x, y: obj.y, kind, label, gfx, facing, eventArray: 'object_events', eventIndex: i, rawData: obj })
  }

  const warps = mapData.warp_events || []
  for (let i = 0; i < warps.length; i++) {
    const w = warps[i]
    objects.push({ x: w.x, y: w.y, kind: 'warp', label: w.dest_map || '?', gfx: '', facing: 0, eventArray: 'warp_events', eventIndex: i, rawData: w })
  }

  const coords = mapData.coord_events || []
  for (let i = 0; i < coords.length; i++) {
    const c = coords[i]
    const kind = c.type === 'trigger' ? 'trigger' : 'coord'
    const label = (c.script || '').split('_EventScript_').pop() || ''
    objects.push({ x: c.x, y: c.y, kind, label, gfx: '', facing: 0, eventArray: 'coord_events', eventIndex: i, rawData: c })
  }

  const bgs = mapData.bg_events || []
  for (let i = 0; i < bgs.length; i++) {
    const bg = bgs[i]
    const kind = bg.type === 'hidden_item' ? 'hidden' : 'sign'
    const label = (bg.script || bg.item || '').split('_EventScript_').pop() || ''
    objects.push({ x: bg.x, y: bg.y, kind, label, gfx: '', facing: 0, eventArray: 'bg_events', eventIndex: i, rawData: bg })
  }

  return objects
}

/* ---------- build metatile info ---------- */

export function buildMetatileInfo(grid: TileCell[][], ts: TilesetData): MetatileInfo[] {
  const usage: Record<number, number> = {}
  for (const row of grid) {
    for (const [mid] of row) {
      usage[mid] = (usage[mid] || 0) + 1
    }
  }

  const priCount = ts.primaryMetatiles.length
  const secCount = ts.secondaryMetatiles.length
  const total = priCount + secCount
  const info: MetatileInfo[] = []

  for (let idx = 0; idx < total; idx++) {
    const mid = idx < priCount ? idx : 512 + (idx - priCount)
    const behavior = getBehavior(mid, ts.primaryAttrs, ts.secondaryAttrs)
    const category = classifyBehavior(behavior)
    info.push({ id: mid, behavior, category, count: usage[mid] || 0 })
  }

  return info
}
