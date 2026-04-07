import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { PNG } from 'pngjs'
import { getProjectRoot } from './map-data'

const PROJECT_ROOT = getProjectRoot()

/**
 * Sprite lookup chain:
 * OBJ_EVENT_GFX_YOUNGSTER
 *   → pointers table → gObjectEventGraphicsInfo_Youngster
 *   → .images = sPicTable_Youngster → overworld_frame(gObjectEventPic_Youngster, 2, 4, 0)
 *   → INCBIN_U32("graphics/object_events/pics/people/youngster.4bpp")
 *   → graphics/object_events/pics/people/youngster.png (source PNG with palette)
 *
 * We also need width/height from the GraphicsInfo struct.
 */

interface SpriteInfo {
  pngPath: string
  width: number
  height: number
}

let _spriteMap: Map<string, SpriteInfo> | null = null

function buildSpriteMap(): Map<string, SpriteInfo> {
  const map = new Map<string, SpriteInfo>()
  const dataDir = join(PROJECT_ROOT, 'src', 'data', 'object_events')

  /* Step 1: GFX constant → GraphicsInfo name */
  const pointersFile = readFileSync(
    join(dataDir, 'object_event_graphics_info_pointers.h'),
    'utf-8',
  )
  const gfxToInfo: Record<string, string> = {}
  const re1 = /\[OBJ_EVENT_GFX_(\w+)\]\s*=\s*&gObjectEventGraphicsInfo_(\w+)/g
  let m: RegExpExecArray | null
  while ((m = re1.exec(pointersFile))) {
    gfxToInfo[m[1]] = m[2]
  }

  /* Step 2: GraphicsInfo name → width, height, picTable name */
  const infoFile = readFileSync(join(dataDir, 'object_event_graphics_info.h'), 'utf-8')
  const infoEntries: Record<string, { width: number; height: number; picTable: string }> = {}

  const re2 =
    /gObjectEventGraphicsInfo_(\w+)\s*=\s*\{[^}]*\.width\s*=\s*(\d+)[^}]*\.height\s*=\s*(\d+)[^}]*\.images\s*=\s*(\w+)/gs
  while ((m = re2.exec(infoFile))) {
    infoEntries[m[1]] = {
      width: parseInt(m[2]),
      height: parseInt(m[3]),
      picTable: m[4],
    }
  }

  /* Step 3: picTable name → gObjectEventPic variable name (first frame) */
  const picTablesFile = readFileSync(join(dataDir, 'object_event_pic_tables.h'), 'utf-8')
  const picTableToPic: Record<string, string> = {}

  const re3 =
    /(\w+)\[\]\s*=\s*\{\s*(?:overworld_frame|obj_frame_tiles)\((\w+)/g
  while ((m = re3.exec(picTablesFile))) {
    picTableToPic[m[1]] = m[2]
  }

  /* Step 4: gObjectEventPic variable → PNG path */
  const graphicsFile = readFileSync(join(dataDir, 'object_event_graphics.h'), 'utf-8')
  const picToPath: Record<string, string> = {}

  const re4 = /(\w+)\[\]\s*=\s*INCBIN_U32\("([^"]+)\.4bpp"\)/g
  while ((m = re4.exec(graphicsFile))) {
    picToPath[m[1]] = m[2] + '.png'
  }

  /* Chain it all together */
  for (const [gfxName, infoName] of Object.entries(gfxToInfo)) {
    const info = infoEntries[infoName]
    if (!info) continue
    const picVar = picTableToPic[info.picTable]
    if (!picVar) continue
    const pngRel = picToPath[picVar]
    if (!pngRel) continue
    const pngPath = join(PROJECT_ROOT, pngRel)
    if (!existsSync(pngPath)) continue

    map.set(gfxName, {
      pngPath,
      width: info.width,
      height: info.height,
    })
  }

  return map
}

function getSpriteMap(): Map<string, SpriteInfo> {
  if (!_spriteMap) _spriteMap = buildSpriteMap()
  return _spriteMap
}

/**
 * Extract a specific frame from a sprite PNG and return as RGBA buffer.
 * Frames are laid out horizontally: frame N starts at x = N * width.
 * Standard pic table layout: 0=south, 1=north, 2=west, 3+=walk frames.
 * East/right uses frame 2 (west) with horizontal flip (matching the game engine).
 */
