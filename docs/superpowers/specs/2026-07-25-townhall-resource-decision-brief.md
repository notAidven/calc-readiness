# Town Hall + Resource Model — Decision Brief (triage for implementation-readiness)

**Status:** ANALYSIS. This brief does **not** decide anything and does **not**
change the specs. It triages the open decisions in
`2026-07-25-resource-model-xp-gold-design.md` and `2026-07-25-town-hall-design.md`
(parent: `2026-07-25-island-decay-and-gold-design.md`) so the load-bearing calls
get answered first.

**How to use this:** confirm bucket **A** wholesale (it is already forced by a
ratified contract or a hard fact about the code). Accept-or-flip bucket **B** in
one pass (there is a clearly better engineering answer; no product taste needed).
Spend real thought only on ranked bucket **C**, top-down.

**Counts:** 17 open decisions + the 1 already-decided (D-R3). **A = 2** (incl.
D-R3, already decided) · **B = 6** · **C = 10**.

---

## 0. Grounded reality (the facts that pre-decide much of this)

Verified against the code and the ratified contracts, because several decisions
are only answerable if you know what actually exists:

- **Building layout is NOT persisted — anywhere.** There is no placements table in
  `db/migrations/000*.sql`; `GET /api/city` (`apiCityLoad.ts`) reads only
  `student_node_state` + `neighborhood_state`; `citySession.ts` holds `placements`
  in an **in-memory `Map` that starts empty**; `types.ts` calls placements
  *"Purely in-app session state (NOT a shared-schema/game write)."* **This single
  fact dissolves D-TH2 and simplifies D-TH1.**
- **The island center IS buildable, and auto-layouts fill it first.** In
  `worldLayout.ts` cells are indexed so the origin is the shared corner of the 4
  central cells (centers at `(±2,±2)`, ~2.83u ≪ `BUILDABLE_RADIUS = 22`);
  `findOpenCell`/`defaultPlacements` sort **nearest-center-first**, so the demo
  mock (`mockCity.ts`, which orders NUM.S first) drops the *first* building
  (NUM.S, the deco tower currently labelled "Town Hall") on the center-most plot.
  But a real session starts **empty** and the
  player places by hand via `placeSkill` → `isPlacementValid`, which has **no
  center reservation** today.
- **Even footprints center exactly on the origin; odd ones don't.** `GRID_CELL = 4`,
  buildable radius ≈ 5.5 cells. A `2×2` footprint at min-corner `(-1,-1)` is
  centered on `(0,0)` (same size as the existing towers NUM.S/NUM.5); a `4×4` is
  too. A `1×1`/`3×3` centers on a cell-center, ~2u off origin. This directly
  answers D-TH6's geometry.
- **No RLS; the sub is a column.** Migration `0001` uses composite PKs
  `(student_id, …)` on every per-student table, with `student_id` = the Cognito
  `sub` supplied by the Lambda, and a least-privilege `app_service` role that owns
  no tables. So the resource spec's "port §8 onto no-RLS" is correct, and the
  composite ledger PK (D-R5) matches the existing convention exactly.
- **The atomic primitive already exists.** `packages/db/src/data-api.ts` exports
  `withTransaction` + `json()` binds — so D-R9's "one atomic grant of a resource
  set" is a solved problem, not new infrastructure.
- **`completion_status` is a generated column** (`mastery >= 2 ⇒ complete`) in
  `0001`, but the test-out amendment completes a building at **mastery 0**. So the
  earn table's row 1 ("building completed") and row 3 ("star gained") do not fire
  off one clean column event — see Interactions.
- **Storm eligibility is mastery-only, by ratified invariant.** `isNeighborhoodReady`
  (`@cr/game`), Mastery §5, Contracts §1/§8 INV-COS-2, Blueprint §8.1: the storm
  unlocks "never of economy state." This pre-answers D-TH8.
- **Doc drift (not a decision, but affects the Town Hall build):** the Blueprint
  still says "PixiJS / `cityScene.ts`," but the live city is **React-Three-Fiber /
  three.js** (`apps/web/src/city/three/StarterIsland.tsx`, `worldLayout.ts`). The
  proposed shared `three/TownHall.tsx` behaviour component matches the real stack;
  the Town Hall spec §12 already acknowledges this.
  - **RESOLVED 2026-07-27.** The drift this bullet reported is fixed: the Blueprint
    (§3, §4, §5.1, §7, §12, §14) now names React Three Fiber and `city/three/`, and the
    last stale PixiJS claims elsewhere in the repo went with it. The observation is
    kept as written because it is what prompted the sweep.

---

## A. Already determined — confirm, do not deliberate (2)

