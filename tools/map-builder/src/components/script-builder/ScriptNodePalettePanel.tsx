import { useState, useCallback } from 'react'
import { useAtomValue, useSetAtom } from 'jotai/react'
import { scriptNodesOpenAtom, leftPanelWidthAtom, setLeftPanelWidthAtom } from '#/atoms/viewer'
import { CATEGORIES, NODE_SCHEMAS } from '#/lib/script-builder/node-registry'
import ResizablePanel from '../ResizablePanel'

export default function ScriptNodePalettePanel() {
  const scriptNodesOpen = useAtomValue(scriptNodesOpenAtom)
  const leftPanelWidth = useAtomValue(leftPanelWidthAtom)
  const setLeftPanelWidth = useSetAtom(setLeftPanelWidthAtom)

  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    flow: true,
    message: true,
    branch: true,
  })

  const toggleCategory = useCallback((key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const schemas = Object.values(NODE_SCHEMAS)
  const filtered = search
    ? schemas.filter(
        (s) =>
          s.label.toLowerCase().includes(search.toLowerCase()) ||
          s.type.toLowerCase().includes(search.toLowerCase()),
      )
    : schemas

  if (!scriptNodesOpen) return null

  return (
    <ResizablePanel
      side="left"
      width={leftPanelWidth}
      onWidthChange={setLeftPanelWidth}
      minWidth={140}
      maxWidth={400}
      offset={44}
    >
      <div className="px-3 py-2 border-b border-hud-border">
        <div className="text-sm uppercase tracking-widest text-hud-muted mb-1.5">Nodes</div>
        <input
          className="w-full bg-hud-surface border border-hud-border px-2 py-1 text-md text-hud-fg outline-none placeholder:text-hud-muted"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {search ? (
          <div className="p-2 space-y-0.5">
            {filtered.map((schema) => (
              <PaletteItem key={schema.type} schema={schema} />
            ))}
          </div>
        ) : (
          CATEGORIES.map((cat) => {
            const items = schemas.filter((s) => s.category === cat.key)
            if (items.length === 0) return null
            return (
              <div key={cat.key}>
                <button
                  className="w-full px-3 py-1 text-left text-sm uppercase tracking-widest text-hud-muted hover:text-hud-fg flex items-center gap-1"
                  onClick={() => toggleCategory(cat.key)}
                >
                  <span className="text-xs">{expanded[cat.key] ? '▼' : '▶'}</span>
                  {cat.label}
                </button>
                {expanded[cat.key] && (
                  <div className="px-2 pb-1 space-y-0">
                    {items.map((schema) => (
                      <PaletteItem key={schema.type} schema={schema} />
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </ResizablePanel>
  )
}

function PaletteItem({ schema }: { schema: (typeof NODE_SCHEMAS)[string] }) {
  const onDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('application/script-node-type', schema.type)
      e.dataTransfer.effectAllowed = 'move'
    },
    [schema.type],
  )

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2 px-2 py-1 cursor-grab hover:bg-hud-surface active:cursor-grabbing"
    >
      <div className="w-2 h-2 shrink-0" style={{ background: schema.color }} />
      <span className="text-sm uppercase tracking-widest text-hud-fg">{schema.label}</span>
    </div>
  )
}
