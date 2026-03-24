"use client";

import { db } from "@/lib/db/schema";
import type { DbConversation } from "@/types";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

function groupByDate(conversations: DbConversation[]) {
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();
  const yesterdayMs = todayMs - 86400000;

  const groups: { label: string; items: DbConversation[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Older", items: [] },
  ];

  for (const conv of conversations) {
    if (conv.updatedAt >= todayMs) groups[0].items.push(conv);
    else if (conv.updatedAt >= yesterdayMs) groups[1].items.push(conv);
    else groups[2].items.push(conv);
  }

  return groups.filter((g) => g.items.length > 0);
}

export function ChatSidebar({ activeId, onSelect, onCreate, onDelete }: Props) {
  const conversations = useLiveQuery(
    () => db.conversation.orderBy("updatedAt").reverse().toArray(),
    [],
  );

  const groups = conversations ? groupByDate(conversations) : [];

  return (
    <aside className="w-64 shrink-0 flex flex-col h-full border-r border-border bg-muted/30">
      {/* New Chat button */}
      <div className="p-3 shrink-0">
        <button
          onClick={onCreate}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-foreground text-background text-sm font-medium py-2.5 px-4 hover:opacity-90 transition-opacity"
        >
          <Plus className="size-4" />
          New Chat
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {groups.map((group) => (
          <div key={group.label} className="mb-1">
            <p className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
              {group.label}
            </p>
            {group.items.map((conv) => (
              <div
                key={conv.id}
                className={`group relative flex items-center rounded-lg px-2 py-2 cursor-pointer text-sm transition-colors ${
                  conv.id === activeId
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
                onClick={() => onSelect(conv.id)}
              >
                <span className="flex-1 min-w-0 truncate">
                  {conv.title || "New Chat"}
                </span>
                <button
                  className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded hover:text-destructive transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ))}
        {conversations?.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No chats yet
          </p>
        )}
      </div>
    </aside>
  );
}
