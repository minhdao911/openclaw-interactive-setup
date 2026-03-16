import { nanoid } from 'nanoid'
import { db } from './schema'
import { PROGRESS_SECTIONS } from '@/lib/progress-sections'
import type { DbConversation, DbMessage, DbProgress, ProgressStatus } from '@/types'

const CONVERSATION_ID = 'main'

export async function getConversation(): Promise<DbConversation> {
  const existing = await db.conversation.get(CONVERSATION_ID)
  if (existing) return existing
  const conv: DbConversation = {
    id: CONVERSATION_ID,
    summary: null,
    updatedAt: Date.now(),
  }
  await db.conversation.add(conv)
  return conv
}

export async function updateConversationSummary(summary: string): Promise<void> {
  await db.conversation.update(CONVERSATION_ID, { summary, updatedAt: Date.now() })
}

export async function getMessages(): Promise<DbMessage[]> {
  return db.messages.orderBy('createdAt').toArray()
}

export async function addMessage(
  role: DbMessage['role'],
  content: string
): Promise<DbMessage> {
  const msg: DbMessage = {
    id: nanoid(),
    role,
    content,
    createdAt: Date.now(),
  }
  await db.messages.add(msg)
  await db.conversation.update(CONVERSATION_ID, { updatedAt: Date.now() })
  return msg
}

export async function replaceWithCompaction(
  summary: string,
  recentMessages: DbMessage[]
): Promise<void> {
  await db.transaction('rw', db.messages, db.conversation, async () => {
    await db.messages.clear()
    await db.messages.bulkAdd(recentMessages)
    await db.conversation.update(CONVERSATION_ID, {
      summary,
      updatedAt: Date.now(),
    })
  })
}

export async function getProgress(): Promise<DbProgress[]> {
  const existing = await db.progress.toArray()
  const existingIds = new Set(existing.map((p) => p.sectionId))

  const missing = PROGRESS_SECTIONS.filter((s) => !existingIds.has(s.id)).map(
    (s): DbProgress => ({
      sectionId: s.id,
      status: 'not_started',
      notes: '',
      updatedAt: Date.now(),
    })
  )

  if (missing.length > 0) {
    await db.progress.bulkAdd(missing)
    return [...existing, ...missing]
  }

  return existing
}

export async function updateProgress(
  sectionId: string,
  status: ProgressStatus,
  notes?: string
): Promise<void> {
  const existing = await db.progress.get(sectionId)
  if (existing) {
    await db.progress.update(sectionId, {
      status,
      notes: notes ?? existing.notes,
      updatedAt: Date.now(),
    })
  } else {
    await db.progress.add({
      sectionId,
      status,
      notes: notes ?? '',
      updatedAt: Date.now(),
    })
  }
}
