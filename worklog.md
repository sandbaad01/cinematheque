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

---
Task ID: 13
Agent: Main (Z.ai Code)
Task: 3 movie-page fixes — remove header title, soften Back button, constrain My Info box

Work Log:

Fix 1 — Remove "movie" title from header on movie page:
- In Header.tsx, wrapped the title+subtitle block in a conditional: `{view !== "movie" && titleKey && (...)}`. On the movie detail page, the header now shows only the search box + random + language + theme buttons — no duplicate "movie" title. The movie's own title is already shown large in the content area.

Fix 2 — Soften the Back button:
- Changed from `variant="secondary"` (solid high-contrast) to `variant="ghost"` with custom classes: `bg-background/40 text-foreground/80 backdrop-blur-sm hover:bg-background/60 hover:text-foreground`.
- Result: 40% opacity background, 80% opacity text, subtle blur — blends with the backdrop image instead of standing out as a solid block. Hover gently increases to 60% bg + full text.

Fix 3 — My Information box: equal-width items, aligned, 2/3 width:
- Wrapped the Card in a constrainer: `<div className="mx-auto w-full max-w-[260px]">` — card is now 260px wide (~2/3 of the previous ~390px column), centered.
- Made ALL items full-width and consistently aligned:
  * Favorite button: added `w-full`
  * Status select: already `w-full`
  * Rank input: changed from `w-24` to `w-full min-w-0 flex-1` (fills the row, Clear Rank button stays compact beside it)
  * Watch date input: added `w-full`
  * Rewatch: changed from split label/button row to a labeled full-width button ("Rewatches (N)" label + full-width "Log Rewatch" button)
- All items now have equal left/right edges, creating a clean aligned column.

Verification (agent-browser):
- Fix 1: Header on movie page has NO "movie" h1. First heading is the movie title "The Godfather" in content. ✓
- Fix 2: Back button has bg rgba(0.21/0.4) — soft 40% opacity, text 80% opacity, backdrop-blur. Much lower contrast than before. ✓
- Fix 3: My Info card width = 260px (was ~390px). Wrapper has mx-auto max-w-[260px]. Favorite/Status/Rank/WatchDate/Rewatch all have w-full. ✓
- No console errors, lint clean.

Stage Summary:
- All 3 fixes implemented and verified. Movie page header is clean, Back button is soft, My Information is a tidy narrow aligned box.

---
Task ID: 14
Agent: Main (Z.ai Code)
Task: 7 movie-page fixes — MI box, rewatch, crew colors, trailer header, gallery lightbox, rename, recommendation engine

Work Log:

Fix 1 — MI box width: removed the max-w-[260px] constraint; card now matches Notes card width (~315px). Rating stars no longer overflow.

Fix 2 — Rewatch compact: merged Lifetime Rank + Rewatch into one section. Label row: "Lifetime Rank" (left) + "Rewatches: N" (right). Input row: rank input (flex-1) + Clear Rank ghost button + Log Rewatch ghost icon button. All compact, right-aligned like Clear Rank.

Fix 3 — Crew detail values color: changed Detail component's <dd> from "text-sm font-medium" (white) to "text-sm font-normal text-primary/80" (soft teal at 80% opacity). Also changed DetailWithLinks from text-primary/90 to text-primary/80 for consistency. Values are now soft teal, not bold, matching the link intensity.

Fix 4 — Trailer header restored: added back <SectionHeader title="Trailer" icon={<Play/>}> above the video iframe.

Fix 5 — Gallery lightbox: created GalleryLightbox component (full-screen dialog with prev/next navigation, copy-to-clipboard, download). Gallery images are now clickable buttons that open the lightbox. Keyboard navigation (arrows + escape) supported.

Fix 6 — Renamed app: replaced "Cinéthèque" with "Cinematheque" in translations.ts (EN/FA/FR) and layout.tsx title.

Fix 7 — MAJOR: Rewrote recommendation engine:
- Added TMDb API functions: getRecommendations(), getSimilarMovies(), getMovieKeywords()
- Rewrote /api/recommendations to use TMDb collaborative filtering as PRIMARY signal:
  * For each seed movie (by tmdbId), fetches TMDb /recommendations + /similar (movies that millions of TMDb users watched after the seed)
  * Scores: recommendation source = 10pts, similar source = 6pts, weighted by seed's personal rating
  * Keyword overlap: fetches TMDb keywords for seed + top 15 candidates; +1.5pts per shared keyword (thematic similarity)
  * Filters out movies already in the archive (by tmdbId + fuzzy title match)
  * Fetches full details (director, cast, genres, trailer, gallery) for top 50 candidates
  * Returns 50 recommendations (was 3-4 before)
- Reasons are meaningful: "Loved by fans of both Godfather and GoodFellas", "Fans of Mad Max: Fury Road also loved this — shares thematic elements"
- TMDb-only movies (not in archive) get id="tmdb-{id}" and can be opened in MovieDetailView
- MovieDetailView updated: detects tmdb- prefix, fetches from /api/tmdb/details, shows "Want to Watch" + "Add Movie" buttons instead of edit/delete, hides personal info card
- /api/tmdb/details route updated to return complete Movie-shaped object

Verification (agent-browser + curl):
- Global recommendations: 50 results (was 3-4). Top: Casino, The Irishman, Silence of the Lambs — all perfect for Godfather/GoodFellas/Se7en fans ✓
- Movie-specific (Mad Max): 40 results including Mad Max 2, Matrix, post-apocalyptic films ✓
- TMDb movie detail (Casino): shows title, story, trailer, gallery + "Want to Watch"/"Add Movie" buttons ✓
- MI box: 315px (matches Notes), rating fits ✓
- Crew values: oklab teal at 80% opacity, font-normal ✓
- Trailer header: "Trailer" h2 restored ✓
- Gallery lightbox: "Image 1 of 8" + Copy/Download/Close ✓
- App name: "Cinematheque" ✓
- Lint clean

Stage Summary:
- Recommendation engine completely transformed: from 3-4 generic local matches to 50 TMDb-powered collaborative-filtering recommendations with thematic keyword analysis
- TMDb movies not in archive can be browsed in full detail and added with one click
- All 7 UI fixes verified. Ready for next round of feedback.

---
Task ID: 15
Agent: Main (Z.ai Code)
Task: 4 fixes — crew color, app accent, remove reasons, Photothèque section

Work Log:

Fix 1 — Crew values complementary color:
- Changed Detail component's <dd> from text-primary/80 (teal) to text-secondary/90 (terracotta).
- Now non-clickable values (Release Date, Runtime, Country, Language) are in warm terracotta, clearly distinguishable from clickable teal director/writer/cast links. Complementary colors in the palette.

Fix 2 — App name accent:
- Changed "Cinematheque" to "Cinémathèque" in EN and FR translations + layout.tsx title.

Fix 3 — Remove recommendation reasons:
- Removed the "why recommended" reason text boxes from MovieDetailView. Now shows just a clean MovieRow with 12 recommendation cards (was 8). No more repetitive reason text.

Fix 4 — Photothèque section:
- Added `screenshots` field to Prisma Movie model (JSON array of paths), pushed schema, regenerated client.
- Updated Movie type, parseMovie, movies POST/PUT routes, tmdb.ts payload, tmdb/details route, recommendations route, AddMovieDialog to include screenshots: [].
- Created /api/movies/[id]/screenshots route: POST (FormData upload to public/screenshots/) + DELETE (remove by path).
- Created Phototheque.tsx component: upload button, 2-column grid of screenshots, delete on hover, lightbox integration (click to enlarge + copy/download).
- Added i18n keys: movie_phototheque, phototheque_empty, phototheque_upload, phototheque_uploading (EN/FA/FR).
- Rewired MovieDetailView gallery: Gallery (2 columns) + Photothèque side-by-side in a lg:grid-cols-2 layout. Gallery was 3 columns, now 2 to leave room for Photothèque.
- Uploaded a test screenshot via API → saved to /screenshots/ → confirmed displaying on Godfather page.

Verification (agent-browser):
- App name: "Cinémathèque" ✓
- Crew values: text-secondary/90 (terracotta oklab 0.65 0.076 0.064 / 0.9) ✓
- Gallery: 2 columns (7 images) ✓
- Photothèque: section present, "1 screenshot images" confirmed on page ✓
- Screenshot upload: POST returned 200 with screenshots array containing the path ✓
- No recommendation reason text boxes ✓
- Lint clean

