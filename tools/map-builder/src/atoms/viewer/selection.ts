import { atom } from 'jotai'
import type { SelectionRange } from '#/lib/types'

export const selectionAtom = atom<SelectionRange | null>(null)
export const highlightMetatileAtom = atom<number | null>(null)
export const selectedMetatileAtom = atom<number | null>(null)

export const setSelectedMetatileAtom = atom(null, (_get, set, id: number | null) => {
  set(selectedMetatileAtom, id)
  set(highlightMetatileAtom, id)
})
