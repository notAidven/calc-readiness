# Inferring era one instead of asking about it — and the prior every diagnostic figure was measured against

**Measured 2026-08-05 at `09c9c5d1` (the `integration` tip). Status: MEASUREMENT RECORD —
non-normative.** Owner: Gabe (diagnostic lane). Companion to
`Diagnostic_Tail_Policy_Measurement.md` (the tail curve), `Diagnostic_Tail_Cut_Landed.md`
(what shipped) and PR #606 (the
coverage lever, **OPEN — `mergedAt: null`**, so its harness is not in this tree).

**Nothing here changes a policy, a constant or a scope.** `DEFAULT_WALK_POLICY` is read and
never spread over except in one clearly-marked control. Every instrument below is a scope
composed locally and handed to the shipped engine, plus an assumption recorded explicitly.
The harness is `engines/diagnostic/sim/era-inference.sim.test.ts`, excluded from CI by
placement like its six siblings.

---

## 0. Read this first: the simulation's learner prior is uniform, and it is load-bearing

The brief predicted this and it is true, so it goes at the top rather than in a methods
section.

`students.ts`'s generator draws **`ability = rand() * (maxDepth + 1)`** — a uniform draw
over the depth range `[0, 8)`. Era one is exactly one domain (`D1`), and the generator
takes one ability cut per domain, so **a synthetic learner's entire era-one competence is a
single uniform draw against a threshold, not six skills.** Measured at n = 6,000:

| | share of the cohort |
|---|--:|
| holds all six era-one nodes | **74.6%** |
| holds five (`NUM.4` missing) | 11.9% |
| holds three (only the depth-0 nodes) | 11.0% |
| holds none | 2.5% |
| holds one, two or four | **0.0%, 0.0%, 0.0%** |

The gaps are the tell. A cohort of learners with six independent skills cannot produce a
histogram with holes in it; a threshold on one draw produces exactly this one. And 74.6%
is not an emergent property of anything — it is `P(cut > 2)` for a cut uniform on `[0, 8)`,
which is **75.0%**.

**So one synthetic learner in four cannot do era one, and one in forty cannot do a single
era-one skill.** Whatever the calculus-readiness population is, it is not that.

Two things follow, and the second was not in the brief:

1. **The uniform prior OVERSTATES what inferring era one saves.** Under it the shipped
   instrument spends **2.46 items** on era one; under a prior weighted the way the lead
   asks it spends **0.87** (§4). The lever looks nearly three times bigger than it is.
2. **The uniform prior also overstates how well RECOVERY works**, which is the claim the
   whole idea rests on. Under it, the only learners who lack era one lack *everything*, so
   they fail the first foundational question and are caught in four items 94.8% of the
   time. Under a prior that admits an isolated gap, the same rule catches **31.9%** (§6).
   The prior does not just move the cost; it hides the failure mode.

**What this does NOT mean.** Nothing already published is wrong about what it measured. A
uniform ability prior is the right default for *"which of these two policies is better"*,
because it is the comparison that assumes least, and every earlier record was answering
that question. It is the wrong prior for *"how many learners are below a specific bar"*,
which is the only question this one asks. §3 re-runs the shipped baseline under both so the
difference is visible rather than asserted, and the answer is that **the headline figures
move, but not far: the median moves 36 → 38 and truth accuracy 95.6% → 95.5%.** The figures
that move materially are the ones about era one specifically.

---

## 1. The baseline reproduces, digit for digit, before anything was swept

Required before any new figure is worth reading. `DEFAULT_WALK_POLICY`, 62 nodes in
teaching order, n = 6,000, mild noise (slip .10 / guess .05):

| figure | `Diagnostic_Tail_Cut_Landed.md` §2.1 | this harness |
|---|---|---|
| items med / p90 / p99 / max | 36 / 47 / 53 / 58 | **36 / 47 / 53 / 58** |
| truncated | 0.00% | **0.00%** |
| truth accuracy | 95.6% | **95.6%** |
| mastered sent back | 2.34 | **2.34** |
| gaps let through | 0.40 | **0.40** |
| skills named (sessions naming ≥ 1) | 2.36 (58%) | **2.36 (58%)** |

**#606's placement figures reproduce too, and they were produced by a different harness on a
branch that is not in this tree.** Its central claim about the coverage lever is that
overplacement falls and underplacement rises — it states the two endpoints, *"overplacement
by ≥ 1 era falls 1.8% → 0.1%; underplacement by ≥ 1 rises 26.5% → 31.1%"* — and separately
that its recommended level, the sixth-era horizon at 36 nodes, runs at median 28 and p90 35:

| | overplaced ≥ 1 era | underplaced ≥ 1 era | med / p90 items | exact placement |
|---|--:|--:|---|--:|
| shipped 62 — #606 | **1.8%** | **26.5%** | 36 / 47 | *not stated* |
| shipped 62 — here | **1.8%** | **26.5%** | **36 / 47** | 71.7% |
| horizon at era 6, 36 nodes — #606 | **0.1%** | **31.1%** | 28 / 35 | *not stated* |
| horizon at era 6, 36 nodes — here | **0.1%** | **31.1%** | **28 / 35** | 68.8% |

