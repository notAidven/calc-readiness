# D5 QA round 4

**Tip:** `65d7cdbf`, branch `anthony/d5-qa-round-4`. Everything below is measured at that tip
unless it names another SHA. Two fixes landed (`60a1d6c7`, `c1e23d9c`); no browser tests were
run, and the guards those fixes make owed are named at the end.

D5 is the six rational-expression nodes `RAT.1` to `RAT.6` (Verdigris Hold).

---

## 1. Counts, re-derived

Measured by walking the packs and the widget registry rather than trusting the plan's figures,
which were taken at `4cbba050`. The derivation reads `content/lessons/d5/*.json` for the packs,
mirrors `workedExampleFor` (`worked_examples[i]` present **and** `steps.length > 0`) for the
worked examples, reads `visuals[]` for placement, and resolves each visual id to a component
file through the real `visuals.tsx` registry so the mapping is not retyped.

| Quantity | Plan (`4cbba050`) | This tip (`65d7cdbf`) | Verdict |
|---|---|---|---|
| Packs | 6 | 6 | confirmed |
| Slides (`mini_lesson` entries) | 24 | 24 | confirmed |
| Worked examples | 23 | 23 | confirmed |
| Deliberate `null` worked example | RAT.4 slide 0 | RAT.4 slide 0 | confirmed |
| Placed widgets (`visuals[]`) | 24 | 24 | confirmed |
| Widgets with no reveal | 20 | 20 | confirmed |
| Widgets in `SINGLE_BOARD` | 20 | 20 | confirmed as a count, **wrong as a population** — see F3 |

Every number confirms. The last row confirms only as arithmetic: 20 D5 ids are listed in
`SINGLE_BOARD`, and three of those twenty deal more than one board (F3).

---

## 2. Reconciliation of carried findings

D5's history is the combined D1/D5/D7 rounds 1-3, so this reads
`work-log/anthony/2026-07-29-d1-d5-d7-qa-round-3.md`,
`work-log/anthony/2026-08-03-three-section-wave2.md` and `docs/qa-cfu-swarm-d5-d7.md`. The
swarm document is a pre-fix acceptance sweep at an old SHA; every item below is re-measured
here rather than inherited.

| # | Carried finding | Verdict at `65d7cdbf` | Evidence |
|---|---|---|---|
| C1 | RAT.5 era seam (Medieval dressing in a Renaissance era) | **NO LONGER APPLICABLE to me** — still deliberate, still owned by Evan | `docs/Evan_Design_Decisions_Consolidated.md` records it as filed and owner-assigned. Left untouched. |
| C2 | RAT.2 accepts only some orderings of the excluded set | **STILL BROKEN at this tip; the recorded ruling does not hold. Fixed here** | Enumeration below; fixed in `c1e23d9c` |
| C3 | RAT.6 accepts `x = 3 only` but rejects bare `3 only` | **FIXED** | `3 only` and `{3} (x = 2 is extraneous)` are both in `RAT.6`'s accepted list and both grade correct through the real card (`d5CfuAcceptance.test.tsx`, swarm items `P1 #3` and `P2 #10`, passing) |
| C4 | RAT.6 rejects spelled-out `three` | **STILL BROKEN, ruling still holds** — deliberately not widened | Pinned as a misconception with the reason on the line. A learner typing a word for a numeral in a set-notation answer has not met the prompt's format. |
| C5 | RAT.5 three-part compound CFU graded as one string | **STILL BROKEN, not fixable in D5's lane** — escalated, see F4 | Assessment below |
| C6 | R26 chip-colour pre-selection on D5 classify boards | **FIXED, no regression found** | All six boards in `NEUTRAL_CHIP_VISUALS` still pass a neutral `{ color: LABEL, borderColor: LINE }` token to both chips. Source-level only: the guard is a browser test I was told not to run, so this is "no regression found", not "no regression". |

### C2 in detail — the ruling was not the pack's behaviour

