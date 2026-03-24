import { nanoid } from 'nanoid'
import { db } from './schema'
import { PROGRESS_SECTIONS } from '@/lib/progress-sections'
import type { DbConversation, DbMessage, DbProgress, ProgressStatus } from '@/types'

export async function createConversation(): Promise<DbConversation> {
  const conv: DbConversation = {
    id: nanoid(),
    title: 'New Chat',
    summary: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  await db.conversation.add(conv)
  return conv
}

export async function getConversation(id: string): Promise<DbConversation> {
  const existing = await db.conversation.get(id)
  if (existing) return existing
  const conv: DbConversation = {
    id,
    title: 'New Chat',
    summary: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  await db.conversation.add(conv)
  return conv
}

export async function updateConversationSummary(id: string, summary: string): Promise<void> {
  await db.conversation.update(id, { summary, updatedAt: Date.now() })
}

export async function setConversationTitle(id: string, title: string): Promise<void> {
  await db.conversation.update(id, { title, updatedAt: Date.now() })
}

export async function deleteConversation(id: string): Promise<void> {
  await db.transaction('rw', db.messages, db.conversation, async () => {
    await db.messages.where('conversationId').equals(id).delete()
    await db.conversation.delete(id)
  })
}

export async function getMessages(conversationId: string): Promise<DbMessage[]> {
  return db.messages.where('conversationId').equals(conversationId).sortBy('createdAt')
}

export async function addMessage(
  conversationId: string,
  role: DbMessage['role'],
  content: string
): Promise<DbMessage> {
  const msg: DbMessage = {
    id: nanoid(),
    conversationId,
    role,
    content,
    createdAt: Date.now(),
  }
  await db.messages.add(msg)
  await db.conversation.update(conversationId, { updatedAt: Date.now() })
  return msg
}

export async function replaceWithCompaction(
  conversationId: string,
  summary: string,
  recentMessages: DbMessage[]
): Promise<void> {
  await db.transaction('rw', db.messages, db.conversation, async () => {
    await db.messages.where('conversationId').equals(conversationId).delete()
    await db.messages.bulkAdd(recentMessages)
    await db.conversation.update(conversationId, {
      summary,
      updatedAt: Date.now(),
    })
  })
}

export async function clearConversation(id: string): Promise<void> {
  await db.transaction('rw', db.messages, db.conversation, async () => {
    await db.messages.where('conversationId').equals(id).delete()
    await db.conversation.update(id, { summary: null, title: 'New Chat', updatedAt: Date.now() })
  })
}

export async function clearAll(): Promise<void> {
  await db.transaction('rw', db.messages, db.conversation, db.progress, async () => {
    await db.messages.clear()
    await db.progress.clear()
    await db.conversation.clear()
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
