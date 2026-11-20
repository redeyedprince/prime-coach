# PRD.md — Offline Calisthenics PWA + Google Drive Coach Bridge

## 1. Product Overview
An **offline-first Android Calisthenics PWA** designed for travelers and home athletes training with zero equipment in a `2 m × 1 m` flat floor space. The app runs 100% offline in airplane mode for daily workouts and progression, while using a lightweight **Google Drive Coach Bridge** (`drive.file` scope) to exchange structured training logs (`workout_log.csv`, `user_profile.json`) and curated programming (`program_config.json`) with an external AI coach.

---

## 2. Target Platform & Technical Requirements
- **Stack:** Vite + React + TypeScript + Tailwind CSS + `vite-plugin-pwa` (Workbox) + `idb` (IndexedDB).
- **Offline Capability:** Full pre-cache of app shell, JS/CSS bundles, and all allowlisted local SVG frames (`frame-1.svg`, `frame-2.svg`, `frame-3.svg`) from `@bryllim/workout-guide` (`v1.0.0`) via Vite `import.meta.glob`.
- **Units:** Metric only (`kg`, `cm`).
- **Attributions:** Dedicated **About & Attributions** view crediting Everkinetic and Bryl Lim under CC BY-SA 4.0 (assets) and MIT (code).

---

## 3. Exercise Catalog & Verified Floor Allowlist
During setup, `@bryllim/workout-guide/manifest.json` is inspected to curate a verified flat-floor, zero-equipment allowlist (`2 m × 1 m` footprint; no bars, chairs, tables, or walls) across four movement patterns, ordered easiest to hardest:

1. **Push:** e.g., knee push-up → standard push-up → diamond push-up → pike push-up → archer/decline push-up (verified against manifest slugs).
2. **Pull / Posterior Chain:** e.g., prone cobra → superman → reverse snow angel → prone Y-T-W → floor scapular slide (verified against manifest slugs).
3. **Legs:** e.g., glute bridge → bodyweight squat → reverse lunge → single-leg glute bridge → split/pistol squat progression (verified against manifest slugs).
4. **Core:** e.g., dead bug → forearm plank → side plank → hollow body hold → v-up (verified against manifest slugs).

### Exercise Metadata Fields
Every allowlisted exercise includes:
- `slug`: Verified slug from `@bryllim/workout-guide/manifest.json`.
- `pattern`: `push` | `pull` | `legs` | `core`.
- `rung_index`: Integer position in the pattern's progression ladder.
- `bw_load_factor`: Bodyweight load multiplier (e.g., `0.49` for knee push-up, `0.64` for standard push-up).
- `impact_level`: `low` | `explosive` — when `quiet_hotel_mode: true`, explosive/jumping exercises are automatically substituted with controlled-tempo low-impact alternatives.
- `unit`: `reps` | `seconds`.
- `contraindicated_joints`: Tags matching `joint_restrictions` (`wrist`, `shoulder`, `elbow`, `knee`, `lower_back`) for safe filtering/substitution.

---

## 4. Onboarding, Settings & Day-1 Calibration (`user_profile.json`)
A 4-screen onboarding flow (with all fields editable later in **Settings**) saved to IndexedDB (`user_profile`):

1. **Screen 1 — Goal & Frequency**
   - `primary_goal`: `hypertrophy` | `strength` | `conditioning` | `skill`
   - `days_per_week`: `3` to `7`
2. **Screen 2 — Duration, Pacing & Cues**
   - `session_duration_minutes`: Slider `10`–`45` min
   - `pacing_mode`: `strict_time_cap` | `fixed_volume`
   - `cue_style`: `audio_and_vibrate` | `vibrate_only` | `silent_visual`
3. **Screen 3 — Travel & Joint Constraints**
   - `zero_equipment_only`: Default `true` (flat-floor mode), with optional **Available Equipment** overrides (`dumbbell` with `dumbbell_kg` in metric `kg`, and `pull_up_bar`) accessible from the Today screen, Onboarding, and Settings.
   - `quiet_hotel_mode`: Boolean toggle
   - `joint_restrictions`: Multi-select (`none`, `wrist`, `shoulder`, `elbow`, `knee`, `lower_back`)
4. **Screen 4 — Visual Tier Picker & Optional Biometrics**
   - Side-by-side 3-frame SVG previews for **Foundation**, **Intermediate**, and **Advanced** starting tiers.
   - Optional `bodyweight_kg` and `height_cm` numeric inputs.
5. **Step 5 — 10-Minute Day-1 Calibration**
   - Immediately launches 1 sub-maximal test set per movement pattern (`push`, `pull`, `legs`, `core`).
   - Instructs the user to stop at **`2 RIR`** (2 clean reps left in reserve).
   - Auto-slots the starting rungs and initial prescriptions in `program_config.json`.

