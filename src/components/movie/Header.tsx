"use client";

import { useState } from "react";
import { Menu, Search, Shuffle, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNav } from "@/lib/store";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "./LanguageSwitcher";

interface HeaderProps {
  onMenuClick?: () => void;
  className?: string;
}

const VIEW_TITLE_KEYS: Record<string, string> = {
  home: "home_title",
  watched: "watched_title",
  movie: "movie",
  genres: "genres_title",
  genre: "genres_title",
  ratings: "ratings_title",
  favorites: "favorites_title",
  lastWatched: "lastWatched_title",
  timeline: "timeline_title",
  collections: "collections_title",
  collection: "collections_title",
  lists: "lists_title",
  list: "lists_title",
  search: "search_title",
  settings: "settings_title",
  random: "random_title",
};

/** Top sticky header with view title, search, random, language, theme. */
export function Header({ onMenuClick, className }: HeaderProps) {
  const { t } = useI18n();
  const { view, goSearch, go } = useNav();
  const [search, setSearch] = useState("");
  // Default to "dark" — layout.tsx always sets className="dark" on <html>.
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const toggleTheme = () => {
    const root = document.documentElement;
    const next = theme === "dark" ? "light" : "dark";
    root.classList.remove("dark", "light");
    root.classList.add(next);
    setTheme(next);
  };

  const titleKey = VIEW_TITLE_KEYS[view] ?? "appName";
  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) goSearch(search.trim());
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur md:px-6",
        className
      )}
    >
      {/* Mobile hamburger */}
      {onMenuClick && (
        <Button
          variant="ghost"
          size="icon"
          type="button"
          className="md:hidden"
          onClick={onMenuClick}
          aria-label="Menu"
        >
          <Menu className="size-5" />
        </Button>
      )}

      {/* Current view title */}
      <h1 className="truncate text-base font-semibold tracking-tight md:text-lg">
        {t(titleKey)}
      </h1>

      <div className="flex-1" />

      {/* Search */}
      <form
        onSubmit={onSubmitSearch}
        className="hidden sm:flex sm:items-center"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search_placeholder")}
            className="h-9 w-[200px] pl-9 md:w-[280px]"
          />
        </div>
      </form>

      {/* Random */}
      <Button
        variant="ghost"
        size="icon"
        type="button"
        aria-label={t("action_random")}
        title={t("action_random")}
        onClick={() => go("random")}
      >
        <Shuffle className="size-5" />
      </Button>

      {/* Language */}
      <LanguageSwitcher />

      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        type="button"
        aria-label="Toggle theme"
        onClick={toggleTheme}
      >
        {theme === "dark" ? (
          <Sun className="size-5" />
        ) : (
          <Moon className="size-5" />
        )}
      </Button>
    </header>
  );
}
