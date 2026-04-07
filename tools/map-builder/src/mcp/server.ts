#!/usr/bin/env bun
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod/v3'
import {
  findLayoutForMap,
  parseMapBin,
  loadMapJson,
  saveMapJson,
  getMapNames,
  getProjectRoot,
  tilesetLabelToDir,
  loadLayoutsJson,
  saveLayoutsJson,
  invalidateGridCache,
} from '#/server/map-data'
import { buildObjectData, buildMetatileInfo } from '#/server/metadata'
import { loadTilesetData } from '#/server/tileset'
import { generateScript } from '#/lib/script-builder/codegen'
import { NODE_SCHEMAS } from '#/lib/script-builder/node-registry'
import { autoLayout } from '#/lib/script-builder/auto-layout'
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const server = new McpServer({
  name: 'map-builder',
  version: '1.0.0',
})

/* ------------------------------------------------------------------ */
/*  list_maps                                                         */
/* ------------------------------------------------------------------ */
server.tool(
  'list_maps',
  'List all available map names in the project',
  async () => {
    const names = getMapNames()
    return { content: [{ type: 'text' as const, text: names.join('\n') }] }
  },
)

/* ------------------------------------------------------------------ */
/*  get_map_info                                                      */
/* ------------------------------------------------------------------ */
server.tool(
  'get_map_info',
  'Get map dimensions, properties, collision grid, and all events/objects',
  { mapName: z.string().describe('Map folder name, e.g. "Route101"') },
  async ({ mapName }) => {
    const { layout, mapData } = findLayoutForMap(mapName)
    const w = layout.width
    const h = layout.height
    const grid = parseMapBin(layout.blockdata_filepath, w, h)
    const objects = buildObjectData(mapData)

    const collisionRows: string[] = []
    for (let y = 0; y < h; y++) {
      let row = ''
      for (let x = 0; x < w; x++) {
        const [, collision] = grid[y][x]
        row += collision ? 'X' : '.'
      }
      collisionRows.push(row)
    }

    const skip = new Set(['object_events', 'warp_events', 'coord_events', 'bg_events', 'connections'])
    const props = Object.fromEntries(
      Object.entries(mapData).filter(([k]) => !skip.has(k)),
    )

    const eventSummary = objects.map((o) => ({
      eventArray: o.eventArray,
      eventIndex: o.eventIndex,
      kind: o.kind,
      x: o.x,
      y: o.y,
      gfx: o.gfx,
      label: o.label || null,
      raw: o.rawData,
    }))

    const result = {
      mapName,
      width: w,
      height: h,
      primaryTileset: layout.primary_tileset,
      secondaryTileset: layout.secondary_tileset,
      properties: props,
      events: eventSummary,
      collisionGrid: collisionRows,
    }

    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
  },
)

/* ------------------------------------------------------------------ */
/*  list_tilesets                                                     */
/* ------------------------------------------------------------------ */
server.tool(
  'list_tilesets',
  'List all available tilesets with their C label, directory, and whether they are primary or secondary',
  async () => {
    const root = getProjectRoot()
    const headersPath = join(root, 'src', 'data', 'tilesets', 'headers.h')
    const content = readFileSync(headersPath, 'utf-8')

    const tilesets: Array<{ label: string; dir: string | null; type: string }> = []
    let currentLabel: string | null = null
    let currentType: string | null = null

    for (const line of content.split('\n')) {
      const labelMatch = line.match(/^const struct Tileset (\w+)/)
      if (labelMatch) {
        currentLabel = labelMatch[1]
        currentType = null
      }
      const secMatch = line.match(/\.isSecondary\s*=\s*(\w+)/)
      if (secMatch && currentLabel) {
        currentType = secMatch[1] === 'TRUE' ? 'secondary' : 'primary'
      }
      /* End of struct → emit entry */
      if (line.match(/^\};/) && currentLabel) {
        tilesets.push({
          label: currentLabel,
          dir: tilesetLabelToDir(currentLabel),
          type: currentType || 'unknown',
        })
        currentLabel = null
      }
    }

    return { content: [{ type: 'text' as const, text: JSON.stringify(tilesets, null, 2) }] }
  },
)

