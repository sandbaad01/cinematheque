"use client";

import { useEffect } from "react";

/**
 * Automatically runs database migration on app startup — but only ONCE
 * per browser session. This fixes "column does not exist" errors on
 * databases created by older versions of the app.
 *
 * Uses sessionStorage to ensure it doesn't run repeatedly (which would
 * cause infinite reload loops).
 */
export function DbAutoMigrator() {
  useEffect(() => {
    // Check if we already ran migration in this session
    if (typeof window === "undefined") return;
    const alreadyMigrated = sessionStorage.getItem("cinematheque_migrated");
    if (alreadyMigrated) return;

    const runMigration = async () => {
      try {
        const res = await fetch("/api/migrate", { method: "POST" });
        if (!res.ok) {
          // Mark as attempted so we don't retry every reload
          sessionStorage.setItem("cinematheque_migrated", "attempted");
          return;
        }
        const data = await res.json();

        // Mark as migrated regardless — we only run once per session
        sessionStorage.setItem("cinematheque_migrated", "done");

        // Only reload if migrations were actually applied (columns added)
        // AND we haven't reloaded already for this reason
        if (data.migrations && data.migrations.length > 0) {
          console.log("Database migrated:", data.migrations);
          // Don't reload — just trigger a refresh via custom event
          // (reloading causes issues if migration keeps "succeeding")
          window.dispatchEvent(new CustomEvent("cinematheque:migrated"));
        }
      } catch {
        // Mark as attempted so we don't retry every reload
        sessionStorage.setItem("cinematheque_migrated", "attempted");
      }
    };
    runMigration();
  }, []);

  return null;
}
