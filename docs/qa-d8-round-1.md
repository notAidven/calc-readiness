# D8 (Exponential & Logarithmic) — QA round 1

Era 9, Information Age. Reviewed at `1b3f985f`, fixed and verified on `anthony/d8-qa`.
Owner: Anthony (`docs/Content_Authoring_Split.md` §"Anthony", D8).

Every finding below is cited at **`1b3f985f`**, the SHA it was found at, with the text
quoted as it read there. Line numbers are deliberately not restated at the branch tip: the
tree moved twice during the round — once for the fixes and once for a 70-commit merge of
`integration` — so a file:line copied forward would be stale, which is the failure
`.cursor/rules/qa-verification.mdc` warns about most directly. Each entry names the commit
that closed it instead.

## Reconciliation with prior rounds

**There is no prior D8 QA round.** This is round 1, so there is nothing to reconcile and no
earlier finding to re-verify or contest.

Three guard gaps had been noted in passing by other lanes' work logs before this round
opened. All three were re-verified at `1b3f985f` rather than taken on trust, all three were
real, and all three are closed here. A fourth was found during the round.

| Carried in | State at `1b3f985f` | Closed by |
|---|---|---|
| D8's three bespoke reveal fills sat on the `FILL_UNDRIVEN` register, so no test drove them | Confirmed | `942b2c67` |
| No D8 figure floor in `visualsMath.test.tsx`, though D1 had one | Confirmed | `ab639419` |
| `WorkedSolution.browser.test.tsx` had no `D8_PRACTICE_POOL`, so no D8 archetype was laid out in a browser | Confirmed | `dbb6c86e` |
| **Found during the round:** `ExpTransformBuilder`'s exponent blank was undriven, and believed to need a source change | — | `62bb25a4`, with no source change; the blank is reachable once the attempt settles the coefficient first |

`answerKeypad` and `answerFormat` were checked and deliberately left alone: D8 was already
in both.

## Coverage — what was measured, not what was skimmed

Four review lanes read the era: one per node pair, plus one reading all six packs together.

| Measurement | Count |
|---|---|
| Prompt-versus-key sweeps, answer re-derived from the **rendered prompt string** rather than from `template_params` | **13,000 draws** across 30 templates — 4,000 (EL.1/EL.2), 5,000 (EL.3/EL.4), 4,000 (EL.5/EL.6) |
| Prompt-versus-key mismatches found | **0** |
| Keys the checker could not grade | **0** |
| CFU spellings submitted through the real versioned checker | **~110** across the six nodes |
| `cfuInstances` variants enumerated and graded | **12** (2 per node); every one's `accepted[0]` grades against its own list |
| Widget contracts audited (`useRevealReAsk`, `useWidgetVariants`, `useWidgetSuccess`, `usePickup`, `othersRemain`) | **24 of 24** |
| Widgets with a variant count of 1 (a reset that re-serves the same numbers) | **0** |
| Hint-leak sweeps | **6,000 draws** (EL.1/EL.2), plus per-template checks elsewhere |
| Mini-lesson slides read in full | **24** |
| Subtitles read as one ordered sequence (R14) | **24**, 3 questions, passing |
| Bold spans classified as term-introduction or emphasis (R6) | **24** |
| Candidate terms counted across all six packs (R32) | **33**, of which 9 were singletons and each read in context |
| Island-framing grep across all six packs | **0 hits** |
| EL.6's transitive prerequisite closure, computed from item-family seeds | **11 nodes** |

R21 came back **N/A, measured rather than assumed**: none of the 24 widgets is a
`LabelParts` or `FillTable` in EL.3/EL.4, so there were zero label slots and zero
`<th scope="col">` headings to read in that pair.

## Findings

28 unique findings: **2 P0, 10 P1, 16 P2.** All closed except one half of one P1, which is
blocked outside this lane and filed below.

### P0 — wrong mathematics

