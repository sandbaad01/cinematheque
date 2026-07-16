"use client";

import { useState, useMemo } from "react";
import { ArrowLeft, FolderOpen, Plus, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import type { Collection, Movie } from "@/lib/movie/types";
import { MovieCard } from "@/components/movie/MovieCard";
import { PosterImage } from "@/components/movie/PosterImage";
import { EmptyState } from "@/components/movie/EmptyState";
import { AddMovieSearchDialog } from "@/components/movie/AddMovieSearchDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function CollectionView({ collectionId }: { collectionId: string }) {
  const { t } = useI18n();
  const { back, goMovie, triggerRefresh } = useNav();
  const refreshTick = useNav((s) => s.refreshTick);
  const { data: collection, loading, refetch } = useFetch<Collection>(`/api/collections/${collectionId}`);
  const { data: allMovies } = useFetch<Movie[]>("/api/movies", [refreshTick]);
  const [addOpen, setAddOpen] = useState(false);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);

  const moviesInCollection = useMemo(() => {
    if (!collection || !allMovies) return [];
    return collection.movieIds
      .map((id) => allMovies.find((m) => m.id === id))
      .filter((m): m is Movie => !!m);
  }, [collection, allMovies]);

  const addMovieToCollection = async (movieId: string) => {
    if (!collection) return;
    const next = [...collection.movieIds, movieId];
    try {
      await fetch(`/api/collections/${collection.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieIds: next }),
      });
      triggerRefresh();
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

  // Refresh all movies in this collection from TMDb (one by one)
  const refreshAllFromTmdb = async () => {
    if (!moviesInCollection.length) return;
    setRefreshingAll(true);
    setRefreshProgress(0);
    let success = 0;
    let failed = 0;
    for (let i = 0; i < moviesInCollection.length; i++) {
      const m = moviesInCollection[i];
      setRefreshProgress(i + 1);
      try {
        let tmdbId = m.tmdbId;
        // If no tmdbId, try IMDb ID lookup, then title search
        if (!tmdbId) {
          if (m.imdbId) {
            const findRes = await fetch(`/api/tmdb/find?imdbId=${encodeURIComponent(m.imdbId)}`);
            if (findRes.ok) {
              const fd = await findRes.json();
              if (fd?.tmdbId) tmdbId = fd.tmdbId;
            }
          }
          if (!tmdbId) {
            const searchUrl = m.year
              ? `/api/tmdb/search?q=${encodeURIComponent(m.title)}&year=${m.year}`
              : `/api/tmdb/search?q=${encodeURIComponent(m.title)}`;
            const searchRes = await fetch(searchUrl);
            if (searchRes.ok) {
              const sd = await searchRes.json();
              if (sd?.results?.[0]?.tmdbId) tmdbId = sd.results[0].tmdbId;
            }
          }
        }
        if (!tmdbId) { failed++; continue; }
        const res = await fetch(`/api/tmdb/details?id=${tmdbId}`);
        if (!res.ok) { failed++; continue; }
        const d = await res.json();
        await fetch(`/api/movies/${m.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdbId,
            title: d.title ?? m.title,
            originalTitle: d.originalTitle ?? m.originalTitle,
            poster: d.poster ?? m.poster,
            backdrop: d.backdrop ?? m.backdrop,
            releaseDate: d.releaseDate ?? m.releaseDate,
            year: d.year ?? m.year,
            genres: d.genres ?? m.genres,
            runtime: d.runtime ?? m.runtime,
            country: d.country ?? m.country,
            language: d.language ?? m.language,
            director: d.director ?? m.director,
            writers: d.writers ?? m.writers,
            cast: d.cast ?? m.cast,
            overview: d.overview ?? m.overview,
            tmdbRating: d.tmdbRating ?? m.tmdbRating,
            imdbId: d.imdbId ?? m.imdbId,
            trailer: d.trailer ?? m.trailer,
            gallery: d.gallery ?? m.gallery,
          }),
        });
        success++;
      } catch {
        failed++;
      }
    }
    setRefreshingAll(false);
    setRefreshProgress(0);
    toast.success(`Refreshed ${success} movies${failed > 0 ? `, ${failed} failed` : ""}`);
    refetch();
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAllFromTmdb}
            disabled={refreshingAll || moviesInCollection.length === 0}
            title="Refresh all from TMDb"
          >
            {refreshingAll ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            <span className="hidden sm:inline">
              {refreshingAll ? `${refreshProgress}/${moviesInCollection.length}` : "Refresh All"}
            </span>
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">{t("nav_add")}</span>
          </Button>
        </div>
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
            </div>
          ))}
        </div>
      )}

      <AddMovieSearchDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onMovieAdded={(movieId) => { addMovieToCollection(movieId); setAddOpen(false); }}
      />
    </div>
  );
}
