"use client";

import { useState } from "react";
import { FolderOpen, Plus, Trash2, Sparkles, Wand2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import type { Collection } from "@/lib/movie/types";
import { EmptyState } from "@/components/movie/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function CollectionsView() {
  const { t } = useI18n();
  const { goCollection, triggerRefresh } = useNav();
  const { data: collections, loading, refetch } = useFetch<Collection[]>("/api/collections");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit (rename) state
  const [editTarget, setEditTarget] = useState<Collection | null>(null);
  const [editName, setEditName] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: desc.trim() || null }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const matched: number | undefined = data?.matchedCount;
      const createdName: string = data?.name ?? name.trim();
      setName("");
      setDesc("");
      setCreateOpen(false);
      refetch();
      triggerRefresh();
      // Smart feedback: tell the user how many movies were auto-added.
      if (typeof matched === "number" && matched > 0) {
        toast.success(
          `${t("collection_smart_created", { name: createdName })} — ${t("collection_smart_matched", { count: matched })}`
        );
      } else {
        toast.success(t("action_createCollection"));
      }
    } catch {
      toast.error("Failed");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c: Collection) => {
    setEditTarget(c);
    setEditName(c.name);
  };

  const renameCollection = async () => {
    if (!editTarget || !editName.trim()) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/collections/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!res.ok) throw new Error();
      setEditTarget(null);
      setEditName("");
      refetch();
      triggerRefresh();
      toast.success(t("action_save"));
    } catch {
      toast.error("Failed");
    } finally {
      setEditSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    try {
      const res = await fetch(`/api/collections/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDeleteTarget(null);
      refetch();
      triggerRefresh();
      toast.success(t("action_delete"));
    } catch {
      toast.error("Failed");
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">{t("action_createCollection")}</span>
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : !collections || collections.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="size-12" />}
          title={t("collections_empty")}
          action={<Button onClick={() => setCreateOpen(true)}>{t("action_createCollection")}</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(collections ?? []).filter((c) => !c.description?.includes("IMDb List ·")).map((c) => (
            <Card key={c.id} className="group relative overflow-hidden p-5 transition-all hover:border-primary/50">
              <button onClick={() => goCollection(c.id)} className="block w-full text-left">
                <div className="mb-3 flex size-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <FolderOpen className="size-6" />
                </div>
                <div className="flex items-center gap-2 pr-16">
                  <h3 className="font-semibold">{c.name}</h3>
                  {c.movieIds.length > 0 && (
                    <Badge variant="secondary" className="gap-1 bg-primary/15 text-primary">
                      <Sparkles className="size-3" />
                      {t("collection_smart_badge")}
                    </Badge>
                  )}
                </div>
                {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
                <p className="mt-2 text-xs text-muted-foreground">{t("collection_movies", { count: c.movieIds.length })}</p>
              </button>
              <button
                onClick={() => startEdit(c)}
                title={t("action_rename")}
                className="absolute right-10 top-3 rounded-md bg-background/80 p-1.5 text-muted-foreground transition-colors hover:text-primary"
              >
                <Pencil className="size-4" />
              </button>
              <button
                onClick={() => setDeleteTarget(c)}
                title={t("action_delete")}
                className="absolute right-3 top-3 rounded-md bg-background/80 p-1.5 text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="size-5 text-primary" />
              {t("action_createCollection")}
            </DialogTitle>
            <DialogDescription>{t("collections_subtitle")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("collection_name_placeholder")} autoFocus />
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("movie_notes")} rows={3} />
            <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{t("collection_smart_hint")}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t("action_cancel")}</Button>
            <Button onClick={create} disabled={saving || !name.trim()}>{t("action_save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={editTarget !== null} onOpenChange={(o) => { if (!o) { setEditTarget(null); setEditName(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-primary" />
              {t("rename_title_collection")}
            </DialogTitle>
            <DialogDescription>{t("rename_desc")}</DialogDescription>
          </DialogHeader>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder={t("collection_name_placeholder")}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") renameCollection(); }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditTarget(null); setEditName(""); }}>{t("action_cancel")}</Button>
            <Button onClick={renameCollection} disabled={editSaving || !editName.trim() || (editTarget !== null && editName.trim() === editTarget.name)}>
              {t("action_save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("collection_delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("collection_delete_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSaving}>{t("action_cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteSaving}
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