const _parsedPngCache = new Map<string, PNG>()

function extractFrame(pngPath: string, width: number, height: number, frameIndex: number): Buffer {
  let png = _parsedPngCache.get(pngPath)
  if (!png) {
    const data = readFileSync(pngPath)
    png = PNG.sync.read(data)
    _parsedPngCache.set(pngPath, png)
  }
  const frame = Buffer.alloc(width * height * 4)
  const frameX = frameIndex * width

  /* Palette index 0 is the transparent color — read it from pixel (0,0) */
  const bgR = png.data[0]
  const bgG = png.data[1]
  const bgB = png.data[2]

  for (let y = 0; y < height && y < png.height; y++) {
    for (let x = 0; x < width && x < png.width - frameX; x++) {
      const srcIdx = (y * png.width + (frameX + x)) * 4
      const dstIdx = (y * width + x) * 4
      const r = png.data[srcIdx]
      const g = png.data[srcIdx + 1]
      const b = png.data[srcIdx + 2]
      if (r === bgR && g === bgG && b === bgB) {
        /* transparent */
        frame[dstIdx] = 0
        frame[dstIdx + 1] = 0
        frame[dstIdx + 2] = 0
        frame[dstIdx + 3] = 0
      } else {
        frame[dstIdx] = r
        frame[dstIdx + 1] = g
        frame[dstIdx + 2] = b
        frame[dstIdx + 3] = 255
      }
    }
  }
  return frame
}

/* Cache rendered sprite PNGs keyed by "gfxName:facing" */
const _spriteCache = new Map<string, { png: string; width: number; height: number }>()

/**
 * Get a sprite frame as a base64-encoded PNG.
 * gfxName is the constant suffix, e.g. "YOUNGSTER".
 * facing: 0=down, 1=up, 2=left, 3=right.
 *
 * The game engine renders east/right by hFlipping the west/left frame (index 2).
 * We do the same here instead of reading frame index 3 (which is a walk frame).
 */
export function getSpriteFrame(
  gfxName: string,
  facing = 0,
): { png: string; width: number; height: number } | null {
  const cacheKey = `${gfxName}:${facing}`
  if (_spriteCache.has(cacheKey)) return _spriteCache.get(cacheKey)!

  const spriteMap = getSpriteMap()
  const info = spriteMap.get(gfxName)
  if (!info) return null

  /* East (facing=3) reuses the west frame (index 2) with a horizontal flip */
  const isEast = facing === 3
  const frameIdx = isEast ? 2 : facing
  const rgba = extractFrame(info.pngPath, info.width, info.height, frameIdx)

  if (isEast) {
    /* Flip RGBA buffer horizontally in-place */
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width / 2; x++) {
        const lIdx = (y * info.width + x) * 4
        const rIdx = (y * info.width + (info.width - 1 - x)) * 4
        for (let c = 0; c < 4; c++) {
          const tmp = rgba[lIdx + c]
          rgba[lIdx + c] = rgba[rIdx + c]
          rgba[rIdx + c] = tmp
        }
      }
    }
  }

  const png = new PNG({ width: info.width, height: info.height })
  rgba.copy(png.data)
  const pngBuf = PNG.sync.write(png)

  const result = {
    png: pngBuf.toString('base64'),
    width: info.width,
    height: info.height,
  }
  _spriteCache.set(cacheKey, result)
  return result
}

/**
 * Get all unique sprites needed for a map's objects.
 * Keys are "gfxName:facing" so the same NPC type facing different
 * directions gets separate sprite entries.
 */
export function getSpritesForMap(
  objects: Array<{ gfx: string; facing: number }>,
): Record<string, { png: string; width: number; height: number }> {
  const sprites: Record<string, { png: string; width: number; height: number }> = {}
  const seen = new Set<string>()

  for (const obj of objects) {
    const key = `${obj.gfx}:${obj.facing}`
    if (!obj.gfx || seen.has(key)) continue
    seen.add(key)
    const frame = getSpriteFrame(obj.gfx, obj.facing)
    if (frame) {
      sprites[key] = frame
    }
  }
  return sprites
}
