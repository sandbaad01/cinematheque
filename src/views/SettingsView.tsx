"use client";

import { useRef, useState } from "react";
import { Download, Upload, FileText, Info, Database, Film, Globe, Palette } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/movie/LanguageSwitcher";
import { Separator } from "@/components/ui/separator";

export function SettingsView() {
  const { t, lang } = useI18n();
  const { triggerRefresh } = useNav();
  const backupInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState("");
  const [listName, setListName] = useState("");
  const [busy, setBusy] = useState(false);

  const exportBackup = () => {
    window.open("/api/backup?download=1", "_blank");
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
        <Separator />
        <div className="flex items-center gap-2">
          <Palette className="size-4 text-primary" />
          <h3 className="font-semibold">{t("settings_theme")}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{lang === "fa" ? "پوسته تیره به‌طور پیش‌فرض فعال است." : lang === "fr" ? "Thème sombre activé par défaut." : "Dark theme is enabled by default."}</p>
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
        <Input
          value={listName}
          onChange={(e) => setListName(e.target.value)}
          placeholder="List name (e.g. My Watchlist, Favorite Movies)"
          className="text-sm"
        />
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
            <p className="font-semibold">{t("appName")}</p>
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
