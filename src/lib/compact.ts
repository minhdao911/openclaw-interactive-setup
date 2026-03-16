import type { DbMessage } from '@/types'
import { estimateConversationTokens } from './token-count'
import { replaceWithCompaction } from './db/queries'

export const COMPACTION_THRESHOLD = 100_000
export const MESSAGES_TO_KEEP = 10

export function shouldCompact(messages: DbMessage[]): boolean {
  return estimateConversationTokens(messages) >= COMPACTION_THRESHOLD
}

export async function runCompaction(messages: DbMessage[]): Promise<DbMessage[]> {
  const recentMessages = messages.slice(-MESSAGES_TO_KEEP)

  const res = await fetch('/api/compact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  })

  if (!res.ok) {
    console.error('Compaction API failed:', await res.text())
    return recentMessages
  }

  const { summary } = await res.json()
  await replaceWithCompaction(summary, recentMessages)
  return recentMessages
}
