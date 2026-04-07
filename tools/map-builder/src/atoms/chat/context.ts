import { atom } from 'jotai'
import type { AttachedContext } from './types'

export const attachedContextAtom = atom<AttachedContext[]>([])

export const attachContextAtom = atom(null, (get, set, ctx: AttachedContext) => {
  const current = get(attachedContextAtom)
  if (current.some((c) => c.label === ctx.label && c.detail === ctx.detail)) return
  set(attachedContextAtom, [...current, ctx])
})

export const removeContextAtom = atom(null, (_get, set, index: number) => {
  set(attachedContextAtom, (prev) => prev.filter((_, i) => i !== index))
})

export const clearContextAtom = atom(null, (_get, set) => {
  set(attachedContextAtom, [])
})
