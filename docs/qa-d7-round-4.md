# D7 QA round 4 (Linear Functions)

Read at `65d7cdbf`, branch `anthony/d7-qa-round-4`. D7's first standalone QA report: its only
prior round is round 3, recorded jointly with D1 and D5 in
`work-log/anthony/2026-07-29-d1-d5-d7-qa-round-3.md`.

## Coverage: what a reader may and may not assume from this document

**May assume.** All four packs and all sixteen slides were opened and read. The counts in
section 1 were re-derived from the packs and from `visuals.tsx` rather than inherited. The
worked-example replay sweep covered all sixteen slide/widget pairs and every board each widget
can deal, not only the opening one. The reveal and reset classifications in sections 6 and 7
cover all sixteen widgets with no silent omissions: every widget appears in a table row.

**May not assume.** This round did **not** run browser tests; the parent runs those serially
across D1, D5 and D7, and section "Browser guards made owed" names what mine touch. It did not
re-grade the practice bank under `packages/item-bank/src/d7/**` beyond what
`npm run check:lessons` and the scanner read. It did not audit the CFU acceptance lists as a
whole: LF.1's and LF.4's were re-read because prior findings named them, and the other two were
not. No reveal and no second board was implemented **in this round** — sections 6 and 7 are the
specification the authoring PR starts from, and the two counts there **correct** the plan's
figures rather than confirming them. That PR has since been written, and section 8 records what it
closed and where it deviated; sections 1 to 7 are left as they were read at `65d7cdbf` rather than
updated in place. Nothing in section 5's green relieves a reviewer of re-reading the three widgets
named in `d7WorkedExampleReplay.test.ts`'s header as outside its reach.

## 1. Counts, re-derived

The plan's figures were measured at `4cbba050`. Re-derived here from the packs
(`content/lessons/d7/LF.{1,2,3,4}.json`), the registry (`apps/web/src/lessons/visuals.tsx`) and
the widget sources.

| Quantity | Plan | Here | How derived |
|---|---|---|---|
| Packs | 4 | **4** | `LF.1`–`LF.4`, all four in `d7.ts`'s `NODE_ORDER` |
| Slides | 16 | **16** | `mini_lesson.length` = 4 in each pack |
| Worked examples | 16 | **16** | `worked_examples.length` = 4 in each pack; index-aligned to slides |
| Widgets | 16 | **16** | 16 non-test `Linear*.tsx` under `interactive/`, and 16 `visuals[]` entries; the map is 1:1, every id resolving to a distinct file |
| Lacking a reveal | 13 | **13** | zero of the 16 widget files contain `WidgetReveal` or `useRevealReAsk`; three reach one through a kind (`FillTable`, `OrderSteps`, `SpotTheError`, each mounting `WidgetReveal` with `othersRemain`) |
| Resets that replay | 8 | **8** | 11 widgets render a `lesson-interactive__reset` button directly, of which 3 re-parameterise (see section 7); the other 5 reset affordances live in the three kinds (variant-driven) and the two walkthroughs (Replay only) |

All six confirmed. Two figures in circulation are **wrong** and should not be re-inherited:
"16 reveals owed" (three already have one) and round 3's "zero of 16 D7 widgets offer a reveal"
(three do, through their kinds). Section 6 further reduces 13 *lacking* to **6 owing**.

Every slide has exactly one gating visual and exactly one worked example: no slide has two
widgets and none has none.

## 2. Prior findings reconciled

| Finding | Verdict |
|---|---|
| LF.2 slide 2 leaks Pair 4 of `LinearLinePairClassify` | **WAS STILL BROKEN — fixed this round** |
| LF.4 slide 1 forbids back-substitution | **WAS STILL BROKEN — fixed this round** |
| LF.4 accepts `(x, y) = (2, -3)`, rejects `[2, -3]` | **RULING HOLDS** |
| LF.1 unreduced fractions (P0-2 of `docs/qa-d4-round-1.md`) | **FIXED, and guarded both ways** |
| LF.3 slide 0 lost its era hook | **NO LONGER APPLICABLE as a defect** |

