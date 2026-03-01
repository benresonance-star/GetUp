# Kettlebell / Bands / Bodyweight Timer App (PWA) — Spec v0.1
**Target:** React web app (iPhone + iPad first), dark-mode only, single unified interface with **Flow (Active) mode** and **Compose (Edit) mode**.  
**Design intent:** Minimal, Apple/Google-grade hierarchy. The interface *paces action* rather than presenting lists.

> You (Ben) will attach 2 reference images to this spec for visual intent:
> 1) **Active / Flow mode** (focus on current exercise)
> 2) **Compose / Edit mode** (reorder/insert/delete/edit)

---

## 1) Product Goals
- **Run a timed session** (e.g., 30/45 min) with a **prominent timer ring**.
- Use a **dashed ring** divided into **1 dash per minute** (e.g., 45 mins = 45 dashes).
- Ring is **phase-color-coded** (Warm-up / Main / Cool-down), showing progress across phases.
- **Single-screen experience**: user attention stays on **Current** exercise/set/superset, with only **Next** teased.
- **Fast logging**: weight/reps and quick notes with minimal taps.
- **History surfaced at point of action** (last weight/reps for same exercise or same session) but kept subtle.
- **Offline-first** with durable storage; robust enough for future features (time-based sets, supersets, video links, etc.).

---

## 2) Non-Goals (v0.1)
- Accounts, cloud sync, social, leaderboards.
- Full analytics dashboards.
- Complex periodization or auto-program generation.

---

## 3) Core UX Model
### 3.1 Modes (same screen, different “physics”)
- **Flow Mode (Active):** session running; wheel advances; only *Now* and *Next* shown.
- **Compose Mode (Edit):** session not running or long-press invoked; wheel becomes draggable; items editable inline.

### 3.2 “Wheel” Metaphor
Routine is a vertical wheel facing the viewer:
- **Current** card centered (dominant).
- **Next** card partially visible below (teaser).
- **Previous** optionally ghosted above during transitions.
- On set complete → UI slides upward; next becomes current.

---

## 4) Visual Design Requirements (dark mode only)
- Dark charcoal background, high-contrast typography, minimal borders.
- Use phase colours sparingly:
  - Warm-up: muted amber
  - Main: deep indigo
  - Cool-down: muted sage
- Avoid neon; colours should support hierarchy, not compete.
- **Timer ring is primary anchor**; everything else secondary.
- Large tap targets; thumb-friendly; iPad split layouts optional but should still feel single-surface.

---

## 5) Key User Stories
### Flow Mode
1. Start today’s session template (30/45 min).
2. See timer ring with phase dashes; see Current exercise details.
3. Tap **Start/Complete** to log a set quickly (weight/reps defaulted from last time).
4. Auto-advance to next set/exercise; show rest countdown if configured.
5. Pause/resume session.
6. Finish session; enter quick session note; save.

### Compose Mode
7. Create a new session template.
8. Rename session, change duration, adjust phase minutes.
9. Add exercise, delete exercise, reorder, insert between.
10. Edit exercise config (sets/reps/time, rest, superset grouping, default weight, video URL).
11. Duplicate a session template.

---

## 6) Information Architecture (no “management screens” required)
App may include simple entry points, but editing happens on the same surface:
- **Home minimal** (optional): Start last / choose template / create new.
- **Run Surface** (primary): Flow + Compose modes.
- If agent prefers absolutely single-surface: “template picker” can be a bottom sheet.

---

## 7) Data Model (versioned, migration-friendly)
Use TypeScript types; store in IndexedDB (Dexie recommended). Include schema version + migrations.

### Entities
#### SessionTemplate
- `id: string`
- `name: string`
- `totalMinutes: number` (e.g., 45)
- `phases: { warmupMin: number; mainMin: number; cooldownMin: number }`
- `items: RoutineItem[]` (ordered)
- `createdAt, updatedAt`

#### RoutineItem (ExerciseBlock)
Supports sets, time-based, and supersets.
- `id: string`
- `exerciseId: string`
- `phase: 'warmup' | 'main' | 'cooldown'`
- `scheme:`
  - `type: 'reps' | 'time' | 'mixed'`
  - `sets: number`
  - `targetReps?: number` or `repRange?: [min,max]`
  - `targetSeconds?: number`
- `restSeconds?: number` (default rest after each set)
- `supersetGroupId?: string` (same id = grouped)
- `defaultLoad?: { unit: 'kg' | 'bw' | 'band'; value?: number; bandLabel?: string }`
- `videoUrl?: string`
- `notes?: string`

#### Exercise
- `id: string`
- `name: string`
- `category: 'kettlebell' | 'band' | 'bodyweight' | 'mobility' | 'stretch'`
- `aliases?: string[]`
- `defaultVideoUrl?: string`

#### SessionRun (completed workout instance)
- `id: string`
- `templateId: string`
- `templateSnapshot: SessionTemplate` (store snapshot for audit/history)
- `startedAt, endedAt`
- `totalMinutesPlanned: number`
- `events: RunEvent[]`
- `sessionNote?: string`

#### RunEvent
Event sourcing keeps it robust for future revisions.
- `t: number` (timestamp ms)
- `type: 'RUN_STARTED' | 'RUN_PAUSED' | 'RUN_RESUMED' | 'RUN_FINISHED' | 'SET_STARTED' | 'SET_COMPLETED' | 'ITEM_SKIPPED' | 'NOTE_ADDED'`
- `payload:`
  - for sets: `routineItemId, setIndex, load?, reps?, seconds?, rpe?, note?`

