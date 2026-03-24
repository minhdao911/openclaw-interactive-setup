"use client";

import { ProgressSidebar } from "@/components/sidebar/ProgressSidebar";
import { useClawChat } from "@/hooks/useClawChat";
import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";

const MODEL_GROUPS = [
  {
    label: "Anthropic",
    models: [{ id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" }],
  },
  {
    label: "OpenAI",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
      { id: "gpt-5-mini", label: "GPT-5 mini" },
    ],
  },
  {
    label: "Google",
    models: [{ id: "gemini-3-flash-preview", label: "Gemini 3 Flash" }],
  },
  {
    label: "DeepSeek",
    models: [{ id: "deepseek-chat", label: "DeepSeek V3.2" }],
  },
];

export function ChatInterface() {
  const [modelId, setModelId] = useState(MODEL_GROUPS[0].models[0].id);
  const [dismissedError, setDismissedError] = useState<Error | null>(null);
  const {
    messages,
    input,
    handleInputChange,
    submitMessage,
    sendSuggestion,
    isLoading,
    loaded,
    pendingConfirmations,
    confirmProgress,
    resetAll,
    usage,
    error,
    reload,
  } = useClawChat(modelId);

  const totalTokens = usage.promptTokens + usage.completionTokens;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Progress sidebar */}
      <ProgressSidebar />

      {/* Chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-5 py-3 border-b border-border shrink-0">
          <span className="text-lg">🦀</span>
          <div className="flex-1">
            <h1 className="font-semibold text-sm leading-tight">ClawPath</h1>
            <p className="text-xs text-muted-foreground leading-tight">
              Your OpenClaw setup guide
            </p>
          </div>
          {process.env.NODE_ENV === "development" && (
            <div className="flex items-center gap-3">
              {totalTokens > 0 && (
                <div className="text-xs text-muted-foreground tabular-nums">
                  {totalTokens.toLocaleString()} tokens
                  {usage.cost !== null && (
                    <span> · ${usage.cost.toFixed(4)}</span>
                  )}
                </div>
              )}
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="h-8 text-xs border border-border rounded-lg px-2 py-1 bg-background text-foreground"
              >
                {MODEL_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <Button
                onClick={resetAll}
                title="Reset all messages and progress (debug)"
                variant="destructive"
              >
                Reset
              </Button>
            </div>
          )}
        </header>

        {/* Messages */}
        {loaded ? (
          <MessageList
            messages={messages}
            isLoading={isLoading}
            pendingConfirmations={pendingConfirmations}
            onConfirm={confirmProgress}
            onSuggestion={sendSuggestion}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Loading…</div>
          </div>
        )}

        {/* Error banner */}
        {error && error !== dismissedError && (
          <div className="flex items-center gap-3 px-4 py-3 mx-4 mb-2 rounded-lg border border-destructive/50 bg-destructive/10 text-sm">
            <span className="flex-1 min-w-0 truncate text-destructive">
              {error.message}
            </span>
            <Button size="sm" variant="outline" onClick={() => reload()}>
              Try again
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissedError(error)}
              className="p-0 text-muted-foreground hover:text-foreground hover:bg-transparent"
            >
              <X className="size-3" />
            </Button>
          </div>
        )}

        {/* Input */}
        <MessageInput
          input={input}
          onChange={handleInputChange}
          onSubmit={submitMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
