"use client";

import { useRef, useState } from "react";
import { Download, Upload, FileText, Info, Database, Film, Globe, Palette, AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  const backupInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState("");
  const [listName, setListName] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);

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
        body: JSON.stringify({ csv: csvText, listName: listName.trim() || "IMDb List" }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      toast.success(`Imported ${result.imported} movies, skipped ${result.skipped} duplicates → "${listName.trim() || "IMDb List"}"`);
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
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setCsvText(await f.text());
              // Auto-fill list name from filename if empty
              if (!listName.trim()) {
                const fname = f.name.replace(/\.csv$/i, "");
                setListName(fname);
              }
              e.target.value = "";
            }}
          />
        </div>
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
      </Card>
    </div>
  );
}
