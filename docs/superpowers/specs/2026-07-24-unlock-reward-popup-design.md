# Diagnostic Unlock Reward Popup — Design

- **Date:** 2026-07-24
- **Owner:** Evan (game / city lane)
- **Status:** Approved design → ready for implementation plan
- **Branch:** `evan/unlock-reward-popup` (off `integration`)

## Intent

When a learner finishes the diagnostic, the skills they pass (`placement_estimate >= 2`)
"test out" — their buildings drop into the city already built, and they skip that
skill's lesson. Today this moment is a modest carousel popup (`UnlockCelebration`,
`e523451`) that lists the unlocked buildings and then dumps the learner into the
build menu ("choose a skill").

We want this to be a **distinct, rewarding reward screen** that clearly tells the
learner the **full picture**: exactly which topics/buildings they can **skip** (tested
out, build now, no lesson) versus which they **still need to learn** (build by
finishing the lesson) — with **building images** for both — before they enter the city.

## Current state (what exists)

- `apps/web/src/city/CitySurface.tsx` → `UnlockCelebration` (function, ~1804+):
  a `coc-popup`/`coc-card` dialog showing a horizontal **carousel** of the unlocked
  buildings' live `BuildingThumb` 3D models, one at a time, with prev/next + dots and
  arrow-key paging. Copy: "You've unlocked N buildings! … pre-built (at 0 stars) …".
  Primary CTA opens the build menu; ✕/Esc dismiss.
- Trigger: `unlockCelebrationOpen` is true on city mount when `unlockedNodeIds.length > 0`
  (fed from `App.handlePretestComplete` → `CitySurface` prop `unlockedNodeIds`).
- Data available: `unlockedNodeIds` (the skips); the full D1 set is
  `getNodesByScope("mvp")` (a.k.a. `D1_NODE_IDS`); topic names via
  `apps/web/src/diagnostic/skillNames.ts`; building names via `buildingName()`.

## Design (Approach A: one reward card, two sections)

### 1. Trigger & flow

- Unchanged entry: shown once on city mount after a pretest that tested out **≥1**
  building. If **0** tested out, no reward popup (straight to the city, as today).
- If **all** skills tested out, the "Still to learn" section simply hides.
- Primary CTA **"Start building"** → dismiss + open the build menu (`setShopOpen(true)`).
- Corner ✕ and `Esc` → dismiss to the city.

### 2. Layout & copy

Reuses the shared `coc-popup` + `coc-card` chrome, restyled richer/celebratory.

- **Banner:** micro-label "Diagnostic complete" + headline
  **"You tested out of {skip} of {total} skills!"** and a sub-line
  **"{skip} buildings free · {learn} to learn."**
- **Section 1 — "Ready to build · skip the lesson"** (the tested-out skills): a grid of
  reward cards, each = **live building image** (`BuildingThumb`) + topic name (e.g.
  "Signed Numbers") + a gold **✓ "No lesson needed"** badge.
- **Section 2 — "Still to learn"** (remaining D1 skills): a grid of reward cards, each =
  **dimmed/blueprint building image** (static) + topic name + a **📖 "Build by finishing
  its lesson"** badge. Muted styling to contrast with Section 1.
- Empty sections are hidden (e.g., all tested out → no Section 2).
- Celebratory polish: gold accents, a subtle burst/shine on open; ✓ badges pop.

### 3. Data flow / wiring

- `CitySurface` computes **`learnNodeIds`** = `getNodesByScope("mvp")` minus
  `unlockedNodeIds`, and passes both lists (with names) to the popup.
- Topic labels from `skillNames.ts`; building labels from `buildingName()`.
- No change to the trigger, the pre-seeding (`seedFromPlacement` / `placeSkill`), or the
  server/dev hand-off — this is a presentation change over data we already have.

### 4. Component structure

- **Extract** the popup out of the 1800+-line `CitySurface.tsx` into its own
  `apps/web/src/city/UnlockCelebration.tsx` (targeted cleanup; the file is too large).
- A small reused **`BuildingRewardCard`** (`variant: "skip" | "learn"`): thumbnail +
  topic name + building name + badge. Live thumbnail for `skip`; static/dimmed for `learn`.
- `CitySurface` imports and renders `<UnlockCelebration skipNodeIds… learnNodeIds… />`.

### 5. Performance / accessibility / reduced motion

- **Perf:** render the **skip** group's thumbnails **live** (`BuildingThumb`; ≤6, the
  reward focus). Render the **learn** group **static/dimmed** (glyph or a single
  non-animated thumbnail) to avoid many live WebGL canvases. `enableThumbnails`
  (wired to `enableCanvas`) stays off in headless/tests → glyph fallbacks.
- **A11y:** `role="dialog"` + `aria-modal`, labelled by the headline; primary CTA
  autofocus; focus trap (reuse `CELEBRATION_FOCUSABLE`); `Esc` closes; each section is a
  labelled list; badges carry accessible text; a polite live region announces the summary.
- **Reduced motion:** no burst/shine/transition under `prefers-reduced-motion`.

### 6. Testing (jsdom)

- Summary renders "{skip} of {total}".
- One **skip** card per `unlockedNodeIds` node (gold ✓ badge) and one **learn** card per
  remaining D1 node (📖 badge), with correct topic + building names.
- All-tested-out case → "Still to learn" section absent.
- Primary CTA opens the build menu; `Esc`/✕ dismiss.
- Dialog a11y roles present; thumbnails fall back to glyphs when `enableThumbnails` is off.

## Non-goals / out of scope

- No change to diagnostic scoring, the unlock rule (`placement_estimate >= 2`),
  pre-seeding, mastery, or the 0-star test-out behavior.
- No server-path persistence work (unchanged; separate follow-up).
- Not the broader "city depth" feature (separate spec/plan cycle to follow).

## Verification

`npm run check` (format/lint/typecheck/unit/browser/graph) + `npm -w apps/web run test`
(jsdom) + `npm -w apps/web run build` green; live screenshot of the reward popup showing
both sections with building images.
