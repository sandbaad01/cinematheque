import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseList, type PersonalList } from "@/lib/movie/types";

export const dynamic = "force-dynamic";

// GET /api/lists
export async function GET() {
  try {
    const rows = await db.personalList.findMany({
      orderBy: { updatedAt: "desc" },
    });
    const lists: PersonalList[] = rows.map(parseList);
    return NextResponse.json(lists);
  } catch (err) {
    console.error("GET /api/lists error", err);
    return NextResponse.json(
      { error: "Failed to fetch lists" },
      { status: 500 }
    );
  }
}

// POST /api/lists { name, description? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const b: any = body || {};
    if (!b.name || typeof b.name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const items = Array.isArray(b.items) ? b.items : [];
    const created = await db.personalList.create({
      data: {
        name: b.name,
        description: b.description ?? null,
        items: JSON.stringify(items),
      },
    });
    return NextResponse.json(parseList(created), { status: 201 });
  } catch (err) {
    console.error("POST /api/lists error", err);
    return NextResponse.json(
      { error: "Failed to create list" },
      { status: 500 }
    );
  }
}
