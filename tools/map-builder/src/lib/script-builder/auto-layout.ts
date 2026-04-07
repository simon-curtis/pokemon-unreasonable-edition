import dagre from '@dagrejs/dagre'

const NODE_W = 260
const NODE_H = 100

export function autoLayout(nodes: any[], edges: any[]): any[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 50 })

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_W, height: NODE_H })
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target)
  }

  dagre.layout(g)

  const laid = nodes.map((n) => {
    const pos = g.node(n.id)
    return { ...n, position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 } }
  })

  return fixBranchSides(laid, edges)
}

/* ── Post-process: ensure true/SET branch is always above false/UNSET (LR layout) ── */

const TRUE_HANDLES = new Set(['flow_true', 'flow_yes'])
const FALSE_HANDLES = new Set(['flow_false', 'flow_no'])
const BRANCH_TYPES = new Set(['branch_flag', 'branch_var', 'branch_yesno'])

function fixBranchSides(nodes: any[], edges: any[]): any[] {
  /* mutable copy */
  const pos = new Map(nodes.map((n) => [n.id, { ...n.position }]))

  const outEdges = new Map<string, any[]>()
  for (const e of edges) {
    const arr = outEdges.get(e.source) ?? []
    arr.push(e)
    outEdges.set(e.source, arr)
  }

  /* process branches left-to-right so parent swaps don't confuse children */
  const branches = nodes
    .filter((n) => BRANCH_TYPES.has(n.data?.schemaType))
    .sort((a, b) => (pos.get(a.id)?.x ?? 0) - (pos.get(b.id)?.x ?? 0))

  for (const bn of branches) {
    const outs = outEdges.get(bn.id) ?? []
    const trueEdge = outs.find((e) => TRUE_HANDLES.has(e.sourceHandle))
    const falseEdge = outs.find((e) => FALSE_HANDLES.has(e.sourceHandle))
    if (!trueEdge || !falseEdge) continue

    const trueY = pos.get(trueEdge.target)?.y ?? 0
    const falseY = pos.get(falseEdge.target)?.y ?? 0
    if (trueY <= falseY) continue /* already correct — true above false */

    /* collect nodes exclusively reachable from each branch */
    const trueIds = subtree(trueEdge.target, outEdges, new Set([bn.id]))
    const falseIds = subtree(falseEdge.target, outEdges, new Set([bn.id]))

    /* swap y positions of each subtree around their shared midpoint */
    const mid = (centerAxis(trueIds, pos, 'y') + centerAxis(falseIds, pos, 'y')) / 2
    for (const id of trueIds) {
      const p = pos.get(id)!
      pos.set(id, { ...p, y: 2 * mid - p.y })
    }
    for (const id of falseIds) {
      const p = pos.get(id)!
      pos.set(id, { ...p, y: 2 * mid - p.y })
    }
  }

  return nodes.map((n) => ({ ...n, position: pos.get(n.id)! }))
}

function subtree(startId: string, outEdges: Map<string, any[]>, stop: Set<string>): Set<string> {
  const visited = new Set<string>()
  const queue = [startId]
  while (queue.length) {
    const id = queue.shift()!
    if (visited.has(id) || stop.has(id)) continue
    visited.add(id)
    for (const e of outEdges.get(id) ?? []) queue.push(e.target)
  }
  return visited
}

function centerAxis(ids: Set<string>, pos: Map<string, { x: number; y: number }>, axis: 'x' | 'y'): number {
  let sum = 0
  for (const id of ids) sum += pos.get(id)?.[axis] ?? 0
  return ids.size ? sum / ids.size : 0
}
