import type { Node, Edge } from '@xyflow/react'

/* ── Pin & field definitions ── */

export type PinType = 'flow'

export interface PinDef {
  id: string
  label: string
  type: PinType
}

export type FieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'number'
  | 'flag'
  | 'var'
  | 'species'
  | 'item'
  | 'trainer'
  | 'movement'
  | 'sound'
  | 'map'

export interface FieldOption {
  value: string
  label: string
}

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  options?: FieldOption[]
  placeholder?: string
}

/* ── Node schema (describes a node type, not an instance) ── */

export type NodeCategory =
  | 'flow'
  | 'message'
  | 'branch'
  | 'items'
  | 'pokemon'
  | 'state'
  | 'movement'
  | 'battle'
  | 'audio'
  | 'warp'
  | 'misc'

export interface NodeSchema {
  type: string
  label: string
  category: NodeCategory
  color: string
  inputs: PinDef[]
  outputs: PinDef[]
  defaults: Record<string, any>
  fields: FieldDef[]
}

/* ── Graph instance types ── */

export interface ScriptNodeData extends Record<string, unknown> {
  schemaType: string
  [key: string]: unknown
}

export type ScriptNode = Node<ScriptNodeData>
export type ScriptEdge = Edge

export interface ScriptGraph {
  nodes: ScriptNode[]
  edges: ScriptEdge[]
  mapName: string
}
