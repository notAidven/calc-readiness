# Island Decay, the Town Hall, and Gold (PROPOSED — design draft)

**Status:** PROPOSED. Captured from the 2026-07-25 design conversation for team
review. Nothing here is ratified, and no code implements it yet. Several points
touch ratified contracts (§2 monotonic mastery, §8 cosmetic economy) and are
flagged in §7 — those need resolution before this can be planned.

**Owner:** Evan (game lane). Touches Anthony's lesson/mastery lane at the
interleaved-practice seam (§3.2) and the economy work in §8.

---

## 1. Summary

Three connected changes to how the city rewards and sustains learning:

1. **Finishing a lesson pays gold** in addition to upgrading its building, so
   progress has a currency consequence as well as a visual one.
2. **Island-wide decay replaces per-building decay.** Rather than each building
   ageing on its own timer, the whole island weathers together — buildings get
   visibly *chipped* — and one **interleaved practice** session across everything
   you have learned restores it.
3. **Every island gets a Town Hall** as its central, non-skill building — pre-seeded
   at the island centre (2026-07-26 amendment; not player-placed). It is where
   interleaved practice is launched, and it is the seat of the
   island's overall condition.

The intent is a loop where the city keeps asking you to revisit old material, and
the asking is pleasant (repair a weathered town) rather than punitive.

---

## 2. Why this shape is pedagogically right

Worth stating plainly, because it is the strongest argument for the design and
should survive any later re-tuning:

- **Interleaving beats blocking.** Practising a mixture of skills is
  substantially better for retention and transfer than drilling one skill at a
  time. Making the *island-wide* session the main gold path means the highest-value
  study mode is also the highest-value game mode.
- **Decay is spaced retrieval in costume.** A city that weathers over time and is
  restored by recall is a spacing schedule the student experiences as upkeep
  rather than as homework.
- **The reward is aligned, not bolted on.** Gold is earned by the two behaviours
  the product wants most: finishing new material, and returning to old material.

---

## 3. Earning gold

### 3.1 Lesson completion

Completing a lesson upgrades its building (the existing
Foundation → Construction → Complete progression) **and** grants gold. This is a
one-time grant per lesson: the ledger's deterministic idempotency key makes a
replay a no-op, so a lesson cannot be re-completed for more gold.

### 3.2 Interleaved practice at the Town Hall

A single practice session drawn across **all lessons the student has completed**,
launched from the Town Hall. This is the repeatable gold path and the mechanism
that repairs decay (§4).

Because the session is assembled *across* completed skills rather than chosen by
the student, its composition is the primary anti-grind control — see §6.

**Cross-lane note:** the item selection, grading, and mastery-evidence path here
belong to Anthony's lesson/practice engine. This document specifies the *game*
requirement (an all-skills mixed set launched from the Town Hall); it does not
specify how the set is drawn. That seam needs Anthony's agreement.

### 3.3 What gold is for

Gold is the currency the cosmetic economy spends (Contracts §8 — shop,
decorations, customisation). **RESOLVED (resource spec D-R8; §8 D4 below):** the
cosmetic catalog is now **code-resident**, so the shop ships **together with** the
economy and gold never accumulates with nothing to buy. The full XP+gold model
(what gold buys, the earn table, anti-grind) is settled in
`2026-07-25-resource-model-xp-gold-design.md`.

---

## 4. Island decay (replaces per-node decay)

**The unit of decay is the island, not the building.** Previously-considered
per-node decay would have meant six independent timers and six separate repair
chores; islandwide decay collapses that into one state and one action.

- Over time since the last interleaved session, the island's **condition** falls.
- Falling condition shows as progressive **chipping/weathering** across all built
  buildings — cracked facades, faded paint, debris — plus (proposed) a duller
  overall palette.
- One interleaved practice session restores condition toward pristine.

**Decay is cosmetic and non-punitive.** It must never lock content, block a
lesson, gate the storm, or reduce mastery (§7.1). A student who ignores it
entirely loses nothing except appearance and the repair gold.

---

## 5. The Town Hall

