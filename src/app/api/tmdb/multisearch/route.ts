import { NextRequest, NextResponse } from "next/server";
import { tmdbFetch, posterUrl } from "@/lib/tmdb";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) return NextResponse.json({ results: [] });

    const data = await tmdbFetch<{ results: any[] }>("/search/multi", {
      query: q,
      page: "1",
      include_adult: "false",
    });

    const results = (data.results ?? [])
      .filter((r) => (r.media_type === "movie" || r.media_type === "tv") && r.id && r.poster_path)
      .slice(0, 20)
      .map((r) => ({
        tmdbId: r.id,
        mediaType: r.media_type as "movie" | "tv",
        title: r.title ?? r.name ?? "Unknown",
        originalTitle: r.original_title ?? r.original_name ?? null,
        year: (r.release_date ?? r.first_air_date) ? parseInt((r.release_date ?? r.first_air_date).slice(0, 4), 10) || null : null,
        releaseDate: r.release_date ?? r.first_air_date ?? null,
        overview: r.overview ?? null,
        poster: posterUrl(r.poster_path, "w200"),
        tmdbRating: r.vote_average ?? null,
      }));

    return NextResponse.json({ results });
  } catch (err) {
    console.error("GET /api/tmdb/multisearch error", err);
    return NextResponse.json({ results: [] });
  }
}
