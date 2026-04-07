import type { Plugin } from 'vite'
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'

const MODEL = 'haiku'

/** SSE event types sent to the client */
export type SSEEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; name: string; result: string }
  | { type: 'error'; message: string }
  | { type: 'done' }

const MCP_SERVER_PATH = join(dirname(new URL(import.meta.url).pathname), '..', 'mcp', 'server.ts')
const MAP_BUILDER_ROOT = join(dirname(new URL(import.meta.url).pathname), '..', '..')

const SYSTEM_PROMPT = `You are an AI assistant embedded in a Pokemon ROM hack map editor (Pokemon Unreasonable Edition, based on pokeemerald).

You help the user understand and plan changes to their maps. You have MCP tools to inspect and modify map data — use them instead of writing files directly.

## Coordinate system
- Origin (0,0) is top-left. X increases rightward, Y increases downward.
- Each cell is one 16x16 metatile.

## Event types
- npc: Regular NPC (object_events)
- trainer: Trainer NPC with sight range (object_events)
- item: Item ball on ground (object_events)
- warp: Warp pad/door (warp_events)
- trigger: Script trigger zone (coord_events)
- sign: Signpost (bg_events)
- hidden: Hidden item (bg_events)

## Workflow
1. Use get_map_info to inspect the current map state
2. Use place_event, edit_event, or delete_event to make changes
3. Use get_scripts to read existing scripts, create_script to build new ones
4. Always explain what you are doing and why

## Script building
Use create_script to build event scripts. Provide nodes in execution order.
For simple linear scripts, omit edges — nodes connect automatically.
For branching, provide explicit edges with sourceHandle (e.g. "flow_true", "flow_false").

IMPORTANT: Always use typed nodes — NEVER use raw_macro for things that have a dedicated node type.
Use lock_release for lock/lockall/release/releaseall, wild_battle for setwildbattle+dowildbattle,
trainer_battle for trainerbattle, msgbox for messages, set_flag/set_var for state, etc.
The raw_macro node is ONLY for obscure commands with no dedicated node (e.g. waitstate, special2).

Common patterns:
- NPC dialogue: lock_release(lock,all) → faceplayer → msgbox → lock_release(release,all) → end
- Wild battle trap: lock_release(lock,all) → msgbox → wild_battle(species,level) → lock_release(release,all) → end
- Item giver with flag check: lock_release(lock,all) → faceplayer → branch_flag → [give path] / [already given path]
- Trainer battle: trainer_battle node handles lock/face automatically

Use attachTo in create_script to auto-wire the event's script field to the new label. This saves a separate edit_event call.

## Story & lore
You have access to story documents via list_story_docs and get_story_doc tools.
Use them to look up lore, character details, location backstory, and act scripts when writing NPC dialogue or planning map events.
Key lore: Pokemon Unreasonable Edition — dark comedy ROM hack. Absurdia runs on Resonance Energy (emotional bonds as electricity). Bureau profits from grief. Nuzlocke is canon. Deadpan delivery, NPCs are never in on the joke.

Be concise and helpful.`

function writeMcpConfig(): string {
  const configPath = join(MAP_BUILDER_ROOT, '.mcp-chat-config.json')
  const config = {
    mcpServers: {
      'map-builder': {
        command: 'bun',
        args: ['run', MCP_SERVER_PATH],
        cwd: MAP_BUILDER_ROOT,
      },
    },
  }
  writeFileSync(configPath, JSON.stringify(config, null, 2))
  return configPath
}

export function aiChatPlugin(): Plugin {
  let mcpConfigPath: string

  return {
    name: 'ai-chat-sse',
    apply: 'serve',

    configureServer(server) {
      mcpConfigPath = writeMcpConfig()

      server.middlewares.use('/api/chat', (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405)
          res.end()
          return
        }

        let body = ''
        req.on('data', (chunk: Buffer) => { body += chunk.toString() })
        req.on('end', () => {
          let parsed: { mapName: string; history: Array<{ role: string; content: string }>; userMessage: string }
          try {
            parsed = JSON.parse(body)
          } catch {
            res.writeHead(400)
            res.end('Invalid JSON')
            return
          }

          const { mapName, history, userMessage } = parsed

          /* Set up SSE headers */
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          })

          const send = (event: SSEEvent) => {
            res.write(`data: ${JSON.stringify(event)}\n\n`)
          }

          /* Build the prompt with conversation history */
          let prompt = `The user is currently viewing map: ${mapName}\n\n`
          for (const msg of (history || [])) {
            prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`
          }
          prompt += `User: ${userMessage}`

          /* Spawn claude with MCP tools */
          const args = [
            '-p',
            '--output-format', 'stream-json',
            '--verbose',
            '--model', MODEL,
            '--tools', '',
            '--permission-mode', 'bypassPermissions',
            '--system-prompt', SYSTEM_PROMPT,
            '--mcp-config', mcpConfigPath,
            '--max-turns', '10',
            '--no-session-persistence',
          ]

          const child = spawn('claude', args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env },
          })

          child.stdin.write(prompt)
          child.stdin.end()

          let buffer = ''
          /* Track tool_use IDs to their names for matching results */
          const toolUseNames = new Map<string, string>()
          let didMutate = false

          child.stdout.on('data', (data: Buffer) => {
            buffer += data.toString()
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (!line.trim()) continue
              try {
                const msg = JSON.parse(line)

                if (msg.type === 'assistant' && msg.message?.content) {
                  for (const block of msg.message.content) {
                    if (block.type === 'text' && block.text) {
                      send({ type: 'text', text: block.text })
                    } else if (block.type === 'tool_use' && block.name) {
                      const cleanName = block.name.replace(/^mcp__[^_]+__/, '')
                      toolUseNames.set(block.id, cleanName)
                      send({ type: 'tool_use', name: cleanName, input: block.input || {} })
                      if (['place_event', 'edit_event', 'delete_event', 'create_script', 'delete_script', 'edit_layout', 'edit_map_properties', 'paint_metatiles'].includes(cleanName)) {
                        didMutate = true
                      }
                    } else if (block.type === 'tool_result') {
                      const name = toolUseNames.get(block.tool_use_id) || 'unknown'
                      const text = Array.isArray(block.content)
                        ? block.content.map((c: any) => c.text || '').join('')
                        : String(block.content || '')
                      send({ type: 'tool_result', name, result: text })
                    }
                  }
                } else if (msg.type === 'error' || msg.is_error) {
                  send({ type: 'error', message: msg.result || msg.error || 'Unknown error' })
                }
              } catch { /* skip unparseable lines */ }
            }
          })

          child.stderr.on('data', (data: Buffer) => {
            const errText = data.toString().trim()
            if (errText) send({ type: 'error', message: errText })
          })

          child.on('close', () => {
            send({ type: 'done', didMutate } as any)
            res.end()
          })

          child.on('error', (err) => {
            send({ type: 'error', message: `Failed to spawn claude: ${err.message}` })
            send({ type: 'done' })
            res.end()
          })

          /* Clean up if client disconnects */
          res.on('close', () => {
            if (!child.killed) child.kill()
          })
        })
      })
    },
  }
}