The prior record rules this a pedagogical decision: *the prompt demands increasing order, so
rejecting other orders is fine.* That ruling would justify accepting exactly one of the six
orderings of `{-6, -4, 7}`. Enumerated against the pack at this tip, through the grader's own
normalisation, the pack accepted **four**:

```
ordering                | `x = a, b, c` | `x = a; b; c` | `and`
-6, -4, 7    (increasing) | ACCEPTED      | ACCEPTED      | ACCEPTED
-6, 7, -4                | ACCEPTED      | ACCEPTED      | ACCEPTED
-4, -6, 7                | ACCEPTED      | ACCEPTED      | ACCEPTED
-4, 7, -6                | rejected      | rejected      | rejected
7, -6, -4                | ACCEPTED      | ACCEPTED      | ACCEPTED
7, -4, -6                | rejected      | rejected      | rejected

orderings the pack accepts in at least one spelling: 4 of 6
orderings it refuses in every spelling: 2 of 6
```

So two learners who both ignored "smallest first" got opposite verdicts on identical correct
mathematics, for a reason neither could infer. The recorded ruling does not describe this; it
describes the two orderings that had been missed.

The tree also already rules on the question, in the shared generator that builds these lists —
`apps/web/src/lessons/cfuAcceptedForms.ts`, `withExclusions`:

> The ORDER of the excluded values is free, for the reason it is free in a solution set: they
> are a set. Two of the packs ask for them smallest first in the prompt, and that request is
> about how to READ the answer rather than about which answers are right, so the list accepts
> the orderings and the prompt keeps asking.

`withExclusions` iterates every permutation. RAT.2's authored list implemented that for four of
six. **This is not me overturning a pedagogical decision**: it is completing an enumeration to
the ruling the repository already states, in the direction the same round took RAT.6 (C3). The
prompt's "smallest first" wording is untouched. If the owner prefers strictness the same
assertion inverts, and the twelve now-inconsistent lenient entries are what would have to go.

`d5CfuAcceptance.test.tsx` had pinned the two survivors as *misconceptions*, commented
"P3: the prompt demands increasing order" — a rejection justified on a ground that cannot
distinguish them from the three unordered spellings the same file asserts are correct. Those
two pins are retired and replaced by a set-level assertion.

---

## 3. Mechanical checks

Lesson pack validator, `--strict`, on the directory (not a file list, so the domain-level
variety rules run):

```
$ node .cursor/skills/author/scripts/validate-lesson-pack.mjs --strict content/lessons/d5
OK: 6 lesson pack(s) passed validation.

$ npm run check:lessons -- --strict
  d5: 6 pack(s), 0 error(s), 0 warning(s) -> PASS
check-lesson-packs: 10 domain(s) passed at the error tier.
```

The rendering-artifact scanner, four-path invocation as the skill documents, including
`cfuVariants.ts`:

```
$ node .cursor/skills/lesson-qa/scripts/scan-lesson-text.mjs \
    content/lessons/d5 apps/web/src/lessons/interactive packages/item-bank/src/d5 \
    apps/web/src/lessons/cfuVariants.ts
OK: 556 learner-facing string(s) across 6 pack(s) and 4180 prose-shaped run(s) across
    273 widget file(s), no rendering artifacts.
```

Both clean, after the two fixes.

---

## 4. R34 three-section reading pass, all 24 slides

Sentence census over every `mini_lesson[i]` and every `worked_examples[i].prompt`:

- **24 of 24 lectures are three sentences or fewer.** Longest is three.
- **23 of 23 worked-example prompts are two sentences or fewer.** Longest is two (RAT.6
  slide 1, the two-worker rate problem, which needs its second sentence to pose the question).
- RAT.4 slide 0 declares no worked example. Read as a skip: slide 0 is the "what a complex
  fraction even is" beat and the widget after it (`rational-nested-bar-play`) is the instance,
  so there is nothing for a worked example to work that the widget is not already working. The
  skip is right.

Read rather than counted: every lecture is conceptual, with no worked arithmetic and no
step-by-step instance walked in section 1. Each worked-example prompt names the instance its
steps go on to work without giving the result away, and no prompt restates its lecture. Step
lists run one move per step, and the last step names the result in all 23.