**P0-1. `apps/web/src/lessons/interactive/ExpContinuousWalkthrough.tsx:66` printed a wrong
value on the compounding ladder.** The row read
`{ times: 12, reaches: "1.6319", spoken: "monthly reaches 1.6319" }`, but
$(1 + 0.5/12)^{12} = 1.63209413$, which is **1.6321** at the four decimals every other row
uses. The value rendered on screen and was spoken in the SVG `aria-label`, so both moved.
The other eleven ladder values and both $e^r$ ceilings were recomputed and were correct, so
this was one transcription slip rather than a convention. A learner checking the figure on a
calculator concludes either they or the lesson is wrong, on the one slide whose whole point
is that these values converge to a ceiling they are asked to trust.
Closed by `523e8590`, guarded by an assertion that recomputes **every** rung and ceiling
from its own parsed rate and split count and compares at the row's own printed precision.

**P0-2. `content/lessons/d8/EL.4.json:5` was out by a factor of a million.** The hook read
"the weakest signal sits near $10^{-3}$ and the strongest near $10^{3}$ … The intensities
behind those two readings are **a trillion** times apart. What squeezes a **trillion-fold**
spread down to one axis is a logarithm". But $10^{3}/10^{-3} = 10^{6}$, a million. A learner
who checks the arithmetic derives that dividing powers *multiplies* exponents — the exact
law EL.1 and EL.2 had just taught them, contradicted in the first sentence of the node meant
to build on it. Both consecutive sentences carried the claim.
Closed by `2c3635b7` by correcting the word rather than the exponents, because
$10^{-3}$/$10^{3}$ are the values slide 2 walks ($\log 0.001 = -3$) and moving them would
have desynchronised two slides.

### P1 — the teaching fails

**P1-1. Two CFUs graded their first ask far harder than their own re-ask.** Neither had a
`check` block, so grading was exact string match against the authored `accepted` list, while
the variant speller for the identical question generated an order of magnitude more forms.

| Node | Authored forms | Speller forms | Correct spellings rejected on the first ask and accepted on the re-ask |
|---|---|---|---|
| `content/lessons/d8/EL.2.json:24-35` | 10 | 144 | **134** |
| `content/lessons/d8/EL.4.json:24-41` | 16 | 448 | **432** |

Zero went the other way in either node, so the whole gap fell on the learner's first
attempt. Both lists were also internally incoherent: EL.4 accepted
`domain: x < 9; asymptote: x = 9` and `x < 9; va: x = 9` but rejected
`x < 9; asymptote: x = 9`, and accepted `x < 9; vertical asymptote x = 9` while rejecting
the same phrase with a colon. A learner types a correct answer, is told it is wrong, reads
the reveal, retypes the same style on the re-ask and is told it is right — so what the miss
taught them is that the checker is arbitrary.
Closed by `ec085987` (EL.4) and `ae820c81` (EL.2). Both lists are now **regenerated from
their own speller** rather than hand-enumerated, canonical form first, with set-equality
asserted in **both directions** so pack and speller cannot drift apart.

**P1-2. `content/lessons/d8/EL.4.json:23` refused the notation the slide above it
introduced — PARTIALLY CLOSED.** Slide 4 ended by introducing "**Set-builder notation**
writes the two cases as $\{x \mid x > h\}$ and $\{x \mid x < h\}$", the CFU then asked for
"the domain **as an inequality in $x$**", and `{x | x < 9}; x = 9` graded wrong. Two of the
node's five practice templates *require* set-builder, so the last term the lesson defined
was the one form the check refused.
The learner-facing half is closed: the prompt now asks for an inequality and only an
inequality, and every spelling of one grades, so nobody is told a correct answer is wrong.
Slide 4 still teaches the term and the two practice templates still exercise it.
**Accepting set-builder is blocked outside this lane** — see "Filed for other owners" below.
The three blocked spellings are declared as `SET_BUILDER_BLOCKED` with their reason and
asserted in both directions, so the exemption fails if the blocker is removed or if the
spellings start being accepted.

