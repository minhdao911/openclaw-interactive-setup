import { generateText } from 'ai'
import { model } from '@/lib/ai/provider'

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = await generateText({
    model,
    system:
      'Summarize this OpenClaw setup conversation into a concise context block (max 400 words). Capture: topics discussed, decisions made, setup steps completed or attempted, user selections (OS, channels, model provider, etc.), and any unresolved issues or questions. Write in third person (e.g. "The user is setting up OpenClaw on macOS...").',
    messages,
    maxTokens: 1024,
  })

  return Response.json({ summary: result.text })
}
