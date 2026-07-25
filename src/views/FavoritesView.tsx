"use client";

import { useState, useMemo } from "react";
import { Trophy, Plus } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import type { Movie } from "@/lib/movie/types";
import { RatingStars } from "@/components/movie/RatingStars";
import { RankBadge } from "@/components/movie/RankBadge";
import { EmptyState } from "@/components/movie/EmptyState";
import { PosterImage } from "@/components/movie/PosterImage";
import { AddMovieSearchDialog } from "@/components/movie/AddMovieSearchDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function FavoritesView() {
  const { t } = useI18n();
  const { goMovie, triggerRefresh } = useNav();
  const refreshTick = useNav((s) => s.refreshTick);
  const { data: movies, loading } = useFetch<Movie[]>("/api/movies?sort=rank&order=asc", [refreshTick]);
  const [addOpen, setAddOpen] = useState(false);

  const ranked = useMemo(
    () =>
      (movies ?? [])
        .filter((m) => m.lifetimeRank != null)
        .sort((a, b) => a.lifetimeRank! - b.lifetimeRank!),
    [movies]
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-end">
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          {t("nav_add")}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : ranked.length === 0 ? (
        <EmptyState
          icon={<Trophy className="size-12" />}
          title={t("favorites_empty")}
          action={<Button onClick={() => setAddOpen(true)}>{t("nav_add")}</Button>}
        />
      ) : (
        <div className="space-y-3">
          {ranked.map((m, i) => (
            <button
              key={m.id}
              onClick={() => goMovie(m.id)}
              className="group flex w-full items-center gap-4 overflow-hidden rounded-xl border bg-card p-3 text-left transition-all hover:border-primary/50 hover:shadow-lg md:p-4"
            >
              <div className="flex w-14 shrink-0 justify-center md:w-20">
                <span className={`font-black tabular-nums text-muted-foreground/30 ${i < 3 ? "text-3xl md:text-5xl" : "text-2xl md:text-4xl"}`}>
                  {m.lifetimeRank}
                </span>
              </div>
              <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg shadow md:h-28 md:w-20">
                <PosterImage src={m.poster} alt={m.title} size="w342" className="h-full w-full" />
                {i < 3 && (
                  <div className="absolute left-0 top-0 rounded-br-lg bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {i === 0 ? "GOLD" : i === 1 ? "SILVER" : "BRONZE"}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-bold">{m.title}</h3>
                <p className="text-sm text-muted-foreground">{m.year} · {m.director}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {m.genres.slice(0, 3).map((g) => (
                    <span key={g} className="rounded-full bg-muted px-2 py-0.5 text-xs">{g}</span>
                  ))}
                </div>
                <div className="mt-2">
                  <RatingStars value={m.personalRating} readOnly size="sm" />
                </div>
              </div>
              <div className="hidden shrink-0 md:block">
                <RankBadge rank={m.lifetimeRank!} size="lg" />
              </div>
            </button>
          ))}
        </div>
      )}

      <AddMovieSearchDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onMovieAdded={(movieId) => {
          triggerRefresh();
          goMovie(movieId);
        }}
      />
    </div>
  );
}
