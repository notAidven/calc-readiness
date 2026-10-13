# D4, the Classical era — QA round 1, at `941c5576`

**The review was conducted at `941c5576`**, off `origin/integration`, fetched 2026-08-02. Every
finding, line reference and frame below is evidence about that tree. The branch was later rebased
onto a newer `origin/integration` for delivery; the rebase target and what was re-verified across
it are recorded in "Rebase" near the end, and they are deliberately kept separate from the pin,
because a rebase target is not the SHA anything here was measured at. The last section triages
every failure the whole gate reported on the rebased tree.

Numbers are measurements. Where a figure was taken by one of the four Phase 2 streams and a later
stream's edits could have moved it, it was re-taken at the merged working tree before being
written here, and the two readings are distinguished in the text. Where a figure is a stream's own
instrumented run that cannot be cheaply reproduced (an injected red, a frame), it is attributed to
that stream's run rather than re-claimed.

**Scope.** `getEraNodes("classical")` = POL.1, POL.2, POL.3, POL.4, POL.8, all in
`content/lessons/d4/`, so the era is exactly one directory. POL.5 (Industrial) and
POL.6 / POL.7 (Renaissance) have no lesson packs and are out of scope.

**Frozen content.** `packages/item-bank/src/__snapshots__/product.test.ts.snap` is
`git hash-object` `99c4fac7d14ba1673120794c4aa9f9d9576de209` at the pin, and it hashes to the same
value at the end of the round. `git status` reports the file unmodified. `vitest -u` was never run.

## Mechanical checks, per directory

Both run once per directory, never over a file list, so the domain-level variety rules run. The
run below is at the **rebased tree** (`bdf224a6`, on `1dcc5030`), not at the pin: the prose and the
accepted lists moved during the round, and the rebase moved a widget count again, so the pin's
figures would no longer describe the tree.

```
$ node .cursor/skills/author/scripts/validate-lesson-pack.mjs --strict content/lessons/d4
note: visuals.tsx parsed from ...\apps\web\src\lessons\visuals.tsx: 210 registry entries, 0 of them captioned. R8 ... therefore has nothing to check, and this is the INTENDED END STATE ...
OK: 5 lesson pack(s) passed validation.
EXIT=0
```

```
$ node .cursor/skills/lesson-qa/scripts/scan-lesson-text.mjs content/lessons/d4 apps/web/src/lessons/interactive
OK: 119 learner-facing string(s) across 5 pack(s) and 2856 prose-shaped run(s) across 219 widget file(s), no rendering artifacts.
EXIT=0
```

At the pin the same two commands read **105** strings and **2,852** runs. The string count moved to
107 when Stream A's P0 added two accepted spellings and to 119 when Stream B's round four added
twelve more; no prose string was added by any stream, only removed or rewritten in place. The
widget-run count moved by two on Stream C's edits, to 2,854, and by two more on the rebase, which
is not this round's work: `1dcc5030` edited eleven `interactive/` sources this branch never opened.
Both readings are recorded rather than the later one silently replacing the earlier, because 2,854
is what this round's edits produced and 2,856 is what ships.

Three things a reader of those two lines needs:

- **R8 state: parsed-and-empty**, the live one of its three states. The registry was found and
  parsed at 210 entries with 0 captions, so R8 ran over an empty population by design rather than
  failing open. Neither *"was NOT FOUND from here"* nor *"was found but COULD NOT BE READ"*
  appeared.
- **R18 ran.** The validator prints `note: skill_graph.json not readable from here; skipping the
  node-id rule (R18).` when it cannot resolve the graph (`validate-lesson-pack.mjs:2086`). That
  line is **absent** from the run above, so the node-id rule was applied rather than skipped.
- **The variety figures are the DIRECTORY's, not the era's.** They coincide here, because
  `content/lessons/d4/` holds exactly the five classical nodes and nothing else. They will stop
  coinciding the day POL.5 / POL.6 / POL.7 land, and any R11 claim after that has to be re-taken
  across the era by hand.

Baseline is zero and stays zero: no error and no warning on either script.

**`BANNED_PHRASES` is 39 entries** in `.cursor/skills/lesson-qa/scripts/scan-lesson-text.mjs`
(`:166-356`), counted by reading them at the rebased tree rather than carried from a stream report.
Twenty-seven pre-date this round and **twelve were added by it** — entries 28 to 39, the run from
*"A leading coefficient changes only how many pairs there are to test"* to *"The same four-product
rule holds when a side carries a coefficient"* — one whole sentence per prose objection acted on,
each with its `why`.

## Round 0 reconciliation, at `941c5576`

Prior work, all merged and all ancestors of the pin (`mergedAt` read from the PR, not inferred from
pushes):

- #364, merged 2026-08-01T21:32:52Z,
  merge commit `9a21741f` — the eight photographed layout defects, the three follow-ups, and three
  items left explicitly open.
- #382, merged 2026-08-01T19:29:43Z,
  merge commit `56497b6b` — the POL.4 CFU figure clip.
- `work-log/gabe/2026-07-30-era-four-classical-authored.md` — two items declared open at authoring.

Each row was re-verified against the tree at the pin rather than against the claim. Spatial rows
carry a rendered frame at **1024x580** that was looked at, framed to the surface rather than
cropped to the element; frames live under `apps/web/src/lessons/__screenshots__/` (gitignored) and
are named in the evidence column.

