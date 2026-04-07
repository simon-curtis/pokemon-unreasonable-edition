import { atom } from 'jotai'
import type { ScriptNode, ScriptEdge } from '#/lib/script-builder/types'
import { nodesAtom, edgesAtom } from './graph'

interface HistoryEntry {
  nodes: ScriptNode[]
  edges: ScriptEdge[]
}

const historyAtom = atom<HistoryEntry[]>([])
const historyIndexAtom = atom(-1)

export const pushHistoryAtom = atom(null, (get, set) => {
  const nodes = structuredClone(get(nodesAtom))
  const edges = structuredClone(get(edgesAtom))
  const history = get(historyAtom).slice(0, get(historyIndexAtom) + 1)
  history.push({ nodes, edges })
  if (history.length > 50) history.shift()
  set(historyAtom, history)
  set(historyIndexAtom, history.length - 1)
})

export const undoAtom = atom(null, (get, set) => {
  const idx = get(historyIndexAtom)
  if (idx <= 0) return
  const prev = get(historyAtom)[idx - 1]
  set(nodesAtom, prev.nodes)
  set(edgesAtom, prev.edges)
  set(historyIndexAtom, idx - 1)
})

export const redoAtom = atom(null, (get, set) => {
  const idx = get(historyIndexAtom)
  const history = get(historyAtom)
  if (idx >= history.length - 1) return
  const next = history[idx + 1]
  set(nodesAtom, next.nodes)
  set(edgesAtom, next.edges)
  set(historyIndexAtom, idx + 1)
})
