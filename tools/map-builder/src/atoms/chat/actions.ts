import { atom } from 'jotai'
import { conversationsAtom, activeConversationIdAtom } from './conversations'
import { isStreamingAtom, errorAtom } from './streaming'
import { attachedContextAtom } from './context'
import type { ChatMessage, Conversation, AttachedContext, ToolCallInfo } from './types'

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function titleFromMessages(msgs: ChatMessage[]): string {
  const first = msgs.find((m) => m.role === 'user')
  if (!first?.content) return 'New chat'
  const text = first.content.slice(0, 40)
  return text.length < first.content.length ? text + '...' : text
}

function updateActive(
  conversations: Conversation[],
  activeId: string | null,
  updater: (msgs: ChatMessage[]) => ChatMessage[],
): Conversation[] {
  return conversations.map((c) =>
    c.id === activeId ? { ...c, messages: updater(c.messages) } : c,
  )
}

export const newChatAtom = atom(null, (_get, set) => {
  const id = makeId()
  const conv: Conversation = { id, title: 'New chat', createdAt: Date.now(), messages: [] }
  set(conversationsAtom, (prev) => [conv, ...prev])
  set(activeConversationIdAtom, id)
  set(isStreamingAtom, false)
  set(errorAtom, null)
  set(attachedContextAtom, [])
})

export const switchChatAtom = atom(null, (_get, set, id: string) => {
  set(activeConversationIdAtom, id)
  set(isStreamingAtom, false)
  set(errorAtom, null)
  set(attachedContextAtom, [])
})

export const deleteChatAtom = atom(null, (get, set, id: string) => {
  const wasActive = get(activeConversationIdAtom) === id
  set(conversationsAtom, (prev) => prev.filter((c) => c.id !== id))
  if (wasActive) {
    const convs = get(conversationsAtom)
    const next = convs[0] || null
    set(activeConversationIdAtom, next?.id ?? null)
    set(isStreamingAtom, false)
    set(errorAtom, null)
  }
})

export const addUserMessageAtom = atom(null, (get, set, content: string, context?: AttachedContext[]) => {
  let activeId = get(activeConversationIdAtom)

  /* Auto-create a conversation if none active */
  if (!activeId) {
    const id = makeId()
    const conv: Conversation = { id, title: 'New chat', createdAt: Date.now(), messages: [] }
    set(conversationsAtom, (prev) => [conv, ...prev])
    activeId = id
    set(activeConversationIdAtom, id)
  }

  const newMsg: ChatMessage = {
    role: 'user',
    content,
    blocks: [{ kind: 'text', text: content }],
    ...(context && context.length > 0 ? { context } : {}),
  }

  const finalActiveId = activeId
  set(conversationsAtom, (convs) => {
    const updated = updateActive(convs, finalActiveId, (msgs) => [...msgs, newMsg])
    return updated.map((c) =>
      c.id === finalActiveId && c.title === 'New chat'
        ? { ...c, title: titleFromMessages(c.messages) }
        : c,
    )
  })

  set(errorAtom, null)
})

export const startAssistantMessageAtom = atom(null, (get, set) => {
  const activeId = get(activeConversationIdAtom)
  set(conversationsAtom, (convs) =>
    updateActive(convs, activeId, (msgs) => [
      ...msgs,
      { role: 'assistant' as const, content: '', blocks: [] },
    ]),
  )
  set(isStreamingAtom, true)
})

export const appendAssistantChunkAtom = atom(null, (get, set, chunk: string) => {
  const activeId = get(activeConversationIdAtom)
  set(conversationsAtom, (convs) =>
    updateActive(convs, activeId, (msgs) => {
      const updated = [...msgs]
      const last = updated[updated.length - 1]
      if (last?.role === 'assistant') {
        const blocks = [...last.blocks]
        const lastBlock = blocks[blocks.length - 1]
        if (lastBlock?.kind === 'text') {
          blocks[blocks.length - 1] = { kind: 'text', text: lastBlock.text + chunk }
        } else {
          blocks.push({ kind: 'text', text: chunk })
        }
        updated[updated.length - 1] = { ...last, content: last.content + chunk, blocks }
      }
      return updated
    }),
  )
})

export const addToolCallAtom = atom(null, (get, set, tool: ToolCallInfo) => {
  const activeId = get(activeConversationIdAtom)
  set(conversationsAtom, (convs) =>
    updateActive(convs, activeId, (msgs) => {
      const updated = [...msgs]
      const last = updated[updated.length - 1]
      if (last?.role === 'assistant') {
        const blocks = [...last.blocks]
        blocks.push({ kind: 'tool', tool })
        updated[updated.length - 1] = { ...last, blocks }
      }
      return updated
    }),
  )
})

export const setToolResultAtom = atom(null, (get, set, name: string, result: string) => {
  const activeId = get(activeConversationIdAtom)
  set(conversationsAtom, (convs) =>
    updateActive(convs, activeId, (msgs) => {
      const updated = [...msgs]
      const last = updated[updated.length - 1]
      if (last?.role === 'assistant') {
        const blocks = [...last.blocks]
        for (let i = blocks.length - 1; i >= 0; i--) {
          const b = blocks[i]
          if (b.kind === 'tool' && b.tool.name === name && !b.tool.result) {
            blocks[i] = { kind: 'tool', tool: { ...b.tool, result } }
            break
          }
        }
        updated[updated.length - 1] = { ...last, blocks }
      }
      return updated
    }),
  )
})

export const finishAssistantMessageAtom = atom(null, (get, set) => {
  const activeId = get(activeConversationIdAtom)
  set(conversationsAtom, (convs) =>
    updateActive(convs, activeId, (msgs) => {
      const updated = [...msgs]
      const last = updated[updated.length - 1]
      if (last?.role === 'assistant') {
        const hasUnfinished = last.blocks.some((b) => b.kind === 'tool' && !b.tool.result)
        if (hasUnfinished) {
          const blocks = last.blocks.map((b) =>
            b.kind === 'tool' && !b.tool.result
              ? { kind: 'tool' as const, tool: { ...b.tool, result: 'done' } }
              : b,
          )
          updated[updated.length - 1] = { ...last, blocks }
        }
      }
      return updated
    }),
  )
  set(isStreamingAtom, false)
})

export const setErrorAtom = atom(null, (_get, set, error: string | null) => {
  set(errorAtom, error)
  set(isStreamingAtom, false)
})

export const setStreamingAtom = atom(null, (_get, set, streaming: boolean) => {
  set(isStreamingAtom, streaming)
})

export const clearChatAtom = atom(null, (get, set) => {
  const activeId = get(activeConversationIdAtom)
  if (!activeId) return
  set(conversationsAtom, (prev) => prev.filter((c) => c.id !== activeId))
  const convs = get(conversationsAtom)
  const next = convs[0] || null
  set(activeConversationIdAtom, next?.id ?? null)
  set(isStreamingAtom, false)
  set(errorAtom, null)
  set(attachedContextAtom, [])
})
