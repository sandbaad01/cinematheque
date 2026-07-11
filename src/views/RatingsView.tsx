"use client";

import { useMemo } from "react";
import { Star } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import type { Movie } from "@/lib/movie/types";
import { RatingStars } from "@/components/movie/RatingStars";
import { EmptyState } from "@/components/movie/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { PosterImage } from "@/components/movie/PosterImage";

export function RatingsView() {
  const { t } = useI18n();
  const { goMovie } = useNav();
  const { data: movies, loading } = useFetch<Movie[]>("/api/movies?status=watched&sort=rating&order=desc");

  const rated = useMemo(
    () =>
      (movies ?? [])
        .filter((m) => m.personalRating != null)
        .sort((a, b) => (b.personalRating! - a.personalRating!)),
    [movies]
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t("ratings_title")}</h1>
        <p className="text-muted-foreground">{t("ratings_subtitle")}</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : rated.length === 0 ? (
        <EmptyState icon={<Star className="size-12" />} title={t("ratings_empty")} />
      ) : (
        <div className="space-y-2">
          {rated.map((m, i) => (
            <button
              key={m.id}
              onClick={() => goMovie(m.id)}
              className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent"
            >
              <span className="w-6 text-center text-lg font-bold text-muted-foreground">{i + 1}</span>
              <div className="h-16 w-12 shrink-0 overflow-hidden rounded">
                <PosterImage src={m.poster} alt={m.title} size="w200" className="h-full w-full" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.title}</p>
                <p className="text-xs text-muted-foreground">{m.year} · {m.director}</p>
                <div className="mt-1">
                  <RatingStars value={m.personalRating} readOnly size="sm" />
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="flex items-center gap-1 text-2xl font-bold text-primary">
                  <Star className="size-5 fill-primary" />
                  {m.personalRating!.toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground">/ 10</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