> **2026-07-26 amendment:** the hub is now **pre-seeded at the island centre** — the
> player never places it, only relocates it — and it is **always built** (no stage
> progression). See the Town Hall spec's top banner. The "player places it first" and
> "three completion-driven stages" framing below is superseded.

- **Every island has a Town Hall, pre-seeded at the centre** — it already exists from
  the start (the player never places it); the player arranges their skill buildings
  around it and may relocate the hub freely. It renders its finished `built` model.
- It is **not a skill building**: it teaches nothing, has no lesson, and is never
  *unlocked* by progress (see the Town Hall spec §4).
- It hosts **interleaved practice** and displays the island's overall condition,
  XP, and gold (the resource model adds XP — see
  `2026-07-25-resource-model-xp-gold-design.md`).
- Pre-seeding it at the centre fixes the cold-start problem directly: the island opens
  with its **landmark already standing** (camera focus + advisor home from frame one)
  rather than blank ground.

### 5.1 Each island's Town Hall is its own building

The Town Hall is **not one shared model reskinned** — every island gets its own
distinct town hall, designed to its theme. The starter island's is civic; the
volcano station's would be a monitoring post; Wyrmvault's a dragon-hoard vault.
This is the clearest possible signal of "you have arrived somewhere new", and it
gives each island an immediate landmark.

Two consequences worth planning around:

- **Asset cost is real and recurring.** **Three** authored models per island (the
  Town Hall's construction stages `site`/`construction`/`built` — see the Town Hall
  spec §3.1/§8), on top of that island's skill buildings. It should be on the art
  pipeline from the start rather than discovered at island four.
- **The role must stay identical everywhere.** However different they look, every
  town hall does exactly the same three things (launch interleaved practice, show
  condition, show XP/gold). The *model* varies per island; the *behaviour* is one
  shared component. Anything else multiplies the code by the number of islands.

This is the same discipline the theming spec already applies to lessons: skin
varies, structure does not.

> **Now specified + settled (amended 2026-07-26):** the Town Hall's full design — a
> per-island model family + one shared behaviour, **pre-seeded at the island centre and
> always `built`** (the earlier three completion-driven stages, D-TH4, and the
> player-placed-first rule, D-TH1, are **reversed** — see the Town Hall spec's top
> banner), **movable** (D-TH9), launch of interleaved practice, XP/gold/condition
> display, accessibility, and art cost — is in `2026-07-25-town-hall-design.md`. The
> boundary question (D-TH10) is now **closed** (pre-seeding makes auto-arrival the
> norm). This section is the origin summary; that spec is authoritative for the Town
> Hall.

---

## 6. The gold cap (anti-grind)

The stated requirement: *students must not be able to farm gold by repeatedly
grinding their easiest lesson.*

Three layers are proposed, strongest first:

1. **The session is interleaved by construction.** The student does not choose the
   questions; the set spans their completed skills. This removes the "grind the
   easiest lesson" strategy structurally rather than by policing it — there is no
   single-skill session to repeat.
2. **Repair gold is bounded by need.** A pristine island has nothing to repair, so
   the decay-linked portion of the payout is zero until condition falls again.
   This naturally rate-limits without a visible timer.
3. **A rolling cap as a backstop** on total gold earned from practice per rolling
   window (e.g. 24h), so no exploit in (1) or (2) can run away.

Exact numbers — payout per lesson, payout per session, decay rate, cap size — are
deliberately absent. They are tuning, they will be wrong on the first guess, and
they should be a single table of constants that can be changed without touching
logic. See open decision D3.

---

## 7. Contract reconciliation (must resolve before planning)

### 7.1 Decay vs. monotonic mastery — RESOLVED IN PRINCIPLE

`Mastery_Scoring_Spec` and `Contracts` §2 both ratify that mastery is monotonic:

> "Mastery starts at 0, is confirmed only through practice/evidence, and **never
> decreases**." … "`mastery = max(existing, evidenced)` (monotonic). Nothing lowers
> mastery in v1 (**no decay**)."

Island decay therefore **must not** be implemented as mastery decay.

