import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Server-side in-memory cache so we don't re-translate the same text.
const cache = new Map<string, string>();

const LANG_NAMES: Record<string, string> = {
  fa: "Persian (Farsi)",
  fr: "French",
  en: "English",
};

/**
 * POST /api/translate
 * Body: { text: string, targetLang: "fa"|"fr"|"en", context?: { title?, director?, year? } }
 * Returns: { translated: string, lang: string, rtl: boolean }
 *
 * Translates a movie synopsis to the target language using the LLM.
 * When targetLang is "en", the original text is returned as-is.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text: string = (body?.text ?? "").toString().trim();
    const targetLang: string = (body?.targetLang ?? "en").toString();
    const ctx: { title?: string; director?: string; year?: number | string } =
      body?.context ?? {};

    if (!text) {
      return NextResponse.json({ translated: "", lang: targetLang, rtl: false });
    }

    if (targetLang === "en" || !LANG_NAMES[targetLang]) {
      return NextResponse.json({
        translated: text,
        lang: targetLang,
        rtl: false,
      });
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

    const langName = LANG_NAMES[targetLang];

    // Build a rich context line so the model knows what film it's translating.
    const contextParts: string[] = [];
    if (ctx.title) contextParts.push(`Film: "${ctx.title}"`);
    if (ctx.year) contextParts.push(`Year: ${ctx.year}`);
    if (ctx.director) contextParts.push(`Director: ${ctx.director}`);
    const contextLine =
      contextParts.length > 0
        ? `Context — ${contextParts.join(", ")}. `
        : "";

    // Craft a high-quality translation prompt.
    const systemPrompt =
      `You are an expert literary translator specializing in film criticism and cinema. ` +
      `Your task is to translate a movie synopsis into ${langName} with the highest possible quality. ` +
      `${contextLine}` +
      `Guidelines:\n` +
      `- Translate naturally and idiomatically — do NOT translate word-by-word.\n` +
      `- Preserve the tone: cinematic, evocative, and engaging.\n` +
      `- Adapt cultural references and idioms appropriately for ${langName}-speaking audiences.\n` +
      `- Keep proper nouns (character names, place names) as transliterations when appropriate.\n` +
      `- Maintain the same level of detail and emotional resonance as the original.\n` +
      `- Output ONLY the translated synopsis. No quotes, no explanations, no preamble, no notes.`;

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
      return NextResponse.json({
        translated: text,
        lang: targetLang,
        rtl: targetLang === "fa",
      });
    }

    cache.set(cacheKey, translated);
    return NextResponse.json({
      translated,
      lang: targetLang,
      rtl: targetLang === "fa",
    });
  } catch (err) {
    console.error("POST /api/translate error", err);
    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}
