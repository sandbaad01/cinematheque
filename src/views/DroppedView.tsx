"use client";

import { Film } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import type { Movie } from "@/lib/movie/types";
import { MovieCard } from "@/components/movie/MovieCard";
import { EmptyState } from "@/components/movie/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

export function DroppedView() {
  const { t } = useI18n();
  const refreshTick = useNav((s) => s.refreshTick);
  const { data: movies, loading } = useFetch<Movie[]>("/api/movies?status=dropped", [refreshTick]);

  return (
    <div className="space-y-4 p-4 md:p-6">
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full rounded-lg" />
          ))}
        </div>
      ) : !movies || movies.length === 0 ? (
        <EmptyState icon={<Film className="size-12" />} title="No dropped movies." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {movies.map((m) => (
            <MovieCard key={m.id} movie={m} />
          ))}
        </div>
      )}
    </div>
  );
}
