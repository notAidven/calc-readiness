# Design & spec document status inventory

**Gabe, 2026-07-29**, read at `integration` `1cb0089`. One status per document:
**CURRENT** · **PARTIALLY SUPERSEDED** · **SUPERSEDED** · **UNKNOWN**.

**Why this exists and why it is not a second index.** `docs/README.md` §11 indexes the top level
of `docs/` and states that `docs/superpowers/specs/` is deliberately excluded, on the reasoning
that mirroring a lane-owned directory would create a second list to keep in sync. **That
reasoning is right and this file does not overturn it** — see the note at the end. What was
missing was not an index but a **status**, and a status is a claim about a moment, which is why
this file is dated in its first line and says so rather than pretending to be evergreen.

**Read this against the tree, not instead of it.** A status here expires the moment something
merges in that area.

---

## The one thing that moved everything

**PR #177 (merged 2026-07-28) replaced the island model with one city advancing through ten
eras**, and #180 shipped the era data, #194 the twenty era documents, #210 a three-node
rebalance. Most "partially superseded" statuses below are that single change reaching a document
that predates it.

---

## `docs/superpowers/specs/` — the design lane

| Document | Status | Why |
|---|---|---|
| `2026-07-27-era-progression-design.md` | **CURRENT** — the authority for the world | §6.1 still names the retired D1 building names in the present tense, and the capacity-model ruling of 2026-07-29 owes it three edits (§10.4 below). Both are internal staleness, not a wrong design |
| `eras/README.md` + the twenty era documents | **CURRENT** | Rosters for eras 4/5/6 and the cumulative dressing counts were stale after #210 and are corrected 2026-07-29; all ten folders now carry framings, an advisor and a subtitle row |
| `Island_Lesson_Themes_Design_Spec.md` | **SUPERSEDED — legacy, authoritative for nothing** | Owner's ruling, 2026-07-29. Banner at the head of the file. Retained as history; its framings are built out of centuries that do not match the eras their domains sit in |
| `2026-07-26-d2-boomtown-square-island-design.md` | **SUPERSEDED — legacy** | Same ruling. The one worked per-island exemplar, and the identity layer survives while the dressing does not (era two's O-11 answer) |
| `2026-07-26-d2-building-concept-options.md` | **PARTIALLY SUPERSEDED** | Same island premise, but it is a record of a building-identity *method* with rendered alternatives, and the method transfers |
| `City_Art_Bible.md` | **PARTIALLY SUPERSEDED** — and it says so itself | §1.2's per-domain hue families are retired by **D-ERA27** and carry a superseded banner in place. Everything else — the parchment base, the three-tone face model, silhouette-first legibility, mastery gold reserved — is current and every era guide inherits it |
| `D1_City_Builder_Design_Spec.md` | **PARTIALLY SUPERSEDED** | Named in the era spec's §2 table as superseded *as a model*; its machinery (descriptor registry, resolution path, fail-loud fences) is explicitly kept |
| `Immersive_City_Shell_Spec.md` | **CURRENT** | Shell/seam spec; the era change does not reach it |
| `Game_Architecture_Blueprint.md` | **CURRENT** | Still the reference for the storm loop and the roadmap endgame |
| `2026-07-25-town-hall-design.md` | **PARTIALLY SUPERSEDED** | The hub is promoted to a chapter marker by the era model; D-TH5's per-island advisor hosting is re-read as per-era |
| `2026-07-25-island-decay-and-gold-design.md` | **PARTIALLY SUPERSEDED** | Decay survives as a mechanic; "island" is now "era" wherever the geography was what mattered |
| `2026-07-25-resource-model-xp-gold-design.md` | **PARTIALLY SUPERSEDED** | Marked SETTLED DESIGN, but its premise is *"exactly two resources: XP and gold"* and **D-ERA13 drops gold for one era-themed resource**. Nothing in it references D-ERA13. Worth a banner |
| `2026-07-25-townhall-resource-decision-brief.md` | **PARTIALLY SUPERSEDED** | Decision record; its narrative framing cites the themes spec |
| `2026-07-25-xp-gold-implementation-plan.md` | **PARTIALLY SUPERSEDED** | Follows the resource-model doc above |
| `2026-07-27-citizens-and-city-life-design.md` + its implementation plan | **CURRENT** | `CitizenCapacity` ships; the capacity ruling reclassifies it as a bound on *livability* rather than a capacity of its own, and the 2026-07-29 aggregation ruling (one pool, housing and food untracked) means a single term is the right shape for it. Lands with the era economy |
| `2026-07-24-onboarding-demo-design.md`, `-demo-reel-coachmarks-design.md`, `-unlock-reward-popup-design.md`, `2026-07-27-tutorial-refresh-design.md` | **PARTIALLY SUPERSEDED** | The reel is now narrated by Oru rather than the CityGuide; the mechanics are current |

---

## `docs/` — the top level

| Document | Status | Why |
|---|---|---|
| `PRD_Full.md` | **PARTIALLY SUPERSEDED** | Current for product scope; its neighborhood/island vocabulary predates the era model. `PRD_Full.docx` is a generated artifact |
| `Contracts.md` + the seven amendments | **CURRENT** (provisional freeze) | Unaffected by the era change. **A gap**: there is no home for a city capacity model — §8 is scoped to the *cosmetic* economy and the file ends at §8.5. Recommended as a future §9 |
| `Node_Spine_v4.md` | **CURRENT** | Content authority; era guides quote its lesson titles verbatim |
| `Answer_Equivalence_Spec.md` | **CURRENT** (v0.16) | Read its own status line, not a copy of it |
| `Native_Math_Input_Scope.md` | **CURRENT** | Scope note, unaffected |
| `Game_Visual_Design_Brief.md` | **PARTIALLY SUPERSEDED** | §4.1's per-domain hue families go with `City_Art_Bible.md` §1.2 under D-ERA27. Its **tone bans** are current and are cited by all ten era guides |
| `Content_Authoring_Split.md` | **CURRENT** | Amended twice: §9 keys ownership by era (2026-07-28), §10 records the four rulings and un-splits the two shared eras (2026-07-29) |
| `Post_MVP_Backlog.md` | **CURRENT** | Build order and cuts |
| `OWNERS.md` | **CURRENT** | Reconciled 2026-07-29 to the era/domain delivery wording |
| `TEAM_CHECKLIST.md` | **PARTIALLY SUPERSEDED** | Gabe's section corrected 2026-07-29. **Anthony's section is stale in three places and is his to fix** — see below |
| `README.md` (the manifest) | **PARTIALLY SUPERSEDED** | §1 and §10a still describe domains as neighborhoods and "the other 8 neighborhoods shown locked". Accurate about scope, out of date about the world |
| `MVP_Definition.md`, `MVP_Node_List.md`, `Lesson_Cluster_Sketch.md`, `Prereq_Edges_And_Hubs.md` | **CURRENT** as rationale companions | Registry wins on any conflict, as each says |
| `Architecture.md`, `Deployment.md`, `Mastery_Scoring_Spec.md`, `Assessment_Scoring_Spec.md`, `Error_Typing_Spec.md`, `Before_Authoring_Checklist.md`, `D1_Checker_Spike.md`, `State_Schema_Freeze_Review.md`, `One_Pager.md`, `Photo_Work_Upload_Scope.md` | **CURRENT** | Unaffected by the era change |
| `Diagnostic_Probe_Cost_Measurement.md`, `Diagnostic_11_Node_Scope_Measurement.md`, `Diagnostic_Tail_Policy_Measurement.md`, `Graph_Comparator_Spike.md` | **CURRENT as evidence** | Measurement records; non-normative and dated by design |
| `Contracts_Amendment_Proposal_City_Economy.md` | **SUPERSEDED** | Says so itself: *"Do not build against this document"* |
| `pr-anthony-general-lesson-quality.md` | **UNKNOWN** | A PR write-up living in `docs/`. Anthony's, and neither indexed nor dated as a spec |
| `archive/`, `design-refs/`, `diagrams/` | **SUPERSEDED / historical** | Marked as such already |

---

## `.cursor/` — the skills

| Skill | Status | Why |
|---|---|---|
| `author` (`SKILL.md`, `reference.md`, `examples.md`) | **CURRENT** | Repointed 2026-07-29 from the themes spec to the era folders; §6's domain-keyed theming table removed; the stale D-ERA9 "those names are live" claim corrected |
| `lesson-qa` | **CURRENT** | Split-domain theming updated from "open question" to the ruling, with `RAT.5` recorded as a known owner-assigned item rather than a finding to re-file |
| `progress-update`, `sync` | **CURRENT** | Process skills |
| `interactive-visuals`, `lesson-katex`, `practice-templates`, `worked-solution-svg`, `svg` | **CURRENT** | Craft skills; the era change does not reach them |
| `practice-hints` | **CURRENT** | Its story-to-math rule was re-cited 2026-07-29 off the retired civic scenarios onto the prehistoric ones the item bank actually builds |
| `era-infinite-practice` (was `domain-infinite-practice`) | **CURRENT** | Rewritten 2026-07-29 with the drill itself: the population is now derived from `ERA_SEQUENCE`, so the skill is era-keyed rather than untouched by the era change |

---

## Three things a reader should know rather than infer

**Anthony's checklist section is stale in three places and is not mine to edit.** Its expansion
items still describe **PR #16** as an open loop needing coordination (it closed 2026-07-23,
`mergedAt: null`, and `OWNERS.md` has said so in bold since); and its counters still read
**10/27 lessons** and **8/22 item packs** with D8 "pushed, not merged". **D8 merged as #223 at
2026-07-29T04:49:34Z** with `EL.1`-`EL.5`, so the counters understate by **five** and **four**
respectively (`EL.1` is a spine node whose items are Gabe-authored, which is why the item-pack
figure moves by four rather than five).

**Should `docs/README.md` index `docs/superpowers/specs/`? No — and the drift has a different
cause.** The exclusion note's reasoning holds: a mirror of a lane-owned directory is a second list
that goes stale, and this repo has watched exactly that happen to the authoring skill's theming
table (PR #76). What actually let the era directory drift was not the absence of an index but
that **top-level `docs/` never learned the era model existed** — `docs/README.md` §1 and §10a
still describe domains as neighborhoods. The fix is a **pointer plus a status**, not a mirror: a
one-line pointer in §11 to this file, and this file dated and re-derived rather than maintained.
`docs/superpowers/specs/eras/README.md` already indexes the era folders from inside the lane,
which is where a real index belongs.

**Two documents want a banner from their owner and did not get one here.**
`2026-07-25-resource-model-xp-gold-design.md` is marked SETTLED DESIGN while its central premise
(two resources, XP and gold) is superseded by D-ERA13's single era-themed resource, and it
references D-ERA13 nowhere. And the era spec's §6.1 names the retired D1 building names in the
present tense. Both are Evan's, both are recorded in
`docs/Evan_Design_Decisions_Consolidated.md`, and neither blocks anything.
