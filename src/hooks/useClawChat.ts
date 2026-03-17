'use client'

import { useChat } from 'ai/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getConversation, getMessages, addMessage, replaceWithCompaction, clearAll } from '@/lib/db/queries'
import { parseProgressUpdates } from '@/lib/progress-detect'
import { shouldCompact, runCompaction } from '@/lib/compact'
import { updateProgress } from '@/lib/db/queries'
import type { DbMessage, ParsedProgressUpdate } from '@/types'

export interface PendingConfirmation {
  messageId: string
  sectionId: string
  sectionLabel: string
  status: 'done'
  detail?: string
}

export function useClawChat() {
  const [conversationSummary, setConversationSummary] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [pendingConfirmations, setPendingConfirmations] = useState<PendingConfirmation[]>([])
  const isCompacting = useRef(false)

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, append } =
    useChat({
      api: '/api/chat',
      body: { conversationSummary },
      onFinish: async (message) => {
        const { updates, cleanContent } = parseProgressUpdates(message.content)

        // Save clean content (tags stripped) to Dexie
        await addMessage('assistant', cleanContent)

        // Update message in useChat state to use clean content
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id ? { ...m, content: cleanContent } : m
          )
        )

        // Queue confirmations for "done" updates; auto-apply "in_progress"
        // Use message.id (useChat streaming ID) so confirmations match in MessageList
        for (const update of updates) {
          if (update.status === 'in_progress') {
            await updateProgress(update.sectionId, 'in_progress', update.detail)
          } else if (update.status === 'done') {
            setPendingConfirmations((prev) => [
              ...prev,
              {
                messageId: message.id,
                sectionId: update.sectionId,
                sectionLabel: update.sectionId,
                status: 'done',
                detail: update.detail,
              },
            ])
          }
        }

        // Check if compaction is needed
        if (!isCompacting.current) {
          const allMessages = await getMessages()
          if (shouldCompact(allMessages)) {
            isCompacting.current = true
            try {
              const kept = await runCompaction(allMessages)
              const conv = await getConversation()
              setConversationSummary(conv.summary)
              setMessages(
                kept.map((m) => ({
                  id: m.id,
                  role: m.role,
                  content: m.content,
                  createdAt: new Date(m.createdAt),
                }))
              )
            } finally {
              isCompacting.current = false
            }
          }
        }
      },
    })

  // Load conversation from Dexie on mount
  useEffect(() => {
    async function load() {
      const [conv, dbMessages] = await Promise.all([getConversation(), getMessages()])
      setConversationSummary(conv.summary)
      if (dbMessages.length > 0) {
        setMessages(
          dbMessages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: new Date(m.createdAt),
          }))
        )
      }
      setLoaded(true)
    }
    load()
  }, [setMessages])

  const submitMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!input.trim() || isLoading) return
      // Save user message to Dexie first
      await addMessage('user', input)
      handleSubmit(e)
    },
    [input, isLoading, handleSubmit]
  )

  const sendSuggestion = useCallback(
    async (text: string) => {
      if (isLoading) return
      await addMessage('user', text)
      append({ role: 'user', content: text })
    },
    [isLoading, append]
  )

  const resetAll = useCallback(async () => {
    await clearAll()
    setMessages([])
    setConversationSummary(null)
    setPendingConfirmations([])
  }, [setMessages])

  const confirmProgress = useCallback(
    async (confirmation: PendingConfirmation, confirmed: boolean) => {
      if (confirmed) {
        await updateProgress(confirmation.sectionId, 'done', confirmation.detail)
      }
      setPendingConfirmations((prev) =>
        prev.filter(
          (c) =>
            !(c.messageId === confirmation.messageId && c.sectionId === confirmation.sectionId)
        )
      )
    },
    []
  )

  return {
    messages,
    input,
    handleInputChange,
    submitMessage,
    sendSuggestion,
    isLoading,
    loaded,
    pendingConfirmations,
    confirmProgress,
    resetAll,
  }
}
