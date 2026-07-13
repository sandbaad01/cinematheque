"use client";

import { useMemo, useState } from "react";
import {
  Film,
  Clock,
  Star,
  Clapperboard,
  User,
  CalendarDays,
  Printer,
  Trophy,
} from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { posterUrl } from "@/lib/movie/types";
import { cn } from "@/lib/utils";

interface FavoriteMoviePayload {
  id: string;
  title: string;
  poster: string | null;
  personalRating: number | null;
  year: number | null;
  director: string | null;
  watchDate: string | null;
}

interface YearEntry {
  year: number;
  count: number;
  avgRating: number | null;
  topGenres: { name: string; count: number }[];
  topDirectors: { name: string; count: number }[];
  favoriteMovie: FavoriteMoviePayload | null;
  months: { month: string; count: number }[];
  totalRuntime: number;
}

interface YearlyStats {
  years: YearEntry[];
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function ReportView() {
  const { t } = useI18n();
  const { refreshTick } = useNav();
  const { data, loading } = useFetch<YearlyStats>("/api/stats/yearly", [refreshTick]);

  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(() => {
    const set = new Set<number>();
    if (data) for (const y of data.years) set.add(y.year);
    set.add(currentYear);
    return Array.from(set).sort((a, b) => b - a);
  }, [data, currentYear]);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const entry = useMemo(
    () => data?.years.find((y) => y.year === selectedYear) ?? null,
    [data, selectedYear]
  );

  if (loading && !data) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-12 w-full max-w-xs" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const hours = entry ? Math.round((entry.totalRuntime / 60) * 10) / 10 : 0;
  const monthMax = entry
    ? Math.max(1, ...entry.months.map((m) => m.count))
    : 1;
  const genreMax = entry && entry.topGenres.length > 0
    ? Math.max(1, entry.topGenres[0].count)
    : 1;

  return (
    <div className="report-page mx-auto w-full max-w-4xl space-y-6 p-4 md:p-6">
      {/* Toolbar (hidden when printing) */}
      <div className="report-toolbar flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {t("report_title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("appName")} · {t("report_selectYear")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => setSelectedYear(Number(v))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("report_selectYear")} />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" onClick={() => window.print()}>
            <Printer className="size-4" />
            {t("report_print")}
          </Button>
        </div>
      </div>

      {/* Print-only masthead */}
      <div className="report-masthead hidden print:block">
        <div className="text-gradient text-3xl font-bold tracking-tight">
          {t("appName")}
        </div>
        <p className="text-sm text-muted-foreground">
          {t("report_title")} · {selectedYear}
        </p>
      </div>

      {!entry || entry.count === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          {t("report_empty", { year: selectedYear })}
        </Card>
      ) : (
        <>
          {/* Headline stats */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <ReportStat
              icon={Film}
              label={t("report_moviesThisYear")}
              value={entry.count}
              accent
            />
            <ReportStat
              icon={Clock}
              label={t("report_totalHours")}
              value={`${hours}h`}
            />
            <ReportStat
              icon={Star}
              label={t("report_avgRating")}
              value={entry.avgRating !== null ? entry.avgRating.toFixed(1) : "—"}
            />
            <ReportStat
              icon={CalendarDays}
              label={t("report_selectYear")}
              value={selectedYear}
            />
          </div>

          {/* Top genres + Top directors */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <Clapperboard className="size-4 text-primary" />
                <h3 className="font-semibold">{t("report_topGenres")}</h3>
              </div>
              <div className="space-y-2.5">
                {entry.topGenres.length === 0 && (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
                {entry.topGenres.map((g, i) => (
                  <div key={g.name} className="flex items-center gap-3">
                    <span className="w-5 text-sm text-muted-foreground">{i + 1}</span>
                    <span className="w-28 shrink-0 truncate text-sm font-medium">{g.name}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(g.count / genreMax) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs text-muted-foreground">{g.count}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <User className="size-4 text-secondary" />
                <h3 className="font-semibold">{t("report_topDirectors")}</h3>
              </div>
              <div className="space-y-2.5">
                {entry.topDirectors.length === 0 && (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
                {entry.topDirectors.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-3">
                    <span className="w-5 text-sm text-muted-foreground">{i + 1}</span>
                    <span className="flex-1 truncate text-sm font-medium">{d.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {d.count} {t("movies")}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Favorite movie */}
          {entry.favoriteMovie && (
            <Card className="overflow-hidden p-0">
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <div className="flex shrink-0 items-center gap-2 text-secondary">
                  <Trophy className="size-5" />
                  <span className="text-sm font-semibold uppercase tracking-wider">
                    {t("report_favoriteMovie")}
                  </span>
                </div>
                <div className="flex flex-1 items-center gap-4">
                  {entry.favoriteMovie.poster &&
                  posterUrl(entry.favoriteMovie.poster, "w200") ? (
                    <img
                      src={posterUrl(entry.favoriteMovie.poster, "w200") ?? ""}
                      alt={entry.favoriteMovie.title}
                      className="h-28 w-20 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-28 w-20 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                      {t("no_poster")}
                    </div>
                  )}
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-lg font-semibold tracking-tight">
                      {entry.favoriteMovie.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {typeof entry.favoriteMovie.personalRating === "number" && (
                        <span className="flex items-center gap-1 text-secondary">
                          <Star className="size-3 fill-current" />
                          {entry.favoriteMovie.personalRating.toFixed(1)}
                        </span>
                      )}
                      {typeof entry.favoriteMovie.year === "number" && (
                        <span>{entry.favoriteMovie.year}</span>
                      )}
                      {entry.favoriteMovie.director && (
                        <span className="truncate">{entry.favoriteMovie.director}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Monthly breakdown */}
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              <h3 className="font-semibold">{t("report_monthlyBreakdown")}</h3>
            </div>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-12 sm:gap-3">
              {entry.months.map((m, i) => {
                const monthIdx = Number(m.month.slice(5, 7)) - 1;
                const heightPct = (m.count / monthMax) * 100;
                return (
                  <div key={m.month} className="flex flex-col items-center gap-1.5">
                    <div className="flex h-24 w-full items-end justify-center rounded-md bg-muted/40 p-1">
                      <div
                        className={cn(
                          "w-full max-w-[18px] rounded-t-md",
                          m.count > 0 ? "bg-primary" : "bg-muted"
                        )}
                        style={{ height: `${Math.max(4, heightPct)}%` }}
                        title={`${MONTH_LABELS[monthIdx] ?? m.month}: ${m.count}`}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {MONTH_LABELS[monthIdx] ?? m.month}
                    </span>
                    <span className="text-[10px] font-medium text-foreground">
                      {m.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Footer line for the printed report */}
          <p className="report-footer pt-2 text-center text-xs text-muted-foreground">
            {t("appName")} · {t("report_title")} {selectedYear} ·{" "}
            {t("report_generated")}{" "}
            {new Date().toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </>
      )}
    </div>
  );
}

function ReportStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={cn("mt-1 text-2xl font-bold", accent && "text-primary")}>{value}</p>
        </div>
        <div
          className={cn(
            "flex size-9 items-center justify-center rounded-lg",
            accent
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="size-4" />
        </div>
      </div>
    </Card>
  );
}
