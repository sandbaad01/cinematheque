import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/monthly-report/send
// This endpoint is called by a cron job (e.g. cron-job.org) on the 1st of each month.
// It generates a PDF report for all subscribed users and sends it via email.
//
// NOTE: This requires an email service. For now, it generates the PDF and
// stores it for download. To enable email sending, set up Resend or SendGrid
// and add their API key to environment variables.
//
// To set up the cron job:
// 1. Go to https://cron-job.org
// 2. Create a job that POSTs to this URL on the 1st of each month
// 3. Set the CRON_SECRET env var and include it in the request header

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Get all subscribed users
    const subs = await client.execute({
      sql: "SELECT userId, email FROM MonthlySubscription WHERE subscribed = 1",
      args: [],
    });

    const results: Array<{ email: string; status: string; reportUrl?: string }> = [];

    for (const row of subs.rows) {
      const userId = row.userId as string;
      const email = row.email as string;

      try {
        // Get user's stats for the past month
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const startStr = monthStart.toISOString().slice(0, 10);
        const endStr = monthEnd.toISOString().slice(0, 10);

        const moviesResult = await client.execute({
          sql: `SELECT * FROM Movie WHERE userId = ? AND watchDate >= ? AND watchDate <= ? AND status IN ('watched', 'watchedArchive')`,
          args: [userId, startStr, endStr],
        });

        const movies = moviesResult.rows;

        // Generate a beautiful HTML report (will be converted to PDF)
        const reportHtml = generateReportHtml(email, movies, monthStart, monthEnd);

        // For now, store the report in the database as HTML
        // In production, convert to PDF and send via email service
        const reportId = `report_${userId}_${now.getTime()}`;
        await client.execute({
          sql: `CREATE TABLE IF NOT EXISTS MonthlyReport (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            email TEXT NOT NULL,
            html TEXT NOT NULL,
            month TEXT NOT NULL,
            createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          )`,
          args: [],
        });

        await client.execute({
          sql: `INSERT INTO MonthlyReport (id, userId, email, html, month) VALUES (?, ?, ?, ?, ?)`,
          args: [reportId, userId, email, reportHtml, startStr.slice(0, 7)],
        });

        // TODO: Send email with PDF attachment
        // For now, the report is available at /api/monthly-report/download?id=reportId

        results.push({
          email,
          status: "Report generated",
          reportUrl: `/api/monthly-report/download?id=${reportId}`,
        });
      } catch (err) {
        results.push({
          email,
          status: `Failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (err) {
    console.error("POST /api/monthly-report/send error", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed: ${msg}` }, { status: 500 });
  }
}

