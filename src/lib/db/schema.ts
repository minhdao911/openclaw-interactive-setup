import Dexie, { type Table } from 'dexie'
import type { DbConversation, DbMessage, DbProgress } from '@/types'

class ClawPathDB extends Dexie {
  conversation!: Table<DbConversation>
  messages!: Table<DbMessage>
  progress!: Table<DbProgress>

  constructor() {
    super('clawpath-db')
    this.version(1).stores({
      conversation: 'id',
      messages: 'id, createdAt',
      progress: 'sectionId, updatedAt',
    })
    this.version(2).stores({
      conversation: 'id, updatedAt',
      messages: 'id, conversationId, createdAt',
      progress: 'sectionId, updatedAt',
    }).upgrade(tx => {
      return Promise.all([
        tx.table('messages').toCollection().modify((msg: Record<string, unknown>) => {
          if (!msg.conversationId) msg.conversationId = 'main'
        }),
        tx.table('conversation').toCollection().modify((conv: Record<string, unknown>) => {
          if (!conv.title) conv.title = 'New Chat'
          if (!conv.createdAt) conv.createdAt = conv.updatedAt ?? Date.now()
        }),
      ])
    })
  }
}

export const db = new ClawPathDB()
