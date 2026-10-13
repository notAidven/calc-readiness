# Diagnostic Tail-Policy Measurement (cutting p90, not the median)

**Measured 2026-08-04 at `be72c537`. Status: MEASUREMENT RECORD — non-normative.** Owner: Gabe
(diagnostic lane). Companion to `Diagnostic_Probe_Cost_Measurement.md` (the pre-#89 62-node
record), `Diagnostic_11_Node_Scope_Measurement.md` (the 11-node candidate) and
`Contracts_Amendment_Diagnostic_Probe_Policy.md` (the policy that ships).

> **⚠ SUPERSEDED IN ONE RESPECT, 2026-08-04 (later the same day): §5.3's recommendation was
> ACTED ON and the knob is now ON.** `DEFAULT_WALK_POLICY` carries
> `livePassClosure: true, liveConsequenceFrom: 20`, and `COVERAGE_SCORING_MODEL_VERSION` is **3**.
> The paragraph below saying *"`DEFAULT_WALK_POLICY` is unchanged"* and *"the three knobs added to
> `WalkPolicy` are all off"* described the tree at `be72c537` and **no longer describes the tree**.
> §5.4's precondition — *"not before the scope passes the sixth era"* — was met when `POL.5` was
> authored, taking the instrument to all 62 nodes with no placement horizon left to cut at.
>
> **Every measured figure in this document still stands and was re-measured, not quoted**; see
> `Diagnostic_Tail_Cut_Landed.md` for the re-measurement, the version-bump record and what the
> re-run found that this document could not have known. Read the two together: this one is the
> curve and the reasoning, that one is what shipped and what it actually measures at.

This record changes no invariant, no budget and no shipped behaviour. `DEFAULT_WALK_POLICY` is
unchanged and the live instrument is bit-identical: the three knobs added to `WalkPolicy` are all
off, and the drift guard in `coverage-measurement.test.ts` fails if any of them is turned on
without §3.4.1 of the probe-policy amendment being walked. It answers one question — **what does
it cost to cut the tail of the 62-node walk** — and answers it as a **curve**, because every point
on that curve is a different offer and choosing between them is not a measurement.

---

## 0. Read this first: the premise did not hold when this was measured, AND IT DOES NOW

> **AMENDED 2026-08-04, after authoring closed the gap this section reported.** The section below
> is kept verbatim as the measurement at `be72c537`, because it is the record of what the pricing
> was commissioned against. What has changed is the one thing it turned on, and the change is the
> whole of why the pricing matters more rather than less. Read this box first and §0 as history.
>
> **`POL.5` was authored, and the six unservable nodes are none.** #524 authored `POL.6`, `POL.7`,
> `EL.3`'s third L2 shape and two shapes each for `TRG.7` and `TRG.8`, which took the servable set
> to 61 and the instrument to 40; the stacked PR that authored `POL.5` took it to 62 and 62.
> Measured on the live derivation, prerequisite-closed, with `placementHorizon` cutting nothing
> because there is no era it cannot fully serve:
>
> | | count |
> |---|--:|
> | In-product nodes | 62 |
> | Content-servable | **62** |
> | …after prerequisite closure | 62 |
> | **Administered by the instrument** | **62** |
>
> **So the brief's premise is now true and this note's §0 is not.** The 62-node row below stops
> being *"a projection, not a servable instrument"* and becomes the instrument, which means the
> tail complaint is true of the scope that ships. Re-measured at the merged tip, n = 6,000, mild
> noise, `DEFAULT_WALK_POLICY` untouched: **median 38, p90 62, p99 70, max 70, 1.43% truncated /
> 1.78% spent the budget, truth accuracy 95.5% with 2.45 sent back.** Those reproduce §0's own
> 62-node row and §1's baseline to within the difference between walking the scope in teaching
> order and in registry order, so **nothing in the pricing below needs re-deriving** — every point
> on the curve was already measured at 62 nodes.
>
> **What DOES change is §5.4's timing argument**, which said the dial should not be flipped before
> the 62-node scope is reached. It has been reached. That is a decision and not a measurement, so
> it is left where it is; this box only records that its precondition is met.

