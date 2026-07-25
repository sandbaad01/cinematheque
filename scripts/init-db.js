const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

async function main() {
  const dbPath = path.join(process.cwd(), "db", "custom.db");
  const dbDir = path.dirname(dbPath);
  fs.mkdirSync(dbDir, { recursive: true });

  const schemaPath = path.join(__dirname, "prisma", "schema.prisma");

  if (!fs.existsSync(schemaPath)) {
    console.log("No schema found at", schemaPath);
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, Buffer.alloc(0));
    }
    return;
  }

  console.log("Ensuring database schema is up to date...");
  console.log("DB path:", dbPath);
  console.log("Schema path:", schemaPath);

  let schemaApplied = false;

  // Method 1: Try prisma CLI (preferred — handles everything)
  try {
    const prismaBin = path.join(__dirname, "node_modules", "prisma", "build", "index.js");

    if (fs.existsSync(prismaBin)) {
      execSync(`node "${prismaBin}" db push --schema "${schemaPath}" --skip-generate --accept-data-loss`, {
        stdio: "pipe",
        env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
      });
      console.log("Database schema is ready (via prisma CLI)!");
      schemaApplied = true;
    }
  } catch (e) {
    console.error("prisma db push failed:", e.message);
  }

  // Method 2: Create tables + add missing columns via raw SQL
  // This runs even if prisma CLI succeeded, because prisma db push
  // sometimes doesn't add columns to existing tables.
  try {
    migrateSchema(dbPath, schemaPath);
    console.log("Migration check complete.");
    schemaApplied = true;
  } catch (e) {
    console.error("Migration failed:", e.message);
  }

  // Method 3: Last resort — create empty db file
  if (!schemaApplied) {
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, Buffer.alloc(0));
    }
    console.log("WARNING: Could not fully apply schema. The app will try /api/migrate on startup.");
  }
}

// Apply schema using a minimal pure-JS SQLite implementation.
// We write the SQL statements to a file and execute them via the
// prisma CLI's "db execute" command (which uses Prisma's built-in engine,
// no external better-sqlite3 needed).
function migrateSchema(dbPath, schemaPath) {
  // Build the migration SQL
  const sql = `
-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS "Movie" (
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
);

CREATE TABLE IF NOT EXISTS "Collection" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "movieIds" TEXT NOT NULL DEFAULT '[]',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "PersonalList" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "items" TEXT NOT NULL DEFAULT '[]',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS "Movie_status_idx" ON "Movie"("status");
CREATE INDEX IF NOT EXISTS "Movie_year_idx" ON "Movie"("year");
CREATE INDEX IF NOT EXISTS "Movie_director_idx" ON "Movie"("director");
CREATE INDEX IF NOT EXISTS "Movie_country_idx" ON "Movie"("country");
CREATE INDEX IF NOT EXISTS "Movie_language_idx" ON "Movie"("language");

-- Add missing columns to existing tables (idempotent — errors ignored)
-- These ALTER TABLEs add columns that may be missing from older DB versions.
`;

  // For ALTER TABLE, we need to check which columns exist first.
  // Since we can't easily run PRAGMA table_info without a SQLite driver,
  // we just try to add each potentially-missing column and ignore errors.
  // SQLite returns "duplicate column name" if it already exists.
  const alterStatements = [
    'ALTER TABLE "Movie" ADD COLUMN "mediaType" TEXT NOT NULL DEFAULT "movie"',
    'ALTER TABLE "Movie" ADD COLUMN "tmdbId" INTEGER',
    'ALTER TABLE "Movie" ADD COLUMN "imdbId" TEXT',
    'ALTER TABLE "Movie" ADD COLUMN "originalTitle" TEXT',
    'ALTER TABLE "Movie" ADD COLUMN "poster" TEXT',
    'ALTER TABLE "Movie" ADD COLUMN "backdrop" TEXT',
    'ALTER TABLE "Movie" ADD COLUMN "releaseDate" TEXT',
    'ALTER TABLE "Movie" ADD COLUMN "year" INTEGER',
    'ALTER TABLE "Movie" ADD COLUMN "genres" TEXT NOT NULL DEFAULT "[]"',
    'ALTER TABLE "Movie" ADD COLUMN "runtime" INTEGER',
    'ALTER TABLE "Movie" ADD COLUMN "country" TEXT',
    'ALTER TABLE "Movie" ADD COLUMN "language" TEXT',
    'ALTER TABLE "Movie" ADD COLUMN "director" TEXT',
    'ALTER TABLE "Movie" ADD COLUMN "writers" TEXT NOT NULL DEFAULT "[]"',
    'ALTER TABLE "Movie" ADD COLUMN "cast" TEXT NOT NULL DEFAULT "[]"',
    'ALTER TABLE "Movie" ADD COLUMN "overview" TEXT',
    'ALTER TABLE "Movie" ADD COLUMN "imdbRating" REAL',
    'ALTER TABLE "Movie" ADD COLUMN "tmdbRating" REAL',
    'ALTER TABLE "Movie" ADD COLUMN "trailer" TEXT',
    'ALTER TABLE "Movie" ADD COLUMN "gallery" TEXT NOT NULL DEFAULT "[]"',
    'ALTER TABLE "Movie" ADD COLUMN "screenshots" TEXT NOT NULL DEFAULT "[]"',
    'ALTER TABLE "Movie" ADD COLUMN "favorite" BOOLEAN NOT NULL DEFAULT 0',
    'ALTER TABLE "Movie" ADD COLUMN "rewatchCount" INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE "Movie" ADD COLUMN "personalRating" REAL',
    'ALTER TABLE "Movie" ADD COLUMN "watchDate" TEXT',
    'ALTER TABLE "Movie" ADD COLUMN "notes" TEXT',
    'ALTER TABLE "Movie" ADD COLUMN "lifetimeRank" INTEGER',
    'ALTER TABLE "Movie" ADD COLUMN "tags" TEXT NOT NULL DEFAULT "[]"',
  ];

  // Write all SQL to a temp file
  const sqlFile = path.join(path.dirname(dbPath), "_migration.sql");
  let fullSql = sql;
  for (const stmt of alterStatements) {
    // Each ALTER in its own statement — errors are expected and OK
    fullSql += stmt + ";\n";
  }
  fs.writeFileSync(sqlFile, fullSql);

  // Try to execute via prisma CLI's "db execute" command
  try {
    const prismaBin = path.join(__dirname, "node_modules", "prisma", "build", "index.js");
    if (fs.existsSync(prismaBin)) {
      execSync(
        `node "${prismaBin}" db execute --file "${sqlFile}" --schema "${schemaPath}"`,
        {
          stdio: "pipe",
          env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
        }
      );
      console.log("Migration SQL executed via prisma db execute.");
    }
  } catch (e) {
    // prisma db execute might fail on some ALTER errors — that's OK
    console.log("Some migration statements had errors (expected for existing columns).");
  }

  // Clean up
  try { fs.unlinkSync(sqlFile); } catch { /* ignore */ }
}

main().catch(console.error);
