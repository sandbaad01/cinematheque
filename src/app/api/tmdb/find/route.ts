import { NextRequest, NextResponse } from "next/server";
import { findByImdbId } from "@/lib/tmdb";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

/**
 * GET /api/tmdb/find?imdbId=tt0068646
 * Finds a TMDb movie by its IMDb ID using the /find endpoint.
 * Returns { tmdbId: number | null }
 */
export async function GET(req: NextRequest) {
  try {
    const imdbId = req.nextUrl.searchParams.get("imdbId")?.trim() ?? "";
    if (!imdbId) {
      return NextResponse.json({ tmdbId: null });
    }
    const tmdbId = await findByImdbId(imdbId);
    return NextResponse.json({ tmdbId });
  } catch (err) {
    console.error("GET /api/tmdb/find error", err);
    return NextResponse.json({ tmdbId: null });
  }
}
