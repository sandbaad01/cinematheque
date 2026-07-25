import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ZAI API configuration
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

// Ensure SDK config exists for fallback
function ensureZaiConfig() {
  const config = {
    baseUrl: "https://internal-api.z.ai/v1",
    apiKey: ZAI_API_KEY,
    chatId: ZAI_CHAT_ID,
    userId: ZAI_USER_ID,
    token: ZAI_TOKEN,
  };
  const configJson = JSON.stringify(config);
  const locations = [
    path.join(os.homedir(), ".z-ai-config"),
    path.join(process.cwd(), ".z-ai-config"),
    path.join(os.tmpdir(), ".z-ai-config"),
  ];
  for (const loc of locations) {
    try {
      fs.writeFileSync(loc, configJson);
      return true;
    } catch {
      // continue
    }
  }
  return false;
}

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

    // Try 1: Direct fetch with all required headers
    let translated = "";
    let directError = "";

    try {
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
        const errText = await response.text().catch(() => "");
        throw new Error(`HTTP ${response.status}: ${errText.slice(0, 100)}`);
      }

      const data = await response.json();
      translated = (data?.choices?.[0]?.message?.content ?? "").toString().trim();
    } catch (err) {
      directError = err instanceof Error ? err.message : String(err);
    }

    // Try 2: SDK fallback (if direct fetch failed)
    if (!translated) {
      try {
        ensureZaiConfig();
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
        return NextResponse.json({
          error: `Translation failed. Direct: ${directError}. SDK: ${sdkMsg}`,
        }, { status: 500 });
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