| # | Decision | The answer (forced by) | What to confirm |
| - | --- | --- | --- |
| **D-R3** | XP credits mastery stars; gold does not. | **Already DECIDED** in `resource…§3.2` and consistent with the mastery firewall (economy never writes `mastery`). | Nothing to decide — it is recorded. Just don't reopen it. |
| **D-TH8** | Does the storm interact with the Town Hall / condition? | **No mechanical interaction is permissible.** Storm eligibility + clearing are a pure function of `mastery` (INV-COS-2, Mastery §5, Blueprint §8.1); condition/economy can never be an input, and "non-punitive" is mandated. | Confirm: condition **never** gates or hardens the storm. Any storm↔condition tie is **cosmetic-only flavor** (a weathered island merely *looks* stormier) and is optional; **ship none for MVP.** The decision as written asks a question the invariant already closes. |

*Also forced by the stack (not open decisions, just confirm in passing): `equipCosmetic`
is a normal authed Lambda endpoint, not an RLS client write (no RLS exists); XP is
never debited (DB check + service); balances are `sum(grants) − sum(spends)` and
non-negative.*

---

## B. Technical judgement — accept or flip in one pass (6)

No product taste required; each has a clearly better engineering answer.

| # | Decision | Recommendation | Why (one line) | Cost of choosing otherwise |
| - | --- | --- | --- | --- |
| **D-R5** | Ledger uniqueness key | **Composite PK `(student_id, event_id, resource_type)`** | Matches every existing per-student table in `0001`; and one learning event grants **two** rows (xp+gold), so a single-column `event_id` PK is *literally impossible*. | The named alternative ("embed the sub in `event_id` to keep §8's single-column PK") is a stringly-typed key that fights the schema **and can't hold the two-row grant** — a false option. |
| **D-R9** | One `grantResources` call or two | **One atomic call**, one `event_id`, two ledger rows | `withTransaction` already exists; the atomicity invariant (INV-COS-5) wants XP+gold to land together or not at all. | Two calls = a partial-state window + two idempotency keys to keep consistent, for no benefit. (Same decision as D-R5, viewed twice.) |
| **D-R7** | Island-condition timestamp source | **A new island-scoped `last_restored_at`** (resource §8.3) | Condition is island-wide and restored by the **economy** on an interleaved clear; `last_practiced_at` is per-node and owned by the **mastery** lane. | Reusing `last_practiced_at` couples the economy to a mastery-lane write and makes "restore" ambiguous (which nodes? written by whom?). *Cross-lane: confirm with the mastery owner it stays visual-only — that part is already an invariant.* |
| **D-R6** | Rolling-cap scope + window | **Cap the repeatable source only** (interleaved row 2, both its gold and its XP); leave one-time grants (rows 1, 3) uncapped. Window/size are **§12 constants**, not a design call. | Row 2 is the only farmable path; one-time grants are monotonically bounded already, so capping them would be wrong. | Capping one-time grants throttles honest first-time progress; not capping row-2 XP leaves an XP farm. Note: half of D-R6 (window/size) is tuning, not a decision. |
| **D-TH1** | Town Hall fixed vs. movable | **Fixed at center** (seed a non-node entry, pre-mark its cells occupied). | Layout isn't persisted, so a "moved" hall snaps back on reload anyway; fixed gives the stable cold-start landmark the spec wants. | "Movable-but-non-deletable" adds special-case placement/deletion logic for a feature that **can't survive a reload** until placement persistence exists (a separate, unbuilt feature). |
| **D-TH2** | Retroactive center-collision reconcile | **Reserve the center from day one** (option c). Do **not** build the "relocate the legacy building" logic (option b). | Since layout isn't persisted, there is **no legacy layout to collide with**; reserving the center makes the collision structurally impossible for every session. | Building (a)/(b) now is dead code guarding an impossible state. *Flagged malformed below.* |

---

## C. Genuine product/design calls — ranked by how much they block (10)

Only **#1 is a hard blocker** for the earn path (and even it has a safe fallback).
**#2–#3** are load-bearing for the design's coherence but have safe defaults.
**#4–#10 can ship as the stated default and be tuned later.**

### 1. D-R4 — How do we keep the one repeatable earn path unfarmable?  🔴 BLOCKS
Interleaved practice is the only repeatable source of *either* resource, so the
earn path can't ship without an anti-grind rule. This is also the **cross-lane
seam**: the rule needs a signal from Anthony's session grading (what counts as
"advancement / new evidence").
- **(a) Cap-only (MVP default):** keep the two structural layers already inherent
  to the design (server-composed interleaving removes single-skill grind;
  repair-gold is bounded by island condition) + a rolling cap (D-R6). Ships now;
  no dependency on Anthony's grading detail.
