"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft, Star, Heart, Calendar, Clock, Globe, MapPin, User, PenLine,
  Play, Trophy, Repeat, ExternalLink, Pencil, Trash2, Plus, Film, Sparkles, Tag, RefreshCw, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import type { Movie, Recommendation, MovieStatus } from "@/lib/movie/types";
import { backdropUrl, posterUrl, youtubeEmbed } from "@/lib/movie/types";
import { PosterImage } from "@/components/movie/PosterImage";
import { RatingStars } from "@/components/movie/RatingStars";
import { StatusBadge } from "@/components/movie/StatusBadge";
import { RankBadge } from "@/components/movie/RankBadge";
import { GenrePill } from "@/components/movie/GenrePill";
import { SectionHeader } from "@/components/movie/SectionHeader";
import { MovieRow } from "@/components/movie/MovieRow";
import { AddMovieDialog } from "@/components/movie/AddMovieDialog";
import { TranslatedStory } from "@/components/movie/TranslatedStory";
import { GalleryLightbox } from "@/components/movie/GalleryLightbox";
import { Phototheque } from "@/components/movie/Phototheque";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export function MovieDetailView({ movieId }: { movieId: string }) {
  const { t } = useI18n();
  const { back, goGenre, goPerson } = useNav();

  // Detect if this is a TMDb-only movie (not yet in the archive)
  const isTmdbMovie = movieId.startsWith("tmdb-");
  const tmdbId = isTmdbMovie ? parseInt(movieId.replace("tmdb-", ""), 10) : null;

  const { data: dbMovie, loading: dbLoading, refetch } = useFetch<Movie>(
    isTmdbMovie ? null : `/api/movies/${movieId}`
  );
  const { data: tmdbMovie, loading: tmdbLoading } = useFetch<Movie>(
    tmdbId ? `/api/tmdb/details?id=${tmdbId}` : null
  );

  const movie = isTmdbMovie ? tmdbMovie : dbMovie;
  const loading = isTmdbMovie ? tmdbLoading : dbLoading;
  const { data: recsData } = useFetch<{ items: Recommendation[] }>(
    isTmdbMovie
      ? `/api/recommendations?movieId=tmdb-${tmdbId}`
      : `/api/recommendations?movieId=${movieId}`
  );

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [savingField, setSavingField] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  if (loading && !movie) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!movie) {
    return <div className="p-6 text-muted-foreground">Movie not found.</div>;
  }

  const recs = recsData?.items ?? [];
  const trailerEmbed = youtubeEmbed(movie.trailer);

  // Inline update helper
  const update = async (patch: Partial<Movie>) => {
    setSavingField(true);
    try {
      const res = await fetch(`/api/movies/${movie.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("update failed");
      refetch();
    } catch {
      toast.error("Update failed");
    } finally {
      setSavingField(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/movies/${movie.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(t("action_delete"));
      back();
    } catch {
      toast.error("Delete failed");
    }
  };

  // Add a TMDb-only movie to the archive
  const addToArchive = async (status: "watched" | "want") => {
    setAdding(true);
    try {
      const res = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...movie, status, rewatchCount: 0 }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      toast.success(t("add_success"));
      // Navigate to the newly created DB movie
      useNav.getState().goMovie(saved.id);
    } catch {
      toast.error("Failed to add");
    } finally {
      setAdding(false);
    }
  };

  const handleRewatch = async () => {
    await update({ rewatchCount: movie.rewatchCount + 1 });
    toast.success(`${t("movie_rewatch")}: ${movie.rewatchCount + 1}`);
  };

  // Re-fetch fresh metadata (poster, cast, director, trailer, gallery, ratings)
  // from TMDb and merge it into the existing movie, preserving personal fields.
  const refreshFromTmdb = async () => {
    if (!movie.tmdbId) {
      toast.error("This movie has no TMDb id — cannot refresh.");
      return;
    }
    setRefreshing(true);
    try {
      const res = await fetch(`/api/tmdb/details?id=${movie.tmdbId}`);
      if (!res.ok) throw new Error("fetch failed");
      const d = await res.json();
      await update({
        title: d.title ?? movie.title,
        originalTitle: d.originalTitle ?? movie.originalTitle,
        poster: d.poster ?? movie.poster,
        backdrop: d.backdrop ?? movie.backdrop,
        releaseDate: d.releaseDate ?? movie.releaseDate,
        year: d.year ?? movie.year,
        genres: Array.isArray(d.genres) ? d.genres : movie.genres,
        runtime: d.runtime ?? movie.runtime,
        country: d.country ?? movie.country,
        language: d.language ?? movie.language,
        director: d.director ?? movie.director,
        writers: Array.isArray(d.writers) ? d.writers : movie.writers,
        cast: Array.isArray(d.cast) ? d.cast : movie.cast,
        overview: d.overview ?? movie.overview,
        tmdbRating: d.tmdbRating ?? movie.tmdbRating,
        imdbId: d.imdbId ?? movie.imdbId,
        trailer: d.trailer ?? movie.trailer,
        gallery: Array.isArray(d.gallery) ? d.gallery : movie.gallery,
      });
      toast.success("Refreshed from TMDb");
    } catch {
      toast.error("TMDb refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="pb-10">
      {/* Backdrop hero */}
      <div className="relative h-56 w-full overflow-hidden md:h-80 lg:h-96">
        {movie.backdrop ? (
          <img
            src={backdropUrl(movie.backdrop, "w1280") ?? undefined}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className="size-full bg-gradient-to-br from-primary/30 to-secondary" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute left-4 top-4 md:left-6 md:top-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={back}
            className="gap-1.5 bg-background/40 text-foreground/80 backdrop-blur-sm hover:bg-background/60 hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {t("action_back")}
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 md:px-6">
        {/* Header: poster + title + meta */}
        <div className="-mt-24 flex flex-col gap-5 md:-mt-32 md:flex-row md:gap-6">
          <div className="w-32 shrink-0 md:w-48">
            <div className="overflow-hidden rounded-xl shadow-2xl ring-1 ring-border">
              <PosterImage src={movie.poster} alt={movie.title} size="w342" className="aspect-[2/3]" />
            </div>
          </div>

          <div className="flex-1 space-y-3 pt-2 md:pt-32">
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex-1">
                <h1 className="text-2xl font-bold tracking-tight md:text-4xl">{movie.title}</h1>
                {movie.originalTitle && movie.originalTitle !== movie.title && (
                  <p className="text-sm text-muted-foreground md:text-base">{movie.originalTitle}</p>
                )}
              </div>
              <div className="flex gap-2">
                {isTmdbMovie ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => addToArchive("want")}
                      disabled={adding}
                      variant="outline"
                    >
                      {t("status_want")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => addToArchive("watched")}
                      disabled={adding}
                    >
                      {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                      {t("action_add")}
                    </Button>
                  </>
                ) : (
                  <>
                    {movie.tmdbId && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={refreshFromTmdb}
                        disabled={refreshing}
                        title="Refresh from TMDb"
                      >
                        <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
                      </Button>
                    )}
                    <Button variant="outline" size="icon" onClick={() => setEditOpen(true)} title={t("action_edit")}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setDeleteOpen(true)} title={t("action_delete")}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Quick meta row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              {movie.year && <span className="flex items-center gap-1"><Calendar className="size-3.5" />{movie.year}</span>}
              {movie.runtime && <span className="flex items-center gap-1"><Clock className="size-3.5" />{movie.runtime} {t("movie_min")}</span>}
              {movie.country && <span className="flex items-center gap-1"><MapPin className="size-3.5" />{movie.country}</span>}
              {movie.language && <span className="flex items-center gap-1"><Globe className="size-3.5" />{movie.language}</span>}
              <StatusBadge status={movie.status} />
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-2">
              {movie.genres.map((g) => (
                <GenrePill key={g} name={g} onClick={() => goGenre(g)} />
              ))}
            </div>

            {/* Ratings */}
            <div className="flex flex-wrap items-center gap-3">
              {movie.imdbRating != null && (
                <Badge variant="outline" className="gap-1.5 bg-yellow-500/10">
                  <Star className="size-3.5 fill-yellow-500 text-yellow-500" />
                  <span className="font-semibold">{movie.imdbRating.toFixed(1)}</span>
                  <span className="text-muted-foreground">IMDb</span>
                </Badge>
              )}
              {movie.tmdbRating != null && (
                <Badge variant="outline" className="gap-1.5">
                  <Star className="size-3.5 fill-primary text-primary" />
                  <span className="font-semibold">{movie.tmdbRating.toFixed(1)}</span>
                  <span className="text-muted-foreground">TMDb</span>
                </Badge>
              )}
              {movie.lifetimeRank != null && <RankBadge rank={movie.lifetimeRank} />}
            </div>
          </div>
        </div>

        {/* Body grid */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Left: story + details */}
          <div className="space-y-6 lg:col-span-2">
            {movie.overview && (
              <TranslatedStory
                overview={movie.overview}
                movieId={movie.id}
                context={{ title: movie.title, director: movie.director, year: movie.year }}
              />
            )}

            {/* Crew details */}
            <Card className="p-5">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailWithLinks
                  icon={User}
                  label={t("movie_director")}
                  names={movie.director ? [movie.director] : []}
                  role="director"
                />
                <DetailWithLinks
                  icon={PenLine}
                  label={t("movie_writer")}
                  names={movie.writers}
                  role="writer"
                />
                <Detail icon={Calendar} label={t("movie_releaseDate")} value={movie.releaseDate} />
                <Detail icon={Clock} label={t("movie_runtime")} value={movie.runtime ? `${movie.runtime} ${t("movie_min")}` : null} />
                <Detail icon={MapPin} label={t("movie_country")} value={movie.country} />
                <Detail icon={Globe} label={t("movie_language")} value={movie.language} />
                <DetailWithLinks
                  icon={Film}
                  label={t("movie_cast")}
                  names={movie.cast}
                  role="actor"
                  className="sm:col-span-2"
                />
              </dl>
            </Card>

            {/* Trailer */}
            {trailerEmbed && (
              <section>
                <SectionHeader title={t("movie_trailer")} icon={<Play className="size-4" />} />
                <div className="mt-3 aspect-video overflow-hidden rounded-xl bg-black">
                  <iframe
                    src={trailerEmbed}
                    title={movie.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="size-full"
                  />
                </div>
                {/* External links — centered below the video */}
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {movie.imdbId && (
                    <a href={`https://www.imdb.com/title/${movie.imdbId}/`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="size-3.5" /> IMDb
                      </Button>
                    </a>
                  )}
                  {movie.tmdbId && (
                    <a href={`https://www.themoviedb.org/movie/${movie.tmdbId}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="size-3.5" /> TMDb
                      </Button>
                    </a>
                  )}
                </div>
              </section>
            )}

            {/* External links — shown here too if there's no trailer, centered */}
            {!trailerEmbed && (movie.imdbId || movie.tmdbId) && (
              <section className="flex flex-wrap justify-center gap-2">
                {movie.imdbId && (
                  <a href={`https://www.imdb.com/title/${movie.imdbId}/`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="size-3.5" /> IMDb
                    </Button>
                  </a>
                )}
                {movie.tmdbId && (
                  <a href={`https://www.themoviedb.org/movie/${movie.tmdbId}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="size-3.5" /> TMDb
                    </Button>
                  </a>
                )}
              </section>
            )}

            {/* Gallery (2 columns) + Photothèque side by side */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Gallery */}
              {movie.gallery.length > 0 && (
                <section>
                  <SectionHeader title={t("movie_gallery")} icon={<Film className="size-4" />} />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {movie.gallery.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setLightboxIndex(i)}
                        className="group relative overflow-hidden rounded-lg"
                      >
                        <img
                          src={backdropUrl(img, "w780") ?? img}
                          alt={`Gallery ${i + 1}`}
                          className="aspect-video w-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                      </button>
                    ))}
                  </div>
                  <GalleryLightbox
                    images={movie.gallery}
                    open={lightboxIndex !== null}
                    startIndex={lightboxIndex ?? 0}
                    onOpenChange={(o) => { if (!o) setLightboxIndex(null); }}
                  />
                </section>
              )}

              {/* Photothèque — user-uploaded screenshots */}
              {!isTmdbMovie && (
                <Phototheque movie={movie} onUpdated={refetch} />
              )}
            </div>
          </div>

          {/* Right: personal info — hidden for TMDb-only movies (not in archive yet) */}
          {!isTmdbMovie && (
          <div className="space-y-4">
            <Card className="space-y-2.5 p-5">
              <h2 className="text-center text-lg font-semibold">{t("movie_myInfo")}</h2>

              {/* Favorite — full width button */}
              <Button
                variant={movie.favorite ? "default" : "outline"}
                size="sm"
                onClick={() => update({ favorite: !movie.favorite })}
                disabled={savingField}
                className="w-full"
              >
                <Heart className={cn("size-4", movie.favorite && "fill-current")} />
                {movie.favorite ? t("action_unmarkFavorite") : t("action_markFavorite")}
              </Button>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t("movie_status")}</label>
                <Select value={movie.status} onValueChange={(v) => update({ status: v as MovieStatus })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="watched">{t("status_watched")}</SelectItem>
                    <SelectItem value="want">{t("status_want")}</SelectItem>
                    <SelectItem value="watching">{t("status_watching")}</SelectItem>
                    <SelectItem value="dropped">{t("status_dropped")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Personal rating */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t("movie_myRating")}</label>
                <RatingStars value={movie.personalRating} onChange={(v) => update({ personalRating: v })} size="md" />
              </div>

              {/* Lifetime rank + Rewatch — compact row, rank input left, rewatch count + buttons right */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">{t("movie_lifetimeRank")}</label>
                  <span className="text-xs text-muted-foreground">{t("movie_rewatch")}: <span className="font-semibold text-foreground">{movie.rewatchCount}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={movie.lifetimeRank ?? ""}
                    placeholder={t("movie_noRank")}
                    onChange={(e) => {
                      const v = e.target.value ? parseInt(e.target.value, 10) : null;
                      update({ lifetimeRank: v && v > 0 ? v : null });
                    }}
                    className="min-w-0 flex-1"
                  />
                  {movie.lifetimeRank != null && (
                    <Button variant="ghost" size="sm" onClick={() => update({ lifetimeRank: null })} className="shrink-0">
                      {t("action_clearRank")}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={handleRewatch} disabled={savingField} className="shrink-0" title={t("action_addRewatch")}>
                    <Repeat className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Watch date */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t("movie_watchDate")}</label>
                <Input
                  type="date"
                  value={movie.watchDate ?? ""}
                  onChange={(e) => update({ watchDate: e.target.value || null })}
                  className="w-full"
                />
              </div>

              {/* Tags */}
              {movie.tags.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t("movie_tags")}</label>
                  <div className="flex flex-wrap gap-1.5">
                    {movie.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        <Tag className="size-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Notes */}
            <Card className="space-y-2 p-5">
              <SectionHeader title={t("movie_notes")} icon={<PenLine className="size-4" />} />
              <NotesEditor
                value={movie.notes}
                onSave={(v) => update({ notes: v })}
              />
            </Card>
          </div>
          )}
        </div>

        {/* Recommendations */}
        {recs.length > 0 && (
          <div className="mt-10">
            <MovieRow
              title={t("movie_recommendations")}
              icon={<Sparkles className="text-primary" />}
              movies={recs.slice(0, 12).map((r) => r.movie)}
            />
          </div>
        )}
      </div>

      <AddMovieDialog open={editOpen} onOpenChange={setEditOpen} editMovie={movie} onSaved={refetch} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("action_delete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("add_deleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("action_cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("action_delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Detail({
  icon: Icon, label, value, className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-normal text-secondary/90">{value || "—"}</dd>
    </div>
  );
}

/** A detail row where each name is a clickable link to that person's filmography. */
function DetailWithLinks({
  icon: Icon, label, names, role, className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  names: string[];
  role: "director" | "actor" | "writer";
  className?: string;
}) {
  const { goPerson } = useNav();
  return (
    <div className={className}>
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </dt>
      <dd className="mt-0.5 flex flex-wrap gap-x-1.5 gap-y-1 text-sm font-medium">
        {names.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          names.map((n, i) => (
            <span key={n} className="flex items-center gap-1.5">
              <button
                onClick={() => goPerson(n, role)}
                className="text-primary/80 underline-offset-2 transition-colors hover:text-primary hover:underline"
              >
                {n}
              </button>
              {i < names.length - 1 && <span className="text-muted-foreground">,</span>}
            </span>
          ))
        )}
      </dd>
    </div>
  );
}

function NotesEditor({ value, onSave }: { value: string | null; onSave: (v: string | null) => void }) {
  const { t } = useI18n();
  const [text, setText] = useState(value ?? "");
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button
        onClick={() => { setText(value ?? ""); setEditing(true); }}
        className="block min-h-[3rem] w-full rounded-md p-2 text-left text-sm text-muted-foreground hover:bg-accent"
      >
        {value || <span className="flex items-center gap-1.5"><Plus className="size-3.5" />{t("movie_notes")}</span>}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        autoFocus
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => { onSave(text.trim() || null); setEditing(false); }}>
          {t("action_save")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setText(value ?? ""); setEditing(false); }}>
          {t("action_cancel")}
        </Button>
      </div>
    </div>
  );
}
