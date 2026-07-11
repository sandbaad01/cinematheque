"use client";

import { useState } from "react";
import { ListOrdered, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useFetch } from "@/lib/useFetch";
import { useI18n } from "@/lib/i18n/context";
import { useNav } from "@/lib/store";
import type { PersonalList } from "@/lib/movie/types";
import { EmptyState } from "@/components/movie/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

export function ListsView() {
  const { t } = useI18n();
  const { goList } = useNav();
  const { data: lists, loading, refetch } = useFetch<PersonalList[]>("/api/lists");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: desc.trim() || null }),
      });
      if (!res.ok) throw new Error();
      setName("");
      setDesc("");
      setCreateOpen(false);
      refetch();
      toast.success(t("action_createList"));
    } catch {
      toast.error("Failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await fetch(`/api/lists/${id}`, { method: "DELETE" });
      refetch();
      toast.success(t("action_delete"));
    } catch {
      toast.error("Failed");
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t("lists_title")}</h1>
          <p className="text-muted-foreground">{t("lists_subtitle")}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">{t("action_createList")}</span>
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : !lists || lists.length === 0 ? (
        <EmptyState
          icon={<ListOrdered className="size-12" />}
          title={t("lists_empty")}
          action={<Button onClick={() => setCreateOpen(true)}>{t("action_createList")}</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((l) => (
            <Card key={l.id} className="group relative overflow-hidden p-5 transition-all hover:border-primary/50">
              <button onClick={() => goList(l.id)} className="block w-full text-left">
                <div className="mb-3 flex size-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <ListOrdered className="size-6" />
                </div>
                <h3 className="font-semibold">{l.name}</h3>
                {l.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{l.description}</p>}
                <p className="mt-2 text-xs text-muted-foreground">{t("collection_movies", { count: l.items.length })}</p>
              </button>
              <button
                onClick={() => remove(l.id)}
                className="absolute right-3 top-3 rounded-md bg-background/80 p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
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
            <DialogTitle>{t("action_createList")}</DialogTitle>
            <DialogDescription>{t("lists_subtitle")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("lists_title")} autoFocus />
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("movie_notes")} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t("action_cancel")}</Button>
            <Button onClick={create} disabled={saving || !name.trim()}>{t("action_save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
