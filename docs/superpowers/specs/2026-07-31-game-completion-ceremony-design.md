# The Game Completion Ceremony — a diagnostic retake as the ending (DESIGN RECORD, nothing built)

**Recorded 2026-07-31. Every measurement below was taken at `2a484b1b`; `integration` then
moved to `04b1dfba` mid-write, and the two figures that could have moved with it — the
walk-pool coverage and the frozen-walk content snapshot — were re-taken at the merged tip
and are unchanged (§12).**
**Status: DESIGN RECORD + MEASUREMENT. No production code changed. Twelve decisions
(D-END1..D-END12), one of them a prerequisite that is NOT this record's to decide.**

**The direction is the lead's, given verbatim:**

> *"on the era 10 note, there should be a completion ceremony still; also, we would really
> like them to take the same diagnostic as they did before to measure progress. maybe thats
> the end ceremony?"*

So: **era ten keeps its end-of-era progression like every other era, AND a once-only
game-completion ceremony sits after it, built on retaking the entry diagnostic to show
growth.** That is recorded here as chosen, not argued for. What this record owes is
everything that follows from it, and the answer to the scope question it forces.

**Who decides what.** The ceremony's shape, sequencing, framing and fallback are recorded
below as decisions. **Whether to widen the diagnostic is Gabe's** and is left open (O-END1);
this record establishes that the ceremony cannot measure a playthrough without the widening,
and costs it, and stops there. Nothing here widens anything.

---

## 1. Summary — the five findings that change the design

1. **The live diagnostic is D1-only: six of sixty-two nodes.** Verified at the tip, at five
   composition points, none of them a hardcoded list. A retake therefore measures the first
   era and nothing else, so **widening is a prerequisite for this ceremony rather than an
   independent improvement** (§3). Cost: 41 of the 62 nodes have **no walk items at all**,
   which is **246 frozen items owed**, plus a checker migration and a 240-test blast radius
   already measured elsewhere.

2. **The comparability gate compares exactly three fields, and nothing that ordinary
   authoring touches ever moves any of them.** The brief's fear was that content authoring
   would bump them and leave most learners `not_comparable`. Traced, **that is inverted**:
   all three are literal constants or a per-student hash, so the realistic failure is the
   gate saying `computed` about two administrations that are not the same instrument (§4).

3. **The coverage DENOMINATOR is a read-time argument, not a property of the record.**
   Measured: a perfect D1 entry diagnostic scores `1.000` at the six-node scope and
   **`0.034` at the 62-node scope**. So widening the instrument without bumping
   `blueprint_version` re-denominates every existing baseline and manufactures an apparent
   **+96.6-point** gain, with the gate reporting `computed` (§4.4). This is the single most
   dangerous finding in the record, and D-END4 exists for it.

4. **The retake is longer for the learner who reaches it than for anybody else.** The
   brief's "median 38" is a pooled-cohort figure. Driven through the real engine, a learner
   who answers everything correctly — which is close to the population that finishes ten
   eras — serves **57 items over 34 probed nodes** at full scope (§7). And shortening the
   instrument is not available: the node set is the blueprint and the item ceiling is part
   of the versioned resolution rules, so **both ways of shortening trip the very gate the
   ceremony depends on**.

5. **A retake cannot mutate the city, and the guard is real but is at the write boundary
   rather than in the shape of the result.** `purpose: "post"` writes no placement and the
   diagnostic engine cannot write mastery at all. But `finalize()` still RETURNS
   `placement_by_node` for a post, and the pretest hand-off it feeds is a **destructive
   full reset** of the city. The landmine is a ceremony that reads that field (§8).

---

## 2. What was verified, and the three priors that were stale

The brief asked for verification at the tip rather than trust. Item by item.

| Claim as briefed | Verdict | Evidence at `2a484b1b` |
| --- | --- | --- |
| The live diagnostic scope is D1 only, six of 62 nodes | **TRUE** | Five composition points, all deriving from `getNodesByScope("mvp")`: `apps/web/src/diagnostic/browserRuntime.ts:34`, `services/diagnostic-runtime/src/aurora-server.ts:265`, `services/diagnostic-api/src/reads.ts:29`, `engines/diagnostic/src/engine.ts:169`, `apps/web/src/city/citySession.ts:377`. Measured: `getNodesByScope("mvp")` returns 6 (`NUM.S`, `NUM.F`, `NUM.2`, `NUM.3`, `NUM.4`, `NUM.5`); `getProductNodes()` returns 62 |
| `routing.ts` still exposes a D1-specific multistage spec | **TRUE, and it no longer matters much** | `engines/diagnostic/src/routing.ts:60` is `createD1MultistageSpec`, the only spec factory in the file. But it is the **retired v1 path** since the 2026-07-24 default flip: live scope now comes from the walk's own composition points, and `routing.ts` survives as the rollback path plus one live consumer, `packages/item-bank/src/validate.ts:230`, which derives its required L1/L2/L3 coverage cells from it |
| `D1_NODE_IDS` in `citySession.ts` is a hardcoded list that has drifted before | **FALSE — STALE PRIOR** | `apps/web/src/city/citySession.ts:377` reads `getNodesByScope("mvp").map((node) => node.id)`. It is derived, not transcribed, and the docblock above it records why it stopped being the city's list too. Nothing here can drift by transcription |
| `measurement.ts` and `coverage-measurement.ts` compare exactly three fields | **TRUE** | `measurement.ts:293-303` and `coverage-measurement.ts:310-318`, both `blueprint_version`, `scoring_model_version`, `form_id`, in that order, with identical semantics |
| Neither reads `equivalence_checker_version` | **TRUE** | The string does not occur in either file. It is stamped onto every administration (`walk-runtime.ts:35`, `runtime.ts:26`) and read per-response for grading dispatch, and no measurement gate consults it |
| The `form_id` gate is about the two administrations sharing a form | **FALSE — INVERTED PRIOR** | The gate requires the forms to **differ**: `pre.form_id === post.form_id` returns `not_comparable`. That is counterbalancing, so no item is seen twice. `counterbalancedForm` (`runtime.ts:99`) returns the opposite form for `purpose: "post"`, so a retake gets the other form automatically |
| The full-scope walk measures a median of 38 items with a ceiling of 70 | **TRUE as a cohort median, MISLEADING as the ceremony's length** | 38 at n = 6,000 and `maxItems: 70` are both correct (`walk.ts:142-160`, `adjudicator.ts:76-82`). But the ceremony's population is not that cohort — see §7 |
| Crises now exist only at eras 1/4/7/10, with Hard Winter as era one's | **PARTLY TRUE WHEN WRITTEN, AND BOTH HALVES HAVE SINCE EXPIRED** | And this row is itself an example of a finding expiring: at `2a484b1b` no commit on any ref mentioned the cadence. **It appeared while this was being written.** PR #345 records it as **D-CRISIS-31** and **D-CRISIS-32**, and its merge state read from the API is `merged: false`, `mergedAt: null`, `state: open`. So `integration` still rules **ten** crises over seven cadences (§5.20), and open PR #307 still briefs nine of them. §9 reconciles against what #345 actually says. **UPDATED 2026-07-31 — this row expired twice in one day, in the two different ways a finding can.** (1) **The merge state is stale:** #345 **merged at `2026-07-31T20:23:37Z`**, read from the API, so the ruling **is** in the tree and `integration` no longer rules ten crises. (2) **The set is wrong:** **D-CRISIS-33** moved the four from 1/4/7/10 to **1/4/6/9** later the same day, shelving the Boiler Cascade and the Robot Uprising and taking the Plague and Intrusion off the shelf. **The consequence for this document is at §9 and it is not cosmetic: era ten no longer has a mid-era crisis.** #307 is still open, `mergedAt: null`, and still briefs nine |

**A fourth prior worth correcting, because it changes the cost estimate: a once-only retake
already exists in the shipped runner.** `apps/web/src/diagnostic/DiagnosticRunner.tsx:294`
calls `client.begin(retake ? "post" : "pre")`; `:325-333` deliberately withholds the
pretest hand-off on the retake branch; `:411` gates the button as
`canRetake={!isRetake && !hasPost}`, which is once-only; and `:698` renders a
`MeasurementSummary` from the paired measurement. So the retake mechanic, its
once-only-ness, and its refusal to seed the city are **built and tested**, at D1 scope, on
a dev surface. The ceremony's work is scope, placement in the game flow, and what the
result says — not the retake.

