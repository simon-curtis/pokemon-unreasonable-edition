import { atom } from 'jotai'

export interface StatusSegment {
  text: string
  /** Lower = further left. Segments with same position sort by key. */
  position?: number
  side?: 'left' | 'right'
  muted?: boolean
}

export const segmentsAtom = atom<Record<string, StatusSegment>>({})

export const setSegmentAtom = atom(null, (_get, set, key: string, segment: StatusSegment) => {
  set(segmentsAtom, (prev) => ({ ...prev, [key]: segment }))
})

export const removeSegmentAtom = atom(null, (_get, set, key: string) => {
  set(segmentsAtom, (prev) => {
    const { [key]: _, ...rest } = prev
    return rest
  })
})

export const clearSegmentsAtom = atom(null, (_get, set) => {
  set(segmentsAtom, {})
})
