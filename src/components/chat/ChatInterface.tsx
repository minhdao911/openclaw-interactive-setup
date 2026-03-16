"use client";

import { ProgressSidebar } from "@/components/sidebar/ProgressSidebar";
import { useClawChat } from "@/hooks/useClawChat";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";

export function ChatInterface() {
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
  } = useClawChat();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Progress sidebar */}
      <ProgressSidebar />

      {/* Chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-5 py-3 border-b border-border shrink-0">
          <span className="text-lg">🦀</span>
          <div>
            <h1 className="font-semibold text-sm leading-tight">ClawPath</h1>
            <p className="text-xs text-muted-foreground leading-tight">
              Your OpenClaw setup guide
            </p>
          </div>
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
