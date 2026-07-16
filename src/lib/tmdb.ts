// TMDb API v3 helpers — server-side only.
// Docs: https://developer.themoviedb.org/reference

const TMDB_BASE = "https://api.themoviedb.org/3";
export const TMDB_IMG = "https://image.tmdb.org/t/p";

// Hardcoded fallback credentials (used when env vars are not available,
// e.g., in the Tauri desktop app where .env is not auto-loaded)
const TMDB_API_KEY_FALLBACK = "39adf355a4930c90981a9d8abc608dec";
const TMDB_TOKEN_FALLBACK = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzOWFkZjM1NWE0OTMwYzkwOTgxYTlkOGFiYzYwOGRlYyIsIm5iZiI6MTc4Mzc3ODYzMy4zMDgsInN1YiI6IjZhNTI0ZDQ5YjQzM2ZkZGZhMWFiMDhmYSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.jIx1c4qk-q8lsnc6yCWFW4X0e4N8LYfMIwgI2YKbmTA";

function getToken(): string {
  return process.env.TMDB_READ_ACCESS_TOKEN || TMDB_TOKEN_FALLBACK;
}

function getApiKey(): string {
  return process.env.TMDB_API_KEY || TMDB_API_KEY_FALLBACK;
}

function authHeaders(): HeadersInit {
  const token = getToken();
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
  }
  return { Accept: "application/json" };
}

function withApiKey(url: string): string {
  if (getToken()) return url;
  const key = getApiKey();
  if (!key) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}api_key=${key}`;
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = withApiKey(
    `${TMDB_BASE}${path}?${new URLSearchParams({ language: "en-US", ...params }).toString()}`
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { headers: authHeaders(), signal: controller.signal });
    if (!res.ok) {
      throw new Error(`TMDb ${res.status}`);
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------- Types ----------

export interface TmdbSearchResult {
  id: number;
  title: string;
  original_title?: string;
  release_date?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  genre_ids?: number[];
}

export interface TmdbSearchResponse {
  page: number;
  results: TmdbSearchResult[];
  total_pages: number;
  total_results: number;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character?: string;
  order: number;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
}

export interface TmdbVideo {
  id: string;
  key: string;
  site: string;
  type: string;
  name: string;
  official: boolean;
}

export interface TmdbImage {
  file_path: string;
  vote_average: number;
}

export interface TmdbMovieDetails {
  id: number;
  imdb_id?: string;
  title: string;
  original_title?: string;
  tagline?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  runtime?: number;
  genres?: TmdbGenre[];
  production_countries?: { iso_3166_1: string; name: string }[];
  spoken_languages?: { english_name: string; name: string }[];
  vote_average?: number;
  vote_count?: number;
  credits?: { cast: TmdbCastMember[]; crew: TmdbCrewMember[] };
  videos?: { results: TmdbVideo[] };
  images?: { backdrops: TmdbImage[]; posters: TmdbImage[] };
}

// ---------- Public API ----------

/** Search TMDb for movies by title (with optional year filter). */
export async function searchMovies(query: string, page = 1, year?: number): Promise<TmdbSearchResponse> {
  return tmdbFetch<TmdbSearchResponse>("/search/movie", {
    query,
    page: String(page),
    include_adult: "false",
    ...(year ? { year: String(year) } : {}),
  });
}

/** Get full movie details (with credits, videos, images appended). */
export async function getMovieDetails(tmdbId: number): Promise<TmdbMovieDetails> {
  return tmdbFetch<TmdbMovieDetails>(`/movie/${tmdbId}`, {
    append_to_response: "credits,videos,images,external_ids",
    include_image_language: "en,null",
  });
}

/** Find a TMDb movie by its IMDb ID (most reliable lookup). */
export async function findByImdbId(imdbId: string): Promise<number | null> {
  try {
    const data = await tmdbFetch<{ movie_results: { id: number }[] }>(`/find/${imdbId}`, {
      external_source: "imdb_id",
    });
    return data.movie_results?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

export interface TmdbRecommendationItem {
  id: number;
  title: string;
  original_title?: string;
  release_date?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  genre_ids?: number[];
  popularity?: number;
}

export interface TmdbRecommendationResponse {
  page: number;
  results: TmdbRecommendationItem[];
  total_pages: number;
  total_results: number;
}

/** TMDb's curated recommendations for a movie (collaborative filtering). */
export async function getRecommendations(tmdbId: number): Promise<TmdbRecommendationItem[]> {
  const data = await tmdbFetch<TmdbRecommendationResponse>(`/movie/${tmdbId}/recommendations`, {
    page: "1",
  });
  return data.results ?? [];
}

/** TMDb's "similar movies" (algorithmic similarity). */
export async function getSimilarMovies(tmdbId: number): Promise<TmdbRecommendationItem[]> {
  const data = await tmdbFetch<TmdbRecommendationResponse>(`/movie/${tmdbId}/similar`, {
    page: "1",
  });
  return data.results ?? [];
}

export interface TmdbKeyword {
  id: number;
  name: string;
}

/** TMDb keywords for a movie (thematic tags like "obsession", "neo-noir"). */
export async function getMovieKeywords(tmdbId: number): Promise<TmdbKeyword[]> {
  const data = await tmdbFetch<{ id: number; keywords: TmdbKeyword[] }>(`/movie/${tmdbId}/keywords`);
  return data.keywords ?? [];
}

// ---------- Image URL helpers ----------

export function posterUrl(path: string | null | undefined, size: "w200" | "w342" | "w500" = "w342"): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${TMDB_IMG}/${size}${path}`;
}

