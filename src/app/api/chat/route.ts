import { DEFAULT_MODEL_ID, getModel } from "@/lib/ai/provider";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { streamText, type LanguageModelV1 } from "ai";

export async function POST(req: Request) {
  const { messages, conversationSummary, modelId } = await req.json();

  const resolvedModelId: string = modelId ?? DEFAULT_MODEL_ID;
  const selectedModel = getModel(resolvedModelId);

  const systemText = conversationSummary
    ? `${SYSTEM_PROMPT}\n\n---\nCONVERSATION SUMMARY (earlier context, use this as background):\n${conversationSummary}`
    : SYSTEM_PROMPT;

  const result = streamText({
    model: selectedModel as LanguageModelV1,
    system: systemText,
    messages,
    maxTokens: 2048,
    experimental_providerMetadata: {
      anthropic: { cacheControl: { type: "ephemeral" } },
      deepseek: { cacheControl: { type: "ephemeral" } },
    },
  });

  return result.toDataStreamResponse();
}
