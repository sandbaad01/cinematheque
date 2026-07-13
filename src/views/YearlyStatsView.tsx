"use client";

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Film, Clock, Star, Clapperboard, Tag } from "lucide-react";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface YearEntry {
  year: number;
  count: number;
  avgRating: number | null;
  topGenres: { name: string; count: number }[];
}
interface YearlyStats {
  years: YearEntry[];
  months: { month: string; count: number }[];
  decades: { decade: number; count: number }[];
  totalWatched: number;
  totalRuntime: number;
  avgRating: number | null;
  mostWatchedDirector: { name: string; count: number } | null;
  mostWatchedGenre: { name: string; count: number } | null;
}

const PIE_COLORS = ["var(--primary)", "var(--secondary)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-1)"];

function StatCard({
  icon, label, value, sub,
}: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

export function YearlyStatsView() {
  const { t } = useI18n();
  const refreshTick = useNav((s) => s.refreshTick);
  const { data: stats, loading } = useFetch<YearlyStats>("/api/stats/yearly", [refreshTick]);

  if (loading && !stats) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }
  if (!stats) return null;

  const hours = Math.round((stats.totalRuntime / 60) * 10) / 10;
  const decadeData = stats.decades.map((d) => ({
    name: t("yearly_decadeLabel", { decade: d.decade }),
    value: d.count,
  }));
  const hasData = stats.totalWatched > 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{t("yearly_title")}</h1>
        <p className="text-sm text-muted-foreground">{t("yearly_subtitle")}</p>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={<Film className="size-4" />} label={t("yearly_totalWatched")} value={String(stats.totalWatched)} />
        <StatCard icon={<Clock className="size-4" />} label={t("yearly_totalRuntime")} value={t("yearly_hours", { hours })} />
        <StatCard
          icon={<Star className="size-4" />}
          label={t("yearly_avgRating")}
          value={stats.avgRating !== null ? stats.avgRating.toFixed(1) : t("yearly_notRated")}
        />
        <StatCard
          icon={<Clapperboard className="size-4" />}
          label={t("yearly_topDirector")}
          value={stats.mostWatchedDirector?.name ?? t("yearly_none")}
          sub={stats.mostWatchedDirector ? t("yearly_countSuffix", { count: stats.mostWatchedDirector.count }) : undefined}
        />
        <StatCard
          icon={<Tag className="size-4" />}
          label={t("yearly_topGenre")}
          value={stats.mostWatchedGenre?.name ?? t("yearly_none")}
          sub={stats.mostWatchedGenre ? t("yearly_countSuffix", { count: stats.mostWatchedGenre.count }) : undefined}
        />
      </div>

      {!hasData ? (
        <Card className="flex items-center justify-center p-12 text-muted-foreground">
          <p className="text-sm">{t("yearly_none")}</p>
        </Card>
      ) : (
        <>
          {/* Bar chart: movies per year */}
          <Card className="p-4 md:p-6">
            <h2 className="mb-4 text-sm font-semibold text-primary">{t("yearly_moviesPerYear")}</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.years} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <Tooltip
                    cursor={{ fill: "var(--muted)" }}
                    contentStyle={{
                      background: "var(--card)", border: "1px solid var(--border)",
                      borderRadius: 8, color: "var(--card-foreground)", fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Line chart: movies per month */}
            <Card className="p-4 md:p-6">
              <h2 className="mb-4 text-sm font-semibold text-primary">{t("yearly_moviesPerMonth")}</h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.months} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)", border: "1px solid var(--border)",
                        borderRadius: 8, color: "var(--card-foreground)", fontSize: 12,
                      }}
                    />
                    <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--primary)" }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Pie chart: by decade */}
            <Card className="p-4 md:p-6">
              <h2 className="mb-4 text-sm font-semibold text-primary">{t("yearly_byDecade")}</h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={decadeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={42}
                      paddingAngle={2}
                      stroke="var(--card)"
                    >
                      {decadeData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)", border: "1px solid var(--border)",
                        borderRadius: 8, color: "var(--card-foreground)", fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {decadeData.map((d, i) => (
                  <span key={d.name} className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full" style={{ background: `var(--chart-${(i % 5) + 1})` }} />
                    {d.name} · {d.value}
                  </span>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
