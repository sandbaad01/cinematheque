"use client";

import { Sparkles, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import type { Movie, Recommendation } from "@/lib/movie/types";
import { MovieCard } from "@/components/movie/MovieCard";
import { EmptyState } from "@/components/movie/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function RecommendationsView() {
  const { t } = useI18n();
  const [hideWatched, setHideWatched] = useState(true);
  const { data: recsData, loading } = useFetch<{ items: Recommendation[] }>(
    "/api/recommendations"
  );

  const recs = (recsData?.items ?? []).filter((r) =>
    hideWatched ? r.movie.status !== "watched" : true
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {recs.length} {t("movies")}
        </p>
        <Button variant="outline" size="sm" onClick={() => setHideWatched((v) => !v)}>
          {hideWatched ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          <span className="hidden sm:inline">
            {hideWatched ? t("action_showWatched") : t("action_hideWatched")}
          </span>
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
          ))}
        </div>
      ) : recs.length === 0 ? (
        <EmptyState icon={<Sparkles className="size-12" />} title={t("rec_noUnwatched")} />
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
