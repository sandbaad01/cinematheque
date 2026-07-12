"use client";

import { useRef, useState } from "react";
import { Camera, Upload, Trash2, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/context";
import { SectionHeader } from "@/components/movie/SectionHeader";
import { EmptyState } from "@/components/movie/EmptyState";
import { Button } from "@/components/ui/button";
import { GalleryLightbox } from "@/components/movie/GalleryLightbox";
import type { Movie } from "@/lib/movie/types";

interface PhotothequeProps {
  movie: Movie;
  onUpdated: () => void;
}

/** User-uploaded screenshots section for a movie. */
export function Phototheque({ movie, onUpdated }: PhotothequeProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const screenshots = movie.screenshots ?? [];

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB)");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/movies/${movie.id}/screenshots`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Upload failed (${res.status})`);
      }
      toast.success("Screenshot added");
      onUpdated();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const remove = async (path: string) => {
    setDeleting(path);
    try {
      const res = await fetch(
        `/api/movies/${movie.id}/screenshots?path=${encodeURIComponent(path)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("delete failed");
      toast.success("Screenshot removed");
      onUpdated();
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between">
        <SectionHeader title={t("movie_phototheque")} icon={<Camera className="size-4" />} />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          <span className="hidden sm:inline">
            {uploading ? t("phototheque_uploading") : t("phototheque_upload")}
          </span>
        </Button>
      </div>

      {screenshots.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            icon={<ImageIcon className="size-8" />}
            title={t("phototheque_empty")}
          />
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {screenshots.map((img, i) => (
            <div key={img} className="group relative overflow-hidden rounded-lg">
              <button
                onClick={() => setLightboxIndex(i)}
                className="block w-full"
              >
                <img
                  src={img}
                  alt={`Screenshot ${i + 1}`}
                  className="aspect-video w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
              </button>
              <button
                onClick={() => remove(img)}
                disabled={deleting === img}
                className="absolute right-2 top-2 rounded-md bg-background/80 p-1.5 text-destructive opacity-0 shadow transition-opacity hover:bg-background group-hover:opacity-100"
                title="Delete"
              >
                {deleting === img ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {screenshots.length > 0 && (
        <GalleryLightbox
          images={screenshots}
          open={lightboxIndex !== null}
          startIndex={lightboxIndex ?? 0}
          onOpenChange={(o) => { if (!o) setLightboxIndex(null); }}
        />
      )}
    </section>
  );
}