### LF.2 slide 2 handed over two of the four verdicts (fixed)

The lecture's third sentence read:

> A fraction flipped but never negated fails that product, and a horizontal line paired with a
> vertical one is the one perpendicular pair the product cannot test at all, because a vertical
> line has no slope.

`LinearLinePairClassify` mounts on that same slide with four pairs. Pair 2 is
$y = \tfrac{2}{3}x + 4$ against $y = \tfrac{3}{2}x - 1$ — a flip with no sign change, verdict
*neither*. Pair 4 is $y = 3$ against $x = -2$ — the horizontal-and-vertical case, verdict
*perpendicular*. The sentence gave both verdicts away, so two of the four chips were a reading
exercise. The rule itself (negative reciprocal, product $-1$) is what a lecture owes and it
survives; the vertical caveat survives as a **precondition on the product test**, which leaves
Pair 4 answerable from the picture without being answered in advance:

> That product can only be formed when both slopes exist, so a pair holding a vertical line has
> to be settled from the picture rather than from the arithmetic.

Read against the original objection — "the prose hands over the horizontal-perpendicular-to-
vertical case the widget then tests" — the new text names no verdict for any shape. It says
which test is unavailable, and the widget plots both lines when a pair is tapped, so the picture
is where the learner settles it.

### LF.4 slide 1 forbade the step the sentence before it instructed (fixed)

The lecture read:

> Then back-substitute that value to recover the partner coordinate. Substituting back into the
> **same** equation you rearranged is the common trap: it is true for every pair on that line
> and so confirms nothing.

The rearranged equation is precisely where a learner recovers the partner coordinate, and it is
what the pack's own worked example does at step 4 ($x = 3(2) - 2 = 4$). So the slide instructed
a step and then called it the trap. The real trap is putting the isolated **expression** back
into its source equation, which cancels the variable and collapses to an identity. The rewrite
draws that distinction:

> Then put that value back into the rearranged equation, which is the quickest place to recover
> the partner coordinate. The trap is putting the **expression** back into the equation it came
> from instead: the variable cancels and leaves something like $-2 = -2$, which is true for
> every pair on that line and so confirms nothing.

Value versus expression is now the axis, the identity is shown rather than asserted, and the
lecture no longer contradicts its own worked example.

Both sentences are now in `BANNED_PHRASES` in `.cursor/skills/lesson-qa/scripts/scan-lesson-text.mjs`
with their reasoning, so a regression fails at the file and index rather than being argued again.

### `[2, -3]` stays rejected (ruling holds)

LF.4's CFU prompt models the format in as many words: *"Give the solution as an ordered pair,
typed like `(5, -2)`."* The accepted list carries `(2, -3)`, `(2,-3)`, `( 2, -3 )`,
`(x, y) = (2, -3)`, `x = 2, y = -3`, `2, -3` and a further twenty spellings, including reversed
and decimal forms. A learner who follows the instruction is accepted, and square brackets are
the interval notation this curriculum uses elsewhere, so accepting them here would teach that
`[2, -3]` names a point. Recorded so the next round does not re-litigate it.

### LF.1's unreduced fractions (fixed, guarded both ways)

Settled at the tip, on both halves of the card. The authored list carries the unreduced
spellings (`content/lessons/d7/LF.1.json`, three consecutive entries):

```78:80:content/lessons/d7/LF.1.json
      "-2/4, decreasing",
      "-3/6, decreasing",
      "-4/8, decreasing",
```

and the re-ask's speller emits them, so the two graders on one card agree:

```2995:2995:apps/web/src/lessons/cfuVariants.ts
        fractionForms(dy, dx, { unreduced: true }),
```

The guard is `cfuVariants.test.ts`'s census, whose own comment records LF.1 as one of the two
packs that emptied its work list, and which asserts **set equality** against the packs so a
narrowing goes red rather than quiet. This is no longer "claimed but unverified": the claim is
readable in the pack, in the speller, and in a guard that fails in both directions.

### LF.3 slide 0's era hook (not a defect)