---

## 3. The live scope, how it is determined, and what widening costs

### 3.1 How the scope is determined

There is no single scope constant. Every live composition point independently calls
`getNodesByScope("mvp")` and maps to ids. `product_scope` is authored per node in
`packages/skill-graph/src/skill_graph.json`, and the registry's only `mvp` nodes are D1's
six. So the scope is **authored data read at five call sites**, and there are two different
ways to widen it:

- **Flip `product_scope` in the registry.** Every call site follows at once, including ones
  that should not — this is the path whose blast radius was measured at 240 failing tests
  (below), and the dominant cost is not the diagnostic at all.
- **Change the call sites to `inProductScope()`.** `engines/diagnostic/src/coverage.ts:35`
  already exports exactly that, and `FrontierWalkConfig.scope`'s docblock
  (`walk-engine.ts:82-85`) names both options as the sanctioned arguments. This touches no
  authored data and leaves `getNodesByScope("mvp")`'s other consumers alone.

**The second is the one to cost**, because the first widens the city's ceiling and the
item-bank validator's required cells as a side effect, neither of which the ceremony needs.

### 3.2 What widening costs, measured

| Line item | Measured at `2a484b1b` unless noted |
| --- | --- |
| **Item pools.** `createItemPackWalkSource` throws when a served cell has no item for the requested attempt, so an uncovered node is a hard failure mid-administration | **21 of 62 nodes are walk-ready** (>= 3 items in *both* forms): D1's six plus the fifteen in `PRODUCT_NODES`. **0 are thin.** **41 have no walk items at all.** At three per form that is **246 frozen items owed**. Current packs: `D1_WALK_ITEM_PACK` 36 items, `PRODUCT_ITEM_PACK` 90 |
| **Checker migration.** All four composition points still build `createD1AnswerChecker`, whose grammar cannot grade `sqrt(...)` | Already scoped and costed in `docs/Diagnostic_11_Node_Scope_Measurement.md` §3: move `equivalence_checker_version` to 2 atomically across `aurora-server.ts`, `browserRuntime.ts` and `walk-runtime.ts` |
| **The failure mode if it is skipped** | Measured at `c870c0b5` in `docs/Diagnostic_11_Node_Scope_Decision_Evidence.md` §4.2: with the pack widened and v1 still composed, `RAD.1` **wedges** — the same item re-served four times, status `invalid_input`, which is not in `FAULT_STATUSES`, so the administration hangs **at a 0% fault rate** and the validity gate never fires |
| **Blast radius of a registry flip** | Measured at `c870c0b5`, same document §4.4: **240 failing tests across 47 files**, 138 unhandled errors. **Only 6 of the 240 are the item-pack story.** The dominant cause is `engines/game`'s neighborhood-descriptor guard refusing to resolve a `D2` neighborhood that is `architected` while the registry reports built nodes in it |
| **The 11-node increment, for comparison** | Same document §4.2: retiring the throw is **one composition change and zero authoring**, and an acing walk then completes in 12 items resolving 11 of 11 |

**Recommendation, not a decision: widen to the full 62 in one step, via the call sites, and
do it long before the ceremony ships.** Two reasons. A partial widening is a
`blueprint_version` bump of its own, and every bump strands another cohort's baseline
(§4.4) — so widening twice costs two stranded cohorts where widening once costs one. And
the 246 items are the long pole; nothing about the ceremony's design work waits on them,
but the ceremony's *value* does.

**Directly contradicted by this: nothing.** The widening was declined by Gabe on
2026-07-26 (`engines/diagnostic/README.md:107-110`) and that decision stands until he
revisits it. What this record adds is that the ceremony is now a **reason** to revisit it,
which it was not on 2026-07-26.

---

## 4. Comparability across a whole playthrough

This is the part of the brief that matters most, and the answers are not the ones the brief
expected.

### 4.1 The gate, exactly

Both instruments run the same three-field gate, in the same order, after both
administrations pass their own validity gates:

```
if (preScore.status !== "valid")                        return "pre_invalid";
if (postScore.status !== "valid")                       return "post_invalid";
if (pre.blueprint_version !== post.blueprint_version)   return "not_comparable";
if (pre.scoring_model_version !== post.scoring_model_version) return "not_comparable";
if (pre.form_id === post.form_id)                       return "not_comparable";
return "computed";
```

`engines/diagnostic/src/measurement.ts:279-305` (v1, θ) and
`engines/diagnostic/src/coverage-measurement.ts:296-320` (v2, coverage). The third clause
is counterbalancing and requires the forms to **differ**.

### 4.2 What bumps each of the three — traced

| Field | Where its value comes from | What moves it |
| --- | --- | --- |
| `blueprint_version` | `DEFAULT_WALK_BLUEPRINT_VERSION = 2`, a module literal (`walk-runtime.ts:39`). The v1 path uses `spec.spec_version`, also a literal (`routing.ts:84`) | **Only a hand edit to that literal.** It is not derived from the node set, the graph, or the item pool. Widening the scope does **not** move it |
| `scoring_model_version` | `COVERAGE_SCORING_MODEL_VERSION = 2`, a module literal (`coverage-measurement.ts:45`) | **Only a hand edit**, and the tree makes that edit expensive on purpose: `RESOLUTION_RULES_BY_VERSION` (`:86-88`) freezes each version's `confirmScopeFraction` and `maxItems` as literals, and `coverage-measurement.test.ts` fails when `DEFAULT_WALK_POLICY` drifts from the entry registered for the current version. So a policy change cannot land without answering the version question |
| `form_id` | `counterbalancedForm(student_id, purpose)` — an FNV-1a hash of the student id, inverted for `purpose: "post"` (`runtime.ts:99-108`) | **Nothing.** It is deterministic per student and guarantees pre != post. It moves only if a caller passes an explicit `form_id` override, which `server.ts:151` and `aurora-server.ts:179` accept from the request |

**So the answer to the brief's first question is: ordinary content authoring bumps none of
the three, and the ceremony's realistic problem is the opposite of the one feared.** A
learner's pre/post pair will almost always report `computed`. Two administrations a whole
playthrough apart, taken against different item content and possibly a different node set,
will be compared and a number reported.

The one case where a version genuinely diverges is historical and already happened: a `pre`
taken before the 2026-07-24 default flip carries `scoring_model_version: 1`, and pairing it
against a v2 `post` is caught (`measurement-read.ts:148-150` dispatches on the post and
lets the lagging pre fall out). That is the mechanism working.

### 4.3 The item-bank hole, established by injection

**The question: can the item bank's contents change underneath a stable `form_id`? Yes, and
the id of the individual item does not move either.**

The mechanism, read off the source:

- `item_version_id` is `` `${template.template_id}:${form}:${seed}` `` — **template, form
  and seed, never content** (`packages/item-bank/src/template.ts:134`).
- The walk forms are **generated at module load** from a template array and a seed base
  (`d1/index.ts:160-166`, `product/index.ts:44-48`), so an edit to a template's `generate()`
  re-renders the same ids with different prompts.
- Two further drift paths exist in the same function. `freezeDeepParallelForms` seeds each
  cell as `seedBase + index * stride` over the template array
  (`template.ts:243`), so **inserting or reordering a template re-seeds every template after
  it**; and its collision set starts from `avoidHashes`, which for the D1 walk is built from
  `D1_ITEM_PACK` and `D1_PRACTICE_ITEMS` (`d1/index.ts:165`), so **an edit to a practice item
  can push a walk item onto a different seed**. The tree already knows this:
  `product/index.ts:10-12` records that RAD.2/3/4 were appended "at the END so every earlier
  node keeps its index and its frozen walk forms stay byte-identical", and
  `d1/walk-templates.ts:18-19` says "the order pins the frozen walk forms".

**Injected and watched, rather than argued.** One prompt word changed in the `NUM.S` walk
generator — `Evaluate:` to `Work out:` in `packages/item-bank/src/d1/nodes/NUM.S/index.ts:375`
— then the suite run at `2a484b1b`:

- Six items changed content hash (`27ffb420` → new, and five more) while **every
  `item_version_id` stayed identical**: `d1w.num-s.l2:A:10000`, `:A:10001`, `:A:10002`,
  `:B:20000`, `:B:20001`, `:B:20002`.
- **Exactly one test in 1,911 noticed.** `npm run test:unit --project packages` reported
  **1 failed | 1908 passed | 2 skipped**, and the one failure is
  `packages/item-bank/src/walk.test.ts:117`'s content-hash snapshot, whose own name is
  *"pins the frozen walk content hashes (a template edit that changes the pool must be
  explicit)"*.
- Reverted; the file is byte-identical to the tip and `walk.test.ts` reports 16/16.

**So the honest reading, and it is narrower than "the gate silently lies".** There IS a
guard, it is the right guard, and it makes a content change **explicit at authoring time**
— it cannot happen by accident. What does not exist is any connection between accepting
that snapshot and the records already collected under the old content. `form_version` is the
field designed to carry exactly that claim: it is in the schema
(`db/migrations/0001_core_contracts.sql:51`), it is stamped on every administration, it is
**a constant `1` in both runtimes** (`runtime.ts:23`, `walk-runtime.ts:32`), and **neither
comparability gate reads it**.

**The detection material is already persisted.** Every response row carries
`item_definition_hash` (`schema.ts:44`, an FNV-1a over `{node_id, prompt, answer}`), so
"was this administration taken under content that has since changed" is answerable from the
records without a schema change. Nothing asks it.

### 4.4 The hole the gate does not watch at all: the denominator

**`scope` is not on the record. It is an argument the reader supplies**, and the two
shipped readers supply different values:

- `services/diagnostic-api/src/reads.ts:131` passes `scope: MVP_NODE_IDS` explicitly, with
  a comment saying why — *"so a full pass reads as 100% coverage (not a fraction of the
  62-node product scope)"*.
- `computeStudentReadiness`'s own default is `options.scope ?? inProductScope()` —
  **62 nodes** (`measurement-read.ts:156`). Drop the argument and the same records mean
  something else.

`computeCoverageMeasurementFromRecords` then applies the caller's single scope to **both**
sides (`coverage-measurement.ts:342-353`), so pre and post are always denominated alike —
which is right, and is also exactly what makes the widening dangerous. Measured at
`2a484b1b`:

| The same perfect entry diagnostic, scored two ways | coverage |
| --- | --- |
| Over the six D1 nodes (weighted total 10) | **1.000** |
| Over the 62 in-product nodes (weighted total 291) | **0.034** |

D1 carries **10 of 291** of the graph's depth-weight. So the day the reader widens, every
existing baseline is re-denominated from 1.000 to 0.034, and a learner who has genuinely
learned nothing new since would be shown a gain of up to **+96.6 percentage points**, with
`status: "computed"`. Nothing in the gate can see it, because `blueprint_version` did not
move — it is a literal, and the node set is not part of it.

**D-END4 is the fix and it is one line: the widening bumps `blueprint_version`.** That is
the field the gate already reads. It converts a silent fabrication into an honest
`not_comparable`, which is exactly what the field is for.

### 4.5 Is the three-field gate sufficient for a learner-facing headline claim?

**No, and the gap is not psychometric — it is that the gate was scoped for a different
consumer.** `docs/Assessment_Scoring_Spec.md` §1 states the claim the pipeline supports:
*"measured pre/post change on foundational D1 prerequisite skills, on this instrument"*,
and immediately adds *"NOT a psychometric-validity claim"*, with §10 deferring reliability
estimates and form-equating beyond structural matching. The three fields are a **structural
matching** check: same graph blueprint, same scoring model, different forms. They are
sufficient for that and they are honest about being that.

What they do not establish, and what a headline achievement would be read as claiming:

- **That the two forms are of equal difficulty.** They are structurally matched — same
  templates, same difficulty tier, different seeds — and nothing measures whether Form B's
  seeds happen to be harder. `freezeDeepParallelForms` guarantees the two forms differ in
  content; it guarantees nothing about their difficulty being equal.
- **That the content is the content the baseline was taken under** (§4.3).
- **That a per-node statement is reliable** (§6.3).

**This record does not invent a validity argument and recommends that the ceremony's copy
does not either.** The mechanism is reported; the risk is flagged; the mitigation is a
framing decision (D-END7) rather than a statistical one. What is *not* acceptable is a
number presented as an achievement with no qualification, because the instrument's own
authoritative spec declines to support that reading.

---

## 5. What the ceremony shows a learner whose pair is not comparable

### 5.1 The population is larger than the brief assumes, and the shipped fallback is the bad one

Three routes to "no comparable pair", and the first is the common case:

1. **No `pre` at all.** The entry diagnostic is **optional**. `TitleScreen.tsx:102-107`
   offers "Start" (straight into the city) beside "Take Diagnostic", and `App.tsx:444-448`
   honours both. A learner who pressed Start has no baseline, so there is nothing to pair
   and `computeStudentReadiness` returns `null` before any gate runs.
2. **`pre_invalid`.** A pre that was never finalized reads `incomplete`
   (`coverage-measurement.ts:242, 267` — `routing_path` and `submitted_at` must both be
   non-null), and one that exceeded the 5% fault budget reads `needs_review`.
3. **`not_comparable`.** Rare today (§4.2) and **the majority case on the day the widening
   ships**, because D-END4 strands every pre-widening baseline deliberately.

**What the shipped surface does with it today is the answer the brief calls bad, and it is
worse than "nothing".** `DiagnosticRunner.tsx:773-777` renders the status with its
underscores replaced by spaces:

> Not comparable yet (not comparable)

That is acceptable on a dev results screen. As the last thing a learner sees after ten eras
it is unusable, and it is also self-refuting: the fallback names a machine state and then
fails to say anything.

### 5.2 Recommendation: the fallback is not a degraded ceremony, it is a different one

**D-END5.** The ceremony has two forms and the learner is never shown a broken version of
the other one:

- **With a comparable pair:** the growth ceremony (§6).
- **Without one:** a **standing-city ceremony**, which makes no pre/post claim at all. It
  reports what is true of the present administration alone and needs no baseline: which
  skills the retake confirmed **cold** — *"you sat down today with no lessons, no hints and
  no retries, and these held"* — mapped to the buildings, and the city itself as the record
  of the run. The retake's own resolved state is fully sufficient for this: `finalize()`
  returns `resolved` and `coverage` for a single administration, and neither depends on a
  pair.

**Why this rather than a partial number.** A cold confirmation is a real claim, it is
positive-shaped, and it is *true of the same evidence* the growth ceremony uses — so the
two versions are not a good one and a consolation prize, they are the same ceremony with
and without a second data point. It also removes the temptation to show a gain computed
across a version boundary, which is the only genuinely harmful option on the table.

**One thing the fallback must not do: silently substitute stored mastery for the retake.**
The learner completed every era, so every node is at mastery >= 2 by construction and a
mastery-based readout would say "you have mastered 62 skills" for every learner
identically. That is a certificate of attendance, and it is exactly the claim the retake
exists to make non-trivial.

---

## 6. What the growth ceremony shows

### 6.1 The recommendation

**Report the skills the retake newly holds, mapped to the buildings that stand for them,
with the aggregate coverage delta as a supporting line rather than the headline.** The
lead's preferred framing, adopted, with two amendments that the measurements force
(§6.3, §6.4).

The reasoning for preferring it over a raw delta is sound and worth stating: a coverage
delta can be flat or negative for a learner who tested out of most of D1 at entry and has
been improving in eras the instrument barely weights, and "0.0 points" is a false statement
about a learner who built a city. A flip list cannot be negative-shaped, because a skill
that did not flip simply is not on it.

**But the aggregate is still shown, small and honest, and not suppressed.** A ceremony that
reports only the good half is the kind of thing that gets found later and read as a lie.
The delta belongs on the screen; it does not belong in the headline.

### 6.2 Derivability, established

