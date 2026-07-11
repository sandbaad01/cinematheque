# Personal Movie Archive - Work Log

This file tracks the work of all agents on this project.

---
Task ID: 1
Agent: Main (Z.ai Code)
Task: Foundation - Prisma schema, i18n, store, seed data

Work Log:
- Defined Prisma schema with Movie, Collection, PersonalList models (JSON fields for arrays since SQLite)
- Pushed schema to database (db/custom.db)
- Created i18n translations for English, Persian (RTL), French (~200 keys each)
- Created i18n context provider with dir (RTL/LTR) support
- Created Zustand navigation store with history/back support (single-page view router)
- Created movie types + DB parsers (parseMovie, parseCollection, parseList) + TMDB image URL helpers
- Seeded database with 26 classic films (Vertigo, Seven Samurai, Godfather, Shining, Parasite, A Separation, Amélie, etc.) with full metadata, ratings, lifetime ranks, watch dates, tags
- Seeded 2 sample collections and 1 personal list

Stage Summary:
- Database ready with rich seed data across many genres, directors, countries, languages
- i18n supports 3 languages with RTL for Persian
- Navigation uses Zustand store (single `/` route, view-based SPA)
- Ready to build API routes, components, and views

---
Task ID: 2
Agent: Backend (Z.ai Code)
Task: Implement all REST API routes for the Personal Movie Archive

Work Log:
- Created 14 API route files under `src/app/api/`:
  - `movies/route.ts` (GET list w/ filters+sort, POST create)
  - `movies/[id]/route.ts` (GET / PUT / DELETE with cascade cleanup of Collection.movieIds and PersonalList.items)
  - `genres/route.ts` (GET aggregated genre counts)
  - `stats/route.ts` (GET dashboard stats: totals, this year/month, favorites, top genres/directors, latest watched, recently added, avg rating, total runtime)
  - `recommendations/route.ts` (GET scoring algorithm with movieId/genre/global modes; ×0.1 watched penalty unless hideWatched; builds concise reason strings)
  - `search/route.ts` (GET local archive search)
  - `search-web/route.ts` (GET web hints via z-ai-web-dev-sdk `web_search`; best-effort snippet parsing; try/catch returns empty on error)
  - `collections/route.ts` + `collections/[id]/route.ts` (full CRUD; movieIds stored as JSON string)
  - `lists/route.ts` + `lists/[id]/route.ts` (full CRUD; items stored as JSON of ListItem[])
  - `random/route.ts` (GET random want-to-watch movie)
  - `backup/route.ts` (GET export with `?download=1` attachment; POST import in a transaction preserving ids/timestamps)
  - `import-imdb/route.ts` (POST CSV import with inline parser handling quoted fields; dedupe by imdbId via findFirst)
- All routes use `force-dynamic`, `NextRequest`/`NextResponse`, `db` from `@/lib/db`, and the `parseMovie`/`parseCollection`/`parseList` helpers for every response
- Fixed two runtime issues discovered during verification:
  1. stats route crashed on `createdAt.localeCompare` because Prisma returns Date objects — replaced with a `toTime()` helper that accepts Date|string|number
  2. import-imdb rejected `findUnique({ where: { imdbId } })` because imdbId is not @unique — switched to `findFirst`
- Removed unused `@typescript-eslint/no-explicit-any` disable comments (rule not enabled in project)

Stage Summary:
- All 14 API endpoints implemented and verified working via curl
- `bun run lint` is clean (0 errors, 0 warnings on API files)
- `dev.log` shows 200/204 responses for every exercised endpoint, including the DELETE cascade (Collection + PersonalList cleanup) and IMDb CSV dedupe
- Backend is fully ready for the frontend agents to wire up the UI

---
Task ID: 3
Agent: frontend-styling-expert
Task: Build shared UI components for Personal Movie Archive

