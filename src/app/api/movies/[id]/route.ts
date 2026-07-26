import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseMovie } from "@/lib/movie/types";
import { requireUserId } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/movies/[id]
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const [userId, authError] = await requireUserId();
    if (authError) return authError;

    const { id } = await ctx.params;
    const row = await db.movie.findFirst({
      where: { id, userId },
    });
    if (!row) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }
    return NextResponse.json(parseMovie(row));
  } catch (err) {
    console.error("GET /api/movies/[id] error", err);
    return NextResponse.json(
      { error: "Failed to fetch movie" },
      { status: 500 }
    );
  }
}

// PUT /api/movies/[id]
export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const [userId, authError] = await requireUserId();
    if (authError) return authError;

    const { id } = await ctx.params;
    const existing = await db.movie.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }
    const body = await req.json();
    const b: any = body || {};

    const data: any = {};
    if (b.tmdbId !== undefined) data.tmdbId = typeof b.tmdbId === "number" ? b.tmdbId : null;
    if (b.imdbId !== undefined) data.imdbId = b.imdbId ?? null;
    if (b.title !== undefined) data.title = b.title;
    if (b.originalTitle !== undefined) data.originalTitle = b.originalTitle ?? null;
    if (b.poster !== undefined) data.poster = b.poster ?? null;
    if (b.backdrop !== undefined) data.backdrop = b.backdrop ?? null;
    if (b.releaseDate !== undefined) data.releaseDate = b.releaseDate ?? null;
    if (b.year !== undefined) data.year = typeof b.year === "number" ? b.year : null;
    if (b.genres !== undefined) data.genres = JSON.stringify(Array.isArray(b.genres) ? b.genres : []);
    if (b.runtime !== undefined) data.runtime = typeof b.runtime === "number" ? b.runtime : null;
    if (b.country !== undefined) data.country = b.country ?? null;
    if (b.language !== undefined) data.language = b.language ?? null;
    if (b.director !== undefined) data.director = b.director ?? null;
    if (b.writers !== undefined) data.writers = JSON.stringify(Array.isArray(b.writers) ? b.writers : []);
    if (b.cast !== undefined) data.cast = JSON.stringify(Array.isArray(b.cast) ? b.cast : []);
    if (b.overview !== undefined) data.overview = b.overview ?? null;
    if (b.imdbRating !== undefined) data.imdbRating = typeof b.imdbRating === "number" ? b.imdbRating : null;
    if (b.tmdbRating !== undefined) data.tmdbRating = typeof b.tmdbRating === "number" ? b.tmdbRating : null;
    if (b.trailer !== undefined) data.trailer = b.trailer ?? null;
    if (b.gallery !== undefined) data.gallery = JSON.stringify(Array.isArray(b.gallery) ? b.gallery : []);
    if (b.screenshots !== undefined) data.screenshots = JSON.stringify(Array.isArray(b.screenshots) ? b.screenshots : []);
    if (b.status !== undefined) data.status = b.status;
    if (b.mediaType !== undefined) data.mediaType = b.mediaType === "series" ? "series" : "movie";
    if (b.favorite !== undefined) data.favorite = !!b.favorite;
    if (b.rewatchCount !== undefined) data.rewatchCount = typeof b.rewatchCount === "number" ? b.rewatchCount : 0;
    if (b.personalRating !== undefined) data.personalRating = typeof b.personalRating === "number" ? b.personalRating : null;
    if (b.watchDate !== undefined) data.watchDate = b.watchDate ?? null;
    if (b.notes !== undefined) data.notes = b.notes ?? null;
    if (b.lifetimeRank !== undefined) {
      const newRank = typeof b.lifetimeRank === "number" ? b.lifetimeRank : null;
      data.lifetimeRank = newRank;

      // Auto-shift: if the new rank is already taken by another movie,
      // shift that movie (and all movies with rank >= newRank) down by 1.
      if (newRank !== null) {
        // Find all movies with rank >= newRank (excluding the current movie)
        const moviesToShift = await db.movie.findMany({
          where: {
            userId,
            id: { not: id },
            lifetimeRank: { gte: newRank },
          },
          orderBy: { lifetimeRank: "desc" }, // shift from highest to avoid conflicts
        });

        // Shift each movie's rank down by 1
        for (const m of moviesToShift) {
          await db.movie.update({
            where: { id: m.id },
            data: { lifetimeRank: (m.lifetimeRank ?? 0) + 1 },
          });
        }
      }
    }
    if (b.tags !== undefined) data.tags = JSON.stringify(Array.isArray(b.tags) ? b.tags : []);

    const updated = await db.movie.update({ where: { id }, data });
    return NextResponse.json(parseMovie(updated));
  } catch (err) {
    console.error("PUT /api/movies/[id] error", err);
    return NextResponse.json(
      { error: "Failed to update movie" },
      { status: 500 }
    );
  }
}

// DELETE /api/movies/[id]
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const [userId, authError] = await requireUserId();
    if (authError) return authError;

    const { id } = await ctx.params;
    const existing = await db.movie.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    await db.movie.delete({ where: { id } });

    // Remove id from collections.movieIds and personalLists.items
    const collections = await db.collection.findMany({ where: { userId } });
    for (const c of collections) {
      try {
        const arr: string[] = JSON.parse(c.movieIds || "[]");
        if (arr.includes(id)) {
          const next = arr.filter((x) => x !== id);
          await db.collection.update({
            where: { id: c.id },
            data: { movieIds: JSON.stringify(next) },
          });
        }
      } catch {
        /* ignore */
      }
    }

    const lists = await db.personalList.findMany({ where: { userId } });
    for (const l of lists) {
      try {
        const items: { movieId: string; rank: number; note?: string }[] =
          JSON.parse(l.items || "[]");
        if (items.some((it) => it.movieId === id)) {
          const next = items.filter((it) => it.movieId !== id);
          await db.personalList.update({
            where: { id: l.id },
            data: { items: JSON.stringify(next) },
          });
        }
      } catch {
        /* ignore */
      }
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("DELETE /api/movies/[id] error", err);
    return NextResponse.json(
      { error: "Failed to delete movie" },
      { status: 500 }
    );
  }
}
