import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { deleteObject, createObjectScript } from '#/server/functions'
import { useAtomValue, useSetAtom } from 'jotai/react'
import {
  selectedObjectAtom,
  rightPanelAtom,
  rightPanelWidthAtom,
  setRightPanelWidthAtom,
  setRightPanelAtom,
  openScriptEditorAtom,
} from '#/atoms/viewer'
import { attachContextAtom } from '#/atoms/chat'
import type { MapObject } from '#/lib/types'
import type { MapScriptInfo } from '#/lib/script-builder/inc-parser'
import ResizablePanel from './ResizablePanel'

interface Props {
  objects: MapObject[]
  mapName: string
  mapProperties: Record<string, unknown>
}

/* Keys to skip — already shown in header or redundant */
const SKIP_KEYS = new Set(['x', 'y'])

/* Format raw key for display: strip common prefixes, shorten */
function formatKey(k: string): string {
  return k
    .replace(/^(OBJ_EVENT_|TRAINER_TYPE_|MOVEMENT_TYPE_|BG_EVENT_)/, '')
    .toLowerCase()
    .replace(/_/g, ' ')
}

/* Format raw value for display */
function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'string') {
    if (v === '0' || v === '') return v || '—'
    return v
      .replace(/^(OBJ_EVENT_GFX_|MOVEMENT_TYPE_|TRAINER_TYPE_|FLAG_|ITEM_|VAR_|BG_EVENT_PLAYER_FACING_)/, '')
  }
  return String(v)
}