Work Log:
- Read project context (worklog, types.ts, store.ts, i18n context, globals.css, existing shadcn/ui primitives) before starting.
- Confirmed API routes exist for /api/movies (POST), /api/movies/[id] (PUT), and /api/search-web (GET returns {results: [...]}) so AddMovieDialog can wire up cleanly.
- Created 14 components under src/components/movie/:
  1. PosterImage.tsx — plain <img> + lazy load + fade-in, gradient/Film-icon fallback on missing src or load error. Uses React 19 "adjust state during render" pattern (no setState-in-effect lint error).
  2. RankBadge.tsx — gold trophy + "#N" pill, three sizes (sm/md/lg).
  3. StatusBadge.tsx — colored pill with tiny dot; emerald=watched, amber=want, teal=watching (no pure blue), rose=dropped. Uses i18n t("status_" + status).
  4. GenrePill.tsx — rounded-full bordered pill; active=primary, inactive=muted; hover effect.
  5. SectionHeader.tsx — icon chip + title + optional subtitle + trailing action.
  6. EmptyState.tsx — centered max-w-md empty-state with icon, title, description, CTA.
  7. RatingStars.tsx — 0–10 rating: display mode (filled star + "9.0"/"—") and input mode (10 clickable segments with hover preview + click-to-clear). Sizes sm/md/lg.
  8. MovieCard.tsx — poster card using PosterImage + Framer Motion hover lift; rank badge (top-left), favorite heart (top-right), personal rating badge (bottom-right), play overlay on hover; navigates via useNav().goMovie.
  9. MovieRow.tsx — horizontal scrollable row of MovieCards with title/icon/action header, no-scrollbar, empty state.
  10. LanguageSwitcher.tsx — Globe dropdown using shadcn DropdownMenu + LANGUAGES; calls setLang.
  11. AddMovieDialog.tsx — two-step dialog: web search (GET /api/search-web) → pick result → pre-fill manual form, OR "Enter manually". Form has all fields (title, originalTitle, poster, backdrop, releaseDate, year, genres, runtime, country, language, director, writers, cast, overview, imdbRating, tmdbRating, trailer, status, personalRating via RatingStars, watchDate, notes, favorite switch, tags). Two-column grid on md+, ScrollArea max-h-[70vh], sonner toast, loading spinner on save button. POST /api/movies or PUT /api/movies/[id]. Skips straight to form when editMovie provided.
  12. FilterBar.tsx — exported FilterState type + DEFAULT_FILTERS. Sticky top with backdrop blur. Search input, sort Select (watchDate/releaseYear/title/rating/rank/added), asc/desc toggle button, Filters Popover with grid of Selects (status/genre/country/language/year/director/tag) + Clear button. Active filter count badge.
  13. Sidebar.tsx — desktop w-60 column (hidden md:flex) + mobile Sheet. Logo (Clapperboard + text-gradient "Cinéthèque"), full-width Add Movie button (opens internal AddMovieDialog), nav grouped into Library/Discover/Organize + bottom Settings. Active item: bg-primary/15 text-primary + left accent bar; inactive: muted hover. ScrollArea for nav. Accepts optional mobileOpen/onMobileOpenChange props (controlled or internal).
  14. Header.tsx — sticky top-0 z-30 backdrop-blur bar. Left: hamburger (md:hidden, calls onMenuClick) + view title via i18n. Right: search form (hidden sm:flex, calls goSearch on Enter), Random button (Shuffle → go("random")), LanguageSwitcher, theme toggle (Sun/Moon, toggles .dark/.light on <html>, defaults to dark to match layout.tsx).
