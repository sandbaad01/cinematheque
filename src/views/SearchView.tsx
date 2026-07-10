"use client";

import { useState, useMemo } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import type { Movie } from "@/lib/movie/types";
import { MovieCard } from "@/components/movie/MovieCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/movie/EmptyState";

export function SearchView({ initialQuery }: { initialQuery?: string }) {
  const { t } = useI18n();
  const [query, setQuery] = useState(initialQuery ?? "");
  const [submitted, setSubmitted] = useState(initialQuery ?? "");

  const { data: movies, loading } = useFetch<Movie[]>(
    submitted ? `/api/search?q=${encodeURIComponent(submitted)}` : null
  );

  const results = useMemo(() => movies ?? [], [movies]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(query.trim());
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t("search_title")}</h1>
      </div>

      <form onSubmit={onSubmit} className="relative max-w-2xl">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search_placeholder")}
          className="h-12 pl-11 pr-10 text-base"
          autoFocus
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setSubmitted(""); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        )}
      </form>

      {!submitted ? (
        <EmptyState icon={<SearchIcon className="size-12" />} title={t("search_empty")} />
      ) : loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          title={t("search_noResults", { query: submitted })}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {t("search_results", { count: results.length, query: submitted })}
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {results.map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
