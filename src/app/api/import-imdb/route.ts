import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Minimal CSV parser that handles quoted fields with embedded commas,
// escaped quotes (""), and newlines inside quotes.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  // Normalize CRLF -> LF
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
    // not in quotes
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
  // last field
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  // drop trailing empty rows
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function headerIndex(headers: string[], name: string): number {
  const lower = headers.map((h) => h.trim().toLowerCase());
  return lower.indexOf(name.toLowerCase());
}

// POST /api/import-imdb { csv: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const csv: string = typeof body?.csv === "string" ? body.csv : "";
    if (!csv.trim()) {
      return NextResponse.json(
        { error: "csv text is required" },
        { status: 400 }
      );
    }

    const rows = parseCsv(csv);
    if (rows.length < 2) {
      return NextResponse.json({ imported: 0, skipped: 0 });
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

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const get = (i: number) => (i >= 0 ? row[i]?.trim() ?? "" : "");

      const title = get(idx.title);
      const imdbId = get(idx.const);
      const yearStr = get(idx.year);
      const year = yearStr ? Number(yearStr) : null;
      const genresStr = get(idx.genres);
      const genres = genresStr
        ? genresStr
            .split(",")
            .map((g) => g.trim())
            .filter(Boolean)
        : [];
      const directorsStr = get(idx.directors);
      const director = directorsStr ? directorsStr.split(",")[0].trim() : null;
      const dateRated = get(idx.dateRated) || null;
      const imdbRatingStr = get(idx.imdbRating);
      const imdbRating = imdbRatingStr ? Number(imdbRatingStr) : null;
      const runtimeStr = get(idx.runtime);
      const runtime = runtimeStr ? Number(runtimeStr) : null;
      const url = get(idx.url) || null;

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
          skipped++;
          continue;
        }
      }

      await db.movie.create({
        data: {
          imdbId: imdbId || null,
          title,
          year: typeof year === "number" && !Number.isNaN(year) ? year : null,
          genres: JSON.stringify(genres),
          director,
          status: "watched",
          watchDate: dateRated,
          imdbRating:
            typeof imdbRating === "number" && !Number.isNaN(imdbRating)
              ? imdbRating
              : null,
          runtime:
            typeof runtime === "number" && !Number.isNaN(runtime)
              ? runtime
              : null,
          trailer: null,
          poster: null,
          backdrop: null,
          overview: null,
          writers: JSON.stringify([]),
          cast: JSON.stringify([]),
          gallery: JSON.stringify([]),
          tags: JSON.stringify([]),
        },
      });
      // url stored nowhere meaningful for now; could be added to tags
      void url;
      imported++;
    }

    return NextResponse.json({ imported, skipped });
  } catch (err) {
    console.error("POST /api/import-imdb error", err);
    return NextResponse.json(
      { error: "Failed to import IMDb CSV" },
      { status: 500 }
    );
  }
}
