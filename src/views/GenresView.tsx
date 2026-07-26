"use client";

import { useMemo, useState } from "react";
import { Clapperboard, Search, X } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/movie/EmptyState";

interface GenreItem {
  name: string;
  count: number;
}

export function GenresView() {
  const { t } = useI18n();
  const { goGenre } = useNav();
  // Re-aggregate genres whenever the archive changes (add/edit/delete a movie,
  // status change, list/collection update, etc.) so the page reflects every
  // movie in the user's archive, from all statuses and lists.
  const refreshTick = useNav((s) => s.refreshTick);
  const { data: genres, loading } = useFetch<GenreItem[]>("/api/genres", [refreshTick]);

  // Local search filter — lets users filter genres by name.
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return genres ?? [];
    return (genres ?? []).filter((g) => g.name.toLowerCase().includes(q));
  }, [genres, query]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Search filter — sticky at top */}
      <div className="sticky top-0 z-20 -mx-4 flex items-center gap-2 border-b bg-background/80 px-4 py-2.5 backdrop-blur md:mx-0 md:rounded-lg md:border">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("filter_search")}
            className="pl-9"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {genres && (
          <span className="shrink-0 text-sm text-muted-foreground">
            {filtered.length} / {genres.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : !genres || genres.length === 0 ? (
        <EmptyState icon={<Clapperboard className="size-12" />} title={t("genres_empty")} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Clapperboard className="size-12" />} title={t("genres_empty")} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((g, i) => (
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
