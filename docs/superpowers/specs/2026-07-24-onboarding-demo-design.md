# First-Run Onboarding Auto-Demo — Design

- **Date:** 2026-07-24
- **Owner:** Evan (game / city lane)
- **Status:** Approved design → implementation
- **Branch:** `evan/onboarding-demo` (off `integration`)

## Intent

A brand-new learner lands in an **empty island** with no idea what to do. We want a
short, auto-playing demo that **shows off the core loop** — drop a building, tap it to
learn a skill, finish it to build it up and unlock more — and then hands control back:
**"Now you try!"** It plays **once**, is always **skippable**, and it never touches the
learner's real city.

## Current state (what exists)

- `apps/web/src/App.tsx` gates the city behind the title screen; `handlePretestComplete`
  seeds the dev session and bumps `cityEpoch` to remount `CitySurface`. The diagnostic
  runs in a takeover overlay (`SurfaceOverlay`, `entry === "diagnostic"`).
- `apps/web/src/city/CitySurface.tsx` renders the 3D city (`CityCanvasHost` → `CityScene`
  with `GhostBuilding` + `PlacedBuilding`), the HUD (Buildings / Build / ☰ Menu / Town),
  and — after a test-out pretest (`unlockedNodeIds.length > 0`) — the `UnlockCelebration`
  reward hand-off.
- The island starts **empty** in the live session (`citySession.ts`); the player drops
  each building where they like. The demo has to demonstrate this over that empty island.
- Reusable visuals already exist: `GhostBuilding` / `PlacedBuilding` (per-node build
  stages), `CityGuideCharacter` / `AdvisorNpc` (the friendly hard-hat advisor + speech
  bubble), and reward-flash chrome (`city-reward-arc`, `unlock-reward-burst`).

## Design (Approach A: scripted ghost sequence, CityGuide-hosted, staged & non-destructive)

### 1. Trigger & lifecycle

- Enabled for the **live city only** via a new `CitySurface` prop
  `enableOnboardingDemo` that `App` passes as `entry === null` (so it never auto-plays
  behind the diagnostic takeover); default `false` keeps it out of unrelated tests.
- Once-only via a `localStorage` flag **`cr.onboarding.demoSeen`** — returning learners
  skip it. The flag is read once at mount; finishing or skipping writes it.
- **Overlap rule (no double overlay):** the demo plays on first entry only when the
  diagnostic unlocked **nothing** (`unlockedNodeIds.length === 0`) — the empty-city case,
  i.e. the learners who most need it. If the pretest **did** unlock buildings, the
  celebratory `UnlockCelebration` hand-off plays instead and the demo is **marked seen**
  (it does not also pop). In the canonical flow this is "first city entry after the
  diagnostic."
- Always-visible **Skip**; on finish or skip we set the flag and hand off to the live city.

### 2. Script (~4 short beats, hosted by the CityGuide advisor via a speech bubble/caption)

The advisor's line lives in an `aria-live` region so each beat is announced.

- **Place** — a ghost building sits on an open plot (a ghost cursor glides to it), snapping
  ready to drop. CityGuide (talk): *"Drop a building on any open plot."*
- **Learn** — the building drops in as a **Foundation**; the cursor taps it and a small
  lesson card opens. CityGuide (talk): *"Tap it to learn the skill. A short lesson, then a
  quick check."*
- **Build & unlock** — the building advances (construction → built with a star) and a
  reward flash announces a newly unlocked building. CityGuide (cheer): *"Practice to finish
  it, and unlock new buildings!"*
- **Close** — CityGuide (wave): *"Now you try!"* → the demo fades and unmounts to the live
  (empty) city with controls enabled.

### 3. Architecture