/* ------------------------------------------------------------------ */
/*  get_tileset_info                                                  */
/* ------------------------------------------------------------------ */
server.tool(
  'get_tileset_info',
  `Get all metatiles available for a map's tilesets, grouped by behavior category.
Each metatile shows its ID, category (grass, water, ledge, door, sand, ice, cave, normal, unknown),
whether it is empty (visually blank — all subtiles reference tile 0), and how many times it's used on the current map.
IMPORTANT: When painting, only use metatile IDs where empty=false. Empty metatiles render as white blocks.`,
  { mapName: z.string().describe('Map folder name, e.g. "Route101"') },
  async ({ mapName }) => {
    const { layout } = findLayoutForMap(mapName)
    const w = layout.width
    const h = layout.height
    const grid = parseMapBin(layout.blockdata_filepath, w, h)
    const ts = loadTilesetData(layout.primary_tileset, layout.secondary_tileset)
    const metatiles = buildMetatileInfo(grid, ts)

    /* Detect empty metatiles (all subtiles reference tile 0) */
    function isEmptyMetatile(subtiles: import('#/server/tileset').Subtile[]): boolean {
      return subtiles.every((s) => s.tileId === 0 && s.paletteNum === 0)
    }

    /* Tag each metatile with empty flag and tileset source */
    const priCount = ts.primaryMetatiles.length
    const tagged = metatiles.map((mt) => {
      const isPrimary = mt.id < 512
      const subtiles = isPrimary
        ? ts.primaryMetatiles[mt.id]
        : ts.secondaryMetatiles[mt.id - 512]
      return {
        id: mt.id,
        category: mt.category,
        source: isPrimary ? 'primary' : 'secondary',
        empty: subtiles ? isEmptyMetatile(subtiles) : true,
        used: mt.count,
      }
    })

    /* Group by category for compact output */
    const byCategory: Record<string, Array<{ id: number; source: string; used: number }>> = {}
    let emptyCount = 0
    for (const mt of tagged) {
      if (mt.empty) { emptyCount++; continue }
      if (!byCategory[mt.category]) byCategory[mt.category] = []
      byCategory[mt.category].push({ id: mt.id, source: mt.source, used: mt.used })
    }

    const result = {
      mapName,
      primaryTileset: layout.primary_tileset,
      secondaryTileset: layout.secondary_tileset,
      primaryMetatileCount: priCount,
      secondaryMetatileCount: ts.secondaryMetatiles.length,
      emptyMetatileCount: emptyCount,
      metatilesByCategory: byCategory,
    }

    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
  },
)

/* ------------------------------------------------------------------ */
/*  edit_layout                                                       */
/* ------------------------------------------------------------------ */
server.tool(
  'edit_layout',
  'Edit layout properties for a map, including tileset assignments. Use list_tilesets to find valid tileset labels.',
  {
    mapName: z.string().describe('Map folder name, e.g. "OldaleTown"'),
    properties: z.record(z.unknown()).describe('Properties to set on the layout (e.g. primary_tileset, secondary_tileset)'),
  },
  async ({ mapName, properties }) => {
    const { layout } = findLayoutForMap(mapName)
    const layoutsData = loadLayoutsJson()
    const entry = layoutsData.layouts.find((l) => l.id === layout.id)
    if (!entry) {
      return { content: [{ type: 'text' as const, text: `Error: Layout ${layout.id} not found.` }], isError: true }
    }

    /* Validate tileset labels if being changed */
    for (const key of ['primary_tileset', 'secondary_tileset'] as const) {
      if (key in properties) {
        const label = String(properties[key])
        if (!tilesetLabelToDir(label)) {
          return { content: [{ type: 'text' as const, text: `Error: Tileset "${label}" not found. Use list_tilesets to see available tilesets.` }], isError: true }
        }
      }
    }

    const before: Record<string, unknown> = {}
    for (const k of Object.keys(properties)) {
      before[k] = (entry as any)[k]
    }
    Object.assign(entry, properties)
    saveLayoutsJson(layoutsData)

    const changes = Object.keys(properties)
      .map((k) => `  ${k}: ${JSON.stringify(before[k])} → ${JSON.stringify((entry as any)[k])}`)
      .join('\n')

    return {
      content: [{
        type: 'text' as const,
        text: `Updated layout ${layout.id}:\n${changes}`,
      }],
    }
  },
)

