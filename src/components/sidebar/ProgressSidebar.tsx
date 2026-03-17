"use client";

import { useProgress } from "@/hooks/useProgress";
import { cn } from "@/lib/utils";
import type { ProgressStatus } from "@/types";
import { CheckCircle } from "lucide-react";

function StatusIcon({
  status,
  onClick,
}: {
  status: ProgressStatus;
  onClick: () => void;
}) {
  const title =
    status === "not_started"
      ? "Click to mark in progress"
      : status === "in_progress"
        ? "Click to mark done"
        : "Click to reset";

  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all hover:scale-110",
        status === "not_started" && "border-muted-foreground/30 bg-transparent",
        status === "in_progress" && "border-amber-500 bg-amber-500/20",
        status === "done" && "border-green-500 bg-green-500",
      )}
    >
      {status === "done" && (
        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
          <path
            d="M2 6l3 3 5-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {status === "in_progress" && (
        <div className="w-2 h-2 rounded-full bg-amber-500" />
      )}
    </button>
  );
}

export function ProgressSidebar() {
  const { progress, cycleProgress } = useProgress();

  const doneCount = progress.filter((p) => p.status === "done").length;
  const totalCount = progress.length;

  return (
    <aside className="w-72 shrink-0 border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border">
        <h2 className="font-semibold text-sm">Setup Progress</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {doneCount} of {totalCount} sections complete
        </p>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${(doneCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Sections list */}
      <div className="flex-1 overflow-y-auto py-2">
        {progress.map((section) => (
          <div key={section.id} className="px-4 py-2.5">
            <div className="flex items-start gap-3">
              <StatusIcon
                status={section.status}
                onClick={() => cycleProgress(section.id)}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium leading-tight",
                    section.status === "done" &&
                      "text-muted-foreground line-through",
                  )}
                >
                  {section.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {section.description}
                </p>
                {section.notes && (
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle className="w-3 h-3" />
                    <p className="text-xs text-primary font-medium">
                      {section.notes}
                    </p>
                  </div>
                )}

                {/* Use case cards for first-usecase section */}
                {/* {section.id === 'first-usecase' && section.useCases && section.status !== 'done' && (
                  <div className="mt-2 space-y-1.5">
                    {section.useCases.map((uc) => (
                      <div
                        key={uc.title}
                        className="bg-muted/50 rounded-lg px-2.5 py-2 border border-border/50"
                      >
                        <p className="text-xs font-medium">{uc.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          {uc.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )} */}
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
