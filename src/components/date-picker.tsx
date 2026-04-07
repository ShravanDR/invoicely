"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
}

const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function DatePicker({ value, onChange, className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    return value ? new Date(value + "T00:00:00") : new Date();
  });
  const popupRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Sync viewDate when value changes externally
  useEffect(() => {
    if (value) setViewDate(new Date(value + "T00:00:00"));
  }, [value]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  // Build calendar grid
  const days: { day: number; iso: string | null; isOther: boolean; isToday: boolean; isSelected: boolean }[] = [];

  // Previous month fill
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: prevMonthDays - i, iso: null, isOther: true, isToday: false, isSelected: false });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dt = new Date(year, month, d);
    days.push({
      day: d,
      iso,
      isOther: false,
      isToday: dt.getTime() === today.getTime(),
      isSelected: iso === value,
    });
  }
  // Next month fill
  const remaining = days.length % 7 === 0 ? 0 : 7 - (days.length % 7);
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, iso: null, isOther: true, isToday: false, isSelected: false });
  }

  function navigate(dir: number) {
    setViewDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + dir);
      return next;
    });
  }

  function selectDate(iso: string) {
    onChange(iso);
    setOpen(false);
  }

  // Format display value
  const displayValue = value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Pick a date";

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-sm text-left hover:bg-accent/30 transition-colors"
      >
        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className={value ? "text-foreground" : "text-muted-foreground/60"}>
          {displayValue}
        </span>
      </button>

      {open && (
        <div
          ref={popupRef}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 w-[240px] rounded-2xl border bg-white p-3 shadow-lg ring-1 ring-black/[0.04]"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="font-serif text-xs font-bold text-foreground">
              {MONTHS[month]} {year}
            </span>
            <div className="flex gap-0.5">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => navigate(1)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Day-of-week labels */}
          <div className="grid grid-cols-7 gap-0 mb-1">
            {DOW.map((d, i) => (
              <span
                key={i}
                className="text-center text-[9px] font-semibold uppercase text-muted-foreground/60 py-1"
              >
                {d}
              </span>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0">
            {days.map((d, i) => (
              <button
                key={i}
                type="button"
                disabled={d.isOther}
                onClick={() => d.iso && selectDate(d.iso)}
                className={cn(
                  "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[11px] transition-colors",
                  d.isOther && "text-muted-foreground/25 cursor-default",
                  !d.isOther && !d.isSelected && "text-foreground hover:bg-accent cursor-pointer",
                  d.isToday && !d.isSelected && "ring-1 ring-muted-foreground/40",
                  d.isSelected && "bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                )}
              >
                {d.day}
              </button>
            ))}
          </div>

          {/* Clear */}
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="mt-2 block w-full text-center text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear date
            </button>
          )}
        </div>
      )}
    </div>
  );
}
