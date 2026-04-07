import { useState, useCallback, useEffect, useRef } from 'react'
import { useAtomValue, useSetAtom } from 'jotai/react'
import { scriptEditorOpenAtom, scriptLabelAtom, scriptMapNameAtom, closeScriptEditorAtom } from '#/atoms/viewer'
import { nodesAtom, edgesAtom, isDirtyAtom, loadGraphAtom, undoAtom, redoAtom, deleteSelectedAtom } from '#/atoms/script'
import { appStore } from '#/atoms/store'
import ScriptCanvas from './ScriptCanvas'
import { HudButton, ToggleButton } from '#/ui/components/HudButton'
import { Separator } from '#/ui/components/Separator'
import { IconArrowLeft, IconArrowBackUp, IconArrowForwardUp, IconDeviceFloppy, IconTerminal2, IconLayoutDistributeHorizontal } from '@tabler/icons-react'
import { generateScript } from '#/lib/script-builder/codegen'
import { getScriptGraph, getScriptFile, importScriptGraph, saveScriptFile, saveScriptGraph } from '#/server/script-functions'
import { autoLayout } from '#/lib/script-builder/auto-layout'

export default function ScriptEditorOverlay() {
  const scriptEditorOpen = useAtomValue(scriptEditorOpenAtom)
  const scriptLabel = useAtomValue(scriptLabelAtom)
  const scriptMapName = useAtomValue(scriptMapNameAtom)
  const closeScriptEditor = useSetAtom(closeScriptEditorAtom)

  const loadGraph = useSetAtom(loadGraphAtom)
  const nodes = useAtomValue(nodesAtom)
  const edges = useAtomValue(edgesAtom)
  const undo = useSetAtom(undoAtom)
  const redo = useSetAtom(redoAtom)
  const isDirty = useAtomValue(isDirtyAtom)

  const handleRelayout = useCallback(() => {
    const laid = autoLayout(nodes, edges)
    loadGraph(laid, edges)
  }, [nodes, edges, loadGraph])

  const [logs, setLogs] = useState<{ ts: number; level: 'info' | 'warn' | 'error'; msg: string }[]>([])
  const [logPaneOpen, setLogPaneOpen] = useState(false)
  const logEndRef = useRef<HTMLDivElement>(null)

  const addLog = useCallback((level: 'info' | 'warn' | 'error', msg: string) => {
    setLogs((prev) => [...prev, { ts: Date.now(), level, msg }])
    if (level === 'warn' || level === 'error') setLogPaneOpen(true)
  }, [])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  useEffect(() => {
    if (!scriptEditorOpen || !scriptMapName) return
    /* clear stale graph immediately before async load */
    loadGraph([], [])
    getScriptGraph({ data: { mapName: scriptMapName } })
      .then((result: any) => {
        if (result?.nodes?.length) {
          /* filter saved graph to the clicked label's reachable subgraph */
          const filtered = filterReachable(result.nodes, result.edges, scriptLabel)
          if (filtered.nodes.length) {
            loadGraph(filtered.nodes, filtered.edges)
          } else {
            /* label not in saved graph — import fresh from scripts.inc */
            return importFromInc()
          }
        } else {
          return importFromInc()
        }
      })
      .catch(() => loadGraph([], []))

    function importFromInc() {
      return importScriptGraph({ data: { mapName: scriptMapName!, scriptLabel: scriptLabel ?? undefined } })
        .then((imported: any) => {
          const filtered = filterReachable(imported?.nodes ?? [], imported?.edges ?? [], scriptLabel)
          const laid = autoLayout(filtered.nodes, filtered.edges)
          loadGraph(laid, filtered.edges)
        })
    }
  }, [scriptEditorOpen, scriptMapName, scriptLabel, loadGraph])

  const handleSave = useCallback(async () => {
    if (!scriptMapName) return
    try {
      addLog('info', 'Saving...')
      const existing = await getScriptFile({ data: { mapName: scriptMapName } })
      const { code, replaced, warnings } = generateScript(nodes, edges, scriptMapName, existing?.code)
      await Promise.all([
        saveScriptFile({ data: { mapName: scriptMapName, code } }),
        saveScriptGraph({ data: { mapName: scriptMapName, nodes, edges } }),
      ])
      if (replaced.length > 0) {
        addLog('info', `Saved — replaced ${replaced.length} section(s): ${replaced.join(', ')}`)
      } else {
        addLog('info', 'Saved scripts.inc + scripts.graph.json')
      }
      for (const w of warnings) {
        addLog('warn', w)
      }
    } catch (e: any) {
      addLog('error', `Save failed: ${e.message}`)
    }
  }, [scriptMapName, nodes, edges, addLog])

  useEffect(() => {
    if (!scriptEditorOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeScriptEditor(); return }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        e.shiftKey ? redo() : undo()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
          appStore.set(deleteSelectedAtom)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [scriptEditorOpen, closeScriptEditor, undo, redo, handleSave])

  if (!scriptEditorOpen || !scriptMapName) return null

  return (
    <div className="flex flex-col flex-1 bg-hud-bg text-hud-fg font-mono text-lg absolute inset-0">
      {/* tab bar */}
      <div className="px-5 py-3 flex gap-5 items-center text-md border-b border-hud-border uppercase tracking-widest shrink-0">
        <HudButton onClick={closeScriptEditor} title="Back to map (Esc)">
          <IconArrowLeft size={16} stroke={1.5} />
        </HudButton>
        <Separator />
        <span>{scriptLabel}</span>
        {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved" />}
        <div className="flex-1" />
        <div className="flex gap-0.5">
          <HudButton onClick={handleRelayout} title="Auto-layout">
            <IconLayoutDistributeHorizontal size={16} stroke={1.5} />
          </HudButton>
          <HudButton onClick={undo} title="Undo (Ctrl+Z)">
            <IconArrowBackUp size={16} stroke={1.5} />
          </HudButton>
          <HudButton onClick={redo} title="Redo (Ctrl+Shift+Z)">
            <IconArrowForwardUp size={16} stroke={1.5} />
          </HudButton>
        </div>
        <Separator />
        <div className="flex gap-0.5">
          <HudButton onClick={handleSave} title="Save (Ctrl+S)">
            <IconDeviceFloppy size={16} stroke={1.5} />
          </HudButton>
          <ToggleButton onClick={() => setLogPaneOpen((v) => !v)} title="Toggle log" active={logPaneOpen}>
            <IconTerminal2 size={16} stroke={1.5} />
          </ToggleButton>
        </div>
      </div>

      {/* body */}
      <div className="flex-1 flex overflow-hidden">
        <ScriptCanvas />
      </div>

      {/* log pane */}
      {logPaneOpen && (
        <div className="h-[160px] border-t border-hud-border bg-hud-panel flex flex-col shrink-0">
          <div className="flex items-center justify-between px-3 py-1 border-b border-hud-border text-sm uppercase tracking-widest text-hud-muted">
            <span>Log</span>
            <div className="flex gap-3">
              <button className="hover:text-hud-fg" onClick={() => setLogs([])}>CLEAR</button>
              <button className="hover:text-hud-fg" onClick={() => setLogPaneOpen(false)}>×</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-1 text-md">
            {logs.length === 0 && (
              <span className="text-hud-muted">No log entries.</span>
            )}
            {logs.map((entry, i) => (
              <div key={i} className="flex gap-2 leading-5">
                <span className="text-hud-muted shrink-0">
                  {new Date(entry.ts).toLocaleTimeString([], { hour12: false })}
                </span>
                <span className={
                  entry.level === 'error' ? 'text-red-400'
                    : entry.level === 'warn' ? 'text-amber-400'
                    : 'text-hud-fg'
                }>
                  {entry.msg}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  )
}

/* ── helpers ── */

function filterReachable(
  nodes: any[],
  edges: any[],
  entryLabel: string | null,
): { nodes: any[]; edges: any[] } {
  if (!entryLabel || !nodes.length) return { nodes, edges }

  /* find the entry label node */
  const entry = nodes.find(
    (n) => n.data?.schemaType === 'label' && n.data?.labelName === entryLabel,
  )
  if (!entry) return { nodes: [], edges: [] }

  /* BFS over edges to collect reachable node IDs */
  const edgesBySource = new Map<string, any[]>()
  for (const e of edges) {
    const arr = edgesBySource.get(e.source) ?? []
    arr.push(e)
    edgesBySource.set(e.source, arr)
  }

  const visited = new Set<string>()
  const queue = [entry.id]
  while (queue.length) {
    const id = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    for (const e of edgesBySource.get(id) ?? []) {
      queue.push(e.target)
    }
  }

  const filteredNodes = nodes.filter((n) => visited.has(n.id))
  const filteredEdges = edges.filter((e) => visited.has(e.source) && visited.has(e.target))
  return { nodes: filteredNodes, edges: filteredEdges }
}
