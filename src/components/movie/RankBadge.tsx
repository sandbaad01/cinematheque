"use client";

import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface RankBadgeProps {
  rank: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: { wrap: "px-1.5 py-0.5 text-xs gap-1", icon: "size-3" },
  md: { wrap: "px-2 py-0.5 text-sm gap-1", icon: "size-3.5" },
  lg: { wrap: "px-2.5 py-1 text-lg gap-1.5", icon: "size-4" },
};

/** A lifetime rank badge — gold trophy + "#N". */
export function RankBadge({ rank, size = "md", className }: RankBadgeProps) {
  const s = sizeMap[size];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-primary font-bold text-primary-foreground shadow-sm",
        s.wrap,
        className
      )}
    >
      <Trophy className={s.icon} fill="currentColor" />
      <span>#{rank}</span>
    </span>
  );
}
