# D3 lesson QA, round 1

**Pinned at `779c8b44`** (`origin/integration` at the time the worktree was cut). Every
measurement below was taken at that SHA or later on the same branch; where a lane re-measured a
carried finding, the re-measurement is what is recorded.

Domain D3 is five packs (LIN.1, LIN.3, LIN.4, LIN.5, LIN.6), 21 interactive widgets, 50 practice
templates and 5 checks. Four review lanes measured it, four fix lanes closed it.

The round found **seven defects that grade a learner wrongly**, and five of those are not D3's.
That is the headline: D3's QA pass turned up a bracket-stripping bug in the shared product checker
that had been accepting the interval spelling of a solution set across every domain, and a
re-ask path that graded stricter than the authored question it re-asked. Both had been sitting
under green suites.

---

## 1. Reconciliation of carried items

Four items were carried into this round from earlier work and re-measured before anything else,
because a finding is evidence about a SHA and the tree had moved.

| Carried item | Status at `779c8b44` | Evidence |
|---|---|---|
| R24 task order on `formula-target-match` | **Already closed** | The ordering objection was fixed in #368; re-read at the tip and the task reads in the required order. |
| The 25 practice worked-solution SVGs | **Already closed** | All 25 present and rendering; the figure sweep now covers them (see §4). |
| #368 / #405 regressions | **None found** | The LIN.3 equation-row and LIN.5 chip-width fixes hold at the tip. |
| LIN.1 / LIN.5 CFU-figure exemptions | **Superseded** | Both nodes now carry figures; the exemption entries are gone rather than dormant. |

---

## 2. P0 — a learner is graded wrongly

**These are cross-domain.** Only two of the seven are confined to D3.

### P0-1. A closed interval was graded as the set of its endpoints

`parseValueList` in `packages/shared-components/src/product-answer-checker.ts` stripped `[` and
`]` **exactly as it strips `{` and `}`**, so `[6, 20]` submitted against the key `{6, 20}` graded
`correct/match`. LIN.4 and LIN.6 exist to teach that `[6, 20]` is every number between six and
twenty, so the checker was accepting the one confusion the surrounding lesson is built to
prevent. Reaches every domain with a `solution_set` item.

Fixed; it now grades `invalid_input/parse_error`. **Three pinned guards had recorded the wrong
acceptance as intended behaviour** and were corrected with it, which is why no suite had ever
gone red. `PRODUCT_CHECKER_VERSION` is held at 2 by owner ratification rather than by additivity
— see `Answer_Equivalence_Spec.md` v0.18, which records why a bump would not deliver its §13.13
guarantee without forking the checker.

### P0-2. The re-ask graded stricter than the question it re-asked

A learner who missed a check was handed a drawn variant that did not route through the checker
the authored question used, so spellings the authored question accepted were marked wrong on the
second attempt. **20 packs across 5 domains.** Fixed by registering an item version per computed
instance so both paths grade identically; `cfuVariantGrading.test.ts` sweeps drawn instances
across all domains and asserts grade agreement.

### P0-3. The CFU accepted lists accepted the same bad spelling, bypassing the checker

CFU accepted lists are **exact-string matched**, so fixing P0-1 did not reach them.
`solutionSetForms` generated a bracketed alternative beside every braced roster, and
`content/lessons/d5/RAT.6.json` authored `"[3]"` by hand on a CFU whose own prompt tells the
learner to type a single value bare.

Measured over every instance `cfuInstances` can serve in every registered domain: **96 instances
swept, 5 roster instances across 4 nodes** (LIN.5, POL.3, POL.4, RAT.6, spanning three domains)
offered the bracketed form, across 115 bracketed spellings. Removal orphans nothing — no
instance's list empties and no canonical `accepted[0]` was bracketed. Genuine `interval` answers
keep their brackets, asserted both ways.

### P0-4. The interval placeholder was advertised for a roster answer

`cfuNotation` dispatched interval before roster, so LIN.5's `|x - 8| = 3` re-ask advertised
`Interval, e.g. (-inf, 2] U (7, inf)` for an answer that is two numbers — on the one surface a
learner reaches only after already missing once. The authored question was unaffected, which is
how it survived a pass over the packs.