| What the framing needs | Derivable? | From what |
| --- | --- | --- |
| Per-node pass/fail at **pre** | **Yes** | `rebuildWalkState` re-buckets the pre's response rows by `node_id` and re-adjudicates each under the rules the record's own `scoring_model_version` declares, then `resolveKnowledgeState` collapses it (`coverage-measurement.ts:130-188`). Reproducible from immutable records by construction (INV-DIAG-4) |
| Per-node pass/fail at **post** | **Yes** | Same path, and `finalize()` also returns `resolved` live (`walk-engine.ts:281`) |
| Whether a pass was **robust** | **Yes** | `adjudicate` returns `robust` for a clean 2/2, and `rebuildWalkState` re-derives it per node (`coverage-measurement.ts:159-167`) |
| Node → building | **Yes, and it is total at era ten** | Measured: `cityRosterNodeIds("cyberpunk")` is **62** nodes and `resolveEraCity("cyberpunk")` resolves **62 plots**, one per roster node, each with an archetype (`engines/game/src/city-roster.ts:95, 167`) |
| Whether that building is **standing where the learner put it** | **No, not on the path that has the baseline** | See below |
| Mastery **history** | **No** | `student_node_state` holds current `mastery` plus `mastery_updated_at`; `mastery_evidence` is an idempotency ledger (`evidence_id`, `student_id`, `node_id`, `received_at`), not a time series. There is no stored "was unmastered, now mastered" |

**The one real gap, and it is a persistence split rather than a design problem.** The two
halves of "buildings standing because of them" live on mutually exclusive paths today:

- The **baseline** survives ten eras only on the server-backed path, because dev persistence
  saves the city session and not administrations (`devPersistence/devSession.ts:16-46`
  enumerates node states, placements, town hall, roads and crisis damage — no assessment
  record), and the in-memory client holds `finalized` in a per-instance `Map`
  (`browserRuntime.ts:83`).
- The **layout** does not survive on that path: `loadCityFromAurora` returns
  `node_states` and `neighborhood_state` only, and `reads.ts:46-54` records the gap in its
  own TODO — *"`placements` is equally absent"*. It also maps over `MVP_NODE_IDS`, so the
  authenticated city read is **six of 62 nodes**.

**Consequence for the copy, not for the decision.** The mapping node → building is static
and authored, so the ceremony can name the buildings — *"the Workshop, the Observatory, the
Foundry"* — without reading a layout. What it may not do on the authenticated path is claim
anything about **where** they stand or point a camera at them, because that state is not
persisted. That is O-END4, and it is Evan's, and it is the same gap O-15 already tracks.

### 6.3 The per-node honesty problem, measured — and this is the amendment that matters

A per-node flip is precisely the reporting grain `Assessment_Scoring_Spec` forbids for the
marketed number: §5 says *"**NEVER per-node.** ... a per-node or per-single-domain breakdown
at ~2 items/node is exactly the noise we reject"*, §7 forbids claiming *"that per-node or
per-student gains are reliable"*, and §10 defers *"Per-node or per-student gain reporting"*.

**Two things are true and they have to be held apart.** The ban is about the **marketed,
cross-student research claim**, and the game already makes per-node claims to individual
learners from a single administration: the results screen lists every skill as "Start
here / Review / Strong" (`DiagnosticRunner.tsx:700-710`) and the test-out mechanism
pre-builds buildings off per-node placement. So per-node reporting to one learner about
themselves is shipped precedent. What the ceremony must not do is let that number leave the
learner's screen and become the metric.

**But the noise objection is real, and at full scope it gets worse rather than better.**
Measured at `2a484b1b` over the 62-node scope, where `confirmThresholdFor(62, 7/62) = 7`:

| | count |
| --- | --- |
| Nodes whose **pass** is decided on **one correct item** (pass-closure below the confirm threshold) | **31 of 62** |
| Nodes whose **fail** is decided on **one incorrect item** | **51 of 62** |
| Nodes where a full flip claim can rest on **two items total**, one per side | **20 of 62** — `NUM.5`, `RAD.1`, `RAD.2`, `LIN.3`, `LIN.4`, `LIN.5`, `POL.3`, `POL.6`, `FUN.2`, `FUN.5`, `FUN.6`, `FUN.7`, `EL.6`, `TRG.1`, `TRG.3`, `TRG.4`, `TRG.8`, `TRG.9`, `GEO.1`, `GEO.2` |
| The same counts at the **live D1 scope**, where `confirmThresholdFor(6, 7/62) = 0` | **0 and 0** — every decision is confirmed 2-of-3 |

The mechanism is `confirmThresholdFor`'s deliberate self-disabling on a small scope
(`adjudicator.ts:98-104`): at six nodes nothing can cascade to seven, the threshold rounds
to 0 and everything is confirmed, which is why the *current* instrument's per-node output is
as solid as a three-item adjudication gets. At 62 nodes the same rule buys its 38-item
median by deciding low-consequence nodes on one item — a correct and well-measured trade for
*aggregate coverage*, and a poor foundation for a per-node headline.

**So D-END7 carries a filter: the flip list shows only skills whose post-administration
pass is `robust`** — a clean two-correct-in-a-row, the same bar that already gates the top
city seed and downward inference (`adjudicator.ts:167-176`). It is derivable per node from
the records (§6.2), it is the tree's own existing notion of "confident enough to cascade",
and it converts a one-item claim into a two-item one at exactly the nodes where the budget
policy was cheapest. Skills that passed non-robustly are still counted in the aggregate
line; they are not named as achievements.

### 6.4 The divergence question: which instrument speaks, and no write-back

**The two instruments make genuinely different claims, and the tree already says so.**
`Contracts.md` keeps them in separate sections and its §2 heading is the whole point —
*"Immutable assessment records (the marketed metric reads THESE, not §1)"*, §1 being
`student_node_state` where mastery lives. `Assessment_Scoring_Spec` §1 states *"Is not: the
in-game mastery signal"*. And the era progression's D-ERA17 puts it in one sentence:
*"The diagnostic discharges lessons. It never discharges mastery or a trial."*

**The strongest argument for retaking rather than reading off mastery comes from the trial
contract's own reasoning, inverted.** D-ET1 rules the era trial *"cannot be an exam: it
unlocks only once every node already holds mastery 2, so nothing is being discovered"*.
That is correct, and it is exactly why a cold retake is not redundant with anything the game
already does: **whether a learner who earned mastery through practice can still do it cold,
weeks later, with no hints and no retries, is not known anywhere in the system.** The retake
is the only instrument that asks. Guaranteeing the two will sometimes disagree is not a
defect of the design; it is the entire information content.

**D-END8 — when they diverge, the ceremony reports the retake, and never contradicts
practice mastery.** Three clauses:

1. **The retake is the ceremony's subject**, so a skill it did not confirm does not appear
   on the flip list. The ceremony is not entitled to promote a skill on evidence it did not
   gather.
2. **A skill the learner mastered by practice and missed cold is never reported as
   unmastered.** It is *unconfirmed today*, which is a statement about one cold sitting, and
   the honest reading is "worth another look" — with the door to that skill's practice open,
   which is precisely what `LessonMenu` already offers from any placed building (D-ERA19,
   layer 3). Practice mastery was earned; a single cold administration does not have the
   standing to withdraw it.
3. **The building does not change.** Not its stage, not its stars, not its presence. A
   building is a record of what the learner earned (D-ERA32), and the retake earns nothing
   and unearns nothing.

**D-END6 — the retake writes to neither mastery nor placement, and the lead's prior is
right.** Not merely as policy — as a property of the code, verified:

- **Mastery: structurally impossible in this engine.** `engines/diagnostic/src/*.ts`
  contains **zero** non-comment occurrences of `mastery`. There is no mastery port on
  `FrontierWalkEngineDeps` to inject one through. INV-DIAG-1 is enforced by absence.
- **Placement: purpose-gated.**
  `PLACEMENT_WRITING_PURPOSES = new Set(["pre", "placement"])` (`walk-engine.ts:141-144`),
  and `finalize` writes placement only for a member (`:261-269`). A `post` administration
  writes nothing.

Against a counter-argument, since the brief invites one: the case for writing back would be
that the retake is better evidence than practice mastery, being cold and unaided. It is
better evidence *of a different thing*. Practice mastery answers "did this learner do the
work and reach the bar"; the retake answers "does it hold cold today". Overwriting the first
with the second destroys a durable record with a momentary one, and it would run straight
into the monotonicity `Mastery_Scoring_Spec` §5 guarantees —
*"`mastery_new = max(mastery_existing, mastery_evidenced)`. Nothing lowers mastery in v1"* —
so a write-back could not demote a node even if it were allowed to try. **The prior stands
and is recorded as a decision.**