- **(b) Advancement-weighted:** a repeat that surfaces no new mastery evidence pays
  little/nothing. Pedagogically ideal, but needs Anthony to define the
  "advancement" signal on the session result first.
- **(c) Pure diminishing returns per window.** Simple, but pays for empty
  repetition.
- **Recommend (a) for MVP, (b) as the post-MVP target.** One-line: ship the cap,
  defer the sophisticated rule until the interleaved session contract exists.
  **Lock the principle now even if the only knob is the cap.**

### 2. D-R1 — What is XP actually *for*, beyond a number in the HUD?  🟠 load-bearing (default exists)
This is the keystone that justifies a *second* resource existing at all. Hard
guardrail (already fixed by §3.4 / INV-COS-1): whatever XP drives, it **cannot
gate learning** — it can only produce a badge or a cosmetic.
- **(a) A player level/rank badge only** (Apprentice → Journeyman → …).
- **(b) Level/rank + milestone-granted prestige cosmetics** (see D-R2) — a tangible,
  learning-only payoff.
- **(c) XP drives nothing** (pure display). → invites "why two numbers?" and
  undercuts the whole two-resource rationale.
- **Recommend (b).** One-line: give XP a real, cosmetic-only payoff so "depth"
  pays off without ever gating content. Ships as (a) first if needed; (b) is
  purely additive.

### 3. D-R2 — Have XP-prestige cosmetics, and which / how many?  🟠 load-bearing (default exists)
The mechanism is already in the data model (`acquisition: {via:"gold"} | {via:"xp_prestige"}`);
this is a **catalog/content** call, not an engine call.
- **(a) A small prestige set** (e.g. one granted skin/badge at a few XP milestones),
  everything else gold-purchasable.
- **(b) A large prestige tier.** More authoring; risks making gold feel secondary.
- **(c) None** — collapses into D-R1(c).
- **Recommend (a).** One-line: a few earned-only items give XP teeth cheaply; tune
  the split later since it's just descriptors.

### 4. D-TH3 — How many completed skills before the Town Hall offers interleaved practice?  🟡 SHIP-DEFAULT
UX affordance, **never a gate** (§6.1). Structural floor: you can't *interleave*
fewer than 2 skills.
- **Options:** `2` (the hard floor) vs. `3–4` (a richer first mix).
- **Recommend default `2`** (a §12 constant), tune up if the first session feels
  thin. Not a real blocker.

### 5. D-R8 — Ship the shop with the economy, or bank gold first?  🟡 SHIP-DEFAULT (scheduling)
Mostly a roadmap call. Because the catalog is now **code-resident** (§8.4), the
parent's "empty reward" worry (D4) is largely dissolved — the shop can ship with
the descriptors.
- **Recommend ship shop + economy together.** One-line: no reason to mint gold with
  nothing to buy when the catalog is just code.

### 6. D-TH6 — How big is the central keep-out?  🟡 SHIP-DEFAULT (art-driven; geometry is grounded)
- **Grounded:** use an **even** footprint so the hall sits exactly on the origin —
  `2×2` (identical to the existing towers) as the minimum, up to `4×4` for a
  grander civic hub; both sit comfortably inside `BUILDABLE_RADIUS = 22`.
- **Recommend `2×2` default**, size up with the authored model. Interacts with
  D-TH1/D-TH2 (bigger keep-out = larger reserved center).

### 7. D-TH7 — The D1 hub's identity/name (distinct from the City Bank).  🟡 SHIP-DEFAULT
Needs one label + one `built` GLB. Depends on the **already-decided** `NUM.S →
"City Bank"` rename (parent §7.3) landing, or a hub called "Town Hall" sits beside
a skill building called "Town Hall."
- **Recommend a placeholder "Civic Center / Town Hall" now**, finalize with the
  rename pass. Evan owns the model; Anthony any prose.

### 8. D-TH4 — Does the Town Hall level up visually, driven by what?  🟡 SHIP-DEFAULT
- **(a) Static per island** (MVP).
- **(b) Driven by count of mastered buildings** — a clean "your town grows as you
  learn" signal with **no economy coupling**.
- **(c) Driven by XP level** — couples it to D-R1.
- **Recommend (a) for MVP; (b) if a tier is wanted.** One-line: avoid making a
  learning-adjacent visual depend on the economy (keeps the firewall obvious).

### 9. D-TH5 — Is the island's advisor NPC hosted at the Town Hall?  🟡 SHIP-DEFAULT
Narrative. The theming spec frames D1's advisor as the City Clerk who "hands over
the keys" (Island_Themes §2.2), which fits a civic hub.
- **Recommend yes**, but it's pure narrative polish — defer freely.

