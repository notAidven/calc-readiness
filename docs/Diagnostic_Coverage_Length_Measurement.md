# What It Costs To Ask About Fewer Skills — the coverage lever, priced

**Measured 2026-08-04 at `258856a1` and re-run byte-identically at `613b4333`, the merge of
`integration` after `#600` landed. Status: MEASUREMENT RECORD; nothing is decided and
nothing shipped.** Owner: Gabe (diagnostic lane). Sibling of
`Diagnostic_Tail_Policy_Measurement.md` (#534, the tail priced as a curve) and
`Diagnostic_Tail_Cut_Landed.md` (#572, what the tail cut did once it was on). This document
changes no constant, no policy and no scope: the only code it adds is
`engines/diagnostic/sim/coverage-sweep.sim.test.ts`, a measurement harness that composes
reduced scopes locally and hands them to the shipped engine.

**n = 6,000 synthetic learners (`SIM_N` 2,000 × 3 pooled profiles), mild noise
(slip .10 / guess .05), `DEFAULT_WALK_POLICY` unmodified, throughout.**

---

## 0. The shipped baseline reproduces, digit for digit, before anything was swept

Run first, on the unmodified tree, because a figure measured on a harness that has drifted
off the record is worse than no figure. The live instrument — the 62 in-product nodes in
teaching order, which is what a learner is actually administered:

| figure | recorded (#572 §2.1) | this run |
|---|---|---|
| items med / p90 / p99 / max | 36 / 47 / 53 / 58 | **36 / 47 / 53 / 58** |
| truncated | 0.00% | **0.00%** |
| truth accuracy | 95.6% | **95.6%** |
| already-mastered sent back | 2.34 | **2.34** |
| gaps let through | 0.40 | **0.40** |
| skills named / sessions naming ≥ 1 | 2.36 / 58% | **2.36 / 58%** |

Reproduced twice, independently: once through the shipped `tail-policy.sim.test.ts`
harness, and once through this document's own harness, which generates its cohort the same
way and therefore has to agree or be wrong. The pre-cut row (38 / 62 / 70 / 70, 1.43%,
95.5%, 2.45), the product-node ordering (36 / 48 / 54 / 62) and D1 (7 / 12 / 15 / 18,
98.0%) all reproduced as well. **The brief's other figure reproduces too:** the tail knob's
most aggressive setting, `liveConsequenceFrom: 0`, reads **34 / 41 / 47 / 53 with 0.00
skills named in 0% of sessions**, which is the "p90 41 and the ceremony can name zero
skills" the brief describes.

---

## 1. The recommendation, and the item count it produces

**Cut the diagnostic's placement horizon to the sixth era: 36 of 62 nodes, median 28
items, p90 35.** At the tree's own 20 seconds per item that is **9.3 minutes at the median
and 11.7 at the p90**, against today's 12.0 and 15.7. Truncation stays at 0.00%.

**It reaches 30 at the median and it does not reach 30 at the p90.** Reaching 30 at the
p90 needs the horizon at the fourth era — 27 nodes, p90 29, median 25 — and §9 prices what
that costs.

And one thing has to be said before the table rather than after it, because it changes what
the table means:

> **Coverage does not buy the trade the reframe asks for.** The lead's argument is that
> overplacement is now cheap, so a shorter instrument that occasionally overplaces may be
> better. Every coverage level measured here moves placement in the OPPOSITE direction. A
> skill the instrument stops asking about is absent from `placement_by_node`,
> `eraPlacement.ts` reads absent as `0`, and `0` is below the pass bar — so the era holding
> it **can never fire**. Cutting coverage does not make the instrument occasionally
> generous; it caps how far forward anybody can be placed. Overplacement by one era or more
> falls from **1.8% to 0.1%**, while underplacement rises from **26.5% to 31.1%** at the
> recommended level, and to 32.0% at the deepest level measured.
>
> That is not a reason to refuse the cut — the lead is optimising abandonment, and the cut
> genuinely removes about a quarter of the questions (median 36 → 28, p90 47 → 35). It is a
> reason not to describe the cut as what he asked for. §7 prices the lever that would actually deliver "sometimes too far
> forward", and it is a change to the placement default rather than to coverage.

---

## 2. The table

The ladder is the **placement horizon**, because that is the one reduced scope a shipped
build could compose: `administeredScope` is *"prerequisite closure, then the placement
horizon widened by `ALWAYS_ADMINISTERED`, then closure again"*, and each row below is that
pipeline with the horizon set by hand instead of read off the authored content. Every row
is prerequisite-closed. §3 covers the other instruments measured and why they are worse.

Two denominators are reported for the two accuracy-shaped columns, and the difference is
the whole point of §5:

- **`in scope`** uses the measured node set, which is what every earlier sweep reports, and
  is therefore the column comparable to #534 and #572.
- **`of 62`** uses all 62 in-product nodes, with a skill the instrument never asked about
  taking the placement default. That is what the learner actually gets.

| horizon | nodes | med | p90 | p99 | max | truncated | accuracy (in scope) | accuracy (of 62) | sent back (in scope) | sent back (of 62) | gaps through | skills named |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| **era 10 — today** | **62** | **36** | **47** | 53 | 58 | 0.00% | **95.6%** | **95.6%** | **2.34** | **2.34** | 0.40 | 2.36 (58%) |
| era 9 | 54 | 34 | 43 | 50 | 56 | 0.00% | 95.8% | 88.9% | 1.98 | 6.56 | 0.32 | 2.90 (61%) |
| era 8 | 49 | 33 | 41 | 48 | 54 | 0.00% | 96.0% | 86.5% | 1.77 | 8.20 | 0.19 | 3.60 (68%) |
| era 7 | 41 | 31 | 37 | 42 | 45 | 0.00% | 95.9% | 81.7% | 1.53 | 11.23 | 0.14 | 3.68 (73%) |
| **era 6 — recommended** | **36** | **28** | **35** | 38 | 42 | **0.00%** | **95.1%** | **78.4%** | **1.67** | **13.30** | 0.11 | 3.36 (72%) |
| era 5 | 31 | 27 | 31 | 34 | 36 | 0.00% | 95.3% | 75.7% | 1.39 | 14.99 | 0.08 | 3.51 (71%) |
| era 4 | 27 | 25 | 29 | 32 | 34 | 0.00% | 94.7% | 74.7% | 1.36 | 15.63 | 0.07 | 3.81 (71%) |

Four things in that table are worth saying out loud.

**Truncation is 0.00% at every level.** Coverage and the ceiling are genuinely separate
levers; nothing here creates a truncated cohort. §8.

**Accuracy in scope does not move.** 95.6% at 62 nodes, 95.1% at 36, 94.7% at 27 — a
0.9-point spread across a scope cut by more than half. The instrument is not getting worse
at what it still measures. This is the column that would make the cut look free, and it is
the wrong column to read alone.

**Accuracy of 62 falls hard**, 95.6% → 78.4%, and every point of it is silence rather than
error. §5.

**The completion ceremony gets MORE to say, not less** — 2.36 skills named in 58% of
sessions becomes 3.36 in 72%. That is not luck. `confirmScopeFraction` is a *share* of the
scope, so `confirmThresholdFor` falls from 7 at 62 nodes to 4 at 36; more decisions clear
the confirmation bar, more passes are clean 2/2, and `robustPassNodeIds` has more in it.
It also means **a smaller instrument does not shrink in proportion to its node count**:
36 nodes is 58% of 62 and buys only a 22% cut in median items.

---

## 3. How the levels were chosen, and why that mattered more than the count

The brief is right that *"dropping the deepest era's nodes, dropping leaves, and dropping
by prerequisite depth are different instruments with the same item count"*. All three were
measured at matched node counts, plus two more: an even thinning across eras, and the
horizon the product's own scope derivation would produce. Two results:

### 3.1 Dropping leaves and dropping by depth are the SAME instrument here

Not "they agree" — they select the identical node set at every level tested (62, 53, 47,
38, 32, 26, 21), asserted as a set equality in the harness rather than inferred from
matching rows. The reason is structural: in a prerequisite-closed scope the globally
deepest node cannot have a dependent, so it is always a leaf, and deepest-first and
last-leaf-first walk the same order. Anyone proposing them as alternatives is proposing one
thing twice.

### 3.2 The instrument that keeps eras WHOLE is worth eighteen points of placement

At 38 nodes — the same count, the same cohort, the same policy:

| instrument at 38 nodes | med | p90 | placed exactly right | underplaced ≥ 1 | underplaced ≥ 3 | eras that can never fire |
|---|--:|--:|--:|--:|--:|--:|
| era-tail (whole eras from the end) | 28 | 34 | **69.7%** | **30.1%** | **12.1%** | **3** |
| leaves / depth | 33 | 37 | 52.1% | 47.8% | 22.7% | 9 |
| era-thin (spread across eras) | 27 | 32 | 51.8% | 48.1% | 22.9% | 9 |

Same count, **17.6 points** of placement accuracy between them. The mechanism is §1's: an
era with even one node missing can never fire, so an era-blind cut kills nine of ten eras
and pins almost everyone at the second. **Whether the cut respects era boundaries decides
the answer; how many nodes it removes barely does.**

There is a second, quieter result in that table: **dropping leaves does not shorten the
instrument.** At 53 nodes it reads median **38** against the 62-node baseline's 36 — nine
nodes removed and the typical learner answers two more questions. Leaves are the nodes the
frontier resolves most cheaply; removing them leaves the expensive bisection work behind and
lowers the confirmation threshold on top of it.

### 3.3 The recommended ladder is the one the product can actually derive

The rows in §2 are not clean era prefixes. `administeredScope` re-admits
`ALWAYS_ADMINISTERED` — the twenty nodes the two walk-authored packs can serve — *regardless
of the horizon*, because *"a widening must not narrow anything"* and because every stored
administration is denominated against them. So a horizon at the sixth era is **36** nodes
and not the 32 an era prefix would give: `FUN.1`, `LF.1`, `EL.1` and `TRG.1` come back in
from eras seven to ten. The clean era prefix is measured too (median 26, p90 31 at 32
nodes) and is the more flattering number; §2 reports the one a build would produce.

Those four re-admitted nodes sit in eras that cannot fire, so they cost items and buy no
placement — which is the same observation `placementHorizon`'s own doc comment makes about
measuring past the horizon. Whether the widening rule should still apply to a horizon that
is *chosen* rather than *forced by missing content* is a real question and this document
does not answer it.

---

## 4. Placement error at the recommended level

Measured era minus true era, both computed by the same function — `eraPlacementFromSeed`'s
conjunction, applied to the walk's `placement_by_node` and then to the learner's ground
truth — so the two sides of the subtraction cannot come from two different notions of
"placed". Positive is overplaced.

| error | −9 | −8 | −7 | −6 | −5 | −4 | −3 | −2 | −1 | **0** | +1 | +2 |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| **horizon at era 6 (36 nodes)** | 0.7% | 1.7% | 1.0% | 1.0% | 1.0% | 2.7% | 5.3% | 5.4% | 12.3% | **68.8%** | 0.1% | 0.0% |
| today (62 nodes) | 0.0% | 1.7% | 1.1% | 1.2% | 0.9% | 0.9% | 4.4% | 4.8% | 11.6% | **71.7%** | 1.7% | 0.1% |

Summarised, with today's figure in brackets:

- **Exactly right: 68.8%** (71.7%).
- **Overplaced by ≥ 1 era: 0.1%** (1.8%). **By ≥ 2: 0.0%** (0.1%).
- **Underplaced by ≥ 1: 31.1%** (26.5%). **By ≥ 2: 18.8%** (14.9%). **By ≥ 3: 13.3%**
  (10.2%).
- Mean absolute error **0.88 eras** (0.73).

**The cost of the cut is 2.9 points of exact placement, spent almost entirely on
underplacement.** The distribution's left tail barely changes shape: −1 goes 11.6% → 12.3%,
−3 goes 4.4% → 5.3%, and the deep tail at −7 and −8 is essentially unmoved, because those
learners were already being underplaced at full coverage. What the cut adds is a new −4
bucket (0.9% → 2.7%) and a −9 bucket that did not exist (0.0% → 0.7%): the learners the
era-6 cap catches.

The whole curve, so the shape of the trade is visible rather than asserted:

| horizon | nodes | exact | over ≥1 | over ≥2 | under ≥1 | under ≥2 | under ≥3 | mean abs |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| era 10 (today) | 62 | 71.7% | 1.8% | 0.1% | 26.5% | 14.9% | 10.2% | 0.73 |
| era 9 | 54 | 70.8% | 1.7% | 0.1% | 27.6% | 16.0% | 10.9% | 0.76 |
| era 8 | 49 | 71.1% | 0.8% | 0.1% | 28.1% | 16.1% | 11.0% | 0.76 |
| era 7 | 41 | 69.6% | 0.2% | 0.0% | 30.2% | 18.4% | 12.2% | 0.85 |
| **era 6** | **36** | **68.8%** | **0.1%** | **0.0%** | **31.1%** | **18.8%** | **13.3%** | **0.88** |
| era 5 | 31 | 68.2% | 0.1% | 0.0% | 31.7% | 19.6% | 13.6% | 0.92 |
| era 4 | 27 | 67.9% | 0.1% | 0.0% | 32.0% | 19.8% | 13.9% | 0.94 |

**The first cut is the expensive one and every later cut is nearly free.** Going from 62 to
41 nodes costs 3.7 points of underplacement; 41 → 36 costs 0.9 more, 36 → 31 costs 0.6, and
31 → 27 costs 0.3. That shape argues against a timid cut: if the horizon moves at all, the
question is how far, not whether to hedge.

### 4.1 Why the cost is so flat, and the base rate it depends on

Because the generated cohort is concentrated in the early eras. The era a perfect
instrument would place them into:

| era | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| share | 25.4% | 30.4% | 16.7% | 5.1% | 14.3% | 0.3% | 0.4% | 0.8% | 0.6% | 6.0% |

A horizon on era 6 can still express a placement *into* era 7 — a learner stands in the
first era that does not fire — so the population it truncates is those who truly belong past
era 7, and that is **7.3%**, of which 6.0 points are the "cleared everything" bucket at era
10. The ceiling is one that 92.7% of this cohort never reaches.

**That is a property of `students.ts`, not of the diagnostic, and it is the single figure
this recommendation is most sensitive to.** The generator draws an ability cut per domain
uniformly over prerequisite depth; a real population of calculus-readiness learners might be
distributed very differently, and if it has more mass past era 7 the cost of the cap rises
in proportion. Nothing measured here can tell you which. It is also worth naming who the
7.3% are: the strongest learners, and the ones a demo audience notices being placed
correctly.

---

## 5. What the instrument stops being able to see

**The default, established as a mechanism rather than quoted as a value.** Two lines of
shipped code decide the whole question:

- `walk-engine.ts`'s `finalize` builds `placement_by_node` by iterating
  `resolveKnowledgeState(state)`, which returns `state.scope.map(...)`. A node outside the
  scope is **absent** from the map, not present with a low value.
- `eraPlacement.ts`'s `passed()` is `(estimate ?? 0) >= 2`. **Absent is 0. 0 is below the
  bar.**

So a skill the instrument does not ask about is treated exactly as a skill the learner
failed. That module states the consequence itself: *"an era the instrument cannot see
CANNOT fire."* It is the fail-closed rule INV-DIAG-6 asks for, applied to a case it was not
written about — INV-DIAG-6 is about nodes the *ceiling* left unresolved, and this is nodes
the *scope* never contained.

| horizon | nodes | skills never asked about | of those, held by the learner | in-scope nodes left `unknown` | eras that can never fire | hardest placement reachable |
|---|--:|--:|--:|--:|--:|---|
| era 10 (today) | 62 | 0 | 0.00 | 0.00 | 0 | era 10 |
| era 9 | 54 | 8 | 4.58 | 0.00 | 1 | era 10 |
| era 8 | 49 | 13 | 6.43 | 0.00 | 2 | era 9 |
| era 7 | 41 | 21 | 9.69 | 0.00 | 3 | era 8 |
| **era 6** | **36** | **26** | **11.63** | **0.00** | **4** | **era 7** |
| era 5 | 31 | 31 | 13.60 | 0.00 | 5 | era 6 |
| era 4 | 27 | 35 | 14.27 | 0.00 | 6 | era 5 |

At the recommended level, in plain terms:

- **26 of the 62 skills are never asked about.** Every one of them resolves to "not ready".
- **11.63 of them, per session, are skills the learner actually holds** — told to rebuild,
  with no question asked. That is what takes "sent back" from 2.34 to 13.30 in §2's table,
  and it is not an accuracy failure: it is the default working exactly as designed over a
  population it was not designed for.
- **Four eras can never fire**, so the deepest placement the instrument can express is the
  Industrial Era. The Atomic Age, the Information Age and the Cyberpunk Era stop being
  reachable placements: the rate-and-measurement half of Functions, Linear Functions & Rates,
  exponentials and logarithms, and the whole of trigonometry.
- **`unresolved-in-scope` is 0.00 at every level.** The other kind of silence — a node the
  instrument had in scope and ran out of budget before resolving — does not occur, because
  nothing truncates. §8.

**The 11.63 is the number to carry into the abandonment argument**, because it is the one
that moves the tiredness rather than removing it. The learner saves about 2.7 minutes of
diagnostic and is handed roughly a dozen lessons they did not need. Whether that is a good
trade depends on how much of the lesson channel a learner can skip out of, which is O-TX3's
question and not this document's.

---

## 6. Direction, and whether the case that matters exists

The brief asks specifically whether *severe* overplacement — landing somewhere the learner
cannot cope with even having seen it — happens, and how often.

**It does not happen, at any coverage level, and coverage reduction makes it rarer rather
than commoner.** Measured over 6,000 sessions per level:

| horizon | sessions overplaced at all | overplaced ≥ 1 era | ≥ 2 eras | ≥ 3 eras | unheld skills handed to an overplaced learner |
|---|--:|--:|--:|--:|--:|
| era 10 (today) | 105 of 6,000 | 1.8% | 0.1% | 0.0% | 1.13 |
| era 7 | 10 of 6,000 | 0.2% | 0.0% | 0.0% | 1.20 |
| **era 6** | **9 of 6,000** | **0.1%** | **0.0%** | **0.0%** | **1.00** |
| era 4 | 6 of 6,000 | 0.1% | 0.0% | 0.0% | 1.00 |

Two readings, and both matter:

**Overplacement is rare.** Fewer than two learners in a hundred at full coverage, fewer than
two in a thousand once the horizon moves.

**When it happens it is shallow.** The overplaced learner is handed everything up to their
placed era and is missing, on average, **one skill** out of all of it. That is the "can they
cope" measure, and 1.0 unheld skills is a learner who hits one lesson they should have had,
not a learner stranded. The reason is structural rather than lucky: an era fires only on a
conjunction over all its nodes, so an overplacement has to survive five to nine independent
chances to be caught, and the ones that survive are the near-misses. #386's *"multiplies the
fail-open probability down… harder the larger the era"* is the same fact from the other end.

**So the asymmetry the reframe leans on is real and it is already being exploited.** The
instrument is biased hard fail-closed and always has been; INV-DIAG-7 asks for that. What
coverage reduction does is push it *further* in that direction, which is the opposite of the
adjustment the reframe licenses.

---

## 7. The lever that would deliver "sometimes too far forward"

Because the shipped default is what makes coverage one-directional, the same 6,000 walks
were read a second time under the opposite default — a skill never asked about counted as a
**pass**. This is a post-hoc reading of records the harness already produced, not a second
simulation and not a change: nothing edits `eraPlacement.ts`'s `?? 0`, and doing so would be
an amendment to INV-DIAG-6 rather than a coverage decision. It is priced here because it is
the only configuration measured that produces the trade the lead described.

**On the horizon ladder it changes almost nothing**, which is itself the finding: the era
scan stops at the first era that does not fire, so a generous reading of the silent tail is
only ever reached by learners who already cleared everything measured. At the horizon on era
6, overplacement by ≥ 1 goes 0.1% → 0.3%.

**On an era-blind cut it changes everything**, because holes in early eras put the silence
where the scan actually looks. The clearest configuration measured, `era-thin` at 26 nodes:

| era-thin, 26 nodes | median | p90 | exact | over ≥1 | over ≥2 | over ≥3 | under ≥1 | mean abs | unheld skills handed over |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| shipped default (fail-closed) | 24 | 29 | 53.5% | 0.1% | 0.0% | 0.0% | 46.4% | 1.34 | 1.00 |
| counterfactual (fail-open) | 24 | 29 | **64.1%** | **20.1%** | **11.2%** | **5.1%** | **15.8%** | **0.88** | **2.28** |

That is, on this cohort, the lead's stated preference expressed as numbers: **8 minutes at
the median and 9.7 at the p90; one learner in five placed at least one era too far forward;
one in twenty placed three eras or more too far forward; and an overplaced learner missing
2.28 skills out of everything handed to them.** It is also *more* accurate overall than the
fail-closed reading of the same scope — mean absolute error 0.88 against 1.34 — because
almost half the fail-closed cohort was being underplaced by the silence.

**This is not a recommendation.** It requires flipping a default that a ratified invariant
fixes in the other direction, it needs the era-blind cut that §3.2 shows is the worse
coverage instrument on every fail-closed measure, and the 5.1% overplaced by three eras or
more is exactly the population whose recoverability the archipelago is being asked to
guarantee. It is recorded so that "shorter and occasionally too far forward" is a costed
option rather than an untested intuition, and so that whoever wants it knows it is a
placement-default decision and not a coverage one.

---

## 8. The ceiling is a different lever, and it is the wrong one

Capping `maxItems` also shortens the instrument. It is not the same change and it fails
differently: coverage decides what the instrument *asks*, the ceiling decides when it
*stops mid-measurement*. Measured at full 62-node coverage under the shipped policy, read on
the truncated cohort rather than on the average:

| maxItems | med | p90 | truncated | THEM: accuracy | THEM: sent back | everyone else: accuracy | underplaced ≥ 1 |
|---|--:|--:|--:|--:|--:|--:|--:|
| **70 — today** | 36 | 47 | **0.00%** | — | — | 95.6% | 26.5% |
| 50 | 36 | 47 | 2.63% | 87.8% | 7.3 | 95.7% | 26.6% |
| 45 | 36 | 45 | 17.32% | 88.8% | 6.7 | 96.1% | 27.4% |
| 40 | 36 | 40 | 37.10% | 86.4% | 8.2 | 96.7% | 33.1% |
| 35 | 35 | 35 | 52.33% | 83.4% | 10.0 | 97.3% | 41.4% |
| 30 | 30 | 30 | **64.25%** | **79.9%** | **12.1** | 97.8% | 47.8% |

**A 30-item ceiling puts every learner at 30 items and truncates 64% of them**, scoring that
cohort at 79.9% and telling it to rebuild 12.1 skills it already held. That is the same
family of failure #572 recorded at the pre-cut policy (84.6%, 9.5 skills) and emptied; it
comes straight back. Underplacement nearly doubles, 26.5% → 47.8%, because a truncated walk
leaves nodes `unknown` and `unknown` is fail-closed.

Note the shape of the median column: **the ceiling does not shorten the typical session at
all until it drops below the median**, at which point it stops being a backstop and becomes
the instrument. 45 and 40 leave the median at 36 while truncating 17% and 37% of learners
respectively — all cost, no visible benefit.

These figures are **not** a reproduction of #572's ceiling row: that was measured under the
pre-cut policy at `maxItems: 70`, and these are under the shipped post-cut policy at
`maxItems` swept. Same family of failure, different measurement.

---

## 9. Is 30 reachable, and what does it cost

**At the median, yes, at 36 nodes.** Horizon on era 6: median 28 items, 9.3 minutes. The
price is §4's and §5's — 2.9 points of exact placement, 4.6 more points of underplacement,
26 skills the instrument stops asking about, 11.63 of them held per session, and four eras
that can no longer be reached as a placement.

**At the p90, only at 27 nodes**, and only just: horizon on era 4 gives p90 29, median 25,
9.7 minutes at the p90. The extra cost over the recommended level is smaller than it looks
in placement terms (exact 68.8% → 67.9%, underplaced ≥ 1 31.1% → 32.0%) and larger than it
looks in silence terms: **35 of 62 skills never asked about, 14.27 held per session, and the
deepest reachable placement becomes the fifth era — the Medieval, before the coordinate
plane exists.** A product that cannot place anyone past the introduction of axes is a
different product, and that is a call for the lead rather than a number.

**A third reading, if "around 30" means "the whole thing feels like thirty questions":** the
horizon on era 5, 31 nodes, median 27 and p90 31, is the closest single row to 30 on both
percentiles at once. It costs 0.6 points of underplacement over the recommendation and five
more silent skills.

For completeness, the shape at the recommended level, since a median describes almost nobody
when the distribution is flat — which was #572's finding about the pre-cut instrument:

```
  horizon at era 6 — med=28 mean=25.0 p90=35 max=42
      6-8     8.2%  ########
      9-11    4.8%  #####
     12-14   11.1%  ###########
     15-17    2.8%  ###
     18-20    3.9%  ####
     21-23    6.2%  ######
     24-26    6.3%  ######
     27-29   11.2%  ###########
     30-32   19.8%  ####################
     33-35   18.8%  ###################
     36-38    6.3%  ######
     39-41    0.7%  #
     42-44    0.0%
```

It is bimodal: 24.1% of learners finish in under 15 items (the weakest, who exit fast —
§4.2 of the ratified amendment) and 38.6% sit in the 30–35 band. The 42–44 bucket rounds to
0.0% and the longest walk observed in 6,000 is 42 items.

---

## 10. What this cannot establish, and one premise that is not yet true

**Ground truth is synthetic.** Every figure is the instrument's self-consistency against a
MODEL of a learner, never placement validity against a human. That caveat is
`Diagnostic_11_Node_Scope_Decision_Evidence.md` §5.1's and it is inherited unchanged. The
era-level figures inherit one more on top: eras one to five are each exactly one domain and
the generator draws one ability cut per domain, so era-level agreement on those eras is
partly the generator agreeing with itself. `era-placement.sim.test.ts` measures that
artifact directly and this document does not re-derive it.

**§4.1's base rate is the load-bearing assumption** and it is a property of the generator.
The recommendation is worth exactly as much as "7.3% of learners belong past the seventh
era" is worth.

**The archipelago is a proposal, not the product.** The reframe rests on a learner being
able to fly back to an earlier island, reset it, and play the age properly. That is
#568 §8.7b, which reads
**`mergedAt: null`, state OPEN** at the time of writing — read off the PR rather than
inferred from pushes — and whose own description says it is *"explicitly for after Friday"*
and contains *"no code, no behaviour change"*. Read at `613b4333`, what the tree offers an
overplaced learner today is different in kind:

- **During the catch-up walk**, `catchUpWalk.ts`'s `stop_here` — *"Stop here and learn this
  age"*, shipped in `catchUpStrings.ts` and wired in `EraCatchUpPrompt.tsx` — ends the walk
  and makes that age the landing age, forfeiting every later skip. It is a real recovery,
  and it is offered **before** the learner has seen whether they can cope, once per age,
  and never again afterwards.
- **After landing**, the city roster is cumulative (`eraGatedRoster.test.ts`: an era offers
  its own buildings and every earlier era's), so earlier ages' skills remain on the menu.

None of that is the per-island reset the reframe describes, and the asymmetry argument is
weaker without it: today's recovery is a decision taken in advance, not a correction made
after the fact. **This does not change any measurement above** — coverage reduction produces
underplacement, which the archipelago would not have cheapened anyway. It is recorded
because the reframe was offered as the reason the trade is now acceptable, and the mechanism
it names is not in the tree.

**Nothing here is decided.** No constant, policy or scope moved. Whether to cut the horizon
at all is the lead's; if it is cut, whether `ALWAYS_ADMINISTERED` should keep widening a
horizon that was *chosen* rather than forced (§3.3) is a diagnostic-lane question that would
need answering first.

---

## 11. Reproduction

The harness's own warning is worth repeating: **`sample-size.local` is per-profile and
pooled by three**, so 2,000 gives n = 6,000. Always read the printed `n=` rather than the
file.

```
echo 2000 > engines/diagnostic/sim/sample-size.local
npx vitest run --config engines/diagnostic/sim/vitest.sim.config.ts \
  engines/diagnostic/sim/coverage-sweep.sim.test.ts --disableConsoleIntercept
```

`--disableConsoleIntercept` is required or the harness runs green and prints nothing. A full
run is about four minutes. The harness stays excluded from CI by placement — outside
`engines/diagnostic/src/`, so neither vitest config collects it and `tsc --build` never sees
it — and `test/diagnosticSimScopeMirror.test.ts` now names it, so a stale live-scope mirror
fails loudly rather than quietly recomposing every reduced level out of the wrong 62 nodes.
That addition was observed red under injection (a local copy of the scope in place of the
import) and green again on restore.

**Every figure above was produced twice**, once at `258856a1` and once at `613b4333` after
merging `integration`, and the two runs are byte-identical — the diff of the two outputs is
empty. `#600` moved only art assets and one design-refs README, and `git diff 258856a1..
613b4333 -- engines/ packages/skill-graph packages/item-bank apps/web/src/catchup
apps/web/src/diagnostic test/` is empty, so the measured surface did not move. The
diagnostic's own CI suites (`npx vitest run engines/diagnostic services/diagnostic-runtime`)
run green at the merged tip, as does `tsc --build`.

To reproduce §0's independent baseline through the shipped harness instead:

```
npx vitest run --config engines/diagnostic/sim/vitest.sim.config.ts \
  engines/diagnostic/sim/tail-policy.sim.test.ts --disableConsoleIntercept \
  -t "scope neutrality"
```
