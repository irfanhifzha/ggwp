# GGEZ — GreatGridEzSpace

A minimalist, local-first grid workspace for reading, writing, and organizing information in one place. Notes, PDFs, and bookmarks live side by side in resizable panels, and everything is stored locally on your device — no accounts, no tracking, no backend required.

Shipped as:
- **Web App**: [ggwplab.pages.dev](https://ggwplab.pages.dev) (runs in any modern browser)
- **Desktop App**: Lightweight Windows (`.exe` NSIS installer) and macOS (universal `.dmg`) via Tauri 2
- **Android App**: Standalone signed APK (`.apk`) via Tauri 2 Mobile

---

## Features

- **Dynamic CSS Grid** — Configurable columns (1–4); each panel can span multiple columns (`colSpan`) and rows (`rowSpan`).
- **Mobile Responsive** — Full multi-column control (`+` / `−`) and panel resizing even on phones and foldables, with notch and status-bar safe-area support.
- **Panel Types**
  - **Text** — Distraction-free plain-text note editor with automatic debounced saving.
  - **PDF** — Displays PDF documents from URLs using the system/browser native viewer without heavy PDF.js bundle bloat.
  - **Bookmarks** — Save links with custom titles and notes; edit or delete inline.
- **Layout Management** — Add, remove, resize, and reorder panels (touch/mouse drag grip `⠿` or header arrow buttons `←` / `→`).
- **Keyboard-first** — Press **Ctrl+A** (outside a text field) to start a leader, then one key for every action: add panels, arrange/size/close, columns, import/export, clear all. Press **?** for the full cheat sheet.
- **Autosave** — Changes commit to local storage automatically shortly after editing.
- **JSON Export / Import** — Backup and restore your workspace snapshots across devices with automatic schema sanitization.
- **Lightweight & Fast** — ~78 KB gzipped JavaScript bundle; zero heavy UI frameworks or Electron bloat.
- **Light / Dark Theme** — Automatically follows system preferences.

---

## User Guide

### Using the Workspace

| Action | Control / Shortcut | Description |
| :--- | :--- | :--- |
| **Add Panel** | **+ Text**, **+ PDF**, **+ Bookmarks** | Located in the top header action bar. |
| **Rename Panel** | Panel Title input | Click or tap directly on the panel title to edit. |
| **Adjust Columns** | **Columns − / +** | Changes the grid column count (1 to 4). Panels adjust automatically. |
| **Resize Panel** | **◄ ►** (width) / **▲ ▼** (height) | Expands or shrinks the column span and row span of the panel. |
| **Reorder Panels** | **⠿** grip or **← →** | Drag the grip handle, or use arrow buttons in the panel header. |
| **Read a PDF** | URL field + **Load** | Paste an `http(s)` PDF link and press Enter or Load. |
| **Save Bookmark** | URL + Title/Note + **Add** | Save web links directly into bookmark panels. |
| **Delete Panel** | **✕** | Permanently removes the panel from the grid. |
| **Export Snapshot** | **Export** | Downloads a versioned JSON snapshot (`ggez-YYYY-MM-DD.json`). |
| **Import Snapshot** | **Import** | Uploads or pastes a JSON snapshot to restore panels. |
| **Clear Workspace** | **Clear All** | Resets the workspace after explicit confirmation. |

### Keyboard Shortcuts

The app is designed to be fully usable without a mouse. Press **Ctrl+A** (or **Cmd+A** on macOS) while focus is outside a text field to start the leader, then press one key. Press **?** at any time to open the complete shortcut sheet. The selected panel is outlined; use **J** / **K** to move the selection before arranging, sizing, or closing it.

| Keys after leader | Action |
| :--- | :--- |
| **T** / **P** / **B** / **D** | Add a text, PDF, bookmarks, or todo panel |
| **J** / **K** | Select the next / previous panel |
| **Enter** | Focus the selected panel's content |
| **R** | Rename the selected panel |
| **H** / **L** | Move the selected panel back / forward |
| **−** / **+** | Make the selected panel narrower / wider |
| **[** / **]** | Make the selected panel shorter / taller |
| **X** | Close the selected panel |
| **,** / **.** | Use fewer / more grid columns |
| **1**–**6** | Set an exact column count |
| **E** / **I** | Open Export / Import |
| **C** | Clear the workspace (confirmation required) |
| **S** | Sign in / sign out (cloud builds) |
| **?** | Open the full shortcut sheet |
| **Esc** | Cancel the leader |

Inside a text field, **Ctrl+A** keeps its normal select-all behaviour. The **Shortcuts** button in the header opens the same cheat sheet.

### Mobile & Touch Usage
- **Portrait & Landscape**: The grid supports 1 to 4 columns on phones. Use **Columns − / +** to toggle between a 1-column reading feed and a 2-column side-by-side comparison view.
- **Notch & Status Bar**: Safe-area insets (`env(safe-area-inset-top)`) automatically prevent content from colliding with camera punch-holes or system status bars.
- **Touch Reordering**: In portrait mode, use the **`←`** and **`→`** buttons in each panel header to reorder, or rotate to landscape to use touch drag-and-drop.

---

## Development & Build Instructions

### Prerequisites
- **Node.js** (v20+ recommended) and **npm**
- **Rust** (stable toolchain) — required for Desktop and Android builds
- **Platform Tools**:
  - *Windows*: Visual Studio C++ Build Tools + WebView2
  - *macOS*: Xcode Command Line Tools
  - *Android*: Android Studio / SDK (`cmdline-tools`, `platforms;android-34`, NDK `27.2.12479018`)

### Commands

```bash
# Install dependencies
npm install

# Web Development
npm run dev              # Start Vite dev server at http://localhost:1420
npm run build            # Type-check (tsc) and compile production web bundle to dist/
npm run preview          # Preview local production build
npm run lint             # Fast linting via oxlint

# Desktop App (Tauri 2)
npm run desktop:dev      # Launch native desktop app against local dev server
npm run desktop:build    # Build release desktop installer (NSIS .exe or macOS .dmg)

# Android App (Tauri Mobile)
npm run android:dev      # Run on connected Android device or emulator
npm run android:build    # Build production release APK
npm run android:build:debug # Build debug APK

# Icon Generation
npm run icon             # Generate all desktop and Android mipmap launcher icons
```

---

## AI Agent & Contributor Guide

When writing code or assisting with features in this repository, follow these design principles and architectural conventions:

### 1. Architecture Overview
- **Frontend Core**: React 19 + TypeScript + Vite 8.
- **Desktop/Mobile Shell**: [Tauri 2](https://v2.tauri.app/) (Rust backend shell).
- **Platform Abstraction Layer (`src/platform/`)**:
  - Code outside `src/platform/` **must not** directly import `@tauri-apps/*` packages.
  - All native operations (`openExternal`, `saveTextFile`, `openTextFile`, `confirmAction`, `onBeforeQuit`) go through [src/platform/index.ts](file:///Users/asdf/Downloads/newprojectweb/ggez/src/platform/index.ts).
  - Web builds dynamically import [browser.ts](file:///Users/asdf/Downloads/newprojectweb/ggez/src/platform/browser.ts), ensuring the web client never downloads Tauri native bridge code (~0 KB overhead).
  - Desktop and mobile runtimes dynamically load [desktop.ts](file:///Users/asdf/Downloads/newprojectweb/ggez/src/platform/desktop.ts).

### 2. Strict Lightweight & Performance Guardrails
- **No Heavy External Dependencies**: Do **not** add bloated dependencies (no PDF.js, no drag-and-drop libraries, no heavy UI suites, no Electron).
- **Pure CSS Grid**: Layout is governed by native CSS Grid (`grid-template-columns`, `gridColumn`, `gridRow`). Do not switch to absolute positioning, coordinate math, or canvas-based layout engines.
- **Local Edit State**: Text editors and panel forms maintain internal draft state and commit to the top-level workspace state on a debounce (~300–400 ms). Never trigger a full workspace re-render on every keystroke.
- **Lazy Native Elements**: Iframes and embedded viewers must retain `loading="lazy"`.

### 3. Mobile & Responsive Design Rules
- Keep `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />` in [index.html](file:///Users/asdf/Downloads/newprojectweb/ggez/index.html).
- Always respect `env(safe-area-inset-top)` on `.app-bar` so Android/iOS cutouts do not overlap UI controls.
- Do not reintroduce `grid-template-columns: 1fr !important` on `.workspace`; user-configured columns must remain functional across all screen widths.
- Ensure panel headers wrap (`flex-wrap: wrap`) so action buttons never overflow on narrow 2-column mobile viewports.

### 4. Icon Generation & Assets
- Source icon generator is in [scripts/make-icon.mjs](file:///Users/asdf/Downloads/newprojectweb/ggez/scripts/make-icon.mjs) (pure Node.js + zlib, zero npm dependencies).
- Running `npm run icon` runs `make-icon.mjs` and invokes `tauri icon src-tauri/icons/source.png`, which updates:
  - Desktop icons in [src-tauri/icons/](file:///Users/asdf/Downloads/newprojectweb/ggez/src-tauri/icons/)
  - Android mipmaps in [src-tauri/gen/android/app/src/main/res/](file:///Users/asdf/Downloads/newprojectweb/ggez/src-tauri/gen/android/app/src/main/res/)
- CI workflow in [.github/workflows/release.yml](file:///Users/asdf/Downloads/newprojectweb/ggez/.github/workflows/release.yml) automatically runs `npm run icon` during APK builds.

### 5. Versioning
- The version string must remain synchronized across:
  - [src-tauri/tauri.conf.json](file:///Users/asdf/Downloads/newprojectweb/ggez/src-tauri/tauri.conf.json) (`version`)
  - [src-tauri/Cargo.toml](file:///Users/asdf/Downloads/newprojectweb/ggez/src-tauri/Cargo.toml) (`version`)
  - [package.json](file:///Users/asdf/Downloads/newprojectweb/ggez/package.json) (`version`)
- Branch builds are labelled in the header: `main` ships `0.1.5-local`, `cloudstorage` ships `0.1.5-cloud`. Keep the three version fields and `APP_VERSION` in [src/App.tsx](file:///Users/asdf/Downloads/newprojectweb/ggez/src/App.tsx) in sync.

---

## Data, Cloud & Privacy

- Data is always cached under the `greatgridworkspace:workspace` key in `localStorage` (kept for backwards compatibility).
- When `public/firebase-config.json` exists, the cloud is available as explicit saves. Each
  document in the `workspaces` collection is a saved workspace that can be overwritten or created
  from the save dialog. Without that file the app stays fully local.
- Cloud is manual: **Export → Cloud Save** writes the current workspace to a named document
  (existing names are suggested and overwrite), while **Import → Cloud** lists the documents and
  loads any of them. There is no live syncing or background upload.
- When cloud is configured, signed-out users get a read-only workspace: they can open and load
  versions, but editing and saving require **Sign in** (email + password). Accounts are created in
  the Firebase console.
- The Firestore rules allow public reads and require a signed-in account for writes.
- No analytics or telemetry.
- **Export**: Produces a clean, human-readable JSON snapshot.
- **Import**: Validates and sanitizes data shape; unknown panel types and invalid links are automatically stripped to protect the user's workspace.

### Cloud setup

```bash
npx firebase login
npx firebase apps:sdkconfig web <APP_ID> --out public/firebase-config.json
npx firebase deploy --only firestore:rules
```

The web config is gitignored. Enable the **Email/Password** provider under Firebase Authentication,
and make sure a Firestore database exists for the project.

Release builds read the same JSON from the `FIREBASE_CONFIG_JSON` repository secret (Settings →
Secrets and variables → Actions), so the GitHub Actions installers and APK include cloud storage.
If that secret is unset the workflow warns and ships a local-only build. Tauri's CSP allows the
Google endpoints the Firebase SDK talks to (`*.googleapis.com`, `*.firebaseio.com`).

---

## License

GGEZ — GreatGridEzSpace is free software licensed under the **GNU General Public License v3.0 only**
(`GPL-3.0-only`). See [LICENSE.md](LICENSE.md) for the full text.

Copyright (C) 2026 ggwplab.