- **`useDemoScript`** (`city/onboarding/useDemoScript.ts`) — a small timed state machine
  over the beats (`place → learn → build → close`) that advances on `window.setTimeout`
  and exposes `{ beat, index, total, skip }`; it calls `onDone` after the last beat and
  cancels its timers when inactive or unmounted. Also home to the flag helpers
  (`hasSeenOnboardingDemo` / `markOnboardingDemoSeen`) and the demo building id.
- **`OnboardingDemo`** (`city/onboarding/OnboardingDemo.tsx`) — the self-contained,
  presentational overlay: the CityGuide advisor + speech bubble narration (reusing
  `CityGuideCharacter`), the lesson card (Learn), the unlock reward flash (Build), a
  `GhostCursor`, and the always-focusable Skip.
- **`GhostCursor`** (`city/onboarding/GhostCursor.tsx`) — a decorative pointer positioned
  per beat by CSS; not rendered under reduced motion.
- **`CitySurface`** hosts the demo: it decides eligibility, calls `useDemoScript`, renders
  `<OnboardingDemo>` above the stage, hides the live HUD while the demo runs, and
  **mirrors the active beat into the decorative `CityScene`** so the *real* `GhostBuilding`
  (Place) and `PlacedBuilding` (Learn = site, Build/Close = built + star) render the demo
  building over the real island — genuine reuse of the shipped visuals, correct camera and
  lighting, zero duplicated scene. On hand-off the mirror clears and the HUD returns.

### 4. Non-destructive staging

- The demo is **demo-only local state**: it drives the *decorative* scene props and the
  overlay, and **never** calls any `citySession` writer (`placeSkill`, `advanceMasteryDev`,
  `markLessonTaught`, `setStageDev`) and never mutates `placements`/`node_states`.
- At hand-off the demo unmounts; the learner's real (empty) city is untouched — it
  demonstrates *over* the scene without placing anything real. The build model shown is
  resolved from `buildingAssets` for a real D1 node (Public Library / `NUM.F`) purely for
  display.

### 5. Accessibility / reduced motion / skip

- Skip is always focusable and receives focus on open (the HUD is hidden, so focus stays in
  the demo). The overlay captures pointer events so the hidden city cannot be clicked.
- Narration renders in an `aria-live="polite"` region; the advisor art is `aria-hidden`.
- Under `prefers-reduced-motion` (media query or the `reducedMotion` prop): **no** cursor
  gliding / building fly-ins — the `GhostCursor` is not rendered, `GhostBuilding` /
  `PlacedBuilding` already snap instantly, and the beats simply step via the captions on
  the same timer.

### 6. Testing (jsdom)

- **Shows on first run** (flag unset, `enableOnboardingDemo`, no unlocks) and **not on the
  second** (flag set) — and never when the pretest unlocked buildings (reward instead).
- **Advances beats with mock timers** (`vi.useFakeTimers`): the narration + `data-beat`
  step place → learn → build → close, then `onDone` fires.
- **Skip** sets the `cr.onboarding.demoSeen` flag and hands off (overlay gone, HUD back).
- **Never mutates `citySession`:** running/​skipping the demo calls no session writer and
  leaves `load()` (empty placements, mastery 0) unchanged.
- **CityGuide bubbles render per beat** (the advisor line for each beat is present).
- **Reduced-motion path:** with `reducedMotion`, no ghost cursor renders; beats still step
  and narration still updates.

## Non-goals / out of scope

- No change to the diagnostic, seeding/pre-seeding, the unlock rule, mastery, or the
  `UnlockCelebration` reward itself.
- Not a redesign of the CityGuide advisor (a separate `evan/cityguide-redesign` branch);
  the demo uses whatever CityGuide ships on `integration`.
- No interactive tutorial / gated first lesson — this is a passive, skippable demo only.

## Verification

`npm run check` (format / lint / typecheck / unit / browser / graph) + `npm -w apps/web
run test` (jsdom) + `npm -w apps/web run build` green; §6 jsdom tests added; a screenshot
of the demo mid-beat if the browser cooperates (headless WebGL flakiness is not a blocker).