/* ------------------------------------------------------------------ */
/*  edit_map_properties                                               */
/* ------------------------------------------------------------------ */
server.tool(
  'edit_map_properties',
  'Edit map.json properties (music, weather, map_type, show_map_name, etc.). For tileset changes use edit_layout instead.',
  {
    mapName: z.string().describe('Map folder name'),
    properties: z.record(z.unknown()).describe('Properties to set on the map (merged with existing)'),
  },
  async ({ mapName, properties }) => {
    const mapData = loadMapJson(mapName)

    const before: Record<string, unknown> = {}
    for (const k of Object.keys(properties)) {
      before[k] = (mapData as any)[k]
    }
    Object.assign(mapData, properties)
    saveMapJson(mapName, mapData)

    const changes = Object.keys(properties)
      .map((k) => `  ${k}: ${JSON.stringify(before[k])} → ${JSON.stringify((mapData as any)[k])}`)
      .join('\n')

    return {
      content: [{
        type: 'text' as const,
        text: `Updated ${mapName}/map.json:\n${changes}`,
      }],
    }
  },
)

/* ------------------------------------------------------------------ */
/*  paint_metatiles                                                   */
/* ------------------------------------------------------------------ */
server.tool(
  'paint_metatiles',
  `Paint metatiles on the map grid. Each tile specifies x, y, and metatileId.
Use get_tileset_info to see available metatile IDs and their categories.
Preserves existing collision and elevation values — only the metatile ID is changed.
For bulk fills, provide all tiles in a single call.`,
  {
    mapName: z.string().describe('Map folder name'),
    tiles: z.array(z.object({
      x: z.number().int().describe('X coordinate (0-based)'),
      y: z.number().int().describe('Y coordinate (0-based)'),
      metatileId: z.number().int().describe('Metatile ID to paint'),
    })).min(1).describe('Array of tiles to paint'),
  },
  async ({ mapName, tiles }) => {
    const { layout } = findLayoutForMap(mapName)
    const w = layout.width
    const h = layout.height

    const root = getProjectRoot()
    const binPath = layout.blockdata_filepath.startsWith('/')
      ? layout.blockdata_filepath
      : join(root, layout.blockdata_filepath)
    const buf = readFileSync(binPath)

    let painted = 0
    let skipped = 0
    for (const t of tiles) {
      if (t.x < 0 || t.x >= w || t.y < 0 || t.y >= h) { skipped++; continue }
      const offset = (t.y * w + t.x) * 2
      const existing = buf.readUInt16LE(offset)
      const collision = (existing >> 10) & 0x3
      const elevation = (existing >> 12) & 0xf
      const word = (t.metatileId & 0x3ff) | (collision << 10) | (elevation << 12)
      buf.writeUInt16LE(word, offset)
      painted++
    }

    writeFileSync(binPath, buf)
    invalidateGridCache(layout.blockdata_filepath)

    return {
      content: [{
        type: 'text' as const,
        text: `Painted ${painted} metatile(s) on ${mapName}${skipped ? ` (${skipped} out-of-bounds skipped)` : ''}.`,
      }],
    }
  },
)

/* ------------------------------------------------------------------ */
/*  place_event                                                       */
/* ------------------------------------------------------------------ */
server.tool(
  'place_event',
  'Place a new event (NPC, trainer, item, warp, trigger, sign, hidden item) on the map',
  {
    mapName: z.string().describe('Map folder name'),
    kind: z.enum(['npc', 'trainer', 'item', 'warp', 'trigger', 'sign', 'hidden']).describe('Event type'),
    x: z.number().int().describe('X coordinate (0-based, left to right)'),
    y: z.number().int().describe('Y coordinate (0-based, top to bottom)'),
    properties: z.record(z.unknown()).optional().describe('Optional properties to set on the new event'),
  },
  async ({ mapName, kind, x, y, properties }) => {
    const mapData = loadMapJson(mapName)

    const KIND_TO_ARRAY: Record<string, string> = {
      npc: 'object_events', trainer: 'object_events', item: 'object_events',
      warp: 'warp_events', trigger: 'coord_events',
      sign: 'bg_events', hidden: 'bg_events',
    }

    const eventArray = KIND_TO_ARRAY[kind]
    const arr: any[] = (mapData as any)[eventArray] || []

    let newObj: Record<string, unknown>
    if (eventArray === 'object_events') {
      newObj = {
        graphics_id: kind === 'item' ? 'OBJ_EVENT_GFX_ITEM_BALL' : 'OBJ_EVENT_GFX_BOY_1',
        x, y, elevation: 3,
        movement_type: kind === 'item' ? 'MOVEMENT_TYPE_NONE' : 'MOVEMENT_TYPE_FACE_DOWN',
        movement_range_x: 0, movement_range_y: 0,
        trainer_type: kind === 'trainer' ? 'TRAINER_TYPE_NORMAL' : 'TRAINER_TYPE_NONE',
        trainer_sight_or_berry_tree_id: kind === 'trainer' ? '3' : '0',
        script: 'NULL', flag: '0',
      }
    } else if (eventArray === 'warp_events') {
      newObj = { x, y, elevation: 0, dest_map: 'MAP_NONE', dest_warp_id: '0' }
    } else if (eventArray === 'coord_events') {
      newObj = {
        type: 'trigger', x, y, elevation: 3,
        var: 'VAR_TEMP_1', var_value: '0', script: 'NULL',
      }
    } else {
      newObj = kind === 'hidden'
        ? { type: 'hidden_item', x, y, elevation: 0, item: 'ITEM_POTION', flag: 'FLAG_TEMP_1' }
        : { type: 'sign', x, y, elevation: 0, player_facing_dir: 'BG_EVENT_PLAYER_FACING_ANY', script: 'NULL' }
    }

    if (properties) Object.assign(newObj, properties)

    arr.push(newObj)
    ;(mapData as any)[eventArray] = arr
    saveMapJson(mapName, mapData)

    const index = arr.length - 1
    return {
      content: [{
        type: 'text' as const,
        text: `Placed ${kind} at (${x},${y}) as ${eventArray}[${index}].\n${JSON.stringify(newObj, null, 2)}`,
      }],
    }
  },
)

