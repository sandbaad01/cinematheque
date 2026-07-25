"use client";

import { Star } from "lucide-react";
import { motion } from "framer-motion";
import type { Movie } from "@/lib/movie/types";
import { useNav } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PosterImage } from "./PosterImage";
import { RankBadge } from "./RankBadge";
import { QuickStatusToggle } from "./QuickStatusToggle";
import { QuickAddButtons } from "./QuickAddButtons";
import { PosterActions } from "./PosterActions";

interface MovieCardProps {
  movie: Movie;
}

/** A poster card for grid/row display. Uses a div (not button) so that
 *  inner interactive elements like QuickStatusToggle don't violate HTML
 *  nesting rules (<button> cannot contain <button>). */
export function MovieCard({ movie }: MovieCardProps) {
  const goMovie = useNav((s) => s.goMovie);
  const year = movie.year ?? movie.releaseDate?.slice(0, 4);
  const rating = movie.personalRating ?? movie.imdbRating ?? movie.tmdbRating;
  const showQuickToggle = movie.status === "want";

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => goMovie(movie.id)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goMovie(movie.id); } }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="poster-card group relative flex w-full cursor-pointer flex-col gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
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

        {/* Quick add buttons for non-watched */}
        {showQuickToggle && <QuickStatusToggle movie={movie} />}
        <QuickAddButtons movie={movie} />

        {/* Bottom-corner actions: Delete (left) + Watched (right) */}
        <PosterActions movie={movie} />

        {/* Bottom-center personal rating (hidden on hover to avoid overlap) */}
        {movie.personalRating != null && (
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-md bg-background/85 px-1.5 py-0.5 text-xs font-semibold text-primary backdrop-blur-sm transition-opacity group-hover:opacity-0">
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
    </motion.div>
  );
}
