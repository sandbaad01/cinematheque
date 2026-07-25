import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseMovie, type Movie } from "@/lib/movie/types";

export const dynamic = "force-dynamic";

// GET /api/stats/yearly — aggregate stats for the Yearly Stats dashboard and the
// printable Annual Report. Each year entry now includes:
//   - count, avgRating, topGenres (5), topDirectors (3), favoriteMovie, monthly
//     breakdown (12 months) and totalRuntime (minutes) — so the Annual Report
//     page can render a complete summary for any selected year.
export async function GET() {
  try {
    const all = await db.movie.findMany();
    const movies: Movie[] = all.map(parseMovie);
    const watched = movies.filter((m) => m.status === "watched");

    // --- Group watched movies by year (based on watchDate) ---
    type YearEntry = {
      count: number;
      ratings: number[];
      runtime: number;
      genres: Map<string, number>;
      directors: Map<string, number>;
      months: Map<string, number>;
      candidates: Movie[]; // for favorite-movie selection
    };
    const yearMap = new Map<number, YearEntry>();
    const makeEntry = (): YearEntry => ({
      count: 0,
      ratings: [],
      runtime: 0,
      genres: new Map(),
      directors: new Map(),
      months: new Map(),
      candidates: [],
    });
    for (const m of watched) {
      if (!m.watchDate) continue;
      const yr = Number(m.watchDate.slice(0, 4));
      if (!Number.isFinite(yr)) continue;
      const entry = yearMap.get(yr) ?? makeEntry();
      entry.count += 1;
      if (typeof m.personalRating === "number") entry.ratings.push(m.personalRating);
      if (typeof m.runtime === "number") entry.runtime += m.runtime;
      for (const g of m.genres) {
        const k = g.trim();
        if (!k) continue;
        entry.genres.set(k, (entry.genres.get(k) ?? 0) + 1);
      }
      const d = m.director?.trim();
      if (d) entry.directors.set(d, (entry.directors.get(d) ?? 0) + 1);
      const monthKey = m.watchDate.slice(0, 7); // YYYY-MM
      if (/^\d{4}-\d{2}$/.test(monthKey)) {
        entry.months.set(monthKey, (entry.months.get(monthKey) ?? 0) + 1);
      }
      entry.candidates.push(m);
      yearMap.set(yr, entry);
    }

    const years = Array.from(yearMap.entries())
      .map(([year, e]) => {
        const rated = e.ratings;
        const avgRating =
          rated.length > 0
            ? Math.round((rated.reduce((a, b) => a + b, 0) / rated.length) * 10) / 10
            : null;
        const topGenres = Array.from(e.genres.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        const topDirectors = Array.from(e.directors.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);
        // Favourite movie = highest personal rating; tie-break by most recent watchDate.
        let favoriteMovie: {
          id: string;
          title: string;
          poster: string | null;
          personalRating: number | null;
          year: number | null;
          director: string | null;
          watchDate: string | null;
        } | null = null;
        const ratedMovies = e.candidates.filter(
          (m) => typeof m.personalRating === "number"
        );
        if (ratedMovies.length > 0) {
          const top = ratedMovies.slice().sort((a, b) => {
            const ra = a.personalRating ?? 0;
            const rb = b.personalRating ?? 0;
            if (rb !== ra) return rb - ra;
            return (b.watchDate ?? "").localeCompare(a.watchDate ?? "");
          })[0];
          favoriteMovie = {
            id: top.id,
            title: top.title,
            poster: top.poster,
            personalRating: top.personalRating,
            year: top.year,
            director: top.director,
            watchDate: top.watchDate,
          };
        }
        // Monthly breakdown — all 12 months for this year, zero-filled.
        const months: { month: string; count: number }[] = [];
        for (let mi = 0; mi < 12; mi++) {
          const key = `${year}-${String(mi + 1).padStart(2, "0")}`;
          months.push({ month: key, count: e.months.get(key) ?? 0 });
        }
        return {
          year,
          count: e.count,
          avgRating,
          topGenres,
          topDirectors,
          favoriteMovie,
          months,
          totalRuntime: e.runtime,
        };
      })
      .sort((a, b) => a.year - b.year);

    // --- Last 12 months (formatted "YYYY-MM") for the rolling chart ---
    const now = new Date();
    const months: { month: string; count: number }[] = [];
    const monthCountMap = new Map<string, number>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthCountMap.set(key, 0);
    }
    for (const m of watched) {
      if (!m.watchDate) continue;
      const key = m.watchDate.slice(0, 7);
      if (monthCountMap.has(key)) {
        monthCountMap.set(key, (monthCountMap.get(key) ?? 0) + 1);
      }
    }
    for (const [key, count] of monthCountMap.entries()) {
      months.push({ month: key, count });
    }

    // --- Decades (from release year) ---
    const decadeMap = new Map<number, number>();
    for (const m of watched) {
      if (typeof m.year !== "number") continue;
      const decade = Math.floor(m.year / 10) * 10;
      decadeMap.set(decade, (decadeMap.get(decade) ?? 0) + 1);
    }
    const decades = Array.from(decadeMap.entries())
      .map(([decade, count]) => ({ decade, count }))
      .sort((a, b) => a.decade - b.decade);

    // --- Overall stats (kept for the Yearly Stats dashboard) ---
    const totalWatched = watched.length;
    const totalRuntime = watched.reduce(
      (sum, m) => sum + (typeof m.runtime === "number" ? m.runtime : 0),
      0
    );
    const rated = watched
      .map((m) => m.personalRating)
      .filter((r): r is number => typeof r === "number");
    const avgRating =
      rated.length > 0
        ? Math.round((rated.reduce((a, b) => a + b, 0) / rated.length) * 10) / 10
        : null;

    const dirMap = new Map<string, number>();
    for (const m of watched) {
      const d = m.director?.trim();
      if (!d) continue;
      dirMap.set(d, (dirMap.get(d) ?? 0) + 1);
    }
    const dirEntries = Array.from(dirMap.entries()).sort((a, b) => b[1] - a[1]);
    const mostWatchedDirector =
      dirEntries.length > 0 ? { name: dirEntries[0][0], count: dirEntries[0][1] } : null;

    const genreMap = new Map<string, number>();
    for (const m of watched) {
      for (const g of m.genres) {
        const k = g.trim();
        if (!k) continue;
        genreMap.set(k, (genreMap.get(k) ?? 0) + 1);
      }
    }
    const genreEntries = Array.from(genreMap.entries()).sort((a, b) => b[1] - a[1]);
    const mostWatchedGenre =
      genreEntries.length > 0 ? { name: genreEntries[0][0], count: genreEntries[0][1] } : null;

    return NextResponse.json({
      years,
      months,
      decades,
      totalWatched,
      totalRuntime,
      avgRating,
      mostWatchedDirector,
      mostWatchedGenre,
    });
  } catch (err) {
    console.error("GET /api/stats/yearly error", err);
    return NextResponse.json(
      { error: "Failed to compute yearly stats" },
      { status: 500 }
    );
  }
}
