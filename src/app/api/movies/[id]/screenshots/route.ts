import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseMovie, safeJsonArr } from "@/lib/movie/types";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/movies/[id]/screenshots
 * Upload a screenshot image. Body: FormData with "file" field.
 * Saves to public/screenshots/{movieId}-{timestamp}.{ext}
 * Returns the updated movie with the new screenshot path added.
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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: `File must be an image (got ${file.type})` },
        { status: 400 }
      );
    }

    // Limit to 20MB (screenshots can be large)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 20MB)` },
        { status: 400 }
      );
    }

    // Generate filename
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `${id}-${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "screenshots");
    const filepath = path.join(uploadDir, filename);

    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true });

    // Write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Add to screenshots array
    const screenshotPath = `/screenshots/${filename}`;
    const screenshots = [...safeJsonArr(movie.screenshots), screenshotPath];

    const updated = await db.movie.update({
      where: { id },
      data: { screenshots: JSON.stringify(screenshots) },
    });

    return NextResponse.json(parseMovie(updated));
  } catch (err) {
    console.error(`POST /api/movies/${movieId}/screenshots error:`, err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/movies/[id]/screenshots?path=...
 * Remove a screenshot by its path.
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

    // Try to delete the file from disk
    try {
      const filepath = path.join(process.cwd(), "public", screenshotPath);
      await unlink(filepath);
    } catch {
      // File might not exist, ignore
    }

    const updated = await db.movie.update({
      where: { id },
      data: { screenshots: JSON.stringify(screenshots) },
    });

    return NextResponse.json(parseMovie(updated));
  } catch (err) {
    console.error("DELETE /api/movies/[id]/screenshots error", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
