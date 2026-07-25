import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { requireUserId } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

// GET /api/monthly-report/download?id=...
// Returns the HTML report (can be printed to PDF via browser)
export async function GET(req: NextRequest) {
  try {
    const [userId, authError] = await requireUserId();
    if (authError) return authError;

    const reportId = req.nextUrl.searchParams.get("id");
    if (!reportId) {
      return NextResponse.json({ error: "Report ID required" }, { status: 400 });
    }

    const databaseUrl = process.env.DATABASE_URL;
    const authToken = process.env.DATABASE_AUTH_TOKEN;

    if (!databaseUrl) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const client = createClient({
      url: databaseUrl,
      authToken: authToken || undefined,
    });

    const result = await client.execute({
      sql: "SELECT html, month FROM MonthlyReport WHERE id = ? AND userId = ?",
      args: [reportId, userId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const html = result.rows[0].html as string;
    const month = result.rows[0].month as string;

    // Return as HTML for browser viewing / printing to PDF
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="cinematheque-report-${month}.html"`,
      },
    });
  } catch (err) {
    console.error("GET /api/monthly-report/download error", err);
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
  }
}