/* ------------------------------------------------------------------ */
/*  edit_event                                                        */
/* ------------------------------------------------------------------ */
server.tool(
  'edit_event',
  'Edit properties of an existing event on the map. Use this to change script, flag, graphics, movement, coordinates, or any other property.',
  {
    mapName: z.string().describe('Map folder name'),
    eventArray: z.enum(['object_events', 'warp_events', 'coord_events', 'bg_events']).describe('Which event array'),
    eventIndex: z.number().int().min(0).describe('Index within the event array'),
    properties: z.record(z.unknown()).describe('Properties to set (merged with existing)'),
  },
  async ({ mapName, eventArray, eventIndex, properties }) => {
    const mapData = loadMapJson(mapName)
    const arr: any[] = (mapData as any)[eventArray]
    if (!arr || eventIndex < 0 || eventIndex >= arr.length) {
      return { content: [{ type: 'text' as const, text: `Error: ${eventArray}[${eventIndex}] does not exist.` }], isError: true }
    }

    const before = { ...arr[eventIndex] }
    Object.assign(arr[eventIndex], properties)
    saveMapJson(mapName, mapData)

    const changes = Object.keys(properties)
      .map((k) => `  ${k}: ${JSON.stringify(before[k])} → ${JSON.stringify(arr[eventIndex][k])}`)
      .join('\n')

    return {
      content: [{
        type: 'text' as const,
        text: `Updated ${eventArray}[${eventIndex}]:\n${changes}`,
      }],
    }
  },
)

/* ------------------------------------------------------------------ */
/*  delete_event                                                      */
/* ------------------------------------------------------------------ */
server.tool(
  'delete_event',
  'Delete an event from the map',
  {
    mapName: z.string().describe('Map folder name'),
    eventArray: z.enum(['object_events', 'warp_events', 'coord_events', 'bg_events']).describe('Which event array'),
    eventIndex: z.number().int().min(0).describe('Index within the event array'),
  },
  async ({ mapName, eventArray, eventIndex }) => {
    const mapData = loadMapJson(mapName)
    const arr: any[] = (mapData as any)[eventArray]
    if (!arr || eventIndex < 0 || eventIndex >= arr.length) {
      return { content: [{ type: 'text' as const, text: `Error: ${eventArray}[${eventIndex}] does not exist.` }], isError: true }
    }

    const removed = arr.splice(eventIndex, 1)[0]
    saveMapJson(mapName, mapData)

    return {
      content: [{
        type: 'text' as const,
        text: `Deleted ${eventArray}[${eventIndex}].\nRemoved: ${JSON.stringify(removed, null, 2)}`,
      }],
    }
  },
)

