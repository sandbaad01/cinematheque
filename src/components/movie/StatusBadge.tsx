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
  want: "bg-primary/15 text-primary border-primary/30",
  watching: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  dropped: "bg-rose-500/10 text-rose-400 border-rose-500/25",
};

const dotColor: Record<MovieStatus, string> = {
  watched: "bg-emerald-400",
  want: "bg-primary",
  watching: "bg-teal-400",
  dropped: "bg-rose-400",
};

/** A colored pill with a tiny dot that shows watch status. */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        styles[status],
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", dotColor[status])} />
      {t("status_" + status)}
    </span>
  );
}
