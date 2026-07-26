import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseMovie, type Movie, type Recommendation } from "@/lib/movie/types";
import {
  getRecommendations,
  getSimilarMovies,
  getMovieKeywords,
  getMovieDetails,
  tmdbToMoviePayload,
  posterUrl,
  type TmdbRecommendationItem,
} from "@/lib/tmdb";
import { requireUserId } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// A candidate from TMDb, with a score and the seeds that recommended it.
interface TmdbCandidate {
  tmdbId: number;
  item: TmdbRecommendationItem;
  score: number;
  seeds: string[]; // titles of seed movies that recommended this
  source: "recommendation" | "similar";
  keywordOverlap: number;
}

/**
 * GET /api/recommendations
 * Params:
 *   movieId — get recommendations based on a specific movie
 *   genre   — get recommendations within a genre
 *   (none)  — global recommendations based on the user's top-rated movies
 *
 * Uses TMDb's collaborative-filtering recommendation engine as the PRIMARY
 * signal (movies that millions of TMDb users watched after the seed movie),
 * supplemented by TMDb keyword overlap (thematic similarity) and local
 * archive signals (shared director/actors/genres).
 *
 * Candidates that are already in the user's archive are filtered out
 * (unless hideWatched=false).
 */
export async function GET(req: NextRequest) {
  try {
    const [userId, authError] = await requireUserId();
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const movieId = searchParams.get("movieId");
    const genre = searchParams.get("genre");
    const hideWatched = searchParams.get("hideWatched") !== "false";

    const all = await db.movie.findMany({ where: { userId } });
    const archiveMovies: Movie[] = all.map(parseMovie);

    // Build a set of tmdbIds already in the archive (for filtering)
    const archiveTmdbIds = new Set(
      archiveMovies.filter((m) => m.tmdbId != null).map((m) => m.tmdbId!)
    );
    // Also build a normalized title+year set for fuzzy matching
    const archiveTitleKeys = new Set(
      archiveMovies.map((m) =>
        `${m.title.toLowerCase().trim()}|${m.year ?? ""}`
      )
    );

    // ---------- Determine seed movies ----------
    let seedMovies: Movie[] = [];
    let seedContext: { title: string; director: string | null; year: number | null }[] = [];

    if (movieId) {
      // Handle TMDb-only movies (not yet in the archive)
      if (movieId.startsWith("tmdb-")) {
        const tmdbId = parseInt(movieId.replace("tmdb-", ""), 10);
        if (!tmdbId) {
          return NextResponse.json({ error: "Invalid TMDb id" }, { status: 400 });
        }
        try {
          const details = await getMovieDetails(tmdbId);
          const payload = tmdbToMoviePayload(details);
          const seedMovie: Movie = {
            id: movieId,
            ...payload,
            poster: payload.poster,
            backdrop: payload.backdrop,
            imdbRating: null,
            status: "new",
            favorite: false,
            rewatchCount: 0,
            personalRating: null,
            watchDate: null,
            notes: null,
            lifetimeRank: null,
            tags: [],
            episodeCount: null,
            episodeWatched: null,
            seasonCount: null,
            seasonWatched: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as Movie;
          seedMovies = [seedMovie];
        } catch {
          return NextResponse.json({ error: "TMDb movie not found" }, { status: 404 });
        }
      } else {
        const seed = archiveMovies.find((m) => m.id === movieId);
        if (!seed) {
          return NextResponse.json({ error: "Seed movie not found" }, { status: 404 });
        }
        seedMovies = [seed];
      }
    } else if (genre) {
      const gLower = genre.toLowerCase();
      seedMovies = archiveMovies.filter(
        (m) =>
          m.status === "watched" &&
          m.genres.some((g) => g.toLowerCase() === gLower)
      );
    } else {
      // Global: use top-rated watched movies (rating >= 7), or top 8 by rating
      seedMovies = archiveMovies
        .filter((m) => m.status === "watched" && m.personalRating != null)
        .sort((a, b) => (b.personalRating ?? 0) - (a.personalRating ?? 0))
        .slice(0, 8);
      if (seedMovies.length === 0) {
        seedMovies = archiveMovies.filter((m) => m.status === "watched").slice(0, 8);
      }
    }

    if (seedMovies.length === 0) {
      return NextResponse.json({ items: [] });
    }

    seedContext = seedMovies.map((m) => ({
      title: m.title,
      director: m.director,
      year: m.year,
    }));

    // ---------- Fetch TMDb recommendations for each seed ----------
    const candidateMap = new Map<number, TmdbCandidate>();

    // Collect seed keywords for keyword-overlap scoring
    const seedKeywordSets: Map<string, Set<string>> = new Map(); // seedTitle -> keywords
    const allSeedKeywords = new Set<string>();

    for (const seed of seedMovies) {
      if (!seed.tmdbId) continue;
      try {
        const [recs, similar, keywords] = await Promise.all([
          getRecommendations(seed.tmdbId),
          getSimilarMovies(seed.tmdbId),
          getMovieKeywords(seed.tmdbId),
        ]);

        const kwSet = new Set(keywords.map((k) => k.name.toLowerCase()));
        seedKeywordSets.set(seed.title, kwSet);
        kwSet.forEach((k) => allSeedKeywords.add(k));

        // Score recommendations higher than similar
        const processItems = (items: TmdbRecommendationItem[], source: "recommendation" | "similar") => {
          for (const item of items) {
            if (!item.id || archiveTmdbIds.has(item.id)) continue;
            // Fuzzy title match to catch duplicates without tmdbId
            const titleKey = `${item.title.toLowerCase().trim()}|${item.release_date ? item.release_date.slice(0, 4) : ""}`;
            if (archiveTitleKeys.has(titleKey)) continue;

            const baseScore = source === "recommendation" ? 10 : 6;
            // Weight by the seed's personal rating (higher-rated seeds count more)
            const ratingWeight = seed.personalRating != null ? 1 + seed.personalRating / 20 : 1;
            const score = baseScore * ratingWeight + (item.vote_average ?? 0) * 0.3;

            const existing = candidateMap.get(item.id);
            if (existing) {
              existing.score += score;
              existing.seeds.push(seed.title);
            } else {
              candidateMap.set(item.id, {
                tmdbId: item.id,
                item,
                score,
                seeds: [seed.title],
                source,
                keywordOverlap: 0,
              });
            }
          }
        };
        processItems(recs, "recommendation");
        processItems(similar, "similar");
      } catch (err) {
        // TMDb might be unavailable (401, network, etc.) — silently skip
        // and fall back to local recommendations if no candidates are found.
      }
    }

    // ---------- Keyword overlap scoring for top candidates ----------
    // Fetch keywords for the top 15 candidates and score by overlap with seed keywords
    const topCandidates = [...candidateMap.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);

    await Promise.all(
      topCandidates.map(async (cand) => {
        try {
          const candKeywords = await getMovieKeywords(cand.tmdbId);
          const candKwSet = new Set(candKeywords.map((k) => k.name.toLowerCase()));
          let overlap = 0;
          for (const kw of candKwSet) {
            if (allSeedKeywords.has(kw)) overlap++;
          }
          cand.keywordOverlap = overlap;
          // Boost score by keyword overlap
          cand.score += overlap * 1.5;
        } catch {
          // ignore
        }
      })
    );

    // ---------- Build final recommendation list ----------
    const sorted = [...candidateMap.values()].sort((a, b) => b.score - a.score);

    // If TMDb returned no candidates (e.g., API key expired), fall back to
    // local recommendations based on shared director/actors/genres.
    if (sorted.length === 0) {
      return NextResponse.json({ items: localRecommendations(seedMovies, archiveMovies, hideWatched) });
    }

    const top = sorted.slice(0, 50);

    // Fetch full details for the top candidates to get genres, director, etc.
    const items: Recommendation[] = await Promise.all(
      top.map(async (cand) => {
        // Try to fetch full details; if it fails, use the basic recommendation item
        let movieData: Partial<Movie> & { poster: string | null; backdrop: string | null; title: string; year: number | null; genres: string[]; director: string | null; overview: string | null; tmdbRating: number | null };
        try {
          const details = await getMovieDetails(cand.tmdbId);
          const payload = tmdbToMoviePayload(details);
          movieData = {
            id: `tmdb-${cand.tmdbId}`,
            ...payload,
            poster: posterUrl(payload.poster, "w342"),
            backdrop: payload.backdrop,
            imdbRating: null,
            status: "new" as const,
            favorite: false,
            rewatchCount: 0,
            personalRating: null,
            watchDate: null,
            notes: null,
            lifetimeRank: null,
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as any;
        } catch {
          // Fallback to basic data from the recommendation item
          movieData = {
            id: `tmdb-${cand.tmdbId}`,
            tmdbId: cand.tmdbId,
            imdbId: null,
            title: cand.item.title,
            originalTitle: cand.item.original_title ?? null,
            poster: posterUrl(cand.item.poster_path, "w342"),
            backdrop: cand.item.backdrop_path ?? null,
            releaseDate: cand.item.release_date ?? null,
            year: cand.item.release_date ? parseInt(cand.item.release_date.slice(0, 4), 10) || null : null,
            genres: [],
            runtime: null,
            country: null,
            language: null,
            director: null,
            writers: [],
            cast: [],
            overview: cand.item.overview ?? null,
            imdbRating: null,
            tmdbRating: cand.item.vote_average ?? null,
            trailer: null,
            gallery: [],
            screenshots: [],
            status: "new" as const,
            favorite: false,
            rewatchCount: 0,
            personalRating: null,
            watchDate: null,
            notes: null,
            lifetimeRank: null,
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as any;
        }

        // Build a meaningful reason
        const reason = buildReason(cand, seedContext);

        return {
          movie: movieData as Movie,
          score: Math.round(cand.score * 100) / 100,
          reason,
        };
      })
    );

    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET /api/recommendations error", err);
    return NextResponse.json(
      { error: "Failed to compute recommendations" },
      { status: 500 }
    );
  }
}

/** Build a human-readable reason for why a movie was recommended. */
function buildReason(
  cand: TmdbCandidate,
  seeds: { title: string; director: string | null; year: number | null }[]
): string {
  const seedTitles = cand.seeds;
  const topSeeds = seedTitles.slice(0, 3);

  if (topSeeds.length === 0) {
    return `Recommended based on your taste profile.`;
  }

  if (topSeeds.length === 1) {
    const seed = seeds.find((s) => s.title === topSeeds[0]);
    if (cand.keywordOverlap > 2) {
      return `Fans of "${topSeeds[0]}" also loved this — shares thematic elements.`;
    }
    if (cand.source === "recommendation") {
      return `TMDb users who watched "${topSeeds[0]}" also recommended this.`;
    }
    return `Similar in style and tone to "${topSeeds[0]}".`;
  }

  if (topSeeds.length === 2) {
    return `Loved by fans of both "${topSeeds[0]}" and "${topSeeds[1]}".`;
  }

  return `Recommended based on "${topSeeds[0]}", "${topSeeds[1]}", and ${topSeeds.length - 2} more films you rated highly.`;
}

/**
 * Local fallback: recommend movies from the user's own archive based on
 * shared director, actors, genres, and similar ratings. Used when TMDb is
 * unavailable (e.g., API key expired).
 */
function localRecommendations(
  seedMovies: Movie[],
  allMovies: Movie[],
  hideWatched: boolean
): Recommendation[] {
  const seedIds = new Set(seedMovies.map((m) => m.id));
  const candidates = allMovies.filter((m) => !seedIds.has(m.id));

  const scored: { movie: Movie; score: number; reason: string }[] = [];

  for (const cand of candidates) {
    let score = 0;
    const reasons: string[] = [];

    for (const seed of seedMovies) {
      // Same director
      if (seed.director && cand.director &&
          seed.director.toLowerCase() === cand.director.toLowerCase()) {
        score += 3;
        reasons.push(`same director (${cand.director})`);
      }
      // Shared actors
      const seedCast = new Set(seed.cast.map((c) => c.toLowerCase()));
      const sharedActors = cand.cast.filter((c) => seedCast.has(c.toLowerCase()));
      if (sharedActors.length > 0) {
        score += Math.min(sharedActors.length * 2, 6);
        reasons.push(`shares ${sharedActors.length} actor(s)`);
      }
      // Shared genres
      const seedGenres = new Set(seed.genres.map((g) => g.toLowerCase()));
      const sharedGenres = cand.genres.filter((g) => seedGenres.has(g.toLowerCase()));
      if (sharedGenres.length > 0) {
        score += Math.min(sharedGenres.length * 1.5, 4.5);
        reasons.push(`shares ${sharedGenres.length} genre(s)`);
      }
      // Similar rating
      if (seed.personalRating != null && cand.personalRating != null &&
          Math.abs(seed.personalRating - cand.personalRating) <= 1.5) {
        score += 1;
      }
    }

    if (score <= 0) continue;
    if (cand.status === "watched" && hideWatched) continue;
    if (cand.status === "watched") score *= 0.1;

    scored.push({
      movie: cand,
      score,
      reason: reasons.length > 0
        ? `Recommended because it ${reasons.slice(0, 2).join(" and ")}.`
        : "Recommended based on your archive.",
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 50).map((s) => ({
    movie: s.movie,
    score: Math.round(s.score * 100) / 100,
    reason: s.reason,
  }));
}

