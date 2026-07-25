"use client";

import { useState, useMemo } from "react";
import { ArrowLeft, FolderOpen, Plus, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import type { Collection, Movie } from "@/lib/movie/types";
import { MovieCard } from "@/components/movie/MovieCard";
import { EmptyState } from "@/components/movie/EmptyState";
import { AddMovieSearchDialog } from "@/components/movie/AddMovieSearchDialog";
import { FilterBar, DEFAULT_FILTERS, type FilterState } from "@/components/movie/FilterBar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function CollectionView({ collectionId }: { collectionId: string }) {
  const { t } = useI18n();
  const { back, triggerRefresh } = useNav();
  const refreshTick = useNav((s) => s.refreshTick);
  const { data: collection, loading, refetch } = useFetch<Collection>(`/api/collections/${collectionId}`);
  const { data: allMovies } = useFetch<Movie[]>("/api/movies", [refreshTick]);
  const [addOpen, setAddOpen] = useState(false);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const moviesInCollection = useMemo(() => {
    if (!collection || !allMovies) return [];
    return collection.movieIds
      .map((id) => allMovies.find((m) => m.id === id))
      .filter((m): m is Movie => !!m);
  }, [collection, allMovies]);

  // Derive filter option lists from the movies in this collection
  const { genres, countries, languages, directors, years, tags } = useMemo(() => {
    const g = new Set<string>();
    const c = new Set<string>();
    const l = new Set<string>();
    const d = new Set<string>();
    const y = new Set<number>();
    const tg = new Set<string>();
    for (const m of moviesInCollection) {
      m.genres.forEach((x) => g.add(x));
      if (m.country) c.add(m.country);
      if (m.language) l.add(m.language);
      if (m.director) d.add(m.director);
      if (m.year) y.add(m.year);
      m.tags.forEach((x) => tg.add(x));
    }
    return {
      genres: [...g].sort(),
      countries: [...c].sort(),
      languages: [...l].sort(),
      directors: [...d].sort(),
      years: [...y].sort((a, b) => b - a),
      tags: [...tg].sort(),
    };
  }, [moviesInCollection]);

  // Client-side filter + sort (same logic as WatchedView)
  const filtered = useMemo(() => {
    let list = moviesInCollection.filter((m) => {
      if (filters.genre !== "all" && !m.genres.includes(filters.genre)) return false;
      if (filters.country !== "all" && m.country !== filters.country) return false;
      if (filters.language !== "all" && m.language !== filters.language) return false;
      if (filters.year !== "all" && String(m.year) !== filters.year) return false;
      if (filters.director !== "all" && m.director !== filters.director) return false;
      if (filters.tag !== "all" && !m.tags.includes(filters.tag)) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const hay = [m.title, m.originalTitle, m.director, m.cast.join(" "), m.genres.join(" "), m.country, m.language]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const dir = filters.order === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      switch (filters.sort) {
        case "watchDate":
          return ((a.watchDate ?? "") < (b.watchDate ?? "") ? -1 : 1) * dir;
        case "releaseYear":
          return ((a.year ?? 0) - (b.year ?? 0)) * dir;
        case "title":
          return a.title.localeCompare(b.title) * dir;
        case "rating":
          return ((a.personalRating ?? 0) - (b.personalRating ?? 0)) * dir;
        case "rank":
          return ((a.lifetimeRank ?? 9999) - (b.lifetimeRank ?? 9999)) * dir;
        case "added":
          return ((a.createdAt ?? "") < (b.createdAt ?? "") ? -1 : 1) * dir;
        default:
          return 0;
      }
    });
    return list;
  }, [moviesInCollection, filters]);

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
    <div className="space-y-4 p-4 md:p-6">
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
          {collection.description && <p className="text-sm text-muted-foreground">{collection.description}</p>}
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

      {moviesInCollection.length > 0 && (
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm -mx-4 px-4 py-2 md:-mx-6 md:px-6">
          <FilterBar
            filters={filters}
            onChange={setFilters}
            genres={genres}
            countries={countries}
            languages={languages}
            directors={directors}
            years={years}
            tags={tags}
          />
        </div>
      )}

      {moviesInCollection.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="size-12" />}
          title={t("collection_empty")}
          action={<Button onClick={() => setAddOpen(true)}>{t("nav_add")}</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<FolderOpen className="size-12" />} title={t("watched_empty")} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filtered.map((m) => (
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