// Generate a beautiful HTML report for the month
function generateReportHtml(
  email: string,
  movies: any[],
  monthStart: Date,
  monthEnd: Date
): string {
  const monthName = monthStart.toLocaleString("en-US", { month: "long", year: "numeric" });
  const totalMovies = movies.length;
  const totalRuntime = movies.reduce((sum, m) => sum + ((m.runtime as number) || 0), 0);
  const hours = Math.round((totalRuntime / 60) * 10) / 10;

  // Genre breakdown
  const genreMap = new Map<string, number>();
  for (const m of movies) {
    try {
      const genres = JSON.parse((m.genres as string) || "[]");
      for (const g of genres) {
        genreMap.set(g, (genreMap.get(g) || 0) + 1);
      }
    } catch {}
  }
  const topGenres = Array.from(genreMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Rating average
  const ratedMovies = movies.filter((m) => m.personalRating != null);
  const avgRating =
    ratedMovies.length > 0
      ? (ratedMovies.reduce((s, m) => s + (m.personalRating as number), 0) / ratedMovies.length).toFixed(1)
      : "—";

  // Movie list HTML
  const movieListHtml = movies
    .map((m, i) => {
      const title = m.title as string;
      const year = m.year || "—";
      const rating = m.personalRating ? `★ ${m.personalRating}/10` : "";
      const poster = m.poster
        ? m.poster.startsWith("http")
          ? m.poster
          : `https://image.tmdb.org/t/p/w200${m.poster}`
        : null;

      return `
        <div style="display:flex;gap:16px;padding:12px 0;border-bottom:1px solid #eee;">
          ${poster ? `<img src="${poster}" style="width:48px;height:72px;border-radius:4px;object-fit:cover;" />` : `<div style="width:48px;height:72px;background:#f0f0f0;border-radius:4px;"></div>`}
          <div style="flex:1;">
            <div style="font-weight:600;color:#1a1a2e;">${i + 1}. ${title}</div>
            <div style="color:#666;font-size:14px;">${year} ${rating ? `· ${rating}` : ""}</div>
          </div>
        </div>
      `;
    })
    .join("");

  // Genre bars HTML
  const maxGenreCount = topGenres[0]?.[1] || 1;
  const genreBarsHtml = topGenres
    .map(([name, count]) => {
      const width = (count / maxGenreCount) * 100;
      return `
        <div style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px;">
            <span style="font-weight:500;color:#1a1a2e;">${name}</span>
            <span style="color:#666;">${count}</span>
          </div>
          <div style="height:8px;background:#f0f0f0;border-radius:4px;overflow:hidden;">
            <div style="height:100%;width:${width}%;background:linear-gradient(90deg,#3bb5a3,#2a9d8f);border-radius:4px;"></div>
          </div>
        </div>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Cinémathèque — Monthly Report — ${monthName}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8f9fa;color:#1a1a2e;">

<div style="max-width:640px;margin:0 auto;padding:32px 24px;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0f1620,#1a2332);border-radius:16px;padding:40px 32px;margin-bottom:24px;text-align:center;">
    <div style="font-size:14px;color:#3bb5a3;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Cinémathèque</div>
    <h1 style="color:#fff;font-size:32px;margin:0 0 8px;">Monthly Report</h1>
    <p style="color:#8b9cb3;font-size:16px;margin:0;">${monthName}</p>
    <p style="color:#5a6c83;font-size:13px;margin:8px 0 0;">${email}</p>
  </div>

  <!-- Stats Grid -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;">
    <div style="background:#fff;border-radius:12px;padding:24px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="font-size:36px;font-weight:700;color:#3bb5a3;">${totalMovies}</div>
      <div style="font-size:13px;color:#666;margin-top:4px;">Movies Watched</div>
    </div>
    <div style="background:#fff;border-radius:12px;padding:24px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="font-size:36px;font-weight:700;color:#3bb5a3;">${hours}h</div>
      <div style="font-size:13px;color:#666;margin-top:4px;">Total Runtime</div>
    </div>
    <div style="background:#fff;border-radius:12px;padding:24px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="font-size:36px;font-weight:700;color:#3bb5a3;">${avgRating}</div>
      <div style="font-size:13px;color:#666;margin-top:4px;">Avg Rating</div>
    </div>
  </div>

  <!-- Top Genres -->
  ${topGenres.length > 0 ? `
  <div style="background:#fff;border-radius:12px;padding:24px;margin-bottom:24px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <h2 style="font-size:18px;margin:0 0 16px;color:#1a1a2e;">Top Genres</h2>
    ${genreBarsHtml}
  </div>
  ` : ""}

  <!-- Movie List -->
  ${movies.length > 0 ? `
  <div style="background:#fff;border-radius:12px;padding:24px;margin-bottom:24px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <h2 style="font-size:18px;margin:0 0 16px;color:#1a1a2e;">Movies Watched This Month</h2>
    ${movieListHtml}
  </div>
  ` : `
  <div style="background:#fff;border-radius:12px;padding:32px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <p style="color:#666;margin:0;">No movies watched this month.</p>
  </div>
  `}

  <!-- Footer -->
  <div style="text-align:center;padding:24px 0;color:#999;font-size:12px;">
    <p>Generated by Cinémathèque · Developed with passion by Massoud</p>
  </div>

</div>

</body>
</html>
  `.trim();
}
