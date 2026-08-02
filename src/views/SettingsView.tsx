"use client";

import { useRef, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Download, Upload, FileText, Info, Database, Film, Globe, Palette, AlertTriangle, Loader2, Trash2, Mail, Calendar, Users } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LanguageSwitcher } from "@/components/movie/LanguageSwitcher";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function SettingsView() {
  const { t, lang } = useI18n();
  const { triggerRefresh } = useNav();
  const { data: session } = useSession();
  const backupInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState("");
  const [listName, setListName] = useState("");
  const [busy, setBusy] = useState(false);
  const [skipTmdb, setSkipTmdb] = useState(false);
  const [importStatus, setImportStatus] = useState<"new" | "watched" | "want" | "watchlist">("new");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);
  // The Lives of Others — friend watchlist import/export
  const friendInputRef = useRef<HTMLInputElement>(null);
  const [friendData, setFriendData] = useState<any>(null);
  const [friendName, setFriendName] = useState("");
  const [friendSaving, setFriendSaving] = useState(false);
  const [exportType, setExportType] = useState<string>("want");
  const [exporting, setExporting] = useState(false);

  const exportBackup = async () => {
    try {
      const res = await fetch("/api/backup?download=1");
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cinematheque-backup.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Backup exported");
    } catch {
      toast.error("Export failed");
    }
  };

  const importBackup = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      toast.success(`Imported ${result.imported.movies} movies, ${result.imported.collections} collections, ${result.imported.lists} lists`);
    } catch {
      toast.error("Import failed — invalid backup file");
    } finally {
      setBusy(false);
    }
  };

  const importCsv = async () => {
    if (!csvText.trim()) {
      toast.error("Paste IMDb CSV first");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/import-imdb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv: csvText,
          listName: listName.trim() || "IMDb List",
          skipTmdb: skipTmdb,
          status: importStatus,
        }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      const statusLabel = importStatus === "new" ? "no status" :
        importStatus === "watched" ? "Watched" :
        importStatus === "want" ? "Wishlist" : "Watchlist";
      const msg = `Imported ${result.imported} movies (${statusLabel}), skipped ${result.skipped} duplicates → "${listName.trim() || "IMDb List"}"` +
        (result.tmdbFailed > 0 ? ` (${result.tmdbFailed} TMDb lookups failed, used CSV only)` : "");
      toast.success(msg);
      setCsvText("");
      setListName("");
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      if (!res.ok) throw new Error();
      const result = await res.json();
      toast.success(t("settings_reset_done"));
      setResetOpen(false);
      setResetConfirm("");
      triggerRefresh();
    } catch {
      toast.error("Reset failed");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      {/* Language & theme */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Globe className="size-4 text-primary" />
          <h3 className="font-semibold">{t("settings_language")}</h3>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{t("settings_language")}</p>
          <LanguageSwitcher />
        </div>
      </Card>

      {/* Backup */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Database className="size-4 text-primary" />
          <h3 className="font-semibold">{t("settings_backup")}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{t("settings_backup_desc")}</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportBackup} variant="outline">
            <Download className="size-4" />
            {t("action_export")}
          </Button>
          <Button onClick={() => backupInputRef.current?.click()} variant="outline" disabled={busy}>
            <Upload className="size-4" />
            {t("action_import")}
          </Button>
          <input
            ref={backupInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importBackup(f);
              e.target.value = "";
            }}
          />
        </div>
      </Card>

      {/* IMDb CSV */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <h3 className="font-semibold">{t("settings_import_imdb")}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{t("settings_import_imdb_desc")}</p>
        <div className="flex gap-2">
          <Input
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="List name (e.g. My Watchlist, Favorite Movies)"
            className="text-sm"
          />
          <Select value={importStatus} onValueChange={(v) => setImportStatus(v as "new" | "watched" | "want" | "watchlist")} disabled={busy}>
            <SelectTrigger className="w-[140px] text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">— (No status)</SelectItem>
              <SelectItem value="watched">Watched</SelectItem>
              <SelectItem value="want">Wishlist</SelectItem>
              <SelectItem value="watchlist">Watchlist</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={6}
          placeholder={`Position,Const,Created,Modified,Description,Title,URL,Title Type,IMDb Rating,Runtime (mins),Year,Genres,...\n1,tt0068646,...,The Godfather,...`}
          className="font-mono text-xs"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={importCsv}
            disabled={busy || !csvText.trim() || !listName.trim()}
          >
            <Upload className="size-4" />
            {busy ? t("saving") : t("action_save")}
          </Button>
          <Button onClick={() => csvInputRef.current?.click()} variant="outline" disabled={busy}>
            <FileText className="size-4" />
            .csv file
          </Button>
          <div className="flex items-center gap-2 rounded-md border px-3 py-1">
            <Switch
              id="skip-tmdb"
              checked={skipTmdb}
              onCheckedChange={setSkipTmdb}
              disabled={busy}
            />
            <Label htmlFor="skip-tmdb" className="cursor-pointer text-xs">
              Skip TMDb lookup (faster, offline-friendly)
            </Label>
          </div>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) {
                setCsvText(await f.text());
                // Auto-fill list name from filename if empty
                if (!listName.trim()) {
                  const fname = f.name.replace(/\.csv$/i, "");
                  setListName(fname);
                }
              }
              e.target.value = "";
            }}
          />
        </div>
      </Card>

      {/* The Lives of Others — Import/Export friend watchlists */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <h3 className="font-semibold">The Lives of Others</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Import a friend's watchlist to see what they want to watch, or export
          your own watchlist to share with friends.
        </p>

        {/* Export your list */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Export Your List</Label>
          <p className="text-xs text-muted-foreground">
            Choose which list to export and share with friends.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={exportType} onValueChange={setExportType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="watched">Watched Movies</SelectItem>
                <SelectItem value="want">Wishlist</SelectItem>
                <SelectItem value="watchlist">Watchlist</SelectItem>
                <SelectItem value="favorites">Lifetime Favorites</SelectItem>
                <SelectItem value="ratings">My Ratings</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              disabled={exporting}
              onClick={async () => {
                setExporting(true);
                try {
                  let url = "/api/movies";
                  if (exportType === "favorites") {
                    url = "/api/movies?sort=rank&order=asc";
                  } else if (exportType === "ratings") {
                    url = "/api/movies?sort=rating&order=desc";
                  } else {
                    url = `/api/movies?status=${exportType}`;
                  }
                  const res = await fetch(url);
                  if (!res.ok) throw new Error();
                  let movies = await res.json();
                  // Filter for favorites/ratings
                  if (exportType === "favorites") {
                    movies = movies.filter((m: any) => m.lifetimeRank != null);
                  } else if (exportType === "ratings") {
                    movies = movies.filter((m: any) => m.personalRating != null);
                  }

                  const typeLabel = exportType === "watched" ? "watched-movies"
                    : exportType === "want" ? "wishlist"
                    : exportType === "watchlist" ? "watchlist"
                    : exportType === "favorites" ? "lifetime-favorites"
                    : "my-ratings";

                  const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "user";
                  const date = new Date().toISOString().slice(0, 10);

                  const data = {
                    type: "cinematheque-export",
                    listType: exportType,
                    exportedBy: userName,
                    exportedAt: new Date().toISOString(),
                    count: movies.length,
                    movies: movies.map((m: any) => ({
                      title: m.title,
                      year: m.year,
                      director: m.director,
                      genres: m.genres,
                      overview: m.overview,
                      poster: m.poster,
                      tmdbId: m.tmdbId,
                      imdbId: m.imdbId,
                      personalRating: exportType === "ratings" ? m.personalRating : undefined,
                      lifetimeRank: exportType === "favorites" ? m.lifetimeRank : undefined,
                    })),
                  };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                  const dlUrl = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = dlUrl;
                  a.download = `${userName}-${typeLabel}-${date}.json`;
                  a.click();
                  URL.revokeObjectURL(dlUrl);
                  toast.success(`Exported ${movies.length} movies as ${userName}-${typeLabel}-${date}.json`);
                } catch {
                  toast.error("Failed to export");
                } finally {
                  setExporting(false);
                }
              }}
            >
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Export
            </Button>
          </div>
        </div>

        {/* Import friend's watchlist */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Import Friend's Watchlist</Label>
          <p className="text-xs text-muted-foreground">
            Upload a JSON file exported from another Cinémathèque user's watchlist.
            A new collection will be created in "The Lives of Others".
          </p>
          <div className="flex gap-2">
            <Input
              ref={(el) => { friendInputRef.current = el; }}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const text = await f.text();
                  const data = JSON.parse(text);
                  if (data.type !== "cinematheque-watchlist" && data.type !== "cinematheque-export" || !Array.isArray(data.movies)) {
                    throw new Error("Invalid file format");
                  }
                  setFriendName(data.exportedBy || f.name.replace(/\.json$/i, ""));
                  setFriendData(data);
                  toast.success(`Loaded ${data.movies.length} movies from file`);
                } catch (err) {
                  toast.error("Failed to read file: " + (err instanceof Error ? err.message : "invalid format"));
                }
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              onClick={() => friendInputRef.current?.click()}
            >
              <Upload className="size-4" />
              Choose File
            </Button>
          </div>
          {friendData && (
            <div className="space-y-3 rounded-lg border bg-muted/50 p-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Friend's Name:</Label>
                <Input
                  value={friendName}
                  onChange={(e) => setFriendName(e.target.value)}
                  placeholder="e.g. Marzieh"
                  className="h-8 flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {friendData.movies.length} movies will be imported as a collection
                named "{friendName || "Friend"}".
              </p>
              <Button
                size="sm"
                disabled={friendSaving || !friendName.trim()}
                onClick={async () => {
                  setFriendSaving(true);
                  try {
                    // Create a collection with the friend's name
                    const res = await fetch("/api/collections", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: friendName.trim(),
                        description: `Friend Watchlist · ${friendData.count} movies`,
                        movieIds: [],
                      }),
                    });
                    if (!res.ok) throw new Error();
                    const collection = await res.json();
                    // Create movies and add to collection
                    const movieIds: string[] = [];
                    for (const m of friendData.movies) {
                      const createRes = await fetch("/api/movies", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          ...m,
                          status: "new",
                          mediaType: "movie",
                          rewatchCount: 0,
                          personalRating: null,
                          watchDate: null,
                          notes: null,
                          lifetimeRank: null,
                          tags: [],
                          screenshots: [],
                          gallery: [],
                        }),
                      });
                      if (createRes.ok) {
                        const created = await createRes.json();
                        movieIds.push(created.id);
                      }
                    }
                    // Update collection with movie IDs
                    await fetch(`/api/collections/${collection.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ movieIds }),
                    });
                    toast.success(`Imported ${movieIds.length} movies for "${friendName.trim()}"`);
                    setFriendData(null);
                    setFriendName("");
                    triggerRefresh();
                  } catch {
                    toast.error("Failed to import friend's watchlist");
                  } finally {
                    setFriendSaving(false);
                  }
                }}
              >
                {friendSaving ? <Loader2 className="size-4 animate-spin" /> : null}
                Import as "{friendName || "Friend"}"
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Monthly Report Subscription */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Mail className="size-4 text-primary" />
          <h3 className="font-semibold">Monthly Report Subscription</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Receive a beautifully designed PDF report of your movie watching activity
          every month, sent to your email address.
        </p>
        <div className="rounded-lg border bg-muted/50 p-3 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-primary" />
            <span className="font-medium">Your email:</span>
            <span className="text-muted-foreground">{session?.user?.email || "Not signed in"}</span>
          </div>
        </div>
        <MonthlyReportToggle email={session?.user?.email || ""} />
      </Card>

      {/* Reset Application */}
      <Card className="space-y-4 border-destructive/30 p-5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-destructive" />
          <h3 className="font-semibold text-destructive">{t("settings_reset")}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{t("settings_reset_desc")}</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportBackup}
          >
            <Download className="size-4" />
            {t("action_export")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setResetOpen(true)}
          >
            <Trash2 className="size-4" />
            {t("settings_reset_button")}
          </Button>
        </div>
      </Card>

      {/* Reset confirmation dialog */}
      <AlertDialog open={resetOpen} onOpenChange={(o) => { setResetOpen(o); if (!o) setResetConfirm(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">{t("settings_reset")}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block font-medium text-foreground">{t("settings_reset_warning")}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("settings_reset_confirm")}</label>
            <Input
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder="RESET"
              className="font-mono"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>{t("action_cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={resetting || resetConfirm !== "RESET"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resetting ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("settings_reset_button")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* About */}
      <Card className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Info className="size-4 text-primary" />
          <h3 className="font-semibold">{t("settings_about")}</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Film className="size-6" />
          </div>
          <div>
            <p className="font-semibold">{t("appName")} <span className="text-muted-foreground">v1.0.0-beta</span></p>
            <p className="text-sm text-muted-foreground">{t("settings_about_desc")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="secondary">Offline-first</Badge>
          <Badge variant="secondary">EN · FA · FR</Badge>
          <Badge variant="secondary">Dark mode</Badge>
        </div>
        <p className="pt-2 text-center text-sm font-medium text-muted-foreground">
          Developed with passion by Massoud
        </p>
      </Card>
    </div>
  );
}

function MonthlyReportToggle({ email }: { email: string }) {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch subscription status on mount (persists across page reloads)
  useEffect(() => {
    if (!email) return;
    fetch("/api/monthly-report/subscribe")
      .then((res) => res.json())
      .then((data) => {
        if (data.subscribed) setSubscribed(true);
      })
      .catch(() => {});
  }, [email]);

  const toggle = async () => {
    if (!email) {
      toast.error("Please sign in first");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/monthly-report/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, subscribed: !subscribed }),
      });
      if (!res.ok) throw new Error();
      setSubscribed(!subscribed);
      toast.success(subscribed ? "Unsubscribed from monthly reports" : "Subscribed! You'll receive a report on the 1st of each month.");
    } catch {
      toast.error("Failed to update subscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Switch
        id="monthly-report"
        checked={subscribed}
        onCheckedChange={toggle}
        disabled={loading || !email}
      />
      <Label htmlFor="monthly-report" className="cursor-pointer text-sm">
        {subscribed ? "Subscribed — report sent on 1st of each month" : "Subscribe to monthly PDF report"}
      </Label>
      {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
    </div>
  );
}
