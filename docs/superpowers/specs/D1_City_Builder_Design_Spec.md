# D1 City-Builder Design Spec (v1, approved design)

_The reviewed design for Evan's first production vertical slice: the Domain **D1
(Real Numbers & Arithmetic)** neighborhood as a fixed-plot 2.5D isometric
city-builder with mastery-driven construction, an accuracy-gated soft-timer
storm, and a display-only cosmetic **preview**. This document is the game-lane
design of record. It builds **against** the authoritative data/interface rules
in `docs/Contracts.md` and the mastery semantics in
`docs/Mastery_Scoring_Spec.md`; where this doc and those disagree, **those
win**. The MVP ships ONLY a derived cosmetic preview (§5–§6); the full,
persistent cosmetic economy is the ratified **Contracts §8** cosmetic economy — a
Gabe-owned, Days 13-24 ranked-expansion addition — and is NOT built at MVP._

**Status:** design locked for the game lane. MVP scope: mastery-driven
construction + checkpoint storm + a mastery-derived cosmetic preview. The
persistent cosmetic economy is deferred to the ratified **Contracts §8**
(Gabe-owned, Days 13-24 ranked expansion).
**Owner:** Evan (game engine, `engines/game`, `apps/web` city surface).
**Scope:** the 6-node D1 MVP neighborhood only.
**Companion docs:** `docs/Contracts.md` (data/API authority; §8 cosmetic economy),
`docs/Mastery_Scoring_Spec.md` (mastery authority),
`docs/Architecture.md` (§7 rendering + state-flow decisions),
`docs/MVP_Definition.md` (what ships), and
`docs/Contracts_Amendment_Cosmetic_Economy.md` (the §8 rationale/detail record).

> ## RENDERING-STACK CORRECTION (2026-07-27)
>
> This spec was approved against a **PixiJS 2.5D** city. The city was migrated to
> **React Three Fiber** (React + three.js / WebGL) and renders **true 3D** geometry
> from authored GLB models, so "2.5D isometric" in the summary and §2.1 now describes
> the **look**, not the projection. §8 has been corrected to describe the stack that
> ships. Everything else here — the state-derived construction model (§4), the reward
> and cosmetic-preview rules (§5, §6), the storm (§7), and the write boundary — is
> renderer-independent and unchanged.
>
> Also diverged, and **not** corrected here because it is a scope question rather than
> a rendering one: §2.1's "fixed layout of exactly six building plots, no free
> placement." D1 now lets the player place buildings. See
> `Immersive_City_Shell_Spec.md` §3.

---

## 1. Purpose and non-goals in one paragraph

Render one calc-readiness neighborhood as a small, legible city the student
_builds by learning_. Each of the six D1 skills is a fixed plot; a plot's
construction reflects the student's real progress (diagnostic placement, then
lesson stage, then mastery). Finishing all six unlocks a climactic **storm**
checkpoint. Learning is never gated behind spending or cosmetics, there are no
real-money purchases, and the game **never** writes or evidences mastery. The
only piece of shared learning-state the game mutates is the existing
`neighborhood_checkpoint_cleared` flag, exactly as frozen in Contracts §3.

---

## 2. The neighborhood

### 2.1 Surface

- **One** 2.5D isometric neighborhood: **D1 — Real Numbers & Arithmetic**.
- A **fixed layout** of exactly **six building plots**, one per D1 node. No free
  placement, no interiors, no grid the player edits, no city expansion. Plot
  positions are authored constants.
- **Roads = prerequisite edges** from the registry
  (`packages/skill-graph/src/skill_graph.json`), drawn between plots so the
  dependency structure is visible. D1 edges (from the registry): `NUM.2` depends
  on `NUM.S`+`NUM.F`; `NUM.4` depends on `NUM.S`+`NUM.F`+`NUM.2`+`NUM.3`; `NUM.5`
  depends on `NUM.F`. `NUM.S`, `NUM.F`, `NUM.3` have no D1 prerequisites. Roads
  are descriptive scenery; they do not gate rendering.
