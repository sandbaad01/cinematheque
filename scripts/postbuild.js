const fs = require("fs");
const path = require("path");

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) { return; }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log("Step 1: Next.js standalone build...");
// next build already ran, now copy assets into standalone
copyRecursive(".next/static", ".next/standalone/.next/static");
copyRecursive("public", ".next/standalone/public");
copyRecursive("prisma", ".next/standalone/prisma");
copyRecursive("node_modules/.prisma", ".next/standalone/node_modules/.prisma");
copyRecursive("node_modules/@prisma", ".next/standalone/node_modules/@prisma");
copyRecursive("node_modules/prisma", ".next/standalone/node_modules/prisma");
copyRecursive("node_modules/z-ai-web-dev-sdk", ".next/standalone/node_modules/z-ai-web-dev-sdk");

fs.mkdirSync(".next/standalone/db", { recursive: true });
if (fs.existsSync("db/custom.db")) {
  fs.copyFileSync("db/custom.db", ".next/standalone/db/custom.db");
}
copyRecursive("scripts/init-db.js", ".next/standalone/init-db.js");

const envContent = `DATABASE_URL=file:db/custom.db\n\nTMDB_API_KEY=39adf355a4930c90981a9d8abc608dec\nTMDB_READ_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzOWFkZjM1NWE0OTMwYzkwOTgxYTlkOGFiYzYwOGRlYyIsIm5iZiI6MTc4Mzc3ODYzMy4zMDgsInN1YiI6IjZhNTI0ZDQ5YjQzM2ZkZGZhMWFiMDhmYSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.jIx1c4qk-q8lsnc6yCWFW4X0e4N8LYfMIwgI2YKbmTA\n`;
fs.writeFileSync(".next/standalone/.env", envContent);

console.log("Step 2: Copy standalone into src-tauri/resources/...");
// Copy the ENTIRE standalone build into src-tauri/resources/standalone/
// This way Tauri bundles it without needing ../ paths
copyRecursive(".next/standalone", "src-tauri/resources/standalone");

console.log("\nVerification:");
console.log("  src-tauri/resources/standalone/server.js:", fs.existsSync("src-tauri/resources/standalone/server.js"));
console.log("  src-tauri/resources/standalone/.next/static:", fs.existsSync("src-tauri/resources/standalone/.next/static"));
console.log("  src-tauri/resources/standalone/public:", fs.existsSync("src-tauri/resources/standalone/public"));
console.log("  src-tauri/resources/standalone/prisma/schema.prisma:", fs.existsSync("src-tauri/resources/standalone/prisma/schema.prisma"));
console.log("  src-tauri/resources/standalone/node_modules/@prisma/client:", fs.existsSync("src-tauri/resources/standalone/node_modules/@prisma/client"));
console.log("  src-tauri/resources/standalone/node_modules/prisma:", fs.existsSync("src-tauri/resources/standalone/node_modules/prisma"));
console.log("  src-tauri/resources/standalone/init-db.js:", fs.existsSync("src-tauri/resources/standalone/init-db.js"));
console.log("  src-tauri/resources/standalone/.env:", fs.existsSync("src-tauri/resources/standalone/.env"));
console.log("  src-tauri/resources/standalone/db/custom.db:", fs.existsSync("src-tauri/resources/standalone/db/custom.db"));
console.log("Done!");
