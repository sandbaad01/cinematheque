import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseMovie } from "@/lib/movie/types";

export const dynamic = "force-dynamic";

// GET /api/random — pick a random want-to-watch movie
export async function GET() {
  try {
    const rows = await db.movie.findMany({ where: { status: "want" } });
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "no want-to-watch movies" },
        { status: 404 }
      );
    }
    const idx = Math.floor(Math.random() * rows.length);
    return NextResponse.json(parseMovie(rows[idx]));
  } catch (err) {
    console.error("GET /api/random error", err);
    return NextResponse.json(
      { error: "Failed to fetch random movie" },
      { status: 500 }
    );
  }
}
