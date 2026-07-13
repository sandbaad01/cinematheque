import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { unlink, readdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/reset
 * Deletes ALL movies, collections, and lists from the database,
 * and removes all uploaded screenshots from disk.
 * Returns { deleted: { movies, collections, lists, screenshots } }
 */
export async function POST() {
  try {
    const deletedMovies = await db.movie.deleteMany({});
    const deletedCollections = await db.collection.deleteMany({});
    const deletedLists = await db.personalList.deleteMany({});

    // Delete all screenshot files from disk
    let deletedScreenshots = 0;
    try {
      const dir = path.join(process.cwd(), "public", "screenshots");
      const files = await readdir(dir);
      for (const file of files) {
        if (file.endsWith(".jpg") || file.endsWith(".png") || file.endsWith(".jpeg") || file.endsWith(".webp")) {
          await unlink(path.join(dir, file));
          deletedScreenshots++;
        }
      }
    } catch {
      // Directory might not exist
    }

    return NextResponse.json({
      deleted: {
        movies: deletedMovies.count,
        collections: deletedCollections.count,
        lists: deletedLists.count,
        screenshots: deletedScreenshots,
      },
    });
  } catch (err) {
    console.error("POST /api/reset error", err);
    return NextResponse.json(
      { error: "Reset failed" },
      { status: 500 }
    );
  }
}