One judgement worth recording: RAT.3 slide 3's step list has **five** steps where the other 22
have four, and the fifth is load-bearing rather than padding — step 3 says *"The $-4$ became
$+4$, and that is the term a rushed subtraction leaves alone"*, which is the misconception the
slide exists for, and collapsing it into the collection step would bury it. Left alone.

---

## 5. The worked-example replay sweep — all 23 pairs

**Result: 23 pairs swept, 0 replays.** No widget deals an instance that its own slide's
`worked_examples[i].prompt` already works.

Method, built to the shape the D2/D8/D10 rounds showed is needed:

- Compared against `worked_examples[i].prompt`, never `mini_lesson[i]` prose and never the
  widget's header comment.
- **All pools, not just the first board.** Widget SOURCE is compared, which contains every
  board a widget can deal including the one "start over" deals, so pool 2 cannot hide.
- Notation-collapsing normalisation, so `\dfrac{a}{b}`, `\frac{a}{b}` and `(a)/(b)` compare
  equal, plus the sub-spans either side of a top-level `+`, `-` or `\div`, so a widget replaying
  *one of the two fractions being combined* is caught.
- No filtering by source comments.
- A second, looser net: whether every integer in the worked example also appears in the widget,
  which flags an instance re-skinned into different notation. That flagged 6 pairs, all read by
  hand below.

An early version of the atom filter required a letter in the expression, which silently dropped
RAT.3 slide 0's `3/10 + 1/4` — a purely numeric worked example — and reported that pair as
having nothing to compare. Fixed before the sweep was believed; it is the reason the table below
prints the atoms it compared for every pair.

### The 23 pairs

| Pair | Slide's worked example | Widget's instances | Verdict |
|---|---|---|---|
| RAT.1 s0 forbidden-dose-explore | `(x-1)/(x+3)` | `(x+4)/(x-3)` family, dial doses | clean |
| RAT.1 s1 reduce-play | `(x²-25)/(2x+10)` | `(12x+16)/(...)` staged cancel | clean |
| RAT.1 s2 exclusion-classify | `(x²-3x)/(x²-9)` vs `x/(x+3)` at `x=3` | b0 `(x²-x-6)/(x²-4)`, b1 `(x²+5x+6)/(x²-9)` | clean, read by hand — see note |
| RAT.1 s3 simplify-order | `(x²+2x-8)/(x²+6x+8)` | different pair both boards | clean |
| RAT.2 s0 scale-cancel-play | `(x²-9)/(x+5) × (x+5)/(x-3)` | `x+1`, `x-4`, `x+6` factor chips | clean |
| RAT.2 s1 scale-dose-explore | `(x-1)/(x+4) × (x+4)/(x+6)` | different product | clean |
| RAT.2 s2 reciprocal-walkthrough | `(x²-1)/(x+4) ÷ (x-1)/(x+4)` | different division | clean |
| RAT.2 s3 divide-dose-sorter | `x/(x+3) ÷ (x-8)/(x-1)` | different division | clean |
| RAT.3 s0 numeric-twin-match | `3/10 + 1/4` | b0 `1/4 + 1/6`, b1 `1/6 + 1/9` | clean — the special case, adjudicated below |
| RAT.3 s1 add-lcd-builder | `4/(x(x-5)) + 3/(x(x+2))` | different denominators | clean |
| RAT.3 s2 add-walkthrough | `2/x + 3/(x-4)` | `1/x + 1/(x+2)` | clean — see note |
| RAT.3 s3 subtract-sign-play | `(5x+1)/(x+3) - (2x-4)/(x+3)` | `(x+5)/(x-2) - (3x-1)/(x-2)` | clean |
| RAT.4 s0 nested-bar-play | *no worked example* | — | not a pair |
| RAT.4 s1 nested-flip-spot | `(1/2 + 1/x)/(3/x)` | `(1/x + 1/n)/(1/x - 1/n)` | clean |
| RAT.4 s2 clear-lcd-builder | `(1/2 - 1/x)/(1/4 + 1/x)`, LCD `4x` | `(1/x + 1/3)/(1/x - 1/3)`, LCD `3x` | clean |
| RAT.4 s3 nested-dose-sorter | `((x-3)/(x+2))/((x-7)/(x+5))` | different stack | clean |
| RAT.5 s0 gauge-domain-explore | `P(x) = 2x/(x+6)` | `P(x) = (x+4)/(x-3)` | clean |
| RAT.5 s1 hole-asymptote-play | `((x-1)(x+5))/((x-1)(x+2))` | different pair | clean |
| RAT.5 s2 intercept-walkthrough | `P(x) = (x+8)/(x-2)` | `P(x) = (x-6)/(x+2)` | clean |
| RAT.5 s3 end-behavior-table | `(6x²-x)/(4x²+5)`, so `y = 3/2` | 10 rows over 2 boards, none of them that function, no `y = 3/2` chip | clean |
| RAT.6 s0 clear-measure-walkthrough | `2/(x+1) = 3/(x-4)` | different equation | clean |
| RAT.6 s1 combined-rate-build | 4 hours and 12 hours, so `t = 3` | r0 `a=6, b=12` so `t=4`; r1 `a=3, b=5` so `t=15/8` | clean, read by hand |
| RAT.6 s2 cursed-root-classify | `x²/(x+4) = 16/(x+4)` | different equation | clean |
| RAT.6 s3 proving-run-solver | `2/(x-1) + 1/(x+1) = 4/(x²-1)` | different equation | clean |