The brief this was commissioned from opens *"All 62 nodes are now authored and servable — every era
is placeable and handed over."* **Measured at `be72c537`, on the live derivation
(`packages/item-bank/src/diagnostic-scope.ts`), that was not true.**

| | count |
|---|--:|
| In-product nodes | 62 |
| Content-servable (practice pool + ≥3 distinct items in each form) | **56** |
| …after prerequisite closure | 54 |
| **Administered by the instrument then** (closure, cut at the placement horizon) | **34** |

The six that were not servable, with why:

| node | why |
|---|---|
| `POL.5`, `POL.6`, `POL.7` | no authored content of any kind — no lesson pack, no practice pool, no templates |
| `EL.3`, `TRG.7`, `TRG.8` | practice pool, but zero walk items in either form |

`EL.3` also took `EL.4` and `EL.5` down with it through `prereqPrunedNodes`. **PR #524 ("Author
EL.3's third L2 shape, which brings EL.3, EL.4 and EL.5 into the instrument") was OPEN, not merged**
— read its `mergedAt`, not its title. The first era that could not fire was therefore still the
sixth (`renaissance`, blocked on `POL.6`/`POL.7`), so eras seven to ten remained unreachable as
placements and the horizon still cut there.

**What that changed about the urgency, and it was the most useful thing in this note.** The
instrument that a learner — and Friday's demo — actually took was the 34-node one, and it did not
have the problem:

| scope | nodes | median | p90 | p99 | max | ceiling binds |
|---|--:|--:|--:|--:|--:|--:|
| D1 (6) | 6 | 7 | 12 | 15 | 18 | 0.00% |
| **live at `be72c537` (34)** | **34** | **33** | **41** | **47** | **53** | **0.00%** |
| eras 1–7, projected (41) | 41 | 36 | 51 | 61 | 70 | 0.00% |
| **all 62 — a projection then, the live instrument now** | 62 | 38 | 62 | **70** | 70 | **1.47%** |

So the tail complaint was true of the scope the lead wanted to reach and false of the scope that
shipped. **Both are the same scope now**, which is what the box above records. Everything below
prices the fix for the day the first was reached; §5.4 says why it should not be flipped before
then, and that day has arrived.

*(The brief's table gives the 62-node ceiling rate as 1.43% and quotes the shipped trade as "94.7%
truth accuracy with about one already-mastered skill sent back per session". Measured here at
n = 6,000: **1.47% truncated / 1.73% spent the budget**, and **95.6% with 2.42 sent back**.
`rg 94.7` over `docs/`, `work-log/`, `engines/` and `apps/` returns nothing, so 94.7% is not a
figure this repository records; the nearest recorded ones are 95.6% at 62 nodes
(`docs/superpowers/specs/2026-08-01-diagnostic-placement-accuracy.md` §3.2) and 95.7% at the live
34. "About one sent back" matches the **21-node** row of that same table, 0.977.)*

---

## 1. Headline

**The tail is bought back with confirmation items, and the price is not accuracy.** Sweeping the
one dial from "confirm as today" to "stop confirming a pass at all", at the 62-node scope,
n = 6,000, mild noise:

| stop confirming a pass after | median | p90 | p99 | max | ceiling binds | truth accuracy | mastered sent back | gaps let through | skills the ceremony can name |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| **never (shipped)** | 38 | **62** | **70** | 70 | **1.47%** | **95.6%** | **2.42** | **0.33** | **6.22** |
| 45 items | 38 | 57 | 64 | 70 | 0.02% | 95.7% | 2.35 | 0.34 | 5.30 |
| 35 items | 38 | 54 | 60 | 66 | 0.00% | 95.6% | 2.34 | 0.36 | 4.38 |
| 30 items | 37 | 52 | 58 | 64 | 0.00% | 95.6% | 2.33 | 0.37 | 3.78 |
| 25 items | 37 | 50 | 56 | 62 | 0.00% | 95.6% | 2.32 | 0.38 | 3.08 |
| **20 items (recommended)** | **36** | **48** | **54** | **62** | **0.00%** | **95.6%** | **2.30** | 0.41 | 2.35 |
| 15 items | 35 | 46 | 52 | 58 | 0.00% | 95.6% | 2.28 | 0.46 | 1.66 |
| from the first item | 34 | **41** | 48 | 55 | 0.00% | 95.5% | **2.23** | **0.56** | **0.00** |

