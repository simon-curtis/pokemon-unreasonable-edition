import { join } from 'node:path'
import { createServerFn } from '@tanstack/react-start'
import {
  findLayoutForMap,
  getMapNames,
  parseMapBin,
  loadProvenance,
  mapIdToName,
  loadMapJson,
  saveMapJson,
  loadLayoutsJson,
  saveLayoutsJson,
  invalidateGridCache,
  clearMapDataCaches,
  getProjectRoot,
} from './map-data'
import { loadTilesetData } from './tileset'
import { renderMapRgba, renderForegroundRgba, renderAtlasRgba, encodePng } from './renderer'
import { buildCellMetadata, buildObjectData, buildMetatileInfo } from './metadata'
import { getSpritesForMap } from './sprites'
import { parseMapScripts } from '#/lib/script-builder/inc-parser'
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import type { Cell, MapObject, MetatileInfo } from './metadata'

/* ---------- rendered PNG cache ---------- */

const _mapPngCache = new Map<string, { png: string; width: number; height: number }>()
const _fgPngCache = new Map<string, { png: string; width: number; height: number }>()
const _atlasCache = new Map<string, { png: string; width: number; height: number; total: number }>()

function getOrRenderMapPng(name: string): { png: string; width: number; height: number } {
  const cached = _mapPngCache.get(name)
  if (cached) return cached
  const { layout } = findLayoutForMap(name)
  const grid = parseMapBin(layout.blockdata_filepath, layout.width, layout.height)
  const ts = loadTilesetData(layout.primary_tileset, layout.secondary_tileset)
  const { buf, pw, ph } = renderMapRgba(grid, layout.width, layout.height, ts)
  const png = encodePng(pw, ph, buf)
  const result = { png: png.toString('base64'), width: pw, height: ph }
  _mapPngCache.set(name, result)
  return result
}

function getOrRenderFgPng(name: string): { png: string; width: number; height: number } {
  const cached = _fgPngCache.get(name)
  if (cached) return cached
  const { layout } = findLayoutForMap(name)
  const grid = parseMapBin(layout.blockdata_filepath, layout.width, layout.height)
  const ts = loadTilesetData(layout.primary_tileset, layout.secondary_tileset)
  const { buf, pw, ph } = renderForegroundRgba(grid, layout.width, layout.height, ts)
  const png = encodePng(pw, ph, buf)
  const result = { png: png.toString('base64'), width: pw, height: ph }
  _fgPngCache.set(name, result)
  return result
}

/** Invalidate cached PNGs when a map is modified */
function invalidateMapCache(name: string): void {
  _mapPngCache.delete(name)
  _fgPngCache.delete(name)
}

/** Clear all render caches (called on hot-reload) */
export function clearRenderCaches(): void {
  _mapPngCache.clear()
  _fgPngCache.clear()
  _atlasCache.clear()
}

const MAP_SKIP = new Set(['object_events', 'warp_events', 'coord_events', 'bg_events', 'connections'])

/* ---------- map list ---------- */

export const getMapList = createServerFn({ method: 'GET' }).handler(async () => {
  const maps = getMapNames()
  return { maps, default: 'Route101' }
})

/* ---------- map metadata ---------- */

export interface SpriteFrame {
  png: string
  width: number
  height: number
}

export interface ConnectionInfo {
  mapName: string
  direction: 'up' | 'down' | 'left' | 'right'
  width: number
  height: number
  offset: number
  png: string
}

export interface MapMetadata {
  width: number
  height: number
  cells: Cell[]
  objects: MapObject[]
  metatile_info: MetatileInfo[]
  provenance: any[] | null
  pri_count: number
  atlas_cols: number
  sprites: Record<string, SpriteFrame>
  connections: ConnectionInfo[]
  mapProperties: Record<string, unknown>
}

function buildConnectionData(mapData: any): ConnectionInfo[] {
  const connections: ConnectionInfo[] = []
  for (const conn of mapData.connections || []) {
    const connMapName = mapIdToName(conn.map)
    if (!connMapName) continue
    try {
      const { layout: connLayout } = findLayoutForMap(connMapName)
      const rendered = getOrRenderMapPng(connMapName)
      connections.push({
        mapName: connMapName,
        direction: conn.direction,
        offset: conn.offset || 0,
        width: connLayout.width,
        height: connLayout.height,
        png: rendered.png,
      })
    } catch {
      /* skip connections we can't resolve */
    }
  }
  return connections
}

