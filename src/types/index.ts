export type MessageRole = 'user' | 'assistant'

export type ProgressStatus = 'not_started' | 'in_progress' | 'done'

export interface DbConversation {
  id: string
  title: string
  summary: string | null
  totalCost: number | null
  totalPromptTokens: number | null
  totalCompletionTokens: number | null
  createdAt: number
  updatedAt: number
}

export interface DbMessage {
  id: string
  conversationId: string
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