Read the columns in this order, because the surprise is in the last two:

1. **Truth accuracy does not move.** 95.5–95.7% across the entire dial. The aggregate is flat, so
   it cannot be the thing that decides this.
2. **The failure that hurts gets BETTER, monotonically.** Already-mastered skills sent back for
   review falls 2.42 → 2.23 as the tail is cut. Nothing is traded away to buy the tail in that
   direction; the tail was itself a source of the harm (§4.4).
3. **The price is paid in the other direction of error**, gaps let through: 0.33 → 0.56 per
   session. That is the direction INV-DIAG-7 asks the instrument to lean away from.
4. **And in something no accuracy number can see: the skills the game can NAME.** The completion
   ceremony names robust (clean 2/2) passes. Relieve confirmation and there are fewer of them, and
   at the far end of the dial there are none at all — 0.00 per session, **0% of sessions**, an
   ending that can congratulate the learner on nothing specific.

---

## 2. Both published baselines reproduce, digit for digit

Required before any new figure is worth reading. Same harness, same run, n = 6,000, mild noise:

| scope | figure | recorded | this run |
|---|---|---|---|
| D1 (6 nodes) | items med / p90 / p99 / max | 7 / 12 / 15 / 18 | **7 / 12 / 15 / 18** |
| 62-node | items med / p90 / p99 / max | 38 / 62 / 70 / 70 | **38 / 62 / 70 / 70** |
| 62-node | nodes med / p90 / p99 / max | 30 / 40 / 45 / 50 | **30 / 40 / 45 / 50** |
| 62-node | truth accuracy / sent back / gaps through | 95.6% / 2.417 / 0.332 | **95.6% / 2.42 / 0.33** |

The last row is from `docs/superpowers/specs/2026-08-01-diagnostic-placement-accuracy.md` §3.2 and
is reproduced here from a **third** independently written harness, which is the standard
`students.ts` sets: two harnesses that agree are evidence, one harness used twice is not.

---

## 3. Where the tail comes from, and it is not where §4.2 implies

The ratified amendment's claim that the weakest learner exits fastest **holds**. Its unstated
corollary is the whole problem. 62-node scope, shipped policy, mild noise, n = 6,000:

| how much the learner truly knows | share of cohort | items med / p90 / max | nodes probed | of those, costing 2+ items | passes that credited nothing |
|---|--:|--:|--:|--:|--:|
| 0–20% | 26.9% | 22 / 28 / 40 | 14.2 | 4.0 | 0.17 |
| 20–40% | 20.8% | 32 / 38 / 46 | 24.3 | 4.2 | 0.29 |
| 40–60% | 16.6% | 42 / 50 / 61 | 30.6 | 8.2 | 0.76 |
| 60–80% | 14.2% | 51 / 59 / 70 | 37.3 | 11.9 | 1.25 |
| **80–100%** | **21.4%** | **62 / 69 / 70** | 38.7 | **20.1** | 1.99 |

**The tail is the strong learner.** One learner in five knows most of the graph and answers
sixty-two questions to prove it, and the fifth column is the mechanism: for that learner twenty of
the thirty-nine probed nodes cost two items rather than one. A deep node's prerequisite closure is
large, a large closure is consequential, and a consequential pass buys a confirming item. So the
better the learner, the more of their walk is confirmation.

**Measured against the shipped threshold, that is most of the graph.** The in-scope prerequisite
closure over the 62 nodes is distributed `0: 8 nodes, 1–6: 23, 7–11: 31`, and the threshold is 7 —
so **half the graph is on the confirming side of it**, and it is the deep half a strong learner
reaches.