export const getMapMetadata = createServerFn({ method: 'GET' }).handler(
  async (ctx: { data: { name: string } }): Promise<MapMetadata> => {
    const name = ctx.data.name
    const { layout, mapData } = findLayoutForMap(name)
    const w = layout.width
    const h = layout.height
    const grid = parseMapBin(layout.blockdata_filepath, w, h)
    const ts = loadTilesetData(layout.primary_tileset, layout.secondary_tileset)

    const cells = buildCellMetadata(grid, w, h, ts)
    const objects = buildObjectData(mapData)
    const metatileInfo = buildMetatileInfo(grid, ts)
    const provenance = loadProvenance(name)
    const sprites = getSpritesForMap(objects)
    const connections = buildConnectionData(mapData)

    /* Extract map-level properties (skip event arrays and connections — shown elsewhere) */
    const mapProperties: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(mapData)) {
      if (!MAP_SKIP.has(k)) mapProperties[k] = v
    }

    /* Parse map-level scripts from scripts.inc */
    try {
      const incPath = join(getProjectRoot(), 'data', 'maps', name, 'scripts.inc')
      const incCode = readFileSync(incPath, 'utf-8')
      const mapScriptInfo = parseMapScripts(incCode)
      mapProperties._mapScripts = mapScriptInfo
    } catch { /* no scripts.inc */ }

    return {
      width: w,
      height: h,
      cells,
      objects,
      metatile_info: metatileInfo,
      provenance,
      pri_count: ts.primaryMetatiles.length,
      atlas_cols: 16,
      sprites,
      connections,
      mapProperties,
    }
  },
)

/* ---------- rendered map PNG ---------- */

export const getMapPng = createServerFn({ method: 'GET' }).handler(
  async (ctx: { data: { name: string } }) => {
    return getOrRenderMapPng(ctx.data.name)
  },
)

/* ---------- foreground overlay PNG (top metatile layer) ---------- */

export const getForegroundPng = createServerFn({ method: 'GET' }).handler(
  async (ctx: { data: { name: string } }) => {
    return getOrRenderFgPng(ctx.data.name)
  },
)

/* ---------- tilemap atlas PNG ---------- */

export const getAtlasPng = createServerFn({ method: 'GET' }).handler(
  async (ctx: { data: { name: string } }) => {
    const name = ctx.data.name
    const { layout } = findLayoutForMap(name)
    const cacheKey = `${layout.primary_tileset}|${layout.secondary_tileset}`
    const cached = _atlasCache.get(cacheKey)
    if (cached) return cached
    const ts = loadTilesetData(layout.primary_tileset, layout.secondary_tileset)
    const { buf, pw, ph, total } = renderAtlasRgba(ts)
    const png = encodePng(pw, ph, buf)
    const result = { png: png.toString('base64'), width: pw, height: ph, total }
    _atlasCache.set(cacheKey, result)
    return result
  },
)

/* ---------- resize map ---------- */

export type Anchor = 'top-left' | 'top' | 'top-right' | 'left' | 'center' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right'

export function anchorOffsets(
  oldW: number, oldH: number,
  newW: number, newH: number,
  anchor: Anchor,
): { dx: number; dy: number } {
  const dw = newW - oldW
  const dh = newH - oldH

  let dx = 0
  let dy = 0

  if (anchor.includes('right')) dx = dw
  else if (!anchor.includes('left')) dx = Math.floor(dw / 2)

  if (anchor.includes('bottom')) dy = dh
  else if (!anchor.includes('top')) dy = Math.floor(dh / 2)

  return { dx, dy }
}

interface ResizeParams {
  mapName: string
  newWidth: number
  newHeight: number
  /** Content shift — how many tiles to move old content within the new grid.
   *  Positive dx = old content moves right, positive dy = old content moves down.
   *  For anchor-based resize, compute via anchorOffsets(). */
  dx: number
  dy: number
  fillTile: number
}

