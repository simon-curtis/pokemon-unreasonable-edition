import { atom } from 'jotai'
import {
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type XYPosition,
} from '@xyflow/react'
import type { ScriptNode, ScriptEdge } from '#/lib/script-builder/types'
import { getSchema } from '#/lib/script-builder/node-registry'
import { nodesAtom, edgesAtom } from './graph'
import { selectedNodeIdAtom, selectedEdgeIdAtom, isDirtyAtom } from './ui'

let nextId = 1

export const onNodesChangeAtom = atom(null, (get, set, changes: NodeChange<ScriptNode>[]) => {
  set(nodesAtom, applyNodeChanges(changes, get(nodesAtom)))
  set(isDirtyAtom, true)
})

export const onEdgesChangeAtom = atom(null, (get, set, changes: EdgeChange<ScriptEdge>[]) => {
  set(edgesAtom, applyEdgeChanges(changes, get(edgesAtom)))
  set(isDirtyAtom, true)
})

export const onConnectAtom = atom(null, (get, set, connection: Connection) => {
  const edges = get(edgesAtom)
  const exists = edges.some(
    (e) => e.target === connection.target && e.targetHandle === connection.targetHandle,
  )
  if (exists) return
  const id = `e-${nextId++}`
  set(edgesAtom, [
    ...edges,
    {
      id,
      source: connection.source,
      sourceHandle: connection.sourceHandle,
      target: connection.target,
      targetHandle: connection.targetHandle,
      type: 'smoothstep',
    } as ScriptEdge,
  ])
  set(isDirtyAtom, true)
})

export const addNodeAtom = atom(null, (get, set, type: string, position: XYPosition): string => {
  const schema = getSchema(type)
  const id = `node-${nextId++}`
  const node: ScriptNode = {
    id,
    type: 'script',
    position,
    data: { schemaType: type, ...schema.defaults },
  }
  set(nodesAtom, [...get(nodesAtom), node])
  set(selectedNodeIdAtom, id)
  set(isDirtyAtom, true)
  return id
})

export const updateNodeDataAtom = atom(null, (get, set, nodeId: string, data: Record<string, unknown>) => {
  set(nodesAtom, get(nodesAtom).map((n) =>
    n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n,
  ))
  set(isDirtyAtom, true)
})

export const deleteSelectedAtom = atom(null, (get, set) => {
  const selectedEdgeId = get(selectedEdgeIdAtom)
  if (selectedEdgeId) {
    set(edgesAtom, get(edgesAtom).filter((e) => e.id !== selectedEdgeId))
    set(selectedEdgeIdAtom, null)
    set(isDirtyAtom, true)
    return
  }
  const selectedNodeId = get(selectedNodeIdAtom)
  if (!selectedNodeId) return
  set(nodesAtom, get(nodesAtom).filter((n) => n.id !== selectedNodeId))
  set(edgesAtom, get(edgesAtom).filter(
    (e) => e.source !== selectedNodeId && e.target !== selectedNodeId,
  ))
  set(selectedNodeIdAtom, null)
  set(isDirtyAtom, true)
})

export const setSelectedNodeAtom = atom(null, (_get, set, id: string | null) => {
  set(selectedNodeIdAtom, id)
  set(selectedEdgeIdAtom, null)
})

export const setSelectedEdgeAtom = atom(null, (_get, set, id: string | null) => {
  set(selectedEdgeIdAtom, id)
  set(selectedNodeIdAtom, null)
})

export const loadGraphAtom = atom(null, (_get, set, nodes: ScriptNode[], edges: ScriptEdge[]) => {
  /* Reset id counter to avoid collisions */
  const maxId = nodes.reduce((m, n) => {
    const num = parseInt(n.id.replace('node-', ''), 10)
    return isNaN(num) ? m : Math.max(m, num)
  }, 0)
  nextId = maxId + 1
  set(nodesAtom, nodes)
  set(edgesAtom, edges)
  set(isDirtyAtom, false)
})
