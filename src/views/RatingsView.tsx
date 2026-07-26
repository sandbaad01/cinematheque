"use client";

import { useMemo, useState } from "react";
import { Star, GripVertical } from "lucide-react";
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
import { EmptyState } from "@/components/movie/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { PosterImage } from "@/components/movie/PosterImage";

interface RatingRowProps {
  movie: Movie;
  index: number;
  rating: number;
  onClick: () => void;
}

function RatingRow({ movie, index, rating, onClick }: RatingRowProps) {
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
      className={`group flex w-full items-center gap-2 rounded-lg border bg-card p-3 transition-colors hover:bg-accent md:gap-3 ${
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

      <span className="w-6 shrink-0 text-center text-lg font-bold text-muted-foreground">
        {index + 1}
      </span>

      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <div className="h-16 w-12 shrink-0 overflow-hidden rounded">
          <PosterImage src={movie.poster} alt={movie.title} size="w200" className="h-full w-full" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{movie.title}</p>
          <p className="text-xs text-muted-foreground">
            {movie.year} · {movie.director}
          </p>
          <div className="mt-1">
            <RatingStars value={rating} readOnly size="sm" />
          </div>
        </div>
      </button>

      <div className="shrink-0 text-right">
        <div className="flex items-center gap-1 text-2xl font-bold text-primary">
          <Star className="size-5 fill-primary" />
          {rating.toFixed(1)}
        </div>
        <p className="text-xs text-muted-foreground">/ 10</p>
      </div>
    </div>
  );
}

export function RatingsView() {
  const { t } = useI18n();
  const { goMovie, triggerRefresh } = useNav();
  const refreshTick = useNav((s) => s.refreshTick);
  // Fetch ALL movies (not just watched) so any rated movie appears in My Ratings
  const { data: movies, loading } = useFetch<Movie[]>(
    "/api/movies?sort=rating&order=desc",
    [refreshTick]
  );

  const rated = useMemo(
    () =>
      (movies ?? [])
        .filter((m) => m.personalRating != null)
        .sort((a, b) => b.personalRating! - a.personalRating!),
    [movies]
  );

  // Sorted rating values (descending). Position i (0-indexed) gets sortedRatings[i].
  // We redistribute the existing rating pool based on the new visual order so that
  // reordering swaps ratings between the dragged movie and the ones it passes.
  const sortedRatings = useMemo(
    () => rated.map((m) => m.personalRating!).sort((a, b) => b - a),
    [rated]
  );

  // Local state for optimistic reordering; resynced to server data whenever
  // the remote `movies` reference changes (e.g. after a refetch).
  const [items, setItems] = useState<Movie[] | null>(null);
  const [lastRated, setLastRated] = useState(rated);
  if (rated !== lastRated) {
    setLastRated(rated);
    setItems(rated);
  }

  const display = items ?? rated;

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

    // Position i gets sortedRatings[i] — the i-th highest rating from the pool.
    const updates = next
      .map((m, i) => ({
        id: m.id,
        rating: sortedRatings[i],
        prev: m.personalRating,
      }))
      .filter((u) => u.prev !== u.rating);

    if (updates.length === 0) return;

    try {
      await Promise.all(
        updates.map((u) =>
          fetch(`/api/movies/${u.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ personalRating: u.rating }),
          })
        )
      );
      toast.success("Ratings updated");
      triggerRefresh();
    } catch {
      toast.error("Failed to update ratings");
      // Revert to last known server data
      setItems(rated);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : display.length === 0 ? (
        <EmptyState icon={<Star className="size-12" />} title={t("ratings_empty")} />
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
            <div className="space-y-2">
              {display.map((m, i) => (
                <RatingRow
                  key={m.id}
                  movie={m}
                  index={i}
                  rating={sortedRatings[i] ?? m.personalRating!}
                  onClick={() => goMovie(m.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