### 10. D-R10 — Does clearing the storm grant a one-time XP prestige credit?  🟢 LOWEST
Grants no gold either way (fixed). A storm clear is real retention, so a one-time
XP badge is *defensible* but adds a third XP path.
- **Recommend no grant** (default). Keeps "storm = checkpoint-only, grants no
  resources" maximally clean; add later if XP prestige (D-R2) wants the hook.

---

## Interactions (answering one constrains another)

- **Town Hall placement (D-TH1/D-TH2/D-TH6) ↔ the `worldLayout` occupancy grid.**
  All three are the same grid math (`isPlacementValid`/`occupiedCells`). The
  keep-out size (D-TH6) sets how much center you reserve; because layout isn't
  persisted, that reservation is what makes D-TH2's collision impossible and makes
  D-TH1 "fixed" trivial. (Irony worth noting: the current NUM.S "Town Hall" deco
  tower already lands center-most in auto-layouts — the exact spot the new hub
  wants — which is *why* it's being renamed City Bank.)
- **XP's purpose (D-R1/D-R2) ↔ §8 "the economy never gates learning."** This is the
  interaction the task flagged. It's already resolved by §3.4 / INV-COS-1: XP's
  payoff space is **bounded to badges + granted cosmetics**. So D-R1/D-R2 are
  product calls *inside a fixed guardrail*, not open-ended.
- **D-TH4 (visual tier) ↔ D-R1 (XP level).** If the tier is XP-driven it depends on
  D-R1; recommend driving any tier by **mastered-building count** instead, to keep
  the tier off the economy entirely.
- **D-R4 (anti-farm) ↔ D-R6 (cap scope) ↔ Anthony's interleaved grading (§11.3).**
  The sophisticated anti-farm rule can't be fully specified until the interleaved
  session emits an "advancement/new-evidence" signal — which is Anthony's lane.
- **D-R5 ↔ D-R9** are one decision (composite key ⇔ one atomic two-row grant).
- **NUM.S → "City Bank" rename (decided) ↔ D-TH7.** The hub can't be unambiguously
  named until the rename lands. Note the hub is **not a node**, so it never appears
  in the earn table and grants nothing itself.
- **Earn table row 1/row 3 ↔ the generated `completion_status` + test-out.** See
  malformed/seam note below.

---

## Flagged: malformed or wrong-question decisions (blunt)

- **D-TH2 is premature — it answers a problem the architecture doesn't have.** It
  asks how to reconcile a *saved* legacy layout occupying the reserved center, but
  **no building layout is persisted** (no table; server reads only node/neighborhood
  state; `citySession` starts empty; `types.ts` says "in-app session state"). There
  is nothing to collide with. The honest resolution is the one-liner "reserve the
  center from day one"; options (a) "nudge the reserve" and (b) "relocate the
  conflicting building" are engineering for an impossible state and should **not be
  built** unless/until placement persistence is added. Answer the question it
  *should* ask, not the one it asks.
- **D-R5 offers a false choice.** "Keep §8's single-column `event_id` PK" cannot
  coexist with the decided two-resource model (one event → two rows). It isn't a
  real fork; it's "confirm the composite PK." (Hence it's in bucket B, not C.)
- **D-TH8 asks a question its own invariant already closes.** The mechanically
  interesting / punitive version is forbidden by INV-COS-2 + Mastery §5; only a
  cosmetic flourish remains, which isn't really a "design decision." (Hence bucket
  A.)
- **Half of D-R6 isn't a decision.** The cap *window/size* are explicitly §12
  tuning constants; only the *scope* is a (small, clear) call. Don't spend
  deliberation on the numbers.
- **Implementation seam the earn table glosses (not a decision, but must be
  reconciled):** row 1 "building completed" assumes a clean completion event, but
  in the real schema `completion_status` is generated from `mastery >= 2`, while the
  test-out amendment completes at **mastery 0**. So for a normal node, "completed"
  coincides with mastery crossing 2 (which also fires row-3 stars 1 & 2); for a
  test-out node it fires at 0 stars. Gabe's grant-trigger derivation must handle
  both, and everyone should agree a "star" (row 3) = the monotonic `mastery` value
  0–3, so the first XP star-credit can legitimately fire *before* completion
  (mastery 1 = below the completion bar).

---

## Appendix — fastest path through this

1. **Confirm A wholesale** (D-R3, D-TH8) — one sentence each; they're forced.
2. **Skim B and accept/flip** (D-R5, D-R9, D-R7, D-R6, D-TH1, D-TH2) — the
   recommendations follow from the stack; the only "decision" is whether to
   override an engineering answer.
3. **Think about C top-down**, and in practice only **D-R4** (with **D-R1/D-R2** as
   the coherence pair) needs real deliberation; **D-TH3–D-TH7, D-R8, D-R10** can be
   accepted as the stated defaults and tuned.
