import type { ScriptNode, ScriptEdge } from './types'

/* ── Map-level script entries ── */

export interface MapScriptEntry {
  type: string        /* MAP_SCRIPT_ON_TRANSITION, MAP_SCRIPT_ON_FRAME_TABLE, etc. */
  label: string       /* target script label */
}

export interface OnFrameEntry {
  var: string          /* VAR_NULLTOWN_STATE */
  value: string        /* 2 */
  label: string        /* Nulltown_EventScript_Screamer */
}

export interface MapScriptInfo {
  scripts: MapScriptEntry[]
  onFrameEntries: OnFrameEntry[]
}

export function parseMapScripts(code: string): MapScriptInfo {
  const sections = splitSections(code)
  const result: MapScriptInfo = { scripts: [], onFrameEntries: [] }

  /* find the _MapScripts section */
  const mapScriptsSec = sections.find((s) => s.name.endsWith('_MapScripts'))
  if (!mapScriptsSec) return result

  for (const line of mapScriptsSec.lines) {
    const trimmed = line.trim()
    const m = trimmed.match(/^map_script\s+(\w+),\s*(\w+)/)
    if (m) result.scripts.push({ type: m[1], label: m[2] })
  }

  /* find on-frame table entries */
  for (const sec of sections) {
    if (!sec.name.endsWith('_OnFrame')) continue
    for (const line of sec.lines) {
      const m = line.trim().match(/^map_script_2\s+(\w+),\s*(\w+),\s*(\w+)/)
      if (m) result.onFrameEntries.push({ var: m[1], value: m[2], label: m[3] })
    }
  }

  return result
}

/* ── Public API ── */

