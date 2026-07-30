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
  watchedSeries: "nav_watchedSeries",
  wantToWatch: "nav_wantToWatch",
  watchlist: "nav_watchlist",
  tmdb: "nav_tmdb",
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
  recommendations: "home_recommended",
  person: "movie",
  imdbLists: "imdb_lists_title",
  yearlyStats: "nav_yearlyStats",
  report: "nav_report",
  watchedArchive: "nav_watchedArchive",
  dropped: "nav_dropped",
  livesOfOthers: "nav_livesOfOthers",
};

const VIEW_SUBTITLE_KEYS: Record<string, string | null> = {
  home: "home_welcome",
  watched: "watched_subtitle",
  watchedSeries: null,
  wantToWatch: null,
  watchlist: null,
  tmdb: null,
  movie: null,
  genres: "genres_subtitle",
  genre: null,
  ratings: "ratings_subtitle",
  favorites: "favorites_subtitle",
  lastWatched: "lastWatched_subtitle",
  timeline: "timeline_subtitle",
  collections: "collections_subtitle",
  collection: null,
  lists: "lists_subtitle",
  list: null,
  search: null,
  settings: null,
  random: "random_subtitle",
  recommendations: "rec_basedOn",
  person: null,
  imdbLists: "imdb_lists_subtitle",
  yearlyStats: null,
  report: null,
};

/** Top header with view title, subtitle, search, random, language, theme. */
export function Header({ onMenuClick, className }: HeaderProps) {
  const { t } = useI18n();
  const { view, goSearch, go } = useNav();
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const toggleTheme = () => {
    const root = document.documentElement;
    const next = theme === "dark" ? "light" : "dark";
    root.classList.remove("dark", "light");
    root.classList.add(next);
    setTheme(next);
  };

  const titleKey = VIEW_TITLE_KEYS[view] ?? "appName";
  const subtitleKey = VIEW_SUBTITLE_KEYS[view] ?? null;
  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) goSearch(search.trim());
  };

  return (
    <header
      className={cn(
        "flex h-16 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur md:px-6",
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

      {/* Current view title + subtitle — hidden on movie detail page
          (the movie title is already shown large in the content area) */}
      {view !== "movie" && titleKey && (
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-base font-semibold leading-tight tracking-tight md:text-lg">
            {t(titleKey)}
          </h1>
          {subtitleKey && (
            <p className="truncate text-xs leading-tight text-muted-foreground">
              {t(subtitleKey)}
            </p>
          )}
        </div>
      )}

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
