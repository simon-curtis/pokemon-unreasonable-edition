import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  getProjectRoot,
  findTilesetAttributesPath,
  tilesetLabelToDir,
} from './map-data'

const NUM_PRIMARY_METATILES = 512
const TILESETS_DIR = join(getProjectRoot(), 'data', 'tilesets')

/* ---------- 4bpp tile parsing ---------- */

export function parseTiles4bpp(buf: Buffer): Uint8Array[] {
  const tiles: Uint8Array[] = []
  for (let offset = 0; offset < buf.length; offset += 32) {
    const tile = new Uint8Array(64)
    for (let i = 0; i < 32; i++) {
      const b = buf[offset + i]
      tile[i * 2] = b & 0x0f
      tile[i * 2 + 1] = (b >> 4) & 0x0f
    }
    tiles.push(tile)
  }
  return tiles
}

/* ---------- JASC palette parsing ---------- */

export type RGB = [r: number, g: number, b: number]

export function parseJascPalette(text: string): RGB[] {
  const lines = text.trim().split('\n')
  const colors: RGB[] = []
  for (let i = 3; i < 19 && i < lines.length; i++) {
    const parts = lines[i].trim().split(/\s+/)
    colors.push([parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2])])
  }
  return colors
}

/* ---------- metatiles.bin parsing ---------- */

export interface Subtile {
  tileId: number
  hFlip: boolean
  vFlip: boolean
  paletteNum: number
}

export function parseMetatilesBin(buf: Buffer): Subtile[][] {
  const metatiles: Subtile[][] = []
  for (let offset = 0; offset < buf.length; offset += 16) {
    const subtiles: Subtile[] = []
    for (let i = 0; i < 8; i++) {
      const val = buf.readUInt16LE(offset + i * 2)
      subtiles.push({
        tileId: val & 0x3ff,
        hFlip: !!(val & 0x400),
        vFlip: !!(val & 0x800),
        paletteNum: (val >> 12) & 0xf,
      })
    }
    metatiles.push(subtiles)
  }
  return metatiles
}

/* ---------- metatile attributes parsing ---------- */

export function parseMetatileAttributes(buf: Buffer): Uint16Array {
  /* Direct typed array view — Buffer is always LE on GBA toolchain data */
  return new Uint16Array(buf.buffer, buf.byteOffset, buf.length / 2)
}

/* ---------- behavior lookup ---------- */

export function getBehavior(
  metatileId: number,
  primaryAttrs: Uint16Array,
  secondaryAttrs: Uint16Array,
): number {
  if (metatileId < NUM_PRIMARY_METATILES) {
    if (metatileId < primaryAttrs.length) {
      return primaryAttrs[metatileId] & 0xff
    }
  } else {
    const idx = metatileId - NUM_PRIMARY_METATILES
    if (idx < secondaryAttrs.length) {
      return secondaryAttrs[idx] & 0xff
    }
  }
  return 0x00
}

/* ---------- behavior classification ---------- */

const GRASS_BEHAVIORS = new Set([0x02, 0x03, 0x09, 0x24])
const WATER_BEHAVIORS = new Set([
  0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x19, 0x22,
])
const LEDGE_BEHAVIORS = new Set([0x38, 0x39, 0x3a, 0x3b, 0x3c, 0x3d, 0x3e, 0x3f])
const DOOR_BEHAVIORS = new Set([0x60, 0x69])
const SAND_BEHAVIORS = new Set([0x06, 0x21, 0x25])
const ICE_BEHAVIORS = new Set([0x20, 0x26, 0x27])

export function classifyBehavior(behavior: number): string {
  if (GRASS_BEHAVIORS.has(behavior)) return 'grass'
  if (WATER_BEHAVIORS.has(behavior)) return 'water'
  if (LEDGE_BEHAVIORS.has(behavior)) return 'ledge'
  if (DOOR_BEHAVIORS.has(behavior)) return 'door'
  if (SAND_BEHAVIORS.has(behavior)) return 'sand'
  if (ICE_BEHAVIORS.has(behavior)) return 'ice'
  if (behavior === 0x08) return 'cave'
  if (behavior === 0x00) return 'normal'
  return 'unknown'
}

/* ---------- palette table ---------- */

const _zeroPalette: RGB[] = Array.from({ length: 16 }, (): RGB => [0, 0, 0])

export function buildPaletteTable(primaryDir: string, secondaryDir: string): RGB[][] {
  const table: RGB[][] = new Array(16)
  for (let i = 0; i < 16; i++) table[i] = _zeroPalette
  for (let i = 0; i < 6; i++) {
    const p = join(TILESETS_DIR, primaryDir, 'palettes', `${String(i).padStart(2, '0')}.pal`)
    try {
      table[i] = parseJascPalette(readFileSync(p, 'utf-8'))
    } catch {}
  }
  for (let i = 6; i < 13; i++) {
    const p = join(TILESETS_DIR, secondaryDir, 'palettes', `${String(i).padStart(2, '0')}.pal`)
    try {
      table[i] = parseJascPalette(readFileSync(p, 'utf-8'))
    } catch {}
  }
  return table
}

/* ---------- full tileset data loader ---------- */

export interface TilesetData {
  primaryTiles: Uint8Array[]
  secondaryTiles: Uint8Array[]
  paletteTable: RGB[][]
  primaryMetatiles: Subtile[][]
  secondaryMetatiles: Subtile[][]
  primaryAttrs: Uint16Array
  secondaryAttrs: Uint16Array
}

const _tilesetCache = new Map<string, TilesetData>()

/** Clear tileset cache (called on hot-reload) */
export function clearTilesetCache(): void {
  _tilesetCache.clear()
}

export function loadTilesetData(primaryLabel: string, secondaryLabel: string): TilesetData {
  const cacheKey = `${primaryLabel}|${secondaryLabel}`
  const cached = _tilesetCache.get(cacheKey)
  if (cached) return cached

  const priDir = tilesetLabelToDir(primaryLabel)
  const secDir = tilesetLabelToDir(secondaryLabel)
  if (!priDir || !secDir) {
    throw new Error(`Cannot resolve tileset dirs for ${primaryLabel} / ${secondaryLabel}`)
  }

  const primaryTiles = parseTiles4bpp(readFileSync(join(TILESETS_DIR, priDir, 'tiles.4bpp')))
  const secondaryTiles = parseTiles4bpp(readFileSync(join(TILESETS_DIR, secDir, 'tiles.4bpp')))
  const paletteTable = buildPaletteTable(priDir, secDir)
  const primaryMetatiles = parseMetatilesBin(
    readFileSync(join(TILESETS_DIR, priDir, 'metatiles.bin')),
  )
  const secondaryMetatiles = parseMetatilesBin(
    readFileSync(join(TILESETS_DIR, secDir, 'metatiles.bin')),
  )

  const priAttrPath = findTilesetAttributesPath(primaryLabel)
  const secAttrPath = findTilesetAttributesPath(secondaryLabel)
  const primaryAttrs = priAttrPath
    ? parseMetatileAttributes(readFileSync(priAttrPath))
    : new Uint16Array(0)
  const secondaryAttrs = secAttrPath
    ? parseMetatileAttributes(readFileSync(secAttrPath))
    : new Uint16Array(0)

  const result: TilesetData = {
    primaryTiles,
    secondaryTiles,
    paletteTable,
    primaryMetatiles,
    secondaryMetatiles,
    primaryAttrs,
    secondaryAttrs,
  }
  _tilesetCache.set(cacheKey, result)
  return result
}
