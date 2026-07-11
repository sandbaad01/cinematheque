"use client";

import { Heart, Play, Star } from "lucide-react";
import { motion } from "framer-motion";
import type { Movie } from "@/lib/movie/types";
import { useNav } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PosterImage } from "./PosterImage";
import { RankBadge } from "./RankBadge";

interface MovieCardProps {
  movie: Movie;
}

/** A poster card for grid/row display. */
export function MovieCard({ movie }: MovieCardProps) {
  const goMovie = useNav((s) => s.goMovie);
  const year = movie.year ?? movie.releaseDate?.slice(0, 4);
  const rating = movie.personalRating ?? movie.imdbRating ?? movie.tmdbRating;

  return (
    <motion.button
      type="button"
      onClick={() => goMovie(movie.id)}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="poster-card group relative flex w-full flex-col gap-2 text-left focus-visible:outline-none"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border/60 bg-muted shadow-sm transition-shadow duration-300 group-hover:shadow-xl group-hover:shadow-black/40">
        <PosterImage
          src={movie.poster}
          alt={movie.title}
          size="w342"
          className="transition-transform duration-500 group-hover:scale-[1.04]"
        />

        {/* Top-left rank badge */}
        {movie.lifetimeRank != null && (
          <div className="absolute left-1.5 top-1.5">
            <RankBadge rank={movie.lifetimeRank} size="sm" />
          </div>
        )}

        {/* Top-right favorite indicator */}
        {movie.favorite && (
          <div className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm">
            <Heart className="size-4 text-primary" fill="currentColor" />
          </div>
        )}

        {/* Hover play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 opacity-0 backdrop-blur-[1px] transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg">
            <Play className="size-5" fill="currentColor" />
          </div>
        </div>

        {/* Bottom-right personal rating */}
        {movie.personalRating != null && (
          <div className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-md bg-background/85 px-1.5 py-0.5 text-xs font-semibold text-primary backdrop-blur-sm">
            <Star className="size-3" fill="currentColor" />
            {movie.personalRating.toFixed(1)}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <h3 className="line-clamp-1 text-sm font-medium leading-tight">
          {movie.title}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {year ?? "—"}
          {rating != null && (
            <span className="ml-1.5 inline-flex items-center gap-0.5">
              · <Star className="size-2.5" fill="currentColor" />{" "}
              {rating.toFixed(1)}
            </span>
          )}
        </p>
      </div>
    </motion.button>
  );
}
