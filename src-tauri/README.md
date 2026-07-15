# Cinémathèque — Desktop App (Tauri)

## Quick Start (Windows)

### Step 1: Install Prerequisites

1. **Rust**: Download from https://rustup.rs/ and run `rustup-init.exe`
2. **C++ Build Tools**: Download from https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - Check "Desktop development with C++" during installation
3. **Bun**: In PowerShell, run:
   ```powershell
   powershell -c "irm bun.sh/install.ps1 | iex"
   ```
4. **Node.js**: Install from https://nodejs.org/ (needed by Tauri to run the server)

### Step 2: Install Dependencies

Open Command Prompt in the project folder:
```
bun install
bun run db:push
```

### Step 3: Development Mode (with hot reload)

```
bun run tauri:dev
```

First run takes 5-10 minutes (compiling Rust). Subsequent runs are fast.

This opens a desktop window running the app with full hot reload.

### Step 4: Build Production App

```
bun run tauri:build
```

This creates installers in:
```
src-tauri\target\release\bundle\
```

- **Windows**: `.msi` installer + `.exe`
- **macOS**: `.dmg` + `.app`
- **Linux**: `.deb` + `.AppImage`

### How It Works

The desktop app:
1. Builds the Next.js standalone server
2. Bundles it inside the Tauri app
3. On launch, starts the server automatically (no browser needed)
4. Displays the app in a native desktop window
5. When you close the window, the server stops automatically

All features work exactly like the web version: TMDb integration, database, Photothèque uploads, etc.

### Database Location

The SQLite database (`db/custom.db`) is in the project directory. When using the built app, it uses the bundled database.

### Troubleshooting

**"webkit2gtk not found" (Linux only)**:
```bash
sudo apt install libwebkit2gtk-4.1-dev libssl-dev libglib2.0-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

**"Node not found"**:
Make sure Node.js is installed (https://nodejs.org/). The app needs `node` to run the bundled server.

**Build takes too long**:
The first Rust compilation takes 5-10 minutes. This is normal — subsequent builds are much faster.

**Port 3000 already in use**:
Close any other app using port 3000, or change the port in `next.config.ts` and `src-tauri/tauri.conf.json`.
