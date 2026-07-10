import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseMovie, type Movie } from "@/lib/movie/types";

export const dynamic = "force-dynamic";

// GET /api/search?q=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    if (!q) return NextResponse.json([]);

    const orClauses: any[] = [
      { title: { contains: q } },
      { originalTitle: { contains: q } },
      { director: { contains: q } },
      { cast: { contains: q } },
      { genres: { contains: q } },
      { country: { contains: q } },
      { language: { contains: q } },
    ];
    const asNum = Number(q);
    if (!Number.isNaN(asNum) && q.match(/^\d+$/)) {
      orClauses.push({ year: { equals: asNum } });
    }

    const rows = await db.movie.findMany({
      where: { OR: orClauses },
    });

    const movies: Movie[] = rows.map(parseMovie);
    return NextResponse.json(movies);
  } catch (err) {
    console.error("GET /api/search error", err);
    return NextResponse.json(
      { error: "Failed to search archive" },
      { status: 500 }
    );
  }
}