### P0-5. A "spot the error" board had no error in it

`SolveSlipSpot` board 2 was unsolvable as intended: no line was actually wrong. Re-authored with
a genuine wrong line, a distinct repair, and a heading matching its arithmetic.

**The systemic half is worse than the board.** Only board 1 of any `SpotTheError` widget had ever
been tested, so every widget's later boards were unguarded. `spotTheErrorBoards.browser.test.tsx`
now walks every board twice.

### P0-6. LIN.1's check could be answered by copying the example out of its own field

LIN.1's key was `7`, and the shared numeric placeholder reads `A single number, e.g. 7`. Fixed by
moving the key (the balance now reads `4x - 5 = x + 22`, solving to 9) rather than editing the
shared placeholder, which is shown to every numeric CFU in the tree.

The sweep written for it found a second instance nobody had authored: **RAT.6's rotation had
walked onto the example its own field was showing**. That one is fixed in `resolve()`, so editing
an example now rotates any instance that example would have answered.

### P0-7. EL.6's golden fixture listed the bad spelling as valid

`[ln(2), ln(3)]` was in EL.6's `alternate_valid`. Removed; all fifteen remaining EL.6 spellings
still grade `correct/match` in both Node and Chromium.

---

## 3. P1 — the content teaches or reveals something false

### P1-1. Six templates' hints named a direction the draw might not have taken

A hint said a constant "was added" when the same template prints that constant with either sign.
The review named one template; **deriving the population from the draws found six**, across LIN.1
and LIN.4, and all six were failing. A direction-naming hint was therefore wrong on roughly half
of its draws, node-wide. Now 0 offending sentences over 200 draws each, with a non-vacuity floor
requiring at least six matched sentences so a rename cannot make the detector match nothing.

### P1-2. A prompt reworded itself depending on its own answer

`d3.lin5.degenerate.l3` printed "and write $M$ if there is no solution" only on the draws where
there *was* no solution — **206 of 400** — which tells the learner the answer before they start.
Now on every draw, with both branches floored so neither side is asserted over nothing.

### P1-3. A caption denied a pair the draw actually had

`d3.lin5.coefficient.l2`'s caption said the two solutions "are not a plus-and-minus pair" on
**20 of 400** draws whose roots were exactly that. Pair-ness is now read off the answer key rather
than off the coefficient, so the check cannot restate the caption's own condition. 0 of 400 after.

### P1-4. The reveal did not name the answer

`d3.lin5.degenerate.l3`'s figure left **13 distinct answers unnamed over 400 draws**, so a learner
who revealed the worked solution still had to finish the problem. The comparison deliberately
keeps braces: `flatten` strips them, so the empty set would flatten to `""` and the assertion
would have been trivially true on precisely the draw whose answer went missing.

### P1-5. LIN.3's CFU figure rearranged a rule the question never stated

The figure solved `B = c + t - m` while the question stated `B = c + t - 2`, introducing `m` from
nowhere. The figure is now parameter-driven. A new derived assertion in `cfuAuthoredFigure.test.tsx`
covers **5 CFUs** (LIN.3, RAT.5, LF.2, LF.4, TRG.6) — those whose question states a rule *and*
whose figure typesets one, since a number line has no rule to get wrong.

### P1-6. LIN.6's check never asked the case the node exists to teach

An absolute-value inequality pointing away from the bars answers as a **union of two rays**;
pointing towards them it answers as one interval. LIN.6's check only ever asked the one-piece
case, so a learner could pass the node without once producing the shape half the lesson is about.

Derived notation-blind from the pools (a set-builder joined by `or` counts as two pieces just as a
union does): **2 nodes of 48 checks** qualify, LIN.4 and LIN.6. LIN.6 is fixed, with nine union
spellings — three infinity words crossed with three joins — every one graded by the real v2
checker over 12 fresh draws. `flatten` now maps `\cup` and `∪` to `U`.

**LIN.4 is a real member of that population and is NOT fixed**; see §6.

### P1-7. D3's figures were outside the cross-cutting sweeps