The lost phrase was scenery — the notice pinned beside the shielded doors — not a step of the
method. What replaced it still opens on a concrete situation before the algebra
(`LinearModelRateExplore` deals a bike rental and a draining tank), so the slide keeps a
referent for what a rate and a starting value are. R34's three-sentence budget is the binding
constraint and the pedagogical content survived it. Judged **not worth restoring**, and
recorded so it is not re-reported as a loss each round.

`docs/qa-cfu-swarm-d5-d7.md` was read and is superseded on every D7 item it raises: its findings
predate the CFU widening and the three-section migration, and the four items above are the
residue that was still live.

## 3. Mechanical checks

Both clean, at the tip, with the fixes in.

```
OK: 307 learner-facing string(s) across 4 pack(s) and 4107 prose-shaped run(s) across 270 widget file(s), no rendering artifacts.
```

```
  d7: 4 pack(s), 0 error(s), 0 warning(s) -> PASS
check-lesson-packs: 10 domain(s) passed at the error tier.
```

The scanner was run with the four paths the skill documents, including `cfuVariants.ts`. It is
not a test written green: with the two cut sentences re-injected it reports
`FAIL: 2 finding(s)`, naming `LF.2 mini_lesson[2]` and `LF.4 mini_lesson[1]`.

## 4. R34 three-section reading pass, all sixteen slides

Derived rather than eyeballed: a sentence splitter that protects `$...$` runs and decimals from
the split, over every `mini_lesson[i]` and every `worked_examples[i].prompt`.

**Lectures over three sentences: 0 of 16.** Fifteen slides run exactly three; LF.4 slide 3 runs
two. **Worked-example prompts over two sentences: 0 of 16.** Seven run two, nine run one.

Reading section 2's prompt as part of the slide is what surfaced the LF.4 slide 1 contradiction
in section 2 above: the lecture forbade what the worked example on the same slide then did. It
also surfaced one **P3** worth recording and not fixing here: LF.1 slide 2's worked example asks
for the slope through $(4, 1)$ and $(4, 6)$ — an undefined slope — while
`LinearSlopeDirectionClassify` on that slide offers only *increasing*, *decreasing* and
*constant* and holds no vertical line. The worked example is the only place the undefined case
is practised on that slide. Not a leak and not a replay; a coverage asymmetry for whoever
extends that board.

## 5. Worked-example replay sweep, all sixteen pairs, all boards

**No offenders.** Every slide has both a worked example and a gating widget, so the population
is all sixteen pairs with none excused. Each widget's full instance set was read from source,
not from its header comment, and compared against `worked_examples[i].prompt`.