export const resizeMap = createServerFn({ method: 'POST' }).handler(
  async (ctx: { data: ResizeParams }) => {
    const { mapName, newWidth, newHeight, dx, dy, fillTile } = ctx.data
    if (newWidth < 1 || newHeight < 1 || newWidth > 200 || newHeight > 200) {
      throw new Error(`Invalid dimensions: ${newWidth}x${newHeight}`)
    }

    const { layout, mapData } = findLayoutForMap(mapName)
    const oldW = layout.width
    const oldH = layout.height

    if (oldW === newWidth && oldH === newHeight && dx === 0 && dy === 0) return { ok: true }

    /* ---------- resize blockdata ---------- */
    const grid = parseMapBin(layout.blockdata_filepath, oldW, oldH)
    const fillWord = fillTile & 0xffff
    const newBuf = Buffer.alloc(newWidth * newHeight * 2)
    for (let ny = 0; ny < newHeight; ny++) {
      for (let nx = 0; nx < newWidth; nx++) {
        const ox = nx - dx
        const oy = ny - dy
        let word = fillWord
        if (ox >= 0 && ox < oldW && oy >= 0 && oy < oldH) {
          const cell = grid[oy][ox]
          word = (cell[0] & 0x3ff) | ((cell[1] & 0x3) << 10) | ((cell[2] & 0xf) << 12)
        }
        newBuf.writeUInt16LE(word, (ny * newWidth + nx) * 2)
      }
    }

    const root = getProjectRoot()
    const binPath = layout.blockdata_filepath.startsWith('/')
      ? layout.blockdata_filepath
      : join(root, layout.blockdata_filepath)
    writeFileSync(binPath, newBuf)
    invalidateGridCache(layout.blockdata_filepath)

    /* ---------- update layouts.json ---------- */
    const layoutsData = loadLayoutsJson()
    const entry = layoutsData.layouts.find((l) => l.id === layout.id)
    if (entry) {
      entry.width = newWidth
      entry.height = newHeight
      saveLayoutsJson(layoutsData)
    }

    /* ---------- shift objects if anchor adds offset ---------- */
    const EVENT_ARRAYS = ['object_events', 'warp_events', 'coord_events', 'bg_events'] as const
    const clipped: string[] = []

    for (const arrKey of EVENT_ARRAYS) {
      const arr = (mapData as any)[arrKey]
      if (!Array.isArray(arr)) continue
      for (let i = arr.length - 1; i >= 0; i--) {
        const evt = arr[i]
        const nx = evt.x + dx
        const ny = evt.y + dy
        if (nx < 0 || nx >= newWidth || ny < 0 || ny >= newHeight) {
          clipped.push(`${arrKey}[${i}] at (${evt.x},${evt.y})`)
        }
        evt.x = nx
        evt.y = ny
      }
    }

    /* ---------- adjust connection offsets ---------- */
    const connections = mapData.connections || []
    for (const conn of connections) {
      const dir = conn.direction
      if (dir === 'up' || dir === 'down') conn.offset += dx
      else if (dir === 'left' || dir === 'right') conn.offset += dy
    }

    /* ---------- update reciprocal connections on neighbor maps ---------- */
    const REVERSE: Record<string, string> = { up: 'down', down: 'up', left: 'right', right: 'left' }
    const neighborNames: string[] = []
    for (const conn of connections) {
      const neighborName = mapIdToName(conn.map)
      if (!neighborName) continue
      neighborNames.push(neighborName)
      try {
        const neighborData = loadMapJson(neighborName)
        const reverseDir = REVERSE[conn.direction]
        for (const nc of neighborData.connections || []) {
          if (nc.direction === reverseDir && nc.map === mapData.id) {
            if (nc.direction === 'up' || nc.direction === 'down') nc.offset -= dx
            else nc.offset -= dy
          }
        }
        saveMapJson(neighborName, neighborData)
      } catch { /* neighbor not found */ }
    }

    saveMapJson(mapName, mapData)

    /* Full cache reset — layouts.json + blockdata + map.json all changed */
    clearMapDataCaches()
    clearRenderCaches()

    return { ok: true, clipped, neighborNames }
  },
)

/* ---------- paint tiles ---------- */

interface TilePaint {
  x: number
  y: number
  metatileId: number
}