Both endpoints land on the same row of this sweep, which is an independent reproduction of
#606's central finding on a separately written harness — and it is why this record can
compare the two levers on one table. (#606's 69.7% exact-placement figure is *not* this
row: it belongs to its 38-node whole-era instrument, which is not measured here.)

---

## 2. The priors, and how they are built

Three priors, each **one change** from the row above it, so any movement below can be
attributed to the step that caused it. All three are ~40 lines in the harness with named
constants; disagreeing with them is a one-line edit.

### 2.1 The construction

- **P0 — what ships.** `makeProfiles` exactly: uniform ability, per-domain cut, three
  profiles pooled (homogeneous / heterogeneous / independent-strands).
- **P1 — the era-one floor.** With probability `ERA_ONE_FLOOR = 0.95` the learner's `D1`
  ability cut is raised above era one's deepest node, so they hold all six. **Applied to
  the CUT, not to the known-set**, and that matters: raising the cut also restores the
  downstream nodes that a missing `NUM.4` had pruned out of `closeDownward`. Adding the six
  nodes after the fact would produce a learner who was never drawn.
- **P2 — an ability distribution with a middle.** Ability becomes the mean of two uniforms
  (triangular: same support, unimodal, extremes no longer as common as the middle) instead
  of one. The second draw comes off a separate stream so both shapes consume exactly one
  `rand()` and every learner's response table stays paired across priors.
- **P3 — THE RISK PRIOR.** P2 plus an independent per-node drop of `ISOLATED_GAP_RATE =
  0.03` applied to era one **after closure and without re-closing**. This is the learner who
  can solve a linear equation and has genuinely forgotten percents.

**P3 is not optional decoration, it is the only prior that can price the question.** Under
`closeDownward` a learner holds a node only if they hold every in-scope prerequisite, so
the lead's second claim — *"if they can do later nodes they can do era 1 nodes"* — is **true
by construction**, and an instrument that infers downward can only be wrong through noise.
Measured: P0, P1 and P2 all produce **0.0%** incoherent learners. Any measurement of the
risk of inferring taken on those priors is a measurement of the responder's slip rate.

`ERA_ONE_FLOOR` is the forced share, not the resulting one — the underlying draw already
clears era one three times in four — so 0.95 produces a cohort **98.6%** of which holds all
six. Both columns are swept.

### 2.2 What each prior looks like

| prior | P(holds all of era one) | incoherent | truth placement: era 1 | era 2 | era 3+ |
|---|--:|--:|--:|--:|--:|
| **P0 shipped** | **74.6%** | 0.0% | 25.4% | 30.4% | 44.2% |
| **P1 floor** | 98.6% | 0.0% | 1.4% | 49.5% | 49.1% |
| **P2 realistic** | **99.3%** | 0.0% | 0.7% | 50.6% | 48.7% |
| **P3 gaps** | **82.1%** | **15.6%** | 17.9% | 41.9% | 40.2% |

The floor swept (uniform ability), so a reader can pick their own:

| forced floor | 0.00 | 0.50 | 0.75 | 0.85 | 0.90 | **0.95** | 0.98 | 1.00 |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| P(holds all of era one) | 74.6% | 87.2% | 93.7% | 96.3% | 97.4% | **98.6%** | 99.5% | 100% |

The isolated-gap rate swept, on P2's shape. **This is the knob §6's crux number is most
sensitive to**, and it is the one this record can least defend from measurement:

| gap per node | 0.00 | 0.01 | 0.02 | **0.03** | 0.05 | 0.08 |
|---|--:|--:|--:|--:|--:|--:|
| P(holds all of era one) | 99.3% | 93.1% | 87.7% | **82.1%** | 71.9% | 60.2% |
| learners whose truth breaks the DAG | 0.0% | 5.5% | 10.6% | **15.6%** | 25.1% | 36.0% |

**A caution on reading P3's accuracy column.** `resolveKnowledgeState` is downward-closed by
construction, so it cannot represent a learner who holds `LF.1` and not `NUM.5`. Two obvious
repairs of an incoherent truth score **95.3%** (drop the dependents) and **99.7%** (credit
the missing prerequisite); the best achievable sits between the larger of those and 100%.
Accuracy under P3 is therefore not comparable with accuracy under P2, and no conclusion
below rests on comparing them.

---

## 3. The shipped baseline under all four priors

| prior | med | p90 | p99 | max | trunc | truth acc | sent back | gaps through | named (≥1) | **exact placement** | **over ≥1** | **under ≥1** |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| **P0 shipped** | **36** | 47 | 53 | 58 | 0.00% | **95.6%** | 2.34 | 0.40 | 2.36 (58%) | **71.7%** | **1.8%** | **26.5%** |
| P1 floor | 38 | 47 | 53 | 58 | 0.00% | 95.3% | 2.52 | 0.39 | 2.60 (66%) | 68.8% | 0.3% | 30.9% |
| **P2 realistic** | **38** | 47 | 53 | 58 | 0.00% | **95.5%** | 2.35 | 0.42 | 2.35 (69%) | **73.1%** | **0.3%** | **26.6%** |
| **P3 gaps** | **38** | 47 | 53 | 58 | 0.00% | **95.3%** | 2.36 | 0.58 | 2.34 (69%) | **63.0%** | **14.5%** | **22.4%** |

