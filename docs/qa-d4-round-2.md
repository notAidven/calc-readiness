# D4, the Classical era — QA round 2, at `68c5aa9a`

**The review was conducted at `68c5aa9a`**, off `origin/integration`, fetched 2026-08-04 after
#543 (the three-section migration of
D4) merged at `0d341827`. Every finding, line reference and frame below is evidence about that
tree. Numbers are measurements taken at that pin by the stream credited beside them; where a
figure could have been moved by a later stream's edit in the shared worktree, both readings are
given and the delivered one is named.

**Scope, and the way it narrowed while the round ran.** At the pin, `getEraNodes("classical")` was
POL.1, POL.2, POL.3, POL.4, POL.8 — five files, the whole of `content/lessons/d4/` — and POL.6 /
POL.7 existed only in open #524. That was
true when this review started and it is **not true of the tree this branch delivers.** The merge
recorded at the end brought 121 integration commits, and `content/lessons/d4/` now holds **eight
packs**: POL.5, POL.6 and POL.7 landed from another lane, and **this round reviewed none of them.**

So read every count below as covering **5 of D4's 8 packs**. Nothing here is evidence about POL.5,
POL.6 or POL.7: not the arithmetic check, not the R34 reading pass, not the term census, not the CFU
re-grade. **D4 is not swept, and this report does not claim it is.** The three new packs owe a round
of their own, and so do the 15 practice templates they brought with them, which are inside the figure
sweep this round widened but were read by nobody here. The one thing measured about them: all three
carry **no `worked_examples` array**, so they are unmigrated, which is both why they are absent from
this report's three-section work and why `threeSectionFlow`'s D4 census reads 5 rather than 8.

