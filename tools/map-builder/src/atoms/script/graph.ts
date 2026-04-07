import { atom } from 'jotai'
import type { ScriptNode, ScriptEdge } from '#/lib/script-builder/types'

export const nodesAtom = atom<ScriptNode[]>([])
export const edgesAtom = atom<ScriptEdge[]>([])