Read four things:

1. **The published length figures barely move.** p90, p99, max and truncation are identical
   under every prior; the median moves 36 → 38. A realistic cohort is slightly *longer* to
   diagnose than a uniform one, because more of it is the strong learner the tail is made
   of (`Diagnostic_Tail_Policy_Measurement.md` §3).
2. **Truth accuracy barely moves either**: 95.6% → 95.5% → 95.3%. The aggregate accuracy
   figure this repository quotes is robust to the prior, which is worth saying plainly
   because §0 could be read as impugning it.
3. **Overplacement is a property of the prior, not of the instrument.** 1.8% under P0, 0.3%
   under P2 — and **14.5% under P3**. The shipped instrument already overplaces one learner
   in seven once the population contains isolated gaps, because `licensesInference` credits
   a deep pass's whole prerequisite closure and the closure is where the gap is. **That
   overplacement is the shipped rule doing the lead's idea already**, and §7 says how much.
4. **Underplacement does not improve under a realistic prior.** 26.5% → 26.6%. The
   instrument's dominant error is being too cautious, and that survives the reweighting.

---

## 4. THE PRIZE: era one already costs almost nothing, and the pass side is already relaxed

This is the section that decides the question, and it is a measurement of what ships.

| prior | total items med / mean | era-one nodes probed (of 6) | era-one items | of which confirmations | share of the walk |
|---|---|--:|--:|--:|--:|
| P0 shipped | 36 / 35.0 | 1.60 | **2.46** | 0.85 | 7.0% |
| P1 floor | 38 / 37.3 | 0.94 | 1.05 | 0.11 | 2.8% |
| **P2 realistic** | 38 / 37.8 | **0.79** | **0.87** | 0.08 | **2.3%** |
| P3 gaps | 38 / 37.7 | 0.81 | 0.90 | 0.10 | 2.4% |

**Under a realistic prior the shipped instrument asks 0.79 of era one's six questions and
spends 0.87 items there — 2.3% of the walk.** It is not asking about era one, because
`licensesInference` credits a passed node's whole in-scope prerequisite closure and five of
era one's six nodes sit under `NUM.4`. **The lead's idea is largely the shipped rule**, and
the realistic prior is precisely what makes it fire.

### 4.1 "Weaker evidence to accept a pass at a low era" is already the shipped rule

`adjudicate` takes a one-item decision when the decision's reach is below the confirmation
threshold, and reach is `passClosure` for a pass and `failCone` for a miss — so the two
sides of one node sit on opposite sides of the bar. At 62 nodes the threshold is **7**:

| era-one node | what it is | passClosure | on a PASS | failCone | on a MISS |
|---|---|--:|---|--:|---|
| `NUM.S` | signed-number arithmetic | 0 | **1 item** | 51 | buys a confirm |
| `NUM.F` | fraction arithmetic | 0 | **1 item** | 52 | buys a confirm |
| `NUM.2` | order of operations | 2 | **1 item** | 50 | buys a confirm |
| `NUM.3` | field properties | 0 | **1 item** | 50 | buys a confirm |
| `NUM.4` | evaluate & simplify expressions | 4 | **1 item** | 49 | buys a confirm |
| `NUM.5` | ratios, rates, percents, units | 1 | **1 item** | **5** | 1 item |

**All six era-one passes already decide on one item. There is nothing left to relax on the
pass side** — not at era one, and era one is the only era where that is true of every node
(the same sweep gives 3/5 for the second era, 0/5 for the fifth, 1/6 for the ninth).

The only evidence era one still buys is on the **failure** side, where five of six nodes
purchase a confirming item because their cone is half the graph. Relaxing that is
`liveFailCone`, which `Diagnostic_Tail_Policy_Measurement.md` §4.4 measured and refused:
no tail benefit, p90 and p99 unmoved, and already-mastered-sent-back *worse*, 2.42 → 2.52.
It is refused here for the same reason and re-derived rather than quoted: at era one a
one-item miss prunes 49 to 52 nodes on a single slip.

**So the sweep below is not over evidence strength.** It is over how many era-one nodes are
asked at all, because that is the only dimension with anything left in it.

---

## 5. The sweep: from asking all six to asking none

`ask` = nodes the walk may probe. `asm` = nodes credited at placement 2 without being
asked. `wrongly-assumed` = of those, the ones the learner does not hold. The anchor ladder
is `6 → 2 → 1 → 0`, and it is not an arbitrary thinning: `{NUM.4, NUM.5}` is the smallest
set of era-one nodes whose prerequisite closures cover the era, and `{NUM.4}` is that set
minus the one node nothing else in era one reaches.

