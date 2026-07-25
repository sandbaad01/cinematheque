/* Cinémathèque — basic service worker for offline PWA support.
 *
 * Strategy:
 *   - On install: pre-cache a minimal "app shell" (the root document + a few
 *     static asset paths). These are the only URLs guaranteed to be available
 *     offline. Next.js hashes asset filenames, so we keep the precache list
 *     tiny and rely on runtime caching to fill in the rest.
 *   - Static asset requests (same-origin, ending in .js/.css/.woff2/.svg/...)
 *     → cache-first. Falls back to network if not cached, then caches a copy.
 *   - Same-origin API requests (/api/...) → network-first, falls back to the
 *     last cached response when the network is unavailable.
 *   - Everything else → try network, fall back to cache.
 *
 * NOTE: This is a *basic* PWA setup. TMDb poster/backdrop images are
 * cross-origin and won't be cached here, so the UI shell + cached data will
 * work offline but images may not load until the device is back online.
 */

const CACHE_VERSION = "cinematheque-v1";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/robots.txt",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_VERSION)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

const STATIC_ASSET_RE = /\.(?:js|css|woff2?|ttf|otf|svg|png|jpg|jpeg|gif|webp|ico)$/i;

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Only handle same-origin GETs. Cross-origin (e.g. TMDb image CDN) is left
  // to the browser default behaviour.
  if (url.origin !== self.location.origin) return;

  // Navigation requests (HTML pages) → network-first, fall back to cached
  // root document so the app shell loads offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/").then((r) => r || caches.match(req)))
    );
    return;
  }

  // API calls → network-first, fall back to cache when offline.
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Only cache successful JSON responses.
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || Response.error()))
    );
    return;
  }

  // Static assets → cache-first.
  if (STATIC_ASSET_RE.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req)
            .then((res) => {
              if (res && res.status === 200) {
                const copy = res.clone();
                caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
              }
              return res;
            })
            .catch(() => cached)
      )
    );
    return;
  }

  // Default: try network, fall back to cache.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
