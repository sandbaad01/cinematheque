"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import type { Movie } from "@/lib/movie/types";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import { cn } from "@/lib/utils";

interface QuickStatusToggleProps {
  movie: Movie;
  className?: string;
}

/**
 * A small hover-revealed button shown on movie cards.
 * Marks a "want" movie as "watched" with today's watch date,
 * without opening the detail page.
 */
export function QuickStatusToggle({ movie, className }: QuickStatusToggleProps) {
  const { t } = useI18n();
  const triggerRefresh = useNav((s) => s.triggerRefresh);
  const [busy, setBusy] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`/api/movies/${movie.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "watched", watchDate: today }),
      });
      if (!res.ok) {
        throw new Error(`Update failed: ${res.status}`);
      }
      toast.success(t("rec_markedWatched"));
      triggerRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      aria-label={t("rec_markedWatched")}
      title={t("rec_markedWatched")}
      disabled={busy}
      onClick={handleClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-full",
        "bg-background/85 text-primary shadow-sm backdrop-blur-sm",
        "opacity-0 transition-opacity duration-200 group-hover:opacity-100",
        "hover:bg-primary hover:text-primary-foreground",
        "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        busy && "opacity-100 animate-pulse",
        className
      )}
    >
      <Check className="size-4" fill="currentColor" />
    </button>
  );
}