### 5.1 P2 — the realistic prior

| instrument | ask | asm | med | p90 | p99 | acc(62) | back | fwd | wrongly assumed | named (≥1) |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| **shipped** | 62 | 0 | **38** | **47** | 53 | **95.5%** | 2.35 | 0.42 | 0.00 | **2.35 (69%)** |
| assume after `NUM.4`+`NUM.5` | 58 | 4 | 35 | 43 | 47 | 95.4% | 2.23 | 0.63 | 0.00 | 0.39 (20%) |
| assume after `NUM.4` | 57 | 5 | 35 | 42 | 47 | **95.5%** | 2.18 | 0.63 | 0.01 | 0.36 (20%) |
| **assume era one outright** | 56 | 6 | **34** | **41** | 47 | 95.4% | 2.17 | 0.68 | 0.01 | 0.12 (9%) |
| assume eras 1–2 outright | 51 | 11 | 33 | 40 | 45 | **92.7%** | 1.80 | 2.73 | **2.17** | 0.39 (21%) |
| assume eras 1–3 outright | 46 | 16 | 29 | 37 | 42 | **89.0%** | 1.66 | 5.15 | **4.67** | 0.23 (13%) |
| *coverage: horizon at era 7* | 41 | 0 | 32 | 38 | 42 | *81.7%* | *11.17* | 0.19 | 0.00 | 4.27 (96%) |
| *coverage: horizon at era 6* | 36 | 0 | 30 | 35 | 38 | *78.2%* | *13.37* | 0.14 | 0.00 | 3.86 (94%) |

### 5.2 Placement error, as a directional distribution (P2)

| instrument | exact | over ≥1 | over ≥2 | under ≥1 | under ≥2 | mean abs error |
|---|--:|--:|--:|--:|--:|--:|
| shipped | 73.1% | 0.3% | 0.0% | 26.6% | 10.9% | 0.50 |
| assume after `NUM.4` | **78.3%** | 0.5% | 0.1% | **21.2%** | 9.5% | **0.43** |
| assume era one outright | 77.7% | 1.2% | 0.1% | 21.1% | 9.5% | 0.43 |
| assume eras 1–2 outright | 38.4% | **51.9%** | 7.2% | 9.7% | 5.1% | 0.80 |
| assume eras 1–3 outright | 16.0% | **77.8%** | 56.1% | 6.3% | 2.1% | 1.50 |
| *coverage: horizon at era 6* | 67.9% | 0.1% | 0.0% | **32.1%** | 15.1% | 0.64 |

Under P2, assuming era one **improves** exact placement, 73.1% → 77.7%, and cuts
underplacement 26.6% → 21.1%. The mechanism is not generosity: it is that a **slip** at an
era-one node prunes 49 to 52 dependants, and removing those nodes from the instrument
removes the instrument's single most expensive way to be wrong. That is a real result and it
is the strongest thing that can be said for the idea.

### 5.3 The same table under P3, where the assumption can actually be wrong

| instrument | med | p90 | acc(62) | fwd | wrongly assumed | exact | over ≥1 | under ≥1 |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| shipped | 38 | 47 | 95.3% | 0.58 | 0.00 | 63.0% | 14.5% | 22.4% |
| assume after `NUM.4` | 35 | 42 | 95.2% | 0.82 | 0.16 | 64.9% | 17.4% | 17.7% |
| **assume era one outright** | **34** | **41** | 95.1% | 0.86 | **0.20** | 64.2% | **18.3%** | 17.5% |
| assume eras 1–2 outright | 33 | 40 | 92.4% | 2.91 | 2.36 | 31.6% | 60.2% | 8.2% |
| assume eras 1–3 outright | 29 | 37 | 88.7% | 5.34 | 4.85 | 13.4% | 81.5% | 5.1% |

**How far it can go: era one, and no further.** Assuming era two costs 2.17 wrongly-credited
skills a session under P2 and puts **51.9%** of learners an era or more too far forward;
assuming era three costs 4.67 and **77.8%**. Era two is `EXP.1` and the whole radical
domain, which is genuinely the frontier for a large share of this cohort — the truth
histogram in §2.2 puts 50.6% of P2's learners *at* era two. There is nothing gradual about
the cliff.

### 5.4 #606's "which nodes, not how many" holds, and this is the sharpest case of it

#606 found that at equal node counts the instruments diverge — whole eras from the end
scored 69.7% exact placement against 52.1% for a leaf cut at the same count. The two levers
priced here are a stronger version of the same point, because they are not at equal counts
and the *smaller* cut wins. P2, from §5.1:

| | nodes removed from the asking | med | p90 | truth accuracy over all 62 | mastered sent back |
|---|--:|--:|--:|--:|--:|
| assume era one | **6**, from the bottom | 34 | 41 | **95.4%** | **2.17** |
| coverage: horizon at era 7 | **21**, from the top | 32 | 38 | **81.7%** | **11.17** |
| coverage: horizon at era 6 | **26**, from the top | 30 | 35 | **78.2%** | **13.37** |

