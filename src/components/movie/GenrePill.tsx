"use client";

import { cn } from "@/lib/utils";

interface GenrePillProps {
  name: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

/** A clickable genre pill — primary when active, muted when not. */
export function GenrePill({ name, active, onClick, className }: GenrePillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-foreground",
        className
      )}
    >
      {name}
    </button>
  );
}
