import type { MetatileInfo } from './types'
import { getCanvasTheme } from './canvas-theme'

export function getVisibleIndices(
  metatileInfo: MetatileInfo[],
  filter: string,
  priCount: number,
): number[] {
  if (filter === 'all') return metatileInfo.map((_, i) => i)
  if (filter === 'primary') return metatileInfo.filter((m) => m.id < 512).map((_, i) => i)
  if (filter === 'secondary')
    return metatileInfo.filter((m) => m.id >= 512).map((m) => priCount + (m.id - 512))
  if (filter === 'used')
    return metatileInfo
      .filter((m) => m.count > 0)
      .map((m) => (m.id < 512 ? m.id : priCount + (m.id - 512)))
  return []
}

/** Build a reverse lookup: atlas index → position in visible indices array */
export function buildIndexLookup(indices: number[]): Map<number, number> {
  const map = new Map<number, number>()
  for (let i = 0; i < indices.length; i++) {
    map.set(indices[i], i)
  }
  return map
}

export function drawTilemap(
  ctx: CanvasRenderingContext2D,
  atlasImg: HTMLImageElement,
  metatileInfo: MetatileInfo[],
  indices: number[],
  indexLookup: Map<number, number>,
  state: {
    scale: number
    atlasCols: number
    panelWidth: number
    hoverIdx: number | null
    selectedIdx: number | null
  },
) {
  const { scale, atlasCols, panelWidth, hoverIdx, selectedIdx } = state
  const theme = getCanvasTheme()
  const tileW = 16 * scale
  const cols = Math.max(1, Math.floor(panelWidth / tileW))
  const rows = Math.ceil(indices.length / cols)
  const tileSize = 16 * scale

  const targetW = cols * tileSize
  const targetH = rows * tileSize
  if (ctx.canvas.width !== targetW || ctx.canvas.height !== targetH) {
    ctx.canvas.width = targetW
    ctx.canvas.height = targetH
  }
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  const labelFont = `${Math.max(8, 5 * scale)}px monospace`
  const labelH = 10 * (scale / 2)
  ctx.font = labelFont

  for (let i = 0; i < indices.length; i++) {
    const atlasIdx = indices[i]
    const srcCol = atlasIdx % atlasCols
    const srcRow = Math.floor(atlasIdx / atlasCols)
    const dstCol = i % cols
    const dstRow = Math.floor(i / cols)
    const dx = dstCol * tileSize
    const dy = dstRow * tileSize
    ctx.drawImage(
      atlasImg,
      srcCol * 16,
      srcRow * 16,
      16,
      16,
      dx,
      dy,
      tileSize,
      tileSize,
    )

    const info = metatileInfo[atlasIdx]
    if (info) {
      ctx.fillStyle = theme.idText
      ctx.fillRect(dx, dy + tileSize - labelH, tileSize, labelH)
      ctx.fillStyle = info.count > 0 ? theme.fg : theme.muted
      ctx.fillText(String(info.id), dx + 1, dy + tileSize - 2)
    }
  }

  /* grid — single path */
  ctx.strokeStyle = theme.grid
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 0; x <= cols; x++) {
    ctx.moveTo(x * tileSize, 0)
    ctx.lineTo(x * tileSize, ctx.canvas.height)
  }
  for (let y = 0; y <= rows; y++) {
    ctx.moveTo(0, y * tileSize)
    ctx.lineTo(ctx.canvas.width, y * tileSize)
  }
  ctx.stroke()

  /* selected — O(1) lookup instead of indexOf */
  if (selectedIdx !== null) {
    const pos = indexLookup.get(selectedIdx)
    if (pos !== undefined) {
      const col = pos % cols
      const row = Math.floor(pos / cols)
      ctx.strokeStyle = theme.accent
      ctx.lineWidth = 2
      ctx.strokeRect(col * tileSize + 1, row * tileSize + 1, tileSize - 2, tileSize - 2)
    }
  }

  /* hover — O(1) lookup instead of indexOf */
  if (hoverIdx !== null) {
    const pos = indexLookup.get(hoverIdx)
    if (pos !== undefined) {
      const col = pos % cols
      const row = Math.floor(pos / cols)
      ctx.strokeStyle = theme.activeFg
      ctx.lineWidth = 2
      ctx.strokeRect(col * tileSize + 1, row * tileSize + 1, tileSize - 2, tileSize - 2)
    }
  }
}

export function getAtlasIdxAt(
  e: React.MouseEvent,
  canvas: HTMLCanvasElement,
  scale: number,
  panelWidth: number,
  visibleIndices: number[],
): number | null {
  const rect = canvas.getBoundingClientRect()
  const tileSize = 16 * scale
  const cols = Math.max(1, Math.floor(panelWidth / tileSize))
  const col = Math.floor((e.clientX - rect.left) / tileSize)
  const row = Math.floor((e.clientY - rect.top) / tileSize)
  const idx = row * cols + col
  if (idx >= 0 && idx < visibleIndices.length) return visibleIndices[idx]
  return null
}