/* ------------------------------------------------------------------ */
/*  get_scripts                                                       */
/* ------------------------------------------------------------------ */
server.tool(
  'get_scripts',
  'Read the current script file for a map, returning labels and assembly code',
  { mapName: z.string().describe('Map folder name') },
  async ({ mapName }) => {
    const root = getProjectRoot()
    const incPath = join(root, 'data', 'maps', mapName, 'scripts.inc')
    try {
      const code = readFileSync(incPath, 'utf-8')
      /* Extract labels */
      const labels = [...code.matchAll(/^(\w+):{1,2}\s*$/gm)].map((m) => m[1])
      return { content: [{ type: 'text' as const, text: JSON.stringify({ mapName, labels, code }, null, 2) }] }
    } catch {
      return { content: [{ type: 'text' as const, text: JSON.stringify({ mapName, labels: [], code: '' }) }] }
    }
  },
)

/* ------------------------------------------------------------------ */
/*  create_script                                                     */
/* ------------------------------------------------------------------ */
server.tool(
  'create_script',
  `Create or replace a script for a map using node-graph definitions.

Each node has a "type" matching the node registry and fields for that type.
Available node types and their fields:
- label: { labelName }
- end: {}
- return: {}
- call: { target }
- msgbox: { text, msgType: "MSGBOX_DEFAULT"|"MSGBOX_NPC"|"MSGBOX_YESNO"|"MSGBOX_SIGN" }
- branch_flag: { flag } — outputs: flow_true (SET), flow_false (UNSET)
- branch_var: { var, comparison: "=="|"!="|">"|"<"|">="|"<=", value } — outputs: flow_true, flow_false
- branch_yesno: {} — outputs: flow_yes, flow_no
- set_flag: { flag, action: "set"|"clear" }
- set_var: { var, value }
- give_item: { item, quantity }
- give_mon: { species, level, item } — outputs: flow_party, flow_pc, flow_full
- lock_release: { action: "lock"|"release", scope: "single"|"all" }
- faceplayer: {}
- apply_movement: { objectId, movementLabel }
- trainer_battle: { battleType: "single"|"double", trainer, introText, loseText }
- wild_battle: { species, level, item }
- play_sound: { soundType: "se"|"fanfare"|"bgm", soundId }
- warp: { warpType: "warp"|"warpsilent"|"warpdoor"|"warphole", map, x, y }
- delay: { frames }
- special: { func }
- raw_macro: { code }

If edges are omitted, nodes are connected linearly (each node's flow_out → next node's flow_in).
For branching, provide explicit edges with sourceHandle (e.g. "flow_true", "flow_false").`,
  {
    mapName: z.string().describe('Map folder name'),
    label: z.string().describe('Script entry point label, e.g. "Route101_EventScript_MewtwoTrap"'),
    nodes: z.array(z.object({
      id: z.string().optional().describe('Node ID (auto-generated if omitted)'),
      type: z.string().describe('Node type from the registry'),
    }).passthrough()).describe('Ordered list of script nodes'),
    edges: z.array(z.object({
      from: z.string().describe('Source node ID'),
      to: z.string().describe('Target node ID'),
      sourceHandle: z.string().optional().describe('Source output pin (e.g. "flow_true"). Defaults to "flow_out"'),
    })).optional().describe('Explicit edges. If omitted, nodes connect linearly.'),
    attachTo: z.object({
      eventArray: z.enum(['object_events', 'warp_events', 'coord_events', 'bg_events']).describe('Which event array'),
      eventIndex: z.number().int().min(0).describe('Index within the event array'),
    }).optional().describe('Auto-wire: set this event\'s script field to the new label'),
  },
  async ({ mapName, label, nodes: inputNodes, edges: inputEdges, attachTo }) => {
    const root = getProjectRoot()
    const mapDir = join(root, 'data', 'maps', mapName)
    const incPath = join(mapDir, 'scripts.inc')
    const graphPath = join(mapDir, 'scripts.graph.json')

    /* Assign IDs to nodes that don't have them */
    let idCounter = 1
    const nodesWithIds = inputNodes.map((n, i) => ({
      ...n,
      id: n.id || `n${idCounter++}`,
      _index: i,
    }))

    /* Build the label node (always first) */
    const graphNodes: any[] = [{
      id: '__label__',
      type: 'script',
      position: { x: 0, y: 0 },
      data: { schemaType: 'label', labelName: label },
    }]

    /* Build graph nodes from input */
    for (const n of nodesWithIds) {
      const schema = NODE_SCHEMAS[n.type]
      if (!schema) {
        return {
          content: [{ type: 'text' as const, text: `Error: Unknown node type "${n.type}". Available types: ${Object.keys(NODE_SCHEMAS).join(', ')}` }],
          isError: true,
        }
      }

      const data: Record<string, unknown> = { schemaType: n.type }
      /* Copy schema defaults, then override with provided fields */
      for (const [k, v] of Object.entries(schema.defaults)) {
        data[k] = v
      }
      for (const [k, v] of Object.entries(n)) {
        if (k === 'id' || k === 'type' || k === '_index') continue
        data[k] = v
      }

      graphNodes.push({
        id: n.id,
        type: 'script',
        position: { x: 0, y: 0 },
        data,
      })
    }

    /* Build edges */
    const graphEdges: any[] = []
    let edgeId = 1

    if (inputEdges && inputEdges.length > 0) {
      /* Connect label → first node */
      if (nodesWithIds.length > 0) {
        graphEdges.push({
          id: `e${edgeId++}`,
          source: '__label__',
          sourceHandle: 'flow_out',
          target: nodesWithIds[0].id,
          targetHandle: 'flow_in',
        })
      }
      /* Add explicit edges */
      for (const e of inputEdges) {
        graphEdges.push({
          id: `e${edgeId++}`,
          source: e.from,
          sourceHandle: e.sourceHandle || 'flow_out',
          target: e.to,
          targetHandle: 'flow_in',
        })
      }
    } else {
      /* Linear chain: label → n1 → n2 → ... → nN */
      let prevId = '__label__'
      for (const n of nodesWithIds) {
        /* Only connect if previous node has an output */
        const prevSchema = prevId === '__label__' ? NODE_SCHEMAS['label'] : NODE_SCHEMAS[nodesWithIds.find((x) => x.id === prevId)?.type || '']
        if (prevSchema && prevSchema.outputs.length > 0) {
          graphEdges.push({
            id: `e${edgeId++}`,
            source: prevId,
            sourceHandle: prevSchema.outputs[0].id,
            target: n.id,
            targetHandle: 'flow_in',
          })
        }
        prevId = n.id
      }
    }

    /* Auto-layout for visual graph */
    const laidOut = autoLayout(graphNodes, graphEdges)

    /* Read existing .inc for merge */
    let existingInc = ''
    try { existingInc = readFileSync(incPath, 'utf-8') } catch { /* new file */ }

    /* Generate assembly */
    const { code, replaced, warnings } = generateScript(laidOut, graphEdges, mapName, existingInc)

    /* Save files */
    mkdirSync(mapDir, { recursive: true })
    writeFileSync(incPath, code)

    /* Load existing graph and merge, or create new */
    let existingGraph: { nodes: any[]; edges: any[] } = { nodes: [], edges: [] }
    try {
      existingGraph = JSON.parse(readFileSync(graphPath, 'utf-8'))
    } catch { /* new file */ }

    /* Remove old nodes/edges for this label, add new ones */
    const newLabelIds = new Set(laidOut.map((n: any) => n.id))
    const mergedNodes = [
      ...existingGraph.nodes.filter((n: any) => !newLabelIds.has(n.id)),
      ...laidOut,
    ]
    const mergedEdges = [
      ...existingGraph.edges.filter((e: any) => !newLabelIds.has(e.source) && !newLabelIds.has(e.target)),
      ...graphEdges,
    ]
    writeFileSync(graphPath, JSON.stringify({ nodes: mergedNodes, edges: mergedEdges }, null, 2))

    /* Auto-wire: update the map event's script field to point to this label */
    let attachMsg: string | null = null
    if (attachTo) {
      const mapData = loadMapJson(mapName)
      const arr: any[] = (mapData as any)[attachTo.eventArray]
      if (arr && attachTo.eventIndex >= 0 && attachTo.eventIndex < arr.length) {
        const before = arr[attachTo.eventIndex].script
        arr[attachTo.eventIndex].script = label
        saveMapJson(mapName, mapData)
        attachMsg = `Wired ${attachTo.eventArray}[${attachTo.eventIndex}].script: ${before} → ${label}`
      } else {
        attachMsg = `Warning: ${attachTo.eventArray}[${attachTo.eventIndex}] does not exist, script not wired`
      }
    }

    const summary = [
      `Created script "${label}" in ${mapName}/scripts.inc`,
      `Nodes: ${nodesWithIds.length} + label`,
      replaced.length > 0 ? `Replaced sections: ${replaced.join(', ')}` : null,
      warnings.length > 0 ? `Warnings: ${warnings.join('; ')}` : null,
      attachMsg,
    ].filter(Boolean).join('\n')

    return { content: [{ type: 'text' as const, text: summary }] }
  },
)

