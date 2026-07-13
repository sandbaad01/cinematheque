"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Movie } from "@/lib/movie/types";
import { useNav } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PosterImage } from "./PosterImage";

interface PosterCarouselProps {
  movies: Movie[];
  /** Auto-advance interval in ms (default 4000). */
  intervalMs?: number;
}

/**
 * Auto-rotating poster carousel built on embla-carousel-react.
 * Shows 5–6 posters at once (responsive), advances every `intervalMs`,
 * pauses on hover, and exposes left/right arrow buttons.
 * Each poster is clickable and navigates to the movie detail view.
 */
export function PosterCarousel({ movies, intervalMs = 4000 }: PosterCarouselProps) {
  const goMovie = useNav((s) => s.goMovie);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: true,
    dragFree: false,
    containScroll: "trimSnaps",
  });

  const [prevEnabled, setPrevEnabled] = useState(false);
  const [nextEnabled, setNextEnabled] = useState(false);
  const [paused, setPaused] = useState(false);

  const onSelect = useCallback((api: NonNullable<ReturnType<typeof useEmblaCarousel>[1]>) => {
    setPrevEnabled(api.canScrollPrev());
    setNextEnabled(api.canScrollNext());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    // Defer the initial button-state sync out of the effect body so we
    // don't trigger a synchronous setState-in-effect cascading render.
    queueMicrotask(() => onSelect(emblaApi));
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Auto-advance every intervalMs, pausing on hover/focus.
  useEffect(() => {
    if (!emblaApi || paused) return;
    const id = window.setInterval(() => {
      emblaApi.scrollNext();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [emblaApi, paused, intervalMs]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (movies.length === 0) return null;

  return (
    <div
      className="group/carousel relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* viewport */}
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {movies.map((m) => {
            const year = m.year ?? m.releaseDate?.slice(0, 4);
            return (
              <div
                key={m.id}
                className="min-w-0 shrink-0 grow-0 basis-1/2 px-1.5 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6"
              >
                <button
                  type="button"
                  onClick={() => goMovie(m.id)}
                  className="group/poster poster-card flex w-full flex-col gap-2 text-left focus-visible:outline-none"
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border/60 bg-muted shadow-sm transition-all duration-300 group-hover/poster:shadow-xl group-hover/poster:shadow-black/40">
                    <PosterImage
                      src={m.poster}
                      alt={m.title}
                      size="w342"
                      className="transition-transform duration-500 group-hover/poster:scale-[1.04]"
                    />
                    {/* hover gradient veil */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/poster:opacity-100" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="line-clamp-1 text-sm font-medium leading-tight">
                      {m.title}
                    </h3>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {year ?? "—"}
                    </p>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Arrow buttons — always visible, subtly emphasized on carousel hover */}
      <button
        type="button"
        onClick={scrollPrev}
        disabled={!prevEnabled}
        aria-label="Previous posters"
        className={cn(
          "absolute left-1 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/85 text-foreground shadow-md backdrop-blur-sm transition-all",
          "hover:bg-background hover:text-primary",
          "disabled:pointer-events-none disabled:opacity-0",
          "opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100"
        )}
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        onClick={scrollNext}
        disabled={!nextEnabled}
        aria-label="Next posters"
        className={cn(
          "absolute right-1 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/85 text-foreground shadow-md backdrop-blur-sm transition-all",
          "hover:bg-background hover:text-primary",
          "disabled:pointer-events-none disabled:opacity-0",
          "opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100"
        )}
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}
