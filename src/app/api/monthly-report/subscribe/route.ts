import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { requireUserId } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

// POST /api/monthly-report/subscribe
// Toggle monthly report subscription for the authenticated user
export async function POST(req: NextRequest) {
  try {
    const [userId, authError] = await requireUserId();
    if (authError) return authError;

    const body = await req.json();
    const subscribed: boolean = !!body?.subscribed;

    const databaseUrl = process.env.DATABASE_URL;
    const authToken = process.env.DATABASE_AUTH_TOKEN;

    if (!databaseUrl) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const client = createClient({
      url: databaseUrl,
      authToken: authToken || undefined,
    });

    // Ensure monthlySubscriptions table exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS MonthlySubscription (
        userId TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        subscribed BOOLEAN NOT NULL DEFAULT 1,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL
      )
    `);

    const now = new Date().toISOString();
    const email = body?.email || "";

    // Upsert subscription
    await client.execute({
      sql: `INSERT INTO MonthlySubscription (userId, email, subscribed, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(userId) DO UPDATE SET subscribed = ?, email = ?, updatedAt = ?`,
      args: [userId, email, subscribed ? 1 : 0, now, now, subscribed ? 1 : 0, email, now],
    });

    return NextResponse.json({
      success: true,
      subscribed,
      message: subscribed ? "Subscribed to monthly reports" : "Unsubscribed from monthly reports",
    });
  } catch (err) {
    console.error("POST /api/monthly-report/subscribe error", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed: ${msg}` }, { status: 500 });
  }
}

// GET /api/monthly-report/subscribe — check subscription status
export async function GET() {
  try {
    const [userId, authError] = await requireUserId();
    if (authError) return authError;

    const databaseUrl = process.env.DATABASE_URL;
    const authToken = process.env.DATABASE_AUTH_TOKEN;

    if (!databaseUrl) {
      return NextResponse.json({ subscribed: false });
    }

    const client = createClient({
      url: databaseUrl,
      authToken: authToken || undefined,
    });

    const result = await client.execute({
      sql: "SELECT subscribed FROM MonthlySubscription WHERE userId = ?",
      args: [userId],
    });

    return NextResponse.json({
      subscribed: result.rows.length > 0 ? Boolean(result.rows[0].subscribed) : false,
    });
  } catch {
    return NextResponse.json({ subscribed: false });
  }
}