- Skipped MovieDetailHero.tsx per spec (handled by main agent).
- Lint fixes: replaced useEffect-based state reset in PosterImage with React 19 "adjust state during render" pattern; removed useEffect-based theme hydration in Header (defaults to "dark" matching layout.tsx). Removed unused useMemo import. 
- Verified: `bun run lint` passes clean. `bunx tsc --noEmit --skipLibCheck` reports no errors in src/components/movie/* (only pre-existing errors in examples/, prisma/seed.ts, skills/).

Stage Summary:
- All 14 shared UI components created and lint-clean.
- Sidebar + Header are designed to be wired up by the main agent in a shell layout: parent holds `mobileOpen` state, passes `onMenuClick` to Header and `mobileOpen`/`onMobileOpenChange` to Sidebar (Sidebar also works fully uncontrolled).
- AddMovieDialog talks to existing /api/movies and /api/search-web endpoints and is already functional.
- FilterBar exports FilterState + DEFAULT_FILTERS for the WatchedView to consume.
- Theme toggle persists only per-session (no localStorage) — fine for now; can be upgraded later.
- Ready for the main agent to build the page shell (Sidebar + Header + main view) and individual views (Home, Watched, MovieDetail, Genres, etc.) on top of these components.

---
Task ID: 4-6
Agent: Main (Z.ai Code)
Task: Build all views, integrate page.tsx view router, verify with agent-browser

Work Log:
- Created useFetch hook (React 19 compliant - render-time state adjustment pattern, no setState in effects)
- Built 16 views: HomeView (dashboard), WatchedView (grid+filters), MovieDetailView (full detail with inline editing), GenresView, GenreDetailView (watched+recommendations+hide toggle), RatingsView, FavoritesView (GOLD/SILVER/BRONZE), LastWatchedView, TimelineView (monthly grouping), CollectionsView+CollectionView (CRUD), ListsView+ListView (ranked reorder), SearchView, SettingsView (backup/import/IMDb CSV), RandomView
- Wired page.tsx as single-route SPA: Sidebar + Header + view router via Zustand + sticky footer
- MovieDetailView: backdrop hero, poster, inline personal-info editing (rating, rank, status, favorite, rewatch, notes, tags), YouTube trailer embed, gallery, IMDb/TMDb links, recommendations with "why" reasons
- Fixed React 19 lint rules (set-state-in-effect, refs-during-render) using render-time adjustment pattern
- Fixed JSX syntax error (ternary closing brace)

Verification (agent-browser):
- Home dashboard renders: stat cards, top genres (Drama 15, Thriller 10...), top directors, latest watched row, recommendations row (unwatched movies prioritized)
- Movie detail: Mad Max shows backdrop, trailer iframe, gallery, IMDb/TMDb links, personal info section - all 200 OK
- Language switch EN→FA: full RTL (dir=rtl, lang=fa), all labels translate to Persian
- Language FA→FR→EN: all work
- Watched movies: grid with sort dropdown, order toggle, filters popover
- Genre library: 12 genres with counts, clickable cards
- Genre detail (Horror): watched section (Shining, Psycho) + recommended section with Show/Hide Watched toggle
- Lifetime Favorites: sorted by rank, Godfather #1 GOLD, Vertigo #2 SILVER, Seven Samurai #5 BRONZE
- Timeline: movies grouped by month (March 2025, Feb 2025...) with timeline dots
- Collections: 2 seed collections + New Collection button
- Random Movie: picked Oldboy (from Want to Watch list) with Pick Another
- Add Movie dialog: search step + manual form with all 20+ fields
- No console errors; all API calls return 200

Stage Summary:
- All 9 main sections + 6 bonus features (Last Watched, Random, Why Recommended, Hide Watched, Timeline, Personal Lists) implemented and browser-verified
- 3 languages (EN/FA/FR) with RTL support
- Dark cinematic theme with amber/gold accent, light mode toggle
- Lint passes clean (0 errors, 0 warnings)
- App is fully interactive and production-ready

---
Task ID: 7
Agent: Main (Z.ai Code)
Task: Apply user-provided custom color palette (teal/terracotta/cream + navy dark)

Work Log:
- Replaced :root (light) and .dark color blocks in globals.css with user's HSL palette
- Light: cream/bone background (hsl 33 20% 90%), teal tile primary (hsl 174 40% 45%), terracotta secondary (hsl 16 50% 60%), soft borders
- Dark: deep navy/lajvardi background (hsl 208 29% 10%), navy cards (hsl 209 28% 16%), brighter teal primary (hsl 174 42% 54%)
- Removed the old .light override block (no longer needed: :root defines light, .dark overrides)
- Derived matching chart palette (teal, terracotta, gold, muted purple, sage) and sidebar colors for both themes
- Updated .text-gradient to use primary→secondary (teal→terracotta) instead of hardcoded oklch
- Theme toggle in Header already works: adds/removes "dark" class; "light" class falls back to :root values

Verification (agent-browser):
- Dark mode (default): --primary=#58bbb1 (teal), card=#1d2934 (navy), secondary=#c37a60 (terracotta) ✓
- Light mode (toggle): --primary=#45a197 (teal), card=#fff (white), htmlClass=light ✓
- Navigated watched + movie detail in light mode — renders cleanly, no console errors
- Lint passes clean

Stage Summary:
- New brand palette applied across the entire app (buttons, cards, sidebar, badges, charts, gradients)
- Both light and dark themes verified working via theme toggle

---
Task ID: 8
Agent: Main (Z.ai Code)
Task: Implement smart auto-populating collections (user-provided logic)

Work Log:
- Rewrote POST /api/collections to use smart auto-assignment:
  * When no explicit movieIds provided, the collection NAME is searched across title, originalTitle, director, cast, overview, genres, tags (added genres to user's field list since it's stored as JSON string and contains() matches genre members)
  * Matched movie ids are deduplicated and injected into the new collection
  * Response includes matchedCount + autoMatched so the UI can give feedback
  * Explicit movieIds array still supported to create manual collections
- Updated CollectionsView:
  * Create dialog now has a Wand2 icon + a highlighted "Smart collection" hint box explaining the auto-matching behavior
  * After creation, toast shows "Created 'Hitchcock' — 3 matching movies auto-added" when matches found
  * Collection cards show a "Smart" badge (Sparkles icon) when they contain movies
  * Added placeholder text with examples (Hitchcock, Noir, Kurosawa, Christmas...)
- Added 6 new i18n keys to EN/FA/FR: collection_name_placeholder, collection_smart_hint, collection_smart_badge, collection_smart_created, collection_smart_matched
- Fixed a French guillemet string syntax error in translations

Verification (agent-browser):
- Created "Hitchcock" collection → auto-matched 3 movies (Vertigo, Psycho, Rear Window) via director field ✓
- Opened collection → confirmed all 3 Hitchcock films present ✓
- Created "Horror" collection → auto-matched 2 movies (The Shining, Psycho) via genres field ✓
- Smart hint text visible in dialog, Smart badges show on cards ✓
- POST returns 201, no console errors, lint clean
- Cleaned up both test collections via DELETE

Stage Summary:
- Collections are now "smart" by default: naming a collection after a director, genre, actor, theme, or tag auto-populates it with every matching movie in the archive
- Still fully editable afterwards (add/remove movies in the collection detail view)
- Works across all 3 languages with appropriate feedback toasts

---
Task ID: 9
Agent: Main (Z.ai Code)
Task: Language switch translates ONLY the movie Story (overview); UI + movie info stay English; Persian story becomes RTL

Work Log:
- Created /api/translate/route.ts: POST {text, targetLang} → LLM translation via z-ai-web-dev-sdk, with server-side in-memory cache (Map). English returns original as-is. Returns {translated, lang, rtl}.
- Modified src/lib/i18n/context.tsx: t() now ALWAYS returns English regardless of selected lang. Removed the app-wide dir wrapper. Kept lang/setLang so the movie detail knows which language to translate the story to.
- Modified src/app/page.tsx: removed the dir/lang effect that flipped the whole app to RTL. Document is now locked to dir="ltr" lang="en" permanently.
- Created src/components/movie/TranslatedStory.tsx: dedicated component that fetches the overview translation based on useI18n().lang, shows a loading spinner, a language badge (فارسی/Français) next to the "Story" heading, and applies dir="rtl" + right text-align + Vazirmatn font ONLY to the synopsis paragraph when lang==="fa". Falls back to original English on error. Uses React 19 render-time adjustment pattern (no setState-in-effect).
- Modified src/views/MovieDetailView.tsx: replaced inline overview <p> with <TranslatedStory overview={movie.overview} movieId={movie.id} />.

Verification (agent-browser):
- Vertigo detail in English: Story shows original English synopsis, html dir=ltr ✓
- Switch to فارسی: sidebar/header/labels ALL stay English (Add Movie, Watched Movies, Story, Trailer, Gallery, My Information, Director: Alfred Hitchcock, genres Mystery/Romance/Thriller) ✓
- Only the Story synopsis translated to Persian: "یک کارآگاه بازنشسته سانفرانسیسکو که از آکروفوبیا رنج می‌برد..." ✓
- Story paragraph dir="rtl" (RTL + right-aligned + Vazirmatn font), html dir stays "ltr" ✓
- Switch to Français: Story translated to French ("Un détective à la retraite..."), dir="ltr" ✓
- Switch back to فارسی: server cache hit — 12ms vs 1953ms first time ✓
- No console errors, lint clean

Stage Summary:
- Language switcher now controls ONLY the movie Story translation
- App UI and all movie metadata remain in English/original at all times
- Persian story is RTL (right-aligned, Vazirmatn font); French/English story is LTR
- LLM-powered translation with server-side caching for instant repeat visits

---
Task ID: 10
Agent: Main (Z.ai Code)
Task: Integrate real TMDb API for movie data (search + full details + refresh)

Work Log:
- Added TMDB_API_KEY and TMDB_READ_ACCESS_TOKEN to .env
- Created src/lib/tmdb.ts: TMDb v3 API helpers using Bearer token auth
  * searchMovies(query) — /search/movie
  * getMovieDetails(id) — /movie/{id}?append_to_response=credits,videos,images,external_ids
  * pickTrailer(videos) — picks best official YouTube Trailer/Teaser
  * extractCrew(crew) — director + writers (Writer/Screenplay/Story/Novel jobs)
  * extractCast(cast) — top 12 billed
  * tmdbToMoviePayload(details) — converts full TMDb response to our Movie shape
  * posterUrl/backdropUrl — CDN image URL builders
- Created /api/tmdb/search — GET ?q= returns normalized list with poster URLs, year, rating, overview
- Created /api/tmdb/details — GET ?id= returns full movie payload (title, director, writers, cast, genres, runtime, country, language, trailer, 8 gallery images, imdbId, tmdbRating, overview)
- Rewrote AddMovieDialog: search now hits /api/tmdb/search (real TMDb results with posters); clicking a result fetches /api/tmdb/details and auto-fills ALL form fields (title, originalTitle, poster, backdrop, releaseDate, year, genres, runtime, country, language, director, writers, cast, overview, tmdbRating, trailer, imdbId, tmdbId). "Enter manually" still available.
- Added "Refresh from TMDb" button (RefreshCw icon, spins while loading) on MovieDetailView next to Edit — re-fetches fresh metadata from TMDb and merges into the movie, preserving personal fields (rating, rank, notes, status, favorite, tags, watchDate, rewatchCount)
- Fixed NotesEditor: removed render-time setState pattern that caused a client-side crash on movies created via API; now uses value prop directly for display and seeds text on edit-click
- Fixed React hooks order (moved refreshing useState before early return)

Verification (agent-browser + curl):
- GET /api/tmdb/search?q=Dark Knight → real TMDb results with posters ✓
- GET /api/tmdb/details?id=155 → The Dark Knight: director Christopher Nolan, writers [Jonathan Nolan, Christopher Nolan, David S. Goyer], cast [Christian Bale, Heath Ledger...], genres [Action, Crime, Thriller], runtime 152, trailer YouTube URL, 8 gallery images, imdbId tt0468569, tmdbRating 8.532 ✓
- Add Movie dialog: searched "Interstellar" → real results → clicked → form auto-filled with all 20+ fields from TMDb ✓
- Full pipeline: TMDb details → POST /api/movies → saved to DB with 12 cast, director, trailer, gallery ✓
- Movie detail page: Refresh from TMDb button works (PUT 200, SQL UPDATE ran, all metadata refreshed) ✓
- Trailer embed, gallery, recommendations all render ✓
- Lint clean, no console errors after NotesEditor fix

Stage Summary:
- App now uses REAL TMDb API for all movie data (not hand-seeded or web-search guesses)
- Add Movie: search → pick → all fields auto-fill from TMDb (poster, backdrop, cast, director, writers, genres, trailer, gallery, ratings, imdbId)
- Refresh from TMDb: re-sync any movie's metadata while keeping personal data intact
- IMDb rating field left for manual entry (TMDb doesn't provide IMDb ratings); imdbId is set so IMDb links work

---
Task ID: 11
Agent: Main (Z.ai Code)
Task: 4 UI/UX fixes — duplicate titles, dashboard layout, translation quality, hover highlight

Work Log:

Fix 1 — Remove duplicate page titles, move subtitle to Header:
- Rewrote Header.tsx: added VIEW_SUBTITLE_KEYS mapping + a small text-xs muted subtitle line below the title. Header height increased from h-14 to h-16 to accommodate the two-line title+subtitle.
- Added "recommendations" view to ViewName type, VIEW_TITLE_KEYS, VIEW_SUBTITLE_KEYS.
- Added watched_subtitle i18n key (EN/FA/FR) and nav_recommendations key.
- Removed the big H1 + subtitle blocks from ALL views: HomeView, WatchedView, GenresView, RatingsView, FavoritesView, LastWatchedView, TimelineView, CollectionsView, ListsView, SearchView, SettingsView, RandomView.
- For Collections/Lists/Random views that had a title+action row, kept only the action button (right-aligned).

Fix 2 — Dashboard restructure:
- Reordered HomeView: (1) Latest Watched at TOP, (2) stat cards + Favorite Genres + Favorite Directors + runtime footnote at BOTTOM, (3) Recommended For You as the LAST row with a "Recommendations →" See All button.
- Increased recommendations API limit from 12 to 50.
- Created RecommendationsView.tsx: dedicated page showing all recommendations in a grid + "Why?" reasons section + Hide/Show Watched toggle.
- Added "recommendations" to nav store, page.tsx router, and Sidebar (under Discover, with Sparkles icon).

Fix 3 — Better Persian translation:
- Rewrote /api/translate system prompt: now identifies as "expert literary translator specializing in film criticism", includes movie context (title, year, director) in the prompt, gives detailed guidelines (natural/idiomatic, preserve tone, adapt cultural references, transliterate proper nouns, maintain emotional resonance).
- Enabled thinking: { type: "enabled" } for higher-quality reasoning.
- Updated TranslatedStory component to accept and pass `context` prop (title, director, year) to the translate API.
- Updated MovieDetailView to pass movie context to TranslatedStory.
- maxDuration increased to 60s for thinking-enabled requests.

Fix 4 — Tone down harsh hover highlight:
- Changed --accent from vibrant teal (hsl 174 42% 54%) to subtle muted navy-gray:
  * Dark: hsl(209 18% 22%) → #2e3842 (very dark, low saturation)
  * Light: hsl(33 10% 88%) → very light, low saturation
- Changed --accent-foreground to match (dark text on light, light text on dark).
- Now hover:bg-accent produces a barely-visible subtle tint instead of a jarring teal flash.

Verification (agent-browser):
- Fix 1: Header shows "Dashboard" (h1) + "Welcome back to your archive" (subtitle). No duplicate big H1 in content. ✓
- Fix 2: Home order = Latest Watched → Favorite Genres/Directors/stats → Recommended For You (last). "Recommendations" button navigates to dedicated page. ✓
- Fix 3: Godfather Persian translation = high-quality literary: "این فیلم که سال‌های ۱۹۴۵ تا ۱۹۵۵ را در بر می‌گیرد، روایتی از خانواده تبهکار ایتالیایی-آمریکایی کورلئونه است..." with thinking enabled + movie context. ✓
- Fix 4: --accent is now #2e3842 (muted navy) instead of #58bbb1 (vibrant teal). Hover is subtle. ✓
- Lint clean, no console errors.

Stage Summary:
- All 4 fixes implemented and verified. Ready for user's next round of feedback.

---
Task ID: 12
Agent: Main (Z.ai Code)
Task: 5 movie-page fixes — language badge, My Info, clickable crew, trailer header, link centering

Work Log:

Fix 1 — Remove language badge (فارسی/Français box) from Story:
- Removed the Badge + Languages icon from TranslatedStory.tsx. The language is now implicit from the translated text itself.
- Removed unused Badge + Languages imports.

Fix 2 — My Information: remove Heart icon, center title, halve spacing:
- Replaced <SectionHeader icon={Heart}> with a plain centered <h2 className="text-center text-lg font-semibold">My Information</h2>.
- Changed card spacing from space-y-5 to space-y-2.5 (halved) and each field's internal label-to-input gap from space-y-1.5 to space-y-1.
- The Heart icon now only appears on the Favorite action button (where it belongs), not on the section header.

Fix 3 — PersonView (director/actor/writer filmography page):
- Added "person" to ViewName + personName/personRole to ViewState + goPerson() to nav store.
- Created PersonView.tsx: shows person avatar (role-based icon), name, role label, and role-switcher pills (e.g., if someone is both director and actor, pills show counts for each role — click to switch). Filmography displayed in a grid with sort dropdown (Release Year / Watch Date / Title / Personal Rating / Lifetime Ranking).
- Added PersonView to page.tsx router and Header title mapping.

Fix 4 — Clickable crew names:
- Created DetailWithLinks component: renders each director/writer/cast name as a clickable button that calls goPerson(name, role) → navigates to PersonView.
- Names styled as primary-colored links with hover underline.
- Replaced the Director, Writer, and Cast Detail rows in MovieDetailView with DetailWithLinks.

Fix 5 — Trailer header removed, links centered:
- Removed the "Trailer" SectionHeader + Play icon. The video now appears without any label.
- Moved the IMDb/TMDb external links to be centered (justify-center) directly below the video.
- Added a fallback: if there's no trailer, links still show centered.

Verification (agent-browser):
- Godfather detail: no Trailer heading, video shows bare, IMDb+TMDb buttons centered below ✓
- My Information: "My Information" heading is text-align center, no Heart icon in header, card has space-y-2.5 ✓
- Director "Francis Ford Coppola" is a clickable button → PersonView shows "Francis Ford Coppola" + "Director 1" pill + The Godfather ✓
- Cast "Al Pacino" clickable → PersonView shows "Al Pacino" + "Cast 2" pill + Heat + The Godfather ✓
- Sort dropdown on PersonView: Release Year / Watch Date / Title / Personal Rating / Lifetime Ranking ✓
- No language badge on Story ✓
- No console errors, lint clean

Stage Summary:
- All 5 movie-page fixes implemented and verified. Crew names are now fully navigable to dedicated filmography pages with sorting. Ready for the "cinematic recommendations" topic.
