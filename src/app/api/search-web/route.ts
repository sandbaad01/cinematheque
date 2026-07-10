import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";

interface WebResult {
  title: string;
  year: string | null;
  overview: string;
  director: string | null;
}

// Best-effort extraction of movie info from search result name+snippet.
function extractFromText(name: string, snippet: string): WebResult {
  const text = `${name}. ${snippet}`;
  // Year — look for a 4-digit year in parentheses or after the title
  let year: string | null = null;
  const yearMatch =
    text.match(/\((\d{4})\)/) ?? text.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) year = yearMatch[1];

  // Title — try to use the part before a year/paren/dash in the name
  let title = name.trim();
  title = title.replace(/\s*\(\d{4}\)\s*$/, "");
  title = title.replace(/\s*[-–|]\s*.+$/, "");
  title = title.replace(/^["']|["']$/g, "");
  title = title.trim();

  // Director — look for "directed by X" or "Director: X"
  let director: string | null = null;
  const dirMatch =
    snippet.match(/directed by\s+([A-Z][\w .'-]{2,40})/i) ??
    snippet.match(/director:\s*([A-Z][\w .'-]{2,40})/i) ??
    snippet.match(/dir\.\s*([A-Z][\w .'-]{2,40})/i);
  if (dirMatch) director = dirMatch[1].trim().replace(/[.,].*$/, "");

  // Overview — snippet, trimmed
  let overview = snippet.trim();
  if (overview.length > 240) overview = overview.slice(0, 237) + "...";

  return { title: title || name, year, overview, director };
}

// GET /api/search-web?q=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ results: [] });

  try {
    const zai = await ZAI.create();
    const results = await zai.functions.invoke("web_search", {
      query: `"${q}" movie film year director cast`,
      num: 10,
    });

    if (!Array.isArray(results)) {
      return NextResponse.json({ results: [] });
    }

    const seen = new Set<string>();
    const out: WebResult[] = [];
    for (const r of results) {
      const name: string = r.name ?? "";
      const snippet: string = r.snippet ?? "";
      if (!name && !snippet) continue;
      const extracted = extractFromText(name, snippet);
      const key = extracted.title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(extracted);
      if (out.length >= 8) break;
    }

    return NextResponse.json({ results: out });
  } catch (err) {
    console.error("GET /api/search-web error", err);
    return NextResponse.json({ results: [] });
  }
}
