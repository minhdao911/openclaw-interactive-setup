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
  }
}

export const db = new ClawPathDB()