- The other **eight domains show as distant, locked districts** on the horizon
  (silhouetted skyline, dimmed, labelled, non-interactive). They are roadmap
  scenery only, never a playable objective and never a "coming soon" dead end,
  matching `docs/README.md` §10a and `docs/MVP_Definition.md` §1.

### 2.2 The six fixed plots (authoritative node set)

The six plots map 1:1 to the D1 nodes with `product_scope: "mvp"` in the
registry. The registry is the source of truth; this list must match it.

| Plot | node_id | Lesson archetype | D1 prerequisites (roads in) |
| ---- | ------- | ------------ | --------------------------- |
| 1 | `NUM.S` | L1 | none |
| 2 | `NUM.F` | L1 | none |
| 3 | `NUM.2` | L2 | `NUM.S`, `NUM.F` |
| 4 | `NUM.3` | L2 | none |
| 5 | `NUM.4` | L2 | `NUM.S`, `NUM.F`, `NUM.2`, `NUM.3` |
| 6 | `NUM.5` | L3 | `NUM.F` |

The city renderer reads the node set from `@cr/skill-graph`
(`getNodesByDomain("D1")` / `getNodesByScope("mvp")`); it never hardcodes node
IDs, so a registry change cannot silently desync the map.

Each plot is **one node = one lesson = one building** (1:1). The **Lesson
archetype** column is the reusable lesson-interaction *template* a node's lesson
shares for build-effort savings (`NUM.S`/`NUM.F` → archetype L1, the three
expression nodes `NUM.2`/`NUM.3`/`NUM.4` → L2, `NUM.5` → L3). It is an
authoring/build concept, **invisible to the player**, and it never groups plots
or buildings — finishing a node's lesson builds only that node's plot. (Registry
field `lesson_shell` today; renaming to `lesson_archetype`.)

---

## 3. Blueprint silhouettes (diagnostic placement)

- On first entry the diagnostic's `placement_estimate` (0–3, per Contracts §1)
  is rendered as a **translucent blueprint silhouette** on each plot: a
  ghosted outline of the building that _could_ stand there, sized by placement
  (higher placement → a taller/denser ghost).
- The silhouette communicates "here is what this skill becomes," **not**
  progress. Per Contracts §1 invariants, `placement_estimate` and `mastery` are
  different constructs and never equal by construction: **placing high seeds a
  taller ghost but mastery still starts at 0, so nothing is pre-built.**
  - *⚠ **AMENDED 2026-07-23, RATIFIED 2026-07-26** (Evan ack'd 2026-07-26;
    Anthony did not — his lane's boxes were carried by Gabe's tie-break),
    folded into `docs/Contracts.md` §1.1 — build-without-lesson: "nothing is
    pre-built" now holds for
    **failed/unresolved** nodes only. A **passed** placement (`>= 2`, measured
    **or** graph-inferred) completes that node's building on placement, so its
    ghost hides immediately. The rest of the bullet stands: the building
    completes at **mastery 0**, so placing high still seeds no stars and the
    ghost's height still communicates nothing about progress. Same annotation as
    the bullet below; see `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md`
    §8.1.*
- Placement also **fast-tracks the lesson, never the building**: a high
  `placement_estimate` lets the student skip that node's teaching and enter
  directly at the short "prove it" practice. The building still rises only as
  that practice is passed (mastery evidence) — placement is the blueprint + fast
  lane, never construction itself.
  - *⚠ **AMENDED 2026-07-23, RATIFIED 2026-07-26, folded into `docs/Contracts.md` §1.1** (Gabe as diagnostic-lane owner and tie-break; **Evan ack'd, Anthony did not**) — build-without-lesson: the bullet above now holds only for **failed/unresolved** nodes. A **passed** placement (`placement_estimate >= 2`, **measured OR graph-inferred**) unlocks + **completes** the building on placement **without** the lesson (test-out), at **mastery 0** — so the practice still earns every star. Placement and mastery stay distinct fields (the diagnostic never writes `mastery`); the city/mastery lane completes on a passed placement — production persistence via the mastery service (still owed Anthony's agreement), dev/in-memory simulated. On diagnostic exit, a "You've unlocked N buildings!" popup celebrates the N passed nodes. Normative: `docs/Contracts.md` §1.1; rationale: `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md`.*
