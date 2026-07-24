"use client";

import { Heart, ListPlus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import type { Movie } from "@/lib/movie/types";
import { useNav } from "@/lib/store";

interface QuickAddButtonsProps {
  movie: Movie;
}

/** Wishlist + Watchlist quick-add buttons shown on movie posters.
 *  When clicked, creates the movie in DB (if not already) with the chosen status. */
export function QuickAddButtons({ movie }: QuickAddButtonsProps) {
  const { triggerRefresh } = useNav();
  const [adding, setAdding] = useState<string | null>(null);

  const addToStatus = async (status: "want" | "watchlist") => {
    if (adding) return;
    setAdding(status);
    try {
      // If this is a TMDb-only movie (not yet in DB), create it directly
      const isTmdbOnly = movie.id.startsWith("tmdb-") || movie.id.length < 20;
      let success = false;

      if (!isTmdbOnly) {
        // Movie is in DB — update its status
        const res = await fetch(`/api/movies/${movie.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (res.ok) {
          success = true;
        }
      }

      if (!success) {
        // Either TMDb-only movie, or PUT failed — create in DB
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
            status,
            rewatchCount: 0,
            personalRating: null,
            watchDate: null,
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
      }
      toast.success(`Added to ${status === "want" ? "Wishlist" : "Watchlist"}`);
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setAdding(null);
    }
  };

  // Show for all movies except those already in wishlist/watchlist
  if (movie.status === "want" || movie.status === "watchlist") return null;

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); addToStatus("want"); }}
        disabled={!!adding}
        title="Add to Wishlist"
        className="absolute left-1 top-1 z-10 flex size-5 items-center justify-center rounded-full bg-amber-500/80 text-white opacity-0 shadow transition-opacity hover:bg-amber-500 group-hover:opacity-100 disabled:opacity-50"
      >
        <Heart className="size-3" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); addToStatus("watchlist"); }}
        disabled={!!adding}
        title="Add to Watchlist"
        className="absolute right-1 top-1 z-10 flex size-5 items-center justify-center rounded-full bg-primary/80 text-primary-foreground opacity-0 shadow transition-opacity hover:bg-primary group-hover:opacity-100 disabled:opacity-50"
      >
        <ListPlus className="size-3" />
      </button>
    </>
  );
}
