"use client";

import { PROGRESS_SECTIONS } from "@/lib/progress-sections";

export function ProgressSidebar() {
  return (
    <aside className="w-72 shrink-0 border-l border-border flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="font-semibold text-sm">Checkpoints</h2>
      </div>

      {/* Sections list */}
      <div className="flex-1 overflow-y-auto">
        {PROGRESS_SECTIONS.map((section, index) => (
          <div key={section.id} className="px-4 py-2.5">
            <p className="text-sm leading-tight">
              {index + 1}. {section.label}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {section.description}
            </p>
          </div>
        ))}
      </div>
    </aside>
  );
}
