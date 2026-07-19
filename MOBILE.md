# Cinémathèque — Android Mobile App Guide

This guide explains how to build the Cinémathèque app for Android.

## Overview

The Cinémathèque app has two parts:
1. **Frontend + Backend**: A Next.js app (React UI + API routes + Prisma/SQLite database)
2. **Desktop wrapper**: Tauri (Rust) that bundles the Next.js server into a desktop app

For **Android**, the approach is different:
- You deploy the Next.js app to a web server (e.g., Vercel — free)
- The Android APK is a Tauri Mobile wrapper that loads that URL
- The app works as a full-screen native Android app

---

## Option A: PWA (Simplest — No APK needed)

The app is already a Progressive Web App (PWA). Android users can install it directly from the browser:

1. Deploy the Next.js app to Vercel (see steps below)
2. Open the deployed URL in Chrome on Android
3. Tap the menu (⋮) → **Add to Home screen**
4. The app appears on the home screen with an icon
5. It runs full-screen, works offline (cached data), and behaves like a native app

**Advantages**: No Android SDK needed, auto-updates, works immediately
**Disadvantages**: Not on Play Store, needs internet for first load

---

## Option B: Android APK (Real installable app)

This produces a real `.apk` file that can be sideloaded or distributed.

### Prerequisites (install on your Windows machine)

1. **Android Studio** (includes Android SDK + NDK)
   - Download: https://developer.android.com/studio
   - Install with default settings
   - After install: open Android Studio → SDK Manager → install:
     - Android SDK Platform 33+ (or latest)
     - Android SDK Build-Tools
     - NDK (Side by side)
     - Android SDK Command-line Tools

2. **Java JDK 17+** (Android Studio bundles this)

3. **Rust** with Android targets
   - Install Rust: https://rustup.rs
   - Add Android targets:
     ```
     rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
     ```

4. **Environment variables** (set in Windows):
   ```
   ANDROID_HOME=C:\Users\YourName\AppData\Local\Android\Sdk
   NDK_HOME=C:\Users\YourName\AppData\Local\Android\Sdk\ndk\<version>
   JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
   ```

---

### Step 1: Deploy the Next.js app to Vercel

1. Push your project to GitHub
2. Go to https://vercel.com → Sign up / Log in with GitHub
3. Click **Add New Project** → Import your repository
4. Set environment variables:
   - `DATABASE_URL` = `file:./db/custom.db`
   - `TMDB_API_KEY` = `39adf355a4930c90981a9d8abc608dec`
   - `TMDB_READ_ACCESS_TOKEN` = `eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzOWFkZjM1NWE0OTMwYzkwOTgxYTlkOGFiYzYwOGRlYyIsIm5iZiI6MTc4Mzc3ODYzMy4zMDgsInN1YiI6IjZhNTI0ZDQ5YjQzM2ZkZGZhMWFiMDhmYSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.jIx1c4qk-q8lsnc6yCWFW4X0e4N8LYfMIwgI2YKbmTA`
5. Click **Deploy**
6. Wait for deployment to complete — you'll get a URL like:
   `https://cinematheque-xxx.vercel.app`

### Step 2: Configure the mobile app URL

Edit `src-tauri/html/mobile/index.html` and replace the `SERVER_URL`:

```javascript
// Replace with your Vercel URL:
const SERVER_URL = "https://cinematheque-xxx.vercel.app";

// Or for testing with a local server on an Android emulator:
// const SERVER_URL = "http://10.0.2.2:3000";

// Or for testing on a real device via WiFi (your PC's IP):
// const SERVER_URL = "http://192.168.1.100:3000";
```

### Step 3: Initialize the Android project

Open a terminal in the project folder and run:

```cmd
npx tauri android init
```

This creates the `src-tauri/gen/android/` directory with the Android project.

### Step 4: Build the APK

```cmd
npx tauri android build
```

This produces:
- **Debug APK**: `src-tauri/gen/android/app/build/outputs/apk/debug/app-debug.apk`
- **Release APK**: `src-tauri/gen/android/app/build/outputs/apk/release/app-release-unsigned.apk`

### Step 5: Sign the APK (for distribution)

Release APKs need to be signed before installation:

```cmd
keytool -genkey -v -keystore cinematheque.keystore -alias cinematheque -keyalg RSA -keysize 2048 -validity 10000
```

Then sign:
```cmd
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore cinematheque.keystore app-release-unsigned.apk cinematheque
```

### Step 6: Install on your phone

1. Copy the `.apk` file to your Android phone
2. Open it with a file manager
3. Allow installation from unknown sources if prompted
4. Install and open

---

## Option C: Testing on Android Emulator

For development testing without a real device:

1. Open Android Studio → AVD Manager → Create a virtual device
2. Start the emulator
3. Run the Next.js dev server on your PC:
   ```cmd
   npx next dev -p 3000
   ```
4. Set `SERVER_URL = "http://10.0.2.2:3000"` in `src-tauri/html/mobile/index.html`
   (10.0.2.2 is the Android emulator's alias for the host machine's localhost)
5. Build and install:
   ```cmd
   npx tauri android dev
   ```

---

## File Structure

```
src-tauri/
├── html/
│   ├── index.html          # Desktop: redirects to localhost:3000
│   └── mobile/
│       └── index.html      # Mobile: redirects to SERVER_URL
├── tauri.conf.json          # Desktop config
├── tauri.android.conf.json  # Android config (uses mobile/ HTML)
├── src/
│   └── lib.rs               # Rust code (desktop: starts server; mobile: loads URL)
└── icons/                   # App icons (shared between desktop + mobile)

public/
├── manifest.webmanifest     # PWA manifest
├── sw.js                    # Service worker (offline support)
├── icon-192.png             # PWA icons
├── icon-512.png
├── icon-maskable-192.png    # Android adaptive icon support
└── icon-maskable-512.png
```

---

## Troubleshooting

### "Cannot connect to server"
- Make sure your Vercel deployment is live
- Check the `SERVER_URL` in `src-tauri/html/mobile/index.html`
- For local testing, make sure `npx next dev` is running

### Build fails with "NDK not found"
- Install NDK via Android Studio's SDK Manager
- Set `NDK_HOME` environment variable

### Build fails with "rust target not found"
- Run: `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`

### APK installs but shows blank screen
- The `SERVER_URL` is wrong or unreachable
- Test the URL in a browser first
- For emulator, use `10.0.2.2:3000` not `localhost:3000`
