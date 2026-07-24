import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseList } from "@/lib/movie/types";
import { requireUserId } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/lists/[id]
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const [userId, authError] = await requireUserId();
    if (authError) return authError;

    const { id } = await ctx.params;
    const row = await db.personalList.findFirst({
      where: { id, userId },
    });
    if (!row) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }
    return NextResponse.json(parseList(row));
  } catch (err) {
    console.error("GET /api/lists/[id] error", err);
    return NextResponse.json({ error: "Failed to fetch list" }, { status: 500 });
  }
}

// PUT /api/lists/[id]
export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const [userId, authError] = await requireUserId();
    if (authError) return authError;

    const { id } = await ctx.params;
    const existing = await db.personalList.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }
    const body = await req.json();
    const b: any = body || {};

    const data: any = {};
    if (b.name !== undefined) data.name = b.name;
    if (b.description !== undefined) data.description = b.description ?? null;
    if (b.items !== undefined) {
      data.items = JSON.stringify(Array.isArray(b.items) ? b.items : []);
    }

    const updated = await db.personalList.update({ where: { id }, data });
    return NextResponse.json(parseList(updated));
  } catch (err) {
    console.error("PUT /api/lists/[id] error", err);
    return NextResponse.json({ error: "Failed to update list" }, { status: 500 });
  }
}

// DELETE /api/lists/[id]
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const [userId, authError] = await requireUserId();
    if (authError) return authError;

    const { id } = await ctx.params;
    const existing = await db.personalList.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }
    await db.personalList.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("DELETE /api/lists/[id] error", err);
    return NextResponse.json({ error: "Failed to delete list" }, { status: 500 });
  }
}
