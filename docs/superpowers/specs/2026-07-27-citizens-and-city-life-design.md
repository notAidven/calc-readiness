# Citizens & City Life — simulated inhabitants for the island city (APPROVED DESIGN — not yet built)

> ## 2026-07-31 AMENDMENT 3 — CAPACITY IS NO LONGER MONOTONE: a crisis may take it away, and the people it was holding leave and come back (supersedes below, and supersedes AMENDMENTS 1 and 2 where they disagree)
>
> Grounded against `integration` at `03d5a2b9`. Every code claim here was **measured** at
> that SHA; the numbers and the injection that produced them are in
> `2026-07-29-mid-era-crisis-design.md` §5.28–§5.29, and this banner does not restate them
> as arguments.
>
> **The ruling, and it is the team lead's.** Asked whether a mid-era crisis may take
> population when D-CIT2 rules population a pure function of learning state:
>
> > *"I think people leave because there's a reduction of the capacity (so it goes back to
> > the capacity problem anyways), but they'll come back if you increase capacity via the
> > civic buildings."*
>
> It is carried as **D-CRISIS-28** in the crisis document, which owns it. What it does to
> **this** document is narrow one premise and two arguments that rested on it.
>
> **What is narrowed: CAPACITY IS MONOTONE.** That sentence appears in this design as a
> fact about learning state, and as a fact about learning state it is still true — mastery
> is monotone, placement is monotone, and no learning event ever lowers a capacity term.
> What is withdrawn is the stronger reading it was doing duty for: *capacity never falls,
> full stop*. A crisis may lower it, so `min(population, capacity)` may go **down**, and
> a citizen who was housed may become `waiting`.
>
> **Three places carry that premise and all three are amended IN PLACE, with the old
> reading kept beside the new one:**
>
> 1. **§7's third bullet, *"No citizen ever loses a home"*** — the promise, and the one
>    sentence in this document the ruling contradicts outright.
> 2. **§10.5's *"Why the index rule carries the no-eviction guarantee structurally"*** — the
>    argument. It is a valid proof from a premise that no longer holds universally, which is
>    a different thing from a wrong argument and is recorded as such.
> 3. **§12.1's *No eviction* row** — the guard. **Measured, not assumed:** with a
>    capacity-only penalty live in `buildingLedger`, the shipped sweep reports 8 passed / 0
>    failed and the whole citizens set reports 65 passed across 8 files. The same sweep fails
>    loudly, naming citizens and vectors, when capacity falls as a function of *mastery*. So
>    it is not vacuous — it is scoped to one variable, and the defect lives outside it.
>
> **What SURVIVES, and it is nearly everything:**
>
> - **D-CIT2 is intact.** Its forbidden loop is capacity feeding **arrivals**, and that is
>   still provably impossible: population is identical under every capacity table including
>   an all-zero one. The headcount is still earned by learning alone. What a crisis changes
>   is whether the settlement can *hold* the crowd, which was never a learning-state claim.
> - **D-CIT6's intent, in the form that matters.** Nothing keys off the learner. A departure
>   originates in a crisis the player chose to answer and a search step they chose to take,
>   never in study pace — which is `INV-ERA-3`, and is the narrower and more enforceable
>   statement of D-CIT6 that era progression's own reversal banner already put in its place.
> - **`waiting` stays the only state a displaced person occupies, and stays PATIENT.** No
>   citizen state may express harm; *leaving* is a fact about a building, never an attribute
>   on a person. The compiled exhaustive switch and the banned-substring list stand
>   untouched, and this ruling deliberately needs neither relaxed.
> - **The settled ending.** Full mastery still houses everyone. What a crisis can do is take
>   a settled island out of `settled` and let the player buy it back.
>
> **What this ruling does NOT settle, and it is where the code is owed.** `waiting` is
> bounded by `residence_capacity`, which is a sum over the six **skill nodes** — a crisis may
> not lower it (that would undo mastery, which the failure floor forbids) and a civic
> building adds exactly **zero** to it. The capacity the lead's lever moves is the economy's
> **livability**, and livability bounds nothing today. So the mechanism this design already
> has is the right shape on the wrong ledger, and reconciling them is
> **`2026-07-29-mid-era-crisis-design.md` O-20**, listed here as **§17 Q12**. **No code is
> changed by this amendment.**
>
> **KEPT unchanged:** every decision, every tuning number, all four GROUNDED CORRECTIONs,
> the whole accessibility section, and the arc. Nothing here touches how population is
> counted, who lives where, or what the island looks like when it settles.

> ## 2026-07-27 AMENDMENT 2 — three unbuildable spots are resolved, and the performance target is SET (supersedes below, and supersedes AMENDMENT 1 where they disagree)
>
> Writing the implementation plan
> (`docs/superpowers/specs/2026-07-27-citizens-and-city-life-implementation-plan.md`)
> found three places where this design **could not be built as written** — not
> disagreements of taste, but instructions that do not typecheck against the codebase —
> plus one open question the user has now answered. All four are settled here.
> **Where this banner disagrees with anything below, including AMENDMENT 1, this banner
> wins.** In fact it does not disagree with AMENDMENT 1 at all: that one is about the
> endgame, this one is about buildability and hardware.
>
> 1. **Roles are keyed on the NODE ID, in the neighborhood descriptor — not on
>    `gridworkId` (amends D-CIT3; new D-CIT17).** The old ruling was mine and it was
>    wrong: **the engine cannot see `gridworkId`.** It exists only in
>    `apps/web/src/city/buildingAssets.ts` (`D1_NODE_BUILDINGS`), `@cr/game` cannot import
>    `apps/web`, and `CityBuildingView` carries no art mass — so a role table in the engine
>    would have had nothing to key on. The role map now lives in
>    `engines/game/src/descriptors.ts` **directly alongside `building_archetypes`**: same
>    shape (`Record<node_id, …>` plus an explicit default), same place, same resolution
>    path through `resolveNeighborhood`. **The requirement was never "the art mass" — it
>    was "a key that does not move when a display name does", and the node id satisfies
>    it better**, being the registry's own primary key.
> 2. **Roads are NOT an input to the roster derivation at all (tightens D-CIT7; new
>    D-CIT18).** §10.1's sketch put `road_cells` in `CitizenRosterInput` "for routing
>    only" while §12.1 simultaneously demanded the roster be **deep-equal with and without
>    roads**. The invariant wins. Removing the parameter makes it true **by construction**
>    rather than by assertion, and routing loses nothing: it needs `worldLayout`, which
>    lives in `apps/web` anyway.
> 3. **Citizens are assigned to homes greedily in PLACEMENT order (new D-CIT19).** This
>    design never stated an assignment rule, and the two properties it *does* state pull
>    against each other. The rule is settled here **with its two consequences stated
>    plainly**, because they are the kind of thing that otherwise gets rediscovered
>    halfway through implementation. See §10.5.
> 4. **The performance target is SET, which closes §17 Q2 (new D-CIT20).** The floor is
>    **school Chromebooks with low-end integrated graphics**; the common case is **typical
>    student laptops with integrated graphics**. `MAX_RENDERED_CITIZENS` drops from a
>    headroom guess of 64 to a provisional **48**, and **§14's weak-machine ladder stops
>    being a contingency and becomes a shipping requirement.** See §14.
>
> Also corrected: two internal slips this document carried — §8.5's k=5 waiting range
> (which re-derives to exactly 0, not 0-14) and §8.2's Role column listing `park` as its
> own role against §3's explicit ruling that it is `civic`.
>
> **§17 Q2 is CLOSED. §17 Q4 (where the seed comes from) stays OPEN** — still Evan's
> decision, with Gabe signing off if it resolves toward reading schema state. One **new**
> question is opened by point 4 and is listed as Q11.
>
> **KEPT unchanged:** every other decision, every tuning number except the render cap,
> and all four GROUNDED CORRECTIONs. Nothing here touches the endgame, the arc, the
> accessibility requirements, or the no-punishment constraint.

> ## 2026-07-27 AMENDMENT 1 — the overcrowding endgame is REMOVED (supersedes below)
>
> After a team discussion the user **removed overcrowding as an endgame.** Where this
> banner disagrees with any section below, **the banner wins** — except against
> AMENDMENT 2 above, which is later and wins over both (the affected sections
> are rewritten in place, and the reversal is recorded rather than erased):
>
> 1. **Mastering all six skills leaves the island FULL, SETTLED, AND HAPPY (reverses
>    D-CIT4).** Everyone has somewhere to live, **nobody is left waiting**, and the
>    closing beat is a prompt telling the player this community is happy. **Reaching
>    capacity is no longer a motivator, a signal, or a pressure of any kind.**
> 2. **Mid-game waiting STAYS, and is now the only place a waiting crowd appears.**
>    People still arrive with nowhere to go and wait near the Civic Center; building
>    what they need still visibly takes them off the street. The arc is **a crowd with
>    nowhere to go, steadily taken off the street, resolving into a settled city** —
>    the waiting gives the middle its pull, and the resolution is the reward.
> 3. **Residential capacity now grows with MASTERY, not only with construction
>    (new — D-CIT15).** A mastered Rowhouse Flats houses more than a newly built one.
>    Population and capacity race, and mastery is what lets capacity win — so the
>    settled ending is **earned**, not arithmetic. This is the mechanism that resolves
>    the mid-game-waiting versus settled-endgame tension (§8.5).
> 4. **The next island is still unlocked by mastery, exactly as before.** That is
>    unchanged; it simply no longer has crowding pushing at it.
> 5. **The accessibility decision is CONFIRMED and widened (D-CIT13 amended):** both a
>    **persistent DOM readout** (population, housed, waiting) **and advisor callouts**
>    marking milestones and closing on the community being happy. The canvas is
>    `aria-hidden` decoration, so **the whole emotional arc — including the closing
>    "this community is happy" beat — must exist in text**, not only as a visual state.
>
> **Why (recorded so it is not relitigated):** the game's own design brief **bans
> scarcity and urgency as motivators** for a math-anxious audience, and overcrowding
> was **pressure dressed as success** — the one mechanic in the design that would have
> made *finishing an island* feel like a problem. Ending on a thriving city makes the
> reward for mastering an island **the island being good**, which is what the rest of
> the game already does.
>
> **KEPT unchanged:** everything else. Citizens are still derived and never persisted
> (D-CIT1), still paced by learning alone (D-CIT2), roles are still read from what the
> building already is rather than from its display name (D-CIT3 — though **AMENDMENT 2
> changes the KEY from the art mass to the node id**), filler buildings are still
> rejected (D-CIT5), nobody is ever punished
> (D-CIT6 — now strengthened, since waiting no longer survives into the endgame), roads
> still amplify and never gate (D-CIT7), and **all three GROUNDED CORRECTIONs stand**
> (§2, §5) — the placed-and-complete keying (D-CIT10) is now *more* load-bearing,
> because a tested-out learner must also reach the settled ending.

**Status:** APPROVED DESIGN — **as amended by the three banners above**: AMENDMENT 1 (no
overcrowding endgame; capacity grows with mastery), AMENDMENT 2 (the three unbuildable
spots resolved; the performance target set) and AMENDMENT 3 (capacity is no longer
monotone; a crisis may take it, and the people it was holding leave and come back). The
design was brainstormed and **approved by the user**; this document records it faithfully
and grounds it in the code as it stands on `integration` at `d958e5a`, with AMENDMENT 2's
resolutions re-grounded against `02acdab` and AMENDMENT 3's against `03d5a2b9`. Where the
codebase contradicts an assumption in the approved design, that is called out inline as a
**GROUNDED CORRECTION** rather than silently reconciled — all four are collected in §18.
**Twenty decisions (D-CIT1..D-CIT20)** are settled: **D-CIT4** is **reversed in place** by
AMENDMENT 1, **D-CIT3** and **D-CIT9** are **amended in place** by AMENDMENT 2, and
**D-CIT6** and **D-CIT19** are **narrowed in place** by AMENDMENT 3 (all five carry both
readings, so the change is recorded rather than erased); §17 lists what is genuinely
still open.

> **The "no code exists for this feature" paragraph was here and is CORRECTED rather than
> deleted, 2026-07-31.** It read: *"**No code exists for this feature**: there is no citizen
> module in `engines/game`, no instanced geometry anywhere in the R3F scene, and no
> population number on any surface."* It was true at `d958e5a` and the first clause has been
> false since **#160**: `engines/game/src/citizens.ts`, `citizens-population.ts` and
> `citizens-tuning.ts` all ship, with their invariant sweeps, and
> `apps/web/src/city/citizens.ts` is the web adapter. **The other two clauses are still
> true, measured at `03d5a2b9`, and they matter to AMENDMENT 3:** the only importer of
> `cityCitizenRoster` anywhere is its own test, so the roster is derived by nothing that
> renders and **no learner has yet seen a citizen, a crowd, or a waiting count.** So `waiting`
> is reachable in the arithmetic and unreachable in the product, and a crisis that displaced
> people today would displace them invisibly. PR #273 is the change that mounts it and is
> open (`mergedAt: null`).

**Sequenced by:** `docs/superpowers/specs/2026-07-27-citizens-and-city-life-implementation-plan.md`
— six independently mergeable phases, pure engine arithmetic first. That plan is where
AMENDMENT 2's three resolutions were found, and the two documents are kept in agreement.

**Owner:** Evan (game/city lane — `engines/game`, `apps/web/src/city`). This feature
is unusually self-contained for its size: it reads learning state that already
flows into the city and writes nothing. It touches Gabe's lane only at the HUD and
state-schema seams (§11.2) and Anthony's lane not at all. **Cross-lane seams are
flagged inline and collected in §11.**

**Builds against:** `docs/superpowers/specs/Game_Architecture_Blueprint.md`
(descriptor-registry model, the frozen write boundary §4, extension discipline
§12), `docs/superpowers/specs/D1_City_Builder_Design_Spec.md`,
`docs/superpowers/specs/Immersive_City_Shell_Spec.md` (§8 accessibility),
`docs/superpowers/specs/City_Art_Bible.md` (§6-§7 ambience + reduced motion, §11
accessibility), `docs/superpowers/specs/2026-07-25-town-hall-design.md` (the hub
citizens emerge from), and behind those `docs/Contracts.md` §1/§8 and
`docs/Mastery_Scoring_Spec.md`. **Where this doc disagrees with any of those, those
win.**

**Depends on (do not break):** the onboarding tutorial refresh in flight on branch
`evan/tutorial-refresh` (worktree `/Users/<user>/Remedial App - Calc-tutorial-worktree`,
at `0c1fab8`). That work owns `apps/web/src/city/coachmarks/**` and
`apps/web/src/city/onboarding/**`, and it is the surface that will eventually have
to **teach** this feature — the whole cold open in §2 is a tutorial beat with no
words. Nothing in this spec touches those files, and the tutorial does not block
the engine work (§11.4).

---

## 1. Summary

Today the city is a **scoreboard**. A building goes up when a skill is learned and
then nothing happens to it, forever. Six buildings and a hub stand on an island
with no one on it.

**Citizens make the city a place that is used.** Population is a **pure readout of
learning state**: every finished building brings people to the island, and mastering
its skill brings more. The people who belong in a building start using it — build
Rowhouse Flats and part of the crowd walks over and moves in; build Community School
and children start making the trip. The reward for learning stops being a number and
becomes **visible life**.

Three properties carry the whole design:

- **Derived, never persisted** (§4). Population is recomputed from learning state on
  every load, and individuals are generated from a **stable seed**, so the same
  person has the same look, the same home, and the same daily route across sessions
  without a single citizen being saved.
- **Paced by learning alone** (§5). One dial, no clock, no feedback loop from
  capacity back into arrivals. Un-gameable, and testable as arithmetic.
- **Never punitive** (§7). People with nowhere to live wait near the Civic Center,
  patient and unharmed. Nothing is ever lost, damaged, or degraded. A struggling
  student is never shown their people suffering for their slow progress.

And one thing worth stating up front, because an earlier draft of this design got it
backwards: **the island settles.** Mastering all six skills leaves it **full, settled,
and happy** — every home occupied, **nobody waiting**, and a closing beat that says so
in words. The waiting crowd lives entirely in the **middle** of the arc: people arrive
with nowhere to go, get **steadily taken off the street** as the city is built, and the
last of them are housed by the last mastery. **Reaching capacity is not a motivator, a
signal, or a pressure of any kind** (§6).

