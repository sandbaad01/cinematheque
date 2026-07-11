import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseMovie, type Movie, type Recommendation } from "@/lib/movie/types";

export const dynamic = "force-dynamic";

interface Scored {
  movie: Movie;
  score: number;
  reasons: string[];
}

// Compute a similarity score between a candidate and a seed movie.
function scoreCandidate(candidate: Movie, seed: Movie): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // +3 same director
  if (
    seed.director &&
    candidate.director &&
    seed.director.toLowerCase() === candidate.director.toLowerCase()
  ) {
    score += 3;
    reasons.push(`same director (${seed.director})`);
  }

  // +2 per shared actor, max +6
  const seedCast = new Set(seed.cast.map((c) => c.toLowerCase()));
  const sharedActors = candidate.cast.filter((c) =>
    seedCast.has(c.toLowerCase())
  );
  if (sharedActors.length > 0) {
    score += Math.min(sharedActors.length * 2, 6);
    reasons.push(
      `shares ${sharedActors.length} actor${sharedActors.length > 1 ? "s" : ""}`
    );
  }

  // +1.5 per shared genre, max +4.5
  const seedGenres = new Set(seed.genres.map((g) => g.toLowerCase()));
  const sharedGenres = candidate.genres.filter((g) =>
    seedGenres.has(g.toLowerCase())
  );
  if (sharedGenres.length > 0) {
    score += Math.min(sharedGenres.length * 1.5, 4.5);
    reasons.push(
      `shares ${sharedGenres.length} genre${sharedGenres.length > 1 ? "s" : ""} (${sharedGenres.join(", ")})`
    );
  }

  // +1 same country
  if (
    seed.country &&
    candidate.country &&
    seed.country.toLowerCase() === candidate.country.toLowerCase()
  ) {
    score += 1;
    reasons.push(`same country (${seed.country})`);
  }

  // +1 similar personalRating (both exist, within 1.5)
  if (
    typeof seed.personalRating === "number" &&
    typeof candidate.personalRating === "number" &&
    Math.abs(seed.personalRating - candidate.personalRating) <= 1.5
  ) {
    score += 1;
    reasons.push(
      `similar rating (${candidate.personalRating}/10 vs ${seed.personalRating}/10)`
    );
  }

  // +0.5 shares a tag
  const seedTags = new Set(seed.tags.map((t) => t.toLowerCase()));
  const sharedTags = candidate.tags.filter((t) =>
    seedTags.has(t.toLowerCase())
  );
  if (sharedTags.length > 0) {
    score += 0.5;
    reasons.push(`shares tag "${sharedTags[0]}"`);
  }

  return { score, reasons };
}

function buildReason(movie: Movie, seed: Movie, reasons: string[]): string {
  if (reasons.length === 0) {
    return `"${movie.title}" might appeal to you based on your archive.`;
  }
  // If single seed (movieId), build specific sentences
  const sharedGenres = (() => {
    const sg = new Set(seed.genres.map((g) => g.toLowerCase()));
    return movie.genres.filter((g) => sg.has(g.toLowerCase()));
  })();

  if (reasons.length === 1) {
    const r = reasons[0];
    if (r.startsWith("same director")) {
      return `Same director as "${seed.title}".`;
    }
    if (r.startsWith("shares") && r.includes("genre")) {
      return `Similar ${sharedGenres.slice(0, 2).join("/")} to "${seed.title}".`;
    }
    return `Recommended because it ${r} with "${seed.title}".`;
  }

  // Multiple reasons — combine top two
  const top = reasons.slice(0, 2);
  const hasDirector = top.some((r) => r.startsWith("same director"));
  const hasGenre = top.some((r) => r.includes("genre"));
  if (hasDirector && hasGenre && sharedGenres.length > 0) {
    return `Same director and ${sharedGenres.slice(0, 2).join("/")} as "${seed.title}".`;
  }
  return `Recommended because it ${top.join(" and ")} with "${seed.title}".`;
}

// GET /api/recommendations
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const movieId = searchParams.get("movieId");
    const genre = searchParams.get("genre");
    const hideWatched = searchParams.get("hideWatched") === "true";

    const all = await db.movie.findMany();
    const movies: Movie[] = all.map(parseMovie);

    let seeds: Movie[];
    let candidates: Movie[];

    if (movieId) {
      const seed = movies.find((m) => m.id === movieId);
      if (!seed) {
        return NextResponse.json(
          { error: "Seed movie not found" },
          { status: 404 }
        );
      }
      seeds = [seed];
      candidates = movies.filter((m) => m.id !== seed.id);
    } else if (genre) {
      const gLower = genre.toLowerCase();
      seeds = movies.filter(
        (m) =>
          m.status === "watched" &&
          m.genres.some((g) => g.toLowerCase() === gLower)
      );
      candidates = movies.filter((m) =>
        m.genres.some((g) => g.toLowerCase() === gLower)
      );
    } else {
      // global
      seeds = movies.filter(
        (m) => m.status === "watched" && (m.personalRating ?? 0) >= 7
      );
      if (seeds.length === 0) {
        // fallback: any watched
        seeds = movies.filter((m) => m.status === "watched");
      }
      let notWatched = movies.filter((m) => m.status !== "watched");
      if (notWatched.length < 4) {
        // too few — fall back to all
        candidates = movies.filter((m) => !seeds.includes(m));
      } else {
        candidates = notWatched;
      }
    }

    if (seeds.length === 0 || candidates.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const scored: Scored[] = [];
    for (const cand of candidates) {
      let bestScore = 0;
      let bestReasons: string[] = [];
      let bestSeed: Movie | null = null;
      for (const seed of seeds) {
        if (cand.id === seed.id) continue;
        const { score, reasons } = scoreCandidate(cand, seed);
        if (score > bestScore) {
          bestScore = score;
          bestReasons = reasons;
          bestSeed = seed;
        }
      }
      if (bestScore <= 0) continue;
      if (cand.status === "watched") {
        if (hideWatched) continue;
        bestScore *= 0.1;
      }
      scored.push({
        movie: cand,
        score: bestScore,
        reasons: bestReasons,
        // bestSeed stored on the object for reason building
        ...(bestSeed ? { _seed: bestSeed } : {}),
      } as Scored & { _seed?: Movie });
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 50);

    const items: Recommendation[] = top.map((s) => {
      const seed = (s as any)._seed as Movie | undefined;
      const reason = seed
        ? buildReason(s.movie, seed, s.reasons)
        : s.reasons.length > 0
        ? `Recommended because it ${s.reasons.join(", ")}.`
        : `Recommended based on your archive.`;
      return { movie: s.movie, score: Math.round(s.score * 100) / 100, reason };
    });

    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET /api/recommendations error", err);
    return NextResponse.json(
      { error: "Failed to compute recommendations" },
      { status: 500 }
    );
  }
}
