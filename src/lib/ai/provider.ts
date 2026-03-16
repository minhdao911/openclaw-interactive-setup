import { createAnthropic } from '@ai-sdk/anthropic'

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const model = anthropic(
  process.env.CLAUDE_MODEL ?? 'claude-haiku-4-5-20251001'
)
