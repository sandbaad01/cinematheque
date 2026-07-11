"use client";

import { useMemo } from "react";
import { CalendarRange } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import type { Movie } from "@/lib/movie/types";
import { MovieCard } from "@/components/movie/MovieCard";
import { EmptyState } from "@/components/movie/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

export function TimelineView() {
  const { t } = useI18n();
  const { goMovie } = useNav();
  const { data: movies, loading } = useFetch<Movie[]>("/api/movies?status=watched&sort=watchDate&order=desc");

  // Group by month (YYYY-MM)
  const groups = useMemo(() => {
    const map = new Map<string, Movie[]>();
    for (const m of movies ?? []) {
      const key = m.watchDate ? m.watchDate.slice(0, 7) : "unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [movies]);

  const monthLabel = (key: string) => {
    if (key === "unknown") return t("unknown");
    const [y, m] = key.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  if (!movies || movies.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <EmptyState icon={<CalendarRange className="size-12" />} title={t("watched_empty")} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
          <CalendarRange className="size-7 text-primary" />
          {t("timeline_title")}
        </h1>
        <p className="text-muted-foreground">{t("timeline_subtitle")}</p>
      </div>

      <div className="relative space-y-8 before:absolute before:left-[7px] before:top-2 before:h-full before:w-0.5 before:bg-border md:before:left-2">
        {groups.map(([key, list]) => (
          <div key={key} className="relative pl-7 md:pl-10">
            {/* dot */}
            <span className="absolute left-0 top-1.5 size-4 rounded-full border-2 border-primary bg-background md:left-1 md:top-2 md:size-4" />
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">{monthLabel(key)}</h2>
              <span className="text-sm text-muted-foreground">
                {t("timeline_moviesIn", { count: list.length, period: "" }).replace("  ", " ")}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {list.map((m) => (
                <MovieCard key={m.id} movie={m} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
