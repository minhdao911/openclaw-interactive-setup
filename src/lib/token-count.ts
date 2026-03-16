import type { DbMessage } from '@/types'

// Rough approximation: 1 token ≈ 4 characters
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function estimateConversationTokens(messages: DbMessage[]): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content), 0)
}