export function backdropUrl(path: string | null | undefined, size: "w780" | "w1280" | "original" = "w780"): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${TMDB_IMG}/${size}${path}`;
}

/** Pick the best YouTube trailer from a videos list. */
export function pickTrailer(videos?: TmdbVideo[]): string | null {
  if (!videos || videos.length === 0) return null;
  const yt = videos.filter((v) => v.site === "YouTube");
  // Prefer official Trailer → Teaser → any YouTube video
  const pref = ["Trailer", "Teaser"];
  for (const t of pref) {
    const v = yt.find((x) => x.type === t && x.official) ?? yt.find((x) => x.type === t);
    if (v) return `https://www.youtube.com/watch?v=${v.key}`;
  }
  if (yt[0]) return `https://www.youtube.com/watch?v=${yt[0].key}`;
  return null;
}

/** Extract director + writers from crew. */
export function extractCrew(crew: TmdbCrewMember[] = []): { director: string | null; writers: string[] } {
  const director = crew.find((c) => c.job === "Director")?.name ?? null;
  const writerJobs = new Set(["Writer", "Screenplay", "Story", "Novel"]);
  const writers = Array.from(
    new Set(crew.filter((c) => writerJobs.has(c.job)).map((c) => c.name))
  );
  return { director, writers };
}

/** Top-billed cast (first 12). */
export function extractCast(cast: TmdbCastMember[] = []): string[] {
  return [...cast]
    .sort((a, b) => a.order - b.order)
    .slice(0, 12)
    .map((c) => c.name);
}

/** Convert a TmdbMovieDetails into the shape used by our Movie model / API. */
export function tmdbToMoviePayload(d: TmdbMovieDetails) {
  const { director, writers } = extractCrew(d.credits?.crew);
  const gallery = (d.images?.backdrops ?? [])
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, 8)
    .map((img) => img.file_path);

  return {
    tmdbId: d.id,
    imdbId: d.imdb_id ?? null,
    title: d.title,
    originalTitle: d.original_title ?? null,
    poster: d.poster_path ?? null,
    backdrop: d.backdrop_path ?? null,
    releaseDate: d.release_date ?? null,
    year: d.release_date ? parseInt(d.release_date.slice(0, 4), 10) || null : null,
    genres: (d.genres ?? []).map((g) => g.name),
    runtime: d.runtime ?? null,
    country: d.production_countries?.[0]?.name ?? null,
    language: d.spoken_languages?.[0]?.english_name ?? null,
    director,
    writers,
    cast: extractCast(d.credits?.cast),
    overview: d.overview ?? null,
    tmdbRating: d.vote_average ?? null,
    trailer: pickTrailer(d.videos?.results),
    gallery,
    screenshots: [] as string[],
  };
}
