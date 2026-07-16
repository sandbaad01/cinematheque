"use client";

import { useI18n } from "@/lib/i18n/context";
import { useFetch } from "@/lib/useFetch";
import { useNav } from "@/lib/store";
import { Sparkles, Film } from "lucide-react";

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
          <div key={m.tmdbId} className="w-32 shrink-0 md:w-40">
            <button
              onClick={() => goMovie(`tmdb-${m.tmdbId}`)}
              className="block w-full text-left"
            >
              <div className="overflow-hidden rounded-lg border border-border/60 bg-muted shadow-sm transition-transform duration-300 hover:scale-[1.03]">
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
          </div>
        ))}
      </div>
    </section>
  );
}
