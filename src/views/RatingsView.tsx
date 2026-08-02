"use client";

import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import type { Movie } from "@/lib/movie/types";
import { RatingStars } from "@/components/movie/RatingStars";
import { EmptyState } from "@/components/movie/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { PosterImage } from "@/components/movie/PosterImage";
import { FilterBar, DEFAULT_FILTERS_RATING, type FilterState } from "@/components/movie/FilterBar";

export function RatingsView() {
  const { t } = useI18n();
  const { goMovie } = useNav();
  const refreshTick = useNav((s) => s.refreshTick);
  // Fetch ALL movies (not just watched) so any rated movie appears in My Ratings
  const { data: movies, loading } = useFetch<Movie[]>("/api/movies", [refreshTick]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS_RATING);

  // Filter to only rated movies
  const rated = useMemo(
    () => (movies ?? []).filter((m) => m.personalRating != null),
    [movies]
  );

  // Derive filter option lists from rated movies
  const { genres, countries, languages, directors, years, tags } = useMemo(() => {
    const g = new Set<string>();
    const c = new Set<string>();
    const l = new Set<string>();
    const d = new Set<string>();
    const y = new Set<number>();
    const tg = new Set<string>();
    for (const m of rated) {
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
  }, [rated]);

  // Apply client-side filtering + sorting
  const filtered = useMemo(() => {
    let list = rated.filter((m) => {
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
        case "rating":
          return ((a.personalRating ?? 0) - (b.personalRating ?? 0)) * dir;
        case "releaseYear":
          return ((a.year ?? 0) - (b.year ?? 0)) * dir;
        case "title":
          return a.title.localeCompare(b.title) * dir;
        case "rank":
          return ((a.lifetimeRank ?? 9999) - (b.lifetimeRank ?? 9999)) * dir;
        case "added":
          return ((a.createdAt ?? "") < (b.createdAt ?? "") ? -1 : 1) * dir;
        case "watchDate":
          return ((a.watchDate ?? "") < (b.watchDate ?? "") ? -1 : 1) * dir;
        default:
          return ((a.personalRating ?? 0) - (b.personalRating ?? 0)) * dir;
      }
    });
    return list;
  }, [rated, filters]);

  return (
    <div className="space-y-4 p-4 md:p-6">
      {rated.length > 0 && (
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

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Star className="size-12" />} title={t("ratings_empty")} />
      ) : (
        <div className="space-y-2">
          {filtered.map((m, i) => (
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