D3 was in `NOT_SWEPT_HERE` for the practice sweep and absent from the `visualsMath` figure floor,
`WorkedSolution.browser` and `workedFigureLabels.browser`. All four now include it, and D3 has a
figure floor of its own.

### P1-8. Four widget contract defects

- `AbsCountClassify` credited rows a **reveal** had settled as though the learner had called them.
- `OffStandardStepper` offered the board back on reveal when no answers remained.
- `BothPansBuilder`'s solved status was unreachable: a perfect board never printed its conclusion
  in the solved colour.
- `AbsBranchBuilder` marked a correctly written negative branch wrong. `-w + 34 = 5` is
  `-(w - 34) = 5`, which rearranges to `w - 34 = -5` and lands on the same 29 as the canonical
  branch, so the widget was rejecting a correct answer and teaching a rule that is not one.

  **This one broke a sibling guard, and the break was caught at the gate rather than by the lane.**
  `partVerdicts.browser.test.tsx` used that very chip as its designated *wrong* answer for the
  negative slot, so once the widget started accepting it, three of that file's cases failed:
  both parts read "right", the round advanced, and no reveal was offered. The guard was repaired
  by moving its miss to `w + 34 = -5`, a genuine error that solves to -39 and is not a branch of
  anything here. Because that loosens what the guard calls wrong, the repair was proved rather
  than assumed: injecting acceptance of the sign-flip chip fails `partVerdicts` at *"both parts
  carry the same verdict"* and `absBranchEquivalent` at *"a wrong branch is now accepted"*, so
  both remain load-bearing.

### P1-9. Three guard populations were narrower than the behaviour they guard

`widgetActiveSlot.browser.test.tsx` was pinned to a single hardcoded widget id and is now derived.
`widgetMissedBoardGate` and `widgetRevealEarnedGate` both excluded D3 boards that exhibit exactly
the behaviour they check; both were widened and re-floored.

### P1-10. `d3.test.ts` never asserted its own difficulty ladder

"L3 is harder than its own L2" was asserted for other domains and not for D3. Added per node.

---

## 4. P2 — vocabulary and prose

- **"Squeeze" stood in for "compound inequality"** on every surface a learner reached from LIN.6,
  while the pack's own CFU said "compound inequality". 13 uses, **7 of them learner-visible nouns**,
  now 0 nouns. The word survives as a verb, which is plain description and was never the objection;
  the banned-phrase entries record that distinction explicitly.
- **"Ray" was used before it was earned** in LIN.6 and `AbsInequalityOrder`. Now glossed.
- `AbsBandTable`'s column heading was a paraphrase where the pack elsewhere uses the term.
- `AbsUnionBuilder`'s task prose confused the slot with the chip.
- A LIN.6 hint (and its LIN.4 sibling) **taught the grader's whitespace delimiter as if it were
  notation**.
- Prose repairs: LIN.1's definition of "term" and a gloss for "linear"; LIN.3's slide-2 hinge;
  LIN.4's "strict"; LIN.5's subtitle and a premature conclusion in its opening sentence.

Every cut sentence has a banned-phrase entry in `scan-lesson-text.mjs`, so it cannot return.

---

## 5. Guards added

Nine new files. Every assertion in them was watched red under a forced injection before being
accepted, and populations are derived from source with floors.

| Guard | What it would catch |
|---|---|
| `cfuVariantGrading.test.ts` | A re-ask grading differently from its authored question |
| `cfuRosterBracketing.test.ts` | A CFU accepting the interval spelling of a set |
| `cfuPlaceholderLeak.test.ts` | A key answerable by copying the field's own example |
| `cfuAnswerShape.test.ts` | A check that can only ever ask one of the shapes its node teaches |
| `d3RevealTruth.test.tsx` | A reveal that denies or omits the answer the draw has |
| `spotTheErrorBoards.browser.test.tsx` | A board with no error, on any board index |
| `revealCredit.browser.test.tsx` | A reveal credited to the learner |
| `perfectBoardStatus.browser.test.tsx` | An unreachable solved state |
| `absBranchEquivalent.browser.test.tsx` | A correct branch marked wrong |

