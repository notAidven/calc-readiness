# Immersive City Shell Spec (game-first shell for the D1 city-builder)

_The design of record for how the D1 city-builder is **presented**: a game-first,
full-bleed, immersive city shell rather than a small canvas boxed inside product
chrome. This is a **rendering / shell** spec — it changes how the existing view
model is surfaced (`apps/web`), not what the game means. It builds **against** the
authoritative `docs/superpowers/specs/Game_Architecture_Blueprint.md` and
`docs/superpowers/specs/D1_City_Builder_Design_Spec.md`, and behind those against
`docs/Contracts.md` (§1 state, §3 write-mapping, §8 economy),
`docs/Mastery_Scoring_Spec.md`, and `docs/Architecture.md` §7. **Where this doc
disagrees with any of those, those win.**_

**Status:** design locked for the Evan lane shell; MVP-safe first slice built.
**Owner:** Evan (`apps/web/src/city`; `@cr/game` stays pure/framework-free).
**Scope:** the presentation shell around the existing D1 `CityViewModel`. No new
economy, no mastery/placement writes, no cross-lane engine integration.

> ## RENDERING-STACK CORRECTION (2026-07-27)
>
> This spec was written against **PixiJS 2.5D** with a pan/zoom/small-rotate camera.
> The city was migrated to **React Three Fiber** (React + three.js / WebGL) and now
> renders **true 3D** geometry from authored GLB models. §1–§4, §11, §12, and §13 have
> been corrected to describe what ships; the *shell design* they specify — full-bleed
> world, diegetic overlays, the DOM mirror as semantic source of truth, the MVP-safe
> fence — is unchanged and still the design of record. The camera in particular is no
> longer a `camera.ts` reducer over a Pixi transform: it is drei `MapControls` with a
> **locked polar tilt and a free 360° azimuth** (`three/orbitCamera.ts`,
> `three/CityScene.tsx`). `camera.ts`, `cityScene.ts`, and `CityCanvas.tsx` **do not
> exist**; their replacements are named in §13.

---

## 1. Why this exists (problem + thesis)

Today the city renders inside a productivity layout — a top bar, a left rail of
product surfaces, a page-intro headline, and the city canvas penned into a
`16 / 10` box beside a column of side-panel cards. It reads as a *dashboard that
contains a game*, not a game. For a cozy city-builder whose entire pitch is "you
**build a city** by learning," the city should be the screen.

**Thesis:** the living 3D city fills the viewport; the player pans, zooms, and orbits
a village camera around it; everything else (building detail, storm, progress, cosmetic
teaser, ways into Survey/Lessons/Checker) is a **diegetic overlay anchored in the
world**, not surrounding chrome. Beneath the visuals, the keyboard-navigable DOM
mirror stays the semantic source of truth, so the immersion never costs
accessibility.

This shell is deliberately **MVP-safe**: it is a richer *presentation* of the
exact same pure `CityViewModel`. It adds no game rules, no writes, and no economy.

---

## 2. Experience pillars

- **The world is the screen.** Full-bleed 3D city; chrome is absorbed into a
  minimal in-world HUD and diegetic overlays.
- **Calm, not busy (anxious-learner friendly).** The camera glides; ambience
  drifts slowly; nothing flashes, nags, or punishes. Motion is optional and
  reduced-motion-aware.
- **Legible first, pretty second.** Every state has a word label and a DOM
  equivalent; the art is an enhancement layered over a fully operable DOM mirror.
- **Diegetic, not modal-heavy.** Detail, storm, and progress live *in* the world
  frame as anchored glass cards, not a stack of side panels.
- **Seams, not entanglement.** In-world lesson/diagnostic hosting is a **clean
  stub behind an interface** (Evan-lane only for now); deep cross-lane hosting is
  a future, team-aligned step.

---

## 3. Full-bleed world

- The React Three Fiber `<Canvas>` fills the viewport (`position: fixed; inset: 0`).
  The renderer resizes to the container (R3F resizes to its parent); there is no
  fixed `16/10` box and no outer page scroll while the city is active.
- The old boxed chrome is removed/absorbed: the top bar, the left product rail,
  the page-intro headline, and the right-hand card column are gone as layout.
  Their *functions* survive as in-world HUD (see §5) and in-world entry points
  (see §6).
- **World layout.** D1 sits at the world origin as the one populated
  neighborhood (its six skill buildings on the free-build island grid — the player
  places them; roads = registry prereq edges). The other eight domains render as **distant, dimmed, locked
  outskirts** arranged on a ring around D1 — reachable by panning the camera, but
  non-interactive scenery (per D1 spec §2.1 and Blueprint §6). Panning out toward
  a district shows "where the city will grow," never a dead "coming soon" wall.