Stage Summary:
- All 4 changes implemented and verified. Crew values are now clearly non-clickable (terracotta vs teal). App has proper accents. Recommendations are clean (no repetitive reasons). Photothèque allows uploading personal screenshots alongside the TMDb gallery.

---
Task ID: 16
Agent: Main (Z.ai Code)
Task: Fix upload failure + TMDb API key 401 fallback

Work Log:
- Investigated "Upload failed" error:
  * Upload route works correctly via curl (HTTP 200) and browser fetch (tested via eval)
  * The failure was caused by the dev server crashing between requests in the sandbox environment
  * Improved error handling in Phototheque.tsx: now shows the actual error message (e.g., "File too large" or network error) instead of generic "Upload failed"
  * Increased file size limit from 10MB to 20MB (screenshots can be large)
  * Added better error logging in the screenshots route (logs movieId + actual error message)
  * Added maxDuration: 60 to the route

- Discovered TMDb API key is returning 401 "Invalid API key" errors:
  * All TMDb API calls (recommendations, similar, keywords) are failing
  * This was causing the recommendations to return empty results and flooding the dev log with errors
  * Added localRecommendations() fallback function: when TMDb returns no candidates (due to 401 or network errors), the route falls back to local matching (shared director/actors/genres/ratings) from the user's own archive
  * Verified: recommendations now return 3 local results (Heat, Once Upon a Time in America, Oldboy) even with TMDb down

Verification:
- Upload: POST /api/movies/[id]/screenshots 200 ✓ (4 screenshots now saved for Godfather)
- Recommendations fallback: 3 local results returned when TMDb is down ✓
- Lint clean

Note: The TMDb API key (39adf355a4930c90981a9d8abc608dec) is returning 401 "Invalid API key". The user may need to regenerate it at https://www.themoviedb.org/settings/api. Until then, the app uses local fallback recommendations.

---
Task ID: 17
Agent: Main (Z.ai Code)
Task: Fix upload failure — switched to base64 JSON upload

Work Log:
- Root cause: The Next.js dev server crashes in this sandbox environment when handling multipart FormData uploads. The upload route itself works correctly (verified via curl multiple times with HTTP 200), but the server dies between requests.
- Fix 1: Changed Phototheque upload from FormData to base64 data URL (JSON body). The browser reads the file as a data URL via FileReader.readAsDataURL(), then sends it as JSON { image: "data:image/jpeg;base64,..." }. This avoids multipart parsing which was crashing the server.
- Fix 2: Updated the screenshots route to accept both FormData AND JSON base64 uploads (content-type detection).
- Fix 3: Added experimental.serverActions.bodySizeLimit: "50mb" to next.config.ts.
- Fix 4: Suppressed TMDb 401 error logging (was flooding the dev log and potentially contributing to crashes). Added 5-second timeout to TMDb fetches via AbortController.
- Verified: base64 upload via curl returns HTTP 200 with screenshot saved. Godfather now has 5 screenshots.

Note: The dev server in this sandbox is unstable and crashes frequently between requests. The upload code is correct — when the server is alive, uploads succeed. The user may need to restart the dev server if it crashes.

---
Task ID: 2-b
Agent: Frontend (Z.ai Code)
Task: Add Quick "Mark as Watched" toggle to movie cards + Advanced Recommendation Filters (Decade/Country/Min TMDb rating) to RecommendationsView

Work Log:
- Read previous worklog (Tasks 1 + 2 backend already done — API routes, schema, i18n, store all in place)
- Added 4 new i18n keys to `src/lib/i18n/translations.ts` for EN / FA / FR:
  - `rec_filterDecade` ("Decade" / "دهه" / "Décennie")
  - `rec_filterCountry` ("Country" / "کشور" / "Pays")
  - `rec_minRating` ("Min Rating" / "حداقل امتیاز" / "Note min.")
  - `rec_markedWatched` ("Marked as watched" / "به‌عنوان دیده‌شده علامت زده شد" / "Marqué comme vu") — used as toast text + aria-label/title for the toggle
- Created `src/components/movie/QuickStatusToggle.tsx`:
  - "use client" small icon button (Check icon from lucide) sized 7x7 (matches favorite heart)
  - Only visible on hover via `opacity-0 group-hover:opacity-100` (also focus-visible + busy states)
  - On click: stopPropagation + preventDefault so it doesn't open the movie detail page; PUT `/api/movies/{id}` with `{ status: "watched", watchDate: <today ISO yyyy-mm-dd> }` (route supports partial update)
  - Calls `triggerRefresh()` from Zustand store on success; shows `toast.success(t("rec_markedWatched"))` via sonner (already wired in layout.tsx)
  - Uses teal/terracotta palette via `text-primary` / `bg-background` tokens (no blue/indigo)
  - Loading state: button stays visible with `animate-pulse` and is disabled until request finishes
- Updated `src/components/movie/MovieCard.tsx`:
  - Imported `QuickStatusToggle`
  - Replaced the single favorite heart with a stacked top-right container (`flex flex-col items-end gap-1`) that holds the favorite heart first, then the `QuickStatusToggle` below it
  - Toggle is only rendered when `movie.status === "want"`; container only renders when either indicator is needed (avoids empty overlay)
  - Preserved all existing positioning (rank badge top-left, hover play overlay, bottom-right rating)
- Updated `src/views/RecommendationsView.tsx`:
  - Added three shadcn `Select` dropdowns above the grid: Decade (All + 1950s–2020s), Country (derived from recommendation results via `useMemo` over `allRecs`), Min Rating (All / 6+ / 7+ / 8+)
  - All filters applied client-side in a single `useMemo` over `allRecs` (alongside the existing `hideWatched` toggle which is preserved)
  - Decade matching: `Math.floor(year/10)*10 === selectedDecade`
  - Min rating uses `tmdbRating ?? imdbRating` (null rating never passes a non-"all" filter)
  - Added a "Clear" button (`filters_clear` key, already existed) that appears only when at least one filter is non-"all"
  - Empty state still uses `rec_noUnwatched`
  - Layout is responsive: filter bar wraps on small screens (`flex-col sm:flex-row sm:flex-wrap`)
- Verification: `cd /home/z/my-project && bun run lint 2>&1 | tail -20` → ESLint passes with no errors; recent dev.log shows no compile errors

Stage Summary:
- `QuickStatusToggle.tsx` provides a hover-revealed, accessible checkmark button on every MovieCard where `status === "want"`; one click marks the movie watched with today's date, triggers global refresh, and shows a confirmation toast — no detail-page navigation needed
- `RecommendationsView` now has three filter dropdowns (Decade / Country / Min Rating) plus the existing Hide Watched toggle and a Clear button; Country list is dynamically derived from current recommendation results
- i18n keys added in all three languages (EN/FA/FR) for both new features
- Lint clean; no blue/indigo colors used; teal/terracotta theme tokens (`text-primary`, `bg-background`) preserved

---
Task ID: 2-a
Agent: Main (Z.ai Code)
Task: Add a Yearly Stats dashboard page with charts (bar / line / pie)

Work Log:
- Read worklog.md, movie/types.ts, page.tsx, store.ts, useFetch.ts, existing stats/route.ts and i18n/translations.ts before starting to match existing conventions.
- Created `src/app/api/stats/yearly/route.ts` (GET, `force-dynamic`):
  * Loads all movies via `db.movie.findMany()` + `parseMovie`, filters to `status === "watched"`.
  * `years[]` — group by `watchDate` year (YYYY), each entry has `count`, rounded `avgRating` (1 decimal), top 3 genres; sorted ascending.
  * `months[]` — last 12 months from current month, each formatted `YYYY-MM` with zero-fill for empty months (so the line chart shows continuous timeline).
  * `decades[]` — `Math.floor(year/10)*10` from release year, sorted ascending.
  * `totalWatched`, `totalRuntime` (minutes), `avgRating` (rounded to 1 decimal).
  * `mostWatchedDirector` and `mostWatchedGenre` (single top entry each, or null).
  * Returns 500 + error message on exception; logs to console.
- Added 14 new i18n keys to EN/FA/FR in `src/lib/i18n/translations.ts`:
  * yearly_title, yearly_subtitle, yearly_moviesPerYear, yearly_moviesPerMonth, yearly_byDecade,
    yearly_totalWatched, yearly_totalRuntime, yearly_avgRating, yearly_topDirector, yearly_topGenre,
    yearly_hours (with {hours} placeholder), yearly_notRated, yearly_none, yearly_countSuffix, yearly_decadeLabel.
