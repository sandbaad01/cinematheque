"use client";

import { useState, useCallback, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Copy, Check, Download } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TMDB_IMG } from "@/lib/movie/types";

interface GalleryLightboxProps {
  images: string[];
  open: boolean;
  startIndex: number;
  onOpenChange: (open: boolean) => void;
}

/**
 * Resolve an image path to a displayable URL.
 * - Absolute URLs (`http(s)://`) and local uploads (`/screenshots/...`, `/uploads/...`)
 *   and `data:` URLs are returned as-is.
 * - Bare TMDb paths (`/abc.jpg`) get the TMDb `original` prefix.
 */
function resolveImageUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith("http") || path.startsWith("data:") || path.startsWith("blob:")) {
    return path;
  }
  // Local paths (screenshots, uploads) start with /screenshots or /uploads
  if (path.startsWith("/screenshots/") || path.startsWith("/uploads/")) {
    return path;
  }
  // TMDb paths — may or may not start with /
  return `${TMDB_IMG}/original${path}`;
}

/** Full-screen image viewer with prev/next navigation and copy/download. */
export function GalleryLightbox({ images, open, startIndex, onOpenChange }: GalleryLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const [copied, setCopied] = useState(false);

  // Sync index when opening at a new start position
  const [prevStart, setPrevStart] = useState(startIndex);
  if (prevStart !== startIndex) {
    setPrevStart(startIndex);
    setIndex(startIndex);
  }

  const next = useCallback(() => setIndex((i) => (i + 1) % images.length), [images.length]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + images.length) % images.length), [images.length]);

  const copyImage = useCallback(async () => {
    const fullUrl = resolveImageUrl(images[index] ?? "");
    try {
      // Try to fetch the image as a blob and copy to clipboard
      const res = await fetch(fullUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: copy the URL
      try {
        await navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // ignore
      }
    }
  }, [images, index]);

  const downloadImage = useCallback(() => {
    const fullUrl = resolveImageUrl(images[index] ?? "");
    const a = document.createElement("a");
    a.href = fullUrl;
    a.download = `gallery-${index + 1}.jpg`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }, [images, index]);

  // Keyboard navigation: Escape (close), ←/→ (navigate), C (copy), D (download)
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "Escape") {
        onOpenChange(false);
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        void copyImage();
      } else if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        downloadImage();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, next, prev, onOpenChange, copyImage, downloadImage]);

  if (images.length === 0) return null;

  const currentImage = images[index];
  const fullUrl = resolveImageUrl(currentImage);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[100dvh] w-[100vw] max-w-none flex-col gap-0 overflow-hidden rounded-none border-none bg-black p-0 sm:h-[100vh]"
      >
        <DialogTitle className="sr-only">
          Image {index + 1} of {images.length}
        </DialogTitle>

        {/* Close */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 z-20 size-9 rounded-full bg-black/60 text-white hover:bg-black/80 hover:text-white"
          aria-label="Close"
        >
          <X className="size-5" />
        </Button>

        {/* Image stage */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          <img
            src={fullUrl}
            alt={`Image ${index + 1} of ${images.length}`}
            className="max-h-full max-w-full object-contain"
          />

          {/* Prev */}
          {images.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={prev}
              className="absolute left-3 top-1/2 z-10 size-10 -translate-y-1/2 rounded-full bg-black/60 text-white hover:bg-black/80 hover:text-white"
              aria-label="Previous image"
            >
              <ChevronLeft className="size-6" />
            </Button>
          )}
          {/* Next */}
          {images.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={next}
              className="absolute right-3 top-1/2 z-10 size-10 -translate-y-1/2 rounded-full bg-black/60 text-white hover:bg-black/80 hover:text-white"
              aria-label="Next image"
            >
              <ChevronRight className="size-6" />
            </Button>
          )}

          {/* Subtle top caption: index / total */}
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm">
            {index + 1} / {images.length}
          </div>
        </div>

        {/* Bottom bar: keyboard hint + copy/download */}
        <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-2.5">
          <span className="hidden truncate text-xs text-white/40 sm:inline">
            ← → navigate · C copy · D download · Esc close
          </span>
          <span className="text-xs text-white/60 sm:hidden">
            {index + 1} / {images.length}
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyImage}
              className="text-white hover:bg-white/10 hover:text-white"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={downloadImage}
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <Download className="size-4" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