The reconciliation: decay is a **separate freshness/condition value** — a function
of time since the last interleaved session — that drives *visuals only*. Mastery
stays monotonic and untouched. The same spec already anticipates precisely this:

> "It does not implement decay or demotion (monotonic in v1; `review_due` is a
> **non-punitive** post-MVP nudge)."

Island condition is the visual expression of `review_due`. Stars (mastery) never
fall; the paint does. This needs confirming with Anthony as the mastery owner, but
it requires no change to the ratified rule.

### 7.2 Gold vs. the §8 one-way invariant

Contracts §8 requires the economy be strictly one-way: it may never gate mastery,
completion, placement, lessons, or the storm. This design complies — gold is
earned *from* learning and spent only on cosmetics — but two rules must hold in
implementation:

- Grants stay **server-side and idempotent**; no client path mints gold.
- Decay and gold never gate access to any lesson or the storm checkpoint.

### 7.3 The Town Hall naming collision — RESOLVED (game lane landed 2026-07-27)

> **STATUS 2026-07-27, AMENDED 2026-07-28.** The **game-lane rows of the table below have
> landed**: `NUM.S` was named **City Bank** in `buildingAssets.ts` (**#148**) and is now
> **Assembly Hall** (**D-ERA29**, which replaced City Bank a day later once era one's
> prehistoric art made a bank impossible), and the hub's label is
> **"Civic Center"** (`townHall.ts`, shipped in **PR #132**; *#112 is the issue it closes, not
> a PR*), so the learner-facing collision this
> section was written about is **gone**. The **item-bank theming, lesson prose,
> authoring guidance, and lesson-theme spec rows are still open** in Anthony's /
> shared lanes — they say "Town Hall" in *lesson* text, which no longer sits beside a
> hub of the same name. The "one coordinated pass" rule below was deliberately broken
> in that order, because the label was the live confusion and the prose is not.

"Town Hall" on `NUM.S` was a placeholder. It is vacated for the island hub, and
**NUM.S becomes "City Bank"** — deposits and withdrawals, credit and debt, map
directly onto signed numbers, and the node already renders the art-deco tower
(`gridworkId: "deco"`), which reads as a 1930s bank.

**The rename is NOT a one-line change, and it crosses lanes.** "Town Hall" is
woven into the teaching content, not just the building label:

| Area | Files | Owner | Status |
| --- | --- | --- | --- |
| Building label + game UI | `apps/web/src/city/buildingAssets.ts`, `three/GridworkModelPreview.tsx`, `CitySurface.test.tsx`, `buildingAssets.test.ts`, `UnlockCelebration.test.tsx`, `announcements.test.ts` | Evan | **DONE 2026-07-27** |
| Item-bank theming | `packages/item-bank/src/d1/theming.ts` (`D1_BUILDINGS`, `townLedgerSum`), `d1/nodes/NUM.S/index.ts` | Anthony | open |
| Lesson prose | `content/lessons/d1/NUM.S.json` ("Town Hall keeps the town's books…") | Anthony | open |
| Authoring guidance | `.cursor/skills/practice-templates`, `.cursor/skills/practice-hints`, `.cursor/agents/lesson-planner.md` | Shared | open — describes `townLedgerSum`, so it moves **with** the item bank |
| Design docs | `Island_Lesson_Themes_Design_Spec.md` (§4 NUM.S row: the elevator-floors framing) | Shared (Anthony's spec) | open |

**No art asset is in scope.** The D1 skill GLBs are node-keyed (`num-s-site.glb` etc.),
not name-keyed, so nothing on disk encodes "Town Hall" and the exactly-18-URL invariant
in `buildingAssets.ts` / `buildingAssets.test.ts` is untouched. The only `townhall-*.glb`
files are the **hub's** three stage models in `art/models/townhall/`, which keep their
name (an internal sentinel, never learner-facing).

A partial rename is worse than none: a building called City Bank whose lesson
text discusses Town Hall is actively confusing. It was still landed in two passes (the
label first), because leaving the *hub* ambiguous was the worse of the two harms — a
learner reads the building name on the map and in prereq cards constantly, and the
lesson prose only inside NUM.S. That makes the content pass **owed, and soon**; track it
the same way the `lesson_shell` → `lesson_archetype` rename is tracked in
`TEAM_CHECKLIST.md`.

Happily, the ledger framing the lessons already use ("keeps the town's books",
deposits and withdrawals) fits a bank *better* than it fits a town hall, so the
content edits are a light touch rather than a rewrite. Concretely, for whoever picks up
the content rows: `townLedgerSum` already emits a deposit/withdrawal running balance from
$0, which is a **bank statement** as written — only the words "Town Hall's account" need
to become "the City Bank's account". The one place a real re-theme is worth considering is
`Island_Lesson_Themes_Design_Spec.md` §4's NUM.S row, whose first framing is **elevator
floors above and below ground**. A bank arguably teaches signed numbers *better*: a
balance that goes negative is an overdraft the learner can feel, credits and debits are
already signed, and "cancel a debt" is subtracting a negative. Floors-above-and-below is a
good number-line image and could stay as a secondary framing — but that is the content
owner's call, not the game lane's.

### 7.4 Scope relative to the economy work

Gold is meaningless without somewhere to spend it, so this design is coupled to
the economy sub-projects (backend, shop, decorations) discussed separately. This
document assumes gold is one resource in that wallet, not a parallel system.

---

## 8. Open decisions

> Several of these were **resolved 2026-07-25** by the Town Hall + resource-model
> work (see `2026-07-25-townhall-resource-decision-brief.md`): **D4, D6, and D7 are
> now ANSWERED** (marked below). D1/D2/D3 remain tuning, and D5 remains Anthony's
> lesson-engine call.

- **D1 — Decay pacing.** Over what period does a pristine island reach visibly
  weathered? Days? A week? This sets the whole return cadence.
- **D2 — Decay floor.** Does condition bottom out at "shabby", or can an island
  reach genuine ruin? A floor is recommended so long absences never feel
  humiliating.
- **D3 — Tuning constants.** Gold per lesson, gold per session, decay rate, cap
  size and window. Should live in one descriptor table.
- **D4 — Sequencing — ANSWERED (resource spec D-R8): ship the shop together with
  the economy.** The cosmetic catalog is now **code-resident** (resource spec §8.4),
  so there is no reason to mint gold with nothing to buy — the "empty reward" worry
  is dissolved. The shop UI ships with the catalog descriptors.
- **D5 — Interleaved set composition.** How many items, drawn how, and does it
  write mastery evidence (Anthony's call — it likely should, since it is real
  retrieval practice).
- **D6 — Retroactive islands — ANSWERED (Town Hall spec §4; D-TH1/D-TH2/D-TH6, as
  amended 2026-07-26):** yes — every island (including the existing D1) gets a Town
  Hall, now **pre-seeded at the centre** rather than player-placed (no build-menu gate).
  Its occupancy is reserved before any auto-layout, so nothing can be in its way (no
  collision to reconcile); the player may relocate it freely afterward.
- **D7 — Storm × decay — ANSWERED (Town Hall spec §10.6; D-TH8): no mechanical
  interaction.** Storm eligibility/clearing is a pure function of `mastery`
  (INV-COS-2, Mastery §5), so condition can never gate or harden the storm and it
  stays non-punitive. Any tie is **cosmetic-only flavor** and **ships as none for
  MVP.**
- **D8 — NUM.S's new name — DECIDED: "City Bank."** Remaining question is only
  *when* the coordinated cross-lane rename lands (§7.3), since it touches
  Anthony's lesson content and the shared authoring guidance.

---

## 9. References

- `docs/Mastery_Scoring_Spec.md` — monotonic mastery, `review_due`
- `docs/Contracts.md` §2 (mastery), §8 (cosmetic economy)
- `docs/Contracts_Amendment_Cosmetic_Economy.md` — ratified §8 detail
- `docs/superpowers/specs/Game_Architecture_Blueprint.md` — module boundaries
- `docs/superpowers/specs/Island_Lesson_Themes_Design_Spec.md` — per-island theming
  (the Town Hall will need a per-theme skin)
- `apps/web/src/city/buildingAssets.ts` — current D1 building names