**Count, re-measured at the merged tree by grepping the table below: 21 rows — 17 FIXED, 4 STILL
BROKEN, 0 NO LONGER APPLICABLE.** An earlier draft of this document, and Stream C's fragment
quoting it, both said 18 FIXED; that is arithmetically impossible against 21 rows and 4 STILL
BROKEN, and the correct figure is 17. Corrected here rather than carried.

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | Photo 1: POL.1 / POL.2 column labels printed over the product line (`AreaGridWorked`) | FIXED | Frame `d4-round-one/photo1-area-grid-pol1-binomial-l2-1024x580.png`, looked at: `(x+3)(x+5)` sits in a band clear of the `x` and `5` column labels. `worked/d4Kit.tsx:42` is `const TOP = 66`. `workedFigureLabels.browser.test.tsx` green. |
| 2 | Photo 2: POL.2's drag board named no target, and carried an unanswerable duplicate `x + 6` decoy | FIXED | Frame `difference-squares-drag/placement-1-the-strip-lands-1024x580.png`: the board reads *"Placement 1 of 3, where the strip lands"*, the open target is captioned *"where the strip lands"* / *"drop here"*, and the tray holds four distinct chips. `DifferenceSquaresDrag.browser.test.tsx` 7/7 in isolation. |
| 3 | Photo 3: POL.3's third option rendered as bold prose (an `OrderSteps` step written as `text`) | FIXED | Grep of the merged result: all four steps in `interactive/SolveQuadraticOrder.tsx` are `latex:` (lines 39, 51, 65, 77) and the file contains no `text:` step key. |
| 4 | Photo 4: the reveal highlight did not cover tall math | FIXED | Frame `d4-round-one/photo4-reveal-highlight-lost-root-spot-1024x580.png`: the tint encloses the whole of $\dfrac{x^{2}}{x} = \dfrac{7x}{x}$ top and bottom. `styles.css:5108-5110` is `inline-block` + `max-width: 100%`. `revealAnswerHighlight.browser.test.tsx` green. |
| 5 | Photo 5: POL.4's side slot was clipped by a `0 0 400 216` viewBox | FIXED | Frame `complete-square-drag/both-placed-the-square-finished-1024x580-viewbox-400x240.png`: the `x + 4` slot is drawn whole, bracket closed. `interactive/CompleteSquareDrag.tsx:68` derives `FIGURE_H = SLOT_Y + SLOT_H + FIGURE_PAD` rather than hand-counting it. `completeSquareDragViewBox.browser.test.tsx` green. |
| 6 | Photo 6: POL.4's Check button wrapped below its row once a verdict appeared | FIXED — **but by a different mechanism than #364's, and #364's rule is gone** | Frame `d4-round-one/photo6-equation-row-check-after-a-miss-1024x580.png`: after a miss the Check is on the row's first line, rightmost, with *"not yet"* stacked above it. `equationRowCheckPlacement.browser.test.tsx` green over its derived population. #364's `.lesson-equation__row:has(> .verdict)` fourth track no longer exists; `styles.css:5758-5801` records that it was dropped at a merge in favour of `.lesson-equation__aside`, which stacks the verdict over the button in the existing third track. The guard's stale justification is P2-18 below, now fixed. |
| 7 | Photo 7: the parenthesis in `d4.pol4.complete.l1` was too short | FIXED | Frame `bracket-sizing/d4-pol4-complete-l1-1024x580.png`: `\left(\dfrac{14}{2}\right)^{2}` with the parens reaching round the fraction. `worked/d4POL4.tsx:65` writes `\left(...\right)`. `bracketSizing.browser.test.tsx` green. |
| 8 | Photo 8: POL.8's drop slots painted their contents outside their own borders | FIXED | Frame `d4-round-one/photo8-pol8-slots-all-filled-1024x580.png` with all three positions filled: `x + 3`, `x + 6` and `4` sit inside their boxes and the `×` and `+` between them are legible. `styles.css:5923-5926` gives `.lesson-equation__slot:not(input)` `width: auto; min-width: 3.1rem`. `widgetDropSlots` and `divideRebuildPhone` both green. |
| 9 | Follow-up: POL.2's figure was not a dissection — a `44 x 44` hole nothing painted, and `x` labels that did not say what they measured | FIXED | Same frame as row 2: the moving strip is shaded and captioned *"this strip moves"*, the removed corner is hollow and carries `6` on both sides, and both `x` labels sit on tick-bounded dimension lines spanning the whole original square from outside it. The tiling and rule-span assertions in `DifferenceSquaresDrag.browser.test.tsx` are green. |
| 10 | Follow-up: `x + 4` sat against the top edge of POL.4's rounded side slot (`SvgHitTarget`'s `BARE` style) | FIXED | Frame `svg-hit-target-centering/pol4-side-slot-1024x580.png`: `x + 4` is centred in its slot. `svgHitTarget.tsx:36-47` carries `display: flex`, `alignItems: center`, `justifyContent: center`, `lineHeight: 1`. `svgHitTargetCentering.browser.test.tsx` 3/3 **in isolation** — it fails under suite contention, which is triaged in "Verifying the combined tree" at the end. |
| 11 | Follow-up: the bracket was measured as a font box rather than as painted ink | FIXED | `apps/web/src/lessons/katexInk.ts` exists and is imported by `workedFigureLabels.browser.test.tsx:74`; `bracketSizing.browser.test.tsx` measures the ratio and is green, with `bare` / `bigl` / `Bigl` pinned below the floor by its own injection test. |
| 12 | Guard widening: the paren guard swept one template; the widening found a bare `\{ \}` around a display fraction in D5's `d5.rat6.rate.l2` | FIXED | Frame `bracket-sizing/d5-rat6-rate-l2-1024x580.png`: the braces enclose $\tfrac{8}{3}$ as a set rather than sitting beside it. `workedSolutionVisuals.tsx:1514-1515` builds `\left\{...\right\}`. Population is derived from the render, not enumerated. |
| 13 | The string-level rule counted `(` and `)` only, so a set brace around a display fraction was invisible to it | FIXED | `visualsMath.test.tsx:171-174` holds a `DELIMITER_PAIRS` table and `ungrownDelimiters` walks each pair on its own stack (`:190-192`). |
| 14 | `bracketSizing`'s last assertion was a tautology (`readings.length - short.length === readings.length`) and its population could drift | FIXED | The tautology is gone: the only `readings.length` left is a floor (`bracketSizing.browser.test.tsx:434`). In its place, both the reported figure (`:468-472`) and the one the widening found (`:486-490`) are named with a floor of 8 readings each, plus a composition check that the population outside D4 is at least four templates (`:455-459`). |
| 15 | #364's finding 1: the worked-figure sweep excused D4, which is why photo 1 shipped | FIXED | `practiceSweep.ts:243-246`: `NOT_SWEPT_HERE` now holds `d3` and `d7` only. `D4_PRACTICE_POOL` / `_ITEMS` / `_TEMPLATES` are all in the three populations (`:61`, `:74`, `:92`). **Re-measured:** `TEMPLATE_FLOOR` is **180** at the pin, not the 135 the work log records — D9 and D10 landed since and each raised it; the comment at `:199-216` states the floor sits above the total without D4 and above the total without D9. |
| 16 | #382: POL.4's authored CFU reveal clipped $\dfrac{3}{2}$ off the solved line | FIXED | Frame `cfu-authored-figure/POL.4.png` at 1024x580: `x = \tfrac{3}{2} or x = -4` renders whole under the number line. `worked/d3Kit.tsx:111` is `viewBox="0 0 440 172"`. `cfuAuthoredFigureShots.browser.test.tsx -t "POL.4"` green, including the foreignObject geometry guard. |
| 17 | Left open by #364: `DifferenceSquaresDrag`'s first placement has a reveal-fill gap | STILL BROKEN at the pin — **closed by this round**, P1-8 | `interactive/DifferenceSquaresDrag.tsx:353` read `const pieceState = stateOf("piece", false, placedPiece);` — the `given` argument hard-coded `false`, and `edge()` (`:332-339`) called for `"long"` and `"short"` only (`:351-352`) and never for `"piece"`. |
| 18 | Left open by #364: `stepChipMath`'s carrier list is named, not derived | STILL BROKEN at the pin — **closed by this round**, P2-7 | `stepChipMath.test.ts:70` was a literal `const RAW_CARRIERS = ["text", "caption", "glyph", "name", "label"]`, and the file's own header (`:36-39`) said so. |
| 19 | Left open by #364: D3's own draws of `SolutionLineWorked` are unguarded | **STILL BROKEN, and still open at delivery** | `practiceSweep.ts:244` at the merged tree: `{ domain: "d3", why: "no figure sweep anywhere yet; a known gap, not an exemption" }`, with `d7` beside it. Assessed by Stream D with the line numbers attached and recommended as its own PR — see "Recommendations" R-1. |
| 20 | Declared at authoring: nine of D4's ten own-copy reveal fills are in `FILL_UNDRIVEN` | STILL BROKEN at the pin — **closed by this round**, P1-8 / P1-9 and Stream C round two | Nine D4 entries at the pin (`widgetRevealFill.browser.test.tsx:988-1017`); `square-side-solver` was the tenth and was driven. |
| 21 | Declared at authoring: the five D4 CFU checks are in `NOT_YET_CONVERTED` | FIXED | `cfuVariants.test.ts:196` is `const NOT_YET_CONVERTED = {}` — empty — and `:529-546` asserts that every check in the tree serves a different question on its re-ask, with a floor of 38 checks. All five D4 packs carry a `variants` block: POL.1 → `d4.pol1.leading.l3`, POL.2 → `cfu.pol2.measure-then-factor`, POL.3 → `d4.pol3.area.l3`, POL.4 → `d4.pol4.formula.l3`, POL.8 → `d4.pol8.synthetic-cubic.l2`, each `count: 2`. |

**Three of the four STILL BROKEN rows were closed inside this round**, and each is written up below
with its own evidence rather than being marked closed here on a summary. Re-verified at the merged
tree by reading the files, not the reports:

- Row 17 and row 20 — `FILL_UNDRIVEN` (`widgetRevealFill.browser.test.tsx:1178`) now contains no D4
  entry at all, and carries the comment *"D4, the Classical era, is no longer here at all: all ten
  of its own-copy fills are driven above"*. The floor at `:1247` is `toBeGreaterThanOrEqual(32)`.
- Row 18 — `stepChipMath.test.ts:239` is a derived `RAW_CARRIERS`; the five original keys survive as
  `RAW_CARRIERS_FOUND_UNDER` (`:76`) and are asserted still reached (`:314`), with the derived
  population floored above them (`:343`).
- Row 19 is the one that is still open, and it stays open. Read `NOT_SWEPT_HERE` at the merged tree
  rather than the report: it is still `d3` and `d7`.

## P0 findings

Wrong mathematics, a correct answer graded wrong, or a dead end.

### P0-1 — `d4.pol8.missing-power.l3` printed a dividend its own key does not divide. **Two sites, one defect.** FIXED

Found independently by Stream B in the generator and by Stream D in the worked figure, and it is
one finding: the same sign error, written twice.

- `packages/item-bank/src/d4/nodes/POL.8/index.ts` computed the dividend's `x` coefficient as
  `n + r * r`.
- `apps/web/src/lessons/worked/d4POL8.tsx:212` carried the same expression as the figure's default:
  `const c = params.c ?? n + r * r;`.

The dividend is $(x - r)(x^{2} + rx + n) = x^{3} + (n - r^{2})x - rn$, so the coefficient is
`n - r * r`. Wrong on **every draw of the template**, so all 7 served instances shipped it. Served
item `d4.pol8.missing-power.l3:practice:120024`, one of the 25 canonical five-slot items:

> Divide $x^{3} + 0x + 27$ by $x - 3$. The division comes out exactly; give the quotient.

keyed `x^2 + 3x - 9`. Dividing that cubic by $x - 3$ gives $x^{2} + 3x + 9$ with **remainder 54**.

**What a learner concludes.** They run the synthetic division correctly, reach $x^{2} + 3x + 9$ with
54 left over, and are marked wrong. The prompt has told them it "comes out exactly", so the non-zero
remainder reads as their own arithmetic slip and they redo it. The reveal then shows a worked
solution asserting the row ends in 0, which their correct working contradicts. A dead end on the
node's hardest shape.

**Changed.** `const c = n - r * r;` in the generator, with `n` drawn from its range excluding `0`
and `r*r`; `const c = params.c ?? n - r * r;` in the figure, with the derivation written above it.

