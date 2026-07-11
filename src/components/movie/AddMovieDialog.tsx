"use client";

import { useEffect, useState } from "react";
import { Search, Loader2, Film, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import type { Movie, MovieStatus } from "@/lib/movie/types";
import { RatingStars } from "./RatingStars";

interface AddMovieDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editMovie?: Movie | null;
  onSaved?: () => void;
}

interface WebResult {
  title: string;
  year?: number | string | null;
  overview?: string | null;
  poster?: string | null;
  backdrop?: string | null;
  director?: string | null;
  genres?: string[] | null;
  runtime?: number | null;
  country?: string | null;
  language?: string | null;
  cast?: string[] | null;
}

type FormState = {
  title: string;
  originalTitle: string;
  poster: string;
  backdrop: string;
  releaseDate: string;
  year: string;
  genres: string;
  runtime: string;
  country: string;
  language: string;
  director: string;
  writers: string;
  cast: string;
  overview: string;
  imdbRating: string;
  tmdbRating: string;
  trailer: string;
  status: MovieStatus;
  personalRating: number | null;
  watchDate: string;
  notes: string;
  favorite: boolean;
  tags: string;
};

const emptyForm: FormState = {
  title: "",
  originalTitle: "",
  poster: "",
  backdrop: "",
  releaseDate: "",
  year: "",
  genres: "",
  runtime: "",
  country: "",
  language: "",
  director: "",
  writers: "",
  cast: "",
  overview: "",
  imdbRating: "",
  tmdbRating: "",
  trailer: "",
  status: "watched",
  personalRating: null,
  watchDate: "",
  notes: "",
  favorite: false,
  tags: "",
};

function toFormState(m: Movie): FormState {
  return {
    title: m.title ?? "",
    originalTitle: m.originalTitle ?? "",
    poster: m.poster ?? "",
    backdrop: m.backdrop ?? "",
    releaseDate: m.releaseDate ?? "",
    year: m.year != null ? String(m.year) : "",
    genres: m.genres.join(", "),
    runtime: m.runtime != null ? String(m.runtime) : "",
    country: m.country ?? "",
    language: m.language ?? "",
    director: m.director ?? "",
    writers: m.writers.join(", "),
    cast: m.cast.join(", "),
    overview: m.overview ?? "",
    imdbRating: m.imdbRating != null ? String(m.imdbRating) : "",
    tmdbRating: m.tmdbRating != null ? String(m.tmdbRating) : "",
    trailer: m.trailer ?? "",
    status: m.status,
    personalRating: m.personalRating,
    watchDate: m.watchDate ?? "",
    notes: m.notes ?? "",
    favorite: m.favorite,
    tags: m.tags.join(", "),
  };
}

