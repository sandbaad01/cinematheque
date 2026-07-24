import type { NextConfig } from "next";

// Detect serverless environments (Vercel, Netlify).
// In these, we don't use standalone output — the platform handles it.
// For Tauri desktop builds (local), we use standalone output so the
// built app can be bundled into the MSI installer.
const isServerless = process.env.VERCEL === "1" || process.env.NETLIFY === "true" || !!process.env.NETLIFY;

const nextConfig: NextConfig = {
  ...(isServerless ? {} : { output: "standalone" }),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