- The blueprint ghost is most prominent before construction and fades as real
  construction begins; it is gone once the building is `complete`.
- `placement_estimate` is immutable after onboarding (Contracts §1); the
  posttest never touches it, so the ghost never changes after placement.

---

## 4. Construction states (mastery-driven, lesson-stage-flavored)

Each building's visual is a **pure derivation** of that node's state, computed
in `@cr/game` (no renderer). It is a rendering concept only: it is never stored,
never authoritative, and never written back to `student_node_state`.

### 4.1 Inputs

`placement_estimate`, `lesson_stage` (`not_started`/`teaching`/`practice`/
`done`), and `mastery` (0–3) from `student_node_state` (Contracts §1). A high
`placement_estimate` may route a node's `lesson_stage` directly to `practice`
(skipping `teaching`), so a strong student's building can jump from blueprint to
the practice/scaffolding look without a separate teaching phase — but it still
completes only at `mastery >= 2` (earned by practice). *(⚠ **AMENDED 2026-07-23,
RATIFIED 2026-07-26**, folded into `docs/Contracts.md` §1.1: for a **passed**
placement (`>= 2`, measured or inferred) the city/mastery lane completes the
building on placement **without the lesson** — a passed node jumps straight to
`complete`. Correction to the earlier annotation here, which said "completion
still keys off `mastery >= 2`": for a tested-out node it does **not**. The seed
writes `lesson_stage: "done"` at **mastery 0**, and §4.2's first-match rule
derives `complete` off the `lesson_stage` leg, so the node is `complete` with
zero stars (`engines/game/src/construction.ts`). Failed nodes (0/1) still
complete via practice at `mastery >= 2`. Rationale:
`docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md` §8.1.)*

### 4.2 Derivation (first match wins — a single deterministic rule)

| # | Condition | Construction state | Look |
| - | --------- | ------------------ | ---- |
| 1 | `mastery === 3` | **gold** | The same finished building as `complete`, with **3 of 3 gold mastery stars** floating above its roofline (see the banner below) |
| 2 | `mastery >= 2` | **complete** | Finished building |
| 3 | `lesson_stage === "done"` (and `mastery < 2`) | **unfinished** | Structure present but visibly incomplete (scaffolding up, no roof); shows "needs 4 of 5 to finish" |
| 4 | `lesson_stage === "practice"` | **practice** | Walls / scaffolding rising |
| 5 | `lesson_stage === "teaching"` | **teaching** | Foundation poured, framing begins |
| 6 | otherwise (`not_started`, `mastery 0`) | **not_started** | Blueprint silhouette (sized by `placement_estimate`) |

> **CORRECTED 2026-07-28 — the `gold` STATE is real; the gold LOOK was retired and never shipped.**
> Row 1's Look column read *"Finished building, gold/shining celebration variant"*. The state token
> is genuine and still ships (`ConstructionState` includes `"gold"`,
> `engines/game/src/construction.ts:34`), so the derivation table below is unchanged — but it
> **renders no differently from `complete`**: `buildStageFor` maps both `complete` and `gold` to the
> `built` stage (`apps/web/src/city/palette.ts:236-241`), and that function's own comment says
> *"Full mastery renders the same finished `built` model; quality shows as MasteryStars, never a
> gold building."* `palette.ts:253-254` adds *"No stage is ever tinted gold."* Full mastery is shown
> by **three gold `#FFB703` stars above a topped-out building**
> (`apps/web/src/city/masteryVisuals.ts:16`, `three/MasteryStars.tsx:69`). `#FFB703` stays reserved;
> what is withdrawn is only the claim that a building body ever renders gold. See
> `docs/Game_Visual_Design_Brief.md` §4.1 and `City_Art_Bible.md` §1.3.

