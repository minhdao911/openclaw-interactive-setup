'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback } from 'react'
import { db } from '@/lib/db/schema'
import { updateProgress, getProgress } from '@/lib/db/queries'
import { PROGRESS_SECTIONS } from '@/lib/progress-sections'
import type { DbProgress, ProgressStatus } from '@/types'

export function useProgress() {
  const rawProgress = useLiveQuery(() => db.progress.toArray(), [])

  // Build a map from sectionId → DbProgress, filling gaps with defaults
  const progressMap = new Map<string, DbProgress>()
  if (rawProgress) {
    for (const p of rawProgress) {
      progressMap.set(p.sectionId, p)
    }
  }

  const progress = PROGRESS_SECTIONS.map((section) => ({
    ...section,
    status: (progressMap.get(section.id)?.status ?? 'not_started') as ProgressStatus,
    notes: progressMap.get(section.id)?.notes ?? '',
  }))

  const setProgress = useCallback(
    async (sectionId: string, status: ProgressStatus, notes?: string) => {
      await updateProgress(sectionId, status, notes)
    },
    []
  )

  const cycleProgress = useCallback(async (sectionId: string) => {
    const current = progressMap.get(sectionId)?.status ?? 'not_started'
    const next: ProgressStatus =
      current === 'not_started'
        ? 'in_progress'
        : current === 'in_progress'
          ? 'done'
          : 'not_started'
    await updateProgress(sectionId, next)
  }, [progressMap])

  // Ensure all sections are initialized in DB on first load
  const initialized = rawProgress !== undefined

  return { progress, setProgress, cycleProgress, initialized }
}
