"use client";

import { useState } from "react";
import { Shuffle, Sparkles, RefreshCw } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import type { Movie } from "@/lib/movie/types";
import { backdropUrl, posterUrl } from "@/lib/movie/types";
import { PosterImage } from "@/components/movie/PosterImage";
import { GenrePill } from "@/components/movie/GenrePill";
import { EmptyState } from "@/components/movie/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function RandomView() {
  const { t } = useI18n();
  const { goMovie } = useNav();
  const [nonce, setNonce] = useState(0);
  const { data: movie, loading } = useFetch<Movie>(`/api/random?n=${nonce}`);

  const pickAgain = () => setNonce((n) => n + 1);

  if (loading && !movie) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="p-4 md:p-6">
        <EmptyState
          icon={<Shuffle className="size-12" />}
          title={t("random_empty")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-end">
        <Button onClick={pickAgain} variant="outline">
          <RefreshCw className="size-4" />
          <span className="hidden sm:inline">{t("random_again")}</span>
        </Button>
      </div>

      {/* Featured random card */}
      <div className="relative overflow-hidden rounded-2xl border bg-card">
        {movie.backdrop ? (
          <img src={backdropUrl(movie.backdrop, "w1280") ?? undefined} alt="" className="absolute inset-0 size-full object-cover opacity-30" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/90 to-card/50" />
        <div className="relative flex flex-col gap-5 p-5 md:flex-row md:p-8">
          <div className="w-36 shrink-0 md:w-48">
            <div className="overflow-hidden rounded-xl shadow-2xl ring-1 ring-border">
              <PosterImage src={movie.poster} alt={movie.title} size="w500" className="aspect-[2/3]" />
            </div>
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5" />
                {t("random_title")}
              </div>
              <h2 className="text-2xl font-bold md:text-4xl">{movie.title}</h2>
              {movie.originalTitle && movie.originalTitle !== movie.title && (
                <p className="text-muted-foreground">{movie.originalTitle}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {movie.year && <span>{movie.year}</span>}
              {movie.runtime && <span>{movie.runtime} {t("movie_min")}</span>}
              {movie.director && <span>{t("movie_director")}: {movie.director}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {movie.genres.map((g) => <GenrePill key={g} name={g} />)}
            </div>
            {movie.overview && (
              <p className="line-clamp-4 text-sm text-muted-foreground md:text-base">{movie.overview}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={() => goMovie(movie.id)}>
                {t("nav_add")}
              </Button>
              <Button onClick={pickAgain} variant="outline">
                <RefreshCw className="size-4" />
                {t("random_again")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
