import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Configuration for z-ai-web-dev-sdk
const ZAI_CONFIG = {
  baseUrl: "https://internal-api.z.ai/v1",
  apiKey: "Z.ai",
  chatId: "chat-b63c9f08-d581-44c0-9176-b3519170dbb0",
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMzQ3NGQyMDktZmRlMi00YTQzLTg1OTgtYjY0ZDZmMWY2YzMwIiwiY2hhdF9pZCI6ImNoYXQtYjYzYzlmMDgtZDU4MS00NGMwLTkxNzYtYjM1MTkxNzBkYmIwIiwicGxhdGZvcm0iOiJ6YWkifQ.TtVfTdhb5zKdgXC2b5kAwrsd5wu7I8Vi-TIvUvEQxak",
  userId: "3474d209-fde2-4a43-8598-b64d6f1f6c30",
};

// Ensure the config file exists (SDK reads it from .z-ai-config)
function ensureConfig() {
  const configPaths = [
    path.join(process.cwd(), ".z-ai-config"),
    path.join(os.homedir(), ".z-ai-config"),
    path.join(os.tmpdir(), ".z-ai-config"),
  ];
  for (const p of configPaths) {
    if (fs.existsSync(p)) return;
  }
  // Try writing to multiple locations
  for (const p of configPaths) {
    try {
      fs.writeFileSync(p, JSON.stringify(ZAI_CONFIG));
      return;
    } catch {
      // continue to next location
    }
  }
}

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

    // Ensure SDK config file exists
    ensureConfig();

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

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: systemPrompt },
        { role: "user", content: text },
      ],
      thinking: { type: "enabled" },
    });

    const translated = (completion.choices[0]?.message?.content ?? "").trim();

    if (!translated) {
      return NextResponse.json({ translated: text, lang: targetLang, rtl: targetLang === "fa" });
    }

    cache.set(cacheKey, translated);
    return NextResponse.json({ translated, lang: targetLang, rtl: targetLang === "fa" });
  } catch (err) {
    console.error("POST /api/translate error", err);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