**Why mastery is checked first:** Contracts §1 requires building completion to
read `completion_status` (derived from `mastery >= 2`), **never `lesson_stage`
alone**. Checking mastery before lesson_stage guarantees the "mastery=2 but
lesson_stage=not_started" contradiction can never render as an unfinished
building. This matches the existing `toBuildingProgress` helper in
`engines/game/src/index.ts` (`complete = mastery >= 2`, `gold = mastery === 3`).

### 4.3 The `unfinished` state is the legibility surface

State #3 exists to satisfy `docs/Mastery_Scoring_Spec.md` §10: a not-yet-complete
set must never be mysterious. When a student has worked a lesson to `done` but
has not hit the 4/5 bar (mastery still 0 or 1, e.g. 3/5, or a revealed item is
awaiting its fresh instance), the building visibly reads "still needs work — 4
of 5 correct finishes it," not a silent stall. The building completes the moment
mastery reaches 2, exactly as the student was told.

### 4.4 Preview-only edge case

If a node is not authoring-complete (its validated bank cannot fill a 5-item
practice set at the required mix, per Mastery_Scoring_Spec §7), its plot renders
as a permanent blueprint/preview and cannot reach `complete`. All six D1 nodes
are in MVP authoring scope; this rule is stated so a thin-bank node degrades to
"preview," never to a building that completes on a thin set.

---

## 5. Cosmetic preview (MVP) — the persistent economy is deferred to Contracts §8

At the Day-12 MVP the game ships a **display-only cosmetic preview**, derived
purely from mastery. The full, persistent **cosmetic economy** — earned
resources, a wallet, atomic spend/unlock, and owned/equipped cosmetics — is the
ratified **Contracts §8** cosmetic economy, a **Gabe-owned, Days 13-24
ranked-expansion** addition (shared types, tables/RLS/migrations, and the
grant/spend/equip service APIs). It is NOT built at MVP.

### 5.1 What the MVP shows

- A pure function of node mastery (`deriveCosmeticPreview` in `@cr/game`) computes
  a **display-only** count of the cosmetic rewards the student's current mastery
  _would_ earn in the §8 expansion (one per mastered node at `mastery >= 2`, plus
  one per gold node at `mastery === 3`). It is a projection, **not** a spendable
  balance.
- A small, **non-interactive catalog teaser** ("coming in the ranked expansion")
  shows the kinds of cosmetics the expansion will offer. No prices, no purchase.
- Nothing here persists, holds a balance, or spends. Because it is derived from
  mastery it can never gate learning or storm access (Contracts §8 INV-COS-1..3).

### 5.2 What is deferred to Contracts §8 (Gabe, Days 13-24)

- Earned resources and the authoritative **wallet**, the append-only grant
  ledger, and the **atomic, idempotent** grant/spend service (`grantResource` /
  `purchaseCosmetic`), all server-side — the client never mints or writes a
  balance (Contracts §8.4, INV-COS-4/5).
- The `cosmetic_catalog`, `owned_cosmetic`, and client-writable
  `equipped_cosmetic` tables, plus `getWallet` / `getInventory` / `equipCosmetic`.
- Earn rates, the resource model (single generic balance vs. typed resources),
  and catalog scope/pricing — all open §8 product decisions, owned by Gabe, not
  fixed here.

### 5.3 Hard rules (must hold — MVP preview and §8 expansion alike)

- **No real-money purchases.** No IAP, no top-up, no external currency, ever.
- **No educational gating by the economy.** The preview, resource balances, and
  owned cosmetics **never** gate a lesson, a node, the storm, mastery, or the
  checkpoint. They change appearance only; progression is driven solely by
  mastery (Contracts §8 INV-COS-1..3).
- **The economy is never mastery.** Nothing in the preview or the deferred
  economy writes, raises, or lowers `mastery`, `placement_estimate`, or
  `completion_status`.