### `RationalNumericTwinMatch` — the known special case, decided with the pack open

Its comment says board 0 is "the pair the slide's own prose names", and it is: slide 0's lecture
names `\dfrac{1}{4} + \dfrac{1}{6}`, and board 0 is `a: 4, b: 6, lcd: 12`.

Slide 0's **worked example is a different instance**: `Add $\dfrac{3}{10} + \dfrac{1}{4}$`,
LCD 20. Board 1 is `1/6 + 1/9`, LCD 18, distinct from both.

**Verdict: legitimate, not a collision.** The authored-on-purpose match is against the prose,
and the prose beat is "you already know this" — the correspondence *is* the content of the
slide, so the widget standing on the prose instance is the design. The worked example works a
sum the widget never deals, so nothing on this slide can be finished from the section-2 answer.

### Two things read and deliberately not changed

**RAT.1 slide 2, `rational-exclusion-classify` board 1.** Board 1 is `(x²+5x+6)/(x²-9)`, whose
denominator is the worked example's denominator, so its excluded set `{3, -3}` is the worked
example's excluded set. Not a replay, and not worth changing: the *cancelled* factor is the
opposite one. The worked example cancels `(x-3)`, hiding `3`; board 1 cancels `(x+3)`, hiding
`-3`. The slide's whole point is which exclusion survives cancellation, so recalling the worked
example actively misleads here rather than shortcutting. Board 0 (`x²-4`) shares nothing.

**RAT.3 slide 2, `rational-add-walkthrough`.** It works `1/x + 1/(x+2)`, which is not slide 2's
worked example (`2/x + 3/(x-4)`) but *is* the algebraic column of slide 0's twin-match board 0,
line for line through all four of its frames. I considered re-parameterising it and did not,
because the continuity looks deliberate and load-bearing: the walkthrough's fifth frame is the
excluded values, and its docblock calls that "the domain-tracking beat this lesson must not let
the skin hide". Re-meeting the sum the learner matched two slides earlier, and now being shown
where its forbidden inputs come from, is a spiral rather than a repeat. Changing the numbers
would cost that and buy nothing the sweep asked for. Flagging rather than fixing.

---

## 6. Reveal classification, all 24 placed widgets

**Not implemented — classification only**, as scoped.

The criterion, stated before the table so it can be argued with. A widget **owes an R12 reveal**
when its gate requires the learner to PRODUCE a value that is not among a small set of options
on screen: a typed answer, or a constructed expression. A learner who cannot produce it has no
way past. A widget is a **legitimate exception** when either:

- **(a)** the gate is reaching the end of an auto-play sequence, so there is no answer at all;
  Play and Step always reach it.
- **(b)** every gated step is a choice among a small named set **and** each wrong choice renders
  its own named explanation, so the learner always reaches the end and reads why the wrong
  option was wrong. The escape exists and it teaches, which is what R12 asks of a reveal.

Both exception classes are named lists with a reason each, below, and both are assertable in
either direction: an entry that stops qualifying fails, and a qualifier that adopts a reveal
without leaving the list fails.

| # | Widget file | Node/slide | Gate | Owes reveal | Reason |
|---|---|---|---|---|---|
| 1 | `RationalForbiddenDoseExplore.tsx` | RAT.1 s0 | dial every dose, then pick the forbidden one | **no** — (b) | wrong pick names the denominator and says it is not zero; the answer is readable off work the learner already did on the board |
| 2 | `RationalReducePlay.tsx` | RAT.1 s1 | two named moves per stage; only the right one advances | **no** — (b), **flagged** | both wrong moves render a named explanation (`terms`, `wrongfactor`). Round 2 recorded this as a verified trap; I cannot see that measurement at this tip, so the authoring PR should re-verify against round 2's evidence before treating it as exempt |
| 3 | `RationalExclusionClassify.tsx` | RAT.1 s2 | two-bin classify | **no** — (b) | every row lands whatever is picked, misses are marked and explained per row |
| 4 | `RationalSimplifyOrder.tsx` | RAT.1 s3 | order the steps | **has one** | via `OrderSteps` |
| 5 | `RationalScaleCancelPlay.tsx` | RAT.2 s0 | pick the factors that cancel | **no** — (b) | three named factor chips, each wrong pick explained |
| 6 | `RationalScaleDoseExplore.tsx` | RAT.2 s1 | **type** both denominators, then rule | **YES** | a typed value, and "Not quite" is the only response to a wrong one |
| 7 | `RationalReciprocalWalkthrough.tsx` | RAT.2 s2 | reach the last frame | **no** — (a) | auto-play, no answer |
| 8 | `RationalDivideDoseSorter.tsx` | RAT.2 s3 | two-bin sort | **no** — (b) | as #3 |
| 9 | `RationalNumericTwinMatch.tsx` | RAT.3 s0 | match four line pairs | **has one** | via `MatchPairs` |
| 10 | `RationalAddLcdBuilder.tsx` | RAT.3 s1 | assemble the LCD from factor chips | **no** — (b) | bounded named factors, wrong assembly explained |
| 11 | `RationalAddWalkthrough.tsx` | RAT.3 s2 | reach the last frame | **no** — (a) | auto-play, no answer |
| 12 | `RationalSubtractSignPlay.tsx` | RAT.3 s3 | pick each term's sign | **no** — (b) | two signs per term, each wrong pick explained |
| 13 | `RationalNestedBarPlay.tsx` | RAT.4 s0 | step the bar reading | **no** — (b) | bounded picks with per-step teaching |
| 14 | `RationalNestedFlipSpot.tsx` | RAT.4 s1 | find the wrong line | **has one** | via `SpotTheError` |
| 15 | `RationalClearLcdBuilder.tsx` | RAT.4 s2 | assemble the clearing LCD | **no** — (b) | as #10 |
| 16 | `RationalNestedDoseSorter.tsx` | RAT.4 s3 | two-bin sort | **no** — (b) | as #3 |
| 17 | `RationalGaugeDomainExplore.tsx` | RAT.5 s0 | slide `x` across the graph, then pick the domain | **no** — (b) | the `<input>` is `type="range"`, a probe, not an answer field; the gate is three named set-builder chips, each wrong one explained |
| 18 | `RationalHoleAsymptotePlay.tsx` | RAT.5 s1 | hole vs vertical asymptote | **no** — (b) | as #3 |
| 19 | `RationalInterceptWalkthrough.tsx` | RAT.5 s2 | reach the last frame | **no** — (a) | auto-play, no answer |
| 20 | `RationalEndBehaviorTable.tsx` | RAT.5 s3 | fill three blank rows | **has one** | via `FillTable` |
| 21 | `RationalClearMeasureWalkthrough.tsx` | RAT.6 s0 | reach the last frame | **no** — (a) | auto-play, no answer |
| 22 | `RationalCombinedRateBuild.tsx` | RAT.6 s1 | chip the rate equation, then **type** the together time | **YES** | the final beat is a typed value (`15/8` on round 2), which a learner can be genuinely unable to produce |
| 23 | `RationalCursedRootClassify.tsx` | RAT.6 s2 | in-set vs extraneous | **no** — (b) | as #3 |
| 24 | `RationalProvingRunSolver.tsx` | RAT.6 s3 | **type** the solution across staged steps | **YES** | typed values at every stage, and the stage does not advance without the right one |

