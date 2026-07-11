import { NextRequest, NextResponse } from "next/server";
import { getMovieDetails, tmdbToMoviePayload } from "@/lib/tmdb";
import type { Movie } from "@/lib/movie/types";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * GET /api/tmdb/details?id=...
 * Returns full TMDb movie details in the complete Movie shape (with default
 * values for personal fields) so it can be used directly by MovieDetailView.
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

    // Return a complete Movie-shaped object with defaults for personal fields
    const movie: Movie = {
      id: `tmdb-${tmdbId}`,
      tmdbId: payload.tmdbId,
      imdbId: payload.imdbId,
      title: payload.title,
      originalTitle: payload.originalTitle,
      poster: payload.poster,
      backdrop: payload.backdrop,
      releaseDate: payload.releaseDate,
      year: payload.year,
      genres: payload.genres,
      runtime: payload.runtime,
      country: payload.country,
      language: payload.language,
      director: payload.director,
      writers: payload.writers,
      cast: payload.cast,
      overview: payload.overview,
      imdbRating: null,
      tmdbRating: payload.tmdbRating,
      trailer: payload.trailer,
      gallery: payload.gallery,
      status: "want",
      favorite: false,
      rewatchCount: 0,
      personalRating: null,
      watchDate: null,
      notes: null,
      lifetimeRank: null,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(movie);
  } catch (err) {
    console.error("GET /api/tmdb/details error", err);
    return NextResponse.json(
      { error: "TMDb details fetch failed" },
      { status: 500 }
    );
  }
}
