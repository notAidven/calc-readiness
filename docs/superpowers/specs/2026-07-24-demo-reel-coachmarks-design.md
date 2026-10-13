# Onboarding Demo Reel (pop-up "video") + Contextual Coach-Marks — Design

- **Date:** 2026-07-24
- **Owner:** Evan (game / city lane)
- **Status:** Approved design → implementation
- **Branch:** `evan/demo-reel-coachmarks` (off `integration`)
- **Supersedes:** the in-scene scripted demo from
  `2026-07-24-onboarding-demo-design.md` (that ghost sequence is replaced by the
  framed reel below; the `useDemoScript` state machine + real building models are
  reused).

> **⚠ Annotation — Evan, 2026-07-28: the reel's narrator changed. It is now Oru, era one's
> advisor, not the CityGuide.** Every "CityGuide" below (the §"Current state" inventory and
> the non-goal at the end) refers to the character that has since been replaced; the reel's
> *structure* — beats, timings, captions, chrome, the `aria-live` caption region and the
> reduced-motion path — is unchanged and stands as written. One beat's pose moved: **`unlock`
> used the guide's `cheer`, and now uses Oru's `point`**, because era one's advisor has no
> celebration pose (`D-ERA28`, `2026-07-27-era-progression-design.md` §5.4). The
> congratulation on that beat is carried by the reward chip and the mastery star, which the
> design already put there.

## Intent

A brand-new learner lands on an **empty island** after the diagnostic with no idea
what to do. We replace the current in-scene scripted demo (a scripted ghost sequence
played over the live scene) with two things:

1. **A framed "video" reel** — a self-contained pop-up, framed like a video player,
   that plays a ~20s highlight montage of the core loop built from the game's OWN
   visuals (real building models + UI) over an island backdrop. It plays **once** on
   first run, is always **skippable**, and never touches the learner's real city.
2. **Contextual coach-marks** — small anchored tooltips that appear at the right
   moment during the learner's real first playthrough, each shown **once** then
   remembered, triggered by real game state.

On finish/skip the reel hands off to the live city and **kicks off the coach-marks**.

## Current state (what exists on `integration`)

- `apps/web/src/city/onboarding/` ships the first-run demo: `useDemoScript` (a timed
  beat state machine + the `cr.onboarding.demoSeen` flag helpers + `DEMO_NODE_ID`),
  `OnboardingDemo` (a presentational overlay: CityGuide narration, a lesson card, an
  unlock flash, a `GhostCursor`, a Skip), and `GhostCursor`.
- `CitySurface` decides eligibility (`enableOnboardingDemo`, first run, diagnostic
  unlocked nothing), runs `useDemoScript`, **mirrors each beat into the live decorative
  `CityScene`** (real `GhostBuilding`/`PlacedBuilding`), and hides the HUD while it runs.
- Reusable visuals: `resolveBuildingModel` (per-node `site`/`construction`/`built`
  GLBs) + `BuildingThumb` (a lean on-demand R3F thumbnail), `CityGuideCharacter`
  (the advisor + moods), reward-flash chrome, and `useReducedMotion`.
- HUD anchors already carry refs: the **Build** button (`buildBtnRef`), the
  **Buildings** disclosure (`buildingsBtnRef`), the placed-building **callout**
  (`calloutRef`), and the 3D **viewport** (`viewportRef`).

## Part C — The reel (pop-up "video")

### 1. Trigger & lifecycle

- Same gate as today: enabled for the LIVE city only (`enableOnboardingDemo`, which
  `App` passes as `entry === null`), first run only, and **only when the diagnostic
  unlocked nothing** (`unlockedNodeIds.length === 0`); a test-out pretest shows
  `UnlockCelebration` instead and the reel is marked seen so it never also pops.
- Once-only via the **reused** `localStorage` flag `cr.onboarding.demoSeen` (read once
  at mount; finishing/skipping writes it). Returning learners skip it.
- Always-visible **Skip** and a **Play/Pause** toggle; on finish or skip we set the
  flag, unmount the reel to the live (empty) city, and **start the coach-marks**.

### 2. The frame (video-player chrome)

