const path = require("path");
const fs = require("fs");

// .env is in the data directory (process.cwd()), or next to start.js (__dirname)
const envPaths = [
  path.join(process.cwd(), ".env"),
  path.join(__dirname, ".env"),
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
    console.log("Loaded .env from", envPath);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.log("Warning: .env not found, using defaults");
  process.env.DATABASE_URL = "file:db/custom.db";
}

// If DATABASE_URL is relative (file:db/custom.db), make it absolute
// pointing to the data directory (process.cwd())
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("file:db/")) {
  const dataDir = process.cwd();
  const dbFile = process.env.DATABASE_URL.replace("file:", "");
  process.env.DATABASE_URL = "file:" + path.join(dataDir, dbFile);
  console.log("DATABASE_URL resolved to:", process.env.DATABASE_URL);
}

// Start the Next.js server (server.js is in __dirname = standalone dir)
require(path.join(__dirname, "server.js"));
