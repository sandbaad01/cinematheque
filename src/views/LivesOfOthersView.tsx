"use client";

import { Users, Eye } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import type { Collection } from "@/lib/movie/types";
import { EmptyState } from "@/components/movie/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function LivesOfOthersView() {
  const { t } = useI18n();
  const { go, goCollection } = useNav();
  const { data: collections, loading } = useFetch<Collection[]>("/api/collections");

  // Filter for friends' watchlists (collections with "Friend Watchlist" in description)
  const friendLists = (collections ?? []).filter(
    (c) => c.description?.includes("Friend Watchlist ·")
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-end">
        <Button onClick={() => go("settings")}>
          <Users className="size-4" />
          <span className="hidden sm:inline">Import Friend's Watchlist</span>
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : friendLists.length === 0 ? (
        <EmptyState
          icon={<Users className="size-12" />}
          title="No friends' watchlists yet. Go to Settings to import one."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {friendLists.map((c) => (
            <Card key={c.id} className="group relative overflow-hidden p-5 transition-all hover:border-primary/50">
              <button onClick={() => goCollection(c.id)} className="block w-full text-left">
                <div className="mb-3 flex size-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Eye className="size-6" />
                </div>
                <h3 className="font-semibold">{c.name}</h3>
                {c.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {c.movieIds.length} movies
                </p>
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
