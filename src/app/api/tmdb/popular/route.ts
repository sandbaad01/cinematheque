import { NextResponse } from "next/server";
import { tmdbFetch, posterUrl } from "@/lib/tmdb";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function GET() {
  try {
    const data = await tmdbFetch<{ results: any[] }>("/movie/popular", { page: "1" });
    const results = (data.results ?? []).filter((r) => r.id && r.poster_path).slice(0, 20).map((r) => ({
      tmdbId: r.id, title: r.title, originalTitle: r.original_title ?? null,
      year: r.release_date ? parseInt(r.release_date.slice(0, 4), 10) || null : null,
      releaseDate: r.release_date ?? null, overview: r.overview ?? null,
      poster: posterUrl(r.poster_path, "w342"), tmdbRating: r.vote_average ?? null,
    }));
    return NextResponse.json({ results });
  } catch { return NextResponse.json({ results: [] }); }
}
