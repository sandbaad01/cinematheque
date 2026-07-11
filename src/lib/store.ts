"use client";

import { create } from "zustand";

export type ViewName =
  | "home"
  | "watched"
  | "movie"
  | "genres"
  | "genre"
  | "ratings"
  | "favorites"
  | "lastWatched"
  | "timeline"
  | "collections"
  | "collection"
  | "lists"
  | "list"
  | "search"
  | "settings"
  | "random"
  | "recommendations";

interface ViewState {
  view: ViewName;
  movieId?: string;
  genreName?: string;
  collectionId?: string;
  listId?: string;
  searchQuery?: string;
  // scroll restoration
  scrollY?: number;
}

interface NavState extends ViewState {
  go: (view: ViewName, params?: Partial<ViewState>) => void;
  goMovie: (movieId: string) => void;
  goGenre: (genreName: string) => void;
  goCollection: (collectionId: string) => void;
  goList: (listId: string) => void;
  goSearch: (query: string) => void;
  back: () => void;
  canGoBack: boolean;
}

interface HistoryEntry {
  view: ViewName;
  movieId?: string;
  genreName?: string;
  collectionId?: string;
  listId?: string;
  searchQuery?: string;
}

const history: HistoryEntry[] = [];

export const useNav = create<NavState>((set, get) => ({
  view: "home",
  canGoBack: false,

  go: (view, params = {}) => {
    const current = get();
    // push current to history
    history.push({
      view: current.view,
      movieId: current.movieId,
      genreName: current.genreName,
      collectionId: current.collectionId,
      listId: current.listId,
      searchQuery: current.searchQuery,
    });
    set({ ...params, view, scrollY: 0 });
  },

  goMovie: (movieId) => {
    get().go("movie", { movieId });
  },
  goGenre: (genreName) => {
    get().go("genre", { genreName });
  },
  goCollection: (collectionId) => {
    get().go("collection", { collectionId });
  },
  goList: (listId) => {
    get().go("list", { listId });
  },
  goSearch: (query) => {
    get().go("search", { searchQuery: query });
  },

  back: () => {
    const prev = history.pop();
    if (prev) {
      set({ ...prev });
    }
    set({ canGoBack: history.length > 0 });
  },
}));

// Update canGoBack whenever view changes
useNav.subscribe((state) => {
  if (state.canGoBack !== history.length > 0) {
    useNav.setState({ canGoBack: history.length > 0 });
  }
});