export function parseIncToGraph(
  code: string,
  _mapName: string,
): { nodes: ScriptNode[]; edges: ScriptEdge[] } {
  const sections = splitSections(code)

  /* collect text data labels (single-colon, contain .string) */
  const textData = new Map<string, string>()
  /* collect movement data labels — referenced by applymovement */
  const scriptSections: Array<{ name: string; lines: string[] }> = []

  for (const sec of sections) {
    if (isTextSection(sec.lines)) {
      textData.set(sec.name, extractText(sec.lines))
    } else if (isSystemSection(sec.name)) {
      /* skip _MapScripts dispatch table */
    } else if (sec.isDouble || isScriptSection(sec.lines)) {
      scriptSections.push({ name: sec.name, lines: sec.lines })
    }
  }

  let idCounter = 1
  const newId = () => `node-${idCounter++}`

  /* first pass: create label node for every script section */
  const labelNodeId = new Map<string, string>()
  const nodes: ScriptNode[] = []
  const edges: ScriptEdge[] = []

  for (const sec of scriptSections) {
    const id = newId()
    labelNodeId.set(sec.name, id)
    nodes.push(makeNode(id, 'label', { labelName: sec.name }, { x: 0, y: 0 }))
  }

  /* second pass: parse instructions for each section */
  const COL_W = 300
  const ROW_H = 110

  scriptSections.forEach((sec, colIdx) => {
    const labelId = labelNodeId.get(sec.name)!
    /* position label node */
    const labelNode = nodes.find((n) => n.id === labelId)!
    labelNode.position = { x: colIdx * COL_W, y: 0 }

    const insts = parseInstructions(sec.lines)
    let prevId = labelId
    let prevHandle = 'flow_out'
    let row = 1

    const addNode = (node: ScriptNode) => {
      node.position = { x: colIdx * COL_W, y: row++ * ROW_H }
      nodes.push(node)
      if (prevId) {
        edges.push(makeEdge(prevId, prevHandle, node.id, 'flow_in'))
      }
      prevId = node.id
      prevHandle = 'flow_out'
    }

    const addEdgeTo = (targetName: string, fromId: string, fromHandle: string) => {
      const targetId = labelNodeId.get(targetName)
      if (targetId) {
        edges.push(makeEdge(fromId, fromHandle, targetId, 'flow_in'))
      }
    }

    let i = 0
    while (i < insts.length) {
      const { macro, args } = insts[i]

      /* skip data directives */
      if (macro.startsWith('.') || macro === 'map_script' || macro === 'map_script_2') {
        i++
        continue
      }

      switch (macro) {
        case 'end': {
          addNode(makeNode(newId(), 'end', {}))
          prevId = ''
          break
        }

        case 'return': {
          addNode(makeNode(newId(), 'return', {}))
          prevId = ''
          break
        }

        case 'lock':
          addNode(makeNode(newId(), 'lock_release', { action: 'lock', scope: 'single' }))
          break

        case 'lockall':
          addNode(makeNode(newId(), 'lock_release', { action: 'lock', scope: 'all' }))
          break

        case 'release':
          addNode(makeNode(newId(), 'lock_release', { action: 'release', scope: 'single' }))
          break

        case 'releaseall':
          addNode(makeNode(newId(), 'lock_release', { action: 'release', scope: 'all' }))
          break

        case 'faceplayer':
          addNode(makeNode(newId(), 'faceplayer', {}))
          break

        case 'msgbox': {
          const textLabel = args[0]
          const msgType = args[1] || 'MSGBOX_DEFAULT'
          const text = textData.get(textLabel) ?? textLabel
          addNode(makeNode(newId(), 'msgbox', { text, msgType }))
          break
        }

        case 'setflag':
          addNode(makeNode(newId(), 'set_flag', { flag: args[0], action: 'set' }))
          break

        case 'clearflag':
          addNode(makeNode(newId(), 'set_flag', { flag: args[0], action: 'clear' }))
          break

        case 'setvar':
          addNode(makeNode(newId(), 'set_var', { var: args[0], value: args[1] || '0' }))
          break

        case 'goto': {
          /* unconditional jump — connect to target label node and stop chain */
          const targetName = args[0]
          const targetId = labelNodeId.get(targetName)
          if (targetId && prevId) {
            edges.push(makeEdge(prevId, prevHandle, targetId, 'flow_in'))
          } else if (!targetId) {
            addNode(makeNode(newId(), 'raw_macro', { code: `goto ${targetName}` }))
          }
          prevId = ''
          i++
          continue
        }

        case 'goto_if_set': {
          /* goto_if_set FLAG, label — branch_flag, true→label, false→next */
          const flag = args[0]
          const targetName = args[1]
          const n = makeNode(newId(), 'branch_flag', { flag })
          n.position = { x: colIdx * COL_W, y: row++ * ROW_H }
          nodes.push(n)
          if (prevId) edges.push(makeEdge(prevId, prevHandle, n.id, 'flow_in'))
          addEdgeTo(targetName, n.id, 'flow_true')
          prevId = n.id
          prevHandle = 'flow_false'
          i++
          continue
        }

        case 'goto_if_unset': {
          /* goto_if_unset FLAG, label — branch_flag inverted: false→label, true→next */
          const flag = args[0]
          const targetName = args[1]
          const n = makeNode(newId(), 'branch_flag', { flag })
          n.position = { x: colIdx * COL_W, y: row++ * ROW_H }
          nodes.push(n)
          if (prevId) edges.push(makeEdge(prevId, prevHandle, n.id, 'flow_in'))
          addEdgeTo(targetName, n.id, 'flow_false')
          prevId = n.id
          prevHandle = 'flow_true'
          i++
          continue
        }

        case 'goto_if_ge':
        case 'goto_if_gt':
        case 'goto_if_le':
        case 'goto_if_lt':
        case 'goto_if_eq':
        case 'goto_if_ne': {
          if (args.length === 3) {
            /* 3-arg form: goto_if_XX VAR, val, label */
            const cmpMap: Record<string, string> = {
              goto_if_ge: '>=', goto_if_gt: '>', goto_if_le: '<=',
              goto_if_lt: '<', goto_if_eq: '==', goto_if_ne: '!=',
            }
            const n = makeNode(newId(), 'branch_var', {
              var: args[0],
              comparison: cmpMap[macro],
              value: args[1],
            })
            n.position = { x: colIdx * COL_W, y: row++ * ROW_H }
            nodes.push(n)
            if (prevId) edges.push(makeEdge(prevId, prevHandle, n.id, 'flow_in'))
            addEdgeTo(args[2], n.id, 'flow_true')
            prevId = n.id
            prevHandle = 'flow_false'
          } else {
            /* 1-arg form — shouldn't appear in our scripts but handle gracefully */
            addNode(makeNode(newId(), 'raw_macro', { code: `${macro} ${args.join(', ')}` }))
          }
          i++
          continue
        }

        case 'compare': {
          /* compare VAR, val + goto_if_XX label (1-arg form) */
          const next = insts[i + 1]
          if (next && GOTO_IF_MACROS.has(next.macro) && next.args.length === 1) {
            const cmpMap: Record<string, string> = {
              goto_if_ge: '>=', goto_if_gt: '>', goto_if_le: '<=',
              goto_if_lt: '<', goto_if_eq: '==', goto_if_ne: '!=',
            }
            const n = makeNode(newId(), 'branch_var', {
              var: args[0],
              comparison: cmpMap[next.macro] || '==',
              value: args[1],
            })
            n.position = { x: colIdx * COL_W, y: row++ * ROW_H }
            nodes.push(n)
            if (prevId) edges.push(makeEdge(prevId, prevHandle, n.id, 'flow_in'))
            addEdgeTo(next.args[0], n.id, 'flow_true')
            prevId = n.id
            prevHandle = 'flow_false'
            i += 2
            continue
          }
          addNode(makeNode(newId(), 'raw_macro', { code: `compare ${args.join(', ')}` }))
          break
        }

        case 'applymovement': {
          const next = insts[i + 1]
          const waitAfter = next?.macro === 'waitmovement'
          if (waitAfter) i++
          addNode(makeNode(newId(), 'apply_movement', {
            objectId: args[0],
            movementLabel: args[1],
            waitAfter,
          }))
          break
        }

        case 'waitmovement':
          addNode(makeNode(newId(), 'raw_macro', { code: `waitmovement ${args.join(', ')}` }))
          break

        case 'playse':
          addNode(makeNode(newId(), 'play_sound', { soundType: 'se', soundId: args[0] }))
          break

        case 'playfanfare':
          addNode(makeNode(newId(), 'play_sound', { soundType: 'fanfare', soundId: args[0] }))
          break

        case 'playbgm':
          addNode(makeNode(newId(), 'play_sound', { soundType: 'bgm', soundId: args[0] }))
          break

        case 'special':
          addNode(makeNode(newId(), 'special', { func: args[0] }))
          break

        case 'delay':
          addNode(makeNode(newId(), 'delay', { frames: args[0] || '30' }))
          break

        case 'giveitem':
          addNode(makeNode(newId(), 'give_item', { item: args[0], quantity: args[1] || '1' }))
          break

        case 'givemon':
          addNode(makeNode(newId(), 'give_mon', { species: args[0], level: args[1] || '5', item: args[2] || '' }))
          break

        case 'waitstate':
          addNode(makeNode(newId(), 'raw_macro', { code: 'waitstate' }))
          break

        default: {
          const raw = args.length > 0 ? `${macro} ${args.join(', ')}` : macro
          addNode(makeNode(newId(), 'raw_macro', { code: raw }))
          break
        }
      }

      i++
    }
  })

  return { nodes, edges }
}

