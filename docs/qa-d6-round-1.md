# D6 QA round 1

Branch `anthony/d6-qa-round-1`, based at `6b819339`, reported at `6bbda996`. Worktree
`C:/Users/<user>/Code/work/wt-d6-qa`. **No PR is open**, so nothing here has reached
`integration` and every claim below is a claim about a branch.

D6 was the last of the ten domains with no QA round of its own — `docs/qa-d*.md` covered d1
through d10 except d6. This closes that gap for the eleven packs (`CG.1`, `FUN.1` to `FUN.10`),
their 45 gated widgets, their 55 practice templates and their 11 CFUs.

**Scope note, because this round was split across agents.** The evidence phase (reconciliation,
mechanical checks, sweeps, the frozen baseline) is written up in full at
`.qa-frames/d6/round-1-evidence.md` and is the source for section 1 and for the findings labelled
`F1`–`F10`. A sibling reading pass produced the R34 and vocabulary findings. This document is the
round's report; where the two numbering schemes disagree, both labels are given.

**Every number below was re-measured at `6bbda996` rather than carried forward.** That is not
ceremony: doing it caught a figure in my own brief. See "Corrections to the record", item 4.

---

## 1. Reconciliation of the carried items, at `6b819339`

Taken from `.qa-frames/d6/round-1-evidence.md` §1, with a Round-1 disposition column added.