**The item distribution has no mode at all.** Under the shipped policy every three-item bucket from
15 to 71 holds between 2.3% and 8.4% of the cohort — the instrument's length is close to uniform
over its whole range, which is why the median describes almost nobody. Under the recommendation it
acquires one at 42–47 items, holding a quarter of the cohort, and falls to 0.1% above 56.

---

## 4. The levers, one at a time

Each was measured on its own. Three of the four came back negative, and the negatives are worth as
much as the positive.

### 4.1 Prerequisite inference — measured, worth almost nothing for the tail

The graph's 87 hard edges are **already** exploited: a pass licensed to infer credits its whole
in-scope prerequisite closure (`licensesInference`), and a confirmed failure prunes its whole
dependent cone (`deriveSelStatus`). The gap left is the borderline case INV-DIAG-8 names
explicitly — a mixed 2-of-3 pass credits nothing — so `inferOnMajorityPass` was added and swept.

| | median | p90 | p99 | max | accuracy | sent back | named |
|---|--:|--:|--:|--:|--:|--:|--:|
| shipped | 38 | 62 | 70 | 70 | 95.6% | 2.42 | 6.22 |
| + infer on a 2-of-3 pass | 37 | **62** | **70** | 70 | 95.6% | 2.38 | 6.20 |

**One item at the median and nothing whatever at p90.** The hypothesis behind it — that a strong
learner who slips once loses a whole inference cascade and pays to re-probe it — is real but rare.
§3's last column measures it: in the top ability band a session loses **1.99** cascades, against
**20.1** nodes paying for a confirmation on a pass they go on to clear cleanly. It is an order of
magnitude too small to be the tail's cause.

It is not worthless: it is the only lever measured here that **improves** accuracy (96.2% against
95.9% on the projected 41-node scope) while lowering sent-back, and it costs one item. But it
relaxes the one clause INV-DIAG-8 protects by name, and it moves the live D1 walk (p99 15 → 13,
max 18 → 15), which every policy change since #89 has held bit-identical. **Recorded, not
recommended.**

### 4.2 Early stopping per era — measured as a bound, and refused

Not implemented, because a bound settles it. `eraPlacementFromSeed` reads a placement as an era
decision — an era fires only when every one of its nodes passed, and the scan stops at the first
that does not — so a walk could in principle stop once the placed era is known. The bound below
assumes **perfect foreknowledge of the placed era**, which no real rule has, so it is generous to
the lever by construction.

62-node scope, shipped policy, mild noise, n = 6,000:

- **31.0 of 40.0 items per session (77.5%)** are spent on nodes in eras behind the placement.
- Those items buy **17.61 test-outs per session, of which 17.40 are skills the learner really
  holds.**

**So the lever's own price is 17.4 already-mastered skills sent back per session, against a current
2.42.** A sevenfold worsening of exactly the number the brief singles out as the one that hurts, to
save items the instrument is not otherwise struggling for. The reason is structural rather than
tunable: the era placement is only one of two things a diagnostic result does. The other is
per-node test-out (`unlockedNodeIdsFromPlacement`), which drops a passed skill into the city
already built **whichever era it belongs to** — so a node measured "for nothing" as far as the
placement goes is measured for a building. **Declined.**

### 4.3 Stopping the tail specifically — measured, and it works, but only to a point

`confirmBudget = X` stops confirming after X items. A walk shorter than X is bit-identical to one
run without it, so it cannot touch the median of a cohort whose median walk never reaches it —
which is the brief's own suggestion, and the safest thing on the list.

| | median | p90 | p99 | max | accuracy | sent back | ceiling |
|---|--:|--:|--:|--:|--:|--:|--:|
| shipped | 38 | 62 | 70 | 70 | 95.6% | 2.42 | 1.47% |
| confirmBudget = 45 | 38 | 57 | 64 | 70 | 95.7% | 2.35 | 0.02% |
| confirmBudget = 25 | 36 | 50 | 56 | 62 | 95.6% | 2.33 | 0.00% |