---

## 7. Sequencing and length

### 7.1 Sequencing

**D-END1 — era ten trial, then era ten's end-of-era progression exactly as the other nine
have it, then the completion ceremony.** The progression is not replaced, not shortened and
not merged into the ending.

The reason is already ratified: **D-ET3 rules "the same ritual in all ten eras, and the
sameness is the point"**, so substituting the completion ceremony for era ten's progression
would make era ten the one era whose ritual is different — and it would do it at the moment
the ritual has accumulated the most meaning. The completion ceremony is a *fourth* thing,
after the trial and the progression, and it is the only one of the four that happens once
in a playthrough.

**What era ten's progression does today, verified.** The four-beat ceremony runs from
`☰ Menu → Advance the age` and `completeCeremony` calls `advanceCityEra(eraId)`
(`CitySurface.tsx:2367-2370`), which returns `null` at the end of the sequence and moves
nothing (`useCityEra.ts:77-83`). Its `retheme` beat deliberately renders no ground line at
era ten, because there is no incoming era to describe
(`EraAdvanceCeremony.tsx:238, 603-607`). So **finishing era ten's ceremony today closes the
overlay and returns the learner to the same Cyberpunk city, with nothing having happened.**
That is the hole the lead's note names, and it is exactly where the completion ceremony
hangs.

**The seam already exists and is unwired.** `hasNextEra` is exported and tested
(`eraState.ts:133`, `eraState.test.ts:110-120`) and **has no production consumer** — only
the test reads it. `hasNextEra(era) === false` is the condition, and it is one call.

### 7.2 Length — and the brief's number is the wrong number

**The measured facts, driven through the real walk engine at `2a484b1b`** (pure-engine:
`startWalk` / `recordScoredOutcome` under `DEFAULT_WALK_POLICY`, answers supplied by a fixed
policy, so item-pool gaps do not bite):

| Scope | A learner who answers **everything correctly** | probed |
| --- | --: | --: |
| D1, six nodes (live) | **6 items** | 3 of 6 |
| The 21 walk-ready nodes | **28 items** | 14 of 21 |
| The full 62 | **57 items** | 34 of 62 |

For contrast, at full scope a learner who answers **everything incorrectly** serves **17
items**, because a confirmed failure prunes its dependent cone.

**So the brief's "median 38" understates the ceremony's length by about 50%.** 38 is a
median over a *pooled simulated cohort* spanning all ability levels
(`adjudicator.ts:76-82`, n = 6,000), and the population arriving at the completion ceremony
is by construction the one that has mastered every node — the top of that distribution,
where the walk is longest in items. The shipped scale guard is consistent with both figures
and explains why they are easy to confuse: it pins max **nodes** <= 41 and max **items** <=
62 and asserts `strong < max` **in nodes**, with a docblock (`walk-scale.test.ts:120-123`)
warning in as many words that *"quoting only nodes is how the pre-amendment budgets came to
be read as instrument-length bounds when they were not"*. The acing learner is not the
longest walk in nodes (34 < 41). In **items** they are near the top (57 of a 62 worst case).

**What shortening costs, plainly: it costs the measurement, both ways round.**

- **Shortening by node set** is a different blueprint. That is what
  `blueprint_version` exists to catch, and under D-END4 it will catch it — the short post
  and the full pre come back `not_comparable`, which is correct and is the whole point of
  the field.
- **Shortening by item ceiling** is a different scoring model, and this is the
  non-obvious one. `maxItems` is not a live tunable: it is frozen per
  `scoring_model_version` in `RESOLUTION_RULES_BY_VERSION`
  (`coverage-measurement.ts:86-88`, currently `{ confirmScopeFraction: 7/62, maxItems: 70 }`
  for version 2), precisely so a shipped-policy change cannot re-adjudicate old records. So
  a shorter ceiling is a new model version, and the gate rejects the pair.

**There is a legitimate third option, and it is to decide the length once for both
administrations before any baseline exists** — i.e. lower the ceiling now, for pre and post
alike. It has a measured price and the price is bad: at a 60-item ceiling **15.2% of
students are truncated**, that cohort scores 87.8% against 96.1% for everyone else, and
they are *"told to rebuild 7.5 skills [they] had actually mastered"* (`walk.ts:148-154`).
70 was chosen over 60 for exactly that reason.

**D-END9 — do not shorten the instrument. Split the sitting.** The walk is already
resumable and that is a property of the shipped design, not a change: state is persisted per
administration through `WalkProgressStore.saveWalk` / `getWalk`
(`walk-engine.ts:76-79`), `submitProbe` reloads it every turn (`:217-219`), and an
administration that is never finalized reads `incomplete` and poisons nothing
(`coverage-measurement.ts:242`). So the retake can be spread across the ending in several
sittings, at zero cost in comparability, where compressing it into one sitting costs the
measurement outright.

**And the lead's framing is adopted, because it is what makes 57 items bearable:** the
diagnostic is the thing you DO, and the ceremony is what happens when the results come
back. The ending is not a screen the learner watches after an exam; the exam **is** the last
act, and the ceremony is its consequence. D-ET14's precedent applies directly — the trial is
exitable with an end-of-attempt screen — so leaving mid-retake and returning must be
ordinary, not a forfeit.

**One number for the whole endgame, so nobody is surprised by it.** Era ten holds nine nodes
(`TRG.1`..`TRG.9`), so its progression asks `9 × 2 = 18` correct answers across four beats
of `[4, 5, 4, 5]` (`eraCeremony.ts:207-243`, D-ET10). Add the retake's 57 and **the era-ten
endgame is roughly 75 items** before the incoming crisis ruling adds a fourth surface. That
is the number to design against.

### 7.3 A truncated retake may not be reported as a loss

**D-END10.** `resolveKnowledgeState` is fail-closed at the ceiling by ratified invariant
(INV-DIAG-6): a node the ceiling never reached stays `unknown` and resolves not-passed
(`walk.ts:626-634`). In an aggregate that is a conservative floor and it is fine. In a
ceremony it is a **fabricated regression** — the learner is shown skills they hold as
skills they lack, because the instrument ran out of budget.

The signal to branch on already exists and is already correctly separated from "the learner
quit": `ceiling_reached` is set only when the budget is exhausted *and* something is still
unresolved (`walk.ts:606-616`), and it is returned on the completed diagnostic
(`walk-engine.ts:284`). A retake with `ceiling_reached === true` **must fall back to §5.2's
standing-city ceremony** rather than report a delta.

The published truncation rate at the 70-item ceiling is 1.5% of students, which is why this
is a branch and not a redesign. It is not negligible for an ending, and a constructed case
shows how ordinary the shape is: driving the real engine at full scope with a learner wrong
on every item of every tenth node reaches the ceiling and truncates at coverage 0.876. (That
is a hand-built profile illustrating the mechanism, not a cohort rate — the 1.5% is the
measured rate.)

---

## 8. Test-out, and how a retake could wreck a city

The entry diagnostic writes into the city through test-out: a passed node
(`placement_estimate >= 2`) is pre-built to complete at **mastery 0**, so the first
administration determines what is pre-built
(`docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md` §8.1). The brief asks whether a
retake can re-trigger that. **It cannot as the code stands, and there are two distinct ways
a ceremony implementer could make it.**

**Why it cannot today.** Two independent gates:

1. `PLACEMENT_WRITING_PURPOSES` excludes `"post"` (`walk-engine.ts:141-144`), so a retake
   writes no `placement_estimate` — and test-out keys entirely on that field.
2. `DiagnosticRunner` withholds the hand-off on the retake branch: `onPretestComplete` is
   called only in the `else` of `if (isRetake)` (`:325-333`).

**The first landmine, and it is severe.** `session.seedFromPlacement` — the function
`handlePretestComplete` calls (`App.tsx:481`) — is not a merge. It is a **destructive full
reset**: it clears `nodeStates`, clears `placements`, clears `roads`, zeroes
`roadGoldSpentValue`, resets `crisisDamageValue` to `NO_CRISIS_DAMAGE`, clears
`neighborhoodStates`, and moves the Town Hall back to the island centre
(`citySession.ts:958-1007`). Called after ten eras it would delete the entire playthrough.
And `finalize()` returns `placement_by_node` **for every purpose**, including `post`
(`walk-engine.ts:253-259, 282`) — the guard is at the *write* boundary, not in the shape of
the value. So a ceremony that reasonably reads `completed.placement_by_node` and passes it
where the pretest passes it destroys the city, with every existing gate reporting correct.

