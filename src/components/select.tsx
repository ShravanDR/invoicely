"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <div className="relative inline-flex">
      <select
        {...props}
        className={cn(
          "appearance-none rounded-full border bg-white pl-4 pr-9 py-2 text-sm font-medium cursor-pointer",
          "hover:bg-accent/50 transition-colors",
          className
        )}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
    </div>
  );
}