A bounded, centered pop-up (`role="dialog"`, labelled), NOT an over-the-whole-scene
overlay — the live (empty) scene simply sits behind it. Chrome:

- **Title** — a short reel title ("How your city grows").
- **Screen** — the montage stage (below), letterboxed over an island backdrop.
- **Progress bar** — fills with beat progress (`(index + 1) / total`), `aria-hidden`
  (the caption's live region carries meaning).
- **Controls** — a **Play/Pause** toggle (pauses/resumes the beat timer) and **Skip**.

### 3. Script (~20s, 4 beats, real models + UI, CityGuide caption per beat)

Reuses `useDemoScript` (beats renamed to the reel's workflow). Each beat swaps the
real demo-building model stage + a flourish + the caption (in an `aria-live` region):

- **Place** — a ghost building drops onto a plot → Foundation (`site` model; a ghost
  cursor glides in). Caption: *"Drop a building on an open plot."*
- **Learn** — click it → the CityGuide lesson card opens (`site` model + lesson card).
  Caption: *"Click it to open the lesson and learn the skill."*
- **Build** — the building transforms Foundation → scaffold → built with a mastery
  star (`construction` → `built` model + star). Caption: *"Finish the lesson, then
  practice to build it up."*
- **Unlock** — a new building unlocks with a reward flash (`built` model + reward flash
  + a newly-unlocked building chip). Caption: *"Complete it to unlock new buildings!"*

The demo-building model is a real D1 node (`DEMO_NODE_ID`, Public Library) resolved
from `buildingAssets`; the unlock chip names a second real node — display only, never
placed into the real city.

### 4. The screen stage (real building models)

`ReelStage` renders the montage screen:

- **With WebGL** (the live app): a lean, on-demand R3F canvas (BuildingThumb's model
  grammar — clone the GLB, revive flat-shaded materials, `frameloop="demand"`, auto-fit)
  showing the demo building's REAL GLB at the current beat's stage.
- **Without WebGL** (headless tests / no context): a static building silhouette
  carrying a `data-stage` attribute so beats are assertable. WebGL is feature-detected
  and error-bounded (fail-closed to the static frame), mirroring `UnlockCelebration`.

### 5. Non-destructive staging

- The reel is **demo-only local state**: it drives its own bounded stage + overlay and
  **never** calls any `citySession` writer (`placeSkill`, `advanceMasteryDev`,
  `markLessonTaught`, `setStageDev`) and never mutates `placements`/`node_states`.
- Because the reel is bounded (its own frame), `CitySurface` **no longer mirrors beats
  into the live `CityScene`** — the live scene renders the learner's real (empty) city
  behind the pop-up. At hand-off the reel unmounts untouched.

## Part D — Contextual coach-marks (live play)

After the reel (or skip), as the learner plays, small anchored tooltips surface the
next thing to do — each shown **once**, then dismissed + remembered.

### 1. The hints (ordered; each once; state-triggered; anchored)

| id       | Copy                                                        | Shows while (state)                              | Anchor          |
| -------- | ----------------------------------------------------------- | ------------------------------------------------ | --------------- |
| `place`  | "Drag a building onto an open plot."                        | nothing placed yet (`placedCount === 0`)         | Build button    |
| `learn`  | "Click your building to start its lesson."                  | placed something, no lesson started              | viewport (map)  |
| `build`  | "Finish the lesson + check, then practice to build it."     | a building is under construction (teaching/practice) | callout → viewport |
| `master` | "Master it to unlock new buildings." (optional)            | a building is complete but not all mastered      | Buildings list  |

The controller shows the **first hint, in order, that is currently relevant and not
yet seen**. A hint is marked seen when (a) the learner **dismisses** it ("Got it"),
or (b) they complete its action so a later hint becomes relevant (the superseded hint
is remembered so it never nags again). Seen state persists per-hint in `localStorage`
(`cr.coach.<id>`), so each appears at most once across sessions.

### 2. Architecture

- `coachMarksCore.ts` — the pure core: the ordered hint list (id, copy, anchor,
  `isRelevant(state)`), the `CoachState` shape, the `nextCoachMark(state, seen)`
  selector, and the per-hint `localStorage` helpers (`hasSeenCoachMark` /
  `markCoachMarkSeen` / `loadSeenCoachMarks`). (Named `coachMarksCore` rather than
  `coachMarks` so it never case-collides with `CoachMarks.tsx` on case-insensitive
  filesystems.)
- `Tooltip.tsx` — a small anchored, focusable, dismissible tooltip (`role="dialog"`,
  labelled, with a "Got it" dismiss); positions itself against its anchor element's
  rect and re-measures on resize/scroll; `data-anchor` names the anchor.
- `CoachMarks.tsx` — the controller `CitySurface` mounts: it takes the derived
  `CoachState`, the anchor refs, `active`, and `reducedMotion`, computes the current
  hint, marks superseded hints seen, and renders the `Tooltip` for the current hint.
- `CitySurface` derives `CoachState` from its existing view model (placed count,
  any-lesson-started, any-in-construction, any-complete, all-mastered), passes the HUD
  anchor refs, and mounts `<CoachMarks>` gated to LIVE play only (ready, reel not
  showing, no lesson/shop/storm/reward overlay open).

### 3. The hand-off

The reel and the coach-marks are mutually exclusive by the same gate: while the reel
is active, `CoachMarks` is inactive; when the reel finishes/skips it unmounts, the gate
opens, and the first relevant unseen coach-mark (normally `place`, over the Build
button on the empty island) appears — the reel "kicks off" the coach-marks purely by
handing control back to the live city.

## Accessibility / reduced-motion

- **Reel**: `role="dialog"` + label; Skip/Play focusable and focus lands inside on
  open; captions in an `aria-live="polite"` region; the model canvas + flourishes are
  `aria-hidden`. Under reduced motion: no ghost-cursor glide / model fly-ins — the
  beats still step on the timer as **static frames** and the caption still updates.
- **Coach-marks**: each `Tooltip` is a labelled, focusable dialog with a keyboard
  dismiss (`Esc`) and a "Got it" button; anchored but never trapping the page. Under
  reduced motion the tooltip appears without the pop/slide animation (via a
  `data-reduced-motion` hook), matching the rest of the city.
- Both are **first-run gated** and **non-destructive** (never write `citySession`).

## Testing (jsdom)

Reel:

- **Gating**: shows on first run (flag unset, `enableOnboardingDemo`, no unlocks); not
  on the second run (flag set); never when the pretest unlocked buildings (reward
  instead, reel marked seen).
- **Beats**: with fake timers the caption + stage `data-stage`/`data-beat` step
  place → learn → build → unlock, then `onDone` fires; **progress bar** advances.
- **Play/Pause**: pausing holds the beat (no advance); resuming continues.
- **Skip → hand-off → coach-marks**: Skip sets `cr.onboarding.demoSeen`, unmounts the
  reel, and the first coach-mark appears.
- **Non-destructive**: running/skipping calls no session writer and leaves an empty
  `load()` unchanged.
- **Reduced motion**: no ghost cursor; beats still step + narrate.

Coach-marks:

- **Selector** (`coachMarksCore.ts`): `nextCoachMark` returns the right hint per
  state, respects order, and skips seen hints (show-once).
- **Controller** (`CoachMarks.tsx`): renders the state-triggered hint anchored to the
  right element (`data-anchor`); marks it seen on dismiss AND on progression (never
  re-shows); shows the next hint when its state arrives; reduced-motion hook set.

## Non-goals / out of scope

- No change to the diagnostic, seeding, the unlock rule, mastery, or `UnlockCelebration`.
- Not a redesign of the CityGuide advisor.
- No gated/interactive first lesson — the reel is passive + skippable, and the
  coach-marks are dismissible hints, not a forced tutorial.

## Verification

`npm run check` (format / lint / typecheck / unit / browser / graph) + `npm -w apps/web
run test` (jsdom) + `npm -w apps/web run build` green; the tests above added; a
screenshot of the reel mid-beat + a coach-mark if the browser cooperates (headless
WebGL flakiness is not a blocker).
