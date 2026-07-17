import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import os from "os";
import fs from "fs";

export const dynamic = "force-dynamic";

// GET /api/uploads/screenshots/[filename]
// Serves uploaded screenshot files from the writable data directory.
// This is needed because in the Tauri desktop build, the public/ directory
// is read-only (inside Program Files), so we store uploads in a data dir
// and serve them through this API route.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Prevent path traversal
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    // Find the file in any of the candidate directories
    const candidates: string[] = [];

    if (process.env.LOCALAPPDATA) {
      candidates.push(path.join(process.env.LOCALAPPDATA, "Cinematheque", "screenshots", filename));
    }
    if (process.env.APPDATA) {
      candidates.push(path.join(process.env.APPDATA, "Cinematheque", "screenshots", filename));
    }
    candidates.push(path.join(os.homedir(), ".cinematheque", "screenshots", filename));
    // Dev fallback
    candidates.push(path.join(process.cwd(), "public", "screenshots", filename));

    for (const filepath of candidates) {
      if (fs.existsSync(filepath)) {
        const buffer = await readFile(filepath);
        // Determine content type from extension
        const ext = path.extname(filename).toLowerCase();
        const contentTypes: Record<string, string> = {
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".png": "image/png",
          ".gif": "image/gif",
          ".webp": "image/webp",
          ".bmp": "image/bmp",
          ".svg": "image/svg+xml",
        };
        const contentType = contentTypes[ext] || "application/octet-stream";

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    }

    return NextResponse.json({ error: "File not found" }, { status: 404 });
  } catch (err) {
    console.error("GET /api/uploads/screenshots error:", err);
    return NextResponse.json({ error: "Failed to serve file" }, { status: 500 });
  }
}