/* ------------------------------------------------------------------ */
/*  delete_script                                                     */
/* ------------------------------------------------------------------ */
server.tool(
  'delete_script',
  'Delete a script label and its section from the map scripts file',
  {
    mapName: z.string().describe('Map folder name'),
    label: z.string().describe('Script label to delete'),
  },
  async ({ mapName, label }) => {
    const root = getProjectRoot()
    const incPath = join(root, 'data', 'maps', mapName, 'scripts.inc')

    let code: string
    try { code = readFileSync(incPath, 'utf-8') } catch {
      return { content: [{ type: 'text' as const, text: `Error: No scripts.inc found for ${mapName}` }], isError: true }
    }

    /* Find and remove the section for this label */
    const lines = code.split('\n')
    const newLines: string[] = []
    let skipping = false

    for (const line of lines) {
      const labelMatch = line.match(/^(\w+):{1,2}\s*$/)
      if (labelMatch) {
        if (labelMatch[1] === label) {
          skipping = true
          continue
        } else {
          skipping = false
        }
      }
      if (!skipping) {
        newLines.push(line)
      }
    }

    /* Also remove associated text labels (MapName_Text_*) that were part of this script */
    const finalCode = newLines.join('\n')
    writeFileSync(incPath, finalCode)

    /* Remove from graph.json too */
    const graphPath = join(root, 'data', 'maps', mapName, 'scripts.graph.json')
    try {
      const graph = JSON.parse(readFileSync(graphPath, 'utf-8'))
      /* Find the label node ID */
      const labelNodeId = graph.nodes.find((n: any) =>
        n.data?.schemaType === 'label' && n.data?.labelName === label,
      )?.id
      if (labelNodeId) {
        /* BFS to find all connected nodes */
        const connected = new Set<string>([labelNodeId])
        let changed = true
        while (changed) {
          changed = false
          for (const e of graph.edges) {
            if (connected.has(e.source) && !connected.has(e.target)) {
              connected.add(e.target)
              changed = true
            }
          }
        }
        graph.nodes = graph.nodes.filter((n: any) => !connected.has(n.id))
        graph.edges = graph.edges.filter((e: any) => !connected.has(e.source) && !connected.has(e.target))
        writeFileSync(graphPath, JSON.stringify(graph, null, 2))
      }
    } catch { /* no graph file */ }

    return { content: [{ type: 'text' as const, text: `Deleted script "${label}" from ${mapName}/scripts.inc` }] }
  },
)