**The second landmine is quieter.** `placeSkill` carries its own test-out seam: placing a
node whose `placement_estimate >= UNLOCK_PLACEMENT_ESTIMATE` and whose
`completion_status !== "complete"` silently completes it at mastery 0
(`citySession.ts:703-713`). So a retake does not need to seed anything to mutate the city —
it only needs to raise `placement_estimate`, and the next placement of an unfinished node
does the rest. Which is one more reason the retake must be `purpose: "post"` and never
`purpose: "placement"`: **`"placement"` is in the placement-writing set**, so choosing it
for a retake would open both paths at once.

**D-END6's second clause therefore names the call sites, not just the intent:** the
completion ceremony may not call `seedFromPlacement`, may not call `onPretestComplete`, and
may not read `placement_by_node` off a post administration. There is one more consequence
worth stating: `unlockedNodeIdsFromPlacement` (`DiagnosticRunner.tsx:54`) is derived from
the same field, so the "You've unlocked N buildings" celebration must not fire on a retake
either — after ten eras there is nothing to unlock, and the number would be a lie about
buildings the learner earned.

---

## 9. Reconciling with the incoming crisis ruling

> **THIS SECTION IS CORRECTED 2026-07-31, TWICE OVER, AND THE SECOND CORRECTION CHANGES A FACT
> ABOUT ERA TEN RATHER THAN A CITATION.** Read this note before the section; the section is kept
> beneath it because its reasoning about D-END1 is unaffected and still worth reading.
>
> **First, the merge state.** #345 is no
> longer open. It **merged at `2026-07-31T20:23:37Z`**, read from the API rather than inferred, so
> **D-CRISIS-31 and D-CRISIS-32 are in the tree** and the section's *"still an open PR, not in the
> tree"* framing has expired. `integration` no longer rules ten crises over seven cadences.
>
> **Second, and this is the substantive one: ERA TEN NO LONGER HAS A MID-ERA CRISIS.**
> **D-CRISIS-33**, later the same day, moved the four from eras 1 / 4 / 7 / 10 to **eras 1 / 4 / 6 /
> 9** — the Boiler Cascade (7) and the Robot Uprising (10) are shelved, and the Plague (6) and
> Intrusion (9) come off the shelf. **So the sentence below — *"Era ten is in the surviving set
> either way… the era-ten crisis exists under both models"* — is now false.**
>
> **What that does to era ten's endgame, which this section enumerates.** It loses its **first**
> beat and keeps the rest. The order is now **three** surfaces, not four:
>
> **the era-ten trial → era ten's four-beat progression, 18 checks → the completion ceremony.**
>
> **Nothing this document decides moves, and D-END1 is strengthened rather than touched.** The
> ceremony is still the last thing in the game and still the fourth surface counted from the start
> of era ten's endgame in the old model; it is now the third. **The reservation that produced the
> change was partly about this document**: the crisis ruling's **O-22** asked whether era ten was
> the right place for a crisis given that *"era ten's progression already serves as the game's
> ending ceremony"* — the argument this section makes from the other direction — and **O-22 is now
> RESOLVED in that direction.** The crisis document's §5.41 records this document as the sharpest
> external consequence of D-CRISIS-33, and cites §9 here as the evidence that nothing is lost at era
> ten: the three remaining beats are the three this section already called the ending.
>
> **What is NOT changed by any of it.** D-CRISIS-31's third clause — *every one of the ten eras
> keeps a persistent end-of-era progression* — is untouched by D-CRISIS-33, so **D-ERA16 and D-ET3
> still hold for all ten eras** and the convergence this section reports between D-END1 and the
> crisis ruling is unaffected. **The decisions in §10 remain independent of the crisis cadence**,
> which is what the section's last paragraph promised and is now demonstrated rather than predicted.

The related ruling landed in an **open PR** while this record was being written, and it is
not in the tree: #345 carries it
as **D-CRISIS-31** (four crises, at eras 1, 4, 7 and 10; the Hard Winter is era one's; all
ten eras keep a persistent end-of-era progression) and **D-CRISIS-32** (the six dropped
crises are **shelved, not cancelled**). Read from the API rather than inferred from pushes:
`merged: false`, `mergedAt: null`. So `integration` still rules ten crises over seven
cadences, and open #307 still
briefs nine of them.

**Nothing in this record contradicts it, and on the one clause that overlaps the two records
converge independently.** D-CRISIS-31's third clause is *"Every one of the ten eras keeps a
persistent end-of-era progression"*, and it grounds that in **D-ERA16** and **D-ET3** — the
same two authorities D-END1 reaches for, arrived at from the other direction. #345 also
records why that clause is the load-bearing one: read without it the ruling sounds like *six
of ten eras lose their ending*, and they do not — they lose a crisis and keep the trial, the
retheme and the advance. **That is exactly the reading D-END1 exists to protect at era ten**,
one era further along.

~~**The sequencing is unchanged by #345 merging or not.** Era ten is in the surviving set
either way: it is one of 1/4/7/10 under D-CRISIS-31, and D-CRISIS-23 already ruled *"era ten
inverts the premise, and that is the correct place for the last one"*. So the era-ten crisis
exists under both models.~~

**FALSE AFTER D-CRISIS-33 (2026-07-31), and struck rather than deleted so the reasoning is
visible.** Era ten is **not** in the surviving set: the four are eras 1, 4, 6 and 9. D-CRISIS-23's
placement ruling is untouched and is now the reason era ten is where the Robot Uprising **would**
return to if it were ever un-shelved, rather than the reason it ships.

~~**Era ten's endgame, in order, under D-CRISIS-31:** the mid-era crisis fires after
`ceil(9/2) = 5` of era ten's own nodes (D-CRISIS-9, which notes eras eight and ten are the
two that differ from three) → the era-ten trial → era ten's four-beat progression, 18 checks
→ **the completion ceremony**. Four surfaces, and this record adds the fourth and last.~~

**Era ten's endgame, in order, under D-CRISIS-33:** the era-ten trial → era ten's four-beat
progression, 18 checks → **the completion ceremony**. **Three surfaces, and this record adds the
third and last.** The mid-era crisis beat is gone from era ten entirely, so `ceil(9/2) = 5` is now
arithmetic about an era with no crisis in it.

**Whoever lands the crisis ruling owes nothing to this document.** If the cadence changes
again, §9 is the only section that needs re-reading, and the decisions in §10 are
independent of it.

> **That prediction was tested within hours and held.** The cadence did change again, §9 **was**
> the only section that needed re-reading, and **no decision in §10 moved.** Recorded because a
> prediction that survives its first test is worth marking as tested — the reason it held is that
> §10's decisions are keyed on *the game ending* rather than on *what precedes it*, which is a
> property worth preserving in any future edit to this document.

---

## 10. Decisions

Twelve (D-END1..D-END12). A new namespace: `D-ERA`, `D-ET`, `D-CRISIS`, `D-TH` and `D-CIT`
are all in use, and **`D-ERA` is machine-counted** by `test/eraDecisionCount.test.ts` off the
era-progression spec, so adding ids there would move a pinned tally. Nothing here adds a
`D-ERA` id or edits that file.