**Totals: 3 owe a reveal, 4 already have one, 17 are legitimate exceptions (4 under (a), 13
under (b)). 3 + 4 + 17 = 24.**

The three that owe one, for the authoring PR: `RationalScaleDoseExplore.tsx`,
`RationalCombinedRateBuild.tsx`, `RationalProvingRunSolver.tsx`. All three gate on a typed
value. Plus #2 to re-verify.

Named exception list **(a)**, auto-play with no typed answer — the gate is the last frame:
`RationalReciprocalWalkthrough.tsx`, `RationalAddWalkthrough.tsx`,
`RationalInterceptWalkthrough.tsx`, `RationalClearMeasureWalkthrough.tsx`.

Named exception list **(b)**, bounded named choices with per-wrong teaching:
`RationalForbiddenDoseExplore.tsx`, `RationalReducePlay.tsx`, `RationalExclusionClassify.tsx`,
`RationalScaleCancelPlay.tsx`, `RationalDivideDoseSorter.tsx`, `RationalAddLcdBuilder.tsx`,
`RationalSubtractSignPlay.tsx`, `RationalNestedBarPlay.tsx`, `RationalClearLcdBuilder.tsx`,
`RationalNestedDoseSorter.tsx`, `RationalGaugeDomainExplore.tsx`,
`RationalHoleAsymptotePlay.tsx`, `RationalCursedRootClassify.tsx`.

---

## Findings by priority

### F1 (P1, FIXED in `60a1d6c7`) — R21: RAT.5's asymptote column was headed with a gloss

`RationalEndBehaviorTable` passed `headings={["function", "top vs bottom degrees", "settles at"]}`
to `FillTable`, which renders each into `<th scope="col">`. R21 names table column headings
explicitly and calls a multi-word phrase built around a verb a paraphrase rather than a term —
a P1. "settles at" is exactly that, on the one D5 slide that teaches *horizontal asymptote*, and
the widget's own `ariaLabel` already calls the column "the horizontal asymptote each one
approaches". The column is now headed `horizontal asymptote`; the prompt keeps the
plain-language gloss, which is prose and can afford to say what the term means.

Not a violation, checked and left: `top vs bottom degrees` keeps the term *degree* and uses the
pack's consistent house register of top/bottom for numerator/denominator, so no term is being
paraphrased away.

Red before green, with the defect injected back:

```
$ npx vitest run apps/web/src/lessons/d5LabelSlots.test.tsx    # heading reverted to "settles at"
 FAIL  ... > heads the asymptote column with the term the slide teaches
AssertionError: the filled column is headed "settles at": expected 'settles at' to be 'horizontal asymptote'
 FAIL  ... > uses no verb-phrase gloss in any D5 table heading
+ RationalEndBehaviorTable.tsx: heading "settles at" is the gloss "settles at"
 Test Files  1 failed (1)
      Tests  2 failed | 1 passed (3)
```

Restored:

```
$ npx vitest run apps/web/src/lessons/d5LabelSlots.test.tsx
 Test Files  1 passed (1)
      Tests  3 passed (3)
```

