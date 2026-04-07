import { atomWithStorage } from 'jotai/utils'
import type { Conversation } from './types'

export const conversationsAtom = atomWithStorage<Conversation[]>('mb:chat:conversations', [])
export const activeConversationIdAtom = atomWithStorage<string | null>('mb:chat:activeConversationId', null)
