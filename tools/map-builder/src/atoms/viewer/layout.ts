import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export type RightPanel = 'tilemap' | 'build' | 'properties' | 'ai' | 'script-properties' | null

export const mapListOpenAtom = atomWithStorage('mb:mapListOpen', false)
export const entitiesOpenAtom = atomWithStorage('mb:entitiesOpen', false)
export const leftPanelWidthAtom = atomWithStorage('mb:leftPanelWidth', 220)
export const rightPanelAtom = atomWithStorage<RightPanel>('mb:rightPanel', null)
export const rightPanelWidthAtom = atomWithStorage('mb:rightPanelWidth', 340)

/** Derived: tilemapOpen is just rightPanel === 'tilemap' */
export const tilemapOpenAtom = atom((get) => get(rightPanelAtom) === 'tilemap')
/** Derived: buildOpen is just rightPanel === 'build' */
export const buildOpenAtom = atom((get) => get(rightPanelAtom) === 'build')

export const setMapListOpenAtom = atom(null, (_get, set, open: boolean) => {
  set(mapListOpenAtom, open)
  if (open) set(entitiesOpenAtom, false)
})

export const setEntitiesOpenAtom = atom(null, (_get, set, open: boolean) => {
  set(entitiesOpenAtom, open)
  if (open) set(mapListOpenAtom, false)
})

export const setLeftPanelWidthAtom = atom(null, (_get, set, w: number) => {
  set(leftPanelWidthAtom, Math.max(140, Math.min(500, w)))
})

export const setRightPanelWidthAtom = atom(null, (_get, set, w: number) => {
  set(rightPanelWidthAtom, Math.max(200, Math.min(700, w)))
})

export const setRightPanelAtom = atom(null, (_get, set, panel: RightPanel) => {
  set(rightPanelAtom, panel)
})

export const setBuildOpenAtom = atom(null, (_get, set, open: boolean) => {
  set(rightPanelAtom, open ? 'build' : null)
})

export const setTilemapOpenAtom = atom(null, (_get, set, open: boolean) => {
  set(rightPanelAtom, open ? 'tilemap' : null)
})
