import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'

const PROJECT_ROOT = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..')

export function getProjectRoot(): string {
  return PROJECT_ROOT
}


/* ---------- layouts.json ---------- */

interface LayoutEntry {
  id: string
  name: string
  width: number
  height: number
  primary_tileset: string
  secondary_tileset: string
  border_filepath: string
  blockdata_filepath: string
}

interface LayoutsJson {
  layouts_table_label: string
  layouts: LayoutEntry[]
}

let _layoutsCache: LayoutsJson | null = null

export function loadLayoutsJson(): LayoutsJson {
  if (_layoutsCache) return _layoutsCache
  const p = join(PROJECT_ROOT, 'data', 'layouts', 'layouts.json')
  _layoutsCache = JSON.parse(readFileSync(p, 'utf-8'))
  return _layoutsCache!
}

/* ---------- map.json ---------- */

export interface MapJson {
  id: string
  name: string
  layout: string
  music: string
  object_events: any[]
  warp_events: any[]
  coord_events: any[]
  bg_events: any[]
  connections: any[]
  [key: string]: any
}

const _mapJsonCache = new Map<string, MapJson>()

export function loadMapJson(mapName: string): MapJson {
  const cached = _mapJsonCache.get(mapName)
  if (cached) return cached
  const p = join(PROJECT_ROOT, 'data', 'maps', mapName, 'map.json')
  const data = JSON.parse(readFileSync(p, 'utf-8'))
  _mapJsonCache.set(mapName, data)
  return data
}

export function saveMapJson(mapName: string, data: MapJson): void {
  const p = join(PROJECT_ROOT, 'data', 'maps', mapName, 'map.json')
  writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf-8')
  _mapJsonCache.set(mapName, data)
}

/* ---------- MAP_ID → folder name lookup ---------- */

let _mapIdToName: Record<string, string> | null = null

export function mapIdToName(mapId: string): string | null {
  if (!_mapIdToName) {
    _mapIdToName = {}
    const mapsDir = join(PROJECT_ROOT, 'data', 'maps')
    const groups: Record<string, string[]> = JSON.parse(
      readFileSync(join(mapsDir, 'map_groups.json'), 'utf-8'),
    )
    for (const maps of Object.values(groups)) {
      for (const name of maps) {
        const p = join(mapsDir, name, 'map.json')
        if (existsSync(p)) {
          const data = JSON.parse(readFileSync(p, 'utf-8'))
          _mapIdToName[data.id] = name
        }
      }
    }
  }
  return _mapIdToName[mapId] || null
}

/* ---------- find layout for map ---------- */

let _layoutById: Map<string, LayoutEntry> | null = null

function getLayoutById(layoutId: string): LayoutEntry | undefined {
  if (!_layoutById) {
    _layoutById = new Map()
    for (const l of loadLayoutsJson().layouts) {
      _layoutById.set(l.id, l)
    }
  }
  return _layoutById.get(layoutId)
}

export function findLayoutForMap(mapName: string): { layout: LayoutEntry; mapData: MapJson } {
  const mapData = loadMapJson(mapName)
  const layout = getLayoutById(mapData.layout)
  if (!layout) throw new Error(`Layout ${mapData.layout} not found in layouts.json`)
  return { layout, mapData }
}

/* ---------- map_groups.json → sorted map list ---------- */

let _mapNamesCache: string[] | null = null

export function getMapNames(): string[] {
  if (_mapNamesCache) return _mapNamesCache
  const p = join(PROJECT_ROOT, 'data', 'maps', 'map_groups.json')
  const groups: Record<string, string[]> = JSON.parse(readFileSync(p, 'utf-8'))
  const names: string[] = []
  for (const maps of Object.values(groups)) {
    for (const m of maps) {
      names.push(m)
    }
  }
  _mapNamesCache = [...new Set(names)].sort()
  return _mapNamesCache
}

/* ---------- tileset path resolution ---------- */

let _tilesetPathMap: Record<string, string> | null = null