It does exactly what it says and it **abolishes truncation** at any setting at or below 45. What it
does not do is reach p90 41: a switch that only fires above 45 items can only shorten the part of
the walk above 45, and p90 62 is made of items 1 through 62.

### 4.4 A live consequence — the lever the measurement points at

`consequence` today is a **static** count: the node's whole in-scope prerequisite closure and its
whole in-scope dependent cone. That over-states what a decision can still cascade, because part of
the cascade has usually already happened — a pass whose prerequisites the walk has already credited
credits nothing, and buys a confirming item anyway. `livePassClosure` / `liveFailCone` count only
the members still `unknown`.

The two directions were measured apart, and they behave completely differently:

| | median | p90 | p99 | max | accuracy | **sent back** | gaps through | ceiling |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| shipped | 38 | 62 | 70 | 70 | 95.6% | 2.42 | 0.33 | 1.47% |
| **live PASS closure** | 34 | **41** | **48** | **55** | 95.5% | **2.23** | 0.56 | **0.00%** |
| **live FAIL cone** | 36 | **62** | **70** | 70 | 95.4% | **2.52** | 0.33 | 1.45% |
| both | 31 | 40 | 48 | 55 | 95.4% | 2.32 | 0.56 | 0.00% |

**The pass side carries the whole win; the fail side carries only harm.** Relieving the fail side
buys two items at the median, leaves p90 and p99 exactly where they were, and makes the metric that
hurts *worse* — 2.42 → 2.52 sent back — because an unconfirmed miss is a mastered skill failed on
one item. `liveFailCone` should stay off, and adding it to the pass side is strictly worse than the
pass side alone on both accuracy and sent-back.

**It also explains the ceiling.** Truncation goes to 0.00% not because the ceiling moved but
because nobody reaches it: the longest walk observed falls from 70 (the ceiling) to 55.

---

## 5. What relieving the pass side actually does, and the number that nearly hid

### 5.1 It empties the completion ceremony

Applied from the first item, `livePassClosure` produces **0.00 robust passes per session, in 0% of
sessions**. That is not a rounding of a small number; it is exact, over 6,000 walks.

The mechanism is the frontier bisection. It ascends, so by the time a node is probed its
prerequisites have usually been resolved already, its live closure is near zero, it is below any
threshold, and it decides on one item. A node decided on one item is never `robust`, and `robust`
is what `robustPassNodeIds` reports and what `completion-report.ts` intersects with the resolved
passes to produce `named_node_ids` — **the skills the ending congratulates the learner on by
name.** Under the shipped policy that list holds 6.22 skills and is non-empty for 59% of sessions.

Nothing in truth accuracy, sent-back or gaps-through moves when it goes to zero. It is invisible to
every number the brief asked for, and it is the reason this note has a fifth column.

### 5.2 The same cliff sits under the cheapest-looking candidate

Re-tuning `confirmScopeFraction` is the one change §3.4.1 already delegates to measurement, so it
looks like the cheap answer. Measured, `12/62` gives the best length figures on the table — 31 / 40
/ 47 / 53 — and it is **dominated on everything else**:

- **It also produces 0.00 named skills in 0% of sessions**, and for a blunter reason. The static
  prerequisite closure over the 62 nodes is distributed `{0: 8 nodes, 1–6: 23, 7–11: 31}` — **no
  node in the graph has a closure of 12.** A threshold of 12 does not tune pass-side confirmation,
  it switches it off. The knob is a cliff with an edge at 12, and nothing in the constant's name or
  its comment says so.
- **It breaks the live D1 walk**, which every policy change since #89 has held bit-identical:
  `confirmThresholdFor(6, 12/62) = 1`, so D1 goes 7 / 12 / 15 / 18 at 98.0% to 6 / 9 / 12 / 15 at
  **95.9%**, with already-mastered-sent-back **doubling from 0.12 to 0.24**. The scope-relative
  fraction exists precisely so the rule self-disables on a small scope; 12/62 is the value at which
  it stops doing that.
