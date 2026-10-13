# The Town Hall — Island Hub (SETTLED DESIGN — implementation-ready)

> ## ⚠️ 2026-07-26 AMENDMENT — pre-seeded, always-built, movable (supersedes below)
>
> The Town Hall design was **simplified** after user confirmation, reversing three
> earlier rulings. Where this banner disagrees with any section below, **the banner
> wins** (the inline sections are annotated but kept for provenance):
>
> 1. **Pre-seeded, never placed (reverses D-TH1).** The hall **already exists** on
>    every island from the start — seeded as near the **island centre** as the grid
>    allows (`citySession.ts`). Its footprint was later widened to **3×2** (D-TH6,
>    2026-07-26): the odd width can't centre exactly, so it sits ~2u off-centre on X
>    (Z stays centred). The player never *places* it; there is **no build-menu card**
>    for it and **no "found your hub" first action**.
> 2. **No first-placement gate (reverses the §4.1/§4.3 gate).** Because nothing waits
>    on the hub being placed, skill buildings are **placeable immediately**. The gate
>    is removed from *both* enforcement points (`citySession.placeSkill` and the
>    `CitySurface` build menu).
> 3. **Always built — no stage progression (reverses D-TH4).** The hall renders the
>    finished **`townhall-built`** model at all times; **`townHallStageForCompletion`**
>    and the completion-fraction stages (§3.1/§3.2) are **removed**. The
>    `townhall-site` / `townhall-construction` GLBs are **retained but unreferenced**
>    (kept in the registry) in case the hall earns a construction upgrade later.
> 4. **Still movable (D-TH9 stands).** The player relocates the hall with the ordinary
>    move feature; the placement **ghost shows the finished hall** while moving. This
>    is now the *only* place the hall's ghost appears.
> 5. **D-TH10 is CLOSED.** Pre-seeding makes "a building arrives without a player
>    action" the **norm**, not an exception, and the hub is seeded into occupancy
>    **before** any auto-layout (`defaultPlacements` reserves it), so no skill is ever
>    dropped on top of it. Existing dev-persistence snapshots that predate the hub gain
>    one on restore (a migration in `createCityDevSession`).
>
> **KEPT unchanged:** the hall is a genuine **non-skill** hub (its own id/descriptor,
> tracked apart from skills; §2, §7), a **3×2** footprint (D-TH6, widened 2026-07-26),
> its **own click
> panel** (island progress + the disabled interleaved-practice entry; §6, §9 — it has
> no lesson and never opens the lesson menu), and every cross-lane seam in §10.

**Status:** SETTLED DESIGN, implementation-ready — **as amended by the 2026-07-26
banner above** (pre-seeded / always-built / movable; the gate and stage progression
are removed). Every original Town Hall design decision (D-TH1..D-TH8) is settled;
D-TH1 and D-TH4 are **reversed by the amendment**, **D-TH9** (buildings are movable)
stands, and **D-TH10 is now closed** (§11). The pre-seeded hub, gate removal, and
always-built rendering **are implemented** (`citySession.ts`, `CitySurface.tsx`,
`townHall.ts`), and the game-lane half of the `NUM.S` rename has landed, so
**D-TH7 is resolved** and "Civic Center" is final (§10.4). Still open are cross-lane
seams flagged in §10 (interleaved item selection/grading is Anthony's lane; the lesson-
prose + item-bank half of the `NUM.S` rename).