**P1-3. `apps/web/src/lessons/interactive/LogEvaluateStepper.tsx:234-238` printed stage
one's answer on the board.** The `<text>` rendered "`${rungs.length} factors on the
ladder`". Stage one asks for $\log_{4}256$; the learner taps until a rung reads 256, at
which point the line reads "4 factors on the ladder" and 4 is the answer. The file's own
header states the opposite intent: *"the exponent is how many factors are on the ladder, so
it is something the learner **counts** rather than something the widget **prints** for
them"*. Labelling the rungs had been correctly rejected and then the count was printed
anyway.
Closed by `2c3635b7`. This finding's visibility half was **source-only when reported** and
was discharged with two rendered frames at 1024×580 on the real 920px lesson column, framed
to show the whole board rather than cropped to the element, and reviewed by eye.

**P1-4. `apps/web/src/lessons/interactive/ExpFeatureLabel.tsx:89-97` glossed the growth
factor falsely for the rule on its own board.** The reveal said "The number being raised to
the power is what the amount is multiplied by at every step, which is the growth factor."
Both variants carry a vertical shift and the board's lead is `y = a·b^x + k`; variant 1's
outputs run 7, 11, 23, 69, and $7 \times 3 = 21 \neq 11$. The base multiplies the *distance
from the asymptote*, not the amount. Being reveal text, this is what a learner reads after
missing — and it transplants EL.1 slide 2's "Divide any value by the one before it" onto
exactly the rule where that procedure stops working.
Closed by `523e8590`; the new wording shows the distances 2, 6, 18 so the learner can check
the factor themselves rather than being told.

**P1-5. `packages/item-bank/src/d8/nodes/EL.2/index.ts:139` instructed a procedure wrong on
half its draws.** The L1 asymptote hint said "Read that constant off on its own: the
coefficient in front of the power has no say in where the graph levels off." Measured: **303
of 600 draws** print a subtracted constant and key a negative, e.g. $y = 7 \cdot 2^{x} - 5$
with key `-5`. A learner who does exactly what the hint says types `5` and is graded wrong.
Raised from P2 to P1 in triage on the grounds that the hint does not merely fail to help, it
causes the miss. The sibling template's hint already carried the missing clause.
Closed by `ec93226c`.

**P1-6. `content/lessons/d8/EL.6.json:5`'s opening scenario could not produce the equation
it then solved.** It read "The apron capacity review reports that aircraft on the flight
line double every quarter, **stands at one squadron now**, and that the hangar holds $32$
**airframes**." The lesson then asserts $2^{t} = 32$, which needs the start and the limit in
the same unit with the start equal to 1. A squadron is a formation of many aircraft, so
faithful modelling gives $S \cdot 2^{t} = 32$ and never reaches $t = 5$ — correct modelling
reads as wrong on the node's first equation. The sentence was also ungrammatical: the middle
conjunct had neither its own subject nor a `that`, so it literally said the *review* stands
at one squadron.
Closed by `cd1b2875`. The whole node was swept for downstream unit references rather than
the one sentence patched, because a half-converted scenario is worse than the original.

**P1-7. `packages/skill-graph/src/skill_graph.json:117-135` earned EL.6 neither quadratic
factoring nor the natural logarithm.** EL.6 is `item_family: true` with empty `prereqs`, so
its families are its real record. None of `same_base`, `log_requiring` or `log_equation`
contained a polynomial node, and no family covered the quadratic-in-an-exponential shape at
all. Both L3 templates run a factoring step nothing in the graph teaches: `EL.6.json:8`
asserts "factors as $(x - 5)(x + 2) = 0$" with no derivation, and the item bank hands it
over as "That leaves a quadratic equation, which you can expand and factor". The era-wide
lane confirmed this independently by a different method — resolving the item-family seeds to
an 11-node closure and showing `POL.1`, `POL.2` and `POL.3` all absent — and noted that
"quadratic" is used 6 times in EL.6 and defined nowhere in the era.
Closed by `cd1b2875`, following the `TRG.8` `quadratic_in_form` precedent five lines above
in the same file: a new `quadratic_in_exponential` family with `POL.3` and `EL.3` and its own
review note. `mvp_family` is null, so this is a design record and not a hard edge; the graph
invariants report the same 87 edges before and after.

**P1-8. Both EL.6 L3 prompts carried a format example that was sometimes the literal
answer.** `packages/item-bank/src/d8/nodes/EL.6/index.ts:415` advertised "as in
**{ln(5), ln(7)}**" over a draw space of every pair $2 \le a < b \le 8$, one of which is
$(5,7)$ — where the example is the complete key, character for character, on **19 of 400
draws**. Line 357 advertised "such as **{4} or {4, 9}**" against key `{kept}` with `kept = 4`
reachable, on **59 of 400 draws**; two of thirteen items in a single served pool draw hit it.
A learner who copies the example is marked correct without doing the mathematics, and one
who does the mathematics and lands on it distrusts a right answer that looks like
boilerplate.
Closed by `06ccf389`, examples moved outside each draw range, with the leak proved closed by
enumerating the **full** parameter space (21 and 15 draws, not a sample).

**P1-9. `content/lessons/d8/EL.1.json:14` headed a slide with a term the era never
defined.** The subtitle "The ceiling on compounding" sits over a slide that never uses the
word — it says "applied more and more often". `compound*` occurred **exactly once** across
all six packs, and that once was this heading; the widget the slide mounts never uses it
either. But the learner meets it again where it counts: the EL.1 L3 prompt serves "earns
interest **compounded** continuously", so they hit the term in a graded item with no gloss
anywhere behind it.
Closed by glossing it on the slide rather than deleting it from the heading or editing the
prompt — one change earns the subtitle and the practice term together, and moves no frozen
hash.

**P1-10. `packages/item-bank/src/d8/nodes/EL.4/index.ts:253` handed over the half of the
answer its template existed to test.** Hint 2 of `domain-shift.l3` read "…so the step that
clears it leaves $x$ on the **opposite side** of the boundary from the one a plain shift
would have given." Every draw is keyed `{x | x < m}`, so the direction is constant and this
names it. R13 asks a hint to name the rule and point, not substitute. This is the node's only
item testing the flipped direction, and `LogDomainBuilder`'s own header says the direction is
what learners get wrong. Closed by `2c3635b7`.

### P2

Sixteen findings, all closed. Grouped by kind rather than listed flat, since several are the
same defect in different places.

**Hints that describe the minority of their own draw space (3).** `EL.3`'s L1 hint said
"walk out from $10$ one factor at a time and stop when you land on the number given", but
`k` is drawn from `[-3..6]`, so three of nine varieties are $\log 0.1$, $\log 0.01$,
$\log 0.001$, where walking out from 10 never lands — precisely the draws where a learner who
counts zeros gets $3$ instead of $-3$. `EL.2`'s L3a hint steered "a move in the opposite
direction cuts into the shift already there", true on 264 of 600 draws (44%) and the hint's
only concrete steer. Both closed (`62a2d8d8`, `ec93226c`). The third was P1-5 above, raised.

**Prompts and widgets that leak an answer (2).** `LogQuestionExplore.tsx:66`'s board 2 held
`{ value: 243, factors: 5 }`, rendering $243 = 3 \cdot 3 \cdot 3 \cdot 3 \cdot 3$ three
slides before the CFU asks how many passes reach 243× with key `5`; every sibling widget's
header states the opposite convention. Moved to 729. `packages/item-bank/src/d8/nodes/EL.2`
printed "shifted $1$ **units**" on 52 of 600 and 106 of 600 draws — one in six of the harder
template's prompts ungrammatical. Both closed (`2c3635b7`, `ec93226c`).

**Post-miss copy that teaches something false or unusable (2).** `LogNaturalSpot.tsx:107-110`
explained a negative logarithm "because reaching it takes a **negative number of factors**
of the base" — a count of $-3$ factors is not a thing, on the board whose whole subject is
the dropped minus sign, when `EL.3.json:8` already gives the honest reason. `EL.5`'s condense
reveal ended on $\log(xq)$ while the key is `log(x*q)`; measured, `log(xq)` grades
`invalid_input/unknown_symbol`, scored UNANSWERED, so a learner who typed back exactly what
the reveal showed lost the attempt. Both closed (`2c3635b7`, `de419867`).

**Re-asks and gates that do not do their job (2).** `EL.1.json:35`'s re-ask drew
`decay-value.l2`, which states the factor in words, while the authored check hands over three
readings and requires recovering the factor — so a learner who missed *because* they could
not read a factor off a sequence was re-asked something that never requires it.
`ExpGraphPlay.tsx` kept its gating call at a module constant `RIGHT_CALL = 2`, identical in
the same position on both boards, and a wrong call locked the learner out with only a restart
available — after which they already knew the answer to the step that stopped them. Both
closed (`b0ef4970`, `ab439801`).

**Openings that assert before they connect (2).** Three EL.2 slides opened on a claim with no
reach back and no question posed first, where EL.1 does this correctly on all three of its
non-opening slides. EL.3 slide 4 announced a pair ("**Two bases** come up so often…") and
delivered the second half with no hinge at all — not buried, absent — so the natural
logarithm read as a third fact rather than the other member of a declared pair. Both closed
(`523e8590`, `a5328f4d`), the latter absorbing the term rather than fencing it as an
appositive, which R19 requires.

**Terms used where the learner is graded but never where they are taught (3).** "the anchor"
appeared 6 times in the era and every one was inside EL.2's CFU block; the mini-lesson never
used it, and the node's own practice template proved the plain wording available.
"geometrically" and "identity" were each used once, undefined — the first in copy read after
getting the CFU wrong. All closed by dropping the word; the era-wide guard now fails if any
comes back.

**Register and scenario drift (3).** EL.6 used bold for ordinary emphasis on `both`,
`inside`, `product` and `original`, against 19 consecutive spans in EL.1–EL.5 that all mark
a term being introduced, and was the era's only pack using italics. EL.6's scenario ran onto
slide 1 — the only leak in 24 slide openings. And four of six openings were the same
readout-device frame, EL.1 and EL.2 both on a "panel", EL.2 and EL.4 both on a "dashboard".
The first two closed fully. For the third, **two openings were changed rather than four**:
EL.2 was the node in both collisions so rewriting it alone clears both, EL.5 was the barest
instance, and EL.1's panel and EL.4's dashboard were deliberately left — EL.1's carries the
era's signature doubling scenario and is referred to twice more in its own paragraph, and
EL.4's had just been rewritten for P0-2. Two of six on a readout is a coincidence, not a
template.

## Guards: what this round found out about its own instruments

Four gaps closed (table above). Beyond those, four guards were found measuring less than they
appeared to, which is worth recording because it is the ordinary failure mode here rather
than an exotic one.

1. **The prose ledger was blind to two fields.** `scan-lesson-text.mjs`'s `learnerStrings`
   read neither `slide_subtitles` nor `cfu.worked_solution`. This surfaced only because the
   era-wide lane proved its ledger additions by **injection** rather than inspection: the
   first run fired 6 of 10. A field nobody reads produces no findings and is indistinguishable
   from a clean one. Both are read now, widened across all 8 lesson directories — 1883 strings
   against 1552, zero new findings elsewhere. `cfu.worked_solution` is the worse of the two to
   have been blind to, being post-miss copy; `slide_subtitles` is where P1-9 lived.
2. **A tautological assertion in the EL.6 leak sweep.** It floored both draw spaces and then
   asserted each served item's parameters were a member of its space — which holds by
   construction, since the pool is generated from the same list the test reads. Replaced with a
   set-equality check against the whole space, which does fail when the draw is pinned.
3. **An auto-merge silently broke a guard added this round.** Integration lifted the sweep
   population into a new `practiceSweep.ts` and trimmed the in-file item-bank import to D1
   only. The D8 figure floor reads `D8_PRACTICE_TEMPLATES` and `D8_PRACTICE_ITEMS` from those
   lines; because this branch never *modified* them, git took integration's deletion without a
   conflict and left the block referencing undefined symbols. Restored, and the block proved
   still live by inverting its assertion: exactly 30 D8 templates fail, five per node across
   six nodes, matching the floor.
4. **A guard's population was believed narrower than it was.** `ExpTransformBuilder`'s exponent
   blank was reported as undriveable without a source change. It is driveable with none: the
   reveal always explains the first blank still open, so a sweep starting from an untouched
   board can only reach the coefficient, but the exponent becomes reachable once the attempt
   settles the coefficient first.

One fix was **written and then reverted** because no red could be produced for it on any
shipped path: unlatching `revealed` in `ExpTransformBuilder`, on the theory that a learner
who took the coefficient's explanation had no reveal left for the exponent. On the hand-back
path `WidgetFeedbackHost` never calls the widget's `resolve`, so the latch never fires in
production. A fix with no demonstrated defect behind it does not belong in the tree.

**A known gap, documented rather than silent.** The figure-title change in
`apps/web/src/lessons/worked/d8EL2.tsx` is asserted by no test: grepping the tree for the old
and new strings finds only the source line itself. So the green browser suite is evidence
that nothing broke around that title, not that it renders correctly. `d8EraProse.test.ts`
states in its own header that it does not reach the `d8EL*.tsx` figure titles and that a
regression there would not fail the file, which is the difference between a gap someone can
find and a gap that reads as coverage. Verified by hand instead that no learner-visible
`anchor` survives in the D8 worked visuals: the remaining occurrences are the SVG
`textAnchor` attribute, code comments, the `anchorCurve` and `anchorMoveWords` helper names,
and the `d8.el2.anchor-point.l2` template id — none of which a learner sees, and the last of
which is deliberately unchanged because renaming it would move a frozen `item_version_id`.

## Filed for other owners

Three items are outside this lane and are recorded rather than worked around.

1. **`answerFormat.ts`'s notation dispatch cannot tell a set-builder brace from an
   absolute-value bar.** `isAbsoluteValueAnswerText` matches a bare `|` and is applied with
   `.some` across the whole accepted list, so one set-builder spelling retags the answer field
   for the entire question. Measured: an early attempt at P1-1 that included set-builder forms
   made EL.4 advertise `2*x*sqrt(2*x), abs(x^5), |x^5|` over a square-root keypad on a
   domain-and-asymptote question, a fresh R30 defect worse than the one being fixed, and broke
   the shared `answerFormat.test.ts`. **This blocks the second half of P1-2**, and will block
   any pack that wants set-builder on the exact-match path.
2. **The `check`-block route does not reach compound answers at all.**
   `LessonCfuCheck.answer_type` admits only `"numeric" | "expression"`. Measured: grading
   EL.4's canonical answer *against itself* through `createD1AnswerChecker` returns
   `correct=false, reason=unsupported_syntax` under both, while a bare-number control row
   returns `match`, so this is the checker's verdict and not a broken probe. EL.4's answer is
   an inequality plus an equation and EL.2's is an equation plus an ordered pair, so both D8
   CFUs are out of reach. Widening it needs `types.ts`, `cfuChecker.ts` and
   `packages/shared-components`. `d8El2Cfu.test.tsx` will go red the day it lands, with a
   message telling whoever sees it to delete the enumerated list and add a `cfu.check`.
3. **Nothing in the tree asserts family membership in `skill_graph.json`.**
   `graph_invariants.py` reads families only through `mvp_family`, and no TypeScript test
   iterates them, so P1-7's correction is held up by review and the JSON's type and nothing
   else. A guard would apply to every `item_family` node across all domains, which does not
   belong inside a D8 content PR.

## Verification

Verified at **`9f55d8b3`**, after `origin/integration` (70 commits) was merged in.

### Gates

| Check | Result |
|---|---|
| `format:check` | GREEN, 1119 files — **was RED** one commit earlier, see below |
| `lint` | exit 0 (7 warnings, 14 infos, no error tier) |
| `typecheck` / `tsc --build` | exit 0 |
| `validate-lesson-pack.mjs --strict content/lessons/d8` | OK, 6 packs |
| `check:graph` | PASS, 87 hard edges over 62 live nodes, MVP 6 |
| `check:lessons` | PASS, 8 domains, 0 errors and 0 warnings in every one |
| `--project web-reachability` | 82 / 82 |
| 13 targeted unit files | **980 / 980** |
| 8 targeted browser files, in isolation | **185 tests, 0 failures** |

`format:check` was red at `de534085` on a single `phrase:` value the ledger widening left
wrapped across two lines. It is the first link of `npm run check`, so a failure there aborts
lint, typecheck and every suite behind it — a pipeline that looks red for one reason while
having run almost nothing. Fixed in `9f55d8b3` with `biome format --write` scoped to that one
path. **Open the PR from `9f55d8b3`, not `de534085`.**

One lint warning sits in a file this branch changed (`cfuVariants.ts:1026`, an unused
`const constant`). It is pre-existing — the identical line is on `origin/integration` — and
was left alone.

### The frozen pool

`packages/item-bank/src/__snapshots__/d8.test.ts.snap` hashes to
`d7fb56b44e3cc66bab0eff4113069290e93f1b4a`, byte-identical before and after every suite ran,
which also rules out a stray `-u`. Against `origin/integration` the diff is **exactly three
changed lines and nothing else** — no id, node or difficulty churn — and all three are on the
reviewed manifest:

| item | before | after | why it moved |
|---|---|---|---|
| `d8.el1.decay-value.l2:practice:90001` | `06138c23` | `d1c05a8f` | P2 re-ask fix reshaped the L2a prompt to require recovering the factor |
| `d8.el6.extraneous.l3:practice:90028` | `9af24b5d` | `dcf0f787` | P1-8, format example moved outside the draw range |
| `d8.el6.exp-quadratic.l3:practice:90029` | `4ebda56e` | `60568602` | P1-8, same |

**No fourth hash moved.** `d8.test.ts.snap` is the only one of the 11 `.snap` files differing
from integration, so the other ten match integration's versions. The re-pin was done once,
centrally, and read line by line against the manifest — rather than three times in three
worktrees, where a bulk regeneration would have carried an extra moved hash invisibly.

`hashItemDefinition` hashes only `node_id`, `prompt` and `answer`, which is why the EL.3, EL.4
and EL.5 fixes moved nothing: they are hint and worked-solution changes the hash cannot see.
EL.2's singular-unit fix also moved nothing, because no EL.2 item in the frozen pool draws a
shift of magnitude 1 — that defect only ever reached live draws and retry variants. Recorded
because an absent hash move would otherwise read as a fix that did not land.

### The widened prose ledger, re-measured independently

The widening was not accepted on the strength of a green re-run. The **pre-widening** scanner
was run over the same eight directories to prove the enlargement was real, since "no new
findings" over a sweep that grew by nothing means nothing:

| directory | strings before | after | newly read |
|---|---|---|---|
| `d1` | 65 | 107 | +42 |
| `d2` | 96 | 146 | +50 |
| `d3` | 50 | 91 | +41 |
| `d4` | 60 | 105 | +45 |
| `d5` | 370 | 425 | +55 |
| `d7` | 179 | 214 | +35 |
| `d8` | 714 | 759 | +45 |
| `d10` | 18 | 36 | +18 |

**+331 strings across all eight domains now read that were not read before, every directory
still exiting 0.** `BANNED_PHRASES` holds 27 entries, counted two independent ways over the
parsed array bounds so a malformed entry would show; integration has 7, so this branch adds
20, one per wording removed.

`d8EraProse.test.ts` is **provably collected**, not assumed: `vitest list --filesOnly` against
the same root config `test:unit` uses enumerates it among 283 files. Run alone it is 11 of 11
passing, and its first case is a population floor over 1712 learner-visible strings across 6
packs, so it is not green over an empty set.

### Suites, triaged against the recorded baseline

| Suite | This run | Baseline at `c310ac37` |
|---|---|---|
| `test:unit` | 27 failed / 6571 passed / 2 skipped, 283 files | 30 / 6557 |
| `test:browser` | 18 failed / 1626 passed / 14 skipped, 121 files | 10 / 1634 |

**Zero AssertionErrors in either suite.** Every failure is a timeout or a screenshot failure.

Unit: 20 of the 27 are `test/ciScopeFilter.test.ts`, a WSL/Windows path fault
(`/bin/bash: C:UserszhengAppData...` — backslashes stripped) with no assertions, identical
alone. Six more pass in isolation or at `--testTimeout=180000`. The last,
`product.test.ts`, fails alone at 61.5s against a **hardcoded** 60s cap that a CLI flag
cannot raise; the cap is the budget assertion and was deliberately not raised.

Browser: 18 is above baseline, so membership in the known population was not treated as
sufficient. All eight files whose names read behavioural rather than photographic were
isolated and **all eight pass alone** — `cfuAuthoredFigureShots`, `devCfuGameParity`,
`answerPlaceholderFit`, `mathKeypad`, `EraAdvanceCeremony`, `winterDevSkipOverTheIsland`,
`winterInCitySheet`, `winterConclusionSheet`. The remainder are `*Shots` screenshot files
failing with `locator.screenshot: Timeout` — several reporting *negative* remaining timeouts
(`Timeout -237.59ms exceeded`), the signature of a machine out of budget before the
screenshot was attempted. The run took 767s wall against 5287s of aggregate import time, so
the excess over baseline is load rather than behaviour.

**Nothing in either suite is attributable to this round.** No D8 test failed in any run, and
the eight D8-touched browser files pass both in isolation and in the full run.