export default function ObjectPropertiesPanel({ objects, mapName, mapProperties }: Props) {
  const queryClient = useQueryClient()
  const selectedObject = useAtomValue(selectedObjectAtom)
  const setSelectedObject = useSetAtom(selectedObjectAtom)
  const rightPanel = useAtomValue(rightPanelAtom)
  const openScriptEditor = useSetAtom(openScriptEditorAtom)
  const rightPanelWidth = useAtomValue(rightPanelWidthAtom)
  const setRightPanelWidth = useSetAtom(setRightPanelWidthAtom)

  /* O(1) lookup for selected object */
  const objByEvent = useMemo(() => {
    const map = new Map<string, MapObject>()
    for (const o of objects) map.set(`${o.eventArray}:${o.eventIndex}`, o)
    return map
  }, [objects])

  const obj = selectedObject
    ? objByEvent.get(`${selectedObject.eventArray}:${selectedObject.eventIndex}`) ?? null
    : null

  const handleDelete = useCallback(async () => {
    if (!selectedObject) return
    await deleteObject({ data: { mapName, eventArray: selectedObject.eventArray, eventIndex: selectedObject.eventIndex } })
    setSelectedObject(null)
    queryClient.invalidateQueries({ queryKey: ['metadata', mapName] })
  }, [selectedObject, mapName, queryClient, setSelectedObject])

  const attachContext = useSetAtom(attachContextAtom)
  const setRightPanel = useSetAtom(setRightPanelAtom)

  const [copied, setCopied] = useState(false)
  const copyReference = useCallback(() => {
    if (!obj) return
    const lines: string[] = [
      `${mapName} ${obj.eventArray}[${obj.eventIndex}] ${obj.kind} @ (${obj.x},${obj.y})`,
    ]
    for (const [k, v] of Object.entries(obj.rawData)) {
      if (SKIP_KEYS.has(k)) continue
      lines.push(`  ${k}=${String(v)}`)
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [obj, mapName])

  const addToChat = useCallback(() => {
    if (!obj) return
    const props = Object.entries(obj.rawData)
      .filter(([k]) => !SKIP_KEYS.has(k))
      .map(([k, v]) => `${k}=${String(v)}`)
      .join(', ')
    attachContext({
      label: `${obj.kind} @ (${obj.x},${obj.y})`,
      detail: `${obj.eventArray}[${obj.eventIndex}] ${props}`,
    })
    setRightPanel('ai')
  }, [obj, attachContext, setRightPanel])

  if (rightPanel !== 'properties') return null

  if (!selectedObject) {
    const { _mapScripts, ...restProps } = mapProperties
    const mapScripts = _mapScripts as MapScriptInfo | undefined
    const mapEntries = Object.entries(restProps)

    return (
      <ResizablePanel
        side="right"
        width={rightPanelWidth}
        onWidthChange={setRightPanelWidth}
        minWidth={200}
        maxWidth={700}
        offset={44}
      >
        <div className="hud-panel-header">
          <span className="hud-panel-title">Properties</span>
        </div>
        <div className="hud-panel-header" style={{ borderBottomColor: 'var(--hud-border)' }}>
          <span style={{ fontSize: 7 }}>&#x25C6;</span>
          <span className="hud-panel-title">Map</span>
          <span className="ml-auto">{mapName}</span>
        </div>

        {/* Map-level scripts */}
        {mapScripts && mapScripts.scripts.length > 0 && (
          <div className="border-b border-hud-border">
            <div className="px-3 py-1.5 text-xs uppercase tracking-widest text-hud-muted">
              Map Scripts
            </div>
            {mapScripts.scripts.map((entry) => {
              /* ON_FRAME_TABLE is a data table, not an editable script — individual triggers shown below */
              const isTable = entry.type === 'MAP_SCRIPT_ON_FRAME_TABLE'
              return (
                <div key={entry.label} className="px-3 py-1 border-t border-hud-border border-opacity-30">
                  <div className="text-hud-muted text-xs mb-0.5">
                    {entry.type.replace('MAP_SCRIPT_', '')}
                  </div>
                  {isTable ? (
                    <span className="text-sm uppercase tracking-widest text-hud-muted">
                      {entry.label}
                    </span>
                  ) : (
                    <button
                      className="text-sm uppercase tracking-widest text-hud-fg hover:text-hud-active-fg hover:underline cursor-pointer"
                      onClick={() => openScriptEditor(mapName, entry.label)}
                    >
                      {entry.label}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* On-frame table entries */}
        {mapScripts && mapScripts.onFrameEntries.length > 0 && (
          <div className="border-b border-hud-border">
            <div className="px-3 py-1.5 text-xs uppercase tracking-widest text-hud-muted">
              On-Frame Triggers
            </div>
            {mapScripts.onFrameEntries.map((entry, i) => (
              <div key={`${entry.label}-${i}`} className="px-3 py-1 border-t border-hud-border border-opacity-30">
                <div className="text-hud-muted text-xs mb-0.5">
                  {entry.var.replace('VAR_', '')} = {entry.value}
                </div>
                <button
                  className="text-sm uppercase tracking-widest text-hud-fg hover:text-hud-active-fg hover:underline cursor-pointer"
                  onClick={() => openScriptEditor(mapName, entry.label)}
                >
                  {entry.label}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="overflow-y-auto flex-1">
          <div className="flex flex-col text-sm uppercase tracking-widest">
            {mapEntries.map(([key, val]) => (
              <div key={key} className="px-3 py-1.5 border-b border-hud-border border-opacity-30">
                <div className="text-hud-muted text-xs mb-0.5">{formatKey(key)}</div>
                <div className="text-hud-fg break-all">{formatValue(val)}</div>
              </div>
            ))}
          </div>
        </div>
      </ResizablePanel>
    )
  }

  if (!obj) return null

  const entries = Object.entries(obj.rawData).filter(([k]) => !SKIP_KEYS.has(k))
  const scriptName = (obj.rawData.script as string) || ''
  const hasScript = scriptName && scriptName !== 'NULL' && scriptName !== '0'

  return (
    <ResizablePanel
      side="right"
      width={rightPanelWidth}
      onWidthChange={setRightPanelWidth}
      minWidth={200}
      maxWidth={700}
      offset={44}
    >
      <div className="hud-panel-header">
        <span className="hud-panel-title">Properties</span>
      </div>
      <div className="hud-panel-header">
        <span style={{ fontSize: 7 }}>&#x25C6;</span>
        <span className="hud-panel-title">{obj.kind}</span>
        <span>({obj.x}, {obj.y})</span>
        <span className="ml-auto">{obj.eventArray}[{obj.eventIndex}]</span>
      </div>
      <div className="mx-3 mt-2 mb-1 flex gap-1.5">
        {!hasScript && (
          <button
            className="flex-1 px-2 py-1.5 border border-hud-border hover:border-hud-active-border hover:bg-hud-active hover:text-hud-active-fg text-sm uppercase tracking-widest text-center cursor-pointer"
            onClick={async () => {
              if (!selectedObject) return
              const res = await createObjectScript({
                data: {
                  mapName,
                  eventArray: selectedObject.eventArray,
                  eventIndex: selectedObject.eventIndex,
                  kind: obj.kind,
                },
              })
              queryClient.invalidateQueries({ queryKey: ['metadata', mapName] })
              openScriptEditor(mapName, res.label)
            }}
          >
            Create Script
          </button>
        )}
        <button
          className="flex-1 px-2 py-1.5 border border-hud-border hover:border-hud-active-border hover:bg-hud-active hover:text-hud-active-fg text-sm uppercase tracking-widest text-center cursor-pointer"
          onClick={copyReference}
        >
          {copied ? 'Copied!' : 'Copy Ref'}
        </button>
        <button
          className="flex-1 px-2 py-1.5 border border-hud-border hover:border-hud-active-border hover:bg-hud-active hover:text-hud-active-fg text-sm uppercase tracking-widest text-center cursor-pointer"
          onClick={addToChat}
          title="Add this object as context for AI chat"
        >
          + Chat
        </button>
        <button
          className="px-2 py-1.5 border border-red-700/50 hover:border-red-500 hover:bg-red-900/40 text-red-400 hover:text-red-300 text-sm uppercase tracking-widest text-center cursor-pointer"
          onClick={handleDelete}
          title="Delete object (Del)"
        >
          Del
        </button>
      </div>
      <div className="overflow-y-auto flex-1">
        <div className="flex flex-col text-sm uppercase tracking-widest">
          {entries.map(([key, val]) => (
            <div key={key} className="px-3 py-1.5 border-b border-hud-border border-opacity-30">
              <div className="text-hud-muted text-xs mb-0.5">{formatKey(key)}</div>
              {key === 'script' && hasScript ? (
                <button
                  className="text-hud-fg hover:text-hud-active-fg hover:underline cursor-pointer break-all text-left"
                  onClick={() => openScriptEditor(mapName, scriptName)}
                >
                  {formatValue(val)}
                </button>
              ) : (
                <div className="text-hud-fg break-all">{formatValue(val)}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </ResizablePanel>
  )
}
