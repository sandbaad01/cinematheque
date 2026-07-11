import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseCollection, type Collection } from "@/lib/movie/types";

export const dynamic = "force-dynamic";

// GET /api/collections
export async function GET() {
  try {
    const rows = await db.collection.findMany({
      orderBy: { updatedAt: "desc" },
    });
    const collections: Collection[] = rows.map(parseCollection);
    return NextResponse.json(collections);
  } catch (err) {
    console.error("GET /api/collections error", err);
    return NextResponse.json(
      { error: "Failed to fetch collections" },
      { status: 500 }
    );
  }
}

// POST /api/collections { name, description?, movieIds? }
//
// Smart collections: by default, the collection name is used to automatically
// search the entire movie archive (title, originalTitle, director, cast,
// overview, genres, tags) and every match is injected into the new collection.
// Pass an explicit `movieIds` array to skip auto-matching and create a manual
// collection instead.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const b: { name?: string; description?: string | null; movieIds?: string[] } =
      body || {};
    if (!b.name || typeof b.name !== "string" || !b.name.trim()) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const name = b.name.trim();
    let movieIds: string[];
    let matchedCount = 0;
    let autoMatched = false;

    if (Array.isArray(b.movieIds)) {
      // Explicit list — manual collection, skip smart matching.
      movieIds = b.movieIds;
    } else {
      // 1. Smart search across all relevant text fields based on the name.
      //    SQLite `contains` is case-insensitive for ASCII; genres/cast/tags
      //    are stored as JSON strings so `contains` matches their members.
      const matchingMovies = await db.movie.findMany({
        where: {
          OR: [
            { title: { contains: name } },
            { originalTitle: { contains: name } },
            { director: { contains: name } },
            { cast: { contains: name } },
            { overview: { contains: name } },
            { genres: { contains: name } },
            { tags: { contains: name } },
          ],
        },
        select: { id: true },
      });

      // 2. Extract matched movie ids (deduplicated, order preserved).
      movieIds = Array.from(new Set(matchingMovies.map((m) => m.id)));
      matchedCount = movieIds.length;
      autoMatched = true;
    }

    // 3. Create the collection with auto-assigned movies.
    const created = await db.collection.create({
      data: {
        name,
        description: b.description ?? null,
        movieIds: JSON.stringify(movieIds),
      },
    });

    return NextResponse.json(
      { ...parseCollection(created), matchedCount, autoMatched },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/collections error", err);
    return NextResponse.json(
      { error: "Failed to create collection" },
      { status: 500 }
    );
  }
}