The first failure reads the **rendered** `<th>`, not the source, so it is about what ships. The
guard's population is derived from the D5 widget sources (every `Rational*.tsx` that passes
`headings=`) with a floor under it, so a second table widget added later cannot dodge it, and a
derivation that matched nothing cannot read as a pass.

### F2 (P2, FIXED in `c1e23d9c`) — RAT.2 accepted four of six orderings

Full account under C2 above. Eight spellings added to `RAT.2.json` (the two missing orderings
in the four spelling families the other orderings already have), the two P3 misconception pins
retired, and a set-level assertion added in their place.

Red before green, through the real CFU card, before the pack change:

```
$ npx vitest run apps/web/src/lessons/d5CfuAcceptance.test.tsx -t "every ordering"
 FAIL  ... > RAT.2 takes every ordering of the three excluded values
AssertionError: expected '(x + 7)/(x + 4); x = -4, 7, -6\n(x + …' to be ''
+ (x + 7)/(x + 4); x = -4, 7, -6
+ (x + 7)/(x + 4), x = -4, 7, -6
+ (x + 7)/(x + 4); x = -4; 7; -6
+ (x + 7)/(x + 4) and x = -4 and 7 and -6
+ (x + 7)/(x + 4); x = 7, -4, -6
+ (x + 7)/(x + 4), x = 7, -4, -6
+ (x + 7)/(x + 4); x = 7; -4; -6
+ (x + 7)/(x + 4) and x = 7 and -4 and -6
```

After adding the eight entries, the whole file:

```
$ npx vitest run apps/web/src/lessons/d5CfuAcceptance.test.tsx
 Test Files  1 passed (1)
      Tests  25 passed (25)
```

That run includes "grades every accepted entry as correct" over all six packs and "still rejects
every misconception answer", so the widening did not open a leak. The retired pins were replaced
with a genuinely wrong answer (`x = 6, 4, -7`, every sign flipped) to keep RAT.2's misconception
count above its floor rather than shrinking the rejection set.

The assertion is set-level rather than counted on purpose: a floor would have been satisfied by
three of the four spellings of a missing ordering, which is the shape that let this survive.

### F3 (P2, ESCALATED, not fixed) — three `SINGLE_BOARD` members deal more than one board

`SINGLE_BOARD` in `widgetVariantPool.test.tsx` exempts its members from the distinctness check
that `useWidgetVariants` widgets get. Twenty D5 ids are listed, which matches the plan's count.
But three of them rotate boards locally, with their own `useState` index over their own
`BOARDS`/`ROUNDS` array rather than through `useWidgetVariants`:

- `rational-exclusion-classify` — 2 boards
- `rational-combined-rate-build` — 2 rounds
- `rational-cursed-root-classify` — multiple boards

So the guard's population is scoped by the implementation (does it call `useWidgetVariants`)
where the behaviour it protects is "deals more than one board". This is the shape
`qa-verification.mdc` describes: a surface can carry a mechanic without importing a line of it.
Three D5 widgets deal a second board that no distinctness check ever looks at.

Not fixed because `widgetVariantPool.test.tsx` is on my do-not-edit list, and because widening
the population there is a cross-domain change — the same misclassification is likely to exist
outside D5. Escalating with the concrete list rather than editing.

### F4 (P2, ESCALATED, needs the shared checker) — RAT.5's compound CFU cannot be partly right

RAT.5's CFU asks for three things at once: the hole, the vertical asymptote and the horizontal
asymptote. It is graded by `accepted.has(normalizeAcceptedAnswer(value))` — one string, matched
whole. A learner right on two of the three parts scores exactly what a learner right on none
scores.

**Assessed as not fixable in D5's lane.** The pack schema offers `accepted` (a list of whole
strings, all-or-nothing) or `check` (a named function the shared checker resolves). Neither can
express "two of three parts". The accepted list has been widened hard — 54 spellings at this
tip, and every one of them grades correct — which buys tolerance of *notation* and cannot buy
partial credit, because every entry is still a whole answer. Widening it further is the wrong
axis and would only grow.

