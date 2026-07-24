import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseMovie, type Movie } from "@/lib/movie/types";
import { requireUserId } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

// GET /api/stats — dashboard stats (scoped to authenticated user)
export async function GET() {
  try {
    const [userId, authError] = await requireUserId();
    if (authError) return authError;

    const now = new Date();
    const yearStr = String(now.getFullYear());
    const monthStr = `${yearStr}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const all = await db.movie.findMany({ where: { userId } });
    const movies: Movie[] = all.map(parseMovie);

    const watched = movies.filter((m) => m.status === "watched" || m.status === "watchedArchive");
    const totalWatched = watched.length;
    const totalMovies = movies.length;
    const thisYear = watched.filter(
      (m) => m.watchDate && m.watchDate.startsWith(yearStr)
    ).length;
    const thisMonth = watched.filter(
      (m) => m.watchDate && m.watchDate.startsWith(monthStr)
    ).length;
    const favorites = movies.filter((m) => m.favorite).length;

    // genres
    const genreMap = new Map<string, number>();
    for (const m of movies) {
      for (const g of m.genres) {
        const k = g.trim();
        if (!k) continue;
        genreMap.set(k, (genreMap.get(k) ?? 0) + 1);
      }
    }
    const topGenres = Array.from(genreMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // directors
    const dirMap = new Map<string, number>();
    for (const m of movies) {
      const d = m.director?.trim();
      if (!d) continue;
      dirMap.set(d, (dirMap.get(d) ?? 0) + 1);
    }
    const topDirectors = Array.from(dirMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // ratings
    const rated = watched
      .map((m) => m.personalRating)
      .filter((r): r is number => typeof r === "number");
    const avgRating =
      rated.length > 0
        ? rated.reduce((a, b) => a + b, 0) / rated.length
        : null;

    const totalRuntime = watched.reduce(
      (sum, m) => sum + (typeof m.runtime === "number" ? m.runtime : 0),
      0
    );

    const latestWatched = watched
      .slice()
      .sort((a, b) => {
        const at = a.watchDate ?? "";
        const bt = b.watchDate ?? "";
        return bt.localeCompare(at);
      })
      .slice(0, 8);

    const toTime = (v: unknown): number => {
      if (v instanceof Date) return v.getTime();
      if (typeof v === "string") return new Date(v).getTime();
      if (typeof v === "number") return v;
      return 0;
    };
    const recentlyAdded = movies
      .slice()
      .sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt))
      .slice(0, 8);

    return NextResponse.json({
      totalWatched,
      totalMovies,
      thisYear,
      thisMonth,
      favorites,
      topGenres,
      topDirectors,
      latestWatched,
      recentlyAdded,
      avgRating,
      totalRuntime,
    });
  } catch (err) {
    console.error("GET /api/stats error", err);
    return NextResponse.json(
      { error: "Failed to compute stats" },
      { status: 500 }
    );
  }
}
