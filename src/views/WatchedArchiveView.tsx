"use client";

import { useMemo, useState } from "react";
import { Film } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import type { Movie } from "@/lib/movie/types";
import { MovieCard } from "@/components/movie/MovieCard";
import { FilterBar, DEFAULT_FILTERS_YEAR, type FilterState } from "@/components/movie/FilterBar";
import { EmptyState } from "@/components/movie/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

export function WatchedArchiveView() {
  const { t } = useI18n();
  const refreshTick = useNav((s) => s.refreshTick);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS_YEAR);
  // Show ALL watched movies (both "watched" and "watchedArchive" statuses)
  // This is the complete archive of everything the user has ever watched
  const { data: allMovies, loading } = useFetch<Movie[]>("/api/movies", [refreshTick]);
  const movies = useMemo(
    () => (allMovies ?? []).filter((m) => m.status === "watched" || m.status === "watchedArchive"),
    [allMovies]
  );

  const { genres, countries, languages, directors, years, tags } = useMemo(() => {
    const g = new Set<string>();
    const c = new Set<string>();
    const l = new Set<string>();
    const d = new Set<string>();
    const y = new Set<number>();
    const tg = new Set<string>();
    for (const m of movies ?? []) {
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
  }, [movies]);

  const filtered = useMemo(() => {
    let list = (movies ?? []).filter((m) => {
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
  }, [movies, filters]);

  return (
    <div className="space-y-4 p-4 md:p-6">
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

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Film className="size-12" />} title={t("watched_empty")} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filtered.map((m) => (
            <MovieCard key={m.id} movie={m} />
          ))}
        </div>
      )}
    </div>
  );
}
