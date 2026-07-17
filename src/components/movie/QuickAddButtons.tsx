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
      // Try to update existing movie first
      const res = await fetch(`/api/movies/${movie.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(`Added to ${status === "want" ? "Wishlist" : "Watchlist"}`);
        triggerRefresh();
        return;
      }
      // Movie not in DB yet — create it with the chosen status
      const createRes = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...movie,
          status,
          rewatchCount: 0,
          personalRating: null,
          watchDate: null,
          notes: null,
          lifetimeRank: null,
          tags: [],
          screenshots: [],
          gallery: movie.gallery || [],
        }),
      });
      if (!createRes.ok) throw new Error();
      toast.success(`Added to ${status === "want" ? "Wishlist" : "Watchlist"}`);
      triggerRefresh();
    } catch {
      toast.error("Failed to add");
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
