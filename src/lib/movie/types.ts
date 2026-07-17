// Shared movie types and helpers

export type MovieStatus = "watched" | "want" | "watching" | "dropped" | "watchlist" | "new";

export interface Movie {
  id: string;
  tmdbId: number | null;
  imdbId: string | null;
  title: string;
  originalTitle: string | null;
  poster: string | null;
  backdrop: string | null;
  releaseDate: string | null;
  year: number | null;
  genres: string[];
  runtime: number | null;
  country: string | null;
  language: string | null;
  director: string | null;
  writers: string[];
  cast: string[];
  overview: string | null;
  imdbRating: number | null;
  tmdbRating: number | null;
  trailer: string | null;
  gallery: string[];
  screenshots: string[];
  status: MovieStatus;
  mediaType: "movie" | "series";
  favorite: boolean;
  rewatchCount: number;
  personalRating: number | null;
  watchDate: string | null;
  notes: string | null;
  lifetimeRank: number | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  movieIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ListItem {
  movieId: string;
  rank: number;
  note?: string;
}

export interface PersonalList {
  id: string;
  name: string;
  description: string | null;
  items: ListItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Recommendation {
  movie: Movie;
  score: number;
  reason: string;
}

// Parse a raw DB movie row into a typed Movie
export function parseMovie(raw: any): Movie {
  return {
    id: raw.id,
    tmdbId: raw.tmdbId ?? null,
    imdbId: raw.imdbId ?? null,
    title: raw.title,
    originalTitle: raw.originalTitle ?? null,
    poster: raw.poster ?? null,
    backdrop: raw.backdrop ?? null,
    releaseDate: raw.releaseDate ?? null,
    year: raw.year ?? null,
    genres: safeJsonArr(raw.genres),
    runtime: raw.runtime ?? null,
    country: raw.country ?? null,
    language: raw.language ?? null,
    director: raw.director ?? null,
    writers: safeJsonArr(raw.writers),
    cast: safeJsonArr(raw.cast),
    overview: raw.overview ?? null,
    imdbRating: raw.imdbRating ?? null,
    tmdbRating: raw.tmdbRating ?? null,
    trailer: raw.trailer ?? null,
    gallery: safeJsonArr(raw.gallery),
    screenshots: safeJsonArr(raw.screenshots),
    status: (raw.status as MovieStatus) ?? "new",
    mediaType: (raw.mediaType as "movie" | "series") ?? "movie",
    favorite: raw.favorite ?? false,
    rewatchCount: raw.rewatchCount ?? 0,
    personalRating: raw.personalRating ?? null,
    watchDate: raw.watchDate ?? null,
    notes: raw.notes ?? null,
    lifetimeRank: raw.lifetimeRank ?? null,
    tags: safeJsonArr(raw.tags),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function safeJsonArr(val: unknown): string[] {
  if (typeof val !== "string") return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseCollection(raw: any): Collection {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? null,
    movieIds: safeJsonArr(raw.movieIds),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function parseList(raw: any): PersonalList {
  let items: ListItem[] = [];
  try {
    const parsed = JSON.parse(raw.items);
    if (Array.isArray(parsed)) items = parsed;
  } catch {
    /* empty */
  }
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? null,
    items,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

// TMDB image URL helpers
export const TMDB_IMG = "https://image.tmdb.org/t/p";
export function posterUrl(path: string | null, size: "w200" | "w342" | "w500" = "w342"): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${TMDB_IMG}/${size}${path}`;
}
export function backdropUrl(path: string | null, size: "w780" | "w1280" = "w780"): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${TMDB_IMG}/${size}${path}`;
}

export function youtubeEmbed(url: string | null): string | null {
  if (!url) return null;
  // extract youtube video id
  const m =
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/) ??
    url.match(/^[A-Za-z0-9_-]{11}$/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  return null;
}
