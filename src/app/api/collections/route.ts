import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseCollection, type Collection } from "@/lib/movie/types";

export const dynamic = "force-dynamic";

// GET /api/collections
export async function GET() {
  try {
    const rows = await db.collection.findMany({
      orderBy: { updatedAt: "desc" },
    });
    const collections: Collection[] = rows.map(parseCollection);
    return NextResponse.json(collections);
  } catch (err) {
    console.error("GET /api/collections error", err);
    return NextResponse.json(
      { error: "Failed to fetch collections" },
      { status: 500 }
    );
  }
}

// POST /api/collections { name, description? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const b: any = body || {};
    if (!b.name || typeof b.name !== "string") {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }
    const created = await db.collection.create({
      data: {
        name: b.name,
        description: b.description ?? null,
        movieIds: JSON.stringify(
          Array.isArray(b.movieIds) ? b.movieIds : []
        ),
      },
    });
    return NextResponse.json(parseCollection(created), { status: 201 });
  } catch (err) {
    console.error("POST /api/collections error", err);
    return NextResponse.json(
      { error: "Failed to create collection" },
      { status: 500 }
    );
  }
}
