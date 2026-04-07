import { memo, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { ScriptNodeData } from '#/lib/script-builder/types'
import { getSchema } from '#/lib/script-builder/node-registry'
import { useSetAtom } from 'jotai/react'
import { updateNodeDataAtom, setSelectedNodeAtom } from '#/atoms/script'

function ScriptNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ScriptNodeData
  const schema = getSchema(nodeData.schemaType)
  const updateNodeData = useSetAtom(updateNodeDataAtom)
  const setSelectedNode = useSetAtom(setSelectedNodeAtom)

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setSelectedNode(id)
    },
    [id, setSelectedNode],
  )

  const handleFieldChange = useCallback(
    (key: string, value: string) => {
      updateNodeData(id, { [key]: value })
    },
    [id, updateNodeData],
  )

  return (
    <div
      onClick={handleClick}
      className="script-node"
      style={{
        '--node-color': schema.color,
        borderColor: selected ? 'var(--node-color)' : 'var(--hud-border)',
        boxShadow: selected
          ? `0 0 12px color-mix(in srgb, ${schema.color} 35%, transparent), 0 0 1px ${schema.color}`
          : '0 1px 4px rgba(0,0,0,0.3)',
      } as React.CSSProperties}
    >
      {/* color accent stripe */}
      <div className="script-node-stripe" style={{ background: schema.color }} />

      {/* header */}
      <div className="script-node-header">
        <div className="script-node-icon" style={{ background: schema.color }} />
        <span className="script-node-title">{schema.label}</span>
      </div>

      {/* body: pins + fields side by side */}
      <div className="script-node-body">
        {/* input pins column */}
        <div className="script-node-pins script-node-pins-in">
          {schema.inputs.map((pin) => (
            <div key={pin.id} className="script-node-pin">
              <div className="script-node-pin-dot" style={{ background: schema.color }} />
              {pin.label && <span className="script-node-pin-label">{pin.label}</span>}
            </div>
          ))}
        </div>

        {/* center fields */}
        <div className="script-node-fields">
          {schema.fields.slice(0, 2).map((field) => {
            const val = (nodeData[field.key] as string) || ''
            if (field.type === 'select') {
              return (
                <select
                  key={field.key}
                  className="script-node-input hud-select"
                  value={val}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                >
                  {field.options?.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )
            }
            if (field.type === 'textarea') {
              return (
                <div key={field.key} className="script-node-preview" title={val}>
                  {val || field.placeholder || '\u2014'}
                </div>
              )
            }
            return (
              <input
                key={field.key}
                className="script-node-input"
                value={val}
                placeholder={field.placeholder}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
              />
            )
          })}
          {schema.fields.length > 2 && (
            <div className="script-node-more">+{schema.fields.length - 2} more</div>
          )}
          {schema.fields.length === 0 && (
            <div className="script-node-empty">{'\u2014'}</div>
          )}
        </div>

        {/* output pins column */}
        <div className="script-node-pins script-node-pins-out">
          {schema.outputs.map((pin) => (
            <div key={pin.id} className="script-node-pin">
              {pin.label && <span className="script-node-pin-label">{pin.label}</span>}
              <div className="script-node-pin-dot" style={{ background: schema.color }} />
            </div>
          ))}
        </div>
      </div>

      {/* ReactFlow handles — left side inputs */}
      {schema.inputs.map((pin, i) => (
        <Handle
          key={pin.id}
          type="target"
          position={Position.Left}
          id={pin.id}
          className="script-node-handle"
          style={{
            top: schema.inputs.length === 1
              ? '50%'
              : `${((i + 1) / (schema.inputs.length + 1)) * 100}%`,
            background: schema.color,
          }}
        />
      ))}

      {/* ReactFlow handles — right side outputs */}
      {schema.outputs.map((pin, i) => (
        <Handle
          key={pin.id}
          type="source"
          position={Position.Right}
          id={pin.id}
          className="script-node-handle"
          style={{
            top: schema.outputs.length === 1
              ? '50%'
              : `${((i + 1) / (schema.outputs.length + 1)) * 100}%`,
            background: schema.color,
          }}
        />
      ))}
    </div>
  )
}

export default memo(ScriptNodeComponent)
