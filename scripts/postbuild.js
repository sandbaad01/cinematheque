const fs = require("fs");
const path = require("path");

// Skip postbuild when building for Vercel/web deployment.
// Vercel sets VERCEL=1 during builds. Also skip if the standalone dir
// doesn't exist (e.g. when Next.js is building for serverless).
const isVercel = process.env.VERCEL === "1" || process.env.CI === "1";
const standaloneExists = fs.existsSync(".next/standalone");

if (isVercel || !standaloneExists) {
  console.log("Skipping postbuild (web/Vercel deployment) — standalone copy not needed.");
  process.exit(0);
}

function copyRecursive(src, dest, skipDirs = []) {
  if (!fs.existsSync(src)) { return; }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      // Skip large/unnecessary directories
      if (skipDirs.includes(entry)) continue;
      copyRecursive(path.join(src, entry), path.join(dest, entry), skipDirs);
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log("Step 1: Copy assets into standalone...");
copyRecursive(".next/static", ".next/standalone/.next/static");
copyRecursive("public", ".next/standalone/public");
copyRecursive("prisma", ".next/standalone/prisma");
copyRecursive("node_modules/.prisma", ".next/standalone/node_modules/.prisma");
copyRecursive("node_modules/@prisma", ".next/standalone/node_modules/@prisma");
copyRecursive("node_modules/prisma", ".next/standalone/node_modules/prisma");
copyRecursive("node_modules/z-ai-web-dev-sdk", ".next/standalone/node_modules/z-ai-web-dev-sdk");
// better-sqlite3 is needed by init-db.js fallback (when prisma CLI can't run)
if (fs.existsSync("node_modules/better-sqlite3")) {
  copyRecursive("node_modules/better-sqlite3", ".next/standalone/node_modules/better-sqlite3");
}
// @prisma/client runtime needs these native bindings
if (fs.existsSync("node_modules/@prisma/client/runtime")) {
  copyRecursive("node_modules/@prisma/client/runtime", ".next/standalone/node_modules/@prisma/client/runtime");
}

fs.mkdirSync(".next/standalone/db", { recursive: true });
if (fs.existsSync("db/custom.db")) {
  fs.copyFileSync("db/custom.db", ".next/standalone/db/custom.db");
}
copyRecursive("scripts/init-db.js", ".next/standalone/init-db.js");
fs.writeFileSync(".next/standalone/.env", "DATABASE_URL=file:db/custom.db\n\nTMDB_API_KEY=39adf355a4930c90981a9d8abc608dec\nTMDB_READ_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzOWFkZjM1NWE0OTMwYzkwOTgxYTlkOGFiYzYwOGRlYyIsIm5iZiI6MTc4Mzc3ODYzMy4zMDgsInN1YiI6IjZhNTI0ZDQ5YjQzM2ZkZGZhMWFiMDhmYSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.jIx1c4qk-q8lsnc6yCWFW4X0e4N8LYfMIwgI2YKbmTA\n");

// Clean old resources
fs.rmSync("src-tauri/resources/standalone", { recursive: true, force: true });

console.log("Step 2: Copy standalone into src-tauri/resources/...");
// Skip src-tauri, .git, .next (standalone), node_modules/.cache, etc.
// to prevent recursive copying and disk space issues
copyRecursive(".next/standalone", "src-tauri/resources/standalone", [
  "src-tauri",      // Don't copy the Tauri build dir into itself
  ".git",
  ".cache",
  "target",
]);

console.log("\nVerification:");
console.log("  server.js:", fs.existsSync("src-tauri/resources/standalone/server.js"));
console.log("  .next/static:", fs.existsSync("src-tauri/resources/standalone/.next/static"));
console.log("  public:", fs.existsSync("src-tauri/resources/standalone/public"));
console.log("  prisma:", fs.existsSync("src-tauri/resources/standalone/prisma/schema.prisma"));
console.log("  prisma client:", fs.existsSync("src-tauri/resources/standalone/node_modules/@prisma/client"));
console.log("  prisma cli:", fs.existsSync("src-tauri/resources/standalone/node_modules/prisma"));
console.log("  z-ai-sdk:", fs.existsSync("src-tauri/resources/standalone/node_modules/z-ai-web-dev-sdk"));
console.log("  init-db.js:", fs.existsSync("src-tauri/resources/standalone/init-db.js"));
console.log("  .env:", fs.existsSync("src-tauri/resources/standalone/.env"));
console.log("  db:", fs.existsSync("src-tauri/resources/standalone/db/custom.db"));
console.log("Done!");
