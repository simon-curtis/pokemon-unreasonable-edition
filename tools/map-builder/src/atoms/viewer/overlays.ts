import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import type { OverlayState } from '#/lib/types'

export const overlaysAtom = atomWithStorage<OverlayState>('mb:overlays', {
  grid: false,
  collision: false,
  ids: false,
  category: false,
  provenance: false,
  sprites: true,
  events: true,
})

export const scaleAtom = atomWithStorage('mb:scale', 2)
export const tilemapScaleAtom = atomWithStorage('mb:tilemapScale', 2)
export const tilemapFilterAtom = atomWithStorage<'all' | 'primary' | 'secondary' | 'used'>('mb:tilemapFilter', 'all')

export const toggleOverlayAtom = atom(null, (get, set, key: keyof OverlayState) => {
  const overlays = get(overlaysAtom)
  set(overlaysAtom, { ...overlays, [key]: !overlays[key] })
})