### Derived Views (computed)
- Last performance by `exerciseId` (global)
- Last performance by `templateId + exerciseId` (per template)
- Suggestions (optional) based on last performance (do not over-automate)

---

## 8) Timer System (must be iOS Safari resilient)
### Requirements
- Session countdown based on absolute timestamps (not interval ticks).
- Handle backgrounding: on resume, recompute remaining from `now - startedAt - pausedDurations`.
- Separate concepts:
  - **Session timer** (overall)
  - **Rest timer** (post set)
  - **Set timer** (for time-based sets)
- The UI ring maps **planned minutes** to dashes and phase colours.
- Progress dash fill should reflect elapsed planned time.

### Pause
- Pausing freezes session time and any rest/set timers.
- Clear state label “Paused”.

---

## 9) UI Specification (Single Surface)
### 9.1 Global Layout (both modes)
- Top: session title + duration (subtle)
- Center top: **Timer Ring** with large remaining time
- Left/right of ring: Pause / Finish buttons (compact)
- Middle: **Wheel stack**
  - Current card (dominant)
  - Next card (teaser)
- Bottom: single primary action button, context-sensitive:
  - Flow: `Start Set` / `Complete Set` / `Start Timed Set` / `Skip`
  - Compose: `Done`

### 9.2 Flow Mode — Current Card Content
- Exercise name (large)
- Set position (e.g., “Set 2 of 4”)
- Target (e.g., “16 kg × 6” or “40s”)
- Optional micro-history (subtle): “Prev · 16kg” or last reps
- Video icon if available (opens in modal/webview)

### 9.3 Compose Mode — Editable Wheel
- Drag to reorder (whole row draggable)
- Swipe to delete
- Tap name to rename (inline)
- Tap scheme to edit (inline popover / sheet)
- `+ Add Exercise` placeholder at end and insertion affordance between items
- Phase indicated by a thin colour tick or label; phase assignment editable

---

## 10) Gestures & Interaction Rules
### Enter Compose Mode
- Long-press timer ring (~600ms) OR “Edit” button when not running.
- Visual change: ring becomes neutral + subtle grid, wheel becomes scrollable.

### Reorder
- Drag item vertically; wheel moves with finger.

### Insert
- Tap between items (“+”) or pull-to-insert affordance.

### Delete
- Swipe left → reveal delete; confirm optional (agent chooses).

### Flow Advance
- Completing a set triggers wheel advance animation:
  - 220–260ms, no bounce
  - previous fades out, next slides to center

---

## 11) Exercise Types & Supersets
### Reps-based
- sets × reps, optional rep range

### Time-based
- sets × seconds, with set timer UI
- logging stores seconds completed (default = target)

### Superset
- Consecutive items share `supersetGroupId`
- Flow presents superset as “Current” bundle:
  - shows A then B within the same set index, or agent’s preferred structure
- Rest can occur after each exercise or after completing the group (configurable later; v0.1 can default rest after group)

---

## 12) Tech & Architecture Constraints
- React + TypeScript (Next.js acceptable if agent prefers; PWA-friendly).
- Modular structure:
  - `domain/` (types, reducers/state machines, selectors)
  - `storage/` (IndexedDB + migrations)
  - `ui/` (presentational components)
  - `features/run/` (flow state, timers, wheel)
  - `features/compose/` (editing interactions)
  - `lib/time/` (timer calculations, background resilience)
- State management: agent choice (Zustand/Redux/XState). Must support:
  - deterministic timer state
  - event-sourced run log
  - derived history selectors

---

## 13) Accessibility & Ergonomics
- Tap targets ≥ 44px.
- Large text support; do not break layout.
- Haptics optional (web may be limited); avoid reliance.
- Color is not the only cue (phase labels as text/position as well).

---

## 14) Acceptance Criteria (v0.1)
- Create/rename/delete/reorder session templates.
- Add/edit/delete/reorder exercises within a template in Compose mode on same surface.
- Start a session; timer ring shows phase-coloured minute dashes.
- Flow shows only Current + Next; auto-advance on set completion.
- Log weight/reps quickly with defaults from last time.
- Pause/resume works; backgrounding does not corrupt time.
- Finish session saves SessionRun with events and a session note.
- Works smoothly on iPhone Safari and iPad Safari; dark mode only.

---

## 15) Seed Content (for first-run)
Provide at least:
- 2–3 session templates (30 and 45 min variants)
- 15–25 exercises across KB/Band/BW/Mobility
- Include optional `videoUrl` placeholders

---

## 16) Future Enhancements (design must allow)
- Per-exercise video thumbnails + form cues
- Rest timer customization and smart defaults
- Auto-suggestions (progression), PR markers
- Cloud sync + multi-device
- Export (CSV/JSON)
- More complex supersets / circuits / EMOM / intervals
- Apple Watch companion (later; not in scope)

---

## 17) Agent Instructions (Cursor)
- Use this spec + the 2 attached reference images as the source of truth for interaction/visual intent.
- Prioritize **single-surface UX** and **timer robustness**.
- Build a thin vertical slice first:
  1) Template + routine item editing (Compose mode)
  2) Run engine + timer ring + flow wheel (Flow mode)
  3) Storage + history defaults
- Keep code modular and migration-ready; avoid premature features.

---
**End of spec.**