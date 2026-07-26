"use client";

import { useState, useMemo } from "react";
import { ArrowLeft, ListOrdered, Plus, X, ChevronUp, ChevronDown, Trophy, Trash2, Flag } from "lucide-react";
import { toast } from "sonner";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import type { PersonalList, Movie, ListItem } from "@/lib/movie/types";
import { PosterImage } from "@/components/movie/PosterImage";
import { RatingStars } from "@/components/movie/RatingStars";
import { EmptyState } from "@/components/movie/EmptyState";
import { AddMovieSearchDialog } from "@/components/movie/AddMovieSearchDialog";
import { FilterBar, DEFAULT_FILTERS, type FilterState } from "@/components/movie/FilterBar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

export function ListView({ listId }: { listId: string }) {
  const { t } = useI18n();
  const { back, triggerRefresh, goMovie } = useNav();
  const refreshTick = useNav((s) => s.refreshTick);
  const { data: list, loading, refetch } = useFetch<PersonalList>(`/api/lists/${listId}`);
  const { data: allMovies } = useFetch<Movie[]>("/api/movies", [refreshTick]);
  const [addOpen, setAddOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // Multi-selection state — Set of movieIds currently selected
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rankDialogOpen, setRankDialogOpen] = useState(false);
  const [rankInput, setRankInput] = useState("");
  const [rankSaving, setRankSaving] = useState(false);

  const items = useMemo(() => {
    if (!list || !allMovies) return [];
    return list.items
      .map((it) => ({ item: it, movie: allMovies.find((m) => m.id === it.movieId) }))
      .filter((x): x is { item: ListItem; movie: Movie } => !!x.movie)
      .sort((a, b) => a.item.rank - b.item.rank);
  }, [list, allMovies]);

  // Derive FilterBar option lists from the movies in this list.
  const { genres, countries, languages, directors, years, tags } = useMemo(() => {
    const g = new Set<string>();
    const c = new Set<string>();
    const l = new Set<string>();
    const d = new Set<string>();
    const y = new Set<number>();
    const tg = new Set<string>();
    for (const { movie: m } of items) {
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
  }, [items]);

  // Client-side filter + sort (same logic as CollectionView/WatchedView).
  const filtered = useMemo(() => {
    let list = items.filter(({ movie: m }) => {
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
          return ((a.movie.watchDate ?? "") < (b.movie.watchDate ?? "") ? -1 : 1) * dir;
        case "releaseYear":
          return ((a.movie.year ?? 0) - (b.movie.year ?? 0)) * dir;
        case "title":
          return a.movie.title.localeCompare(b.movie.title) * dir;
        case "rating":
          return ((a.movie.personalRating ?? 0) - (b.movie.personalRating ?? 0)) * dir;
        case "rank":
          return ((a.item.rank) - (b.item.rank)) * dir;
        case "added":
          return ((a.movie.createdAt ?? "") < (b.movie.createdAt ?? "") ? -1 : 1) * dir;
        default:
          return 0;
      }
    });
    return list;
  }, [items, filters]);

  const saveItems = async (newItems: ListItem[]) => {
    if (!list) return;
    try {
      const res = await fetch(`/api/lists/${list.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: newItems }),
      });
      if (!res.ok) throw new Error();
      triggerRefresh();
      refetch();
    } catch {
      toast.error("Failed");
    }
  };

  const addMovieToList = (movieId: string) => {
    if (!list) return;
    const nextRank = list.items.length + 1;
    saveItems([...list.items, { movieId, rank: nextRank }]);
  };

  const removeItem = (movieId: string) => {
    if (!list) return;
    const filteredItems = list.items.filter((i) => i.movieId !== movieId);
    // re-number
    const renumbered = filteredItems.map((it, idx) => ({ ...it, rank: idx + 1 }));
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

  // --- Selection handlers ---
  const toggleSelect = (movieId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(movieId)) next.delete(movieId);
      else next.add(movieId);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const selectAll = () => {
    setSelected(new Set(filtered.map((x) => x.movie.id)));
  };

  // Remove all selected movies from the list (with re-numbering).
  const removeSelected = async () => {
    if (!list || selected.size === 0) return;
    const filteredItems = list.items.filter((i) => !selected.has(i.movieId));
    const renumbered = filteredItems.map((it, idx) => ({ ...it, rank: idx + 1 }));
    await saveItems(renumbered);
    clearSelection();
    toast.success(t("list_removed_selected"));
  };

  // Assign a new starting rank to all selected movies. They are placed
  // consecutively starting at `startRank`, in their current relative order.
  // Other items fill the remaining positions around them.
  const applyRankToSelected = async () => {
    if (!list || selected.size === 0) return;
    const n = parseInt(rankInput, 10);
    if (!Number.isFinite(n) || n < 1) {
      toast.error("Failed");
      return;
    }
    setRankSaving(true);
    try {
      const selectedIds = new Set(selected);
      // Preserve relative order of each group by their current rank.
      const sortedItems = [...list.items].sort((a, b) => a.rank - b.rank);
      const selectedItems = sortedItems.filter((i) => selectedIds.has(i.movieId));
      const otherItems = sortedItems.filter((i) => !selectedIds.has(i.movieId));

      // Clamp the insertion position to the available range.
      const insertAt = Math.max(1, Math.min(n, otherItems.length + 1));
      const before = otherItems.slice(0, insertAt - 1);
      const after = otherItems.slice(insertAt - 1);

      const reordered = [...before, ...selectedItems, ...after];
      const renumbered = reordered.map((it, idx) => ({ ...it, rank: idx + 1 }));

      await saveItems(renumbered);
      setRankDialogOpen(false);
      setRankInput("");
      clearSelection();
      toast.success(t("list_rank_updated"));
    } catch {
      toast.error("Failed");
    } finally {
      setRankSaving(false);
    }
  };

  if (loading && !list) {
    return <div className="p-6"><Skeleton className="h-40 w-full" /></div>;
  }

  if (!list) {
    return <div className="p-6 text-muted-foreground">Not found.</div>;
  }

  const hasSelection = selected.size > 0;
  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  return (
    <div className="space-y-4 p-4 md:p-6">
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
        <>
          {/* Sticky FilterBar */}
          {items.length > 0 && (
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

          <div className="space-y-2">
            {/* Select-all row */}
            <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-3 py-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(v) => { if (v) selectAll(); else clearSelection(); }}
                aria-label="Select all"
              />
              <span className="text-sm text-muted-foreground">
                {hasSelection
                  ? t("list_selected_count", { count: selected.size })
                  : t("list_change_rank")}
              </span>
              {hasSelection && (
                <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={clearSelection}>
                  {t("list_clear_selection")}
                </Button>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
                {t("watched_empty")}
              </div>
            ) : (
              filtered.map(({ item, movie }, i) => {
                const isSelected = selected.has(movie.id);
                return (
                  <div
                    key={movie.id}
                    className={
                      "flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors " +
                      (isSelected ? "border-primary ring-1 ring-primary" : "")
                    }
                  >
                    {/* Checkbox — clicks only toggle selection, never navigate */}
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(movie.id)}
                      aria-label={`Select ${movie.title}`}
                    />
                    <span className="flex w-10 shrink-0 items-center justify-center text-2xl font-black text-primary">
                      {item.rank}
                    </span>
                    {/* Click target — poster + title block — navigates to movie detail */}
                    <button
                      type="button"
                      onClick={() => goMovie(movie.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="h-20 w-14 shrink-0 overflow-hidden rounded-md">
                        <PosterImage src={movie.poster} alt={movie.title} size="w200" className="h-full w-full" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold hover:text-primary">{movie.title}</p>
                        <p className="text-xs text-muted-foreground">{movie.year} · {movie.director}</p>
                        <div className="mt-1"><RatingStars value={movie.personalRating} readOnly size="sm" /></div>
                        {item.note && <p className="mt-1 text-xs italic text-muted-foreground">{item.note}</p>}
                      </div>
                    </button>
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
                );
              })
            )}
          </div>
        </>
      )}

      <AddMovieSearchDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onMovieAdded={(movieId) => { addMovieToList(movieId); setAddOpen(false); }}
      />

      {/* Selection toolbar — shown only when at least one movie is selected */}
      {hasSelection && (
        <div className="sticky bottom-4 z-30 mx-auto flex w-fit items-center gap-2 rounded-full border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
          <span className="px-2 text-sm font-medium">
            {t("list_selected_count", { count: selected.size })}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => setRankDialogOpen(true)}
          >
            <Flag className="size-4" />
            <span className="hidden sm:inline">{t("list_change_rank")}</span>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="rounded-full"
            onClick={removeSelected}
          >
            <Trash2 className="size-4" />
            <span className="hidden sm:inline">{t("list_remove_selected")}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={clearSelection}
            aria-label={t("list_clear_selection")}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      {/* Change rank dialog */}
      <Dialog open={rankDialogOpen} onOpenChange={(o) => { setRankDialogOpen(o); if (!o) setRankInput(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="size-5 text-primary" />
              {t("list_change_rank_title")}
            </DialogTitle>
            <DialogDescription>{t("list_change_rank_desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              type="number"
              min={1}
              value={rankInput}
              onChange={(e) => setRankInput(e.target.value)}
              placeholder={t("list_change_rank_placeholder")}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") applyRankToSelected(); }}
            />
            <p className="text-xs text-muted-foreground">
              {t("list_selected_count", { count: selected.size })}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRankDialogOpen(false); setRankInput(""); }}>
              {t("action_cancel")}
            </Button>
            <Button onClick={applyRankToSelected} disabled={rankSaving || !rankInput.trim()}>
              {t("list_change_rank_apply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
