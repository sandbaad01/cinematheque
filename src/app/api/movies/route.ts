import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseMovie, type Movie } from "@/lib/movie/types";
import { requireUserId } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

// GET /api/movies — list with filters/sort (scoped to authenticated user)
export async function GET(req: NextRequest) {
  try {
    const [userId, authError] = await requireUserId();
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const genre = searchParams.get("genre");
    const country = searchParams.get("country");
    const language = searchParams.get("language");
    const year = searchParams.get("year");
    const director = searchParams.get("director");
    const tag = searchParams.get("tag");
    const favorite = searchParams.get("favorite");
    const mediaType = searchParams.get("mediaType");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "watchDate";
    const order = searchParams.get("order") === "asc" ? "asc" : "desc";

    const where: any = { userId };
    if (status) where.status = status;
    if (mediaType) where.mediaType = mediaType;
    if (country) where.country = country;
    if (language) where.language = language;
    if (director) where.director = director;
    if (year) {
      const y = Number(year);
      if (!Number.isNaN(y)) where.year = y;
    }
    if (favorite === "true") where.favorite = true;
    if (favorite === "false") where.favorite = false;

    // JSON-array contains filtering on SQLite (string contains)
    if (genre) where.genres = { contains: `"${genre}"` };
    if (tag) where.tags = { contains: `"${tag}"` };

    if (search) {
      const q = search;
      where.OR = [
        { title: { contains: q } },
        { originalTitle: { contains: q } },
        { director: { contains: q } },
        { cast: { contains: q } },
        { genres: { contains: q } },
        { country: { contains: q } },
        { language: { contains: q } },
      ];
    }

    // sort field mapping
    const sortMap: Record<string, string> = {
      watchDate: "watchDate",
      releaseYear: "year",
      title: "title",
      rating: "personalRating",
      rank: "lifetimeRank",
      added: "createdAt",
    };
    const sortField = sortMap[sort] || "watchDate";

    const rows = await db.movie.findMany({
      where,
      orderBy: { [sortField]: order },
    });

    const movies: Movie[] = rows.map(parseMovie);
    return NextResponse.json(movies);
  } catch (err) {
    console.error("GET /api/movies error", err);
    return NextResponse.json(
      { error: "Failed to fetch movies" },
      { status: 500 }
    );
  }
}

// POST /api/movies — create (scoped to authenticated user)
export async function POST(req: NextRequest) {
  try {
    const [userId, authError] = await requireUserId();
    if (authError) return authError;

    const body = await req.json();
    const b: any = body || {};

    // When adding a "watched" movie without an explicit watchDate, default to today
    const status = b.status ?? "new";
    const watchDate = b.watchDate ?? (status === "watched" ? new Date().toISOString().slice(0, 10) : null);

    const created = await db.movie.create({
      data: {
        userId,
        tmdbId: typeof b.tmdbId === "number" ? b.tmdbId : null,
        imdbId: b.imdbId ?? null,
        title: b.title ?? "",
        originalTitle: b.originalTitle ?? null,
        poster: b.poster ?? null,
        backdrop: b.backdrop ?? null,
        releaseDate: b.releaseDate ?? null,
        year: typeof b.year === "number" ? b.year : null,
        genres: JSON.stringify(Array.isArray(b.genres) ? b.genres : []),
        runtime: typeof b.runtime === "number" ? b.runtime : null,
        country: b.country ?? null,
        language: b.language ?? null,
        director: b.director ?? null,
        writers: JSON.stringify(Array.isArray(b.writers) ? b.writers : []),
        cast: JSON.stringify(Array.isArray(b.cast) ? b.cast : []),
        overview: b.overview ?? null,
        imdbRating: typeof b.imdbRating === "number" ? b.imdbRating : null,
        tmdbRating: typeof b.tmdbRating === "number" ? b.tmdbRating : null,
        trailer: b.trailer ?? null,
        gallery: JSON.stringify(Array.isArray(b.gallery) ? b.gallery : []),
        screenshots: JSON.stringify(Array.isArray(b.screenshots) ? b.screenshots : []),
        status,
        mediaType: b.mediaType === "series" ? "series" : "movie",
        favorite: !!b.favorite,
        rewatchCount: typeof b.rewatchCount === "number" ? b.rewatchCount : 0,
        personalRating:
          typeof b.personalRating === "number" ? b.personalRating : null,
        watchDate,
        notes: b.notes ?? null,
        lifetimeRank:
          typeof b.lifetimeRank === "number" ? b.lifetimeRank : null,
        tags: JSON.stringify(Array.isArray(b.tags) ? b.tags : []),
        episodeCount: typeof b.episodeCount === "number" ? b.episodeCount : null,
        episodeWatched: typeof b.episodeWatched === "number" ? b.episodeWatched : null,
        seasonCount: typeof b.seasonCount === "number" ? b.seasonCount : null,
        seasonWatched: typeof b.seasonWatched === "number" ? b.seasonWatched : null,
      },
    });

    return NextResponse.json(parseMovie(created), { status: 201 });
  } catch (err) {
    console.error("POST /api/movies error", err);
    return NextResponse.json(
      { error: "Failed to create movie" },
      { status: 500 }
    );
  }
}
