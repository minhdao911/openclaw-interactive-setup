import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  compatibility: "strict",
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

export const DEFAULT_MODEL_ID = "deepseek-chat";

// Cost per 1M tokens [input, output] in USD. null = unknown pricing.
export const MODEL_PRICING: Record<string, [number, number] | null> = {
  "claude-haiku-4-5-20251001": [1.0, 5.0],
  "gpt-4o-mini": [0.15, 0.6],
  "gpt-5-mini": [0.25, 2.0],
  "gemini-3-flash-preview": [0.5, 3.0],
  "deepseek-chat": [0.28, 0.42],
};

export function calcCost(
  modelId: string,
  promptTokens: number,
  completionTokens: number,
): number | null {
  const pricing = MODEL_PRICING[modelId];
  if (!pricing) return null;
  return (
    (promptTokens * pricing[0] + completionTokens * pricing[1]) / 1_000_000
  );
}

export function getModel(modelId: string) {
  if (modelId.startsWith("gpt-")) return openai(modelId);
  if (modelId.startsWith("gemini-")) return google(modelId);
  if (modelId.startsWith("deepseek-")) return deepseek(modelId);
  return anthropic(modelId);
}

export const model = getModel(DEFAULT_MODEL_ID);