- **Fail-closed.** Buildings now load **authored GLB models** per node and per
  construction stage (`buildingAssets.ts`), so this is no longer "no external
  assets" — but the fail-closed rule is unchanged and is enforced at two levels: a
  missing stage GLB falls back to shared procedural foundation/scaffold geometry (or
  an empty pad), and if WebGL is unavailable the shell renders the existing
  deterministic DOM backdrop and the DOM mirror. Nothing blanks.

---

## 4. Village camera: locked tilt, free 360° orbit

A calm village camera over the world (the Clash-of-Clans read, not a free-flying 3D
camera). It is a **view transform only**; it changes nothing about state, mastery, or
the checkpoint.

- **Pan:** pointer drag on the world, and keyboard **arrow keys / WASD** when the map
  viewport is focused. Selecting a building (canvas click or the DOM roster) gently
  **focuses** the camera on it. Drag-to-pan is suspended while a placement ghost or
  road paint is active, so the drag moves the ghost instead.
- **Zoom:** mouse wheel and pinch, plus keyboard **`+` / `-`** and on-screen zoom
  buttons. Clamped to **0.5×–2.6×** the default camera distance.
- **Orbit (the change from the original spec):** keyboard **`Q` / `E`**, on-screen
  buttons, and pointer drag-rotate turn the **azimuth freely through the full 360°**
  — there is no clamp and no quarter-turn snapping. The **polar tilt is locked**
  instead (`minPolarAngle === maxPolarAngle === 0.72` rad, ~49° elevation), which is
  what preserves the calm, consistent, quasi-isometric read that the old ±0.35 rad
  rotate clamp was protecting. Discrete steps are ~15°. A **reset** (`0` / "Reset
  view" button) returns to the default framing.
- **Clamped + smooth + calm.** Pan and zoom are clamped so the island stays on
  screen. Movement is **damped** (`dampingFactor` 0.08) for a gentle glide; under
  `prefers-reduced-motion` damping is disabled so the camera **snaps** with no glide.
- **Ownership model (testable).** The camera itself is drei **`MapControls`**, held in
  a ref and driven imperatively — React does **not** own a mirrored camera state, so
  a re-render (placing a building, advancing a stage) can never reset the player's
  pan/zoom/orbit. What stays pure and framework-free is the **intent layer**:
  `three/orbitCamera.ts` exports the `VILLAGE_CAMERA` constants and
  `cameraKeyIntent(key) → CameraAction`, and `three/applyOrbit.ts` applies a
  `CameraAction` to the controls. World geometry (grid/footprint math, building world
  positions, world bounds) is a second pure module (`city/worldLayout.ts`) shared by
  the scene and the placement logic, so "focus this building" and "is this placement
  valid" agree with what is drawn.

Because the key→intent map and the layout math are pure, both are unit-testable
without a GPU (`three/orbitCamera.test.ts`, `worldLayout.test.ts`), and the keyboard
controls are exercisable in jsdom.

---

## 5. Diegetic overlays + minimal HUD

Overlays are frosted "drafting glass" cards anchored to the world frame (corners /
lower edge), not a side panel column. Each overlay renders **from the
`CityViewModel`** and carries full text (never color alone).

- **Always-on HUD (top corners), minimal:**
  - Identity + neighborhood label ("Real Numbers & Arithmetic").
  - **Readiness / earned progress:** "N of 6 skills mastered" with a labelled
    meter, plus the mastery-derived **earned cosmetic preview** count (display
    only — no wallet, no spend). Both are read from the view model.
  - In-world entry-point launcher (§6) and a camera-help affordance.
- **Building detail (anchored card, appears on select):** node id, building
  **archetype** (answer-type family, word label + marker), **construction state**
  (word label + icon), mastery **"4 of 5"** progress, the **pending blueprint
  preview** (placement ghost), and the primary action to **enter** the building's
  lesson (§6). Compact and dismissible — not a full column.
- **Storm status (anchored chip / card):** phase (`locked` / `ready` / `cleared`)
  with words, the clear rule ("Clear = 4 of 5"), and the action to **enter the
  storm** when ready (§6).
- **Cosmetic preview (collapsible):** the mastery-derived earned count and the
  read-only "coming in the ranked expansion" catalog teaser. **No** cost, spend,
  ownership, or equip — the persistent economy is deferred to Contracts §8
  (Gabe-owned, Days 13-24).
- **Camera controls:** zoom −/reset/＋ (and rotate) as labelled buttons; keyboard
  works when the viewport is focused.
- **DOM mirror (semantic backbone):** a keyboard-navigable **building roster** and
  the detail/storm/cosmetic controls remain real focusable DOM. See §8.

---

## 6. In-world entry points + **stubbed** lesson/diagnostic hosting

The immersive shell adds ways *into* learning without deep cross-lane
integration. All hosting sits behind a **clean seam** so the real lesson /
diagnostic engines can be dropped in later, once the team aligns on cross-lane
hosting.

- **Per-building lesson entry (the primary in-world entry, stubbed).** Activating
  a building's primary action opens a **full-bleed in-world "lesson entry" scene**
  that *stands in for* that node's lesson. It is a clean placeholder behind a
  `LessonHost` interface (`apps/web/src/city/lessonHost.tsx`), **not** a deep
  integration of Anthony's lesson engine. It shows the node and its interaction
  archetype, and offers "Back to city." A swap-in `LessonHost` implementation
  is the future team-aligned step.
- **DEV mastery stand-in (kept, clearly labelled).** So the loop stays
  demonstrable end-to-end (master → buildings complete → storm unlocks), the
  clearly-labelled **developer** control that simulates the mastery/lesson lane
  advancing `student_node_state` remains, surfaced inside the stubbed lesson
  entry (and/or a dev panel). **This is not a game write** and never touches
  `@cr/game` or the checkpoint writer — exactly as today (`citySession.ts`).
- **Storm as an in-world encounter entry.** When the storm is `ready`, an in-world
  encounter entry opens; beginning it **reuses the existing checkpoint logic**
  (`onAttemptStorm` → `gradeStorm` → the game-owned `CheckpointWriter`). The storm
  still submits **no** mastery evidence and writes **only**
  `neighborhood_state.checkpoint_cleared` on a genuine, readiness-gated clear.
- **District / surface entry points.** Lightweight in-world buttons open the
  existing Evan-lane **Survey**, **Lessons**, and **Checker Lab** surfaces as
  full-screen overlays. They are secondary affordances, **not** the dominant
  chrome, and they are the existing scaffolds (no new cross-lane wiring).

**Seam contract (MVP):** `LessonHost.render({ nodeId, lessonArchetype, archetypeLabel,
onExit, onDevComplete? })` returns the scene to show. The MVP ships
`stubLessonHost`. Nothing about the seam implies or performs a mastery/placement
write. *(The seam's `lessonShell` field is being renamed to `lessonArchetype`;
code migration tracked in TEAM_CHECKLIST.)*

---

## 7. Ambient liveliness (MVP-safe, no economy)

Ambience makes the city feel alive without new state, assets, or economy. All of
it is **procedural**, **cheap**, and **reduced-motion-aware**.

- **Day–night tint.** A slow (≈ 2-minute) ambient cycle tints the sky/ground
  between dusk-indigo and warm dawn. Purely cosmetic; no gameplay effect.
- **Weather.** Light drifting particles (the existing rain, calmed) with a low,
  fixed cap.
- **Animated construction.** Buildings mid-construction show gentle activity
  (scaffold shimmer / crane bob / faint dust); complete/gold buildings show a
  slow sparkle. Tied to `construction_state` from the view model.
- **Citizens / traffic / particles.** A small, capped number of dots drift along
  roads (traffic) and near plots (citizens) to give scale and life.
- **Performance budget.** Fixed particle caps, reused `Graphics`/`Container`
  objects (no per-frame reallocation), a single ticker, and no work when a layer
  is empty. Targets a steady frame budget on a laptop iGPU.
- **Reduced motion.** Under `prefers-reduced-motion: reduce`: the day–night tint
  holds at a neutral midday, weather/citizens/traffic are disabled or frozen,
  construction/sparkle animation is off, and camera transitions snap. The city is
  fully legible **static**.

---

## 8. Accessibility (the shell never costs it)

Accessibility is a hard constraint, not a finish. The immersive layer sits **on
top of** a fully operable DOM.

- **DOM mirror = semantic source of truth.** The 3D canvas is decorative
  (`aria-hidden`). Every building, the storm gate, the cosmetic preview, the
  camera controls, and every entry point have real, labelled, focusable DOM
  elements. The whole loop — inspect a building, read its
  archetype/state/progress, enter its (stubbed) lesson, attempt/retry the storm,
  browse the cosmetic teaser, open Survey/Lessons/Checker — is operable from the
  DOM alone, keyboard only.
- **Keyboard model (no conflicts).** Roster building navigation uses arrows/Home/
  End on the roster list; camera pan/zoom/rotate uses arrows/WASD/`+`/`-`/`Q`/`E`
  **only when the map viewport is focused**; the two never fight because they are
  different focus targets. `Tab` order is logical; nothing traps focus; overlays
  (lesson entry, storm, Survey/Lessons/Checker) are dismissible with a visible
  "Back"/"Close" and `Esc`.
- **Never color alone.** Construction state, storm phase, readiness, and archetype
  all carry word labels and/or shapes in the DOM in addition to any canvas color.
- **Visible focus.** A bright focus ring shows on every interactive element,
  tuned for the dark game backdrop.
- **Reduced motion.** As §7: ambience off, camera snaps, transitions removed.
- **ARIA live regions.** Polite for selection/load/progress; assertive for the
  storm result. Load announces once per load/retry.
- **Fail-closed.** On a load/scoring error the city stays read-only from
  last-known state with a non-destructive notice and a Retry; no storm clear,
  reward, or checkpoint write is ever fabricated.

---

## 9. Aesthetic direction ("blueprint at dusk")

Deliberately not one of the generic AI defaults. The subject is an architect
building a small city by learning, so the identity is **drafting-table-meets-dusk-
city**: a warm-lit isometric city under a deep indigo/teal sky, read through a
frosted "drafting glass" HUD with hairline blueprint-cyan rules.

- **Palette (cohesive, calm; no gradient slop):**
  - `night` `#0E1726` — sky / base backdrop
  - `harbor` `#14283C` — ground plane / glass panel fill
  - `blueprint` `#5AA9E6` — linework, road centerlines, hairline rules
  - `lantern` `#F2B45A` — warm building light / progress accents
  - `ember` `#F2A154` — focus / attention (selected building, focus ring)
  - `mist` `#AEC6DE` — cool light text on dark
  - state greens/gold reuse the existing complete/gold tokens for continuity.
  Flat, translucent fills with 1px borders — **no** decorative multi-stop
  gradients. The only "gradient" is the slow day–night sky tint (atmosphere, not
  ornament).
- **Type:** reuse the app's loaded pairing — **Anybody Variable** (wide, signage-
  like display) for HUD headings/labels; **Commissioner Variable** for body/data.
  No new font dependencies.
