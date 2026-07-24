import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/migrate — create tables if they don't exist, add missing columns.
// This is idempotent: running it multiple times is safe.
export async function POST() {
  const result: Record<string, any> = {
    timestamp: new Date().toISOString(),
    migrations: [],
    errors: [],
  };

  // CREATE TABLE statements (matches prisma/schema.prisma exactly)
  const CREATE_TABLES: Record<string, string> = {
    User: `CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "email" TEXT NOT NULL UNIQUE,
      "name" TEXT,
      "passwordHash" TEXT,
      "image" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`,
    Movie: `CREATE TABLE IF NOT EXISTS "Movie" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "tmdbId" INTEGER,
      "imdbId" TEXT,
      "title" TEXT NOT NULL,
      "originalTitle" TEXT,
      "poster" TEXT,
      "backdrop" TEXT,
      "releaseDate" TEXT,
      "year" INTEGER,
      "genres" TEXT NOT NULL DEFAULT '[]',
      "runtime" INTEGER,
      "country" TEXT,
      "language" TEXT,
      "director" TEXT,
      "writers" TEXT NOT NULL DEFAULT '[]',
      "cast" TEXT NOT NULL DEFAULT '[]',
      "overview" TEXT,
      "imdbRating" REAL,
      "tmdbRating" REAL,
      "trailer" TEXT,
      "gallery" TEXT NOT NULL DEFAULT '[]',
      "screenshots" TEXT NOT NULL DEFAULT '[]',
      "status" TEXT NOT NULL DEFAULT 'new',
      "mediaType" TEXT NOT NULL DEFAULT 'movie',
      "favorite" BOOLEAN NOT NULL DEFAULT 0,
      "rewatchCount" INTEGER NOT NULL DEFAULT 0,
      "personalRating" REAL,
      "watchDate" TEXT,
      "notes" TEXT,
      "lifetimeRank" INTEGER,
      "tags" TEXT NOT NULL DEFAULT '[]',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`,
    Collection: `CREATE TABLE IF NOT EXISTS "Collection" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "movieIds" TEXT NOT NULL DEFAULT '[]',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`,
    PersonalList: `CREATE TABLE IF NOT EXISTS "PersonalList" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "items" TEXT NOT NULL DEFAULT '[]',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`,
  };

  // Columns that might be missing on older databases (for ALTER TABLE)
  const TABLE_COLUMNS: Record<string, Record<string, string>> = {
    Movie: {
      userId: "TEXT",
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
      userId: "TEXT",
      description: "TEXT",
      movieIds: "TEXT NOT NULL DEFAULT '[]'",
    },
    PersonalList: {
      userId: "TEXT",
      description: "TEXT",
      items: "TEXT NOT NULL DEFAULT '[]'",
    },
  };

  // Step 1: Create tables if they don't exist
  for (const [tableName, sql] of Object.entries(CREATE_TABLES)) {
    try {
      await db.$executeRawUnsafe(sql);
      result.migrations.push(`Ensured table ${tableName} exists`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.errors.push(`Could not create ${tableName}: ${msg}`);
    }
  }

  // Step 2: Add missing columns to existing tables
  for (const [tableName, columns] of Object.entries(TABLE_COLUMNS)) {
    try {
      const rows = await db.$queryRawUnsafe(
        `PRAGMA table_info(${tableName})`
      ) as Array<{ name: string }>;
      const existingNames = new Set(rows.map((r) => r.name));

      for (const [colName, colDef] of Object.entries(columns)) {
        if (!existingNames.has(colName)) {
          try {
            await db.$executeRawUnsafe(
              `ALTER TABLE "${tableName}" ADD COLUMN "${colName}" ${colDef}`
            );
            result.migrations.push(`Added column: ${tableName}.${colName}`);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
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

  // Step 3: Create indexes
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

  // Step 4: Verify
  try {
    const count = await db.movie.count();
    result.movieCount = count;
    result.status = "success";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    result.errors.push(`Verification failed: ${msg}`);
    result.status = "failed";
  }

  return NextResponse.json(result, { status: 200 });
}

// GET /api/migrate — show migration status
export async function GET() {
  const result: Record<string, any> = {
    timestamp: new Date().toISOString(),
    message: "POST to this endpoint to run database migration.",
  };

  try {
    const count = await db.movie.count();
    result.movieCount = count;
    result.dbAccessible = true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    result.dbAccessible = false;
    result.dbError = msg;
    result.hint = "POST to this endpoint to create database tables.";
  }

  return NextResponse.json(result);
}
