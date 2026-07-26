"use client";

import { useMemo, useState } from "react";
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
import { FilterBar, DEFAULT_FILTERS, type FilterState } from "@/components/movie/FilterBar";

export function GenreDetailView({ genreName }: { genreName: string }) {
  const { t } = useI18n();
  const { back, refreshTick } = useNav();
  const refreshTickVal = typeof refreshTick === "number" ? refreshTick : 0;
  const { data: movies, loading } = useFetch<Movie[]>(`/api/movies?genre=${encodeURIComponent(genreName)}`, [refreshTickVal]);
  const { data: recsData } = useFetch<{ items: Recommendation[] }>(
    `/api/recommendations?genre=${encodeURIComponent(genreName)}`
  );
  const [hideWatched, setHideWatched] = useState(true);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // Show ALL movies in this genre (from ALL statuses: watched, want, watchlist, new, watchedArchive, etc.)
  // Not just watched — movies from personal lists, collections, watched archive, etc. all appear here.
  const allGenreMovies = useMemo(() => movies ?? [], [movies]);

  // Derive filter option lists from the movies in this genre
  const { genres, countries, languages, directors, years, tags } = useMemo(() => {
    const g = new Set<string>();
    const c = new Set<string>();
    const l = new Set<string>();
    const d = new Set<string>();
    const y = new Set<number>();
    const tg = new Set<string>();
    for (const m of allGenreMovies) {
      m.genres.forEach((x) => g.add(x));
      if (m.country) c.add(m.country);
      if (m.language) l.add(m.language);
      if (m.director) d.add(m.director);
      if (m.year) y.add(m.year);
      m.tags.forEach((x) => tg.add(x));
    }
    return {
      genres: [...g].sort(),
      countries: [...c].sort(),
      languages: [...l].sort(),
      directors: [...d].sort(),
      years: [...y].sort((a, b) => b - a),
      tags: [...tg].sort(),
    };
  }, [allGenreMovies]);

  // Apply client-side filtering + sorting
  const filtered = useMemo(() => {
    let list = allGenreMovies.filter((m) => {
      if (filters.genre !== "all" && !m.genres.includes(filters.genre)) return false;
      if (filters.country !== "all" && m.country !== filters.country) return false;
      if (filters.language !== "all" && m.language !== filters.language) return false;
      if (filters.year !== "all" && String(m.year) !== filters.year) return false;
      if (filters.director !== "all" && m.director !== filters.director) return false;
      if (filters.tag !== "all" && !m.tags.includes(filters.tag)) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const hay = [m.title, m.originalTitle, m.director, m.cast.join(" "), m.genres.join(" "), m.country, m.language]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const dir = filters.order === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      switch (filters.sort) {
        case "watchDate":
          return ((a.watchDate ?? "") < (b.watchDate ?? "") ? -1 : 1) * dir;
        case "releaseYear":
          return ((a.year ?? 0) - (b.year ?? 0)) * dir;
        case "title":
          return a.title.localeCompare(b.title) * dir;
        case "rating":
          return ((a.personalRating ?? 0) - (b.personalRating ?? 0)) * dir;
        case "rank":
          return ((a.lifetimeRank ?? 9999) - (b.lifetimeRank ?? 9999)) * dir;
        case "added":
          return ((a.createdAt ?? "") < (b.createdAt ?? "") ? -1 : 1) * dir;
        default:
          return 0;
      }
    });
    return list;
  }, [allGenreMovies, filters]);

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
        <p className="text-muted-foreground">{t("genre_count", { count: allGenreMovies.length })}</p>
      </div>

      {/* All movies in this genre (from ALL lists/statuses) */}
      <section className="space-y-3">
        <SectionHeader title={`All "${genreName}" Movies`} icon={<Clapperboard className="size-4" />} />
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {allGenreMovies.length > 0 && (
              <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm -mx-4 px-4 py-2 md:-mx-6 md:px-6">
                <FilterBar
                  filters={filters}
                  onChange={setFilters}
                  genres={genres}
                  countries={countries}
                  languages={languages}
                  directors={directors}
                  years={years}
                  tags={tags}
                />
              </div>
            )}
            {filtered.length === 0 ? (
              <EmptyState title={t("watched_empty")} />
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {filtered.map((m) => (
                  <MovieCard key={m.id} movie={m} />
                ))}
              </div>
            )}
          </>
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
