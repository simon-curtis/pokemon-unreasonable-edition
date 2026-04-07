/**
 * Reads HUD CSS custom properties once per frame, returning concrete color
 * strings that the Canvas 2D API can consume directly.
 */
export interface CanvasTheme {
  bg: string
  fg: string
  border: string
  muted: string
  accent: string
  activeFg: string
  activeBorder: string
  panel: string
  grid: string
  overlayFill: string
  overlayLabel: string
  selectionFill: string
  idText: string
}

let cached: CanvasTheme | null = null
let cacheFrame = -1

export function getCanvasTheme(): CanvasTheme {
  const frame = typeof requestAnimationFrame !== 'undefined' ? performance.now() : -1
  if (cached && cacheFrame === frame) return cached

  const s = getComputedStyle(document.documentElement)
  const v = (name: string) => s.getPropertyValue(name).trim()

  cached = {
    bg: v('--hud-bg'),
    fg: v('--hud-fg'),
    border: v('--hud-border'),
    muted: v('--hud-muted'),
    accent: v('--hud-accent'),
    activeFg: v('--hud-active-fg'),
    activeBorder: v('--hud-active-border'),
    panel: v('--hud-panel'),
    grid: v('--hud-grid'),
    overlayFill: v('--hud-overlay-fill'),
    overlayLabel: v('--hud-overlay-label'),
    selectionFill: v('--hud-selection-fill'),
    idText: v('--hud-id-text'),
  }
  cacheFrame = frame
  return cached
}
