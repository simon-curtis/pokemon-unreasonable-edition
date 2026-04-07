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
  /** Source array in map.json (object_events, warp_events, coord_events, bg_events) */
  eventArray: string
  /** Index within that array */
  eventIndex: number
  /** Raw event data from map.json */
  rawData: Record<string, unknown>
}

export interface MetatileInfo {
  id: number
  behavior: number
  category: string
  count: number
}

export interface ProvenanceEntry {
  method?: string
  sources?: Array<{ x: number; y: number; reason: string }>
  detail?: string
}

export interface SpriteFrame {
  png: string
  width: number
  height: number
}

export interface ConnectionInfo {
  mapName: string
  direction: 'up' | 'down' | 'left' | 'right'
  offset: number
  width: number
  height: number
  png: string
}

export interface MapMetadata {
  width: number
  height: number
  cells: Cell[]
  objects: MapObject[]
  metatile_info: MetatileInfo[]
  provenance: (ProvenanceEntry | null)[] | null
  pri_count: number
  atlas_cols: number
  sprites: Record<string, SpriteFrame>
  connections: ConnectionInfo[]
  mapProperties: Record<string, unknown>
}

export interface OverlayState {
  grid: boolean
  collision: boolean
  ids: boolean
  category: boolean
  provenance: boolean
  sprites: boolean
  events: boolean
}

export interface SelectionRange {
  x1: number
  y1: number
  x2: number
  y2: number
}
