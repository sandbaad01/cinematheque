"use client";

import { useEffect } from "react";

/**
 * Automatically runs database migration on app startup.
 * This fixes "column does not exist" errors on databases created by
 * older versions of the app (e.g., before mediaType was added).
 *
 * It calls POST /api/migrate once on mount. If migration is needed,
 * it reloads the page so the app re-fetches data with the correct schema.
 */
export function DbAutoMigrator() {
  useEffect(() => {
    const runMigration = async () => {
      try {
        const res = await fetch("/api/migrate", { method: "POST" });
        if (!res.ok) return;
        const data = await res.json();
        // If any migrations were applied (columns added), reload to refresh data
        if (data.migrations && data.migrations.length > 0) {
          console.log("Database migrated:", data.migrations);
          // Reload after a short delay so the user sees the console message
          setTimeout(() => window.location.reload(), 500);
        }
      } catch {
        // Silently fail — the app will show errors if the schema is truly broken
      }
    };
    runMigration();
  }, []);

  return null;
}
