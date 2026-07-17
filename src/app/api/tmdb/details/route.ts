import { NextRequest, NextResponse } from "next/server";
import { getMovieDetails, getTvDetails, tmdbToMoviePayload, tmdbTvToMoviePayload } from "@/lib/tmdb";
import type { Movie } from "@/lib/movie/types";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function GET(req: NextRequest) {
  try {
    const idStr = req.nextUrl.searchParams.get("id")?.trim() ?? "";
    const mediaType = req.nextUrl.searchParams.get("type")?.trim() ?? "movie";
    const tmdbId = parseInt(idStr, 10);
    if (!tmdbId) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const isTv = mediaType === "tv" || mediaType === "series";
    const details = isTv ? await getTvDetails(tmdbId) : await getMovieDetails(tmdbId);
    const payload = isTv ? tmdbTvToMoviePayload(details) : tmdbToMoviePayload(details);

    const movie: Movie = {
      id: `tmdb-${tmdbId}`,
      tmdbId: payload.tmdbId,
      imdbId: payload.imdbId,
      title: payload.title ?? "Unknown",
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
      screenshots: [],
      status: "new",
      mediaType: isTv ? "series" : "movie",
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
    return NextResponse.json({ error: "TMDb details fetch failed" }, { status: 500 });
  }
}
