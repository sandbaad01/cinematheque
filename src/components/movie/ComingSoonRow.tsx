"use client";

import { useI18n } from "@/lib/i18n/context";
import { useFetch } from "@/lib/useFetch";
import { useNav } from "@/lib/store";
import { Sparkles, Film, Heart, ListPlus } from "lucide-react";
import { toast } from "sonner";

interface UpcomingMovie {
  tmdbId: number;
  title: string;
  originalTitle?: string | null;
  year: number | null;
  releaseDate: string | null;
  overview: string | null;
  poster: string | null;
  tmdbRating: number | null;
}

export function ComingSoonRow() {
  const { goMovie } = useNav();
  const { data, loading } = useFetch<{ results: UpcomingMovie[] }>("/api/tmdb/upcoming");
  const movies = data?.results ?? [];

  if (loading && movies.length === 0) return null;
  if (movies.length === 0) return null;

  const addToStatus = async (m: UpcomingMovie, status: "want" | "watchlist", e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const detailsRes = await fetch(`/api/tmdb/details?id=${m.tmdbId}`);
      if (!detailsRes.ok) throw new Error();
      const details = await detailsRes.json();
      const res = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...details, status, rewatchCount: 0, personalRating: null, watchDate: null, notes: null, lifetimeRank: null, tags: [], screenshots: [], gallery: details.gallery || [] }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Added "${m.title}" to ${status === "want" ? "Wishlist" : "Watchlist"}`);
    } catch {
      toast.error("Failed to add");
    }
  };

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Sparkles className="size-4" />
        </span>
        <h2 className="text-lg font-semibold">Coming Soon</h2>
      </div>
      <div className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {movies.map((m) => (
          <div key={m.tmdbId} className="group relative w-32 shrink-0 md:w-40">
            <button onClick={() => goMovie(`tmdb-${m.tmdbId}`)} className="block w-full text-left">
              <div className="overflow-hidden rounded-lg border border-border/60 bg-muted shadow-sm transition-transform duration-300 group-hover:scale-[1.03]">
                {m.poster ? (
                  <img src={m.poster} alt={m.title} className="aspect-[2/3] w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex aspect-[2/3] items-center justify-center text-muted-foreground">
                    <Film className="size-8" />
                  </div>
                )}
              </div>
              <p className="mt-1.5 line-clamp-1 text-sm font-medium">{m.title}</p>
              <p className="text-xs text-muted-foreground">
                {m.releaseDate ? new Date(m.releaseDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : m.year ?? "—"}
              </p>
            </button>

            {/* Wishlist button (left) */}
            <button
              onClick={(e) => addToStatus(m, "want", e)}
              title="Add to Wishlist"
              className="absolute left-1.5 top-1.5 z-10 flex size-7 items-center justify-center rounded-full bg-amber-500/80 text-white opacity-0 shadow transition-opacity hover:bg-amber-500 group-hover:opacity-100"
            >
              <Heart className="size-3.5" />
            </button>

            {/* Watchlist button (right) */}
            <button
              onClick={(e) => addToStatus(m, "watchlist", e)}
              title="Add to Watchlist"
              className="absolute right-1.5 top-1.5 z-10 flex size-7 items-center justify-center rounded-full bg-primary/80 text-primary-foreground opacity-0 shadow transition-opacity hover:bg-primary group-hover:opacity-100"
            >
              <ListPlus className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