| ID | Ruling | Recorded at |
| --- | --- | --- |
| **D-END1** | **Era ten keeps its end-of-era progression, unchanged and in the same shape as the other nine, and the completion ceremony is a separate surface AFTER it.** Sequence: era-ten trial → era-ten progression → completion ceremony. The ceremony never substitutes for the progression. Grounded in **D-ET3** (*"the same ritual in all ten eras, and the sameness is the point"*): substituting would make era ten the one era whose ritual differs, at the moment it has accumulated the most meaning | §7.1 |
| **D-END2** | **The completion ceremony is built on a `purpose: "post"` retake of the entry diagnostic, and it fires ONCE per playthrough.** The retake is the thing the learner does; the ceremony is what happens when the results come back. Once-only is not a policy bolted on — **only two forms exist** (`A`/`B`) and `counterbalancedForm` spends both on the pre/post pair, so a second retake would collide with a form the learner has already seen and the gate would return `not_comparable`. The shipped runner already gates it this way (`canRetake={!isRetake && !hasPost}`) | §2, §4.2 |
| **D-END3** | **Extending the diagnostic to the full node set is a PREREQUISITE of this ceremony, not an independent improvement.** A D1-only baseline samples era one, so a retake against it cannot measure ten eras of growth whatever the ceremony says. **This record does not widen anything and does not decide the widening** — that is Gabe's (**O-END1**), declined on 2026-07-26 and unchanged since. What is new is that the ceremony is a reason to revisit it | §1, §3 |
| **D-END4** | **The widening MUST bump `blueprint_version`.** The coverage denominator is a read-time argument and not a property of the record, so widening the reader silently re-denominates every existing baseline: measured, a perfect D1 pre goes from `1.000` to `0.034`, and a learner who learned nothing since would be shown up to **+96.6 points** with `status: "computed"`. `blueprint_version` is the field the gate already reads; bumping it converts a silent fabrication into an honest `not_comparable`. **The alternative — re-denominating in place — is forbidden** | §4.4 |
| **D-END5** | **A learner without a comparable pair gets a DIFFERENT ceremony, never a degraded one.** The fallback is a **standing-city ceremony** making no pre/post claim: the skills the retake confirmed **cold**, mapped to the buildings, and the city as the record of the run. Derivable from the single administration (`resolved` + `coverage`), so it is the same evidence without a second data point. **It must never render a machine status** — today's surface shows *"Not comparable yet (not comparable)"*. **It must never substitute stored mastery**, which is at >= 2 on every node for every finisher and would certify attendance. **The population is not marginal**: the entry diagnostic is optional, so the common case is no baseline at all, and D-END4 makes `not_comparable` the majority on widening day | §5 |
| **D-END6** | **The retake writes to NEITHER mastery NOR placement, and this is verified in the code rather than asserted.** Mastery is structurally impossible — zero non-comment occurrences of `mastery` in `engines/diagnostic/src/*.ts` and no port to inject one (INV-DIAG-1 by absence). Placement is purpose-gated: `PLACEMENT_WRITING_PURPOSES` is `{pre, placement}`. **Therefore the retake is `purpose: "post"` and `"placement"` is forbidden for it.** Named prohibitions for the implementer, because `finalize()` returns `placement_by_node` for a post too: the ceremony may not call `seedFromPlacement`, may not call `onPretestComplete`, may not read `placement_by_node` off a post, and may not fire the unlock celebration | §6.4, §8 |
| **D-END7** | **The ceremony's headline is the skills the retake newly holds, mapped to their buildings; the aggregate coverage delta is a supporting line, shown and not suppressed.** A delta can be flat or negative for a learner who built a city, which is a false statement about them; a flip list cannot be negative-shaped. **Amendment forced by measurement: only skills whose post pass is `robust` (a clean 2/2) are NAMED.** At 62-node scope 31 of 62 nodes pass on one item, 51 fail on one, and 20 admit a flip claim resting on two items total — where at the live six-node scope the confirm threshold rounds to 0 and every decision is confirmed. Non-robust passes still count in the aggregate; they are not named as achievements | §6.1, §6.3 |
| **D-END8** | **When the two instruments diverge, the ceremony reports the RETAKE and never contradicts practice mastery.** Three clauses: (a) a skill the retake did not confirm is not on the flip list, because the ceremony may not promote on evidence it did not gather; (b) a skill mastered by practice and missed cold is **unconfirmed today**, never unmastered, and the door to its practice opens — a single cold sitting has no standing to withdraw earned evidence; (c) **the building does not change** — not its stage, not its stars, not its presence (D-ERA32: a building records what was earned). The divergence is the design, not a defect: **D-ET1's own reasoning that the trial "cannot be an exam ... so nothing is being discovered" is exactly why a cold retake discovers something** | §6.4 |
| **D-END9** | **Do not shorten the instrument. Split the sitting.** Both shortenings forfeit the measurement: a smaller node set is a different blueprint, and a lower item ceiling is a different `scoring_model_version` because `maxItems` is frozen per version in `RESOLUTION_RULES_BY_VERSION`. Deciding a shorter length once for both administrations is available and priced badly (at a 60-item ceiling, 15.2% truncated, that cohort at 87.8% against 96.1%). The walk is **already resumable** — per-administration `WalkProgressStore`, one item per turn, an unfinalized administration reads `incomplete` — so several sittings cost nothing in comparability where one sitting costs the measurement. Leaving and returning mid-retake is ordinary, per **D-ET14**'s precedent | §7.2 |
| **D-END10** | **A truncated retake may never be reported as a loss.** Fail-closed resolution at the ceiling (INV-DIAG-6) marks nodes the instrument never reached as not-passed, which in an aggregate is a conservative floor and in a ceremony is a fabricated regression. `ceiling_reached` already distinguishes truncation from an abandoned run and is returned on the completed diagnostic, so a retake with `ceiling_reached === true` **falls back to D-END5's standing-city ceremony**. Published truncation rate at the shipped 70-item ceiling: 1.5% | §7.3 |
| **D-END11** | **The ceremony makes no validity claim, and its copy may not imply one.** The three-field gate is a **structural matching** check — same blueprint, same scoring model, counterbalanced forms — which is what `Assessment_Scoring_Spec` §1 says the pipeline supports and §10 says is deferred beyond. It does not establish that the two forms are equally difficult, that the content is what the baseline was taken under, or that a per-node statement is reliable. **No validity argument is invented here**; the mechanism is reported and the risk is carried by the framing (D-END7) rather than by statistics | §4.5 |
| **D-END12** | **The ceremony requires the server-backed path, and that is a constraint rather than a preference.** A baseline has to survive ten eras and therefore many sessions. Dev persistence saves the city session and **not** assessment records, and the in-memory client holds finalized administrations in a per-instance `Map`, so on the offline path the baseline dies with the component. Consequence to design around, not to fix here: on the server-backed path the city layout is **not** persisted either, so the ceremony may name buildings (the node → building map is static and total at era ten: 62 nodes, 62 plots) but may not claim where they stand (**O-END4**) | §6.2 |

---

## 11. Open items — who decides, and when

| ID | The decision | Owner | Must be answered by |
| --- | --- | --- | --- |
| **O-END1** | **Whether to widen the diagnostic to the full node set, and on what schedule.** Costed in §3: 246 frozen items owed across 41 uncovered nodes, plus the checker migration, plus a 240-test blast radius if done by registry flip. Declined 2026-07-26; this record does not reopen it, it prices the consequence of leaving it closed | **Gabriel** | Before any ceremony implementation starts. The ceremony is buildable without it and would measure only era one |
| **O-END2** | **Whether `form_version` becomes a fourth comparability field.** §4.3 establishes that form contents can move under a stable `form_id` *and* a stable `item_version_id`, that CI makes it explicit at authoring time, and that nothing connects it to already-collected baselines. The field exists, is stamped constant `1`, and is read by nothing. The cheaper half — an audit that compares a record's stored `item_definition_hash` against today's — needs no schema change at all | **Gabriel** (diagnostic lane) | With the widening, since that is the next occasion the forms are re-frozen |
| **O-END3** | **CLOSED 2026-08-01 by the team lead, in the BOUND direction. See the note beneath this table; the entry is kept unedited above the strike so what was open, and what it got wrong, are both still readable.** ~~**Whether the retake is offered or required at era ten.** D-END2 makes it once-only and D-END9 makes it resumable, but nothing here rules on refusing it. A learner who declines gets D-END5's fallback, which is a complete ending — so the cost of making it optional is low and the cost of making it mandatory is a 57-item wall between the learner and the end of the game~~ | ~~**Evan** (it is a game-flow ruling)~~ **The team lead took it out of that lane to decide it** | ~~With the ceremony's implementation~~ **Answered 2026-08-01** |
| **O-END4** | **What the ceremony may show OF the city on the authenticated path**, given that `placements` and `town_hall` are not persisted there and `loadCityFromAurora` reads six of 62 node states. Same gap as **O-15** and it should be answered once for both | **Evan**, with Gabriel where it reads schema state | Before the ceremony renders anything spatial |
| **O-END5** | **Era ten's own progression has no content.** Measured at `2a484b1b`: `interleavedPoolItems("cyberpunk", "all")` returns **0 items** across all nine `TRG` nodes, so era ten's four-beat ceremony cannot draw a single one of its 18 checks. This blocks D-END1's *"progression like every other era"* independently of the diagnostic, and it is authoring rather than design | **Anthony** (content), tracked by Gabriel | Before era ten is playable end to end |

