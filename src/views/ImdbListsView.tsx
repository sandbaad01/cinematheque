"use client";

import { useState } from "react";
import { Clapperboard, ArrowRight, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import type { Collection } from "@/lib/movie/types";
import { EmptyState } from "@/components/movie/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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

export function ImdbListsView() {
  const { t } = useI18n();
  const { goCollection, go } = useNav();
  const { data: collections, loading, refetch } = useFetch<Collection[]>("/api/collections");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Filter for IMDb-imported collections (those with "IMDb" in description)
  const imdbLists = (collections ?? []).filter(
    (c) => c.description?.includes("IMDb") || c.name.toLowerCase().includes("imdb")
  );

  const startEdit = (c: Collection) => {
    setEditingId(c.id);
    setEditName(c.name);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/collections/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("action_save"));
      setEditingId(null);
      refetch();
    } catch {
      toast.error("Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/collections/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(t("action_delete"));
      setDeleteId(null);
      refetch();
    } catch {
      toast.error("Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-end">
        <Button onClick={() => go("settings")}>
          <Plus className="size-4" />
          {t("settings_import_imdb")}
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : imdbLists.length === 0 ? (
        <EmptyState
          icon={<Clapperboard className="size-12" />}
          title={t("imdb_lists_empty")}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {imdbLists.map((c) => (
            <Card key={c.id} className="group relative overflow-hidden p-5 transition-all hover:border-primary/50">
              {editingId === c.id ? (
                // Inline edit mode
                <div className="space-y-3">
                  <div className="mb-3 flex size-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Clapperboard className="size-6" />
                  </div>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); }}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} disabled={saving || !editName.trim()}>
                      {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                      {t("action_save")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      {t("action_cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <button onClick={() => goCollection(c.id)} className="block w-full text-left">
                    <div className="mb-3 flex size-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Clapperboard className="size-6" />
                    </div>
                    <h3 className="font-semibold">{c.name}</h3>
                    {c.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("imdb_list_movies", { count: c.movieIds.length })}
                    </p>
                  </button>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => startEdit(c)}
                        title={t("action_edit")}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        onClick={() => setDeleteId(c.id)}
                        title={t("action_delete")}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => goCollection(c.id)}
                      className="opacity-60 transition-opacity group-hover:opacity-100"
                    >
                      {t("nav_watched")}
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("action_delete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("add_deleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("action_cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("action_delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