**Six nodes off the bottom buy within two items of what twenty-one off the top buy, and cost
13.7 points of whole-product accuracy less.** The asymmetry the brief asked about is real and
it is large. What it is not is large in *items*: the two-item gap between 34 and 32 is the
entire remaining prize, and §6.4 shows even the 34 is available without assuming anything.

### 5.5 Conditioning on an anchor adds nothing, and the reason is structural

The conditional arms — grant the assumption only if the anchor resolved `passed` — produce
**identical placement rows** to their unconditional twins (P2: 78.3% exact, 0.5% over, 21.2%
under, both). `eraFires` is a conjunction over the era's nodes, so a measured failure at
`NUM.4` already stops era one firing whether or not the other five were assumed. **The
engine's existing prune is the conditional rule**, and re-implementing it as an assumption
gate changes only which per-node label the failure carries (sent-back rises 2.18 → 2.21 as
the withdrawn assumption turns credited skills into absent ones).

---

## 6. THE CRUX: is a wrong inference caught, and what does it cost to catch it

The lead's third claim is the one that makes the idea safe: *"if they can't do those nodes,
then we'll determine that very quickly when we propagate back down."* **Nothing in the
shipped engine does this**, so the rule is modelled and swept. Three triggers, from crude to
sharp:

- **ANY(k)** — k measured failures at nodes depending on the assumed set. 49 of the 56
  remaining nodes do, so this is nearly "the learner failed anything".
- **FLOOR(k)** — k failures at the eight nodes with no in-scope prerequisites left
  (`EXP.1`, `RAD.1`, `LIN.1`, `POL.1`, `CG.1`, `FUN.1`, `TRG.1`, `GEO.1` — everything
  sitting directly on `NUM.4`). A failure the instrument cannot explain from anything it
  asked.
- **ROOTS(k)** — FLOOR(k) *and no floor node has passed*. A learner who cleared `EXP.1` has
  demonstrated `NUM.4` and everything under it, so their later failures cannot be about era
  one. This is the sharpest rule the shipped surface can express.

Recovery walks era one as a **suffix** and re-resolves the merged record through the shipped
`resolveKnowledgeState`, so a restored era-one failure prunes its cone. Suffix rather than
interrupt because an interrupt needs `selectNextProbe`, which is not exported; the suffix
over-states both the exposure and the total, and the trigger index is reported beside it as
the other bound.

### 6.1 P2 — the realistic coherent prior. Wrong assumptions: 0.7% of sessions (n = 44)

| trigger | caught | items to trigger (med) | **false trigger** | fires on | total med / p90 | acc(62) | never caught |
|---|--:|--:|--:|--:|---|--:|--:|
| never | 0% | — | 0.0% | 0% | **34** / 41 | 95.4% | 0.7% |
| ANY(1) | 100% | **4** | **99.9%** | 99.9% | 42 / 49 | 93.4% | 0.0% |
| ANY(6) | 100% | 14 | 92.6% | 92.7% | 41 / 49 | 93.7% | 0.0% |
| FLOOR(1) | 100% | 4 | 66.8% | 67.0% | 39 / 46 | 94.4% | 0.0% |
| FLOOR(2) | 100% | 7 | 49.4% | 49.8% | 38 / 44 | 94.9% | 0.0% |
| **ROOTS(1)** | **90.9%** | **4** | **29.7%** | 30.1% | **36** / **41** | 95.1% | 0.1% |
| ROOTS(2) | 86.4% | 7 | 16.4% | 16.9% | 35 / 41 | 95.4% | 0.1% |

### 6.2 P3 — the same table where the assumption can be wrong for a realistic reason. Wrong assumptions: 17.9% (n = 1,073)

| trigger | **caught** | items to trigger (med) | **false trigger** | total med / p90 | **never caught, of ALL sessions** | handed unheld | placement error |
|---|--:|--:|--:|---|--:|--:|--:|
| never | 0.0% | — | 0.0% | **34** / 41 | **17.9%** (n=1073) | 1.12 | 1.57 eras |
| ANY(1) | 99.9% | 4 | **99.9%** | **42** / 49 | 0.0% | — | — |
| FLOOR(1) | 67.1% | 8 | 67.0% | 39 / 46 | 5.9% (n=353) | 1.05 | 2.07 eras |
| FLOOR(2) | 50.2% | 13 | 49.7% | **38** / 44 | 8.9% (n=534) | 1.05 | 1.95 eras |
| **ROOTS(1)** | **31.9%** | 4 | 29.8% | 36 / 41 | **12.2%** (n=731) | 1.06 | 1.73 eras |
| ROOTS(3) | 15.7% | 9 | 12.7% | 35 / 41 | 15.1% (n=905) | 1.07 | 1.68 eras |

### 6.3 The answer, stated as the brief asked for it

