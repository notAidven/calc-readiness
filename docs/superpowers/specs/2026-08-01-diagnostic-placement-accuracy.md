# Can the diagnostic actually place a learner? (COMPANION MEASUREMENT + DESIGN RECORD)

**Recorded 2026-08-01. Every figure below was first measured at `integration` @
`1fbbd5b9`, which is the merge commit of
#380 (`mergedAt`
`2026-08-01T18:59:28Z`, read from the API), then RE-MEASURED at `c9001a1a`, which merges
`integration` @ `56497b6b` after
#374,
#381 and
#382 landed underneath this
record mid-write. **Both harness runs are byte-identical**, diffed rather than asserted,
and all 14 file:line citations were re-checked against an expected token at the merged
tip. That merge is entirely in the Hard Winter and lesson-figure lanes and touches no file
this record cites, which is what the re-check establishes rather than assumes. Read the
figures as measured at `c9001a1a`.**
**Status: MEASUREMENT + DESIGN RECORD. No production code changed. Two measurement
harnesses added under the established `engines/diagnostic/sim/` CI exclusion.**

**Companion to `docs/superpowers/specs/2026-08-01-test-out-placement-experience.md`, whose
§5 offers five options for what a tested-out learner does. This record answers the question
that gates all five.**

**The lead stopped the option choice on a prior question, and he was right to:**

> *"ok timeout - one thing we have to consider is the diagnostic itself; its supposed to be
> able to diagnose with relatively high accuracy which domain placement they belong in"*

---

## 1. The answer up front

**The instrument is safe for this and it was not obvious that it would be. The compounding
the lead feared is real and large, and it runs entirely in the safe direction, because
requiring every node of an era to pass is a conjunction and a conjunction is a fail-closed
amplifier.** Seven findings, one per question asked.

1. **The published 96.0% is per NODE, over synthetic ground truth, and it is not the claim
   the options need.** Quoted in §2. It is the instrument's self-consistency against a
   model of a student, never placement validity against a human, and that caveat is
   inherited by every number in this record.

2. **The ~39:1 fail-closed ratio is verified, and it is `0.426 / 0.011`**: mastered skills
   sent back for review against real gaps advanced past, per session, over the shipped
   policy at the 11-node scope. Reproduced digit for digit (§3.1).

3. **But it does not survive widening, and that is new.** At the full 62-node scope the
   same ratio is **7.3:1**, and the absolute fail-open rate goes from **0.011 to 0.332**
   nodes per session, a 30x increase (§3.2).

4. **Era-level precision is 97.3% to 100% at every era and every scope measured.** Of the
   learners the instrument would hand an era to, essentially all had earned it. Handing
   over four eras in a row: precision **100.0%** on 516 such students at the full scope
   (§4.3).

5. **Era-level sensitivity collapses instead, which is where the compounding actually
   bites.** Of the 22.2% of students who genuinely know all of eras one to four, only
   **38.7%** have all four fire. That is a real cost and it is entirely fail-closed (§4.4).

6. **And the sensitivity collapse turns out not to matter, because Option C's gate is per
   node.** An eligible learner whose era does not fire practises the one or two nodes that
   did not pass, not the whole era. Measured: for eras one to four, an eligible learner
   owes **1.96 nodes of practice, 9.8 items against a 105-item baseline, 90.7% removed**
   (§7). The all-or-nothing figure, 6.9% of students handed all four, prices Option B and
   not Option C.

7. **The checker blocker is still live, unchanged, and it is first in the queue.** Measured
   at the tip: **22 of 66 D1+D2 walk items ungradable, 4 of the 5 D2 nodes wedge the walk**
   (§9). Nothing in this record or in the options record is reachable until that moves.

**Does the recommendation change? No, and it gains a safety argument it did not have. Two
things in the merged record are wrong and are corrected in §11.**

---

## 2. What the existing figures are accuracy OF

`docs/Diagnostic_11_Node_Scope_Measurement.md:158` states it in one line:

> **Truth accuracy: 96.0%** (fraction of the 11 nodes classified correctly against each
> student's generated ground truth).

`docs/Diagnostic_11_Node_Scope_Decision_Evidence.md:275-291` is the careful version, and
its four qualifications are the reason the figure cannot be read as an era claim:

> Truth accuracy is, per student, **the fraction of the 11 scope nodes whose resolved
> status matches that student's generated ground truth**, averaged over students.

> - **Binary on `passed`.** `resolveKnowledgeState`'s `failed`, `pruned` and absent all
>   collapse to "not passed". A node the walk measured and failed and a node it never
>   reached score identically.
> - **Denominated over the whole scope**, not the nodes probed. At a median of 6 probed
>   nodes of 11, roughly **five of the eleven** are graded on inference and pruning rather
>   than on an answer.
> - **Ground truth is synthetic.** It is the coherent downward-closed known-set of a
>   modelled student, so this is a measure of the instrument's self-consistency against a
>   model, not of placement validity against a human.
> - **It is an average over students**, so it says nothing on its own about whether the
>   error is spread thin or concentrated.

**So the published claim is: per node, against a model, averaged.** It is not a claim about
placing a learner in an era, it is not a claim about any individual learner, and it is not
a claim about a human at all. The lead's phrase *"which domain placement they belong in"*
is the era-level claim, and nothing in the repository measured it before this record.

**One further thing the figure is not.** It is not a statement about the live product.
`docs/README.md:126` scopes the shipped diagnostic to the six D1 nodes, and the 96.0% was
measured over an 11-node candidate scope that the checker cannot currently serve (§9).

---

## 3. The direction of the error

### 3.1 The ~39:1 is verified, and this is what it is a ratio of

`Diagnostic_11_Node_Scope_Decision_Evidence.md:348-358` gives the table and the sentence:

> | policy | cohort | mastered skills sent back for review | real gaps advanced past |
> |---|---|--:|--:|
> | shipped (threshold 1) | all students | 0.426 | 0.011 |

> The error runs ~39:1 in the fail-closed direction, which is the safe one: the learner
> loses time, not foundation.

**It is `0.426 / 0.011 = 38.7`, the shipped policy's two absolute per-session error counts
over all students at the 11-node scope.** It is not a ratio of the *deltas* between
policies, which the surrounding paragraph also quotes (0.163 against 0.003, which is 54:1),
and reading the wrong pair off that paragraph is easy. Re-measured independently by
`engines/diagnostic/sim/era-placement.sim.test.ts` at the tip, n = 6,000:

```
[1] PER-NODE ANCHOR   truth accuracy=96.0%   items med=12 mean=11.79   ceiling hit=0.0%
    direction per session: mastered-sent-back=0.426  gaps-advanced-past=0.011  ratio=39.3:1 fail-closed
```

**That reproduces the published 96.0%, the published median of 12, the published mean of
11.79 and both published error counts, from an independently written harness.** Two
harnesses that agree are evidence; one harness used twice is not, and this file follows
`students.ts`'s own statement of that discipline.

### 3.2 It does not survive widening, and nobody had measured that

The 39:1 is a property of the **11-node** scope. Driven at the two wider scopes the options
would actually need:

| scope | nodes | confirm threshold | truth accuracy | mastered-sent-back | gaps-advanced-past | ratio |
| --- | --: | --: | --: | --: | --: | --: |
| D1+D2 (published anchor) | 11 | 1 | 96.0% | 0.426 | **0.011** | **39.3:1** |
| eras one to four | 21 | 2 | 95.2% | 0.977 | **0.026** | **37.8:1** |
| full in-product | 62 | 7 | 95.6% | 2.417 | **0.332** | **7.3:1** |

**Per-node accuracy barely moves and the fail-open rate rises 30x.** The mechanism is
visible in the third column: `confirmThresholdFor` scales the confirm threshold with scope,
so at 62 nodes a node whose failure cone is smaller than 7 can be decided on a single item,
and far more nodes qualify. The 70-item ceiling also starts to bind, at 1.5%.

**This matters most for the option that has no second check.** It is recorded here rather
than buried because "the diagnostic errs 39:1 in the safe direction" is exactly the kind of
sentence that gets carried forward into a decision about a scope it was never measured at.

---

## 4. Era-level placement accuracy

### 4.1 Method, and what it assumes

`engines/diagnostic/sim/era-placement.sim.test.ts` drives **the real walk engine** one
scored outcome at a time, over synthetic students drawn by the same generator the published
figures use, at three scopes. For each era it records two booleans per student:

- **`fires`** = every node of the era resolved `passed`. This is the condition the ruled
  test-out gate needs, since `placement_estimate >= 2` is exactly `passed` and an era
  test-out requires all of them.
- **`trulyKnown`** = every node of the era is in the student's ground truth.

**The walk needs no items and no checker**, because the harness feeds outcomes directly, so
the checker blocker in §9 bounds the real instrument and not this measurement. That is why
an era-level figure is available today for scopes the product cannot yet serve.

**What it assumes, stated before any number.** Ground truth is synthetic, so this is the
instrument's self-consistency against a model. Noise is the published mild condition, slip
0.10 and guess 0.05. The base rates below (P(known)) are properties of the generator's
ability distribution and not of any human population. n = 6,000 per scope, 2,000 in each of
three ability profiles.

### 4.2 Why a raw "era-correct rate" is the wrong measure, and is not reported

The obvious statistic is the share of students for whom `fires === trulyKnown`. **It is
base-rate dominated and would be actively misleading.** Only 9.6% of generated students
know the Medieval era, so a rule that never fires at all scores over 90% on it. An early
version of this harness reported exactly that number and it made a five-node era in the
middle of the sequence look like the most accurate thing in the instrument.

The two numbers that carry meaning are conditionals, and they answer different questions:

- **Sensitivity, P(fires | truly known).** Of the learners who earned the skip, how many
  get it. **1 minus this is the fail-closed rate**: annoying and safe.
- **Precision, P(truly known | fires).** Of the eras handed over, how many were earned.
  **1 minus this is the fail-open rate**: the direction test-out must never take with an
  underprepared adult, and the only one of the two that is a safety number.

Every conditional below prints its denominator, so a reader can see when a percentage is
resting on a handful of students.

### 4.3 The results

**Per era, at the full 62-node scope** (the scope every option in §5 assumes):

| era | domains | nodes | P(known) | P(fires) | sensitivity | precision | fail-open |
| --- | --- | --: | --: | --: | --: | --: | --: |
| prehistoric | D1 | 6 | 74.6% | 73.2% | 95.5% [4475] | **97.3% [4392]** | **2.0%** |
| neolithic | D2 | 5 | 45.0% | 31.6% | 70.2% [2697] | 100.0% [1894] | 0.0% |
| bronze_age | D3 | 5 | 33.3% | 25.0% | 75.1% [1999] | 99.9% [1502] | 0.0% |
| classical | D4 | 5 | 29.7% | 20.9% | 70.4% [1782] | 99.8% [1257] | 0.1% |
| medieval | D5 | 5 | 9.6% | 6.5% | 67.8% [574] | 100.0% [389] | 0.0% |
| renaissance | D10/D4/D5/D6 | 6 | 14.8% | 9.8% | 65.6% [886] | 98.6% [589] | 0.1% |
| industrial | D4/D6 | 6 | 27.0% | 18.6% | 68.8% [1620] | 99.9% [1115] | 0.0% |
| atomic_age | D6/D7 | 9 | 15.4% | 6.6% | 43.2% [922] | 100.0% [398] | 0.0% |
| information_age | D8 | 6 | 17.5% | 8.5% | 48.6% [1052] | 100.0% [511] | 0.0% |
| cyberpunk | D9 | 9 | 16.2% | 5.8% | 35.7% [971] | 100.0% [347] | 0.0% |

**Cumulative over the first k eras**, at the full scope. Precision here is P(all k truly
known | all k fire): of the learners handed k eras in a row, the share who earned every one.

| k | P(all fire) | P(all known) | sensitivity | precision | fail-open |
| --: | --: | --: | --: | --: | --: |
| 1 | 73.2% | 74.6% | 95.5% [4475] | 97.3% [4392] | 2.0% |
| 2 | 31.1% | 45.0% | 69.1% [2697] | 100.0% [1864] | 0.0% |
| 3 | 14.7% | 27.4% | 53.6% [1642] | 99.9% [881] | 0.0% |
| **4** | **8.6%** | **22.2%** | **38.7% [1334]** | **100.0% [516]** | **0.0%** |
| 10 | 0.2% | 5.3% | 3.8% [318] | 100.0% [12] | 0.0% |

At the 21-node scope, which is eras one to four exactly, the four-era row reads **P(all
fire) 6.9%, sensitivity 30.9% [1334], precision 100.0% [412], fail-open 0.0%**.

### 4.4 The compounding is real, it is large, and it runs entirely in the safe direction

**The lead's arithmetic was right about the size and wrong about the sign of the
consequence.** He predicted that a six-node era at 96% per-node accuracy would be right
about `0.96^6`, roughly 78%, and four eras about 37%, with correlation making the truth
better than that. Measured at the 21-node scope, the share of students with **every node in
eras one to four classified correctly** is **54.0%**, against a computed independence
prediction of **35.5%** from the same run's own per-node accuracies. So his figure was close
and correlation lifts it by 18.5 points.

**But that quantity is not a safety number, and it is the one that misleads.** The 46% of
students whose node classification is not perfect are overwhelmingly *under*-placed. The
reason is structural rather than lucky:

> **An era test-out is a conjunction. To fire wrongly, EVERY node in the era must pass,
> including the ones the learner does not know. To fail closed, ONE node is enough.**

So the conjunction multiplies the fail-open probability down and the fail-closed
probability up, and it does so harder the larger the era. That is exactly what the table
shows: sensitivity falls from 95.5% at era one to 35.7% at the nine-node Cyberpunk era,
while precision stays pinned at or near 100% throughout.

**The compounding is therefore a cost in utility, not in safety.** Of the 22.2% of students
who genuinely know all four of eras one to four, only 38.7% have all four fire. That is
13.6 points of eligible learners doing work they did not need, which is precisely the
complaint the whole placement-experience record exists to address. §7 shows why it costs
much less than it looks.

### 4.5 The independence comparison, labelled

**The `indep-pred` column in the harness is a computation, not a measurement**, and it is
reported as one. It is the product of that era's own measured per-node accuracies from the
same run, which is what "every node in the era correct" would be if node errors were
independent. Comparing it against the measured figure isolates the correlation:

| scope | measured, all nodes correct in eras 1-4 | independence prediction | lift |
| --- | --: | --: | --: |
| eras one to four (21 nodes) | 54.0% | 35.5% | **+18.5 pts** |
| full in-product (62 nodes) | 52.0% | 44.7% | **+7.3 pts** |

Node errors are not independent, the direction of the dependence helps, and the size of the
help depends on the scope. **No figure in this record is a product of per-node accuracies
except the ones in this table, and they are marked.**

### 4.6 The generator-artifact control, which failed to confirm the artifact

**This is the check that mattered most and it came out against the hypothesis.** The
student generator draws **one ability cut per domain** (`engines/diagnostic/sim/students.ts`
lines 24-35, which warns in its own words that same-depth same-domain nodes *"almost always
share a truth value, by construction of the generator, not by anything about the DAG"*).
And **eras one to five are each exactly one domain**: D1, D2, D3, D4, D5. So on those eras
the generator's correlation boundary and the era boundary are the same boundary, and the
good era-level numbers above could be measuring the generator.

Eras six to eight span two to four domains, where the generator does **not** correlate
across the era. Same instrument, same generator, same noise, at the full scope:

| group | eras | mean size | measured, all nodes correct | independence prediction | lift |
| --- | --: | --: | --: | --: | --: |
| single-domain eras | 7 | 5.9 | 81.5% | 77.5% | **+4.0 pts** |
| multi-domain eras | 3 | 7.0 | 78.4% | 72.6% | **+5.8 pts** |

**The multi-domain eras show a LARGER lift, not a smaller one.** The artifact predicted the
opposite. The reading is that most of the correlation is coming from the prerequisite DAG,
which `closeDownward` enforces on the ground truth and which the walk's own inference and
pruning follow, rather than from the generator's per-domain ability cut. That correlation
is a property the real world shares, because a prerequisite really is a prerequisite.

The by-profile split says the same thing independently. `independent-strands` draws each
domain's ability with no shared term at all:

| profile | per-node | era sensitivity | era precision | fail-open |
| --- | --: | --: | --: | --: |
| homogeneous (one ability, no jitter) | 95.1% | 69.8% [7072] | 99.2% [4980] | 0.2% |
| heterogeneous (jitter 2.5) | 95.3% | 71.9% [6074] | 98.9% [4414] | 0.2% |
| independent-strands (no shared ability) | 96.3% | 77.2% [3832] | 98.6% [3000] | 0.2% |

**Era precision moves by 0.6 points across the whole range of correlation structures the
generator can produce.** So the precision result is not an artifact of the ability model.

**This is a control that failed to find what it was looking for, which is worth exactly as
much as a control that finds something and no more.** It rules out one specific artifact.
It does not make the synthetic ground truth real.

### 4.7 What none of this establishes

- **Nothing about a human.** Every figure is the instrument against a model. `Decision
  Evidence` §5.1's caveat is inherited whole, and no amount of era-level structure on top
  of it converts it into placement validity.
- **Nothing about the base rates.** P(known) per era is the generator's ability
  distribution. A real cohort of underprepared adults would have a different one, and
  precision in particular is base-rate sensitive in the usual way: a population where
  almost nobody knows an era would push precision down for the same instrument.
- **Nothing about item quality.** The walk is driven on synthetic outcomes, so this says
  nothing about whether a real item measures what it claims.

---

## 5. Does Option C's trial act as a second gate?

**Partly, and the honest word is DETECTOR rather than gate.** The brief's reading is
directionally right and the mechanism is different from the one it proposed, which changes
what can be claimed.

**Why it is not a gate.** Under Option C a learner fail-open on one node still has to run
that era's trial. **D-ET10** puts two items on every node, and **D-ET4** requires every node
answered correctly. But **D-ET13** re-queues a further question from any node that was
missed and the ceremony cannot finish while the queue is non-empty, and the re-queue is
unbounded. So a learner who does not know the node is not blocked; they are made to keep
answering it until they get one right.

**Why it is a good detector, and this is D-ET13's own stated purpose.** The ruling says the
re-queue exists because it *"checks the specific skill that failed rather than making the
learner generically slower, which is all a progress penalty alone would do"*
(`2026-07-29-era-trial-contract.md:1215`). That is precisely the property a wrong placement
needs: the error is localized to the node that was over-placed, in front of the learner, at
the moment it matters.

**The arithmetic, and it is a COMPUTATION from ruled parameters plus the simulation's noise
model, not a measurement of anything running.** At the harness's guess rate of 0.05:

| quantity | value | from |
| --- | --: | --- |
| P(a learner who does not know node X answers both of X's items correctly) | **0.0025** | `0.05^2`, D-ET10's two items per node |
| P(the over-placement is surfaced as at least one miss) | **99.75%** | complement of the above |
| Expected items on X before the first correct answer | **~20** | `1 / 0.05` |
| P(the ceremony finishes with X never answered correctly) | **0** | D-ET13, the queue must empty |

Combined with the measured era-one fail-open rate of 2.0% at the full scope:

| option | P(a learner is silently advanced past a real gap in era one) |
| --- | --: |
| **B**, handed the city on the diagnostic's word | **2.0%**, about 1 in 50 |
| **C**, the trial runs first | **0.005%**, about 1 in 20,000 |

**A factor of 400, and it is a floor rather than a point estimate**, because an era with two
over-placed nodes is harder to slip through, not easier. **Caveat on the input:** 0.05 is
the simulation's guess parameter, not an empirical figure about humans answering trial
items, and the trial's items are not the diagnostic's items.

**What C actually converts, stated exactly.** It does not convert a wrong placement into a
blocked advance. It converts a **silent** advance into a **visible, localized stall on the
one skill that was over-placed**, costing the learner roughly 20 extra items on that node
while **D-ET12** floors their progress at the last locked beat, and it hands them
**D-ET14**'s end-of-attempt screen carrying the per-skill accuracy split and a practice
recommendation that names the skill. That is a materially different claim from "a second
gate catches it", it is weaker, and it is still the difference between an instrument error
that teaches the learner something and one that costs them a foundation.

---

## 6. What accuracy each option requires to be safe

| option | what rides on the diagnostic | required precision | met at the tip? |
| --- | --- | --- | --- |
| **A**, play it all | Nothing at era level. The lesson skip is already ratified and the practice is still required, so a wrong placement costs a lesson nobody was going to be graded on | **None** | n/a |
| **B**, hand it over | Everything. There is no second look of any kind, so B's residual harm rate **equals** the fail-open rate | **Whatever bar makes a 1-in-50 silent advance acceptable, and nobody has set one.** B is also the option the §3.2 widening degradation hits hardest, since it is the only one with nothing downstream of the node decision | **No**, in the sense that the bar does not exist to be met |
| **C**, the trial is the test-out | Only that stalls are rare. 99.75% of fail-opens surface as a miss on the specific node | **Low.** At 2.0% fail-open, 1 in 50 learners handed era one meets a stall on one node. That is a UX cost, not a learning risk | **Yes** |
| **D**, one founding | Identical to C: same evidence total, same detector, same per-node re-queue | **Low**, same as C | **Yes** |
| **E**, the reserved ceremony | More than C. §5.5 samples **one** item per node rather than two and specifies no re-queue, so a node slips through at `0.05` rather than `0.05^2` | **~20x higher than C per node**, and E hands over the most eras per unit of evidence. E's evidence design is the one this record would change | **Not as specified** |

**The ordering that falls out of this is worth stating plainly: the three middle options are
all safe and the two extremes are the ones with an accuracy problem.** B's is fatal and
E's is fixable by giving the founding two items per node and a re-queue, at which point E
costs what C costs and its whole argument was that it costs less.

---

## 7. Is it worth building? Two ledgers, and they disagree

§4.4 leaves a real worry: if only 38.7% of eligible learners get all four eras, is the
feature worth the rulings it needs? **The answer depends on which gate is priced, and the
obvious pricing is the wrong one for the recommended option.**

**Option C's gate is per node.** `mastery >= 2 OR placement_estimate >= 2`, per node. So a
learner with five of six nodes passed does not lose the era's saving; they practise the one
node that did not pass, which lifts it to mastery 2, and the era's conjunction is then
satisfied. The all-or-nothing era-fire rate prices Option B, which hands over whole eras on
the diagnostic's word alone. Both, at each scope, against a 5-item practice set per node
(`docs/Mastery_Scoring_Spec.md:51`):

| scope | baseline (Option A) | all-or-nothing, eligible learner | **per-node residual, eligible learner** |
| --- | --: | --: | --: |
| D1+D2 | 55 items | 77.8% removed | **0.74 nodes, 3.7 items: 93.3% removed** |
| eras one to four | 105 items | 72.6% removed | **1.96 nodes, 9.8 items: 90.7% removed** |
| full in-product | 310 items | 62.4% removed | **5.83 nodes, 29.1 items: 90.6% removed** |

**So the sensitivity collapse costs an eligible learner about ten practice items across
four eras, not ninety.** The measured partial credit is what carries it: given a learner
truly knows an era, the walk passes **92.4% to 99.2%** of its nodes at the full scope. The
conjunction fails on the odd node, and the odd node is cheap.

**What the era conjunction still decides** is whether the trial opens **immediately** or
after one or two nodes of practice. That is the ceremony-pacing question the merged record
is about, and it is worth much less than the practice saving.

---

## 8. Does the recommendation change?

**No. Option C stands, and it gains an argument.** But two claims in the merged record are
wrong and one is upgraded.

**Upgraded: C now has a safety argument it did not have.** §6 of the merged record
recommends C on experience grounds. The measurement adds that C is also the option whose
failure mode is *informative*: the conjunction makes a wrong era test-out rare (precision
97.3% to 100%), and D-ET13's re-queue localizes the survivors to the node that was
over-placed. **B's residual harm is 400x C's**, and that gap is the single strongest
argument in either record for not taking B.

**Wrong 1: the merged record's §5.6 table implies C's benefit is contingent on the era
firing.** It is not. §7 measures it: the practice saving is per node and survives the
conjunction failing.

**Wrong 2: §5.3's "Total interactive: 42 trial questions, 21 placements, 2 crises" omits
the residual practice.** An eligible learner also owes about **1.96 nodes, roughly 10
items**, on the nodes the walk did not pass. The claim that C removes 105 practice items
should read **about 95 of 105**. The argument is unaffected and the number was overstated.

**What I would change if the lead takes E**: give the founding two items per node and a
re-queue, per §6. Without them E is the one option whose evidence design is measurably too
thin for what it decides.

**And the honest bound on all of it.** The lead offered a legitimate conclusion in advance:
that if era-level accuracy were poor, no option would be safe until the instrument
improved. **That conclusion is not reached, and it would have been reached if precision had
come out where sensitivity did.** What replaces it is narrower and still binding: **the
instrument is good enough for era-level test-out, and it cannot be used at all until the
checker moves** (§9).

---

## 9. The checker blocker, re-measured at the tip

`Diagnostic_11_Node_Scope_Measurement.md:36` recorded the blocker at `c870c0b5`:

> **Does the live v1 checker grade the D2 walk items?** | **No.** 22 of 66 walk-servable
> items are ungradable, and 4 of the 5 D2 nodes would hang the walk. **A checker change is
> required.**

**A finding expires when the tree moves, so it is re-measured rather than inherited.**
`engines/diagnostic/sim/checker-blocker.sim.test.ts` builds the shipped v1 checker exactly
as the two live walk composition points build it and hands every D1+D2 walk item its own
declared `answer_key`, which is the canonical correct answer. A checker that cannot return
`correct` for an item's own key cannot grade that item for anybody. At `c9001a1a`:

```
===== v1 CHECKER OVER THE D1+D2 WALK ITEMS =====
checker version = 1; items in scope = 66 (of 126 in both packs)

  EXP.1   items= 6  graded= 2  ungradable= 4   <- WEDGES THE WALK
  NUM.2   items= 6  graded= 6  ungradable= 0
  NUM.3   items= 6  graded= 6  ungradable= 0
  NUM.4   items= 6  graded= 6  ungradable= 0
  NUM.5   items= 6  graded= 6  ungradable= 0
  NUM.F   items= 6  graded= 6  ungradable= 0
  NUM.S   items= 6  graded= 6  ungradable= 0
  RAD.1   items= 6  graded= 0  ungradable= 6   <- WEDGES THE WALK
  RAD.2   items= 6  graded= 0  ungradable= 6   <- WEDGES THE WALK
  RAD.3   items= 6  graded= 6  ungradable= 0
  RAD.4   items= 6  graded= 0  ungradable= 6   <- WEDGES THE WALK

  TOTAL: 22 of 66 items ungradable; 4 of 11 nodes wedge.

--- REASONS ---
   15  invalid_input/unsupported_syntax
    4  invalid_input/unsupported_symbolic_denominator
    3  invalid_input/unknown_symbol
```

**Unchanged, item for item and reason for reason**, against that record's §2 table and its
reason breakdown at lines 79-81. And the composition points still build v1 at the tip:
`createD1AnswerChecker` is constructed in
`services/diagnostic-runtime/src/aurora-server.ts` (four sites, including the walk config at
line 270) and in `apps/web/src/diagnostic/browserRuntime.ts`, with
`services/diagnostic-runtime/src/{walk-runtime,runtime}.ts` declaring
`equivalence_checker_version: D1_CHECKER_VERSION`, which is `1`.

**Why it is worse than a normal failure**, from that record's §2: the status is
`invalid_input` rather than `scoring_error`, and `invalid_input` is **not** in
`FAULT_STATUSES`, so the walk re-serves the same item forever at a reported 0% fault rate
and the validity gate never fires.

---

## 10. Ordering, which is the practical output

The lead's note that "the ordering matters" is right and the order is now fully determined:

1. **The checker migration** to v2 across both walk composition points, atomically. Nothing
   below is reachable without it, and it is the only item here that is a hard blocker
   rather than a cost. Already scoped in `Diagnostic_11_Node_Scope_Measurement.md` §3.
2. **The item authoring**, measured elsewhere at 246 frozen items owed across 41 nodes
   with no walk items at all (`2026-07-31-game-completion-ceremony-design.md` §3.2, at
   `2a484b1b`, not re-measured here). This is the long pole.
3. **The widening decision itself**, which is Gabe's, declined 2026-07-26
   (`engines/diagnostic/README.md:107-110`) and unchanged by this record. What this record
   adds is that the instrument is good enough at era granularity to justify revisiting it,
   which was previously unknown rather than assumed.
4. **Then, and only then, the placement-experience option**, which is O-TO1.

**Note the confirm-threshold interaction, which belongs to step 3 rather than to step 4.**
§3.2 measures that widening to 62 nodes takes the node-level fail-open rate from 0.011 to
0.332 per session, driven by `confirmThresholdFor` scaling with scope. The era conjunction
absorbs it, so it does not reach the options. It does reach anything that reads a node's
placement directly, and the "You've unlocked N buildings" celebration is exactly that.

---

## 11. What this changes in the merged record

`docs/superpowers/specs/2026-08-01-test-out-placement-experience.md` is amended by a pointer
at its head rather than rewritten, following the convention the era documents use: the
ruling wins, the superseded text stays in place carrying a note, nothing is deleted.

| Place | What changes |
| --- | --- |
| §5.3, "Total interactive" | Add the residual practice: an eligible learner also owes about 1.96 nodes, roughly 10 items. "105 practice items removed" becomes "about 95 of 105" (§8, Wrong 2) |
| §5.6, the comparison table | The row implying C's benefit needs the era to fire is wrong. C's saving is per node and survives the conjunction failing (§7) |
| §6, the recommendation | Gains the safety argument: B's residual harm is 400x C's (§5) |
| §5.5, Option E | Its one-item-per-node sample is measurably too thin for what it decides. Fixable, at the cost of E's own argument (§6) |
| §5.2, Option B | Gains a quantified objection: 2.0% of all students silently advanced past a real gap in era one, at the full scope, with nothing downstream to catch it |

---

## 12. Open items

| Id | Question | Who | Note |
| --- | --- | --- | --- |
| **O-ACC1** | **The checker migration to v2 across both walk composition points.** Hard blocker on everything | Gabe (diagnostic lane) | Scoped in `Diagnostic_11_Node_Scope_Measurement.md` §3. Unchanged by this record except that it is now first in a known queue |
| **O-ACC2** | **Whether the widening confirm-threshold behaviour should be pinned at wide scopes.** §3.2 measures 0.011 to 0.332 fail-open nodes per session at 62 nodes. The era conjunction absorbs it; a per-node reader does not | Gabe | New. Interacts with `Diagnostic_11_Node_Scope_Measurement.md` §10's open confirm-fraction question, at a scope that question was never asked at |
| **O-ACC3** | **Validate the placement against a human.** Every figure in this record is against a synthetic model. This is the caveat that no further simulation can remove | Unassigned | Belongs with `docs/README.md` §8's product hypotheses, not with the ruled decisions |
| **O-TO1..O-TO5** | Unchanged, in the merged record | | This record does not close any of them; it removes the objection that blocked O-TO1 |

---

## 13. Self-review

**What is measured and what is computed, kept separate on purpose.** §3, §4 and §9 are
measurements from harnesses that reproduce published anchors before reporting anything new.
§4.5's independence predictions and §5's trial arithmetic are computations and say so in
place. §6, §7's interpretation and §8 are argument.

**The three things most likely to be wrong here.**

1. **The synthetic ground truth**, which no control in §4.6 repairs. The generator-artifact
   check rules out one specific mechanism and leaves the general objection standing: a
   model student's known-set is downward-closed and coherent, and a real adult's is not.
   If real errors cluster differently, precision is the number that would move.
2. **The base rates.** Every conditional in §4.3 is computed on a population whose ability
   distribution is the generator's. Precision is base-rate sensitive, so a cohort where
   almost nobody knows an era would report a worse precision for the same instrument.
   §4.3's denominators are printed so the thin rows are visible: the ten-era precision rests
   on 12 students and should not be quoted.
3. **The trial arithmetic's guess rate.** 0.05 is a simulation parameter carried over from
   the diagnostic's noise model, and the trial's items are not the diagnostic's items. If a
   trial item is more guessable the 400x shrinks, though the direction does not change.

**One place the conclusion could be too comfortable.** §4.4's argument that the conjunction
is a fail-closed amplifier is structural and I believe it, but it depends on the era
test-out gate staying a conjunction. Any future relaxation of that gate to "k of n nodes
passed", which the low sensitivity in §4.3 will make tempting, **inverts the amplifier**.
That trade should be made against these numbers rather than against the intuition that
missing one node out of nine is close enough.

---

## 14. References

- `docs/Diagnostic_11_Node_Scope_Measurement.md` §2 (the checker blocker), §4 (the 96.0%),
  §10 (the open confirm-fraction question)
- `docs/Diagnostic_11_Node_Scope_Decision_Evidence.md` §5.1 (what the figure is accuracy
  of), §5.2 (the cohorts), §5.3 (the direction), §5.4 (the two halves)
- `docs/Diagnostic_Probe_Cost_Measurement.md` (the pre-amendment baseline; superseded in
  its own banner and not relied on here)
- `docs/Contracts.md` §1.1 (the ratified test-out rule, `placement_estimate >= 2`)
- `docs/Mastery_Scoring_Spec.md:51` (the 5-item practice set), `:11` (4 of 5)
- `docs/README.md:126` (§10a, the live D1 scope)
- `docs/superpowers/specs/2026-07-29-era-trial-contract.md` D-ET4, D-ET10, D-ET11, D-ET12,
  D-ET13 (line 1215, the re-queue's purpose), D-ET14
- `docs/superpowers/specs/2026-08-01-test-out-placement-experience.md` (the options this
  record gates)
- Harnesses, both added by this record and both under the `sim/` CI exclusion:
  `engines/diagnostic/sim/era-placement.sim.test.ts`,
  `engines/diagnostic/sim/checker-blocker.sim.test.ts`. Existing siblings whose method they
  follow: `probe-cost.sim.test.ts`, `accuracy-cohorts.sim.test.ts`, `students.ts` (lines
  24-35, the generator warning §4.6 is built on)
