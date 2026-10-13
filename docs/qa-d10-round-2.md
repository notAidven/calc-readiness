# D10 QA — round 2

Reviewed at `fc0b53ea` ("Correct the R34 migration census and give the prose ledger its third
path"), on branch `anthony/d10-qa-round-2` in worktree `../wt-d10-qa`. The round's fixes are
committed on top as `fb840e5a`; every citation below was re-read at one of those two, and each
finding says which. Scope: `content/lessons/d10/GEO.1.json`, `content/lessons/d10/GEO.2.json`,
their eight gated widgets, and the shared figure fixture D10's CFU guard runs through.

Round 1 is `docs/qa-d10-round-1.md`, reviewed at `56497b6b` and merged by
#418. Its file:line citations are
from a tree eight commits back; every one used below was re-read rather than carried.

## Frozen content: unmoved, and the prose edit is inside the window that proves it

`git hash-object` over all thirteen files under `packages/item-bank/src/__snapshots__/`, taken
**after** this round's GEO.2 prose edit:

| Snapshot | Hash at `fb840e5a` |
|---|---|
| `d10.test.ts.snap` | `530fe49a3ad0131f1e944679a55b1bf97b3c62e5` |
| `d1` `d2` `d3` `d5` `d6` `d7` `d8` `d9` | `60ad243b` `27f6375b` `40674d1e` `e74c1f95` `0051f740` `5b71b580` `d7fb56b4` `75e4c7e4` |
| `interactive` `product` `template` `walk` | `9ce45bf7` `99c4fac7` `c3a7c355` `e7e79361` |

`d10.test.ts.snap` is the same `530fe49a…` round 1 recorded at `56497b6b` and after its five
merges. `vitest -u` was not run. This is the useful direction of the claim rather than the
formal one: the only content this round rewrote is `GEO.2.json` `mini_lesson[2]`, an authored
slide, and the pin covers `node_id` / `prompt` / `answer` for the ten served templates — so the
unmoved hash says the gloss did not reach a graded string.

## Round 1 reconciliation

Twelve items plus the checklist row, each re-verified in the tree rather than against round 1's
own status line. **STILL BROKEN** means the defect reproduces at `fc0b53ea`.

| # | Round 1 finding | Round 1 said | Verdict now | Evidence, re-read |
|---|---|---|---|---|
| G1-1 | `GeoAngleExplore` draws one fixed outline for two angle sets | FIXED | **FIXED** | `interactive/GeoAngleExplore.tsx:19` imports `triangleFromAngles`, called at `:225` |
| G1-2 | Same defect in `TriangleAnglesWorked` | FIXED | **FIXED** | `worked/d10GEO1.tsx:22` imports it, called at `:159` |
| G1-3 | Scale factor defined one-directionally | FIXED | **FIXED** | `GEO.1.json:8`: *"from a model up to the building it is greater than one and from the building down to the model it is less"* |
| G1-4 | Cord table declines the two terms it just taught | FIXED | **FIXED** | `interactive/GeoCordTable.tsx:128-130`: *"the setting whose two shorter sides are the legs of a right angle and whose longest side is the hypotenuse opposite it"* |
| G2-1 | Exact-pi key needs `*` and `pi`, input offers neither | FIXED by the dispatch | **FIXED** | `answerFormat.ts:410` placeholder, `:1212` the one key row; `answerKeypad.test.ts:110` has `...D10_PRACTICE_ITEMS` in `SERVED_ITEMS` |
| G2-2 | Cistern widget teaches the opposite input convention | FIXED | **FIXED** | `interactive/GeoCisternPlay.tsx:12-14` records the decision: *"a shortcut this board can afford and NOT the convention the learner is being prepared for"* |
| X-1 | "half turn" used to explain, never defined | FIXED | **FIXED** | `item-bank/src/d10/nodes/GEO.1/index.ts:197` now reads *"their measures add to $180$ degrees"*; the only surviving occurrence of the phrase is the comment at `:191` recording its removal |
| X-2 | Seven guards do not see D10 | FIXED, 7 of 7 | **6 of 7 FIXED; item 6 STILL BROKEN, and the closure claim over-counts** | see P2-1 |
| X-3 | Both CFUs declare `multipleChoiceAnswer` | WITHDRAWN | **NO LONGER APPLICABLE** | withdrawn on a measurement, not deferred; nothing to re-verify |
| X-4 | GEO.1's only prereq is NUM.4, and L3 wants a simplified radical | REPORTED, open | **HALF NO LONGER TRUE, graph gap STILL BROKEN** | `skill-graph/src/skill_graph.json:824-829` still gives GEO.1 `prereqs: ["NUM.4"]`; but `GEO.1.json:33` now derives it — *"Since $50 = 25 \times 2$ and $\sqrt{25} = 5$, that root simplifies to $\sqrt{50} = 5\sqrt{2}$"* — so round 1's "the pack never derives it" half is dead. REPORT ONLY: not my lane, `skill_graph.json` untouched |
| X-5 | `namesToken` guards a single-digit CFU answer more weakly than it appears | REPORTED, open | **WAS STILL BROKEN, NOW FIXED this round** | see P1-2 |
| X-6 | The ledger cannot see part of itself on the documented invocation | REPORTED, open | **FIXED, by #519** | `.cursor/skills/lesson-qa/SKILL.md:692-693` now names `packages/item-bank/src/d10`. Re-measured, not quoted: the widened invocation reads **3713** prose-shaped runs over **267** files against **3636** over **263**, so the third path is worth **+77 runs over +4 files** |
| R6 | Checklist says four figure defects, log says five | CHECKLIST CORRECTED | **NOT RE-CHECKED** | `TEAM_CHECKLIST.md` is out of bounds this round and I did not read it |

# Findings

No P0.

### P1-1 (FIXED) — GEO.2 uses "cross section" twelve times and defines it nowhere, and "prism" is introduced without the emphasis the domain reserves for exactly that

R32, with R6 underneath it. At `fc0b53ea`, `GEO.2.json:7` read:

> A prism keeps the same cross section all the way along, so its volume is the area of that
> cross section multiplied by its height. A cylinder follows the identical rule with a circular
> cross section, where the base area is $\pi r^{2}$ and the volume is therefore $\pi r^{2} h$.

Twelve learner-visible occurrences, counted rather than estimated: seven in
`content/lessons/d10/GEO.2.json` (three on `mini_lesson[2]`, four across `worked_examples[2]`
at `:41`, `:42`, `:43`, `:45`) and five in the widget that slide mounts
(`interactive/GeoCisternPlay.tsx:214, 230, 430, 438, 471`, e.g. *"The base is the flat cross
section the cistern keeps all the way down"*). Zero definitions on any of them. Occurrences in
`packages/item-bank/src/d10` for comparison: **zero** — the term is entirely a teaching-surface
term, which is what makes glossing it cheap and avoiding it impossible.

**The wrong conclusion a learner draws.** "Cross section" arrives in the same sentence that is
supposed to teach what a prism is, so a learner who does not already have the word cannot use
the sentence: the definition of prism is given in terms of an undefined noun, and the widget
then asks them to pick "the base" out of a cistern on the strength of it. The likeliest reading
of "keeps the same cross section" is "is the same width all the way along", which survives the
rectangular tank and fails the moment a solid is not a box.

R32's three tests, applied rather than asserted: the next interaction *does* use the word
(five times), so dropping it would leave the widget speaking vocabulary the slide declined to
teach; the gloss leans on no second unearned term (slice, flat, face); and it recurs across the
slide, the worked example and the widget, so the wording has to be kept. Gloss, not avoid.

`prism` is the R6 half of the same sentence. Wave-1 unbolded it to satisfy
`d10DomainProse.test.ts`, and the result was a term carrying its definition with no emphasis
while fifteen other spans in the same domain use bold for precisely that — which is the defect
R6 exists to prevent, arrived at from the other direction.

**The fix** (`fb840e5a`), `GEO.2.json:7`, still three sentences per R34:

> Slice a solid straight across and the flat face the cut exposes is its **cross section**: a
> **prism** keeps the same cross section all the way along, so its volume is the area of that
> cross section multiplied by its height.

`cylinder` is deliberately NOT bolded and the reason is recorded beside the list in
`d10DomainProse.test.ts:211-217`: the picture the everyday word gives is the geometric one, and
the slide adds no meaning to it. That is a judgement, and it is written where a future reader
of the list will meet it.

**Evidence.** `npx vitest run apps/web/src/lessons/d10DomainProse.test.ts` — 12 passed. The
census is load-bearing on both new entries, shown by injecting each direction at once (drop
`"cross section"` from `DOMAIN_INTRODUCED_TERMS`, unbold `**prism**` in the JSON):

```
AssertionError: a bold span in D10 is not a term being introduced ...
+   "GEO.2 mini_lesson[2]: **cross section**",
 ❯ src/lessons/d10DomainProse.test.ts:250:7

AssertionError: a term listed here is no longer introduced in bold anywhere in D10, so this
list has stopped describing the domain: expected [ 'prism' ] to deeply equal []
 ❯ src/lessons/d10DomainProse.test.ts:260:7

 Tests  2 failed | 10 passed (12)
```

Both injections reverted; `git status` clean against `fb840e5a` afterwards.

### P1-2 (FIXED) — a figure answering 10 satisfied a question keyed 5, and the guard reported green

Round 1's X-5, carried open and mine this round. `apps/web/src/lessons/figureAnswerFixture.ts`.
`namesToken` bounded a match with digits only, so the CFU key `"5"`
(`content/lessons/d10/GEO.1.json:66`, `accepted: ["5", "5.0"]`) was satisfied by any `5` in the
figure's markup — including the one in the DENOMINATOR of its closing row, where `{` and `}`
are the neighbours and neither is a digit.

**Reproduced first, at the CFU that owns the key.** Injecting `"n": 5` for `"n": 10` at
`GEO.1.json:75` makes the figure close on `\dfrac{50}{5} = 10`: a diagram answering **10**
under a question whose only accepted answers are `5` and `5.0`. With the old predicate:

```
 Test Files  1 passed (1)
      Tests  3 passed | 196 skipped (199)
```

**The wrong conclusion a learner draws** is not the point of this one and there is no shipped
defect behind it — GEO.1's real figure is right. The finding is that the assertion protecting
it was measuring the wrong thing: a scale error in a `worked_solution_params` block, the single
most likely edit to that file, was invisible to the only guard watching for it.

**The judgement the fix needed.** "The answer must sit in a distinguished slot or closing row"
is not available: the 47 figures under this fixture close in half a dozen arrangements, some on
a caption sentence, and pinning one shape would be repinning the figures rather than reading
them. So the rule is the middle one and it is about the needle: **the digits have to be a whole
number, not part of one.** Exactly two operators build a number out of smaller numbers — the
fraction bar and the exponent marker — so `/` and `^` now bound a match the way a digit does.
`-` and letters deliberately still do not, for the reasons the fixture's own comments record.

That alone was too strong, and a consumer said so rather than an argument:
`cfuFigureCoverage.test.tsx` asks after one PART of a composite answer at a time, and the `3` of
`6*sqrt(6)/3` is a denominator, so `cfu.rad1.quotient-radical` went red. The refinement is
narrow and positional: an operand position states a value **only where the answer itself puts
it there**, passed as a third argument that defaults to the needle. `/3` is licensed for
`6*sqrt(6)/3` and refused for a scalar `5`, which is the GEO.1 case.

**Red, at the changed lines, four ways.** New file
`apps/web/src/lessons/figureAnswerFixture.test.ts` (17 tests) holds the boundary cases the 47
rendered figures cannot show, with a floor under both populations so neither list can empty.

| Injection at `figureAnswerFixture.ts` | Failure |
|---|---|
| `binds = /[\^]/` (drop the bar half) | 5 failed, incl. *"the 5 is the DENOMINATOR of a fraction the figure states the value of, and that value is 10"* and *"the 10 is the divisor, and a figure dividing BY 10 has not stated the number 10 as an answer"* |
| `binds = /[/]/` (drop the exponent half) | 1 failed: *"the 2 is an exponent, so the number the figure states there is 900 and not 2"* |
| `answersOwn = () => false` (licence never granted) | 1 failed: *"the answer's own divisor, refused, would make every fractional answer unsatisfiable"* |
| `answersOwn = () => true` (licence unconditional) | 6 failed, incl. *"a scalar answer gets no licence: this is the GEO.1 figure answering 10 over a key of 5"* and *"the licence is per position, so a divisor the answer does not have stays refused"* |

And end to end at the CFU, with the final predicate and the `n: 5` injection restored —
`cfuAuthoredFigure.test.tsx:313`, the assertion that used to report 3 passed:

```
AssertionError: GEO.1: no accepted spelling of the answer appears in the figure. Wanted one of
5 | 5.0 | 5; the figure shows 50 | 10 | 30^2+40^2=2500 | 50/5=10 | ...
```

**Green over every consumer**, same code as shipped: `figureAnswerFixture.test.ts`,
`cfuAuthoredFigure.test.tsx`, `cfuFigureCoverage.test.tsx`, `cfuAnswerShape.test.tsx` —
**4 files, 328 passed, 0 failed**.

**The two loosened lines in `cfuFigureCoverage.test.tsx` owe their own red, and were given it**
by injecting the defect each was written to catch, not by argument.

| Injection | Failure |
|---|---|
| `worked/cfuD1D2.tsx:235`, closing row inverted to `\dfrac{root}{outside sqrt(inside)}` | `cfuFigureCoverage.test.tsx:217` — *"the figure never names 3 of \"6\*sqrt(6)/3\". It shows … 3/6sqrt(6)"*. The `3` is on screen and still refused, because the answer does not put it there |
| `worked/cfuD4D5.tsx:327,335`, rat5's vertical asymptote moved | `cfuFigureCoverage.test.tsx:207` — *"the figure never states x = 6, one part of \"(3, -4); x = 6; y = 4\""* |

Both reverted.

### P1-3 (REPORTED, NOT FIXED) — GEO.2's two boards keep the gate shut on a finished board with a miss on it, and the guard written for exactly that cannot see them

R29: *"A recorded miss must not hold a finished board shut. The gate turns on every part being
CALLED, not on every part being right first time."*

`interactive/GeoPavingClassify.tsx:258-274`, at `fc0b53ea`:

```
  function answer(order: Order, took: number) {
    ...
    if (took !== order.right) {
      return;
    }
    success();
    const clean = orders.every((row) => next[row.id] === row.right);
    if (clean && !done) {
      setDone(true);
      onSolved();
    }
  }
```

A learner who misses row 0, reads the sentence it prints, and calls the remaining rows
correctly has called every part. `onSolved()` is never reached: the early `return` skips it on
the miss, and `clean` is false forever after. `interactive/GeoNetDrag.tsx:161, 185-188` is the
same shape. Both boards then say so in as many words —
`GeoNetDrag.tsx:385`: *"Every face is placed, and one of them went into the wrong pile. The
reasoning is below, and a fresh job follows it."*

**The wrong conclusion a learner draws.** That finishing the board was worth nothing. The board
tells them a fresh job follows, so the work they just did on the other three faces is spent;
the only route onward is the reveal, which hands them the answer to a board they had otherwise
completed. R29's own reasoning applies unchanged: handing them a fresh board makes them
re-answer the parts they already had right in order to reach the one they did not.

**Why the family guard is green over it.** `widgetMissedBoardGate.browser.test.tsx:116-163`
drives a hand-written table of four boards — `perfect-root-classify`, `rationalize-explore`,
`compound-band-sorter`, `abs-count-classify` — every one of which already forgives. Neither D10
board is in it, and the file's own header explains why widening is not a two-line change: each
board needs a driver with its row selector, its settling tell, and a miss-once option sequence.
So this is the shape `qa-verification.mdc` describes: a guard scoped to the boards someone
wrote down rather than to the boards that exhibit the behaviour.

**R29's population figure is stale at this tip.** The rule says *"exactly 8 widgets, all
carrying the identical `const solved = complete && !missed`"*. Re-measured over
`apps/web/src/lessons/interactive`: **13 files** carry `const solved = complete && !missed`
(`DomainRestrictionClassify`, `ExpDecayClassify`, `LikeTermsClassify`, `LinearLinePairClassify`,
`LogDomainClassify`, `PiecewisePieceSelect`, `RationalCursedRootClassify`,
`RationalExclusionClassify`, `RationalHoleAsymptotePlay`, `SignRulesTable`,
`TransformParityClassify`, plus D10's `GeoPavingClassify` and `GeoNetDrag`), and two more read
it as `clean` without gating on it (`kinds/BinaryRowSort`, `RationalizeExplore`). The grep is
not the finding — the same file warns that gate use and caption use are indistinguishable by
pattern, and `LinearLinePairClassify` is named there as a false positive. What is measured here
is only that **D10's two boards read the miss in the gate**, by reading the two functions above.

**NOT FIXED, and the reason is evidence rather than scope.** The change is four lines. Proving
it is not: forgiving a miss is a behaviour only Chromium can show, `npm run test:browser` is
out of bounds this round, and a fix claimed off a source diff is exactly what
`qa-verification.mdc` forbids. Two drivers would also have to be authored blind. Beyond that,
R29 records that this family is inconsistent and that the ruling is Anthony's, with an explicit
instruction not to move one member as a side effect of an era — moving two of thirteen from a
QA round would widen the split, not close it. What is owed is one ruling applied to the
population, with `widgetMissedBoardGate` drivers for each board it moves.

### P1-4 (REPORTED, NOT FIXED) — GEO.2's cistern widget asks for a number the worked example directly above it has already printed

The D8 round's defect class, swept across D10's eight slides after that round landed: a section-3
widget replaying the section-2 instance printed above it, so the answer section 3 exists to make
the learner produce has already been handed to them. **One instance in D10, on GEO.2 slide 2**,
which is the slide carrying the pack's central idea.

`content/lessons/d10/GEO.2.json:39-41`, `worked_examples[2]`, prompt and first step:

> A rectangular tank is $10$ meters by $4$ meters and $2$ meters deep …
> The tank is a prism, so start from its cross section, the floor: $10 \times 4 = 40$ square
> meters.

`interactive/GeoCisternPlay.tsx:68-71`, the first board the widget deals:

```
const BOARDS: readonly Board[] = [
  { id: "tank", kind: "prism", depth: 3, length: 10, width: 4, radius: 0 },
```

and `:91-96`, what it asks for and how it prints the ask:

```
    const base = board.length * board.width;
      baseTex: `${board.length} \\times ${board.width} = ${base}`,
```

The widget renders `10 \times 4 =` beside a text input (`:298`, `:310`) and will not move until a
number is typed into it. That number is **40**, and `10 \times 4 = 40` is printed verbatim one
section up, on the same object — a rectangular tank ten by four. Only the depth changed, 2 to 3,
so the second of the widget's two answers (120 against the worked example's 80) is genuinely new
and the first is a copy.

**The wrong conclusion a learner draws** is not a false belief here, it is a false pass. The
widget's own header calls its method *"PREDICT, THEN VERIFY … Nothing about it can give the
answer away, because it does not move until the answer has been produced"* — and for the base
area on board 1 the answer was produced by the worked example, not by the learner. The gate that
was supposed to establish they can find a cross-sectional area opens on transcription. Worse for
this particular slide: the widget's second board is the round one, and the header says plainly
that the round board is *"exactly what the second board is for"* — the generalisation to a
circular cross section is the teaching. A learner who copies the first board and stops at the
gate never reaches the board that carries the idea.

**The tell D8 found holds here exactly.** `GeoCisternPlay.tsx:14` records the collision its
author checked, and it is the CFU: *"`d10.geo2.cylinder-volume-exact.l3` grades a typed
`588*pi`"*. The header never mentions the slide's worked example. Every D10 widget whose comment
names the slide is clean, and three of them name it in so many words —
`GeoCordTable.tsx:12-14` (*"Neither board uses the slide's own three, four, five"*),
`GeoDiagonalStepper.tsx:38` (*"Neither board is the slide's square of side five, and neither
answer is the CFU's fifty"*), `GeoComposeBuilder.tsx:60` (*"neither is the lesson's own terrace
or the check's cistern"*). D10 reproduces D8's correlation on 8 of 8 slides.

**REPORTED, not fixed,** per instruction: renumbering one board here leaves the identical hole in
every other pack migrated to three sections, and the guard that would close it is derived over all
of them. Two things from this sweep are worth having before it is sized. Its population is
**widget board against its own slide's worked example**, which the cross-slide case below shows is
narrower than the behaviour; and the comparison it needs is not "a number appears in both" — three
of eight slides here share a value and are correctly clean — but "a value the widget ASKS for is
printed as a result in section 2", which means it has to know which of a widget's numbers are
answers.

#### The seven clean slides, and the three near misses cleared

Standard applied: a shared number is a finding only if it hands over an answer. A shared
principle on different values is fine, and so is a shared intermediate the widget still makes the
learner compute.

| Slide | Section 2's instance | The section-3 widget's first board | Verdict |
|---|---|---|---|
| GEO.1 · 0 | cord of 12 knots as 3, 4, 5; $3^2+4^2=25$ against $5^2=25$ | `GeoCordTable` board 0: cord of 24 knots, the square setting 6, 8, 10; $6^2+8^2=100$ against $10^2$ | **clean** — same test, no shared value, and the widget's asks are the three `a^2+b^2` totals, none of them 25 |
| GEO.1 · 1 | square of side 5, diagonal $5\sqrt{2}$ | `GeoDiagonalStepper` board 0: legs 9 and 12, hypotenuse 15 | **clean** |
| GEO.1 · 2 | two lines crossing at $124^{\circ}$, giving $56^{\circ}$ and $124^{\circ}$ | `GeoAngleExplore` board 0: crossing $52^{\circ}$, triangle $43^{\circ}$ and $61^{\circ}$ | **clean** — the only number in common is the $180^{\circ}$ both slides are about |
| GEO.1 · 3 | staff 4, its shadow 5, tower shadow 30; factor 6, height 24 | `GeoShadowSlider` board 0: staff 2, shadow 3, tower shadow 21; factor 7, height 14 | **clean. Near miss on board 1** (staff 3, shadow 4, tower shadow 24; factor 6, height 18): it repeats the worked example's scale factor of 6, and carries 24 as a GIVEN shadow where the worked example had 24 as its answer. Cleared: the answer it asks for is 18, and a repeated factor with no repeated answer is the shared principle the rule allows |
| GEO.2 · 0 | court 12 by 9: area 108, perimeter 42; then 13 by 9: 117 and 44 | `GeoPavingClassify` board 0: court 14 by 9, area 126, perimeter 46 | **clean** |
| GEO.2 · 1 | L-shape 9 by 7 less a 3 by 2 corner: $45+12=57$, or $63-6$ | `GeoComposeBuilder` board 0: 10 by 8 less a 4 by 3 corner: $50+18=68$, or $80-12$ | **clean. Near miss:** both figures derive the same two side lengths, 5 (`7-2` and `8-3`) and 6 (`9-3` and `10-4`). Cleared: the widget LABELS those lengths on its figure (`:335`) and asks for areas, and no area is shared |
| GEO.2 · 2 | tank 10 by 4 by 2: $10\times4=40$, then $40\times2=80$ | `GeoCisternPlay` board 0: tank 10 by 4 by **3**, asks 40 then 120 | **FINDING, above** |
| GEO.2 · 3 | plinth 5 by 3 by 2, six faces, 62 | `GeoNetDrag` board 0: chest 6 by 4 by 3, underside excluded | **clean** — and its second board, the trough 7 by 3 by 2, shares only the height |

**One cross-slide recurrence, reported for sizing rather than as an instance of this class.**
`GeoComposeBuilder`'s SECOND board is 12 by 9 (`:65`), so the whole-rectangle area it asks for is
$12 \times 9 = 108$ — which `GEO.2.json:20`, the worked example on the slide BEFORE it, prints as
*"$12 \times 9 = 108$ square meters of slabs"*. It is not the defect above: a different slide, a
variant board rather than the first, and one of three asks. It is the same mechanism one slide
further away, so if the guard you size compares each widget board against its own slide only, it
will not see this.

### P2-1 (REPORTED, NOT FIXED) — round 1 claimed seven guard gaps closed and closed six; D10 still has no prompt-derivation guard

`docs/qa-d10-round-1.md:376` reads *"Status: all seven closed. Verified in the merged tree, one
citation each."* The table under it has seven rows, and they do not map onto the seven items.
Round 1's item 6 was *"No prompt-derivation guard exists for the item bank at all … the D7 file
`promptDerivedAnswers.test.ts` is the only one of its kind and covers D7 alone."* The table's
row 6 is the `answerFormat` d10 floor, which is item **7**, and its row 7 is the D10 prose
guard, which came from the plan's list rather than this one. Item 6 has no row.

Verified at `fc0b53ea` rather than inferred: `promptDerivedAnswers.test.ts` exists for
`packages/item-bank/src/d5`, `/d6` and `/d7`, and **not** for `/d10`. Round 1's own 4,000-draw
re-derivation sweep was written by hand for that review and is still not in the tree, so the
guarantee it produced expired with the round that produced it.

The other six are genuinely closed, re-read here: `answerKeypad.test.ts:29, 110`
(`...D10_PRACTICE_ITEMS`), `visualsMath.test.tsx:48-49, 636` (the D10 figure floor and its
comment *"owed for exactly the reason the D1 and D8 ones are"*),
`WorkedSolution.browser.test.tsx:47, 68` (`...D10_PRACTICE_POOL`),
`widgetRevealFill.browser.test.tsx:1255` (both former `FILL_UNDRIVEN` widgets now driven),
`answerFormat.test.ts:627` (`entry.domainId === "d10"`), and `d10DomainProse.test.ts` itself.

**NOT FIXED.** A D10 prompt-derivation guard is a new file over ten templates and it belongs to
whoever widens `promptDerivedAnswers` past its three domains, not to a two-pack QA round; a
rushed version of it is worth less than the honest gap. The correction that matters is the
first paragraph: **round 1's ledger says seven and means six.**

### P2-2 (REPORTED, NOT FIXED) — GEO.1's fourth slide opens on its definition, with nothing reaching back

R15: *"A slide opens by connecting, and raises its question before its claim."*
`content/lessons/d10/GEO.1.json:8`, first sentence:

> Two figures are **similar** when they have the same shape at different sizes, which is what
> makes a model worth building before the thing itself.

The learner arrives from `mini_lesson[2]`, three angle relations, and the connection is not made
in either direction; the slide states the definition and then supplies its motivation as a
subordinate clause. The pack's own material has the question ready — `worked_examples[3]` is a
bell tower measured by its shadow, and the slide mounts `geo-shadow-slider` — so *"a terrace's
diagonal can be reached across and measured, and a bell tower's height cannot"* is available as
an opening that earns the definition instead of announcing it. Compare `mini_lesson[1]`, which
does this correctly: *"A rectangle staked out on the ground is checked the same way…"*.

**The wrong conclusion a learner draws** is milder than the other findings and it is a real one:
that similarity is a fact about shapes to be memorised, rather than the thing that licenses
measuring one object by another. The slide's last sentence is about direction of the scale
factor, which only matters once you are actually carrying a measurement across.

**NOT FIXED, deliberately.** A reach-back sentence pushes the paragraph to four sentences,
which R34 caps at three unless unavoidable, so the honest fix is a rewrite of all three
sentences and not an insertion — and a rewrite has to keep three bold introductions
(`similar`, `corresponding sides`, `scale factor`) and avoid spending the bell tower the worked
example needs. That is authoring, and it should be done as authoring rather than at the end of
a QA pass.

### P2-3 (REPORTED, no change recommended) — GEO.2's second subtitle is two words where R14 says three or four

`content/lessons/d10/GEO.2.json:10-15`, read as the sequence R14 asks for:

> "Slabs and curb", "Composite figures", "Prisms and cylinders", "Covering, not filling"

`"Composite figures"` is two. Recorded because the rule states a range and the validator only
enforces the four-word cap, so nothing else will ever mention it. **No change recommended**: it
is a tight noun phrase naming the slide, it pre-empts no noticing, and R14's own instruction is
*"Do not pad to reach four words"* — the third word would exist to satisfy the count. The
sequence otherwise reads correctly, one plain title per slide with no question form
manufactured and no repeated opening formula.

# Fixed versus only reported

| # | Finding | Outcome |
|---|---|---|
| P1-1 | "cross section" unearned, `prism` unemphasised | **FIXED** — `GEO.2.json:7`, `d10DomainProse.test.ts:211-217` |
| P1-2 | `namesToken` reads an operand as an answer (round 1's X-5) | **FIXED** — `figureAnswerFixture.ts`, new `figureAnswerFixture.test.ts`, two call sites in `cfuFigureCoverage.test.tsx` |
| P1-3 | R29 gate on `GeoPavingClassify` and `GeoNetDrag` | **REPORTED** — needs a Chromium-proved fix and a family ruling |
| P1-4 | `GeoCisternPlay` board 0 replays GEO.2 `worked_examples[2]`'s first result | **REPORTED** — by instruction; the fix is a guard derived over every migrated pack, not a renumbering here |
| P2-1 | Round 1's "seven closed" is six; no D10 prompt-derivation guard | **REPORTED** |
| P2-2 | GEO.1 slide 4 opens on its definition | **REPORTED** |
| P2-3 | Two-word subtitle | **REPORTED, no change recommended** |
| X-4 | GEO.1 prereq gap for radical simplification | **REPORTED ONLY**, by instruction; `skill_graph.json` untouched |

# Coverage actually run

Measured at `fb840e5a` unless stated.

| Sweep | Result |
|---|---|
| `npm run check:lessons` | `OK: 9 lesson pack(s) passed`; **d10: 2 packs, 0 errors, 0 warnings**; 10 domains pass at the error tier |
| `scan-lesson-text.mjs content/lessons/d10 apps/web/src/lessons/interactive` | `OK`, **85** learner-facing strings across 2 packs, **3636** prose-shaped runs across **263** widget files |
| the same plus `packages/item-bank/src/d10` (the widened invocation X-6 is about) | `OK`, **85** strings, **3713** runs across **267** files — **+77 runs, +4 files**, re-measured here rather than quoted |
| `npm run typecheck` (`tsc --build`) | exit 0 |
| `npm run lint` | exit 0; 28 warnings and 23 infos, with 31 more diagnostics suppressed by the display cap — so this run is **not** evidence that none of them is mine |
| `biome check` over the four changed source files | clean, 0 diagnostics. Run because the line above cannot carry the claim, and because of the trap below |

### `npm run lint` does not check formatting, and a green lint is not a green gate

Worth a paragraph rather than a parenthesis, because the next worker will hit it. `package.json:19`
is `"lint": "biome lint ."`. Formatting is a **separate** script, `format:check`
(`"biome format ."`, line 21), and `npm run check` (line 26) runs it FIRST:
`format:check && lint && typecheck && test`. So the two commands a QA round is allowed to run —
`npm run lint` and `npm run typecheck` — between them cannot see a formatting defect, and the
gate fails on it before it reaches either of them.

This round shipped one. `apps/web/src/lessons/figureAnswerFixture.test.ts` was written with an
`it.each` call biome wanted broken across lines; `npm run lint` exited 0 over it, and
`npx biome check <file>` reported *"Formatter would have printed the following content"*. Caught
only because `npm run lint`'s output caps its diagnostics ("Diagnostics not shown: 31") and the
coverage claim above could not be made without checking the changed files individually.

**So run `npx biome check` over the files you changed before committing.** It is `lint` and
`format` together, it took 103ms over the four files here, and unlike `npm run lint` it sees the
half of `npm run check` that runs first. `npx biome format --write <file>` fixes what it finds.
| `figureAnswerFixture.test.ts` + `cfuAuthoredFigure` + `cfuFigureCoverage` + `cfuAnswerShape` | **328 passed, 0 failed** over 4 files |
| `d10DomainProse.test.ts` | **12 passed** |
| `git hash-object` over 13 snapshots, after the prose edit | all unmoved; `d10.test.ts.snap` `530fe49a…` |

**Reading passes run by eye, since no validator can.** Both packs, eight slides.

- **R14 (subtitles as a sequence).** Eight read as a list. GEO.1's four are 3, 4, 3, 4 words;
  GEO.2's are 3, **2**, 3, 3 — the two is P2-3. No claim among them, no question form, no
  repeated formula.
- **R15 (cold openings).** Eight opening sentences. `GEO.1 mini_lesson[1]` (*"checked the same
  way"*), `GEO.2 mini_lesson[1]` (*"Not every plan is a plain rectangle"*) and
  `GEO.2 mini_lesson[3]` (*"Filling a solid and covering one are different orders"*) connect and
  ask before claiming. `GEO.1 mini_lesson[3]` is P2-2. `GEO.1 mini_lesson[2]` opens on a count
  (*"Three relations settle most of the angles a plan has to account for"*) which announces the
  slide without pre-empting its noticing, and is not filed. No opening begins with a bare
  demonstrative.
- **R16 (leading hinges).** Consecutive pairs across all eight. One candidate:
  `GEO.1 mini_lesson[1]`, *"A missing leg comes from the same rearrangement with a subtraction in
  it"*, where finding a leg is the inverse of finding a hypotenuse and the turn sits fourth word
  rather than first. Judged too slight to file: the connective is in the opening clause, not
  buried mid-sentence like the line that forced the rule. Recorded so the judgement is visible
  rather than absent.
- **R21 (label slots).** `GeoCordTable.tsx:121` heads a `FillTable` column *"the two shorter
  squares added"*, a phrase built around a verb, which is the tell R21 gives. It is a
  **legitimate exception and the widget argues it at `:114-120`**: two of the three settings on
  every board have no right angle in them, so a column headed *"hypotenuse squared"* would teach
  that the longest side of any triangle is a hypotenuse — false, and the error the converse
  exists to test. The two terms are used in the `why` and the conclusion, where the roles are
  real. Not filed.
- **R22 (sibling options).** `GeoPavingClassify` offers `["Area", "Perimeter", "Neither"]`
  against a prompt asking what each order is counted from; all three answer that question.
  `GeoNetDrag`'s two piles answer "is this face covered by the job". Coherent sets.
- **R23 (coinages).** "cord setting" (`GeoCordTable`) is the only candidate. It is plain
  description of a physical arrangement rather than a coinage dressed as a term — never bolded,
  never defined, and R23 endorses exactly that substitution. Not filed.
- **R33 (copy after a miss).** Both finished-with-a-miss lines name the miss on the way past and
  point at the reasoning: *"The list is finished with a call that did not hold. The reasoning is
  below…"* (`GeoPavingClassify.tsx:420`) and `GeoNetDrag.tsx:385`. Neither leads with the
  penalty nor coaches retrospectively. The per-row notes state what is true of the row. Clean
  under R33 — the objection to the second half of those sentences is R29's, and it is P1-3.
- **Section-2 collision sweep (D8's defect class), run over all 8 slides.** Added after the D8
  round landed, because the R34 pass above predates it and could not have caught it. Section 2's
  instance compared against the numbers the section-3 widget's FIRST board actually asks for, one
  slide at a time: **1 finding (P1-4), 7 clean, 3 near misses cleared on the shared-principle
  rule, and 1 cross-slide recurrence recorded for guard sizing.** The per-slide table is under
  P1-4. D8's source tell reproduces here on 8 of 8: the one widget whose comment names only the
  CFU is the one that collides.
- **R34 (three sections per slide).** All eight slides carry lecture + worked example + gated
  widget: 4 `mini_lesson` entries, 4 `worked_examples`, 4 `visuals` with `gates: true` in each
  pack. Every `mini_lesson` entry is **three sentences** (GEO.2's edited one included) and every
  worked-example `prompt` is **two**, inside R34's caps. Instances do not collide:
  `GeoDiagonalStepper.tsx:38` states its own boards avoid the slide's square of side five and
  the CFU's fifty, and GEO.2's plinth (5×3×2), cistern CFU (8×5×2), chest (6×4×3) and trough
  (7×3×2) are four different solids.
- **R12 (reveal completeness), verified rather than trusted, and the planning grep was one file
  optimistic.** Seven of the eight mount the reveal themselves (`useRevealReAsk` plus a
  `WidgetReveal` in their own source). `GeoCordTable.tsx` carries **neither string** and is not a
  gap: it renders the shared `FillTable` kind, which owns both for every adopter
  (`interactive/kinds/FillTable.tsx:118, 282`). Complete, but complete through a delegation a
  grep over `interactive/Geo*.tsx` reports as an absence.

## Browser guards this round's changes want, for a serial run

None are required by the two fixes — no widget source and no CSS changed, and the only rendered
surface touched is `GEO.2 mini_lesson[2]`. Worth running when convenient, in this order:

1. `widgetRevealFill.browser.test.tsx` — the only browser file that reads `namesToken`'s
   siblings over rendered fills.
2. `d10Geo1TriangleShots.browser.test.tsx` — frames the 920px lesson column at 1024x580; the
   GEO.2 slide gained one clause and this is where a wrap would show.
3. `widgetMissedBoardGate.browser.test.tsx` — unchanged by this round, listed because P1-3 is
   the file's population and a run of it now is the baseline any fix would be measured against.

## NOT DONE

- **P1-3 not fixed.** R29 on `GeoPavingClassify` and `GeoNetDrag`: reported with the gate code
  quoted, not changed. Reasons above.
- **P1-4 not fixed, and no guard written for it**, by instruction. `GeoCisternPlay`'s boards are
  untouched.
- **P2-1 not fixed.** No D10 `promptDerivedAnswers` guard was written.
- **P2-2 not fixed.** GEO.1 `mini_lesson[3]`'s opening is unchanged.
- **P2-3 no change made,** by recommendation rather than omission.
- **X-4 not fixed,** by instruction. `packages/skill-graph/src/skill_graph.json` was not edited.
- **`TEAM_CHECKLIST.md` not read and not edited**, so round 1's R6 row is carried as NOT
  RE-CHECKED rather than as verified.
- **No browser suite was run** and no frame was taken this round, so every claim above rests on
  source, jsdom or node evidence. Nothing here is a spatial claim.
