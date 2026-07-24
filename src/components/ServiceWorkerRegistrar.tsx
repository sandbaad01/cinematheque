"use client";

import { useEffect } from "react";

/**
 * Registers the Cinémathèque service worker (/sw.js) on the client.
 *
 * This is a *basic* PWA setup:
 *   - The app shell (HTML/CSS/JS/fonts) is cached on install.
 *   - Same-origin API responses are cached network-first, so previously
 *     visited screens still render when offline.
 *   - TMDb image CDN requests are cross-origin and are NOT cached here —
 *     posters/backdrops may not appear until the device is back online.
 *
 * The component renders nothing. It is mounted once from the root layout.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Only register in production-like contexts. During local dev the
    // Next.js dev server frequently invalidates chunks, which would make
    // cache-first serve stale assets. We still register when the page is
    // served over HTTPS or from localhost so users can test offline mode.
    const isDev = process.env.NODE_ENV === "development";
    if (isDev && !window.location.hostname.includes("localhost")) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => {
          // Registration failures are non-fatal — the app still works online.
          console.warn("SW registration failed:", err);
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
