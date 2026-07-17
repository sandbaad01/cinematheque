import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

// GET /api/db-health — diagnose database and environment health
// Useful for debugging issues in the Tauri desktop build
export async function GET() {
  const health: Record<string, any> = {
    timestamp: new Date().toISOString(),
    cwd: process.cwd(),
    home: os.homedir(),
    platform: process.platform,
    nodeVersion: process.version,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ? "[set]" : "[NOT SET]",
      TMDB_API_KEY: process.env.TMDB_API_KEY ? "[set]" : "[NOT SET]",
      TMDB_READ_ACCESS_TOKEN: process.env.TMDB_READ_ACCESS_TOKEN ? "[set]" : "[NOT SET]",
      NODE_ENV: process.env.NODE_ENV,
    },
    checks: {},
  };

  // Check 1: Can we read the DATABASE_URL path?
  try {
    const dbUrl = process.env.DATABASE_URL || "";
    const match = dbUrl.match(/^file:(.+)$/);
    if (match) {
      const dbPath = match[1];
      health.checks.dbPath = dbPath;
      health.checks.dbExists = fs.existsSync(dbPath);
      if (fs.existsSync(dbPath)) {
        const stat = fs.statSync(dbPath);
        health.checks.dbSize = stat.size;
        health.checks.dbWritable = (() => {
          try {
            fs.accessSync(dbPath, fs.constants.W_OK);
            return true;
          } catch {
            return false;
          }
        })();
      }
    } else {
      health.checks.dbUrl = "invalid format";
    }
  } catch (e) {
    health.checks.dbPathError = e instanceof Error ? e.message : String(e);
  }

  // Check 2: Can we query the database?
  try {
    const count = await db.movie.count();
    health.checks.dbQuery = "OK";
    health.checks.movieCount = count;
  } catch (e) {
    health.checks.dbQuery = "FAILED";
    health.checks.dbQueryError = e instanceof Error ? e.message : String(e);
  }

  // Check 3: Can we write to the home directory (for z-ai-config)?
  try {
    const testFile = path.join(os.homedir(), ".cinematheque-test");
    fs.writeFileSync(testFile, "test");
    fs.unlinkSync(testFile);
    health.checks.homeWritable = true;
  } catch (e) {
    health.checks.homeWritable = false;
    health.checks.homeWriteError = e instanceof Error ? e.message : String(e);
  }

  // Check 4: Does .z-ai-config exist?
  const zAiConfigPaths = [
    path.join(process.cwd(), ".z-ai-config"),
    path.join(os.homedir(), ".z-ai-config"),
  ];
  health.checks.zAiConfig = zAiConfigPaths.map((p) => ({
    path: p,
    exists: fs.existsSync(p),
  }));

  // Overall status
  const isHealthy = health.checks.dbQuery === "OK" && health.checks.dbWritable !== false;
  health.status = isHealthy ? "healthy" : "unhealthy";

  return NextResponse.json(health, { status: isHealthy ? 200 : 500 });
}
