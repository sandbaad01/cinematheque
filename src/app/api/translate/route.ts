import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ZAI API configuration — used to call the translation API directly.
const ZAI_API_URL = "https://internal-api.z.ai/v1/chat/completions";
const ZAI_API_KEY = "Z.ai";
const ZAI_CHAT_ID = "chat-b63c9f08-d581-44c0-9176-b3519170dbb0";
const ZAI_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMzQ3NGQyMDktZmRlMi00YTQzLTg1OTgtYjY0ZDZmMWY2YzMwIiwiY2hhdF9pZCI6ImNoYXQtYjYzYzlmMDgtZDU4MS00NGMwLTkxNzYtYjM1MTkxNzBkYmIwIiwicGxhdGZvcm0iOiJ6YWkifQ.TtVfTdhb5zKdgXC2b5kAwrsd5wu7I8Vi-TIvUvEQxak";
const ZAI_USER_ID = "3474d209-fde2-4a43-8598-b64d6f1f6c30";

// Server-side in-memory cache
const cache = new Map<string, string>();

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
    const ctx: { title?: string; director?: string; year?: number | string } = body?.context ?? {};

    if (!text) {
      return NextResponse.json({ translated: "", lang: targetLang, rtl: false });
    }

    if (targetLang === "en" || !LANG_NAMES[targetLang]) {
      return NextResponse.json({ translated: text, lang: targetLang, rtl: false });
    }

    const cacheKey = `${targetLang}::${text}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ translated: cached, lang: targetLang, rtl: targetLang === "fa", cached: true });
    }

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

    // Try direct fetch first (works in dev and most production environments)
    let translated = "";
    let lastError = "";

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ZAI_API_KEY}`,
        "X-Z-AI-From": "Z",
      };
      if (ZAI_CHAT_ID) headers["X-Chat-Id"] = ZAI_CHAT_ID;
      if (ZAI_USER_ID) headers["X-User-Id"] = ZAI_USER_ID;
      if (ZAI_TOKEN) headers["X-Token"] = ZAI_TOKEN;

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
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`ZAI API returned ${response.status}: ${errText.slice(0, 200)}`);
      }

      const data = await response.json();
      translated = (data?.choices?.[0]?.message?.content ?? "").toString().trim();
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn("Direct fetch translation failed, trying SDK:", lastError);

      // Fallback: use the z-ai-web-dev-sdk
      try {
        const ZAI = (await import("z-ai-web-dev-sdk")).default;
        const zai = await ZAI.create();
        const completion = await zai.chat.completions.create({
          messages: [
            { role: "assistant", content: systemPrompt },
            { role: "user", content: text },
          ],
          thinking: { type: "disabled" },
        });
        translated = (completion.choices?.[0]?.message?.content ?? "").toString().trim();
      } catch (sdkErr) {
        const sdkMsg = sdkErr instanceof Error ? sdkErr.message : String(sdkErr);
        throw new Error(`Both direct fetch and SDK failed. Direct: ${lastError}. SDK: ${sdkMsg}`);
      }
    }

    if (!translated) {
      return NextResponse.json({ translated: text, lang: targetLang, rtl: targetLang === "fa" });
    }

    cache.set(cacheKey, translated);
    return NextResponse.json({ translated, lang: targetLang, rtl: targetLang === "fa" });
  } catch (err) {
    console.error("POST /api/translate error", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Translation failed: ${msg}` }, { status: 500 });
  }
}