- It is worse than a live pass closure on truth accuracy (95.3% against 95.5%) and on sent-back
  (2.36 against 2.23) at a comparable length.

`8/62` is the honest version of the same idea — 34 / 53 / 62 / 70, 95.5%, 3.19 named — and it is
simply a weaker point on the same curve.

### 5.3 So the recommendation is the dial, set to 20

**`livePassClosure: true`, `liveConsequenceFrom: 20`** — read the consequence live, but only once
the learner has already answered twenty items.

| | 62-node (projected) | live 34-node (today) | D1 |
|---|---|---|---|
| items med / p90 / p99 / max | 38 / 62 / 70 / 70 → **36 / 48 / 54 / 62** | 33 / 41 / 47 / 53 → **29 / 33 / 35 / 42** | 7 / 12 / 15 / 18 → **unchanged** |
| ceiling binds | 1.47% → **0.00%** | 0.00% → 0.00% | 0.00% → 0.00% |
| truth accuracy | 95.6% → **95.6%** | 95.7% → **95.6%** | 98.0% → **98.0%** |
| mastered sent back | 2.42 → **2.30** | 1.42 → **1.38** | 0.12 → **0.12** |
| gaps let through | 0.33 → **0.41** | 0.05 → **0.11** | 0.00 → 0.00 |
| skills the ceremony names | 6.22 → **2.35** | 6.64 → **3.42** | 2.56 → **2.56** |
| sessions naming ≥ 1 skill | 59% → **58%** | 72% → **72%** | 97% → **97%** |

**Why 20 and not 0.** Twenty is below the median (38) and above the point where the ceremony
collapses. Everything the typical learner meets in their first twenty items is the instrument
exactly as it ships, so robust passes are still earned where the learner earns them, and the share
of sessions that name at least one skill does not move at all — 59% → 58% at 62 nodes, 72% → 72%
on the live scope. What falls is how MANY are named, not whether any are.

**Why not 0, stated as the trade rather than as a preference.** Setting it to 0 takes p90 from 48
to 41 and sent-back from 2.30 to 2.23, both better, and costs the entire named list and 0.15 more
gaps let through per session. If p90 41 is the requirement, that is the price, and it is a product
judgment about the ending rather than an accuracy one.

**It holds under noise.** At moderate noise (slip .15 / guess .10) the recommendation is 37 / 48 /
54 / 62 against the shipped 39 / 63 / 70 / 70, with truth accuracy 92.6% against 92.5% — the tail
cut does not decay when the responder gets noisier, which is the failure mode a tail policy tuned
on a clean cohort would show.

**D1 is bit-identical, and by construction rather than by luck.** `confirmThresholdFor(6, 7/62)`
is 0, and a threshold of 0 confirms every decision whatever the consequence is read as. The same
sentence INV-DIAG-7 already carries — *"on any scope small enough that the share rounds below one
node, every failure requires confirmation"* — is what protects it.

### 5.4 It should not be flipped today

Recorded as a recommendation about **when**, not only about **what**. Three reasons, in order:

1. **The instrument that ships does not have the problem.** 34 nodes, p90 41, worst case 53, the
   ceiling never binding (§0). Cutting a tail that does not exist buys nothing and costs the
   ceremony half its named skills.
2. **It costs a `scoring_model_version` bump** (§6), and that makes every existing pre/post pair
   `not_comparable` under INV-DIAG-5.
3. **The 62-node row is a projection.** Six nodes cannot be served, and the horizon still cuts at
   the sixth era. Flip it when the scope reaches past there — which is exactly the moment the
   figures in §1 start describing a real instrument.

---

## 6. What it costs to ship: reproducibility, the invariants, and which route

### 6.1 INV-DIAG-4 holds, and the mechanism is built and tested

A live consequence is not a static function of `(node, scope, graph)`, so re-adjudicating each
node **in isolation** — which is what `rebuildWalkState` did — cannot reproduce it.
`Diagnostic_Probe_Cost_Measurement.md` §13.2 is why the shipped rule is static: the constraint
`rebuildWalkState` imposes is *re-bucket and re-adjudicate, never replay*.