That is also the answer to the "only six buildings per island" constraint, and it is a
better one than crowding was: the roster stays at six **by design**, and six buildings
that forty-four people visibly live in, learn in, and work in read as a far bigger city
than twelve buildings nobody enters.

---

## 2. The loop (what a player actually experiences)

**The cold open.** You finish the diagnostic and load into an island carrying the
**Civic Center** and little else. People wander out of it with **nowhere to be**.
That is the goal, stated without a tutorial: they need somewhere to live, somewhere
to learn, somewhere to work.

- **Grounded:** the hub is pre-seeded and always built on every island
  (`townHall.ts` — `TOWN_HALL_CENTER_TRANSFORM`, `TOWN_HALL_LABEL = "Civic Center"`;
  town-hall spec 2026-07-26 amendment), and `citySession.seedFromPlacement` clears
  `placements` and `roads` while *keeping* the hub. So "a Civic Center and little
  else" is literally the state the app is already in after a diagnostic. The cold
  open needs no new machinery.

**Each skill learned raises a building, and the people who belong there start using
it.** Every building visibly takes people off the street:

| Build this | What changes |
| --- | --- |
| **Rowhouse Flats** (`NUM.2`) | Part of the waiting crowd walks over and **moves in**. The street empties. |
| **Community School** (`NUM.3`) | Children start **making the trip** — a route appears where none existed. |
| **Public Library** (`NUM.F`), **Town Hall** (`NUM.S`), **Clock Tower** (`NUM.5`) | People have somewhere to **work or visit** during the day. |
| **Central Park** (`NUM.4`) | People have somewhere to **be** that is not a doorway. |

**The shape of the arc.** Three beats, and the middle one is where the pull lives:

1. **A crowd with nowhere to go.** The island opens with **8 people** outside the Civic
   Center and **zero homes**. Nothing is built, so nobody has anywhere to be.
2. **Steadily taken off the street.** Each finished building takes some of them in —
   and each one also *brings* people, so the crowd is worked down rather than switched
   off. Finishing **Rowhouse Flats** is the largest single beat in the game.
3. **Resolving into a settled city.** At full mastery there are **44 people and 44
   homes**: every home occupied, nobody waiting, and the advisor closes on the
   community being happy (§13).

**Scale grows with the island.** Early on, a handful of individuals you can follow
across the island; later, a throng. **The growth itself is visible, and that arc is the
semester.** Concretely, under §8's numbers: **8 people** on a bare island, **44** at
full mastery — a five-and-a-half-fold arc the player watches happen.

> **GROUNDED CORRECTION 1 — "takes people off the street" covers two different things,
> and D1 has exactly one housing building.** Reading `D1_NODE_BUILDINGS`
> (`buildingAssets.ts`), the D1 roster is one residence (`rowhouse`), one school
> (`school`), one open space (`park`), and three work-or-visit buildings (`deco`,
> `slab`, `tower`). So there are **two different ledgers**, and the design's single
> phrase covers both: a building either takes someone off the street **permanently**
> (a home) or **for the day** (a school seat, a workplace, a destination). §8 tunes
> them separately.
>
> **Under the 2026-07-27 amendment this correction matters more, not less.** The
> settled ending is a statement about the **residence** ledger — everyone housed — so
> the fact that one terrace carries most of the island's housing is the central
> tuning problem, not a footnote. It is why capacity has to grow with mastery
> (D-CIT15) and why the buildings that are *not* housing are what create the mid-game
> crowd in the first place (§8.5). The `rowhouse` is not the only mass that carries
> flats — three others carry a few — but it carries **59%** of the island's homes.

---

## 3. Building roles are read from what each building already is

> **AMENDED 2026-07-27 (AMENDMENT 2, D-CIT17): the KEY changed from the art mass to the
> NODE ID, and the map moved into the neighborhood descriptor.** The original ruling is
> quoted below and its *reasoning* survives intact — a role table must not be keyed on a
> string somebody is allowed to rename — but the key it chose **cannot be read by the
> code that needs it.** Everything else in this section stands: three families, `civic`
> as the fallback, roles as data rather than an engine branch, and no authoring
> obligation per island. See §3.1.

**D-CIT3 (DECIDED, as amended): a building's social role is DERIVED from a stable
identifier the engine can actually resolve — its NODE ID — not from its display name and
not from a new authored field.** Housing is housing, a school is a school, and
**anything not obviously residential or educational is somewhere people work or visit.**
No renaming. Each island's building set defines its own social life for free.

*(Was: "DERIVED from its art mass (`gridworkId`)". Amended because `gridworkId` lives in
`apps/web/src/city/buildingAssets.ts`, `@cr/game` cannot import `apps/web`, and
`CityBuildingView` carries no art mass — so the engine-side table this decision calls for
would have had nothing to key on. §3.1 records the resolution and what it costs.)*

Three role families, and an explicit fallback:

| Role family | Means | D1 members (by `node_id`) |
| --- | --- | --- |
| `residence` | People **live** here. This is the building's *primary* purpose. | `NUM.2` (Rowhouse Flats) |
| `school` | People **learn** here — a daytime destination, not a home. | `NUM.3` (Community School) |
| `civic` | Work or visit — the **fallback**, so a new building is never role-less. | `NUM.S` (City Bank), `NUM.F` (Public Library), `NUM.5` (Clock Tower), `NUM.4` (Central Park) |

> **REFINED 2026-07-27 (with the amendment): the role family is the building's
> IDENTITY; housing capacity is a separate NUMBER, and a `civic` mass may carry a few
> flats.** The three families still decide what a building *is* — how it is described,
> what people do there, which routes exist. But **residence capacity is a per-mass
> number in the §8.2 table**, and three `civic` masses carry a small one: flats above
> the reading room (`slab`), upper-storey apartments in the deco tower (`deco`), and a
> keeper's flat in the shaft (`tower`). This is the "apartments above a shop" idea, and
> it is needed because the settled ending (§6) cannot be hostage to a single building.
> **`school` and `park` carry zero, and that line is not crossed** — a school is a
> school and a lawn houses nobody. That zero is load-bearing: it is precisely what makes
> the mid-game crowd appear (§8.5).

- **Why not the label.** `buildingAssets.ts` says it in as many
  words: `building` is "the STUDENT-FACING city-narrative name... the user can tweak
  these freely — they are just display strings". A role table keyed on the
  label would break the moment someone renames a building — and one already has
  (`NUM.S` "Town Hall" is now "City Bank"). The node id does not move when a name does.
- **The fallback is what makes this free per island.** A future island's buildings
  need no citizens work at all: any node not registered as
  `residence` or `school` is `civic`, so the island gets a working social life the
  day its buildings land, and an authoring pass can promote a node later (D2's Boom
  Hotel is the first obvious candidate — see §17 Q3).
- **`park` is `civic`, deliberately.** A lawn is not a workplace, but it is
  emphatically **somewhere to be**, and the alternative (a fourth role family for
  leisure) buys nothing the `civic` capacity number cannot express. **This is the
  ruling; §8.2's table previously mislabelled `park`'s role as `park` and is
  corrected.**
- **The Civic Center is a role of its own** (§9): it is the arrival point, a small
  workplace, and the **gathering place for everyone with nowhere to live**. It is not
  a skill node and has no node id in the registry, so it is handled by its sentinel id
  (`isTownHall`, `TOWN_HALL_ID`) exactly as every other hub special case already is —
  and it therefore never appears in the role map at all.

> **Grounded:** the engine already has a per-node "what kind of building is this"
> concept — `BuildingArchetypeId` in `engines/game/src/descriptors.ts`
> (`numeric` / `multiple_choice` / `constructed_response` / `generic`) — and it is
> **the wrong axis for this feature**: it is derived from the node's authored
> `answer_type` (`archetypeForAnswerType`), so it describes how the learner *answers*,
> not what the building *is*. On D1 it groups four numeric halls together and splits
> the school from the park. Citizens must not read it. **But its SHAPE is exactly
> right**, and D-CIT17 reuses it: see §3.1.

### 3.1 D-CIT17 (DECIDED, new 2026-07-27 AMENDMENT 2): the role map lives in the neighborhood descriptor, keyed by node id

**Verified against the code before being written down**, which is the whole reason it
replaces the `gridworkId` ruling rather than sitting beside it.

**The problem with the old key, stated plainly.** `gridworkId` exists in exactly one
place: `D1_NODE_BUILDINGS` in `apps/web/src/city/buildingAssets.ts`. `@cr/game` is
framework-free and cannot import `apps/web` (Blueprint §4). `CityViewModel.buildings`
(`CityBuildingView`) carries `node_id`, `archetype`, `mastery`, `construction_state`,
`blueprint`, and `progress` — **and no art mass.** So an engine-side
`Record<gridworkId, RoleFamily>` had nothing to key on, and the only ways to rescue it
were to thread the mass across the boundary on every call or to promote it into the
engine. Both are worse than using the key the engine already has.

**The resolution.** `NeighborhoodDescriptor` in `engines/game/src/descriptors.ts` gains
a role map **directly alongside `building_archetypes`** — the same shape, the same
place, and the same resolution path:

```ts
// PROPOSED. Illustrative; the exact names are the plan's to fix.
export type CitizenRoleId = "residence" | "school" | "civic";

export interface NeighborhoodDescriptor {
  // ...existing fields...
  /** Node id -> social role. Authored per island; `civic` covers anything unlisted. */
  readonly citizen_roles: Readonly<Record<string, CitizenRoleId>>;
  readonly default_citizen_role: CitizenRoleId;   // "civic"
}
```

`resolveNeighborhood` reads it exactly as it already reads the archetype
(`descriptor.citizen_roles[node.id] ?? descriptor.default_citizen_role`), puts it on
`ResolvedPlot`, and `buildCityViewModel` carries it onto `CityBuildingView`. **The
citizen derivation then reads a role that arrived through the same generic pipeline
everything else does**, and the web lane threads nothing.

**Why the node id is the right key, and not a consolation prize.** The requirement was
never "the art mass" — it was *"a key that does not move when a display name does"*.
The node id is the registry's own primary key: it is what `student_node_state` is keyed
on, what `graph_invariants.py` pins, what `D1_NODE_BUILDINGS` itself is keyed on, and
what every prerequisite edge names. It is **more** stable than the art mass, not less.

**What it costs, honestly.** Keying on the art mass would have meant a second island
reusing the `rowhouse` mass inherited `residence` for free. Keyed by node id, that island
authors one line. That is a real difference, and it is small: the `civic` fallback still
gives an unauthored island a working social life on day one (D-CIT12), so the cost is one
line of authoring for an island that wants housing, not a blocked island.

**What was checked, so nobody re-litigates it:**

- **An `architected` domain with zero plots is unaffected.** `architectedSlot()` returns
  `building_archetypes: {}`; it gains `citizen_roles: {}` and
  `default_citizen_role: "civic"`. Since those domains resolve to **zero plots**
  (`getNodesByDomain(...).filter(product_scope === "mvp")` is empty), the map is never
  read. D-CIT12 holds unchanged: the hub stands, the founding crowd waits, nothing
  throws.
- **The `Record<DomainId, …>` exhaustiveness guarantee forces nothing.** Adding two
  required fields to `NeighborhoodDescriptor` means all ten slots must supply them — but
  **eight come from the single `architectedSlot()` helper** and the two placeholders
  (D2's RAD.4, D10's Geometry) spread it. So it is **two edits**, and the compile-time
  exhaustiveness works *for* the feature: a future island author cannot forget the
  citizens dimension exists.
- **Nothing constructs these types as literals outside the two places that build them.**
  `ResolvedPlot` is only constructed in `resolveNeighborhood`; `CityBuildingView` only in
  `buildCityViewModel`. Every other reference is a parameter annotation, so an additive
  field breaks no call site.

**One difference from its neighbour worth stating.** `building_archetypes` is *derived*
from the item bank (`D1_BANK_ARCHETYPES`, so the city can never drift from the items).
`citizen_roles` is **authored**, because a social role cannot be derived from anything
the bank knows — deriving it from `answer_type` is precisely the mistake the Grounded
note above forbids.

---

## 4. Citizens are derived, never persisted

**D-CIT1 (DECIDED): the population is computed from learning state on every load,
and individuals are generated from a stable seed. Not one citizen is saved.**

- **Assignments are deterministic**, so people do not shuffle houses between loads:
  the same seed and the same city state yield the same roster, in the same order,
  with the same person in the same home.
- **The seed is an INPUT to the derivation, never invented by the renderer** (§10).

Three reasons to record, in the order they matter:

1. **The population is *supposed* to be a readout of learning.** Deriving it makes
   that true **by construction** rather than by bookkeeping. A persisted population
   is a second copy of the same fact, and second copies drift: a mid-session write
   that fails, a snapshot restored from before a mastery change, or a tuning retune
   would leave a city whose crowd disagrees with the stars above it. There is no
   reconciliation code to write because there is nothing to reconcile.
2. **It cannot corrupt a save.** The city view model is already built this way —
   `buildCityViewModel` "derives everything read-only; it performs and implies no
   writes" — and the game lane's frozen write boundary is a single flag
   (`neighborhood_state.checkpoint_cleared`, Blueprint §4). Citizens stay entirely
   inside that boundary.
3. **It adds no persisted state at a moment when there is nowhere to put it.**
   Verified: `services/` contains `diagnostic-api`, `diagnostic-runtime`, and
   `scorer` — **`services/economy-api` does not exist**, and `TEAM_CHECKLIST.md`
   confirms it "remains Gabe's and unbuilt". The economy runs on an in-memory client
   (`packages/economy` + the dev adapter in `apps/web/src/economy`), and even the
   city's own layout is in-memory: `citySession.ts` holds `placements` and `roads` in
   plain `Map`s, with a **dev-only** refresh-survival snapshot
   (`CityDevSnapshot` → `apps/web/src/devPersistence/**`). Persisting residents would
   mean either extending a dev-only snapshot with product data or inventing a table
   in a lane that has no server behind it.

**The accepted cost, stated honestly: no cross-session memory and no attachment.**
A citizen cannot be named, followed over weeks, remembered, or mourned. If the player
learns a person's face on Tuesday, that face is back on Wednesday only because the
seed reproduced it, not because anyone kept it — and any feature that wants *history*
(a citizen who remembers you, a family that grows) is out of reach until residents
are persisted. That is a real ceiling and the design accepts it.

**The seam to swap in persisted residents later stays open.** Because the renderer
consumes a **roster** (§10) and never derives one, replacing `deriveCitizens(state,
seed)` with a loader that returns the same shape is a one-file change on the engine
side and **zero** change on the render side. The `CityDevSnapshot` is the obvious
first host if it ever happens (it already carries `placements`, `roads`, and
`town_hall`).

> **Where the seed comes from is an open question, not a decision (§17 Q4).** The
> honest options are the student id and a client-side stable value. `citySession.ts`
> hard-codes `DEMO_STUDENT_ID = "demo-student"`, so seeding off the student id gives
> **every** dev learner the identical city today — correct in production, degenerate
> in dev. There is a local precedent for the generator itself: `StarterIsland.tsx`
> defines a private `mulberry32(seed)` and uses three fixed seeds (`0x5eed`,
> `0x570e`, `0xb17d5`) to scatter trees and boulders deterministically. It is **not
> exported and not shared**, so a citizens implementation should lift a seeded PRNG
> into the engine rather than import a renderer internal.

---

## 5. Population is paced by learning alone

**D-CIT2 (DECIDED): population is a pure function of learning state. No time-based
trickle, no capacity-driven arrivals.** There is exactly one dial, and it is
un-gameable: you cannot wait for people and you cannot farm them by building houses.

- **No clock.** Nothing accrues while the tab is open. Two loads of the same state
  produce the same city — which is also what makes §12's tests possible.
- **No feedback from capacity.** Housing does **not** attract residents. Building a
  second terrace would not summon anyone; it would only house people the learning
  already brought. This is the property that keeps the crowd honest as a readout.
- **Mastering a skill brings more people than merely finishing its building.**