export const paintTiles = createServerFn({ method: 'POST' }).handler(
  async (ctx: { data: { mapName: string; tiles: TilePaint[] } }) => {
    const { mapName, tiles } = ctx.data
    if (!tiles.length) return { ok: true }

    const { layout } = findLayoutForMap(mapName)
    const w = layout.width
    const h = layout.height

    const root = getProjectRoot()
    const binPath = layout.blockdata_filepath.startsWith('/')
      ? layout.blockdata_filepath
      : join(root, layout.blockdata_filepath)
    const buf = readFileSync(binPath)

    for (const t of tiles) {
      if (t.x < 0 || t.x >= w || t.y < 0 || t.y >= h) continue
      const offset = (t.y * w + t.x) * 2
      /* Preserve existing collision + elevation, replace metatile ID */
      const existing = buf.readUInt16LE(offset)
      const collision = (existing >> 10) & 0x3
      const elevation = (existing >> 12) & 0xf
      const word = (t.metatileId & 0x3ff) | (collision << 10) | (elevation << 12)
      buf.writeUInt16LE(word, offset)
    }

    writeFileSync(binPath, buf)
    invalidateGridCache(layout.blockdata_filepath)
    invalidateMapCache(mapName)

    return { ok: true }
  },
)

/* ---------- move object ---------- */

export const moveObject = createServerFn({ method: 'POST' }).handler(
  async (ctx: { data: { mapName: string; eventArray: string; eventIndex: number; x: number; y: number } }) => {
    const { mapName, eventArray, eventIndex, x, y } = ctx.data
    const VALID_ARRAYS = ['object_events', 'warp_events', 'coord_events', 'bg_events']
    if (!VALID_ARRAYS.includes(eventArray)) throw new Error(`Invalid eventArray: ${eventArray}`)

    const mapData = loadMapJson(mapName)
    const arr = (mapData as any)[eventArray]
    if (!arr || eventIndex < 0 || eventIndex >= arr.length) {
      throw new Error(`Invalid index ${eventIndex} for ${eventArray}`)
    }
    arr[eventIndex].x = x
    arr[eventIndex].y = y
    saveMapJson(mapName, mapData)
    invalidateMapCache(mapName)
    return { ok: true }
  },
)

/* ---------- add object ---------- */

function defaultObjectEvent(mapName: string, x: number, y: number, kind: string): Record<string, unknown> {
  const base = {
    graphics_id: 'OBJ_EVENT_GFX_BOY_1',
    x, y,
    elevation: 3,
    movement_type: 'MOVEMENT_TYPE_FACE_DOWN',
    movement_range_x: 0,
    movement_range_y: 0,
    trainer_type: 'TRAINER_TYPE_NONE',
    trainer_sight_or_berry_tree_id: '0',
    script: 'NULL',
    flag: '0',
  }
  if (kind === 'item') {
    base.graphics_id = 'OBJ_EVENT_GFX_ITEM_BALL'
    base.movement_type = 'MOVEMENT_TYPE_NONE'
  }
  if (kind === 'trainer') {
    base.trainer_type = 'TRAINER_TYPE_NORMAL'
    base.trainer_sight_or_berry_tree_id = '3'
  }
  return base
}

function defaultWarpEvent(x: number, y: number): Record<string, unknown> {
  return { x, y, elevation: 0, dest_map: 'MAP_NONE', dest_warp_id: '0' }
}

function defaultCoordEvent(x: number, y: number, kind: string): Record<string, unknown> {
  return {
    type: kind === 'trigger' ? 'trigger' : 'weather',
    x, y,
    elevation: 3,
    var: 'VAR_TEMP_1',
    var_value: '0',
    script: 'NULL',
  }
}

function defaultBgEvent(x: number, y: number, kind: string): Record<string, unknown> {
  if (kind === 'hidden') {
    return {
      type: 'hidden_item',
      x, y,
      elevation: 0,
      item: 'ITEM_POTION',
      flag: 'FLAG_TEMP_1',
    }
  }
  return {
    type: 'sign',
    x, y,
    elevation: 0,
    player_facing_dir: 'BG_EVENT_PLAYER_FACING_ANY',
    script: 'NULL',
  }
}

