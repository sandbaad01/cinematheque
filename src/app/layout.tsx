import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { I18nProvider } from "@/lib/i18n/context";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { DbAutoMigrator } from "@/components/DbAutoMigrator";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "Cinémathèque — Personal Movie Archive",
  description:
    "A lightweight, offline-first personal movie archive. Track watched films, discover recommendations, and build your lifetime favorites.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
    shortcut: "/icon-192.png",
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
        <AuthProvider>
          <I18nProvider>
            {children}
            <ServiceWorkerRegistrar />
            <DbAutoMigrator />
          </I18nProvider>
        </AuthProvider>
        <Toaster />
        <Sonner />
      </body>
    </html>
  );
}
