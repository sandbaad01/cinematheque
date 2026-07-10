"use client";

import { useMemo } from "react";
import { Clock } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import type { Movie } from "@/lib/movie/types";
import { PosterImage } from "@/components/movie/PosterImage";
import { RatingStars } from "@/components/movie/RatingStars";
import { EmptyState } from "@/components/movie/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

export function LastWatchedView() {
  const { t } = useI18n();
  const { goMovie } = useNav();
  const { data: movies, loading } = useFetch<Movie[]>("/api/movies?status=watched&sort=watchDate&order=desc");

  const recent = useMemo(() => (movies ?? []).slice(0, 50), [movies]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
          <Clock className="size-7 text-primary" />
          {t("lastWatched_title")}
        </h1>
        <p className="text-muted-foreground">{t("lastWatched_subtitle")}</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <EmptyState icon={<Clock className="size-12" />} title={t("watched_empty")} />
      ) : (
        <div className="space-y-2">
          {recent.map((m, i) => (
            <button
              key={m.id}
              onClick={() => goMovie(m.id)}
              className="flex w-full items-center gap-3 rounded-lg border bg-card p-2.5 text-left transition-colors hover:bg-accent"
            >
              <span className="w-6 text-center text-sm text-muted-foreground/50">{i + 1}</span>
              <div className="h-16 w-11 shrink-0 overflow-hidden rounded">
                <PosterImage src={m.poster} alt={m.title} size="w200" className="h-full w-full" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.title}</p>
                <p className="text-xs text-muted-foreground">{m.year} · {m.director}</p>
              </div>
              <div className="hidden shrink-0 text-right sm:block">
                {m.watchDate && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.watchDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                )}
                {m.personalRating != null && (
                  <RatingStars value={m.personalRating} readOnly size="sm" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
