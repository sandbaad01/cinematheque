"use client";

import { useState, useMemo } from "react";
import { ArrowLeft, FolderOpen, Plus, X, Search } from "lucide-react";
import { toast } from "sonner";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import type { Collection, Movie } from "@/lib/movie/types";
import { MovieCard } from "@/components/movie/MovieCard";
import { PosterImage } from "@/components/movie/PosterImage";
import { EmptyState } from "@/components/movie/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export function CollectionView({ collectionId }: { collectionId: string }) {
  const { t } = useI18n();
  const { back, goMovie } = useNav();
  const { data: collection, loading, refetch } = useFetch<Collection>(`/api/collections/${collectionId}`);
  const { data: allMovies } = useFetch<Movie[]>("/api/movies");
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");

  const moviesInCollection = useMemo(() => {
    if (!collection || !allMovies) return [];
    return collection.movieIds
      .map((id) => allMovies.find((m) => m.id === id))
      .filter((m): m is Movie => !!m);
  }, [collection, allMovies]);

  const availableMovies = useMemo(() => {
    if (!allMovies || !collection) return [];
    return allMovies
      .filter((m) => !collection.movieIds.includes(m.id))
      .filter((m) =>
        search ? m.title.toLowerCase().includes(search.toLowerCase()) : true
      )
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [allMovies, collection, search]);

  const addMovie = async (movieId: string) => {
    if (!collection) return;
    const next = [...collection.movieIds, movieId];
    try {
      await fetch(`/api/collections/${collection.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieIds: next }),
      });
      refetch();
    } catch {
      toast.error("Failed");
    }
  };

  const removeMovie = async (movieId: string) => {
    if (!collection) return;
    const next = collection.movieIds.filter((id) => id !== movieId);
    try {
      await fetch(`/api/collections/${collection.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieIds: next }),
      });
      refetch();
    } catch {
      toast.error("Failed");
    }
  };

  if (loading && !collection) {
    return <div className="p-6"><Skeleton className="h-40 w-full" /></div>;
  }

  if (!collection) {
    return <div className="p-6 text-muted-foreground">Not found.</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Button variant="ghost" size="sm" onClick={back}>
        <ArrowLeft className="size-4" />
        {t("action_back")}
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex size-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <FolderOpen className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{collection.name}</h1>
          {collection.description && <p className="text-muted-foreground">{collection.description}</p>}
          <p className="text-sm text-muted-foreground">{t("collection_movies", { count: moviesInCollection.length })}</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">{t("nav_add")}</span>
        </Button>
      </div>

      {moviesInCollection.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="size-12" />}
          title={t("collection_empty")}
          action={<Button onClick={() => setAddOpen(true)}>{t("nav_add")}</Button>}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {moviesInCollection.map((m) => (
            <div key={m.id} className="group relative">
              <MovieCard movie={m} />
              <button
                onClick={() => removeMovie(m.id)}
                className="absolute right-2 top-2 z-10 rounded-md bg-background/90 p-1.5 text-destructive opacity-0 shadow transition-opacity group-hover:opacity-100"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("nav_add")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("search_placeholder")} className="pl-9" autoFocus />
            </div>
            <ScrollArea className="max-h-[50vh] -mx-2 px-2">
              <div className="space-y-1">
                {availableMovies.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => addMovie(m.id)}
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent"
                  >
                    <div className="h-14 w-10 shrink-0 overflow-hidden rounded">
                      <PosterImage src={m.poster} alt={m.title} size="w200" className="h-full w-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.title}</p>
                      <p className="text-xs text-muted-foreground">{m.year} · {m.director}</p>
                    </div>
                    <Plus className="size-4 text-muted-foreground" />
                  </button>
                ))}
                {availableMovies.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">{t("search_noResults", { query: search })}</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