| Slide | Worked example instance | Every instance the widget deals | Verdict |
|---|---|---|---|
| LF.1/0 | $(2,5)$, $(4,13)$, $(7,25)$ | board 1 tables $(1,2)(3,8)(5,14)(7,20)$ / $(0,1)(2,3)(4,7)(6,15)$; board 2 $(2,1)(5,-5)(8,-11)(11,-17)$ / $(1,1)(2,4)(3,9)(4,16)$ | clean |
| LF.1/1 | $(1,5)$, $(4,-1)$, i.e. $m=-2$ | anchor $(-3,-2)$, start $(0,1)$, targets $m=2$ and $m=-\tfrac12$ | clean |
| LF.1/2 | $(4,1)(4,6)$ and $(2,3)(7,3)$ | four lines: $(-4,-3)(2,3)$, $(-2,3)(1,-3)$, $(-4,2)(3,2)$, $(-4,-1)(4,1)$ | clean |
| LF.1/3 | $(-1,-2)$, $(3,6)$ | three pairs: $(-2,5)(4,-4)$, $(-4,-3)(2,5)$, $(5,1)(-1,5)$ | clean |
| LF.2/0 | $y=-5x+2$, intercept to $6$ | $y=3x-2$; and $(0,4)$ falling $2$ per step, i.e. $y=-2x+4$ | clean |
| LF.2/1 | $y=-\tfrac23x+4$ | one line, $y=2x-3$, with eight lattice candidates | clean |
| LF.2/2 | $y=\tfrac52x-1$ against $y=-\tfrac25x+3$ | four pairs: $2/2$; $\tfrac23/\tfrac32$; $-\tfrac14/4$; $y=3$ against $x=-2$ | clean |
| LF.2/3 | slope $3$ through $(2,-5)$ | board 1 $y+2=4(x-1)$; board 2 $y-3=-2(x+5)$ | clean |
| LF.3/0 | $18$ to collect, $6$ per mile | bike rental $8$ flat and $3$ per hour; tank of $40$ draining $2$ per minute | clean |
| LF.3/1 | $(3,17)$, $(7,29)$, $(10,38)$, i.e. $y=3x+8$ | round 1 $m=4,b=7$ at $x=3,5,8$; round 2 $m=-6,b=50$ at $x=2,4,7$ | clean |
| LF.3/2 | $y=9x+40$ | board 1 fee $45$, rate $12$; board 2 fee $30$, rate $18$ | clean |
| LF.3/3 | $y=7x+15$ over $x\in[2,8]$, at $5$ and $20$ | one run: $y=25x+35$ over $x\in[1,10]$, at $6$ and $20$ | clean |
| LF.4/0 | $(4,1)$ against $x+2y=6$, $3x-y=11$ | crossing $2x+y=4$, $x-y=5$; parallel $2x-y=-1$, $2x-y=3$ | clean |
| LF.4/1 | $x-3y=-2$, $2x+y=10$ | one system, $x+2y=11$, $3x-4y=-7$ | clean |
| LF.4/2 | $3x+y=10$, $x-2y=-6$ | one system, $2x+3y=12$, $5x-2y=11$ | clean |
| LF.4/3 | $y=4-x$, $2x+3y=9$ | one run, $3x+4y=6$, $5x-2y=-16$ | clean |

Structural overlap is not a replay and was not counted as one: LF.3 slide 3's worked example and
`LinearModelWalkthrough` both extrapolate at $x = 20$, and LF.2 slide 2's worked example and
Pair 3 are both negative-reciprocal cases. Those are the same *skill*, which is what the widget
is for; the numbers differ in every case.

A reading pass expires when the tree moves, and the authoring wave adds a second board to eight
of these widgets — which is exactly the edit that produced D2's instance, where pool 1 was clean
and pool 2, the board "start over" deals, was the replay. So the sweep is left behind as
`apps/web/src/lessons/d7WorkedExampleReplay.test.ts`, whose header states what it measures, what
it cannot, and the three widgets that assemble instances from numeric fields and so sit outside
its reach (hand-checked, results in the table above).

The LF.2 slide 2 leak in section 2 is a **different defect**: prose against widget, not worked
example against widget. It is kept separate deliberately — the scanner's `BANNED_PHRASES` guards
that one, and this test would never have found it.

## 6. Reveal classification, all sixteen widgets

**The criterion.** A widget owes an R12 reveal when its gate can only be passed by producing
something the learner may be unable to produce, with nothing on the board that converges on its
own. Two shapes qualify: typed entry, where the space of answers is unbounded, and a search over
a lattice too large to exhaust. A bounded chip set whose every miss answers with the specific
misreading it represents does **not** qualify: worst case the learner exhausts it and is taught
at each step, so the slide cannot strand anyone. This is deliberately not "does the file contain
`<input>`" — the historical claim that ten D7 widgets gate on typed entry is not reproducible;
four files contain a text or range input, and the rest gate on chips, steppers or stage beats.

