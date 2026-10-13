# Content Authoring Split (Per-Node Ownership) — SUPERSEDED BY §11 (2026-07-31)

> ## ⚑ READ §11 FIRST. THE SPLIT IS OVER.
>
> **2026-07-31, the team lead: *"anthony owns all the content now"*.** There is no longer a
> split to read. **§11 supersedes the per-node / whole-domain assignment in its entirety, at
> every count it has ever held** (15/15, 22/22, net 29/27, and §10.4's 26/30), and it
> supersedes §10.4's three-node move, which is now moot. Everything above §11 is **history**:
> it is a real record of how the work was divided, and it explains the shape of most of the
> content that exists, so it is kept legible rather than rewritten. Do not take a node→owner
> row from §3, §7, §9 or §10.4 as current — none of them is.

**Status:** **SUPERSEDED 2026-07-31 (§11).** Previously **AGREED / FINAL as of 2026-07-25** (and before that: *PROPOSAL for Gabe ↔ Anthony to square*). The team had agreed to per-node ownership and the domain assignment; §8 Q1, Q2 and Q4 were resolved then (Q3 on 2026-07-24). This doc remains the source of truth for who authors what — `TEAM_CHECKLIST.md` is reconciled to it, not the other way round — but what it now says is **§11**, not §3. Later changes to the assignment are a deliberate team decision, recorded here.
**Amended 2026-07-28 (§9): the ownership record is now ALSO keyed by ERA.** The node→owner assignment in §3 and §7 is unchanged and no node changes hands; §9 adds the era reading the game and the design documents are organised on, and records per-node ownership inside the two eras that are jointly held.
**Amended 2026-07-29 (§10): four design rulings recorded, and ONE of them moves three nodes.** The team lead resolved the four open theming and ownership gaps. §10.4 **un-splits the two jointly held eras** and is the first amendment to this doc that changes an assignment: `CG.1`, `POL.6` and `POL.7` move **Gabe → Anthony**, taking the net lesson load from 29/27 to **26/30**. §9.2 and §9.3 are annotated in place rather than rewritten, so the jointly-held reading stays legible as history. *(**§10.4 is MOOT as of 2026-07-31 — see §11.** A move between two owners means nothing once there is one owner. It is kept because it is the last state the split held.)*
**Amended 2026-07-31 (§11): THE SPLIT IS OVER — Anthony owns all the content.** The team lead moved content authoring and its whole machinery to a single owner. **§11 supersedes §3, §7, §9's ownership half and §10.4.** This is a change of **ownership, not of exclusivity**: the lead is playing a flex role and may take content work when capacity requires it, which §11.4 records so that a later Gabe-authored node is not read as drift.
**Type:** Planning / coordination artifact. **No lesson or item content is authored by this doc.**
**Timing:** Authoring was gated on the 11:00 demo; that gate has passed and **authoring is under way** (Gabe's D2 slice — EXP.1 + RAD.1/RAD.2/RAD.3 — has landed on `integration`; see `TEAM_CHECKLIST.md`).
**Author:** Gabe. **Base:** `integration` (`96c92a5`).

---

## 0. TL;DR

> **UPDATE 2026-07-24 (coverage expansion, registry PR `gabe/coverage-expansion`).** The product target grew from **48 → 61** nodes: 9 formerly-`extended` nodes were promoted to `target`, TRG.6 was promoted from `secondary`, and 4 new nodes were added (POL.8, TRG.9, and a new **Geometry** domain, GEO.1/GEO.2). Counts below are updated. Promoted/new nodes fall to the owner of their **domain**; the new Geometry domain had no existing owner and was initially left unassigned — **now ASSIGNED TO ANTHONY (2026-07-25), see §3.**

> ### ⚑ NEW ASSIGNMENT — RAISE AT THE NEXT TEAM SYNC
> **UPDATE 2026-07-25 (D2 QA pass, registry PR `gabe/rad4-node`).** One more node appended: **RAD.4** (D2 — variable radicands, `sqrt(x^2) = abs(x)`, even-root domain restriction), taking the product target **61 → 62**. D2 is Gabe's domain, so **RAD.4 → GABE (Gabe 21 → 22)**. Flagged rather than filed silently because it is a *new authoring obligation added after the split was agreed*. It was also **ITEM-GATED on a checker category nobody had cleared** (§4.4); **that gate was cleared the same day** (`Answer_Equivalence_Spec.md` v0.15), so only the authoring obligation remains. **No lesson or item content was authored** by the registry PR; RAD.4 content authoring is a follow-up.

> ### ⚑ DELIBERATE DEFERRAL — RAD.4's even-root domain slide was CUT (Gabe, 2026-07-27)
> RAD.4 shipped with a whole slide on the even-root domain restriction ("$\sqrt{-49}$ is not a real
> number"), one of the **three** coverage holes `skill_graph.json` records RAD.4 as existing to close.
> QA cut it twice over as ballast, and the placement objection is fair: nothing in RAD.4 needs a full
> slide of it, and the node that would make it load-bearing is **domain and range in D6, unauthored and
> in another lane.** The slide is now cut (6 slides → 5) and its widget `even-root-domain-play` deleted.
>
> **What survives, and why it had to.** The premise for cutting was "nothing downstream consumes
> even-root domain", and that is **false in three places**, so the fact is retained as ONE sentence
> folded into the surviving parity slide rather than dropped:
> 1. **`d2_rad4_realroot_l2` is a graded L2 item in RAD.4's five-slot practice pool** ("Here are three
>    roots ... exactly one of them is a real number"). Dropping the teaching outright would leave a
>    frozen item grading a fact the lesson no longer states.
> 2. RAD.4's "taking a variable out" slide justifies its no-bars answer with "$\sqrt{x^{9}}$ is only a
>    real number when $x^{9} \ge 0$", which is this fact.
> 3. `VariableRadicandBuilder`'s reveal and solved status both say "a square root is only real when what
>    sits under it is not negative".
>
> **Inherited by whoever authors domain and range (D6).** What is deferred is the DEVELOPMENT: the
> even/odd index generalisation across fourth and sixth roots, and any treatment of the restriction as a
> domain statement rather than a one-line parity fact. RAD.4 now carries only the minimum its own graded
> item and its own later slides rest on. If D6 wants the full treatment, it is being written fresh there,
> not moved from here.

- **Product target = 62 nodes** (`product_scope`: 6 `mvp` + 56 `target`; was 48, then 61).
- **Done = 18** (unchanged): the 6 D1 MVP nodes (lessons + items) **+** the 12-node foundational spine (items authored + validated by Gabe; `PRODUCT_NODES`).
- **Remaining = 44** `target` nodes (56 target − 12 spine; was 30, then 43). This is the set being split.
- **~~Split (by domain ownership): Gabe 22 / Anthony 22 / UNASSIGNED 0.~~ SUPERSEDED 2026-07-31 (§11) — there is no split; Anthony owns all 44.** The history: the original even 15/15 grew by the coverage expansion: **Gabe +6** (RAD.3, LIN.5, LIN.6, POL.7, POL.8, FUN.10 — his D2/D3/D4/D6) and **Anthony +5** (RAT.6, LF.4, EL.4, TRG.7, TRG.9 — his D5/D7/D8/D9); then the 2026-07-25 D2 QA pass added **Gabe +1** (RAD.4 — his D2); then the **Geometry** nodes (GEO.1, GEO.2), initially left unassigned as a new domain with no existing owner, were **ASSIGNED TO ANTHONY (2026-07-25): Anthony +2 (20 → 22)**. **Nothing in the split set is unassigned.** 22 + 22 + 0 = **44** ✓
- **Spine-lesson ownership RESOLVED (Gabe, 2026-07-24; §8 Q#3):** the 12 spine nodes' lessons fold into the same per-node/domain model (same domain assignment), splitting **Gabe 7 / Anthony 5** (§7). Net **lesson** load: **Gabe 29** (22 split + 7 spine), **Anthony 27** (22 split + 5 spine) — 29 + 27 = **56**, which equals the 56 `target` nodes (44 split + 12 spine) ✓. Spine ITEMS stay Gabe-authored + frozen, so Anthony's 5 spine lessons are a benign lesson-owner-!=-item-author exception (§7).
- **Model:** per-node ownership — **1 node = its lesson + its items, one owner** (items tie to lessons by construction).
- **Sequencing gates before parallel work:** lessons are already parallel-safe, and **so are items** — the per-node item-file refactor that used to gate them **landed 2026-07-24 (PR #45 `416b583`; see §4.2 for where to author)**. `skill_graph.json` changes follow an additive-append protocol. Some nodes stay checker-gated until Gabe clears the category.
- **DIAGNOSTIC items are NOT part of this split, and are DEFERRED (decided 2026-07-26).** Everything counted above is **practice/lesson** content. The real diagnostic item bank waits until more lesson material exists, so **nothing in this queue is blocked on it and no one should start authoring against the 62-node instrument yet** — the live diagnostic is D1-only and already fully served. Two things to know if you do pick it up later: diagnostic items need **no difficulty tags** (the walk is difficulty-blind and serves L2 throughout), which is the *opposite* of the practice-set rule in `docs/Mastery_Scoring_Spec.md` §3 where the 1×L1 / 2×L2 / 2×L3 mix is load-bearing; and the item-bank validator's L1/L2/L3 coverage cells come from the retired multistage spec, not the walk, so they are a rollback surface rather than an authoring requirement. Both are recorded in `docs/Contracts_Amendment_Diagnostic_Probe_Policy.md` §9.

---

## 1. The per-node ownership model (the model Gabe endorses)

**One node = one lesson + one item pack, owned end-to-end by a single author.**

- Whoever owns a node authors **both** its per-node lesson **and** its item pack.
- **Why:** items tie to their lesson *by construction* — the same person writes the teaching and the assessment for that skill, so an item never drifts from the lesson it should measure. This is the reason the earlier "all items → one person, all lessons → another" arrangement is being revisited (see §8).
- Ownership is **per node**, not per file. Two owners never need to co-edit the same lesson file (already true) and — since the item refactor landed (§4.2) — never co-edit the same item file either.

### 1.1 The advisor persona and voice are EVAN'S (DECIDED — Gabe, 2026-07-27; FINAL) — SUPERSEDED IN PART 2026-08-05 (Gabe, for the intro and era one's advisor)

**The rule: the advisor persona and voice for every island belong to Evan, because he does all of the design.** They are not the domain lesson author's, and they are not Anthony's. Whoever authors a domain's lessons writes *in* the persona Evan has set for that island; where he has not set one, an author may offer one as a **clearly labelled PROPOSAL for Evan** and must not register it as a decision.

**This question moved three times in two days, so the whole history is stated once here instead of being annotated in layers.** This section is the single place the answer lives.

| When | Position | Where it was written |
|---|---|---|
| Original | Advisor dialogue / voice is **Anthony's**, for every island | `docs/superpowers/specs/Island_Lesson_Themes_Design_Spec.md` (Owners block, §5) and the D2 island brief — both **Evan's** files |
| 2026-07-26 (PR #106) | Advisor persona follows **whoever authors that domain's lessons** | this section, `.cursor/skills/author/SKILL.md` Phase 0 and `.cursor/skills/author/reference.md` §6 — both skill sites *since removed* by PR #206 (2026-07-28), so this section is the only surviving copy and a reader following those two pointers now finds nothing |
| **2026-07-27 (FINAL)** | **Advisor persona and voice are EVAN'S**, for every island | this section. Both rows above are reversed |
| **2026-08-05 (SUPERSEDES IN PART)** | **The intro's advisor voice, and era one's advisor register, are GABE'S.** Eras two to ten are unchanged and stay Evan's | this section, immediately below. Ruled by Gabe, who also made the 2026-07-27 row |

#### ⚑ SUPERSEDED IN PART — 2026-08-05, by Gabe, for the intro and era one's advisor

**THE OVERRIDE, verbatim:** *"take this into my lane: oru should be an advisor and an advisor
only."* Gabe has since confirmed that this supersedes the 2026-07-27 ruling above, and that
#625 **lands as-is, voice rewrite
included.**

**Why it can be overridden at all, which is what makes this legible rather than a lane grab.** The
2026-07-27 ruling is Gabe's own — the heading says so — so the authority that made it is the
authority moving it. Nothing here was taken from Evan by somebody who was not in a position to
take it. The ruling itself is left standing above, unedited: a reader needs to see what the
position was in order to read what it now is.

**THE SCOPE, written narrow on purpose.** What the owner has actually said covers two things:

- **The intro onboarding sequence** (`apps/web/src/city/onboarding/`) and Oru's lines within it,
  script and mechanic alike.
- **Era one's advisor register** — and that half is not an inference, it is already in trunk.
  #619 (`48191032`, merged
  `2026-08-05T03:08:24Z`) retired `the memory-keeper` in favour of `your advisor` under this same
  quote, across `eraDressing.ts`, the era-advance ceremony's byline, the era door's eyebrow, and
  `docs/superpowers/specs/eras/README.md`. That last file is Evan's, and it now carries the
  ruling's own scope note at *"⚑ 2026-08-05 — ERA ONE'S REGISTER IS RETIRED"*.

**WHAT IS NOT DECIDED, AND IS NOT BEING DECIDED HERE.** The owner has not said whether the
override reaches the advisor's voice anywhere else. Until he does, **§1.1 above still governs all
of the following**:

- **eras two to ten's registers and personas** — the nine names and trades in `eras/README.md`'s
  advisor table, which #619 explicitly left untouched (*"this is one row, not a flattening of the
  per-era registers"*);
- **the advisor's voice on surfaces outside the intro** — the crisis calls, and the ceremony and
  door copy beyond era one's byline;
- **the per-era dressing prose and style guides**, where `memory-keeper` deliberately survives,
  because those sentences are about paint rather than about how he is introduced;
- **the authority to NAME a character**, which is the half of §1.1 that never had anything to do
  with the intro.

**Why that boundary is flagged rather than guessed.** The words the owner used are a claim about
the CHARACTER, not about a surface, and their most natural targets were era one's register strings
— which is exactly why #619 could act on them outside the intro without stretching them. Read that
way, the override could as easily extend to every era's register. Read against what he actually
said, it stops at era one and the intro. The narrow reading is the one written down, because
guessing wide would hand Evan a lane change nobody ruled.

**⚑ THE NOTICE TO EVAN IS OWED, AND IS NOT POSTED.** He should not meet this as a diff.
[Issue #181](issue #181) is the designated
vehicle, named as such in three places in this tree
(`2026-07-27-era-progression-design.md`, `eras/2026-07-29-skill-building-rulings.md` §8,
`2026-07-29-era-resource-model-design.md`), and the notice owed there has been outstanding since
2026-07-29 for one reason: *"it needs a seat with write access to issues."* That is unchanged, and
measured rather than assumed — this repo reports `has_issues: true` with 21 open issues, while both
`GET /repos/<org>/calc-readiness/issues/181` and the GraphQL `repository.issues`
connection answer **403 `Resource not accessible by integration`** for the agent seat. So whether
#181 is still the live thread could not be established either way, and no substitute channel was
invented. **What the notice has to name:** this supersession and its narrow scope, the four open
questions above, #619 as the part already in trunk, and #625 as the part that lands as-is.

**Why.** Evan owns the design lane end to end: the island world, the per-node buildings, the hue families, the NPC art slot, and the narrative throughline that binds the islands into one voyage (`Island_Lesson_Themes_Design_Spec.md` §1.6). The advisor is a character standing in his world and introduced by his CityGuide, so the voice is design, not prose plumbing. Splitting it out is what produced three owners in two days. One designer, one voice.

**What a lesson author does now.** Author in the island's registered persona. Where a domain has none, write the lessons in a plain, warm, unnamed advisor voice, and if a persona would genuinely help, record it as a **PROPOSAL for Evan** rather than as a decision. Do not block on it: an unnamed advisor is shippable prose and a persona is a skin over it. Confirming a PROPOSED *island* with Evan before investing in prose is unchanged and still required.

**Nothing in shipped content needs unwinding, which is what makes this cheap.** The 2026-07-26 rule registered "the Town Foreman" for D2 and queued a voice pass that **was never implemented**, so the name exists only in these docs and in the work log — `rg "Town Foreman"` across `content/`, `apps/` and `packages/` returns nothing, and `AdvisorNpc.tsx` hard-codes no persona name. It therefore reverts to a **PROPOSAL Evan inherits** and may keep, rename or replace at zero content cost. The eight D3-D10 island briefs (PR #140, still open) were already told to invent no personas and to offer any as a labelled proposal for Evan, so they need no change either.

**What does NOT move.**

- **The math is still invariant.** A persona is dialogue and tone; it never changes an answer key, a difficulty tier, or a node's identity.
- **`AdvisorNpc.tsx` hard-codes no persona name** — the component takes a `line` and a `mood`, so a persona is prose and tone only, and must work within the existing `neutral` / `happy` / `encouraging` moods.
- **The skin-only boundary** (`Island_Lesson_Themes_Design_Spec.md` §1.4) is untouched, as is everything else in Evan's lane. This change adds the voice to what he already owned; it takes nothing from anyone else's lane except the authority to name a character.

---

## 2. How "done" vs "remaining" was determined

Cross-referenced, code-first (trust the code over prose for the "done" set):

| Source | What it told us |
|---|---|
| `packages/skill-graph/src/skill_graph.json` (registry, source of truth) | Enumerated all `product_scope` nodes: **6 `mvp` + 56 `target` = 62** (after the 2026-07-24 coverage expansion and the 2026-07-25 D2 QA append of RAD.4; was 6 + 42 = 48, then 6 + 55 = 61). The `extended` and `secondary` populations are now empty; only retired/cut are out of product scope. |
| `packages/item-bank/src/product/index.ts` → `PRODUCT_NODES` | The **12** spine nodes with authored+validated item packs (the authoritative "done" set). |
| `packages/item-bank/src/product/templates.ts` | Confirmed one `node_id` template per those same 12 nodes (LIN.1, POL.1, POL.2, RAT.1, CG.1, FUN.1, LF.1, RAD.1, EL.1, EXP.1, TRG.1, TRG.2). |
| `content/lessons/d1/*.json` | Only the 6 D1 MVP lessons exist today (per-node JSON, glob-discovered). |
| `TEAM_CHECKLIST.md` / `docs/Post_MVP_Backlog.md` | Prose progress (at the time: "spine 12/12", "0/30 remaining"); used only to corroborate the code. *`TEAM_CHECKLIST.md` has since been reconciled to this doc (2026-07-25) and now tracks per-owner progress against the split; `Post_MVP_Backlog.md` may still carry the retired 0/30 framing.* |

**Done set (18, excluded from the split):**
- **6 D1 MVP** (`product_scope=mvp`): NUM.S, NUM.F, NUM.2, NUM.3, NUM.4, NUM.5 — lessons + items complete.
- **12 spine** (`PRODUCT_NODES`): LIN.1, POL.1, POL.2, RAT.1, CG.1, FUN.1, LF.1, RAD.1, EL.1, EXP.1, TRG.1, TRG.2 — **items authored + validated**. (Their per-node *lessons* are not yet authored; that is tracked separately — see §7, it is **not** part of this 44-node split.)

**Remaining set (44, this is what gets split):** the 56 `target` nodes minus the 12 spine = **44** (was 30; the 2026-07-24 coverage expansion added 11 domain-assigned nodes + the 2 Geometry nodes, and the 2026-07-25 D2 QA pass added RAD.4). **All 44 are now assigned by domain: Gabe 22 / Anthony 22** (the 2 Geometry nodes GEO.1/GEO.2 were assigned to Anthony on 2026-07-25); **none is unassigned.**

> **⚑ Bookkeeping caveat (2026-07-25) — RAD.2/RAD.3 are authored, and the counts above are deliberately NOT re-derived.**
> Gabe has since delivered **RAD.2** (combine radical terms; rationalize denominators) and **RAD.3** (fractional-exponent ↔ radical form) via **PR #57 `2e9bb00`** — per-node lessons (`content/lessons/d2/`) plus items, **authored and frozen**, appended to the END of `PRODUCT_NODES` (which now lists **14** entries: the 12 spine + RAD.2 + RAD.3) with matching templates and golden fixtures. So the `PRODUCT_NODES` row in the table above, and the "Done = 18" it feeds, no longer match the code literally: two nodes still counted inside the "remaining 44" are in fact complete.
>
> **This is left as-is on purpose.** Re-deriving "Done" would shift the 44-node split set and therefore reopen the just-agreed **Gabe 22 / Anthony 22** (§3; §8 Q1/Q2), so the split arithmetic stays on its original derivation. **This is a bookkeeping caveat, not a scope change:** no count, no node→owner assignment, and no ownership boundary moves because of it. RAD.2/RAD.3 remain listed in Gabe's §3 table as his nodes (now delivered); their completion is tracked as per-owner progress in `TEAM_CHECKLIST.md`, not by editing the numbers here.

---

## 3. The even split — node → owner (grouped by domain) — SUPERSEDED 2026-07-31 (§11)

> **⚑ HISTORY. Do not read a row of the two tables below as current.** §11 gives every node in this section to Anthony. The tables are kept because they are the record of how the work was actually divided while it was being done, and they explain the shape of the content that exists — D2, D3 and D4 read as one author's work because they were one author's work. Nothing here assigns anything today.

*The same assignment read by **era** is in **§9** (amendment 2026-07-28). It assigns nothing new; it is this table re-keyed onto the ten eras the game advances through, plus per-node ownership for the two eras that are jointly held.*

Balanced by **domain coherence** (each owner holds *whole* domains, not scattered nodes). Originally an even **15 / 15**; after the 2026-07-24 coverage expansion, the 2026-07-25 D2 QA append and the 2026-07-25 Geometry assignment it is an even **Gabe 22 / Anthony 22** with **nothing unassigned**, still by whole-domain ownership. Node titles are from PRD §5.3; the registry wins on any conflict. Rows added by the coverage expansion are tagged *(coverage expansion 2026-07-24)*; the row added by the D2 QA pass is tagged *(D2 QA pass 2026-07-25)*.

### Gabe — 22 nodes (D2, D3, D4, D6)

| Domain | Node | Title |
|---|---|---|
| D2 · Exponents & Radicals | RAD.2 | Combine radical terms; rationalize denominators |
| D3 · Linear Eqns, Inequalities & Abs. Value | LIN.3 | Rearrange a formula to isolate a variable |
| D3 · Linear Eqns, Inequalities & Abs. Value | LIN.4 | Solve linear & compound inequalities; interval notation |
| D4 · Polynomials & Quadratics | POL.3 | Solve quadratics by factoring & square-root property *(item-family)* |
| D4 · Polynomials & Quadratics | POL.4 | Solve quadratics by completing the square & quadratic formula |
| D4 · Polynomials & Quadratics | POL.5 | Graph quadratics (vertex, intercepts, min/max) |
| D4 · Polynomials & Quadratics | POL.6 | Polynomial end behavior (degree & leading coefficient) |
| D6 · Functions & Graphs | FUN.2 | Domain & range |
| D6 · Functions & Graphs | FUN.3 | Piecewise functions (evaluate & graph) |
| D6 · Functions & Graphs | FUN.4 | Read graph features (increasing/decreasing, extrema) |
| D6 · Functions & Graphs | FUN.5 | Average rate of change |
| D6 · Functions & Graphs | FUN.6 | Difference quotient *(item-family)* |
| D6 · Functions & Graphs | FUN.7 | Composition of functions |
| D6 · Functions & Graphs | FUN.8 | Inverse functions (incl. one-to-one) |
| D6 · Functions & Graphs | FUN.9 | Transformations (shifts, reflections, stretches; even/odd) |
| D2 · Exponents & Radicals | RAD.3 | Fractional-exponent ↔ radical form *(coverage expansion 2026-07-24)* |
| D3 · Linear Eqns, Inequalities & Abs. Value | LIN.5 | Absolute-value equations *(coverage expansion 2026-07-24; **item gate CLEARED 2026-07-27** — it was mis-stated, see §4.4)* |
| D3 · Linear Eqns, Inequalities & Abs. Value | LIN.6 | Absolute-value inequalities *(coverage expansion 2026-07-24; **item gate CLEARED 2026-07-27** — it was mis-stated, see §4.4)* |
| D4 · Polynomials & Quadratics | POL.7 | Polynomial-graph analysis (zeros, multiplicity, turning points) *(coverage expansion 2026-07-24)* |
| D4 · Polynomials & Quadratics | POL.8 | Polynomial long & synthetic division *(new node, coverage expansion 2026-07-24)* |
| D6 · Functions & Graphs | FUN.10 | Absolute-value functions (graph & interpret) *(coverage expansion 2026-07-24)* |
| D2 · Exponents & Radicals | RAD.4 | Variable radicands; `sqrt(x^2) = abs(x)`; even-root domain restriction *(D2 QA pass 2026-07-25; **item gate CLEARED** the same day, see §4.4)* |

### Anthony — 22 nodes (D5, D7, D8, D9, plus Geometry (`D10`))

| Domain | Node | Title |
|---|---|---|
| D5 · Rational Expressions | RAT.2 | Multiply & divide rational expressions |
| D5 · Rational Expressions | RAT.3 | Add & subtract rational expressions |
| D5 · Rational Expressions | RAT.4 | Simplify complex/nested rational expressions |
| D5 · Rational Expressions | RAT.5 | Graph & analyze rational functions (domain, asymptotes, holes, end behavior) |
| D7 · Linear Functions | LF.2 | Equations of lines (write, graph, parallel/perpendicular) |
| D7 · Linear Functions | LF.3 | Build a linear model from a description or data |
| D8 · Exponential & Logarithmic | EL.2 | Graph exponential functions & transformations |
| D8 · Exponential & Logarithmic | EL.3 | Logarithms: convert form, evaluate common & natural logs |
| D8 · Exponential & Logarithmic | EL.5 | Logarithm properties (product/quotient/power, expand/condense, change of base) |
| D8 · Exponential & Logarithmic | EL.6 | Solve exponential & logarithmic equations *(item-family)* |
| D9 · Trigonometry | TRG.3 | Unit circle & reference angles |
| D9 · Trigonometry | TRG.4 | Six trig functions & fundamental identities |
| D9 · Trigonometry | TRG.5 | Graph sine & cosine (amplitude, period, phase shift) |
| D9 · Trigonometry | TRG.6 | Graph tangent & reciprocal functions *(secondary)* |
| D9 · Trigonometry | TRG.8 | Solve trig equations *(item-family; post-MVP)* |
| D5 · Rational Expressions | RAT.6 | Solve rational equations; reject extraneous *(coverage expansion 2026-07-24)* |
| D7 · Linear Functions | LF.4 | Solve a 2×2 linear system (graphing/substitution/elimination) *(coverage expansion 2026-07-24)* |
| D8 · Exponential & Logarithmic | EL.4 | Graph logarithmic functions; state domain *(coverage expansion 2026-07-24)* |
| D9 · Trigonometry | TRG.7 | Inverse trig functions (evaluate & compose) *(coverage expansion 2026-07-24; items checker-gated if solved-form)* |
| D9 · Trigonometry | TRG.9 | Core trig identities: sum/difference & double-angle *(new node, coverage expansion 2026-07-24; items checker-gated)* |

### Anthony — Geometry (2 nodes, NEW domain; ASSIGNED 2026-07-25)

The coverage expansion added a **new Geometry domain**. It fell outside every existing owner's domain set, so it was initially left unassigned pending a team decision; that decision is now made — **Geometry (GEO.1, GEO.2) is ASSIGNED TO ANTHONY**, taking him from 20 to **22** nodes. These 2 rows are counted in Anthony's 22 above.

| Domain | Node | Title |
|---|---|---|
| Geometry *(NEW)* | GEO.1 | Pythagorean theorem, similar triangles & basic angle relationships |
| Geometry *(NEW)* | GEO.2 | Area, perimeter, volume & surface area of standard figures |

**⚑ Sequencing — Geometry opens in the FIRST wave, so it can be authored EARLY and INDEPENDENTLY.** Per Evan's `docs/superpowers/specs/Island_Lesson_Themes_Design_Spec.md` **§1.5 ("D10 sits by AVAILABILITY, not by its number")**: `NUM.4` — a **D1 node, already done** — is the single gateway that opens `EXP.1` (D2), `LIN.1` (D3), `POL.1` (D4) **and** `GEO.1` together, so Geometry is not "later" than any of them; `GEO.2` depends only on `GEO.1`; and **nothing anywhere depends on GEO.1 or GEO.2.** Geometry is therefore a **first-wave, self-contained side branch, not a capstone** — it is **not gated behind the rest of Anthony's domains**, and it is a good candidate to author early since no other lane waits on it. (`D10` is numerically last but not sequentially last.)

*Naming: this doc says "the **Geometry** domain (GEO.1, GEO.2)" because that reads clearly. **`D10` is the stable registry id** — in `packages/skill-graph/src/skill_graph.json` and in Evan's spec alike — and nothing is renumbered anywhere.*

**Scope boundary — authoring vs. presentation.** **Anthony owns the authoring: the lessons + item packs for GEO.1 and GEO.2.** The **island presentation is Evan's deliverable and has LANDED** — Geometry was **themed 2026-07-25** in `docs/superpowers/specs/Island_Lesson_Themes_Design_Spec.md` (still marked **PROPOSED** there). That spec is the single source for the island's theme, hue and advisor persona; it is **deliberately not duplicated here** — read it there. Geometry still has **no game descriptor**, and no lesson or item content is authored yet, so GEO.1/GEO.2 remain registry-only for now.

### Counts

| Owner | Domains | Nodes | Item-family nodes |
|---|---|---:|---|
| **Gabe** | D2, D3, D4, D6 | **22** | POL.3, FUN.6 |
| **Anthony** | D5, D7, D8, D9, Geometry *(new)* | **22** | EL.6, TRG.8 |
| **Total remaining** | 9 domains | **44** | 4 |

*Counts updated by the 2026-07-24 coverage expansion (was Gabe 15 / Anthony 15 / total 30 across 8 domains), the 2026-07-25 D2 QA append (Gabe 21 → 22, total 43 → 44), and the 2026-07-25 Geometry assignment (Anthony 20 → 22; the UNASSIGNED row is retired, so the domain count reads 9 = Gabe's 4 + Anthony's 5). No node added since the original split is item-family, so the item-family count is unchanged at 4 (an even 2/2). **Every node in the split set now has an owner.***

**Coherence rationale.** Each owner holds **whole domains** — Gabe 4, Anthony 5 — with an even **22 / 22** node count and an even 2/2 share of the item-family nodes:
- **Gabe → algebra-structure + functions core** (radicals, linear equations, polynomials, coordinate-geometry/functions). This cluster sits closest to Gabe's existing lanes: the `POL.3`/`FUN.6` item-family breakdowns he authored/confirmed, the item-bank harness, and the `FUN.9` transformations hub.
- **Anthony → rational + transcendental function families, plus Geometry** (rational expressions, linear-function rate, exponential/log, trig, and the new Geometry domain). These are the lesson-narrative-heavy strands that build on his D1→functions lesson work; keeping each strand whole means his items tie to his lessons by construction. Geometry is a new standalone strand rather than an extension of one of his existing ones, and its island presentation is Evan's deliverable (§3).

No 15/15 split can keep all function-family domains (D6=8, D8=4, D9=5 → 17) under one owner, so D6 is split from D8/D9 by necessity; the resulting cross-owner touchpoints are small and listed in §6.3.

---

## 4. Prerequisites & sequencing (read before authoring starts)

### 4.1 Lessons are already parallel-safe ✅
One JSON per node at `content/lessons/<domain>/<NODE>.json`, auto-discovered via `import.meta.glob` — **no central index to fight over.** Two owners can author lessons for different nodes in parallel today with zero file collisions. *Lesson authoring can begin (after the demo) without waiting on anything below.*

### 4.2 Items are parallel-safe now ✅ (prerequisite SATISFIED — PR #45, 2026-07-24)
**This gate is CLEARED: parallel item authoring is not blocked.** The per-node item-file refactor landed on `integration` as **PR #45 `416b583`** ("refactor(item-bank): per-node item files (unblock parallel authoring)", merged **2026-07-24**). Items are now the same shape as lessons (§4.1): two owners can author items for **different** nodes in parallel today.

**Where item content lives — author HERE.** One directory per node, `nodes/<NODE>/index.ts`, inside the relevant item-bank pack:

- **Assessment / walk items** (the product v2 pack, the one the split's remaining nodes extend): `packages/item-bank/src/product/nodes/<NODE>/index.ts` — that node's L2 `ItemTemplate` **and** its golden fixtures live in that one file.
- **Lesson-practice pools**, per domain pack: `packages/item-bank/src/d1/nodes/<NODE>/index.ts` and `packages/item-bank/src/d2/nodes/<NODE>/index.ts` today, one new `src/<pack>/` per domain as it comes online.
- Shared formatting helpers are `nodes/_shared.ts` within each pack; the answer-def helpers stay in `packages/item-bank/src/template.ts`.

The old `templates.ts` / `golden.ts` / `practice.ts` / `walk-templates.ts` / `index.ts` files still exist but are now **thin aggregators**: they import the per-node exports and concatenate them into the same public arrays (`PRODUCT_TEMPLATES`, `PRODUCT_GOLDEN_FIXTURES`, `PRODUCT_NODES`, `D1_TEMPLATES`, …), preserving the element order that pins the frozen assessment forms.

**The one shared-file line left to coordinate:** adding a node means wiring its exports into its pack's aggregators (for the product pack: `PRODUCT_TEMPLATES` in `product/templates.ts`, `PRODUCT_NODES` in `product/index.ts`, and its fixture in `product/golden.ts`). **Append at the END** — `freezeDeepParallelForms` seeds each cell by its index in `PRODUCT_NODES`, so appending keeps every earlier node's frozen forms byte-identical. That is a one-line-per-file addition, not a shared body of content, so it merges cleanly. Step-by-step walkthrough: `packages/item-bank/AUTHORING.md`.

**History (kept so the sequencing record survives; superseded 2026-07-24).** This section previously recorded a **hard prerequisite**: item content lived in monolithic shared TS arrays (`packages/item-bank/src/product/{templates.ts, golden.ts, index.ts}` and `packages/item-bank/src/d1/{templates.ts, walk-templates.ts, practice.ts, golden.ts, hints.ts, index.ts}`), so authoring *any* node meant editing those arrays and two owners on **different** nodes still collided. That was the gate behind the lessons-first / serialize-item-edits interim advice. **PR #45 removed it, and those interim workarounds no longer apply.**

### 4.3 Cross-owner touchpoints (small, by design)
All hard prereq **chains** among remaining nodes stay intra-owner (RAT.4←RAT.2/3; FUN.3←FUN.2 & FUN.8←FUN.7; LF.3←LF.2; EL.5←EL.3 & EL.6←EL.3/5; TRG.4←TRG.3 & TRG.6←TRG.4/5). The only cross-owner links:

| Dependency | Owner needs | From owner | Note |
|---|---|---|---|
| EL.2 ← FUN.9 (hard) | Anthony | Gabe | FUN.9 depends only on already-done nodes → **Gabe authors FUN.9 early** to unblock. |
| TRG.5 ← FUN.9 (hard) | Anthony | Gabe | Same — one early handoff clears both. |
| FUN.6 rational sub-family draws on RAT.2/RAT.3 (item-family, soft) | Gabe | Anthony | Order so the drawn-upon items exist first. |
| TRG.8 quadratic-in-form sub-family draws on POL.3 (item-family, soft) | Anthony | Gabe | Same. |

**Action:** Gabe authors **FUN.9 first** in his lane; the two item-family cross-draws are coordinated at authoring time.

### 4.4 Checker gating (Gabe-owned v2 checker; affects both owners)
The v2 checker clears the spine categories **plus** the wave-2 algebraic + graph categories. Per `docs/Answer_Equivalence_Spec.md` **v0.17** (the source of truth) the following are now **CLEARED** and no longer gate anything: the **§8 graph geometric comparator**, `is_vertex_form` (POL.5), `set_builder` (RAT.5 domain / FUN.4 feature intervals), `is_standard_form` (LIN.1), the **EL.5 log expand/condense slice** (`is_expanded_log` / `is_condensed_log`), **variable radicands + `abs` / `|x|`** (RAD.4, v0.15), **absolute-value equations and inequalities** (LIN.5, LIN.6, v0.16), and — new in v0.17 — **exponential and logarithmic equation solving** (EL.6), which needed a `numeric`, a `precision` and a `solution_set`, plus one narrow addition: a roster holding **exact symbolic members** (`{ln(2), ln(3)}`).

**Still gated (the residual, `Answer_Equivalence_Spec.md` §10):** **general equation / inequality equivalence** and **general trig / log identities** *beyond* the cleared EL.5 expand/condense slice, plus one narrow grammar gap. Nodes whose items need these wait for Gabe to clear the category — a *checker* sequencing gate, independent of who authors the node:

- **General equation / inequality + general trig/log-identity equivalence (residual):** **TRG.4, TRG.8** (Anthony), plus:
  - **TRG.9** (core sum/difference & double-angle identities) — Anthony's (D9): general trig-identity equivalence.
  - **TRG.7** (inverse trig) — Anthony's (D9): gated **only if** items are authored in solved/identity form; plain exact-value evaluation is not gated.
- **`abs` in the general EXPRESSION grammar (narrow, tractable — NOT the residual above):** **FUN.10** (Gabe's, D6). Its answer *is* an expression containing `abs` (e.g. `abs(x-2)+3`), and `compareExpressionSymbolic` still parses with an empty function grammar, so that returns `unsupported_syntax`. v0.15 confined `abs` to the radical category deliberately, to keep its additivity proof airtight; extending it is a small follow-up.

  These nodes are **in product** but their **items** are checker-gated until Gabe clears their category. **Lessons are NOT gated** — only items.

**✅ FOURTH residual RESOLVED 2026-07-30 — EL.6 is NO LONGER ITEM-GATED, and its gate was two-thirds unreal.** EL.6 was recorded here and in §10 against **arbitrary equation equivalence (exp/log solving)**. Solving one of these equations submits a **number** (`2^(x+1) = 32` gives 3), a **rounded number** (`5^x = 40` to three places), or a **`solution_set`** (a logarithmic equation with an extraneous root). None of those is an equation, and all three cleared at or before checker version 2, so most of the node had been authorable the whole time. This is the same reading error the third residual below records for LIN.5 / LIN.6, and finding it twice in one table is why the standing lesson is now written into the spec's closing rule.

**One-third of it was real, and it was one roster spelling.** `compareSolutionSet` evaluated members with no function grammar, so `{ln(2), ln(3)}` — the answer to the equation quadratic in `e^x`, and a pair with no finite decimal spelling — failed `unsupported_syntax`. `compareSolutionSet` now evaluates members through `log`, `ln` and `sqrt` for items declaring **`representation: "exact"`**, on a scope binding `log` to base ten and `ln` to base `e` so the two are distinguishable (`LOG_SCOPE`, which binds both to `Math.log`, is correct for EL.5's base-independent identities and wrong for a roster of specific numbers). A decimal approximation of an exact root grades `wrong_representation`, not `value_mismatch`.

**A checker source file WAS modified, so additivity is measured rather than asserted.** `PRODUCT_CHECKER_VERSION` stays **2** on two assertions, each proved by forcing it false: a **45-verdict baseline** over the existing rational rosters (LIN.1's and LIN.5's, including symbolic submissions that must stay refused for a non-exact item), and a **bank-wide census** in `packages/item-bank/src/d8.test.ts` asserting that exactly one item, `d8.el6.exp-quadratic.l3`, declares `"exact"`. **Evidence:** 3 spike items with 14 golden cases graded in Node and Chromium (6 correct, 8 rejecting with their authored codes), 5 EL.6 node goldens, and a **13-case false-positive battery** (`EXACT_ROSTER_FALSE_POSITIVE_CASES`) covering the log/ln confusion in both directions, rounded decimals, and the intermediate substitution values a learner stops at before converting back through the logarithm. **Still deferred:** submitting an equivalent **equation**, symbolic members beyond `log` / `ln` / `sqrt`, and per-member precision. Detail in `Answer_Equivalence_Spec.md`, the v0.17 change note; **§10 is the spec owner's to ratify.**

**✅ THIRD residual RESOLVED 2026-07-27 — LIN.5 and LIN.6 are NO LONGER ITEM-GATED, and the gate was never real.** They had been recorded here and in §10 as needing **general equation / inequality equivalence**, which would have blocked them indefinitely, since that category is deferred with no plan to build it. Investigating before building found the description simply wrong:

1. **An absolute-value equation answers as a `solution_set`**, not as an equation. `|x - 3| = 5` has two solutions, so the natural ask is the set `{-2, 8}` — the same type LIN.5's prereq **LIN.1** already uses (`prod.lin-1.l2` keys `{x0}`). Cleared since checker version 2.
2. **An absolute-value inequality answers as an `interval`**, or a **union** of two rays when it points outward. Cleared since version 2, unions included — and this is the identical ground on which LIN.6's prereq **LIN.4** was already un-gated (see the list below).
3. **The bars only ever appear in the PROMPT**, which is KaTeX text the checker never parses. So v0.15's "`abs` is confined to the radical category" limitation cannot reach these nodes. It reaches **FUN.10**, whose answer really is an `abs`-bearing expression, and FUN.10 stays gated on it.

**No checker source file was modified.** What was actually missing was one authoring primitive: `packages/item-bank/src/template.ts` had `solutionSetAnswer` and `setBuilderAnswer` but **no `intervalAnswer`**, and no authored item had ever used the plain-interval path. That helper now exists and records the three input limits measured against the real checker: the union join must be whitespace-delimited (`(-inf, -2) U (8, inf)` parses, `(-inf,-2)U(8,inf)` does not), infinity is spelled `inf` or `infinity` (`oo` is not a token), and the empty set has no interval spelling, so a no-solution inequality is asked as `solutionSetAnswer("{}")`. All three fail closed as `invalid_input` (unanswered per §12, never a wrong answer).

**Evidence:** eight golden fixtures (four per node, `packages/item-bank/src/product/nodes/LIN.{5,6}/`) graded through the real v2 checker in Node **and** Chromium — every key and alternate-valid form `correct`, all 25 near-misses `incorrect` with their exact reason codes — plus a **28-case false-positive battery** (`ABSOLUTE_VALUE_FALSE_POSITIVE_CASES`) that rejects the AND/OR confusion in both directions, keeps `incomplete_solution_set` and `wrong_bound_inclusivity` distinct from `value_mismatch`, and fails closed when the two nodes' answer shapes are swapped. These fixtures carry **no walk template**, so all seven item-bank snapshots are byte-identical and `PRODUCT_CHECKER_VERSION` stays **2**.

**Authoring note for whoever picks up LIN.6 — ✅ the two `apps/web` gaps are CLOSED (2026-07-28, `cursor/placeholder-syntax-examples-25ed`).** `practicePlaceholder` now returns an interval placeholder that names the bracket, `inf`, and the spaced `U`; `missNote` now has a `wrong_bound_inclusivity` branch. Nothing is owed here before items ship. Detail and evidence in `docs/Answer_Equivalence_Spec.md` (the LIN.5/LIN.6 follow-up note).

**✅ SECOND residual RESOLVED 2026-07-25 — RAD.4 is NO LONGER ITEM-GATED.** The distinct hole filed by the D2 QA pass (variable radicands, `sqrt(x^2) = abs(x)`, even-root domain) is closed; **RAD.4 items are authorable**. All three blockers are fixed in `packages/shared-components/src/product-answer-checker.ts` plus two new companion modules (`domain-sampling.ts`, `pipe-notation.ts`), and the findings are now folded into the spec's §4/§10 category tables as promised:

1. **Variable radicands now evaluate.** Value is decided by deterministic **domain-aware** multi-point sampling instead of a scope-less `evaluateFloat`. The battery probes both signs (a positive-only battery would make `x`, `abs(x)` and `sqrt(x^2)` indistinguishable and accept `x` for a key of `sqrt(x^2)`) and restricts to the legal real domain read off the expression, so `sqrt(x^5)` is compared only where x >= 0. Against a key of `x^2*sqrt(x)`: the correct answer is `correct`, `sqrt(x^5)` is `not_simplified`, and `x^3` is `value_mismatch`.
2. **`simplified_radical` sees an unsimplified variable radicand.** `radicalNotSimplified` decomposes a product radicand and flags any variable factor `x^k` with k >= index, including MIXED radicands: `sqrt(8*x^5)` is `not_simplified`, `2*x^2*sqrt(2*x)` is accepted. The canonical form is defined in `Answer_Equivalence_Spec.md` §4.
3. **`abs()` is in the grammar and `|x|` parses.** `abs` joins the variable-radical function grammar, an `abs(x)` answer KEY is valid, and `|expr|` is rewritten to `abs(expr)` before parsing. Only NON-NESTED pipe runs are supported; an ambiguous run such as `|a|b|c|` is refused with a reason code rather than guessed. `x` for a key of `abs(x)` reads **`value_mismatch`** (no dedicated `missing_absolute_value` code was added — the existing code carries it).

  All of this sits behind one gate — the item declaring `allowed_symbols` — so constant-radicand grading is provably unchanged (147/147 and 111/111 verdicts byte-identical against `origin/integration`); `PRODUCT_CHECKER_VERSION` stays **2** and `D1_CHECKER_VERSION` stays **1**. **Later resolution (2026-08-18):** the `√` (U+221A) glyph gap is now closed at the shared input boundary, not in either checker. Only unambiguous scope is canonicalized before the value becomes `raw_answer`; `√2x` is refused rather than guessed, and both checker versions remain unchanged. The remaining item here is `abs` in the *general expression* grammar. **Correction (2026-07-27):** that item was recorded as something "LIN.5 / LIN.6 / FUN.10 would need", but only **FUN.10** needs it — LIN.5 and LIN.6 answer with a `solution_set` and an `interval`, never with an `abs`-bearing expression, and both are un-gated as of spec v0.16 (see the third-residual note below).

**Un-gated by the clearances above — this list is NOT everything that was ever gated:** **POL.5, FUN.4, FUN.9, RAT.5** graph items (graph comparator cleared), **POL.5** vertex-form items (`is_vertex_form` cleared), and **LIN.4 / FUN.2** set-builder items (`set_builder` cleared) — LIN.4's inequality/interval answers use the already-cleared `interval` notation, so LIN.4 is no longer gated. **LIN.5 / LIN.6** join this list on 2026-07-27 for the same reason LIN.4 did: their answers are a `solution_set` and an `interval`. **EL.6** joins it on 2026-07-30, on that reason plus one added capability (exact symbolic roster members).

> **⚠ Corrected 2026-07-26, and corrected again 2026-07-27.** This paragraph once opened "Everything previously listed here as gated is now authorable", which was wrong; the 2026-07-26 correction then over-swung the other way and asserted that **LIN.5 and LIN.6 remain checker-gated on general equation / inequality equivalence**, quoting PR #70's line about `abs` in the general expression grammar as proof. **That is also wrong, and it is the error this section existed to prevent.** PR #70's sentence is accurate about the *checker* and wrong about the *nodes*: LIN.5 and LIN.6 never needed `abs` in the expression grammar, because they never answer with an expression. Their answers are a `solution_set` and an `interval`, cleared long before v0.15, and the bars live only in the prompt. Spec **v0.16 un-gates both** with executable evidence, no checker change and no version bump. **Standing lesson: a node's gate is set by the answer shape its items ask for, never by the notation in its prompt.** Still genuinely gated: **TRG.4, TRG.8, TRG.9** (and **TRG.7** if authored in solved form) on the general equation/identity residual, and **FUN.10** on the narrower `abs`-in-expression grammar gap. **EL.6 left this sentence on 2026-07-30** (fourth-residual note above): it was listed on the same mis-reading, its items answer with a number, a rounded number and a solution set, and the one genuine gap was a roster of exact symbolic members, closed additively.

Lessons for the residual-gated nodes are **not** blocked (only their items are). Gabe owns + supports the checker for both owners; `Answer_Equivalence_Spec.md` §10 is the source of truth for the node→feature mapping.

### 4.5 `skill_graph.json` additive-append protocol (Gabe-owned registry)
`packages/skill-graph/src/skill_graph.json` is the single node registry; the loader (`src/index.ts`) and `npm run check:graph` (`test/graph_invariants.py`) both read it.

1. **Normal case needs no registry change.** All 56 `target` nodes — including all 44 remaining — **already exist** in the registry (the 2026-07-24 coverage expansion, PR `gabe/coverage-expansion`, and the 2026-07-25 D2 QA append of RAD.4, PR `gabe/rad4-node`, both followed exactly this additive-append protocol). Authoring adds **lesson/item files**, not registry nodes. Verify the node exists before touching the JSON.
2. **If a registry change is unavoidable** (a node split discovered during authoring, an edge correction, a new field): make it **additive & append-only** — add new node objects at the **end** of the `nodes` array; **never reorder, renumber, or delete** existing entries, and don't mutate another node's fields without owner sign-off. Prefer the existing `_edge_overrides` mechanism for edge corrections.
3. **Isolate registry PRs** from content PRs (one small registry change per PR) so a JSON conflict never blocks lesson/item work.
4. **Gabe (registry owner) reviews every `skill_graph.json` diff**, and **`npm run check:graph` must be green** (exit 0) before merge.
5. Note the pending cross-lane `lesson_shell` → `lesson_archetype` rename (TEAM_CHECKLIST); if it lands mid-expansion, treat it as its own coordinated registry PR under this protocol.

---

## 5. Suggested authoring order (within each lane, after the demo)
1. **Lessons or items — both lanes are open.** The item-file refactor that once forced a lessons-first order landed 2026-07-24 (§4.2), so item authoring no longer waits on it. Lessons-first is now a preference (it keeps items anchored to the teaching), not a constraint.
2. **Gabe: FUN.9 early** (unblocks Anthony's EL.2, TRG.5).
3. **Anthony: Geometry (GEO.1 → GEO.2) is available early** — first-wave and self-contained, nothing waits on it (§3), so it can be slotted in whenever convenient rather than queued behind D5/D7/D8/D9.
4. Author **non-gated** nodes' items first; queue **checker-gated** nodes (§4.4) behind Gabe clearing their category.
5. Keep prereq chains in dependency order within each lane (they're all intra-owner).

---

## 6. Relationship to the 2026-07-23 scope note (what was agreed)
The earlier `TEAM_CHECKLIST.md` / `Post_MVP_Backlog.md` note (2026-07-23) moved **all 30** remaining item packs to Anthony (items tied to his lessons), with Gabe retaining the schema/harness/checker. **This doc supersedes that** by moving to **per-node ownership with an even co-authoring split** — originally 15/15, now **22/22** after the coverage expansion, the RAD.4 append and the Geometry assignment (§3): each owner takes whole domains and authors both the lesson and the items for every node he owns. Gabe still owns + supports the shared item-bank machinery and the v2 checker for both lanes. **AGREED 2026-07-25** — this was the coordination point, and it is settled (§8 Q1/Q2/Q4); `TEAM_CHECKLIST.md` has been reconciled to it. Authoring proceeds on this basis.

**Wave-2 draft PR #16 — CLOSED, not an open loop.** That same 2026-07-23 note left the disposition of Gabe's wave-2 draft (**PR #16**, `gabe/expansion-wave-2`) as *"hand it off to Anthony or close it by agreement with him."* It was settled the same day: **PR #16 was CLOSED as superseded on 2026-07-23** (never merged), with an explanatory closing comment — the wave-2 / expansion authoring had been reassigned to Anthony, so the Gabe-lane WIP draft was no longer the path forward. It was a read-only triage checkpoint with **no authored items to preserve**; branch `gabe/expansion-wave-2` (checkpoint `c380a72`) is retained for reference only. **Nothing in this split depends on it and its disposition needs no further coordination.** *(`OWNERS.md` and `docs/Post_MVP_Backlog.md` still describe #16 as awaiting that hand-off-or-close decision — stale, and outside this doc's scope; correct them in their own lanes.)*

---

## 7. Scope boundaries (explicitly not in this split)

> **⚑ The 7/5 spine-lesson assignment below is SUPERSEDED 2026-07-31 (§11): all 12 spine lessons are Anthony's.** What survives, and is now the ordinary case rather than an exception, is the **lesson-owner-≠-item-author** shape this section named: the 12 spine nodes' items are Gabe-authored and frozen, and whoever authors a spine lesson teaches toward them without re-authoring them.

- **The 12 spine nodes' per-node lessons** are not yet authored; that's tracked on Anthony's checklist ("per-node lessons for the remaining product-target nodes") and is a track **separate** from the 44-node split. **Ownership RESOLVED (Gabe, 2026-07-24, Q#3 in §8):** each spine node's **lesson** goes to whoever owns its **domain** — the same per-node/domain model and the same domain assignment as the split (Gabe: D2/D3/D4/D6; Anthony: D5/D7/D8/D9, plus Geometry, which contributes no spine node). Verified against the registry `packages/skill-graph/src/skill_graph.json`, the 7/5 assignment is:

| Owner | Spine lessons (count) | Nodes (domain) |
|---|---:|---|
| **Gabe** | **7** | EXP.1 (D2), RAD.1 (D2), LIN.1 (D3), POL.1 (D4), POL.2 (D4), CG.1 (D6), FUN.1 (D6) |
| **Anthony** | **5** | RAT.1 (D5), LF.1 (D7), EL.1 (D8), TRG.1 (D9), TRG.2 (D9) |

  *This 7/5 ruling is **unchanged** by the 2026-07-28 era amendment, and §9.5 shows it could not have conflicted with one: because the rule is "the spine lesson follows the domain owner", every spine node's owner here is already its domain owner. Note that **none of the 12 is a D1 node**, so none of them is in era one — they scatter one or two per era across eras two through ten.*

  CG.1 is domain **D6** in the registry (there is no standalone coordinate-geometry domain), so it lands in Gabe's D6 — the split is clean, no orphan node. **Net lesson load** across both tracks (split + spine): **Gabe 29** (22 + 7), **Anthony 27** (22 + 5) — 29 + 27 = **56**, matching the 56 `target` nodes (44 split + 12 spine).

  **Item-author exception (benign, by design).** The 12 spine nodes' **items** are already **Gabe-authored and frozen** (the `PRODUCT_NODES` done-set; §2), authored + validated before this split. So for Anthony's **5** spine lessons the **lesson owner (Anthony) != item author (Gabe)** — a deliberate exception to the §1 "one node = one lesson + its items, one owner" rule. It is benign: those items are already done and frozen, so there is no lesson↔item drift risk (the drift the §1 rule guards against only arises while items are being authored). Anthony authors the spine LESSON to teach toward the already-frozen items; he does not (re)author their items.
- ~~**9 `extended` nodes** (RAD.3, LIN.5, LIN.6, POL.7, RAT.6, FUN.10, LF.4, EL.4, TRG.7) are **out of product scope**~~ — **SUPERSEDED (2026-07-24 coverage expansion):** all 9 were **promoted into product target** (plus TRG.6 from `secondary`, plus new POL.8/TRG.9/GEO.1/GEO.2). They are now **in the split** (§3): the D2/D3/D4/D6 ones to Gabe, the D5/D7/D8/D9 ones to Anthony; the new Geometry nodes (GEO.1, GEO.2) are **Anthony's** as of 2026-07-25. The `extended` population is now empty.
- **No content is authored here.** This doc assigns ownership only.

---

## 8. Open questions for Anthony — ALL RESOLVED (kept for decision history)

*Q1, Q2 and Q4 were **AGREED 2026-07-25**; Q3 was resolved 2026-07-24. Nothing here is open. The questions are retained rather than deleted so the decision history survives.*

1. **AGREED (2026-07-25).** Agree to per-node ownership + the even split (this supersedes "all 30 → Anthony")? — **Yes.** Per-node ownership is the model (§1); the originally-proposed even 15/15 is now an even **22/22** after the coverage expansion, the RAD.4 append and the Geometry assignment (§3).
2. **AGREED (2026-07-25).** OK with the domain assignment (Gabe: D2/D3/D4/D6; Anthony: D5/D7/D8/D9)? — **Yes**, and extended by the same call: the new **Geometry** domain (GEO.1, GEO.2) is **Anthony's** too, so Anthony holds D5/D7/D8/D9 + Geometry and **nothing is unassigned** (§3). Geometry's island *presentation* remains Evan's deliverable; only the authoring is Anthony's.
3. **RESOLVED (Gabe, 2026-07-24):** the **12 spine nodes' lessons** fold into the SAME per-node/domain model — each spine node's lesson goes to whoever owns its **domain** (identical domain assignment to the split: Gabe owns D2/D3/D4/D6, Anthony owns D5/D7/D8/D9 plus Geometry — which contributes no spine node, so the 7/5 counts below are unaffected). Verified node-by-node against the registry `packages/skill-graph/src/skill_graph.json`, the split is clean (no orphan): **Gabe 7** — EXP.1 (D2), RAD.1 (D2), LIN.1 (D3), POL.1 (D4), POL.2 (D4), CG.1 (D6), FUN.1 (D6); **Anthony 5** — RAT.1 (D5), LF.1 (D7), EL.1 (D8), TRG.1 (D9), TRG.2 (D9). CG.1 is domain D6 in the registry (there is no standalone coordinate-geometry domain), so it lands in Gabe's D6. See the assignment table and the item-author exception in §7.
4. **AGREED (2026-07-25).** Confirm sequencing: lessons-first + Gabe delivers the item-file refactor before parallel item authoring, and FUN.9 early. — **Yes**, sequencing per §4.2/§4.4/§5 stands as written. *(Status: the item-file refactor was **delivered** 2026-07-24 — PR #45 `416b583` — so that precondition is met and item authoring is no longer held behind it; see §4.2.)*

---

## 9. The same ownership, read by ERA (AMENDMENT — decided 2026-07-28)

**Recorded here rather than applied silently, per the amendment convention in this doc's own status line.** §3 and §7 assign ownership *by domain*, which is how the assignment was balanced and how it stays balanced. This section adds the reading keyed to the **era**, because the era is now the axis the game advances on (`packages/skill-graph/src/eras.ts`, `ERA_SEQUENCE`) and the axis Evan's twenty-one era documents are organised on, while the domain has stopped being either.

**Decision:** **2026-07-28, Gabe (owner of this doc), with Evan's standing sign-off on era movement.** The era membership it reads was rebalanced the same day by **PR #210** (merge `c668d90`), which moved `POL.6`, `POL.7` and `RAT.5` into Early Modern on the rule that a graph-reading lesson never precedes the coordinate plane.

### 9.1 Nothing changes hands, and here is the arithmetic that proves it

**This is a re-keying of the record, not a reassignment.** No node moves between owners, because era membership is not an input to ownership: the owner of a node is still whoever owns its domain, exactly as §3 and §7 say. The check is that the era-keyed totals reproduce this doc's own figures without being told them:

| | Gabe | Anthony | total |
|---|---:|---:|---:|
| Net lesson load, §0/§7 (22 split + 7 spine / 22 split + 5 spine) | **29** | **27** | **56** |
| Same nodes, counted per era over `ERA_SEQUENCE` minus era one | **29** | **27** | **56** |

Computed from the registry's `domain` field and the authored era sets, not transcribed. The two rows agreeing is the evidence that the remap moved a *record* and not any *work*.

### 9.2 The ten eras and who owns what is in them

> **⚑ The Ownership column is HISTORY as of 2026-07-31 (§11): every era is Anthony's, and there are no jointly held eras because there is no second owner to hold one with.** The rest of the table — the era names, their domains, and the node counts `n` — is unaffected and still current.

| # | Era | n | Domains it holds | Ownership |
|---|---|---:|---|---|
| 1 | Prehistoric | 6 | D1 | **COMPLETE, outside this split** (§2's done set) — see §9.4 |
| 2 | Neolithic | 5 | D2 | **Gabe** — and fully authored (`content/lessons/d2/`) |
| 3 | Bronze Age | 5 | D3 | **Gabe** |
| 4 | Classical | 5 | D4 | **Gabe** |
| 5 | Medieval | 5 | D5 | **Anthony** — and fully authored (`content/lessons/d5/`, five of its six packs) |
| 6 | **Early Modern** | 6 | D4, D5, D6, D10 | **JOINTLY HELD** — Anthony 3 / Gabe 3, see §9.3 |
| 7 | Industrial | 6 | D4, D6 | **Gabe** |
| 8 | **Atomic Age** | 9 | D6, D7 | **JOINTLY HELD** — Gabe 5 / Anthony 4, see §9.3 |
| 9 | Information Age | 6 | D8 | **Anthony** |
| 10 | Cyberpunk | 9 | D9 | **Anthony** |

**Seven of the nine eras that carry a live authoring obligation are single-owner.** Eras four and seven are single-owner *despite* holding a domain that spans eras, and era six holds four domains — both facts follow from `ERA_SEQUENCE` carrying no domain field, which is INV-ERA-5 working as designed.

### 9.3 The two jointly held eras, per node

> **⚑ SUPERSEDED TWICE, and read it as history.** §10.4 un-split both eras on 2026-07-29; §11 retired the split entirely on 2026-07-31. There are no jointly held eras. Kept because the argument below — why each seam was load-bearing — is the reasoning §10.4 had to outrank, and because the AUTHORED column is still an accurate record of what existed when it was written.

**Do not try to make these single-owner.** Both are load-bearing rather than untidy, and the fix in each case would be worse than the condition.

**Era six, Early Modern — 6 nodes, Anthony 3 / Gabe 3.**

| Node | Domain | Owner | State |
|---|---|---|---|
| GEO.1 | D10 | **Anthony** | unauthored |
| GEO.2 | D10 | **Anthony** | unauthored |
| RAT.5 | D5 | **Anthony** | **AUTHORED** — `content/lessons/d5/RAT.5.json` + its item pack |
| CG.1 | D6 | **Gabe** | unauthored (spine lesson; its items are Gabe-authored and frozen, §7) |
| POL.6 | D4 | **Gabe** | unauthored |
| POL.7 | D4 | **Gabe** | unauthored |

Era six cannot be single-owner while it holds Geometry (Anthony's) and `CG.1` (Gabe's), and that pairing is one the era spec asks for **by name** in §3.1 and §12.1 — "learn shapes, then learn to put them on axes" is the bridge the era exists to build. The rebalance improved the balance rather than removing the seam: era six went from 2 Anthony + 1 Gabe to 3 each.

**Era eight, Atomic Age — 9 nodes, Gabe 5 / Anthony 4.**

| Node | Domain | Owner | State |
|---|---|---|---|
| FUN.4, FUN.5, FUN.6, FUN.9, FUN.10 | D6 | **Gabe** | unauthored |
| LF.1, LF.2, LF.3, LF.4 | D7 | **Anthony** | **ALL FOUR AUTHORED** — `content/lessons/d7/` (LF.1 is a spine lesson; its items are Gabe-authored and frozen, §7) |

Era eight cannot be un-split inside the spec's 3-to-9 pacing band at all, and this was computed rather than argued: pushing the five `FUN` nodes into Industrial gives **11**, the exact figure D-ERA3 exists to prevent, and pushing the four `LF` nodes into Information gives **10**. Both outside the band.

**The owner's constraint, recorded verbatim: *"anthony's d5 and d7 work should stay his in the new era split."*** It is satisfied by construction, and the place it bites is `RAT.5` — Anthony's, authored, and now sitting in an era whose other half is Gabe's. **Authored work does not change hands.** Era membership reaches no content file: `hashItemDefinition` reads only `node_id`, `prompt` and `answer`, and all seven item-bank snapshots are byte-identical across the rebalance. The same holds for `LF.1`-`LF.4` in era eight.

### 9.4 Era one is complete, and its ownership is history rather than an assignment

Era one is D1's six MVP nodes, which §2 counts in the **done set of 18** and excludes from the 44-node split. So the split's domain table never assigns D1, and this section does not invent an owner for it. What the record actually says, from three independent places:

- **The six lesson packs are Anthony's work** — `TEAM_CHECKLIST.md`'s Anthony/MVP section ("Author content packs for all 6 D1 per-node lessons", done 2026-07-22), `OWNERS.md`'s `engines/lesson` row ("Anthony — lesson engine + content packs"), and the `content/lessons/d1/` commit history.
- **The D1 item bank is Gabe's** — `OWNERS.md`: "The D1 bank + the 12-node foundational spine items are already authored + validated by Gabe."

So era one is the same benign lesson-owner-≠-item-author exception §7 records for Anthony's five spine lessons, in mirror image, and it is **frozen and complete**, so the drift that exception guards against cannot arise. It carries no forward obligation for either owner.

### 9.5 The 12-node spine under an era model: it adds no boundary

§7's 2026-07-24 ruling (Gabe 7 / Anthony 5 over the spine lessons) is **untouched by this amendment**, and reading it per era shows why it never could conflict with one: the ruling *is* "each spine node's lesson goes to whoever owns its domain", so **every spine node's §7 owner is identical to its domain owner** — checked node by node against the registry, zero exceptions. The 7/5 figure is a consequence of the domain assignment, not a second, independent split.

Two things worth stating because they are easy to get backwards:

- **No spine node is in era one.** The spine is `EXP.1`, `RAD.1`, `LIN.1`, `POL.1`, `POL.2`, `CG.1`, `FUN.1`, `RAT.1`, `LF.1`, `EL.1`, `TRG.1`, `TRG.2` — none of them is a D1 node. Era one is the six `NUM.*` MVP nodes, which are a different population (`product_scope: mvp`).
- **The spine scatters across eras two through ten**, one or two per era. So under an era reading the spine is not a chapter anybody authors; it is the first node of nine different chapters, and it disappears into the per-era rosters above.

### 9.6 What this amendment does NOT change

- **Node ids and domain ids are unchanged.** `GEO.1`/`GEO.2` are still **D10**; the domain renumber stays gated on the era spec's **O-2** and has not happened. Nothing here renumbers anything.
- **The assignment rule is unchanged.** Ownership is still per node, assigned by whole domain (§1, §3). Whole domains are what keeps the count even and what holds the number of jointly held eras down to two.
- **The unit of authoring and QA DELIVERY is the ERA; the unit the TOOLCHAIN runs on is the DOMAIN.** *(**Reworded 2026-07-29** — see the box below. The behaviour this bullet describes is unchanged and always was; only the label "delivery" was being used for two different things.)* *(**Half-superseded 2026-07-31 — §11.2 item 4 checked which half at the tip rather than assuming.** The TOOLCHAIN half survives verbatim, because it is a fact about the code and not about the split. The DELIVERY half survives as a description of how Anthony works and stops being a coordination rule, because the two-owner questions it settled no longer have a second party. Do not cite this bullet as an ownership statement.)* Lesson packs live in `content/lessons/<domain>/`, each domain needs its own loader module, `LESSON_DOMAINS` is domain-keyed, and `scripts/check-lesson-packs.sh` must be run **one directory at a time** because the validator only applies its domain-level interaction-variety rules when handed a single directory (`dirs.length === 1 && packs.length > 1`). An era is a cross-directory node set — era six's six nodes live in four different domain directories — so "author an era" is not something the validator can be pointed at, and **every gate that can only see a directory is run once per directory, never once per era.** What the era fixes is what a reviewer is handed and what "finished" means: a coherent chapter the learner plays through. **The era is the ownership, pacing and delivery axis; the domain is the file-layout and toolchain axis.** They are different axes and both are real.

  > **⚑ WORDING RECONCILED 2026-07-29 (Gabe, owner of this doc). Nothing behavioural changed.**
  >
  > This bullet used to read *"The unit of authoring and QA delivery is still the DOMAIN"* and end *"the era is the ownership and pacing axis; the domain is the delivery axis."* `.cursor/skills/author/SKILL.md` (locked decision 3) and `.cursor/skills/lesson-qa/SKILL.md` say the opposite in as many words — the era is the unit — and #213 converted both on the owner's instruction, **explicitly overriding this doc's reading**. `.cursor/skills/author/SKILL.md` even names the disagreement rather than hiding it.
  >
  > **In behaviour the two never disagreed.** The skills kept per-directory validation: `author`'s Phase 6 and Phase 7 item 5 run the validator once per directory the era touches, and its "Which era am I authoring?" says so in the same words this bullet does. Both documents describe one arrangement. The word *delivery* was doing two jobs — "what a reviewer is handed" and "what a command can be pointed at" — and each document had attached it to a different one.
  >
  > **The resolution, and it is now identical in all four places** (here, `OWNERS.md`, `TEAM_CHECKLIST.md`'s Gabe expansion item, and both skills): **the era is the unit of delivery; the domain is the unit the toolchain runs on.** No gate is run fewer times, no file moves, no ownership changes. If a future reader finds these four disagreeing again, this box is the intended wording.
- **A split domain takes its ERA's theming, node by node — RULED 2026-07-29, see §10.3.** The rebalance makes **D5 the first authored domain to span two eras** (`RAT.1`-`RAT.4` and `RAT.6` in Medieval, `RAT.5` in Early Modern), which is why `.cursor/skills/author/SKILL.md` and `.cursor/skills/lesson-qa/SKILL.md` used to describe this as a question for later. It is no longer open: *"if it's in medeival, it gets medieval themeing."* The live consequence is that **`RAT.5` is authored against the wrong era** and owes a re-theme. Both skills are updated to the ruling.

---

## 10. Four design rulings (AMENDMENT — decided 2026-07-29)

**Decider: the team lead, 2026-07-29, in conversation, on the four gaps this document and the two authoring skills had left open.** Recorded here rather than applied silently, per this doc's amendment convention. **§10.4 is the only one that moves a node**; the other three are theming and character decisions that change what an author reads, not who owns what.

Ruling 1's premise is a separate, earlier ruling by **the owner**, same day, recorded in full at the head of `docs/superpowers/specs/Island_Lesson_Themes_Design_Spec.md`: *"island_lesson_themes_design_spec is just completely legacy … there is no such thing as multiple islands now — it's all one island and it changes based on the era."*

### 10.1 The ERA FOLDERS carry lesson framing

**Verbatim:** *"it's the same concept as before, just with the theme of the era and its building. see docs/superpowers: there's folders for each era. let's do a pass over each of these and make sure theyre up to standard."*

The job the legacy themes spec held — how a lesson frames its mathematics, its word-problem contexts, its motif — belongs to **`docs/superpowers/specs/eras/era-NN-<name>/`**. Both authoring skills are repointed there and neither now cites the themes spec for anything.

**The folders do not carry framings yet, and the ruling is what makes that a gap rather than a design.** Measured at 2026-07-29: `eras/README.md`'s "What each guide owes" enumerates materials, structural language, roof and support forms, palette, ornament, visible technology, the signature move, the island, the advisor and the subtitle row — every one of them art. Grepping the twenty era documents (7,242 lines) for `word.problem|framing|CFU|mini.lesson|prompt|context` returns 15 lines, 14 of them the word "framing" meaning timber framing or the visual brief's "no guilt framing" tone ban. **The pass the ruling asks for is Evan's**, and a ten-row assessment of what each folder is missing is item 1 of `docs/Evan_Design_Decisions_Consolidated.md`.

**One constraint on how the pass is done, from Evan's own design.** D-ERA8 rules that a skill building never symbolises its skill — symbolic buildings "produced rebuses, not buildings" (era spec §6.1, §15). So a framing is drawn from the era's **world**, not from the node's **building**. This is also why the legacy themes spec cannot be salvaged into the folders by find-and-replace: several of its buildings (the Reducing Bench, the Blending Vat, the Proving Cauldron) are exactly the rebuses D-ERA8 rejects.

### 10.2 One named advisor per era, and the count is ten

Ten eras, ten advisors, one each. This is **D-ERA28** given a name count.

**Measured state.** Era one's is **Oru** (`eras/era-01-prehistoric/style-guide.md` §6c) and he ships — `OruAdvisorCharacter.tsx`, `AdvisorNpc.tsx`, and the first-run demo reel. `rg -i advisor` over the ten style guides matches **era one alone**, so **nine eras owe an advisor.**

**The three existing persona names fill none of them, which is the point of recording this.** A City Clerk / Deputy Mayor, a Guild Master Artificer and a Town Foreman are keyed to **domains**, live only in retired documents, and reach **no lesson string** — `rg` for them over `content/`, `apps/` and `packages/` returns nothing, and `LessonContent` has no persona field to author into. Under one city in ten eras a domain cannot have an advisor, because a domain can sit in three eras. **They are not a head start; they are three names for a slot that no longer exists.**

*(The team lead put the gap at ten rather than seven, on the reasoning that the three domain-keyed names do not count. That reasoning is right and is why this section states it. The count here is **nine**, because era one's Oru is authored and shipped and does count. Nothing turns on the difference except how much work is left.)*

**Ownership is unchanged:** the advisor persona and voice are **Evan's, for every era** (§1.1, unaffected by this amendment), and D-ERA28 makes the advisor per-era art as well. An author writes in the voice Evan sets and **names no advisor**.

### 10.3 A split domain is themed by its ERA, not by its domain

**Verbatim:** *"if it's in medeival, it gets medieval themeing."*

A node takes the theming of the era `getEraOfNode` puts it in, regardless of which domain it belongs to. Three domains span eras, so the rule bites in three places:

| Domain | Nodes and the era each is themed to |
|---|---|
| Polynomials | `POL.1`-`POL.4`, `POL.8` → **Classical** · `POL.6`, `POL.7` → **Early Modern** · `POL.5` → **Industrial** |
| Rational Expressions | `RAT.1`-`RAT.4`, `RAT.6` → **Medieval** · `RAT.5` → **Early Modern** |
| Functions & Coordinate Geometry | `CG.1` → **Early Modern** · `FUN.1`-`FUN.3`, `FUN.7`, `FUN.8` → **Industrial** · `FUN.4`-`FUN.6`, `FUN.9`, `FUN.10` → **Atomic Age** |

**This is not a future policy. One pack is already wrong.** `RAT.5` is authored (`content/lessons/d5/RAT.5.json` and its item pack) and reads as part of one Medieval chapter, which is what §9.6 and both skills told its author to do while the question was open. Under this ruling it owes an **Early Modern re-theme**.

- **It is Anthony's content and stays his** — authored work does not change hands (§9.3), and §10.4 does not reach it.
- **Item-bank cost: none expected.** `hashItemDefinition` reads only `node_id`, `prompt` and `answer`, so a lesson-prose re-theme moves no snapshot. A re-theme that reaches an item *prompt* is a deliberate re-freeze and is not what this asks for.
- Both authoring skills now record this as a **known, owner-assigned item** so a QA pass does not re-file it, and `lesson-qa` is told not to fix it.

### 10.4 The two jointly held eras are un-split, one owner each — MOOT 2026-07-31 (§11)

> **⚑ MOOT.** This ruling moved `CG.1`, `POL.6` and `POL.7` between two owners to make an era single-owner. §11 gave every node to Anthony, so the move decides nothing and the 26/30 counts below describe nothing. Kept as the last state the split held, and because §10.4's trade — a domain-crossing assignment bought a single-owner era — is the reasoning §9.3 declined to make, which is worth reading if the era model is ever revisited.

**Gabe takes the Atomic Age. Anthony takes Early Modern.** Direction proposed by Gabe and accepted by the team lead, 2026-07-29.

**What actually moves: three lessons, all Early Modern, all Gabe → Anthony.**

| Node | Domain | Was | Now | Note |
|---|---|---|---|---|
| `CG.1` | D6 | Gabe | **Anthony** | Spine node: its **items are Gabe-authored and frozen**, so Anthony authors the lesson only. This is the benign lesson-owner-≠-item-author exception §7 already records five times over, in the same shape |
| `POL.6` | D4 | Gabe | **Anthony** | Lesson + item pack |
| `POL.7` | D4 | Gabe | **Anthony** | Lesson + item pack |

**Nothing moves in the Atomic Age**, and that is why this direction was chosen. Its two halves are Gabe's five unauthored `FUN` nodes and Anthony's four **authored** `LF` packs; authored work does not change hands, so naming Gabe the owner transfers no obligation and rewrites no history. The mirror direction would have moved seven nodes instead of three.

**It also keeps `FUN.9` with Gabe, which is a scheduling fact rather than a preference.** `TRG.5`'s registry prereqs are `TRG.3` and **`FUN.9`** (`skill_graph.json`), and `TRG.5` is Anthony's, so `FUN.9` sitting with Gabe keeps the existing "author `FUN.9` early" sequencing note in `TEAM_CHECKLIST.md` correct. Handing the Atomic Age to Anthony would have made him his own blocker.

**Counts after the move.**

| | Gabe | Anthony | total |
|---|---:|---:|---:|
| Net lesson load, was (§0/§7/§9.1) | 29 | 27 | 56 |
| **Net lesson load, now** | **26** | **30** | **56** |
| Non-spine item packs, was (§3) | 22 | 22 | 44 |
| **Non-spine item packs, now** | **20** | **24** | **44** |

`CG.1` is a spine lesson and carries no item pack, so the item-pack row moves by two where the lesson row moves by three. **The split is no longer even, and that is an accepted cost of un-splitting**: the even 22/22 came from assigning whole domains, and an era-clean assignment cannot also be domain-clean. Every era with a live obligation is now single-owner.

**What this does NOT change.**
- **No node ids or domain ids move.** `POL.6`/`POL.7` are still D4 and `CG.1` is still D6. Files stay at `content/lessons/d4/` and `content/lessons/d6/` when authored — **era ownership is not a directory.**
- **No authored content changes hands**, in either era.
- **§9.2 and §9.3 are left as written**, describing the jointly held arrangement this supersedes. They are the history of why the seams existed and why they were load-bearing at the time; read them with this section, not instead of it.
- **§9.3's reasoning is not refuted, it is outranked.** It argued Early Modern *cannot* be single-owner while it holds Geometry (Anthony's) and `CG.1` (Gabe's). That was true under "ownership follows the domain, always". This ruling accepts a domain-crossing assignment in exchange for a single-owner era, which is the trade §9.3 declined to make on its own authority.

---

## 11. THE SPLIT IS OVER — Anthony owns the content (AMENDMENT — decided 2026-07-31)

**Decider: the team lead, 2026-07-31, in conversation.** Recorded here rather than applied silently, per this doc's amendment convention. This is the largest amendment the doc has taken: every earlier one moved a record or at most three nodes, and this one retires the split itself.

**Verbatim:** *"anthony owns all the content now"* and *"all machinery related to lesson stuff is his now."*

### 11.1 The line: Anthony has the learning, Gabe has the game

That sentence is the whole ruling, and it is the thing to remember when a case is not listed below. The question to ask of an unlisted file is not which directory it sits in but **which half of the product it serves** — what the learner is taught and how the teaching is judged, or the world the learner is taught inside.

**Anthony's, and this is not an exhaustive list because the line above is the rule:**

| What | Where it lives |
|---|---|
| Lesson JSON | `content/lessons/**` |
| Item packs, and the item bank itself | `packages/item-bank/**` |
| **Every** interactive widget, **the shared kinds included** | `apps/web/src/lessons/interactive/**`, `interactive/kinds/**` |
| The answer checker | `packages/shared-components/src/product-answer-checker.ts` and its companions |
| The lesson validators | `.cursor/skills/author/scripts/validate-lesson-pack.mjs`, `.cursor/skills/lesson-qa/scripts/scan-lesson-text.mjs`, `scripts/check-lesson-packs.sh`, `validateTemplates` / `validateItemBank` / `validateWalkPool` |
| The authoring skills | `.cursor/skills/{author,lesson-qa,practice-hints,practice-templates,interactive-visuals,worked-solution-svg}/` |
| The lesson-planner agent | `.cursor/agents/lesson-planner.md` |

**`interactive/kinds/` is named explicitly because it is the one people will hesitate over.** A shared kind looks like infrastructure and is lesson machinery, and the ruling's second sentence — *"all machinery related to lesson stuff is his now"* — is what settles it. The same reasoning takes the checker and the validators: they are how a lesson's correctness is decided, not how the city is drawn.

**Staying with Gabe:** the city and its 3D layer, the crises, the era model and progressions, the economy, persistence, the diagnostic, and CI / tooling.

**Nobody else's lane moves.** Evan keeps the design lane whole, the advisor persona and voice for every era included (§1.1, §10.2). This amendment moves a boundary between two owners; it takes nothing from a third.

### 11.2 What this supersedes, named rather than left to inference

Each of these is stated separately because a reader who infers one may not infer the next.

1. **The per-node / whole-domain assignment, in its entirety, at every count it has ever held.** §3's node→owner tables, §7's 7/5 spine-lesson ruling, and the arithmetic that hung off them: the original even **15/15**, the post-expansion **22/22**, the net lesson load **29/27**, and §10.4's **26/30** with its **20/24** item-pack row. None of those numbers describes anything now. §1's model — *one node = its lesson + its items, one owner* — survives as a **content** principle and stops being an **allocation** principle: it is now trivially satisfied, because there is one owner.
2. **§10.4's three-node move is MOOT.** `CG.1`, `POL.6` and `POL.7` were moved Gabe → Anthony to make Early Modern single-owner. Every era is single-owner now, by a much shorter route, and a move between two owners means nothing when there is one. §10.4 is kept as the last state the split held, not as an instruction.
3. **§9's era re-keying loses its ownership half and keeps the rest.** §9.2's per-era Ownership column and §9.3's two jointly held eras describe a condition that no longer exists — **there are no jointly held eras, because there is no second owner to hold one with.** Everything else §9 established stands: the era is the axis the game advances on, `ERA_SEQUENCE` is the authored membership, era one is complete and outside the split (§9.4), and the spine scatters one or two nodes per era across eras two to ten (§9.5).
4. **§9.6's delivery bullet — checked at the tip rather than assumed, and it half survives.** The bullet reads *"the unit of authoring and QA DELIVERY is the ERA; the unit the TOOLCHAIN runs on is the DOMAIN."*
   - **The toolchain half survives verbatim, and it survives because it was never about ownership.** Measured at `44b80d7`: `validate-lesson-pack.mjs:1990` still gates the domain-level variety rules on `dirs.length === 1 && packs.length > 1`, `LESSON_DOMAINS` is still domain-keyed (`apps/web/src/lessons/domains.ts`), and packs still live at `content/lessons/<domain>/`. Every gate that can only see a directory is still run once per directory, never once per era. **A single owner changes none of that**, because it is a fact about the code.
   - **The era-delivery half survives as a description of how the work is done, and stops being a coordination rule.** It may well still be true that Anthony delivers era-shaped chapters, and both authoring skills are written that way. What it can no longer do is settle a question between two owners, because the questions it existed to settle — who is handed which half of a jointly held era, who agrees the motif with whom — have no second party. **The delivery unit is now Anthony's call to keep or change**, not a term of an agreement.
   - **The ownership half is gone outright.** Nothing about ownership is keyed to the era, the domain, or any other axis any more.
5. **The authoring-share counters dissolve, and so does the open denominator question.** `TEAM_CHECKLIST.md` carried per-owner progress against per-owner denominators (Gabe's *item packs 10/22 · lessons 15/29*, Anthony's *18/27* and *15/22*), and it carried an unanswered question at the end of Gabe's item: whether those denominators re-base after §10.4 moved three nodes. **That question is not answered, it is dissolved** — with one owner there is no split to denominate, so there is no such thing as a share of it. What is still worth counting is **absolute progress against the 56 `target` nodes**, which is a product figure and belongs to whoever is tracking delivery. It is closed in `TEAM_CHECKLIST.md` in the same terms.

### 11.3 What does NOT change

- **No authored content changes hands in the sense of being rewritten, and no history is reattributed.** Gabe authored D2, D3 and D4; Anthony authored D1's lessons, D5, D7, D8 and D10. That is the record and it stays true. Ownership is a statement about who drives the work **from here**.
- **No node ids, domain ids, files or directories move.** This amendment is not a refactor and reaches no path.
- **No item-bank snapshot moves.** `hashItemDefinition` reads `node_id`, `prompt` and `answer`; an ownership record reaches none of them.
- **The checker gates are unchanged as FACTS** (§4.4). What changes is who clears them: the residual on TRG.4 / TRG.8 / TRG.9 / solved-form TRG.7, and `abs`-in-general-expression on FUN.10, are now Anthony's to clear rather than Gabe's to clear for him. The standing lesson in §4.4 — *a node's gate is set by the answer shape its items ask for, never by the notation in its prompt* — is the most reusable thing in this document and is unaffected.
- **The cross-lane change policy in `OWNERS.md` is unchanged**, and now reads the other way across this boundary: a change to the item bank, the checker or a lesson validator is a change in **Anthony's** lane and takes his review.
- **`docs/Answer_Equivalence_Spec.md` §10 remains the node→feature mapping.** Its former `√` (U+221A) decision packet was resolved on 2026-08-18 with input-boundary canonicalization and no checker-version change.

### 11.4 THE FLEX — this is a change of OWNERSHIP, not of exclusivity

**Recorded explicitly, because without it a later Gabe-authored node reads as drift.** The team lead, in the same conversation: *"i might be able to pick up some content work from anthony if need be and i am kind of playing a flex role."*

Both halves have to be held at once, and they are not in tension:

- **Anthony OWNS and DRIVES the content.** He decides what gets authored and in what order, he sets the bar, he owns the skills that state the bar, and a content question is answered by him. Ownership is not shared, not rotated, and not per-node any more.
- **Gabe MAY take content work when capacity requires it**, and doing so is neither a reversal of this ruling nor a reason to open a new one. A Gabe-authored lesson under Anthony's ownership is the arrangement working as designed, in the same way the twelve spine nodes' items are Gabe's under lessons that are Anthony's (§7's benign lesson-owner-≠-item-author exception, which this ruling makes the ordinary case rather than an exception).

**How to read a future commit against this.** If Gabe lands content, do not go looking for the amendment that gave it back to him — there will not be one, and this paragraph is why. What WOULD be a change is Gabe deciding *what* content gets authored, or overriding a bar Anthony has set: that is ownership, and it would need its own dated amendment here. Flex is about hands, not about direction.

**A practical corollary.** Because capacity, not ownership, is what routes a piece of content work, the useful thing to write in a PR or a work log is **who authored it and under whose ownership**, rather than "my lane". "Lane" was the vocabulary of the split and it will mislead from here.