---

## 6. Cosmetics: non-interactive at MVP; spend/unlock deferred to §8

- At MVP the cosmetic catalog is shown **read-only** as the preview teaser (§5).
  There is **no spend, no unlock, no ownership, and no equip** — those are the
  ratified §8 economy, owned by Gabe for the ranked expansion.
- When the §8 economy lands, a purchase is an **atomic, fail-closed** transaction
  (debit balance + credit ownership in one transaction; a non-negative-balance
  check rejects any overdraft) and **idempotent** on `event_id`
  (`purchaseCosmetic`, Contracts §8.4). There is **no optimistic spending**: the
  UI never pre-decrements a balance or shows an item owned until the server
  confirms.
- Owning or equipping a cosmetic has **zero** effect on learning, mastery,
  rewards, or the storm (Contracts §8 INV-COS-3).
- **Evan owns the game-side consumption** of the §8 economy (surfacing
  server-verified earn triggers, the store/cosmetic UI, and the `equipCosmetic`
  selection call — the only client economy write); **Gabe owns** the shared
  types, tables/RLS/migrations, and the economy service APIs (OWNERS.md).

---

## 7. The storm (neighborhood checkpoint)

The storm is the climactic game moment. Per `docs/Mastery_Scoring_Spec.md` §5
and Contracts §3, it is **checkpoint-only**: it reads mastery and controls
exactly one flag; it is **not** a mastery writer and **not** a mastery evidence
source.

### 7.1 Unlock condition

The storm is attemptable **only after all six D1 nodes are at mastery ≥ 2**
(mastered via lessons). This reuses the existing `isNeighborhoodReady("D1", …)`
helper in `engines/game/src/index.ts` (every required node `mastery >= 2`).
Until then the storm gate renders locked, matching the current scaffold copy
("Unlocks after all six buildings are complete").

### 7.2 Clear condition

- The storm is a **short mixed-retention round** of prompts sampled across the
  six already-mastered D1 nodes. **Default size: 5 prompts.**
- **Clear = ≥ 80% correct** (4 of 5 at the default size). The 80% / "4 of 5"
  framing deliberately reuses the mastery rule the student already understands
  (Mastery_Scoring_Spec §0). Exact size is a game-model tuning parameter; the
  **80% clear threshold is the rule**.
- The storm is intentionally short. A per-node-complete storm over six nodes
  would be a ~30-response mega-assessment, which Mastery_Scoring_Spec §5
  explicitly rejects. Storm prompts are a retention sample, **not** per-node
  coverage, precisely because the storm is not mastery evidence.

### 7.3 Storm accuracy is NOT mastery evidence

Storm grading exists to decide the game clear only. The storm **does not** call
`submitAssessmentEvidence`, **does not** recompute or write mastery, and
**cannot** raise or lower any node's mastery. This upholds Contracts §3 and
Mastery_Scoring_Spec §5. A storm can only be reached once every node is already
mastered, so it never "masters" an unfinished node.

### 7.4 Soft timer → bonus reward only (never pass/fail)

- A **soft** countdown runs during the storm. Time affects **only a bonus**: more
  time remaining at clear → a larger speed-bonus ratio. In the §8 ranked
  expansion this ratio drives a bonus cosmetic reward; **at MVP it has no
  persistent effect** (there is no wallet to credit).
- The timer expiring does **not** fail the storm and causes **no loss**; it only
  forfeits the speed bonus. A student who reaches 80% after the timer expires
  still clears (with zero speed bonus).

### 7.5 Failure and retry

- Missing the 80% bar means the storm is **not** cleared. **Failure has no
  loss**: no resources lost, no mastery change, no building regression, no
  checkpoint change.
- The student may **retry immediately**, as many times as they like.

### 7.6 On clear (the one game write)