function buildTilesetPathMap(): Record<string, string> {
  const headersPath = join(PROJECT_ROOT, 'src', 'data', 'tilesets', 'headers.h')
  const metatilesPath = join(PROJECT_ROOT, 'src', 'data', 'tilesets', 'metatiles.h')

  const symToPath: Record<string, string> = {}
  const metatilesContent = readFileSync(metatilesPath, 'utf-8')
  const re1 = /const u16 (\w+)\[\] = INCBIN_U16\("([^"]+)"\)/g
  let m: RegExpExecArray | null
  while ((m = re1.exec(metatilesContent))) {
    symToPath[m[1]] = m[2]
  }

  const labelToPath: Record<string, string> = {}
  let currentLabel: string | null = null
  const headersContent = readFileSync(headersPath, 'utf-8')
  for (const line of headersContent.split('\n')) {
    const m1 = line.match(/^const struct Tileset (\w+)/)
    if (m1) currentLabel = m1[1]
    const m2 = line.match(/^\s*\.metatileAttributes = (\w+)/)
    if (m2 && currentLabel) {
      const sym = m2[1]
      if (sym in symToPath) {
        labelToPath[currentLabel] = symToPath[sym]
      }
      currentLabel = null
    }
  }
  return labelToPath
}

export function findTilesetAttributesPath(tilesetLabel: string): string | null {
  if (!_tilesetPathMap) _tilesetPathMap = buildTilesetPathMap()
  const p = _tilesetPathMap[tilesetLabel]
  return p ? join(PROJECT_ROOT, p) : null
}

export function tilesetLabelToDir(label: string): string | null {
  const p = findTilesetAttributesPath(label)
  if (!p) return null
  const tilesetsDir = join(PROJECT_ROOT, 'data', 'tilesets')
  const rel = relative(tilesetsDir, p)
  return dirname(rel)
}

/* ---------- parse map.bin ---------- */

export type TileCell = [metatileId: number, collision: number, elevation: number]

const _gridCache = new Map<string, TileCell[][]>()

export function parseMapBin(binPath: string, width: number, height: number): TileCell[][] {
  const fullPath = binPath.startsWith('/') ? binPath : join(PROJECT_ROOT, binPath)
  const cached = _gridCache.get(fullPath)
  if (cached) return cached

  const data = readFileSync(fullPath)
  const grid: TileCell[][] = []

  for (let y = 0; y < height; y++) {
    const row: TileCell[] = []
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 2
      if (offset + 2 <= data.length) {
        const tile = data.readUInt16LE(offset)
        const metatileId = tile & 0x3ff
        const collision = (tile >> 10) & 0x3
        const elevation = (tile >> 12) & 0xf
        row.push([metatileId, collision, elevation])
      } else {
        row.push([0, 1, 0])
      }
    }
    grid.push(row)
  }
  _gridCache.set(fullPath, grid)
  return grid
}

/* ---------- load provenance ---------- */

export function loadProvenance(mapName: string): any[] | null {
  const { layout } = findLayoutForMap(mapName)
  const layoutDir = layout.name.replace('_Layout', '')
  const p = join(PROJECT_ROOT, 'data', 'layouts', layoutDir, 'map_provenance.json')
  if (existsSync(p)) {
    return JSON.parse(readFileSync(p, 'utf-8'))
  }
  return null
}

export function invalidateGridCache(binPath: string): void {
  const fullPath = binPath.startsWith('/') ? binPath : join(PROJECT_ROOT, binPath)
  _gridCache.delete(fullPath)
}

export function saveLayoutsJson(data: LayoutsJson): void {
  const p = join(PROJECT_ROOT, 'data', 'layouts', 'layouts.json')
  writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf-8')
  _layoutsCache = null
  _layoutById = null
}

/** Clear all map-data caches (called on hot-reload) */
export function clearMapDataCaches(): void {
  _layoutsCache = null
  _mapIdToName = null
  _layoutById = null
  _mapNamesCache = null
  _tilesetPathMap = null
  _mapJsonCache.clear()
  _gridCache.clear()
}
