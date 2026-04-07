import { useAtomValue, useSetAtom } from 'jotai/react'
import { entitiesOpenAtom, leftPanelWidthAtom, setLeftPanelWidthAtom } from '#/atoms/viewer'
import { OBJ_COLORS, OBJ_SYMBOLS } from '#/lib/constants'
import ResizablePanel from './ResizablePanel'

/* Shared with MapCanvas — stores entity kind during drag since dataTransfer
   values aren't readable during dragover (browser security restriction) */
export let draggingEntityKind: string | null = null

interface EntityType {
  kind: string
  label: string
  eventArray: string
}

const ENTITY_TYPES: EntityType[] = [
  { kind: 'npc', label: 'NPC', eventArray: 'object_events' },
  { kind: 'trainer', label: 'Trainer', eventArray: 'object_events' },
  { kind: 'item', label: 'Item', eventArray: 'object_events' },
  { kind: 'warp', label: 'Warp', eventArray: 'warp_events' },
  { kind: 'trigger', label: 'Trigger', eventArray: 'coord_events' },
  { kind: 'coord', label: 'Coord Event', eventArray: 'coord_events' },
  { kind: 'sign', label: 'Sign', eventArray: 'bg_events' },
  { kind: 'hidden', label: 'Hidden Item', eventArray: 'bg_events' },
]

export default function EntityPalettePanel() {
  const entitiesOpen = useAtomValue(entitiesOpenAtom)
  const leftPanelWidth = useAtomValue(leftPanelWidthAtom)
  const setLeftPanelWidth = useSetAtom(setLeftPanelWidthAtom)

  if (!entitiesOpen) return null

  return (
    <ResizablePanel
      side="left"
      width={leftPanelWidth}
      onWidthChange={setLeftPanelWidth}
      minWidth={140}
      maxWidth={500}
      offset={44}
    >
      <div className="hud-panel-header">
        <span className="hud-panel-title">Entities</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
        {ENTITY_TYPES.map((entity) => (
          <div
            key={entity.kind}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/entity-kind', entity.kind)
              e.dataTransfer.setData('application/entity-array', entity.eventArray)
              e.dataTransfer.effectAllowed = 'copy'
              draggingEntityKind = entity.kind
              /* Hide the default browser drag ghost — we render our own on the canvas */
              const blank = document.createElement('canvas')
              blank.width = 1
              blank.height = 1
              e.dataTransfer.setDragImage(blank, 0, 0)
            }}
            onDragEnd={() => {
              draggingEntityKind = null
            }}
            className="flex items-center gap-2 px-2 py-1.5 border border-hud-border hover:border-hud-muted hover:bg-hud-surface cursor-grab active:cursor-grabbing select-none group"
          >
            <div
              className="w-5 h-5 flex items-center justify-center text-sm font-bold shrink-0"
              style={{ backgroundColor: OBJ_COLORS[entity.kind], color: '#000' }}
            >
              {OBJ_SYMBOLS[entity.kind]}
            </div>
            <span className="text-sm uppercase tracking-widest text-hud-muted group-hover:text-hud-fg">
              {entity.label}
            </span>
          </div>
        ))}
      </div>
    </ResizablePanel>
  )
}
