import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  parseMovie,
  parseCollection,
  parseList,
  type Movie,
  type Collection,
  type PersonalList,
} from "@/lib/movie/types";

export const dynamic = "force-dynamic";

// GET /api/backup — export all data
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const download = searchParams.get("download") === "1";

    const [movies, collections, lists] = await Promise.all([
      db.movie.findMany(),
      db.collection.findMany(),
      db.personalList.findMany(),
    ]);

    const payload = {
      movies: movies.map(parseMovie) as Movie[],
      collections: collections.map(parseCollection) as Collection[],
      lists: lists.map(parseList) as PersonalList[],
      exportedAt: new Date().toISOString(),
    };

    if (download) {
      const json = JSON.stringify(payload, null, 2);
      return new NextResponse(json, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="cinetheque-backup.json"`,
        },
      });
    }

    return NextResponse.json(payload);
  } catch (err) {
    console.error("GET /api/backup error", err);
    return NextResponse.json(
      { error: "Failed to export backup" },
      { status: 500 }
    );
  }
}

// POST /api/backup — import (replace) all data
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const inMovies = Array.isArray(body?.movies) ? body.movies : [];
    const inCollections = Array.isArray(body?.collections)
      ? body.collections
      : [];
    const inLists = Array.isArray(body?.lists) ? body.lists : [];

    await db.$transaction(async (tx) => {
      await tx.movie.deleteMany();
      await tx.collection.deleteMany();
      await tx.personalList.deleteMany();

      for (const m of inMovies) {
        const mv: any = m;
        const data: any = {
          tmdbId: typeof mv.tmdbId === "number" ? mv.tmdbId : null,
          imdbId: mv.imdbId ?? null,
          title: mv.title ?? "",
          originalTitle: mv.originalTitle ?? null,
          poster: mv.poster ?? null,
          backdrop: mv.backdrop ?? null,
          releaseDate: mv.releaseDate ?? null,
          year: typeof mv.year === "number" ? mv.year : null,
          genres: JSON.stringify(Array.isArray(mv.genres) ? mv.genres : []),
          runtime: typeof mv.runtime === "number" ? mv.runtime : null,
          country: mv.country ?? null,
          language: mv.language ?? null,
          director: mv.director ?? null,
          writers: JSON.stringify(Array.isArray(mv.writers) ? mv.writers : []),
          cast: JSON.stringify(Array.isArray(mv.cast) ? mv.cast : []),
          overview: mv.overview ?? null,
          imdbRating: typeof mv.imdbRating === "number" ? mv.imdbRating : null,
          tmdbRating: typeof mv.tmdbRating === "number" ? mv.tmdbRating : null,
          trailer: mv.trailer ?? null,
          gallery: JSON.stringify(Array.isArray(mv.gallery) ? mv.gallery : []),
          status: mv.status ?? "watched",
          favorite: !!mv.favorite,
          rewatchCount: typeof mv.rewatchCount === "number" ? mv.rewatchCount : 0,
          personalRating:
            typeof mv.personalRating === "number" ? mv.personalRating : null,
          watchDate: mv.watchDate ?? null,
          notes: mv.notes ?? null,
          lifetimeRank:
            typeof mv.lifetimeRank === "number" ? mv.lifetimeRank : null,
          tags: JSON.stringify(Array.isArray(mv.tags) ? mv.tags : []),
        };
        if (mv.id) data.id = mv.id;
        if (mv.createdAt) data.createdAt = new Date(mv.createdAt);
        if (mv.updatedAt) data.updatedAt = new Date(mv.updatedAt);
        await tx.movie.create({ data });
      }

      for (const c of inCollections) {
        const cl: any = c;
        const data: any = {
          name: cl.name ?? "",
          description: cl.description ?? null,
          movieIds: JSON.stringify(
            Array.isArray(cl.movieIds) ? cl.movieIds : []
          ),
        };
        if (cl.id) data.id = cl.id;
        if (cl.createdAt) data.createdAt = new Date(cl.createdAt);
        if (cl.updatedAt) data.updatedAt = new Date(cl.updatedAt);
        await tx.collection.create({ data });
      }

      for (const l of inLists) {
        const ls: any = l;
        const data: any = {
          name: ls.name ?? "",
          description: ls.description ?? null,
          items: JSON.stringify(Array.isArray(ls.items) ? ls.items : []),
        };
        if (ls.id) data.id = ls.id;
        if (ls.createdAt) data.createdAt = new Date(ls.createdAt);
        if (ls.updatedAt) data.updatedAt = new Date(ls.updatedAt);
        await tx.personalList.create({ data });
      }
    });

    return NextResponse.json({
      imported: {
        movies: inMovies.length,
        collections: inCollections.length,
        lists: inLists.length,
      },
    });
  } catch (err) {
    console.error("POST /api/backup error", err);
    return NextResponse.json(
      { error: "Failed to import backup" },
      { status: 500 }
    );
  }
}
