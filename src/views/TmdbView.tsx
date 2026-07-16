"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import { useFetch } from "@/lib/useFetch";
import { Film, Loader2, Heart, ListPlus, Search as SearchIcon, TrendingUp, Star, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface TmdbMovie {
  tmdbId: number;
  title: string;
  originalTitle?: string | null;
  year: number | null;
  releaseDate: string | null;
  overview: string | null;
  poster: string | null;
  tmdbRating: number | null;
}

type Tab = "popular" | "top_rated" | "upcoming" | "search";

export function TmdbView() {
  const { goMovie } = useNav();
  const [tab, setTab] = useState<Tab>("popular");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSubmitted, setSearchSubmitted] = useState("");

  const apiUrl = tab === "search" && searchSubmitted
    ? `/api/tmdb/search?q=${encodeURIComponent(searchSubmitted)}`
    : tab === "upcoming"
    ? "/api/tmdb/upcoming"
    : `/api/tmdb/${tab}`;

  const { data, loading } = useFetch<{ results: TmdbMovie[] }>(apiUrl);
  const movies = data?.results ?? [];

  const addToStatus = async (m: TmdbMovie, status: "want" | "watchlist") => {
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

  const tabs: { key: Tab; label: string; icon: typeof Film }[] = [
    { key: "popular", label: "Popular", icon: TrendingUp },
    { key: "top_rated", label: "Top Rated", icon: Star },
    { key: "upcoming", label: "Upcoming", icon: Calendar },
    { key: "search", label: "Search", icon: SearchIcon },
  ];

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <Button
              key={t.key}
              variant={tab === t.key ? "default" : "outline"}
              size="sm"
              onClick={() => { setTab(t.key); if (t.key !== "search") setSearchSubmitted(""); }}
            >
              <Icon className="size-4" />
              {t.label}
            </Button>
          );
        })}
      </div>

      {/* Search input */}
      {tab === "search" && (
        <form
          onSubmit={(e) => { e.preventDefault(); setSearchSubmitted(searchQuery.trim()); }}
          className="flex gap-2"
        >
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search TMDb..."
            autoFocus
          />
          <Button type="submit" disabled={!searchQuery.trim()}>
            <SearchIcon className="size-4" />
          </Button>
        </form>
      )}

      {/* Movies grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
          ))}
        </div>
      ) : movies.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No movies found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {movies.map((m) => (
            <div key={m.tmdbId} className="group relative">
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
                  {m.year ?? "—"}
                  {m.tmdbRating != null && <span className="ml-1.5">· ★ {m.tmdbRating.toFixed(1)}</span>}
                </p>
              </button>

              {/* Wishlist button (left) */}
              <button
                onClick={(e) => { e.stopPropagation(); addToStatus(m, "want"); }}
                title="Add to Wishlist"
                className="absolute left-1.5 top-1.5 z-10 flex size-7 items-center justify-center rounded-full bg-amber-500/80 text-white opacity-0 shadow transition-opacity hover:bg-amber-500 group-hover:opacity-100"
              >
                <Heart className="size-3.5" />
              </button>

              {/* Watchlist button (right) */}
              <button
                onClick={(e) => { e.stopPropagation(); addToStatus(m, "watchlist"); }}
                title="Add to Watchlist"
                className="absolute right-1.5 top-1.5 z-10 flex size-7 items-center justify-center rounded-full bg-primary/80 text-primary-foreground opacity-0 shadow transition-opacity hover:bg-primary group-hover:opacity-100"
              >
                <ListPlus className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
