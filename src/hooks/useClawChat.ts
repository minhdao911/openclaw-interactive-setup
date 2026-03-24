"use client";

import { calcCost } from "@/lib/ai/provider";
import { runCompaction, shouldCompact } from "@/lib/compact";
import {
  addMessage,
  clearAll,
  getConversation,
  getMessages,
} from "@/lib/db/queries";
import { useChat } from "ai/react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UsageStats {
  promptTokens: number;
  completionTokens: number;
  cost: number | null;
}

export function useClawChat(modelId: string) {
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

      await addMessage("assistant", message.content);

      // Check if compaction is needed
      if (!isCompacting.current) {
        const allMessages = await getMessages();
        if (shouldCompact(allMessages)) {
          isCompacting.current = true;
          try {
            const kept = await runCompaction(allMessages);
            const conv = await getConversation();
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

  // Load conversation from Dexie on mount
  useEffect(() => {
    async function load() {
      const [conv, dbMessages] = await Promise.all([
        getConversation(),
        getMessages(),
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
  }, [setMessages]);

  const submitMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;
      await addMessage("user", input);
      handleSubmit(e);
    },
    [input, isLoading, handleSubmit],
  );

  const sendSuggestion = useCallback(
    async (text: string) => {
      if (isLoading) return;
      await addMessage("user", text);
      append({ role: "user", content: text });
    },
    [isLoading, append],
  );

  const resetAll = useCallback(async () => {
    await clearAll();
    setMessages([]);
    setConversationSummary(null);
    setUsage({ promptTokens: 0, completionTokens: 0, cost: null });
  }, [setMessages]);

  return {
    messages,
    input,
    handleInputChange,
    submitMessage,
    sendSuggestion,
    isLoading,
    loaded,
    resetAll,
    usage,
    error,
    reload,
  };
}
