import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export const selectedNodeIdAtom = atom<string | null>(null)
export const selectedEdgeIdAtom = atom<string | null>(null)
export const isDirtyAtom = atom(false)

export const paletteOpenAtom = atomWithStorage('mb:script:paletteOpen', true)
export const propertyPanelOpenAtom = atomWithStorage('mb:script:propertyPanelOpen', true)
export const previewOpenAtom = atomWithStorage('mb:script:previewOpen', false)
