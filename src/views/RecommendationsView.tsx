"use client";

import { Sparkles, Eye, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import type { Recommendation } from "@/lib/movie/types";
import { MovieCard } from "@/components/movie/MovieCard";
import { EmptyState } from "@/components/movie/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DECADES = ["1950", "1960", "1970", "1980", "1990", "2000", "2010", "2020"] as const;
const MIN_RATINGS = ["6", "7", "8"] as const;

function decadeOf(year: number | null | undefined): number | null {
  if (!year) return null;
  return Math.floor(year / 10) * 10;
}

export function RecommendationsView() {
  const { t } = useI18n();
  const [hideWatched, setHideWatched] = useState(true);
  const [decade, setDecade] = useState<string>("all");
  const [country, setCountry] = useState<string>("all");
  const [minRating, setMinRating] = useState<string>("all");

  const { data: recsData, loading } = useFetch<{ items: Recommendation[] }>(
    "/api/recommendations"
  );

  const allRecs = recsData?.items ?? [];

  // Derive available countries from the (unfiltered) recommendation results.
  const countries = useMemo(() => {
    const set = new Set<string>();
    for (const r of allRecs) {
      const c = r.movie.country;
      if (c && c.trim()) set.add(c.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allRecs]);

  // Apply all client-side filters.
  const recs = useMemo(() => {
    return allRecs.filter((r) => {
      const m = r.movie;
      if (hideWatched && m.status === "watched") return false;
      if (decade !== "all") {
        const d = decadeOf(m.year);
        if (d === null || String(d) !== decade) return false;
      }
      if (country !== "all") {
        if (!m.country || m.country.trim() !== country) return false;
      }
      if (minRating !== "all") {
        const rating = m.tmdbRating ?? m.imdbRating;
        if (rating === null || rating < Number(minRating)) return false;
      }
      return true;
    });
  }, [allRecs, hideWatched, decade, country, minRating]);

  const hasActiveFilters = decade !== "all" || country !== "all" || minRating !== "all";

  function clearFilters() {
    setDecade("all");
    setCountry("all");
    setMinRating("all");
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {recs.length} {t("movies")}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {/* Decade filter */}
          <Select value={decade} onValueChange={setDecade}>
            <SelectTrigger size="sm" className="w-[120px]">
              <SelectValue placeholder={t("rec_filterDecade")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("status_all")}</SelectItem>
              {DECADES.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}s
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Country filter */}
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger size="sm" className="w-[140px]">
              <SelectValue placeholder={t("rec_filterCountry")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("status_all")}</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Min rating filter */}
          <Select value={minRating} onValueChange={setMinRating}>
            <SelectTrigger size="sm" className="w-[130px]">
              <SelectValue placeholder={t("rec_minRating")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("status_all")}</SelectItem>
              {MIN_RATINGS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}+
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              {t("filters_clear")}
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={() => setHideWatched((v) => !v)}>
            {hideWatched ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            <span className="hidden sm:inline">
              {hideWatched ? t("action_showWatched") : t("action_hideWatched")}
            </span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
          ))}
        </div>
      ) : recs.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="size-12" />}
          title={t("rec_noUnwatched")}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {recs.map((r) => (
              <MovieCard key={r.movie.id} movie={r.movie} />
            ))}
          </div>

          {/* Why recommended — show for first 12 */}
          <div className="mt-6 space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">{t("rec_why")}</h3>
            {recs.slice(0, 12).map((r) => (
              <div
                key={r.movie.id}
                className="flex items-start gap-2 rounded-lg border bg-card/50 p-3 text-xs"
              >
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span className="text-muted-foreground">
                  <span className="font-medium text-foreground">{r.movie.title}</span>
                  {" — "}
                  {r.reason}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
