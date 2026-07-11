import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Server-side in-memory cache so we don't re-translate the same text.
const cache = new Map<string, string>();

const LANG_NAMES: Record<string, string> = {
  fa: "Persian (Farsi)",
  fr: "French",
  en: "English",
};

/**
 * POST /api/translate
 * Body: { text: string, targetLang: "fa" | "fr" | "en" }
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

    if (!text) {
      return NextResponse.json({ translated: "", lang: targetLang, rtl: false });
    }

    // No translation needed for English — return the original.
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
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            `You are a professional film critic and translator. Translate the following movie synopsis to ${langName}. ` +
            "Keep it natural and cinematic. Return ONLY the translation — no quotes, no explanations, no preamble.",
        },
        { role: "user", content: text },
      ],
      thinking: { type: "disabled" },
    });

    const translated = (completion.choices[0]?.message?.content ?? "").trim();

    if (!translated) {
      // Fall back to original if the model returned nothing.
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
