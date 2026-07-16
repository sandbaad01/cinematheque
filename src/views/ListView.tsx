"use client";

import { useState, useMemo } from "react";
import { ArrowLeft, ListOrdered, Plus, X, ChevronUp, ChevronDown, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import type { PersonalList, Movie, ListItem } from "@/lib/movie/types";
import { PosterImage } from "@/components/movie/PosterImage";
import { RatingStars } from "@/components/movie/RatingStars";
import { EmptyState } from "@/components/movie/EmptyState";
import { AddMovieSearchDialog } from "@/components/movie/AddMovieSearchDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function ListView({ listId }: { listId: string }) {
  const { t } = useI18n();
  const { back, triggerRefresh } = useNav();
  const { data: list, loading, refetch } = useFetch<PersonalList>(`/api/lists/${listId}`);
  const { data: allMovies } = useFetch<Movie[]>("/api/movies", [useNav((s) => s.refreshTick)]);
  const [addOpen, setAddOpen] = useState(false);

  const items = useMemo(() => {
    if (!list || !allMovies) return [];
    return list.items
      .map((it) => ({ item: it, movie: allMovies.find((m) => m.id === it.movieId) }))
      .filter((x): x is { item: ListItem; movie: Movie } => !!x.movie)
      .sort((a, b) => a.item.rank - b.item.rank);
  }, [list, allMovies]);

  const addMovieToList = (movieId: string) => {
    if (!list) return;
    const nextRank = list.items.length + 1;
    saveItems([...list.items, { movieId, rank: nextRank }]);
  };

  const saveItems = async (newItems: ListItem[]) => {
    if (!list) return;
    try {
      await fetch(`/api/lists/${list.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: newItems }),
      });
      triggerRefresh();
      refetch();
    } catch {
      toast.error("Failed");
    }
  };

  const addMovie = (movieId: string) => {
    if (!list) return;
    const nextRank = list.items.length + 1;
    saveItems([...list.items, { movieId, rank: nextRank }]);
  };

  const removeItem = (movieId: string) => {
    if (!list) return;
    const filtered = list.items.filter((i) => i.movieId !== movieId);
    // re-number
    const renumbered = filtered.map((it, idx) => ({ ...it, rank: idx + 1 }));
    saveItems(renumbered);
  };

  const moveItem = (movieId: string, dir: -1 | 1) => {
    if (!list) return;
    const sorted = [...list.items].sort((a, b) => a.rank - b.rank);
    const idx = sorted.findIndex((i) => i.movieId === movieId);
    if (idx < 0) return;
    const swapWith = idx + dir;
    if (swapWith < 0 || swapWith >= sorted.length) return;
    [sorted[idx], sorted[swapWith]] = [sorted[swapWith], sorted[idx]];
    const renumbered = sorted.map((it, i) => ({ ...it, rank: i + 1 }));
    saveItems(renumbered);
  };

  if (loading && !list) {
    return <div className="p-6"><Skeleton className="h-40 w-full" /></div>;
  }

  if (!list) {
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
            <ListOrdered className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{list.name}</h1>
          {list.description && <p className="text-muted-foreground">{list.description}</p>}
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">{t("nav_add")}</span>
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Trophy className="size-12" />}
          title={t("list_empty")}
          action={<Button onClick={() => setAddOpen(true)}>{t("nav_add")}</Button>}
        />
      ) : (
        <div className="space-y-2">
          {items.map(({ item, movie }, i) => (
            <div
              key={movie.id}
              className="flex items-center gap-3 rounded-xl border bg-card p-3"
            >
              <span className="flex w-10 shrink-0 items-center justify-center text-2xl font-black text-primary">
                {item.rank}
              </span>
              <div className="h-20 w-14 shrink-0 overflow-hidden rounded-md">
                <PosterImage src={movie.poster} alt={movie.title} size="w200" className="h-full w-full" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{movie.title}</p>
                <p className="text-xs text-muted-foreground">{movie.year} · {movie.director}</p>
                <div className="mt-1"><RatingStars value={movie.personalRating} readOnly size="sm" /></div>
                {item.note && <p className="mt-1 text-xs italic text-muted-foreground">{item.note}</p>}
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <Button variant="ghost" size="icon" className="size-7" onClick={() => moveItem(movie.id, -1)} disabled={i === 0}>
                  <ChevronUp className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className="size-7" onClick={() => moveItem(movie.id, 1)} disabled={i === items.length - 1}>
                  <ChevronDown className="size-4" />
                </Button>
              </div>
              <Button variant="ghost" size="icon" className="size-7 shrink-0 text-destructive" onClick={() => removeItem(movie.id)}>
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <AddMovieSearchDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onMovieAdded={(movieId) => { addMovieToList(movieId); setAddOpen(false); }}
      />
    </div>
  );
}
