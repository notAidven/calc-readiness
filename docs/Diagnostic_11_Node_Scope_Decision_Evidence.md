# Evidence for the two open decisions in the 11-node scope measurement §10

**Measured 2026-07-31 at `c870c0b5`. Status: MEASUREMENT RECORD — non-normative.**
Companion to `Diagnostic_11_Node_Scope_Measurement.md`, whose §10 leaves two questions
open. **This record decides neither.** Both are Gabe's calls; the purpose here is to make
them cheap to make by replacing the arguments with numbers.

The two open items, quoted from that §10:

- *"Whether 96.0% truth accuracy is acceptable, or whether the confirm fraction should be
  pinned to 0 for this scope (§6.2)."*
- *"Whether to widen at all, and on what schedule."*

**No production behaviour changed to produce this.** One harness was added
(`engines/diagnostic/sim/accuracy-cohorts.sim.test.ts`, excluded from CI by the same
mechanism as `probe-cost.sim.test.ts`); the cross-package probes were throwaways and were
deleted, following the precedent that note's §9 set for its own checker probe. §7 below is
the rebuild recipe.

`product_scope` was **not** flipped. The scope flip used in §4 was local and uncommitted,
and the tree was returned to `mvp = 6` before anything was committed.

---

## 1. Headline

| | answer |
|---|---|
| **Are era two's practice cells underfilled?** | **No — not one of the 15.** Every cell for all five nodes holds at least as many problem shapes as the mix gives it slots, and every node reaches **7 clean sets**, the maximum the 1×L1/2×L2/2×L3 mix admits. §3 is the per-cell table. |
| **Is the widen question really a content-depth question?** | **No.** The reframing is refuted, and refuted twice over: era two was never thin, and D1's thinness — the measurement the reframing rests on — was **fixed on 2026-07-30 by #291** and no longer reproduces at tip. §2. |
| **Does the walk still throw when scope widens, and why?** | **Yes, and the reason is not pools.** Era two's nodes have **0 of 3** items in the pack the diagnostic composes, and 3 of 3 in a pack it does not. Widening the pack retires the throw in one composition change and zero authoring. §4. |
| **What is left after that?** | **The checker change §2/§3 of the companion note already priced.** With the pack widened and v1 still composed, the throw is replaced by a wedge on `RAD.1`; with v2, the walk completes in 12 items and resolves 11 of 11. §4. |
| **What is 96.0% measured against?** | Per student, the fraction of the **11 scope nodes** whose resolved status matches a *synthetic* ground truth, binary on `passed`, denominated over the whole scope rather than the nodes probed. §5.1. |
| **Who pays the 1.5 points?** | **A 54.5% cohort pays 2.76 points; the other 45.5% pays nothing.** And within that, **100.8% of the cost sits on the four nodes that can take a one-item FAIL** — the three that can take a one-item PASS cost nothing at all. §5.2, §5.5. |
| **Does Evan's `check:graph` hazard check out?** | **Yes, measured.** With `product_scope` flipped for all five nodes, `check:graph` exits **0** and its asserted MVP count still reads `6 (expected 6)`. §6. |

**The two decisions are not symmetric in difficulty, and that is the most useful thing
here.** The widen question has no content-depth component to resolve: nothing needs
authoring, and what remains is exactly the checker migration the companion note already
costed. The accuracy question does have a live sub-decision, and it is finer-grained than
the binary §6.2 poses — see §5.6.

---

## 2. The reframing, tested rather than assumed — REFUTED

The reframing put to me was that the widen question is a content-depth question wearing an
instrument-width one: that D1 reaches only 4 clean practice sets against every other
domain's 7 because each of its six nodes has a two-slot difficulty cell holding one
template, and that **if era two is thin in the same shape**, widening the instrument onto
those nodes makes the walk throw for a reason no instrument work addresses.

The premise is checkable and it is false. Two separate things are wrong with it.

### 2.1 Era two was never thin in that shape

The pool audit the reframing cites is
`docs/superpowers/specs/2026-07-29-economy-measured-at-tip.md` §6.2, and **its own table
already answers the question**: it records D1's six nodes at 4 clean sets and, on the two
rows immediately below, `EXP.1`/`RAD.2` and `RAD.1`/`RAD.3`/`RAD.4` at **7**. Era two sat
in the deep tier, not the thin one, on the very measurement offered as grounds for
suspecting it.