- **Motion:** one orchestrated idea — the **calm camera glide** (and focus-on-
  select) — kept quiet everywhere else. Ambience drifts; it never flashes.
- **Signature:** the whole screen *is* the living city, read through the drafting-
  glass HUD; selecting a building glides the camera to it. That is the memorable
  moment; everything else stays disciplined.

---

## 10. Deep player customization — deferred to the §8 economy

Rich customization (owned/equipped building skins, decor, district palettes,
storm-weather cosmetics, layout personalization) is **explicitly deferred** to the
ratified **Contracts §8** persistent cosmetic economy (Gabe-owned, Days 13-24).
At MVP the shell shows only the **display-only, mastery-derived preview** and a
non-interactive catalog teaser — no wallet, balance, ownership, spend, or equip,
and **no** economy types in `@cr/state-schema`. The preview can never gate a
lesson, node, storm, or checkpoint (Contracts §8 INV-COS-1..3).

---

## 11. MVP-safe build fence

| Surface | State in this slice | Mechanism |
| --- | --- | --- |
| Full-bleed world + village camera | **BUILT** | `apps/web` React Three Fiber scene + drei `MapControls`, with pure `three/orbitCamera.ts`/`worldLayout.ts`; view transform only |
| Diegetic HUD/overlays | **BUILT** | React, rendered from `CityViewModel`; DOM mirror retained |
| In-world lesson entry | **STUBBED behind a seam** | `LessonHost` + `stubLessonHost`; no cross-lane engine wired |
| In-world storm encounter | **BUILT (reuses checkpoint logic)** | `onAttemptStorm` → `gradeStorm` → `CheckpointWriter` |
| Survey / Lessons / Checker entry | **Existing scaffolds, opened as overlays** | Evan-lane surfaces; no new wiring |
| Ambient liveliness | **BUILT, MVP-safe** | Procedural, capped, reduced-motion-aware |
| Deep customization / economy | **DEFERRED** to Contracts §8 | Preview only; no wallet/spend/equip types |
| D2–D9 / endgame attack | **ARCHITECTED-ONLY** | Distant locked outskirts / typed `built:false` seam (unchanged) |

