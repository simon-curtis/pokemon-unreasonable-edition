import { PNG } from 'pngjs'
import type { TilesetData, RGB, Subtile } from './tileset'
import type { TileCell } from './map-data'

const NUM_PRIMARY_METATILES = 512

/* ---------- render 8x8 tile into Uint8Array(256) at offset ---------- */

/**
 * Render an 8x8 tile directly into a 16-wide RGBA row buffer.
 * Avoids allocating intermediate arrays — writes straight into the metatile buffer.
 */
function blitTile8x8(
  tilePixels: Uint8Array,
  palette: RGB[],
  hFlip: boolean,
  vFlip: boolean,
  out: Uint8Array,
  ox: number,
  oy: number,
  isBaseLayer: boolean,
): void {
  for (let py = 0; py < 8; py++) {
    for (let px = 0; px < 8; px++) {
      const srcX = hFlip ? 7 - px : px
      const srcY = vFlip ? 7 - py : py
      const idx = tilePixels[srcY * 8 + srcX]
      const outOff = ((oy + py) * 16 + (ox + px)) * 4
      if (idx === 0) {
        if (isBaseLayer) {
          out[outOff] = 0
          out[outOff + 1] = 0
          out[outOff + 2] = 0
          out[outOff + 3] = 0
        }
      } else {
        const [r, g, b] = palette[idx]
        out[outOff] = r
        out[outOff + 1] = g
        out[outOff + 2] = b
        out[outOff + 3] = 255
      }
    }
  }
}

/* ---------- render 16x16 metatile to Uint8Array(1024) ---------- */

function renderMetatile(
  metatile: Subtile[],
  primaryTiles: Uint8Array[],
  secondaryTiles: Uint8Array[],
  paletteTable: RGB[][],
): Uint8Array {
  const pixels = new Uint8Array(16 * 16 * 4)
  /* Fill with opaque black as base */
  for (let i = 0; i < 256; i++) {
    pixels[i * 4 + 3] = 255
  }

  const ox = [0, 8, 0, 8]
  const oy = [0, 0, 8, 8]

  for (let layer = 0; layer < 2; layer++) {
    for (let i = 0; i < 4; i++) {
      const st = metatile[layer * 4 + i]
      let tilePixels: Uint8Array
      if (st.tileId < 512) {
        if (st.tileId < primaryTiles.length) {
          tilePixels = primaryTiles[st.tileId]
        } else continue
      } else {
        const stid = st.tileId - 512
        if (stid < secondaryTiles.length) {
          tilePixels = secondaryTiles[stid]
        } else continue
      }

      blitTile8x8(tilePixels, paletteTable[st.paletteNum], st.hFlip, st.vFlip, pixels, ox[i], oy[i], layer === 0)
    }
  }
  return pixels
}

/* ---------- render full map to RGBA buffer ---------- */

export function renderMapRgba(
  grid: TileCell[][],
  width: number,
  height: number,
  ts: TilesetData,
): { buf: Buffer; pw: number; ph: number } {
  const pw = width * 16
  const ph = height * 16
  const buf = Buffer.alloc(pw * ph * 4)

  const cache = new Map<number, Uint8Array>()

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [mid] = grid[y][x]
      if (!cache.has(mid)) {
        let mt: Subtile[]
        if (mid < NUM_PRIMARY_METATILES) {
          mt = mid < ts.primaryMetatiles.length ? ts.primaryMetatiles[mid] : ts.primaryMetatiles[0]
        } else {
          const smid = mid - NUM_PRIMARY_METATILES
          mt =
            smid < ts.secondaryMetatiles.length
              ? ts.secondaryMetatiles[smid]
              : ts.primaryMetatiles[0]
        }
        cache.set(mid, renderMetatile(mt, ts.primaryTiles, ts.secondaryTiles, ts.paletteTable))
      }

      const pixels = cache.get(mid)!
      const bx = x * 16
      const by = y * 16
      /* Copy row-by-row using Buffer.set for bulk transfer */
      const rowBytes = 16 * 4
      for (let py = 0; py < 16; py++) {
        const srcOff = py * rowBytes
        const dstOff = ((by + py) * pw + bx) * 4
        buf.set(pixels.subarray(srcOff, srcOff + rowBytes), dstOff)
      }
    }
  }
  return { buf, pw, ph }
}

/* ---------- render foreground (top layer) overlay ---------- */

function getLayerType(metatileId: number, ts: TilesetData): number {
  if (metatileId < NUM_PRIMARY_METATILES) {
    if (metatileId < ts.primaryAttrs.length) {
      return (ts.primaryAttrs[metatileId] >> 12) & 0xf
    }
  } else {
    const idx = metatileId - NUM_PRIMARY_METATILES
    if (idx < ts.secondaryAttrs.length) {
      return (ts.secondaryAttrs[idx] >> 12) & 0xf
    }
  }
  return 0
}