Measured directly at `6db302f5` — the commit immediately before #291 — in a worktree, so this is the state the audit described:

| pool | node | binding cell | slots | templates | instances | clean sets |
|---|---|---|--:|--:|--:|--:|
| D1 | `NUM.S` | L3 | 2 | **1** | 8 | **4** |
| D1 | `NUM.F` | L3 | 2 | **1** | 8 | **4** |
| D1 | `NUM.2` | L2 | 2 | **1** | 8 | **4** |
| D1 | `NUM.3` | L3 | 2 | **1** | 8 | **4** |
| D1 | `NUM.4` | L3 | 2 | **1** | 8 | **4** |
| D1 | `NUM.5` | L3 | 2 | **1** | 8 | **4** |
| D2 | `EXP.1` | L1 | 1 | 1 | 7 | **7** |
| D2 | `RAD.1` | L1 | 1 | 1 | 7 | **7** |
| D2 | `RAD.2` | L1 | 1 | 1 | 7 | **7** |
| D2 | `RAD.3` | L1 | 1 | 1 | 7 | **7** |
| D2 | `RAD.4` | L1 | 1 | 1 | 7 | **7** |

The mechanic is worth stating because it makes the whole question arithmetic rather than
empirical. A cell's instance count is fully determined by its template count:
`instances = slots + RETRY_VARIANTS_PER_CELL × templates`, with
`RETRY_VARIANTS_PER_CELL = 6` in every pool. So a two-slot cell holds `2 + 6 = 8`
instances on one template and `2 + 12 = 14` on two, and clean-set depth
`⌊instances / slots⌋` steps from **4 to 7** the moment a second shape lands.

**Seven is where the mix parks, not a score.** A 2-slot cell on `t` shapes gives
`⌊(2 + 6t)/2⌋ = 1 + 3t`, so two shapes gives exactly 7; a 1-slot cell on one shape gives
`1 + 6 = 7` too. A node reads *above* 7 only if **every** cell clears that bar at once — two
shapes in the one-slot L1 and three in each two-slot cell — so 7 is what any node hits as
soon as its thinnest cell is merely adequate. That is why 39 nodes all read exactly 7, and
why "reaches 7" should be read as "has no short cell", not as a depth achievement.

(`RETRY_VARIANTS_PER_CELL` is 6 in all eight domain pools and in the interactive pool, so
the arithmetic is uniform across the tree.)

### 2.2 D1's thinness no longer reproduces either — it was fixed the next day

#291 *"Diversify D1 practice shapes so no first set repeats a question type"*
(`anthony/d1-practice-diversity`) merged into `integration` at **2026-07-30T20:38:27Z**,
merge commit `cd13f968`, `mergedAt` read from the API rather than inferred. It added a
second template to each of the six binding cells. Measured at tip (`c870c0b5`), every D1
cell is shape-clean and every D1 node reads **7**:

| pool | nodes | every 2-slot cell has ≥2 shapes? | clean sets |
|---|---|---|--:|
| D1 | `NUM.S` `NUM.F` `NUM.2` `NUM.3` `NUM.4` `NUM.5` | yes | **7** |
| D2 | `EXP.1` `RAD.1` `RAD.2` `RAD.3` `RAD.4` | yes | **7** |
| D3, D4, D5, D7, D8, D10 | 28 further nodes | yes | **7** |

**All 39 served nodes across all eight pools now read 7, and not one cell anywhere is
shape-short.** The 4-vs-7 gap the reframing rests on is closed history, and D2 was never
in it.

This is the ordinary way a finding goes stale: it was accurate when recorded on 2026-07-29
and a merge on 2026-07-30 voided it. Worth noting because the reframing invited a large
authoring run off a two-day-old number.

### 2.3 The thinness that DOES exist is in a different population

The reframing conflates two pools that share a vocabulary and nothing else. **Practice
templates** feed lesson practice; **walk assessment items** (`D1_WALK_ITEM_PACK`,
`PRODUCT_ITEM_PACK`) are what the diagnostic serves. The walk never draws a practice
template, so practice depth cannot make the walk throw at any value — including zero.
Authoring practice templates would have retired nothing.

**And the walk pool is not thin either.** Measured over both packs, every one of the 21
authored nodes holds exactly `MAX_PROBE_ITEMS = 3` items per (form, node) — exactly what
the 2-of-3 rule needs, for all five era-two nodes on both forms. §4.

