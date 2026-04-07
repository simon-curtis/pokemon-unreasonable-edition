import { atom } from 'jotai'
import { conversationsAtom, activeConversationIdAtom } from './conversations'

/** Derived: current conversation's messages */
export const messagesAtom = atom((get) => {
  const convs = get(conversationsAtom)
  const activeId = get(activeConversationIdAtom)
  return convs.find((c) => c.id === activeId)?.messages ?? []
})

/** Derived: conversation list for sidebar (titles/IDs only — not affected by streaming) */
export const conversationListAtom = atom((get) =>
  get(conversationsAtom).map(({ id, title, createdAt }) => ({ id, title, createdAt })),
)