| # | Carried item | Status at `6b819339` | Disposition in round 1 |
|---|---|---|---|
| 1 | `D6Chart` window untuned (symmetric empty margins on wide plots) | **STILL BROKEN** — reproduced in a frame, not argued. `worked/d6Kit.tsx:149` still read *"The window is passed in rather than derived"*. `d6.cg1.distance.l3`'s triangle used the left ~60% of the plot with the right ~40% empty grid | **FIXED** (F-23c). `worked/d6CG1.tsx` now derives a proportional, aspect-corrected `planeWindow`. Frame re-taken and looked at — see §5 |
| 2 | `FUN.1` ~10px reflow when controls collapse to "Start over" | **STILL BROKEN** — could not reproduce, which under `qa-verification.mdc` leaves it broken. No guard covers it; the "leaves every control where it was" pattern exists only for FUN.2 | **NOT DONE**, carried. No reproduction was obtained this round either, so it is not claimed fixed |
| 3 | `d6BreakEndpoints` guard scoped to `d6.fun3.` only | **STILL BROKEN** — `d6BreakEndpoints.test.tsx:50-51` filtered on `template_id.startsWith("d6.fun3.")`. Co-extensive with the behaviour *today* only because `D6BreakLine` has one importer | **FIXED** (F-25). Population now derived from the figure registry, with a floor, a composition assertion and a both-ways exception list |
| 4 | `boundary-eval.l2` caption, *claimed but unverified as a rendered frame* | **STILL BROKEN**, and diagnosed: it is an SVG `<title>` on an element that also carries `aria-label`, so it paints nothing and is inert for assistive tech. There was never a frame to take. Promoted to F1 | **HELD, and downgraded** — then narrowed again on re-check. See §4, "Overturned and re-ruled" |
| 5 | Six accepted lecture/widget overlaps (`CG.1` s1, `FUN.2` s1, `FUN.8` s3, `FUN.9` s2, `FUN.10` s1 and s3) | **STILL BROKEN** (accepted, not fixed). All six slides carry both a lecture paragraph and a widget | **Five stand; one is misfiled.** `FUN.8` s3 is not an accepted overlap — see "Corrections to the record", item 3 |
| 6a | `FUN.6`'s hint stating `(4+h)^2 = 16 + 8h + h^2` | **STILL BROKEN** (accepted by design) — verbatim at `FUN.6.json:47` and again at `:55` | **FIXED**. The hint no longer performs the expansion; the worked example still does, which is where it belongs |
| 6b | `FUN.7` as the thinnest pack | **STILL BROKEN, and the label is measurably wrong** — `FUN.1` = 1166 chars of `mini_lesson`, `FUN.7` = 1180 | **FIXED on the substance, and the label corrected.** Both packs took R34 work; `FUN.1` took more. See "Corrections to the record", item 2 |
| 7a | Held: "telemetry loft" where the Atomic Age guide says "control hall" | **STILL BROKEN** (held, era owner's lane) — 12 occurrences | **HELD**, and the brief's framing is inverted by the census. See §4 |
| 7b | Held: the string-to-payload adapter the multipart CFUs need (cross-domain, 16 packs) | **STILL BROKEN**, unverified beyond D6. Within D6, 9 of 11 packs have no `cfu.check` | **HELD** (cross-domain). Round 1 widened *acceptance* inside D6 without touching the adapter |
| 8 | `todo.txt:25`, FUN.4's "strip chart in the control hall" opening, as an R15 candidate | **STILL BROKEN — a genuine R15 cold opening**, on one term of four: **"the trace"**, definite article, first mention, and the pack's load-bearing noun | **FIXED**. `FUN.4.json:5` now names the trace where the recorder is introduced: *"the ink line it leaves behind is the **trace**"* |

### Also carried in the named logs, though not on the plan's list

| Item | Status at `6b819339` | Disposition |
|---|---|---|
| Chip labels 7.40px left of their buttons' middles (`2026-08-03-chip-label-element.md`) | **STILL BROKEN** (recorded and accepted). The guard's tolerance is pinned to the defect | **NOT DONE**, out of scope — shared kind, not D6's |
| Worked-example fold (`2026-08-06-d6-three-section.md`) | **FIXED** by #719's `ScrollMoreCue` — but *claimed but unverified*: no fold frame was taken on a D6 board | **Still unverified.** No fold frame was taken this round either |
| "10 null worked examples" | **STILL BROKEN**, and the plan's count of 12 is wrong | **8 of 10 filled.** See §3 and "Corrections to the record", item 1 |
| Advisor bubble clipping | **STILL BROKEN** — *claimed but unverified*, no frame, no guard | **NOT DONE**, carried. No frame taken |

---

## 2. Findings

Grouped as the round worked them. `F1`–`F10` are the evidence report's labels; `F-nn` are the
round brief's.

### Group 1 — correct answers graded wrong (P0/P1)

Reproduced through the shipped `gradeCfuAnswer`, not a re-implementation, over **7,378 gradings**
across 11 packs and 22 instances (11 authored asks + 11 computed re-asks). 22 rejections, all of
them correct answers being refused, in four groups.

| ID | Finding | Evidence |
|---|---|---|
| F2 | Five packs reject a two-part answer given in the other order; two accept it. `CG.1`, `FUN.1`, `FUN.3`, `FUN.5`, `FUN.10` reject; `FUN.4`, `FUN.8` accept | 12 verbatim rejections, both instances affected |
| F3 | `FUN.3` and `FUN.5` reject roster braces around a set of numbers (`{38, 14}`, `{2, -4}`) | 6 rejections; `answerFormat.ts:409` teaches brace notation in the same field elsewhere |
| F4 | A rejected `+71` is told *"not the expression"* | 3 rejections; `+71` is a single number, so the note names the wrong defect |
| F5 | `FUN.2` calls `(-oo, 12]` unreadable while accepting `-inf`, `-infinity` and `-∞` | 1 rejection, with the composed learner sentence captured |

### Group 2 — R34 teaching gaps

The first R34 pass on D6. Ten of the 44 teaching slides declared `worked_examples: null` — the
lecture and the gated board with no worked example between them.

### Group 3 — R21/R23/R32 vocabulary in widget label slots

| ID | Surface | Finding |
|---|---|---|
| F-6 | `ComposeSeriesExplore` (FUN.7) | Column headings paraphrased "input"/"output" |
| F-7 | `CoordinateInterceptRead` (CG.1) | Stage names paraphrased "x-intercept"/"y-intercept" |
| F-11 | `CoordinateDistanceMidpoint` (CG.1) | "center" for **midpoint**, "length" for **distance** |
| F-21 | `GraphFeatureTable`, `GraphFeatureWalkthrough` (FUN.4) | Labels paraphrased maximum/minimum/absolute maximum/absolute minimum |
| — | `DomainRestrictionClassify` (FUN.2) | Sibling labels answered different questions (R22) |
| — | `GraphIntervalClassify` (FUN.4) | Miss copy led with the penalty (R33) |

### Group 4 — other P1s

| ID | Finding |
|---|---|
| F-14 | `FUN.4`'s item bank named the union symbol three different ways across its hints |
| F-16 | Four `FUN.2` hints asserted a property of the learner's own instance (R13 leak) |
| F-18 | `FUN.9`'s themed parity prompt offered choices its grader did not accept |
| — | `FUN.2`'s R16 hinges at `:6` and `:7` were ambiguous about their referent |
| — | `FUN.5`'s sign rule described the numerator's sign without saying why the denominator is always positive |
| — | `FUN.6`'s slide subtitles pre-empted the discovery (R14) |

### Group 5 — figures and guards

| ID | Finding |
|---|---|
| F-22 (F1) | Five FUN.3 `<svg><title>` strings paint nothing and are inert for assistive tech |
| F-23a (F6) | `d6.fun10.reach.l2`'s vee clipped at the top with dead space below |
| F-23b (F7) | `D6BreakLine` padded 30% each side with a 2-unit floor, so a narrow rule used a third of its line |
| F-23c | `d6.cg1.distance.l3`'s plane left the right ~40% empty |
| F-25 (F9) | `d6BreakEndpoints` scoped its population by `template_id` prefix, not by behaviour |
| F-8 | `answerFormat.ts` and `unreadableAnswer.ts` carry D6 learner-facing prose and were outside every scanned path |

---

## 3. Fixed, and held

### Fixed

**Answer acceptance.** `cfuVariants.ts` now passes `reversed: true` for `CG.1`, `FUN.1` and
`FUN.10` — the three packs whose two parts cannot be mistaken for one another (a point and a
scalar, a number and a verdict word). `answerFormat.ts`'s `isNumericLiteral` accepts a leading
`+`. `d6CfuAcceptance.test.tsx` was rebuilt to derive respellings from each instance's own
canonical key rather than grading the author's list back at itself, sweeping both the authored ask
and the computed re-ask: **55 respellings over 9 packs**, floored per kind. Five separate reds were
demonstrated against it by injection.

**Another lane found the same `isNumericLiteral` defect the same day and was boundaried out of
fixing it**, which is the clearest evidence available that it is product-wide rather than D6's.
D4 round 3 (#731, merged into
`integration` while this round was open) reports under *"Reported and NOT fixed, being shared
machinery outside the agreed fix boundary"* that *"numeric CFUs reject a leading `+` before the
checker ever runs (`answerFormat.ts:14`'s regex has no `+` branch) on prompts that say 'with its
sign'"* — **3 of its 4 numeric instances**, against practice items that accept the same spelling.
Two rounds reached the same regex from opposite ends of the bank, independently, on the same day.
The two other shared defects that round names are **not** touched here and stay open: the U+2212
minus rejected although KaTeX paints it, and `MatchPairs`/`FillTable` tinting held items in the
hues reserved for right and wrong.

**Content.** Eight of the ten null worked examples filled (`FUN.1` ×2, `FUN.8` ×2, `FUN.6` ×2,
`FUN.4` ×1, `FUN.10` ×2 — `FUN.3`'s two and `FUN.8` s3 remain). `FUN.4` names the trace and the
union sign; `FUN.1` defines *relation* and corrects "center" to **origin**; `FUN.10` uses
*maximum*/*minimum* and glosses half-line interval notation; `FUN.2`'s two hinges and `FUN.5`'s
sign rule rewritten; `FUN.6`'s hint stops expanding the bracket and its subtitles stop pre-empting.

**Widgets.** Six widgets moved to defined terms in their label slots, one to consistent sibling
labels, one off penalty-first miss copy. Guarded by a new `d6WidgetTermSlots.test.tsx`, shown red
by reverting "midpoint" to "center".

**Item bank.** Four `FUN.2` hints rewritten off the leak; `FUN.9`'s parity prompt aligned to its
accepted tokens, with a **scoped, hand-edited re-pin** of the single affected line in
`d6.test.ts.snap` (`8802f3c8` → re-measured after; `vitest -u` was never run).

**Figures and guards.** All three window fixes, `d6BreakEndpoints` re-scoped, and the scan
invocation widened to the two answer-field surfaces.

### Held, with reasons

| Held item | Reason |
|---|---|
| Era vocabulary ("telemetry loft" / "control hall") | Era owner's lane, and the census inverts the brief — see §4 |
| The cross-domain string-to-payload CFU adapter | Cross-domain (16 packs). Round 1 widened acceptance inside D6 without touching the shared adapter |
| `FUN.6`'s empty `prereqs`, and the `FUN.2` graph edge | Skill-graph lane |
| `./kinds/OrderSteps` miss copy | Shared kind, well beyond D6 |
| `oo` for infinity (F5) | **Ruled not a defect.** A documented parser limitation, and D3 — where infinity notation is taught — instructs `inf` explicitly. Accepting `oo` in D6 alone would make D6 disagree with the lesson that teaches the notation |
| Roster braces (F3) | **Overturned** — see §4 |
| `FUN.3` and `FUN.5` reversed order (part of F2) | **Deliberately not fixed** — see §4 |
| `FUN.8` slide 3's null worked example | Recorded as an open R34 gap, not fixed. See "Corrections", item 3 |
| Chip label placement, advisor bubble clipping, `FUN.1` reflow, the `#719` fold frame | Carried unreproduced or out of lane; none is claimed fixed |

---

## 4. What this round got wrong, and what changed direction

A round that lists only confirmations is not reporting its own error rate. Four items moved after
the tree was read, and one of my own supplied figures was stale.

**The reversal ruling changed direction.** The brief proposed either accepting reversed order
everywhere or adding an explicit ordering sentence everywhere. Reading `cfuVariants.ts` showed the
codebase already had a considered rule: `reversed: true` is passed exactly where the two parts
cannot be confused for one another. Under that rule `CG.1`, `FUN.1` and `FUN.10` should have had it
and did not — a point and a scalar, or a coordinate and a verdict word, are never ambiguous. But
`FUN.3` and `FUN.5` hand back **two bare numbers**, and there a reversed answer is not a
respelling: it is the misconception of evaluating the pieces in the wrong order, which the pack
exists to catch. Accepting it would have graded a wrong answer right. So five packs were not made
uniform; three were fixed and two were deliberately left strict, with the reason written into
`cfuVariants.ts` beside them.

**Roster braces (F3) was overturned.** The finding argued that `{38, 14}` should be accepted
because `answerFormat.ts` teaches brace notation. It does — for `solution_set` answers. `FUN.3` and
`FUN.5` do not ask for a solution set; they ask for two evaluations in a stated order, and braces
assert a set, which is unordered. Accepting them would contradict the order the prompt asks for and
collide with the ruling above. Not fixed, by decision rather than by omission.

**The dead-caption finding (F-22 / F1) was downgraded, then partly reinstated.** The finding said
five authored FUN.3 captions "reach nobody". The `<svg><title>` half is true and is confirmed
tree-wide: four sites in `d6Kit.tsx` (`:339`, `:692`, `:888`, `:994`) render `<title>` on an
element that also carries `aria-label`, which wins the accessible name. But the teaching prose
reaches the learner through a **separate visible caption** that `LessonProse` draws, which is
present in every frame in §5. So no idea is lost. On re-check the finding survives in a narrower
form than "a caption reaches nobody" and a wider scope than FUN.3: the `title` prop is dead
metadata at four shared call sites, tree-wide, and the specific sentence at `worked/d6FUN3.tsx:143`
is genuinely read by no one. See §6 for the side-by-side.

**The era vocabulary census inverted the brief, which is the useful part.** The brief held
"telemetry loft" as unsanctioned and "control hall" as the guide's word. Measured:

- "telemetry loft" and "control hall" appear in `content/lessons/d6/*.json` (FUN.4 ×2, FUN.5,
  FUN.6, FUN.9, FUN.10) and once in D7's `LF.1.json`.
- The Atomic Age style guide's per-node **building** names are **the Weather Office** (`FUN.4`),
  **the Radio Workshop** (`FUN.6`) and **the Wind Tunnel** (`FUN.5`)
  (`docs/superpowers/specs/eras/era-08-atomic/style-guide.md:792-795`, `:831-861`).
- **None of those three appears anywhere in `content/`, `packages/` or `apps/`** — only in
  `docs/superpowers/specs/eras/` and `output/imagegen/`.

So "control hall" is the guide's *mass-level venue* (the guide records the lead naming it directly
at `:831-832`), not a building name, and the three building names have never been written into a
shipped surface. **This is a first naming, not a rename**, it is per node rather than a
find-and-replace, and it is squarely the era owner's call. Held, and worth more than the original
finding was.

---

## 5. Spatial evidence: the three window fixes, looked at

`qa-verification.mdc` is explicit that a spatial claim owes a rendered frame that someone LOOKED
at, and that a passing layout guard does not discharge it. All three fixes were initially reported
as *claimed but unverified* for exactly that reason. Frames below were taken at **1024x580** in the
920px lesson column a learner is given (`CITY_DESKTOP`, not the 460px `FIGURE_CONTENT_CAP` the
layout guards spot-check at), never through `?dev`, and each one was opened and read.

Stable copies:

- `C:/Users/<user>/Code/work/wt-d6-qa/.qa-frames/d6/round-1-fixes/F23a-vee-fun10-reach-1024x580.png`
- `C:/Users/<user>/Code/work/wt-d6-qa/.qa-frames/d6/round-1-fixes/F23b-break-fun3-three-piece-1024x580.png`
- `C:/Users/<user>/Code/work/wt-d6-qa/.qa-frames/d6/round-1-fixes/F23c-plane-cg1-distance-1024x580.png`
- `C:/Users/<user>/Code/work/wt-d6-qa/.qa-frames/d6/round-1-fixes/mount-check-cityshell-cg1-1024x580.png`

**F-23a, `d6.fun10.reach.l2`.** Both arms of the vee now terminate inside the plot with about 20px
of headroom above them, and the vertex sits dead centre horizontally (x=463 in a plot spanning
285-645). Vertical slack is 21px above and 26px below — balanced, where before the arms ran off the
top edge and the bottom fifth was empty. Nothing is clipped; the card, its rounded corners and the
page around it are all visible.

**F-23b, `d6.fun3.three-piece-eval.l2`.** The rule now runs -7 to -3 with the marked content
(-6 to -4) occupying the middle ~50%, 95px of slack left and 94px right. Before, the 2-unit floor
gave a window of -8 to -2 and put everything in the middle third. The `x = -5` callout, both
endpoint dots, the three-line legend and both footer equations all sit inside the card with margin.

**F-23c, `d6.cg1.distance.l3`.** The triangle is now centred on both axes — its centre is (464, 162)
in a plot whose centre is (465, 162). Slack is symmetric (~37% each side) rather than all piled on
the right. That remaining slack is the price of a square grid: the data is 3 wide by 4 tall in a
plot that is 360 by 180, so the x-range must exceed the y-range or the legs labelled 3 and 4 would
read as the wrong proportion. Correct behaviour, not residual defect. Nothing clipped.

**On the mount.** The rule warns that a component mounted on bare `document.body` resolves the
`.city-shell` panel tokens to nothing and renders every glass panel transparent. That warning was
tested here rather than argued: the same figure was mounted **inside** `.city-shell` and
re-photographed (fourth path above). Inside the shell, `--glass-fill-strong` resolves to `#ffffff`
and the figure's background computes to `oklch(0.93 0.026 88)` — and the frame is identical inside
the lesson column, differing only in the page behind it (the fixed sky gradient instead of grid
paper). Nothing in this subtree consumes a `.city-shell` token, so the frames are not lying. This
is also asserted permanently in `d6WorkedShots.browser.test.tsx`'s *"the bare mount resolves this
surface's own tokens"* test.

---

## 6. The caption ruling, side by side

For `d6.fun3.three-piece-eval.l2`, the figure in the F-23b frame above.

The inert `<svg><title>`, `worked/d6FUN3.tsx:194`:

> "Three stretches, with the double-conditioned middle one owning the input"

The **visible** caption that `LessonProse` draws, `worked/d6FUN3.tsx:204`, verbatim from the frame:

> "The middle condition is TWO tests, not one: $-5$ has to be at least $-6$ AND under $-4$, and both
> have to pass before that formula may be used. Its left end is filled and its right end hollow, so
> $x = -4$ belongs to the stretch above instead. The two flat stretches are constants, so a learner
> who takes the wrong one lands on a number the middle formula never produces."

And for the figure the finding actually named, `d6.fun3.boundary-eval.l2` — `title` at
`worked/d6FUN3.tsx:143`:

> "An input exactly on the break, claimed by the one condition that is not strict"

`caption` at `worked/d6FUN3.tsx:151`:

> "The input is the break itself, so the answer is decided entirely by which inequality is allowed
> to touch it. Only one stretch may, and the endpoint drawn at $2$ is that one filled: it belongs
> to the lower stretch, and the other stops just short. The two formulas genuinely disagree here,
> so picking the wrong one is visible in the number."

**Ruling: different text, same idea, so the finding survives narrowly and changes shape.** The
literal sentence at `:143` is read by nobody — that is confirmed, and it is true of all five FUN.3
`title` strings and of the `ariaLabel`-shadowed `<title>` at all four `d6Kit.tsx` call sites. But
the pack's hardest idea, an input landing exactly on the break, is **not** lost: the visible caption
states it at greater length and with the instance's own numbers, and a learner reads it directly
under the figure. So what is dead is redundant one-line metadata, not teaching. The residual defect
is that `D6BreakLine` and its three siblings require a `title` prop that nothing consumes, which
invites authors to keep writing prose into a hole. That is a shared-kit signature change affecting
every D6 figure archetype, so it is **recorded here and not fixed in this round**.

---

## 7. Coverage

**Nodes.** All 11 D6 packs: `CG.1`, `FUN.1`, `FUN.2`, `FUN.3`, `FUN.4`, `FUN.5`, `FUN.6`, `FUN.7`,
`FUN.8`, `FUN.9`, `FUN.10`. Taken from the data, not from a list.

**Directories.** `content/lessons/d6/`, `packages/item-bank/src/d6/`,
`apps/web/src/lessons/interactive/`, `apps/web/src/lessons/worked/`,
`apps/web/src/lessons/cfuVariants.ts`, and — new this round — `apps/web/src/lessons/answerFormat.ts`
and `apps/web/src/lessons/unreadableAnswer.ts`.

**Surfaces and sweeps, with the cases each actually measured.**

| Sweep | Cases measured | Result |
|---|---|---|
| CFU grading through the shipped `gradeCfuAnswer` | **7,378 gradings**, 11 packs × 22 instances | 22 rejections, all correct answers |
| Answers re-derived from rendered prompt text only | **3,300 derivations** (55 templates × 60 draws) | 0 mismatches |
| Learner-facing prose scan (`scan-lesson-text.mjs`) | **456 strings across 11 packs, and 5,621 prose-shaped runs across 351 widget files** | 0 rendering artifacts |
| Respelling guard (`d6CfuAcceptance.test.tsx`, rebuilt) | **55 respellings over 9 packs**, both instances | Pass; 5 reds demonstrated by injection |
| Pack validator (`check:lessons`, `--strict`) | 11 D6 packs (10 domains overall) | 0 errors, 0 warnings |
| Item-bank D6 unit tests | **95 tests over 2 files** | Pass |
| jsdom lesson tests (`apps/web/src/lessons`) | **6,722 tests over 79 files** | 6,721 pass, 1 fail — a D5 timeout that does not reproduce on either tree in isolation; triaged below |
| Chromium browser guards | 1,091 tests, in batches of ≤9 files at `--maxWorkers=2` | Pass. *Previous reading from this round's verify phase, not re-taken for this report; the content tree has not moved since* |
| Rendered frames looked at | 3 fix frames + 1 mount-fidelity comparison, all at 1024x580 | See §5 |

**Frozen.** `d6.test.ts.snap` moved by exactly one line, hand-edited for `FUN.9`'s prompt change.
Baseline `8802f3c8dc2eb145114b65b9e66965cb27320b27` recorded before; `vitest -u` never run; the
other 12 snapshots are byte-identical.

**Reported but NOT fixed** (the distinction step 7 asks for): everything in the "Held" table in §3,
plus the residual `title`-prop signature in §6, plus `FUN.3`'s two remaining null worked examples
and `FUN.8`'s slide 3.

**Not covered by this round at all.** Non-similarity across the bank — still never swept anywhere,
in any domain. The cross-domain half of the CFU adapter question (15 packs outside D6). A rendered
fold frame confirming `#719`'s `ScrollMoreCue` on a D6 board. An advisor-bubble clipping
reproduction. The `FUN.1` control-collapse reflow.

---

## Corrections to the record

Each of these has now cost someone a round, which is why they are written down rather than fixed
quietly.

**1. The plan's "12 null worked examples" is 10.** `d6_qa_round_1_ebcdd226.plan.md:96` says
*"`FUN.1`, `FUN.3`, `FUN.6` and `FUN.8` each null two of four, `FUN.4` and `FUN.10` one — those 12
skips."* Its own list sums to 4×2 + 2 = **10**, the tree has 10, and
`work-log/anthony/2026-08-06-d6-three-section.md` said 10 at the time. An R34 pass working from the
plan goes looking for two slides that do not exist.

**2. "FUN.7 is the thinnest pack" is wrong; `FUN.1` is.** Measured `mini_lesson` character totals
across all 11: FUN.1 = 1166, FUN.7 = 1180, FUN.6 = 1341, FUN.5 = 1361, FUN.2 = 1625, FUN.8 = 1702,
FUN.3 = 1748, FUN.10 = 1844, CG.1 = 1921, FUN.9 = 1959, FUN.4 = 1984. `FUN.1` also nulled two of its
four worked examples while `FUN.7` declared all four, so the pack singled out as thinnest was the
better-provisioned of the two.

**3. `FUN.8` slide 3 is misfiled as an accepted overlap.**
`work-log/anthony/2026-08-06-d6-three-section.md:61-66` lists six lecture/widget overlaps accepted
*"with a reason: in each the two boards exhaust the available cases, so there is no re-instance to
move the example to."* That reason does not hold for `FUN.8` s3. Its board,
`inverse-one-to-one-classify`, holds **eight** sampled graphs, four one-to-one and four not
(`InverseOneToOneClassify.tsx:45-88`), drawn from an unbounded space of functions — a ninth is
freely available, so nothing is exhausted. The slide simply has no worked example, and
`FUN.8.json:29` still reads `null`. It is an **open R34 gap**, not an accepted overlap, and it is
recorded here rather than fixed so the decision is reviewed rather than slipped in at report time.

**4. My own brief's string count had expired, and re-measuring caught it.** The brief for this
report specified *"416 strings and 5,621 prose runs over 351 files after the scan widened"*. The
runs and files are exact; **the string count is 456, not 416**. 416 was the reading *before* F-8
widened the scan, and widening it added **40** learner-facing strings from `answerFormat.ts` and
`unreadableAnswer.ts` — where the finding had predicted "~25 more". `lesson-qa/SKILL.md:319-327`
says not to carry a figure over from a brief for exactly this reason, and it was right within one
document of being written.

The same re-measurement moved a second figure. The brief gave the jsdom suite as *"3,700"* tests;
run at this tip over `apps/web/src/lessons` it is **6,722 tests over 79 files**. The item-bank
figure of 95 reproduced exactly. Two of the four supplied test/scan counts therefore did not
survive re-measurement, which is a decent argument for the rule rather than against the brief.

**5. `lesson-qa`'s migration census has now been wrong three times running — including this
round's own correction of it, which expired within a day.** The skill asserted that D4, D6 and D9
declare no `worked_examples`. D6 and D9 had both fully migrated, so this round corrected the
sentence to *"59 of 62, and the three that do not are all in D4"*, measured at `6bbda996`.

That correction is already dead. `ff465269`, *"Migrate D4's POL.5/6/7 to three-section slides,
closing the backlog"* (#729), migrated
exactly the three packs the correction named. Re-measured on the merged tree at `3fcdfffd`:

```
d1 6/6   d2 5/5   d3 5/5   d4 8/8   d5 6/6
d6 11/11 d7 4/4   d8 6/6   d9 9/9   d10 2/2   TOTAL 62/62
```

**So R34 is now owed on every authored pack and N/A on none.** The interesting part is not the
number, it is that three consecutive attempts to write this number down were wrong in the same
direction within a day or a round of each other. That is structural, not careless: a domain never
leaves the N/A list by itself, because the author migrating a pack has no reason to open a QA
skill and edit it. **So the skill no longer states a census at all.** It states the failure mode,
carries the one-line command, and says in terms that the command's output is the answer and any
number in the file is not — including the `62/62` above, which is a reading at a SHA and will
expire the same way the last three did.

---

## Verification

### On the merged tree

`origin/integration` at `17b4eba0` was merged in — 131 commits — and it merged **clean, with no
conflicts**. Re-verified after the merge:

| Gate | Result |
|---|---|
| Biome `format:check` | PASS, 2,073 files |
| `lint` | PASS — 48 warnings, 24 infos, 0 errors |
| `typecheck` (`tsc --build`) | PASS, no output |
| `check:graph` | PASS — 87 hard edges over 62 live nodes |
| `check:lessons` | PASS — 10 domains at the error tier, 0 errors and 0 warnings, prose sweep clean on every domain and the widget corpus |
| `threeSectionFlow.browser.test.tsx` | **13/13 PASS** — run specifically because the D4 migration grew its derived population to all 62 packs |
| Item-bank, D6 and the 8 files that flaked under load | **206/206 PASS over 9 files**, `d6.test.ts` included, so the snapshot re-pin holds on the merged tree |
| Browser guards, 4 batches of ≤9 at `--maxWorkers=2` | **857 tests over 28 files, all PASS** — D6's 7, the `isNumericLiteral`-reachable pair, the 9 widget guards, the 9 figure/prose/answer-surface guards, and `threeSectionFlow` |
| jsdom `apps/web/src` (lessons + city + archipelago) | 10,804 of 10,818 over 415 files; 14 failures triaged below |

### Triage of the merged-tree failures

Everything red was run again in isolation, because the full-tree run was severely resource-starved
(`import 3,529s`, `environment 1,799s`, single files taking 200-345s).

**Item bank: all 8 were load.** `template`, `d2`, `diagnostic-scope`, `templateTermination`,
`walk`, `practiceWalk`, `d5` and `d4` each reported one failure in the 45-file run, and the same
files re-run together pass **206/206**.

**jsdom: 5 of 14 were load, and 9 are pre-existing on `integration`.** `HardWinterSurface` (×2),
`carryBackReachesTheIsland` (×1), `workedSolutionArithmetic` (×1) and one of `era5ExporterSafety`'s
pass in isolation. The remaining 9 reproduce, and they are **not this round's**: run on the
`integration` checkout at `ff465269`, which carries none of this branch's commits, they fail
**identically — same three files, same nine test names, same counts**:

- `catchUpCannotShortenTheAdvance.test.ts` ×2 (derived-population assertions on the ceremony closure)
- `beatVisualsAreMonotonic.test.tsx` ×2 (derived-population assertions on beat visuals)
- `era5ExporterSafety.test.ts` ×5 (exporter path-traversal and hash-stability guards)

All nine are in the game lane, none is reachable from lessons, D6 or `isNumericLiteral`, and they
are reported here rather than fixed.

**CI then narrowed them further.** #732
is green on all five checks — `scope`, `code-quality`, `light-gates`, `test-unit` (20m07s) and
`test-browser` (31m52s) — over the same nine tests. So they are not merely pre-existing on
`integration`, they are **local to this Windows checkout**, which is the likelier reading of a set
that includes five symlink-and-path-traversal assertions in an exporter safety guard. Recorded
that way rather than as a standing red.

### At `6bbda996`, before the merge

- `npm run check:lessons` — **PASS**, 10 domains at the error tier, 0 errors and 0 warnings on all
  of them, prose sweep PASS on every domain and on the widget corpus.
- `scan-lesson-text.mjs` over the seven D6 paths — exit 0, 456 strings / 5,621 runs / 351 files.
- Biome `format:check`, `lint`, `typecheck`, `check:graph` — green over this round's files.
- Item-bank D6: **95 passed over 2 files**.
- jsdom `apps/web/src/lessons`: **6,721 passed, 1 failed of 6,722 over 79 files**.

### The two failures, triaged

**`d5CfuAcceptance.test.tsx` > "still rejects every misconception answer" — load-induced. It does
not reproduce on either tree, and the label this report first gave it was wrong.**

The first version of this section called the failure "pre-existing" and argued it from three
facts. The argument was reasonable and it was not a measurement, so it was measured:

| Tree | Result |
|---|---|
| Base `6b819339`, file in isolation | **26/26 pass**, 35.25s total, 16.52s in tests |
| Branch tip `0f98840c` (merged), file in isolation | **26/26 pass**, 22.62s total, 12.88s in tests |
| Branch `6bbda996`, file in isolation, run immediately after a 79-file 412-second jsdom sweep | **1 failed**, the test taking 37.8s against a 20s default |

So it does not reproduce at base *or* on the branch, and the branch is in fact the faster of the
two. "Pre-existing" was therefore the wrong word — the discriminator was never the commit, it was
machine state, and the one red observation came off the back of a 412-second suite that had
finished 40 seconds earlier. **Not a regression, and not a defect in the D5 file's logic:** the
body ran to completion and printed `[d5-reject] 57 misconception answers graded through the real
card`, so nothing leaked; it was flagged on wall clock.

Two of the three original facts survive as a **latent fragility** worth naming, which is a smaller
claim than the one they were used for. `:267` declares no timeout while its two sibling sweeps in
the same file declare `120_000` at `:232` and `60_000` at `:265`, so it is the test in that file
that will flip red first on a loaded CI box; and this round's only shared-file edit
(`isNumericLiteral`) cannot reach it, since the file contains zero references to `answerFormat`.
Not fixed here — it is another domain's guard, and adding a declared timeout is a decision that
belongs in its own change rather than folded into a D6 report.

**A `format:check` failure in `interactive/GraphFeatureWalkthrough.tsx`** was observed during the
fixing phase and traced to another agent's in-flight edit rather than to this round. Named here
rather than silently excluded.