| Widget | Owes a reveal | Reason |
|---|---|---|
| `LinearSlopeRatioTable` | **already has one** | reaches `WidgetReveal` through `FillTable`, with `othersRemain` while blanks are left |
| `LinearSlopeTrianglePlay` | **YES** | gate is two *requested* slopes ($m=2$, then $m=-\tfrac12$) built by walking a point over a 13×13 lattice; the readout says what the learner has built, never what to build |
| `LinearSlopeDirectionClassify` | no — exception | three verdict chips per line, four lines; every miss explains what the sign of the rise means and lets the learner retry, so the board corrects rather than locks |
| `LinearSlopeWalkthrough` | **YES** | typed slope entry across a multi-beat run; it is variant-driven over three pairs, which is what makes a re-asking reveal safe to add here |
| `LinearLineFormBuild` | **YES** | two range sliders against a target given in *words* on the second board ("crosses at $(0,4)$ and drops $2$ for each step right"); the plot draws the learner's line, not the target's, so there is nothing to converge on |
| `LinearLineGraphPlay` | no — exception | eight lattice buttons, six of them named misconceptions that answer with the misreading they represent; bounded and self-teaching |
| `LinearLinePairClassify` | no — exception | the gate turns on all four pairs being **called**, not called correctly, so no answer can hold the slide shut |
| `LinearLineConvertOrder` | **already has one** | reaches `WidgetReveal` through `OrderSteps`, with `othersRemain` while steps are left on the tray |
| `LinearModelRateExplore` | no — exception | three chips to tag, gate is the two correct tags, and the input chip's miss names why an input is not part of the model |
| `LinearModelTableBuild` | **YES** | typed $m$, typed $b$ and a typed prediction; nothing bounds a number field |
| `LinearModelClaimSpot` | **already has one** | reaches `WidgetReveal` through `SpotTheError`, twice, with `othersRemain` until the line is fixed |
| `LinearModelWalkthrough` | no — exception | auto-play stage board: Replay, no Start over, and no typed answer to be trapped by |
| `LinearSystemGraphExplore` | **YES** | the learner walks a marker to the crossing over a 13×13 lattice and must then verify it; "which line you are on" is a hint, not the point |
| `LinearSystemSubstitutePlay` | **YES** | two typed solves — the single-variable solve, then the back-substitution — and the second is where a learner who has done the method correctly still stalls |
| `LinearSystemEliminateBuild` | no — exception | four multipliers each side, sixteen pairs, and a refusal that prints the actual scaled coefficients back; bounded and informative |
| `LinearSystemWalkthrough` | no — exception | auto-play stage board: Replay, no Start over, no typed answer |

**3 already have one, 6 owe one, 7 are named exceptions.** This corrects the working figure: 13
*lack* a reveal, but only 6 *owe* one, and the seven exceptions above are a named list with a
reason each rather than a silent omission. Per `.cursor/rules/qa-verification.mdc` the authoring
PR should assert that list **in both directions** — an exception that grows a typed answer or an
unbounded search must fail, and an exception that quietly adopts a reveal must fail too, so
neither the list nor the population can drift out from under the other. No reveal was
implemented here.

## 7. The eight replaying resets, and what a second board needs

