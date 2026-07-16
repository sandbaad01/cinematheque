"use client";

import { useState } from "react";
import {
  Clapperboard,
  Home,
  Star,
  Heart,
  CalendarRange,
  Search,
  FolderOpen,
  ListOrdered,
  Settings,
  Plus,
  Film,
  Sparkles,
  BarChart3,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useNav, type ViewName } from "@/lib/store";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { AddMovieDialog } from "./AddMovieDialog";

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

interface NavItem {
  view: ViewName;
  labelKey: string;
  icon: LucideIcon;
}

interface NavGroup {
  titleKey: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    titleKey: "section_library",
    items: [
      { view: "home", labelKey: "nav_home", icon: Home },
      { view: "watched", labelKey: "nav_watched", icon: Film },
      { view: "watchlist", labelKey: "nav_watchlist", icon: Film },
      { view: "wantToWatch", labelKey: "nav_wantToWatch", icon: Film },
      { view: "genres", labelKey: "nav_genres", icon: Clapperboard },
    ],
  },
  {
    titleKey: "section_discover",
    items: [
      { view: "search", labelKey: "nav_search", icon: Search },
      { view: "recommendations", labelKey: "nav_recommendations", icon: Sparkles },
      { view: "timeline", labelKey: "nav_timeline", icon: CalendarRange },
      { view: "imdbLists", labelKey: "nav_imdbLists", icon: Clapperboard },
      { view: "yearlyStats", labelKey: "nav_yearlyStats", icon: BarChart3 },
    ],
  },
  {
    titleKey: "section_organize",
    items: [
      { view: "ratings", labelKey: "nav_ratings", icon: Star },
      { view: "favorites", labelKey: "nav_favorites", icon: Heart },
      { view: "collections", labelKey: "nav_collections", icon: FolderOpen },
      { view: "lists", labelKey: "nav_lists", icon: ListOrdered },
      { view: "report", labelKey: "nav_report", icon: FileText },
    ],
  },
];

const SETTINGS_ITEM: NavItem = {
  view: "settings",
  labelKey: "nav_settings",
  icon: Settings,
};

/** Left navigation sidebar — desktop column + mobile Sheet. */
export function Sidebar({ mobileOpen, onMobileOpenChange }: SidebarProps) {
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const { t } = useI18n();
  const { view, go, triggerRefresh } = useNav();

  const isMobileOpen = mobileOpen ?? internalMobileOpen;
  const setMobileOpen = (v: boolean) => {
    onMobileOpenChange?.(v);
    if (onMobileOpenChange === undefined) setInternalMobileOpen(v);
  };

  const navigate = (v: ViewName) => {
    go(v);
    setMobileOpen(false);
  };

  const content = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 shrink-0 items-center gap-2 px-4">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Clapperboard className="size-5" />
        </div>
        <span className="text-gradient text-lg font-bold tracking-tight">
          {t("appName")}
        </span>
      </div>

      {/* Add Movie button */}
      <div className="px-3 pb-2">
        <Button
          type="button"
          className="w-full justify-center"
          onClick={() => {
            setAddOpen(true);
            setMobileOpen(false);
          }}
        >
          <Plus className="size-4" />
          {t("nav_add")}
        </Button>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 px-2">
        <nav className="space-y-4 pb-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.titleKey} className="space-y-1">
              <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-secondary/70">
                {t(group.titleKey)}
              </p>
              {group.items.map((item) => (
                <NavButton
                  key={item.view}
                  item={item}
                  label={t(item.labelKey)}
                  active={view === item.view}
                  onClick={() => navigate(item.view)}
                />
              ))}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Settings at bottom */}
      <div className="border-t p-2">
        <NavButton
          item={SETTINGS_ITEM}
          label={t(SETTINGS_ITEM.labelKey)}
          active={view === "settings"}
          onClick={() => navigate("settings")}
        />
      </div>

      <AddMovieDialog open={addOpen} onOpenChange={setAddOpen} onSaved={() => triggerRefresh()} />
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-60 shrink-0 overflow-y-auto scrollbar-thin border-r bg-sidebar print:hidden md:flex md:flex-col">
        {content}
      </aside>

      {/* Mobile */}
      <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{t("appName")}</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    </>
  );
}

function NavButton({
  item: Item,
  label,
  active,
  onClick,
}: {
  item: NavItem;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = Item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary"
        />
      )}
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}
