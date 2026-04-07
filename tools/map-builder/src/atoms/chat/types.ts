export interface ToolCallInfo {
  name: string
  input: Record<string, unknown>
  result?: string
}

export type ContentBlock =
  | { kind: 'text'; text: string }
  | { kind: 'tool'; tool: ToolCallInfo }

export interface ChatMessage {
  role: 'user' | 'assistant'
  /** Flat text for history serialization */
  content: string
  /** Ordered blocks (text + tool calls interleaved) */
  blocks: ContentBlock[]
  /** Context that was attached when this message was sent */
  context?: AttachedContext[]
}

export interface AttachedContext {
  label: string
  detail: string
}

export interface Conversation {
  id: string
  title: string
  createdAt: number
  messages: ChatMessage[]
}
