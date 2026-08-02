"use client";

import { useState } from "react";
import { Users, Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useFetch } from "@/lib/useFetch";
import { useNav } from "@/lib/store";
import type { Collection } from "@/lib/movie/types";
import { EmptyState } from "@/components/movie/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function LivesOfOthersView() {
  const { go, goCollection, triggerRefresh } = useNav();
  const { data: collections, loading, refetch } = useFetch<Collection[]>("/api/collections");

  // Filter for friends' watchlists (collections with "Friend Watchlist" in description)
  const friendLists = (collections ?? []).filter(
    (c) => c.description?.includes("Friend Watchlist ·")
  );

  // Edit (rename) state
  const [editTarget, setEditTarget] = useState<Collection | null>(null);
  const [editName, setEditName] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

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
      toast.success("Renamed successfully");
    } catch {
      toast.error("Failed to rename");
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
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-end">
        <Button onClick={() => go("settings")}>
          <Users className="size-4" />
          <span className="hidden sm:inline">Import Friend's List</span>
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : friendLists.length === 0 ? (
        <EmptyState
          icon={<Users className="size-12" />}
          title="No friends' lists yet. Go to Settings to import one."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {friendLists.map((c) => (
            <Card key={c.id} className="group relative overflow-hidden p-5 transition-all hover:border-primary/50">
              <button onClick={() => goCollection(c.id)} className="block w-full text-left">
                <div className="mb-3 flex size-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Eye className="size-6" />
                </div>
                <h3 className="font-semibold">{c.name}</h3>
                {c.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {c.movieIds.length} movies
                </p>
              </button>
              <button
                onClick={() => startEdit(c)}
                title="Rename"
                className="absolute right-10 top-3 rounded-md bg-background/80 p-1.5 text-muted-foreground transition-colors hover:text-primary"
              >
                <Pencil className="size-4" />
              </button>
              <button
                onClick={() => setDeleteTarget(c)}
                title="Delete"
                className="absolute right-3 top-3 rounded-md bg-background/80 p-1.5 text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* Rename dialog */}
      <Dialog open={editTarget !== null} onOpenChange={(o) => { if (!o) { setEditTarget(null); setEditName(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-primary" />
              Rename
            </DialogTitle>
            <DialogDescription>Enter a new name for this list.</DialogDescription>
          </DialogHeader>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Friend's name"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") renameCollection(); }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditTarget(null); setEditName(""); }}>Cancel</Button>
            <Button onClick={renameCollection} disabled={editSaving || !editName.trim() || (editTarget !== null && editName.trim() === editTarget.name)}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this list?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.name}" and its {deleteTarget?.movieIds.length ?? 0} movies. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
