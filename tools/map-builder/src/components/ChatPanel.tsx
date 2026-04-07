import { useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAtomValue, useSetAtom } from 'jotai/react'
import { rightPanelAtom, rightPanelWidthAtom, setRightPanelWidthAtom, selectedObjectAtom } from '#/atoms/viewer'
import {
  messagesAtom,
  isStreamingAtom,
  errorAtom,
  attachedContextAtom,
  conversationsAtom,
  activeConversationIdAtom,
  addUserMessageAtom,
  startAssistantMessageAtom,
  appendAssistantChunkAtom,
  addToolCallAtom,
  setToolResultAtom,
  finishAssistantMessageAtom,
  setErrorAtom,
  clearChatAtom,
  removeContextAtom,
  clearContextAtom,
  attachContextAtom,
  newChatAtom,
  switchChatAtom,
  deleteChatAtom,
} from '#/atoms/chat'
import type { ChatMessage, ContentBlock } from '#/atoms/chat'
import { appStore } from '#/atoms/store'
import type { SSEEvent } from '#/lib/ai-chat-plugin'
import { metadataQueryOptions } from '#/lib/queries'
import ResizablePanel from './ResizablePanel'
import { HudButton } from '#/ui/components/HudButton'
import { IconSend, IconTrash, IconTool, IconLoader2, IconX, IconPlus, IconHistory, IconMessage } from '@tabler/icons-react'
import Markdown from 'react-markdown'

const TOOL_LABELS: Record<string, string> = {
  get_map_info: 'Inspecting map',
  list_maps: 'Listing maps',
  list_events: 'Listing events',
  place_event: 'Placing event',
  edit_event: 'Editing event',
  delete_event: 'Deleting event',
  get_scripts: 'Reading scripts',
  create_script: 'Building script',
  delete_script: 'Deleting script',
  edit_layout: 'Editing layout',
  paint_metatiles: 'Painting tiles',
  edit_map_properties: 'Editing map properties',
  list_tilesets: 'Listing tilesets',
  get_tileset_info: 'Inspecting tileset',
  list_story_docs: 'Listing story docs',
  get_story_doc: 'Reading story doc',
}

/** Strip MCP server prefix from tool names, e.g. mcp__map-builder__get_map_info → get_map_info */
function cleanToolName(name: string): string {
  const match = name.match(/^mcp__[^_]+__(.+)$/)
  return match ? match[1] : name
}

function toolLabel(name: string): string {
  const clean = cleanToolName(name)
  return TOOL_LABELS[clean] || clean
}