function splitList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function toNumber(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** A two-step dialog for adding or editing a movie. */
export function AddMovieDialog({
  open,
  onOpenChange,
  editMovie,
  onSaved,
}: AddMovieDialogProps) {
  const { t } = useI18n();
  const isEdit = !!editMovie;

  const [step, setStep] = useState<1 | 2>(isEdit ? 2 : 1);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<WebResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  // When opening: reset to edit mode or fresh search step
  useEffect(() => {
    if (open) {
      if (editMovie) {
        setForm(toFormState(editMovie));
        setStep(2);
      } else {
        setForm(emptyForm);
        setStep(1);
      }
      setQuery("");
      setResults([]);
      setSearchError(null);
    }
  }, [open, editMovie]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const doSearch = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    setSearchError(null);
    setResults([]);
    try {
      const res = await fetch(
        `/api/search-web?q=${encodeURIComponent(query.trim())}`
      );
      if (!res.ok) throw new Error("search failed");
      const data = await res.json();
      const list: WebResult[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : [];
      setResults(list);
      if (list.length === 0) setSearchError(t("add_noResults"));
    } catch {
      setSearchError(t("add_noResults"));
    } finally {
      setSearching(false);
    }
  };

  const pickResult = (r: WebResult) => {
    setForm((prev) => ({
      ...prev,
      title: r.title ?? prev.title,
      year: r.year != null ? String(r.year) : prev.year,
      overview: r.overview ?? prev.overview,
      poster: r.poster ?? prev.poster,
      backdrop: r.backdrop ?? prev.backdrop,
      director: r.director ?? prev.director,
      runtime: r.runtime != null ? String(r.runtime) : prev.runtime,
      country: r.country ?? prev.country,
      language: r.language ?? prev.language,
      genres: r.genres && r.genres.length ? r.genres.join(", ") : prev.genres,
      cast: r.cast && r.cast.length ? r.cast.join(", ") : prev.cast,
    }));
    setStep(2);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error(t("add_title"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        originalTitle: form.originalTitle.trim() || null,
        poster: form.poster.trim() || null,
        backdrop: form.backdrop.trim() || null,
        releaseDate: form.releaseDate || null,
        year: toNumber(form.year),
        genres: splitList(form.genres),
        runtime: toNumber(form.runtime),
        country: form.country.trim() || null,
        language: form.language.trim() || null,
        director: form.director.trim() || null,
        writers: splitList(form.writers),
        cast: splitList(form.cast),
        overview: form.overview.trim() || null,
        imdbRating: toNumber(form.imdbRating),
        tmdbRating: toNumber(form.tmdbRating),
        trailer: form.trailer.trim() || null,
        gallery: [],
        status: form.status,
        favorite: form.favorite,
        rewatchCount: editMovie?.rewatchCount ?? 0,
        personalRating: form.personalRating,
        watchDate: form.watchDate || null,
        notes: form.notes.trim() || null,
        lifetimeRank: editMovie?.lifetimeRank ?? null,
        tags: splitList(form.tags),
        tmdbId: editMovie?.tmdbId ?? null,
        imdbId: editMovie?.imdbId ?? null,
      };

      const url = isEdit ? `/api/movies/${editMovie.id}` : "/api/movies";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "save failed");
      }
      toast.success(isEdit ? t("add_updateSuccess") : t("add_success"));
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("action_edit") : t("add_title")}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? t("add_selectResult")
              : t("add_fields")}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") doSearch();
                }}
                placeholder={t("add_searchPlaceholder")}
                autoFocus
              />
              <Button
                onClick={doSearch}
                disabled={searching || query.trim().length < 2}
                type="button"
              >
                {searching ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                <span className="hidden sm:inline">{t("nav_search")}</span>
              </Button>
            </div>

            {searchError && (
              <p className="text-sm text-muted-foreground">{searchError}</p>
            )}

            {results.length > 0 && (
              <ScrollArea className="max-h-[40vh] rounded-md border">
                <div className="divide-y">
                  {results.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => pickResult(r)}
                      className="flex w-full gap-3 p-3 text-left transition-colors hover:bg-accent"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Film className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium">
                          {r.title}
                          {r.year != null && (
                            <span className="ml-2 text-muted-foreground">
                              ({r.year})
                            </span>
                          )}
                        </p>
                        {r.overview && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {r.overview}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="size-4 shrink-0 self-center text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setStep(2)}
              >
                {t("add_orManual")}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ScrollArea className="max-h-[70vh] pr-3">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t("sort_title")} required>
                  <Input
                    value={form.title}
                    onChange={(e) => update("title", e.target.value)}
                    placeholder="e.g. Vertigo"
                  />
                </Field>
                <Field label="Original Title">
                  <Input
                    value={form.originalTitle}
                    onChange={(e) => update("originalTitle", e.target.value)}
                  />
                </Field>
                <Field label="Poster URL">
                  <Input
                    value={form.poster}
                    onChange={(e) => update("poster", e.target.value)}
                    placeholder="/abc.jpg or https://..."
                  />
                </Field>
                <Field label="Backdrop URL">
                  <Input
                    value={form.backdrop}
                    onChange={(e) => update("backdrop", e.target.value)}
                    placeholder="/xyz.jpg or https://..."
                  />
                </Field>
                <Field label={t("movie_releaseDate")}>
                  <Input
                    type="date"
                    value={form.releaseDate}
                    onChange={(e) => update("releaseDate", e.target.value)}
                  />
                </Field>
                <Field label={t("sort_releaseYear")}>
                  <Input
                    inputMode="numeric"
                    value={form.year}
                    onChange={(e) => update("year", e.target.value)}
                    placeholder="1958"
                  />
                </Field>
                <Field label={`${t("movie_genres")} (comma-separated)`}>
                  <Input
                    value={form.genres}
                    onChange={(e) => update("genres", e.target.value)}
                    placeholder="Mystery, Romance"
                  />
                </Field>
                <Field label={`${t("movie_runtime")} (min)`}>
                  <Input
                    inputMode="numeric"
                    value={form.runtime}
                    onChange={(e) => update("runtime", e.target.value)}
                    placeholder="128"
                  />
                </Field>
                <Field label={t("movie_country")}>
                  <Input
                    value={form.country}
                    onChange={(e) => update("country", e.target.value)}
                    placeholder="USA"
                  />
                </Field>
                <Field label={t("movie_language")}>
                  <Input
                    value={form.language}
                    onChange={(e) => update("language", e.target.value)}
                    placeholder="English"
                  />
                </Field>
                <Field label={t("movie_director")}>
                  <Input
                    value={form.director}
                    onChange={(e) => update("director", e.target.value)}
                    placeholder="Alfred Hitchcock"
                  />
                </Field>
                <Field label={`${t("movie_writer")} (comma-separated)`}>
                  <Input
                    value={form.writers}
                    onChange={(e) => update("writers", e.target.value)}
                  />
                </Field>
                <Field
                  label={`${t("movie_cast")} (comma-separated)`}
                  className="md:col-span-2"
                >
                  <Input
                    value={form.cast}
                    onChange={(e) => update("cast", e.target.value)}
                  />
                </Field>
                <Field
                  label={t("movie_story")}
                  className="md:col-span-2"
                >
                  <Textarea
                    value={form.overview}
                    onChange={(e) => update("overview", e.target.value)}
                    rows={3}
                  />
                </Field>
                <Field label={t("movie_imdbRating")}>
                  <Input
                    inputMode="decimal"
                    value={form.imdbRating}
                    onChange={(e) => update("imdbRating", e.target.value)}
                    placeholder="8.3"
                  />
                </Field>
                <Field label={t("movie_tmdbRating")}>
                  <Input
                    inputMode="decimal"
                    value={form.tmdbRating}
                    onChange={(e) => update("tmdbRating", e.target.value)}
                    placeholder="8.1"
                  />
                </Field>
                <Field label={`${t("movie_trailer")} (URL)`}>
                  <Input
                    value={form.trailer}
                    onChange={(e) => update("trailer", e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </Field>
                <Field label={t("movie_status")}>
                  <Select
                    value={form.status}
                    onValueChange={(v) => update("status", v as MovieStatus)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="watched">
                        {t("status_watched")}
                      </SelectItem>
                      <SelectItem value="want">{t("status_want")}</SelectItem>
                      <SelectItem value="watching">
                        {t("status_watching")}
                      </SelectItem>
                      <SelectItem value="dropped">
                        {t("status_dropped")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t("movie_myRating")}>
                  <RatingStars
                    value={form.personalRating}
                    onChange={(v) => update("personalRating", v)}
                    size="sm"
                  />
                </Field>
                <Field label={t("movie_watchDate")}>
                  <Input
                    type="date"
                    value={form.watchDate}
                    onChange={(e) => update("watchDate", e.target.value)}
                  />
                </Field>
                <Field
                  label={`${t("movie_tags")} (comma-separated)`}
                  className="md:col-span-2"
                >
                  <Input
                    value={form.tags}
                    onChange={(e) => update("tags", e.target.value)}
                    placeholder="noir, rewatch, classic"
                  />
                </Field>
                <Field
                  label={t("movie_notes")}
                  className="md:col-span-2"
                >
                  <Textarea
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    rows={2}
                  />
                </Field>
                <div className="flex items-center gap-3 md:col-span-2">
                  <Switch
                    id="favorite"
                    checked={form.favorite}
                    onCheckedChange={(v) => update("favorite", v)}
                  />
                  <Label htmlFor="favorite">{t("movie_favorite")}</Label>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="flex-row justify-between gap-2">
              {!isEdit ? (
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft className="size-4" />
                  {t("action_back")}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                >
                  {t("action_cancel")}
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !form.title.trim()}
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  {saving ? t("saving") : t("action_save")}
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  required,
  className,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}
