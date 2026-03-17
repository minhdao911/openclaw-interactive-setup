import type { ParsedProgressUpdate } from '@/types'

// Matches both formats:
//   <progress-update section="X" status="Y" />
//   <progress-update section="X" status="Y" detail="Z" />
const PROGRESS_TAG_REGEX =
  /<progress-update\s+section="([^"]+)"\s+status="([^"]+)"(?:\s+detail="([^"]*)")?\s*\/>/g

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

  const cleanContent = content.replace(PROGRESS_TAG_REGEX, (_, sectionId, status, detail) => {
    if (
      VALID_SECTION_IDS.has(sectionId) &&
      (status === 'in_progress' || status === 'done')
    ) {
      const update: ParsedProgressUpdate = { sectionId, status }
      if (detail) {
        update.detail = detail
      }
      updates.push(update)
    }
    return ''
  })

  return { updates, cleanContent: cleanContent.trim() }
}
