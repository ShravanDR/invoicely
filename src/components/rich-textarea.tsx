"use client";

import { useRef } from "react";
import { Bold, Italic, List } from "lucide-react";

interface RichTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function RichTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
}: RichTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function wrapSelection(before: string, after: string) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.substring(start, end);

    if (selected) {
      // Wrap selected text
      const newVal = value.substring(0, start) + before + selected + after + value.substring(end);
      onChange(newVal);
      // Restore cursor after the wrapped text
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + before.length, end + before.length);
      }, 0);
    } else {
      // Insert placeholder
      const placeholder = before + "text" + after;
      const newVal = value.substring(0, start) + placeholder + value.substring(end);
      onChange(newVal);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + before.length, start + before.length + 4);
      }, 0);
    }
  }

  function insertBullet() {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;

    // Find the start of the current line
    const beforeCursor = value.substring(0, start);
    const lineStart = beforeCursor.lastIndexOf("\n") + 1;
    const currentLine = value.substring(lineStart, start);

    if (currentLine.startsWith("- ")) {
      // Already a bullet — do nothing
      return;
    }

    // Add "- " at the start of the current line
    const newVal = value.substring(0, lineStart) + "- " + value.substring(lineStart);
    onChange(newVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + 2, start + 2);
    }, 0);
  }

  const btnClass =
    "rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors";

  return (
    <div>
      <div className="flex gap-0.5 mb-1.5">
        <button
          type="button"
          onClick={() => wrapSelection("**", "**")}
          className={btnClass}
          title="Bold (**text**)"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => wrapSelection("*", "*")}
          className={btnClass}
          title="Italic (*text*)"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={insertBullet}
          className={btnClass}
          title="Bullet point (- text)"
        >
          <List className="h-3.5 w-3.5" />
        </button>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />
    </div>
  );
}