---

## 5. Active Workout Player & Offline Fallback Rules
1. **Pre-Workout Readiness Gate**
   - 3-button check-in: `fresh` (`+1` working set), `normal` (`0` adjustment), `fatigued` (`-1` working set, minimum 1 set).
2. **Active Set View**
   - Loops the 3 local SVG frames (`frame-1.svg` → `frame-2.svg` → `frame-3.svg`) at the prescribed tempo (e.g., `3-1-1-0`).
   - Displays target reps or hold seconds and current set number.
   - Acquires `navigator.wakeLock` (with graceful fallback/re-acquire on visibility change) so the Android screen stays awake.
3. **Post-Set Logger**
   - Thumb-friendly stepper/counter for `completed_value`.
   - `rir` selector: `0`, `1`, `2`, `3+`.
   - `soreness_tag` chips: `none`, `wrist`, `shoulder`, `elbow`, `knee`, `lower_back`.
   - Optional `notes` text input.
4. **Rest Timer & Cues**
   - Auto-starts after each logged set using `rest_seconds` (+ `rest_adjustment_seconds`).
   - Triggers Web Audio API beeps and `navigator.vibrate()` pulses (respecting `cue_style`) at **3 seconds remaining** and **`0:00`**.
5. **Offline Autonomous Progression**
   - When offline without a recent Coach update, evaluate `auto_rules` in `program_config.json`.
   - If `hold_progression` is `false` and the user completes **2 consecutive sessions** (`level_up_consecutive_sessions`) where all working sets meet `target_value` with `rir >= 2` (`level_up_min_rir`), automatically add `+1 rep` (or `+5 seconds` for timed holds), up to `max_target` (or advance rung when appropriate).

---

## 6. Google Drive Sync Bridge & Data Contracts
### Sync with Coach Screen
- **Configurable OAuth Client ID:** Read from `VITE_GOOGLE_CLIENT_ID` or an in-app **Settings** input.
- **Authorization:** Google Identity Services (GIS) OAuth 2.0 token client requesting only `https://www.googleapis.com/auth/drive.file`.
- **Drive Initialization:**
  - Find or create the `Calisthenics_Coach` folder on Google Drive.
  - Create `user_profile.json`, `workout_log.csv`, and `program_config.json` if missing.
  - Persist permanent `fileId`s in IndexedDB.
- **In-Place Sync (`PATCH`):**
  - Overwrite `workout_log.csv` and `user_profile.json` in-place via `PATCH https://www.googleapis.com/upload/drive/v3/files/{fileId}?uploadType=media`.
  - Fetch the latest `program_config.json` via `GET https://www.googleapis.com/drive/v3/files/{program_config_fileId}?alt=media` and validate its schema before applying.
- **Manual Offline Fallbacks:**
  - **Paste Coach JSON** modal to validate and import an updated `program_config.json` offline.
  - **Export CSV via Share Sheet** button using `navigator.share` (with file/download fallback if unsupported).

### Outbound Ledger Schema (`workout_log.csv`)
```csv
date,session_id,readiness,bodyweight_kg,pattern,exercise_slug,set_number,target_value,completed_value,unit,rir,soreness_tag,notes
```

### Inbound Curation Rulebook Schema (`program_config.json`)
```json
{
  "meta": {
    "version": 1,
    "updated_at": "2026-11-18",
    "active_phase": "hypertrophy_foundation",
    "coach_summary": "Baseline calibrated; balanced 4-pattern floor rotation active."
  },
  "global_modifiers": {
    "deload_active": false,
    "volume_multiplier": 1.0,
    "rest_adjustment_seconds": 0,
    "quiet_hotel_mode": false,
    "restricted_tags": []
  },
  "weekly_split": [
    { "day": 1, "focus": ["push", "core"], "target_minutes": 25 },
    { "day": 2, "focus": ["pull", "legs"], "target_minutes": 25 },
    { "day": 3, "focus": ["push", "pull"], "target_minutes": 20 },
    { "day": 4, "focus": ["legs", "core"], "target_minutes": 25 },
    { "day": 5, "focus": ["skill", "mobility"], "target_minutes": 15 }
  ],
  "movement_tracks": {
    "push": {
      "active_slug": "push-up",
      "bw_load_factor": 0.64,
      "progression_ladder": ["knee-push-up", "push-up", "diamond-push-up", "pike-push-up"],
      "prescription": {
        "sets": 3,
        "min_target": 8,
        "max_target": 15,
        "unit": "reps",
        "target_rir_range": [1, 2],
        "rest_seconds": 90,
        "tempo": "3-1-1-0"
      },
      "auto_rules": {
        "level_up_consecutive_sessions": 2,
        "level_up_min_rir": 2,
        "min_conditioning_weeks": 3,
        "hold_progression": false
      }
    }
  }
}
```
