"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  value: number | null;
  onChange?: (v: number | null) => void;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { star: "size-3.5", text: "text-sm", gap: "gap-0.5" },
  md: { star: "size-4", text: "text-base", gap: "gap-1" },
  lg: { star: "size-6", text: "text-2xl", gap: "gap-1" },
};

/**
 * 0–10 rating display/input. Each of 10 segments = 1.0 point.
 * Clicking the active value again clears it (sets null).
 */
export function RatingStars({
  value,
  onChange,
  size = "md",
  readOnly = false,
  className,
}: RatingStarsProps) {
  const s = sizeMap[size];
  const isInput = !readOnly && typeof onChange === "function";
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value ?? 0;
  const label = value != null ? value.toFixed(1) : "—";

  if (!isInput) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-medium",
          s.text,
          value != null ? "text-primary" : "text-muted-foreground",
          className
        )}
      >
        <Star
          className={s.star}
          fill={value != null ? "currentColor" : "none"}
          strokeWidth={1.5}
        />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <div
      className={cn("inline-flex items-center gap-2", className)}
      onMouseLeave={() => setHover(null)}
    >
      <div className={cn("inline-flex items-center", s.gap)}>
        {Array.from({ length: 10 }).map((_, i) => {
          const idx = i + 1;
          const active = idx <= display;
          return (
            <button
              key={i}
              type="button"
              aria-label={`Rate ${idx}`}
              onMouseEnter={() => setHover(idx)}
              onClick={() => {
                if (value === idx) onChange?.(null);
                else onChange?.(idx);
              }}
              className="rounded-sm p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Star
                className={cn(
                  s.star,
                  active
                    ? "text-primary"
                    : "text-muted-foreground/40"
                )}
                fill={active ? "currentColor" : "none"}
                strokeWidth={1.5}
              />
            </button>
          );
        })}
      </div>
      <span
        className={cn(
          "font-medium tabular-nums",
          s.text,
          value != null ? "text-primary" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  );
}
