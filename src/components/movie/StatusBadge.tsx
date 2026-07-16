"use client";

import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import type { MovieStatus } from "@/lib/movie/types";

interface StatusBadgeProps {
  status: MovieStatus;
  className?: string;
}

const styles: Record<MovieStatus, string> = {
  watched:
    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  want: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  watchlist: "bg-primary/15 text-primary border-primary/30",
  watching: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  dropped: "bg-rose-500/10 text-rose-400 border-rose-500/25",
  new: "bg-muted text-muted-foreground border-border",
};

const dotColor: Record<MovieStatus, string> = {
  watched: "bg-emerald-400",
  want: "bg-amber-400",
  watchlist: "bg-primary",
  watching: "bg-teal-400",
  dropped: "bg-rose-400",
  new: "bg-muted-foreground",
};

const labelKey: Record<MovieStatus, string> = {
  watched: "status_watched",
  want: "nav_wantToWatch",
  watchlist: "nav_watchlist",
  watching: "status_watching",
  dropped: "status_dropped",
  new: "none",
};

/** A colored pill with a tiny dot that shows watch status. */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useI18n();
  if (status === "new") return null; // Don't show badge for movies not in archive
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        styles[status],
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", dotColor[status])} />
      {t(labelKey[status])}
    </span>
  );
}
