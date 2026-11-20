# GEMINI.md — Offline Calisthenics PWA + Google Drive Coach Bridge

## 1. Core Architecture & Tech Stack
- **Application Type:** Offline-first Android Progressive Web App (PWA).
- **Framework & Tooling:** Vite, React, TypeScript, Tailwind CSS.
- **Offline & Storage:**
  - `vite-plugin-pwa` (Workbox) for full app-shell, script, style, and local SVG pre-caching.
  - `idb` (IndexedDB) for all persistent local state (`user_profile`, `program_config`, `workout_logs`, `drive_sync_meta`, and offline progression tracking).
- **Zero-Backend Airplane Mode Guarantee:** The entire workout player, timers, Web Audio API / vibration cues, onboarding, Day-1 calibration, and exercise animations must run 100% offline in airplane mode after installation.

## 2. Unbreakable Guardrails
- **Zero-Equipment Flat-Floor Constraint:**
  - Every curated exercise must require **zero equipment** and fit within a **`2 m × 1 m` flat floor space**.
  - Strictly exclude exercises requiring pull-up bars, dip stations, chairs, tables, benches, resistance bands, or walls.
- **Metric Units Only:**
  - Enforce `kg` and `cm` across all UI forms, validation, CSV exports (`workout_log.csv`), and JSON schemas (`user_profile.json`, `program_config.json`). Imperial units (`lbs`, `ft`, `in`) are prohibited.
- **Local SVG Bundling (No External CDN Links):**
  - Source exercise illustrations from `@bryllim/workout-guide` (`v1.0.0`).
  - **NEVER** call `getAssetUrl()` or reference external CDN URLs.
  - Bundle local SVG files directly from `node_modules/@bryllim/workout-guide/assets/<slug>/frame-<1|2|3>.svg` via Vite `import.meta.glob` and pre-cache them in the PWA Service Worker.
  - Include an **About & Attributions** screen crediting **Everkinetic** and **Bryl Lim** under **CC BY-SA 4.0** (and **MIT** for code).
- **Scoped Google Drive Bridge (In-Place `PATCH`):**
  - Use Google Identity Services (GIS) OAuth 2.0 requesting **only** `https://www.googleapis.com/auth/drive.file`.
  - Store permanent Drive `fileId` references in IndexedDB (`drive_sync_meta`).
  - Overwrite `workout_log.csv` and `user_profile.json` in-place via `PATCH https://www.googleapis.com/upload/drive/v3/files/{fileId}?uploadType=media` so linked external AI tools read live updates without changing `fileId`s.
  - Fetch inbound programming via `GET https://www.googleapis.com/drive/v3/files/{program_config_fileId}?alt=media` and validate against the `program_config.json` schema before applying.

## 3. Coding & Verification Conventions
- **Schema Validation:** Strictly validate any inbound `program_config.json` (whether from Google Drive or the manual *Paste Coach JSON* modal) before persisting to IndexedDB.
- **Catalog Integrity:** All movement slugs in `program_config.json` and the UI must exist in the verified flat-floor allowlist derived from `@bryllim/workout-guide/manifest.json`.
- **Android Mobile UX:** Design for thumb-friendly, portrait-first mobile interaction with `navigator.wakeLock` during active sets and Web Audio API + `navigator.vibrate()` cues for rest timers.