**Frozen boundary held (unchanged by this shell):**

- `@cr/game` stays **pure/framework-free** — all three.js/R3F, camera, and overlay
  code lives in `apps/web`. (No engine change is required for this slice.)
- The game writes **only** `neighborhood_state.checkpoint_cleared`, only via the
  game-owned `CheckpointWriter`; never `mastery`/`placement_estimate`/
  `completion_status`; the storm submits **no** mastery evidence.
- **No economy types** enter `@cr/state-schema`; no economy backend is re-added.
- Anthony's lessons and Gabe's diagnostic are **not** deeply integrated — hosting
  is stubbed behind a seam pending team alignment.

---

## 12. Testing & verification

- **Pure units (`apps/web`, jsdom):** `three/orbitCamera.ts` (the key→`CameraAction`
  map and the `VILLAGE_CAMERA` clamp/step constants) and `worldLayout.ts`
  (deterministic grid/footprint math, placement validity, world bounds).
- **Shell (`apps/web`, React Testing Library):** the DOM mirror renders every
  construction state; keyboard building navigation still moves selection + focus;
  the archetype/detail/storm/cosmetic overlays render from the view model;
  **camera controls exist and are keyboard-operable** (focus the viewport → keys
  change the exposed camera state; zoom/reset buttons work); the reduced-motion
  path; the in-world lesson-entry stub opens/closes; and the fail-closed
  load/error fallback with Retry.
