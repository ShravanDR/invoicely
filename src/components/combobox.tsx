"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  addNewLabel?: string;
  onAddNew?: () => void;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className,
  addNewLabel,
  onAddNew,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label || "";

  const filtered = query
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  function select(val: string) {
    onChange(val);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className={cn("relative", className)} ref={triggerRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-xl border bg-white px-3.5 py-2.5 text-sm text-left hover:bg-accent/30 transition-colors"
      >
        <span className={selectedLabel ? "text-foreground" : "text-muted-foreground/60"}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2" />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={popupRef}
          className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border bg-white shadow-lg ring-1 ring-black/[0.04] overflow-hidden"
        >
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full text-sm outline-none bg-transparent placeholder:text-muted-foreground/50"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setOpen(false);
                  setQuery("");
                }
                if (e.key === "Enter" && filtered.length === 1) {
                  select(filtered[0].value);
                }
              }}
            />
          </div>

          {/* Options */}
          <div className="max-h-[200px] overflow-y-auto py-1">
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => select(o.value)}
                className={cn(
                  "flex w-full items-center px-3.5 py-2 text-sm text-left transition-colors",
                  o.value === value
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-accent"
                )}
              >
                {o.label}
              </button>
            ))}
            {filtered.length === 0 && !onAddNew && (
              <p className="px-3.5 py-3 text-xs text-muted-foreground text-center">
                No matches
              </p>
            )}
          </div>
          {onAddNew && (
            <button
              type="button"
              onClick={() => { setOpen(false); setQuery(""); onAddNew(); }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-primary border-t hover:bg-accent/50 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              {addNewLabel || "Add new"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