- Clearing sets **`neighborhood_checkpoint_cleared`** for D1 — the **only**
  shared learning-state write the game makes (Contracts §3), performed through a
  game-owned `CheckpointWriter` (never an economy service). It is a
  progression/cosmetic flag, never an input to mastery, and is gated on all six
  nodes already being mastered, so a clear can never "master" an unfinished node.
- The write is **idempotent**: replaying an already-cleared storm is allowed for
  enjoyment and simply re-confirms the flag.
- **Economy rewards for a clear are deferred to Contracts §8** (a server-side,
  idempotent `grantResource` keyed by the checkpoint event). At MVP a clear grows
  the display-only cosmetic preview (§5) but grants no persistent resource.

---

## 8. Rendering architecture

Aligned with `docs/Architecture.md` §7 (per-surface rendering; React Three Fiber
for the city; graphs live only in lessons/diagnostic, never in the city canvas)
and the plan's step 4.

- **`@cr/game` (`engines/game/src`) is pure domain logic, no renderer.** It owns
  plot/building definitions, blueprint + construction-state derivation (§4),
  reward rules (§5), cosmetic-catalog logic (§6), and the storm state machine
  (§7). Every transition is unit-testable without a renderer.
- **`apps/web` hosts the React Three Fiber city surface.** `three/CityCanvasHost.tsx`
  mounts the R3F `Canvas` and `three/CityScene.tsx` renders the world, replacing the
  static city preview that was once in `apps/web/src/App.tsx`: placed buildings from
  authored GLBs, blueprint ghosts, construction/gold states, roads, weather/reward
  effects, the storm, and the distant locked districts.
- **A React building-detail panel** sits beside the canvas: selecting a plot
  opens its detail (node id, construction state, mastery/"4 of 5" progress,
  lesson entry point, earned rewards, cosmetic options).
- **State-flow (no realtime), per Architecture §7:** load D1 state on entry and
  **refresh only on explicit events** — a finished lesson, a cosmetic unlock, a
  storm result. No live subscription bound to the render loop.

---

## 9. Accessibility (canvas is an enhancement, not a requirement)

The city must be fully usable without seeing or clicking the canvas.

- **DOM mirror.** Every canvas building, the storm gate, and every interactive
  control has an equivalent focusable DOM element (the detail panel plus a DOM
  list of the six plots) with proper roles and accessible names. The full loop
  — inspect a building, enter a lesson, open the storm, buy a cosmetic — is
  operable from the DOM alone.
- **Keyboard.** Complete keyboard navigation: move between plots, open a plot's
  detail, launch a lesson, attempt/retry the storm, and purchase cosmetics with
  the keyboard. No mouse-only or pointer-only interaction.
- **Reduced motion.** Respect `prefers-reduced-motion`: reduce or disable weather,
  construction animations, and reward bursts; apply state changes instantly
  instead of animating them.
- **ARIA live regions.** Announce meaningful changes: construction progress and
  completion ("`NUM.2` building complete — 4 of 5 correct"), reward grants
  ("Earned 3 Materials"), cosmetic purchases, and storm outcomes (clear/fail,
  Prestige earned). Use polite announcements for progress and assertive only for
  the storm result.
- **Deterministic placeholders.** Missing art assets fall back to deterministic
  shapes/labels so the state is always readable (this also serves resilience).

---

## 10. Resilience and integrity

- **Fail closed.** If state, scoring, or the economy service is unavailable, the
  city renders read-only from the last known state. No lesson result, storm
  clear, reward, or purchase is fabricated. The storm cannot be cleared and
  rewards cannot be granted without the trusted server path.
- **No optimistic spending** (restated from §6): balances and ownership change
  only after server confirmation of the atomic deduction.
- **Idempotent rewards** (restated from §5.2): every grant is keyed and
  deduped; monotonic mastery means each mastery reward fires once; storm rewards
  fire once on first clear.
- **No client-trusted numbers for anything that persists.** Reward amounts,
  storm clears, and checkpoint writes are validated server-side against recorded
  state; the client cannot forge them.