**The constraint is satisfiable without a replay.** `adjudicateRecordedWalk` (`walk.ts`) folds
along `routing_path` — an immutable record, already an input to `rebuildWalkState` — rebuilding the
resolution the walk had reached at each node and adjudicating against that. Probe **selection** is
never reconstructed; only the order it happened to produce, which is recorded. Under the shipped
static rules the fold is exactly equivalent to adjudicating each node alone.

Both halves are pinned in `engines/diagnostic/src/walk.test.ts`: a walk driven under
`livePassClosure` re-decides to a byte-identical `probed` map through the fold, and re-deciding the
same record under the static rules disagrees about at least ten of its nodes — so the fold is
load-bearing rather than decorative, and the rules genuinely have to travel with the record.

**One bound widens, and it is recorded rather than hidden.** Invalidating rows out of a stored
record already had a documented effect on adjudication (probe-policy §3.4). Under a live rule that
effect propagates forward along `routing_path` instead of stopping at the node whose rows were
dropped, because a changed result changes what every later node's cascade has left to reach.

### 6.2 Route A, not Route B, and the proof of why

§3.4.1 offers two routes for a rules change. **Route B (carry an additivity proof over a frozen
record population) does not close here**, and the exact reason is pinned in
`coverage-measurement.test.ts`:

- **Additive on every DECIDED node.** A live count is always ≤ the static one, and `adjudicate`
  reads `consequence` **only at `itemCount === 1`**. So at two items or more the two rule sets are
  the same function, and a node the static rule decided on one item had `reach < threshold`, which
  a smaller live reach also satisfies. Asserted exhaustively over every outcome sequence a
  static-rule record can hold, crossed with every live reading up to the static one.
- **Not additive on one reachable case.** A node the instrument ceiling left with a **single
  outcome and no decision**. The static rule holds it undecided and it resolves fail-closed; a live
  rule whose cascade has already happened decides it on that item. `recordScoredOutcome` handles
  the ceiling landing mid-node explicitly, so a **finalized** record can contain this — unlike
  PR #89's bound, which was confined to invalidation. The population is therefore not frozen and
  Route B's standard is not met.

