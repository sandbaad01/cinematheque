import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { I18nProvider } from "@/lib/i18n/context";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { DbAutoMigrator } from "@/components/DbAutoMigrator";

// Note: We use system fonts instead of next/font/google to avoid network
// dependency during build. Google Fonts require downloading at build time
// which fails in restricted/offline environments. System fonts work
// everywhere and look great.
//
// The CSS variables --font-geist-sans, --font-geist-mono, --font-vazirmatn
// are defined in globals.css with system font fallbacks.

export const metadata: Metadata = {
  title: "Cinémathèque — Personal Movie Archive",
  description:
    "A lightweight, offline-first personal movie archive. Track watched films, discover recommendations, and build your lifetime favorites.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#3bb5a3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <I18nProvider>
          {children}
          <ServiceWorkerRegistrar />
          <DbAutoMigrator />
        </I18nProvider>
        <Toaster />
        <Sonner />
      </body>
    </html>
  );
}
