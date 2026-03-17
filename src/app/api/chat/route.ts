import { streamText } from 'ai'
import { model } from '@/lib/ai/provider'
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt'

export async function POST(req: Request) {
  const { messages, conversationSummary } = await req.json()

  const systemText = conversationSummary
    ? `${SYSTEM_PROMPT}\n\n---\nCONVERSATION SUMMARY (earlier context, use this as background):\n${conversationSummary}`
    : SYSTEM_PROMPT

  const result = streamText({
    model,
    messages: [
      {
        role: 'system',
        content: systemText,
        experimental_providerMetadata: {
          anthropic: { cacheControl: { type: 'ephemeral' } },
        },
      },
      ...messages,
    ],
    maxTokens: 2048,
  })

  return result.toDataStreamResponse()
}
