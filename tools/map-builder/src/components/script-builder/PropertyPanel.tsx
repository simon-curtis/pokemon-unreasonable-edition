import { useCallback } from 'react'
import { useAtomValue, useSetAtom } from 'jotai/react'
import { selectedNodeIdAtom, nodesAtom, updateNodeDataAtom, deleteSelectedAtom } from '#/atoms/script'
import { getSchema } from '#/lib/script-builder/node-registry'
import type { ScriptNodeData } from '#/lib/script-builder/types'

export default function PropertyPanel() {
  const selectedNodeId = useAtomValue(selectedNodeIdAtom)
  const nodes = useAtomValue(nodesAtom)
  const updateNodeData = useSetAtom(updateNodeDataAtom)
  const deleteSelected = useSetAtom(deleteSelectedAtom)

  const node = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null

  if (!node) {
    return (
      <div className="w-[240px] h-full border-l border-hud-border bg-hud-panel shrink-0 p-3">
        <div className="text-sm uppercase tracking-widest text-hud-muted">Properties</div>
        <div className="mt-4 text-sm text-hud-muted italic normal-case">Select a node</div>
      </div>
    )
  }

  const data = node.data as unknown as ScriptNodeData
  const schema = getSchema(data.schemaType)

  return (
    <div className="w-[240px] h-full border-l border-hud-border bg-hud-panel shrink-0 flex flex-col">
      <div className="px-3 py-1.5 border-b border-hud-border flex items-center gap-2 text-sm uppercase tracking-widest">
        <div className="w-2 h-2" style={{ background: schema.color }} />
        <span className="flex-1">{schema.label}</span>
        <button
          className="text-hud-muted hover:text-hud-fg"
          onClick={deleteSelected}
        >
          DEL
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="text-xs text-hud-muted uppercase tracking-widest">{node.id}</div>
        {schema.fields.map((field) => (
          <PropertyField
            key={field.key}
            field={field}
            value={(data[field.key] as string) || ''}
            onChange={(val) => updateNodeData(node.id, { [field.key]: val })}
          />
        ))}
        {schema.fields.length === 0 && (
          <div className="text-sm text-hud-muted italic normal-case">No fields</div>
        )}
      </div>
    </div>
  )
}

function PropertyField({
  field,
  value,
  onChange,
}: {
  field: { key: string; label: string; type: string; options?: { value: string; label: string }[]; placeholder?: string }
  value: string
  onChange: (val: string) => void
}) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      onChange(e.target.value)
    },
    [onChange],
  )

  const stopPropagation = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation()
  }, [])

  const inputClass = 'w-full bg-hud-surface border border-hud-border px-2 py-1 text-md text-hud-fg outline-none focus:border-hud-fg'

  return (
    <div>
      <label className="block text-sm text-hud-muted uppercase tracking-widest mb-1">
        {field.label}
      </label>
      {field.type === 'select' ? (
        <select className={`${inputClass} hud-select`} value={value} onChange={handleChange} onKeyDown={stopPropagation}>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea
          className={`${inputClass} resize-y min-h-[50px]`}
          value={value}
          placeholder={field.placeholder}
          onChange={handleChange}
          onKeyDown={stopPropagation}
          rows={3}
        />
      ) : field.type === 'number' ? (
        <input type="number" className={inputClass} value={value} onChange={handleChange} onKeyDown={stopPropagation} />
      ) : (
        <input className={inputClass} value={value} placeholder={field.placeholder} onChange={handleChange} onKeyDown={stopPropagation} />
      )}
    </div>
  )
}