What it needs, concretely, for whoever owns the shared checker: a compound CFU shape that
declares its parts separately — something like `cfu.parts: [{ accepted: [...] }, ...]` with a
separator convention — so the card can split the typed answer, grade each part, and report "two
of three" with the missed part named. That is a change to the shared card and the shared
checker, not to a D5 pack, so it is escalated rather than attempted.

### F5 (P3, reported, not fixed) — the chip-palette guard's population is narrower than the behaviour

While confirming C6 I read `classifyChipPalette.browser.test.tsx`. Its `NEUTRAL_CHIP_VISUALS` is
a written-down list of six D5 boards with a coverage assertion pinned to `6`. The docblock argues
for that deliberately ("the list is the claim"), which is a fair position. But at least one D5
board outside the list has the same shape and the same defect surface:
`RationalCombinedRateBuild`'s first beat renders three `lesson-interactive__chip` buttons of
pre-named calls with `style={NEUTRAL}`, and it is not in the list.

Not edited, and this is the reason rather than an oversight: adding a case to a browser guard I
was told not to run would be adding an assertion without a demonstrated red, which is the
anti-pattern `qa-verification.mdc` names. The reviewer runs browser tests serially and can take
the red. This is a new finding about that guard's population, not a re-opening of R26 — the six
listed boards all still pass a neutral token, which is C6's verdict.

---

## Coverage statement

**Swept:** all 6 D5 packs; all 24 slides for R34 sections 1 and 2; all 23 worked-example/widget
pairs for replay, over every pool each widget can deal; all 24 placed widgets for reveal
classification; all six carried findings reconciled at this tip; the strict validator and the
four-path scanner over `content/lessons/d5`, `apps/web/src/lessons/interactive`,
`packages/item-bank/src/d5` and `apps/web/src/lessons/cfuVariants.ts`.

**Not swept, and named as such:**

- **No browser tests were run**, as instructed. Every claim about rendered behaviour in this
  report is either a jsdom render (F1's `<th>` assertion, the CFU card in F2) or a source-level
  read explicitly labelled as one (C6).
- **No spatial claim is made.** F1 changes a column heading from "settles at" to "horizontal
  asymptote", which is longer. I did not measure the table at a short viewport and make no claim
  that it lays out unchanged; per `qa-verification.mdc` that owes a rendered frame at ~1024x580
  that someone looked at, which is browser work.
- `cfuVariants.ts` was **read** for RAT.2's re-ask template but **not edited**; no line ranges
  to report.
- R24-R31 widget-behaviour rules were not re-swept. They live in browser guards.
- Item-bank practice templates under `packages/item-bank/src/d5` were scanned for rendering
  artifacts but not reviewed for pedagogy; that was not in scope.

## Browser guards these changes make owed

- `classifyChipPalette.browser.test.tsx` — unaffected by my edits, but F5 proposes a population
  widening that needs a run.
- The `FillTable` rendering guards and any D5 widget layout suite — F1 changed a column heading
  to a longer string. This is the one that matters: it needs a look at ~1024x580, not just a
  green test.
- `widgetRevealReAsk.browser.test.tsx` and `revealReAsk.test.ts` — untouched, and no reveal was
  implemented, so nothing is owed there from this PR.

## Files touched

| File | Change |
|---|---|
| `apps/web/src/lessons/interactive/RationalEndBehaviorTable.tsx` | heading `settles at` → `horizontal asymptote`, plus a docblock note on why the heading holds the term and the prompt holds the gloss |
| `apps/web/src/lessons/d5LabelSlots.test.tsx` | new — R21 guard over a derived population of D5 table widgets |
| `content/lessons/d5/RAT.2.json` | 8 accepted spellings added (two missing orderings × four spellings) |
| `apps/web/src/lessons/d5CfuAcceptance.test.tsx` | two ordering pins retired, one real misconception added, set-level ordering assertion added |
| `docs/qa-d5-round-4.md` | this report |
| `work-log/anthony/2026-08-04-d5-qa-round-4.md` | work-log entry |

No shared file was edited. `cfuVariants.ts` line ranges touched: **none**.