/* ── Section splitting ── */

interface Section {
  name: string
  isDouble: boolean
  lines: string[]
}

function splitSections(code: string): Section[] {
  const sections: Section[] = []
  let current: Section | null = null

  for (const rawLine of code.split('\n')) {
    const line = rawLine.replace(/\s*@.*$/, '').trimEnd()
    if (!line.trim()) continue

    const doubleMatch = line.match(/^(\w+)::/)
    const singleMatch = !doubleMatch && line.match(/^(\w+):$/)

    if (doubleMatch || singleMatch) {
      if (current) sections.push(current)
      current = {
        name: (doubleMatch ?? singleMatch as RegExpMatchArray)[1],
        isDouble: !!doubleMatch,
        lines: [],
      }
    } else if (current) {
      current.lines.push(line)
    }
  }
  if (current) sections.push(current)
  return sections
}

function isTextSection(lines: string[]): boolean {
  const code = lines.filter((l) => l.trim() && !l.trim().startsWith('@'))
  return code.length > 0 && code.every((l) => l.trim().startsWith('.string'))
}

/* Only skip the dispatch table itself — OnFrame/OnTransition contain real script logic */
function isSystemSection(name: string): boolean {
  return name.endsWith('_MapScripts')
}

/* Single-colon section that contains script macros (not just .string/.byte data) */
const SCRIPT_MACROS = new Set([
  'setflag', 'clearflag', 'setvar', 'addvar', 'subvar', 'lock', 'lockall',
  'release', 'releaseall', 'end', 'return', 'goto', 'goto_if_set', 'goto_if_unset',
  'goto_if_eq', 'goto_if_ne', 'goto_if_ge', 'goto_if_gt', 'goto_if_le', 'goto_if_lt',
  'msgbox', 'faceplayer', 'applymovement', 'waitmovement', 'special', 'compare',
  'playse', 'playfanfare', 'givemon', 'giveitem', 'finditem', 'addobject', 'removeobject',
])

function isScriptSection(lines: string[]): boolean {
  return lines.some((l) => {
    const macro = l.trim().split(/\s/)[0]
    return SCRIPT_MACROS.has(macro)
  })
}

function extractText(lines: string[]): string {
  return lines
    .filter((l) => l.trim().startsWith('.string'))
    .map((l) => {
      const m = l.match(/\.string\s+"(.*?)"/)
      return m ? m[1] : ''
    })
    .join('')
    .replace(/\\n/g, '\n')
    .replace(/\\l/g, '\n')
    .replace(/\\p/g, '\n\n')
    .replace(/\$$/, '')
    .trim()
}

/* ── Instruction parsing ── */

interface Instruction {
  macro: string
  args: string[]
}

function parseInstructions(lines: string[]): Instruction[] {
  const result: Instruction[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('@')) continue
    /* split on first whitespace: macro + rest */
    const spaceIdx = trimmed.search(/\s/)
    if (spaceIdx === -1) {
      result.push({ macro: trimmed, args: [] })
    } else {
      const macro = trimmed.slice(0, spaceIdx)
      const rest = trimmed.slice(spaceIdx).trim()
      const args = rest.split(',').map((a) => a.trim()).filter(Boolean)
      result.push({ macro, args })
    }
  }
  return result
}

const GOTO_IF_MACROS = new Set([
  'goto_if_ge', 'goto_if_gt', 'goto_if_le', 'goto_if_lt', 'goto_if_eq', 'goto_if_ne',
])

/* ── Node / edge factories ── */

function makeNode(
  id: string,
  schemaType: string,
  data: Record<string, unknown>,
  position = { x: 0, y: 0 },
): ScriptNode {
  return {
    id,
    type: 'script',
    position,
    data: { schemaType, ...data },
  }
}

function makeEdge(
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string,
): ScriptEdge {
  return {
    id: `e-${source}-${sourceHandle}-${target}`,
    source,
    sourceHandle,
    target,
    targetHandle,
  }
}
