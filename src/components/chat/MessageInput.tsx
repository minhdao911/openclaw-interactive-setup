"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ImagePlus, SendHorizonal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Attachment {
  file: File;
  previewUrl: string;
}

interface Props {
  input: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.SyntheticEvent, files: File[]) => void;
  isLoading: boolean;
}

const LINE_HEIGHT = 20; // px, matches text-sm line-height
const MAX_ROWS = 5;

export function MessageInput({ input, onChange, onSubmit, isLoading }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = LINE_HEIGHT * MAX_ROWS + 16; // +16 for padding
    el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [input]);

  // Revoke all object URLs on unmount
  useEffect(() => {
    return () => attachments.forEach((a) => URL.revokeObjectURL(a.previewUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = (newFiles: File[]) => {
    const imageFiles = newFiles.filter((f) => f.type.startsWith("image/"));
    const newAttachments = imageFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  const handleFormSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;
    onSubmit(e, attachments.map((a) => a.file));
    attachments.forEach((a) => URL.revokeObjectURL(a.previewUrl));
    setAttachments([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  };

  const canSubmit = (input.trim().length > 0 || attachments.length > 0) && !isLoading;

  const handleContainerPaste = (e: React.ClipboardEvent) => {
    const imageFiles = Array.from(e.clipboardData.files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (imageFiles.length > 0) addFiles(imageFiles);
  };

  return (
    <div className="p-4">
      <div
        className="rounded-2xl border border-border bg-background shadow-sm"
        onPaste={handleContainerPaste}
      >
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {attachments.map((a, i) => (
              <div key={i} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.previewUrl}
                  alt={a.file.name}
                  className="h-16 w-16 rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-foreground text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <form
          ref={formRef}
          onSubmit={handleFormSubmit}
          className="flex items-center gap-2 px-2 py-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
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
            type="button"
            size="icon"
            variant="ghost"
            disabled={isLoading}
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
          >
            <ImagePlus className="w-4 h-4" />
          </Button>
          <Button
            type="submit"
            size="icon"
            disabled={!canSubmit}
            className={cn("shrink-0 h-8 w-8 rounded-full")}
          >
            <SendHorizonal className="w-4 h-4" />
          </Button>
        </form>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
        ClawPath only answers OpenClaw setup questions.
      </p>
    </div>
  );
}
