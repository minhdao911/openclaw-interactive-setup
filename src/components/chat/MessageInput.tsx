'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SendHorizonal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  input: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onSubmit: (e: React.FormEvent) => void
  isLoading: boolean
}

export function MessageInput({ input, onChange, onSubmit, isLoading }: Props) {
  const formRef = useRef<HTMLFormElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

  return (
    <div className="border-t border-border p-4">
      <form ref={formRef} onSubmit={onSubmit} className="flex gap-2 items-end">
        <Textarea
          value={input}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask about OpenClaw setup… (⌘↵ to send)"
          className="min-h-[44px] max-h-[160px] resize-none text-sm"
          rows={1}
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || !input.trim()}
          className={cn('shrink-0 h-[44px] w-[44px]')}
        >
          <SendHorizonal className="w-4 h-4" />
        </Button>
      </form>
      <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
        ClawPath only answers OpenClaw setup questions.
      </p>
    </div>
  )
}
