"use client";

import { cn } from "@/lib/utils";
import { Bot, Check, Copy } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1 rounded bg-black/20 dark:bg-white/20 hover:bg-black/30 dark:hover:bg-white/30 text-current opacity-60 hover:opacity-100 transition-opacity"
      aria-label="Copy code"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

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
          "px-4 text-sm min-w-0",
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
              pre: ({ children }) => {
                const text =
                  (children as React.ReactElement<{ children?: string }>)?.props
                    ?.children ?? "";
                return (
                  <div className="relative my-2 max-w-full">
                    <pre className="bg-black/10 dark:bg-white/10 rounded-lg p-3 pr-9 overflow-x-auto font-mono text-xs max-w-full">
                      {children}
                    </pre>
                    <CopyButton text={String(text)} />
                  </div>
                );
              },
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
              hr: () => <hr className="my-4 border-border" />,
              table: ({ children }) => (
                <div className="overflow-x-auto my-2">
                  <table className="w-full border-collapse text-xs">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-black/10 dark:bg-white/10">{children}</thead>
              ),
              tbody: ({ children }) => <tbody>{children}</tbody>,
              tr: ({ children }) => (
                <tr className="border-b border-black/10 dark:border-white/10">
                  {children}
                </tr>
              ),
              th: ({ children }) => (
                <th className="px-3 py-1.5 text-left font-semibold">{children}</th>
              ),
              td: ({ children }) => (
                <td className="px-3 py-1.5">{children}</td>
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
