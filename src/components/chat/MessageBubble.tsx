"use client";

import { cn } from "@/lib/utils";
import type { Message } from "ai";
import { Bot, Check, Copy, RefreshCw } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "../ui/button";

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
  message: Message;
  isLoading: boolean;
  onRegenerate: () => void;
}

export function MessageBubble({ message, isLoading, onRegenerate }: Props) {
  const isUser = message.role === "user";
  const imageAttachments = (message.experimental_attachments ?? []).filter(
    (a) => a.contentType?.startsWith("image/"),
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 w-full min-w-0",
        isUser ? "items-end" : "items-start",
      )}
    >
      <div
        className={cn(
          "flex w-full min-w-0",
          isUser ? "justify-end" : "justify-start",
        )}
      >
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
            <div className="space-y-2">
              {imageAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {imageAttachments.map((att, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={att.url}
                      alt={att.name ?? `image ${i + 1}`}
                      className="max-w-[200px] max-h-[200px] rounded-lg object-cover"
                    />
                  ))}
                </div>
              )}
              {message.content && (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
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
                    (children as React.ReactElement<{ children?: string }>)
                      ?.props?.children ?? "";
                  return (
                    <div className="relative my-2 max-w-full">
                      <pre className="bg-black/10 dark:bg-white/10 rounded-lg p-3 pr-9 overflow-x-auto font-mono text-xs max-w-full">
                        {children}
                      </pre>
                      <CopyButton text={String(text)} />
                    </div>
                  );
                },
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-4 mb-2 space-y-1">
                    {children}
                  </ol>
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
                  <thead className="bg-black/10 dark:bg-white/10">
                    {children}
                  </thead>
                ),
                tbody: ({ children }) => <tbody>{children}</tbody>,
                tr: ({ children }) => (
                  <tr className="border-b border-black/10 dark:border-white/10">
                    {children}
                  </tr>
                ),
                th: ({ children }) => (
                  <th className="px-3 py-1.5 text-left font-semibold">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-3 py-1.5">{children}</td>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
      </div>
      {isUser && (
        <Button
          variant="ghost"
          size="xs"
          onClick={onRegenerate}
          disabled={isLoading}
          aria-label="Regenerate"
          className="text-muted-foreground hover:text-foreground hover:bg-transparent"
        >
          <RefreshCw className="w-3 h-3" />
          Regenerate
        </Button>
      )}
    </div>
  );
}