function renderMetatileTopLayer(
  metatile: Subtile[],
  primaryTiles: Uint8Array[],
  secondaryTiles: Uint8Array[],
  paletteTable: RGB[][],
): Uint8Array {
  const pixels = new Uint8Array(16 * 16 * 4)

  const oxArr = [0, 8, 0, 8]
  const oyArr = [0, 0, 8, 8]

  /* Only render the top layer (subtiles 4-7) */
  for (let i = 0; i < 4; i++) {
    const st = metatile[4 + i]
    let tilePixels: Uint8Array
    if (st.tileId < 512) {
      if (st.tileId < primaryTiles.length) {
        tilePixels = primaryTiles[st.tileId]
      } else continue
    } else {
      const stid = st.tileId - 512
      if (stid < secondaryTiles.length) {
        tilePixels = secondaryTiles[stid]
      } else continue
    }

    blitTile8x8(tilePixels, paletteTable[st.paletteNum], st.hFlip, st.vFlip, pixels, oxArr[i], oyArr[i], false)
  }
  return pixels
}

export function renderForegroundRgba(
  grid: TileCell[][],
  width: number,
  height: number,
  ts: TilesetData,
): { buf: Buffer; pw: number; ph: number } {
  const pw = width * 16
  const ph = height * 16
  const buf = Buffer.alloc(pw * ph * 4)

  const cache = new Map<number, Uint8Array | null>()

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [mid] = grid[y][x]
      if (!cache.has(mid)) {
        const layerType = getLayerType(mid, ts)
        /* NORMAL(0) and SPLIT(2): top layer renders in front of sprites */
        if (layerType === 0 || layerType === 2) {
          let mt: Subtile[]
          if (mid < NUM_PRIMARY_METATILES) {
            mt = mid < ts.primaryMetatiles.length ? ts.primaryMetatiles[mid] : ts.primaryMetatiles[0]
          } else {
            const smid = mid - NUM_PRIMARY_METATILES
            mt = smid < ts.secondaryMetatiles.length
              ? ts.secondaryMetatiles[smid]
              : ts.primaryMetatiles[0]
          }
          cache.set(mid, renderMetatileTopLayer(mt, ts.primaryTiles, ts.secondaryTiles, ts.paletteTable))
        } else {
          cache.set(mid, null)
        }
      }

      const pixels = cache.get(mid)
      if (!pixels) continue

      const bx = x * 16
      const by = y * 16
      /* Blit with alpha check — foreground has transparency */
      for (let py = 0; py < 16; py++) {
        for (let px = 0; px < 16; px++) {
          const srcOff = (py * 16 + px) * 4
          if (pixels[srcOff + 3] === 0) continue
          const dstOff = ((by + py) * pw + (bx + px)) * 4
          buf[dstOff] = pixels[srcOff]
          buf[dstOff + 1] = pixels[srcOff + 1]
          buf[dstOff + 2] = pixels[srcOff + 2]
          buf[dstOff + 3] = pixels[srcOff + 3]
        }
      }
    }
  }
  return { buf, pw, ph }
}

/* ---------- render tilemap atlas ---------- */

export function renderAtlasRgba(
  ts: TilesetData,
  cols = 16,
): { buf: Buffer; pw: number; ph: number; total: number } {
  const priCount = ts.primaryMetatiles.length
  const secCount = ts.secondaryMetatiles.length
  const total = priCount + secCount
  const rows = Math.ceil(total / cols)
  const pw = cols * 16
  const ph = rows * 16
  const buf = Buffer.alloc(pw * ph * 4)

  for (let idx = 0; idx < total; idx++) {
    const mt = idx < priCount ? ts.primaryMetatiles[idx] : ts.secondaryMetatiles[idx - priCount]
    const pixels = renderMetatile(mt, ts.primaryTiles, ts.secondaryTiles, ts.paletteTable)
    const col = idx % cols
    const row = Math.floor(idx / cols)
    const bx = col * 16
    const by = row * 16
    const rowBytes = 16 * 4
    for (let py = 0; py < 16; py++) {
      const srcOff = py * rowBytes
      const dstOff = ((by + py) * pw + bx) * 4
      buf.set(pixels.subarray(srcOff, srcOff + rowBytes), dstOff)
    }
  }
  return { buf, pw, ph, total }
}

/* ---------- RGBA buffer → PNG ---------- */

export function encodePng(width: number, height: number, rgbaData: Buffer): Buffer {
  const png = new PNG({ width, height })
  rgbaData.copy(png.data)
  return PNG.sync.write(png)
}
