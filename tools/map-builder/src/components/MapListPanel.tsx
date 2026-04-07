import { useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useAtomValue, useSetAtom } from 'jotai/react'
import { mapListOpenAtom, leftPanelWidthAtom, setLeftPanelWidthAtom } from '#/atoms/viewer'
import { mapListQueryOptions } from '#/lib/queries'
import ResizablePanel from './ResizablePanel'

interface Props {
  mapName: string | undefined
}

export default function MapListPanel({ mapName }: Props) {
  const navigate = useNavigate()
  const { data: mapList } = useQuery(mapListQueryOptions)
  const open = useAtomValue(mapListOpenAtom)
  const panelWidth = useAtomValue(leftPanelWidthAtom)
  const setLeftPanelWidth = useSetAtom(setLeftPanelWidthAtom)
  const [filter, setFilter] = useState('')

  const maps = mapList?.maps || []
  const filtered = useMemo(() => {
    if (!filter) return maps
    const lc = filter.toLowerCase()
    return maps.filter((m) => m.toLowerCase().includes(lc))
  }, [maps, filter])

  if (!open) return null

  return (
    <ResizablePanel
      side="left"
      width={panelWidth}
      onWidthChange={setLeftPanelWidth}
      minWidth={140}
      maxWidth={500}
      offset={44}
    >
      <div className="hud-panel-header">
        <span className="hud-panel-title">Maps</span>
        <span className="ml-auto tabular-nums">{filtered.length}</span>
      </div>
      <div className="px-2 py-1.5 border-b border-hud-border shrink-0">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="FILTER..."
          className="block w-full box-border bg-transparent border border-hud-border px-2 py-1 text-sm uppercase tracking-widest text-hud-fg placeholder:text-hud-muted focus:outline-none focus:border-hud-muted"
        />
      </div>
      <div className="overflow-y-auto flex-1">
        {filtered.map((m) => (
          <button
            key={m}
            onClick={() => navigate({ to: '/map/$name', params: { name: m } })}
            className={`block w-full text-left px-3 py-1 text-sm uppercase tracking-widest cursor-pointer border-b border-transparent hover:bg-hud-surface ${
              m === mapName
                ? 'bg-hud-active text-hud-active-fg'
                : 'text-hud-fg'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
    </ResizablePanel>
  )
}
