"use client";

import type { Message } from "ai";
import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";

interface Props {
  messages: Message[];
  isLoading: boolean;
  onSuggestion: (text: string) => void;
  onRegenerate: (messageIndex: number) => void;
}

function WelcomeMessage({
  onSuggestion,
}: {
  onSuggestion: (text: string) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-4">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
        🦀
      </div>
      <div>
        <h2 className="font-semibold text-lg mb-1">Welcome to ClawPath</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          I&apos;ll guide you through setting up OpenClaw step by step.
          <br />
          What are you trying to set up, or where are you starting from?
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center mt-2">
        {[
          "I'm starting from scratch",
          "I need help with installation",
          "I want to set up a Telegram bot",
          "I'm having trouble with my gateway",
        ].map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestion(suggestion)}
            className="text-xs border border-border rounded-full px-3 py-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MessageList({ messages, isLoading, onSuggestion, onRegenerate }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.length === 0 ? (
        <WelcomeMessage onSuggestion={onSuggestion} />
      ) : (
        <div className="px-4 py-4 space-y-8">
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isLoading={isLoading}
              onRegenerate={() => onRegenerate(index)}
            />
          ))}
          {isLoading && (
            <div className="flex justify-start gap-4">
              <div className="w-7 h-7 shrink-0" />
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