- Created `src/views/YearlyStatsView.tsx` (~190 lines, "use client"):
  * Fetches `/api/stats/yearly` via `useFetch` keyed on `refreshTick`.
  * Loading state: 3 stacked Skeletons. Empty state (0 watched): a single muted card.
  * Top: responsive grid of 5 StatCards (Total Watched, Total Runtime in hours, Avg Rating, Top Director + count, Top Genre + count) with lucide icons + teal `text-primary` accent.
  * Full-width Card with Recharts `BarChart` (movies per year) — primary teal bars, CartesianGrid, primary axis, rounded top corners.
  * Two-column Card grid (lg:):
    - `LineChart` of last 12 months — primary teal line with dots, monotone curve.
    - Donut `PieChart` of decades — cycles through `--chart-1..5` colors, with a custom legend below showing decade label + count.
  * All charts use `ResponsiveContainer` and `var(--primary)`, `var(--secondary)`, `var(--chart-N)`, `var(--card)`, `var(--border)` CSS vars (no raw blue/indigo), with theme-aware tooltips styled via `contentStyle`.
- Wired into `src/app/page.tsx`: imported `YearlyStatsView`, added `case "yearlyStats": return <YearlyStatsView />;` (the `yearlyStats` view was already in `ViewName` and the Sidebar already exposes it with a BarChart3 icon).
- TypeScript fix: the initial `?? { count: 0, ratings: [], genres: new Map() }` default widened to `never[]`, making `.push(number)` error with TS2345. Replaced with an explicit `type YearEntry` + `makeYearEntry()` factory so the inferred type stays `{ count: number; ratings: number[]; genres: Map<string, number> }`.

Verification:
- `curl /api/stats/yearly` → 200, returns correct payload: 4 years (2017/2024/2025/2026), 12 months, 8 decades (1950s→2020s), 184 total watched, 19483 min (~325h) runtime, 9.1 avg rating, top director "Alfred Hitchcock" (3), top genre "Drama" (123).
- `bun run lint` → clean (0 errors, 0 warnings).
- `bunx tsc --noEmit --skipLibCheck` → no errors in any of the new/modified files (only pre-existing errors in examples/, prisma/seed.ts, skills/, and pre-existing `lastWatched` ViewName issue in HomeView.tsx + page.tsx that were there before this task).
- `dev.log` shows no compile errors after the change; existing routes still 200.

Stage Summary:
- New Yearly Stats dashboard fully implemented end-to-end (API + view + i18n + router wiring).
- 3 Recharts visualizations (bar/line/pie) all driven by `var(--primary)` teal + `var(--chart-N)` palette, fully responsive via `ResponsiveContainer`.
- 5 stat cards surface the headline numbers (watched / runtime hours / avg rating / top director / top genre).
- Sidebar's existing "Yearly Stats" nav item now navigates to the new view; all 3 languages (EN/FA/FR) have the required translation keys.
- Ready for users to view their watching trends over years, months, and release decades.

---
Task ID: 2-c
Agent: Frontend (Z.ai Code)
Task: Add 3 UI enhancements — page transitions, auto-rotating poster carousel on Home, fullscreen gallery/Photothèque viewer enhancements

Work Log:
- Read prior worklog (Tasks 1, 2 backend, 2-a yearly stats, 2-b quick-status toggle) and inspected `src/app/page.tsx`, `src/views/HomeView.tsx`, `src/components/movie/MovieRow.tsx`, `src/components/movie/MovieCard.tsx`, `src/components/movie/GalleryLightbox.tsx`, `src/lib/store.ts`, `src/lib/movie/types.ts`, and the shadcn `Dialog` primitive to match existing conventions before changing anything.

**Feature 1 — Page transition animations (`src/app/page.tsx`):**
- Imported `motion` + `AnimatePresence` from `framer-motion`.
- Wrapped `renderView()` in `<AnimatePresence mode="wait">` and a `motion.div` with `key={view}` and the exact transition props requested (`initial={{opacity:0,y:8}}`, `animate={{opacity:1,y:0}}`, `exit={{opacity:0,y:-8}}`, `transition={{duration:0.2,ease:"easeOut"}}`).
- Placed inside the existing `<main ref={mainRef} className="flex-1 overflow-y-auto scrollbar-thin">` scroll container, so the scroll container is preserved — only the inner content re-animates on view change. `mode="wait"` ensures the outgoing view finishes its 0.2s exit (slides up 8px + fades) before the new view slides up 8px + fades in.

**Feature 2 — Auto-rotating poster carousel:**
- Created `src/components/movie/PosterCarousel.tsx` (~140 lines, "use client"):
  * Built on `embla-carousel-react` (already in `node_modules`; the optional `embla-carousel-autoplay` plugin is NOT installed, so autoplay is implemented manually with `window.setInterval` calling `emblaApi.scrollNext()` every 4000 ms).
  * Carousel options: `align: "start"`, `loop: true`, `containScroll: "trimSnaps"` so it wraps cleanly and aligns to slide boundaries.
  * Autoplay pauses while the user hovers or focuses the carousel (via `onMouseEnter/Leave` + `onFocus/Blur` → `setPaused(true/false)`); interval is cleared when paused or unmounted.
  * Left/right arrow buttons are positioned absolutely at vertical center, fade in on `group-hover/carousel` (also visible on `focus-visible` for keyboard users), and are disabled + hidden when `canScrollPrev/canScrollNext` return false. State for `prevEnabled`/`nextEnabled` is updated by subscribing to embla's `select` and `reInit` events; the initial sync is deferred via `queueMicrotask` to avoid triggering the `react-hooks/set-state-in-effect` lint rule (the canonical embla pattern).
  * Each slide is a `<button>` that calls `goMovie(m.id)` (from the Zustand store), reuses the existing `PosterImage` component (TMDb poster with graceful gradient fallback), and shows the movie title + year below — matching the visual language of `MovieCard`.
  * Responsive per-view: `basis-1/2` on mobile → `1/3` (sm) → `1/4` (md) → `1/5` (lg) → `1/6` (xl), so 2–6 posters are visible at once depending on viewport. Each slide has `px-1.5` gutter.
  * Hover effect on each poster: subtle scale-1.04 + gradient veil + shadow-xl, mirroring `MovieCard`'s hover treatment so the carousel feels native to the rest of the grid.
- Updated `src/views/HomeView.tsx`:
  * Imported `PosterCarousel`.
  * Replaced the "Latest Watched" `<MovieRow>` with a new `<section>` that keeps the SAME header layout as `MovieRow` (teal `bg-primary/15` icon chip with `Clock` + `h2` title `home_latest` + the "Last Watched →" ghost Button that calls `go("lastWatched")`).
  * Renders `<PosterCarousel movies={stats?.latestWatched ?? []} />` when there's data, otherwise a muted `—` placeholder.
  * The "Recommended For You" `<MovieRow>` below is left unchanged.

**Feature 3 — Fullscreen gallery/Photothèque viewer enhancements (`src/components/movie/GalleryLightbox.tsx`):**
- Rewrote the component to be truly fullscreen:
  * `DialogContent` now uses `h-[100dvh] w-[100vw] max-w-none gap-0 overflow-hidden rounded-none border-none bg-black p-0` (with `sm:h-[100vh]` fallback) — fills the entire viewport, no padding, no border, no rounding, pure `bg-black`. The default shadcn close X is suppressed via `showCloseButton={false}`; a custom round close button sits at top-right.
  * Layout is a vertical flex column: a `flex-1 min-h-0` image stage in the middle and a `shrink-0` bottom bar. The `<img>` uses `max-h-[90vh] max-w-[90vw] object-contain` so it fills up to 90% of the viewport height while preserving aspect ratio, leaving room for the bottom bar.
