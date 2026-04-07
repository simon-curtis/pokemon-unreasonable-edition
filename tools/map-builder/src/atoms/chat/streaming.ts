import { atom } from 'jotai'

export const isStreamingAtom = atom(false)
export const errorAtom = atom<string | null>(null)