> ### O-END3 is CLOSED, 2026-08-01, and one sentence of it was false while it was open
>
> **The ruling, the team lead's, verbatim:**
>
> > *"ill decide myself - the final ceremony should be the final diagnostic."*
>
> **So the ceremony and the retake are ONE THING, and the retake is required in the only
> sense the ending can require anything: there is no ending that is not its reading.** Two
> procedural facts belong with it, because a later reader will otherwise read this row as
> having been decided by its listed owner.
>
> **1. The lane moved.** This row assigned the decision to **Evan**, as a game-flow ruling.
> The lead took it himself on the grounds that it reaches the metric the product is sold on,
> which makes it a decision about the artifact rather than about the flow. Recorded as a
> transfer rather than silently reassigned.
>
> **2. The note Evan would have decided from contained a false statement, and that is the
> second reason it should not have stood.** The struck clause claims *"A learner who
> declines gets D-END5's fallback, which is a complete ending"*. **It is false.** All three
> of D-END5's enumerated routes (§5.1) are `no pre`, `pre_invalid` and `not_comparable`, and
> **every one of them assumes a post administration happened**; §5.2 populates the fallback
> from *"The retake's own resolved state"* and nothing else; and the paragraph beneath it
> forbids the only substitute available, *"silently substitute stored mastery for the
> retake"*. So a learner who declines has no pair, no post to read, and a forbidden filler.
> The clause is **struck rather than deleted** so the reasoning that produced it stays
> visible: it was an assumption written inside an open item, not a ruling, and it reads like
> a settled fact, which is exactly why it would have been inherited.
>
> **What is still open after the ruling, and it is not what this row asked.** The ruling
> settles the mechanism. It does not settle what a learner who declines or abandons the
> retake sees, which the struck clause had appeared to answer.
>
> **Where the consequences live.** `docs/superpowers/specs/2026-08-01-final-diagnostic-and-the-artifact.md`
> carries the ruling, the costed alternative it overruled, the copy constraints the bound
> mechanism inherits, and the answer to the decline question. Nothing else in this document
> moves: D-END1..D-END12 are untouched, and D-END5's content is adopted there rather than
> amended.

---

## 12. Self-review

- **Every load-bearing claim is cited to a file and line at one SHA**, `2a484b1b`, and the
  ones that are measurements say how they were measured. Findings expire when the tree
  moves: three of the brief's own priors were stale or inverted (§2), which is the argument
  for re-reading rather than trusting a record — including this one.
- **This record watched one of its own findings expire, which is the best argument for the
  discipline it can offer.** "The crisis ruling has not landed" was true and fully searched at
  `2a484b1b`, and four minutes before this PR opened it became a statement about an open PR
  instead (#345, D-CRISIS-31/32). It was re-read and §9 was rewritten against what #345
  actually says, with `mergedAt` taken from the API rather than inferred. In the same window
  `integration` moved to `04b1dfba`, touching `packages/item-bank/` — so the two figures that
  could have moved with it were re-taken at the merged tip: **62 nodes / 21 walk-ready / 0
  thin / 41 missing / 246 items owed**, unchanged, and `walk.test.ts`'s content snapshot still
  green. The GEO.2 edit that landed touched a practice pack and not a walk pool.
- **The two claims that could not be verified from a checkout are labelled.** The published
  38-item median and the 1.5% truncation rate are quoted from
  `docs/Contracts_Amendment_Diagnostic_Probe_Policy.md` and `walk.ts`'s own docblock, and
  the simulation harnesses that produced them are excluded from CI. The figures I re-derived
  myself (the 57-item ace, the 0.034 denominator, the 31/51/20 confirmation counts, the
  41-node pool gap, era ten's empty pool) are marked as measured at this tip and are
  reproducible from the engine in a few lines.
- **The item-bank hole is deliberately stated narrowly.** A content change under a stable id
  IS possible and was injected; it is also caught by a snapshot guard, so it cannot happen
  by accident. Claiming the gate "silently lies" would have been the stronger sentence and
  the false one.
- **Where a recommendation contradicts a ratified rule, the rule is named and the
  distinction argued rather than skipped.** D-END7's flip list is per-node reporting, which
  `Assessment_Scoring_Spec` §5 forbids for the marketed number; §6.3 argues the difference
  between a learner-facing statement about themselves and a research claim, cites the
  shipped precedent for the former, and then *narrows* the recommendation with a robustness
  filter rather than waving the objection through.
- **The two decisions that constrain other lanes are flagged as such.** D-END4 is a
  diagnostic-lane instruction attached to work that lane has not agreed to do (O-END1);
  D-END1 depends on era-ten content that does not exist (O-END5). Neither is presented as
  free.
- **No emoji, no colour-alone signal, and nothing here is implemented.** The one place this
  record touched code was an injection that was reverted and verified byte-identical.

---

## 13. References

- `engines/diagnostic/src/measurement.ts`, `coverage-measurement.ts` — the two comparability
  gates, and `RESOLUTION_RULES_BY_VERSION`.
- `engines/diagnostic/src/walk.ts`, `walk-engine.ts`, `adjudicator.ts`, `coverage.ts` — the
  v2 instrument: policy, purpose-gated placement write, per-node adjudication, the
  depth-weighted metric.
- `engines/diagnostic/src/routing.ts` — the retired v1 multistage spec, still the item-bank
  validator's source of required cells.
- `services/diagnostic-runtime/src/walk-runtime.ts`, `runtime.ts`, `measurement-read.ts`;
  `services/diagnostic-api/src/reads.ts` — where the three fields are stamped, and the two
  readers that disagree about the default scope.
- `packages/item-bank/src/template.ts`, `schema.ts`, `bank.ts`, `d1/index.ts`,
  `d1/walk-templates.ts`, `product/index.ts` — form generation, the id scheme, the content
  hash, and the index-seeding the packs already work around.
- `apps/web/src/diagnostic/DiagnosticRunner.tsx`, `browserRuntime.ts`, `session.ts` — the
  shipped once-only retake, its measurement summary, and the offline/persisted split.
- `apps/web/src/city/citySession.ts` (`seedFromPlacement`, `placeSkill`), `App.tsx`
  (`handlePretestComplete`) — the two test-out write paths and the destructive reset.
- `apps/web/src/city/EraAdvanceCeremony.tsx`, `eraCeremony.ts`, `eraState.ts`,
  `useCityEra.ts`, `CitySurface.tsx` — era ten's progression, its 18 checks, and the
  `hasNextEra` seam nothing consumes.
- `engines/game/src/city-roster.ts` — the era-ten roster and the total node → plot map.
- `docs/Assessment_Scoring_Spec.md` §1, §2, §5, §7, §10 — what the instrument may and may
  not claim, and the per-node ban.
- `docs/Contracts_Amendment_Adaptive_Diagnostic_v2.md`,
  `docs/Contracts_Amendment_Diagnostic_Probe_Policy.md` — the coverage model, the 38-item
  median, the 70-item ceiling and what 60 cost.
- `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md` §8.1, §8.2 — test-out at mastery 0
  and why the `mastery >= 2` gate is not a bug.
- `docs/Diagnostic_11_Node_Scope_Measurement.md`,
  `docs/Diagnostic_11_Node_Scope_Decision_Evidence.md` — the widening's cost, the `RAD.1`
  wedge, and the 240-test blast radius.
- `docs/superpowers/specs/2026-07-27-era-progression-design.md` §9, §10, §10.1, §14 GC1 —
  D-ERA16/17/18/32, the diagnostic-discharges-lessons rule, and the D1-only correction.
- `docs/superpowers/specs/2026-07-29-era-trial-contract.md` — D-ET1, D-ET3, D-ET10, D-ET14.
- `docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md` — the ten-crisis cadence as
  it stands at this tip, and D-CRISIS-9/23. PR
  #345, open and unmerged, is
  where D-CRISIS-31/32 live until they are not.