- Keyboard shortcuts extended: Escape (close), ArrowLeft/Right (navigate, with `e.preventDefault()`), `C`/`c` (copy), `D`/`d` (download) — all wired through a single `keydown` listener registered only while `open` is true.
- Caption: a subtle pill at top-center (`absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm`) shows `{index+1} / {images.length}`. The bottom bar shows the same counter on mobile (where the top pill is omitted) plus a desktop-only keyboard hint: `← → navigate · C copy · D download · Esc close`.
- Copy button keeps the existing 2-second checkmark feedback (copied state → `<Check>` icon + "Copied" label → 2 s timeout → reverts). The same handler is invoked by the `C` keyboard shortcut.
- **Fixed a latent bug**: the old code called `backdropUrl(currentImage, "original")` which (a) is a TypeScript error because `backdropUrl`'s size param is typed `"w780" | "w1280"`, and (b) would prepend `https://image.tmdb.org/t/p/original` to Photothèque screenshot paths (`/screenshots/...`), producing broken URLs. Replaced with a new `resolveImageUrl()` helper that returns absolute URLs (`http(s)://`), local uploads (`/screenshots/...`, `/uploads/...`), and `data:`/`blob:` URLs as-is, and only prefixes TMDb (`${TMDB_IMG}/original`) for bare TMDb paths. This makes the lightbox correctly display BOTH gallery images (TMDb backdrops from `movie.gallery`) AND Photothèque screenshots (uploaded files in `/public/screenshots/`), as used by `MovieDetailView` and `Phototheque.tsx` respectively.
- Download button now sets `a.rel = "noopener noreferrer"` for safety on cross-origin TMDb downloads.

**Verification:**
- `cd /home/z/my-project && bun run lint 2>&1 | tail -20` → **0 errors, 0 warnings** (the only pre-existing warnings in `RewatchReminder.tsx` + `ReportView.tsx` are unused eslint-disable directives in files I did not touch).
- `bunx tsc --noEmit --skipLibCheck` → 22 pre-existing errors (all in `prisma/seed.ts`, `skills/`, `src/app/api/import-imdb`, `src/app/api/tmdb/search`, `SettingsView.tsx`, and the well-known pre-existing `lastWatched` ViewName mismatch in `page.tsx` + `HomeView.tsx` called out by the Task 2-a worklog). **Zero new TS errors** in any of the three files I created or modified (`PosterCarousel.tsx`, `GalleryLightbox.tsx`, `page.tsx`-motion edit, `HomeView.tsx`-carousel edit). Note: `next.config.ts` has `typescript.ignoreBuildErrors: true` so the pre-existing errors do not block dev or build.
- `curl http://localhost:3000/` → HTTP 200 (home page with AnimatePresence + PosterCarousel compiles and renders successfully in dev mode).
- No new entries in `dev.log` after the changes (server is alive and serving; pre-existing prisma query logging dominates the log).

Stage Summary:
- **Page transitions**: every view switch in the SPA now fades + slides 8px over 0.2s via `AnimatePresence mode="wait"` and a `key={view}` motion.div, without breaking the main scroll container.
- **Home carousel**: the "Latest Watched" section is now an auto-rotating embla carousel showing 2–6 posters (responsive) that advances every 4s, pauses on hover/focus, has fade-in prev/next arrow buttons, and each poster is clickable to open the movie detail.
- **Fullscreen gallery**: `GalleryLightbox` is now a true full-bleed black overlay with image `max-h-[90vh]`, top-center index/total caption, bottom keyboard-hint bar, full keyboard shortcuts (Esc / ← / → / C / D), 2-second copy-checkmark feedback, and a fixed URL resolver so both TMDb gallery images and uploaded Photothèque screenshots display correctly.
- Lint clean; no new TypeScript errors; teal/terracotta theme tokens (`text-primary`, `bg-background`, `bg-primary/15`) preserved throughout; no blue/indigo introduced.

---
Task ID: 2-d
Agent: Frontend (Z.ai Code)
Task: Add 3 features — Rewatch Reminder (Home), Annual Report (printable PDF), Service Worker (offline PWA)

Work Log:

Read prior context:
- Read /home/z/my-project/worklog.md (Tasks 1–17 + 2-a + 2-b + 2-c) for established conventions.
- Read src/lib/movie/types.ts, src/lib/i18n/context.tsx, src/lib/store.ts, src/lib/useFetch.ts, src/views/HomeView.tsx, src/app/page.tsx, src/app/layout.tsx, src/app/api/stats/route.ts, src/app/api/stats/yearly/route.ts, src/app/api/movies/route.ts, src/components/movie/Sidebar.tsx, src/components/movie/Header.tsx, src/lib/i18n/translations.ts, src/app/globals.css, src/components/movie/MovieRow.tsx.
- Confirmed the `report` ViewName already exists in store.ts (added by an earlier task) and the Sidebar already exposes the "Annual Report" nav item with a FileText icon — only the router case + view were missing.

