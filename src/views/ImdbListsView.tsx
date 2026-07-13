"use client";

import { Clapperboard, ArrowRight } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import type { Collection } from "@/lib/movie/types";
import { EmptyState } from "@/components/movie/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function ImdbListsView() {
  const { t } = useI18n();
  const { goCollection } = useNav();
  const { data: collections, loading } = useFetch<Collection[]>("/api/collections");

  // Filter for IMDb-imported collections (those with "IMDb" in description)
  const imdbLists = (collections ?? []).filter(
    (c) => c.description?.includes("IMDb") || c.name.toLowerCase().includes("imdb")
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : imdbLists.length === 0 ? (
        <EmptyState
          icon={<Clapperboard className="size-12" />}
          title={t("imdb_lists_empty")}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {imdbLists.map((c) => (
            <Card key={c.id} className="group relative overflow-hidden p-5 transition-all hover:border-primary/50">
              <button onClick={() => goCollection(c.id)} className="block w-full text-left">
                <div className="mb-3 flex size-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Clapperboard className="size-6" />
                </div>
                <h3 className="font-semibold">{c.name}</h3>
                {c.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("imdb_list_movies", { count: c.movieIds.length })}
                </p>
              </button>
              <div className="mt-3 flex items-center justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => goCollection(c.id)}
                  className="opacity-60 transition-opacity group-hover:opacity-100"
                >
                  {t("nav_watched")}
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
