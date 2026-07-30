"use client";

import { useState } from "react";
import { ArrowDownAZ, ArrowUpAZ, Filter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import type { MovieStatus } from "@/lib/movie/types";

export interface FilterState {
  search: string;
  status: MovieStatus | "all";
  genre: string;
  country: string;
  language: string;
  year: string;
  director: string;
  tag: string;
  sort: string;
  order: "asc" | "desc";
}

export const DEFAULT_FILTERS: FilterState = {
  search: "",
  status: "all",
  genre: "all",
  country: "all",
  language: "all",
  year: "all",
  director: "all",
  tag: "all",
  sort: "watchDate",
  order: "desc",
};

// Default filters sorted by release year (for genres, collections, lists, archive)
export const DEFAULT_FILTERS_YEAR: FilterState = {
  ...DEFAULT_FILTERS,
  sort: "releaseYear",
  order: "desc",
};

// Default filters sorted by personal rating (for My Ratings)
export const DEFAULT_FILTERS_RATING: FilterState = {
  ...DEFAULT_FILTERS,
  sort: "rating",
  order: "desc",
};

interface FilterBarProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  genres?: string[];
  countries?: string[];
  languages?: string[];
  directors?: string[];
  years?: number[];
  tags?: string[];
  className?: string;
}

const sortKeys = [
  "watchDate",
  "releaseYear",
  "title",
  "rating",
  "rank",
  "added",
] as const;

/** Compact sticky filter/sort bar for the watched-movies list. */
export function FilterBar({
  filters,
  onChange,
  genres = [],
  countries = [],
  languages = [],
  directors = [],
  years = [],
  tags = [],
  className,
}: FilterBarProps) {
  const { t } = useI18n();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const set = <K extends keyof FilterState>(k: K, v: FilterState[K]) =>
    onChange({ ...filters, [k]: v });

  const activeFilterCount =
    [
      filters.status !== "all",
      filters.genre !== "all",
      filters.country !== "all",
      filters.language !== "all",
      filters.year !== "all",
      filters.director !== "all",
      filters.tag !== "all",
    ].filter(Boolean).length;

  const clearFilters = () => {
    onChange({
      ...filters,
      status: "all",
      genre: "all",
      country: "all",
      language: "all",
      year: "all",
      director: "all",
      tag: "all",
    });
  };

  return (
    <div
      className={cn(
        "sticky top-0 z-20 -mx-4 flex flex-wrap items-center gap-2 border-b bg-background/80 px-4 py-2.5 backdrop-blur md:mx-0 md:rounded-lg md:border",
        className
      )}
    >
      {/* Search */}
      <div className="relative min-w-[160px] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder={t("filter_search")}
          className="pl-9"
        />
        {filters.search && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => set("search", "")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Sort */}
      <Select value={filters.sort} onValueChange={(v) => set("sort", v)}>
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sortKeys.map((k) => (
            <SelectItem key={k} value={k}>
              {t("sort_" + k)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Order toggle */}
      <Button
        variant="outline"
        size="icon"
        type="button"
        aria-label={filters.order === "asc" ? t("sort_asc") : t("sort_desc")}
        onClick={() =>
          set("order", filters.order === "asc" ? "desc" : "asc")
        }
        className="h-9 w-9"
      >
        {filters.order === "asc" ? (
          <ArrowUpAZ className="size-4" />
        ) : (
          <ArrowDownAZ className="size-4" />
        )}
      </Button>

      {/* Filters popover */}
      <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" type="button" className="relative">
            <Filter className="size-4" />
            <span className="hidden sm:inline">{t("filters")}</span>
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(92vw,560px)]" align="end">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold">{t("filters")}</h4>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={clearFilters}
              disabled={activeFilterCount === 0}
            >
              <X className="size-3.5" />
              {t("filters_clear")}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FilterSelect
              label={t("filter_status")}
              value={filters.status}
              onValueChange={(v) => set("status", v as FilterState["status"])}
              options={[
                { value: "all", label: t("status_all") },
                { value: "watched", label: t("status_watched") },
                { value: "want", label: t("nav_wantToWatch") },
                { value: "watchlist", label: t("nav_watchlist") },
                { value: "dropped", label: t("status_dropped") },
              ]}
            />
            <FilterSelect
              label={t("filter_genre")}
              value={filters.genre}
              onValueChange={(v) => set("genre", v)}
              options={[
                { value: "all", label: t("status_all") },
                ...genres.map((g) => ({ value: g, label: g })),
              ]}
            />
            <FilterSelect
              label={t("filter_country")}
              value={filters.country}
              onValueChange={(v) => set("country", v)}
              options={[
                { value: "all", label: t("status_all") },
                ...countries.map((c) => ({ value: c, label: c })),
              ]}
            />
            <FilterSelect
              label={t("filter_language")}
              value={filters.language}
              onValueChange={(v) => set("language", v)}
              options={[
                { value: "all", label: t("status_all") },
                ...languages.map((l) => ({ value: l, label: l })),
              ]}
            />
            <FilterSelect
              label={t("filter_year")}
              value={filters.year}
              onValueChange={(v) => set("year", v)}
              options={[
                { value: "all", label: t("status_all") },
                ...years.map((y) => ({ value: String(y), label: String(y) })),
              ]}
            />
            <FilterSelect
              label={t("filter_director")}
              value={filters.director}
              onValueChange={(v) => set("director", v)}
              options={[
                { value: "all", label: t("status_all") },
                ...directors.map((d) => ({ value: d, label: d })),
              ]}
            />
            <FilterSelect
              label={t("filter_tag")}
              value={filters.tag}
              onValueChange={(v) => set("tag", v)}
              options={[
                { value: "all", label: t("status_all") },
                ...tags.map((tg) => ({ value: tg, label: tg })),
              ]}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
