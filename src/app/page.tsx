"use client";

import { useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/movie/Sidebar";
import { Header } from "@/components/movie/Header";
import { useNav } from "@/lib/store";
import { useI18n } from "@/lib/i18n/context";
import { HomeView } from "@/views/HomeView";
import { WatchedView } from "@/views/WatchedView";
import { MovieDetailView } from "@/views/MovieDetailView";
import { GenresView } from "@/views/GenresView";
import { GenreDetailView } from "@/views/GenreDetailView";
import { RatingsView } from "@/views/RatingsView";
import { FavoritesView } from "@/views/FavoritesView";
import { LastWatchedView } from "@/views/LastWatchedView";
import { TimelineView } from "@/views/TimelineView";
import { CollectionsView } from "@/views/CollectionsView";
import { CollectionView } from "@/views/CollectionView";
import { ListsView } from "@/views/ListsView";
import { ListView } from "@/views/ListView";
import { SearchView } from "@/views/SearchView";
import { SettingsView } from "@/views/SettingsView";
import { RandomView } from "@/views/RandomView";
import { Github, Heart } from "lucide-react";

export default function Page() {
  const { view, movieId, genreName, collectionId, listId, searchQuery } = useNav();
  const { t, dir } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  // Scroll to top on view change
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view, movieId, genreName, collectionId, listId, searchQuery]);

  // Set <html> dir + lang attributes when language changes
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = dir === "rtl" ? "fa" : "en";
  }, [dir]);

  const renderView = () => {
    switch (view) {
      case "home": return <HomeView />;
      case "watched": return <WatchedView />;
      case "movie": return movieId ? <MovieDetailView key={movieId} movieId={movieId} /> : <HomeView />;
      case "genres": return <GenresView />;
      case "genre": return genreName ? <GenreDetailView key={genreName} genreName={genreName} /> : <GenresView />;
      case "ratings": return <RatingsView />;
      case "favorites": return <FavoritesView />;
      case "lastWatched": return <LastWatchedView />;
      case "timeline": return <TimelineView />;
      case "collections": return <CollectionsView />;
      case "collection": return collectionId ? <CollectionView key={collectionId} collectionId={collectionId} /> : <CollectionsView />;
      case "lists": return <ListsView />;
      case "list": return listId ? <ListView key={listId} listId={listId} /> : <ListsView />;
      case "search": return <SearchView key={searchQuery ?? "s"} initialQuery={searchQuery} />;
      case "settings": return <SettingsView />;
      case "random": return <RandomView />;
      default: return <HomeView />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header onMenuClick={() => setMobileOpen(true)} />

          <main ref={mainRef} className="flex-1 overflow-y-auto scrollbar-thin">
            {renderView()}
          </main>
        </div>
      </div>

      {/* Sticky footer */}
      <footer className="mt-auto shrink-0 border-t bg-background/80 backdrop-blur">
        <div className="flex flex-col items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground sm:flex-row md:px-6">
          <div className="flex items-center gap-1.5">
            <span className="text-gradient font-semibold">{t("appName")}</span>
            <span>·</span>
            <span>{t("appTagline")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>{t("today")}: {new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              Made with <Heart className="size-3 fill-primary text-primary" /> for cinephiles
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