---

## 3. The per-cell gap table — all five era-two nodes, every cell

Measured at `c870c0b5` over `D2_PRACTICE_TEMPLATES` and `D2_PRACTICE_ITEMS`
(`D2_PRACTICE_POOL` ∪ `D2_PRACTICE_VARIANTS`), against `D2_PRACTICE_MIX` = 1×L1 / 2×L2 /
2×L3. **Gap** is the number of templates the cell is short of its slot count, which is the
standard `d2.test.ts:217` holds cells to (*"never serves one problem shape twice in a cell
that has more than one"*).

| node | cell | slots | templates | instances | clean sets | **gap (templates owed)** |
|---|---|--:|--:|--:|--:|--:|
| `EXP.1` | L1 | 1 | 1 | 7 | 7 | **0** |
| `EXP.1` | L2 | 2 | 3 | 20 | 10 | **0** |
| `EXP.1` | L3 | 2 | 2 | 14 | 7 | **0** |
| `RAD.1` | L1 | 1 | 1 | 7 | 7 | **0** |
| `RAD.1` | L2 | 2 | 2 | 14 | 7 | **0** |
| `RAD.1` | L3 | 2 | 2 | 14 | 7 | **0** |
| `RAD.2` | L1 | 1 | 1 | 7 | 7 | **0** |
| `RAD.2` | L2 | 2 | 3 | 20 | 10 | **0** |
| `RAD.2` | L3 | 2 | 2 | 14 | 7 | **0** |
| `RAD.3` | L1 | 1 | 1 | 7 | 7 | **0** |
| `RAD.3` | L2 | 2 | 2 | 14 | 7 | **0** |
| `RAD.3` | L3 | 2 | 2 | 14 | 7 | **0** |
| `RAD.4` | L1 | 1 | 1 | 7 | 7 | **0** |
| `RAD.4` | L2 | 2 | 2 | 14 | 7 | **0** |
| `RAD.4` | L3 | 2 | 2 | 14 | 7 | **0** |

**Fifteen cells, fifteen zeros.** Two cells (`EXP.1` L2, `RAD.2` L2) carry a third shape
and sit above the requirement at 10.

**And the assessment side, which is the population that actually gates the walk:**

| node | items in `D1_WALK_ITEM_PACK` (A/B) | items in `PRODUCT_ITEM_PACK` (A/B) | 2-of-3 needs | **gap** |
|---|---|---|--:|--:|
| `EXP.1` | 0/0 | **3/3** | 3 | **0** |
| `RAD.1` | 0/0 | **3/3** | 3 | **0** |
| `RAD.2` | 0/0 | **3/3** | 3 | **0** |
| `RAD.3` | 0/0 | **3/3** | 3 | **0** |
| `RAD.4` | 0/0 | **3/3** | 3 | **0** |

**No authoring is owed on either population.** The `0/0` column is not a gap in the item
bank — it is the composition fact §4 is about.

**Nothing frozen was touched, because nothing needed to be.** D2's assessment items for
`RAD.1`–`RAD.3` are frozen under `hashItemDefinition` over `{node_id, prompt, answer}`;
since the gap table is all zeros, no template was written and no hash could move. `git log
6db302f5..HEAD -- packages/item-bank/src/d2 packages/item-bank/src/__snapshots__/d2.test.ts.snap`
is empty, so D2's pool is byte-identical to the pre-#291 state as well. **Item-bank
snapshots are byte-identical on this branch: no file under `packages/item-bank/` is
modified.**

---

## 4. Flip and walk — what actually throws, and what retires it

`product_scope` was flipped `target → mvp` for the five nodes locally, `npm run test:unit`
was run, and the flip was reverted. **Not committed.**

### 4.1 The throw reproduces, with the message the reframing was reading

Two distinct throws fire, and both name era two:

```
walk item source has no attempt 0 for form A node RAD.1 (pool too thin for the 2-of-3 rule)
item bank has no item for form A node EXP.1 L2
item bank has no item for form B node EXP.1 L2
```

**The first message is misleading and is the origin of the whole content-depth reading.**
`createItemPackWalkSource` (`packages/item-bank/src/bank.ts`) emits *"pool too thin for the
2-of-3 rule"* whenever a requested `attempt` is absent — which is equally true of a pool
holding two items and of a pool holding **none**. Here it is none: the diagnostic's
composition points default `itemPack = D1_WALK_ITEM_PACK`, which holds 36 items across the
six D1 nodes and nothing for era two, while the scope those points derive from
(`getNodesByScope("mvp")`) has just become 11. A pack that is missing a node entirely
reports itself as a thin pool.

The second throw is the **legacy v1 MST path**, not the walk: `createD1MultistageSpec`
(`engines/diagnostic/src/routing.ts:63`) builds its stage slots from
`getNodesByScope("mvp")` too, so it asks `D1_ITEM_PACK` for `EXP.1` L2.

### 4.2 Widening the pack retires the throw, and reveals the real blocker

The real walk driven end-to-end at 11-node scope, acing every item, over three
compositions:

| composition | outcome | detail |
|---|---|---|
| `D1_WALK_ITEM_PACK` + v1 checker (today) | **THROW** | after 1 item, at `NUM.2`: *no attempt 0 for form B node `RAD.1`* |
| `D1_WALK_ITEM_PACK` + `PRODUCT_ITEM_PACK` + v1 checker | **WEDGE** | `RAD.1` item `prod.rad-1.l2:B:221000` re-served 4× after 5 items; status `invalid_input` / `unsupported_syntax` |
| `D1_WALK_ITEM_PACK` + `PRODUCT_ITEM_PACK` + **v2 checker** | **COMPLETE** | 12 items; **11 of 11** scope nodes resolved, all `passed`; coverage 1.000; 6 nodes probed; `ceiling_reached` false; **0 non-scorable** |

**The throw is gone the moment the pack is widened — one composition change, zero
authoring.** What it exposes underneath is precisely the wedge the companion note's §2
predicted, on precisely the node it predicted (`RAD.1`, `sqrt(...)` outside v1's function
grammar), and precisely the failure mode §2(a) warned is invisible: `invalid_input`, not in
`FAULT_STATUSES`, so the administration would hang at a 0% fault rate.

The third row is also an **independent reproduction of the companion note's §4 headline**
from a different code path: 12 items and 6 nodes probed, matching its 12-item median and
6-node median exactly.

### 4.3 Answering the question as put: does filling the cells retire the widen question?

**No, because there are no cells to fill.** The question dissolves, but not in the
direction the reframing predicted: it dissolves because the content is already there, not
because authoring would fix it. The residue is a **wiring-and-checker** change, and it is
exactly the one already scoped in §3 of the companion note — move `equivalence_checker_version`
to 2 atomically across `aurora-server.ts`, `browserRuntime.ts` and `walk-runtime.ts`, and
widen `itemPack` at the same two composition points. Nothing in this measurement adds to
that bill or subtracts from it.

### 4.4 The blast radius, which is much larger than the diagnostic

The brief anticipated **82** unit failures. At `c870c0b5` the flip produces **240 failed
tests across 47 files** (187 in `@cr/web`, 54 in `packages`), 138 unhandled errors. The 82
does not reproduce; the most likely reason is that the figure predates the winter/city demo
lane, which has since grown a large scope-derived test surface. Attributed by root cause:

| root cause | failing tests | lane |
|---|--:|---|
| `Neighborhood D2 is 'architected' but the registry has 5 built (mvp) node(s)` and its downstream *"Unable to find role=button /Buildings/"* cascade | ~130 | `engines/game` + city/winter |
| `no test cell for EXP.1` — hardcoded `CELL_FOR` fixtures keyed to six nodes | 9 | winter/city tests |
| Assertions pinning a 6-node expectation (`toHaveLength(6)`, node-list equality) | ~30 | diagnostic, item-bank, skill-graph, city |
| `item bank has no item for form A/B node EXP.1 L2` — legacy v1 MST path | 4 | item-bank, diagnostic-runtime |
| `walk item source has no attempt 0 ... RAD.1` — the walk pack | 2 | diagnostic-runtime |

**Only 6 of the 240 are the item-pack story.** The dominant cost of a scope flip is not the
diagnostic at all: it is `engines/game`'s neighborhood-descriptor guard, which refuses to
resolve a `D2` neighborhood that is `architected` while the registry reports built nodes in
it. That is a real gate and it is in the demo lane, so it is reported here and left alone.
Anyone scoping the widen should budget for it as the largest line item.

---

## 5. The 96.0% truth-accuracy figure

Reproduced and decomposed by `engines/diagnostic/sim/accuracy-cohorts.sim.test.ts`,
n = 6,000 (2,000 × 3 pooled profiles), mild noise (slip 0.10 / guess 0.05), published
method unchanged.

### 5.1 What the figure is measured against

Truth accuracy is, per student, **the fraction of the 11 scope nodes whose resolved status
matches that student's generated ground truth**, averaged over students. Four properties of
that definition change how the number should be read:

- **Binary on `passed`.** `resolveKnowledgeState`'s `failed`, `pruned` and absent all
  collapse to "not passed". A node the walk measured and failed and a node it never reached
  score identically.
- **Denominated over the whole scope**, not the nodes probed. At a median of 6 probed nodes
  of 11, roughly **five of the eleven** are graded on inference and pruning rather than on
  an answer.
- **Ground truth is synthetic.** It is the coherent downward-closed known-set of a modelled
  student, so this is a measure of the instrument's self-consistency against a model — not
  of placement validity against a human. The companion note's §9 warning applies: the
  student model makes same-depth same-domain nodes near-perfectly correlated.
- **It is an average over students**, so it says nothing on its own about whether the error
  is spread thin or concentrated. §5.2 is that question.

Anchor, reproduced digit for digit against §4 and §6.2:

| policy | items med | items mean | truth accuracy | single-item decisions/session |
|---|--:|--:|--:|--:|
| shipped (`confirmThreshold = 1`) | 12 | 11.79 | **96.0%** | 1.14 (0.539 pass + 0.604 fail) |
| threshold pinned to 0 | 13 | 13.58 | **97.5%** | 0.00 |

### 5.2 The cohorts — the precedent shape holds, but the population is inverted

The 70-item ceiling work (`Contracts_Amendment_Diagnostic_Probe_Policy.md` §6) established
why an aggregate cannot settle this: *"A ceiling's cost never shows up in the aggregate,
because the aggregate averages over a population most of which never reaches it."* Applied
here, splitting on whether the shipped run decided any node on a single item:

| cohort | share of all | accuracy, shipped | accuracy, pinned | delta | items med, shipped | items med, pinned |
|---|--:|--:|--:|--:|--:|--:|
| **touched** (≥1 single-item decision) | **54.5%** | **93.8%** | 96.5% | **−2.76 pts** | 11 | 13 |
| untouched | 45.5% | 98.7% | 98.7% | **0.00 pts** | 12 | 12 |

*Consistency floor: the untouched cohort's delta is 0.0000 pts, which it must be — both
policies take an identical path for a student with no single-item decision — so a non-zero
value there would mean the cohort definition had missed the mechanism. Cohort sizes sum to
6,000 of 6,000.*

**So −1.5 aggregate points is −2.76 points on a 54.5% cohort and nothing on the rest.**

**And here the analogy to the ceiling precedent breaks in the way that matters.** The
ceiling's affected cohort was **1.7%** of students and shrinking — the win was *"nine-tenths
of that cohort never being truncated, not a better experience for those who still are."*
There is no equivalent consolation available here: the affected cohort is a **majority of
all students**, and it does not shrink with any knob in this decision. Whatever 96.0% is
worth, it is not worth it for the reason the ceiling's 95.6% was.

Graded by exposure, the relationship is non-monotonic, which is worth knowing before anyone
reads a dose-response into it:

| single-item decisions | share of all | shipped | pinned | delta |
|--:|--:|--:|--:|--:|
| 0 | 45.5% | 98.7% | 98.7% | 0.00 |
| 1 | 25.6% | 93.9% | 98.1% | **−4.19** |
| 2 | 7.2% | 87.9% | 92.5% | **−4.56** |
| 3 | 12.5% | 93.7% | 93.9% | −0.18 |
| 4 | 9.1% | 98.1% | 98.9% | −0.88 |
| 5 | 0.0% | 100.0% | 100.0% | 0.00 |
| 7 | 0.0% | 90.9% | 100.0% | −9.09 |

More single-item decisions do not mean worse placement: a student with 4 is barely harmed,
one with 2 is harmed most. Exposure count is confounded with ability, because *which* nodes
a walk reaches at all depends on how the student is doing.

### 5.3 The direction of the error, which accuracy cannot show

An accuracy point is not a unit of harm. The companion amendment's §6 tables reported
*"mastered nodes told to rebuild"* alongside accuracy for exactly this reason. Split by
direction, per session:

| policy | cohort | mastered skills sent back for review | real gaps advanced past |
|---|---|--:|--:|
| shipped (threshold 1) | all students | 0.426 | 0.011 |
| pinned to 0 | all students | 0.263 | 0.008 |
| shipped (threshold 1) | **touched cohort** | **0.666** | 0.018 |
| pinned to 0 | **touched cohort** | 0.368 | 0.013 |

**The threshold-1 cost is paid almost entirely in redundant review, not in missed gaps.**
It adds **0.163** mastered-skills-sent-back per session across all students (0.298 on the
touched cohort) and **0.003** real-gaps-advanced-past. The error runs ~39:1 in the
fail-closed direction, which is the safe one: the learner loses time, not foundation. That
is a materially gentler reading than "1.5 accuracy points" conveys, and it is the framing
the decision should probably be made in.

The reason the asymmetry is so strong is the noise model itself: a truly-known node fails
one item at the slip rate (0.10), a truly-unknown node passes one at the guess rate (0.05),
so a one-item error is twice as likely to be a false negative before any graph structure is
considered. Of the single-item decisions themselves, **18.4% are the wrong call** (0.210 of
1.14 per session).

### 5.4 The two halves have a ~30× different exchange rate

A one-item PASS and a one-item FAIL are permitted on **disjoint node sets** (§6.1 of the
companion note), so they can be priced separately. Isolating students with exactly one
decision of one kind and none of the other, paired against their own threshold-0 run:

| student had | n | items saved | accuracy, shipped | accuracy, pinned | accuracy cost |
|---|--:|--:|--:|--:|--:|
| exactly 1 one-item **PASS**, 0 fails | 671 | 1.12 | 98.4% | 98.5% | **−0.14 pts** |
| exactly 1 one-item **FAIL**, 0 passes | 866 | 2.00 | 90.4% | 97.8% | **−7.33 pts** |

**A one-item pass costs 0.14 points and saves 1.12 items. A one-item fail costs 7.33 points
and saves 2.00 items.** In items-per-accuracy-point that is 8.0 against 0.27 — a factor of
about thirty. The trade §6.2 presents as one exchange rate is two, and they are not close.

### 5.5 Where the 1.5 points land, reconciled arithmetically

| node | depth | passClosure | failCone | one-item decisions/session | wrong calls/session | accuracy shipped | accuracy pinned | delta |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| `NUM.3` | 0 | 0 | 6 | 0.263 | 0.001 | 99.3% | 99.2% | +0.05 |
| `NUM.F` | 0 | 0 | 8 | 0.127 | 0.002 | 99.5% | 99.5% | 0.00 |
| `NUM.S` | 0 | 0 | 7 | 0.149 | 0.001 | 99.7% | 99.7% | +0.07 |
| `NUM.2` | 1 | 2 | 6 | 0.000 | 0.000 | 97.6% | 97.5% | +0.02 |
| **`NUM.5`** | 1 | 1 | **0** | 0.190 | 0.085 | 90.5% | 97.4% | **−6.90** |
| `NUM.4` | 2 | 4 | 5 | 0.000 | 0.000 | 97.3% | 97.3% | 0.00 |
| `EXP.1` | 3 | 5 | 2 | 0.000 | 0.000 | 97.7% | 97.7% | 0.00 |
| `RAD.1` | 3 | 5 | 3 | 0.000 | 0.000 | 96.5% | 96.5% | 0.00 |
| **`RAD.2`** | 4 | 6 | **0** | 0.141 | 0.043 | 92.4% | 96.0% | **−3.62** |
| **`RAD.3`** | 4 | 7 | **0** | 0.138 | 0.039 | 92.8% | 95.9% | **−3.08** |
| **`RAD.4`** | 4 | 7 | **0** | 0.136 | 0.039 | 93.0% | 96.1% | **−3.10** |

**Reconciliation.** The four nodes that can take a one-item fail (`failCone < 1`) sum to
**−16.70** node-points; all seven others sum to **+0.13**. Total −16.57 over 11 nodes =
**−1.506 pts**, against a headline aggregate delta of **−1.506 pts** — residual **0.0000**.
So the attribution is measured, not argued: **the one-item-FAIL nodes carry 100.8% of the
cost**, the >100% being the marginal amount by which every other node is very slightly
*better* under the shipped policy.

### 5.6 Two corrections to the companion note's §6.2, and the option they open

§6.2 currently reads: *"The accuracy cost is entirely **local mis-measurement of the seven
cascade-free nodes**: one item is noisier than 2-of-3, so **a slip on `NUM.S`** records a
failure that a confirming item would have caught."*

**Both specifics are wrong, on that section's own §6.1 table.**

1. **A slip on `NUM.S` cannot record a one-item failure.** `NUM.S` has `failCone = 7`, and
   `adjudicate` defers whenever `reach >= confirmThreshold` (`adjudicator.ts:152`), so a
   miss on `NUM.S` buys a confirming item exactly as the ratified rule would. §6.1's own
   row says `one-item fail? no`. Measured, `NUM.S` contributes **+0.07** points — it is one
   of the nodes that is marginally *better* under the shipped policy.
2. **It is four nodes, not seven.** The seven cascade-free-in-one-direction nodes split into
   three that can take a one-item PASS (`NUM.3`, `NUM.F`, `NUM.S` — cost: nothing) and four
   that can take a one-item FAIL (`NUM.5`, `RAD.2`, `RAD.3`, `RAD.4` — cost: all of it).
   §6.2 merges the two groups, which is what hides that the trade is separable.

**This is not pedantry, because it changes what the decision is.** §6.2 poses a binary —
accept 96.0%, or pin `confirmScopeFraction` to 0 for the whole scope and pay 1.8 items,
*"which would make the 11-node walk behave differently from the 62-node one, which is
exactly what the scope-relative fraction exists to avoid."* The decomposition shows a third
option: **confirm one-item FAILS while leaving one-item PASSES alone.** On these numbers
that recovers essentially all of the accuracy (the +0.13 node-points the pass nodes
contribute is the whole of what would be left on the table) while keeping the cheap half of
the item saving — the 0.539 passes per session at 1.12 items each.

**Two honest caveats on that option, because it is not free and I have not priced it.**
It is a change to `adjudicate`'s gate — asymmetric thresholds for pass and fail — not a
constant re-tune, so it is **not** covered by the §3.4.1 delegation of authority over
`confirmScopeFraction`'s value and would return to the §7 ratification gate. And it would
make the 11-node walk behave differently from the 62-node one in a *new* way, which is the
objection §6.2 raises against pinning. **I did not measure it**: doing so faithfully needs
that production gate to change, and the harness method forbids reimplementing the engine
around it. What is measured is the bound — where the cost is, and what the pass half is
worth — which is enough to say the option is worth pricing before the binary is answered.
**Whether any of this is acceptable remains Gabe's call and this record does not make it.**

---

## 6. Evan's `check:graph` hazard — verified independently, and it is real

The claim: `check:graph`'s MVP count reads `status` rather than `product_scope`, so flipping
only `product_scope` moves no guard. Verified by reading and then by running it, since a
guard-population claim is the kind this repo has been bitten by repeatedly.

**By reading.** `packages/skill-graph/test/graph_invariants.py` derives the asserted set
from lifecycle status:

```python
EXPECTED_MVP_COUNT = 6
mvp_ids = {n["id"] for n in nodes if n["status"] == "active_mvp"}
```

and its `product_scope` block is labelled in the source itself — *"product-scope +
lesson-shell counts (computed, **never asserted**)"*. The only assertions that read
`product_scope` are the lesson-shell presence rules, and those cannot move on this flip:
`mvp` and `target` are both in-product, so a node moving between them keeps the same
obligation.

**By running.** Before and after the local flip of all five nodes:

| | `mvp` population (printed) | MVP lesson shells (printed) | **asserted MVP node count** | exit |
|---|--:|--:|---|--:|
| unflipped | 6 | 3 | `6 (expected 6)` | **0** |
| all five flipped to `mvp` | **11** | **7** | `6 (expected 6)` | **0** |

`All graph invariants PASS. (87 hard edges over 62 live nodes)` in both cases.

**Confirmed: the flip moves the two printed numbers by five and four respectively, and
moves no assertion at all.** The guard is not vacuous in general — flipping `status` would
fire it — it is watching a different field from the one the product composes
(`getNodesByScope("mvp")`, which is what `citySession.ts:377`, `aurora-server.ts:265`,
`routing.ts:63` and `reads.ts` all read). So the field that changes behaviour is unguarded
and the field that is guarded changes nothing.

**Evan's two-set equality assertion is his to land and I have not touched
`graph_invariants.py`.** One note for whoever reviews it, from the §5 rule on exemptions: a
two-set equality between the `status`-derived and `product_scope`-derived MVP sets is
exactly the right shape, and it will need a **count floor** beside it, because set equality
holds trivially if a refactor ever leaves both sets empty.

---

## 7. Method and reproduction

**§5 (the cohort decomposition)** is a landed harness, and it is excluded from CI by the
same mechanism as `probe-cost.sim.test.ts` — verified rather than assumed: the root config
lists **6,287** tests including **98** from `engines/diagnostic/src` and **zero** from
either sim file, and `engines/diagnostic/tsconfig.json` includes only `src/**/*`, so
`tsc --build` never sees it.

```
echo 2000 > engines/diagnostic/sim/sample-size.local
npx vitest run --config engines/diagnostic/sim/vitest.sim.config.ts \
  engines/diagnostic/sim/accuracy-cohorts.sim.test.ts --disableConsoleIntercept
```

**`--disableConsoleIntercept` is required, and this applies to the companion note's §9
command too.** Under vitest 4.1.10 a passing test's `console.log` is swallowed without it,
so both harnesses run green and print nothing at all. Always check the printed `n=` before
believing a sample size; every §5 figure is `n=6000`.

**§2's pre-#291 measurement** was taken in a throwaway worktree at `cd13f968^1`
(= `6db302f5`) with `node_modules/@cr/*` repointed into the worktree so the packages
resolved to that tree rather than to tip. The worktree was removed.

**§3 and §4 were throwaway probes**, deleted, following the precedent the companion note's
§9 set for its own checker probe (*"was a throwaway and was deleted; §2 records its
output. It is cheaply rebuilt."*). They are cheaply rebuilt:

- **§3, the per-cell census.** For each pool, group `<D>_PRACTICE_TEMPLATES` and
  `<D>_PRACTICE_ITEMS` by `(node_id, difficulty)` and compare template count against the
  slot count in `<D>_PRACTICE_MIX`; clean-set depth is `min` over cells of
  `⌊instances / slots⌋`. For the walk packs, group `D1_WALK_ITEM_PACK ∪ PRODUCT_ITEM_PACK`
  by `(form, node_id)` and compare against `MAX_PROBE_ITEMS`.
- **§4, the composition walk.** Compose `createWalkRuntime` over
  `createItemPackWalkSource(pack)` with `config.scope` set to the 11 ids explicitly (no
  graph edit needed — derive them as `probe-cost.sim.test.ts` does, filtering
  `getProductNodes()` to domains D1 and D2), ace every item off `answer.answer_key`, and
  detect a wedge by counting re-serves of the same `item_version_id`. Run it three times:
  `D1_WALK_ITEM_PACK` with `createD1AnswerChecker`, the combined pack with
  `createD1AnswerChecker`, and the combined pack with `createProductAnswerChecker` at
  `PRODUCT_CHECKER_VERSION`.

These are cross-package probes — they need `@cr/item-bank`, `@cr/scorer` and
`@cr/diagnostic-runtime`, all of which sit *downstream* of `@cr/diagnostic` — which is the
other reason they are not landed in `engines/diagnostic/sim/`: importing them there would
run an edge backwards against `item-bank`'s declared dependency on `@cr/diagnostic`.

**The §4 flip** was `product_scope: "target" → "mvp"` on the five nodes in
`packages/skill-graph/src/skill_graph.json`, reverted with `git checkout` before any commit.
`npm run check:graph` reads `mvp 6` and `MVP node count: 6 (expected 6)` on this branch.

---

## 8. What this record does not do

- It does **not** decide whether 96.0% is acceptable, and does not decide the confirm
  fraction. §5.6 adds an option and prices its bounds; the ruling is Gabe's.
- It does **not** flip `product_scope`, and takes no position on whether or when to widen.
- It does **not** touch `packages/skill-graph/test/graph_invariants.py`. §6 verifies the
  hazard; the fix is Evan's.
- It does **not** address the coverage-denominator consequence of a scope change, which
  `Diagnostic_Probe_Cost_Measurement.md` §11(C) still flags as open.
- It does **not** touch the winter or three.js city lanes. §4.4 reports that the
  `engines/game` neighborhood guard is the single largest line item in a scope flip's blast
  radius, and leaves it to its owners.