/* ------------------------------------------------------------------ */
/*  list_story_docs                                                   */
/* ------------------------------------------------------------------ */
server.tool(
  'list_story_docs',
  'List all available story documents (lore bible, act scripts, location guides)',
  async () => {
    const root = getProjectRoot()
    const storyDir = join(root, 'story')

    const topLevel = readdirSync(storyDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace('.md', ''))

    const mapDocs = readdirSync(join(storyDir, 'maps'))
      .filter((f) => f.endsWith('.md'))
      .map((f) => `maps/${f.replace('.md', '')}`)

    const docs = [...topLevel, ...mapDocs]
    return { content: [{ type: 'text' as const, text: docs.join('\n') }] }
  },
)

/* ------------------------------------------------------------------ */
/*  get_story_doc                                                     */
/* ------------------------------------------------------------------ */
server.tool(
  'get_story_doc',
  'Read a story document by name. Use list_story_docs first to see available docs. Returns the full markdown content.',
  { name: z.string().describe('Document name from list_story_docs, e.g. "STORY" or "maps/01_nulltown"') },
  async ({ name }) => {
    const root = getProjectRoot()
    const filePath = join(root, 'story', `${name}.md`)
    try {
      const content = readFileSync(filePath, 'utf-8')
      return { content: [{ type: 'text' as const, text: content }] }
    } catch {
      return { content: [{ type: 'text' as const, text: `Error: Story doc "${name}" not found.` }], isError: true }
    }
  },
)

/* ------------------------------------------------------------------ */
/*  Start                                                             */
/* ------------------------------------------------------------------ */
const transport = new StdioServerTransport()
await server.connect(transport)
