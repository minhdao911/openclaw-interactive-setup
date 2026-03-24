"use client";

import { calcCost } from "@/lib/ai/provider";
import { runCompaction, shouldCompact } from "@/lib/compact";
import {
  addMessage,
  clearConversation,
  getConversation,
  getMessages,
  setConversationTitle,
} from "@/lib/db/queries";
import { useChat } from "ai/react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UsageStats {
  promptTokens: number;
  completionTokens: number;
  cost: number | null;
}

export function useClawChat(conversationId: string, modelId: string) {
  const [conversationSummary, setConversationSummary] = useState<string | null>(
    null,
  );
  const [loaded, setLoaded] = useState(false);
  const [usage, setUsage] = useState<UsageStats>({
    promptTokens: 0,
    completionTokens: 0,
    cost: null,
  });
  const isCompacting = useRef(false);
  // Capture current conversationId in a ref so onFinish closure always has latest value
  const conversationIdRef = useRef(conversationId);
  conversationIdRef.current = conversationId;

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
    append,
    error,
    reload,
  } = useChat({
    api: "/api/chat",
    body: { conversationSummary, modelId },
    onFinish: async (message, { usage: msgUsage }) => {
      const convId = conversationIdRef.current;
      setUsage((prev) => {
        const newPrompt = prev.promptTokens + (msgUsage?.promptTokens ?? 0);
        const newCompletion =
          prev.completionTokens + (msgUsage?.completionTokens ?? 0);
        const prevCost = prev.cost ?? 0;
        const addedCost = calcCost(
          modelId,
          msgUsage?.promptTokens ?? 0,
          msgUsage?.completionTokens ?? 0,
        );
        return {
          promptTokens: newPrompt,
          completionTokens: newCompletion,
          cost: addedCost !== null ? prevCost + addedCost : prev.cost,
        };
      });

      await addMessage(convId, "assistant", message.content);

      if (!isCompacting.current) {
        const allMessages = await getMessages(convId);
        if (shouldCompact(allMessages)) {
          isCompacting.current = true;
          try {
            const kept = await runCompaction(convId, allMessages);
            const conv = await getConversation(convId);
            setConversationSummary(conv.summary);
            setMessages(
              kept.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                createdAt: new Date(m.createdAt),
              })),
            );
          } finally {
            isCompacting.current = false;
          }
        }
      }
    },
  });

  // Reload when conversationId changes
  useEffect(() => {
    setMessages([]);
    setLoaded(false);
    setConversationSummary(null);
    setUsage({ promptTokens: 0, completionTokens: 0, cost: null });

    if (!conversationId) return;

    async function load() {
      const [conv, dbMessages] = await Promise.all([
        getConversation(conversationId),
        getMessages(conversationId),
      ]);
      setConversationSummary(conv.summary);
      if (dbMessages.length > 0) {
        setMessages(
          dbMessages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: new Date(m.createdAt),
          })),
        );
      }
      setLoaded(true);
    }
    load();
  }, [conversationId, setMessages]);

  const submitMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;
      const isFirstMessage = messages.length === 0;
      await addMessage(conversationId, "user", input);
      if (isFirstMessage) {
        await setConversationTitle(conversationId, input.trim().slice(0, 60));
      }
      handleSubmit(e);
    },
    [conversationId, input, isLoading, handleSubmit, messages.length],
  );

  const sendSuggestion = useCallback(
    async (text: string) => {
      if (isLoading) return;
      const isFirstMessage = messages.length === 0;
      await addMessage(conversationId, "user", text);
      if (isFirstMessage) {
        await setConversationTitle(conversationId, text.slice(0, 60));
      }
      append({ role: "user", content: text });
    },
    [conversationId, isLoading, append, messages.length],
  );

  const resetCurrent = useCallback(async () => {
    await clearConversation(conversationId);
    setMessages([]);
    setConversationSummary(null);
    setUsage({ promptTokens: 0, completionTokens: 0, cost: null });
  }, [conversationId, setMessages]);

  return {
    messages,
    input,
    handleInputChange,
    submitMessage,
    sendSuggestion,
    isLoading,
    loaded,
    resetCurrent,
    usage,
    error,
    reload,
  };
}