export default function ChatPanel({ mapName }: { mapName: string }) {
  const rightPanel = useAtomValue(rightPanelAtom)
  const rightPanelWidth = useAtomValue(rightPanelWidthAtom)
  const setRightPanelWidth = useSetAtom(setRightPanelWidthAtom)

  const messages = useAtomValue(messagesAtom)
  const isStreaming = useAtomValue(isStreamingAtom)
  const error = useAtomValue(errorAtom)
  const addUserMessage = useSetAtom(addUserMessageAtom)
  const startAssistantMessage = useSetAtom(startAssistantMessageAtom)
  const appendAssistantChunk = useSetAtom(appendAssistantChunkAtom)
  const addToolCall = useSetAtom(addToolCallAtom)
  const setToolResult = useSetAtom(setToolResultAtom)
  const finishAssistantMessage = useSetAtom(finishAssistantMessageAtom)
  const setError = useSetAtom(setErrorAtom)
  const clearChat = useSetAtom(clearChatAtom)
  const attachedContext = useAtomValue(attachedContextAtom)
  const removeContext = useSetAtom(removeContextAtom)
  const clearContext = useSetAtom(clearContextAtom)
  const conversations = useAtomValue(conversationsAtom)
  const activeConversationId = useAtomValue(activeConversationIdAtom)
  const newChat = useSetAtom(newChatAtom)
  const switchChat = useSetAtom(switchChatAtom)
  const deleteChat = useSetAtom(deleteChatAtom)

  const [showHistory, setShowHistory] = useState(false)

  const queryClient = useQueryClient()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const selectedObject = useAtomValue(selectedObjectAtom)
  const attachContext = useSetAtom(attachContextAtom)
  const { data: metadata } = useQuery(metadataQueryOptions(mapName))

  /* Resolve selected object to a suggestion chip */
  const suggestion = useMemo(() => {
    if (!selectedObject || !metadata?.objects) return null
    const obj = metadata.objects.find(
      (o: any) => o.eventArray === selectedObject.eventArray && o.eventIndex === selectedObject.eventIndex,
    )
    if (!obj) return null
    const SKIP = new Set(['x', 'y'])
    const props = Object.entries(obj.rawData)
      .filter(([k]) => !SKIP.has(k))
      .map(([k, v]) => `${k}=${String(v)}`)
      .join(', ')
    const label = `${obj.kind} @ (${obj.x},${obj.y})`
    const detail = `${obj.eventArray}[${obj.eventIndex}] ${props}`
    /* Don't suggest if already attached */
    if (attachedContext.some((c) => c.label === label && c.detail === detail)) return null
    return { label, detail }
  }, [selectedObject, metadata, attachedContext])

  if (rightPanel !== 'ai') return null

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    })
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    setInput('')

    /* Build the full user message with any attached context */
    const ctxLines = attachedContext.map((c) => `[Context: ${c.label} — ${c.detail}]`)
    const fullMessage = ctxLines.length > 0
      ? `${ctxLines.join('\n')}\n\n${text}`
      : text

    addUserMessage(text, attachedContext.length > 0 ? [...attachedContext] : undefined)
    startAssistantMessage()
    clearContext()
    scrollToBottom()

    /* Build history from current messages (before the one we just added) */
    const currentMessages = appStore.get(messagesAtom)
    const history = currentMessages
      .slice(0, -1)
      .filter((m) => m.content)
      .map((m) => ({ role: m.role, content: m.content }))

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapName, history, userMessage: fullMessage }),
      })

      if (!response.ok) {
        setError(`API error: ${response.status}`)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) { setError('No response body'); return }

      const decoder = new TextDecoder()
      let sseBuffer = ''
      let didMutate = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        sseBuffer += decoder.decode(value, { stream: true })
        const lines = sseBuffer.split('\n')
        sseBuffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let event: SSEEvent
          try { event = JSON.parse(line.slice(6)) } catch { continue }

          switch (event.type) {
            case 'text':
              appendAssistantChunk(event.text)
              scrollToBottom()
              break
            case 'tool_use':
              addToolCall({ name: cleanToolName(event.name), input: event.input })
              scrollToBottom()
              break
            case 'tool_result':
              setToolResult(cleanToolName(event.name), event.result)
              scrollToBottom()
              break
            case 'error':
              setError(event.message)
              break
            case 'done':
              if ((event as any).didMutate) didMutate = true
              break
          }
        }
      }

      finishAssistantMessage()
      scrollToBottom()

      if (didMutate) {
        queryClient.invalidateQueries({ queryKey: ['metadata', mapName] })
        queryClient.invalidateQueries({ queryKey: ['mapPng', mapName] })
        queryClient.invalidateQueries({ queryKey: ['foregroundPng', mapName] })
      }
    } catch (e: any) {
      setError(e.message || 'Network error')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <ResizablePanel
      side="right"
      width={rightPanelWidth}
      onWidthChange={setRightPanelWidth}
      minWidth={280}
      maxWidth={700}
      offset={44}
    >
      <div className="hud-panel-header">
        <span className="hud-panel-title">AI</span>
        <div className="flex-1" />
        <button
          onClick={() => { newChat(); setShowHistory(false) }}
          className="text-hud-muted hover:text-hud-fg cursor-pointer bg-transparent border-none p-0"
          title="New chat"
        >
          <IconPlus size={14} stroke={1.5} />
        </button>
        {conversations.length > 0 && (
          <button
            onClick={() => setShowHistory((v) => !v)}
            className={`${showHistory ? 'text-hud-active-fg' : 'text-hud-muted'} hover:text-hud-fg cursor-pointer bg-transparent border-none p-0`}
            title="Chat history"
          >
            <IconHistory size={14} stroke={1.5} />
          </button>
        )}
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-hud-muted hover:text-hud-fg cursor-pointer bg-transparent border-none p-0"
            title="Delete chat"
          >
            <IconTrash size={14} stroke={1.5} />
          </button>
        )}
      </div>

      {/* History list */}
      {showHistory && (
        <div className="border-b border-hud-border overflow-y-auto max-h-60">
          {conversations.length === 0 && (
            <div className="px-3 py-3 text-xs text-hud-muted uppercase tracking-widest text-center">
              No conversations yet
            </div>
          )}
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => { switchChat(conv.id); setShowHistory(false) }}
              className={`w-full text-left px-3 py-2 text-xs border-none cursor-pointer flex items-center gap-2 group ${
                conv.id === activeConversationId
                  ? 'bg-hud-active text-hud-active-fg'
                  : 'bg-transparent text-hud-fg hover:bg-hud-surface'
              }`}
            >
              <IconMessage size={11} stroke={1.5} className="shrink-0 text-hud-muted" />
              <span className="flex-1 truncate normal-case tracking-normal">{conv.title}</span>
              <span className="text-hud-muted shrink-0 uppercase tracking-widest">
                {conv.messages.length}
              </span>
              <span
                onClick={(e) => { e.stopPropagation(); deleteChat(conv.id) }}
                className="shrink-0 text-hud-muted hover:text-red-400 opacity-0 group-hover:opacity-100"
                title="Delete"
              >
                <IconTrash size={11} stroke={1.5} />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="overflow-y-auto flex-1 font-mono">
        {messages.length === 0 && !error && (
          <div className="px-3 py-4 text-sm text-hud-muted uppercase tracking-widest text-center">
            Ask about this map
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {isStreaming && (
          <div className="px-3 py-4 flex items-center gap-1 text-hud-active-fg">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="inline-block w-1.5 h-1.5 bg-current animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="px-3 py-2 text-sm text-red-400 border-b border-hud-border">
            {error}
          </div>
        )}
      </div>

      {/* Attached context chips */}
      {attachedContext.length > 0 && (
        <div className="border-t border-hud-border px-2 pt-2 pb-1 flex flex-wrap gap-1">
          {attachedContext.map((ctx, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs uppercase tracking-widest bg-hud-active text-hud-active-fg border border-hud-active-border"
              title={ctx.detail}
            >
              {ctx.label}
              <button
                onClick={() => removeContext(i)}
                className="text-hud-active-fg hover:text-hud-fg cursor-pointer bg-transparent border-none p-0"
              >
                <IconX size={10} stroke={2} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Selected object suggestion */}
      {suggestion && (
        <div className={`${attachedContext.length === 0 ? 'border-t border-hud-border' : ''} px-2 pt-1.5 pb-0.5`}>
          <button
            onClick={() => attachContext(suggestion)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs uppercase tracking-widest bg-transparent text-hud-muted border border-hud-border opacity-70 hover:opacity-100 hover:text-hud-fg hover:border-hud-active-border cursor-pointer transition-opacity"
            title={`Add ${suggestion.label} to context`}
          >
            <IconPlus size={10} stroke={2} />
            {suggestion.label}
          </button>
        </div>
      )}

      {/* Input */}
      <div className={`${attachedContext.length === 0 && !suggestion ? 'border-t border-hud-border' : ''} px-2 py-2 flex items-center gap-1`}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          disabled={isStreaming}
          className="flex-1 bg-transparent border border-hud-border px-2 py-1.5 text-sm text-hud-fg placeholder:text-hud-muted outline-none focus:border-hud-active-border"
        />
        <HudButton onClick={sendMessage} title="Send">
          <IconSend size={14} stroke={1.5} />
        </HudButton>
      </div>
    </ResizablePanel>
  )
}

function BlockRenderer({ block }: { block: ContentBlock }) {
  if (block.kind === 'text') {
    if (!block.text) return null
    return (
      <div className="px-3 pt-1 pb-2 text-sm leading-relaxed break-words normal-case tracking-normal text-hud-fg chat-markdown">
        <Markdown>{block.text}</Markdown>
      </div>
    )
  }

  return (
    <div className="px-3 py-1.5">
      <div className="flex items-center gap-1.5 text-xs text-hud-muted uppercase tracking-widest">
        <IconTool size={11} stroke={1.5} />
        <span>{toolLabel(block.tool.name)}</span>
        {block.tool.result ? <span className="text-green-500">done</span> : <IconLoader2 size={10} className="animate-spin" />}
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className="border-b border-hud-border">
      <div className="px-3 py-1.5 flex items-center gap-2 text-sm uppercase tracking-widest">
        <span className={isUser ? 'text-hud-fg' : 'text-hud-active-fg'}>
          {isUser ? 'You' : 'AI'}
        </span>
      </div>

      {message.context && message.context.length > 0 && (
        <div className="px-3 pb-1 flex flex-wrap gap-1">
          {message.context.map((ctx, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs uppercase tracking-widest bg-hud-active/50 text-hud-muted border border-hud-border"
              title={ctx.detail}
            >
              {ctx.label}
            </span>
          ))}
        </div>
      )}

      {message.blocks.map((block, i) => (
        <BlockRenderer key={i} block={block} />
      ))}
    </div>
  )
}
