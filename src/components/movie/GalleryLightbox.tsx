"use client";

import { useState, useCallback, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Copy, Check, Download } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { backdropUrl } from "@/lib/movie/types";

interface GalleryLightboxProps {
  images: string[];
  open: boolean;
  startIndex: number;
  onOpenChange: (open: boolean) => void;
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

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, next, prev, onOpenChange]);

  if (images.length === 0) return null;

  const currentImage = images[index];
  const fullUrl = backdropUrl(currentImage, "original") ?? currentImage;

  const copyImage = async () => {
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
  };

  const downloadImage = () => {
    const a = document.createElement("a");
    a.href = fullUrl;
    a.download = `gallery-${index + 1}.jpg`;
    a.target = "_blank";
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl border-none bg-black/95 p-0 sm:rounded-xl">
        <DialogTitle className="sr-only">
          Image {index + 1} of {images.length}
        </DialogTitle>
        {/* Close */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 z-10 bg-black/50 text-white hover:bg-black/70"
        >
          <X className="size-5" />
        </Button>

        {/* Image */}
        <div className="relative flex items-center justify-center" style={{ maxHeight: "80vh" }}>
          <img
            src={fullUrl}
            alt={`Gallery image ${index + 1}`}
            className="max-h-[80vh] w-auto object-contain"
          />

          {/* Prev */}
          {images.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
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
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
            >
              <ChevronRight className="size-6" />
            </Button>
          )}
        </div>

        {/* Bottom bar: counter + copy/download */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-white/70">
            {index + 1} / {images.length}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={copyImage} className="text-white hover:bg-white/10">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="ghost" size="sm" onClick={downloadImage} className="text-white hover:bg-white/10">
              <Download className="size-4" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
