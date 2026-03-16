import type { ParsedProgressUpdate } from '@/types'

const PROGRESS_TAG_REGEX =
  /<progress-update\s+section="([^"]+)"\s+status="([^"]+)"\s*\/>/g

const VALID_SECTION_IDS = new Set([
  'installation',
  'api-model',
  'gateway',
  'channels',
  'web-search',
  'skills',
  'security',
  'memory',
  'cron',
  'cost',
  'first-usecase',
])

export function parseProgressUpdates(content: string): {
  updates: ParsedProgressUpdate[]
  cleanContent: string
} {
  const updates: ParsedProgressUpdate[] = []

  const cleanContent = content.replace(PROGRESS_TAG_REGEX, (_, sectionId, status) => {
    if (
      VALID_SECTION_IDS.has(sectionId) &&
      (status === 'in_progress' || status === 'done')
    ) {
      updates.push({ sectionId, status })
    }
    return ''
  })

  return { updates, cleanContent: cleanContent.trim() }
}