/** Generate a unique script label for a map, checking global scripts too */
function nextScriptLabel(mapName: string, incCode: string, prefix: string): string {
  const root = getProjectRoot()
  /* Also check global script files to avoid duplicate labels */
  let globalCode = ''
  const globalDir = join(root, 'data', 'scripts')
  if (existsSync(globalDir)) {
    for (const f of readdirSync(globalDir)) {
      if (f.endsWith('.inc')) {
        globalCode += readFileSync(join(globalDir, f), 'utf-8')
      }
    }
  }
  const combined = incCode + globalCode
  let n = 1
  while (combined.includes(`${mapName}_EventScript_${prefix}${n}`)) n++
  return `${mapName}_EventScript_${prefix}${n}`
}

/** Append a script stub to scripts.inc, return the label */
function appendScriptStub(mapName: string, prefix: string): string {
  const root = getProjectRoot()
  const incPath = join(root, 'data', 'maps', mapName, 'scripts.inc')
  let incCode = ''
  if (existsSync(incPath)) {
    incCode = readFileSync(incPath, 'utf-8')
  }

  const label = nextScriptLabel(mapName, incCode, prefix)
  const stub = [
    '',
    `${label}::`,
    '\tlockall',
    `\t@ TODO: ${prefix.toLowerCase()} logic`,
    '\treleaseall',
    '\tend',
    '',
  ].join('\n')

  writeFileSync(incPath, incCode.trimEnd() + '\n' + stub, 'utf-8')
  return label
}

export const addObject = createServerFn({ method: 'POST' }).handler(
  async (ctx: { data: { mapName: string; kind: string; eventArray: string; x: number; y: number } }) => {
    const { mapName, kind, eventArray, x, y } = ctx.data
    const VALID_ARRAYS = ['object_events', 'warp_events', 'coord_events', 'bg_events']
    if (!VALID_ARRAYS.includes(eventArray)) throw new Error(`Invalid eventArray: ${eventArray}`)

    const mapData = loadMapJson(mapName)
    const arr = (mapData as any)[eventArray] || []

    let newObj: Record<string, unknown>
    if (eventArray === 'object_events') newObj = defaultObjectEvent(mapName, x, y, kind)
    else if (eventArray === 'warp_events') newObj = defaultWarpEvent(x, y)
    else if (eventArray === 'coord_events') newObj = defaultCoordEvent(x, y, kind)
    else newObj = defaultBgEvent(x, y, kind)

    /* Auto-generate script stub for entities that need scripts */
    if (kind === 'trigger') {
      newObj.script = appendScriptStub(mapName, 'Trigger')
    } else if (kind === 'sign') {
      newObj.script = appendScriptStub(mapName, 'Sign')
    }

    arr.push(newObj)
    ;(mapData as any)[eventArray] = arr
    saveMapJson(mapName, mapData)
    invalidateMapCache(mapName)
    return { ok: true, eventIndex: arr.length - 1 }
  },
)

/* ---------- create script for object ---------- */

export const createObjectScript = createServerFn({ method: 'POST' }).handler(
  async (ctx: { data: { mapName: string; eventArray: string; eventIndex: number; kind: string } }) => {
    const { mapName, eventArray, eventIndex, kind } = ctx.data
    const VALID_ARRAYS = ['object_events', 'warp_events', 'coord_events', 'bg_events']
    if (!VALID_ARRAYS.includes(eventArray)) throw new Error(`Invalid eventArray: ${eventArray}`)

    const mapData = loadMapJson(mapName)
    const arr = (mapData as any)[eventArray]
    if (!arr || eventIndex < 0 || eventIndex >= arr.length) {
      throw new Error(`Invalid index ${eventIndex} for ${eventArray}`)
    }

    /* Pick prefix based on object kind */
    const prefixMap: Record<string, string> = {
      npc: 'NPC',
      trainer: 'Trainer',
      item: 'Item',
      trigger: 'Trigger',
      sign: 'Sign',
      coord: 'Coord',
      hidden: 'HiddenItem',
    }
    const prefix = prefixMap[kind] || 'Event'
    const label = appendScriptStub(mapName, prefix)

    arr[eventIndex].script = label
    saveMapJson(mapName, mapData)
    invalidateMapCache(mapName)
    return { ok: true, label }
  },
)

/* ---------- delete object ---------- */