**Evidence — injected defect, named red** (Stream B's run). Restoring `n + r * r` and running the
served-pool sweep:

```
d4.pol8.missing-power.l3:practice:120024: the prompt promises an exact division and leaves remainder 54
d4.pol8.missing-power.l3: prompt "Divide $x^{3} + 0x + 27$ by $x - 3$. The division comes out exactly; give the
quotient." works out to x^2 + 3x + 9, which the checker refuses (incorrect/value_mismatch) against the key x^2 + 3x - 9
```

Green with the fix, over all 175 served items and 1,000 parameter-space draws. Both sites re-read at
the merged tree: `POL.8/index.ts:228` and `d4POL8.tsx:220` each hold `n - r * r`, and `n + r * r`
survives in the tree only inside the comment at `d4POL8.tsx:216` recording what it used to be.

### P0-2 — POL.4's authored CFU graded correct answers wrong. FIXED

`content/lessons/d4/POL.4.json:27`. At the pin:

> `"accepted": ["{-4, 3/2}", "{3/2, -4}", "-4, 3/2", "3/2, -4"]`

POL.4 asks *"Solve $2x^{2} + 5x - 12 = 0$ with the quadratic formula, and list both solutions."* The
solutions are $-4$ and $\tfrac{3}{2}$. Two spellings of that same pair were refused:

- **the decimal.** `-4, 1.5` is both solutions, correctly listed, and was told *"Not quite."*
  Nothing in the prompt asks for a fraction rather than a decimal.
- **the unreduced fraction.** `-4, 6/4` is the same number and was refused. The content owner ruled
  during the round that reducing to lowest terms is not what POL.4 teaches, so this is a correct
  answer graded wrong rather than a house-style question.

**Changed.** The pack's accepted list is **18 entries** at the merged tree (counted, not carried):
the original four, the two bare decimals, and twelve unreduced spellings — bare and braced, both
orders, across the 2×, 3× and 4× scalings.

**And the same defect reached three nodes outside D4**, found because the sweep was scoped to the
behaviour rather than to the speller. `TRG.3`, `TRG.4` and `TRG.9` share not one line of
implementation with a solution set — their answers are single fractions — and each **accepted an
unreduced answer on its authored ask and refused the identical number on its re-ask**, because the
authored ask is graded by `cfuChecker` with `simplification: "none"` and the re-ask by a computed
list that spelled no unreduced form. One card, two verdicts on one answer.

**Evidence — reproduction written first** (Stream B round three), in `cfuVariants.test.ts`, before
either speller file was touched:

```
FAIL  cfuVariants.test.ts > a computed list accepts an unreduced root wherever reducing is not the skill
+ POL.4[1]: answers "-4, 2/5" and refuses "-4, 4/10", the same number
+ TRG.3[1]: answers "1/2"    and refuses "2/4",       the same number
+ TRG.4[1]: answers "-7/24"  and refuses "-14/48",    the same number
+ TRG.9[1]: answers "-7/25"  and refuses "-14/50",    the same number
```

**Evidence — frames at 1024x580, looked at.**
`pol4-authored-unreduced-correct-1024x580.png` shows `{-4, 6/4}` typed into POL.4's authored field
with **"Correct! Nice work."** and the success tick. That surface is the only one that can show the
pack edit is real: an authored question with no `check` block is graded by exact match against the
pack's own strings, so no speller change reaches it.
`pol4-re-ask-unreduced-correct-1024x580.png` is the re-ask half, `-4, 4/10` accepted.

`NUM.F` was **not** widened and stays excused: it declares `simplification: "reduced_fraction"`, so
lowest terms is its question. The exemption is asserted against that profile in both directions.

### P0-3 — POL.2 asserted a false claim about leading coefficients. **RE-GRADED from P2 to P0.** FIXED

`content/lessons/d4/POL.2.json:7` at the pin:

> "A leading coefficient changes only how many pairs there are to test, not the reasoning."

**This finding was filed by Stream A at P2, in a section of prose and wording nits, and it is
re-graded here to P0 rather than being left where it was filed.** The rubric puts wrong mathematics
at P0, and this sentence is wrong. The paragraph has just taught that the pair multiplies to $c$ and
adds to $b$. A learner who believes the reasoning survives a leading coefficient meets
$2x^{2} + 5x + 3$, looks for a pair multiplying to $3$ and adding to $5$, finds none, and concludes
the trinomial does not factor. It is $(2x + 3)(x + 1)$. Filing that as a wording nit would have
buried a sentence that makes a learner wrong about mathematics inside a list of comma placements.

Stream A's own write-up said as much — it led the P2 list "despite the priority" — which is the tell
that the grade was wrong rather than the finding.

**Changed** to state what actually changes: the pair multiplies to the constant times the leading
coefficient, and it splits the middle term so the sides come out by grouping.

**Evidence — deletion, proved by grep of the merged result.** The sentence appears nowhere under
`content/`. Grepped across the whole worktree, hidden directories included, after the four stream
fragments were folded into this file and deleted, it survives in exactly two places — this document
quoting it, and the `BANNED_PHRASES` entry that stops it coming back:

```
$ rg --hidden -n "A leading coefficient changes only how many pairs there are to test"
docs/qa-d4-round-1.md:221
docs/qa-d4-round-1.md:244
.cursor/skills/lesson-qa/scripts/scan-lesson-text.mjs:298
      "A leading coefficient changes only how many pairs there are to test, not the reasoning.",
```

## P1 findings

The teaching fails: the rule is asserted rather than earned, the term is undefined, the reveal does
not teach.

### P1-1 — a re-ask advertised interval notation and withheld the key its own answer needs. FIXED

Three nodes, and the third was found by the reproduction rather than reported.

| node | instance | answer key | notation shown | placeholder shown | keypad |
|---|---|---|---|---|---|
| POL.3 | authored | `{-7, 5}` | `solution_set` | `Every solution: 13 or {-1, 4}` | none |
| POL.3 | **re-ask** | `-14, 8` | **`interval`** | **`Interval, e.g. (-inf, 2] U (7, inf)`** | none |
| POL.4 | authored | `{-4, 3/2}` | `fraction_bar` | `Use / for a fraction: 3/8` | `["/"]` |
| POL.4 | **re-ask** | `-4, 2/5` | **`interval`** | **`Interval, e.g. (-inf, 2] U (7, inf)`** | **`[]`** |
| LIN.5 | **re-ask** | `5, 11` | **`interval`** | **`Interval, e.g. (-inf, 2] U (7, inf)`** | none |

**What a learner wrongly concludes.** On the second attempt at POL.3 they are asked for a solution
set and told by the field to write an interval, so a learner who complies types `[-14, 8]` — a
different mathematical object from the pair of roots, and one the lesson has spent a slide
distinguishing. POL.4 is worse: its re-ask answer `-4, 2/5` **needs a slash**, and the `/` key that
the authored ask offers is gone on exactly the question that still needs it. The guidance did not go
missing between the two asks; it reversed.

**Cause.** One `.some` in `cfuNotation` (`apps/web/src/lessons/answerFormat.ts`). A re-ask's accepted
list is BUILT, not written, and among the spellings `solutionSetForms` emits is the
square-bracketed `[-4, 2/5]`. That satisfied `isIntervalAnswerText`, so an alternative spelling
nobody is asked to produce decided the notation of the answer everybody IS asked to produce.

**Changed**, and it is one rule: a predicate claiming *"the answer IS this shape"* reads the
canonical spelling; a predicate that is the pack *asserting something about* the answer keeps its
`.some`. `isCoordinatePairAnswerText` and `isIntervalAnswerText` now read `accepted[0]`. The roster
rule additionally splits on whether the answer holds a fraction — without that second half POL.4's
re-ask stopped saying "interval" and landed on the keyless `solution_set`, so the slash key was
still missing.

**Evidence — reproduction written first**, in `answerFormat.test.ts`, before any change to
`answerFormat.ts`:

```
FAIL  answerFormat.test.ts > a rendered CFU never advertises a shape its own answer is not
+ LIN.5[1] answers "5, 11" and is shown INTERVAL_PLACEHOLDER
+ POL.3[1] answers "-14, 8" and is shown INTERVAL_PLACEHOLDER
+ POL.4[1] answers "-4, 2/5" and is shown INTERVAL_PLACEHOLDER

FAIL  answerKeypad.test.ts > the keypad reaches every question the CFU card can render
+ POL.4[1]: "-4, 2/5" uses fraction, keypad has nothing
```

**Evidence — frames at 1024x580, looked at**, in `cfuReAskKeypadShots.browser.test.tsx` (new), clipped
to the whole window rather than to the keypad, with the tester iframe's scale asserted to be 1 so a
silently shrunken frame cannot pass for a short screen: `pol4-re-ask-empty-1024x580.png`,
`pol4-re-ask-1024x580.png`, `pol3-re-ask-1024x580.png`, `lin5-re-ask-1024x580.png`. The slash key is
**clicked** in the test and the field checked for what it typed, so the frame is of a key that
works rather than of a key that renders.

**LIN.5 is a D3 node and outside this round's domain.** It is named here because the fix covers it
and nobody had it on a list.

### P1-2 — the two R30 guards could not see P1-1, because their population was authored packs. FIXED

`answerFormat.test.ts` and `answerKeypad.test.ts` swept `allLessons` and read `cfu.accepted`. The
thing that advertises a notation to a learner is a rendered **instance**, and `cfuInstances()`
returns 2 per converted pack. Every re-ask in the tree was outside the population, and P1-1 sat
green through both. Scoped by implementation, not by behaviour, in the sense
`.cursor/rules/qa-verification.mdc` describes.

**That the population was the gap, rather than the assertions, is measured rather than argued.**
With both fixes reverted and both suites re-run: **3 failed, 294 passed**, every failure one of the
widened tests and every pre-existing authored-population assertion green. 294 assertions that could
see this defect — Stream A proved they go red the instant a bracket spelling reaches an authored
list — sat green over three nodes that had it.

**Changed.** Both files now sweep `RENDERED_CFU_ASKS` / `RENDERED_ASKS`: every instance
`cfuInstances` resolves for every pack in the lesson registry, derived from source rather than
written down, and called **the way `cfu.tsx` calls it** — the pack's `check` spec beside the
INSTANCE's accepted list, because passing `undefined` for the spec would be measuring a dispatch the
surface never runs.

**Floors**, so the widening cannot narrow back: >60 rendered asks, >40 of them re-asks, re-asks
drawn from >5 distinct nodes, >2 asks reaching a shape line, >10 getting a key row, >20 notation
requirements left after exemptions. The re-ask floor is the load-bearing one — without it, a
`cfuInstances` that stopped rotating would leave the whole widening measuring the authored packs a
second time and passing.

**Exemptions.** `NO_ASK_KEYS_OWED` is empty and the emptiness is *derived*: a companion test sweeps
the rendered population for each of the two grounds the practice sweep exempts on and asserts no
rendered ask qualifies under either, alongside `expect([...NO_ASK_KEYS_OWED]).toEqual([])`. It fails
both ways.

### P1-3 — 68 figure rows printed `1x` where the prompt beside them printed `x`. FIXED

**Templates:** `d4.pol1.subtract.l2`, `d4.pol1.leading.l3`, `d4.pol2.leading.l3`,
`d4.pol3.factor.l2`, `d4.pol4.formula.l3`, `d4.pol8.synthetic-cubic.l2`, plus POL.1's and POL.2's
authored checks. **Where:** `worked/d4POL1.tsx:89,142-147,167-172`,
`worked/d4POL2.tsx:32-41,67,121-126,145-161`, `worked/d4POL3.tsx:75,117,156`,
`worked/d4POL4.tsx:33,73,101,147-160,191,213`, `worked/d4POL8.tsx:39,75-91,123,145,172,218,226,240`,
`worked/cfuD4D5.tsx:268`.

**Rendered output, verbatim.** The clearest instance is POL.8's authored check, where the prompt,
the figure and the answer key are all on screen together:

```
## POL.8 CFU instance 0: Divide $x^{3} - 4x^{2} + x + 6$ by $x - 3$ and give the quotient.
  answerKey: x^2 - x - 2
  row[0]: (x^{3} - 4x^{2} + 1x + 6) \div (x - 3)
  row[6]: x^{2} - 1x - 2
```

**What a learner would wrongly conclude.** Two things, and the second is why this is P1 rather than
cosmetic. That `1x` is a form the grader wants — the reveal is the one place the tree shows its own
notation, and a learner who has just been marked wrong is reading it for exactly that. And, on the
POL.8 check, that the quotient of $x^{3} - 4x^{2} + x + 6$ is a different polynomial from the one
the answer key names, because `x^{2} - 1x - 2` and `x^2 - x - 2` are two strings and only one of
them is accepted.

**Changed.** `worked/d4Kit.tsx` gains `signedTermTex(value, variable)`, which is the item bank's own
`signedTerm` from `packages/item-bank/src/d4/nodes/_shared.ts:23`; `quadraticTex` is rebuilt on it
and on `coeffTex`. Every site that concatenated `signedTex(v) + "x"` or interpolated `${v}x` routes
through one of the two. `signedTex` is unchanged, because a substitution row genuinely wants
`- 1(4)` rather than `- (4)`.

**Evidence.** Re-rendered at the same 610 figures: the unit-coefficient check went from **68 rows to
0**, with no other check changing state. Made permanent as a guard in
`workedSolutionArithmetic.test.tsx`, with four injected reds quoted under "Guards added".

### P1-4 — `d4.pol4.complete-solve.l3` asked the square to be completed on an equation with no constant. FIXED

`packages/item-bank/src/d4/nodes/POL.4/index.ts:157`. `constant = half * half - root * root`, with
`half` and `root` drawn independently from the same range, so `half === root` zeroed it — about one
draw in eight. Served item `d4.pol4.complete-solve.l3:practice:120018`, one of the 25 canonical
items:

> Solve $x^{2} + 16x + 0 = 0$ by completing the square, and give every solution.

keyed `{-16, 0}`.

**What a learner concludes.** The arithmetic is right, so nothing is marked wrong; this is a
teaching failure rather than a grading one. The shape exists to drill "move the constant across, add
half the middle coefficient squared to both sides", and its own first worked step reads *"Moving the
constant across gives $x^{2} + 16x = 0$"*, which moves nothing. Meanwhile the equation factors on
sight as $x(x + 16) = 0$. A learner who spots that is being taught that completing the square is a
laborious way to do something they can already do, on the one draw that demonstrates it worst.

**Changed.** `root` is drawn from its range with `half` removed. Covered by the zero-term guard,
green at 400 draws per template.

### P1-5 — `d4.pol4.complete-solve.l3`'s figure put an intermediate equation in the answer slot. FIXED

`worked/d4POL4.tsx:192`. Rendered at seed 0, params `{"half":5,"root":4,"low":-9,"high":-1}`:

```
  PROMPT: Solve $x^{2} + 10x + 9 = 0$ by completing the square, and give every solution.
  answerKey: {-9, -1}
  row[0]: x^{2} + 10x + 9 = 0
  row[1]: (x + 5)^{2} = 16
```

`row[1]` is `SolutionLineWorked`'s `solved` slot: the line under the number line, drawn in `CIVIC`,
which is the answer colour. Its three sibling draws of the same component
(`d4.pol3.square-root.l1`, `d4.pol3.shifted-square.l2`, `d4.pol3.lost-root.l3`) all put the solution
SET there. This one put a completed square and stopped.

**What a learner would wrongly conclude.** That the answer to *"give every solution"* is
$(x + 5)^{2} = 16$. The roots are on the line as two marks, but the figure's own closing statement,
in the place and the colour the answer goes, is an equation nobody asked for.

**Changed.** `solved` carries both: `(x + 5)^{2} = 49 \;\Rightarrow\; \{-15, -1\}`. The completed
square stays in front of the arrow because it is the step the template is named for and nothing else
in the figure shows it.

**Evidence — spatial, and framed.**
`apps/web/src/lessons/__screenshots__/d4-stream-d/pol4-complete-solve-1024x580.png`, at **1024x580**
in a 920px lesson column, looked at. It shows the reveal card whole — the statement, the number line
with both roots marked, the closing line `(x + 8)² = 49 ⇒ {−15, −1}` with clear margin either side,
and the caption below it — with the page around the card in the picture rather than a crop of the
line that changed. That matters because the change roughly doubled the length of a line centred in a
fixed 440-unit `viewBox`. Held permanently by a new case in `workedFigureLabels.browser.test.tsx`
that asserts content and geometry together, because they pull against each other.

### P1-6 — `long-division-stepper` taught one step and handed over another. FIXED

`apps/web/src/lessons/interactive/LongDivisionStepper.tsx:99` at the pin. R27.

Both steps of the division are live at once, deliberately, so a learner can miss the second with the
first still untouched. The row the fill wrote into was derived from `firstDone`, and an untouched row
is not a done one, so the board resolved that state to "first". A learner who left the first step
alone, missed the second, and pressed **Reveal the second multiplier** read a passage explaining the
second multiplier — 2 — above the FIRST box, filled in amber with 3. An answer to a step they had not
been taught, in a blank the passage was not about.

Two reveals could also be on offer at once. Every other multi-reveal widget in the tree makes its two
mutually exclusive; this one was the only one whose fill target and reveal availability were computed
from different expressions.

**Changed.** One `openRow` derivation drives both, so they cannot disagree.

**Evidence.** A new case in `widgetRevealFill.browser.test.tsx` drives exactly that state — box 2
wrong, box 1 untouched, second Check pressed. With the old derivation restored:

```
AssertionError: the blank holds something other than the answer the passage states:
expected '3' to contain '2'
```

### P1-7 — `factor-pair-stepper` slid to the answer and called it the learner's. FIXED

`apps/web/src/lessons/interactive/FactorPairStepper.tsx:176` at the pin. R27.

The widget took `useRevealFill` and then hand-rolled the half of it that is visible:
`{...(fill.given ? { readOnly: true } : {})}`. The dial moved itself to the answering pair and went
read-only, carrying none of the `data-reveal-given` the shared layer sets. What a learner saw was the
control arriving at the right pair on its own, which reads as having found it. It was the only one of
the ten D4 widgets holding its own copy of the hook that emitted no mark at all.

**Changed.** `{...fill.entry(shownIndex)}`, and `aria-valuetext` now says the pair was given rather
than answered, so the screen-reader signal matches the visual one.

**Evidence.** New driven case; with the hand-rolled version restored,
`AssertionError: the reveal filled no blank in: expected 0 to be greater than 0`.

### P1-8 — `difference-squares-drag` showed nothing for placement 1. FIXED (reconciliation row 17)

`apps/web/src/lessons/interactive/DifferenceSquaresDrag.tsx:353` at the pin. R27.

`stateOf("piece", false, placedPiece)` passed a hard-coded `false` where the other two placements
pass `edge(slot).given`, and the landing target carried no `mark`. On a reveal the strip chip left
the tray and the destination stayed an empty dashed box: of the board's three placements, the first
was the one whose answer the board did not show.

**Changed.** Placement 1 reads its given off `edge("piece")` like the other two, the hit target
carries `fill.mark(pieceEdge.given)`, and the box renders the strip's two sides.

**Evidence.** New driven case; with the `mark` removed again,
`AssertionError: the reveal filled no blank in: expected 0 to be greater than 0`.

### P1-9 — a dial marked as given painted nothing at all. FIXED — shared file, blast radius measured

`apps/web/src/styles.css`. **This is the one a passing test would have shipped.** With P1-7 fixed the
guard was green: the control carried `data-reveal-given="on"` and the sweep found it. The frame said
otherwise. `.lesson-feedback-host [data-reveal-given="on"]` sets `border-style: dashed` on a control
that has no border for it to act on, and a background the browser paints the slider track over.
Marked in the DOM, unmarked on the screen.

**Changed.** A scoped rule giving a range input an outline, which is the one mark it can carry, drawn
outside the box so the disabled state's repaint of the track cannot cover it.

**Evidence — a before and an after frame, both at 1024x580, both looked at.** The before frame is
`d4-c-factor-pair-stepper-BEFORE-1024x580.png`: `Which pair` followed by a **plain grey slider with
no mark of any kind**, above a green passage reading `Answer revealed. The answer is 4 and 9`. The
after is `d4-c-factor-pair-stepper-1024x580.png`, the same control wearing a dashed amber outline,
with the goal line, the board, the passage and the restart button all in shot. (The before frame was
overwritten during the round and re-taken deliberately: the rule was reverted, the frame taken at a
distinct path, and the rule restored.)

**Blast radius, measured rather than argued.** `.lesson-feedback-host
input[type="range"][data-reveal-given="on"]` needs three things at once: a range input, inside a
feedback host, carrying the shared fill mark. Twelve widget sources in the tree hold a range input;
only two can put the mark on one — this widget, and the `EstimateThenCheck` kind, which spreads
`revealFill.entry` onto its slider and carries four widgets (`remainder-estimate` in POL.8,
`negative-exponent-estimate` in D2, `trig-inverse-estimate`, `trig-combine-estimate`). So the rule
reaches five surfaces across three eras, not the one it was written for. The other nine sliders take
no fill hook and cannot match at any time. The four inherited surfaces GAIN the paint, which is the
outcome wanted, and it is evidenced on a surface nobody changed:
`d4-c-remainder-estimate-1024x580.png` shows `remainder-estimate`'s dial wearing the same dashed
amber outline at the 0 the passage states, with the number line, the verdict, the passage and both
hand-back buttons in shot.

### P1-10 — `both-pans-builder` printed the final answer when the reveal explained the gathering. FIXED

`apps/web/src/lessons/interactive/BothPansBuilder.tsx:202,242`. D3 LIN.1, in scope by owner override
after being reported. R27.

Both rows are on screen from the start and both inputs spread `fill.entry(...)` unconditionally, so
revealing "ingots left" filled the ingots box AND printed `x = 3` in the box below it — the final
answer, which the passage says nothing about and which the learner was one step from producing.
P1-6's defect in a worse form: not a mis-targeted fill but an extra one.

**Neither value assertion could see it** — the value in each box was the right value for that box.
The count is what catches it.

**Evidence — reproduction first**, two cases added and run before the fix:

```
FAIL both-pans-builder: the gathered count, with the weighing still to finish
FAIL both-pans-builder: the ingot weight, once the gathering is settled
AssertionError: the reveal filled a different number of blanks than the passage explains:
expected 2 to be 1
```

**The frame**, `d4-c-both-pans-builder-1024x580.png` at 1024x580: the INGOTS LEFT row holds `5` in an
amber dashed box and the ONE INGOT row below it is an empty white box, with the passage explaining
the gathering and nothing else.

**Blast radius.** `BothPansBuilder.tsx` only: a local `openRow` and a conditional spread on each of
its two inputs. Nothing shared was touched and no other widget imports it. D3's own guards over it
after the fix: `partVerdicts`, `equationRowCheckPlacement`, `widgetMissedBoardGate` and
`widgetRevealResume`, **63 green**; `revealReAsk` 353 green; the fill guard 160 green.

## P2 findings

Everything else. All fixed unless the heading says otherwise.

### Prose and wording, in `content/lessons/d4/` (Stream A)

Each was discharged by reading the new text against the original objection, and each original
sentence is now in `BANNED_PHRASES` — whole sentences, never fragments.

- **P2-1 — `POL.2.json:6`, "trinomial" used 10 times and defined nowhere (R32).** Counted rather
  than eyeballed: `trinomial` occurs 10 times across `content/lessons`, all in D4 (POL.2 ×8, POL.3
  ×1, POL.4 ×1), and `rg "\*\*trinomial"` over `content/lessons` returned nothing before the fix —
  used ten times, defined zero. Five D4 widgets speak the word as well, so the gloss is owed rather
  than the avoidance. Added: *"A **trinomial** is a polynomial with three terms"*, which costs one
  clause and leans only on "term", which POL.1 defines.
- **P2-2 — `POL.2.json:6`, three names for one idea in one paragraph (R32).** The paragraph called
  the same idea "the measure every term already shares", then "common divisor", then "the common
  measure", and bolded a fourth form as the term. "Common measure" is what POL.2's own slide 3, the
  CFU hint and the widget id `common-measure-classify` all use. One word changed.
- **P2-3 — `POL.2.json:8`, the sentence defining "difference of two squares" calls it a sum (R15).**
  > "A **difference of two squares** is a subtraction of one square quantity from another, and the
  > same sum with a plus sign in front of the $36$ does not factor over the whole numbers at all."

  The one sentence that names the term defines it as a subtraction and then says "the same sum" six
  words later. A learner reading carefully cannot tell which word is the slip. Changed to "the same
  expression".
- **P2-4 — `POL.2.json:31`, the hint performs the step being assessed (R13).** POL.2's CFU asks for
  $2x^{2} + 2x - 24$ factored **completely**, so noticing that a common measure exists is precisely
  what the item measures, and the hint asserted it as a property of the learner's own instance.
  Repointed at the check. Both branches sampled: the same template's re-ask also has a common
  measure, so the hint has one branch and the rewrite is correct on both instances.
- **P2-5 — `POL.3.json:23,25`, the hint carried the question's scope, ungrammatically (R13).** An
  equation is not asked for anything, and a learner who never opens the hint never sees the scope.
  POL.3's slide 3 teaches that reading which solutions the job admits comes *after* the algebra, so
  a learner who reasons about a court plausibly answers `5` and is marked wrong on a question they
  answered as asked. Scope moved into the prompt; hint repointed at the method. Graded: `5` is still
  refused, which is correct now that the prompt says so.
- **P2-6 — `POL.3.json:7`, promises four moves and lists five (R15).** The widget the slide mounts,
  `solve-quadratic-order`, offers exactly four ordered steps, so a learner counting the prose against
  the board is one short and cannot tell which of the five the board dropped.
- **P2-7 — `POL.3.json:8`, the hinge is buried mid-sentence (R16).** This is the turn the whole slide
  exists for — the move looks harmless and destroys a solution — and both halves were joined by a
  bare "and" mid-sentence, so the reversal read as one more fact. Hinge moved to the front of its own
  sentence.
- **P2-8 — `POL.8.json:7`, "standard form with every power present" contradicts POL.1 (R15, R32).**
  Read as one chapter, a cross-pack contradiction: POL.1 defines standard form as highest power first
  with each power appearing once, which says nothing about supplying the missing ones, so a learner
  joining the two concludes $x^{3} - 7x + 6$ is not in standard form. Separated — standard form is one
  thing, the zero placeholder is a bookkeeping habit for the division. Also on `:7`, `degree` occurs 3
  times in D4 and was defined nowhere; added *"The **degree** of a polynomial is its highest power"*.
- **P2-9 — `POL.8.json:28`, the hint invites the wrong sign for $r$, and performs the other check
  (R13).** "The sign the divisor gives it" reads as the sign printed on the page, so a learner
  dividing by $x - 3$ takes $r = -3$ and runs the row to $x^{2} - 7x + 22$ remainder $-60$. The pack's
  own worked solution and the same template's re-ask hint both say it correctly, so this wording was
  the only one of the three that could mislead. Second sentence performed one of the two habits slide
  3 exists to teach.
- **P2-10 — `POL.1.json:9`, comma pile-up, decided as absorb (R19).** Four commas doing two jobs, so
  "coming to" read for a moment as a fifth product in the list. Decided per instance rather than
  shortlisted: the summary is the slide's payoff and is load-bearing, so parenthesising it would be
  the wrong call. Absorbed as its own sentence.

### Item bank (Stream B)

- **P2-11 — `d4.pol4.formula.l3` keyed an unreduced fraction.**
  `packages/item-bank/src/d4/nodes/POL.4/index.ts:193`. The filter was `p % a !== 0`, which tests
  that the root is not a WHOLE number, not that it is in lowest terms; at `a = 4` it admitted `p = 2`
  and `p = 6`. Two of the 175 served items shipped it (`:practice:121119` `{-6, 2/4}` and
  `:practice:121121` `{-2, 2/4}`), at a measured rate of **442 of 5,000 draws (8.8%)** across the
  parameter space. A key is a string and nothing downstream reduces it, so `\dfrac{2}{4}` is the
  final line of the reveal. Fixed by `inLowestTerms` in `_shared.ts`. Injected red:
  `d4.pol4.formula.l3:practice:121119: 2/4 in {-6, 2/4}`.

  This is filed at P2 and P0-2 rules that POL.4 ACCEPTS unreduced roots; the two are consistent. What
  a learner may write and what the model answer prints are different questions, and the reveal
  printing an unreduced fraction as the finished form is the defect here.
- **P2-12 — `d4.pol3.factor.l2` printed a zero middle term.** `POL.3/index.ts:114`. `positive` and
  `-negative` were drawn independently from `[2, 9]`, so equal magnitudes put the roots at $\pm k$ and
  zeroed the middle coefficient: *"Solve for $x$: $x^{2} + 0x - 25 = 0$"*, served at `:practice:120012`
  (canonical) and `:practice:121079`. A difference of two squares dressed as a trinomial, with the
  hint telling the learner to find "two numbers that multiply to −25 and add to 0". Injected red fires
  all three assertions of the zero-term guard.
- **P2-13 — `d4.pol8.synthetic-cubic.l2` could print a zero term (latent).** `POL.8/index.ts:124`.
  `m === r` zeroes the dividend's $x^{2}$ term and `n === r * m` zeroes its $x$ term. No served item
  carried one, so latent rather than shipped — but a cubic printed `x^{3} + 0x^{2} + ...` under L2b is
  L3b's subject arriving two levels early and unremarked. Both excluded at the draw.
- **P2-14 — four templates printed `1y` / `1x` in learner-visible prose.** Reported by Stream D as one
  prompt and found by Stream B's sweep to be four templates across prompts, hints and worked
  solutions. Two of the frozen 175 ship it: `d4.pol1.two-variable.l3:practice:121028` and `:121032`,
  *"A yard measures $4x + 1y$ paces one way..."*, beside a figure correctly reading `(4x + y)`. It is
  P2 rather than P1 because the answer is a single number and no grader compares the two strings.
  Every learner-visible coefficient in POL.1 and the one in POL.2's step 1 now goes through the item
  bank's own `coeff`.

  **The first run of that sweep reported eight lines and all eight were `combine.l1`** — three more
  templates were equally red behind a `slice(0, 8)`. The diagnostic is now a map keyed by template
  and place with one example each.

### Figures (Stream D)

- **P2-15 — `d4.pol2.difference.l2` printed `(x)^{2}`.** `worked/d4POL2.tsx:89`, rendered at
  `{"root":1,"inner":4,"scaled":0}`: `row[2]: (x)^{2} - 4^{2}`. A bracket round a single symbol reads
  as an expression that has not finished being simplified, on the one row whose whole job is to be one
  character away from the row above it. Bracketed now only when the base is a product.
- **P2-16 — the given label overflowed the landing box it was drawn in.** Found by looking at the
  frame for P1-8 rather than by any assertion; the guard was green throughout because `shown()` reads
  `data-latex`, which is the whole string whatever the paint does. The landing target is 44 user units
  wide and the tray chip's one-line form `6 by (x - 6)` was clipped by the `foreignObject` to
  **"y (x −"**. The two sides are now stacked, `6` over `x - 6`, at 11px. Frame:
  `d4-c-difference-squares-drag-1024x580.png`.
- **P2-17 — `d8EL2.tsx` and `d7LF2.tsx` rendered duplicate React keys.** Out of era, fixed because
  they were reachable. Phase 1 saw `Encountered two children with the same key, 'p0:1'` and `'l0:1'`
  in a tree-wide browser sweep. Two things had to be settled first: whether the warning was reachable,
  and from where. Sweeping every distinct draw of every D7 and D8 practice template through
  `WorkedSolution` with `console.error` spied gave **1 passed, no offenders**; the live caller is
  `cfu.el2.reflect-shift` in `worked/cfuD7D8D10.tsx:300-303`, which draws `(0, 1)` and `(0, anchor)`
  with `anchor = shift - 1`, so a shift of two collides — `p0:1` and `l0:1` exactly. Reproduction
  written first, then keys changed to `p${index}:${x}:${y}`. A React `key` never reaches the rendered
  SVG, and the guard asserts that positively by counting the circles the collided render produces
  (**2**, not 1), which rules out the "omitted" half of React's own warning.

### Guards (Stream C)

- **P2-18 — `equationRowCheckPlacement.browser.test.tsx` explained itself by a deleted rule.**
  Reconciliation row 6's second half. The guard's comment and both of its second test's failure messages
  described `.lesson-equation__row:has(> .verdict)` handing the row a fourth grid track. That rule is
  not in the tree. The assertion is still worth having for a different reason, and that reason is now
  written down: the first test derives its population from the CHECK while claiming to be about every
  board that verdicts a part, and set equality is what makes those the same claim. **Changing a guard
  owes the same evidence as a fix**, so both directions were forced one at a time:

  ```
  AssertionError: this row verdicts a part and has no per-part Check, so the sweep above
  never visits it and its verdict sits in an aside nothing measures: expected [ Array(1) ] to
  deeply equal []

  AssertionError: this row carries a per-part Check and never verdicts, so the sweep above
  counts it in the population and can never drive it to the state it measures: expected
  [ Array(1) ] to deeply equal []
  ```
- **P2-19 — `stepChipMath`'s carrier list was named, so it could not fail on a new key.**
  Reconciliation row 18. Five keys were read and a widget shipping its visible form under `lineOne`,
  `rule` or `term` was outside the guard with every floor green. Now derived: every key holding a
  string beside a `spoken:`, with a key counted raw unless some renderer hands it to KaTeX. Three
  wrong derivations were tried first and each is recorded, because each looks correct from inside —
  no string filter returned ~100 keys including arrays and numbers; classifying by key NAME reported
  328 typeset strings as prose; classifying per DECLARING FILE still reported 328, because the file
  that declares a chip is usually not the file that renders it. Reading `latex={...}` across the whole
  corpus is what works. The five original keys are asserted still reached, the exception list is
  asserted both ways and asserted not to name any of the five, and there is a floor under the derived
  population.
- **P2-20 — `widgetTaskOrder`'s population was scoped by implementation, and twelve of D4's
  twenty-five were outside it.** The population was a hand-picked `BESPOKE_VISUALS` list ∪ every
  visual built on a shared kind. Both halves are scoped by where the mechanic lives, and a widget can
  print its goal line under its own chips without importing either. Scope is now the behaviour:
  `visualsMatching(/<WidgetTask[\s>]/)`, **93 visuals to 144**. All 144 pass, so no D4 widget had the
  defect — but nothing was checking. Widening it made two more things visible:

  - **A real vacuous pass.** `geo-net-drag` reported ZERO controls:
    `AssertionError: geo-net-drag: no controls were found, so the ordering claim below is vacuous:
    expected 0 to be greater than 0`. Fixed by adding `.lesson-sorter__bin` and `[data-drop-slot]` to
    `CONTROLS`.
  - **A second one, found by the injection.** With the task line moved below the slots of
    `divide-rebuild-builder`, the widened sweep stayed GREEN: a builder's drop slot is a named span,
    not an `input`, and `.lesson-equation__slot` was not in the list. Added, and the same injection
    then fails naming the control.

  A floor was added under the new half so it cannot narrow back: the visuals reached by the behaviour
  and by neither implementation-scoped half number **51**, measured by forcing the assertion, and 51
  is what it now requires (`widgetTaskOrder.browser.test.tsx:224`, re-read at the merged tree).

### Reported, NOT fixed

- **P2-21 — every root on a solution line is printed twice.** `worked/d3Kit.tsx:108` builds
  `ticks = [min, ...finite, max]` where `finite` is the points, and `:194-207` then draws each point's
  own value again above the axis, so every `SolutionLineWorked` figure prints each root twice — bold in
  `CIVIC` above the line and grey below it (`text: -15 | -9 | 9 | 15 | -9 | 9`). Not a collision: the
  two sit on opposite sides of the axis and the frame reads cleanly. Redundant rather than wrong, and
  `d3Kit.tsx` reaches all of D3. The change, if anyone wants it, is to drop the point values out of the
  tick list when a point already labels them.
- **P2-22 — `common-measure-classify`'s pair readout shows `CIVIC` on the answering position before the
  learner commits.** Reported, not changed: the readout prints `4 + 9 = 13` in words as well, so the
  colour is not the only signal, and this is a hint-strength judgement rather than an R26 defect. Not
  changed on a reading alone.

## Recommendations — assessed, out of scope, and not to be lost

Carried forward deliberately. Each has been measured; none is a guess about what might be wrong.

**R-1. D3's draws of `SolutionLineWorked` want their own PR.** Reconciliation row 19, and D4's
coverage does not reach it. The tempting answer is that D4 renders the component so the component is
covered; that is false and measurably so. All five D4 draws (`d4POL3.tsx:32,53,155`,
`d4POL4.tsx:190,218`) pass `points` and **none passes `pieces`**; all eleven D3 draws
(`d3LIN4.tsx:45,74,103,133,159`, `d3LIN6.tsx:48,71,100,126,158`, `d3LIN5.tsx:47`) pass `pieces`. So
what D4's coverage exercises is the point branch, the tick derivation and the two math slots; the
entire `pieces` block of `d3Kit.tsx:118-151` — the shaded span rect, the `CIVIC` overlay line, both
arrowhead paths for an unbounded end — plus the hollow/filled endpoint circles at `:173-192` and
LIN.5's `barVariable` handling are rendered by **zero swept draws**. Sharing an implementation is not
exhibiting the behaviour.

Size of the job: enabling it is one line, dropping `{ domain: "d3", ... }` from `NOT_SWEPT_HERE` at
`practiceSweep.ts:244`. What that line does is put D3's *entire* practice registry into the layout
sweep, and the equivalent widening for D4 (#364) turned up defects in `d3Kit.tsx` and `d4POL4.tsx`
that then had to be fixed. One line to enable, an unbounded amount to close.

**R-2. R24's control list was found short by injection, and the other guards' control lists were not
re-audited for the same shape.** `widgetTaskOrder`'s `CONTROLS` was missing `.lesson-equation__slot`
— a builder's drop slot is a named span rather than an `input` — and that omission was found by
injecting a defect and watching the sweep stay green, not by looking for it. That is the kind of thing
that is wrong in more than one file. Unverified elsewhere.

**R-3. `d7LF2.tsx:356`'s line key has the same collision shape as the two that were fixed.** It keys
its lines `` `${line.m}:${line.b}` `` (re-read at the merged tree). No caller in the tree passes two
identical lines, so no failing case could be written for it, and it was deliberately **not** changed
on an argument alone.

**R-4. `answerKeypad.test.ts` cannot tell `fraction_bar` from `solution_set_fraction`.** Under the
injection that narrowed `isSolutionRosterAnswerText` back to its `[\d.]` character class, that file
stayed GREEN, **all 137**, while `answerFormat.test.ts` went red at five assertions. Its
line-and-row agreement test cannot separate the two tags, because both give POL.4 a fraction key and
both lines are in its `NAMED` list. **The `answerFormat` census is what holds the P0-2 ruling**; the
keypad file holds the weaker claim that a key exists at all. Worth recording, because "I ran the
keypad suite and it was green" would have been true and would have proved nothing.

**R-5. The unit-coefficient sweep covers D4 only, and answer KEYS are deliberately outside it.** It
reads `D4_PRACTICE_TEMPLATES`, so a `1x` in a D2 or D5 worked solution would not be caught; whether the
other domains have it is unmeasured, and the sweep is written so widening the population is a one-line
change. Separately, `quadraticKey` prints `+ 1x` when the middle coefficient is 1, and a key is
learner-visible on reveal. Not touched deliberately: changing a key changes what the grader compares
against, which is a larger change than a prompt fix and not one to make in a closeout pass without a
reproduction of a learner being marked wrong.

**R-6. The duplicate-key fix (P2-17) has no permanent guard**, only the reproduction quoted there.
There is no D7/D8 guard file this round owned; the natural home is the layout sweep once
`NOT_SWEPT_HERE` loses `d7`, which is R-1's PR.

**R-7. Practice surfaces were not swept for the unreduced-equivalent defect of P0-2.** The population
there is CFU rendered asks. Whether a practice item refuses an unreduced equivalent is a different
grader — the real checker, with each item's own `simplification` — and was not measured this round.

## Guards added or widened this round

Each owes an injected defect and a named red, and each has one.

| Guard | What it now measures | Population and floor |
|---|---|---|
| `d4.test.ts`: prompt-derived answer, served pool | 175 items, answer re-derived from the RENDERED prompt and graded through the real v2 checker | 175 of 175 |
| `d4.test.ts`: prompt-derived answer, parameter space | 25 templates × 40 draws | 1,000 |
| `d4.test.ts`: no zero-coefficient term | 25 × 400 draws plus the served pool, with a third assertion in the other direction so the regex cannot widen to `/0/` and forbid every equation gathered at zero | 10,175 |
| `d4.test.ts`: every fraction in a key in lowest terms | served pool plus 500 formula draws | 675, floored on the population that can hold a fraction |
| `d4.test.ts`: L3 asks a step the shape it extends cannot | a named step per L3 template, both directions | 2,400 draws; population derived from the pool and asserted as a set |
| `d4.test.ts`: no repeated answer in a served set | 400 reshuffles per node plus the frozen pool | 2,000 |
| `d4.test.ts`: unit coefficient in prompts, hints and worked solutions | every generator's parameter space plus the served items | D4 only — see R-5 |
| `answerFormat.test.ts` / `answerKeypad.test.ts` | rendered CFU instances rather than authored packs | see P1-2's six floors |
| `cfuVariants.test.ts` | a computed list accepts an unreduced root wherever reducing is not the skill | `AUTHORED_LIST_OWES_THIS` is empty and the emptiness is asserted by set equality against the packs, both ways |
| `widgetRevealFill.browser.test.tsx` | 39 own-copy fills; D4's ten all driven | floor 32, exactly the number driven, so a deleted case cannot be paid for by a register line |
| `widgetTaskOrder.browser.test.tsx` | every visual rendering `WidgetTask`, 93 → 144 | floor 51 under the behaviour-scoped half |
| `stepChipMath.test.ts` | every string-valued key beside a `spoken:` | derived, floored above the five original keys, two-way exception list |
| `workedSolutionArithmetic.test.tsx` | a D4 figure prints its coefficients the way the D4 prompt does | 200 draws floored, 20 unit-coefficient draws floored, exception list both ways |
| `workedFigureLabels.browser.test.tsx` | POL.4's completed square closes on the solutions, inside its frame | all 13 draws, content and geometry in one test |
| `cfuReAskKeypadShots.browser.test.tsx` | new — six 1024x580 frames of the CFU card | iframe scale asserted 1 |

**Two guards in this round were written green and caught by their own injection**, which is the
reason the injections are not optional:

- `d4.test.ts`'s ladder row for `d4.pol2.leading.l3` tested `/\d+x\^\{2\}/`. Forcing `a = 1` — the
  exact regression the row exists to catch — left it **passing on all 120 draws**, because the prompt
  then reads `Factor completely: $1x^{2} + 29x + 30$` and a printed `1` satisfies `\d+`.
- The same trap in mirror image: the `two-variable.l3` row tested `/\d+y/` and went red the moment
  P2-14's fix stopped the template printing `1y`. The claim was never that the coefficient exceeds
  one; it is that there is a second variable at all.

## Coverage

What was reviewed, what each sweep actually measured, and what was REPORTED as against FIXED.

**Nodes and directories.** 5 of 5 classical nodes; 1 of 1 directory (`content/lessons/d4/`), which is
the whole era.

**Surfaces.**

| Surface | Covered |
|---|---|
| Lesson packs validated `--strict` | 5 of 5, 0 errors, 0 warnings |
| Learner-facing strings swept | 119 across the 5 packs, plus 2,856 prose-shaped runs across 219 widget files, 0 rendering artifacts |
| Mini-lesson paragraphs, subtitles, check prompts, check hints, authored worked steps | all, each rendered through `LessonProse` rather than read as a string |
| CFU keys graded through the real `LessonCfu` card | all 5 keys, all 10 instances, **42 distinct answers** (Stream A), of which 31 are pinned by assertions |
| Served practice items swept | **175 of 175** (25 frozen slots + 150 retry variants) |
| Prompts re-derived from rendered text and graded | **1,175** (175 served + 1,000 parameter-space draws) |
| Prompts swept for a zero-coefficient term | **10,175** |
| Keys checked for lowest terms | **675** |
| Ladder draws, both directions | **2,400** |
| Randomized sets checked for a repeated answer | **2,000** |
| Worked figures rendered and grepped | **610** (600 practice + 10 check instances) across 25 registered templates and 6 check figures |
| Interactive widgets read at source | **25 of 25**, for fill targeting, pickup import, variants hook and reveal shape |
| Widgets driven end to end in Chromium | D4's ten own-copy fills, all driven; every D4 board carrying a per-part Check mounted and driven to a miss |
| R29 gate predicates read by hand | **all 25** — 12 own gates plus the 7 shared kinds the other 13 delegate to, 19 predicates in total |

**The render-and-grep, precisely.** Not the source: for each surface, the rendered DOM's
`textContent` plus every `data-latex` attribute and every KaTeX
`annotation[encoding="application/x-tex"]` node — the string KaTeX was actually handed, after every
template literal and helper had run. Eight checks over that corpus: literal `[object Object]`;
`undefined` or `NaN`; a `.katex-error` node; a `$` surviving into rendered text; any of 25 Unicode
operators inside a LaTeX string; a `\sqrt` with no radicand; empty typeset math; a
digit-full-stop-digit adjacency; plus the two that found things, `1x` and a printed zero term. Six of
the eight were clean from the first run. **Final state: all eight clean over 610 figures.**

What that is NOT evidence about: anything the figures do in SPACE. Overlap, clipping and bracket
height are claims about a rendered frame, and they are held by the browser guards and the frames
named above, not by this.

**Checked and found clean.**

- **R14** — all 25 subtitles read in sequence as one list across the five packs. Zero questions, no
  repeated construction, every one a noun phrase, none restating its slide's first line. (This is the
  rule that produced 23 questions in 31 subtitles in D2.)
- **R20–R23 and R33** — no finding in the five packs.
- **R10** — clean across all 25, by construction rather than inspection: every one takes
  `useWidgetVariants`, whose `restart` is `(index + 1) % count` and calls `onReopen`, no widget
  hand-rolls a reset, and all 25 declare 2 parameter sets, so a restart cannot deal the set just
  answered.
- **R12** — `WidgetReveal` requires `why`, so an answer with no explanation is not expressible. 13 of
  the 25 render their own reveal and the other 12 inherit one.
- **R29** — **none of the 25 is gated on a clean run; there is no `&& !missed` anywhere in the pack.**
  Read predicate by predicate rather than inferred from the guard. Two things that reading found and
  running cannot: `earned` is the near-miss — eight predicates sit directly beneath
  `if (earned) { success() }`, it is the one flag in scope recording whether the learner got it right,
  and it reaches the gate on none of them; and `common-measure-classify` is the one board that could
  have failed, because its reveal is `available={settled && missedNote !== undefined && ...}`, so a
  wrong option carrying no note would settle the board with the reveal hidden and the gate shut
  forever — every decoy is mapped through a constructor that supplies a note, derived from source.
- **The `pickup.ts` race** — no D4 widget hand-rolls a pickup. The four with a tray all import the
  shared `usePickup`, and no `useState`-based pickup exists among the 25.
- **R25, R26, R28, R30, R31 outside each guard's population** — asked and answered per rule. R30 and
  R31 do not occur in D4's widgets at all: across the 25 sources, `placeholder` appears **zero** times
  and `\phantom` appears **zero** times. R25: `perfect-square-sorter` is D4's only `BinaryRowSort` and
  is in the guard; none of the other 24 renders a two-option row. R26: every other use of `BRICK` or
  `CIVIC` in the pack was read and is one of three things — the border of the chip the LEARNER picked,
  a note or status TEXT colour, or a bin's identity hue beside that bin's own written label. R28:
  ten of the 25 pass `othersRemain` and every one is a live predicate; the two that do not are declared
  in `NEVER_HANDS_BACK` with their reason.
- **`d4Kit.tsx` does not reach beyond D4** — a measurement, not a reassurance. Its only importers are
  the five `d4POL*.tsx` files and `bracketSizing.browser.test.tsx:50`, and that last imports
  `signedTex`, which this round did not touch.
- **No advertised placeholder form answers a D4 item**, graded rather than string-matched. **No D4 key
  spells a product with a star.** **`d4.pol8.leading-remainder.l3` is not a difficulty regression** —
  the node's ladder runs on two tracks and its module header states that design.

**What was FIXED versus REPORTED.**

- **Fixed in this round:** all three P0s (four sites), all ten P1s, and P2-1 through P2-20 —
  everything above except the two named below. Three of the four STILL BROKEN reconciliation rows
  (17, 18, 20) were closed.
- **Reported and not fixed:** P2-21 (`d3Kit.tsx`'s duplicated root labels), P2-22
  (`common-measure-classify`'s readout colour), and reconciliation row 19 (D3's `SolutionLineWorked`
  draws), which is R-1.
- **Assessed and carried:** R-1 through R-7 above.

**Frozen snapshot.** `packages/item-bank/src/__snapshots__/product.test.ts.snap` hashes to
`99c4fac7d14ba1673120794c4aa9f9d9576de209` at the pin and at delivery. `vitest -u` was never run.

**Out-of-era changes made in this round, and why each was in scope.** LIN.5 (P1-1) and
`both-pans-builder` (P1-10) in D3; TRG.3 / TRG.4 / TRG.9 (P0-2) in D9 and LF.1 (P0-2) in D7;
`d8EL2.tsx` / `d7LF2.tsx` (P2-17) in D7 and D8. `NUM.F` (D1) was examined for P0-2 and deliberately
left excused. Every one was found by a D4 sweep whose population
was scoped to the behaviour rather than to the era, and in every case the fix that closes D4's
instance closes theirs in the same line. Named here rather than left implicit in the diff.

## Rebase

The review's pin and the branch's base are two different SHAs and stay two different SHAs.

- **Reviewed at** `941c5576`. Everything above this section is evidence about that tree.
- **Rebased onto** `1dcc5030` (`Merge pull request #458 from <org>/anthony/d9-checklist-counters`),
  the `origin/integration` tip on 2026-08-03. The round is one commit, replayed with **no conflicts**.

`origin/integration` moved a long way under this round: **463 files** differ between the pin and
the target, because a long-lived branch (`evan/city-population-happiness`, #273) merged in during
it, along with the Plague and Intrusion engines, era four's renders and the `test/` tsc project.

**A rebase pulls in other people's changes, so what matters is the intersection, and it was
measured rather than eyeballed.** Of the **43** paths this round writes, exactly **one** is also
written by `941c5576..1dcc5030`:

| Path | This round | `1dcc5030` | Result |
|---|---|---|---|
| `apps/web/src/styles.css` | P1-9's range-input outline rule | era art and city rules elsewhere in the file | merged cleanly; `git diff origin/integration HEAD -- apps/web/src/styles.css` is **15 insertions, 0 deletions**, and the rule survives at `:10720` |

That is the whole textual overlap. **No `content/lessons/` file was touched by either side of the
merge**, so all five D4 packs and the D7 and D9 packs P0-2 reaches are this round's alone.

**Six areas this round REVIEWED were touched by the merge without colliding with it, and each was
re-read at the rebased tree rather than assumed.** A finding expires when the tree moves, and an
untouched file is not the same as an unaffected claim:

1. **`interactive/kinds/EstimateThenCheck.tsx`** — named in P1-9's blast radius as the kind that
   carries the new outline to four surfaces outside D4. Still spreads `revealFill.entry` onto its
   slider, so the measured radius of five surfaces holds.
2. **`interactive/PerfectSquareSorter.tsx`** and **`interactive/kinds/BinaryRowSort.tsx`** — a D4
   widget and the shared kind it is built on, both edited by #456's D9 style pass. R25's coverage
   claim (`perfect-square-sorter` is D4's only `BinaryRowSort` and is inside the guard) is re-read
   and still true, and the widget suites are green in the run below.
3. **`packages/item-bank/src/interactive/templates.ts`** — the registry the "25 of 25 widgets"
   coverage figure is derived from. `check:lessons` and `web-reachability` both green over it.
4. **`worked/d9TRG4.tsx`** — TRG.4 is one of the three out-of-era nodes P0-2 widened. The merge
   changed its FIGURE; P0-2 changed the SPELLER (`cfuVariants.ts` / `cfuAcceptedForms.ts`) and no
   pack JSON, so the two do not meet. `cfuVariants.test.ts` green on the rebased tree.
5. **`packages/item-bank/src/d1/nodes/NUM.F/index.ts`** — the node P0-2 examined and deliberately
   left excused. The exemption is asserted against `simplification: "reduced_fraction"` in both
   directions, and it is still green, so the merge did not silently qualify or disqualify it.
6. **`widgetRevealEarnedGate.browser.test.tsx`** and **`widgetVariantPool.test.tsx`** — the guards
   behind the R29 and R10 coverage claims. Both were edited by the merge and both are read below.

**One thing the rebase changed that is not a finding but is worth recording:** `1dcc5030` adds
`@types/node` to the root `devDependencies` and a `test/` project to `tsconfig.json`, so
`npm run typecheck` exits 1 with `TS2688: Cannot find type definition file for 'node'` until
`npm install` is run in the worktree. It is a stale `node_modules`, not a type error.

## Verifying the combined tree

No stream ran the whole gate, and each edited without seeing the others, so the gate was run once
over the merged and rebased tree. `npm run check`'s links were run **individually** rather than
through the chained script, because `&&` aborts at the first failure and a chained run would have
reported nothing about the suites behind a failing link.

| Link | Result |
|---|---|
| `npm run format:check` | **exit 0**, 1,463 files |
| `npm run lint` | **exit 0**, 19 warnings / 22 infos, none of them errors |
| `npm run typecheck` | **exit 0** after `npm install` (see "Rebase" above) |
| `npm run test:unit` | 396 files, **9,578 tests: 9,538 passed, 38 failed, 2 skipped**, 1,043s — triaged below |
| `npx vitest run --project web-reachability` | **exit 0**, 2 files, **220 passed** |
| `npm run check:graph` | **exit 0**, all invariants pass, 87 hard edges over 62 live nodes |
| `npm run check:lessons` | **exit 0**, 9 domains, **d4: 5 packs, 0 errors, 0 warnings** |
| `npm run test:browser` | 198 files, **2,109 tests: 1,986 passed, 47 failed, 76 skipped**, 1,405s — triaged below |

`verify-changes` records a green browser baseline of 845 tests over 77 files, measured 2026-07-29.
That is four days stale: the suite is **198 files and 2,109 tests** now, and Anthony's own log of
2026-08-02 already read 186 / 2,191. Recorded here so the next reader does not take a five-fold
growth for a collection fault.

Two of the two lint warnings that land in files this round edited — `cfuVariants.ts:1030`'s unused
`constant` and `cfuD4D5.tsx:334`'s unused `other` parameter — are **pre-existing**, read at the pin
with `git show 941c5576:<path>`, and neither is an error.

### Triage: `test:unit`, every failure, with its evidence

**Zero of the 38 were caused by this change**, and every guard this round added or widened passed
in the full run. Each row names the evidence type it was settled by.

| Failure | Tests | Verdict | Evidence |
|---|---|---|---|
| `test/ciScopeFilter.test.ts` | 21 | **environmental** | Reproduced on **clean `integration` @ `1dcc5030`** in the unmodified main worktree: **21 failed / 5 passed**, byte-identical cause. `/bin/bash: C:UserszhengAppDataLocalTempci-scope-filter-VOhhA0scope-step.sh: No such file or directory` — the WSL `bash` eats the backslashes out of the Windows temp path the test writes its script to. Nothing to do with any test's subject. |
| `test/plagueTopology.test.ts` | 3 | **pre-existing** | Reproduced on clean `integration`, same three assertions: *"by behaviour: ... `crisis/propagation.ts`, `crisis/registry.ts`, `intrusion.ts`, `plague-*.ts` / by name: `plague-*.ts`"*, plus 18 violations each on the authored-pairs and two-valued rules. Era six's engine, Gabe's lane, and this round opens none of those files. |
| `test/intrusionPropagation.test.ts` | 1 | **pre-existing** | Reproduced on clean `integration`: *"by behaviour: `crisis/buildingMark.ts`, `intrusion-mechanics.ts`, `intrusion-questions.ts`, `intrusion-tuning.ts`, `intrusion.ts`"*. Same shape as the row above — a two-way population derivation that has come apart on era nine's engine. |
| `packages/item-bank/src/product.test.ts` — `>=1000 samples` | 1 | **pre-existing, and reported rather than re-pinned** | **Measured at 291,985 ms** in this run against its hardcoded 60,000 ms budget (`product.test.ts:48`, `}, 60_000)`). It is not a load artefact: given **its own process** it is still red on **both** trees — 97.50s wall in the D4 worktree and 107.90s on clean `integration` @ `1dcc5030`, each killed at the 60s cap. So it has no D4 dependency. **The budget was not touched.** The cap is the assertion; a slower checker is what it is asserting about. |
| `packages/item-bank/src/d5.test.ts` | 1 | **contention** | Green in its own process: **19 passed, 42.48s**. Exactly the behaviour `verify-changes` records for the other hardcoded-`60_000` file. |
| `template.test.ts`, `templateTermination.test.ts`, `walk.test.ts`, `economy/one-way-invariant.test.ts`, `engines/game/hard-winter-invariants.test.ts` | 5 | **contention** | All five re-run together at `--testTimeout=180000`: **5 files, 49 tests, 0 failed, 21.41s**. Every one failed in the full run with `Test timed out`, never with an assertion. |
| `test/milestonesAreNotAPointSystem.test.ts` | 2 | **contention** | Both `Test timed out in 5000ms`. Green on clean `integration` at a raised timeout, in the same three-file run that reproduced the two rows above it. |
| `src/lessons/interactive/slopeLabelLayout.test.tsx`, `src/city/lessonMountSteps.test.tsx` | 2 | **contention** | Re-run alone from `apps/web`: **2 files, 21 tests, 0 failed, 29.82s**. `slopeLabelLayout` is the only failing file in a lessons directory and it is D7's, not D4's. |
| `src/city/crisisFromAFreshSession.test.tsx`, `src/winter/winterDevSkipGrantsNoEvidence.test.tsx` | 2 | **contention** | These two are the reason the isolation re-runs were done twice. Alone on clean `integration` they pass, which on its own would have been consistent with a regression here; alone **in the D4 worktree** they also pass — **2 files, 8 tests, 0 failed** — which is what settles it. They fail only alongside other files. |

The one shape worth naming: eight of the nine rows above are the machine, not the tree, and the
`verify-changes` skill predicts most of them by name. The two rows that are neither — plague
topology and intrusion propagation — are real, reproduced, and belong to another lane, so they are
reported here and not fixed here.

### Triage: `test:browser`, every failure, with its evidence

47 tests failed across **27 files**. **Twenty-five of the 27 pass in isolation**, and **zero of the
47 were caused by this change**. Every one of the 27 was re-run — none was dismissed on the
resemblance to a known flake — in six groups, and the groups were kept small because the failure
mode under test is contention.

| Files | Tests | Verdict | Evidence |
|---|---|---|---|
| **The four this round could plausibly have broken**: `interactive/DifferenceSquaresDrag`, `workedFigureLabels`, `cfuAuthoredFigureShots`, `svgHitTargetCentering` | 5 | **contention** | Re-run as one group: **4 files, 36 passed, 0 failed, 101.95s**. These are the widget P1-8 rewrote, the guard P1-5 added a case to, the POL.4 figure of reconciliation row 16, and reconciliation row 10's centring guard. |
| `labelFigureNarrow`, `classifyChipFit`, `reviewCardContainment`, `mathCaseTransform` | 10 | **contention** | **4 files, 32 passed, 0 failed, 94.06s**. |
| `chipPressedState`, `mathKeypad`, `estimateLanes`, `devCfuGameParity` | 6 | **contention** | **4 files, 37 passed, 0 failed, 29.83s**. `mathKeypad` is one of the two files `verify-changes` names by name for this. |
| `ceremonyAnswerRow`, `winterInCitySheet`, `winterConclusionSheet`, `winterZeroAccuracy` | 8 | **contention** | **43 passed, 0 failed** in the group they were re-run in. |
| `frostCrustSilhouette`, `winterSpentHearth`, `EraTimeline`, `cityAlbumShots` | 7 | **contention** | **23 passed, 0 failed**. |
| `eraTwoField`, `declareScreenShot`, `crisisCallShots`, `crisisFeedbackShots`, `eraAdvanceDoorShots` | 8 | **contention** | **5 files, 10 passed, 0 failed, 50.09s**. All five are screenshot-takers, which is the failure `verify-changes` describes: `locator.screenshot: Timeout 5000ms exceeded` before the assertion is ever reached. |
| `city/three/crisisPanelFitsItsContent` | 2 | **environmental, pre-existing** | The only file that still fails **alone**, and it fails on its own precondition rather than on a measurement: *"none of DejaVu Sans, Liberation Sans, Arimo, Noto Sans, Inter, Cantarell, FreeSans, Nunito is installed, so the worst case cannot be measured here"*. Reproduced alone on clean `integration` @ `1dcc5030`, same two cases, same message. A Windows font gap, already named in `work-log/anthony/2026-08-02-d9-style-fixes.md`. |
| `city/three/cityFraming` | 1 | **contention** | The one that took three runs to settle, and the reason it is written out. It failed in the full run at *"there is lagoon all the way round the island — grass-46 at 1440x900"*, failed again in a five-file group at **grass-30**, and passes **alone** on both trees (7 passed / 1 skipped in the D4 worktree; green on clean `integration`). A guard that names a different parameter each time it fails is reporting the render clock, not the island — and passing on clean `integration` alone would NOT have settled it, since that is equally consistent with a regression here. Passing alone in this worktree is what settles it. |

`apps/web/src/city` and `apps/web/src/winter` hold 15 of the 27 files and this round opens no file
in either. The one shared surface that could in principle have reached them is `styles.css`, and
P1-9's rule is `.lesson-feedback-host input[type="range"][data-reveal-given="on"]` — three
conditions, none of which a WebGL island or a crisis panel can satisfy. The isolation runs are the
evidence; that is the argument for why the evidence came out the way it did.

**Frozen snapshot, at delivery.** `git hash-object
packages/item-bank/src/__snapshots__/product.test.ts.snap` reads
`99c4fac7d14ba1673120794c4aa9f9d9576de209` after the rebase and after every run above, which is the
value it had at the pin. `git status` reports the file unmodified. `vitest -u` was never run, and
`product.test.ts` was left failing rather than re-pinned, which is the same decision twice.