- **Idempotent, event-driven refresh.** Re-entering the city or replaying a
  refresh after an event re-reads authoritative state and never double-applies
  an effect.

---

## 11. Authority and consistency (what the game does and does not touch)

- **Writes (shared learning-state):** exactly one — `neighborhood_checkpoint_cleared`
  for D1, on storm clear (Contracts §3). Nothing else in `student_node_state` is
  written by the game.
- **Reads:** `placement_estimate`, `lesson_stage`, `mastery`,
  `completion_status` (render only); the registry (nodes/edges); and — in the §8
  ranked expansion (post-MVP) — the student's own economy state.
- **Never writes / never evidences:** `mastery`, `placement_estimate`,
  `completion_status`; the storm never calls `submitAssessmentEvidence`. Mastery
  ownership is unchanged by this design.
- **The persistent economy is deferred to Contracts §8.** The wallet, grant
  ledger, cosmetic catalog, and owned/equipped cosmetics are the ratified
  **Contracts §8** cosmetic economy — Gabe-owned shared types, tables/RLS/
  migrations, and service APIs, scheduled for the Days 13-24 ranked expansion. At
  MVP the game surfaces only a mastery-derived cosmetic **preview** (§5) and
  writes nothing but the checkpoint flag.

---

## 12. Out of scope (explicit, by design)

- Any of the **other eight neighborhoods** as playable content — they are
  distant locked districts (scenery) only.
- **Real-money purchases / IAP / monetization** of any kind.
- **Educational gating** through cosmetics, resources, or spending.
- The **storm as a mastery evidence source** or **any** mastery write by the
  game (checkpoint flag excepted).
- **Free placement, building interiors, editable grid, or city expansion** beyond
  the six fixed plots.
- **Decay / spaced-review** visuals (mastery is monotonic in v1; `review_due` is
  post-MVP).
- **Multiplayer, realtime subscriptions, social features.**
- **Mobile QR work-upload** (post-MVP).
- **Graphing widget inside the city canvas** (graphs live only in
  lessons/diagnostic, per Architecture §7).
- **Runtime LLM / content generation** (offline authoring only, per
  Architecture §7).
- The **"Attacks = Calculus I" endgame** (roadmap vision only, MVP_Definition
  §8a).
- **Building or migrating the persistent economy tables/service** — that is the
  ratified Contracts §8 cosmetic economy (Gabe-owned, Days 13-24 ranked
  expansion), not the MVP.

---

## 13. Decisions deferred to later phases (tuning, not blockers)

These are bounded tuning choices with stated defaults, not open design gaps:

- Exact storm size (default **5**). The **80% storm clear threshold** is fixed
  here; the size is a game-model tuning parameter.
- **All economy tuning is deferred to Contracts §8 (Gabe, Days 13-24):** earn
  rates and reward amounts, the resource model (a single generic balance vs.
  typed resources tied to answer/building type), and the cosmetic catalog
  contents and prices. The MVP cosmetic preview (§5) neither fixes nor depends on
  these; the §8 invariants (cosmetic-only, one-way, never gating) constrain them.

---

## 14. References

- `docs/Contracts.md` — authoritative data model, write-mapping (§3), RLS (§5),
  shared APIs (§4).
- `docs/Mastery_Scoring_Spec.md` — mastery rule (§0), storm rule (§5), UI
  legibility (§10).
- `docs/Architecture.md` — §7 rendering and state-flow decisions.
- `docs/MVP_Definition.md` — what ships; D1 depth-first; typed resources note.
- `packages/skill-graph/src/skill_graph.json` — the six D1 nodes and edges
  (source of truth).
- `engines/game/src/index.ts` — existing `toBuildingProgress`,
  `isNeighborhoodReady`, `CheckpointWriter` this design builds on.
- `docs/Contracts.md` §8 — the ratified cosmetic economy (post-MVP ranked
  expansion) that the full persistent economy is deferred to;
  `docs/Contracts_Amendment_Cosmetic_Economy.md` — its rationale/detail record.
