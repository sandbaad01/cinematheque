import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseMovie, safeJsonArr } from "@/lib/movie/types";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/movies/[id]/screenshots
 * Upload a screenshot image.
 * Supports two formats:
 *   1. FormData with "file" field (multipart)
 *   2. JSON body { image: "data:image/jpeg;base64,..." } (base64 data URL)
 *
 * Saves to public/screenshots/{movieId}-{timestamp}.{ext}
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let movieId = "unknown";
  try {
    const { id } = await params;
    movieId = id;
    const movie = await db.movie.findUnique({ where: { id } });
    if (!movie) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    const contentType = req.headers.get("content-type") || "";
    let fileBuffer: Buffer;
    let ext = "jpg";

    if (contentType.includes("application/json")) {
      // Base64 data URL upload
      const body = await req.json();
      const dataUrl: string = body?.image || "";
      if (!dataUrl.startsWith("data:image/")) {
        return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
      }

      // Extract mime type and base64 data
      const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json({ error: "Invalid data URL format" }, { status: 400 });
      }
      ext = match[1] === "jpeg" ? "jpg" : match[1];
      fileBuffer = Buffer.from(match[2], "base64");

      if (fileBuffer.length > 20 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File too large: ${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB (max 20MB)` },
          { status: 400 }
        );
      }
    } else {
      // FormData upload (multipart)
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: `File must be an image (got ${file.type})` }, { status: 400 });
      }
      if (file.size > 20 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 20MB)` },
          { status: 400 }
        );
      }
      ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const bytes = await file.arrayBuffer();
      fileBuffer = Buffer.from(bytes);
    }

    // Save to disk
    const filename = `${id}-${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "screenshots");
    const filepath = path.join(uploadDir, filename);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(filepath, fileBuffer);

    const screenshotPath = `/screenshots/${filename}`;
    const screenshots = [...safeJsonArr(movie.screenshots), screenshotPath];

    const updated = await db.movie.update({
      where: { id },
      data: { screenshots: JSON.stringify(screenshots) },
    });

    return NextResponse.json(parseMovie(updated));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/movies/[id]/screenshots?path=...
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const movie = await db.movie.findUnique({ where: { id } });
    if (!movie) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    const screenshotPath = req.nextUrl.searchParams.get("path");
    if (!screenshotPath) {
      return NextResponse.json({ error: "No path provided" }, { status: 400 });
    }

    const screenshots = safeJsonArr(movie.screenshots).filter(
      (s) => s !== screenshotPath
    );

    try {
      const filepath = path.join(process.cwd(), "public", screenshotPath);
      await unlink(filepath);
    } catch {
      // File might not exist
    }

    const updated = await db.movie.update({
      where: { id },
      data: { screenshots: JSON.stringify(screenshots) },
    });

    return NextResponse.json(parseMovie(updated));
  } catch (err) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
