'use client'

import { Button } from '@/components/ui/button'
import { PROGRESS_SECTIONS } from '@/lib/progress-sections'
import type { PendingConfirmation } from '@/hooks/useClawChat'

interface Props {
  confirmation: PendingConfirmation
  onConfirm: (confirmation: PendingConfirmation, confirmed: boolean) => void
}

export function ProgressConfirmation({ confirmation, onConfirm }: Props) {
  const section = PROGRESS_SECTIONS.find((s) => s.id === confirmation.sectionId)
  const label = section?.label ?? confirmation.sectionId

  return (
    <div className="flex justify-start pl-9 mt-1">
      <div className="bg-background border border-border rounded-xl px-4 py-3 text-sm max-w-[80%]">
        <p className="text-muted-foreground mb-2">
          Did you complete <span className="font-medium text-foreground">{label}</span>?
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs"
            onClick={() => onConfirm(confirmation, true)}
          >
            ✓ Yes, done
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => onConfirm(confirmation, false)}
          >
            Still working on it
          </Button>
        </div>
      </div>
    </div>
  )
}
