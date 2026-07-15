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

  try {
    const prismaBin = path.join(__dirname, "node_modules", "prisma", "build", "index.js");

    if (fs.existsSync(prismaBin)) {
      execSync(`node "${prismaBin}" db push --schema "${schemaPath}" --skip-generate`, {
        stdio: "pipe",
        env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
      });
      console.log("Database schema is ready!");
    } else {
      console.log("Prisma CLI not found, trying npx...");
      execSync(`npx prisma db push --schema "${schemaPath}" --skip-generate`, {
        stdio: "pipe",
        env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
      });
      console.log("Database schema is ready (via npx)!");
    }
  } catch (e) {
    console.error("prisma db push failed:", e.message);
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, Buffer.alloc(0));
    }
  }
}

main().catch(console.error);