> **GROUNDED CORRECTION 2 — "paced by mastery alone" cannot be taken literally, and
> the approved design already gives the right formula.** The approved wording is
> "population is paced by mastery alone", and the intent — no clock, no capacity
> feedback, one dial — is exactly right and is what D-CIT2 records. But a
> **strictly** mastery-keyed count would break two things the same design requires:
> - **Test-out.** `citySession.seedFromPlacement` pre-builds a passed node to
>   `lesson_stage: "done"` / `completion_status: "complete"` at **`mastery: 0`**
>   (the ratified test-out amendment). A mastery-only dial would give a learner who
>   tested out of everything a population of zero, contradicting "a building obtained
>   by testing out is still a building, so it still houses people."
> - **The build beat.** "Build Rowhouse Flats and part of the crowd walks over and
>   moves in" is a beat that fires when the **building finishes**, which is not the
>   same event as mastery: `deriveConstructionState` returns `complete` when
>   `mastery >= 2` **or** `lesson_stage === "done"`, so a learner who finishes a
>   practice set below the bar has a **finished building at mastery 1**
>   (`construction.ts`; `masteryLabel` even has copy for it: "Practice set finished —
>   4 of 5 correct earns its mastery stars").
>
> So the dial is the **two-term** form the approved design itself states elsewhere
> ("people-per-built-building vs per-mastered-skill", §8): a completed building
> brings people, and mastering its skill brings more. Both terms are reads of
> learning state, so every property the approved design wanted still holds.

**The two terms, precisely.**

- **`complete`** — the building is **placed on the island** and
  `construction_state === "complete"` (i.e. `mastery >= 2` **or** `lesson_stage ===
  "done"`, per `deriveConstructionState`). This is the same "finished building" the
  stars, the storm readiness copy, and the roster already agree on.
- **`mastered`** — `mastery >= 2`. **D-CIT11 (DECIDED)**: this is the bar, because it
  is the one the whole codebase already means by the word. `MASTERY_LABEL[2] =
  "Mastered"`, `completionStatusForMastery` returns `complete` at `>= 2`, and
  `isNeighborhoodReady` gates the storm on `>= 2` with a comment warning readers not
  to relax it. **Gold mastery (`mastery === 3`) adds no citizens** — it is described
  in the repo as "a non-gating gold margin", and paying it a population bonus would
  make the crowd a scoreboard again.

> **GROUNDED CORRECTION 3 — a building must be PLACED, not merely complete in state,
> and this changes the test-out story.** The approved design says "a learner who
> tests out of everything arrives to a populated island, which is correct — they did
> know the material — and their crowd pressure simply arrives sooner." Verified
> against `citySession.seedFromPlacement`: it calls `placements.clear()` and
> `roads.clear()` and keeps only the hub. So a full test-out arrives at an island
> where six nodes are **complete in `student_node_state`** and **zero buildings stand
> on the ground.** Counting state alone would put forty-four people on a bare island,
> assigned to homes that do not exist — the exact incoherence this feature is meant
> to remove. **The derivation therefore keys on placed-and-complete.** The design's
> intent survives intact: the test-out learner's crowd *does* arrive sooner, it just
> arrives across the six placement clicks they make on their first minute, rather than
> before the first click. Placement is a free, unblocked action for them (the
> first-placement gate was removed by the 2026-07-26 town-hall amendment), so this is
> a beat, not a barrier.
>
> **This correction is LOAD-BEARING under the 2026-07-27 amendment.** The settled
> ending is now a **guarantee** — nobody waiting at full mastery — and a tested-out
> learner has to reach it too. Keying on placed-and-complete is what makes that hold:
> both population and capacity are read from the *same* placed-and-complete set, so
> they cannot come apart. Keying on state alone would have let a learner sit at
> forty-four people and zero homes with every node "complete", which is not a settled
> city by any reading. §8.5 walks the tested-out learner's whole curve, and it ends at
> zero waiting like everyone else's.
>
> **A useful consequence: mastered implies placed.** `advanceMasteryDev` is a
> "No-op for unplaced/unknown" nodes and the lesson is opened by clicking a placed
> building, so a node cannot reach `mastery >= 2` without its building standing. The
> endgame guarantee therefore cannot be broken by an unplaced building — at full
> mastery all six are placed by construction.

> **GROUNDED CORRECTION 4 — mastery does NOT visibly upgrade a building today, so the
> capacity-grows-with-mastery mechanic needs its visual supplied.** The rationale
> offered for D-CIT15 was that it "fits the existing visual language where mastery
> visibly upgrades a building." **It does not, yet.** `masteryVisuals.ts` is explicit:
> the mastery tier drives "one cosmetic read: the STARS floating above its roofline...
> This is the ONLY mastery visual a building carries; **there is no 'building comes
> alive' (lit-windows / body-glow) treatment**", and stars "REPLACE the retired gold
> body-tint". `buildingAssets.ts` agrees: "Full mastery renders as the normal `built`
> model — there is no gold-mastered stage and no gold tint."
>
> **This is an opportunity, not an obstacle, and it is why D-CIT15 is a good fit
> anyway.** The treatment the codebase removed for carrying no meaning was
> *lit windows* — and that is exactly what a mastered residence housing more people
> should look like. **The citizens ARE the upgrade visual:** a mastered Rowhouse Flats
> has more people coming and going, more windows lit, a busier doorstep. So mastery
> gains a building-level visual for the first time, it is earned rather than decorative,
> and no new art is required. The stars stay as they are.

---

## 6. The island settles (D-CIT4, REVERSED 2026-07-27)

> **REVERSED 2026-07-27.** This section previously read *"Overcrowding is motivation,
> not a gate"* and made the island filling past its housing the thing that made the
> player want the next island. **That is removed.** The reversal is recorded rather
> than erased: the old ruling is quoted below, and D-CIT4 in §16 carries both readings.

**D-CIT4 (DECIDED, replacing the overcrowding ruling): mastering all six skills leaves
the island FULL, SETTLED, AND HAPPY.** Everyone has somewhere to live, **nobody is left
waiting**, and the closing beat is a prompt telling the player this community is happy.
**Reaching capacity is not a motivator, a signal, or a pressure of any kind.**

- **The settled ending is a guarantee, not a tendency.** At full mastery, island
  residential capacity **equals** the population — 44 homes for 44 people — in **every
  one of the 33 possible build orders** (§8.5). It is not a number that happens to work
  out; it is pinned by a test (§12.1).
- **Nothing about capacity is ever surfaced as pressure.** There is no "capacity
  reached" warning, no meter filling toward a limit, no colour change, no nudge to move
  on. The only capacity fact the player is ever told is the plain readout of how many
  people have homes (§13) — and at the end, that everyone does.
- **The next island is still unlocked by mastery, exactly as before.** Island unlock
  stays a pure read of `mastery` (`isNeighborhoodReady`, `getRequiredNodeIds`), and
  Contracts §8 INV-COS-1/2 already forbid a cosmetic or economic state gating learning
  or storm access — a citizen count is exactly such a state. **Population is never an
  input to any gate**: not the storm, not a lesson, not an island unlock, not a
  build-menu affordance. What changed is only that mastery no longer has crowding
  pushing at it.
- **The mid-game crowd still reads as HOPEFUL, never as decay.** Busy streets, a queue
  at the Civic Center, lights coming on building by building. **Never slums**, and never
  the visual language of the island-condition/decay system (which weathers *buildings*,
  `2026-07-25-island-decay-and-gold-design.md`). The two systems must not converge
  visually.
- **The reward for mastering an island is the island being good.** Which is what the
  rest of the game already does: the storm is a celebration, mastery is monotonic, and
  nothing is taken away.

### 6.1 Why overcrowding was removed (recorded so it is not relitigated)

The superseded ruling read: *"the island filling past its housing is what makes the
player want the next island... crowding must read as prosperity, not decay... the
roster stays at six by design, and outgrowing it is the point."* It was rejected for
two reasons:

1. **The game's own design brief bans scarcity and urgency as motivators** for a
   math-anxious audience. Overcrowding is scarcity by construction — it motivates by
   withholding — and dressing it as prosperity does not change what it is. The earlier
   draft's own insistence that crowding "must read as prosperity, **not** decay" was
   the tell: a mechanic that needs that much art direction to avoid reading as failure
   is fighting its own shape.
2. **It was the one mechanic that would have made *finishing* feel like a problem.**
   Every other system in this game rewards completion with something good. Overcrowding
   would have made the reward for mastering all six skills a city that had outgrown its
   ground — pressure delivered at the exact moment the player earned a celebration.

**What replaces it as the answer to "six buildings is not much of a city"** is not
crowding but **use** (§6.2): six buildings that forty-four people visibly live in, learn
in, and work in read as a far bigger city than twelve buildings nobody enters. And what
replaces crowding as the reason to move on is simply the next island — unlocked by
mastery, as it always was.

### 6.2 D-CIT5 (DECIDED): no filler buildings — hospitals, police stations, and the like are REJECTED

The user explicitly considered and **rejected** adding non-skill service buildings
(hospitals, police stations, fire stations, and similar) to make islands feel more
complete. Recorded with its reasoning, because it will be proposed again:

- **A building that teaches nothing is a lie about the loop.** The one-node /
  one-lesson / one-building correspondence is the whole legibility of the city: a
  building means a skill you learned. A hospital nobody earned breaks that mapping,
  and the player learns that buildings are decoration.
- **It solves the wrong problem.** The felt problem was "six buildings is not much of
  a city." Filler answers that with *more objects*; citizens answer it with *use*.
  Six buildings that forty-four people visibly live in, learn in, and work in read as a
  far bigger city than twelve buildings nobody enters.
- **It multiplies the art pipeline with no learning behind it.** Each island already
  costs three GLBs per skill plus a hub (town-hall spec §8). Service buildings would
  add per-island assets that carry no content and cannot be earned.
- **It would have to be gated on something,** and the only honest currencies are
  mastery (which makes it a fake skill) or gold (which makes the economy gate the
  city's shape, uncomfortably close to INV-COS-1's spirit).

**Use replaces filler entirely** (revised 2026-07-27 — this paragraph previously said
*"overcrowding replaces filler entirely: the reason to move on stops being 'I ran out of
buildings' and becomes 'these people need more room than this island has'"*, which the
amendment removes). The reason six buildings is enough is that they are **lived in**:
the island is not a set of objects to collect but a place that fills with people who
use it. And the reason to move on is the next island, unlocked by mastery — not a
shortage on this one.

---

## 7. Nobody is ever punished

**D-CIT6 (DECIDED): this is a hard constraint, not a tuning preference.** A struggling
student must **never** be shown their people suffering for their slow progress.

- **People with nowhere to live wait near the Civic Center — patient, not
  suffering.** They stand, sit, chat, mill about. They are waiting for the city to
  catch up, and they read as **hopeful**: a queue outside a land office, not a camp.
- **Nothing is ever lost, damaged, or degraded.** No citizen leaves, starves, sickens,
  riots, or dies. No building is damaged. No number goes down.
- **No citizen ever loses a home.** Capacity is monotone in learning state (mastery is
  monotone, `mastery-service` applies `max(existing, evidenced)`), and assignments are
  stable (§4), so a person who has been housed stays housed. When the waiting crowd
  **grows**, it is always because **new people arrived** — never because anyone was
  evicted. §12 pins this as a no-eviction test, and it is what lets the crowd rise
  mid-game without ever reading as a setback.

  > **NARROWED 2026-07-31 (AMENDMENT 3, D-CRISIS-28).** The bullet above is the one
  > sentence in this document the crisis ruling contradicts, so it keeps its text and gains
  > its scope: **no LEARNING event ever costs a citizen their home**, which is the whole of
  > what the sentence was written to promise, and every clause of its argument still holds
  > over learning state. **A mid-era crisis may lower capacity below the population it was
  > holding, and the overflow becomes `waiting`.**
  >
  > **What makes that acceptable rather than a hole in §7** is not that it is small — it can
  > be sixteen people at once — but three properties it comes with:
  >
  > - **It is not keyed off the learner.** A departure follows a crisis the player chose to
  >   answer and a search step they chose to take. Study pace, absence, streaks and
  >   wall-clock time are all still forbidden (`INV-ERA-3`), and that is the constraint this
  >   bullet actually existed to enforce.
  > - **It is reversible by the player's own lever.** *"They'll come back if you increase
  >   capacity via the civic buildings."* Measured: the roster is a pure function of state,
  >   so restoring the ceiling returns a **deep-equal** roster — the same person, the same
  >   home, the same seeded look, nothing replayed and nothing latched.
  > - **Nobody is harmed and nobody is deleted.** The displaced citizen is `waiting`, which
  >   is *patient, not suffering*, and the roster keeps every one of them: the headcount does
  >   not move, because a crisis writes to capacity and never to a population term.
  >
  > **The copy consequence is not optional (§13).** A crowd that appears with no explanation
  > and no route back is the punitive reading of this ruling. The departure and the return
  > have to be sayable in the same breath, in text, and era progression's **O-7** — *"a
  > departure with no legible return is the punitive version"* — is the same requirement
  > arrived at from the other document.
- **The city can be busy but never failing.** There is no fail state, no warning, no
  red, and no scold. "8 people are waiting for homes" is a **prompt**, never a penalty.
- **Strengthened by the 2026-07-27 amendment.** Waiting is now strictly a **mid-game**
  state: it cannot survive into the endgame, because full mastery houses everyone
  (§6). So the worst thing the game can ever show a struggling learner is a city
  **partway built** with people waiting for the parts that are not there yet — and the
  learner has been told, in text, that finishing houses them (§13).
- **Enforced in the type, not by discipline.** The citizen state union
  (`housed` / `waiting` / `commuting` / `at_school` / `at_work` / `visiting`) contains
  **no state that expresses harm**, and there is no attribute a future contributor
  could set to make a citizen worse off. §12 pins this with an exhaustive test.
- **The no-punishment rule is why capacity is not a cap.** The waiting crowd is
  **unbounded** in the engine's count. Only *rendering* is capped (§9), and that cap
  never changes the number the DOM reports.

This is consistent with how the rest of the game already behaves: the storm is
explicitly non-punitive ("No loss — retry any time", `announcements.ts`), mastery is
monotonic and never decays (`Mastery_Scoring_Spec.md` §8), and island condition
"never lowers mastery and never gates content" (town-hall spec §10.1). Citizens join
that family.

---

## 8. Tuning parameters (named values, starting numbers, and why)

Every number here is a **named constant in one table in the engine**, not a literal
sprinkled through the derivation (**D-CIT14**). Retuning is one edit and, because
nothing is persisted (§4), it applies retroactively to every existing city with no
migration and no backfill. All values below are **first guesses; expect to retune**
— what §12 pins is the *relationships*, not the digits.

> **RETUNED 2026-07-27.** These numbers were previously built for a **1.43x
> over-capacity** endgame (40 people against 28 homes, 12 left waiting). The amendment
> removes that target, so the whole section is retuned. The old figures are quoted where
> they help explain the change; nothing about the *structure* of the tuning changed.

### 8.1 Population

| Constant | Start | Reasoning |
| --- | --- | --- |
| `FOUNDING_POPULATION` | **8** (was 4) | The people who wander out of the Civic Center on a bare island — and now **the whole reason the middle of the game has pull**, because they are the crowd that has to be housed. Raised from 4 because the arc is no longer "pressure builds at the end" but "a crowd is worked down from the start": 4 was an art detail, 8 reads as a group with a problem. Still small enough that each is an **individual you can follow** (§2). |
| `CITIZENS_PER_COMPLETE_BUILDING` | **2** (unchanged) | Finishing a building visibly brings people. Two is the smallest number that reads as "some people arrived" rather than "a person arrived", and it keeps the mastery term clearly larger. |
| `CITIZENS_PER_MASTERED_SKILL` | **4** (unchanged) | **Twice** the build term, so mastery is unambiguously the bigger reward and the ordering is visible rather than arithmetic (D-CIT2). Mastering one skill (2 + 4 = **6 people**) is the single most populous event in the game. |

**Totals that follow, on D1 (six skills):**

| State | Population | Reads as |
| --- | --- | --- |
| Bare island, nothing placed | **8** | A group outside the Civic Center with nowhere to go |
| One building finished and mastered | **14** | The first arrivals, and still no homes |
| All six finished, none mastered | **20** | A working town, half-settled |
| All six mastered | **8 + 6 x 6 = 44** | A throng, fully settled |

### 8.2 Residential capacity — two terms, because capacity grows with MASTERY (D-CIT15)

**D-CIT15 (DECIDED, new 2026-07-27): residential capacity has the same two-term shape
as population — a `built` term and a larger `mastered` term.** A mastered Rowhouse Flats
houses more than a newly built one.

Why this is the right mechanism, not just a convenient one:

- **It makes the settled ending EARNED rather than arithmetic.** Population and capacity
  **race**, and **mastery is what lets capacity win**. The city does not settle because
  the numbers were chosen to add up; it settles because the learner mastered the
  material.
- **It mirrors the population dial exactly**, so both sides of the ledger are one table
  with one shape, and there is one rule to hold in your head: *finishing brings people
  and a little room; mastering brings more people and much more room.*
- **It gives mastery its first building-level visual** — see GROUNDED CORRECTION 4. The
  citizens *are* the upgrade: more windows lit, a busier doorstep.
- **It is monotone**, because mastery is monotone (`mastery-service` takes
  `max(existing, evidenced)`), so capacity can only ever rise and nobody is evicted
  (§7).

Keyed by **`node_id`** (amended 2026-07-27, AMENDMENT 2 / D-CIT17 — *was* `gridworkId`,
which the engine cannot see), so the numbers are rename-proof (§3):

| Building (`node_id`) | Role | Residence when **built** | Residence when **mastered** | Reasoning |
| --- | --- | --- | --- | --- |
| Rowhouse Flats (`NUM.2`) | `residence` | **10** | **26** | The island's housing, and **59%** of its homes. The jump from 10 to 26 is the largest single beat in the game — the terrace filling up as its skill is mastered. |
| City Bank (`NUM.S`) | `civic` | **2** | **6** | Upper-storey apartments in the deco tower. Deliberately **small**, because `NUM.S` has no prerequisites and can be the very first skill finished (§8.5) — a big number here would settle the island too early. |
| Public Library (`NUM.F`) | `civic` | **2** | **6** | Flats above the reading room. Small for the same reason (`NUM.F` also has no prerequisites). |
| Clock Tower (`NUM.5`) | `civic` | **2** | **6** | A keeper's flat in the shaft. |
| Community School (`NUM.3`) | `school` | **0** | **0** | A school is a school. **This zero is load-bearing** (§8.5). |
| Central Park (`NUM.4`) | `civic` | **0** | **0** | A lawn houses nobody. **Also load-bearing.** (**Corrected 2026-07-27:** this cell read `park`, which is not a role family and contradicted §3's explicit "`park` is `civic`, deliberately". No number changed.) |
| **Island total** | | **16** | **44** | |

**Island residential capacity: 16 when all six are merely finished, 44 at full mastery.**

### 8.3 Daytime capacity (who is at a destination rather than on the street)

The second ledger from GROUNDED CORRECTION 1. It decides how busy each building looks
by day; it has **no bearing on who is waiting for a home**, so it is tuned purely for
how the city reads.

| Building | Daytime | Reasoning |
| --- | --- | --- |
| Community School (`school`) | **8** | A visible cohort making the trip. |
| Town Hall / City Bank (`deco`) | **8** | The largest workplace. |
| Public Library (`slab`) | **8** | Work and visit mixed. |
| Clock Tower (`tower`) | **4** | A landmark with a small staff. |
| Central Park (`park`) | **12** | The loosest destination, and the one that should look busiest. |
| Civic Center (hub) | **4** | A small staff, plus the gathering place for anyone waiting (§7). |
| **Island total** | **44** | |

Daytime capacity at full mastery is **44** — the same as the population, so at the
settled ending **everyone has somewhere to be by day as well as somewhere to live.**
Nobody is standing in a doorway because there was no room for them.

### 8.4 The settled endgame

| Constant | Start | Reasoning |
| --- | --- | --- |
| `ENDGAME_SPARE_HOMES` | **0** | Population at full mastery (**44**) equals residential capacity at full mastery (**44**). "Full, settled, and happy" read literally: **every home occupied, nobody waiting.** |

The amendment permits "at or under total residential capacity", so spare homes would be
legal. **Exactly equal is chosen deliberately:** an island with empty houses reads as
*hollow*, and "full" is the word the design uses. The invariant §12 pins is the
**guarantee** (`population <= capacity`, so nobody can ever be left waiting by a
retune); `ENDGAME_SPARE_HOMES` pins the tuning *intent* separately, so the two can be
loosened independently.

**This holds in every build order, by construction.** Total capacity at full mastery is
a **constant sum** over the six buildings, independent of the order they were finished
in — so `population(all mastered) == capacity(all mastered)` is order-independent, not
a property that survives only the common path.

### 8.5 The pacing that falls out — and how the mid-game/endgame tension is resolved

**The tension, stated plainly.** The endgame requires population **at or under** capacity
(nobody waiting). The mid-game requires population **above** capacity for a stretch (or
no crowd ever appears and the middle loses its pull). Those pull in opposite directions,
and D1 having one dominant housing building makes it sharper.

**What makes it resolvable: the prerequisite graph.** Verified against
`packages/skill-graph/src/skill_graph.json`:

| Node | Building | Prerequisites |
| --- | --- | --- |
| `NUM.S` | Town Hall / City Bank | *(none)* |
| `NUM.F` | Public Library | *(none)* |
| `NUM.3` | Community School | *(none)* |
| `NUM.2` | **Rowhouse Flats** | **`NUM.S`, `NUM.F`** |
| `NUM.5` | Clock Tower | `NUM.F` |
| `NUM.4` | Central Park | `NUM.S`, `NUM.F`, `NUM.2`, `NUM.3` |

**`NUM.2` — the building carrying 59% of the island's homes — requires two other skills,
so it can never be the first or second skill finished.** That is a graph-level guarantee,
not a tuning accident: **the island is guaranteed to have a waiting crowd through its
first two finished skills**, because the only skills that *can* come first
(`NUM.S`, `NUM.F`, `NUM.3`) carry 6, 6, and 0 homes against a population that has
already reached 14 and then 20.

**How the two requirements are reconciled, in one sentence:** the **school and the park
house nobody** (so finishing them adds people with no homes and the crowd *grows*), while
**mastery is what unlocks most of the housing** (so the crowd is worked back down), and
the totals are pinned equal so the last mastery closes the gap exactly.

**The pacing, computed over all 33 topologically valid build orders.** `k` = skills
finished; the common path is a learner who passes each practice set, so `complete` and
`mastered` land together (`masteryFromCorrectCount` awards 2 at 4-of-5).

| | k=0 | k=1 | k=2 | k=3 | k=4 | k=5 | k=6 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Population | 8 | 14 | 20 | 26 | 32 | 38 | **44** |
| Waiting (typical order) | **8** | **8** | **14** | **14** | 0 | 0 | **0** |
| Waiting (range across all 33 orders) | 8 | 8–14 | 8–14 | 0–14 | 0–14 | **0** | **0** |

> **CORRECTED 2026-07-27 (AMENDMENT 2): the k=5 cell read `0–14` and re-derives to
> exactly `0`.** Re-computed from §8's own constants over all 33 valid orders: by the
> fifth mastery, capacity is at least 38 against a population of 38 in every order, so
> nobody is ever waiting at k=5. The k=1, k=2, and k=6 cells — the only ones §12.1
> actually asserts — were correct. Recorded rather than quietly fixed because the row is
> the design's own summary of its pacing, and a reader who re-derives it should find the
> arithmetic and the table agreeing. **No number in §8 changed**; the row was wrong, not
> the tuning.

- **When the crowd first appears: immediately, at load.** 8 people, 0 homes. This is the
  cold open, and it needs no building to have failed.
- **Guaranteed present through the first two finished skills, in every order** — the
  graph guarantee above. This is the floor under "the waiting is what gives the middle
  its pull."
- **When it peaks: 14, in the early middle** (k=1 to k=4 depending on order), and it
  peaks *because a non-housing building landed*. Finishing the Community School brings
  families who need homes the island does not have yet — which is the most legible
  possible statement of what the crowd is for.
- **When it clears: at full mastery, at exactly zero, in all 33 orders.** In most orders
  the last of the waiting are housed by the final one or two masteries, so the resolution
  lands as the closing beat.
- **The crowd can rise as well as fall, and that is correct.** A rise is always **new
  arrivals**, never an eviction (§7) — nobody who has a home loses it. A player who
  builds the school before the housing sees the crowd grow, which teaches exactly the
  right thing about which building solves it.

**The one order-dependent branch, stated rather than hidden.** A learner who beelines
`NUM.S` → `NUM.F` → `NUM.2` (6 of the 33 orders) settles the island at **k=3** with **12
spare homes**, and the last three skills fill them exactly, ending at 44/44 like everyone
else. They get a comfortable second half. This is **benign and arguably a reward** — they
prioritised housing and nobody ever had to wait long — and it is **unavoidable** given
one dominant housing building: pinning the endgame at exactly-settled forces the
rowhouse's contribution to be large, and a large contribution landing early necessarily
overshoots. Searching every integer capacity assignment confirmed there is **no**
distribution that both settles exactly at k=6 and keeps a crowd alive to k=5 in all 33
orders while leaving the school and the park at zero. The design accepts the branch
rather than putting families in the park.

**The tested-out learner reaches the same ending.** Because population and capacity are
both read from the placed-and-complete set (GROUNDED CORRECTION 3), a learner who tests
out of everything places six finished buildings at `mastery: 0` and then practises them
up. Their whole curve:

| Step | Population | Homes | Waiting |
| --- | --- | --- | --- |
| Places + finishes `NUM.S`, `NUM.F` | 10, 12 | 2, 4 | **8, 8** |
| Places + finishes `NUM.2` | 14 | 14 | **0** |
| Places + finishes `NUM.3`, `NUM.5`, `NUM.4` | 16, 18, 20 | 14, 16, 16 | **2, 2, 4** |
| Masters `NUM.S`, `NUM.F` | 24, 28 | 20, 24 | **4, 4** |
| Masters `NUM.2` | 32 | 40 | **0** |
| Masters `NUM.3`, `NUM.5`, `NUM.4` | 36, 40, 44 | 40, 44, 44 | **0, 0, 0** |

A crowd early, relief when the flats are built, the crowd returning as the non-housing
buildings bring people, and the last of it cleared when the flats are **mastered** —
which is precisely the arc the amendment asks for, arrived at without a special case.

### 8.6 Movement and traffic

| Constant | Start | Reasoning |
| --- | --- | --- |
| `WALK_SPEED_UNITS_PER_SEC` | **1.6** | About one grid cell (`GRID_CELL = 4`) every 2.5s: legible at the fixed ~49-degree camera without looking hurried. |
| `ROAD_PREFERENCE_WEIGHT` | **0.5** | A road cell costs half a bare cell when routing, so traffic **visibly follows the paths** without a citizen ever refusing bare ground (§7's cousin: roads amplify, never gate). |
| `CARS_PER_ROAD_TILES` | **1 per 8 road tiles** | Traffic density scales with the network, so gold spent on roads buys **visible life** instead of decoration. |
| `MAX_CARS` | **6** | A cap for the same reason citizens have one (§9). |
| `MAX_RENDERED_CITIZENS` | **48** (was 64) | **Retuned 2026-07-27 (AMENDMENT 2) now that the target is named** (§14, D-CIT20). 64 was a headroom guess against an unnamed machine. 48 clears the 44 full D1 mastery produces with a small margin, which is all the cap's job actually is: a safety net that is routinely load-bearing is a design limit in disguise. **The number is unreachable on D1 either way** — it matters for a later island's roster and for the degradation ladder, not for shipping D1. |

---

## 9. Roads amplify, never gate

**D-CIT7 (DECIDED): people walk anywhere. Roads make the city come alive.** Foot
traffic follows the paths, cars appear, traffic density scales with population. A
citizen must **never require a road to function** — no route, no destination, and no
assignment may depend on one.

- **Grounded — road cells ARE queryable as a network, and a pathfinder can use them
  as they stand.** Roads live on the **same placement grid** as buildings
  (`roads.ts`: "the SAME placement grid buildings use"), keyed by the same
  `"col,row"` string as `footprintCells`, and `roadNeighborMask(col, row, roadCells)`
  answers "which of my four orthogonal neighbours is also road?" in O(1) against a
  `ReadonlySet<string>`. That **is** an adjacency function over a 4-connected graph,
  which is all a grid pathfinder needs.
- **What does NOT exist:** any notion of **connectivity**. There is no reachability
  query, no connected-component or flood-fill, and no path function anywhere in
  `roads.ts` or `three/Roads.tsx`. `roadRetileTargets` walks the same four neighbours
  but only to decide which tiles to redraw. So a router is **new code** — cheap new
  code (a weighted BFS over at most 88 cells, §9.1), but new.
- **Roads are already provably cosmetic**, which is the invariant this section
  inherits: `roads.ts` opens with "INV-COS-1: roads are purely cosmetic... a road only
  ever blocks a CELL, never progress." Citizens must not become the exception that
  gives a road mechanical weight.
- **Assertable, and §12 pins it:** the roster (population, roles, capacities,
  assignments, waiting list) is **identical** with and without roads. Roads change only
  the *route* between two fixed points and the *car count*.
- **D-CIT18 (DECIDED, new 2026-07-27 AMENDMENT 2): roads are not an INPUT to the
  derivation at all.** §10.1's sketch carried `road_cells` "for routing only" while
  §12.1 demanded the roster be deep-equal with and without roads — a tension inside this
  document, and the invariant wins. **Removing the parameter makes the invariant true by
  construction**, and a future contributor who wants roads to matter has to widen the
  input signature to do it, which is a change a reviewer can see. Routing loses nothing:
  it needs `worldLayout` (`GRID_CELL`, `isCellBuildable`, `footprintCells`) and
  `roads.roadCellKey`, **both of which live in `apps/web`**, so the router belongs there
  anyway — the same side of the boundary as the meshes it moves.

### 9.1 The movement space, and how much of it there is

Movement is **bounded**: people travel between fixed points on a small grid (a
building's door, the hub steps, a park interior, a road junction) rather than roaming
freely. The grid is small enough to route on exhaustively.

**Free buildable space on D1, measured (not estimated).** From `worldLayout.ts`
(`GRID_CELL = 4`, `BUILDABLE_RADIUS = 22`, `isCellBuildable` = cell **centre** within
the radius, with "no interior exclusions"), enumerating every cell in
`[-CELL_REACH, CELL_REACH]^2`:

| Quantity | Cells | Ground area |
| --- | --- | --- |
| Buildable cells on the island | **88** | 1408 u^2 |
| Occupied by the six D1 skills (`NODE_FOOTPRINTS`: 2x2, 2x1, 2x2, 1x1, 1x2, 2x2) | 17 | 272 u^2 |
| Occupied by the 3x2 hub (`TOWN_HALL_FOOTPRINT`, D-TH6) | 6 | 96 u^2 |
| **Free after all six buildings plus the hub** | **65** | **1040 u^2** |

**65 of 88 cells — 74% of the buildable island — remains free with the island fully
built out.** That is a genuinely roomy stage for a crowd of 40, and it is also the
honest answer to the recurring "is there room for another building?" question: yes,
easily, on space alone.

> **Re-enumerated 2026-07-28, and then again the same day.** `NUM.2` moved 2x1 -> 2x2 and
> stands; `NUM.5` moved 2x2 -> 1x1 and was reverted to 2x2 once rendered measurement showed a
> smaller plot spends height without buying slenderness. Net against the original table, the
> six D1 skills went 15 cells -> **17** and the free count 67 -> **65**, so this section's
> conclusion is unchanged and two cells tighter. **The intermediate state (14 and 68) is not
> the shipped one.** Nothing else in the citizens work depends on a footprint: capacity is
> keyed per NODE in `citizens-tuning.ts`, never per cell or per area, which is why the
> residence's plot doubling in area changes no population figure anywhere in this document.

Two qualifications an implementer must not miss:

- **Roads compete for exactly those 65 cells.** `isRoadCellLayable` requires a cell
  be buildable, clear of buildings, and clear of existing road — so a player who
  paves everything leaves **zero bare cells**. The movement space therefore **must
  include road cells as walkable** (which is what one wants anyway), or a fully-paved
  island would have nowhere to stand.
- **There is walkable ground outside the buildable disc.** `ISLAND_GRASS_RADIUS = 30`
  against `BUILDABLE_RADIUS = 22`, and `StarterIsland.tsx` rings every decorative
  prop at `innerR = BUILDABLE_RADIUS + 3 = 25` outward. The **annulus from r=22 to
  r=25 is clear grass that can never hold a building or a road** — the natural place
  for a waiting crowd to spread without ever blocking a doorway.

---

## 10. Architecture

Follows the repo's existing split exactly: **pure logic in `engines/game`, rendering
in `apps/web`** (Blueprint §4 — `@cr/game` stays framework-free, no `three`, no
React, no GLB).

### 10.1 The derivation is pure and lives in the engine (D-CIT8)

Given **city state plus a seed**, one pure function yields:

- the **population count**;
- **per-building role and capacity** (residence + daytime, §8.2);
- the **assignment** of people to buildings (who lives where, who goes where by day);
- the **waiting crowd** (everyone with no home yet — empty at full mastery, §6).

**No renderer, no clock, no unseeded randomness.** Every tuning question in §8 becomes
an assertion testable **without mounting a 3D scene** — which is the entire reason the
layer exists (§12).

> **REVISED 2026-07-27 (AMENDMENT 2).** The sketch below replaces one that took
> `view_model: CityViewModel`, `placements: readonly PlacedTransform[]`, and
> `road_cells: ReadonlySet<string>`. Three changes, each forced by something in this
> document or the codebase: **`road_cells` is gone** (D-CIT18 — the deep-equal invariant
> wins, and routing lives in the web lane with `worldLayout`); **`placements` is gone**,
> because `PlacedTransform` is an `apps/web` type and the derivation needs only *whether*
> a building stands, not where; and each node now carries its **`citizen_role`**, resolved
> through `resolveNeighborhood` (D-CIT17) rather than an art mass the engine cannot see.
> The result takes **two fields**, neither of them a road — which is what makes §12.1's
> roads assertion a statement about the type rather than about the body.

```ts
// PROPOSED. Illustrative shape only. Pure, framework-free, in engines/game.
// The SEED IS AN INPUT. Nothing here imports three, React, or a GLB.
export interface CitizenNodeInput {
  readonly node_id: string;
  /** Resolved from the neighborhood descriptor's role map (D-CIT17). */
  readonly citizen_role: CitizenRoleId;
  /** Does this building STAND on the island? (D-CIT10 — the load-bearing field.) */
  readonly placed: boolean;
  readonly mastery: Mastery;
  readonly lesson_stage: LessonStage;
  readonly placement_estimate: PlacementEstimate;
}

export interface CitizenRosterInput {
  /**
   * The island's nodes, IN PLACEMENT ORDER (D-CIT19). Order decides only WHICH
   * building a resident occupies, never any count.
   */
  readonly nodes: readonly CitizenNodeInput[];
  /** Stable per-student seed. An INPUT, never invented downstream (§4, §17 Q4). */
  readonly seed: number;
}

export interface CitizenRoster {
  readonly population: number;
  readonly residence_capacity: number;
  readonly daytime_capacity: number;
  readonly buildings: readonly CitizenBuildingOccupancy[];  // role + capacity + who
  readonly citizens: readonly Citizen[];                    // stable order, seeded look
  readonly waiting: readonly string[];                      // citizen ids with no home
}

export function deriveCitizenRoster(input: CitizenRosterInput): CitizenRoster;
```

### 10.2 The rendering is a new layer in the R3F scene

A new component under `apps/web/src/city/three/` **consumes** that roster and draws
it. It decides nothing about who lives where.

- **Instanced geometry (D-CIT9).** Citizens draw as instanced meshes — one instanced
  draw for bodies, one for heads — **so a throng costs roughly what a handful does.**
  **Grounded: there is no instancing anywhere in the app today** (no `instancedMesh`,
  no drei `<Instances>` in `apps/web/src`), so this is a new technique in this
  codebase, not a pattern to copy.
- **Movement is bounded** (§9.1): people travel between fixed points and prefer roads
  where they exist.
- **No shadows.** Citizens are small and numerous and must not enter the shadow pass;
  `StarterIsland.tsx` already sets the precedent for its gulls ("skip shadows so they
  never drop" a shadow on the ground).

### 10.3 The current per-frame budget (measured)

Verified in `apps/web/src/city/three/`:

- **`frameloop="always"`** on the city `Canvas` (`CityScene.tsx`), with **`shadows`
  enabled** and **`dpr={[1, 2]}`**. So the scene already renders continuously and
  citizens do **not** force a frameloop change. (The lean canvases elsewhere —
  `BuildingThumb.tsx`, `onboarding/ReelBuilding.tsx` — use `frameloop="demand"`, and
  `TitleBackdrop.tsx` switches to `demand` under reduced motion; the city does not.)
- **What animates today: six `useFrame` callbacks, all cheap.** `MasteryStars` (star
  billboarding), `TownHall` (hub ambience), `PlacedBuilding` (x2 — a cross-fade
  opacity ramp and a content transform), `CityScene` (gluing the DOM callout to a
  world anchor), `StarterIsland` (five gulls, `COUNT = 5`), and `GhostBuilding` during
  placement only. **Nothing today animates more than single digits of objects.**
- **Roughly how many objects are drawn.** The island is procedural and built once,
  memoized, from a seeded scatter (`StarterIsland.tsx`, ~990 lines of individual
  `THREE.Mesh` wrappers: shore steps, tree copses of 2-4 trees each with per-clump
  canopies, boulders, dock planks, a baked grid) — **on the order of a few hundred
  meshes**, static. Buildings are 7 GLBs at most (six skills plus the hub). Roads add
  **up to ~7 meshes per tile** (asphalt centre plus arms, curb centre plus arms,
  dashes) over **shared geometries and materials**, so a heavily-paved island is the
  largest existing mesh contributor and is still static per paint.
- **Read on the budget:** the scene is **draw-call-heavy but animation-light**. Adding
  44 individually-meshed, individually-animated citizens would meaningfully change the
  per-frame character of the scene; adding **two instanced draws** whose transforms are
  written into a matrix buffer does not. That asymmetry is the entire justification for
  D-CIT9.

### 10.4 Two boundaries to hold explicitly

1. **The engine never knows about meshes.** No GLB path, no `three` type, no world
   unit that is not already in the pure `worldLayout` vocabulary.
2. **The scene never decides who lives where.** It reads assignments; it does not
   compute them, adjust them, or fill a gap it thinks it sees.
3. **The seed is an input, never invented by the renderer.** A renderer that
   generated its own seed would silently reintroduce per-mount instability and break
   §4's whole claim.

### 10.5 D-CIT19 (DECIDED, new 2026-07-27 AMENDMENT 2): homes are filled greedily, in PLACEMENT order

**This design never stated an assignment rule**, and the two properties it *does* state
pull against each other:

- **Assignment stability** (§12.1): *"Placing a new building never changes an existing
  citizen's home."*
- **No empty homes while anyone waits**, implied by §13.1's copy: *"Rowhouse Flats — home
  to 26 of 26 residents"*.

**No history-free rule satisfies both under a fixed building order.** Fill residences
greedily in registry order and placing `NUM.S` (registry index 0) after `NUM.2` (index 2)
moves `NUM.2`'s first two residents into `NUM.S` — stability broken. Give each residence
a fixed index lane sized at full-mastery capacity and the island shows empty houses
mid-game while people wait outside them — the second property broken, and hollow besides.

**The ruling.** Citizens are indexed `0..population-1`. **The housed set is always the
lowest-indexed `min(population, capacity)` people**, and residences are filled greedily
**in the order the input supplies them, which is the order the player placed them**
(`citySession.readPlacements()` returns `[...placements.entries()]`, insertion-ordered,
and `CityDevSnapshot` round-trips that order). A newly placed building therefore
**appends** and draws only from people with no home, so it cannot move an existing
resident.

**Why the index rule carries the no-eviction guarantee structurally.** Capacity is
monotone (mastery is monotone; placement is monotone) and population only grows by
appending higher indices, so `min(population, capacity)` only ever rises: **a citizen who
was housed is still housed.** That is D-CIT6's promise made a property of the arithmetic
rather than of anyone's care.

> **AMENDED 2026-07-31 (AMENDMENT 3, D-CRISIS-28) — the argument is valid and its premise
> has been narrowed.** Kept in full rather than rewritten, because a proof that stops
> applying is more useful to the next reader than a proof that was quietly replaced: every
> step above is still correct **over learning state**, which is the only thing that moved
> capacity when it was written.
>
> **What the ruling removes is the universal quantifier.** A mid-era crisis reduces capacity,
> so `min(population, capacity)` may fall, and when it does the citizens at the top of the
> index lose their homes. The index rule is what decides *which* — the highest-indexed
> housed people are displaced first, in exact reverse of the order they arrived — and that
> is the right answer rather than an accident: it makes a departure the mirror image of an
> arrival, and it makes the return **deep-equal** to the state before, since the people come
> back in the same index order into the same buildings.
>
> **So the index rule survives the amendment and gains a second job.** It was chosen to make
> no-eviction structural; it now also makes displacement **ordered, minimal and exactly
> reversible**. What it no longer does on its own is guarantee that displacement never
> happens, and nothing else in this document does either — that guarantee is now scoped to
> learning events, per §7.
>
> **The third consequence, stated where the other two are.** §10.5 lists two accepted
> consequences of the index rule. This is a third, and it is accepted by the same authority:
> **a capacity reduction reshuffles homes downward.** Residents of later buildings do not
> merely lose homes — those still housed can move *between* buildings as the ceiling drops,
> exactly as they do when it rises on a mastery. §12.1's stability invariant is scoped to
> *placing*, so this is permitted for the same reason consequence 1 is.

**Two consequences the user has reviewed and ACCEPTED. State them where an implementer
will read them, because they are exactly the kind of thing that otherwise gets
rediscovered halfway through a build:**

1. **Mastering a building reshuffles homes BETWEEN buildings.** When an earlier-in-order
   building's capacity grows from `residence_built` to `residence_mastered`, residents of
   later buildings shift up into it. **Nobody loses a home** — the housed set only grows —
   but a specific person's specific house can change on a mastery. §12.1's stability
   invariant is scoped to *placing*, so this is permitted, and §4's promise ("the same
   person has the same home across sessions") is about the same state, which still holds.
2. **Which building a resident occupies depends on placement order.** Every *count* —
   population, capacity, housed, waiting — is order-independent, and §12.1 pins that over
   all 33 build orders. Only the per-building assignment is order-sensitive.

**If either ever becomes unacceptable**, the fix is a decision and not a bug report:
weaken the invariant to "no citizen who had a home loses one" and fill in registry order,
or take the fixed-lane rule and accept visible empty houses. Both are recorded here so
the trade is re-openable without re-deriving it.

---

## 11. Cross-lane dependencies and seams

### 11.1 This is almost entirely Evan's lane

Per `OWNERS.md`: `engines/game` and the city are **Evan's** (city-builder, storms,
checkpoints; "reads mastery, sets checkpoint flag only"). The derivation reads
`student_node_state` through the existing view model and writes nothing, so the frozen
write boundary is untouched and **no owner gate is triggered** for the core feature.

### 11.2 Gabe's lane — the HUD, and any future persistence

- **`packages/shared-state-schema` is Gabe's.** Nothing here needs a schema change:
  the derivation reads `mastery` / `lesson_stage` / `completion_status`, all of which
  already exist. **If §17 Q4 resolves toward seeding from the student id**, that is a
  read of an existing field, not a change — but **if residents are ever persisted**
  (the deliberately-open seam in §4), that *is* a schema and service change in Gabe's
  lane and needs his review and sign-off per the cross-lane change policy.
- **The HUD is Gabe's economy surface.** Whether a population figure belongs beside XP
  and gold in the HUD, or only in the Civic Center panel, is §17 Q5. If it goes in the
  HUD, that is a coordinated change.
- **`packages/skill-graph` is Gabe's**, and the six-node MVP count is pinned by
  `graph_invariants.py`. This feature depends on that only in the mundane sense that it
  reads whatever nodes resolve.

### 11.3 Anthony's lane — untouched

The lesson engine, content, and mastery service are Anthony's. Citizens **read** the
mastery the service writes and never write it, never grade anything, and never gate a
lesson. There is no seam to negotiate, and no mastery-evidence implication.

### 11.4 The onboarding tutorial (Evan, in flight on `evan/tutorial-refresh`)

The cold open in §2 — people wandering out of the Civic Center with nowhere to be — is
**a tutorial beat delivered without words**, and it is the strongest teaching moment
this feature has. The tutorial refresh in flight on `evan/tutorial-refresh` owns
`apps/web/src/city/coachmarks/**` and `apps/web/src/city/onboarding/**` and will
eventually need to **teach citizens**: at minimum, that the crowd is the population and
that a finished building takes people off the street.

**This spec does not touch that work**, and the dependency runs one way: the engine
layer (§10.1) can be built and fully tested with no tutorial change at all. The
sequencing note is simply that the tutorial should be revisited **after** the roster
exists, so it can point at real numbers rather than describe them.

### 11.5 Sibling systems that must not be confused with this one

- **Island condition / decay** (`2026-07-25-island-decay-and-gold-design.md`) weathers
  buildings over time. Citizens are **not** part of it: no citizen state responds to
  condition and crowding never weathers anything (§6, §7).
- **Roads as a gold sink** (`roads.ts`). Citizens give the sink a *reason* (visible
  life) without giving roads mechanical weight (§9).
- **The storm.** Population is never an input to storm eligibility (mastery-only,
  INV-COS-2) and the storm never harms a citizen (§7).

---

## 12. Testing strategy

The whole point of putting the derivation in a pure engine module is that **every
tuning claim in §8 becomes an assertion that runs in milliseconds with no GPU.** This
repo values tests that provably fail against the old behaviour; since the old
behaviour is "there is no population", the interesting bar is stronger: **each test
below fails against a plausible wrong implementation**, not merely against an absent
one. Each is named with the wrong implementation it catches.

### 12.1 Pinning the tuning invariants (pure, `engines/game`)

| Invariant | Assertion | The wrong implementation it fails against |
| --- | --- | --- |
| Cold open | `roster(no placements, no progress)` is `population === FOUNDING_POPULATION` (8), `residence_capacity === 0`, `waiting.length === 8` | A derivation that starts a bare island at zero, losing the entire cold open — and the crowd that gives the middle its pull |
| Full-mastery total | `roster(all six mastered).population === 44` | Any silent change to either population term |
| **THE SETTLED ENDING (the guarantee)** | `population(all mastered) <= residence_capacity(all mastered)`, and `waiting.length === 0` | **Any** retune that leaves someone waiting at full mastery — the single most important assertion in the feature, and the one the 2026-07-27 amendment exists to enforce |
| **Settled ending, exactly full (the intent)** | `residence_capacity(all mastered) - population(all mastered) === ENDGAME_SPARE_HOMES` (0) | A retune that quietly opens a gap, leaving the island with empty houses (hollow, §8.4) — kept separate from the guarantee so the two loosen independently |
| **Settled in EVERY build order** | For all 33 topologically valid orders (and the tested-out order): `waiting.length === 0` at k=6 | A capacity table whose totals depend on the order buildings were finished in |
| **The mid-game crowd exists** | In every one of the 33 orders, `waiting.length > 0` at **k=1 and k=2** | A retune that front-loads housing and erases the middle's pull. Holds because `NUM.2` requires `NUM.S` + `NUM.F`, so this test also **guards the graph assumption** and fails loudly if the prereqs change |
| **Mastery beats building — population** | For every node: `population(that node complete) < population(that node mastered)` | Equal terms, or an accidental swap making building the bigger reward (D-CIT2) |
| **Mastery beats building — capacity** | For every housing mass: `residence_built < residence_mastered` | Losing D-CIT15's mechanism, which is what makes the settled ending earned rather than arithmetic |
| Gold adds nothing | `population(all at mastery 2) === population(all at mastery 3)` and the same for capacity | Paying the non-gating gold margin, turning the crowd back into a scoreboard, or making the settled ending require 5-of-5 on every set |
| **Monotonicity** | Enumerate **all 4^6 = 4096** mastery vectors: advancing any node never lowers population, residence capacity, or any citizen's status | Any rule that takes something away — the machine check behind D-CIT6 |
| **No eviction** | Over all 4096 vectors and every single-node advance: a citizen who was `housed` is still `housed` | A capacity or assignment rule that reshuffles homes and takes one away — the §7 promise, now that the crowd is allowed to rise. **AMENDED 2026-07-31 (AMENDMENT 3): this row's population is LEARNING ADVANCES, and that is now narrower than the behaviour.** Measured at `03d5a2b9`, not argued: with a capacity-only penalty live in `buildingLedger` — sixteen citizens demonstrably displaced — the shipped sweep reports **8 passed, 0 failed**, and the whole citizens and solvency set reports **65 passed across 8 files**. **It is not vacuous:** make capacity fall as a function of *mastery* instead (`NUM.2`'s `residence_mastered` below its `residence_built`) and it fails loudly, naming citizens and vectors. So it measures capacity falling in the one variable it quantifies over and is blind to every other. **Whoever wires O-20 owes this row a population of *capacity reductions from any source*, and owes it a demonstrated red at the widened lines** — which is what era progression's reversal banner asked for first, in the same words |
| **No harm state** | Exhaustive switch over the citizen state union; the test fails to compile if a state is added | A future contributor adding `sick`, `angry`, or `leaving` |
| Capacity never gates | Population is identical across every capacity table, including an all-zero one | Capacity feeding back into arrivals (D-CIT2's forbidden loop) |
| **Roads amplify only** | **Amended 2026-07-27 (D-CIT18):** the derivation takes no road parameter, so the assertion is now on the TYPE — `CitizenRosterInput`'s keys are exactly `nodes` and `seed`, and the roster carries no route field. Deep-equality with and without roads is structural, not sampled | Roads leaking into assignment or population — the INV-COS-1 regression. A contributor who adds `road_cells` back has to break this test to do it |
| Test-out | **Amended 2026-07-30 — GROUNDED CORRECTION 2's test-out clause is OVERRULED.** The build term and `residence_capacity` alike now require `mastery >= PRACTICED_MASTERY`, so a node at `lesson_stage: "done"` / `mastery: 0`, once placed, contributes **no** people and **no** homes: a full test-out sits at 8 people, 0 homes, 8 waiting until a set is scored, and one scored set brings exactly what the pre-build used to | A dial that still pays the pre-build, housing a crowd the economy refuses to pay for — the one state where mouths arrive with no possible means |
| **Tested-out learner settles too** | Walk the §8.5 tested-out curve: it ends at 44 people, 44 homes, 0 waiting | A design that reaches the settled ending only along the ordinary lesson path |
| **Placement required** | Six complete-in-state nodes with **zero** placements yield `FOUNDING_POPULATION` people and **zero** capacity | Counting state alone (GROUNDED CORRECTION 3) — forty-four people on a bare island |
| Determinism | Same seed and state, called twice, deep-equal including citizen order | Any unseeded `Math.random`, `Date.now`, or map-iteration dependence |
| **Assignment stability** | Placing a **new** building never changes an existing citizen's home | People shuffling houses between loads — the defect §4 exists to prevent |
| Unauthored island | `roster(D2)` returns founding crowd, zero roles, zero capacity, everyone waiting, **no throw** | A derivation that assumes at least one residence and divides by zero (D-CIT12) |
| Role derivation | Every D1 **`node_id`** resolves to a role through `resolveNeighborhood`, and an unlisted node falls back to `civic` with zero residence | A role table keyed on the mutable display label (§3) — the `NUM.S` "Town Hall" → "City Bank" rename would have broken it. *(Amended 2026-07-27: the key is the node id, not `gridworkId`, per D-CIT17.)* |
| **School and park house nobody** | `residence_built === 0` and `residence_mastered === 0` for `school` and `park` | The tempting "just spread housing everywhere" fix, which would erase the mid-game crowd (§8.5) and put families in the park |

### 12.2 What is deliberately NOT unit-tested in the engine

Look, feel, and frame cost. The engine cannot see a mesh, so "does the waiting crowd
read as hopeful rather than sad" and "does the settled city read as happy" are
**review-by-eye** judgements (§6, §17 Q8), and "does it hold 60fps" is a **manual
profile** on the target machines (§9, §17 Q2). The render layer gets the same treatment
the rest of `three/` gets: pure helpers tested (`Roads.test.ts`, `MasteryStars.test.ts`,
`orbitCamera.test.ts` are the precedent), the component itself exercised through the DOM
mirror.

### 12.3 Accessibility tests

- The `announcements.test.ts` sweep — which "sweeps every exported `*Message` for a
  leaked id" — must cover every new citizen message, so no population announcement can
  speak `NUM.3` or `town-hall` (§13).
- **The closing beat must exist in text.** A test asserts that the settled state
  (population `<=` capacity, zero waiting, all six mastered) produces the
  community-is-happy message, so the emotional resolution cannot be a visual-only state
  (D-CIT16). This is the accessibility half of §6's guarantee, and it fails against the
  most likely implementation mistake: shipping the settled city as art with no words.
- **No shaming copy.** A sweep asserts the citizen messages contain none of a small
  banned list ("homeless", "unhoused", "failing", "overcrowded", "too many"), which is
  the §7 constraint made mechanical.

---

## 13. Accessibility

**D-CIT13 (DECIDED, AMENDED + CONFIRMED 2026-07-27): both a persistent readout AND
advisor callouts.** The crowd must not be the only channel for any information. The 3D
canvas is `aria-hidden` and decorative; the keyboard-navigable DOM mirror is the semantic
source of truth (`Immersive_City_Shell_Spec.md` §8, `City_Art_Bible.md` §11). A
screen-reader user needs an **equivalent readout**, not a lesser one.

**This matters more here than usual.** With overcrowding removed, the feature's whole
point is an **emotional arc** — a crowd with nowhere to go, worked down, resolving into a
settled city — and an arc is much easier to lose in translation than a number. So the
requirement is not merely "the population is readable" but **the entire arc, including
its ending, must be legible to someone who never sees a citizen.**

### 13.1 The persistent readout (the state, always available)

- **The Civic Center's DOM panel carries the island's population**, in text: how many
  people are on the island, **how many have homes, and how many are waiting**. Those
  three numbers are the arc's state, and they are complete on their own.
- **Each building's DOM roster row carries its own occupancy**, in text: "Rowhouse Flats
  — home to 26 of 26 residents", "Community School — 8 of 8 seats filled". This is what
  makes "every building takes people off the street" (§2) available without vision, and
  it is also where **D-CIT15's mastery upgrade** becomes legible: a built terrace reads
  "home to 10 of 10", a mastered one "home to 26 of 26".
- **Never colour, motion, or density alone.** Every state the crowd expresses visually
  (busy, full, waiting, settled) has a word label, exactly as condition, XP, and gold do
  (town-hall spec §9).

### 13.2 The advisor callouts (the arc, marked as it happens)

The island's advisor is hosted at the Civic Center (town-hall spec D-TH5), which is also
where the waiting crowd gathers — so the advisor is standing in exactly the right place
to narrate this. The callouts mark the arc's beats:

- **The opening**, on a bare island: these people need somewhere to live.
- **Each relief**, when a building takes people in — and named, so the causal link is
  explicit: finishing *this* building housed *these* people.
- **The closing beat, when the island settles: this community is happy.**

**D-CIT16 (DECIDED, new 2026-07-27): the closing "community is happy" beat exists in
TEXT, not only as a visual state.** When the island reaches the settled ending — all six
mastered, everyone housed, nobody waiting — the advisor says so, and the Civic Center
panel says so. A settled city that is only *depicted* would put the design's entire
payoff behind eyesight, which for an `aria-hidden` canvas means putting it out of reach.
§12.3 pins this with a test.

### 13.3 Copy rules

- **No raw internal ids, ever.** This codebase just did a pass on precisely this:
  `announcements.ts` states that "NO ANNOUNCEMENT SPEAKS A RAW INTERNAL ID", names
  every building through `buildingSubject` / `placementLabel` (which guards the
  `town-hall` sentinel), and has a test that sweeps for leaks. **Citizen copy meets
  the same standard**: buildings are named through `placementLabel`, and the hub reads
  "Civic Center", never `town-hall`.
- **Wording must never shame.** "8 people are waiting for homes" — a fact and an
  invitation. Not "homeless", not "unhoused", not "overcrowded", not "your city is
  failing", and no warning colour. The §7 constraint applies to the accessible surface
  **first**, because text is blunter than art. §12.3 makes the banned list mechanical.
- **The waiting number is never framed as a shortfall against a limit.** "8 waiting for
  homes" is allowed; "8 over capacity" is not — the second is the removed overcrowding
  framing (§6) leaking back in through copy, which is the most likely way it would
  return.
- **ARIA live regions: polite, and sparing.** Changes are announced on the existing
  load-on-event refresh (Architecture §7) — "Rowhouse Flats is finished. 8 people moved
  in." — with the same politeness as condition and progress. The state changes only when
  learning state changes, so this is not a chatty region. The **closing beat is the one
  place a stronger announcement is warranted**, and it follows the lesson host's own
  result politeness rather than inventing a new level.
- **Reduced motion.** Under `prefers-reduced-motion` citizens are **posed, not frozen
  mid-stride** and not removed: they stand at their destinations, and the population is
  unchanged. This matches how `StarterIsland`'s gulls behave ("they hold still (posed
  once, no flap)") and how all city ambience is expected to behave (`City_Art_Bible.md`
  §6-§7). The readout and the callouts are identical either way.

---

## 14. Performance budget and failure mode

### 14.1 D-CIT20 (DECIDED, new 2026-07-27 AMENDMENT 2): the performance target

**The FLOOR is a school Chromebook with low-end integrated graphics. The common case is
a typical student laptop with integrated graphics.** The floor is not a worst case to
survive, it is **the realistic classroom machine**, and the feature must remain usable on
it — which for this feature means the crowd reads, the readout is right, and the frame
rate does not collapse.

This **closes §17 Q2**, which asked for a target machine and noted that none was
established anywhere in the repo. It also changes the character of §14.3: with
Chromebooks in scope, **the degradation ladder is a shipping requirement, not a
contingency.**

### 14.2 The budget, and where the cost actually is

**The budget.** Two instanced draw calls for the crowd (bodies, heads) plus one for
cars, no shadow-pass participation, and one `useFrame` callback that writes instance
matrices for **at most `MAX_RENDERED_CITIZENS = 48`** transforms. Against the measured
baseline (§10.3 — a few hundred static meshes, six cheap `useFrame` callbacks,
`frameloop="always"`, shadows on, `dpr={[1, 2]}`), that is a small delta, and it does
**not** scale with population the way per-mesh citizens would.

**The cap is provisional at 48, and it is deliberately NOT the interesting number.**
Two instanced draws of a few dozen low-poly bodies is a few thousand triangles and about
768 floats of matrix write per frame; that is not what a Chromebook struggles with. The
levers that actually bite on the floor are the ones that were already there:
**`dpr={[1, 2]}`** (a 2x-DPR panel is 4x the fragments), **the shadow pass**, and the
road layer's up-to-seven meshes per tile. **Citizens make none of those worse** — they
cast no shadow and add no material. So the honest statement is: *the crowd is cheap; the
scene around it is the cost.* The profiling pass (§17 Q2's successor work, in the
implementation plan's Phase 5) must measure the whole scene on the floor hardware and
report which lever it pulled, rather than tuning the cap and declaring victory.

**The cap, and what it is not.** `MAX_RENDERED_CITIZENS` caps **rendering only**. The
engine's population count, capacities, assignments, and waiting list are **exact and
uncapped**, and the DOM readout (§13) always reports the true number. A player at the
cap sees a crowd that stops getting denser while the text keeps counting — the correct
degradation, because §7 forbids losing people and §13 forbids the crowd being the only
channel.

**On D1 the cap is unreachable, and nobody should over-engineer it now.** The population
tops out at **44** against a cap of 48, and the **waiting crowd peaks at 14** (§8.5), so
the cap cannot bind on this island in any build order. It matters for **a later island
with a larger roster** and for **rung 1 of the ladder below** — not for shipping D1.

### 14.3 The degradation ladder — now a shipping requirement

With a named Chromebook floor, each rung must be **reachable in the shipped build**, not
merely describable in a document. In order of severity:

1. **Lower the render cap.** The first and usually sufficient lever: fewer instances,
   identical roster, identical text.
2. **Stop the walk.** Citizens go static (the reduced-motion pose, §13) and the
   `useFrame` matrix write stops entirely. The city still shows *who is where*, which
   is most of the information; only the movement is lost. **This rung already exists by
   construction**: `prefers-reduced-motion` produces exactly this state, so no new
   mechanism is needed for it.
3. **Drop the cars first.** Traffic is the most expendable element — it is the
   amplification layer (§9), not the readout.
4. **Never** drop the DOM readout, and never drop citizens from the *count*.

**What is NOT decided here, and is listed as §17 Q11:** *how* a rung gets selected — an
automatic heuristic, an explicit quality setting, or a build-time constant. Rung 2 is
free (reduced motion). Rungs 1 and 3 need an answer before the ladder can be called
shipped, and inventing one here would be designing a settings surface inside a citizens
spec.

**Existing fail-closed behaviour already covers the worst case, and it matters more on
the floor.** `CityCanvasHost` wraps the scene in a Suspense boundary and an error
boundary so a failed GLB load, a lost WebGL context, or a render error "all drop back to
the fallback with the keyboard-navigable roster fully intact." **A lost WebGL context is
a genuinely likelier event on a low-end Chromebook than on a developer laptop**, so this
is not a theoretical floor: a citizens layer that throws degrades to a fully-populated
**text** city, which is exactly the right one.

---

## 15. Rejected alternatives (recorded with reasoning)

| Alternative | Why rejected |
| --- | --- |
| **Persisted simulated residents** | New save state with **no server behind it** (verified: `services/economy-api` does not exist; the economy and the city layout are both in-memory, with only a dev-only snapshot for refresh survival). It can **desync from learning state** — the one thing the population must never do, since being a readout of learning is its entire purpose. Deriving makes correctness structural instead of a bookkeeping obligation. The **seam stays open** (§4) if cross-session memory ever justifies the cost. |
| **Scripted vignettes** (authored moments: a family moves in, a bell rings, children file into school) | **Cheap and art-directable**, and genuinely appealing — but the city is only alive **at scripted moments**, and dead between them. Worse, a vignette is **repetitive on third viewing**, and the city is a surface the learner returns to for a semester. A simulated population is alive whenever you look at it, which is the actual requirement. |
| **Time-based population growth** (a trickle while you play) | Decouples the crowd from learning: the population stops being a readout and starts being an attendance record. It also makes the city **farmable by idling**, and it makes every tuning question untestable without a fake clock. |
| **Capacity-based population growth** (build housing to attract residents) | The standard city-builder loop, and wrong here: it makes **building** the driver instead of **learning**, which inverts the reward. It also creates a feedback loop (more houses to more people to more houses) that no assertion can pin, versus §12's arithmetic. |
| **Roads as required infrastructure** (citizens need a road to reach a building) | Gives a **cosmetic gold sink mechanical power over the city's function** — flatly against `roads.ts`'s own stated invariant ("a road only ever blocks a CELL, never progress", INV-COS-1) and dangerously close to the economy gating learning. It would also punish a player who has not bought roads, against §7. Roads amplify (D-CIT7). |
| **Strict typed roles for every building** (an authored role field per node, exhaustively assigned) | Every new building becomes an authoring obligation, and an unauthored island has **no** social life until someone fills a table. The `civic` fallback (§3) makes an island work the day its buildings land, and a mass can be promoted to `residence` or `school` later as a pure data edit. |
| **Renaming buildings per island to force a live/learn/work set** | Would bend each island's **theme** to a social-simulation requirement, and the theming specs are explicit that a skin must never drive structure (`Island_Lesson_Themes_Design_Spec.md` §1.4). It also fights the D1 names the learner already knows and the pending `NUM.S` rename. Reading roles off what a building already is costs nothing and respects every island's own character. |
| **Filler service buildings** (hospitals, police, fire) | Rejected explicitly by the user; full reasoning in **§6.2 / D-CIT5**. |
| **Overcrowding as the endgame** (the island ends over capacity, and that pressure is what makes you want the next island) | **REJECTED 2026-07-27**, having previously been the design (D-CIT4, now reversed). The game's own design brief **bans scarcity and urgency as motivators** for a math-anxious audience, and overcrowding is scarcity by construction — it motivates by withholding. It was also **the one mechanic that would have made finishing feel like a problem**, delivering pressure at the exact moment the player earned a celebration. Full reasoning in **§6.1**. |
| **Reaching capacity as a signal or nudge** (a meter, a "capacity reached" prompt, a hint to move on) | The weaker version of the above, and rejected for the same reason: it is the same pressure delivered through UI instead of art. **The only capacity fact the player is ever told is how many people have homes** (§13), and at the end that everyone does. |
| **Housing every building equally** (spread residence across all six masses, including the school and the park) | The tempting fix for the §8.5 tension — near-uniform capacity is the *only* distribution that keeps a crowd alive to the final skill in every build order. Rejected because it **erases the mid-game crowd's cause**: the crowd exists precisely because the school and the park bring people and house none, which is what teaches the player which building solves it. It also breaks D-CIT3's plain read (a school is a school, a lawn houses nobody). The order-dependent branch in §8.5 is the accepted cost. |
| **Capacity from construction alone** (a built residence houses its full number; mastery adds nothing) | Leaves the settled ending as **arithmetic rather than earned** — the city would settle because the numbers add up, not because the learner mastered anything. It also removes the one lever that lets capacity lag population through the middle and win at the end (D-CIT15), and it wastes the chance to give mastery its first building-level visual (GROUNDED CORRECTION 4). |

---

## 16. Decisions

Twenty decisions. **D-CIT4 is REVERSED in place** by AMENDMENT 1 (both readings are
shown so the change is recorded rather than erased); **D-CIT13 is amended and
confirmed**; **D-CIT15 and D-CIT16 are new** with AMENDMENT 1. **AMENDMENT 2 amends
D-CIT3 and D-CIT9 in place** (both readings shown), annotates **D-CIT7**, and adds
**D-CIT17..D-CIT20**. IDs are never renumbered or reused.

| ID | Ruling | Recorded at |
| --- | --- | --- |
| **D-CIT1** | **Citizens are DERIVED, never persisted.** Population is recomputed from learning state on every load; individuals come from a **stable seed** so look, home, and route are identical across sessions with nothing saved. Accepted cost: no cross-session memory or attachment. The swap-in seam for persisted residents stays open. | §4 |
| **D-CIT2** | **Population is a pure function of learning state — no clock, no capacity feedback.** One dial, un-gameable. Two terms (per complete building, per mastered skill) because a strictly mastery-keyed count would break test-out and the build beat (GROUNDED CORRECTION 2). | §5 |
| **D-CIT3** | **AMENDED IN PLACE (2026-07-27, AMENDMENT 2) → roles are keyed on the NODE ID.** Roles are derived from a stable identifier the engine can resolve — `residence` / `school` / `civic`, with `civic` the fallback so no building is ever role-less and no island needs an authoring pass. *(Was: "derived from the building's ART MASS (`gridworkId`)". Amended because `gridworkId` lives in `apps/web/src/city/buildingAssets.ts`, `@cr/game` cannot import `apps/web`, and `CityBuildingView` carries no art mass — the engine-side table this decision calls for had nothing to key on. The reasoning survives: labels are declared mutable in code and one has already been renamed; the node id is the registry's own primary key and is at least as stable as the art mass.)* | §3, §3.1 |
| **D-CIT4** | **REVERSED (2026-07-27) → THE ISLAND SETTLES.** Mastering all six skills leaves it **full, settled, and happy**: everyone housed, **nobody waiting**, and a closing beat saying so. **Reaching capacity is not a motivator, a signal, or a pressure of any kind.** Mid-game waiting stays and is the only place a waiting crowd appears. Island unlock is still pure mastery — unchanged, just no longer with crowding pushing at it. *(Was: "overcrowding motivates, never gates — the roster stays six by design and outgrowing it is the point." Rejected because the design brief bans scarcity/urgency for a math-anxious audience, and it was the one mechanic that made finishing feel like a problem.)* | banner, §6, §6.1 |
| **D-CIT5** | **No filler buildings.** Hospitals, police stations and similar are **REJECTED**: a building that teaches nothing breaks the one-node/one-building mapping, answers the wrong problem (more objects rather than more use), multiplies the art pipeline with no learning behind it, and would have to be gated on a dishonest currency. **(Reasoning revised 2026-07-27:** what replaces filler is **use**, not overcrowding.) | §6.2 |
| **D-CIT6** | **Nobody is ever punished — a HARD constraint.** People with no home wait at the Civic Center, patient not suffering. Nothing is lost, damaged, or degraded; no number goes down, and **no citizen ever loses a home** (capacity is monotone, assignments stable) — a growing crowd is always new arrivals, never an eviction. Enforced in the type (no harm state exists) and machine-checked over all 4096 mastery vectors. **Strengthened 2026-07-27:** waiting cannot survive into the endgame. **NARROWED 2026-07-31 (AMENDMENT 3, D-CRISIS-28): the no-home-loss clause is scoped to LEARNING events.** A mid-era crisis may lower capacity below the population it was holding, and the overflow becomes `waiting` — measured at `03d5a2b9` as sixteen citizens on a settled island, with nobody deleted and recovery deep-equal. **The constraint's substance survives in three parts:** nothing keys off the learner (`INV-ERA-3`), the displacement is reversible **by the player's own lever** (*"increase capacity via the civic buildings"*), and no state expresses harm — `waiting` is still *patient, not suffering*, and *leaving* is still a fact about a building and never an attribute on a person. **The reversal of the "no citizen ever leaves" half was already recorded** by `2026-07-27-era-progression-design.md`'s own banner; this amendment agrees with it and moves the trigger from happiness to livability | §7, §10.5, §12.1 |
| **D-CIT7** | **Roads amplify, never gate.** Foot traffic follows paths, cars appear, density scales with population — but a citizen never *requires* a road. The roster is deep-equal with and without roads. **Tightened 2026-07-27 by D-CIT18: roads are not an input at all**, so the deep-equality is structural. | §9 |
| **D-CIT8** | **Pure derivation in `engines/game`; rendering in `apps/web`.** The engine never knows about meshes; the scene never decides who lives where; **the seed is an input, never invented by the renderer.** | §10 |
| **D-CIT9** | **Instanced geometry, a render-only cap, no shadows, posed under reduced motion.** A throng costs roughly what a handful does. **`MAX_RENDERED_CITIZENS = 48`** caps *rendering only* — the count and the text stay exact. **New technique: no instancing exists in this codebase today.** *(Amended 2026-07-27, AMENDMENT 2: the cap was **64**, a headroom guess against an unnamed machine. Retuned once the target was set — D-CIT20 — and note the cap is unreachable on D1 at either value.)* | §10.2, §14 |
| **D-CIT10** | **A building obtained by testing out still houses people — once PLACED.** Keying on placed-and-complete rather than complete-in-state, because `seedFromPlacement` clears `placements` (GROUNDED CORRECTION 3). The test-out learner's crowd still arrives sooner; it arrives across their first six placement clicks. **More load-bearing after 2026-07-27:** population and capacity are read from the *same* placed-and-complete set, which is what makes the settled ending hold for a tested-out learner too. | §5, §8.5 |
| **D-CIT11** | **"Mastered" means `mastery >= 2`** — the bar the codebase already means by the word (`MASTERY_LABEL[2]`, `completionStatusForMastery`, `isNeighborhoodReady`). **Gold mastery (3) adds no citizens**; it is a non-gating margin and paying it would make the crowd a scoreboard again. | §5 |
| **D-CIT12** | **An unauthored island yields the founding crowd only.** D2-D10 are `architected` with zero plots and no entries in `D1_NODE_BUILDINGS`, so there are no roles and no capacity: the hub stands, the founding crowd waits, nothing throws and nothing divides by zero. | §12.1, §17 Q3 |
| **D-CIT13** | **AMENDED + CONFIRMED (2026-07-27): both a persistent readout AND advisor callouts.** A DOM readout of **population, housed, and waiting**, plus the advisor marking milestones and closing on the community being happy. Each building's roster row carries its own occupancy (which is also where D-CIT15's mastery upgrade becomes legible); never colour/motion/density alone; **no raw internal ids** (matching the `announcements.ts` standard and its leak sweep); wording never shames and never frames waiting as a shortfall against a limit; reduced motion poses rather than removes. The canvas is `aria-hidden`, so **the whole arc must be legible in text**. | §13 |
| **D-CIT14** | **All tuning lives in one named constants table in the engine.** Because nothing is persisted, a retune applies retroactively with no migration. §12 pins the *relationships*, not the digits. | §8 |
| **D-CIT15** | **NEW (2026-07-27): residential capacity grows with MASTERY, not only with construction.** Capacity has the same two-term shape as population — a `built` term and a larger `mastered` term — so **population and capacity race and mastery is what lets capacity win.** This makes the settled ending **earned rather than arithmetic**, keeps capacity monotone (nobody evicted), and gives mastery its first building-level visual: the citizens *are* the upgrade (GROUNDED CORRECTION 4). | §8.2 |
| **D-CIT16** | **NEW (2026-07-27): the closing "this community is happy" beat exists in TEXT, not only as a visual state.** When the island settles, the advisor says so and the Civic Center panel says so. A settled city that is only depicted would put the design's whole payoff behind eyesight, which for an `aria-hidden` canvas means out of reach. Pinned by a test. | §13.2, §12.3 |
| **D-CIT17** | **NEW (2026-07-27, AMENDMENT 2): the role map lives in `NeighborhoodDescriptor`, keyed by NODE ID, alongside `building_archetypes`.** Same shape (`Record<node_id, …>` plus an explicit default), same file (`engines/game/src/descriptors.ts`), same resolution path (`resolveNeighborhood` → `ResolvedPlot` → `CityBuildingView`), so the citizen role arrives through the generic pipeline everything else already uses and the web lane threads nothing. Unlike its neighbour it is **authored, not derived** — a social role cannot be read off `answer_type`. Verified against the code: architected domains resolve to zero plots so the map is never read (D-CIT12 intact), the `Record<DomainId, …>` exhaustiveness costs two edits because eight slots come from one `architectedSlot()` helper, and nothing constructs `ResolvedPlot` or `CityBuildingView` as a literal outside the two functions that build them. **Cost, stated:** a second island reusing an art mass authors one line instead of inheriting a role. | §3.1 |
| **D-CIT18** | **NEW (2026-07-27, AMENDMENT 2): roads are NOT an input to the roster derivation.** §10.1's sketch carried `road_cells` while §12.1 demanded the roster be deep-equal with and without roads; the invariant wins, and dropping the parameter makes it true **by construction**. Routing needs `worldLayout` and `roads.roadCellKey`, both in `apps/web`, so the router belongs on the render side anyway. A contributor who wants roads to matter must widen the input signature, which a reviewer can see. | §9, §10.1 |
| **D-CIT19** | **NEW (2026-07-27, AMENDMENT 2): homes are filled greedily in PLACEMENT order, and the housed set is the lowest-indexed `min(population, capacity)` citizens.** The design stated two properties (assignment stability under a new placement; no empty homes while anyone waits) and no rule, and no history-free rule satisfies both under a fixed building order. Placement order makes a new building **append**, so it draws only from the waiting pool. The index rule makes the **no-eviction guarantee structural**, since capacity and population are both monotone. **Two accepted consequences:** mastering a building reshuffles homes *between* buildings (nobody loses one), and *which* building a resident occupies is placement-order-dependent (no count is). **AMENDED 2026-07-31 (AMENDMENT 3, D-CRISIS-28): the structural no-eviction claim holds over LEARNING state only, and the rule gains a second job.** With a crisis able to lower capacity, the index rule is what makes displacement **ordered, minimal and exactly reversible** — the highest-indexed housed people leave first, in reverse of the order they arrived, and they return into the same homes because the roster is a pure function of state. **A third accepted consequence:** a capacity reduction reshuffles homes *downward*, exactly as a mastery reshuffles them upward | §10.5 |
| **D-CIT20** | **NEW (2026-07-27, AMENDMENT 2): the performance target is school Chromebooks with low-end integrated graphics (the FLOOR) and typical student laptops with integrated graphics (the common case).** Closes §17 Q2. `MAX_RENDERED_CITIZENS` retuned 64 → **48**, and the cap is noted as **unreachable on D1** (44 people, waiting peaks at 14) so nobody over-engineers it — it matters for a later island and for ladder rung 1. **The crowd is not the cost on the floor**: `dpr={[1, 2]}`, the shadow pass, and the road layer are, and citizens make none of them worse. **§14's ladder becomes a shipping requirement rather than a contingency**, with rung 2 free via reduced motion and rungs 1/3 pending Q11. | §14 |

---

## 17. Open questions (decisions someone must make)

These are genuinely undecided. Each is phrased as the decision, not the topic.

1. **Do the §8 numbers survive contact with the island?** Reshaped by the 2026-07-27
   amendment: the question is no longer "is 1.4x over capacity the right pressure" but
   **is the mid-game crowd big enough to pull, and small enough to stay hopeful?** A
   peak of **14 waiting** against a population of 26 is the current answer. **Decide
   after seeing it on D1**, not before; the §12 assertions pin the endgame guarantee, so
   the mid-game numbers can move in one edit without risking the settled ending.
2. **CLOSED 2026-07-27 (AMENDMENT 2, D-CIT20).** *Was: "What is the target machine, and
   what is the real cap? `MAX_RENDERED_CITIZENS = 64` is a guess with headroom, not a
   measurement."* **Answered by the user: the floor is school Chromebooks with low-end
   integrated graphics; the common case is typical student laptops with integrated
   graphics.** The cap is provisionally **48** and is unreachable on D1 either way. The
   remaining *work* is a profile against that hardware class (the implementation plan's
   Phase 5), which is a task rather than a decision — and the half of the old question
   that really was undecided ("a lower cap, static citizens, or both?") is now **Q11**,
   since a named floor turns the ladder into a requirement.
3. **Is a hotel housing?** The `civic` fallback (D-CIT3) means an island with no
   `residence` mass gives **everybody** the waiting state — legal under §7 but a poor
   read. D2 Boomtown Square's **Boom Hotel** (`EXP.1`) is lodging by any ordinary
   reading, and its brief is already written
   (`2026-07-26-d2-boomtown-square-island-design.md`). Decide whether lodging masses
   join `residence`, or whether each island authors one residence override.
4. **Where does the seed come from?** The student id is the natural stable value, but
   `citySession.ts` hard-codes `DEMO_STUDENT_ID = "demo-student"`, so every dev learner
   would share one city. Options: seed off the student id and accept the dev
   degeneracy; seed off the student id with a dev-only override; or mint a stable
   client-side value. **This is the one decision that touches Gabe's lane** if it
   resolves toward reading schema state (§11.2).
5. **Does population belong in the HUD, or only in the Civic Center panel?** The HUD
   is Gabe's economy surface (XP, gold). A population figure there makes the crowd a
   number again, which cuts against §1 — but a player who never opens the hub panel
   never reads the count. Decide, and if it is the HUD, coordinate.
6. **Which tutorial beat teaches the crowd, and does it need words at all?** The cold
   open is designed to teach without a tutorial (§2), and the tutorial refresh on
   `evan/tutorial-refresh` may reasonably decide to say nothing. Someone must decide
   whether "the crowd is your population" is ever stated explicitly, and if so, where
   (§11.4).
7. **Do cars count against the citizen cap?** They are separate instanced draws
   (§8.6) and separate objects, but they share the frame budget. Decide whether
   `MAX_CARS` is independent or a slice of one combined budget.
8. **Does the settled city read as HAPPY, and does the mid-game crowd read as
   HOPEFUL?** Reshaped by the 2026-07-27 amendment — the old question was whether a
   *large* waiting crowd needs a deliberate art treatment, which matters much less now
   that the crowd peaks at 14 and always clears. The two art calls that replace it are
   the ones the amendment actually rests on: **(a)** does a full island with every
   window lit and nobody outside read as *thriving* rather than merely *static*, and
   **(b)** does a crowd of 14 outside the Civic Center read as *waiting hopefully*
   rather than *stranded*? Both are review-by-eye, not engine questions, and both are
   pass/fail for the design rather than tuning.
9. **Does the housing-rush branch read as hollow?** A learner who finishes
   `NUM.S` → `NUM.F` → `NUM.2` settles the island at skill 3 with **12 spare homes**
   that the last three skills fill (§8.5). Decide whether that reads as *"I solved
   housing early"* (the intent) or as *"my city has empty houses"*. If it reads hollow,
   the lever is to shrink `residence_mastered` for the rowhouse and accept a small
   endgame surplus elsewhere — but **not** to house people in the school or the park,
   which §15 rejects.
10. **Should mastery's new capacity step get any art beyond the citizens?** GROUNDED
    CORRECTION 4 establishes that mastery has no building-level visual today (stars
    only, the lit-windows treatment having been explicitly retired) and proposes that
    the citizens themselves *are* the visual. Decide whether that is enough, or whether
    a mastered residence should also get the retired lit-windows treatment back — now
    that it would carry real meaning.
11. **NEW (opened by D-CIT20): how does a degradation rung get SELECTED?** Naming a
    Chromebook floor turned §14's ladder from a contingency into a shipping requirement,
    which means rungs 1 (lower the cap) and 3 (drop the cars) have to be *reachable* in
    the built app, not merely described. **Rung 2 is already free** — reduced motion
    produces exactly the static-citizens state — so this question is only about the
    other two. The honest options are an automatic heuristic (measure frame time and
    step down), an explicit quality setting beside the existing audio and lighting
    controls, or a build-time constant. Each has a different cost and a different
    failure mode, and picking one inside a citizens spec would be designing a settings
    surface that belongs to the shell. **Decide before the ladder can be called
    shipped**; nothing before the render layer is blocked by it.
12. **NEW (opened by AMENDMENT 3): WHICH capacity bounds the population?** This is the
    same question as `2026-07-29-mid-era-crisis-design.md` **O-20** and is listed here
    because it is a decision about *this* design's central arithmetic, not only about a
    crisis. Today there are **two disjoint ledgers**: `residence_capacity` — this design's,
    a sum over the six skill nodes, which bounds `housed` and therefore `waiting`, which no
    crisis may lower, and which a purchased civic building adds exactly **zero** to; and the
    economy's **livability**, which civic buildings do feed, which a crisis *does* reduce
    through `civicCityCapacities`, and which bounds **nothing** (`capacityShortfall`'s
    `unsustained` is computed and consumed by nobody). **D-CRISIS-28 needs the second one to
    bound the first one's arithmetic**, and this seam has been found once already and named
    exactly: `work-log/gabe/2026-07-29-capacity-model-ruling.md` (PR #218) says *"today's
    shipped `CitizenCapacity` is precisely the thing the ruling reclassifies from a capacity
    to the housing input to livability, and today's `population <= capacity` guarantee is a
    single-term bound"*, and left it alone on the grounds that *"it is Evan's file"* — which
    is this document's lane, so it lands here. Era progression §7's *"there is no separate
    housing capacity"* is the same ruling from the other end. **Two costs travel with it,
    and neither is optional:** §12.1's no-eviction row needs its population widened, with
    a demonstrated red; and this design's tuning is calibrated so
    `population === residence_capacity` at full mastery (`ENDGAME_SPARE_HOMES = 0`), so
    re-pointing the bound changes what *settled* means and §12.1's settled-ending
    guarantee is asserted against the current reading.
    **Sequence it deliberately** — PR #273 is open in exactly these files.

---

## 18. Self-review (consistency check — re-run 2026-07-27 after AMENDMENT 2)

- **AMENDMENT 2's sweep is complete, and it was driven by writing the build rather than
  by re-reading the design.** Every place the three unbuildable spots were assumed has
  been amended and the change recorded rather than erased: the new banner, the Status
  paragraph (now naming both amendments and twenty decisions), §3's ruling and its
  members table (**now keyed by node id**) plus the new §3.1 recording what was checked
  against `descriptors.ts`, §8.2's key column and the `park` role cell, §8.5's k=5 range
  row, §8.6's cap row, §9's new D-CIT18 bullet, §10.1's revised input sketch, the new
  §10.5 (D-CIT19 and its two accepted consequences), §14 rebuilt around the named floor
  with the ladder promoted to a requirement, the decisions table (D-CIT3 and D-CIT9
  amended in place, D-CIT7 annotated, D-CIT17..D-CIT20 added), §17 (Q2 closed with its
  old text quoted, Q11 opened), and this list. **A grep for `gridworkId` now finds only
  the passages that deliberately record the change**, and a grep for `road_cells` finds
  only D-CIT18 and the revised sketch's provenance note.
- **The three resolutions were verified against the code, not reasoned about
  abstractly.** The role map was checked against `resolveNeighborhood`'s actual body,
  `architectedSlot()`, the `Record<DomainId, …>` exhaustiveness, and every construction
  site of `ResolvedPlot` and `CityBuildingView` before being written down (§3.1). The
  roads resolution was checked against where `worldLayout` and `roadCellKey` actually
  live. The assignment rule was checked against `citySession.readPlacements()`'s
  insertion order and `CityDevSnapshot`'s round-trip.
- **Where a resolution costs something, the cost is stated rather than buried.** D-CIT17
  loses free role inheritance across islands that share an art mass (one line of
  authoring). D-CIT19 reshuffles homes between buildings on a mastery and makes
  per-building assignment placement-order-dependent (no count is affected). D-CIT20's
  cap is provisional and its own section says the cap is **not** the lever that matters
  on the floor.
- **Nothing here is built, and the doc says so.** No citizen module, no instancing, no
  population on any surface. Every code reference is to something that exists **today**
  and is cited by file; every proposed shape is marked `PROPOSED`. **No placeholders or
  TODOs remain** — every number in §8 is a concrete value with a reason, and the two
  places the design genuinely defers (the art calls, §17 Q8, and the housing-rush read,
  §17 Q9) are in the open-questions list rather than left blank in the tuning table.
- **The overcrowding sweep is complete.** Every place the removed endgame was assumed
  has been rewritten and the change recorded rather than erased: the banner (new), the
  summary's closing paragraph (§1), the arc description (§2), the whole of §6 with the
  old ruling quoted and its rejection reasoned (§6, §6.1), the filler-buildings
  rationale that leaned on it (§6.2), the never-punished section (§7, strengthened), the
  entire tuning section (§8, retuned with the old figures quoted), the invariants that
  pinned an overflow band (§12.1, now pinning the settled ending instead), the
  accessibility copy rules (§13.3, which now forbid "over capacity" phrasing as the most
  likely way the framing would return), the performance read on the cap (§14), four new
  rejected-alternative rows (§15), the decisions table (§16, D-CIT4 reversed in place),
  and two reshaped open questions (§17 Q1, Q8). A grep for "overcrowd", "over capacity",
  and "outgrow" finds only the passages that deliberately record the reversal.
- **The mid-game/endgame tension is solved explicitly, not asserted away.** §8.5 states
  the tension, names the mechanism that resolves it (D-CIT15's mastery-driven capacity,
  plus the school and the park housing nobody), grounds it in the **prerequisite graph**
  (`NUM.2` requires `NUM.S` + `NUM.F`, so a crowd through the first two skills is a
  graph-level guarantee), and gives the pacing over **all 33 valid build orders** plus
  the tested-out path. **Where it does not fully succeed, it says so:** the
  housing-rush branch settles at k=3 with 12 spare homes, and a search over every
  integer capacity assignment confirmed no distribution avoids that while keeping the
  school and the park at zero. That is a stated limitation, not a gap.
- **All four grounded corrections were re-checked against the removed overcrowding, and
  all four still read correctly.** Correction 1 (two ledgers) gained a paragraph
  explaining that it matters *more* now, since the settled ending is a claim about the
  residence ledger. Correction 2 (the two-term dial) is unchanged and still load-bearing.
  Correction 3 (placed-and-complete) gained two paragraphs: it is now what makes the
  settled ending hold for a tested-out learner, and it implies mastered-implies-placed,
  which is why an unplaced building cannot break the guarantee. Correction 4 is **new**
  and was found while checking the amendment's own rationale — mastery does not visibly
  upgrade a building today, which the amendment assumed it did.
- **The free-space number is measured, not estimated, and unaffected by the amendment.**
  88 buildable cells, 23 taken by six skills plus the 3x2 hub, **65 free (74%)** —
  enumerated from `worldLayout.ts`'s own rule (`isCellBuildable` on cell centres inside
  `BUILDABLE_RADIUS = 22`), with the two qualifications that matter (roads compete for
  those same cells; the r=22..25 grass annulus is permanently clear).
- **The per-frame budget is measured, not asserted.** `frameloop="always"`, `shadows`,
  `dpr=[1,2]`, six cheap `useFrame` callbacks, a few hundred static island meshes, and
  **no instancing anywhere in the app** — which is what makes D-CIT9 a real decision
  rather than a formality. The population rose from 40 to 44, which changed nothing about
  the budget. **Amended 2026-07-27:** the *baseline* is still measured and still true, but
  it was measured on a developer machine, and D-CIT20 now names a **school Chromebook** as
  the floor. The three costs in that baseline that actually scale on the floor —
  `dpr={[1, 2]}`, the shadow pass, and the road layer — are all **pre-existing**, and
  citizens make none of them worse. So the honest reading is that this feature is cheap on
  the named target and the scene around it is where a profile will find its wins (§14.2).
- **No hard-coded numbers pretending to be facts.** The geometric facts (88/21/67,
  `GRID_CELL = 4`, `BUILDABLE_RADIUS = 22`, `ISLAND_GRASS_RADIUS = 30`, the 3x2 hub), the
  mastery scale (`>= 2` is "Mastered", `masteryFromCorrectCount` awards 2 at 4-of-5), and
  the D1 prerequisites are all read from code. Every population, capacity, and speed
  figure is a **named tuning constant with a starting guess and a stated reason** (§8),
  and §12 pins relationships rather than digits.
- **Ambiguity check — three words that could be read two ways, now pinned.** "Mastered"
  means `mastery >= 2` (D-CIT11, not gold). "Built"/"complete" means **placed and**
  `construction_state === "complete"` (D-CIT10, not complete-in-state). "Capacity" means
  **residential** capacity wherever the settled ending is discussed, and daytime capacity
  is always named as such (§8.3). Each is stated where an implementer would read it, not
  only in §16.
- **Scope check — neither amendment widened the feature.** No new surface, no new
  persisted state, no new cross-lane seam. D-CIT15 adds a second column to a table that
  already existed; D-CIT16 adds a message to a panel and an advisor that already exist.
  **AMENDMENT 2 narrows more than it adds**: D-CIT18 removes a parameter, D-CIT19 writes
  down a rule that was going to be invented anyway, and D-CIT17 moves a map into a file
  that already holds its twin. The one genuinely new obligation is D-CIT20's ladder, and
  its unresolved half is parked as Q11 rather than designed here. §11's lane analysis is
  unchanged, and the feature still writes nothing.
- **No contradiction with ratified contracts.** Population never gates learning or the
  storm (§6) ↔ Contracts §8 INV-COS-1/2; the game writes nothing new (§4, §11.1) ↔
  Blueprint §4; roads stay cosmetic (§9) ↔ `roads.ts`'s own invariant; mastery is
  monotonic and citizens never decay (§7) ↔ `Mastery_Scoring_Spec.md` §8; the DOM
  mirror is the semantic source of truth (§13) ↔ `Immersive_City_Shell_Spec.md` §8. The
  amendment strengthens the last two rather than straining them.
- **Every requirement reads one way.** Citizens are a **readout of learning rendered as
  life**: derived not stored, paced by learning not by time or capacity, amplified by
  roads not gated by them, **busy in the middle and settled at the end, never failing.**
- **Docs-only change.** No source file is touched, so a full `npm run check` is not
  required for this PR — there is nothing for typecheck, lint, or the unit/browser
  suites to see. The checks in §12 describe work that does not exist yet.

---

## 19. References

- `docs/superpowers/specs/Game_Architecture_Blueprint.md` — descriptor-registry model,
  the frozen write boundary (§4), extension discipline (§12).
- `docs/superpowers/specs/D1_City_Builder_Design_Spec.md` — the D1 slice the crowd
  inhabits.
- `docs/superpowers/specs/Immersive_City_Shell_Spec.md` — HUD/overlays (§5),
  accessibility and the DOM-mirror-first rule (§8).
- `docs/superpowers/specs/City_Art_Bible.md` — ambience, juice, and reduced motion
  (§6-§7); accessibility (§11).
- `docs/superpowers/specs/2026-07-25-town-hall-design.md` — the pre-seeded, always-built
  **Civic Center** citizens emerge from (D-TH6 3x2 footprint, D-TH7 label, §9
  accessibility).
- `docs/superpowers/specs/2026-07-25-island-decay-and-gold-design.md` — island
  condition, which crowding must **not** be confused with (§11.5).
- `docs/superpowers/specs/2026-07-26-d2-boomtown-square-island-design.md` — the next
  island's building roster, and the Boom Hotel behind §17 Q3.
- `docs/superpowers/specs/Island_Lesson_Themes_Design_Spec.md` §1.4 — theming is a skin
  and never drives structure (the rejection of per-island renaming, §15).
- `docs/Mastery_Scoring_Spec.md` §8 — monotonic mastery, no decay.
- `docs/Contracts.md` §8 (INV-COS-1/2) — nothing cosmetic or economic gates learning.
- `OWNERS.md`, `TEAM_CHECKLIST.md` — lane ownership (§11); the checklist confirms
  `services/economy-api` "remains Gabe's and unbuilt".
- `apps/web/src/city/worldLayout.ts` — `GRID_CELL`, `BUILDABLE_RADIUS`,
  `ISLAND_GRASS_RADIUS`, `NODE_FOOTPRINTS`, `isCellBuildable`, `occupiedCells` (the
  §9.1 free-space measurement).
- `apps/web/src/city/roads.ts` — the road grid, `roadCellKey`, `roadNeighborMask` (the
  adjacency a router can use), `isRoadCellLayable`, and the INV-COS-1 header.
- `apps/web/src/city/three/Roads.tsx` — how roads render (per-tile meshes over shared
  geometry); no connectivity or path query exists.
- `apps/web/src/city/three/CityScene.tsx` — `frameloop="always"`, `shadows`,
  `dpr={[1,2]}` (the §10.3 baseline).
- `apps/web/src/city/three/StarterIsland.tsx` — the procedural island, its private
  `mulberry32` seeded scatter (the §4 precedent), and the shadow-skipping gulls.
- `apps/web/src/city/three/CityCanvasHost.tsx` — the Suspense + error-boundary
  fail-closed path to the DOM roster (§14).
- `apps/web/src/city/buildingAssets.ts` — `D1_NODE_BUILDINGS` (`building` is a mutable
  display string, `gridworkId` "MUST NOT change"). **This was the §3 role key until
  AMENDMENT 2**; it is now cited only as the reason a role table must not be keyed on a
  display name, since the art mass itself is unreachable from `@cr/game` (§3.1).
- `engines/game/src/descriptors.ts` (again, for §3.1) — `NeighborhoodDescriptor`,
  `building_archetypes` / `default_archetype` (the shape D-CIT17's role map copies),
  `architectedSlot()` (the one helper that supplies eight of the ten domain slots),
  `NEIGHBORHOOD_DESCRIPTORS: Readonly<Record<DomainId, …>>` (the compile-time
  exhaustiveness), and `resolveNeighborhood`'s `?? descriptor.default_archetype` fallback
  (the resolution line the role map mirrors).
- `apps/web/src/city/townHall.ts` — `TOWN_HALL_ID`, `TOWN_HALL_LABEL = "Civic Center"`,
  `TOWN_HALL_FOOTPRINT` 3x2, `placementLabel` (the hub sentinel guard).
- `apps/web/src/city/citySession.ts` — in-memory `placements` / `roads`,
  `CityDevSnapshot`, and `seedFromPlacement` (which clears placements — GROUNDED
  CORRECTION 3).
- `apps/web/src/city/announcements.ts` — the no-raw-ids standard and its sweep test
  (§13).
- `engines/game/src/city-view-model.ts` — `buildCityViewModel`, which "derives
  everything read-only" (the pattern §10.1 follows).
- `engines/game/src/construction.ts` — `deriveConstructionState` (`complete` at
  `mastery >= 2` **or** `lesson_stage === "done"`), the basis of §5's two terms.
- `engines/game/src/descriptors.ts` — `resolveNeighborhood`, `populated` vs
  `architected`, the `product_scope === "mvp"` filter, and `BuildingArchetypeId` (the
  answer-type axis citizens must **not** read).
- `engines/game/src/neighborhood.ts` — `isNeighborhoodReady` / `getRequiredNodeIds`
  (mastery-only gating, §6).
- `packages/shared-mastery-service/src/index.ts` — `completionStatusForMastery`,
  `PRACTICE_SET_SIZE = 5`, `MASTERY_CORRECT_COUNT = 4`, and **`masteryFromCorrectCount`**
  (which awards mastery 2 at 4-of-5, so `complete` and `mastered` land together for a
  passing learner — the fact §8.5's pacing is computed against) plus the monotonic
  `max(existing, evidenced)` write that makes capacity monotone (§7).
- `packages/skill-graph/src/skill_graph.json` — the **D1 prerequisites** behind §8.5's
  guarantee: `NUM.2` (Rowhouse Flats) requires `NUM.S` and `NUM.F`, so the island's main
  housing can never be the first or second skill finished; `NUM.4` requires four others.
- `apps/web/src/city/masteryVisuals.ts` — "the STARS... **This is the ONLY mastery visual
  a building carries; there is no 'building comes alive' (lit-windows / body-glow)
  treatment**", the basis of GROUNDED CORRECTION 4 and of §17 Q10.
