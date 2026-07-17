import { NextRequest, NextResponse } from "next/server";
import { searchMovies, posterUrl, type TmdbSearchResult } from "@/lib/tmdb";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * GET /api/tmdb/search?q=...
 * Searches TMDb for movies by title and returns a normalized list with
 * full poster URLs ready to display in the Add Movie dialog.
 */
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    const yearStr = req.nextUrl.searchParams.get("year")?.trim() ?? "";
    const year = yearStr ? parseInt(yearStr, 10) || undefined : undefined;
    if (q.length < 2) {
      return NextResponse.json({ results: [] });
    }
    const data = await searchMovies(q, 1, year);

    const results = (data.results ?? [])
      .filter((r) => r.id)
      .slice(0, 12)
      .map((r: TmdbSearchResult) => ({
        tmdbId: r.id,
        title: r.title,
        originalTitle: r.original_title ?? null,
        year: r.release_date ? parseInt(r.release_date.slice(0, 4), 10) || null : null,
        overview: r.overview ?? null,
        poster: posterUrl(r.poster_path, "w200"),
        tmdbRating: r.vote_average ?? null,
      }));

    return NextResponse.json({ results });
  } catch (err) {
    console.error("GET /api/tmdb/search error", err);
    return NextResponse.json(
      { results: [], error: "TMDb search failed" },
      { status: 200 } // return 200 with empty list so the UI degrades gracefully
    );
  }
}
