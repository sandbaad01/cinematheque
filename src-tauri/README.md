# Cinémathèque — Desktop App (Tauri)

This folder contains the Tauri configuration for building Cinémathèque as a native desktop application.

## Prerequisites

### Windows
1. Install [Rust](https://rustup.rs/)
2. Install [Node.js](https://nodejs.org/) (or Bun)
3. Install [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

### macOS
1. Install [Rust](https://rustup.rs/)
2. Install [Node.js](https://nodejs.org/) (or Bun)
3. Install Xcode Command Line Tools: `xcode-select --install`

### Linux
1. Install [Rust](https://rustup.rs/)
2. Install system dependencies:
   ```bash
   sudo apt install libwebkit2gtk-4.1-dev libssl-dev libglib2.0-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
   ```

## Development

Run the app in development mode (hot reload):

```bash
bun run tauri:dev
```

This will:
1. Start the Next.js dev server on port 3000
2. Open a native desktop window pointing to the dev server
3. Enable hot reload for both frontend and Rust code

## Build

Build a production desktop app:

```bash
bun run tauri:build
```

This will:
1. Build the Next.js app
2. Compile the Rust backend
3. Package everything into a native installer

### Output

The built app will be in `src-tauri/target/release/`:
- **Windows**: `.msi` installer and `.exe`
- **macOS**: `.dmg` and `.app`
- **Linux**: `.deb` and `.AppImage`

## Configuration

Edit `src-tauri/tauri.conf.json` to change:
- Window size and title
- App identifier
- Bundle settings (icons, etc.)

## How It Works

The desktop app wraps the Next.js web application in a native window using Tauri's webview.
The Next.js dev server runs locally, so all API routes, database access, and TMDb integration
work exactly as in the web version.

## Database

The SQLite database (`db/custom.db`) is stored in the project directory. When building a
production app, you may want to move it to the user's app data directory for persistence
across updates.