export const deleteObject = createServerFn({ method: 'POST' }).handler(
  async (ctx: { data: { mapName: string; eventArray: string; eventIndex: number } }) => {
    const { mapName, eventArray, eventIndex } = ctx.data
    const VALID_ARRAYS = ['object_events', 'warp_events', 'coord_events', 'bg_events']
    if (!VALID_ARRAYS.includes(eventArray)) throw new Error(`Invalid eventArray: ${eventArray}`)

    const mapData = loadMapJson(mapName)
    const arr = (mapData as any)[eventArray]
    if (!arr || eventIndex < 0 || eventIndex >= arr.length) {
      throw new Error(`Invalid index ${eventIndex} for ${eventArray}`)
    }
    arr.splice(eventIndex, 1)
    saveMapJson(mapName, mapData)
    invalidateMapCache(mapName)
    return { ok: true }
  },
)

/* ---------- compile map (regenerate .inc files from map.json) ---------- */

export const compileMap = createServerFn({ method: 'POST' }).handler(
  async (ctx: { data: { mapName: string } }) => {
    const { mapName } = ctx.data
    const root = getProjectRoot()
    const mapJson = join(root, 'data', 'maps', mapName, 'map.json')
    const layoutsJson = join(root, 'data', 'layouts', 'layouts.json')
    const outDir = join(root, 'data', 'maps', mapName)
    const mapjson = join(root, 'tools', 'mapjson', 'mapjson')
    const rel = (p: string) => p.replace(root + '/', '')
    const cmd = `${mapjson} map emerald ${mapJson} ${layoutsJson} ${outDir}`
    const displayCmd = `${rel(mapjson)} map emerald ${rel(mapJson)} ${rel(layoutsJson)} ${rel(outDir)}`

    const { execSync } = await import('node:child_process')
    try {
      const stdout = execSync(cmd, { cwd: root, timeout: 10000 })
      return {
        ok: true as const,
        command: displayCmd,
        stdout: stdout.toString(),
        stderr: '',
      }
    } catch (e: any) {
      return {
        ok: false as const,
        command: displayCmd,
        stdout: e.stdout?.toString() || '',
        stderr: e.stderr?.toString() || e.message,
      }
    }
  },
)

/* ---------- build ROM (make) ---------- */

export const buildRom = createServerFn({ method: 'POST' }).handler(
  async () => {
    const root = getProjectRoot()
    const { execSync } = await import('node:child_process')
    const { cpus } = await import('node:os')
    const nproc = cpus().length
    const cmd = `make -j${nproc}`

    try {
      const stdout = execSync(cmd, { cwd: root, timeout: 300000 })
      return {
        ok: true as const,
        command: cmd,
        stdout: stdout.toString(),
        stderr: '',
      }
    } catch (e: any) {
      return {
        ok: false as const,
        command: cmd,
        stdout: e.stdout?.toString() || '',
        stderr: e.stderr?.toString() || e.message,
      }
    }
  },
)

/* ---------- emulator process tracking ---------- */

let _emulatorPid: number | null = null
let _emulatorExitCb: (() => void) | null = null

export const launchEmulator = createServerFn({ method: 'POST' }).handler(
  async () => {
    const root = getProjectRoot()
    const rom = join(root, 'pokemon-unreasonable-edition.gba')
    const { spawn } = await import('node:child_process')

    /* kill any existing instance first */
    if (_emulatorPid !== null) {
      try { process.kill(_emulatorPid) } catch { /* already dead */ }
      _emulatorPid = null
    }

    const child = spawn('mgba-qt', [rom], {
      cwd: root,
      detached: true,
      stdio: 'ignore',
    })
    child.unref()
    _emulatorPid = child.pid ?? null

    child.on('exit', () => { _emulatorPid = null })

    return { ok: true, pid: _emulatorPid }
  },
)

export const stopEmulator = createServerFn({ method: 'POST' }).handler(
  async () => {
    if (_emulatorPid !== null) {
      try { process.kill(_emulatorPid) } catch { /* already dead */ }
      _emulatorPid = null
      return { ok: true }
    }
    return { ok: false }
  },
)

export const isEmulatorRunning = createServerFn({ method: 'GET' }).handler(
  async () => {
    if (_emulatorPid === null) return { running: false, pid: null }
    try {
      process.kill(_emulatorPid, 0)
      return { running: true, pid: _emulatorPid }
    } catch {
      _emulatorPid = null
      return { running: false, pid: null }
    }
  },
)
