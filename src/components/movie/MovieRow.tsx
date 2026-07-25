"use client";

import type { ReactNode } from "react";
import type { Movie } from "@/lib/movie/types";
import { cn } from "@/lib/utils";
import { MovieCard } from "./MovieCard";

interface MovieRowProps {
  movies: Movie[];
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  emptyText?: string;
  className?: string;
}

/** A horizontal scrollable row of MovieCards. */
export function MovieRow({
  movies,
  title,
  icon,
  action,
  emptyText = "No movies.",
  className,
}: MovieRowProps) {
  return (
    <section className={cn("space-y-3", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-4">
          {title && (
            <div className="flex items-center gap-2">
              {icon && (
                <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-primary">
                  {icon}
                </span>
              )}
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            </div>
          )}
          {action && <div>{action}</div>}
        </div>
      )}

      {movies.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <div className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
          {movies.map((m) => (
            <div key={m.id} className="w-40 shrink-0 md:w-44">
              <MovieCard movie={m} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
