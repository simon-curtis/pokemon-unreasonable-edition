import { join } from 'node:path'
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises'
import { createServerFn } from '@tanstack/react-start'
import { getProjectRoot, loadMapJson } from './map-data'
import { parseIncToGraph } from '#/lib/script-builder/inc-parser'

/* ── Read the graph JSON sidecar ── */

export const getScriptGraph = createServerFn({ method: 'GET' }).handler(
  async (ctx: { data: { mapName: string } }) => {
    const root = getProjectRoot()
    const graphPath = join(root, 'data', 'maps', ctx.data.mapName, 'scripts.graph.json')
    try {
      const raw = await readFile(graphPath, 'utf-8')
      return JSON.parse(raw)
    } catch {
      return { nodes: [], edges: [] }
    }
  },
)

/* ── Save the graph JSON sidecar ── */

export const saveScriptGraph = createServerFn({ method: 'POST' }).handler(
  async (ctx: { data: { mapName: string; nodes: any[]; edges: any[] } }) => {
    const root = getProjectRoot()
    const dir = join(root, 'data', 'maps', ctx.data.mapName)
    await mkdir(dir, { recursive: true })
    const graphPath = join(dir, 'scripts.graph.json')
    await writeFile(graphPath, JSON.stringify({ nodes: ctx.data.nodes, edges: ctx.data.edges }, null, 2))
    return { ok: true }
  },
)

/* ── Save generated .inc file ── */

export const saveScriptFile = createServerFn({ method: 'POST' }).handler(
  async (ctx: { data: { mapName: string; code: string } }) => {
    const root = getProjectRoot()
    const dir = join(root, 'data', 'maps', ctx.data.mapName)
    await mkdir(dir, { recursive: true })
    const incPath = join(dir, 'scripts.inc')
    await writeFile(incPath, ctx.data.code)
    return { ok: true }
  },
)

/* ── Import graph from existing .inc file ── */

export const importScriptGraph = createServerFn({ method: 'GET' }).handler(
  async (ctx: { data: { mapName: string; scriptLabel?: string } }) => {
    const root = getProjectRoot()
    const incPath = join(root, 'data', 'maps', ctx.data.mapName, 'scripts.inc')
    try {
      const code = await readFile(incPath, 'utf-8')
      const graph = parseIncToGraph(code, ctx.data.mapName)

      /* If a specific label was requested but not found locally, search global scripts */
      if (ctx.data.scriptLabel && graph.nodes.length > 0) {
        const hasLabel = graph.nodes.some(
          (n: any) => n.data?.schemaType === 'label' && n.data?.labelName === ctx.data.scriptLabel,
        )
        if (!hasLabel) {
          const globalGraph = await findGlobalScript(root, ctx.data.scriptLabel, ctx.data.mapName)
          if (globalGraph) {
            return globalGraph
          }
        }
      }
      if (ctx.data.scriptLabel && graph.nodes.length === 0) {
        const globalGraph = await findGlobalScript(root, ctx.data.scriptLabel, ctx.data.mapName)
        if (globalGraph) return globalGraph
      }

      return graph
    } catch {
      /* Local scripts.inc doesn't exist — try global scripts */
      if (ctx.data.scriptLabel) {
        const globalGraph = await findGlobalScript(root, ctx.data.scriptLabel, ctx.data.mapName)
        if (globalGraph) return globalGraph
      }
      return { nodes: [], edges: [] }
    }
  },
)

/* Search data/scripts/*.inc for a specific label definition */
async function findGlobalScript(
  root: string,
  label: string,
  mapName: string,
): Promise<{ nodes: any[]; edges: any[] } | null> {
  const scriptsDir = join(root, 'data', 'scripts')
  try {
    const files = await readdir(scriptsDir)
    for (const file of files) {
      if (!file.endsWith('.inc')) continue
      const code = await readFile(join(scriptsDir, file), 'utf-8')
      if (!code.includes(label)) continue
      const graph = parseIncToGraph(code, mapName)
      const hasLabel = graph.nodes.some(
        (n: any) => n.data?.schemaType === 'label' && n.data?.labelName === label,
      )
      if (hasLabel) return graph
    }
  } catch { /* ignore */ }
  return null
}

/* ── Get map.json event script references ── */

export const getMapEvents = createServerFn({ method: 'GET' }).handler(
  async (ctx: { data: { mapName: string } }) => {
    try {
      const mapJson = loadMapJson(ctx.data.mapName)
      return {
        object_events: (mapJson.object_events ?? []).map((o: any) => ({ script: o.script })),
        coord_events: (mapJson.coord_events ?? []).map((o: any) => ({ script: o.script })),
        bg_events: (mapJson.bg_events ?? []).map((o: any) => ({ script: o.script, type: o.type })),
      }
    } catch {
      return { object_events: [], coord_events: [], bg_events: [] }
    }
  },
)

/* ── Read existing .inc file (for future parser) ── */

export const getScriptFile = createServerFn({ method: 'GET' }).handler(
  async (ctx: { data: { mapName: string } }) => {
    const root = getProjectRoot()
    const incPath = join(root, 'data', 'maps', ctx.data.mapName, 'scripts.inc')
    try {
      const code = await readFile(incPath, 'utf-8')
      return { code }
    } catch {
      return { code: '' }
    }
  },
)
