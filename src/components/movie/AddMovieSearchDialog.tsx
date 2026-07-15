"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, Film, Plus, ArrowRight } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/context";
import { PosterImage } from "@/components/movie/PosterImage";
import { toast } from "sonner";

interface TmdbSearchResult {
  tmdbId: number;
  title: string;
  originalTitle?: string | null;
  year?: number | null;
  overview?: string | null;
  poster?: string | null;
  tmdbRating?: number | null;
}

interface AddMovieSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMovieAdded: (movieId: string) => void;
  /** Movies already in the collection (to show "added" state) */
  existingIds?: Set<string>;
}

/**
 * Dialog that searches TMDb (not local archive), creates the movie in the DB,
 * and calls onMovieAdded with the new movie ID.
 */
export function AddMovieSearchDialog({
  open,
  onOpenChange,
  onMovieAdded,
  existingIds,
}: AddMovieSearchDialogProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [adding, setAdding] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  const doSearch = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query.trim())}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const addMovie = async (r: TmdbSearchResult) => {
    setAdding(r.tmdbId);
    try {
      // First get full details
      const detailsRes = await fetch(`/api/tmdb/details?id=${r.tmdbId}`);
      if (!detailsRes.ok) throw new Error();
      const details = await detailsRes.json();

      // Create the movie in the DB
      const createRes = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...details,
          status: "want",
          rewatchCount: 0,
          personalRating: null,
          watchDate: null,
          notes: null,
          lifetimeRank: null,
          tags: [],
          screenshots: [],
          gallery: details.gallery || [],
        }),
      });
      if (!createRes.ok) throw new Error();
      const created = await createRes.json();
      onMovieAdded(created.id);
      toast.success(`Added "${created.title}"`);
    } catch {
      toast.error("Failed to add movie");
    } finally {
      setAdding(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("nav_add")}</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-[calc(90vh-6rem)] flex-col gap-3">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") doSearch(); }}
              placeholder={t("add_searchPlaceholder")}
              autoFocus
            />
            <Button onClick={doSearch} disabled={searching || query.trim().length < 2}>
              {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {results.length > 0 && (
              <div className="space-y-1">
                {results.map((r) => (
                  <div key={r.tmdbId} className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent">
                    <div className="h-14 w-10 shrink-0 overflow-hidden rounded">
                      {r.poster ? (
                        <img src={r.poster} alt={r.title} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-muted">
                          <Film className="size-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.year ?? "—"}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addMovie(r)}
                      disabled={adding === r.tmdbId}
                    >
                      {adding === r.tmdbId ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {!searching && results.length === 0 && query.trim().length >= 2 && (
              <p className="py-4 text-center text-sm text-muted-foreground">{t("add_noResults")}</p>
            )}
            {query.trim().length < 2 && (
              <p className="py-4 text-center text-sm text-muted-foreground">{t("search_empty")}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
