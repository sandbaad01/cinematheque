import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseCollection } from "@/lib/movie/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/collections/[id]
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const row = await db.collection.findUnique({ where: { id } });
    if (!row) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(parseCollection(row));
  } catch (err) {
    console.error("GET /api/collections/[id] error", err);
    return NextResponse.json(
      { error: "Failed to fetch collection" },
      { status: 500 }
    );
  }
}

// PUT /api/collections/[id]
export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const existing = await db.collection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }
    const body = await req.json();
    const b: any = body || {};
    const data: any = {};
    if (b.name !== undefined) data.name = b.name;
    if (b.description !== undefined) data.description = b.description ?? null;
    if (b.movieIds !== undefined)
      data.movieIds = JSON.stringify(
        Array.isArray(b.movieIds) ? b.movieIds : []
      );

    const updated = await db.collection.update({ where: { id }, data });
    return NextResponse.json(parseCollection(updated));
  } catch (err) {
    console.error("PUT /api/collections/[id] error", err);
    return NextResponse.json(
      { error: "Failed to update collection" },
      { status: 500 }
    );
  }
}

// DELETE /api/collections/[id]
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const existing = await db.collection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }
    await db.collection.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("DELETE /api/collections/[id] error", err);
    return NextResponse.json(
      { error: "Failed to delete collection" },
      { status: 500 }
    );
  }
}
