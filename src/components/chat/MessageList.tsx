'use client'

import { useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageBubble } from './MessageBubble'
import { ProgressConfirmation } from './ProgressConfirmation'
import type { Message } from 'ai'
import type { PendingConfirmation } from '@/hooks/useClawChat'

interface Props {
  messages: Message[]
  isLoading: boolean
  pendingConfirmations: PendingConfirmation[]
  onConfirm: (confirmation: PendingConfirmation, confirmed: boolean) => void
}

function WelcomeMessage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-4">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
        🦀
      </div>
      <div>
        <h2 className="font-semibold text-lg mb-1">Welcome to ClawPath</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          I&apos;ll guide you through setting up OpenClaw step by step.
          <br />
          What are you trying to set up, or where are you starting from?
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center mt-2">
        {[
          "I'm starting from scratch",
          "I need help with installation",
          "I want to set up a Telegram bot",
          "I'm having trouble with my gateway",
        ].map((suggestion) => (
          <button
            key={suggestion}
            className="text-xs border border-border rounded-full px-3 py-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}

export function MessageList({ messages, isLoading, pendingConfirmations, onConfirm }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingConfirmations])

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.length === 0 ? (
        <WelcomeMessage />
      ) : (
        <div className="px-4 py-4 space-y-4">
          {messages.map((message) => {
            const confirmationsForMessage = pendingConfirmations.filter(
              (c) => c.messageId === message.id
            )
            return (
              <div key={message.id}>
                <MessageBubble role={message.role as 'user' | 'assistant'} content={message.content} />
                {confirmationsForMessage.map((conf) => (
                  <ProgressConfirmation
                    key={`${conf.messageId}-${conf.sectionId}`}
                    confirmation={conf}
                    onConfirm={onConfirm}
                  />
                ))}
              </div>
            )
          })}
          {isLoading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-1 mr-2">
                C
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
