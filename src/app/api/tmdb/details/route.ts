import { NextRequest, NextResponse } from "next/server";
import { getMovieDetails, tmdbToMoviePayload } from "@/lib/tmdb";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * GET /api/tmdb/details?id=...
 * Returns full TMDb movie details (title, cast, director, trailer, gallery,
 * ratings, etc.) in the exact shape our Movie model / POST /api/movies expects.
 */
export async function GET(req: NextRequest) {
  try {
    const idStr = req.nextUrl.searchParams.get("id")?.trim() ?? "";
    const tmdbId = parseInt(idStr, 10);
    if (!tmdbId) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const details = await getMovieDetails(tmdbId);
    const payload = tmdbToMoviePayload(details);
    return NextResponse.json(payload);
  } catch (err) {
    console.error("GET /api/tmdb/details error", err);
    return NextResponse.json(
      { error: "TMDb details fetch failed" },
      { status: 500 }
    );
  }
}