Two assertions were **written and then deleted for being unfalsifiable** — one entailed by its
population's own membership rule, one implied by an adjacent floor. Given that this round's
premise is that guards go green while measuring nothing, they are recorded here rather than
quietly dropped.

One injection changed what shipped. The union spellings were first asserted through
`gradeCfuAnswer`, and injecting a deliberately wrong spelling left the file green: LIN.6 declares
no `check` block, so that path is **string membership against the very list under test**. A second
sweep through the real v2 checker was added, and the same injection now fails loudly.

---

## 6. Outstanding

1. **LIN.4's check cannot ask its two-piece case.** It is a genuine member of the P1-6 population.
   Its only two-piece template is difficulty 3 against the check's own difficulty 2, so wiring the
   re-ask there would hand a learner who just missed the question a strictly harder one. This needs
   an authored question, not a wiring change. It is declared in the guard's outstanding list with
   its reason, asserted in both directions, so it cannot sit there unnoticed or be silently fixed
   without the list being updated.
2. **D8's `EL.4` uses "squeeze" as a noun.** Different sense (compression of a spread onto an axis,
   not a stand-in for "compound inequality"), so it is not the defect D3 carried and was left alone.
   Worth a look when D8 next comes up.
3. **`PRODUCT_CHECKER_VERSION` is held at 2 on an owner ratification**, which is the narrowest of
   the four grounds the spec permits and the only one resting on judgement rather than measurement.
   Recorded in `Answer_Equivalence_Spec.md` v0.18.

---

## 7. Snapshots

Eleven of the twelve item-bank snapshots are **byte-identical** to `779c8b44`. One item hash moved
in `d3.test.ts.snap` (`d3.lin5.degenerate.l3:practice:110018`, `0999ab7c` → `7b52bd93`), following
the P1-2 prompt rewrite.

That re-pin was proved rather than asserted, in both directions. Holding the snapshot at its old
hash with every fix applied produced exactly one failure, naming exactly that item id, which shows
no hint or figure edit moved anything. Reverting the prompt rewrite alone turned the pin green
again while eight other assertions failed. The hash was then edited by hand; `vitest -u` was never
run, so nothing else in the file could move unobserved.

---

## 8. Gate results

`format:check`, `lint` and `typecheck` (`tsc --build`) all clean. `check:lessons` **9 domains,
d3 5 packs, 0 errors and 0 warnings**. `check:graph` all invariants pass (87 hard edges over 62
live nodes). The D3 text scan reports 91 learner-facing strings with no rendering artifacts.

Node suite **8374 passed**, browser **2116 passed**. Every failure was triaged to one of three
classes, and **one was real** — the `partVerdicts` staleness in §3, now fixed.

| Class | Files | Evidence it is not this diff |
|---|---|---|
| **Environment** | `test/ciScopeFilter.test.ts` (20 cases) | Every failure is `/bin/bash: C:UserszhengAppData...: No such file or directory` — WSL bash eating Windows path separators, so the assertion never evaluated. The underlying claim was checked directly instead: no new or modified source in this diff names a markdown file. |
| **Environment** | `crisisPanelFitsItsContent.browser` (2 cases) | The test throws its own diagnostic: *"none of DejaVu Sans, Liberation Sans, Arimo, Noto Sans, Inter, Cantarell, FreeSans, Nunito is installed, so the worst case cannot be measured here."* No Linux fallback font on this machine. |
| **Load** | `product.test.ts`, `d5.test.ts` | Both exceed hardcoded 60s caps under a saturated run and pass together in a quiet one: **33 passed**. No cap was raised. |
| **Load** | 5 city/winter Node files | **22 passed** in isolation. |
| **Load** | 13 browser files | All green in isolation: 44 passed across the three lesson files, 59 of 61 across the ten city/winter files (the other two being the font case above). |

The first environment row is worth its own note. `ciScopeFilter` is the guard that failed CI
earlier for a *real* reason, so "it is the known Windows flake" was not accepted on its own —
the claim it makes was verified independently against the diff before the failure was set aside.
