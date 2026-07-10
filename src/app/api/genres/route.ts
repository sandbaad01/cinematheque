import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safeJsonArr } from "@/lib/movie/types";

export const dynamic = "force-dynamic";

// GET /api/genres — aggregate all genres with counts
export async function GET() {
  try {
    const movies = await db.movie.findMany({ select: { genres: true } });
    const counts = new Map<string, number>();
    for (const m of movies) {
      const genres = safeJsonArr(m.genres);
      for (const g of genres) {
        const key = g.trim();
        if (!key) continue;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    const result = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/genres error", err);
    return NextResponse.json(
      { error: "Failed to fetch genres" },
      { status: 500 }
    );
  }
}
