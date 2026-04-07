import { useCallback, useMemo, useRef } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useAtomValue, useSetAtom } from 'jotai/react'
import {
  nodesAtom,
  edgesAtom,
  selectedEdgeIdAtom,
  onNodesChangeAtom,
  onEdgesChangeAtom,
  onConnectAtom,
  addNodeAtom,
  setSelectedNodeAtom,
  setSelectedEdgeAtom,
} from '#/atoms/script'
import ScriptNodeComponent from './nodes/ScriptNode'

const nodeTypes = { script: ScriptNodeComponent }

export default function ScriptCanvas() {
  const nodes = useAtomValue(nodesAtom)
  const rawEdges = useAtomValue(edgesAtom)
  const selectedEdgeId = useAtomValue(selectedEdgeIdAtom)
  const edges = useMemo(
    () => rawEdges.map((e) => ({ ...e, selected: e.id === selectedEdgeId })),
    [rawEdges, selectedEdgeId],
  )
  const onNodesChange = useSetAtom(onNodesChangeAtom)
  const onEdgesChange = useSetAtom(onEdgesChangeAtom)
  const onConnect = useSetAtom(onConnectAtom)
  const addNode = useSetAtom(addNodeAtom)
  const setSelectedNode = useSetAtom(setSelectedNodeAtom)
  const setSelectedEdge = useSetAtom(setSelectedEdgeAtom)

  const rfRef = useRef<any>(null)

  const onInit = useCallback((instance: any) => {
    rfRef.current = instance
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const type = e.dataTransfer.getData('application/script-node-type')
      if (!type || !rfRef.current) return
      const position = rfRef.current.screenToFlowPosition({ x: e.clientX, y: e.clientY })
      addNode(type, position)
    },
    [addNode],
  )

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: { id: string }) => {
      setSelectedEdge(edge.id)
    },
    [setSelectedEdge],
  )

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [setSelectedNode])

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={onInit}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        edgesFocusable
        defaultEdgeOptions={{
          type: 'default',
          interactionWidth: 20,
          style: { stroke: 'var(--hud-muted)', strokeWidth: 2 },
        }}
        connectionLineStyle={{ stroke: 'var(--hud-accent)', strokeWidth: 2 }}
        fitView
        panOnScroll
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Shift"
        proOptions={{ hideAttribution: true }}
        style={{ background: 'var(--hud-bg)' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--hud-border)" />
        <MiniMap
          style={{ background: 'var(--hud-bg)', border: '1px solid var(--hud-border)' }}
          nodeColor={() => 'var(--hud-fg)'}
          maskColor="var(--hud-surface)"
        />
        <Controls />
      </ReactFlow>
    </div>
  )
}
