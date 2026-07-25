import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Server-side in-memory cache
const cache = new Map<string, string>();

// Language code mapping for MyMemory API
const LANG_CODES: Record<string, string> = {
  fa: "fa",
  fr: "fr",
  en: "en",
};

const LANG_NAMES: Record<string, string> = {
  fa: "Persian (Farsi)",
  fr: "French",
  en: "English",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text: string = (body?.text ?? "").toString().trim();
    const targetLang: string = (body?.targetLang ?? "en").toString();

    if (!text) {
      return NextResponse.json({ translated: "", lang: targetLang, rtl: false });
    }

    if (targetLang === "en" || !LANG_CODES[targetLang]) {
      return NextResponse.json({ translated: text, lang: targetLang, rtl: false });
    }

    const cacheKey = `${targetLang}::${text}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({
        translated: cached,
        lang: targetLang,
        rtl: targetLang === "fa",
        cached: true,
      });
    }

    // MyMemory Translation API (free, no auth required, works on Netlify)
    // Limit: 5000 chars/day anonymous, 50000 with email
    const targetCode = LANG_CODES[targetLang];
    const encodedText = encodeURIComponent(text);
    const email = "cinematheque@example.com"; // increases daily quota
    const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=en|${targetCode}&de=${email}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`MyMemory API returned ${response.status}`);
    }

    const data = await response.json();

    // Check for API-level errors
    if (data?.responseStatus && data.responseStatus !== 200) {
      throw new Error(data.responseDetails || "Translation API error");
    }

    const translated = (data?.responseData?.translatedText ?? "").toString().trim();

    if (!translated || translated === text) {
      // Fallback: return original text
      return NextResponse.json({
        translated: text,
        lang: targetLang,
        rtl: targetLang === "fa",
      });
    }

    // Clean up HTML entities that MyMemory sometimes returns
    const cleaned = translated
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");

    cache.set(cacheKey, cleaned);
    return NextResponse.json({
      translated: cleaned,
      lang: targetLang,
      rtl: targetLang === "fa",
    });
  } catch (err) {
    console.error("POST /api/translate error", err);
    const msg = err instanceof Error ? err.message : String(err);

    // If MyMemory fails, try ZAI API as fallback
    try {
      return await translateWithZai(req);
    } catch (zaiErr) {
      const zaiMsg = zaiErr instanceof Error ? zaiErr.message : String(zaiErr);
      return NextResponse.json(
        { error: `Translation failed. MyMemory: ${msg}. ZAI: ${zaiMsg}` },
        { status: 500 }
      );
    }
  }
}

// Fallback: ZAI API (same as before)
async function translateWithZai(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const text: string = (body?.text ?? "").toString().trim();
  const targetLang: string = (body?.targetLang ?? "en").toString();
  const ctx: { title?: string; director?: string; year?: number | string } = body?.context ?? {};

  if (!text || targetLang === "en") {
    return NextResponse.json({ translated: text, lang: targetLang, rtl: false });
  }

  const ZAI_API_URL = "https://internal-api.z.ai/v1/chat/completions";
  const ZAI_API_KEY = "Z.ai";
  const ZAI_CHAT_ID = "chat-b63c9f08-d581-44c0-9176-b3519170dbb0";
  const ZAI_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMzQ3NGQyMDktZmRlMi00YTQzLTg1OTgtYjY0ZDZmMWY2YzMwIiwiY2hhdF9pZCI6ImNoYXQtYjYzYzlmMDgtZDU4MS00NGMwLTkxNzYtYjM1MTkxNzBkYmIwIiwicGxhdGZvcm0iOiJ6YWkifQ.TtVfTdhb5zKdgXC2b5kAwrsd5wu7I8Vi-TIvUvEQxak";
  const ZAI_USER_ID = "3474d209-fde2-4a43-8598-b64d6f1f6c30";

  const langName = LANG_NAMES[targetLang];
  const contextParts: string[] = [];
  if (ctx.title) contextParts.push(`Film: "${ctx.title}"`);
  if (ctx.year) contextParts.push(`Year: ${ctx.year}`);
  if (ctx.director) contextParts.push(`Director: ${ctx.director}`);
  const contextLine = contextParts.length > 0 ? `Context — ${contextParts.join(", ")}. ` : "";

  const systemPrompt =
    `You are an expert literary translator specializing in film criticism and cinema. ` +
    `Your task is to translate a movie synopsis into ${langName} with the highest possible quality. ` +
    `${contextLine}` +
    `Guidelines:\n` +
    `- Translate naturally and idiomatically.\n` +
    `- Preserve the tone: cinematic, evocative.\n` +
    `- Keep proper nouns as transliterations when appropriate.\n` +
    `- Output ONLY the translated synopsis.`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ZAI_API_KEY}`,
    "X-Z-AI-From": "Z",
    "X-Chat-Id": ZAI_CHAT_ID,
    "X-User-Id": ZAI_USER_ID,
    "X-Token": ZAI_TOKEN,
  };

  const response = await fetch(ZAI_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      messages: [
        { role: "assistant", content: systemPrompt },
        { role: "user", content: text },
      ],
      thinking: { type: "disabled" },
    }),
  });

  if (!response.ok) {
    throw new Error(`ZAI API returned ${response.status}`);
  }

  const data = await response.json();
  const translated = (data?.choices?.[0]?.message?.content ?? "").toString().trim();

  return NextResponse.json({
    translated: translated || text,
    lang: targetLang,
    rtl: targetLang === "fa",
  });
}
