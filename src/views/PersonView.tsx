"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Clapperboard, User, PenLine, Film } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import type { Movie } from "@/lib/movie/types";
import { MovieCard } from "@/components/movie/MovieCard";
import { EmptyState } from "@/components/movie/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PosterImage } from "@/components/movie/PosterImage";
import { RatingStars } from "@/components/movie/RatingStars";
import { cn } from "@/lib/utils";

interface PersonViewProps {
  name: string;
  role: "director" | "actor" | "writer";
}

type SortKey = "watchDate" | "releaseYear" | "title" | "rating" | "rank";

const ROLE_LABEL_KEY: Record<PersonViewProps["role"], string> = {
  director: "movie_director",
  actor: "movie_cast",
  writer: "movie_writer",
};

const ROLE_ICON = {
  director: Clapperboard,
  actor: User,
  writer: PenLine,
};

export function PersonView({ name, role }: PersonViewProps) {
  const { t } = useI18n();
  const { back, goMovie } = useNav();
  const { data: allMovies, loading } = useFetch<Movie[]>("/api/movies");
  const [sort, setSort] = useState<SortKey>("releaseYear");
  const [view, setView] = useState<"grid" | "list">("grid");

  // Filter movies where this person has the given role.
  const filmography = useMemo(() => {
    if (!allMovies) return [];
    const nameLower = name.toLowerCase();
    return allMovies.filter((m) => {
      if (role === "director") {
        return m.director?.toLowerCase() === nameLower;
      }
      if (role === "writer") {
        return m.writers.some((w) => w.toLowerCase() === nameLower);
      }
      // actor
      return m.cast.some((c) => c.toLowerCase() === nameLower);
    });
  }, [allMovies, name, role]);

  // Also find other roles this person has (e.g., a director who also acted)
  const otherRoles = useMemo(() => {
    if (!allMovies) return { director: 0, actor: 0, writer: 0 };
    const nameLower = name.toLowerCase();
    let director = 0, actor = 0, writer = 0;
    for (const m of allMovies) {
      if (m.director?.toLowerCase() === nameLower) director++;
      if (m.cast.some((c) => c.toLowerCase() === nameLower)) actor++;
      if (m.writers.some((w) => w.toLowerCase() === nameLower)) writer++;
    }
    return { director, actor, writer };
  }, [allMovies, name]);

  const sorted = useMemo(() => {
    const list = [...filmography];
    switch (sort) {
      case "watchDate":
        list.sort((a, b) => (b.watchDate ?? "").localeCompare(a.watchDate ?? ""));
        break;
      case "releaseYear":
        list.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
        break;
      case "title":
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "rating":
        list.sort((a, b) => (b.personalRating ?? 0) - (a.personalRating ?? 0));
        break;
      case "rank":
        list.sort((a, b) => (a.lifetimeRank ?? 9999) - (b.lifetimeRank ?? 9999));
        break;
    }
    return list;
  }, [filmography, sort]);

  const Icon = ROLE_ICON[role];

  if (loading && !allMovies) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Button variant="ghost" size="sm" onClick={back}>
        <ArrowLeft className="size-4" />
        {t("action_back")}
      </Button>

      {/* Person header */}
      <div className="flex items-start gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Icon className="size-10" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{name}</h1>
          <p className="text-sm text-muted-foreground">{t(ROLE_LABEL_KEY[role])}</p>
          {/* Role switcher — show counts for each role the person has */}
          <div className="mt-2 flex flex-wrap gap-2">
            {otherRoles.director > 0 && (
              <RolePill
                active={role === "director"}
                icon={Clapperboard}
                label={t("movie_director")}
                count={otherRoles.director}
                onClick={() => useNav.getState().goPerson(name, "director")}
              />
            )}
            {otherRoles.actor > 0 && (
              <RolePill
                active={role === "actor"}
                icon={User}
                label={t("movie_cast")}
                count={otherRoles.actor}
                onClick={() => useNav.getState().goPerson(name, "actor")}
              />
            )}
            {otherRoles.writer > 0 && (
              <RolePill
                active={role === "writer"}
                icon={PenLine}
                label={t("movie_writer")}
                count={otherRoles.writer}
                onClick={() => useNav.getState().goPerson(name, "writer")}
              />
            )}
          </div>
        </div>
      </div>

      {/* Sort + view toggle */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {filmography.length} {t("movies")}
        </p>
        <div className="flex items-center gap-2">
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="releaseYear">{t("sort_releaseYear")}</SelectItem>
              <SelectItem value="watchDate">{t("sort_watchDate")}</SelectItem>
              <SelectItem value="title">{t("sort_title")}</SelectItem>
              <SelectItem value="rating">{t("sort_rating")}</SelectItem>
              <SelectItem value="rank">{t("sort_rank")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filmography */}
      {sorted.length === 0 ? (
        <EmptyState icon={<Film className="size-12" />} title={t("watched_empty")} />
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {sorted.map((m) => (
            <MovieCard key={m.id} movie={m} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((m) => (
            <button
              key={m.id}
              onClick={() => goMovie(m.id)}
              className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent"
            >
              <div className="h-16 w-11 shrink-0 overflow-hidden rounded">
                <PosterImage src={m.poster} alt={m.title} size="w200" className="h-full w-full" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.title}</p>
                <p className="text-xs text-muted-foreground">{m.year} · {m.director}</p>
              </div>
              {m.personalRating != null && (
                <RatingStars value={m.personalRating} readOnly size="sm" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RolePill({
  active, icon: Icon, label, count, onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="size-3" />
      {label}
      <span className="ml-0.5 rounded-full bg-background/50 px-1.5 text-[10px]">{count}</span>
    </button>
  );
}
