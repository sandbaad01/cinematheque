# Task 2 — Backend API Routes

**Agent:** Z.ai Code (Backend)
**Task:** Implement all REST API routes for the Personal Movie Archive.

## Routes created (all under `src/app/api/`)

| Route | Methods | Notes |
|-------|---------|-------|
| `movies/route.ts` | GET, POST | List with filters (status/genre/country/language/year/director/tag/favorite/search) + sort (watchDate/releaseYear/title/rating/rank/added) + order; create with array JSON.stringify. |
| `movies/[id]/route.ts` | GET, PUT, DELETE | Fetch/update/delete; DELETE also strips id from `Collection.movieIds` and `PersonalList.items`. |
| `genres/route.ts` | GET | Aggregates all genres with counts, sorted desc. |
| `stats/route.ts` | GET | Dashboard stats: totals, this year/month, favorites, top genres/directors, latest watched, recently added, avg rating, total runtime. |
| `recommendations/route.ts` | GET | Scoring algorithm (director +3, actors +2 each max +6, genres +1.5 each max +4.5, country +1, similar rating +1, tag +0.5). Supports `movieId`, `genre`, global; `hideWatched` query; watched candidates get ×0.1 penalty; builds concise reason strings. |
| `search/route.ts` | GET `?q=` | Local archive search across title/originalTitle/director/cast/genres/country/language/year. |
| `search-web/route.ts` | GET `?q=` | Uses `z-ai-web-dev-sdk` `web_search` to fetch movie hints; best-effort extraction of title/year/overview/director from snippets; try/catch returns `{results:[]}` on error. |
| `collections/route.ts` | GET, POST | List & create. |
| `collections/[id]/route.ts` | GET, PUT, DELETE | CRUD on a collection. |
| `lists/route.ts` | GET, POST | List & create personal lists. |
| `lists/[id]/route.ts` | GET, PUT, DELETE | CRUD on a list (items stored as JSON of `ListItem[]`). |
| `random/route.ts` | GET | Returns a random `status==="want"` movie or 404. |
| `backup/route.ts` | GET, POST | Export (parsed JSON; `?download=1` sets `Content-Disposition: attachment; filename="cinetheque-backup.json"`); import via transaction (delete all → recreate with original ids/timestamps). |
| `import-imdb/route.ts` | POST | Inline CSV parser (handles quoted fields, escaped quotes, embedded newlines); extracts Title/Year/Genres/Directors/Const/Date Rated/IMDb Rating/Runtime; dedupes by imdbId using `findFirst` (imdbId is not `@unique` in schema). |

## Conventions applied

- Every file starts with `export const dynamic = "force-dynamic";`
- Every file imports `NextRequest`/`NextResponse` from `next/server` and `db` from `@/lib/db`
- All movie/collection/list DB rows are passed through `parseMovie`/`parseCollection`/`parseList` before being returned
- Arrays are written with `JSON.stringify(...)` and read back via the parsers
- All handlers wrapped in try/catch with appropriate status codes (400/404/500)
- No files outside `src/app/api/` were modified

## Issues encountered & fixes

1. **`createdAt.localeCompare` crash in stats route** — Prisma returns `createdAt`/`updatedAt` as `Date` objects, but `parseMovie` types them as `string`. Fixed in `stats/route.ts` by using a `toTime()` helper that handles `Date | string | number` for the `recentlyAdded` sort.
2. **`findUnique({ where: { imdbId } })` rejected in import-imdb** — `imdbId` is not marked `@unique` in the Prisma schema (and we cannot modify schema per task constraints). Switched to `findFirst({ where: { imdbId } })` for duplicate detection.
3. **Unused eslint-disable directives** — Initially added `@typescript-eslint/no-explicit-any` disables, but the rule isn't enabled in this project so they produced warnings. Stripped them all (lint is now 100% clean for API files).

## Verification

- `bun run lint` → 0 errors, 0 warnings on API files (the single remaining `PosterImage.tsx` error in an earlier run was fixed by another agent concurrently).
- `dev.log` shows clean 200/204 responses for every endpoint I exercised:
  - `GET /api/stats` → 200 (returns full dashboard payload)
  - `GET /api/movies?status=watched&sort=rating&order=desc` → 200
  - `GET /api/genres` → 200
  - `GET /api/random` → 200 (returns a `want` movie)
  - `GET /api/recommendations` and `?movieId=...` → 200 (returns scored items with reasons)
  - `GET /api/search?q=hitchcock` → 200
  - `GET /api/search-web?q=Inception` → 200 (returns SDK-powered hints)
  - `GET /api/backup` and `?download=1` → 200 with `Content-Disposition: attachment`
  - `GET /api/collections` and `/api/lists` → 200
  - `POST /api/movies` → 201; `DELETE /api/movies/[id]` → 204 (and confirmed the cascading SELECT/UPDATE on Collection + PersonalList)
  - `POST /api/import-imdb` → 200 `{imported:1, skipped:1}` then re-run `{imported:0,skipped:1}` confirming dedupe

All 14 route files are ready for the frontend agents to consume.
