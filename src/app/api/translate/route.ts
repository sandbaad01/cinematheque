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

// Ensure the SDK config file exists in a writable location.
// The SDK reads from: process.cwd()/.z-ai-config, os.homedir()/.z-ai-config, /etc/.z-ai-config
// In the Tauri desktop build, process.cwd() is read-only (Program Files),
// so we MUST write to os.homedir() which is always writable.
function ensureConfig(): { ok: boolean; path?: string; error?: string } {
  const configJson = JSON.stringify(ZAI_CONFIG);

  // Try writing to home directory first (always writable, SDK checks it 2nd)
  const homeConfig = path.join(os.homedir(), ".z-ai-config");
  try {
    // Always overwrite to ensure it's fresh and valid
    fs.writeFileSync(homeConfig, configJson);
    return { ok: true, path: homeConfig };
  } catch (e) {
    // Home not writable, try other locations
  }

  // Try cwd (works in dev)
  const cwdConfig = path.join(process.cwd(), ".z-ai-config");
  try {
    fs.writeFileSync(cwdConfig, configJson);
    return { ok: true, path: cwdConfig };
  } catch {
    // continue
  }

  // Try tmp dir as last resort
  const tmpConfig = path.join(os.tmpdir(), ".z-ai-config");
  try {
    fs.writeFileSync(tmpConfig, configJson);
    return { ok: true, path: tmpConfig };
  } catch {
    // all failed
  }

  // Check if a valid config already exists somewhere the SDK will find it
  for (const p of [homeConfig, cwdConfig, tmpConfig]) {
    try {
      const existing = JSON.parse(fs.readFileSync(p, "utf-8"));
      if (existing.baseUrl && existing.apiKey) {
        return { ok: true, path: p };
      }
    } catch {
      // continue
    }
  }

  return { ok: false, error: "Could not write or find .z-ai-config in any writable location" };
}

// Cache the ZAI instance so we don't re-create it on every request.
let zaiInstance: any = null;
let zaiError: string | null = null;

async function getZai() {
  if (zaiInstance) return zaiInstance;
  if (zaiError) throw new Error(zaiError);

  const cfg = ensureConfig();
  if (!cfg.ok) {
    zaiError = cfg.error ?? "config error";
    throw new Error(zaiError);
  }

  try {
    // ZAI.create() reads the config file — we've ensured it exists in home dir
    zaiInstance = await ZAI.create();
    return zaiInstance;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    zaiError = `ZAI.create() failed: ${msg} (config at ${cfg.path ?? "unknown"})`;
    throw new Error(zaiError);
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

    const zai = await getZai();
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
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Translation failed: ${msg}` }, { status: 500 });
  }
}
