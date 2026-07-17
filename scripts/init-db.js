const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

async function main() {
  // db is in the working directory (data dir), NOT __dirname (standalone dir)
  const dbPath = path.join(process.cwd(), "db", "custom.db");
  const dbDir = path.dirname(dbPath);
  fs.mkdirSync(dbDir, { recursive: true });

  // schema and prisma CLI are in __dirname (standalone dir)
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

  // Method 1: Try prisma CLI (preferred — handles migrations properly)
  try {
    const prismaBin = path.join(__dirname, "node_modules", "prisma", "build", "index.js");

    if (fs.existsSync(prismaBin)) {
      execSync(`node "${prismaBin}" db push --schema "${schemaPath}" --skip-generate`, {
        stdio: "pipe",
        env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
      });
      console.log("Database schema is ready (via prisma CLI)!");
      schemaApplied = true;
    }
  } catch (e) {
    console.error("prisma db push failed:", e.message);
  }

  // Method 2: If prisma CLI failed, apply schema directly via better-sqlite3 / SQL
  // This is the fallback for read-only environments where prisma CLI can't run
  if (!schemaApplied) {
    console.log("Trying direct SQL schema application...");
    try {
      applySchemaDirectly(dbPath);
      schemaApplied = true;
      console.log("Schema applied directly via SQL!");
    } catch (e) {
      console.error("Direct SQL schema failed:", e.message);
    }
  }

  // Method 3: Last resort — create empty db file so the app can at least start
  if (!schemaApplied) {
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, Buffer.alloc(0));
    }
    console.log("WARNING: Could not apply schema. App may not work correctly.");
  }
}

// Apply the Prisma schema directly using SQL CREATE TABLE statements.
// This mirrors prisma/schema.prisma exactly.
function applySchemaDirectly(dbPath) {
  // Use better-sqlite3 if available (Prisma ships it as a dependency)
  let Database;
  try {
    Database = require(path.join(__dirname, "node_modules", "better-sqlite3"));
  } catch {
    try {
      Database = require("better-sqlite3");
    } catch {
      throw new Error("better-sqlite3 not found — cannot apply schema directly");
    }
  }

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  // Create tables if they don't exist (matches prisma/schema.prisma)
  db.exec(`
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
  `);

  db.close();
}

main().catch(console.error);
