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
import {
  FilterBar,
  DEFAULT_FILTERS,
  type FilterState,
} from "@/components/movie/FilterBar";

interface RatingRowProps {
  movie: Movie;
  index: number;
  rating: number;
  onClick: () => void;
  draggable: boolean;
}

function RatingRow({ movie, index, rating, onClick, draggable }: RatingRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: movie.id, disabled: !draggable });

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
      {draggable && (
        <div
          className="flex shrink-0 cursor-grab touch-none items-center self-stretch text-muted-foreground/40 opacity-0 transition-opacity hover:text-muted-foreground group-hover:opacity-100 group-focus-within:opacity-100 active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-5" />
        </div>
      )}

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
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
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

  // Derive FilterBar option lists from the rated movies.
  const { genres, countries, languages, directors, years, tags } = useMemo(() => {
    const g = new Set<string>();
    const c = new Set<string>();
    const l = new Set<string>();
    const d = new Set<string>();
    const y = new Set<number>();
    const tg = new Set<string>();
    for (const m of rated) {
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
  }, [rated]);

  // Client-side filter + sort (same logic as WatchedView).
  const filtered = useMemo(() => {
    let list = rated.filter((m) => {
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
  }, [rated, filters]);

  // Local state for optimistic reordering; resynced to server data whenever
  // the remote `rated` reference changes (e.g. after a refetch).
  const [items, setItems] = useState<Movie[] | null>(null);
  const [lastRated, setLastRated] = useState(rated);
  if (rated !== lastRated) {
    setLastRated(rated);
    setItems(rated);
  }

  const display = items ?? rated;

  // Drag-and-drop is only enabled when sort is "rating" — otherwise reordering
  // doesn't map to a rating change in a meaningful way.
  const canDrag = filters.sort === "rating";

  // Sorted rating values (descending) from the displayed list. Position i
  // (0-indexed) corresponds to sortedRatings[i].
  const sortedRatings = useMemo(
    () => display.map((m) => m.personalRating!).sort((a, b) => b - a),
    [display]
  );

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

    // Only the dragged movie's rating changes — it gets the rating that
    // corresponds to its new position index (sortedRatings[newIndex]).
    // All other movies keep their original ratings.
    const draggedMovie = display[oldIndex];
    const oldRating = draggedMovie.personalRating;
    const newRating = sortedRatings[newIndex];

    // Optimistic visual update: reorder the list. If the rating changed,
    // apply the new rating to the dragged movie locally so the UI reflects
    // it immediately.
    const next = arrayMove(display, oldIndex, newIndex);
    if (newRating !== oldRating) {
      const updated = next.map((m, i) =>
        i === newIndex ? { ...m, personalRating: newRating } : m
      );
      setItems(updated);

      try {
        const res = await fetch(`/api/movies/${draggedMovie.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ personalRating: newRating }),
        });
        if (!res.ok) throw new Error("Failed");
        toast.success("Ratings updated");
        triggerRefresh();
      } catch {
        toast.error("Failed to update rating");
        // Revert to last known server data
        setItems(rated);
      }
    } else {
      // Rating didn't change — just update visual order
      setItems(next);
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      {rated.length > 0 && (
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

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : display.length === 0 ? (
        <EmptyState icon={<Star className="size-12" />} title={t("ratings_empty")} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Star className="size-12" />} title={t("watched_empty")} />
      ) : (
        <DndContext
          sensors={canDrag ? sensors : []}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filtered.map((m) => m.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {filtered.map((m, i) => (
                <RatingRow
                  key={m.id}
                  movie={m}
                  index={i}
                  rating={m.personalRating!}
                  onClick={() => goMovie(m.id)}
                  draggable={canDrag}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
