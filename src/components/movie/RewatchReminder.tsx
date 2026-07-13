"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Clock, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import { posterUrl, type Movie } from "@/lib/movie/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TWO_YEARS_MS = 1000 * 60 * 60 * 24 * 365 * 2;

/** Returns true if a movie qualifies for the "Time to Rewatch" suggestion:
 *  - watched
 *  - watchDate more than 2 years ago
 *  - personalRating >= 8
 *  - rewatchCount < 3
 */
function qualifies(m: Movie, now: number): boolean {
  if (m.status !== "watched") return false;
  if (!m.watchDate) return false;
  const ts = new Date(m.watchDate).getTime();
  if (!Number.isFinite(ts)) return false;
  if (now - ts < TWO_YEARS_MS) return false;
  if (typeof m.personalRating !== "number" || m.personalRating < 8) return false;
  if (m.rewatchCount >= 3) return false;
  return true;
}

function yearsSince(dateStr: string): number {
  const then = new Date(dateStr).getTime();
  if (!Number.isFinite(then)) return 0;
  const diff = Date.now() - then;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24 * 365)));
}

export function RewatchReminder() {
  const { t } = useI18n();
  const { goMovie, refreshTick, triggerRefresh } = useNav();
  const { data, loading } = useFetch<Movie[]>(
    "/api/movies?status=watched&sort=watchDate&order=asc",
    [refreshTick]
  );

  const candidates = useMemo(() => {
    if (!data) return [];
    const now = Date.now();
    // Already sorted by watchDate ASC (oldest first), so first matches are the
    // oldest qualifying watches — those most "due" for a rewatch.
    return data.filter((m) => qualifies(m, now)).slice(0, 3);
  }, [data]);

  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  // Auto-rotate every 8 seconds when there are multiple candidates.
  useEffect(() => {
    if (candidates.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % candidates.length);
    }, 8000);
    return () => window.clearInterval(id);
  }, [candidates.length]);

  // Reset the index if it falls out of range (e.g. after refresh).
  useEffect(() => {
    if (index >= candidates.length) setIndex(0);
  }, [index, candidates.length]);

  if (loading && !data) {
    return (
      <Card className="overflow-hidden p-0">
        <Skeleton className="h-32 w-full rounded-none" />
      </Card>
    );
  }

  if (candidates.length === 0) return null;

  const movie = candidates[index];
  if (!movie) return null;

  const years = yearsSince(movie.watchDate ?? "");
  const poster = posterUrl(movie.poster, "w200");

  const handleWatchAgain = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`/api/movies/${movie.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rewatchCount: movie.rewatchCount + 1,
          watchDate: today,
        }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success(t("rewatch_watchAgain"));
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update movie");
    } finally {
      setBusy(false);
    }
  };

  const goPrev = () =>
    setIndex((i) => (i - 1 + candidates.length) % candidates.length);
  const goNext = () => setIndex((i) => (i + 1) % candidates.length);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-secondary/15 text-secondary">
            <RotateCcw className="size-4" />
          </span>
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold tracking-tight">
              {t("rewatch_title")}
            </h2>
            <p className="text-xs text-muted-foreground">{t("rewatch_subtitle")}</p>
          </div>
        </div>
        {candidates.length > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="size-8"
              onClick={goPrev}
              aria-label="Previous"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[3ch] text-center text-xs text-muted-foreground">
              {index + 1}/{candidates.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="size-8"
              onClick={goNext}
              aria-label="Next"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex gap-0">
          {/* Poster */}
          <button
            type="button"
            onClick={() => goMovie(movie.id)}
            className="group relative shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${movie.title} — open details`}
          >
            {poster ? (
              <img
                src={poster}
                alt={movie.title}
                className="h-32 w-24 object-cover transition-transform group-hover:scale-[1.03] md:h-36 md:w-28"
              />
            ) : (
              <div className="flex h-32 w-24 items-center justify-center bg-muted text-xs text-muted-foreground md:h-36 md:w-28">
                {t("no_poster")}
              </div>
            )}
          </button>

          {/* Info */}
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 p-4">
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => goMovie(movie.id)}
                className="block max-w-full truncate text-left text-base font-semibold tracking-tight hover:text-primary"
                title={movie.title}
              >
                {movie.title}
              </button>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {t("rewatch_yearsAgo", { years })}
                </span>
                {typeof movie.personalRating === "number" && (
                  <span className="flex items-center gap-1 text-secondary">
                    <Star className="size-3 fill-current" />
                    {movie.personalRating.toFixed(1)}
                  </span>
                )}
                {movie.rewatchCount > 0 && (
                  <span className="text-muted-foreground">
                    {movie.rewatchCount}× {t("movie_rewatch").toLowerCase()}
                  </span>
                )}
              </div>
              {movie.director && (
                <p className="truncate text-xs text-muted-foreground">
                  {movie.director}
                </p>
              )}
            </div>

            <Button
              type="button"
              size="sm"
              className={cn("w-fit")}
              onClick={handleWatchAgain}
              disabled={busy}
            >
              <RotateCcw className={cn("size-4", busy && "animate-spin")} />
              {t("rewatch_watchAgain")}
            </Button>
          </div>
        </div>
      </Card>
    </section>
  );
}
