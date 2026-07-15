"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { RecommendationsView } from "@/views/RecommendationsView";
import { PersonView } from "@/views/PersonView";
import { ImdbListsView } from "@/views/ImdbListsView";
import { YearlyStatsView } from "@/views/YearlyStatsView";
import { ReportView } from "@/views/ReportView";
import { Github, Heart } from "lucide-react";

export default function Page() {
  const { view, movieId, genreName, collectionId, listId, searchQuery, personName, personRole } = useNav();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  // Scroll to top on view change
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view, movieId, genreName, collectionId, listId, searchQuery]);

  // The app UI is always English / LTR. The selected language only affects
  // the movie "Story" translation (handled inside MovieDetailView), so we
  // keep the document direction locked to LTR.
  useEffect(() => {
    document.documentElement.dir = "ltr";
    document.documentElement.lang = "en";
  }, []);

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
      case "recommendations": return <RecommendationsView />;
      case "person": return personName && personRole ? (
        <PersonView key={personName + personRole} name={personName} role={personRole} />
      ) : <HomeView />;
      case "imdbLists": return <ImdbListsView />;
      case "yearlyStats": return <YearlyStatsView />;
      case "report": return <ReportView />;
      default: return <HomeView />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 overflow-hidden print:block print:overflow-visible">
        <Sidebar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />

        <div className="flex min-w-0 flex-1 flex-col print:block">
          <Header onMenuClick={() => setMobileOpen(true)} />

          <main ref={mainRef} className="flex-1 overflow-y-auto scrollbar-thin print:block print:overflow-visible">
            <div className="mx-auto w-full max-w-7xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="print:!transform-none print:!opacity-100"
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
            </div>
          </main>
        </div>
      </div>

      {/* Sticky footer (hidden when printing) */}
      <footer className="mt-auto shrink-0 border-t bg-background/80 backdrop-blur print:hidden">
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