**A dating correction, since two drafts of this document got it wrong.** This is D4's second round and
the **fourth** second round in the project, after D8
(#546), D10
(#547) and D3
(#580). Round one
(#463) merged 2026-08-03T23:21:53Z, about
**one day** before this round rather than the six days an earlier draft claimed. Both errors were
plausible, cheap to check, and not checked.

**What was new since round 1.** All five packs now declare `worked_examples`: **25 prompts and 105
steps** of learner-facing prose that no QA pass had read, plus 25 lectures rewritten down to three
sentences each. Round 1's prose rows were all measured in sentences the migration then rewrote,
which is why reconciliation comes first and is a re-reading rather than a grep.

**Frozen content.** `packages/item-bank/src/__snapshots__/product.test.ts.snap` is `git hash-object`
`99c4fac7d14ba1673120794c4aa9f9d9576de209` at the pin and hashes to the same value at the end of
the round. `vitest -u` was never run. (The required value is the git BLOB hash; the raw file SHA-1
is `79b3f61641102c497d8c1a97d5bbad89169b3744`, and reading the wrong one of the two looks exactly
like a moved snapshot.)

## Round 1 reconciliation, at `68c5aa9a`

Round 1's 21-row table, its three P0s, its ten P1s and P2-1..P2-20, each re-checked at this pin
with its evidence type named. Line numbers are the ones found now, not the ones round 1 recorded,
because merges have moved several files; where a citation expired that is said rather than
silently corrected.

### Content and prose rows (Stream A)

| Round 1 row | Status now | Evidence type | Evidence |
|---|---|---|---|
| **P0-3** — `POL.2.json:7` asserted *"A leading coefficient changes only how many pairs there are to test, not the reasoning."* | **FIXED** | grep of merged result | Ban at `scan-lesson-text.mjs:315`; 0 live occurrences over 802 files. `POL.2.json:7` now reads *"A leading coefficient other than $1$ changes those conditions rather than merely lengthening the list, because then the pair has to multiply to the constant times the leading coefficient and is used to split the middle term so that the two sides come out by grouping."* Re-read for correctness: for $ax^{2} + bx + c$ the pair multiplies to $ac$ and adds to $b$, which is what the replacement says. |
| **P2-1** — `trinomial` used 10 times, glossed nowhere (R32) | **FIXED in POL.2; a wider defect found behind it** | reading | The gloss survived the migration: `POL.2.json:6` reads *"A **trinomial** is a polynomial with three terms"*. What round 1 did not ask is whether the packs that USE the word can REACH the pack that glosses it. Two cannot — P1-2 below. |
| **P2-2** — three names for one idea, the "common measure" drift (R32) | **STILL BROKEN at the pin, now FIXED** | reading + grep | The migration dropped round 1's tie a second time. Settled below. |
| **P2-3** — the sentence naming *difference of two squares* called it a sum (R15) | **FIXED** | grep | Ban `:330`, 0 live. `POL.2.json:8` now reads *"The same expression with a plus sign in front of the second square does not factor over the whole numbers at all."* |
| **P2-4** — `POL.2`'s CFU hint performed the step being assessed (R13) | **FIXED** | grep + reading | Ban `:335`, 0 live. `POL.2.json:87` now points at the check rather than asserting the learner's own instance has one: *"Check every term for a measure they all share before any pair is hunted for, because a common measure comes out first."* |
| **P2-5** — `POL.3`'s hint carried the question's scope (R13) | **FIXED** | grep + reading | Ban `:350`, 0 live. The scope moved into the prompt (`POL.3.json:62`, *"list every solution, not only the one that measures ground"*) and the hint speaks only to method. |
| **P2-6** — `POL.3` promised four moves and listed five (R15) | **FIXED** | grep + reading | Ban `:340`, 0 live. `POL.3.json:7` lists exactly four (*"gather at zero, factor, split into conditions, and solve each"*) and names the fifth as later. Matches `solve-quadratic-order`'s four ordered steps. |
| **P2-7** — `POL.3`'s hinge buried mid-sentence (R16) | **FIXED** | reading | Ban `:345`, 0 live. `POL.3.json:8` now leads with it: *"What that produces is right as far as it goes. But it is not the whole answer, because the division quietly assumed the expression was not zero..."* |
| **P2-8** — *"standard form with every power present"* contradicted POL.1, `degree` unglossed (R15, R32) | **FIXED, both halves** | grep + reading | Bans `:360`, `:365`, 0 live. `POL.8.json:7` separates the two ideas and carries *"The **degree** of a polynomial is its highest power"*. |
| **P2-9** — `POL.8`'s hint invited the wrong sign for $r$ and performed the other check (R13) | **FIXED** | reading | `POL.8.json:76` reads *"the value the row uses is the one that makes the divisor zero"*, which cannot be read as the printed sign; the second sentence points at the check instead of answering it. |
| **P2-10** — `POL.1.json:9` comma pile-up, decided as absorb (R19) | **NOT A DEFECT at this pin** | quoted reading | Settled below; the ban's objection has not returned. |

**The twelve round-1 D4 bans: all still in the ledger, none live.** Measured over 802 files under
`content/lessons`, `apps/web/src/lessons` and `packages/item-bank/src`. Each of the twelve resolved
to a `BANNED_PHRASES` line number, so none has been quietly deleted from the ledger, and each is
absent from the tree:

```
12 round-1 D4 bans checked; 0 still live.
```

**Settle 1 — the POL.2 "common measure" drift IS back. FIXED.** The ban at
`scan-lesson-text.mjs:320` cut round 1's original for naming the bolded term off "common divisor",
and its `why` records the fix as *"The largest such common measure is the **greatest common
factor**"*. At the pin the migration had rewritten the paragraph and dropped the tie again.
`content/lessons/d4/POL.2.json:6`, verbatim at the pin:

> "Before hunting for sides, look for the measure every term already shares: the largest amount
> that divides all of them is the **greatest common factor**."

The paragraph bolds one name and works in another that nothing connects to it, while "common
measure" is used seven times across POL.2's learner-facing text and the widget the slide mounts is
`common-measure-classify`. Now:

> "Before hunting for sides, look for the measure every term already shares: the largest such
> common measure is the **greatest common factor**."

**Settle 2 — the POL.1 R19 pile-up is NOT back. No edit.** `content/lessons/d4/POL.1.json:9`,
verbatim:

> "The same four-product rule holds when a side carries a coefficient, and it holds again when the
> two sides are measured in different units, where a single term can carry two variables at once."

This shortlisted because its opening clause is the opening clause of ban `:370`, but that ban's
objection was four commas doing two jobs — three separating a list of four products, the fourth
opening a trailing summary readable as a fifth product. The arithmetic has moved to
`worked_examples[4]`, so the list is gone and the two remaining commas are both clause separators.
The recurring clause is a false positive for that ban rather than a return of it.

### Item bank rows (Stream B)

| Round 1 finding | Verdict | Evidence type | Evidence |
|---|---|---|---|
| **P0-1** generator half — `d4.pol8.missing-power.l3`'s dividend | **FIXED** | injection | `POL.8/index.ts:228` reads `const c = n - r * r;`. Re-proved by restoring `n + r * r`, which reds `d4.test.ts:420` at *"d4.pol8.missing-power.l3:practice:120024: the prompt promises an exact division and leaves remainder 54"* over eight served items. Restored byte-identical. |
| **P0-1** figure half | **FIXED (read, not edited)** | reading | `worked/d4POL8.tsx:220` is `const c = params.c ?? n - r * r;`, with `:214-219` writing out the derivation and naming the old sign error. |
| **P1-4** — completing the square with no constant | **FIXED** | sweep over parameter space | `POL.4/index.ts:164-168` draws `root` from `[2, 9]` with `half` removed, so `constant` cannot be zero. Green over 10,000 draws and all 175 served items, and the sweep's third case still admits the bare zero three shapes need. |
| **P2-11** — `d4.pol4.formula.l3` keyed an unreduced fraction | **FIXED** | sweep | `inLowestTerms` at `_shared.ts:36-43`, applied at `POL.4/index.ts:208`. Green on 175 served items (7 keying a fraction) and 500 draws. |
| **P2-12** — `d4.pol3.factor.l2` printed a zero middle term | **FIXED** | sweep | `POL.3/index.ts:121-125` excludes $\pm k$ roots. |
| **P2-13** — `d4.pol8.synthetic-cubic.l2` could print a zero term (latent) | **FIXED** | sweep over parameter space | `POL.8/index.ts:130-139` excludes `m === r` and `n === r * m` at the draw, which is where a latent defect shows. |
| **P2-14** — four templates printed `1y` / `1x` | **FIXED** | sweep | `coeff` at `_shared.ts:12-20` via `signedTerm`; green over 10,000 draws (70,000 learner-visible strings) and 175 served prompts. |

No round-1 item-bank finding is still broken and none has become inapplicable. Every sweep
population was re-measured rather than quoted, and none has drifted: 175 served items, 25
templates, 25 frozen slots, 5 nodes; `DERIVABLE_TEMPLATE_IDS` covers 25 of 25.

### Widget, figure and guard rows (Stream C)

| Round 1 row | Verdict | Evidence |
|---|---|---|
| 1 — POL.1/POL.2 column labels over the product line | HOLDS | `worked/d4Kit.tsx:42` is `const TOP = 66`; `workedFigureLabels.browser.test.tsx` **15 passed**, re-run after this round's `d3Kit` change. |
| 3 — POL.3's third option rendered as bold prose | HOLDS | Deletion, so grep is the evidence: all four steps in `interactive/SolveQuadraticOrder.tsx` are `latex:` (`:39`, `:51`, `:65`, `:77`) and no `text:` step key exists in the file. |
| 4 — the reveal highlight did not cover tall math | HOLDS | `styles.css:5689-5691`, `.lesson-interactive__reveal-answer { display: inline-block; max-width: 100% }`. Round 1 recorded `:5108-5110`; the rule moved, the declarations did not. |
| 5 — POL.4's side slot clipped by a `0 0 400 216` viewBox | HOLDS | `interactive/CompleteSquareDrag.tsx:68` still derives `FIGURE_H` rather than hand-counting it. |
| 6 — POL.4's Check wrapped below its row after a verdict | HOLDS | `.lesson-equation__aside` at `styles.css:6375-6379`; grep for `:has(> .verdict)` across `styles.css` returns no match. |
| 7 — the parenthesis in `d4.pol4.complete.l1` was too short | HOLDS | `worked/d4POL4.tsx:65` writes `\left(\dfrac{...}{2}\right)^{2}`. |
| 8 — POL.8's drop slots painted outside their borders | HOLDS | `styles.css:6504-6507`. |
| 10 — `x + 4` against the top edge of POL.4's side slot | HOLDS | `svgHitTarget.tsx:43-46` carries the flex centring. |
| 11 — the bracket measured as a font box rather than painted ink | HOLDS | `katexInk.ts` exists; `paintedInk` imported by `workedFigureLabels.browser.test.tsx:75` and `bracketSizing.browser.test.tsx:44`. |
| 16 — POL.4's authored CFU reveal clipped $\dfrac{3}{2}$ | HOLDS, re-photographed | `worked/d3Kit.tsx:128` is `viewBox="0 0 440 172"`. Frame `p2-21-pol4-reveal-AFTER-1024x580.png`: `x = \tfrac{3}{2}` renders whole under the number line, inside the card. |
| P1-3 — `signedTermTex` routing | HOLDS | Exported from `d4Kit.tsx`, used 7× in `d4POL8.tsx`, 5× in `d4POL4.tsx`, 2× each in `d4POL3.tsx` and `d4POL1.tsx`. No D4 figure builds a signed term by hand. |
| P1-6 — `LongDivisionStepper`'s single `openRow` | HOLDS | `:108` declares one; `:114`, `:293`, `:311` all derive from it. |
| P1-7 — `FactorPairStepper` using `fill.entry` | HOLDS, re-run | `:191` is `{...fill.entry(shownIndex)}`; `widgetRevealFill -t "factor-pair"` **2 passed** after this round's colour change to the same widget. |
| P1-8 — `DifferenceSquaresDrag` placement 1 | HOLDS | `:357-358` and `:528` read `edge("piece")` where the hard-coded `false` was. |
| P1-9 — the range-input outline rule | HOLDS; merges moved it, nothing touched it | `styles.css:10529-10533`, now after the audio-settings block with both sibling rules intact. |
| P2-15 — `d4.pol2.difference.l2` printed `(x)^{2}` | HOLDS | `worked/d4POL2.tsx:90` brackets only when the base is a product. |
| P2-16 — the given label overflowed its landing box | HOLDS | `interactive/DifferenceSquaresDrag.tsx:530-546` stacks the two sides in a flex column at `fontSize: 11`. |
| P2-17 — duplicate React keys in `d8EL2` / `d7LF2` | HOLDS | Both read ``key={`p${index}:${point.x}:${point.y}`}``. |
| P2-18 — `equationRowCheckPlacement` explained itself by a deleted rule | HOLDS | The header now explains the guard by `.lesson-equation__aside`, the rule that ships. |
| P2-19 — `stepChipMath`'s carrier list was named | HOLDS | `:258-259` derives `RAW_CARRIERS` from `RAW_CHIPS`; the original five survive as an asserted-still-reached set. |
| P2-20 — `widgetTaskOrder`'s population scoped by implementation | **POPULATION HOLDS, but the CARRIER list was still short** | 190 passed at the pin with the derived population and composition floors intact — and injection found the control list short a second time. See P1-11. |

**NOT DONE in this table, named rather than left out.** Rows 2 and 9 (POL.2's drag board naming;
the dissection figure's tiling and rule-span assertions): the code half of row 2 is verified above
as P2-16 / P1-8, but `DifferenceSquaresDrag.browser.test.tsx` was not re-run and its frame not
re-taken, and round 1 recorded it passing **in isolation only** — **claimed but unverified** at
this pin. Rows 12, 13, 14 (`bracketSizing`'s widening, `visualsMath`'s `DELIMITER_PAIRS`, the
removed tautology): `visualsMath.test.tsx` is green in this round's runs, but `DELIMITER_PAIRS` and
`bracketSizing`'s floors were not read line by line and `bracketSizing` was not re-run — **claimed
but unverified**.

### Row 15 / R-1 (Stream D): half of the brief had already expired

Round 1's R-1 and its row 19 describe `practiceSweep.ts:244` as `{ domain: "d3", why: "no figure
sweep anywhere yet..." }` with `d7` beside it. **At `68c5aa9a` that is not the tree.**
`NOT_SWEPT_HERE` held **`d6` and `d7`**: `d3` had been brought into the population by `3eef444b`
(D3's own QA round) and `d6` had arrived with `be84619c`. `TEMPLATE_FLOOR` was **202**, not the 180
round 1 recorded. R-1's own citations expired exactly as `qa-verification.mdc` predicts — it cited
`d3LIN5.tsx:47` as an eleventh `pieces` draw, and at this pin `d3LIN5.tsx` passes `pieces` nowhere.
The `pieces` draws are ten, not eleven, all inside the swept population.

So the D3 half of R-1 was closed by another lane before this round began, measured at the tip
rather than taken from the report, and what remained was `d7`. That is recorded here because a
brief re-read as written would have produced a confident change to a file that had already moved.

## Mechanical checks

```
node .cursor/skills/author/scripts/validate-lesson-pack.mjs --strict content/lessons/d4
```

```
note: visuals.tsx parsed from ...\apps\web\src\lessons\visuals.tsx: 254 registry entries, 0 of them captioned. R8 ... therefore has nothing to check, and this is the INTENDED END STATE rather than a tooling fault: #179 removed every widget caption on purpose. The rule is dormant, not dead ... the count is pinned at EXPECTED_REGISTRY_CAPTIONS
OK: 5 lesson pack(s) passed validation.
```

Exit 0, before the round's edits and again after them, identical both times. **The R8 state line is
present** and reports the intended end state; **the R18 skip line is absent**, so R18 ran rather
than being skipped.

```
node .cursor/skills/lesson-qa/scripts/scan-lesson-text.mjs \
  content/lessons/d4 apps/web/src/lessons/interactive packages/item-bank/src/d4
OK: 249 learner-facing string(s) across 5 pack(s) and 3812 prose-shaped run(s) across 272 widget file(s), no rendering artifacts.
```

**Does the third path change what is swept? Measured both ways rather than asserted:**

| invocation | learner-facing strings | packs | prose-shaped runs | widget files |
|---|---|---|---|---|
| round 1's two paths | 249 | 5 | 3636 | 263 |
| `packages/item-bank/src/d4` alone | 0 | 0 | 176 | 9 |
| round 2's three paths | 249 | 5 | 3812 | 272 |

The third path adds **176 prose-shaped runs across 9 files** and changes no pack count, so round 1's
ledger genuinely could not have seen a banned sentence living in those nine files. All three paths
are clean. The string count is 249 rather than the pin's 248 because a POL.8 rewrite (P1-6 below)
turned a four-step array into a five-step one.

**The twelve entries this round adds to `BANNED_PHRASES` were proved capable of failing.** The five
packs were extracted from the pin and scanned: `FAIL: 12 finding(s) over 248 learner-facing
string(s) across 5 pack(s)`, one finding per added entry, each at the slot it was written against.
An entry added green asserts nothing. The ledger holds 70 entries at the end of the round.

## P0 findings

Both are on the CFU grading surface, both were found by re-grading rather than by reading, and
neither was reachable from round 1's evidence, because round 1 checked POL.4's accepted list by
lengthening it rather than by measuring what the surface beside it accepts.

### P0-1 — POL.4's authored CFU refused the decimal inside braces. FIXED

`content/lessons/d4/POL.4.json:75-94`, the 18-entry list round 1's P0-2 left, graded through the
surface's own entry point (`gradeCfuAnswer`, `apps/web/src/lessons/cfuChecker.ts`) on rendered
instance 0, key `{-4, 3/2}`:

```
ACCEPTED  "-4, 1.5"          (bare, decimal)
ACCEPTED  "{-4, 3/2}"        (braced, fraction — the key)
REFUSED   "{-4, 1.5}"        (braced, decimal)
REFUSED   "{1.5, -4}"        (braced, decimal, reversed)
```

The list takes the decimal bare and the fraction braced and refuses the two ways of combining
them. **What a learner wrongly concludes:** that $1.5$ is not $\tfrac{3}{2}$ — having written the
roster the way the question's own key writes it, with braces, and been marked wrong for a decimal
they were free to use a moment earlier without them. A third refused spelling is worse:
`-4, \dfrac{3}{2}` is the notation **the pack's own reveal prints**, so a learner who is shown the
answer, copies its typesetting and submits it is marked wrong by the card that printed it.

Reproduction written first, red at the pin, verbatim:

```
FAIL  cfuAuthoredAskParity.test.ts > POL.4's authored ask takes the decimal and the brace in any combination
+ POL.4 authored ask refuses "{-4, 1.5}"
+ POL.4 authored ask refuses "{1.5, -4}"
+ POL.4 authored ask refuses "-4, \\dfrac{3}{2}"
```

This is not three missing entries. The authored ask accepted **18 of the 168** spellings its own
re-ask machinery generates for the same answer, so adding the three named strings would leave 147.
It is fixed by P0-2's route, and the three named strings are asserted by name as well, so the
instance is covered and not only the class.

### P0-2 — every D4 authored ask was stricter than its own re-ask, and it was never a D4 defect. FIXED

**Cause, measured rather than read.** `LessonCfuCheck.answer_type` is `"numeric" | "expression"`
(`apps/web/src/lessons/types.ts:27-38`), so a CFU whose answer is a SOLUTION SET can declare no
`check` block at all. All five D4 packs have none, and with `check === undefined` `gradeCfuAnswer`
fell through to exact string membership in the instance's typed list. A census probe asserts the
consequence rather than arguing it:

> `D4's five CFUs cannot reach the shared checker at all` — 10 instances probed, 0 reached it.

So the strict grader was a hand-typed list with nothing behind it, while the re-ask's list is
generated by the speller and runs to 48 and 192 entries.

**The scope is not D4.** Run at the pin over every rendered ask in the tree, the reproduction came
back with **32 packs across nine domains** stricter on the authored ask than on the re-ask beside
it. The width is the finding:

```
FAIL  cfuAuthoredAskParity.test.ts > every spelling the re-ask machinery generates, the authored ask accepts
+ NUM.F: the authored ask accepts 1 of the 3 spellings ... it refuses ["\\dfrac{1}{3}","\\frac{1}{3}"]
+ NUM.3: 8 of 12 ... refuses ["+3*x + 12","+x*3 + 12","+12 + 3*x","+12 + x*3"]
+ EXP.1: 9 of 12 ... refuses ["1/(x**2)","\\frac{1}{x**2}","\\dfrac{1}{x**2}"]
+ RAD.1: 13 of 22 · RAD.2: 9 of 15 · LIN.5: 8 of 48
+ POL.1: 3 of 8 · POL.2: 3 of 4 · POL.3: 4 of 48 · POL.4: 18 of 168 · POL.8: 3 of 6
+ RAT.1: 52 of 504 · RAT.2: 52 of 1512 · RAT.3: 83 of 882 · RAT.4: 72 of 882 · RAT.5: 53 of 15876
+ CG.1: 12 of 2160 · FUN.1: 6 of 36 · FUN.3: 3 of 54 · FUN.4: 10 of 144 · FUN.5: 3 of 54
+ FUN.8: 12 of 648 · FUN.10: 9 of 3840 · LF.1: 52 of 1200 · LF.2: 16 of 66 · LF.3: 54 of 1080
+ EL.5: 10 of 18 · TRG.1: 8 of 10 · TRG.3: 6 of 10 · TRG.4: 4 of 6 · TRG.6: 8 of 10 · TRG.9: 4 of 6
```

**What a learner experiences.** POL.3's prompt asks them to "list every solution". They write
`-7; 5` and are told they are wrong. They are then handed a *different* question, and the retry
takes `-14; 8` without complaint — so the convention they were marked down for is the convention
the same card accepts one attempt later. This is round 1's P1-1 asymmetry with the sign flipped:
the strict half is now the FIRST attempt, which is the attempt where a correct answer in an
ordinary spelling is most likely to be typed.

**Fixed at the shared path, not in five lists.** `cfuVariants.ts` gains `cfuAuthoredSpellings(cfu)`
— the authored answer spelled by the same speller its re-ask uses, resolved through
`worked_solution_template ?? variants.template_id` with the pack's own `worked_solution_params` —
and `gradeCfuAnswer` now consults it on either kind of instance. The two ask-independent gates
(numeric-literal, reduced-fraction) still run ahead of everything, so NUM.F's lowest-terms
requirement is untouched. The schema was not widened and no content file was changed: a
`solution_set` check type would have fixed five packs and needed a cross-lane change to a frozen
checker API, where this fixed 32 in nine domains, none of which had this on a list.

**After.** All 54 measured packs accept every spelling their own re-ask machinery generates. Per D4
pack, spellings of its own answer accepted:

| pack | authored key | before | after |
|---|---|---|---|
| POL.1 | `2x^2 + 13x + 6` | 3 | 8 of 8 |
| POL.2 | `2(x + 4)(x - 3)` | 3 | 4 of 4 |
| POL.3 | `{-7, 5}` | 4 | 48 of 48 |
| POL.4 | `{-4, 3/2}` | 18 | 168 of 168 |
| POL.8 | `x^2 - x - 2` | 3 | 6 of 6 |

**The answer was not widened, only its spelling**, and that is asserted three ways with each
injected red: POL.3 still refuses `5`, `{5}`, `x = 5`, `5 only`, `-7`, `[-7, 5]` and `-7, 4`; POL.1
still refuses `6 + 13x + 2x^2` (correct value, wrong form, and standard form is what it asks for);
POL.2 still refuses `2(x^2 + x - 12)` (incomplete factoring); and across all 54 packs no authored
ask accepts any spelling of another instance's answer, graded rather than compared as sets.
`cfuAuthoredSpellings` returns nothing unless the pack's own answer comes back out of the speller,
which is what stops a params-schema mismatch spelling a different answer — NUM.2 is the live case
and the precondition catches it.

POL.4's total is **168**, not the 144 first reported: `solutionSetForms([-4, {over: 3, under: 2}],
{ unreduced: true })` gives 2 spellings of $-4$ times 7 of $\tfrac{3}{2}$, over 2 orders, 3
separators and 2 brace states. Recorded as a re-measurement; the defect is the same either way.

## P1 findings

### P1-1 — the guard that would have caught P0-2 could not see D4 at all, in two ways. FIXED

`apps/web/src/lessons/cfuVariantGrading.test.ts:39-42` at the pin filtered
`lesson.cfu?.check !== undefined`, so all five D4 CFUs were outside its population: scoped to where
the mechanic is implemented rather than to every surface exhibiting it, which is the
population-scoping failure `qa-verification.mdc` describes. **The second cause matters as much and
was in nobody's brief:** even inside a widened population, every probe in `SPELLINGS` is a
transformation of a single integer or a single fraction, so a roster key like `{-7, 5}` matches none
of them. Widening alone would have bought a population and no probes.

The population is now `RE_ASKING` (every pack serving a computed re-ask), the checker sweep stays on
the checked half **with the reason written down** (`checkCfuThroughChecker` returns null without a
check block, so that claim is not about a check-less pack at all), the authored key falls back to
`cfu.accepted[0]`, and four roster probes are added — unbraced, semicolon, the word "and", reversed
order — each guarded by a parts test that keeps composite keys like `(3, 8), 11` out.

Proved by forcing the emptiness back, restoring both the old filter and the old key:

```
FAIL  cfuVariantGrading.test.ts > the sweep found the packs that re-ask, the checked ones and the check-less ones
+ only 0 packs re-ask with NO check block, under the floor of 30: the population has narrowed back to
  where the mechanic is implemented, which is how all five D4 CFUs sat outside it
+ only 23 computed instances resolved across 23 re-asking packs, under the floor of 50

FAIL  cfuVariantGrading.test.ts > every spelling the authored question accepts, the re-ask accepts too
+ only 120 spellings were tried, under the floor of 140
+ only 86 spellings were accepted on the authored question and so owed by the re-ask, under the floor of 90
```

Measured at the pin: 59 packs serve a re-ask (23 checked, 36 check-less), 159 probes, 102 owed. The
file's own comment previously recorded 106 and 75 over a population of 20.

### P1-2 — three terms are used in packs with no path to where they are glossed (R32). Four sentences FIXED, two judged, one handed on

Round 1 counted `trinomial` across `content/lessons` and glossed it in POL.2, which is correct for a
domain-wide count. But R32 asks whether a term is EARNED, and earning is a question about the skill
graph rather than about the domain: **a sibling is not an ancestor.** Measured over the whole tree —
gloss index built from all 59 packs, reachability by transitive `prereqs` closure from
`packages/skill-graph/src/skill_graph.json` — **8 unearned uses** at the pin:

```
POL.3 (prereqs [], ancestors []):
  UNEARNED "factor" at mini_lesson[2] -- glossed only in POL.2, RAT.1, not reachable
  UNEARNED "trinomial" at worked_examples[2].steps[2] -- glossed only in POL.2, not reachable
POL.4 (prereqs ["POL.1","RAD.1"], ancestors ["POL.1","NUM.4","NUM.S","NUM.F","NUM.2","NUM.3","RAD.1"]):
  UNEARNED "trinomial" at mini_lesson[2]
  UNEARNED "factor" at mini_lesson[2]
  UNEARNED "solution" at mini_lesson[4]
  UNEARNED "trinomial" at worked_examples[2].steps[3]
  UNEARNED "factor" at worked_examples[2].steps[3]
  UNEARNED "solution" at worked_examples[4].steps[3]

8 unearned use(s) of a bolded term.
```

**POL.3 has an empty `prereqs` array**, so it has no ancestors at all, while being titled *"Solve
quadratics by factoring and the square-root property"*: a learner can arrive there having met
nothing.

Four sentences were rewritten and the same measurement then reports **3**. Both remaining rows are
judged rather than missed, and the judgements are recorded because a green script would have hidden
them:

- `POL.3 mini_lesson[2]`'s bare verb "factor" is earned in substance by a gloss added one paragraph
  earlier (*"an equation written as a product is in **factored form**"*). The script compares term
  strings literally, so "factored form" does not satisfy its check for "factor". The learner is not
  stranded; the script is not claimed green.
- POL.4's two uses of "solution" are left deliberately: the word is at the boundary of technical and
  ordinary register, glossed in LIN.1 and LF.4 as well as POL.3, and spending one of a
  three-sentence budget on it would teach a word the learner has used since LIN.1. **The underlying
  defect is the graph, not the prose** — POL.4 teaches solving quadratics by completing the square
  and does not list POL.3 as a prerequisite (`skill_graph.json`, `POL.4.prereqs =
  ["POL.1","RAD.1"]`). REPORTED, see below.

A third live copy sat outside the packs, at `apps/web/src/lessons/worked/d4POL4.tsx:206` — *"Nothing
here needed the trinomial to factor."* — in the unswept directory of P1-3, which is how it survived
two rounds. Closed in this round's final pass.

### P1-3 — `apps/web/src/lessons/worked/` was outside every scanned path this document knew of, 672 prose runs. FIXED, and a second missing path was found independently in another lane (see the last section)

The three-path scan this round prescribed does not reach `apps/web/src/lessons/worked`, which is a
SIBLING of the `interactive` path rather than a child of it:

```
node .cursor/skills/lesson-qa/scripts/scan-lesson-text.mjs apps/web/src/lessons/worked
OK: 0 learner-facing string(s) across 0 pack(s) and 672 prose-shaped run(s) across 45 widget file(s), no rendering artifacts.
```

**672 prose-shaped runs across 45 files** — a larger unswept surface than the item-bank path this
round was widened to catch (176 runs, 9 files). These files hold learner-facing figure captions, and
one of them was a live instance of P1-2, so the gap was not theoretical: a banned sentence living
there reported OK today exactly as an item-bank one did in round 1. The path list is supplied on the
command line rather than inside the script, so the fix is in the methodology:
`.cursor/skills/lesson-qa/SKILL.md` now names **four** surfaces to sweep, with
`apps/web/src/lessons/worked` among them, in both the surface list and the `Scripts` section.

### P1-4 — `widgetTaskOrder`'s control list was short a second time, and the sweep stayed GREEN over an answering control above the task line. FIXED

`apps/web/src/lessons/widgetTaskOrder.browser.test.tsx:119-146` at the pin. R24, and this is R-2's
finding, reached the way round 1 said it had to be reached: by injection, not by reading.

The guard asserts that a widget's task line precedes every control that answers it, and it found
those controls through a written-down list of class selectors. Round 1 found that list short once
and recorded that this is the kind of thing that is wrong in more than one place. It was still
short:

- `.lesson-interactive__direction-key` (`interactive/DirectionPad.tsx`), the four arrow keys that
  walk a marker across a grid, rendered by **four boards** — `CoordinateGridPlot.tsx:454`,
  `LinearSlopeTrianglePlay.tsx`, `LinearSystemGraphExplore.tsx`, `PiecewiseGraphBuild.tsx`. Pressing
  those keys IS how a learner answers `coordinate-plot-stepper`'s first round.
- Eleven `<button>` elements in widget sources carry no `lesson-` class at all, and bare `button` was
  absent from the list. Bare `input` was present, which is why the input side never showed this.

Measured, not argued. With the direction pad rendered above `coordinate-plot-stepper`'s task line
and its Check left below, the guard exactly as it shipped:

```
 Test Files  1 passed (1)
      Tests  1 passed | 188 skipped (189)
```

Green, over a board whose learner now meets four answering controls before being told what they are
for — which is the RAD.4 defect this file exists for. The population is now every `input` and every
`button` inside the widget, so a control cannot fall outside the claim by inventing a class name,
and the same injection now reds:

```
AssertionError: coordinate-plot-stepper: the control "lesson-interactive__direction-key" comes
before the task line: expected 0 to be greater than 0
```

**An exemption was written and then deleted, because it failed honestly.** Excusing restart, reveal
and re-ask as later-state controls produced:

```
AssertionError: .lesson-interactive__reset is excused as "hands back a fresh instance; it appears
on a FINISHED board rather than an unanswered one" but no board in the sweep renders it, so the
exemption covers nothing: expected 0 to be greater than 0
```

On all 190 freshly mounted boards none of the three is rendered at all, so the exemption excused
nothing while looking like carefulness. In its place is an assertion of the fact that made it
unnecessary: *an unanswered board offers nothing but the controls that answer it*. **Blast radius:**
all 189 existing ordering assertions pass with the widened population (190 with the new one), so the
widening closes the class of gap at no cost.

### P1-5 — D7's axis numbers were painted through each other, and the one destroyed was the answer the problem asks for. FIXED

Surfaced by dropping `d7` from `NOT_SWEPT_HERE`, and **graded P1 here rather than left ungraded**:
the label the caption names is illegible and its neighbour is missing outright.
`workedFigureLabels.browser.test.tsx:471`, assertion *"these figures paint one label over another,
so a learner reads them through each other"*:

```
AssertionError: expected 'd7.lf2.slope-intercept.l1 {"m":3,"b":…' to be ''
+ d7.lf2.slope-intercept.l1 {"m":3,"b":3}: "-1" over "-1" by 8.2x3.8px;
  d7.lf2.parallel-point.l2 {"m":2,"b0":6,"x1":2,"y1":3,"c":-1}: "-1" over "-1" by 8.2x3.8px;
  d7.lf2.pair-classify.l2 {"kind":1,"p":1,"q":3,...}: "-1" over "-1" by 8.2x3.8px
  ... eight draws, three templates, one cause
```

`WorkedPlane`'s window is symmetric about the origin, so both axes run through the middle of the
plot: the x numbers are a row at `originY + 15` and the y numbers a column ending at `originX - 8`,
and those bands cross just below and left of the origin. Where the zoom puts a unit at about 11px
the y label for `-1` lands on the x label for `-1`.

**What a learner wrongly concludes.** That the number immediately left of the origin is an
unreadable smudge — and on `d7.lf2.parallel-point.l2` the smudged one is `-1` on the y-axis, which
is $b$, the intercept the whole problem asks them to solve for, and which the caption then states as
`b = -1`. The y-axis `-1` is also simply **missing from its column**: the frames show `6 5 4 3 2 1`,
a gap, then `-2 -3 -4 -5 -6`.

**Frames, at 1024x580, framed to the whole figure** so the axes and the caption are in the picture
rather than a crop of the glyph that moved: `before-slope-intercept-m3-b3`,
`before-parallel-point-m2-b0-6` (whose caption reads *"pins the solid one at b = -1"* beside the
illegible `-1`), `before-pair-classify-kind1`, and an `after-` for each. All six were looked at.

Fixed at `worked/d7LF2.tsx:228-235` by dropping a y number whose box overlaps any x number's box,
which is the principle `fittingTicks` already applies at the plot edge — a tick that cannot carry a
legible number does not get one. The Y column gives way rather than the X row because the row is a
contiguous run a reader scans as a sequence, and the test is against ESTIMATED boxes, which run
wider than the ink, so a label goes slightly before the glyphs touch rather than slightly after.
Same file **15 passed** at the delivered tree.

### P1-6 — two worked examples where the prompt and the steps described different tasks. FIXED

Both found by reading all 105 steps against their prompts, which is the check no script performs,
and they come apart in opposite directions — which is the argument for reading both halves rather
than validating one.

- `POL.8.json:20` and `:24-26`: the prompt said "divide" and **no step divided**; a step asserted the
  quotient and remainder instead of reaching them, and the last step asserted that multiplying out
  "returns the dividend exactly" without multiplying anything out. The prompt now names the task the
  steps can honestly do — *"audit a reported division ... that gives a quotient of $x + 5$ and a
  remainder of $2$"* — and the steps carry out the rebuild rather than claiming it: `(x + 2)(x + 5)`
  is computed to $x^{2} + 7x + 10$, the remainder is added, and the result is compared with the
  dividend. Five steps rather than four, which is why the swept string count moved from 248 to 249.
- `POL.1.json:20`: the inverse. The steps answered a question the prompt never asked — `step[3]`
  settles whether $x^{2}$ and $5x$ are like terms, which the prompt did not request — so the last
  step arrived as an aside rather than the answer. The prompt now asks it.

### P1-7 — the lecture cut two characters that three other surfaces still referred to. FIXED

`POL.1.json:5` with `:20` and `:29`. The migration cut the two masons from the lecture while the
worked prompt and the CFU still pointed back at them, so a definite back-reference resolved to
nobody — R15's article tell, produced by the cut rather than by the original authoring. This is the
defect class the migration was most likely to create and the reason the reading pass was scoped to
every slide rather than to a sample.

### P1-8 — a hinge buried in a trailing clause. FIXED

`POL.1.json:7`, R16, found by reading consecutive sentence pairs rather than sentences one at a
time: the inverse half of the idea sat in a trailing clause of the sentence that stated the forward
half, so the two halves read as one claim.

### P1-9 — five packs' figure params are not in their speller's schema, so this round measures none of them. REPORTED

`worked_solution_params` is in the FIGURE's schema; a speller reads the TEMPLATE's drawn params. On
five re-asking packs they differ, so the speller either returns nothing or spells a different
answer, and P0-2's parity claim is unmeasurable on them:

| pack | symptom |
|---|---|
| NUM.2 | spells `integerForms(params.value)`; the figure names `lead, factor, base, power`, so it spells `0` against a key of `-3` |
| NUM.4 | reads `params.total`; figure names `varIndex, negative, positive` → nothing generated |
| LIN.1 | figure names `a, b, right, d, x0, gathered` → nothing generated for a key of `9` |
| RAT.6 | figure names `p, r, a, b` → nothing generated for a key of `3` |
| LF.4 | figure names both equations' coefficients plus `m1, m2, keepX` → nothing generated for `(2, -3)` |

**Three of them are exposed, not merely unmeasured.** NUM.2 and LIN.1 carry a `check` block, so
their authored ask still reaches the equivalence checker and the missing spellings cost a learner
nothing. **NUM.4, RAT.6 and LF.4 carry none**, so their authored ask is graded by a typed list with
nothing behind it — P0-2's defect, on three nodes in D1, D5 and D7, and this round measures none of
it. Closing it means teaching each speller to read its pack's figure params or giving the pack a
second params block, in `content/lessons/d1`, `d5` and `d7`. Both facts are encoded rather than left
in prose: `PARAMS_NOT_IN_SPELLER_SCHEMA` names all five with reasons and `REPORTED_AND_UNMEASURED`
names the exposed three, floored at 3 so the hole cannot grow quietly, asserted in both directions
so a pack that acquires a check block or becomes spellable fails until it comes off the list.

### P1-10 — every root on a solution line printed twice, and on two templates the two spellings disagreed. **RE-GRADED from round 1's P2-21.** FIXED

Round 1 reported this as redundancy, recorded `-15 | -9 | 9 | 15 | -9 | 9` as the rendered text, and
declined to change it. **It is worse than redundancy, and that is what moves it out of P2.**
`SolutionLineWorked` (`worked/d3Kit.tsx:108` at the pin) built its tick row from `[min, ...finite,
max]` where `finite` was every piece bound **and every point value**, so every marked point printed
twice — and the tick row ROUNDS, so on every draw whose root is a fraction the two spellings
disagree:

```
+     x=309.9 carries "\tfrac{2}{5}" over the axis and "0.4" under it
+     x=304.4 carries "\tfrac{1}{4}" over the axis and "0.25" under it
+     x=302.2 carries "\tfrac{7}{4}" over the axis and "1.75" under it
```

A learner reading `0.25` under the point it marks would type `0.25`, which is **not the answer the
card states and not a form the grader accepts**. A figure contradicting its own answer on the
surface that grades it is the same harm P0-1 is about, arriving by a different route, which is why it
is P1 here rather than the tidiness item round 1 filed.

Reproduced first, by a guard that reads the RENDERED figure rather than the numbers the component
derived it from — point marks found as circles, their own `cy` taken as the axis, and the question
asked is whether any label BELOW that axis sits at the x of a mark:

```
 Test Files  1 failed (1)
      Tests  116 failed | 1 passed (117)

AssertionError: d4.pol3.square-root.l1 prints 2 of its 2 marked roots twice, at {"side":9}
+ x=114.4 carries "-9" over the axis and "-9" under it
```

**Blast radius, measured over both branches: 116 draws across at least 9 templates, four of them
outside D4** (`d3.lin5.shift.l1`, `d3.lin5.coefficient.l2`, `d3.lin5.isolate.l2`,
`d3.lin5.scaled.l3`). The population is derived by WALKING the element the registry returns, so the
four `d3LIN5` figures reaching the component through a local `pairFigure` helper are inside it, which
a root-only comparison would have missed. The composition floor is asserted, because a defect
reported against D4 living in a D3 module invites a population that measures the report rather than
the component: narrowing it to D4 fails at *"the sweep has narrowed back to D4: expected 0 to be
greater than or equal to 4"*.

The tick row is now `[min, ...pieceBounds, max]`. A piece bound keeps its tick deliberately — a span
endpoint carries a circle and no label, so its tick is the only place its value is written.

**Frames, both at 1024x580, both framed to the whole reveal card** rather than cropped to the axis,
which matters because the change moves labels inside a fixed `viewBox`. BEFORE (defect restored):
under the axis the tick row reads `-6  -4  1.5  4` while above it the two points read `-4` and
`\tfrac{3}{2}` — `1.5` and `3/2` being one root spelled two ways on one figure, six lines under a
passage stating the answer as `{-4, 3/2}`. AFTER: `-4` and `\tfrac{3}{2}` over the axis, and under it
only the window's ends, `-6` and `4`, with the caption and the re-ask button in shot and unoccluded.

## P2 findings

### Fixed

**P2-1 — POL.2's "common measure" name drift returned.** `POL.2.json:6`; quoted in full under
"Settle 1" above, since it was also a reconciliation row.

**P2-2 — `POL.8.json:9` opened on "the agreement" as a definite back-reference to nothing.** R15's
article tell again, created by the lecture cut.

**P2-3 — `POL.1.json:9` used "leading term" and "leading coefficient" ten times, glossing neither.**
R32. Glossed now.

**P2-4 — `d4.pol4.formula.l3` printed a negative number raised to a power without brackets.**
`packages/item-bank/src/d4/nodes/POL.4/index.ts:222` at the pin printed *"The discriminant is
$-3^{2} - 4 \times 2 \times (-14) = 121$, whose square root is $11$."* — and `$-3^{2}$` is $-3$, not
$9$, so the equation as printed is false **by exactly the precedence rule the step is teaching the
learner to respect**, while the same node's L2a step already brackets it. `b = a * q - p` is negative
whenever `a * q < p`, which enumerating the draw space puts at **8.7% of draws, about one in eleven**;
none of the 175 served items draws a negative `b`, so it is latent on the shipped pool, which is what
keeps it at P2. Reproduction written first, as a new sweep that was red before the fix:

```
FAIL  packages/item-bank/src/d4.test.ts > no D4 step raises a negative number to a power without brackets
+ d4.pol4.formula.l3 (step 1): The discriminant is $-3^{2} - 4 \times 2 \times (-14) = 121$,
  whose square root is $11$.
```

Green over 10,000 draws and 175 served items after the fix. Its third case pins what the pattern must
NOT forbid: `$36-40^{2}$` is a subtraction and stays legal, as do `$(-6)^{2}$` and `$-x^{2}$`.

**P2-5 — the pre-commit answer colour is real, and round 1 named the wrong widget.** R26. Round 1
reported `common-measure-classify`'s "pair readout" turning `CIVIC` before the learner commits and
declined to change it on a reading alone. **The first finding is that the named widget has no such
readout at all**: a 1024x580 frame of it untouched shows `12x^2 + 18x` over four option buttons —
`3`, `6x`, `2x`, `6` — all neutral navy on white, no slider, no readout, and no `4 + 9 = 13` on it.
The defect is on **`interactive/FactorPairStepper.tsx:148`**, whose sum readout went `--civic` on a
scrub position with "Use this pair" still on offer.

Round 1's reason for leaving it was that the colour is not the only signal, since the readout also
prints `4 + 9 = 13` beside a trinomial whose middle coefficient is 13. **The frames refute that:** the
words are the same words at every dial position, so the only thing that changes as the learner scrubs
is the colour, and the colour arrives exactly on the answer — "find the pair whose sum is the middle
coefficient" becomes "drag until it turns green". Because at 14px `--civic` and the neutral label are
hard to separate by eye, the readout row was magnified 6× in both frames; magnified, the before is
plainly deep green. The readout is now neutral until the pair is COMMITTED, and verdicts the learner's
own pick after a Check.

### Reported, not fixed

**P2-6 — the lecture's squared spelling has no counterpart in the pool it leads into.** POL.2's
worked example 4 ends *"the two sides are identical: $x^{2} + 20x + 100 = (x + 10)^{2}$"*, the only
spelling the lecture ever shows for a repeated factor, while `d4.pol2.trinomial.l2` draws `p` and `q`
independently from `[2, 9]`, so `p === q` on **22 of 200 draws (11%)** and keys the same polynomial as
`(x + 5)(x + 5)`. **0 of the 175 served items** carry one, so the divergence is latent on the frozen
pool and live on any fresh draw. The grading half is clean and was measured rather than assumed: the
ASCII form a learner types, `(x + 5)^2`, IS graded correct against that key on all 22. So the exposure
is notational, and whether a perfect square belongs in the monic-trinomial cell is a content-design
call rather than a defect in a generator. A new guard,
`packages/item-bank/src/d4LectureNotation.test.ts`, derives its population by the SHAPE OF THE KEY —
any key repeating a bracket, whatever template drew it — rather than by template name, floored at 20
against the 22 measured.

**P2-7 — the lecture teaches a monomial common factor the pool never practises and the field cannot
read.** POL.2's worked example 1 takes the common measure out of $6x^{2} + 15x$, ending
$6x^{2} + 15x = 3x(2x + 5)$, while POL.2's five practice shapes take a NUMERIC common factor only.
The item bank records why at `POL.2/index.ts:20-26`: a monomial GCF can only be keyed `3*x*(x - 4)`,
and the natural `3x(x - 4)` a learner types is refused `invalid_input / unsupported_syntax`. **The
grader half is the item bank's claim, not re-measured this round**; the content half — the lecture's
second example teaches the one factoring shape the whole node avoids — is verified by reading both.
Nothing grades wrong today because no item asks for it. **It becomes a P0 the moment any CFU or
template does**, which is why it is recorded rather than closed.

**P2-8 — 11 of 25 D4 widgets carry no instance-disclaiming comment.** The reconnaissance claim that
every D4 widget carries one is false: measured, **14 of 25 carry one, 11 do not**
(`stone-pieces-sorter`, `subtract-sign-spot`, `factor-pairs-match`, `common-measure-classify`,
`difference-squares-drag`, `perfect-square-sorter`, `complete-square-drag`, `complete-square-table`,
`formula-parts-label`, `discriminant-sorter`, `remainder-estimate`). A learner concludes nothing from
this, so it is P2; what it costs is the next reviewer, who reads "every widget source carries a
comment saying so" and checks 14 of 25. **The substantive claim behind it holds and was verified
rather than trusted** — see Coverage.

**Two near-misses on the widget-instance rule, SETTLED as near-misses and not edited.** Same shape
with different numbers is correct and expected; the same NUMBERS are the defect. Both were re-opened
deliberately, because a near-miss and a defect look identical from outside the pack, and the
reasoning now lives in the widget source rather than in a report nobody reads next round.

- `interactive/DivideRebuildBuilder.tsx:38`, POL.8 slide 0. Board 2 is `{ p: 5, q: 2, r: 7 }`, so its
  bracket pair is the slide's pair swapped, and `(x + 5)(x + 2)` is the product the worked example now
  prints as $x^{2} + 7x + 10$. A shared shape on three counts of difference: the board audits
  $x^{2} + 7x + 17 \div (x + 5)$ against the slide's $x^{2} + 7x + 12 \div (x + 2)$, its remainder is
  $7$ against $2$, and the swap puts $x + 5$ in the DIVISOR role the slide gave to $x + 2$. The test
  that settles it: **a learner arriving with the worked example memorised gets board 2 wrong**, which
  is the tell that it is a fresh audit rather than the same one twice.
- `interactive/CompleteSquareTable.tsx:27`, POL.4 slide 1. Board 1's `shown: [6, 12]` displays a
  worked row for $x^{2} + 12x$ where the slide's example is $x^{2} - 12x$ — same magnitude, opposite
  sign, and the sign is the entire subject of the slide. More decisively it is a SHOWN row rather than
  a blank: what the learner answers is $8$ and $-10$, neither of which appears in any of POL.4's five
  worked examples.

**P2-9 — `skill_graph.json`'s `POL.4.prereqs` omits POL.3.** The cause behind two of P1-2's judged
rows: POL.4 teaches solving quadratics by completing the square and does not list the pack that
teaches solving quadratics at all. Fixing it is a graph change with gating consequences, so it is
reported.

**P2-10 — `d7LF2.tsx`'s line key still cannot be made to collide.** R-3, and still unfixable in the
sense round 1 meant: `WorkedPlane` has exactly three callers, the two two-line callers' generators
each forbid the collision explicitly (`LF.2/index.ts:150-152` loops until `c !== b0`; `:210-212` loops
until `e !== b1` on the only `kind` with equal slopes), and rendering all 20 D7 templates and 260
draws in a real browser produced no `console.error` and no stderr at all — measured absence over the
population, where round 1 had absence over the frozen pool only. What is worth reporting rather than
fixing: the key's correctness is enforced **in another package, by two `while` loops, with nothing
tying them to this file.** A future draw that legitimately wants a degenerate pair — a "same line"
fourth classification is the obvious one — reintroduces the collision silently.

**P2-11 — D4 still has no snapshot file of its own.** Every other domain's practice pool is pinned in
`packages/item-bank/src/__snapshots__`; D4's 175 items are not. Round 1 filed this and it is still
true.

## Guards added or widened this round

Every one of these owes a demonstrated red, because an assertion written green may be asserting
nothing. The red is quoted above beside the finding it belongs to; this table is the inventory.

| Guard | New or widened | Population, measured | Red demonstrated |
|---|---|---|---|
| `cfuAuthoredAskParity.test.ts` | new | 54 packs serving a computed re-ask and spelling their own answer; 30,080 generated spellings owed | Red at the pin without injection: the 32-pack block. Three floors bumped; exemption forced false in both directions |
| `cfuVariantGrading.test.ts` | widened | `RE_ASKING`: 59 packs (23 checked, 36 check-less), 159 probes, 102 owed | Old filter and old key restored: four floors red |
| `practiceUnreducedEquivalent.test.ts` | new (R-7) | 11 pools resolved through a namespace import, 2,121 served items, 128 keying a ratio, 90 owed, 38 excused | Three injections into product code, all reverted; the first quoted in full |
| `d4.test.ts` negative-base sweep | added, 3 cases | 25 templates × 400 draws + 175 served | Red before the fix, quoted at P2-4 |
| `d4LectureNotation.test.ts` | new | derived by key shape from the served pool AND the parameter space, floored at 20 against 22 measured | — (a measurement of a reported divergence, not a fix) |
| `solutionLinePointLabels.test.tsx` | new | 116 draws across ≥9 templates, ≥4 outside D4, derived by walking the registry's element tree | 116 of 117 on the defect; *"the sweep has narrowed back to D4"* on the population |
| `preCommitVerdictColour.browser.test.tsx` | new | 20 sliders, 18 beside a commit control, **1,508 colour readings** across each dial's whole domain | Defect re-injected; `DIAL_IS_THE_COMMIT` forced false three ways |
| `threeSectionFlow.browser.test.tsx` | widened to D4 | `d1Lessons` ∪ `d4Lessons`, floors total ≥ 11, d1 ≥ 6, **d4 ≥ 5** | Three: the defect naming all five D4 packs, the total floor, and the composition floor with the total held at eleven |
| `widgetTaskOrder.browser.test.tsx` | widened | every `input` and `button` across 190 boards | Answering control above the task line: green before, red after |
| `practiceSweep.ts` + its four consumers | widened to D7 | 246 templates, 3,554 figures, 25,526 labels | `TEMPLATE_FLOOR` 202 → 227 injected by deleting `...D7_PRACTICE_TEMPLATES`: *"expected 226 to be greater than or equal to 227"* |

Two notes on the floors, because both are the kind that look like arbitrary numbers later.

**227 is a measurement, not a target.** At 246 templates the four subtractions are 221 without D3, 221
without D4, **226 without D7** and 201 without D9, so 227 is the smallest number that fails on any of
the four going missing. **For D7 that floor is the only thing holding it in:** D3, D4 and D9 are each
named in `visualsMath.test.tsx:391-405` and D10 by four GEO tests, so each of those fails twice if its
registry leaves, while D7 is named nowhere and subtracting it leaves every other assertion in both
sweeps passing. That asymmetry is written into the comment above the floor.

**`d4 ≥ 5` exists because a floor constrains size, not shape.** Eleven packs is satisfied by eleven
packs from one domain, and `threeSectionFlow`'s shipped sweep was exactly that until this round.

## Coverage, every number measured at this pin

**The three-section prose, which is what was new.** 25 of 25 `mini_lesson` entries are exactly **three
sentences** — no pack needs the fourth the budget allows and none reaches the fifth that is an error.
25 prompts, none over the 2-sentence cap (17 at one sentence, 8 at two). **105 steps** read against
their prompts: each makes one move, each follows from the last, each final step names the result. All
25 subtitles read in sequence **as one list** rather than one at a time, which is the only way the
recurrence R14 is about becomes visible; all 25 cold openings checked for the article tell; all 25
lectures read as consecutive sentence PAIRS for R16.

**Arithmetic.** 80 polynomial claims verified mechanically — expand each claimed factorisation, run
each synthetic row, evaluate each substitution, compare against the authored result — reporting *"80
arithmetic claims checked, 0 failed"*, and the remaining claims by hand. **No arithmetic defect was
found in the new prose.**

**Widget-instance duplication (R34 section 3), verified rather than trusted.** All **25** slide/widget
pairs compared, and two passes were needed: a string comparison flagged 10 pairs, every one of which
was a match inside the widget's own DISCLAIMING COMMENT — the opposite of the defect. Re-run against
code with comments stripped: **0 of 25** share a maths run. Because widgets build instances from board
parameters rather than literal strings, all 25 board tables were then read by hand against their
worked prompts, resolving each parameter against its documented meaning. **No worked example works the
instance its slide's widget asks for.**

**Terms.** 27 bolded terms across the five packs, recounted from scratch rather than reusing round 1's
counts, since the migration rewrote the sentences that carried them. Every technical term in the
corpus is bolded somewhere except "common measure", "long division" (POL.8's own title phrase) and six
ordinary-register words. The one that deserved an argument is **"common measure"**, used seven times
and bolded nowhere: genuine Euclidean vocabulary rather than a coinage, which suits D4's Classical
era, and after P2-1 the prose equates it to the modern **greatest common factor**, so a learner can
look the real term up. Earned, not invented.

**Prose pinned by guards.** Before each edit, **2,236 files** under the worktree root were searched for
literal fragments of every sentence about to change. One hit outside `content/` —
`worked/d4POL4.tsx:206`, P1-2's third copy. No test or guard in the tree pins any D4 sentence this
round changed.

**Grading.** All five CFU keys graded on **both** rendered instances through `gradeCfuAnswer`, the
function the card actually calls; 54 packs measured for authored-versus-re-ask parity; 10 D4 instances
probed against the shared checker. On the practice side, **2,121 served items across 11 pools**, of
which 128 key a literal ratio, 90 are owed an unreduced equivalent and **180 unreduced spellings were
graded, 0 refused**.

**Item bank sweeps** re-measured rather than quoted, and none has drifted: 175 served items, 25
templates, 25 frozen slots, 5 nodes; 10,175 prompts checked for a zero coefficient; 70,000
learner-visible strings for a unit coefficient; 2,400 ladder draws; 2,000 reshuffles.

**Figures.** The layout sweep went from 226 templates / 3,294 figures / 22,859 labels to **246 / 3,554
/ 25,526**, with the non-connector collision count at **0** either side. D7 contributes +20 templates
and +260 figures. The label total needs one explanation so it does not read as drift: measured with
`d3Kit.tsx` held constant, D7's own contribution is **+2,899 labels** (22,859 → 25,758), and the fall
to 25,526 is **−232 labels** from P1-10's fix, which removed duplicate tick labels from D3's and D4's
solution-line figures — a fall in label count with no change in figure count, which is exactly its
signature. Read 25,526 as the delivered tree.

**What this round did NOT cover, named rather than left out.**

- **`threeSectionFlow`'s population — SUPERSEDED at the merge, see the last section.** At the pin this
  round widened the sweep from D1 to D1 ∪ D4 and left D2, D3, D5, D6, D7 and D8 outside it, as a
  decision rather than a claim they were covered. Integration widened the same sweep further in
  parallel, to every migrated pack; that version is the one delivered, and only D6 is outside it now,
  because D6 is wholly unmigrated.
- **R33 (copy after a miss) was not swept.** Widget feedback copy was read in the D4 widgets opened for
  the instance check and nothing led with the penalty, but all 25 were not audited systematically.
  **Claimed but unverified as a sweep.**
- **Reconciliation rows 2, 9, 12, 13 and 14** are **claimed but unverified**, for the reasons given in
  the table.
- **Three guards were audited by READING, not by injection** — `widgetRevealFill`, `stepChipMath`,
  `equationRowCheckPlacement`. Each has a derived population and no enumerated carrier list to be
  short, which is the argument for reading them; it is still an argument. **Claimed but unverified.**
- **P2-7's grader half** is the item bank's claim, unverified this round.
- Two of the three R-7 injections had their VERDICT read off the run without the failure text being
  kept, so those two reds are **claimed but unverified as literal quotations**; which assertions moved
  is what was read.

## One incidental change, named so it is not mistaken for scope creep

`package-lock.json` carries a **one-line** addition: `"@cr/item-bank": "*"` under
`services/diagnostic-api`. That package's `package.json` at `origin/integration` already declares the
dependency and the lockfile did not record it, so `npm install` in a fresh worktree repairs the
desync. It is kept rather than reverted because the direction is correct — a lockfile that does not
satisfy its own `package.json` is what breaks `npm ci` — and it is named here because it is the one
change in this branch that has nothing to do with D4.

## Handoffs closed at the end of the round

Five findings crossed stream boundaries and were closed after the streams landed, each with a forced
red rather than an argument.

**`AdvisorLesson.tsx:150` defined the opening section twice — FIXED.** Every other transition derives
the section from `sectionsFor`; slide 0's opening was a literal `section: "lecture"`, so the walk
order had two definitions and `teachingSections.ts:26-31` says explicitly that one reader exists
because "four callers have to agree". The evidence is a comparison rather than a single run: with
`sectionsFor` made to return a different first section, the DERIVED version reds on all eleven packs
at *"the widget is on screen while the idea is still being explained"*, and with the literal restored
the same breakage reports `1 passed`. The literal was blind to exactly what it should have caught.

**`d6`'s figure-sweep exemption was one-way — now asserted both ways with a floor.** Its three
assertions tested MEMBERSHIP and none read the `why`, so the entry could go on excusing a domain
after the reason stopped being true. Both sweep files now assert that every listed domain has **no**
registered figure, that every bank domain with no registered figure **is** listed, that each listed
domain has at least 20 templates so the exemption cannot rest on an empty set, and two floors so the
census cannot pass by measuring nothing. Both directions forced false, and **re-measured at the
current tip** because `practiceSweep.ts` moved after the first attempt:

```
AssertionError: these declared gaps now have a registered figure, so the reason they are excused has
stopped being true: d1=34/34 ... d6=1/55 d7=20/20 ...: expected [ 'd6' ] to deeply equal []

AssertionError: these bank domains have no registered figure and are not declared as a gap:
d1=34/34 ... d6=0/55 ...: expected [ 'd6' ] to deeply equal []
```

**The unglossed term had five live copies, not three.** `worked/d4POL4.tsx:206` and
`worked/d4POL3.tsx:99` were on a stream's list; **`interactive/CompleteSquareSolver.tsx:337` was on
nobody's**, and it was caught by `scan-lesson-text.mjs` failing the gate after the ledger gained ban
entries for the phrasing. That is the P1-3 path-widening earning its keep on the same day it was
made, and it is the argument for banning a phrasing rather than fixing its known instances.

**`widgetActiveSlot.browser.test.tsx:399-408` — the reading was right, and the failure mode was worse
than a short list.** Renaming `lesson-interactive__chip` on `AbsUnionBuilder.tsx` did not fail the
sweep: the board **silently left the population** and the floor of 3 was still satisfied by the three
that remained, so the run reported `3 passed`. A floor cannot see a member leaving while another
stays. Fixed the way `widgetTaskOrder` was, plus the two things a floor does not buy: `KNOWN_MEMBERS`
asserts the population's composition, and a new test proves each `NOT_ANSWERING` exclusion is both
real (it matches a control on a candidate board) and load-bearing (re-including it moves the derived
population).

**The two R34 near-misses were settled as near-misses**, quoted above under P2.

## Verifying the combined tree

Every link was run ALONE, never chained, because a chain aborts at the first failure and reports
nothing about the suites behind it. `format:check`, `lint`, `typecheck`, `check:lessons`, the
validator and the scanner were re-run after the last source edit; these are the re-runs.

| # | Link | Literal result | Exit |
|---|---|---|---|
| 1 | `npm run check:lessons` | `check-lesson-packs: 10 domain(s) passed at the error tier.` | 0 |
| 2 | `validate-lesson-pack.mjs --strict content/lessons/d4` | `OK: 5 lesson pack(s) passed validation.` | 0 |
| 3 | `scan-lesson-text.mjs` (four paths) | `OK: 249 learner-facing string(s) across 5 pack(s) and 4484 prose-shaped run(s) across 317 widget file(s), no rendering artifacts.` | 0 |
| 4 | `npm run format:check` | `Checked 1769 files in 2s. No fixes applied.` | 0 |
| 5 | `npm run lint` | `Checked 1776 files in 5s. No fixes applied. Found 39 warnings. Found 23 infos.` | 0 |
| 6 | `npm run typecheck` | `tsc --build`, no diagnostics | 0 |
| 7 | `npm run check:graph` | `All graph invariants PASS.  (87 hard edges over 62 live nodes)` | 0 |
| 8 | `npx vitest run --project web-reachability` | `Tests  276 passed (276)` | 0 |
| 9 | `npm run test:unit` | `Test Files  32 failed \| 468 passed \| 2 skipped (502)` / `Tests  84 failed \| 11132 passed \| 2 skipped (11218)` | 1 |
| 10 | `npm run test:browser` | `Test Files  33 failed \| 191 passed \| 5 skipped (229)` / `Tests  77 failed \| 2393 passed \| 140 skipped (2610)` | 1 |

**Links 3 and 4 failed on their first run and were fixed rather than waived:** link 3 found the fifth
copy of the unglossed term, link 4 found six unformatted files.

**Link 3's count reconciles with the P1-3 measurement, which is worth checking rather than assuming:**
the three-path invocation reported 3,812 runs across 272 files and `worked/` alone reported 672 across
45; the four-path invocation reports **4,484 across 317**, and 3,812 + 672 = 4,484 with 272 + 45 =
317. The widened path is measuring the surface P1-3 named and not some other one.

**Typecheck was verified rather than trusted**, because `tsc` exits 0 over a config that includes
nothing. A deliberate type error was appended to **all 14 files this round changed** and `npm run
typecheck` reported **14 errors, one per file** — every changed file named, including the three
`.browser.test.tsx` files and `packages/item-bank/src/d4/nodes/POL.4/index.ts`. Probe removed;
`git grep __TYPECHECK_PROBE` returns nothing.

### Triage: two failures were this round's own doing, both fixed

| Failure | Verdict | Evidence |
|---|---|---|
| `visualsMath.test.tsx` › *names every domain it leaves out, and leaves out no domain it names* | **caused by this round — FIXED** | The `d6` two-way refactor left `bankDomains()` returning `new Set(bankTemplateIds())` — template IDs, not domains. Red: `expected [ Array(301) ] to deeply equal [ 'd6' ]`. Fixed to map through `domainOf`; green at **1106 passed**. |
| `d5CfuAcceptance.test.tsx` › *still rejects every misconception answer* | **exposed by this round; the EXPECTATION was the defect — FIXED** | Red: `+ RAT.2: "(x + 7)/(x + 4); x = 7, -4, -6" was ACCEPTED`. See below. |

The second is the one worth reading in full, because the obvious verdict is the wrong one. Two entries
sat in `MISCONCEPTIONS` on the ground that *"the prompt demands increasing order"*. **The pack
disagrees with that in its own hand-typed list:** `content/lessons/d5/RAT.2.json` accepts
`x = -6, 7, -4` (`:65`), `x = -4, -6, 7` (`:66`) and `x = 7, -6, -4` (`:67`), three spellings that are
not smallest-first either — read at the tip rather than taken from the report. Graded through the real
card over all six permutations of the correct excluded set, **all six are accepted, four of them
already in the pack**. So order was never a rule this CFU enforced, and an answer naming the right
expression and the right three excluded values holds no misconception to catch. P0-2's widening did
not open a hole; it stopped the authored ask being stricter than its own retry, which is what made a
mis-stated expectation falsifiable for the first time.

**Withdrawing a case narrows a sweep, and that owes the same evidence as a fix.** Two things were done
rather than argued. First, the ground was made assertable: a new test asserts that the pack still
hand-lists at least three not-smallest-first spellings AND that the grader accepts every permutation,
so a later decision that order does matter fails here and names the pack that has to change with it.
An intermediate version of it used `order[0] !== -6` as a proxy for "not smallest first", which
mis-counts `-6, 7, -4`; it red at `expected 2 to be greater than or equal to 3` and was corrected to
test sortedness directly. Second, **the narrowed sweep was injected to prove it still catches what it
was written for** — a genuine RAT.2 misconception (`x = -6, -4`, the flipped divisor's numerator never
excluded) added to the pack's own accepted list:

```
FAIL  d5CfuAcceptance.test.tsx > still rejects every misconception answer
+ RAT.2: "(x + 7)/(x + 4); x = -6, -4" was ACCEPTED
```

RAT.2 keeps 7 misconception cases against the file's floor of more than 5. The injection was reverted
and `git status` on `content/lessons/d5/` reports nothing.

That injection also produced one incidental piece of evidence worth recording, because it looks like a
defect and is not: inserting the string FIRST in the accepted list also red the new set-grading test
at two permutations. The authored key falls back to `cfu.accepted[0]`, so a wrong `[0]` makes the
speller fail its own precondition — the pack's answer no longer comes back out of the speller — and
the generated widening switches OFF, leaving only the hand-typed spellings. That is P0-2's safety
precondition working as described, observed from the outside.

### Triage: the other 159 failures, each settled by its own re-measurement

**Nothing was dismissed on resemblance to a known flake.** 49 of the 77 browser failures were bare
`Test timed out` and most of the rest `locator.screenshot: Timeout 5000ms exceeded` — reached before
any assertion.

| Group | Verdict | Evidence |
|---|---|---|
| 13 `@cr/web` unit files (`buildMenuPreview`, `carryBackReachesTheIsland`, `lessonMountSteps`, `HardWinterSurface`, `CompletionCeremony`, `DiagnosticRunner`, and 7 more) | contention | Re-run as one group at a raised timeout: **12 of 13 files pass, 336 passed / 1 failed**. All had failed with `Test timed out` or `[vitest-pool]: Failed to start forks worker`, never on an assertion. |
| 7 `packages/item-bank` files (`d5`, `practice`, `template`, `templateTermination`, `walk`, `practiceWalk`, `diagnostic-scope`) | contention | Re-run as one group: **109 passed, 0 failed**. |
| 8 `repo-hygiene` files | contention | Whole project alone: all 8 pass, **43 files passed**. |
| `widgetVariantPool` › *variant pool deals distinct boards* | contention | The only other assertion-shaped unit failure. Alone: **256 passed**. |
| **The five browser files this round could plausibly have broken** — `svgHitTargetCentering`, `workedFigureLabels`, `cfuAuthoredFigureShots`, `DifferenceSquaresDrag`, `completeSquareDragViewBox` | contention | Re-run as one group: **50 passed, 0 failed**. `svgHitTargetCentering` was the only genuine assertion in the entire browser run, and it named POL.2 and POL.4 — *"the long edge labeled … sits -0.0px across and 1.5px down from its slot's centre"* — so it was checked rather than waved through, and it is green in isolation. |
| 25 further browser files, in five groups | contention | Green in smaller runs: 5 of 10, then `labelFigureNarrow` alone (**8 passed**), then a four (**41 passed**), two pairs (**9**, **11**), two pairs (**9**, **4/2 skipped**), two threes (**4**, **5/1 skipped**). |
| `ciScopeFilter` (27) + `ciGateAggregation` (7) | environmental, **reproduced** | `/bin/bash: C:UserszhengAppDataLocalTempci-gate-aggregation-….sh: No such file or directory` — WSL `bash` eats the backslashes out of a Windows temp path. Reproduced on clean `integration` @ `09c9c5d1`, byte-identical cause. |
| `era4ExporterCli` (1) | environmental, **reproduced** | `EPERM: operation not permitted, symlink` — Windows refuses symlinks without elevation. Reproduced on clean `integration`. |
| `crisisPanelFitsItsContent` (2) | environmental, **reproduced** | Fails ALONE on its own precondition: *"none of DejaVu Sans, Liberation Sans, Arimo, Noto Sans, Inter, Cantarell, FreeSans, Nunito is installed, so the worst case cannot be measured here"*. Reproduced on clean `integration`. |
| `winterConclusionSheet` (1) + `winterInCitySheet` (1) | pre-existing, **reproduced** | Both still fail after isolation at `waitFor timed out: the crisis panel renders`. Reproduced on clean `integration`, same message on both. |
| `product.test.ts` › `>=1000 samples` (1) | pre-existing, **reported not re-pinned** | Measured at **62,864 ms in its own process** against its hardcoded 60,000 ms budget. The budget was not touched. Round 1 measured 97.5 s and 107.9 s on its two trees, so it is closer to its cap now and still over it. |

**One honest limit.** `carryBackReachesTheIsland` gave red in the group, red once ALONE, then green
alone. It is called contention on the strength of that green in this worktree, and **the clean-
`integration` green is explicitly discounted**: integration is 186 files and 16,342 insertions ahead
of the pin in `city/` and `winter/`, so its result says nothing about this tree. A guard that passes
and fails alone on the same tree is reporting the machine, but three runs disagreeing is the whole of
the evidence and it is recorded as such rather than rounded to "flake".

**Frozen content at delivery.** `git hash-object
packages/item-bank/src/__snapshots__/product.test.ts.snap` = `99c4fac7d14ba1673120794c4aa9f9d9576de209`,
`git status` reports the file unmodified, `vitest -u` was never run and no snapshot was re-pinned.

## Merge: what this branch measured at the pin, and what is true of the tree it delivers

Everything above is evidence about `68c5aa9a`. The branch was then merged with `origin/integration` at
**`c3059340`, 121 commits ahead of the pin**, as merge commit `316c9ce3`. A merge target is not the SHA
anything above was measured at, so superseded figures are listed here with their measured replacements
rather than edited into the text, and **the gate table above is a statement about `573fdbe4`, before
the merge.** The eleven suites the merge touched were re-run individually on the merged tree; the full
`test:unit` and `test:browser` were not, because re-running them locally would mostly be measuring
other people's 121 commits, and CI runs the whole gate against the merge result.

Six files conflicted. Two of the resolutions are findings in their own right.

**This round's `threeSectionFlow` widening was superseded by a wider one, and was not reinstated.** The
pin widened the population from `d1Lessons` to `d1Lessons ∪ d4Lessons`, floors 11 / d1≥6 / d4≥5. In
parallel, integration derived it from `LESSON_DOMAINS` filtered on `Array.isArray(worked_examples)`, so
the population is every migrated pack and a domain cannot join the app without joining the sweep. That
is the argument P1-1 makes, applied harder, so **integration's version is the one delivered** and this
round's was dropped rather than merged: reinstating it would have narrowed 48 packs to 11. Census
measured on the merged tree: `d1=6 d10=2 d2=5 d3=5 d4=5 d5=6 d7=4 d8=6 d9=9` — 48 packs, 9 domains, 42
beyond D1, which independently re-measures integration's three floors as correct. One thing their
version lacked is added on top: a `D4_FLOOR = 5`, shown red by relabelling D4's packs inside the
derivation, an injection that holds their 48 / 9 / 42 green and fails only at *"d4 has fallen out of
the measured population… expected 0 to be greater than or equal to 5"*. **12 passed.**

**Two consecutive rounds found the scanned-path list short in different places, which is a finding
about the list rather than about either path.** P1-3 named `apps/web/src/lessons/worked` (672 runs, 45
files). D2 round 1's own P1-3, already on integration, named `apps/web/src/lessons/cfuVariants.ts`
(+320 runs over 1 file) — every domain's CFU-variant hints and worked solutions, in a file beside the
widget directory rather than inside it. **Neither path reaches the other**, so the merged invocation is
**five** paths and both rounds' evidence is kept in the skill, along with the sentence neither round
could write alone: a list of directories named one at a time will keep coming up short, so "is there a
surface holding learner-facing prose that no named path opens" is a question to re-ask each round
rather than a list to inherit. Re-measured for D4 on the merged tree: **299 learner-facing strings
across 8 packs, 5,189 prose-shaped runs across 335 files**, exit 0.

| Claim above, measured at `68c5aa9a` | On the delivered tree `316c9ce3` |
|---|---|
| `TEMPLATE_FLOOR` 202 → **227**, census 246, subtractions 221 / 221 / 226 / 201 | **248**, census **267** (`d1=34 d10=10 d2=27 d3=26 d4=40 d5=30 d7=20 d8=31 d9=49`), subtractions 241 / 227 / **247** / 218. Neither 227 nor integration's 222 is a floor on this tree: at 222, deleting D7's registry clears it with 25 to spare. Red at 248 by deleting `...D7_PRACTICE_TEMPLATES`: *"expected 247 to be greater than or equal to 248"*. **D7 is now the binding registry as well as the only one of the four named nowhere else**, so the asymmetry P1-5's floor was written for is sharper, not weaker. |
| Validator: `5 lesson pack(s) passed` | **8 packs** — POL.5, POL.6, POL.7 from integration, none reviewed here |
| Scanner, four paths: 249 strings / 4,484 runs / 317 files, reconciling as 3,812 + 672 | Five paths: **299 strings across 8 packs / 5,189 runs / 335 files**. The pin's reconciliation is left as written, because its job was to show the widened path measured the surface P1-3 named. |
| Figure sweep: 246 templates / 3,554 figures / 25,526 labels | 267 templates. The figure and label totals were **not** re-measured on the merged tree. |
| `BANNED_PHRASES`: 70 entries | **88** = 58 at the base + 14 from this round + 16 from integration |
| `threeSectionFlow`: 11 packs, floors 11 / 6 / 5 | 48 packs over 9 domains, floors 48 / 9 / 42, plus `D4_FLOOR = 5` |

**`d6`'s two-way exemption still holds on the merged tree**, worth checking rather than assuming, since
the point of the second direction is that it fails when the reason stops being true: D6 has gained no
registered figure. `visualsMath.test.tsx` **1149 passed**, `workedFigureLabels.browser.test.tsx` **16
passed**.

**Integration's new D5 misconception case survives this round's grading widening.** D2's lane added
`"(x + 7)/(x + 4); x = 6, 4, -7"` (every sign flipped, the factors read off as the zeros) to
`d5CfuAcceptance`. P0-2 made every authored ask more permissive, so this is exactly where a regression
would surface: it is **still rejected**, proven by substituting the pack's own accepted answer into
that slot and watching the case red rather than by the file passing. **26 passed.**

**Post-merge links, each run alone:** `check:lessons` 10 domains, validator 8 packs, the five-path
scan, `format:check` (1,886 files), `lint` (44 warnings / 24 infos, all pre-existing), `typecheck`,
`check:graph`, `web-reachability` **300 passed**. Suites: `threeSectionFlow` 12, `visualsMath` 1149,
`workedFigureLabels` 16, `d5CfuAcceptance` 26, `cfuAuthoredAskParity` 9, `cfuVariantGrading` 3,
`widgetActiveSlot` 4, `widgetTaskOrder` 210, `solutionLinePointLabels` 117, `preCommitVerdictColour` 9.
Snapshot unchanged at `99c4fac7…de209`.

**One post-merge failure, triaged.** `packages/item-bank/src/d4.test.ts`: **48 passed, 1 timed out** —
the self-validation sweep at 144 s against a 120 s cap that pre-dates this branch. Alone it passes in
**104.84 s**. This branch adds no D4 template; the registry grew from 25 to 40 through integration's
POL.5–POL.7 authoring, which is what moved the sweep toward its cap. **The cap was not raised**, since
raising a cap to accommodate someone else's growth inside a QA branch hides the trend. Whether it also
breaches on integration's tip alone needs a checkout and is **claimed but unverified**.

## The widening tripped another lane's named exception, which is the mechanism working

CI on the merged branch came back with **one** failure out of 574 unit files, and it was not a D4 file:
`apps/web/src/lessons/cfuRootAsterisk.test.ts`, added by D2 round 1 on 2026-08-04, reporting

```
RAD.1 now accepts "(6*√2)/5", so it is no longer a nesting this file
declines to require and must come off the list
```

That file keeps a `NESTED_NOT_OWED` list: spellings with the asterisk buried inside bigger notation,
which an earlier round decided **no pack owes**, each named with a reason and asserted **in both
directions**. P0-2's widening made RAD.1 accept the bracketed one, so the exemption stopped being true,
and direction two said so **in the same run** rather than leaving a stale excuse to hide the next
spelling that arrives. This is the shape `.cursor/rules/qa-verification.mdc` prescribes, caught working
by a lane that had never heard of this branch, and it is worth more than the fix: the alternative
design, a quiet filter, would have gone green while the list described a refusal that no longer
existed.

**Resolved by strengthening, not by re-declaring.** Accepting `(6*√2)/5` is *correct*: it derives from
RAD.1's own accepted `(6√2)/5`, it is the same value, and the asterisk is what the pack's worked
solution teaches. So the entry came **off** the list and into `OWED`, where the file now **requires**
the acceptance, and `OWED_FLOOR` moved 4 → 5 so the widening cannot be undone by putting the entry
back: re-declaring it drops `OWED` to 4 and reds the floor.

**Forced red, because a requirement added green may be asserting nothing.** Neutralising the widening
at `cfuChecker.ts:285` (`return false && …`) fails the new case at *"RAD.1 accepts `(6√2)/5` and
refuses `(6*√2)/5`, which is the same answer with the root glyph and the multiplication sign its worked
solution teaches"* — 10 passed with the fix, 9 passed / 1 failed without it — and the injection was
reverted. `cfuAcceptanceConvention.test.tsx`, the file whose bar the exemption cited, and
`cfuAuthoredAskParity.test.ts` are green together at **115 passed**, so nothing else in that convention
moved from refusing to accepting.

**One triage claim above is retired by the same run.** The pre-merge table recorded
`packages/item-bank/src/d4.test.ts` timing out at 144 s against a 120 s cap. **On CI it passed**:
`test-unit` reported 571 passed / 1 failed / 2 skipped over 574 files, the one failure being the guard
above, and `test-browser` was green. So that timeout is a statement about this machine under load
rather than about the suite, and the cap needs no change.

**Left open deliberately.** `scripts/check-lesson-packs.sh` still sweeps three paths, so the five-path
invocation the skill now mandates is **not enforced by CI** — a documented practice with no gate behind
it, which is the shape of defect this round found twice. It wants its own change rather than a quiet
edit inside a QA branch, and it is the first thing to take next.
