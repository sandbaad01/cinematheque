"use client";

import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Movie } from "@/lib/movie/types";
import { useNav } from "@/lib/store";
import { cn } from "@/lib/utils";

interface PosterActionsProps {
  movie: Movie;
}

/**
 * Bottom-corner action buttons shown on every movie poster.
 * - Bottom-right: Watched (checkmark) — marks the movie as watched with today's date.
 * - Bottom-left: Delete — deletes the movie from the archive.
 *
 * Both buttons are hover-revealed (opacity-0 → group-hover:opacity-100) and
 * stop propagation so clicking them doesn't navigate to the movie detail page.
 *
 * For TMDb-only movies (id starts with "tmdb-"), the Watched button creates
 * the movie in the DB first, then marks it watched.
 */
export function PosterActions({ movie }: PosterActionsProps) {
  const { triggerRefresh } = useNav();
  const [watchedBusy, setWatchedBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isTmdbOnly = movie.id.startsWith("tmdb-") || movie.id.length < 20;
  const isAlreadyWatched = movie.status === "watched";

  const markWatched = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (watchedBusy) return;
    setWatchedBusy(true);
    try {
      const today = new Date().toISOString().slice(0, 10);

      if (isTmdbOnly) {
        // Create the movie in DB first, then it's already marked as watched
        const createRes = await fetch("/api/movies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: movie.title,
            originalTitle: movie.originalTitle,
            poster: movie.poster,
            backdrop: movie.backdrop,
            releaseDate: movie.releaseDate,
            year: movie.year,
            genres: movie.genres,
            runtime: movie.runtime,
            country: movie.country,
            language: movie.language,
            director: movie.director,
            writers: movie.writers,
            cast: movie.cast,
            overview: movie.overview,
            imdbRating: movie.imdbRating,
            tmdbRating: movie.tmdbRating,
            trailer: movie.trailer,
            gallery: movie.gallery || [],
            tmdbId: movie.tmdbId,
            imdbId: movie.imdbId,
            mediaType: movie.mediaType ?? "movie",
            status: "watched",
            watchDate: today,
            rewatchCount: 0,
            personalRating: null,
            notes: null,
            lifetimeRank: null,
            tags: [],
            screenshots: [],
          }),
        });
        if (!createRes.ok) {
          const err = await createRes.json().catch(() => ({}));
          throw new Error(err.error || `Failed (${createRes.status})`);
        }
        toast.success(`Marked "${movie.title}" as watched`);
      } else {
        // Update existing movie
        const res = await fetch(`/api/movies/${movie.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "watched", watchDate: today }),
        });
        if (!res.ok) {
          throw new Error(`Update failed: ${res.status}`);
        }
        toast.success(`Marked "${movie.title}" as watched`);
      }
      triggerRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark as watched");
    } finally {
      setWatchedBusy(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Two-click confirm: first click shows "Click again to delete"
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000); // reset after 3s
      return;
    }

    if (deleteBusy) return;
    setDeleteBusy(true);

    try {
      if (isTmdbOnly) {
        // TMDb-only movie — nothing to delete from DB
        toast.info("This movie is not in your archive");
        return;
      }

      const res = await fetch(`/api/movies/${movie.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(`Delete failed: ${res.status}`);
      }
      toast.success(`Deleted "${movie.title}"`);
      triggerRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleteBusy(false);
      setConfirmDelete(false);
    }
  };

  return (
    <>
      {/* Bottom-left: Delete button */}
      <button
        type="button"
        aria-label={confirmDelete ? "Click again to confirm delete" : "Delete movie"}
        title={confirmDelete ? "Click again to confirm" : "Delete"}
        disabled={deleteBusy}
        onClick={handleDelete}
        className={cn(
          "absolute bottom-1.5 left-1.5 z-10",
          "flex size-7 items-center justify-center rounded-full",
          "shadow-sm backdrop-blur-sm transition-all",
          "opacity-0 group-hover:opacity-100",
          "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          deleteBusy && "opacity-100 animate-pulse",
          confirmDelete
            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            : "bg-background/85 text-destructive hover:bg-destructive hover:text-destructive-foreground"
        )}
      >
        <Trash2 className="size-3.5" />
      </button>

      {/* Bottom-right: Watched button (only show if not already watched) */}
      {!isAlreadyWatched && (
        <button
          type="button"
          aria-label="Mark as watched"
          title="Mark as watched"
          disabled={watchedBusy}
          onClick={markWatched}
          className={cn(
            "absolute bottom-1.5 right-1.5 z-10",
            "flex size-7 items-center justify-center rounded-full",
            "shadow-sm backdrop-blur-sm transition-all",
            "opacity-0 group-hover:opacity-100",
            "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            watchedBusy && "opacity-100 animate-pulse",
            "bg-background/85 text-emerald-500 hover:bg-emerald-500 hover:text-white"
          )}
        >
          <Check className="size-4" fill="currentColor" />
        </button>
      )}

      {/* If already watched, show a static green check */}
      {isAlreadyWatched && (
        <div
          className={cn(
            "absolute bottom-1.5 right-1.5 z-10",
            "flex size-7 items-center justify-center rounded-full",
            "bg-emerald-500/80 text-white shadow-sm backdrop-blur-sm"
          )}
          title="Already watched"
        >
          <Check className="size-4" fill="currentColor" />
        </div>
      )}
    </>
  );
}