"No such record exists today, because the live scope never truncates" is true and is precisely the
weak deployment leg `Answer_Equivalence_Spec.md` §13.13 refuses and §3.4.1 names as not
qualifying. **So: Route A.** Bump `COVERAGE_SCORING_MODEL_VERSION`, register the new rules beside
the outgoing entry in `RESOLUTION_RULES_BY_VERSION` (leaving version 2's literals in place), and
record the comparability impact — **on today's tree, every existing pre/post pair, all of which
were administered at version 2.**

### 6.3 INV-DIAG-7 and INV-DIAG-8: the spirit is preserved, the letter needs restating

Not a free pass, and it is Gabe's ruling rather than a measurement.

**What is preserved.** Both invariants exist to stop a cascade being taken on one item, and under a
live consequence nothing is pruned or credited on one item unless the cascade genuinely below the
threshold — the live count is the cascade. INV-DIAG-7's own justification is written that way:
*"a failure whose cone falls below that share may be taken on a single scorable item, **because
there is no subtree for it to remove**"*, and a cone already resolved has no subtree left to
remove. `robust` is **not** redefined: it is still exactly a clean 2/2, so the 0–3 placement scale
and the test-out boundary are untouched.

**What is not.** Both invariants quantify over the node's own closure and cone — *"a pass that
would credit a prerequisite closure reaching a defined share of the scope fires only on a robust
pass"* — and the live reading makes that clause **vacuous rather than satisfied**: no closure is
ever large once it has been credited, so the protected case stops occurring. §5.1 is what that
looks like from outside. An honest amendment would say so in the invariant text rather than lean on
the justification sentence.

`liveConsequenceFrom` narrows the gap without closing it: below the switch point the ratified rule
applies unchanged, so the clause bites for every learner's first twenty items and for the whole of
the D1 walk.

---

## 7. Method and reproduction

Same method as `Diagnostic_Probe_Cost_Measurement.md` §10, unchanged: the real engine
(`startWalk` / `recordScoredOutcome` / `resolveKnowledgeState`) over the real registry graph;
coherent synthetic students forced downward-closed over the actual DAG; three ability profiles
(homogeneous / heterogeneous / independent-strands) pooled; slip and guess injected at the responder
with every `(node, attempt)` response pre-drawn, so every comparison here is paired rather than two
independent samples. Seeds are the same expression every sibling harness uses, so the cohort is the
cohort those harnesses measured.

**Read `Diagnostic_Probe_Cost_Measurement.md` §13.7 before scoring any further policy on this
harness.** The student model makes same-depth same-domain nodes near-perfectly correlated, so a
policy that infers across siblings posts a fake win. Every candidate here is DAG-structural —
prerequisite closure and dependent cone only — and the three that change confirmation change no
inference at all, so they cannot exploit it; `inferOnMajorityPass` changes what is inferred but
still only a prerequisite closure.

Reproduce from the repo root:

```
echo 2000 > engines/diagnostic/sim/sample-size.local
npx vitest run --config engines/diagnostic/sim/vitest.sim.config.ts \
  engines/diagnostic/sim/tail-policy.sim.test.ts --disableConsoleIntercept
```

`--disableConsoleIntercept` is **required**: under vitest 4 a passing test's `console.log` is
swallowed without it, so the harness runs green and prints nothing — every figure here is a
`console.log`. `sample-size.local` is gitignored; **always check the printed `n=` before believing
a sample size.** Every figure above is `n=6000`, which is `SIM_N = 2000 × 3` pooled profiles. A
full run is about 4.5 minutes.

The harness is **excluded from CI by placement**, like its four siblings: it lives outside
`engines/diagnostic/src/`, so neither the root `vitest.config.ts` (`engines/**/src/**/*.test.ts`)
nor `vitest.browser.config.ts` collects it, and it is outside the package `tsconfig`
(`include: ["src/**/*"]`) so `tsc --build` never sees it.
`test/diagnosticSimScopeMirror.test.ts` asserts that exclusion, that the live-scope mirror in
`sim/liveScope.ts` still equals `DIAGNOSTIC_WALK_SCOPE` in the same order, and that both harnesses
reporting on the live scope read that mirror rather than a copy of their own.

---

## 8. What this decides, and what it does not

**Settled by measurement:**

- The 62-node tail is the **strong** learner, paying for confirmations on passes they clear
  cleanly, not the weak learner and not the multiplier in general (§3).
- Cutting it **does not cost aggregate truth accuracy** — 95.5–95.7% across the whole dial — and
  **improves** already-mastered-sent-back monotonically (§1).
- The cost is gaps let through (0.33 → 0.56 at the far end) and, invisibly to every accuracy
  number, the skills the completion ceremony can name (6.22 → 0.00) (§5.1).
- **Era early stopping is refused on its own numbers**: 17.4 mastered skills sent back per session,
  against 2.42 today (§4.2).
- **The fail side of a live consequence should stay off**: no tail benefit, and it makes sent-back
  worse (§4.4).
- **A naive re-tune of `confirmScopeFraction` to 12/62 is a cliff, not a slider** — no node in the
  graph has a closure of 12 — and it breaks the live D1 walk (§5.2).
- Turning any of this on is a **Route A** change, with a proof of why Route B does not close (§6.2).

**Not decided here, deliberately:**

- **Where on the dial to sit.** §5.3 recommends 20 and prices 0; both are one field.
- **Whether to flip at all, and when.** §5.4 recommends not before the scope passes the sixth era.
- Whether INV-DIAG-7/8's text should be restated to match a live reading, or the live reading
  refused as an amendment to them (§6.3). That is a ratification question, not a measurement.
- Anything about the six unservable nodes in §0. That is authoring, and it is what gates the whole
  question.
