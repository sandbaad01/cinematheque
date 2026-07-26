"use client";

import { useState, useMemo } from "react";
import { Trophy, Plus, GripVertical } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import type { Movie } from "@/lib/movie/types";
import { RatingStars } from "@/components/movie/RatingStars";
import { RankBadge } from "@/components/movie/RankBadge";
import { EmptyState } from "@/components/movie/EmptyState";
import { PosterImage } from "@/components/movie/PosterImage";
import { AddMovieSearchDialog } from "@/components/movie/AddMovieSearchDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface FavoriteRowProps {
  movie: Movie;
  index: number;
  rank: number;
  onClick: () => void;
}

function FavoriteRow({ movie, index, rank, onClick }: FavoriteRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: movie.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex w-full items-center gap-2 overflow-hidden rounded-xl border bg-card p-3 text-left transition-all hover:border-primary/50 hover:shadow-lg md:gap-4 md:p-4 ${
        isDragging ? "opacity-80 shadow-2xl ring-2 ring-primary" : ""
      }`}
    >
      <div
        className="flex shrink-0 cursor-grab touch-none items-center self-stretch text-muted-foreground/40 opacity-0 transition-opacity hover:text-muted-foreground group-hover:opacity-100 group-focus-within:opacity-100 active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-5" />
      </div>

      <div className="flex w-12 shrink-0 justify-center md:w-20">
        <span
          className={`font-black tabular-nums text-muted-foreground/30 ${
            index < 3 ? "text-3xl md:text-5xl" : "text-2xl md:text-4xl"
          }`}
        >
          {rank}
        </span>
      </div>

      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-3 text-left md:gap-4"
      >
        <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg shadow md:h-28 md:w-20">
          <PosterImage src={movie.poster} alt={movie.title} size="w342" className="h-full w-full" />
          {index < 3 && (
            <div className="absolute left-0 top-0 rounded-br-lg bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
              {index === 0 ? "GOLD" : index === 1 ? "SILVER" : "BRONZE"}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold">{movie.title}</h3>
          <p className="text-sm text-muted-foreground">
            {movie.year} · {movie.director}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {movie.genres.slice(0, 3).map((g) => (
              <span key={g} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                {g}
              </span>
            ))}
          </div>
          <div className="mt-2">
            <RatingStars value={movie.personalRating} readOnly size="sm" />
          </div>
        </div>
      </button>

      <div className="hidden shrink-0 md:block">
        <RankBadge rank={rank} size="lg" />
      </div>
    </div>
  );
}

export function FavoritesView() {
  const { t } = useI18n();
  const { goMovie, triggerRefresh } = useNav();
  const refreshTick = useNav((s) => s.refreshTick);
  const { data: movies, loading } = useFetch<Movie[]>(
    "/api/movies?sort=rank&order=asc",
    [refreshTick]
  );
  const [addOpen, setAddOpen] = useState(false);

  const ranked = useMemo(
    () =>
      (movies ?? [])
        .filter((m) => m.lifetimeRank != null)
        .sort((a, b) => a.lifetimeRank! - b.lifetimeRank!),
    [movies]
  );

  // Local state for optimistic reordering; resynced to server data whenever
  // the remote `movies` reference changes (e.g. after a refetch).
  const [items, setItems] = useState<Movie[] | null>(null);
  const [lastRanked, setLastRanked] = useState(ranked);
  if (ranked !== lastRanked) {
    setLastRanked(ranked);
    setItems(ranked);
  }

  const display = items ?? ranked;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = display.findIndex((m) => m.id === active.id);
    const newIndex = display.findIndex((m) => m.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(display, oldIndex, newIndex);
    // Optimistic visual update
    setItems(next);

    // Ranks are 1-indexed positions
    const updates = next
      .map((m, i) => ({ id: m.id, rank: i + 1, prev: m.lifetimeRank }))
      .filter((u) => u.prev !== u.rank);

    if (updates.length === 0) return;

    try {
      await Promise.all(
        updates.map((u) =>
          fetch(`/api/movies/${u.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lifetimeRank: u.rank }),
          })
        )
      );
      toast.success("Ranks updated");
      triggerRefresh();
    } catch {
      toast.error("Failed to update ranks");
      // Revert to last known server data
      setItems(ranked);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-end">
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          {t("nav_add")}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : display.length === 0 ? (
        <EmptyState
          icon={<Trophy className="size-12" />}
          title={t("favorites_empty")}
          action={<Button onClick={() => setAddOpen(true)}>{t("nav_add")}</Button>}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={display.map((m) => m.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {display.map((m, i) => (
                <FavoriteRow
                  key={m.id}
                  movie={m}
                  index={i}
                  rank={i + 1}
                  onClick={() => goMovie(m.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <AddMovieSearchDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onMovieAdded={(movieId) => {
          triggerRefresh();
          goMovie(movieId);
        }}
      />
    </div>
  );
}