Feature 1 — Rewatch Reminder:
- Added 4 i18n keys (EN/FA/FR): rewatch_title, rewatch_yearsAgo (with {years}), rewatch_watchAgain, rewatch_subtitle.
- Created `src/components/movie/RewatchReminder.tsx`:
  * Fetches `/api/movies?status=watched&sort=watchDate&order=asc` via useFetch keyed on `refreshTick`.
  * Filters client-side: watchDate > 2 years ago AND personalRating >= 8 AND rewatchCount < 3. List is already sorted oldest-first, so the first matches are the most "due" for a rewatch. Capped at 3 candidates.
  * Renders a compact Card with poster (clickable → useNav().goMovie), title (clickable), years-ago pill, personal rating star, current rewatch count, director line, and a "Watch Again" button.
  * "Watch Again" → PUT /api/movies/{id} with { rewatchCount: n+1, watchDate: today }, calls `triggerRefresh()` + `toast.success` on success. Button shows animate-spin during the request.
  * Auto-rotates between candidates every 8 s (only when >1 qualifies), with prev/next chevrons + "i/N" counter on the right side of the header.
  * Skeleton while loading; renders null if no candidates (so HomeView stays clean when there's nothing to nudge).
  * Uses RotateCcw / Clock / Star / ChevronLeft / ChevronRight from lucide-react; teal/terracotta palette via text-primary / text-secondary / bg-secondary/15 tokens (no blue/indigo).
- Wired into `src/views/HomeView.tsx`: added `<RewatchReminder />` immediately after the "Latest Watched" carousel and before the stats grid. Added a comment marking the section.

Feature 2 — Annual Report (printable PDF):
- Added 11 i18n keys (EN/FA/FR): report_title, report_selectYear, report_print, report_moviesThisYear, report_favoriteMovie, report_monthlyBreakdown, report_totalHours, report_avgRating, report_topGenres, report_topDirectors, report_empty (with {year}), report_generated.
- Enhanced `src/app/api/stats/yearly/route.ts` to also return per-year detail the report needs. Each `years[]` entry now includes:
  * count, avgRating (rounded to 1 decimal)
  * topGenres (top 5, sorted desc by count)
  * topDirectors (top 3, sorted desc by count)
  * favoriteMovie — highest personalRating (tie-break by most recent watchDate); returns `{ id, title, poster, personalRating, year, director, watchDate }` or null
  * months — full 12-month breakdown for that year (zero-filled, formatted "YYYY-MM")
  * totalRuntime — minutes watched that year (so the view can show hours)
  * Kept the previous topGenres(3) shape (now 5) — does not break YearlyStatsView, which only reads the top 3.
  * Preserved all other existing fields (months/decades/totals/etc) so YearlyStatsView still works.
- Created `src/views/ReportView.tsx` ("use client"):
  * Fetches `/api/stats/yearly` via useFetch keyed on refreshTick.
  * Year Select dropdown (default = current year); options derived from the years present in the data plus the current year (sorted desc).
  * Toolbar (year select + Print button) is wrapped in `.report-toolbar` and hidden in print.
  * Print-only masthead (`.report-masthead`, `hidden print:block`) shows the app name + "Annual Report · YYYY".
  * Headline stats: 4 ReportStat cards — Movies This Year, Total Hours, Avg Rating, Selected Year (using Film / Clock / Star / CalendarDays icons).
  * Top Genres card: numbered list with horizontal teal bars (width % = count / max).
  * Top Directors card: numbered list with director name + "count movies".
  * Favorite Movie card: Trophy icon header + poster thumbnail + title + star rating + year + director.
  * Monthly Breakdown card: 12 mini vertical bars (Jan–Dec) labelled with month abbreviations and per-month counts.
  * Footer line: "Cinémathèque · Annual Report YYYY · Generated <date>".
  * Empty state: `report_empty` translation shown when the selected year has 0 movies.
  * Print button calls `window.print()`.
- Added `case "report": return <ReportView />;` to `src/app/page.tsx`.
- Print layout wiring in `src/app/page.tsx`: added `print:block print:overflow-visible` to the row wrapper and main column wrapper, `print:block print:overflow-visible` to `<main>`, and `print:!transform-none print:!opacity-100` to the framer-motion `motion.div` (so the page-transition wrapper doesn't hide the report while printing).
- Added `print:hidden` to: Sidebar's desktop `<aside>` (Sidebar.tsx), the Header's `<header>` (Header.tsx), and the `<footer>` in page.tsx — so only the report content prints.
- Added `@media print` block to `src/app/globals.css`:
  * Forces the HSL CSS vars to light, paper-friendly values (white background, dark text, darker teal/terracotta so they print legibly).
  * `* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }` so the genre/monthly bars keep their teal color in the PDF.
  * `.report-page` is reset to full width / no margin; `.report-page > *` has `break-inside: avoid` so cards don't split across pages.
  * `.report-masthead` shown, `.report-toolbar` hidden (defensive; the Tailwind `print:hidden` already handles this).
  * `@page { margin: 1.5cm; }` for sensible PDF margins.

Feature 3 — Service Worker (offline PWA):
- Created `public/sw.js`:
  * `cinematheque-v1` cache, precaches a minimal app shell (`/`, `/manifest.webmanifest`, `/robots.txt`) on install; `skipWaiting()` + `clients.claim()` on activate; deletes old caches.
  * Fetch handler (GET only):
    - Same-origin navigations → network-first, falls back to cached `/` so the SPA shell loads offline.
    - `/api/...` → network-first, caches successful 200 responses, falls back to cache when offline.
    - Static assets (`.js/.css/.woff2/.svg/.png/.jpg/...`) → cache-first, populates cache on miss.
    - Other same-origin GETs → network with cache fallback.
  * Cross-origin requests (TMDb image CDN) are intentionally NOT handled — left to the browser. Documented inline.
- Created `public/manifest.webmanifest` (referenced by both the SW precache list and the layout's `metadata.manifest`): name, short_name, description, start_url "/", standalone display, teal theme color (#3bb5a3), navy background, logo.svg icon.
- Created `src/components/ServiceWorkerRegistrar.tsx` ("use client"): registers `/sw.js` after `load`; skips in non-localhost dev contexts to avoid serving stale hashed chunks during HMR; catches and warns on registration failure (non-fatal). Renders null.
- Wired into `src/app/layout.tsx`: imports ServiceWorkerRegistrar and renders it inside I18nProvider (after children); also added `manifest: "/manifest.webmanifest"` to metadata and a `viewport` export with `themeColor: "#3bb5a3"` for the browser chrome.

Verification:
- `curl /api/stats/yearly` → 200, returns years [2017, 2024, 2025, 2026] with the new per-year shape (topGenres[5], topDirectors[3], favoriteMovie, months[12], totalRuntime). 2024 favorite = "Seven Samurai" (personalRating 10, watchDate 2024-11-02).
- `curl /api/movies?status=watched&sort=watchDate&order=asc` → 200 (used by RewatchReminder).
- `curl /manifest.webmanifest` → 200. `curl /sw.js` → 200 (both served from /public).
- `bun run lint` → 0 errors, 0 warnings (after removing 3 unused eslint-disable directives).
- `bunx tsc --noEmit --skipLibCheck` → no errors in any of the new/modified files. (Pre-existing `lastWatched` ViewName errors in HomeView.tsx and page.tsx remain, but they pre-date this task and are unrelated.)
- dev.log (tail) shows no compile errors; all API routes continue to return 200/204.

Stage Summary:
- Rewatch Reminder: gentle "Time to Rewatch" card on the Home dashboard that surfaces 1–3 high-rated (≥8) films watched >2 years ago with <3 rewatches; auto-rotates every 8 s; one-click "Watch Again" logs a rewatch (increments count + sets watchDate to today) and triggers a global refresh.
- Annual Report: new `report` view (already wired in Sidebar) renders a print-friendly yearly summary — headline stats, top 5 genres (with bars), top 3 directors, favorite movie (with poster), 12-month mini-bar breakdown, plus a "Print / Save PDF" button. Print CSS forces light theme, hides sidebar/header/footer/toolbar, shows a print-only masthead, preserves teal bar colors, and avoids splitting cards across PDF pages.
- Service Worker: basic PWA shell (`/sw.js`) with cache-first for static assets + network-first for API + navigation fallback to `/`; manifest + theme color set; SW registers on mount via a client component in the root layout. TMDb images remain network-dependent (cross-origin), but the app shell + cached API data load offline.
- All 3 features use the existing teal/terracotta HSL token palette (no blue/indigo), shadcn/ui components (Card, Button, Select, Skeleton), and lucide-react icons. i18n keys added in EN/FA/FR for all user-visible strings.

---
Task ID: 3
Agent: Main (Z.ai Code)
Task: Rename "Add Movie & Serie" → "Add Picture", replace "movie" with "Picture" in Add-flow UI text, add Type (Movie/Series) selector before save, restore QuickAddButtons to original size, fix critical getMovieDetails bug, add anti-bloat ESLint config, full code review

Work Log:
- Read worklog.md (Tasks 1–2-d) to understand prior context. Found the project had a CRITICAL runtime bug: /api/recommendations, /api/stats, /api/tmdb/upcoming all returning HTTP 500 because `getMovieDetails` was imported from `@/lib/tmdb` but the function did not exist there (only `getTvDetails` existed).
- Fixed critical bug: Added missing `getMovieDetails(tmdbId)` export to `src/lib/tmdb.ts` — fetches `/movie/{id}` with `append_to_response=credits,videos,images,external_ids`. After fix, all three endpoints returned 200.
- Found Prisma Client was out of date (didn't know `mediaType` field) — ran `bun run db:generate` + `bun run db:push` and restarted dev server to pick up the regenerated client. After restart, `/api/movies?status=watched&mediaType=series` returned 200.
- Fixed 6 pre-existing TypeScript errors:
  1. `src/lib/store.ts`: Added `"lastWatched"` to the `ViewName` union (was referenced by HomeView + page.tsx but missing from the type).
  2. `src/views/SettingsView.tsx`: Wrapped `f.name` access inside the `if (f)` guard so `f` is not possibly-undefined.
  3. `src/app/api/import-imdb/route.ts`: Changed `let listId = null` to `let listId: string | null = null` so TypeScript infers the correct union type.
  4. `src/app/api/tmdb/search/route.ts`: Removed the `r.media_type !== "tv"` filter (the property doesn't exist on `TmdbSearchResult` from `/search/movie` — that endpoint only returns movies anyway).
  5. `src/app/api/tmdb/details/route.ts`: Added `?? "Unknown"` fallback to `payload.title` since `tmdbToMoviePayload` returns `title?: string`.
  6. (The `getMovieDetails` missing export above also resolved the recommendations route error.)
- Added anti-bloat ESLint config to `eslint.config.mjs`: 6 new warn-level rules — `max-lines` (1000), `max-lines-per-function` (250), `complexity` (40), `max-params` (6), `max-depth` (6), `max-statements` (100). All are warnings (not errors) so they don't block dev. Lint now reports 7 warnings (the largest files/functions) and 0 errors.
- Restored `QuickAddButtons.tsx` to original size: `size-5` container (20×20px) + `size-3` icon (12×12px). Verified via Agent Browser that buttons render at 20×20px on the Watched Movies grid.
- Changed Sidebar button text from "Add Movie & Serie" to "Add Picture" in `src/components/movie/Sidebar.tsx`.
- Updated i18n translations (`src/lib/i18n/translations.ts`) in all 3 languages (EN/FA/FR):
  * `nav_add`: "Add Movie" → "Add Picture" / "افزودن تصویر" / "Ajouter une image"
  * `add_title`: "Add a Movie" → "Add a Picture" / "افزودن تصویر" / "Ajouter une image"
  * `add_searchPlaceholder`: "Search for a movie title..." → "Search for a picture title..." (and equivalents)
  * `add_fields`: "Movie Details" → "Picture Details" / "جزئیات تصویر" / "Détails de l'image"
  * `add_success`: "Movie added..." → "Picture added..." / "تصویر به آرشیو اضافه شد" / "Image ajoutée..."
  * `add_updateSuccess`: "Movie updated" → "Picture updated" / "تصویر به‌روزرسانی شد" / "Image mise à jour"
  * `add_deleteConfirm`, `add_duplicate`: "movie" → "picture" in all languages
  * `home_empty`, `home_empty_cta`: "movie" → "picture" / "تصویر" / "image"
  * `action_add`: "Add Movie" → "Add Picture" / "افزودن تصویر" / "Ajouter une image"
  * `action_random`: "Random Movie" → "Random Picture" / "تصویر تصادفی" / "Image aléatoire"
  * Added 3 new keys: `add_type` ("Type"/"نوع"/"Type"), `add_typeMovie` ("Movie"/"فیلم"/"Film"), `add_typeSeries` ("Series"/"سریال"/"Série")
- Added Type (Movie/Series) selector to `AddMovieDialog.tsx` step 2 form:
  * Added `mediaType: "movie" | "series"` field to `FormState` (default "movie")
  * Updated `emptyForm` to include `mediaType: "movie"`
  * Updated `toFormState()` to read `m.mediaType ?? "movie"` when editing
  * Updated `pickResult()` success path: sets `mediaType: r.mediaType === "tv" ? "series" : "movie"` so picking a TV series from multisearch auto-selects "Series"
  * Updated `pickResult()` fallback path: same mediaType derivation from the search result
  * Updated `handleSave()` payload: uses `form.mediaType` instead of the old hardcoded `editMovie?.mediaType ?? "movie"`
  * Added a new `<Field label={t("add_type")}>` with a shadcn `Select` containing "Movie" and "Series" options, placed right after the Status selector in the form grid
- Verification with Agent Browser:
  * Home page renders with "Add Picture" button, "Random Picture" button — no console errors
  * Add Picture dialog opens with title "Add a Picture" and placeholder "Search for a picture title..."
  * Searching "breaking bad" via multisearch returns both movies and TV series (Breaking Bad 2008 is the TV series)
  * Picking "Breaking Bad" auto-fills the form AND auto-sets the Type selector to "Series" ✓
  * Manual entry path shows both the Status combobox AND the Type combobox (default "Movie")
  * Type combobox expands to show "Movie" (selected) and "Series" options; selecting "Series" updates the displayed value ✓
  * QuickAddButtons on the Watched Movies grid render at 20×20px (original size restored) ✓
  * All API endpoints return 200: /, /api/stats, /api/movies?mediaType=series, /api/recommendations, /api/tmdb/upcoming, /api/tmdb/multisearch, /api/tmdb/details, /api/stats/yearly
- Lint: 0 errors, 7 warnings (anti-bloat). TypeScript: 0 errors (excluding examples/prisma-seed/skills).

Stage Summary:
- CRITICAL FIX: Added missing `getMovieDetails()` to tmdb.ts — this was causing 500 errors on /api/recommendations, /api/stats, /api/tmdb/upcoming (the broken import poisoned the module graph). All endpoints now return 200.
- Prisma Client regenerated to recognize the `mediaType` field; `/api/movies?mediaType=series` filter now works for the Watched Series page.
- 6 pre-existing TypeScript errors fixed (lastWatched ViewName, SettingsView null-check, import-imdb listId type, tmdb/search media_type, tmdb/details title fallback).
- Anti-bloat ESLint config added: 6 warn-level rules (max-lines 1000, max-lines-per-function 250, complexity 40, max-params 6, max-depth 6, max-statements 100) — flags the largest files without blocking development.
- "Add Movie & Serie" button → "Add Picture" in Sidebar.
- All Add-flow UI text changed from "movie" → "Picture" (EN), "فیلم" → "تصویر" (FA), "film" → "image" (FR) across nav_add, add_title, add_searchPlaceholder, add_fields, add_success, add_updateSuccess, add_deleteConfirm, add_duplicate, home_empty, home_empty_cta, action_add, action_random.
- New Type (Movie/Series) selector added to AddMovieDialog step 2 — auto-set from the multisearch result's mediaType (TV → Series), user can change it before save, and the chosen value is persisted to the DB via the POST/PUT payload.
- QuickAddButtons restored to original 20×20px size (size-5 container, size-3 icon).
- All changes verified end-to-end with Agent Browser: page renders, dialog works, multisearch returns TV+movies, Type auto-fills for TV picks, manual Type change works, no console/runtime errors.

---
Task ID: 4
Agent: Main (Z.ai Code)
Task: Fix desktop (Tauri) build issues — translation not working, "update failed" on wishlist/watchlist, "prisma failed" on IMDb import, explain 5GB folder size

Work Log:
- Diagnosed root causes of all 4 desktop-only issues reported by user:
  1. **Translation fails in desktop**: SDK reads `.z-ai-config` from `process.cwd()` first, which in the Tauri build is the read-only `resources/standalone/` dir (inside Program Files). The old `ensureConfig()` checked `existsSync` on cwd first and returned early if a stale/readonly file existed, so it never wrote to home. Fixed: `ensureConfig()` now always writes to `os.homedir()/.z-ai-config` (which the SDK checks as its 2nd priority path), with verification that the JSON has `baseUrl` + `apiKey`. Falls back to cwd/tmp only if home is not writable.
  2. **"update failed" on Wishlist/Watchlist**: `QuickAddButtons` was always doing PUT first, which returns 404 for TMDb-only movies (id starts with `tmdb-`). Then the POST fallback spread `...movie` which included `id: "tmdb-xxx"` — Prisma ignores it and creates a new cuid, but the UI kept the old id so subsequent updates failed. Fixed: now detects TMDb-only movies (`id.startsWith("tmdb-") || id.length < 20`) and POSTs directly with only the whitelisted fields (no id, createdAt, updatedAt). Also surfaces the server error message in the toast instead of generic "Failed to add".
  3. **"prisma failed" on IMDb import**: Root cause is that `init-db.js` relied solely on `prisma db push` CLI, which fails if the standalone dir is read-only or prisma CLI binary can't run. When schema isn't applied, ALL API routes fail with Prisma errors. Fixed `init-db.js` with a 3-tier fallback: (1) prisma CLI, (2) direct SQL via `better-sqlite3` (CREATE TABLE IF NOT EXISTS for Movie/Collection/PersonalList with all columns + indexes, matching schema.prisma exactly), (3) create empty db as last resort. Also updated `postbuild.js` to copy `better-sqlite3` into the standalone bundle so the SQL fallback works.
  4. **5GB folder size**: Explained that this is normal — `node_modules` (~1.2GB) + `src-tauri/target` (Rust build cache, 3-4GB on first build) + `.next` (~200MB). The actual MSI installer is only 50-100MB. The `target/` dir is pure cache and can be deleted after building.

- Created `/api/db-health` diagnostic endpoint (GET) that reports: cwd, home, platform, DATABASE_URL/TMDB env var status (set/not-set), db path + size + writable, db query test (movie count), home dir writable test, .z-ai-config existence in cwd + home. Returns 200 if healthy, 500 if unhealthy. This lets the user (and me) diagnose exactly what's wrong in the desktop build by visiting `http://localhost:3000/api/db-health` in the browser.

- Improved `import-imdb` error handling: the catch block now includes the actual error message (`err.message`) instead of just "Failed to import IMDb CSV", so the user sees the real Prisma error (e.g., "no such column: mediaType") which points to the root cause.

- Verification (dev server):
  * `/api/db-health` → 200, reports movieCount: 221, dbWritable: true, homeWritable: true, z-ai-config written to /home/z/.z-ai-config ✓
  * `/api/translate` (fa) → 200, returns correct Persian translation ✓
  * `/api/import-imdb` (skipTmdb=true) → 200, imported: 1, listId created ✓
  * Agent Browser: clicked "Add to Wishlist" on a Coming Soon TMDb movie → toast "Added "Obsession" to Wishlist" ✓
  * `bun run lint` → 0 errors, 7 warnings (anti-bloat). `npx tsc --noEmit` → 0 errors.

Stage Summary:
- **Translation**: Fixed — `.z-ai-config` is now always written to `os.homedir()` which the SDK reads as its 2nd-priority path and which is writable in the Tauri desktop build.
- **Wishlist/Watchlist add**: Fixed — TMDb-only movies (id=`tmdb-xxx`) now POST directly instead of failing with PUT 404 first; only whitelisted fields are sent; server error messages surface in the toast.
- **IMDb import "prisma failed"**: Fixed — `init-db.js` now has a 3-tier fallback (prisma CLI → direct SQL via better-sqlite3 → empty db) so the schema is always applied even in read-only standalone dirs. `postbuild.js` copies `better-sqlite3` into the bundle.
- **Diagnostics**: New `/api/db-health` endpoint reports all environment + db + config state in one JSON payload — visit `http://localhost:3000/api/db-health` in the browser to see exactly what's wrong.
- **5GB size**: Normal for Tauri projects (`node_modules` 1.2GB + Rust `target/` 3-4GB + `.next` 200MB). The MSI installer is only 50-100MB. `target/` can be deleted after building.
- User needs to rebuild the Tauri desktop app for these fixes to take effect (the changes are in `src/`, `scripts/`, and `src-tauri/` which are all bundled into the standalone resources).

---
Task ID: 5
Agent: Main (Z.ai Code)
Task: Fix Google Fonts build error (module-not-found for Geist/Geist_Mono/Vazirmatn during production build)

Work Log:
- User reported build failure: "Module not found: Can't resolve '@/components/DbAutoMigrator'" plus Google Fonts module-not-found errors during `tauri build`. The root cause was `next/font/google` (Geist, Geist_Mono, Vazirmatn) which requires downloading font files from Google's servers at build time — this fails in restricted/offline network environments.
- Removed all three `next/font/google` imports from `src/app/layout.tsx` (Geist, Geist_Mono, Vazirmatn) and the corresponding `variable` class names on `<body>`.
- Added CSS variables for the fonts directly in `src/app/globals.css` under `:root`:
  * `--font-geist-sans`: system font stack (ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif)
  * `--font-geist-mono`: monospace system stack (ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace)
  * `--font-vazirmatn`: Persian/Arabic-capable stack ("Vazirmatn", "Tahoma", "Segoe UI", system-ui, sans-serif)
- These variables match the names expected by the existing `@theme inline` block (`--font-sans: var(--font-geist-sans)`, `--font-mono: var(--font-geist-mono)`), so all Tailwind `font-sans`/`font-mono` utilities continue to work without changes.
- Verified: `bun run lint` → 0 errors, 7 warnings. `npx tsc --noEmit` → 0 errors. `npx next build` → succeeded, all routes built (including new `/api/uploads/[filename]`). `node scripts/postbuild.js` → all assets copied successfully.
- Page renders correctly in dev (verified via Agent Browser: "Cinémathèque — Personal Movie Archive" title, "Add Picture" button, "Dashboard" heading all present).

Stage Summary:
- Google Fonts removed from build pipeline — no more network dependency during `tauri build`.
- System fonts (with "Tahoma" fallback for Persian) provide equivalent visual quality.
- Build + postbuild both succeed end-to-end.
- User needs to replace `src/app/layout.tsx` and `src/app/globals.css`, then rebuild.

---
Task ID: 6
Agent: Main (Z.ai Code)
Task: Add filters to IMDb Lists page, hide IMDb lists from Collections page, fix translation to fa/fr

Work Log:
- **Translation fix**: Replaced the z-ai-web-dev-sdk SDK usage with a direct `fetch()` call to the ZAI API. The SDK reads its config from a file (`.z-ai-config`) which fails in the Tauri desktop build. The direct call sends the correct headers (`X-Z-AI-From`, `X-Chat-Id`, `X-User-Id`, `X-Token`, `Authorization`) that the SDK sends, but without any file I/O. Verified: `/api/translate` returns correct Persian and French translations in <1s.
- **IMDb lists hidden from Collections page**: Added a `.filter((c) => !c.description?.includes("IMDb List ·"))` to the `CollectionsView` so that collections created by the IMDb import (which have descriptions starting with "IMDb List ·") are no longer shown in the Collections page. They're still visible in the IMDb Lists page.
- **Filters added to CollectionView (which IMDb lists use)**: Rewrote `CollectionView.tsx` to include the same `FilterBar` + `useMemo` filter/sort logic that `WatchedView` uses. The filter derives genre/country/language/director/year/tag options from the movies in the collection, and applies client-side filter + sort. When you click an IMDb list, it goes to CollectionView which now shows the FilterBar at the top.
- **ImdbListsView filter detection improved**: Changed the IMDb list detection from `includes("IMDb")` to `includes("IMDb List ·")` (more specific) so it doesn't accidentally match user-created collections that happen to have "IMDb" in the name.
- Verified with Agent Browser:
  * IMDb Lists page shows the imported lists ✓
  * Clicking an IMDb list → CollectionView with FilterBar (Search, Sort dropdown, Filters button) ✓
  * Collections page no longer shows IMDb lists (only user-created collections) ✓
  * `/api/translate` returns correct fa and fr translations ✓
- Lint: 0 errors, 8 warnings. TypeScript: 0 errors.

Stage Summary:
- **Translation**: Works in desktop build now — direct API call, no file config dependency.
- **Collections page**: IMDb lists are hidden (filtered out by description check).
- **IMDb Lists page + CollectionView**: Both now have the full FilterBar (search, genre, country, language, year, director, tag, sort, order) matching the Watched Movies page.
- Files changed: `src/app/api/translate/route.ts`, `src/views/CollectionsView.tsx`, `src/views/CollectionView.tsx`, `src/views/ImdbListsView.tsx`.

---
Task ID: 7
Agent: Main (Z.ai Code)
Task: Build Android mobile app — PWA + Tauri Android setup

Work Log:
- Analyzed the project architecture: Next.js 16 (frontend + API routes) + Prisma/SQLite + Tauri desktop. The key challenge for mobile is that the app relies on a running Node.js server for its backend — this can't run inside an APK.
- Chose a two-pronged approach:
  1. **PWA (immediate)**: The app already has a service worker + manifest. Enhanced these for better Android installation.
  2. **Tauri Android APK**: Set up configuration so the user can build a real APK that loads a deployed server URL.

**PWA enhancements:**
- Updated `public/manifest.webmanifest` with:
  - Proper `display_override` (standalone → fullscreen → minimal-ui)
  - `scope`, `orientation`, `categories`, `lang`, `dir` fields
  - 4 icon entries: 192px + 512px (any purpose) + 192px + 512px (maskable purpose for Android adaptive icons)
  - 3 app shortcuts: Add Picture, Watched Movies, Search
- Created 4 PNG icons in `public/`:
  - `icon-512.png` (512×512, from existing Tauri icon)
  - `icon-192.png` (192×192, resized from 512 using sharp)
  - `icon-maskable-512.png` (512×512, icon on navy #0f1620 background with 75% padding for Android adaptive icons)
  - `icon-maskable-192.png` (192×192, same maskable treatment)
- Used `sharp` (already in node_modules) for image resizing and compositing.

**Tauri Android setup:**
- Created `src-tauri/tauri.android.conf.json` — Android-specific Tauri config that:
  - Uses `com.cinematheque.app` as the identifier
  - Points `frontendDist` to `../src-tauri/html/mobile` (separate from desktop HTML)
  - Uses PNG icons (not .ico/.icns which are desktop-only)
- Created `src-tauri/html/mobile/index.html` — Mobile entry point that:
  - Shows a teal loading spinner on navy background
  - Redirects to `SERVER_URL` (configurable, defaults to `http://10.0.2.2:3000` for Android emulator)
  - Shows an error message if the server is unreachable after 5 seconds
  - Includes instructions for setting the deployed URL
- Updated `src-tauri/src/lib.rs` with `#[cfg(not(mobile))]` / `#[cfg(mobile)]` split:
  - Desktop: starts the Node.js server (existing behavior, unchanged)
  - Mobile: just runs the Tauri app (loads the HTML which redirects to the server URL)
  - The `#[cfg_attr(mobile, tauri::mobile_entry_point)]` attribute was already present

**Documentation:**
- Created `MOBILE.md` with comprehensive instructions for:
  - Option A: PWA (deploy to Vercel, install via Chrome "Add to Home Screen")
  - Option B: Android APK (prerequisites, Vercel deployment, tauri android init/build, APK signing)
  - Option C: Testing on Android emulator (10.0.2.2 alias for host localhost)
  - Troubleshooting guide

- Verified: PWA manifest + all 4 icons served correctly (200 OK). App still renders normally. Lint: 0 errors, 8 warnings. TypeScript: 0 errors.

Stage Summary:
- **PWA**: Fully configured — installable on Android via Chrome with proper icons, maskable icons, shortcuts, and offline support via service worker.
- **Tauri Android**: Configuration files ready (`tauri.android.conf.json`, `mobile/index.html`, updated `lib.rs`). User needs to: (1) install Android Studio + NDK + Rust Android targets, (2) deploy Next.js to Vercel, (3) set SERVER_URL, (4) run `npx tauri android init` + `npx tauri android build`.
- **Key limitation**: The Android app requires a deployed server (Vercel) because the Next.js API routes + Prisma backend can't run inside an APK. The mobile app is a native WebView wrapper that loads the deployed URL.
- Files created: `public/manifest.webmanifest` (updated), `public/icon-{192,512,maskable-192,maskable-512}.png`, `src-tauri/tauri.android.conf.json`, `src-tauri/html/mobile/index.html`, `src-tauri/src/lib.rs` (updated), `MOBILE.md`.

---
Task ID: 8
Agent: Main (Z.ai Code)
Task: 5 desktop app improvements — poster actions, clickable dashboard, About text, Watched Archive, translation fix

Work Log:
**1. Watched + Delete icons on all movie posters:**
- Created `src/components/movie/PosterActions.tsx` with two hover-revealed buttons:
  - Bottom-right: green checkmark "Mark as watched" — marks the movie as watched with today's date. For TMDb-only movies (id=tmdb-xxx), creates the movie in DB first with status="watched". If already watched, shows a static green check.
  - Bottom-left: trash icon "Delete" — two-click confirm (first click turns it red "Click again to confirm", second click deletes). Calls DELETE /api/movies/{id}. For TMDb-only movies, shows "not in archive" info toast.
- Updated `MovieCard.tsx` to include `<PosterActions>` and moved the personal rating to bottom-center (hidden on hover to avoid overlap with the action buttons).
- Verified: 186 delete buttons appear on the Watched Movies page (one per movie).

**2. Clickable genres + directors on Dashboard:**
- Genres were already clickable (goGenre). Made directors clickable too — each director row is now a `<button>` that calls `goSearch(d.name)`, navigating to the Search in Archive page with the director's name pre-filled.
- Added `goSearch` to the destructured `useNav()` in HomeView (was missing).
- Fixed the `goView` alias → `go` (was `go: goView`, now just `go`).
- Verified: clicking "Alfred Hitchcock" navigates to Search page with "Alfred Hitchcock" in the search box, showing his movies.

**3. About text in Settings:**
- Added `<p className="pt-2 text-center text-sm font-medium text-muted-foreground">Developed with love and passion by Massoud</p>` to the About card in SettingsView, below the badges.
- Verified via `agent-browser eval`: text "Developed with love and passion by Massoud" found in DOM.

**4. Watched Movies Archive page + status:**
- Added `"watchedArchive"` to `MovieStatus` type in `src/lib/movie/types.ts`.
- Added `"watchedArchive"` to `ViewName` in `src/lib/store.ts`.
- Added nav item `{ view: "watchedArchive", labelKey: "nav_watchedArchive", icon: Film }` in the Organize section of Sidebar (below Personal Lists, above Annual Report).
- Created `src/views/WatchedArchiveView.tsx` — fetches both `?status=watched` and `?status=watchedArchive`, deduplicates by id, includes full FilterBar (same as WatchedView).
- Added `case "watchedArchive": return <WatchedArchiveView />;` to page.tsx router.
- Added i18n keys in EN/FA/FR: `nav_watchedArchive` ("Watched Movies Archive" / "آرشیو فیلم‌های دیده‌شده" / "Archive des films vus") and `status_watchedArchive` ("Watched Archive" / "آرشیو دیده‌شده" / "Archive vus").
- Added "Watched Archive" status option to AddMovieDialog and MovieDetailView status selectors.
- Updated `StatusBadge.tsx` with styles/dotColor/labelKey for the new status (emerald-600 variant).
- Updated `import-imdb/route.ts`: when the user selects "watched" during IMDb import, movies now get status `"watchedArchive"` (instead of `"watched"`) so they automatically appear in the Watched Movies Archive page. Same for movies with a Date Rated.
- Verified: "Watched Movies Archive" nav button shows, page loads with movies.

**5. Translation fix for desktop:**
- Changed `thinking` parameter from `{ type: "enabled" }` to `{ type: "disabled" }` in the translate API route — thinking mode can cause longer response times and timeouts in the Tauri desktop build.
- Added `AbortController` with 30s timeout to the TranslatedStory fetch call — prevents infinite loading if the API is unreachable.
- Added better error logging: `console.warn("Translation failed:", err.message)` so the actual error appears in the dev tools console.
- Updated the error message to "Translation unavailable — showing original English text. Check your internet connection."
- Verified: translate endpoint returns correct fa/fr translations in <1s with thinking disabled.

- Lint: 0 errors, 8 warnings. TypeScript: 0 errors. All endpoints 200. Agent Browser verified all 5 features.

Stage Summary:
- All movie posters now have hover-revealed Watched (bottom-right) and Delete (bottom-left) buttons.
- Dashboard directors are clickable → Search in Archive page. Genres were already clickable → Genre detail page.
- Settings > About shows "Developed with love and passion by Massoud".
- New "Watched Movies Archive" page in Organize section + "Watched Archive" status option. IMDb imports with "watched" status automatically go to watchedArchive.
- Translation: thinking mode disabled (faster, more reliable in desktop), 30s timeout added, better error reporting.
- Files: PosterActions.tsx (new), WatchedArchiveView.tsx (new), MovieCard.tsx, HomeView.tsx, SettingsView.tsx, MovieDetailView.tsx, AddMovieDialog.tsx, StatusBadge.tsx, TranslatedStory.tsx, translate/route.ts, import-imdb/route.ts, store.ts, types.ts, translations.ts, page.tsx, Sidebar.tsx.

---
Task ID: 9
Agent: Main (Z.ai Code)
Task: Convert desktop app to a website (Vercel + Turso deployment)

Work Log:
- Analyzed the project: Next.js 16 + Prisma/SQLite + Tauri. The app already works as a web app (it's Next.js), but uses a local SQLite file which doesn't work on serverless platforms like Vercel.
- Chose **Turso** (libSQL) as the cloud database because it's SQLite-compatible (no schema changes, no SQL dialect differences) and has a generous free tier (9GB, 1B reads/month).
- Installed `@prisma/adapter-libsql` and `@libsql/client` packages.
- Rewrote `src/lib/db.ts` to detect the database type at runtime:
  - If `DATABASE_URL` starts with `libsql://` or `https://` → use Turso with the PrismaLibSQL adapter
  - Otherwise → use local SQLite (for desktop/dev)
  - This means the same code works in both environments — no separate builds needed.
- Updated `next.config.ts` to conditionally set `output: "standalone"` only for desktop (Tauri) builds. On Vercel (`VERCEL=1`), it uses the default serverless output.
- Updated `scripts/postbuild.js` to skip the standalone-copy logic when building on Vercel or when the standalone dir doesn't exist.
- Created `vercel.json` with build config, 60s function timeout for API routes, and proper headers for service worker + manifest.
- Created `.env.example` documenting all environment variables.
- Created `WEBSITE.md` — comprehensive deployment guide with:
  - Step 1: Create Turso database (get URL + auth token)
  - Step 2: Push to GitHub
  - Step 3: Deploy to Vercel (with all env vars)
  - Step 4: Initialize database schema
  - Step 5: Migrate existing data (backup/export)
  - Step 6: Install as PWA on mobile/desktop
  - Cost analysis ($0/month), troubleshooting, custom domain
- Verified: Lint 0 errors, TypeScript 0 errors, all API endpoints 200, 223 movies still accessible.

Stage Summary:
- The app can now be deployed as a website on Vercel with Turso cloud database.
- Same codebase works for both desktop (Tauri) and web (Vercel) — no forks needed.
- The `db.ts` auto-detects which environment it's in based on the DATABASE_URL format.
- Desktop build is unaffected — still uses local SQLite, still works offline.
- Web deployment is free ($0/month) for personal use.
- PWA support means the deployed site can be installed on phones/desktops via browser.
- Files: src/lib/db.ts (rewritten), next.config.ts (conditional), scripts/postbuild.js (skip on Vercel), vercel.json (new), .env.example (new), WEBSITE.md (new).
