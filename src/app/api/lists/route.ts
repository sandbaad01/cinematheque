import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseList, type PersonalList } from "@/lib/movie/types";
import { requireUserId } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

// GET /api/lists (scoped to authenticated user)
export async function GET() {
  try {
    const [userId, authError] = await requireUserId();
    if (authError) return authError;

    const rows = await db.personalList.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    const lists: PersonalList[] = rows.map(parseList);
    return NextResponse.json(lists);
  } catch (err) {
    console.error("GET /api/lists error", err);
    return NextResponse.json({ error: "Failed to fetch lists" }, { status: 500 });
  }
}

// POST /api/lists (scoped to authenticated user)
export async function POST(req: NextRequest) {
  try {
    const [userId, authError] = await requireUserId();
    if (authError) return authError;

    const body = await req.json();
    const b: { name?: string; description?: string | null } = body || {};
    if (!b.name || typeof b.name !== "string" || !b.name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const created = await db.personalList.create({
      data: {
        userId,
        name: b.name.trim(),
        description: b.description ?? null,
        items: JSON.stringify([]),
      },
    });

    return NextResponse.json(parseList(created), { status: 201 });
  } catch (err) {
    console.error("POST /api/lists error", err);
    return NextResponse.json({ error: "Failed to create list" }, { status: 500 });
  }
}