> **CORRECTED 2026-07-28 — read this before trusting any building NAME in this file.** Two
> things moved after it was written, and the file says neither. **(1) `NUM.S` is "Assembly
> Hall", not "City Bank."** City Bank shipped in #148 on 2026-07-27 and **D-ERA29** replaced it
> the next day, once era one's prehistoric art landed and a bank stopped being possible; every
> "City Bank" below is one-day-old history, kept rather than overwritten because the D-TH7
> argument attached to it is the one that was re-checked. **(2) The hub is dressed "Gathering
> Round" in era one (D-ERA31), and `NUM.S` "Roundhouse."** Those are per-era *subtitles* under
> D-ERA29, so **both stable names — the hub's Civic Center and `NUM.S`'s Assembly Hall — are
> exactly as this file settled them, and D-TH7 is untouched.** D-ERA31 does leave the hub an
> **art** obligation: its `built` model is not round yet (§8, era one's §6).
>
> **And a citation this file gets wrong in three places: "Civic Center" shipped in PR #132**,
> not #112. **#112 is the issue** #132 closes, and it is still open; **#148** is the separate
> `NUM.S` rename. Merge times read from the PRs' own `mergedAt`: #132 at 2026-07-27T16:54:02Z,
> #148 at 19:28:49Z.
This spec deepens the parent design
`docs/superpowers/specs/2026-07-25-island-decay-and-gold-design.md` (§5, "The
Town Hall") for the game/city lane. It builds
**against** `docs/superpowers/specs/Game_Architecture_Blueprint.md`,
`docs/superpowers/specs/D1_City_Builder_Design_Spec.md`,
`docs/superpowers/specs/Immersive_City_Shell_Spec.md`,
`docs/superpowers/specs/City_Art_Bible.md`, and behind those
`docs/Contracts.md` §1/§3/§8 and `docs/Mastery_Scoring_Spec.md`. **Where this doc
disagrees with any of those, those win.**

**Owner:** Evan (game/city lane — `engines/game`, `apps/web/src/city`). Touches
Anthony's lesson-engine lane at the interleaved-practice seam (§6) and Gabe's
economy lane at the earn/HUD seam (§6, §7). **Cross-lane seams are flagged inline
and collected in §10.**

**Companion:** `docs/superpowers/specs/2026-07-25-resource-model-xp-gold-design.md`
(XP + gold: the wallet/ledger/earn model, the numbers the Town Hall displays, and
the grant fired when interleaved practice clears). **Why two specs, not one:** the
Town Hall is a game/city-lane *building + UX* concern (Evan) that exists even
before the economy lands (it fixes cold-start and hosts interleaved practice); the
resource model is a *data-model/economy* concern (Gabe, `packages/economy` +
`services/economy-api`) referenced by many surfaces beyond the Town Hall (HUD,
shop, cosmetic wallet/inventory). They meet at one clean seam (the Town Hall launches
interleaved practice → the economy grants; the Town Hall reads the wallet), so
splitting them keeps each matched to its owner and lane, mirroring how the repo
already separates `D1_City_Builder_Design_Spec.md` (game) from Contracts §8
(economy). They cross-reference rather than duplicate.

---

## 1. Summary

Every island has a **Town Hall**: a non-skill hub that is **pre-seeded at the island
centre** (2026-07-26 amendment; it already exists from the start — the player never
places it, only relocates it — §4). It is **where interleaved practice is launched**
(the repeatable gold path and the mechanism that repairs island decay) and the seat of
the island's **overall condition**, and it **displays XP and gold**. Each island's Town
Hall is its own authored **model** (skin varies per island) driven by **one shared
behaviour component** (structure never varies). It is never taught and never unlocked
by progress; it renders its **finished (`built`) model** at all times and anchors the
island as its central landmark from the moment it opens.

---

## 2. What the Town Hall is — and is not

### 2.1 Is

- **A non-skill hub, and the player's first placement.** On a fresh island the
  build menu offers **only** the Town Hall; the player positions it wherever they
  like, and only then do the skill buildings become placeable (§4). It stands
  before any skill building — but the player chooses where.
- **The launch point for interleaved practice** (§6): one session drawn across
  **all** skills the student has completed on that island — the repeatable gold
  path (resource spec §6 row 2) and the action that repairs island decay
  (parent §4).
- **The seat of island condition** (parent §4): its detail surface shows how
  weathered vs. pristine the island is and offers the restore action.
- **A resource read-out:** it displays XP (level + progress) and gold (balance),
  alongside condition — the three things the parent design names (§5).

### 2.2 Is NOT

- **Not a skill building.** It teaches nothing, has **no lesson**, no CFU, no
  practice set, and **no `node_id`.** It is absent from the skill graph, from
  `student_node_state`, and from the mastery/placement model entirely (§7).
- **Placed by the player, but never *unlocked* by progress.** It appears in the
  build menu and the player positions it like any building — it is simply the
  **first** placement the island offers (§4). It is never gated behind mastery, XP,
  gold, or a cosmetic and cannot be "earned." It is **not a node** (no mastery of its
  own), so its stages are **not driven by its own mastery** the way a skill
  building's are — but it is **not static**: it uses the **same three-stage
  `site`/`construction`/`built` grammar** as every other building, driven by the
  island's aggregate lesson completion (§3.1, D-TH4). There is **no reserved centre**.
- **Never a mastery/economy writer of progression.** It reads XP/gold/condition
  for display and hosts the interleaved-practice launch; it writes nothing in
  `student_node_state` and does not itself grant resources (the economy service
  does, on a verified clear — §6, resource spec §6).

---

## 3. One shared behaviour; a three-stage model family per island (skin varies, structure does not)

The parent design is emphatic: the Town Hall is **not one shared model
reskinned** — every island gets its own distinct model family (three construction
stages, §3.1), designed to its theme
(the starter island's is civic; Emberwatch's a monitoring post; Wyrmvault's a
dragon-hoard vault — `Island_Lesson_Themes_Design_Spec.md` §4). But however
different they look, **every Town Hall does exactly the same three things** (launch
interleaved practice, show condition, show XP/gold). So:

- **The MODEL is per-island data** — a **family of three construction-stage GLBs**
  (`site` → `construction` → `built`; §3.1/D-TH4). Add the Town Hall to the
  descriptor layer as a per-neighborhood skin, in the same spirit as the per-node
  building models in `apps/web/src/city/buildingAssets.ts` and the neighborhood
  descriptors in `engines/game/src/descriptors.ts`:

```ts
// PROPOSED. Illustrative. Per-island Town Hall SKIN — a THREE-stage construction
// model family mapping onto the standard site/construction/built grammar (§3.1/
// D-TH4). Behaviour is a single shared component; only this descriptor varies per island.
export interface TownHallDescriptor {
  // Three construction-stage GLBs [site, construction, built], e.g.
  // townhall-site/-construction/-built.glb in a townhall/ subdir (D1 assets: PR #86,
  // branch evan/townhall-assets).
  stage_models: readonly [string, string, string];  // [site, construction, built]
  label: string;         // student-facing name, e.g. "Town Hall" (D1 civic hub)
  // NB: no behaviour flags here — behaviour is identical across islands by design.
}
// One entry per neighborhood, alongside NEIGHBORHOOD_DESCRIPTORS.
export const TOWN_HALL_DESCRIPTORS: Readonly<Record<DomainId, TownHallDescriptor>>;
```

- **The BEHAVIOUR is one component.** A single shared React/three component (e.g.
  `apps/web/src/city/three/TownHall.tsx`) renders the **stage model picked from the
  island's lesson-completion fraction** (§3.1) and wires the identical
  launch/condition/resource behaviour, plus one shared DOM roster entry + one shared
  detail card (§4). **Anything else multiplies the code by the number of islands**
  (parent §5.1) — so there is exactly one behaviour path and N skins, enforced by
  keeping all logic in the shared component and all per-island difference in
  `TownHallDescriptor`.
- This is the same discipline the theming spec applies to lessons and the
  Blueprint applies to neighborhoods: **skin varies, structure does not.**

> **SUPERSEDED by the 2026-07-26 amendment (banner at top).** §3.1–§3.3 below
> specified a three-stage, completion-driven build sequence. That is **removed**: the
> hall renders the finished **`built`** model at all times (`townHallStageForCompletion`
> and `TOWN_HALL_STAGE_CUTS` are deleted). The three GLBs still exist, but only
> `townhall-built` is ever resolved; `site`/`construction` are retained unreferenced
> for a possible future upgrade. §3 otherwise stands (one shared component, per-island
> skin via `TownHallDescriptor`).

### 3.1 D-TH4 (DECIDED): the hall builds itself through three construction stages — REVERSED: always built

**DECIDED (D-TH4 — reversing the earlier "static per island"):** the Town Hall is
**one building that visibly builds itself as the island's lessons are completed**,
progressing through **three authored construction stages** that map exactly onto the
standard `site`/`construction`/`built` grammar — a fenced construction site (`site`),
then the structure rising inside scaffold (`construction`), then the finished hall
with its clock cupola (`built`) when the island is done.

- **Driven by lesson completion on that island — explicitly NOT XP-driven.** The
  stage is a function of how many of the island's skills the student has completed
  (a read of `student_node_state`, the learning state), never of XP, gold, or any
  economy value. **Direction of causation:** learning drives the cosmetic, never the
  reverse — so this preserves INV-COS-1 (nothing cosmetic/economic gates learning;
  here the finished civic centre is literally *built by* the student's learning). It
  makes concrete the decision brief's preferred "driven by learning progress" option.
- **The models are construction stages of ONE building, not independent tiers**
  (confirmed by inspecting the assets, PR #86). **Phase 2 was dropped as redundant**
  — it shared a pixel-identical bounding box *and* centre with phase 3, differing only
  in interior detail — leaving **three** stages that map exactly onto the standard
  grammar: **phase 1 → `site`** (an empty lot: perimeter footings + hoarding + survey
  stakes, ~4.65u tall, not a building); **phase 3 → `construction`** (the structure
  rising inside the scaffold + tower-crane envelope); **phase 4 → `built`**
  (crane/scaffold gone — footprint 37.5 → 25.4, recentred to the origin — the only one
  with a finished roof + cupola). Triangle counts climb 628 → 2554 → 3514. This is a
  **build sequence**, framed as construction stages throughout.
- **The hall looks like a building site when first placed — deliberately.** Because
  it is placed first (D-TH1) with zero lessons yet complete, it starts at stage 1
  (the fenced site). This is **intended and good** — the civic centre is built by the
  student's learning — so it must **not** later be "fixed" to look finished on day one.

### 3.2 Stage thresholds are PROPORTIONAL to the island's own skill count

Islands have very different skill counts (from the registry: D1 = 6, D2 = 5, D3 = 5,
D4 = 8, D5 = 6, D6 = 11, D7 = 4, D8 = 6, D9 = 9, **D10 = 2**), so **fixed** thresholds
break immediately: a "`built` at 6 completed" rule would leave D10's 2-skill island a
building site forever and top D6 out before halfway. Stages are therefore **fractions
of that island's own completable skill count**, so the hall reaches `built` exactly
when the island is finished, on every island.

Let **N** = the island's completable skill count (its domain's skill buildings; the
hub itself is not a skill and is not counted) and **c** = how many the student has
taken to **Complete** (§3.3). Fraction `f = c / N`:

| Stage | Model | Look | Completion fraction |
| --- | --- | --- | --- |
| **1** | `site` | Fenced construction site (empty lot) | `f < 1/2` (includes `f = 0`, just placed) |
| **2** | `construction` | Structure rising inside scaffold | `1/2 ≤ f < 1` |
| **3** | `built` | Finished hall + cupola | `f = 1` (every skill complete) |

Equivalently `stage = (c === N) ? 3 : 1 + floor(2c / N)`, which yields `built` **only**
at `c === N`. The exact cut point (halves here) is a **§12 tuning constant**, not fixed
in stone.

**Sanity check on the extremes (the point of the proportional rule):**
- **D10 Meridian Point (N = 2):** c=0 → `site`; c=1 (`f = 0.5`) → `construction`;
  c=2 (`f = 1`) → `built`. It shows **all three** stages and reaches `built` exactly
  when its two skills are done. (With three stages even a 2-skill island now hits
  every stage.)
- **D6 (N = 11):** c=0–5 → `site`; c=6–10 → `construction`; c=11 → `built`. All three
  stages, finishing exactly at 11. (A fixed "`built` at 6" rule would have topped it
  out at ~55%.)

Both reach `built` precisely when the island is complete — which an absolute threshold
could not do on both a 2-skill and an 11-skill island.

### 3.3 Which completion event counts

Count the **Complete** milestone (building finished — `completion_status` `complete` /
topped out), **not** the Construction (lesson + CFU passed) halfway step. Reason:
Complete is the milestone the rest of the design already treats as "this building is
finished" — it is what lights the mastery stars and what the storm reads
(`isNeighborhoodReady`); counting the halfway step would make the hall's stage
disagree with the visible state of the buildings around it. A **tested-out** node is
Complete (its building is finished without the lesson), so it counts — keeping the
hall's stage consistent with the visibly built-out island. (If the team later prefers
"lesson-earned completions only," excluding test-out, that is a one-line §12 definition
change; the recommended default counts every Complete building.)

---

## 4. Placement: pre-seeded at the centre, movable

> **SUPERSEDED by the 2026-07-26 amendment (banner at top).** This section originally
> specified *player-placed, first on every island* with a first-placement gate. The
> hall is now **pre-seeded at the island centre** and the gate is **removed** — the
> player never places it, only relocates it (§4.1's D-TH9 move flow still applies).
> The pre-seed lives in `citySession.ts` (a 3×2 near the origin, occupancy reserved
> before any auto-layout). The paragraphs below are retained for provenance.

### 4.1 The Town Hall is the player's first placement (D-TH1) — REVERSED: now pre-seeded

- **DECIDED (D-TH1): the Town Hall is a normal placeable building the player
  positions wherever they like — but it MUST be the first building placed on any
  island.** There is **no reserved centre** and it is **not fixed to the centre**;
  the player chooses its location exactly as for any building, through the same
  `placeSkill` → `isPlacementValid`/`occupiedCells` placement math. Founding your
  own hub is a stronger, more agentic first action than discovering one pre-placed,
  and it still solves the empty-island cold start (§5) — without taking the choice
  of *where* away from the player.
- **First-placement gating (the affordance).** On an island with **no** Town Hall
  yet, the build menu offers **only** the Town Hall; every skill building is
  unavailable until the hall is down, and becomes placeable once it is. This is a
  **placement-order rule in the game/city lane**, not a gate behind achievement:
  - It is **not** a learning, mastery, content, or economy gate, and it does not
    engage INV-COS-1. The Town Hall is **always immediately placeable** at island
    open — nothing gates *it* (no cost, no mastery, no XP/gold, no cosmetic).
    "First" is a single, free, trivial onboarding step, not a barrier behind
    progress: it writes nothing in `student_node_state`, touches no mastery or storm
    eligibility, and involves no economy value, so it cannot be misread as the
    economy or a cosmetic gating learning (Contracts §8 INV-COS-1/2).
  - Implemented as **build-menu availability only** (the game lane's placement UI);
    the frozen write boundary is untouched.
- **DECIDED (D-TH6): an ordinary building footprint — `3×2` (updated 2026-07-26; was
  `2×2`).** The hall is sized like any building and reserves nothing else. **Why 3×2:**
  the finished-hall model is **wider than deep** (~39.4 × 31.4, x:z aspect ~1.25), and
  `footprintFitScale` is a CONTAIN fit (`min(fitX, fitZ)`). At `2×2` the WIDTH bound the
  fit and the hall rendered ~7.60 × 6.06u; widening to **3 wide × 2 deep** makes DEPTH
  the binding axis, so it renders **~9.54 × 7.60u** — about **26% larger** with little
  wasted ground. (A `2×3` — deep, not wide — would have fit identically to `2×2` and
  merely reserved an empty strip, so it was rejected.) **Trade-off, stated honestly:**
  a width of **3 is odd**, so the hall can **no longer centre exactly** on the world
  origin — it sits **~2u (half a cell) off on X** (we lean it +X / east; the even depth
  keeps Z centred). This is accepted: a visibly larger hub better matched to the model's
  proportions is worth a half-cell offset no player will read as "off-centre". The
  footprint is **registered in `NODE_FOOTPRINTS` under `TOWN_HALL_ID`** (it is no longer
  the generic 2×2 fallback) and mirrored by `TOWN_HALL_FOOTPRINT`; both sit comfortably
  inside `BUILDABLE_RADIUS = 22` (`GRID_CELL = 4`). It occupies its own footprint cells
  like any building.
- **DECIDED (D-TH9): every placed building can be relocated, and the Town Hall is
  no different.** A "move a placed building" feature (in progress on branch
  `evan/move-buildings`, **not yet merged**) re-enters the existing placement flow
  pre-seeded with the building's current transform — drag or arrow-nudge, `R` to
  rotate, `Enter` to confirm, `Escape` to cancel and restore the original position
  and rotation. Moving is **purely spatial**: it never touches mastery, lesson
  stage, construction stage, or stars. This is *why the hall needs no special
  placement privileges* — **being first to be placed is its only distinction**;
  afterwards it behaves like any other building, movable included.

### 4.2 The existing D1 island, and the diagnostic test-out interaction

- **Grounded fact (unchanged):** building layout is **not persisted anywhere**
  today — there is no placements table, `GET /api/city` reads only
  `student_node_state` + `neighborhood_state`, and `citySession.ts` starts with an
  empty in-memory placements `Map` (`types.ts`: *"purely in-app session state"*).
  Gabe's placement-persistence work has **not started**.
- **No collision to reconcile — and for a simpler reason than a reservation.**
  Because the Town Hall is the **first** building placed, nothing can already be in
  its way; there is no reserved centre and no relocate logic. On the existing D1
  island, which today opens empty, the first building a (new or returning) player
  is offered becomes the Town Hall; everything else becomes placeable once it is
  down. (This replaces the earlier reserved-centre reasoning — the collision
  dissolves from placement *ordering*, not from spatial reservation.)
- **Diagnostic test-out interaction — RESOLVED for today's architecture, with a
  flagged boundary (D-TH10).** The test-out path pre-builds *passed* nodes
  (`placement_estimate >= 2`), but it pre-sets each node's **completion state**,
  **not its placement**: `citySession.ts::seedFromPlacement` resets `placements` to
  **empty** and only marks node state complete, and `placeSkill` drops a passed node
  in *already built* **when the player places it**. So **no building ever arrives
  pre-placed on the island before a Town Hall exists** — the player still places
  every building, Town Hall first, and tested-out ones simply appear complete once
  placeable. The "must be first" rule holds cleanly today.
- **CLOSED (D-TH10, 2026-07-26): buildings arriving without a player action is now the
  NORM.** The 2026-07-26 amendment makes the hub itself arrive without a player action
  (pre-seeded), which is exactly the case this flag anticipated. It is handled two ways:
  the hub's occupancy is **reserved before any auto-layout** runs (`defaultPlacements`
  takes a reserved-occupants argument, and the `?mock` demo passes the hub), so no skill
  building is ever auto-placed on top of it; and a dev-persistence snapshot that predates
  the hub **gains one on restore** (a migration in `createCityDevSession` seeds the
  centre, or the nearest open cell if a restored skill sits there). No open boundary
  remains.
- The D1 Town Hall is a **new civic asset**, visually distinct from the `hall` mass that
  `NUM.S` occupies. The hub and `NUM.S` must read as two different buildings; the label side
  of that is **done** — `NUM.S` is named **Assembly Hall** (§10.4). *(That mass id was `deco`
  until 2026-07-29, when era one's five remaining Gridwork-era ids were renamed onto the six
  ordinary types the style guides share; the id below, inside the correction box, is history.)*

  > **CORRECTED 2026-07-28. This bullet described the `deco` mass as "the City Bank — the
  > art-deco tower, which reads as a 1930s bank", and none of that loads any more.** Era one's
  > prehistoric set replaced all 21 GLBs in `be9f00b`; the art-deco tower is preserved and
  > deliberately unwired in `apps/web/src/city/art/models/gridwork-modern/`. `NUM.S` is
  > **Assembly Hall** (D-ERA29) and renders era one's **Roundhouse**, a conical thatch roof on
  > battered earth. **The "read as two different buildings" requirement is unchanged and got
  > harder**, because D-ERA31 makes the hub round too — era one's §6 now carries the plan-and-
  > scale separation that keeps the ring and the cone apart. Both buildings' shipped art is
  > **approved as it stands** (Evan, 2026-07-28).

### 4.3 Implementation pointer — where the first-placement gate lived (now REMOVED)

> **SUPERSEDED by the 2026-07-26 amendment (banner at top).** The first-placement
> gate described below is **removed** from both enforcement points
> (`citySession.placeSkill` and the `CitySurface` build menu); skills are placeable
> immediately. The layering note (all placement funnels through `isPlacementValid`)
> still holds and is why reserving the pre-seeded hub's cells before `defaultPlacements`
> is enough to keep skills off the hub.

Investigation of the placement model turned up a layering point worth recording so
the gate is not built in the wrong place:

- **All placement funnels through one validity path:** `isFootprintInBounds` →
  `isPlacementValid(transform, footprint, occupied)` in `worldLayout.ts`, shared by
  drag placement, `citySession.placeSkill`, and the DOM build menu.
- **But "the Town Hall must be first" is an ORDERING rule, not a geometry rule** —
  it does **not** belong in `worldLayout.ts` (which stays pure grid math). Put it in
  two places (defence in depth, so it cannot be bypassed programmatically):
  - **`citySession.placeSkill`** — the **enforcement point**: reject a non-hub
    placement while no hub exists.
  - **build-menu availability in `CitySurface`** — the **user-facing surface**:
    offer only the Town Hall until it is placed (the §4.1 affordance).
- **No geometry change is needed.** `isCellBuildable` is a pure radius check against
  `BUILDABLE_RADIUS = 22` with **no interior exclusions**, so the island centre is
  already buildable — the player may put the hub **dead-centre if they choose**. (An
  earlier draft wrongly assumed a reserved centre was required; it is not.)
- **Footprint parity governs centring — and the hall is now odd-width.** An **even**
  span snaps onto the world origin; an **odd** one sits ~2u (half a cell) off. With the
  2026-07-26 `3×2` (D-TH6), the **even depth** keeps the hall centred on Z, but the
  **odd width** leaves it ~2u off on X. `TOWN_HALL_CENTER_TRANSFORM` is derived via
  `snapToCell(0, 0, …)`, which seats it at `{col:-1, row:-1}` (leaning +X / east); the
  alternative seat (`col:-2`) is the same 2u west, so neither is more central.
- **Demo-only (`?mock`):** `defaultPlacements` sorts nearest-origin-first, so
  whichever node is listed first lands centre-most. If the hub should read as
  central in the mock demo city, it must be **first in that list** (a demo-authoring
  detail, not a rule).

---

## 5. Cold-start value (the pre-seeded hub anchors the island from the start)

> **UPDATED by the 2026-07-26 amendment.** Cold start is now solved by **pre-seeding**
> the hub at the island centre: a brand-new island opens with its **landmark already
> standing** at the origin (camera focus + advisor home from frame one), and the player
> arranges their skill buildings around it. (The earlier "found your hub as the first
> action" framing below is superseded — there is no founding step.)

A brand-new island would otherwise open as empty ground with nothing to anchor the eye
or the camera. The pre-seeded Town Hall gives the island its **landmark**, camera focus,
and advisor home immediately, and the player builds outward from it. **DECIDED (D-TH5):
yes — the island's
advisor NPC is hosted at the Town Hall**, which fits D1's City Clerk who "hands over
the keys" (`Island_Lesson_Themes_Design_Spec.md` §2.2 frames D1 exactly this way).
It is narrative polish and can be deferred within MVP, but the hub is its home.

---

## 6. Interleaved practice: launch + the cross-lane seam

### 6.1 The game requirement (what this spec owns)

- The Town Hall detail surface offers a **primary action** to start interleaved
  practice: a single session drawn across **all skills the student has completed
  on the island** (parent §3.2). This is the only place interleaved practice is
  launched.
- On a **server-verified clear**, the economy grants the interleaved payout
  (gold — its repair portion need-scaled by island condition — plus XP; resource
  spec §6 row 2, §7) and the island's **condition clock resets toward pristine**
  (the restore action, parent §4). The Town Hall reflects the restored condition
  and the updated XP/gold immediately on the post-session refresh (load-on-event,
  no realtime — Architecture §7).
- **When the action is meaningful:** interleaved practice needs at least enough
  completed skills to interleave. **DECIDED (D-TH3): offer it at 2 completed
  skills** — the structural floor (you cannot *interleave* fewer than two), as a
  tuning constant (resource spec §12) that can be raised if the first mix feels
  thin. Below the threshold the Town Hall shows the action as *not yet available*
  ("finish a skill or two first"). This is a **UX affordance, never a learning
  gate** (it never blocks a lesson, a node, or the storm).

> **AMENDED 2026-07-26 (D-TH3 — what counts toward the floor).** The floor of **2 is
> unchanged**; what counts toward it is now the **lesson engine's own completion rule**
> — a skill whose **practice set the learner has finished** (`mastery >= 1`,
> `lessons/lessonProgress.completedNodeIdsFrom`) **and** that the item bank can serve
> problems for (`lessons/interleavedPool.interleavedSkillIds`) — **not** the island's
> Complete-building count this section originally implied. Reason: a **tested-out**
> building is `completion_status: "complete"` at `mastery: 0`, so counting Complete
> buildings would light the action on an island with **nothing to mix** and drop the
> learner on the drill's locked screen. One rule, read by both the offer and the drill
> (§6.2), so the two can never disagree. The **`c of N` island progress** the panel
> displays still counts Complete buildings — that is build-out, a different number, and
> the panel labels each in text.

### 6.2 The seam (what belongs to Anthony)

**Item selection, presentation, grading, and any mastery-evidence write for the
interleaved set are Anthony's lesson-engine lane** (parent §3.2, D5). This spec
specifies only the *game* requirement (an all-completed-skills session launched
from the Town Hall) and the seam to host it, mirroring the existing stubbed
`LessonHost` seam (`Immersive_City_Shell_Spec.md` §6, `apps/web/src/city/
lessonHost.tsx`):

```ts
// PROPOSED. Illustrative. Interleaved-practice host seam (mirrors LessonHost).
// The GAME opens this; the LESSON ENGINE fills it. The game never composes/grades.
interface InterleavedPracticeHost {
  render(input: {
    islandId: DomainId;
    completedNodeIds: readonly string[];   // the game's contribution: who is eligible
    onExit(): void;
    onCleared(result: {                     // the engine's verified outcome
      session_id: string;                   // server-issued; becomes the grant event_id (resource §6 row 2)
      // ...engine-owned grading detail (advancement/evidence) stays in Anthony's lane
    }): void;
  }): ReactNode;
}
```

- The MVP can ship a **stub** host (like `stubLessonHost`) so the launch surface,
  condition-restore, and grant seam are demonstrable end-to-end before the real
  engine is wired — but the composition/grading contract (how the set is drawn and
  scored, and whether it writes mastery evidence) is **Anthony's to define and
  own**; this spec does not fix it (parent D5).

> **LANDED 2026-07-26 — no stub host was needed.** The lesson engine's endless drill
> already existed (`apps/web/src/lessons/DomainInfinitePractice.tsx` over
> `infiniteScheduler.createInterleavedScheduler`), so the Town Hall panel mounts it
> directly in a `WorldScene` rather than through the node-scoped `LessonHost` (the drill
> is a standalone island activity, not a node lesson). Composition, presentation, and
> grading stay entirely in Anthony's lane; the game contributes only the eligible-skill
> list and reports the clear. **Still open at this seam:** the drill is *endless* and has
> no engine-defined "session cleared", so the game currently defines a **round** (one
> pass through the mix: as many correct answers as there are skills being interleaved)
> and reports that. When the engine issues a real, server-verified session with its own
> `session_id`, that definition and the client-minted id should move into the engine.
- The **grant** on clear is the economy service's (resource spec §6 row 2, keyed
  by `session_id`); the Town Hall/game only reports the verified clear. The game
  never mints resources (INV-COS-4).

---

## 7. Data-model implications (the Town Hall is almost stateless)

Because the Town Hall is not a node, it adds **almost nothing** to the schema:

- **No `student_node_state` row, no registry node, no mastery/placement/
  completion.** It is invisible to the frozen §1 state and the mastery pipeline.
  It never appears in `getNodesByScope("mvp")`/`getNodesByDomain` and is not one
  of the six D1 plots.
- **Its placement is client layout state** — **player-placed** like any building
  (the required first placement; §4), held in the same in-app `placements`-style
  state in `citySession.ts`, never a shared-schema/game write. There is no reserved
  keep-out in `worldLayout.ts`; the hall uses the ordinary placement/occupancy math.
- **Island condition** is the one piece of new persistent state it *reads*, and it
  is modelled to persist **only a timestamp** (a "time since last interleaved
  restore"), with the condition value **derived** from descriptors — never stored
  as a number — so the decay curve retunes with no backfill (resource spec §8.3).
  That timestamp is a **new island-scoped `last_restored_at`** (resource spec D-R7,
  decided — not the per-node `last_practiced_at`, which the mastery lane owns).
  **Condition is visual-only and never touches monotonic mastery** (§10.1).
- **XP and gold** it displays are read from the wallet via the economy read API
  (resource spec §8.5 `getWallet`); the Town Hall holds no balance itself.
- **The interleaved session** is created/graded by the lesson engine (§6.2); the
  grant + condition-reset are the economy service's writes. The Town Hall writes
  none of it.

Net: the Town Hall is a **presentation + launch surface over existing/adjacent
state**, not a new authoritative writer — consistent with the game lane's frozen
write boundary (`Game_Architecture_Blueprint.md` §4: the game writes only
`neighborhood_state.checkpoint_cleared`).

---

## 8. Art-pipeline cost (three construction-stage models per island — like any building)

- **Three authored models per island** — the construction stages
  (`site`/`construction`/`built`, D-TH4), on top of that island's skill buildings
  (parent §5.1). This is a real, recurring cost that **rose from one to three** with
  the D-TH4 reversal, and it belongs on the art pipeline from the start rather than
  being discovered at island four.
- **This puts the hall on par with a skill building** — **three** stage GLBs, the
  same `site`/`construction`/`built` count. The only difference is the **driver**: a
  skill building's stage comes from its own node's mastery, while the hall's three
  stages come from the **island's aggregate lesson-completion fraction** (§3.1/§3.2);
  the shared behaviour component cross-fades between the three stage models as that
  fraction crosses a boundary.
- **Fits the standard three-stage pipeline (no deviation).** The hall's three stages
  map exactly onto the existing `site`/`construction`/`built` grammar
  (`buildingAssets.ts`), so it **reuses** that stage model — the only difference is
  the driver (island completion, not a node's mastery; §3.1). (An earlier draft used
  four stages and would have deviated; dropping the redundant phase 2 removed that,
  so there is no four-stage wiring problem to solve.)
- **Assets, and where they live (flag so it is not rediscovered painfully).** The
  three D1 models are `townhall-site` / `townhall-construction` / `townhall-built`
  (`.glb`) on **PR #86 (branch `evan/townhall-assets`)**, and they sit in a
  **subdirectory** `apps/web/src/city/art/models/townhall/` **on purpose**: the
  non-recursive `art/models/*.glb` glob would otherwise pick them up, break
  `buildingAssets.test.ts` (which asserts exactly **18** model URLs), and add
  meaningful weight to the city preload (~0.9 MB measured for the original four;
  three is a little less). Whoever wires the hall must move/register them
  **deliberately** (a dedicated town-hall loader/registry), not by dropping them into
  the shared glob. The stage-progression wiring is **not built.**
- **At MVP, only D1's Town Hall is needed** (D1 is the only populated island —
  Blueprint §6), and its three stage models already exist (PR #86). **DECIDED
  (D-TH7): the hub is labelled "Civic Center", and that label is now FINAL.** Shipped
  2026-07-27 in **PR #132** as `TOWN_HALL_LABEL = "Civic Center"` — the collision was live (a
  prereq card read "Complete Town Hall first" beside a visibly finished hub), so the hub
  took the non-colliding option rather than waiting on the cross-lane pass. The game-lane
  half of the `NUM.S` rename then landed in **#148** (§10.4), and after **D-ERA29** on
  2026-07-28 `NUM.S` reads **Assembly Hall**; either way no skill building shares the hub's
  identity. *(This line cited "#112" for the hub's label and "City Bank" for `NUM.S` until
  2026-07-28: #112 is the ISSUE #132 closes, and City Bank lasted one day — see the banner at
  §10.4.)* D-ERA31 dresses the hub as era one's *Stone Circle*, and **the shipped hall art
  is approved for it as it stands** (Evan, 2026-07-28) — it reads as a hearth with a shelter, so
  no redraw is owed. Evan owns the three stage
  GLBs; Anthony owns any prose. D2–D10 Town Hall models are authored as their islands
  are built, **each a three-stage set** (`site`/`construction`/`built`) in its
  island's hue family (`City_Art_Bible.md` §1.2); the D10 Geometry island's candidate
  is the "survey office" (`Island_Lesson_Themes_Design_Spec.md` §4 D10 note).
- **Fail-closed art:** like every building, a missing Town Hall model falls back
  to deterministic placeholder geometry so the hub is always present and legible
  (`Game_Architecture_Blueprint.md` §10; `buildingAssets.ts` fail-closed pattern).

---

## 9. Accessibility (DOM roster is the semantic source of truth)

The 3D/canvas view is **decorative** (`aria-hidden`); the keyboard-navigable DOM
mirror is the semantic source of truth (`Immersive_City_Shell_Spec.md` §8,
`City_Art_Bible.md` §11). Therefore:

- **The Town Hall is a real, labelled, focusable DOM entry** in the building
  roster, distinct from the six skill plots (e.g. named "Town Hall — island hub;
  not a skill"), so a screen-reader/keyboard user finds it exactly like any
  building.
- **The first-placement affordance is DOM-accessible.** On a fresh island the build
  menu conveys, in text (never colour alone), that only the Town Hall is placeable
  ("Place your Town Hall first — the rest unlocks once it's down"), and it is
  keyboard-operable like any placement control.
- **Its detail card is DOM**, exposing island **condition** (word label +
  meter, never colour alone — e.g. "Condition: weathered"), **XP** (level +
  progress-to-next), **gold** (balance), and the **primary action** to launch
  interleaved practice (or the "not yet available" affordance, §6.1) — all
  keyboard-operable.
- **Interleaved practice launch, exit, and results** are fully operable from the
  DOM alone; the hosted session inherits the lesson host's own accessibility
  (Anthony's lane).
- **Never colour alone:** condition, XP level, and gold all carry word labels /
  shapes in the DOM in addition to any canvas treatment (weathering, chipped
  facades). The decay visual (parent §4) is an enhancement over the DOM word
  label, never the only signal.
- **ARIA live regions:** announce condition changes and interleaved-session
  outcomes — polite for condition/progress, and the session result per the lesson
  host — reusing `announcements.ts`.
- **Reduced motion:** the weathering/restore transition and any Town Hall ambience
  respect `prefers-reduced-motion` (apply instantly, no animation), like all city
  ambience (`City_Art_Bible.md` §6–§7).

---

## 10. Cross-lane dependencies & contract interactions (must hold)

### 10.1 Decay must NOT touch monotonic mastery

Island condition (the decay the Town Hall seats) is a **separate, non-punitive
condition value driving visuals only**, derived from a "time since last
interleaved restore" timestamp. It **never** lowers `mastery` (monotonic, no
decay — `Mastery_Scoring_Spec.md` §8, Contracts §1) and never gates content. It
lands on the `review_due` nudge the mastery spec already anticipates. Stars never
fall; the paint does (parent §7.1). Confirm the `review_due`/`last_practiced_at`
interaction with the mastery owner (resource spec D-R7).

### 10.2 Interleaved practice composition + grading is Anthony's lane

The Town Hall owns the **launch surface and the game requirement** (an
all-completed-skills session); the **lesson engine owns** how the set is drawn,
presented, graded, and whether it writes mastery evidence (§6.2, parent D5). The
seam (§6.2) is the contract boundary.

### 10.3 The economy grant + HUD numbers are Gabe's lane

The XP/gold the Town Hall displays and the grant fired on an interleaved clear are
the economy service's (resource spec §6/§8/§9); the Town Hall reads the wallet and
reports the clear but **never mints resources** (INV-COS-4). The one-way invariant
holds: the Town Hall's economy surface never gates learning (INV-COS-1/2).

### 10.4 The `NUM.S` → "City Bank" rename (parent §7.3) — game lane LANDED 2026-07-27

> **CORRECTED 2026-07-28 — `NUM.S` IS NOT "CITY BANK". It is "Assembly Hall", and this whole
> section describes a name that lasted one day.** "City Bank" shipped in **#148** on
> 2026-07-27 and **D-ERA29** replaced it on 2026-07-28, because the era-one prehistoric art
> had landed and a *bank* cannot exist in a settlement of thatch and lashed timber. The stable
> name is now **Assembly Hall**, with the era-one dressing subtitle **Roundhouse** (D-ERA31);
> the display form is `"Assembly Hall, Roundhouse"`. `buildingAssets.ts` is authoritative.
>
> **What this section still gets right, and is worth keeping for:** the *reason* the rename
> happened, and the fact that D-TH7's constraint was satisfied by it. Both renames kept it —
> "Assembly Hall" shares no token with "Civic Center" — so D-TH7 is still resolved and the hub
> is still the only name in the city that reads as the town hall. The text below is left in
> place as the record of the first rename rather than overwritten, because the D-TH7 argument
> it makes is the one that was re-checked at the second.
>
> **A CITATION FIX in the same breath, because it is wrong throughout this file.** "Civic
> Center" shipped in **PR #132** (*"Rename the island hub to 'Civic Center' and stop announcing
> the raw sentinel (#112)"*, merged 2026-07-27T16:54:02Z). **#112 is the ISSUE it closes, not a
> PR**, and it is still open. **#148** is the separate, later `NUM.S → City Bank` PR (merged
> 2026-07-27T19:28:49Z). Both merge dates read from the PRs' own `mergedAt`. Wherever this file
> says the hub's label "shipped #112", read #132.

The dependency this section recorded is **discharged for the hub.** `NUM.S` is named
**City Bank** in `buildingAssets.ts`, so nothing in the game UI reads as a second town
hall and the hub's "Civic Center" is unambiguous (D-TH7 resolved, §11).

**What landed** (game lane, Evan): the building label + every surface that speaks it —
`buildingAssets.ts` (`D1_NODE_BUILDINGS`), `three/GridworkModelPreview.tsx`, and the
assertions in `buildingAssets.test.ts`, `CitySurface.test.tsx`, `announcements.test.ts`,
`UnlockCelebration.test.tsx`. No art asset was renamed: the D1 skill GLBs are
node-keyed (`num-s-*.glb`), so the exactly-18-URL invariant (§8) is untouched, and the
only `townhall-*.glb` files belong to the hub.

**What is still open, in other lanes** (parent §7.3 keeps the table): the item-bank
theming (`packages/item-bank/src/d1/theming.ts` — `D1_BUILDINGS`, `townLedgerSum`) and
the lesson prose (`content/lessons/d1/NUM.S.json`) still say "Town Hall", as does the
NUM.S row in `Island_Lesson_Themes_Design_Spec.md` **§2.3** (its elevator-floors framing)
and the shared authoring guidance (`.cursor/skills/practice-templates`,
`.cursor/skills/practice-hints`, `.cursor/agents/lesson-planner.md`). **This citation read
"§4" until 2026-07-27** — §4 is the D2–D10 placeholder themes; the NUM.S row is in §2.3
"Per-node city-theme framings". Now **tracked as issue #150** (assigned to Anthony), which
lists every site with line numbers. The parent warns a
partial rename is worse than none; the game lane went first anyway because the hub's
label was the live learner-facing collision and the remaining text is *lesson* framing a
learner reads inside a lesson, not a label beside the hub. **Signed numbers suit a bank
better than a town hall** — deposits and withdrawals, credits and debits, an account
going negative — and the item bank's own `townLedgerSum` already generates exactly that
ledger, so the content half is a relabel rather than a rewrite.

### 10.5 Descriptor + boundary discipline (Blueprint §4)

The per-island Town Hall skin is **data** (`TownHallDescriptor`, §3), resolved the
same generic way as neighborhoods; `@cr/game` stays framework-free (no GLB/React),
and the shared behaviour component + models live in `apps/web/src/city`. Adding an
island's Town Hall is "author one descriptor entry + its three stage GLBs," never an
engine branch — the Blueprint's extension discipline (§12).

### 10.6 The storm never interacts with condition mechanically (D-TH8)

**DECIDED (D-TH8): no mechanical storm↔condition interaction.** Storm eligibility
and clearing are a pure function of `mastery` (`isNeighborhoodReady`, Mastery §5,
Contracts §8 INV-COS-2, Blueprint §8.1) — island condition/economy can **never**
gate, harden, or otherwise affect the storm, and the storm stays non-punitive. The
only permissible tie is **cosmetic flavor** (a weathered island may merely *look*
stormier); it is optional and **ships as none for MVP.** The invariant already
closes the mechanically-interesting / punitive version, so there is nothing further
to decide (this answers parent §8 D7).

---

## 11. Decisions — all resolved (2026-07-25)

The eight original Town Hall decisions (D-TH1..D-TH8) are **settled**; a 2026-07-25
placement-ordering reversal re-derived D-TH1/D-TH2/D-TH6 (see the entries), decided
**D-TH9** (buildings are movable), and left **one** boundary flag open (**D-TH10**).
Each ruling is recorded at the section an implementer actually reads (not only
here); IDs are **retired/replaced in place** (nothing renumbered). See
`2026-07-25-townhall-resource-decision-brief.md` for the original triage.

| ID | Ruling | Recorded at |
| --- | --- | --- |
| D-TH1 | **REVERSED (2026-07-26) → PRE-SEEDED at the island centre; the player never places it, only relocates it.** No build-menu card, no first-placement action. (Was: player-placed, first on each island.) | banner, §4.1 |
| D-TH2 | **No collision to reconcile:** the hall is seeded at the centre with its occupancy reserved *before* any auto-layout, so nothing is ever in its way (no relocate-on-conflict logic) | §4.2 |
| D-TH3 | Offer interleaved practice at **2 skills to mix** (the structural floor); a tuning constant; never a gate. **AMENDED 2026-07-26:** the floor stands at 2, but what counts toward it is the drill's own rule — a **finished practice set** (`mastery >= 1`) on a skill the item bank serves — not Complete buildings, which a test-out sets at mastery 0 | §6.1 |
| D-TH4 | **REVERSED (2026-07-26) → the hall is ALWAYS `built` (no stage progression).** `townHallStageForCompletion` + the completion-fraction stages are removed; the hall renders `townhall-built` at all times. The `site`/`construction` GLBs are retained but unreferenced (future upgrade). (Was: 3 completion-driven stages.) | banner, §3.1 |
| D-TH5 | **Yes** — the island's advisor NPC is hosted at the Town Hall (D1 City Clerk) | §5 |
| D-TH6 | **Ordinary building footprint — `3×2` (updated 2026-07-26; was 2×2).** Wider than deep so a contain fit binds on depth, rendering the hub ~26% larger (~9.54 × 7.60u) to match the model's ~1.25 aspect. Registered in `NODE_FOOTPRINTS`. Trade-off: odd width, so ~2u off-centre on X (Z centred). Inside `BUILDABLE_RADIUS = 22` | §4.1 |
| D-TH7 | **RESOLVED 2026-07-27.** The hub's label is **"Civic Center"** (shipped in **PR #132**; *#112 is the issue it closes, not a PR*) and `NUM.S` no longer shares it, so the name is final, not a placeholder: the hub is the only thing in the city that reads as the town hall. **`NUM.S` is "Assembly Hall" (D-ERA29, 2026-07-28), not "City Bank"** — it was renamed to City Bank in **#148** and again a day later once era one's art landed, and **D-TH7's constraint was re-checked rather than assumed at the second rename**: "Assembly Hall" shares no token with "Civic Center". The hub also now wears the era-one dressing **Stone Circle** (D-ERA31, which authored it as *Gathering Round*; renamed 2026-07-29), which is a *subtitle* and leaves this label untouched. The lesson-prose + item-bank half of the rename stays open in Anthony's lane (§10.4) and does not affect the hub's label | §8, §10.4 |
| D-TH8 | **No mechanical storm↔condition interaction** (mastery-only eligibility, INV-COS-2); any tie is cosmetic-only and ships as none for MVP | §10.6 |
| D-TH9 | **DECIDED** — every placed building is movable (re-enter placement: drag/nudge, `R` rotate, `Enter`/`Escape`); purely spatial (no mastery/stage/star change). The hall is movable too; the ghost shows its finished model. Now the ONLY placement interaction the hall has | §4.1 |
| D-TH10 | **CLOSED (2026-07-26)** — pre-seeding makes "a building arrives without a player action" the norm. The hub's occupancy is reserved before `defaultPlacements` runs (so no skill lands on it), and pre-change snapshots gain a hub on restore. | banner, §4.2 |

**Still genuinely open:** only the cross-lane seams — interleaved item
selection/grading + any mastery-evidence write is Anthony's lesson-engine lane
(§6.2, §10.2), and the lesson-prose + item-bank half of the `NUM.S → City Bank` rename
(§10.4). The hub's label is **no longer waiting on anything** (D-TH7 resolved; the
game-lane rename landed 2026-07-27). (D-TH1/D-TH4 are reversed and D-TH10 is closed by
the 2026-07-26 amendment; D-TH9 stands.) **Tuning** (the D-TH3 threshold, decay
pacing/floor) lives in the constants table (resource spec §12; parent §8 D1/D2).

---

## 12. Self-review (consistency check)

- **Decisions status is honest.** D-TH1..D-TH9 are settled (D-TH1/D-TH2/D-TH6
  re-derived by the placement-ordering reversal; **D-TH4 reversed** — the hall builds
  through three completion-driven construction stages mapping onto the standard
  `site`/`construction`/`built` grammar, §3.1; **D-TH9 decided** — buildings are
  movable); **one** boundary flag remains open (D-TH10, the first-rule
  vs. future auto-placement), listed in §11. Other open items are cross-lane seams
  (§10.2, §10.4) — not design gaps. Neither the "move a placed building" feature
  (`evan/move-buildings`) nor the Town Hall stage-progression wiring (assets on
  PR #86) is built yet.
- **No hard-coded numbers.** The geometric facts are D-TH6's `3×2` *footprint*
  (grounded in `GRID_CELL`/`BUILDABLE_RADIUS`, finished-hall aspect ~1.23); the D-TH4
  stage cut point (halves), the interleaved threshold (D-TH3 = 2), and decay pacing
  are tuning constants (resource spec §12; parent §8 D1/D2).
- **No contradiction with the parent or ratified contracts.** Non-skill /
  player-placed-first / never-mastered (§2, §4, §7) ↔ parent §5; per-island model +
  one behaviour (§3) ↔ parent §5.1; decay visual-only, never mastery (§10.1) ↔ parent
  §4/§7.1 + `Mastery_Scoring_Spec.md` §8; first-placement gating is a placement-order
  rule, not a learning/economy gate (§4.1) ↔ Contracts §8 INV-COS-1; interleaved
  composition is Anthony's (§6.2) ↔ parent §3.2; economy one-way (§10.3) ↔ Contracts §8.
- **Matches the real stack.** Player placement via `placeSkill`/`isPlacementValid`
  and the empty in-memory `placements` map (`worldLayout.ts`/`citySession.ts`) — no
  reserved keep-out; a **three-stage** Town Hall model family (assets on PR #86) that
  **reuses** the standard `site`/`construction`/`built` grammar in `buildingAssets.ts`,
  driven by island completion (§8); DOM-roster-first accessibility
  (`Immersive_City_Shell_Spec.md` §8); load-on-event refresh (Architecture §7) — all
  as implemented, not the older PixiJS framing.
- **Every requirement reads one way.** The Town Hall launches interleaved practice
  and displays condition/XP/gold; it is a presentation/launch surface, not a
  writer; skins vary, one behaviour.

---

## 13. References

- `docs/superpowers/specs/2026-07-25-island-decay-and-gold-design.md` — parent
  (§5 Town Hall, §4 island decay, §3.2 interleaved practice, §7.3 City Bank
  rename, D6 retroactive islands, D7 storm×decay).
- `docs/superpowers/specs/2026-07-25-resource-model-xp-gold-design.md` — XP + gold
  (the numbers the Town Hall shows; §6 row 2 the interleaved grant; §8.3 the
  condition timestamp; D-R7).
- `docs/superpowers/specs/Game_Architecture_Blueprint.md` — descriptor-registry
  model, frozen write boundary (§4), extension discipline (§12).
- `docs/superpowers/specs/D1_City_Builder_Design_Spec.md` — the D1 slice
  (plots, construction, storm, accessibility) the hub sits within.
- `docs/superpowers/specs/Immersive_City_Shell_Spec.md` — HUD/overlays (§5),
  in-world entry-point + `LessonHost` seam (§6), accessibility (§8).
- `docs/superpowers/specs/City_Art_Bible.md` — hue families (§1.2), single-key
  lighting, juice/ambience + reduced motion (§6–§7), HUD (§8), accessibility (§11).
- `docs/superpowers/specs/Island_Lesson_Themes_Design_Spec.md` — per-island themes
  + advisor personas (§2, §4; D10 survey-office Town Hall candidate).
- `docs/Mastery_Scoring_Spec.md` §8 — monotonic mastery, no decay, `review_due`.
- `apps/web/src/city/worldLayout.ts` — free-build island geometry + the ordinary
  placement/occupancy math (`isPlacementValid`/`occupiedCells`) the hall uses like
  any building.
- `apps/web/src/city/citySession.ts` — in-app `placements` (empty on load) +
  `placeSkill`/`seedFromPlacement`; the player-placed, first-on-island Town Hall.
- `apps/web/src/city/buildingAssets.ts` — the per-node **3-stage** GLB pattern
  (`site`/`construction`/`built`, exactly 18 model URLs) the Town Hall's three-stage
  family **reuses** (§8); fail-closed loading pattern.
- `apps/web/src/city/art/models/townhall/townhall-{site,construction,built}.glb` —
  the three Town Hall construction-stage models (PR #86, branch `evan/townhall-assets`),
  held in a subdirectory outside the `art/models/*.glb` glob (§8).
- `apps/web/src/city/lessonHost.tsx` — the host seam the interleaved-practice
  host mirrors.
