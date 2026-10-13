# D2 QA round 1

**Pinned SHA: `fc0b53ea47b40d0b6c5018a059175308d541dc1b`** (branch `anthony/d2-qa-round-1`,
worktree `wt-d2-qa`). Every measurement below was taken at that base or at the three commits
made on top of it (`01f249fb`, `1be23b21`, `9461a496`); where a count is post-fix it says so.
Domain: `content/lessons/d2` — EXP.1, RAD.1, RAD.2, RAD.3, RAD.4. **5 packs, 31 slides, 31
mounted widget files**, all 31 resolved from the packs through `visuals.tsx` rather than from
a written-down list.

---

## 1. Reconciliation of prior D2 findings

Every line number in the brief was from an earlier tree. Each row below was re-read at the
pinned SHA and cites what is actually there now.

| # | Prior finding | Verdict | Evidence at this SHA |
|---|---|---|---|
| 1 | `response.md`: penalty-first miss copy, `PerfectRootClassify.tsx:101` | **FIXED** | Drifted to `PerfectRootClassify.tsx:103`, now reading *"That's all four called, so you're good to move on. Each row you missed says why just underneath, and the working is there if you want it."* Opens on completion, not on the cost, and points at the row that explains it — which is exactly what R33 asks for. |
| 2 | `response.md`: penalty-first miss copy, `RationalizeExplore.tsx:287` | **FIXED** | Drifted to `RationalizeExplore.tsx:330`: *"That's all three called, so you're good to move on. Where a prediction did not hold, the decimals beside it show what that pair actually does."* The comment at `:325-329` records the copy it replaced and why. |
| 3 | Gabe 2026-07-28: `practicePlaceholder` advertising the wrong shape for 20 `simplified_radical` instances | **FIXED** | `answerFormat.ts:793-796` no longer maps the profile to one line: it dispatches to `variable_radical` or to `constantRadicalNotation(answerKey)`, which reads the shape off the key. `answerSyntaxGuidance.test.tsx:250-256` records the original report and guards the three shapes. Re-run at this tip: **39 passed** across that file and `radicalAnswerSubmit`. |
| 4 | Gabe 2026-07-28: 83 practice keys refused by a numeric-literal gate before the grader | **FIXED** | `radicalAnswerSubmit.test.tsx:344-348` censuses the freed keys as `RAD.1 21 + RAD.2 34 + RAD.4 28`, which is **exactly the 83**, and asserts each freed item's `simplification` is one of three named specs so a malformed key cannot slip in beside them. Green at this tip. |
| 5 | `Answer_Equivalence_Spec.md` ~135: RAD.1/RAD.2 CFU-versus-practice notation disagreement | **STILL BROKEN — out of my lane, escalated** | Drifted to `Answer_Equivalence_Spec.md:107-143`. The CFU accepted-lists take `6√2/5` and `√10` by exact string match and never reach the checker, while practice on the same node refuses the identical keystrokes. The spec's own recommendation (option C, `:141`) is to normalise `√` at the input boundary in `packages/shared-components/src/math-input.tsx` **plus** the server-side recompute, and records it as needing an owner decision. Neither file is mine and the change is explicitly out of scope there. **See escalation E1.** |
| 6 | `work-log/anthony/2026-08-03-three-section-wave1.md` 11-12: RAD.4 slide 3 residual, an even exponent whose half is odd still needs bars | **STILL TRUE, NOT A DEFECT — no change made** | Confirmed: slide 3 instantiates only `x^8` (half 4, even) and `x^9` (odd), so an even power with an odd half never appears there. It is not a teaching defect, because the worked example reasons from the answer rather than from parity — *"No bars are needed there, since $x^{4}$ is a square and a square is never negative"* — so a learner applying that same test to `x^6 → x^3` reaches the bars themselves. The case is instantiated one slide earlier, at `RootParityBuilder.tsx:73-89`: `\sqrt{m^{6}}` with `resultPower: 3` (`:77`), `solvedLatex: "\\left|m^{3}\\right|"` (`:88`) and `needsBars: true` (`:89`). Leaning on slide 2 is what slide 2 is for. |
| 7 | Loop 3 (#127) left open: item-bank practice hints still saying "largest perfect square" | **FIXED this round** | Was live at 4 surfaces; see P1-1. **The premise recorded with it was wrong and is worth correcting**: #127 said reconciling them "needs a round where a snapshot move is authorized". It does not. Loop 4's own entry (`work-log/gabe.md:449`) already established that hint text never reaches `hashItemDefinition`, which canonicalises only `node_id` + `prompt` + `answer`. All 13 snapshots stayed byte-identical through these fixes. |
| 8 | Loop 3 (#127): "every 'letter' that means a variable says variable" | **WAS STILL BROKEN, fixed this round** | #127's sweep covered the `apps/web` lesson layer; **5 instances survived under `packages/`**, which it did not open. See P2-1. |
| 9 | Loop 2 (#111) / loop 4 (#141): `ExponentLawsBuilder`'s second board letting the answer be copied into the re-ask | **FIXED** | Verified at tip: `ExponentLawsBuilder.tsx` pool 1 is `{3,4} {2,6} {7,3}` and pool 2 is `{6,2} {4,9} {8,3}`, so the two boards no longer share a total. Loop 4 moved board 2 to `{6,2}` and it is still there. |
| 10 | Planning grep's claim that D2 is "essentially R12-reveal-complete" | **CONFIRMED, measured not trusted** | Population derived from the packs through the registry, not from a list: **31 of 31** mounted widget files offer a reveal (their own `WidgetReveal`/`useRevealFill`/`useRevealReAsk`, or a shared kind they delegate to) and **31 of 31** join the reveal/re-ask machinery. 0 missing either. |

---

## 2. Findings

### P0-1 — RAD.1's CFU variant keyed a fraction it had not reduced · FIXED

`apps/web/src/lessons/cfuVariants.ts:548` (`cfu.rad1.quotient-radical`)

The generator drew its denominator root independently of the coefficient, so the two could
share a factor and the answer's **fraction** was left unreduced. The prompt asks for a
simplified radical, and the accepted list is computed from the key, so the learner who
finishes the job is the one marked wrong. Quoted from the injected run at the changed line:

```
seed 2: prompt sqrt(216/16) -> key 6*sqrt(6)/4 but reduces to 3*sqrt(6)/2
seed 17: prompt sqrt(108/36) -> key 6*sqrt(3)/6 but reduces to 1*sqrt(3)
```

**What a learner would wrongly conclude:** that `3*sqrt(6)/2` is wrong and `6*sqrt(6)/4` is
right — i.e. that a simplified radical need not be a reduced fraction, directly against the
prompt's own instruction.

**Measured over 4000 draws: 1626 unreduced (40.7%) before, 0 after.**

### P0-2 — RAD.2's CFU variant keyed a radicand with a perfect square still inside · FIXED

`apps/web/src/lessons/cfuVariants.ts:619` (`cfu.rad2.combine-rationalize`)

The answer's radicand is `shared * bottom`, and neither factor was stopped from carrying a
square into it. RAD.1 slide 4 defines a simplified root as one with no perfect square left
inside, so these keys are that rule's counter-example served as its answer:

```
seed 1:  prompt (sqrt(24)+sqrt(6))/sqrt(3) -> key sqrt(18) but simplifies to 3sqrt(2)
seed 5:  prompt (sqrt(150)+sqrt(6))/sqrt(6) -> key sqrt(36) but simplifies to 6
seed 12: prompt (sqrt(12)+sqrt(3))/sqrt(3) -> key sqrt(9)  but simplifies to 3
```

**What a learner would wrongly conclude:** that `sqrt(9)` is a finished answer and `3` is not
— the exact inversion of the definition RAD.1 spends a slide establishing.

**Measured over 4000 draws: 2087 with a square still inside (52.2%) before, 0 after.**

### P1-1 — "Pull out the LARGEST perfect square", the method RAD.1 retired, on four surviving surfaces · FIXED

- `content/lessons/d2/RAD.1.json:104` (CFU worked solution)
- `apps/web/src/lessons/cfuVariants.ts:568` (CFU variant hint) and `:572` (variant worked solution)
- `packages/item-bank/src/d2/nodes/RAD.1/index.ts:83` and `:192`
- `packages/item-bank/src/d2/nodes/RAD.4/index.ts:241`

RAD.1's slides teach the opposite twice — *"taking the first one that divides in is enough,
since nothing says the factor has to be the biggest"* (slide 2) and *"Missing the biggest
factor on the first pass costs nothing but another pass"* (slide 4). Spotting the largest
factor is the hard part of the job and is not how anyone works.

**What a learner would wrongly conclude:** that their correct first-pass extraction was the
wrong move, and that they must find a maximum before starting — the search the node was
rewritten to remove.

Both phrasings are now in `BANNED_PHRASES`. The CFU-variant sentence is banned **separately**,
because a reword is not a substring and because that surface is not the one above.

### P1-2 — Six widgets replay the worked example printed directly above them · REPORTED, not fixed

Swept deliberately, as asked: all 31 slides, comparing section 2's instance against the
numbers the section-3 widget's boards actually use. Mounting was verified first — for all 31,
`visuals[i].after === i`, so the worked example is literally the thing above the widget.

Applying D8's standard (a shared number counts only if it **hands over an answer**):

| # | Slide | Widget, board | Section 2 hands over |
|---|---|---|---|
| 1 | EXP.1 slide 2 "Powers of powers" | `PowerOfPowerWalkthrough.tsx:38` `{ inner: 3, outer: 2 }` | *"Simplify $\left(x^{3}\right)^{2}$"* … *"their exponents add: $3 + 3 = 6$"* … *"$\left(x^{3}\right)^{2} = x^{6}$"*. The widget stops its animation before the total and asks the learner to type it; the total is printed above. |
| 2 | EXP.1 slide 5 "Negative exponents" | `NegativeExponentEstimate.tsx:26-27` `{ base: 2, exponent: -1, value: 0.5 }`, `{ base: 2, exponent: -2, value: 0.25 }` | *"Carry that same halving below zero to find $2^{-1}$ and $2^{-2}$"* … *"$2^{-1} = \dfrac{1}{2}$"* … *"$2^{-2} = \dfrac{1}{4}$"*. **The worst of the six.** The widget's whole premise, in its own header, is *"put a negative power on a number line before you are told where it goes"* and *"Committing first is the point"* — and both values are told, in order, immediately above. |
| 3 | RAD.3 slide 1 "Each number's job" | `FractionExponentLabel.tsx:75` `{ p: 2, q: 3, rootName: "cube root" }` | *"Name the job of each number in $8^{2/3}$"* … *"The bottom number is $3$, so it asks for a cube root. The top number is $2$, so it asks for a square."* The widget's task is naming those two jobs, for those two numbers. |
| 4 | RAD.3 slide 3 "From exponent to radical" | `RadicalFormBuilder.tsx:77` `{ p: 4, q: 3 }` — the **first** round of the **first** pool | *"Write $x^{4/3}$ in radical form"* … *"$x^{4/3} = \sqrt[3]{x^{4}}$"*. The learner types the power and the index; both are printed above. |
| 5 | RAD.3 slide 4 "From radical to exponent" | `ExponentFormBuilder.tsx:78` `{ p: 5, q: 3 }` — first round, first pool | *"Write $\sqrt[3]{x^{5}}$ with a single fraction exponent"* … *"$\sqrt[3]{x^{5}} = x^{5/3}$"*. The widget first asks the learner to tell `5/3` from its swap `3/5`; section 2 names the swap and rejects it in the same sentence. |
| 6 | RAD.4 slide 3 "Taking a variable out" | `VariableRadicandBuilder.tsx:89` `{ power: 9, evenPart: 8, outside: 4 }` — first round of pool 2 | *"Simplify $\sqrt{x^{8}}$, then $\sqrt{x^{9}}$"* … *"Half of $8$ is $4$, so $x^{4}$ steps out and the spare $x$ stays under the root: $\sqrt{x^{9}} = x^{4}\sqrt{x}$."* Both moves the widget asks for — tap the even part (8), type the power that comes out (4) — are printed above. |

**Two results here bear on how you size the guard across the six domains, and both cut
against the tell.**

**(a) D8's tell does not hold in D2.** No D2 widget carries a CFU-only collision comment: of
the 31, **25 name the slide and 6 name both**, and 0 name only the CFU. Filtering on the tell
would have found **none** of the six above. Three of the six (`PowerOfPowerWalkthrough`,
`FractionExponentLabel`, `RadicalFormBuilder`) are in the "names the slide" or "names both"
group that D8 observed to be clean.

**(b) The failure is not that the check was skipped, but that it was aimed at everything
except the thing above.** Each offender's comment records a real check:

- `RadicalFormBuilder.tsx:4-6` — *"Round 1 is x^(4/3) and round 2 is x^(5/6): both differ from
  the derivation slide's root indices, from the reverse builder on the next slide, and from
  the node's CFU (25^(3/2))"*. Three checks,
  none against its own worked example, which is `x^{4/3}` verbatim.
- `PowerOfPowerWalkthrough.tsx:31` — *"Neither set holds the CFU's (x^2)^3 or the slide's
  (x^4)^2"*. It **does** name the slide, and the instance it names is neither this slide's
  worked example (`(x^3)^2`) nor the next slide's (`(x^4)^3`), so the check was made against a
  case that does not exist.
- `VariableRadicandBuilder.tsx:13` — *"Rounds are `p^7` and `p^5`; the paragraph above
  works `x^9`, so neither repeats it"*. The check names the right target and is **true of pool
  1 and false of pool 2**, which `k^9` opens and which "start over" deals. A guard that reads
  only the first board will not see this one.

A contributing cause worth knowing: **the slide numbers in these headers are stale.**
`RadicalFormBuilder` says "slide 1" and mounts under slide 3; `VariableRadicandBuilder` says
"slide 5" and mounts under slide 3; `PowerOfPowerWalkthrough` says "slide 1" and mounts under
slide 2. An author checking "the slide" could read the wrong one and still believe they had
checked.

**Considered and cleared** (shared principle or a shared intermediate the widget still makes
them compute), so the guard does not have to flag them:

- EXP.1 slide 1 `ExponentLawsBuilder` — board 1 is `3+4`, section 2 works `5+2`; both total 7,
  but the inputs differ and the learner still adds.
- RAD.2 slide 2 `CombineRadicalsBuilder.tsx:87` reuses radicand 50 (`√50 = 5√2` is printed
  above) but pairs it with 27, so the board's own answer is not the one above.
- RAD.2 slide 3 `RationalizeSolver` `{c:4,p:5}` shares only the 5 of section 2's `2/√5`.
- RAD.2 slide 4 `RationalizeExplore` `1/√5 vs √5/5` against section 2's `2/√5`.
- RAD.4 slide 2 `RootParityBuilder` shares the radicand power 8 but under index 2, not
  section 2's index 4, so the answer differs (`m^4` vs `x^2`).

Not fixed, per instruction: renumbering D2's boards leaves the identical hole in the other
migrated packs.

### P1-3 — The scanner's documented invocation cannot see `cfuVariants.ts` · REPORTED, escalation E2

`.cursor/skills/lesson-qa/SKILL.md` (the three-path invocation)

Demonstrated rather than argued. With the retired sentence injected back into
`cfuVariants.ts:568`, the scanner over the skill's documented widget path reports:

```
OK: 0 learner-facing string(s) across 0 pack(s) and 3636 prose-shaped run(s) across 263 widget file(s), no rendering artifacts.
```

— **green, with a banned phrase sitting in the tree.** Widening one path segment to
`apps/web/src/lessons` finds it:

```
FAIL: 1 finding(s) over ... 4953 prose-shaped run(s) across 375 widget file(s):
  - cfuVariants.ts line 568: [BANNED_PHRASE] a sentence a reviewer already had removed is back
```

`cfuVariants.ts` holds the hints and worked solutions for **every** domain's CFU variants, so
this blind spot is not D2's. See escalation E2 for the exact change.

### P2-1 — "Letter" for a variable, 8 learner-facing hint lines under `packages/` · FIXED

`packages/item-bank/src/d2/nodes/EXP.1/index.ts:147` and `RAD.4/index.ts:110`, `:149`, `:240`,
`:241`, `:242`, `:287`, `:288`. R20: a symbol standing for an unknown is a **variable**;
calling it a letter names its typography and says nothing about its job. E.g. *"That leaves
each letter to be judged on its own exponent"*. #127 swept the `apps/web` layer and these
survived under `packages/`.

**Scoped to what a learner reads.** At the base SHA the two files held 18 occurrences of
"letter" between them (EXP.1 3, RAD.4 15); only these 8 lines are hint strings. The rest are
developer doc-comments describing the templates ("Two-letter pairs for the hardest shape"),
which R20 does not govern and which were left alone. No occurrence remains in any D2 pack or
in any hint.

### P2-2 — R14: the subtitle question rate is fine; the repeated formula is the defect · FIXED

**The count in the skill is badly stale.** `lesson-qa/SKILL.md` cites D2 by name at *23
questions in 31 subtitles*. Re-measured at the pinned SHA: **8 in 31**, listed in full:

```
EXP.1 slide 0: "What are exponents?"      EXP.1 slide 4: "What happens at zero?"
EXP.1 slide 6: "Multiply or divide?"      RAD.1 slide 5: "What about fractions?"
RAD.2 slide 1: "What about unlike roots?" RAD.3 slide 2: "Why a root?"
RAD.3 slide 5: "Which order is easier?"   RAD.4 slide 2: "When are bars needed?"
```

Against the three tests, six of the eight are earned: each poses the question its slide then
answers, none could be mistaken for the conclusion, and none pre-empts the discovery. Two
were not:

- **`EXP.1 slide 0: "What are exponents?"`** heads a slide whose job is naming the parts of a
  power, and the question form is unearned — the slide does not pose it, it labels. Now
  **"Powers, bases and exponents"**.
- **`"What about fractions?"` and `"What about unlike roots?"` are the same opener twice**, and
  a repeated opening formula is a formula. RAD.1's is the weaker: its four siblings are all
  declarative noun phrases, and the words could head any slide in the domain. Now **"Roots of
  fractions"**; RAD.2 keeps the one genuine question. **7 in 31** after.

### P2-3 — RAD.1's authored CFU refused a spelling its own re-ask accepts · FIXED

`content/lessons/d2/RAD.1.json:92` and `:94`. The accepted list took the asterisk beside the glyph
(`6*√2/5`) and LaTeX without one (`6\sqrt{2}/5`), but not the two together — while the worked
solution's last step is what teaches the asterisk, ending *"typed `6*sqrt(2)/5`"*. The same
node's generated re-ask already accepted `6*\sqrt{6}/7`, so one habit was marked wrong and
then right inside one node. **36 spellings graded over D2's 10 CFU instances: 1 refused
before, 0 after.**

---

## 3. Escalations (reserved files or another lane)

**E1 — the `√` glyph, CFU versus practice.** Reconciliation row 5. The fix the spec itself
recommends is to normalise `√` to `sqrt(...)` at the input boundary in
`packages/shared-components/src/math-input.tsx`, with the identical normalisation applied to
the server-side recompute. Not my lane, needs an owner decision, and the spec records two
things it owes first: unambiguous scope (`√2x` must insert explicit grouping or refuse rather
than guess) and client/server agreement.

**E2 — widen the scanner's documented path by one segment.** Change the widget path in the
`lesson-qa` skill's invocation from `apps/web/src/lessons/interactive` to
`apps/web/src/lessons`. That is the whole change; it takes the sweep from 263 to 375 widget
files and brings `cfuVariants.ts` — every domain's CFU variant prose — inside the ledger.
I did not make it: five other rounds are running against that shared skill file this round,
and this is a change all six inherit.

**E3 — correct the R14 figure in the skill.** `lesson-qa/SKILL.md` cites D2's subtitles as 23
questions in 31. It is 8 in 31 at `fc0b53ea`, 7 after this round. Same file as E2, same reason
for not editing it here.

---

## 4. FIXED versus REPORTED

**Fixed (3 commits, no push, no PR):**

| Finding | Files |
|---|---|
| P0-1, P0-2 generators | `apps/web/src/lessons/cfuVariants.ts` |
| P1-1 retired method + ledger | `content/lessons/d2/RAD.1.json`, `cfuVariants.ts`, `d2/nodes/RAD.1/index.ts`, `d2/nodes/RAD.4/index.ts`, `scan-lesson-text.mjs` |
| P2-1 "letter" | `d2/nodes/EXP.1/index.ts`, `d2/nodes/RAD.4/index.ts` |
| P2-2 subtitles | `content/lessons/d2/EXP.1.json`, `content/lessons/d2/RAD.1.json` |
| P2-3 accepted list | `content/lessons/d2/RAD.1.json` |

**Reported only:** P1-2 (six R34 replays, by instruction), P1-3/E2 (shared skill file),
E1 (another lane), E3 (shared skill file), reconciliation row 6 (true but not a defect).

**Frozen content.** All **13** `.snap` files under `packages/item-bank/src/__snapshots__/` are
byte-identical to the base, verified with `git hash-object` before and after and with
`git status --porcelain` on that directory empty. `vitest -u` was never run. **The one
legitimate re-pin was not needed and was not taken**: every edit under
`packages/item-bank/src/d2/nodes/*` landed in a `hints` or `worked_solution` array and none in
a `prompt`, and only `node_id` + `prompt` + `answer` reach `hashItemDefinition`. `d2.test.ts`
(42 tests, the content pin included) passes at the tip.

---

## 5. Coverage — what was checked, and how many cases each sweep measured

| Sweep | Population measured | Result |
|---|---|---|
| CFU generator parameter space, answers re-derived from the **rendered prompt** | 4000 draws × 2 templates | 1626/4000 and 2087/4000 defective before; **0 and 0** after |
| Every D2 CFU instance graded through the real checker (`gradeCfuAnswer`) | 10 instances, key and answer key each | 0 refusals |
| Plausible learner spellings, derived per instance from its own canonical key | 36 spellings | 1 refused → **0** after P2-3 |
| Frozen practice pool, every served key inspected for a residual square | 187 served instances, 76 of them radical keys | **0** not simplified — the defect was confined to the unfrozen generators |
| R34 three-section replay pass | 31 slides / 31 widgets, mounting verified `after === i` for all 31 | 6 findings, 5 cleared explicitly |
| R14 subtitle census | 31 subtitles, at base and at tip | 8 → 7 questions; skill's cited 23 is wrong |
| R12 reveal + re-ask | 31 mounted widget files, derived through the registry | 31/31 reveal, 31/31 re-ask, 0 missing |
| R33 set-level miss copy | the 2 named instances, plus the 13 `missedNote` call sites | both named ones fixed |
| Scanner (packs + widgets + item-bank) | 297 learner-facing strings / 5 packs; 7177 prose runs / 503 widget files | clean |
| `npm run check:lessons` | 10 domains, 59 packs | all pass at the error tier |
| Snapshots | 13 `.snap` files | all byte-identical |

**Red demonstrated before green, at the changed lines, for every claimed fix:** both
generators (injected, quoted above, reverted — `git diff` on `cfuVariants.ts` empty against the
commit afterwards); both banned phrases (injected, scanner failure quoted, reverted); the
accepted-list gap (1 refusal measured before the two entries were added). The R14 subtitle fix
was caught red by `check:lessons` itself on the first draft: *"slide_subtitles[5] runs 5 words
(ceiling is 4)"*.

### NOT DONE — explicitly

- **`npm run test:browser`, any `*.browser.test.tsx`, and the full `npm run check`: NOT RUN.**
  Prohibited by the brief. **The four browser guards my changes need**, derived by searching
  the browser suite for the surfaces I touched rather than guessed:
  `cfuVariantRetry.browser.test.tsx` and `cfuReAskKeypadShots.browser.test.tsx` (both exercise
  CFU variants, and the second is the likeliest to move: the re-ask keys changed, e.g. RAD.2's
  second instance is now `sqrt(55)` where it was `sqrt(49)`), `workedFigureLabels.browser.test.tsx`
  (worked-solution text changed), and `negativeExponentPlay.browser.test.tsx` (EXP.1 subtitle
  changed).
- **No guard was written for the R34 replay class.** By instruction: it owes a demonstrated red
  and should be derived over all the packs, not one domain.
- **`TEAM_CHECKLIST.md` not edited**, by instruction.
- **`answerFormat.ts` was read but not edited** — reserved for the D8 worker. Reconciliation
  rows 3 and 4 are verified against it, not changed in it.
- The R33 sweep checked the two named instances and the `missedNote` call sites; it is **not**
  an exhaustive reading of every post-miss sentence in all 31 widgets.
