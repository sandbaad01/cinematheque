import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST /api/migrate — run database migration to add missing columns
// This fixes "column does not exist" errors on databases created by
// older versions of the app (e.g., before mediaType was added).
//
// Uses Prisma's $queryRawUnsafe to run ALTER TABLE statements directly.
// No external dependencies needed (no better-sqlite3).
export async function POST() {
  const result: Record<string, any> = {
    timestamp: new Date().toISOString(),
    migrations: [],
    errors: [],
  };

  // Define all columns that should exist on each table
  // Format: { tableName: { columnName: "SQL definition for ALTER TABLE ADD COLUMN" } }
  // Note: ALTER TABLE ADD COLUMN in SQLite does NOT support PRIMARY KEY,
  // and NOT NULL requires a DEFAULT value. So we use safe definitions.
  const TABLE_COLUMNS: Record<string, Record<string, string>> = {
    Movie: {
      tmdbId: "INTEGER",
      imdbId: "TEXT",
      originalTitle: "TEXT",
      poster: "TEXT",
      backdrop: "TEXT",
      releaseDate: "TEXT",
      year: "INTEGER",
      genres: "TEXT NOT NULL DEFAULT '[]'",
      runtime: "INTEGER",
      country: "TEXT",
      language: "TEXT",
      director: "TEXT",
      writers: "TEXT NOT NULL DEFAULT '[]'",
      cast: "TEXT NOT NULL DEFAULT '[]'",
      overview: "TEXT",
      imdbRating: "REAL",
      tmdbRating: "REAL",
      trailer: "TEXT",
      gallery: "TEXT NOT NULL DEFAULT '[]'",
      screenshots: "TEXT NOT NULL DEFAULT '[]'",
      mediaType: "TEXT NOT NULL DEFAULT 'movie'",
      favorite: "BOOLEAN NOT NULL DEFAULT 0",
      rewatchCount: "INTEGER NOT NULL DEFAULT 0",
      personalRating: "REAL",
      watchDate: "TEXT",
      notes: "TEXT",
      lifetimeRank: "INTEGER",
      tags: "TEXT NOT NULL DEFAULT '[]'",
    },
    Collection: {
      description: "TEXT",
      movieIds: "TEXT NOT NULL DEFAULT '[]'",
    },
    PersonalList: {
      description: "TEXT",
      items: "TEXT NOT NULL DEFAULT '[]'",
    },
  };

  for (const [tableName, columns] of Object.entries(TABLE_COLUMNS)) {
    try {
      // Get existing columns via PRAGMA table_info
      const rows = await db.$queryRawUnsafe(
        `PRAGMA table_info(${tableName})`
      ) as Array<{ name: string }>;
      const existingNames = new Set(rows.map((r) => r.name));

      // If table doesn't exist, skip (Prisma should have created it)
      if (existingNames.size === 0) {
        result.migrations.push(`Table ${tableName} does not exist (will be created by Prisma)`);
        continue;
      }

      // Add any missing columns
      for (const [colName, colDef] of Object.entries(columns)) {
        if (!existingNames.has(colName)) {
          try {
            await db.$executeRawUnsafe(
              `ALTER TABLE "${tableName}" ADD COLUMN "${colName}" ${colDef}`
            );
            result.migrations.push(`Added column: ${tableName}.${colName}`);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            // "duplicate column name" means it already exists — not an error
            if (!msg.includes("duplicate column")) {
              result.errors.push(`Could not add ${tableName}.${colName}: ${msg}`);
            }
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.errors.push(`Failed to check ${tableName}: ${msg}`);
    }
  }

  // Ensure indexes exist
  const indexes = [
    'CREATE INDEX IF NOT EXISTS "Movie_status_idx" ON "Movie"("status")',
    'CREATE INDEX IF NOT EXISTS "Movie_year_idx" ON "Movie"("year")',
    'CREATE INDEX IF NOT EXISTS "Movie_director_idx" ON "Movie"("director")',
    'CREATE INDEX IF NOT EXISTS "Movie_country_idx" ON "Movie"("country")',
    'CREATE INDEX IF NOT EXISTS "Movie_language_idx" ON "Movie"("language")',
  ];
  for (const sql of indexes) {
    try {
      await db.$executeRawUnsafe(sql);
    } catch {
      // indexes are optional
    }
  }

  // Verify by counting movies
  try {
    const count = await db.movie.count();
    result.movieCount = count;
    result.status = result.errors.length > 0 ? "partial" : "success";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    result.errors.push(`Verification failed: ${msg}`);
    result.status = "failed";
  }

  const hasErrors = result.errors.length > 0 && result.migrations.length === 0;
  return NextResponse.json(result, { status: hasErrors ? 500 : 200 });
}

// GET /api/migrate — show migration status
export async function GET() {
  const result: Record<string, any> = {
    timestamp: new Date().toISOString(),
    message: "POST to this endpoint to run database migration.",
    instructions: "This adds missing columns (like mediaType) to existing tables.",
  };

  try {
    const count = await db.movie.count();
    result.movieCount = count;
    result.dbAccessible = true;
    result.dbQueryWorks = true;

    // Check if mediaType column exists
    try {
      const cols = await db.$queryRawUnsafe("PRAGMA table_info(Movie)") as Array<{ name: string }>;
      result.columns = cols.map((c) => c.name);
      result.hasMediaType = cols.some((c) => c.name === "mediaType");
    } catch {
      // ignore
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    result.dbAccessible = false;
    result.dbError = msg;
    result.dbQueryWorks = false;
    result.hint = "POST to this endpoint to fix the database schema.";
  }

  return NextResponse.json(result);
}