**A wrong inference is caught in four items — by a rule that also re-asks era one of
between 30% and 100% of the learners it was right about.** The two columns move together
because they are the same column: the detection rate and the false-trigger rate are within
three points of each other at every setting under P3 (31.9 vs 29.8, 67.1 vs 67.0, 50.2 vs
49.7). **That is not a detector. It is a re-test with a delay.**

The arithmetic closes it. **The recovery walk over era one alone is the D1 walk**, and
`confirmThresholdFor(6, 7/62) = 0` means every decision in it is confirmed — so under the
realistic priors it costs a **median 6 to 7 items, mean 7.2 to 7.8** (7 to 11 under P0,
whose recovering learners are weaker and so take longer). The assumption saves **3.83**. A
trigger therefore has to fire on well under half of sessions to break even, and the only
triggers that fire that rarely are the ones that miss most of the wrong assumptions:
**every trigger that catches more than a third of them lands at or above the shipped median
of 38** — ANY(1) at 42 catching 99.9%, FLOOR(1) at 39 catching 67.1%, FLOOR(2) at 38
catching 50.2%. Below 38 there is only ROOTS, at 36 catching 31.9% and at 35 catching 15.7%.

**And the residue is the failure the brief named.** With ROOTS(1) under P3, **12.2% of all
sessions** hold a wrong era-one assumption that is never contradicted: those learners are
handed 1.06 era-one skills they do not have, placed **1.73 eras** too far forward, and —
because §10.9's catch-up hands a skipped age over with zero confirmation questions — are
never taught them. That is *"a silent misplacement dressed as an optimisation"*, measured.

**Why the shipped prior would have said the opposite.** Under P0, ROOTS(1) catches **94.8%**
in four items at a 26.1% false-trigger rate, and never-caught is 1.3%. The recovery claim
looks true, and it is true *of P0's learners*, because a P0 learner who lacks era one lacks
the entire graph and fails the first foundational question asked. It is the isolated gap
that is invisible, and P0 contains none by construction.

### 6.4 The control that ends it: the same length is already available, from a field that exists

Read at full 62-node coverage, so nothing is confounded with a scope change. This is the one
place the harness spreads over `DEFAULT_WALK_POLICY`, because the knob is the point:

| P2 realistic | ask | asm | med | p90 | p99 | max | truth acc | back | fwd | wrongly assumed | named (≥1) |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| shipped | 62 | 0 | 38 | 47 | 53 | 58 | 95.5% | 2.35 | 0.42 | 0.00 | 2.35 (69%) |
| **assume era one outright** | 56 | **6** | **34** | **41** | 47 | 52 | 95.4% | 2.17 | 0.68 | **0.01** | 0.12 (9%) |
| **`liveConsequenceFrom: 0`** | **62** | **0** | **35** | **41** | 47 | 52 | **95.3%** | 2.27 | 0.67 | **0.00** | 0.00 (0%) |

**Assuming era one and setting `liveConsequenceFrom` to 0 land on the same p90, the same
p99, the same max and the same accuracy** — because they are the same mechanism. Both make
a pass's closure read smaller than the static count, so the pass stops buying a confirming
item. One is a field `Diagnostic_Tail_Policy_Measurement.md` §5.3 already priced and
declined for a stated reason; the other is a new two-phase instrument that additionally
credits six skills nobody asked about.

**Where the saved items actually come from**, which is the decomposition that makes the
equivalence obvious rather than surprising:

| prior | assumption saves (mean items) | era one's own questions | confirmations elsewhere |
|---|--:|--:|--:|
| P0 shipped | 2.75 | **2.46** | 0.29 |
| **P2 realistic** | **3.83** | **0.87** | **2.96** |
| P3 gaps | 3.77 | 0.90 | 2.87 |

Three quarters of the saving is not era one's questions. Removing era one from the *scope*
collapses the static pass-closure of everything above it — `LIN.1` goes from five in-scope
prerequisites to zero — and **29 of the 56 remaining nodes cross from "a pass buys a
confirming item" to "a pass costs one item"**. `livePassClosure` already discounts exactly
that quantity, from item 20; the knob moves it to item 0.

---

## 7. Which era-one skills are safely inferable, and which are not

The era is not one block. `NUM.F` gates 52 of the 62 nodes and `NUM.5` gates 5.

**P2 realistic**, n = 6,000. `free-evidence` is the share of shipped sessions in which the
node was credited **without being probed**. `when WRONG` / `when HELD` are the share of
sessions in which the walk failed at least one node in the node's dependent cone —
the only evidence a propagate-back-down rule could act on — split by whether the learner
actually held it:

| node | what it is | gates | free-evidence | **probed today** | contradicted when WRONG | when HELD | **the gap** |
|---|---|--:|--:|--:|--:|--:|--:|
| `NUM.S` | signed numbers | 51 | 99.4% | **0.6%** | 100.0% | 99.9% | **0.1 pt** |
| `NUM.F` | fractions | 52 | 95.6% | **4.4%** | 100.0% | 99.9% | **0.1 pt** |
| `NUM.2` | order of operations | 50 | 95.5% | **4.3%** | 100.0% | 99.9% | **0.1 pt** |
| `NUM.3` | field properties | 50 | 98.1% | **1.9%** | 100.0% | 99.9% | **0.1 pt** |
| `NUM.4` | evaluate & simplify | 49 | 82.3% | 17.5% | 100.0% | 99.9% | **0.1 pt** |
| **`NUM.5`** | **ratios, rates, percents** | **5** | **49.5%** | **50.4%** | 0.0% | 71.9% | **negative** |

