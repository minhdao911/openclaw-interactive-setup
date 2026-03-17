export type MessageRole = 'user' | 'assistant'

export type ProgressStatus = 'not_started' | 'in_progress' | 'done'

export interface DbConversation {
  id: string
  summary: string | null
  updatedAt: number
}

export interface DbMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: number
}

export interface DbProgress {
  sectionId: string
  status: ProgressStatus
  notes: string
  updatedAt: number
}

export interface ProgressSection {
  id: string
  label: string
  description: string
  useCases?: UseCaseCard[]
}

export interface UseCaseCard {
  title: string
  description: string
}

export interface ParsedProgressUpdate {
  sectionId: string
  status: 'in_progress' | 'done'
  detail?: string
}
