"use client";

import { useState, useEffect } from "react";
import { Loader2, PenLine } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { SectionHeader } from "@/components/movie/SectionHeader";

interface TranslatedStoryProps {
  /** The original (English) overview. */
  overview: string;
  /** Movie id — used to reset state when navigating between movies. */
  movieId: string;
  /** Movie context for better translation quality. */
  context?: { title?: string; director?: string | null; year?: number | null };
}

interface TranslateResponse {
  translated: string;
  lang: string;
  rtl: boolean;
  cached?: boolean;
}

/**
 * Renders the movie "Story" section. The UI label and all other movie info
 * stay in English; ONLY this synopsis is translated to the selected language.
 * When the target language is Persian, the paragraph becomes RTL.
 */
export function TranslatedStory({ overview, movieId, context }: TranslatedStoryProps) {
  const { t, lang } = useI18n();
  const [translated, setTranslated] = useState<string>(overview);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Reset to the original whenever the movie changes (render-time adjustment).
  const [prevMovie, setPrevMovie] = useState(movieId);
  if (prevMovie !== movieId) {
    setPrevMovie(movieId);
    setTranslated(overview);
    setError(false);
    setLoading(false);
  }

  // When the language or overview changes, reset state during render
  // (React-recommended pattern). For English we show the original text
  // immediately; for other languages we mark loading=true and let the
  // effect below fetch the translation.
  const [prevLang, setPrevLang] = useState(lang);
  const [prevOverview, setPrevOverview] = useState(overview);
  if (prevLang !== lang || prevOverview !== overview) {
    setPrevLang(lang);
    setPrevOverview(overview);
    if (lang === "en" || !overview) {
      setTranslated(overview);
      setLoading(false);
      setError(false);
    } else {
      setLoading(true);
      setError(false);
    }
  }

  // Fetch a translation whenever the language or overview changes.
  // English = no request (handled in the render-time block above).
  useEffect(() => {
    if (lang === "en" || !overview) return;
    let cancelled = false;

    // Add a timeout controller (30s) — in the Tauri desktop build,
    // network calls to the ZAI API might be slow or fail silently.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: overview, targetLang: lang, context }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
        const data: TranslateResponse = await res.json();
        if (!cancelled) {
          setTranslated(data.translated || overview);
          setLoading(false);
          setError(false);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        // Fall back to the original English text.
        setTranslated(overview);
        setError(true);
        setLoading(false);
        // Log the actual error for debugging
        console.warn("Translation failed:", err.message);
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [lang, overview]);

  if (!overview) return null;

  const isRtl = lang === "fa";

  return (
    <section>
      <SectionHeader title={t("movie_story")} icon={<PenLine className="size-4" />} />
      <p
        dir={isRtl ? "rtl" : "ltr"}
        className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base"
        style={
          isRtl
            ? {
                textAlign: "right",
                fontFamily:
                  "var(--font-vazirmatn), var(--font-geist-sans), sans-serif",
              }
            : undefined
        }
      >
        {loading && (
          <span className="inline-flex items-center gap-2 text-muted-foreground/70">
            <Loader2 className="size-4 animate-spin" />
            {t("loading")}
          </span>
        )}
        {!loading && (translated || overview)}
      </p>
      {error && (
        <p className="mt-1 text-xs text-muted-foreground/60">
          (Translation unavailable — showing original English text. Check your internet connection.)
        </p>
      )}
    </section>
  );
}
