import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findByImdbId, getMovieDetails, tmdbToMoviePayload, posterUrl } from "@/lib/tmdb";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for large imports with TMDb lookups

// Minimal CSV parser that handles quoted fields with embedded commas,
// escaped quotes (""), and newlines inside quotes.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const t = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  while (i < t.length) {
    const ch = t[i];
    if (inQuotes) {
      if (ch === '"') {
        if (t[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      cur.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\n") {
      cur.push(field);
      rows.push(cur);
      cur = [];
      field = "";
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function headerIndex(headers: string[], name: string): number {
  const lower = headers.map((h) => h.trim().toLowerCase());
  return lower.indexOf(name.toLowerCase());
}

// POST /api/import-imdb { csv: string, listName?: string, skipTmdb?: boolean, status?: "new"|"watched"|"want"|"watchlist" }
// Creates movies from an IMDb CSV export AND adds them to a named collection.
// The status parameter lets the user choose what status to assign to all
// imported movies (default: "new" = no status / line).
// TMDb lookups are best-effort: if TMDb is slow/unreachable, the import
// still succeeds using the CSV data only.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const csv: string = typeof body?.csv === "string" ? body.csv : "";
    const listName: string = (body?.listName ?? "IMDb List").toString().trim() || "IMDb List";
    const skipTmdb: boolean = body?.skipTmdb === true;
    // User-chosen status for all imported movies.
    // "new" = no status (line/—), "watched" = watched archive, "want" = wishlist, "watchlist" = watchlist
    // When "watched" is chosen, movies get status "watchedArchive" so they appear in the
    // Watched Movies Archive page automatically.
    const importStatus: "new" | "watched" | "want" | "watchlist" =
      ["new", "watched", "want", "watchlist"].includes(body?.status) ? body.status : "new";

    if (!csv.trim()) {
      return NextResponse.json(
        { error: "csv text is required" },
        { status: 400 }
      );
    }

    const rows = parseCsv(csv);
    if (rows.length < 2) {
      return NextResponse.json({ imported: 0, skipped: 0, listId: null });
    }

    const headers = rows[0];
    const idx = {
      title: headerIndex(headers, "Title"),
      year: headerIndex(headers, "Year"),
      genres: headerIndex(headers, "Genres"),
      directors: headerIndex(headers, "Directors"),
      const: headerIndex(headers, "Const"),
      dateRated: headerIndex(headers, "Date Rated"),
      imdbRating: headerIndex(headers, "IMDb Rating"),
      runtime: headerIndex(headers, "Runtime (mins)"),
      url: headerIndex(headers, "URL"),
    };

    let imported = 0;
    let skipped = 0;
    let tmdbFailed = 0;
    const movieIds: string[] = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const get = (i: number) => (i >= 0 ? row[i]?.trim() ?? "" : "");

      const title = get(idx.title);
      const imdbId = get(idx.const);
      const yearStr = get(idx.year);
      const year = yearStr ? Number(yearStr) : null;
      const genresStr = get(idx.genres);
      const genres = genresStr
        ? genresStr.split(",").map((g) => g.trim()).filter(Boolean)
        : [];
      const directorsStr = get(idx.directors);
      const director = directorsStr ? directorsStr.split(",")[0].trim() : null;
      const dateRated = get(idx.dateRated) || null;
      const imdbRatingStr = get(idx.imdbRating);
      const imdbRating = imdbRatingStr ? Number(imdbRatingStr) : null;
      const runtimeStr = get(idx.runtime);
      const runtime = runtimeStr ? Number(runtimeStr) : null;

      if (!title) {
        skipped++;
        continue;
      }

      // Skip duplicates by imdbId
      if (imdbId) {
        const exists = await db.movie.findFirst({
          where: { imdbId },
          select: { id: true },
        });
        if (exists) {
          movieIds.push(exists.id);
          skipped++;
          continue;
        }
      }

      // Try to fetch TMDb data using the IMDb ID for rich metadata.
      // Best-effort: if TMDb is unreachable/slow (common in restricted networks),
      // continue with CSV data only so the import still succeeds.
      let tmdbData: any = null;
      if (imdbId && !skipTmdb) {
        try {
          const tmdbId = await findByImdbId(imdbId);
          if (tmdbId) {
            const details = await getMovieDetails(tmdbId);
            tmdbData = tmdbToMoviePayload(details);
          }
        } catch {
          // TMDb lookup failed (network/timeout/rate-limit) — continue with CSV only
          tmdbFailed++;
        }
      }

      const created = await db.movie.create({
        data: {
          tmdbId: tmdbData?.tmdbId ?? null,
          imdbId: imdbId || null,
          title: tmdbData?.title ?? title,
          originalTitle: tmdbData?.originalTitle ?? null,
          poster: tmdbData?.poster ?? null,
          backdrop: tmdbData?.backdrop ?? null,
          releaseDate: tmdbData?.releaseDate ?? null,
          year: tmdbData?.year ?? (typeof year === "number" && !Number.isNaN(year) ? year : null),
          genres: JSON.stringify(tmdbData?.genres ?? genres),
          runtime: tmdbData?.runtime ?? (typeof runtime === "number" && !Number.isNaN(runtime) ? runtime : null),
          country: tmdbData?.country ?? null,
          language: tmdbData?.language ?? null,
          director: tmdbData?.director ?? director,
          writers: JSON.stringify(tmdbData?.writers ?? []),
          cast: JSON.stringify(tmdbData?.cast ?? []),
          overview: tmdbData?.overview ?? null,
          imdbRating:
            typeof imdbRating === "number" && !Number.isNaN(imdbRating)
              ? imdbRating
              : null,
          tmdbRating: tmdbData?.tmdbRating ?? null,
          trailer: tmdbData?.trailer ?? null,
          gallery: JSON.stringify(tmdbData?.gallery ?? []),
          tags: JSON.stringify([]),
          screenshots: JSON.stringify([]),
          // Use the user-chosen status. "watched" → "watchedArchive" for the archive page.
          // If "new" and there's a Date Rated, mark as "watchedArchive" with that date.
          status: importStatus === "watched" ? "watchedArchive" : (importStatus === "new" && dateRated ? "watchedArchive" : importStatus),
          watchDate: importStatus === "watched" || (importStatus === "new" && dateRated)
            ? (dateRated || new Date().toISOString().slice(0, 10))
            : null,
        },
      });
      movieIds.push(created.id);
      imported++;
    }

    // Create a collection with the imported movie IDs
    let listId: string | null = null;
    if (movieIds.length > 0) {
      const collection = await db.collection.create({
        data: {
          name: listName,
          description: `IMDb List · ${imported} movies, ${skipped} already in archive${tmdbFailed > 0 ? `, ${tmdbFailed} TMDb lookups failed (using CSV data only)` : ""}`,
          movieIds: JSON.stringify(movieIds),
        },
      });
      listId = collection.id;
    }

    return NextResponse.json({
      imported,
      skipped,
      tmdbFailed,
      listId,
      message: tmdbFailed > 0
        ? `Imported ${imported} movies. ${tmdbFailed} TMDb lookups failed (used CSV data only).`
        : undefined,
    });
  } catch (err) {
    console.error("POST /api/import-imdb error", err);
    return NextResponse.json(
      { error: "Failed to import IMDb CSV: " + (err instanceof Error ? err.message : "unknown error") },
      { status: 500 }
    );
  }
}
