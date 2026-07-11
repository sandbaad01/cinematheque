"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { Language, translate } from "./translations";

interface I18nContextValue {
  /** Currently selected language. Only affects the movie "Story" translation. */
  lang: Language;
  setLang: (lang: Language) => void;
  /**
   * Always returns the ENGLISH string, regardless of `lang`.
   * The UI and all movie information stay in English at all times;
   * only the movie overview ("Story") is translated.
   */
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>("en");

  const setLangCb = useCallback((next: Language) => {
    setLang(next);
  }, []);

  // UI is always English — `t` ignores the selected language.
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate("en", key, params),
    []
  );

  return (
    <I18nContext.Provider value={{ lang, setLang: setLangCb, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