Under **P3**, where the assumption is wrong often enough to measure: the five hub nodes read
100.0% when wrong against 99.9% when held; `NUM.5` reads **65.0% when wrong against 72.0%
when held**.

Three conclusions, and they are different from "era one is inferable":

- **`NUM.S`, `NUM.F`, `NUM.2`, `NUM.3` are already inferred** in 95–99% of sessions and
  asked in 0.6–4.4%. **There is nothing to save by assuming them** — the instrument stopped
  asking about them without anybody deciding to.
- **`NUM.4` is the hub and is asked 17.5% of the time.** It is the one era-one node where an
  assumption saves a measurable fraction of an item, and it is also the node whose failure
  the recovery triggers can actually see, because the eight floor nodes sit directly on it.
  If any era-one node is to be assumed, this is the safe one — and the saving is 0.2 items.
- **`NUM.5` is the one era-one skill that genuinely has to be asked.** It is not below
  anything else in the era, so no era-one pass reaches it; it gates 5 nodes rather than 50,
  so no deep pass carries evidence about it; and its cone signal is **worse than useless** —
  a learner who *holds* `NUM.5` is more likely to fail something in its cone than one who
  does not, because a learner who lacks it is usually pruned before the walk gets there.
  Proportional reasoning is also the era-one skill a precalculus learner most plausibly has
  an isolated gap in. It is asked in half of sessions today, it is half the era-one item
  budget, and assuming it is the one assumption nothing can ever catch.

**The general shape**: a node is safely inferable exactly when something else the
instrument asks about sits above it in the DAG. That is a property of the graph, not of the
era, and on this graph it is true of five era-one nodes and false of the sixth — which is
also, and not coincidentally, the only one that costs anything to ask.

---

## 8. The question the brief asked, answered

**Does this get the median near 30 without the underplacement cost that cutting coverage
carried?** No. Under P2:

| | med | p90 | over ≥1 | under ≥1 | accuracy over 62 | mastered sent back |
|---|--:|--:|--:|--:|--:|--:|
| shipped | 38 | 47 | 0.3% | 26.6% | 95.5% | 2.35 |
| assume era one outright | **34** | **41** | 1.2% | **21.1%** | 95.4% | 2.17 |
| assume era one + ROOTS(1) recovery | 36 | 41 | — | — | 95.1% | — |
| `liveConsequenceFrom: 0`, no assumption | 35 | 41 | — | — | 95.3% | 2.27 |
| assume eras 1–2 outright | 33 | 40 | **51.9%** | 9.7% | **92.7%** | 1.80 |
| *coverage: horizon at era 6 (#606)* | **30** | **35** | 0.1% | **32.1%** | *78.2%* | *13.37* |

**Era one alone stops at 34, not 30**, and it is 34 only if nothing ever checks the
assumption. The sharpest trigger available catches 31.9% of wrong inferences and takes the
median to 36 against a shipped 38; every trigger that catches more than a third takes it to
38 or beyond. Going further — assuming era two — reaches 33 and puts one learner in two an
era too far forward.

**It does avoid #606's underplacement cost**, and that part of the idea is sound: assuming
is fail-open where dropping coverage is fail-closed, so underplacement falls 26.6% → 21.1%
where the coverage cut raised it to 32.1%. The direction is right. The magnitude is four
items.

**The recommendation, stated as a trade rather than a preference.** If four items at the
median and six at the p90 are worth having, `liveConsequenceFrom: 0` delivers them at full
coverage, with zero assumed skills, at 95.3% accuracy — and its price is already recorded
(`Diagnostic_Tail_Policy_Measurement.md` §5.1: the completion ceremony names nothing in 0%
of sessions). The era-one assumption delivers the same numbers, empties the ceremony
anyway — 2.35 named in 69% of sessions falls to 0.12 in 9% — and adds a class of error that
no measurement in the walk can see.

---

## 9. Method and reproduction

Same method as `Diagnostic_Probe_Cost_Measurement.md` §10: the real engine (`startWalk` /
`recordScoredOutcome` / `resolveKnowledgeState`) over the real registry graph, three ability
profiles pooled, slip and guess injected at the responder with every `(node, attempt)`
response pre-drawn so every comparison is paired rather than two independent samples. The
cohort is drawn **once, over all 62**, and every instrument answers the same draw — so the
62-node row is generated exactly as `tail-policy.sim.test.ts` generates its live row.

Two re-implementations are load-bearing, and both are pinned rather than argued:

- **The generator.** The era-one floor has to be applied to the ability CUT, which means
  re-implementing `makeProfiles`. At zero floor and uniform shape the local generator is
  asserted equal to `makeProfiles` **node for node over 1,200 learners** (§2.1 of the
  harness). A drifted rewrite would move every figure here for reasons unrelated to the
  question.
- **The driver.** §6 is about item POSITIONS, which `students.ts`'s `runWalk` does not
  carry, so this harness drives the engine itself. The traced driver is asserted equal to
  `runWalk` on item count, trace length and the whole `probed` map, over **800 walks across
  both scopes** (§6.0).

`Diagnostic_Probe_Cost_Measurement.md` §13.7's warning applies unchanged: the student model
makes same-depth same-domain nodes near-perfectly correlated, so a policy that infers across
SIBLINGS posts a fake win. Everything measured here is either DAG-structural (prerequisite
closure) or an outright assumption named as such and scored against ground truth over all 62
nodes, so a sibling correlation cannot hide inside it.

Reproduce from the repo root:

```
echo 2000 > engines/diagnostic/sim/sample-size.local
npx vitest run --config engines/diagnostic/sim/vitest.sim.config.ts \
  engines/diagnostic/sim/era-inference.sim.test.ts --disableConsoleIntercept
```

`--disableConsoleIntercept` is **required**: under vitest 4 a passing test's `console.log`
is swallowed without it, so the harness runs green and prints nothing. `sample-size.local`
is gitignored; **always check the printed `n=` before believing a sample size.** Every
figure above is `n=6000` (`SIM_N = 2000 × 3` pooled profiles). A full run is about 9.5
minutes.

The harness is excluded from CI by placement, like its six siblings.
`test/diagnosticSimScopeMirror.test.ts` asserts that exclusion and that every harness
reporting on the live scope reads `sim/liveScope.ts` rather than a copy of its own — and its
population is now **derived from the directory** rather than from a written-down pair, with
the registry-derived harnesses named as exceptions that fail in both directions. Four
injections observed red and green on restore: a harness that stops reading the mirror, an
exemption naming a file that no longer exists, an exemption that has started reading the
mirror, and an exemption list that has swallowed the population.

---

## 10. What this decides, and what it does not

**Settled by measurement:**

- **The simulation's ability prior is uniform**, era one is one draw against a threshold,
  and 74.6% of the generated cohort clears it (§0). The published length and accuracy
  figures survive a realistic reweighting (36 → 38 median, 95.6% → 95.5%); the figures about
  **era one specifically** do not (2.46 items → 0.87).
- **Claim 1 is true and already exploited.** Under a realistic prior the instrument asks
  0.79 of era one's six questions and spends 0.87 items there, 2.3% of the walk (§4).
- **"Weaker evidence for a low-era pass" is already the shipped rule.** All six era-one
  passes decide on one item at the shipped threshold of 7. What is left is the *failure*
  side, which #572 §4.4 priced and refused (§4.1).
- **Claim 2 is true by construction in every prior this repository has ever used**, so no
  earlier measurement could have priced the risk of inferring. P3 is the first prior that
  lets it fail, and under P3 the shipped instrument already overplaces 14.5% of learners
  (§2.1, §3).
- **Claim 3 — the crux — fails on the false-positive rate, not on the latency.** Detection
  is 4 items, and detection and false-trigger are within three points of each other at every
  setting. Recovery costs 6–7 items (it is the D1 walk) against a 3.83-item saving, so every
  trigger that catches more than a third of wrong inferences lands at or above the shipped
  median (§6).
- **The length is available without any assumption.** `liveConsequenceFrom: 0` at full
  coverage matches the assumption's p90, p99, max and accuracy, because it is the same
  mechanism; three quarters of the "saving" is confirmation elsewhere, not era one's own
  questions (§6.4).
- **Per node**: four era-one skills are already inferred and are worth nothing to assume,
  `NUM.4` is worth 0.2 items and is the safe one, and **`NUM.5` genuinely has to be asked**
  — it is unreachable by inference, gates 5 nodes, and its cone carries a negative signal
  (§7).
- **Era two is a cliff, not the next step**: 51.9% overplaced by an era or more, 2.17
  skills credited that the learner does not hold (§5.3).

**Not decided here, deliberately:**

- **The gap rate.** Whether real learners have isolated era-one holes, and at what rate, is
  a question about learners and not about the instrument. §2.2 sweeps it; the whole risk
  case rests on it; and **the only thing that settles it is real response data**, which
  would come from the live pretest's `placement_by_node` records rather than from any
  simulation.
- **Whether to set `liveConsequenceFrom` to 0.** That is `Diagnostic_Tail_Policy_
  Measurement.md` §5.3's open trade (the completion ceremony), unchanged by anything here,
  and it is a product judgement.
- **The floor value.** 0.95 is this record's choice; the sweep is in §2.2 and every figure
  says which setting it was taken at.
- **Whether `students.ts` should be reweighted.** This record does not touch it. If a future
  measurement is about *how many learners are below a bar* rather than *which policy is
  better*, it owes a prior it can defend, and §2 is one construction to argue with rather
  than the answer.