The eight are the widgets whose `lesson-interactive__reset` handler restores the board it was
already showing. Three widgets reset *and* re-parameterise and are not in this list:
`LinearSlopeWalkthrough` ("Start over with a different pair", `useWidgetVariants(3)`),
`LinearModelTableBuild` ("Try another table", two rounds) and `LinearModelRateExplore` ("Try
another description", two scenarios). Three more reset through their kind and are variant-driven
already. Two are Replay-only walkthroughs. 8 + 3 + 3 + 2 = 16.

**The trap, restated because it is cheap to fall into:** `useWidgetVariants` with `count === 1`
satisfies R10 to the eye while disarming the reveal-redraw guard, which needs a *different*
board to redraw to. Every one of these eight owes at least two genuinely different boards.

| Widget | Current board | What a second board needs | Difficulty |
|---|---|---|---|
| `LinearSlopeTrianglePlay` | anchor $(-3,-2)$, start $(0,1)$, targets $m=2$ and $m=-\tfrac12$ | a new anchor with one whole-number and one fractional target, both reachable inside $\pm6$, and a start on neither. `(2,3)` with $m=-3$ (at $(3,0)$) and $m=\tfrac23$ (at $(5,5)$) works | easy |
| `LinearSlopeDirectionClassify` | four lines: increasing, decreasing, constant, shallow-increasing | four more, keeping the level line and the shallow riser, because "barely rising" filed as constant is the misconception the board exists for. $(-3,4)(3,-2)$, $(-4,-2)(4,-2)$, $(-5,-1)(5,1)$, $(-2,-4)(1,5)$ | easy |
| `LinearLineFormBuild` | $y=3x-2$ stated; $(0,4)$ falling $2$ described | one target stated as an equation and one described in words, both inside the slider ranges | easy |
| `LinearLineGraphPlay` | $y=2x-3$, eight candidates | the intercept, one slope step, and six *named* misreadings, all distinct lattice points inside the window and none of them on the line. $y=-3x+2$ works but its $y$ range runs $-1$ to $5$ against the current window's $-6$ to $4$, so the window needs re-fitting per board | **moderate** — the window is currently a module constant |
| `LinearLinePairClassify` | four pairs: parallel; flip-not-negated; negative reciprocal; horizontal against vertical | the same four *kinds*, since two of them are the traps the board exists for. $y=-3x+2/y=-3x-4$; $\tfrac34/\tfrac43$; $\tfrac25/-\tfrac52$; $y=-4$ against $x=1$. Whatever is chosen, its verdicts must stay unstated by LF.2 slide 2 — the rewrite in section 2 states only the rule, so this is safe as long as it is not undone | easy |
| `LinearSystemGraphExplore` | crossing $2x+y=4$, $x-y=5$; parallel $2x-y=-1$, $2x-y=3$ | a crossing at an in-window lattice point plus a genuinely parallel pair, both visible across $\pm6$. $3x+y=5$ with $x-2y=-3$ crosses at $(1,2)$; $x+3y=6$ with $x+3y=-3$ is parallel | easy |
| `LinearSystemSubstitutePlay` | $x+2y=11$, $3x-4y=-7$, solution $(3,4)$ | **exactly one** of the four variable/equation slots may carry a coefficient of $1$ — that uniqueness is the entire first beat — and the solve must stay integral, and the two distractors must remain the two sign slips of the isolation. $2x+y=8$ with $3x-2y=5$ gives $(3,2)$ and has one unit coefficient | **hard** — two constraints that fight each other |
| `LinearSystemEliminateBuild` | $2x+3y=12$, $5x-2y=11$, solution $(3,2)$ | neither variable may cancel without scaling **both** equations, so no coefficient may divide its partner in either variable; the multiplier chips must contain the correct pair plus the "equal, not opposite" trap; and the result must be integral. $3x+2y=12$ with $2x-5y=-11$ gives $(2,3)$ and needs $\times2$ and $\times-3$ | **hard** — same, plus the chip sets are module constants |

The two hard ones are hard for the same reason: their boards are built around a *uniqueness*
property (one unit coefficient; nothing divides its partner) that most randomly chosen systems
violate, and an integer solution on top. Both have a worked candidate above, so neither is
blocked — but neither should be handed to a generator without the constraint written down first.

## Checks run

`npm run typecheck` clean. `npm run lint` reports 0 errors (38 warnings, 24 infos, none of them
in a file this round touched). `npm run format:check` clean. `npm run check:lessons` clean at the
error tier for all ten domains. Scanner clean on the documented four-path invocation.

## Browser guards made owed

Not run here; named for the serial pass:

- `apps/web/src/lessons/threeSectionFlow.browser.test.tsx` — LF.2 slide 2 and LF.4 slide 1 have
  new lecture text, and it renders the three sections.
- `apps/web/src/lessons/widgetRevealReAsk.browser.test.tsx` and
  `widgetQaFixes.browser.test.tsx` — they mount D7 visual ids, and although no widget behaviour
  changed this round, the new guard's population is derived from the same registry.

The prose changes touch no widget behaviour and the new test is a source sweep, so no browser
guard should change state. Anything that does is a finding, not a flake.

## 8. What the authoring pass closed (added 2026-08-04)

Written by the authoring pass on `anthony/d7-authoring`, stacked on this branch. Full account in
[`work-log/anthony/2026-08-04-d7-authoring.md`](../work-log/anthony/2026-08-04-d7-authoring.md).
Sections 6 and 7 above are the specification; this section records what was built against it and
where it deviated.

**Section 6's six reveals are all implemented**, each wired
`useRevealReAsk({ reAsk: onRestart, release: onSolved })` and each passing a **dynamic**
`othersRemain` — `hits.length + 1 < targets.length`, `row < 2`, `index < targets.length - 1`,
`beat < 2`, `round === 0`, `beat < 3` respectively. That is the deliberate decision section 6
asked for: no D7 reveal has a board holding exactly one answer, so no D7 widget belongs in
`NEVER_HANDS_BACK`. D7 now reaches a reveal on **9 of 16** widgets, and the seven exceptions
stand unchanged.

**Section 7's eight resets are all implemented, and a ninth was added.**
`LinearModelTableBuild` is listed above as already re-parameterising, which is true of what a
learner sees but not of how: it rotated its two rounds out of its own `index` state rather than a
variant pool, so it sat in `SINGLE_BOARD` and its reset could not redraw for the reveal it was
about to be given. It is now `useWidgetVariants(ROUNDS.length)`. `SINGLE_BOARD` therefore loses
nine, not eight, and D7's remaining three are the two Replay-only walkthroughs and
`LinearModelRateExplore`.

**One deviation from the sketches, and it is the one flagged as moderate.** Section 7 proposed
`y = -3x + 2` for `LinearLineGraphPlay` and noted its `y` range runs `-1` to `5` against the
window's `-6` to `4`, concluding the window must be re-fitted per board. The pass chose the other
branch the brief allowed: **a second line that fits, rather than a widened window.** The window is
what makes one slope step square on the page, and a per-board window would have to re-derive the
grid, the ticks, the tick obstacle boxes and the label frame from it, all to buy nothing a learner
sees. `y = -2x - 1` falls where board one rises — so the sign misreading turns over, and a learner
who cleared board one by always stepping up is caught — and its intercept, its slope step and all
six named misreadings lie inside the existing box, none of the six on the line, no two coincident.

**Both hard boards came out as sketched, checked before authoring rather than after.**
`2x + y = 8` with `3x - 2y = 5` has coefficients `{2, 1, 3, -2}`, exactly one of them `1`, and it
is on the other letter than board one's, so the habit board one rewards does not transfer; it
solves at `(3, 2)`. `3x + 2y = 12` with `2x - 5y = -11` has `3` not dividing `2` and `2` not
dividing `-5`, so both equations need scaling; it solves at `(2, 3)`; its multiplier chips carry
the cancelling pair (`×2` against `×-3`) and the equal-not-opposite trap (`×2` against `×3`).

**The replay sweep this section exists to protect stayed green over all nine new boards**, and was
shown still able to fail at the end of the pass: `"x - 3y = -2"` added to
`LinearSystemSubstitutePlay` produces
`LF.4 slide 1: ./interactive/LinearSystemSubstitutePlay.tsx deals "x-3y=-2", which its worked example already solves`.

**One thing section 6 asked for was not done.** It asks the authoring PR to assert the reveal
exception list in both directions. `widgetVariantPool.test.tsx`'s `SINGLE_BOARD` has the same
one-directional gap: a visual that mounts without a pool must be listed, but a listed visual that
grows a pool passes silently. Closing either means adding an assertion over a population D1 and D5
are editing concurrently, in the file all three lanes rebase through, so it was left rather than
smuggled into the baseline the other two rebase onto. **NOT DONE**, and owed by the pass that
holds all three domains at once.

**`linear-slope-triangle-play` could not be swept**, and is recorded in
`REVEAL_SWEEP_BLOCKED` rather than `REVEAL_VISUALS`. It is a limit of the driver and not a widget
defect: `poke` has never pressed `.lesson-interactive__direction-key`, and the DirectionPad is
that board's only input, so no wrong attempt can be made and the reveal is never put on offer.
This is the second exemption of that kind after `rate-table`, which that file's own docblock says
is the point at which the driver should be fixed — but teaching it those keys changes every
domain's sweep, since `PiecewiseGraphBuild` and `CoordinateGridPlot` mount them too, so it is a
driver pass rather than a D7 authoring one.
