"use client";

import { Film, Star, Heart, Calendar, TrendingUp, Clapperboard, Sparkles, ArrowRight, Clock } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import type { Movie, Recommendation } from "@/lib/movie/types";
import { MovieRow } from "@/components/movie/MovieRow";
import { EmptyState } from "@/components/movie/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  totalWatched: number;
  totalMovies: number;
  thisYear: number;
  thisMonth: number;
  favorites: number;
  topGenres: { name: string; count: number }[];
  topDirectors: { name: string; count: number }[];
  latestWatched: Movie[];
  recentlyAdded: Movie[];
  avgRating: number | null;
  totalRuntime: number;
}

export function HomeView() {
  const { t } = useI18n();
  const { go, goGenre, go: goView, refreshTick } = useNav();
  const { data: stats, loading } = useFetch<Stats>("/api/stats", [refreshTick]);
  const { data: recsData } = useFetch<{ items: Recommendation[] }>("/api/recommendations", [refreshTick]);

  if (loading && !stats) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (stats && stats.totalMovies === 0) {
    return (
      <EmptyState
        icon={<Film className="size-12" />}
        title={t("home_empty")}
        action={<Button onClick={() => go("watched")}>{t("home_empty_cta")}</Button>}
      />
    );
  }

  const recs = recsData?.items ?? [];
  const hours = stats ? Math.round((stats.totalRuntime / 60) * 10) / 10 : 0;

  return (
    <div className="space-y-8 p-4 md:p-6">
      {/* 1. Latest Watched — TOP */}
      <MovieRow
        title={t("home_latest")}
        icon={<Clock />}
        movies={stats?.latestWatched ?? []}
        action={
          <Button variant="ghost" size="sm" onClick={() => go("lastWatched")}>
            {t("nav_lastWatched")}
            <ArrowRight className="size-4" />
          </Button>
        }
      />

      {/* 2. Stats + Favorite Genres + Favorite Directors — BOTTOM */}
      <div className="space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          <StatCard icon={Film} label={t("home_stat_total")} value={stats?.totalWatched ?? 0} accent />
          <StatCard icon={Calendar} label={t("home_stat_thisYear")} value={stats?.thisYear ?? 0} />
          <StatCard icon={Calendar} label={t("home_stat_thisMonth")} value={stats?.thisMonth ?? 0} />
          <StatCard icon={Heart} label={t("home_stat_favorites")} value={stats?.favorites ?? 0} />
          <StatCard icon={TrendingUp} label={t("rated")} value={stats?.avgRating ? stats.avgRating.toFixed(1) : "—"} />
        </div>

        {/* Top genres + directors */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Clapperboard className="size-4 text-primary" />
              <h3 className="font-semibold">{t("home_topGenres")}</h3>
            </div>
            <div className="space-y-2">
              {(stats?.topGenres ?? []).map((g, i) => {
                const max = stats?.topGenres[0]?.count ?? 1;
                return (
                  <button
                    key={g.name}
                    onClick={() => goGenre(g.name)}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <span className="w-5 text-sm text-muted-foreground">{i + 1}</span>
                    <span className="w-28 shrink-0 truncate text-sm font-medium">{g.name}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(g.count / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs text-muted-foreground">{g.count}</span>
                  </button>
                );
              })}
              {(stats?.topGenres ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Film className="size-4 text-primary" />
              <h3 className="font-semibold">{t("home_topDirectors")}</h3>
            </div>
            <div className="space-y-2">
              {(stats?.topDirectors ?? []).map((d, i) => (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="w-5 text-sm text-muted-foreground">{i + 1}</span>
                  <span className="flex-1 truncate text-sm font-medium">{d.name}</span>
                  <span className="text-xs text-muted-foreground">{d.count}</span>
                </div>
              ))}
              {(stats?.topDirectors ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
          </Card>
        </div>

        {/* Total runtime footnote */}
        {stats && stats.totalRuntime > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            {hours}h {t("movie_runtime").toLowerCase()} · {stats.totalMovies} {t("movies")}
          </p>
        )}
      </div>

      {/* 3. Recommended For You — LAST row, with See All → dedicated page */}
      {recs.length > 0 && (
        <MovieRow
          title={t("home_recommended")}
          icon={<Sparkles />}
          movies={recs.slice(0, 12).map((r) => r.movie)}
          emptyText={t("rec_noUnwatched")}
          action={
            <Button variant="ghost" size="sm" onClick={() => goView("recommendations")}>
              {t("nav_recommendations")}
              <ArrowRight className="size-4" />
            </Button>
          }
        />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`mt-1 text-2xl font-bold ${accent ? "text-primary" : ""}`}>{value}</p>
        </div>
        <div className={`flex size-9 items-center justify-center rounded-lg ${accent ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
          <Icon className="size-4" />
        </div>
      </div>
    </Card>
  );
}
