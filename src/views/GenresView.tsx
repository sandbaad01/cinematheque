"use client";

import { Clapperboard } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/movie/EmptyState";

interface GenreItem {
  name: string;
  count: number;
}

export function GenresView() {
  const { t } = useI18n();
  const { goGenre } = useNav();
  const { data: genres, loading } = useFetch<GenreItem[]>("/api/genres");

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t("genres_title")}</h1>
        <p className="text-muted-foreground">{t("genres_subtitle")}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : !genres || genres.length === 0 ? (
        <EmptyState icon={<Clapperboard className="size-12" />} title={t("genres_empty")} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {genres.map((g, i) => (
            <button key={g.name} onClick={() => goGenre(g.name)} className="text-left">
              <Card className="group relative h-28 overflow-hidden p-5 transition-all hover:border-primary/50 hover:shadow-lg">
                <div
                  className="absolute inset-0 opacity-20 transition-opacity group-hover:opacity-40"
                  style={{
                    background: `linear-gradient(135deg, hsl(${(i * 47) % 360} 70% 50%), hsl(${(i * 47 + 40) % 360} 70% 45%))`,
                  }}
                />
                <div className="relative flex h-full flex-col justify-between">
                  <Clapperboard className="size-5 text-primary" />
                  <div>
                    <p className="font-semibold">{g.name}</p>
                    <p className="text-xs text-muted-foreground">{t("genre_count", { count: g.count })}</p>
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
