"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { SendHorizonal } from "lucide-react";
import { useEffect, useRef } from "react";

interface Props {
  input: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

const LINE_HEIGHT = 20; // px, matches text-sm line-height
const MAX_ROWS = 5;

export function MessageInput({ input, onChange, onSubmit, isLoading }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = LINE_HEIGHT * MAX_ROWS + 16; // +16 for padding
    el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  return (
    <div className="p-4">
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="flex items-center gap-2 rounded-2xl border border-border bg-background px-2 py-2 shadow-sm"
      >
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask about OpenClaw setup…"
          className="min-h-[28px] resize-none text-sm border-none shadow-none focus-visible:ring-0 flex-1 bg-transparent overflow-hidden"
          rows={1}
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || !input.trim()}
          className={cn("shrink-0 h-8 w-8 rounded-full")}
        >
          <SendHorizonal className="w-4 h-4" />
        </Button>
      </form>
      <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
        ClawPath only answers OpenClaw setup questions.
      </p>
    </div>
  );
}
