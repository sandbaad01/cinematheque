"use client";

import { useMemo } from "react";
import { ArrowLeft, Clapperboard, Sparkles, EyeOff } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import type { Movie, Recommendation } from "@/lib/movie/types";
import { MovieCard } from "@/components/movie/MovieCard";
import { SectionHeader } from "@/components/movie/SectionHeader";
import { EmptyState } from "@/components/movie/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export function GenreDetailView({ genreName }: { genreName: string }) {
  const { t } = useI18n();
  const { back } = useNav();
  const { data: movies, loading } = useFetch<Movie[]>(`/api/movies?genre=${encodeURIComponent(genreName)}`);
  const { data: recsData } = useFetch<{ items: Recommendation[] }>(
    `/api/recommendations?genre=${encodeURIComponent(genreName)}`
  );
  const [hideWatched, setHideWatched] = useState(true);

  const watched = useMemo(
    () => (movies ?? []).filter((m) => m.status === "watched"),
    [movies]
  );

  // sort watched by watchDate desc
  const watchedSorted = useMemo(
    () => [...watched].sort((a, b) => (b.watchDate ?? "").localeCompare(a.watchDate ?? "")),
    [watched]
  );

  const recs = (recsData?.items ?? []).filter((r) =>
    hideWatched ? r.movie.status !== "watched" : true
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={back}>
          <ArrowLeft className="size-4" />
          {t("action_back")}
        </Button>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <Clapperboard className="size-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{genreName}</h1>
        </div>
        <p className="text-muted-foreground">{t("genre_count", { count: watched.length })}</p>
      </div>

      {/* Watched in genre */}
      <section className="space-y-3">
        <SectionHeader title={t("genre_watched", { genre: genreName })} icon={<Clapperboard className="size-4" />} />
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
            ))}
          </div>
        ) : watchedSorted.length === 0 ? (
          <EmptyState title={t("watched_empty")} />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {watchedSorted.map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
        )}
      </section>

      {/* Recommended in genre */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionHeader title={t("genre_recommended", { genre: genreName })} icon={<Sparkles className="size-4 text-primary" />} />
          <Button variant="outline" size="sm" onClick={() => setHideWatched((v) => !v)}>
            <EyeOff className="size-4" />
            {hideWatched ? t("action_showWatched") : t("action_hideWatched")}
          </Button>
        </div>
        {recs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("rec_noUnwatched")}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {recs.slice(0, 12).map((r) => (
                <MovieCard key={r.movie.id} movie={r.movie} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
