"use client";

import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  role: "user" | "assistant";
  content: string;
}

export function MessageBubble({ role, content }: Props) {
  const isUser = role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-neutral-200/60 flex items-center justify-center text-primary shrink-0">
          <Bot className="w-4 h-4" />
        </div>
      )}
      <div
        className={cn(
          "px-4 text-sm",
          isUser &&
            "max-w-[80%] rounded-2xl py-3 bg-primary text-primary-foreground rounded-br-sm",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: ({ className, children, ...props }) => {
                const isBlock = className?.includes("language-");
                if (isBlock)
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                return (
                  <code
                    className="bg-black/10 dark:bg-white/10 rounded px-1 py-0.5 font-mono text-xs"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => (
                <pre className="bg-black/10 dark:bg-white/10 rounded-lg p-3 overflow-x-auto my-2 font-mono text-xs">
                  {children}
                </pre>
              ),
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => (
                <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="leading-relaxed">{children}</li>
              ),
              h1: ({ children }) => (
                <h1 className="font-bold text-base mb-2">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="font-semibold mb-1">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="font-medium mb-1">{children}</h3>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-primary/30 pl-3 italic opacity-80 my-2">
                  {children}
                </blockquote>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
