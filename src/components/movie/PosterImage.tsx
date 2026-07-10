"use client";

import { useState } from "react";
import { Film } from "lucide-react";
import { posterUrl } from "@/lib/movie/types";
import { cn } from "@/lib/utils";

interface PosterImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  size?: "w200" | "w342" | "w500";
}

/**
 * Movie poster image with graceful gradient + Film-icon fallback.
 * Uses a plain <img> tag (TMDb is external) with lazy loading and fade-in.
 */
export function PosterImage({
  src,
  alt,
  className,
  size = "w342",
}: PosterImageProps) {
  const url = posterUrl(src ?? null, size);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  // Track the previous URL so we can reset state synchronously on URL change
  // (the React-recommended pattern for adjusting state during render).
  const [prevUrl, setPrevUrl] = useState(url);
  if (prevUrl !== url) {
    setPrevUrl(url);
    setLoaded(false);
    setErrored(false);
  }

  if (!url || errored) {
    return (
      <div
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/20 to-secondary p-3 text-center",
          className
        )}
        aria-label={alt}
      >
        <Film className="size-8 text-primary/70" strokeWidth={1.25} />
        <span className="line-clamp-3 text-xs font-medium text-muted-foreground">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-muted", className)}>
      <img
        src={url}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0"
        )}
      />
      {/* Subtle shimmer while loading */}
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted to-secondary" />
      )}
    </div>
  );
}