- **Unchanged green:** `@cr/game` unit tests, the graph invariants
  (`graph_invariants.py`, MVP count = 6), and the `@cr/components` browser checker
  tests all stay passing — this shell touches none of their inputs.
- **Full local gate:** `npm run check` (format:check, lint, typecheck, unit,
  browser, graph), `npm run build`, and `npm run test -w @cr/web`.

---

## 13. Module map (`apps/web/src/city`)

- `worldLayout.ts` — **pure:** grid/footprint math, building world positions,
  placement validity + occupancy, locked-district ring, world bounds. No three/React.
- `three/orbitCamera.ts` — **pure:** the `VILLAGE_CAMERA` constants (locked polar
  tilt, clamped distance ratios, pan/zoom/rotate steps, damping) and
  `cameraKeyIntent(key) → CameraAction`. No three/React.
- `three/applyOrbit.ts` — applies a `CameraAction` imperatively to the live controls.
- `three/CityScene.tsx` — the React Three Fiber full-bleed renderer: `<Canvas>`,
  lighting, fog, island, roads, placed buildings + ghost, storm, day–night
  environment, and drei **`MapControls`** (rotate on, polar tilt pinned). The
  buildings/stages it draws come from `buildingAssets.ts` GLBs
  (`three/PlacedBuilding.tsx`, `three/constructionStages.ts` for the fail-closed
  procedural phases).
- `three/CityCanvasHost.tsx` — mounts the scene, forwards the view model and camera
  commands, renders the deterministic fallback backdrop.
- `lessonHost.tsx` — **new:** the `LessonHost` seam + `stubLessonHost` full-bleed
  placeholder scene.
- `WorldScene.tsx` — **new:** reusable full-bleed in-world scene frame (used by the
  lesson entry and storm encounter).
- `CitySurface.tsx` — the immersive shell: full-bleed viewport, camera reducer +
  keyboard/buttons, diegetic HUD/overlays, DOM-mirror roster, live regions,
  load/error fallback, entry points.
- `App.tsx` — full-bleed composition + Survey/Lessons/Checker overlays.
- `announcements.ts`, `useReducedMotion.ts`, `types.ts`, `mockCity.ts`,
  `citySession.ts` — largely as today (announcement copy extended for the new
  entries; `citySession.ts` unchanged — the frozen boundary lives here).

---

## 14. References

- `docs/superpowers/specs/Game_Architecture_Blueprint.md` — the game-lane
  architecture of record (descriptor model, resolver, boundary).
- `docs/superpowers/specs/D1_City_Builder_Design_Spec.md` — the D1 slice design
  (plots, construction rule, storm rule, cosmetic preview).
- `docs/Contracts.md` §1/§3/§8; `docs/Mastery_Scoring_Spec.md`;
  `docs/Architecture.md` §7 — the frozen state, write boundary, and rendering
  decisions this shell presents without altering.
- `engines/game/src/descriptors.ts`, `engines/game/src/city-view-model.ts` — the
  pure view model this shell renders (unchanged by this slice).
