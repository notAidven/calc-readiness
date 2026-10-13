# D10 QA — round 1

Reviewed at `56497b6b`, on branch `anthony/d10-qa` in worktree `../calc-readiness-d10-qa`.
Scope: `content/lessons/d10/GEO.1.json`, `content/lessons/d10/GEO.2.json`, their eight gated
widgets, the ten D10 practice templates and their worked-solution figures.

**Round 1 both reported and fixed.** The review half was read-only at `56497b6b`; five fix
lanes then landed on this branch, and `origin/integration` was merged in **twice**. First at
**`382c6da0`**, because #364 (merged
2026-08-01T21:32:52Z) and #368
(merged 2026-08-01T23:11:06Z) both landed mid-round in files this round touches. Then again at
**`aab2da35`**, because #357 landed
independently while this round was running and **fixed one of this round's findings a second
time** — see "The CFU-figure collision" below, which is the one place where what shipped is not
what this round's lane wrote. Every number below carrying a **(re-measured)** tag was taken again
over the merged result rather than carried from a lane's report. The "What was fixed and what was
only reported" table is the index; each finding then carries its own status line.

## Frozen content: no re-pin was owed, and none was made

`packages/item-bank/src/__snapshots__/d10.test.ts.snap` hashes
`530fe49a3ad0131f1e944679a55b1bf97b3c62e5` **before the merges and after all five of them**
(`git hash-object`, both readings). `vitest -u` was not run.

That is a stronger statement than "the pin still passes", because `hashItemDefinition`
(`packages/item-bank/src/schema.ts:44-49`) canonicalizes exactly `node_id`, `prompt` and
`answer`. An unmoved snapshot therefore proves, for all ten served D10 templates, that **no
prompt text and no answer spec changed anywhere in the round** — which is also the evidence
behind G2-1's status below.

The one authored string the round moved is outside that hash:

| Key | Field | Change |
|---|---|---|
| `d10.geo1.angle-third.l2` | `hints[0]` only | "a half turn", twice, becomes `$180$ degrees` and "that same total" (X-1) |

## Round 0 reconciliation

Seven claims carried in from round 0. Verdicts are against the tree at `56497b6b`, not
against the work log.

| # | Claim, and where it came from | Verdict at `56497b6b` | Evidence |
|---|---|---|---|
| R1 | Worked-figure label overlap (`d10GEO1.tsx`) — work log 2026-07-31, PR #341 | **FIXED** | Fix present in source; `workedFigureLabels.browser.test.tsx` 7 tests, 7 passed in Chromium (ink-measured, not a frame — see caveat) |
| R2 | Worked figure not centred in its column | **FIXED** | Same guard, same run |
| R3 | Baseline stagger between paired labels | **FIXED** | Same guard, same run |
| R4 | `GeoPavingClassify` chips overflowing their subgrid | **FIXED** | `classifyChipFit.browser.test.tsx`: the GEO row passes. The file reports 1 failed of 13, and the failure is a **D5** row, outside this domain and outside this round |
| R5 | `StraightLineAnglesWorked` sharing one `angleY` across both labels | **FIXED** | Per-label y in source at `apps/web/src/lessons/worked/d10GEO1.tsx:234`; covered by the R1–R3 guard run |
| R6 | "Four defects" (`TEAM_CHECKLIST.md:60`, and PR #341's body) vs "five" (work log) | **THE LOG IS RIGHT; BOTH THE CHECKLIST AND THE PR UNDERCOUNT** | Five distinct fixes are present in the tree, R1–R5 above. The checklist line and the PR body agree with each other and are both one short. The plan anticipated the log and the PR agreeing on five; they do not |
| R7 | Pi mis-typeset in the exact-cylinder prompt (#327) | **FIXED AS TYPESETTING; THE UNDERLYING DEFECT MOVED, NOT CLOSED** | `latexPi()` in `packages/item-bank/src/promptFormat.ts` returns `$\pi$`, and the `d10.geo2.cylinder-volume-exact.l3` prompt renders it correctly. But the same key is now ungradable-by-affordance at the input end — see **G2-1**, which is this round's headline |

**Caveat on R1–R5, partly discharged.** The review lane's evidence for these was a Chromium
ink measurement, which is stronger than a CSS box and is still not a frame anybody looked at.
Frames were taken for the round's own figure work — `d10Geo1TriangleShots.browser.test.tsx`,
1024x580, framed on the whole 920px lesson column rather than cropped to the figure, read at
5x — and the verdict on the tightest of them is below under "The 80/80/20 frame". R1–R5's own
subjects (the side figures, the paving subgrid, the straight-line baseline) were **not**
re-photographed, so read those five as ink-measured rather than eyeballed.

## What was fixed and what was only reported

Step 7 of `.cursor/skills/lesson-qa/SKILL.md`. Twelve items were raised across the three
review lanes; six were fixed in this round, one is withdrawn, five are reported and left open,
and two more findings came out of the fix lanes themselves.

| # | Finding | Round 1 outcome | Where |
|---|---|---|---|
| G1-1 | `GeoAngleExplore` draws one fixed outline for two angle sets | **FIXED** | `triangleFromAngles.ts` (new), `GeoAngleExplore.tsx` |
| G1-2 | Same defect in `TriangleAnglesWorked` | **FIXED** | `worked/d10GEO1.tsx:139-206` |
| G1-3 | Scale factor defined one-directionally, contradicting its own CFU | **FIXED** | `content/lessons/d10/GEO.1.json:8` |
| G1-4 | Cord table declines the two terms it just taught | **FIXED** | `interactive/GeoCordTable.tsx` |
| G2-1 | Exact-pi key needs `*` and `pi`, input surface offers neither | **FIXED, by the dispatch** | `answerFormat.ts`, `mathPreviewParser.ts` |
| G2-2 | Cistern widget teaches the opposite input convention | **FIXED** | `interactive/GeoCisternPlay.tsx:201-210, 457-462` |
| X-1 | "half turn" used to explain, never defined | **FIXED** | `d10/nodes/GEO.1/index.ts:191` |
| X-2 | Seven guards do not see D10 | **FIXED (7 of 7 closed)** | see X-2 below |
| X-3 | Both CFUs declare `multipleChoiceAnswer` | **WITHDRAWN — the consequence was false** | measured below |
| X-4 | GEO.1's only prerequisite is NUM.4, and L3 wants a simplified radical | **REPORTED, open** | a skill-graph question, not a D10 edit |
| X-5 | `namesToken` guards a single-digit CFU answer more weakly than it appears | **REPORTED, open** | new, from the CFU lane |
| X-6 | The banned-phrase ledger cannot see part of itself on the documented invocation | **REPORTED, open** | new, from the GEO.1 lane |
| — | D10's two CFUs revealed a step list where twelve packs reveal an SVG | **FIXED, by #357 rather than by this lane** | `worked/cfuD7D8D10.tsx`; this round's `worked/cfuD10.tsx` was deleted in the reconciliation |
| R6 | Checklist and PR #341 body say four figure defects; the log says five | **CHECKLIST CORRECTED** | `TEAM_CHECKLIST.md:60`; the merged PR body is left alone |

## Coverage actually run

Measured, not asserted:

- **Every answer key graded through the real checker.** 568 gradings over the 70 served D10
  instances — every key plus its plausible alternate spellings, routed through
  `practiceChecker`, not through a reimplementation.
- **Every generator re-derived from the rendered prompt.** All 10 D10 templates, 400 draws
  each, 4,000 re-derivations, expected answer recomputed by parsing the **rendered prompt
  string** and never `template_params`. **0 mismatches.** The two notation-carrying keys are
  clean at the arithmetic level: `d10.geo1.exact-diagonal.l3` simplifies its radicals
  correctly and `d10.geo2.cylinder-volume-exact.l3` computes `r^2 h` correctly on every draw.
- **Both CFUs graded on the real card.** 20 spellings across the two authored questions and
  their re-ask variants.
- `validate-lesson-pack --strict`: 2 packs, exit 0. `scan-lesson-text`: 36 learner-facing
  strings plus 2,266 prose-shaped runs over 183 widget files, no artifacts, exit 0.
  `web-reachability`: 82 passed. `d10.test.ts`: 20 passed.

**Re-measured over the merged result** (the figures above are the review lane's, at `56497b6b`;
these are the same measurements re-taken after all five merges, because a measurement expires
the way a finding does):

| Sweep | At the merged tip |
|---|---|
| `scan-lesson-text.mjs content/lessons/d10 apps/web/src/lessons/interactive` | `OK`, **36** learner-facing strings across 2 packs, **2,274** prose-shaped runs across **183** widget files |
| the same plus `packages/item-bank/src/d10` | `OK`, **2,351** runs across **187** files (+77 runs, +4 files — the reach X-6 is about) |
| `BANNED_PHRASES` entries after the union merge | **32**, last five are this round's five; **5 of 5** fire when re-injected |
| `answerKeypad` + `answerFormat` + `visualsMath` + `d10DomainProse` + `cfuAuthoredFigure` | **772 passed, 0 failed** over 5 files |
| `widgetRevealFill.browser.test.tsx` (re-run because a copy rewrite could break a fill case) | **157 passed, 0 failed** |
| `cfuAuthoredFigure.test.tsx` alone | **45 passed, 0 failed** |
| `d10Geo1TriangleShots.browser.test.tsx` | **2 passed**, four frames written at 1024x580 |
| `d10.test.ts.snap` hash, before and after the merges | `530fe49a…` both readings, unmoved |

**Re-measured again after the `aab2da35` reconciliation**, because that merge changed which
component draws D10's CFU figures and rewrote the guard around them:

| Suite | At `aab2da35` merged |
|---|---|
| `cfuAuthoredFigure.test.tsx` | **120 passed, 0 failed** (45 before; integration's rewrite widened it) |
| `cfuFigureCoverage.test.tsx` (new, from #357) | **62 passed, 0 failed** |
| `cfuAuthoredFigureShots.browser.test.tsx` | **8 passed, 0 failed** |
| `visualsMath.test.tsx` | **668 passed, 0 failed** |
| `answerKeypad.test.ts` / `answerFormat.test.ts` / `d10DomainProse.test.ts` | **149 / 151 / 12 passed, 0 failed** |
| `widgetRevealFill.browser.test.tsx` | **157 passed, 0 failed** |
| `packages/item-bank/src/d10.test.ts` | **20 passed, 0 failed** |
| `d10.test.ts.snap` hash | `530fe49a…`, still unmoved |
| `npm run check` | `format:check` / `lint` / `typecheck` clean; `test:unit` **24 failed / 7,723 passed / 2 skipped (7,749)** over 5 files, all environmental or load (below); `check:graph` PASS, `check:lessons` 8 domains PASS |

**Triage of those 24**, by measurement rather than by calling anything a flake. `ciScopeFilter`
is 20 of them and is environmental: a clean `origin/integration` `aab2da35` worktree reports
**20 failed / 5 passed**, the same file and the same count, from `bash` under Windows. The other
four pass alone — `crisisFromAFreshSession` **6/6**, and `hard-winter-invariants` + `d5.test.ts`
+ `product.test.ts` together **47/47 in 27.6s** against their own 60s caps, having taken 90s+
under a fully loaded runner.

**The kept guards were re-reddened on the merged tree**, because a guard that survives a merge
textually and passes is not yet a guard that still catches anything:

- The **re-ask sweep** in `cfuAuthoredFigure.test.tsx`. Injecting a wrong `sum` into
  `SignedNumberLineWorked` — which drives both the drawn number line and its caption — fails
  `NUM.S` at both *"figure spells out an accepted answer"* and *"re-ask reaches the same figure,
  naming its OWN answer"*. And narrowing the population to `cfu.` templates alone fails the
  `>= 39` pack floor, which is what stops the sweep quietly shrinking back to the authored-card
  layer `cfuFigureCoverage.test.tsx` already covers.
- Both **`visualsMath.test.tsx`** guards, in one run: renaming one registry key
  `d10.geo1.similar-side.l3` → `INJECTED.…` and putting a bare `?` into
  `d10.geo2.rect-area.l1`'s prompt gives **4 failed / 664 passed**, at *"d10.geo1.similar-side.l3
  reveals the authored steps, with no figure registered"* and at the item-bank arm of the bare-`?`
  sweep (*"expected [ Array(1) ] to deeply equal []"*). Both injections reverted; `git diff` over
  the two files is empty.

**The rendered frame.** Since the drawing component changed, GEO.1's reveal was re-photographed
and looked at rather than measured:
`apps/web/src/lessons/__screenshots__/cfu-authored-figure/GEO.1.png`, **1024x580**. The foundation
rectangle carries its diagonal labelled $50$; the 1:10 model sits beside it with its $5$ below the
box instead of colliding with it; both boxes are captioned; the two equations occupy a right-hand
column clear of both. The model box is very small, because it is a tenth drawn to scale, so its
label and caption carry the meaning rather than its outline. Judged acceptable as shipped.
- **All D10 lesson arithmetic checked by hand and correct**: 12x9=108 and perimeter 42;
  2lw+2lh+2wh; a cylinder of radius 2, height 6 giving 24pi; sqrt(50)=5sqrt(2); the GEO.1 CFU
  30-40-50 scaled to 5; the GEO.2 CFU 40+32+20=92. No numeric errors found in either pack.

The content is arithmetically sound. Everything below is about notation, affordance, and
figures that contradict their own labels.

---

# (a) GEO.1 findings

### G1-1 (P1) — `GeoAngleExplore` draws one fixed triangle for two different angle sets, and draws the angles in the wrong order

`apps/web/src/lessons/interactive/GeoAngleExplore.tsx:217-219`

```
  const apex = { x: 296, y: 46 };
  const left = { x: 244, y: 164 };
  const rightFoot = { x: 408, y: 164 };
```

Those vertices are constants. The labels are not: lines 288-311 place `firstAngle` at `left`,
`secondAngle` at `rightFoot`, and the answer at `apex`. Board 1 labels 43 and 61 (third 76);
board 2 labels 58 and 74 (third 48). Both boards get the identical outline.

The drawn interior angles of that outline are approximately **66 at `left`, 47 at
`rightFoot`, 67 at `apex`**. So on board 1 the label `43` sits in the widest drawn corner and
`61` in the narrowest — the drawn ordering is **inverted** relative to the labels. Board 2 is
inverted the same way: `74` sits in the 47-degree corner and `48` in the 67-degree corner.

A learner who sanity-checks an answer against the picture — the ordinary move, and the one
this widget exists to encourage — will conclude their correct answer is wrong, because the
angle they just computed as the largest is drawn as one of the smaller ones. It also silently
teaches that the picture is not to be trusted, on the first figure in the domain.

### G1-2 (P1) — the same defect in the worked solution

`apps/web/src/lessons/worked/d10GEO1.tsx:148-150`

```
  const left = { x: 60, y: 158 };
  const rightFoot = { x: 250, y: 158 };
  const apex = { x: 140, y: 46 };
```

`TriangleAnglesWorked` takes `first`, `second` and `answer` as props and draws them onto fixed
vertices measuring approximately 54, 46 and 80. A learner shown 60/60/60 sees a visibly
scalene triangle with an 80-degree apex. This reaches learners only on the retry variants of
`d10.geo1.angle-third.l2` (the pooled instance takes the straight-line branch), which is why
it is P1 and not P0, but it is the same fix as G1-1 and should go in the same change.

### G1-3 (P1) — the scale-factor definition contradicts its own worked solution

`content/lessons/d10/GEO.1.json:8`

> "Multiply any length on the smaller figure by the scale factor and you land on the matching
> length of the larger one, so a length measured on a model tells you the real length it
> stands for."

That defines the scale factor one-directionally, smaller to larger. Twenty-two lines later the
same file's CFU worked solution runs it the other way:

`content/lessons/d10/GEO.1.json:30`

> "The model is similar to the foundation, so every corresponding length is multiplied by the
> scale factor $\dfrac{1}{10}$."

A learner who took the definition at its word has been told that multiplying by the scale
factor makes things bigger, and is then shown a scale factor of one tenth making things
smaller, with no sentence reconciling the two. The likely wrong conclusion is that they have
misunderstood the CFU, when in fact the prose is the thing that is too narrow.

### G1-4 (P2) — the cord table declines to use the two terms it was just taught

`apps/web/src/lessons/interactive/GeoCordTable.tsx:106`

```
      headings={["cord setting", "longest side squared", "the two shorter squares added"]}
```

This widget is `{ "after": 0 }`, so it is the very first exercise following the paragraph that
introduces **legs** and **hypotenuse** as bolded terms. It restates both as a recipe instead of
using either. The learner is not misled about anything, so this is P2, but it wastes the one
place the new vocabulary would have been earned by use.

---

# (b) GEO.2 findings

### G2-1 (P1, and the headline) — the exact-cylinder key needs `*` and `pi` typed, and the input surface offers neither

`packages/item-bank/src/d10/nodes/GEO.2/index.ts`, template `d10.geo2.cylinder-volume-exact.l3`.

The item's answer keys are of the form `588*pi`. At `56497b6b` that item resolves to notation
tag `"none"`, the generic placeholder `Your answer`, and **no keypad row at all**. The prompt
tells the learner to type `pi`; nothing on the screen tells them how, and the `*` is
undiscoverable. Typing the glyph they would reach for — `π` — is rejected as
`invalid_input/unknown_symbol`, and `√` likewise fails as `invalid_input/parse_error`. `588*pi`
typed exactly is graded correct.

So the key is reachable, but only by a learner who guesses ASCII `pi` and an explicit `*`
unprompted. Everyone else reads a correct understanding of the mathematics back as a wrong
answer.

**Measured red.** Adding `D10_PRACTICE_ITEMS` to `SERVED_ITEMS` in
`apps/web/src/lessons/answerKeypad.test.ts` (reverted; tree is clean) turns that file from
green to `2 failed | 130 passed (132)`:

```
AssertionError: 707 (item, notation) pairs required a key, 218 declared exempt, 7 short:
+ GEO.2 d10.geo2.cylinder-volume-exact.l3 ...:practice:130008: key "588*pi" uses times, keypad has nothing
+ GEO.2 d10.geo2.cylinder-volume-exact.l3 ...:practice:131056: key "704*pi" uses times, keypad has nothing
+ GEO.2 d10.geo2.cylinder-volume-exact.l3 ...:practice:131057: key "729*pi" uses times, keypad has nothing
+ GEO.2 d10.geo2.cylinder-volume-exact.l3 ...:practice:131058: key "18*pi" uses times, keypad has nothing
+ GEO.2 d10.geo2.cylinder-volume-exact.l3 ...:practice:131059: key "891*pi" uses times, keypad has nothing
+ GEO.2 d10.geo2.cylinder-volume-exact.l3 ...:practice:131060: key "32*pi" uses times, keypad has nothing
+ GEO.2 d10.geo2.cylinder-volume-exact.l3 ...:practice:131061: key "396*pi" uses times, keypad has nothing
```

(The `...` elides a repeat of the template id, which the runner prints twice per line.)

All seven served instances of the item, and nothing else in D10 — notably
`d10.geo1.exact-diagonal.l3` does **not** appear, so the radical notation is correctly wired
and only the pi/times pair is not. The second failure is the population pin at
`answerKeypad.test.ts:366`, `expected 339 to be 332`, which is just the count moving when a
seventh pool joins.

That guard's own doc comment (lines 69-74) says the list "is the thing a new domain gets left
off — this one was left off twice", naming D3 and D8. D10 is the third. See X-2.

**Status: FIXED, and by the dispatch rather than by the exemption.** Two lanes reached this in
sequence, and only the second is the fix:

- The guards lane resolved its own red by naming the item on `STAR_IS_OPTIONAL` in
  `answerKeypad.test.ts`. That was **sound** — `588pi` grades `correct/match` with the star
  removed, so the guard was right not to demand a times key — but it silenced the assertion
  without giving the learner anything.
- The pi-dispatch lane then fixed `answerNotation` to read the KEY for a `pi` token
  (`isPiAnswerText`, `apps/web/src/lessons/answerFormat.ts:449`), which gives the item a
  `pi_expression` tag, the placeholder `In terms of pi: 7*pi`, a one-key row that types `pi`,
  and a live preview that draws `\pi` for the two letters typed
  (`mathPreviewParser.ts:288-294`). The rule is deliberately LAST among the key-reading rules,
  so the only items it can move are those already reaching `none`.

Blast radius, as the lane measured it: **7 of 1,475 answer surfaces**, all seven served
instances of that one template, and nothing lost a key row it already had.

**Re-measured over the merged result:** `answerKeypad.test.ts`, `answerFormat.test.ts`,
`visualsMath.test.tsx`, `d10DomainProse.test.ts` and `cfuAuthoredFigure.test.tsx` together
report **772 passed, 0 failed** across 5 files.

**The learner's required input string did not change**, which is what keeps G2-2's replacement
copy correct. Three independent readings say so: the notation tag drives only the placeholder,
the key row and the preview (`placeholderForNotation`, `keypadForNotation`, `latexOf` — no
checker call in the diff); `hashItemDefinition` covers `answer`, and the D10 snapshot is
byte-identical; and the merged `GeoCisternPlay.tsx` points at `3*pi` and at
`${reading.volume}*pi`, which is the `<coefficient>*pi` shape the key still uses.

### G2-2 (P1) — the cistern widget teaches the opposite input convention from the item it prepares

`apps/web/src/lessons/interactive/GeoCisternPlay.tsx:200`

> "Type the whole number that multiplies pi, and leave the pi itself to the label beside the
> box."

The widget is the gated teaching surface for exact-pi volume. It trains the learner to enter
`588` and let the widget supply the pi. The practice item that follows requires the whole
string `588*pi`, with the pi typed and an explicit `*`. A learner who does exactly what the
lesson taught enters `588` and is marked wrong.

This compounds G2-1 rather than duplicating it: G2-1 is a missing affordance, G2-2 is an
affordance that actively points the wrong way. Fixing the keypad without fixing this sentence
leaves the learner trained against the fix. They should land in one change.

---

# Cross-cutting

### X-1 (P1) — "half turn" is used to explain, and is never defined

`packages/item-bank/src/d10/nodes/GEO.1/index.ts:191`

> "Angles that together fill a straight line are supplementary, and their measures add to a
> half turn. The three angles of any triangle add to that same half turn."

Those are the only two occurrences of the phrase anywhere in `content/lessons`,
`packages/item-bank/src` or `apps/web/src/lessons` (ripgrep, case-insensitive, tests excluded).
It appears for the first time in a **hint** — the surface a stuck learner reaches for — and the
lesson prose that would define it says `180^{\circ}` throughout and never once says "turn". A
learner stuck enough to open the hint is handed an undefined term as the explanation.
Unearned-term rule R32.

### X-2 (P1) — seven guards do not yet see D10

None of these are D10 defects; they are why D10 defects can ship unnoticed. Listed for the
guard-widening worker, not for the two content workers.

1. `answerKeypad.test.ts:76` — `SERVED_ITEMS` omits `D10_PRACTICE_ITEMS`. Proven above: adding
   it produces 7 real failures. This is the one that let G2-1 through.
2. `visualsMath.test.tsx` — has a figure-floor block per domain; there is no D10 block.
3. `WorkedSolution.browser.test.tsx` — `itemFor` pools D1, D5 and D8 only, so no D10 worked
   solution is ever rendered by a guard. This is why G1-2 is invisible to CI.
4. `widgetRevealFill.browser.test.tsx` — `FILL_UNDRIVEN` lists both `GeoComposeBuilder.tsx` and
   `GeoCisternPlay.tsx` as exceptions. Two of D10's eight widgets are exempted from the
   reveal-fill sweep, and neither exemption carries a reason that fails both ways in the sense
   `qa-verification.mdc` requires.
5. `visualsMath.test.tsx`'s bare-`?` source sweep does not glob `packages/item-bank`. I swept
   the item bank by hand and found only one hit, inside a regex literal, so this gap is
   **latent, not exploited** — worth closing, but nothing is broken behind it today.
6. No prompt-derivation guard exists for the item bank at all. The 4,000-draw sweep in the
   coverage section was written by hand for this review and is not in the tree; the D7 file
   `promptDerivedAnswers.test.ts` is the only one of its kind and covers D7 alone.
7. `answerFormat.test.ts` keeps its own `SERVED_ITEMS`, kept in step with #1 by comment only.
   Whatever fixes #1 should fix this in the same change.

**Status: all seven closed. Verified in the merged tree, one citation each.**

| Gap | Closed at |
|---|---|
| 1 · `answerKeypad` pool | `answerKeypad.test.ts:27, 90` — `...D10_PRACTICE_ITEMS` inside `SERVED_ITEMS` |
| 2 · `visualsMath` D10 figure floor | `visualsMath.test.tsx:524` — *"every D10 practice template reveals a figure, not a step list"*, beside the D1 (414) and D8 (468) blocks |
| 3 · `WorkedSolution` browser pool | `WorkedSolution.browser.test.tsx:35, 55` — `...D10_PRACTICE_POOL` in `itemFor` |
| 4 · two `FILL_UNDRIVEN` widgets | both gone from the set; `GeoComposeBuilder`'s three blanks and `GeoCisternPlay`'s two are driven cases at `widgetRevealFill.browser.test.tsx:745-818`, each against the wrong value the widget's own wording names |
| 5 · item-bank prompts in the bare-`?` source sweep | `visualsMath.test.tsx:630` (`ITEM_BANK_SOURCES` glob) with the floor at 697-700 — *"the item-bank glob resolved to nothing, so the sweep below reads no prompt at all"* |
| 6 · `answerFormat` d10 floor | `answerFormat.test.ts:576` — `entry.domainId === "d10"` |
| 7 · a D10 prose guard | `d10DomainProse.test.ts` (new, 391 lines), derived from the registered d10 packs |

Note that #7 of the review lane's own list (`answerFormat.test.ts` keeping a second copy of
`SERVED_ITEMS`) and #7 of the plan's list (a D10 prose guard) are different items; both are
closed, at `answerFormat.test.ts:10, 88` and in the new file respectively.

### X-3 — WITHDRAWN. Both D10 CFUs do declare `multipleChoiceAnswer`, and the consequence claimed for it is false

The finding said that because `GEO1_CFU_TEMPLATE` and `GEO2_CFU_TEMPLATE` build with
`multipleChoiceAnswer`, the re-ask path reaches for `MULTIPLE_CHOICE_PLACEHOLDER` over a
free-text input. The GEO.2 lane measured that consequence and it does not happen.

**Measured (re-measured over the merged result).** All four served instances of D10's two
CFUs — each pack's authored question and the one computed re-ask its generator draws — reach
the numeric-literal placeholder and no keypad row:

```
D10 CFU instances measured: 4
GEO.1  authored  cfu.geo1.model-diagonal       accepted[0]=5    placeholder="A single number, e.g. 7"  keys=[]
GEO.1  computed  cfu.geo1.model-diagonal       accepted[0]=4    placeholder="A single number, e.g. 7"  keys=[]
GEO.2  authored  cfu.geo2.open-cistern-lining  accepted[0]=92   placeholder="A single number, e.g. 7"  keys=[]
GEO.2  computed  cfu.geo2.open-cistern-lining  accepted[0]=240  placeholder="A single number, e.g. 7"  keys=[]
```

Why it cannot happen: **the template's `answer` field is never on the dispatch path.**
`apps/web/src/lessons/cfu.tsx:366-367` reads the pack's `check` block and the instance's
accepted list — `cfuPlaceholder(cfu.check, asked.accepted)` — so a `numeric` check with a
literal key takes the numeric-literal branch whatever the generator's spec says.

And the declaration is deliberate rather than sloppy: `multipleChoiceAnswer` is what all **22**
templates in `apps/web/src/lessons/cfuVariants.ts` use, because it is the only spec meaning
"compare the key literally" for a question that is never frozen into a pool.

Recorded as withdrawn. Not fixed, and not still open.

### X-5 (P1, reported and NOT fixed this round) — `namesToken` lets a figure answering the wrong question satisfy the authored-figure guard

`apps/web/src/lessons/cfuAuthoredFigure.test.tsx:202-221`

The CFU lane's first attempt to prove its new GEO.1 assertion could fail did not fail. Change
`GEO.1.json`'s `worked_solution_params` scale from a tenth to a fifth and the figure now closes
on `\dfrac{50}{5} = 10`: it answers 10 where the CFU's key is 5, and the guard reports
**45 passed, 0 failed**. `namesToken` found the CFU's answer `5` in the DENOMINATOR of that
fraction, where `{` and `}` bound it and neither is a digit, so the token boundary held and the
wrong figure passed.

The guard is not inert, which is what makes this a boundary problem rather than a dead
assertion. Set the same scale to a half instead — the figure closes on `25`, and no bare `5`
survives token-bounding anywhere in it — and the same file reports **1 failed, 44 passed** at
`cfuAuthoredFigure.test.tsx:321`:

```
FAIL  cfuAuthoredFigure.test.tsx > GEO.1's figure spells out an accepted answer
AssertionError: GEO.1: no accepted spelling of the answer appears in the figure.
Wanted one of 5 | 5.0 | 5; the figure shows 40 | 30 | 50 | 25 | 30^2+40^2=2500 | d=2500=50 | 50/2=25 | ...
```

Both readings are at the merged tip, and both edits were reverted (`git status` clean).

**This is not D10's problem.** `namesToken` backs every one of the four containment assertions
in that file (lines 316, 343, 416, 426), so **any** single-digit CFU answer whose figure prints
that digit anywhere — as a denominator, an exponent, a coordinate, an intermediate — is guarded
more weakly than the assertion reads. Left for its own change: the fix is a question about what
"the figure names the answer" should mean (a closing row? a distinguished position?) and it
belongs to whoever owns that guard, not to a D10 round.

### X-6 (P2, reported and NOT fixed this round) — the banned-phrase ledger cannot see part of itself on the documented invocation

`.cursor/skills/lesson-qa/SKILL.md` documents the sweep as the domain directory plus
`apps/web/src/lessons/interactive`. Two of this round's five new `BANNED_PHRASES` entries — the
"half turn" pair from X-1 — quote a sentence living in `packages/item-bank/src`, which that
invocation does not name. So those two entries fire only when the item-bank path is passed
explicitly.

**Measured at the merged tip, by putting both sentences back in the real hint slot they were cut
from** (`packages/item-bank/src/d10/nodes/GEO.1/index.ts:197`, a plain quoted literal, which is
the shape the scanner reads) and running the scanner twice:

| Invocation | Result with the banned sentences live |
|---|---|
| `content/lessons/d10 apps/web/src/lessons/interactive` (documented) | `OK: 36 learner-facing string(s) ... no rendering artifacts.` — **0 findings** |
| the same plus `packages/item-bank/src/d10` | `FAIL: 2 finding(s)`, both at `index.ts line 197` |

Injecting each of the five entries one at a time into its own surface gives the same split:
**5 of 5 fire on the wider invocation, 3 of 5 on the documented one.**

**Should the documented invocation include the item-bank path?** On this evidence, yes for a
domain whose ledger entries quote generated prose — and the entry itself already carries the
workaround as a `NOTE ON REACH`. But the scanner's own header says practice prompts, hints and
worked solutions are swept by the vitest guards instead, so widening the documented line is a
change to that skill's stated division of labour and wants the skill's owner rather than a
content round. Two cheaper options exist and are worth weighing at the same time: keep the
ledger to surfaces the documented invocation reaches and route generated-prose objections to a
domain prose guard (`d10DomainProse.test.ts` now exists and is where the `geometrically` entry
went for era nine), or add the item-bank path to the documented line and accept the extra 77
prose-shaped runs it sweeps. Filed, not decided.

### X-4 (P2) — GEO.1's only prerequisite is NUM.4, and L3 asks for a simplified radical

`d10.geo1.exact-diagonal.l3` requires `5*sqrt(2)` in simplified form. `skill_graph.json` gives
GEO.1 exactly one prerequisite, `NUM.4`, and neither GEO.1's prose nor NUM.4 teaches radical
simplification — GEO.1.json:6 states `sqrt(50)` "is exactly $5\sqrt{2}$" as an assertion,
without the extraction rule. The learner is asked to produce a form the domain never derives.
Filed P2 rather than P1 because the item does grade the unsimplified equivalent.

---

# The 80/80/20 frame

`apps/web/src/lessons/__screenshots__/d10-geo1-triangle/worked-80-80.png`, taken at
**1024x580** and framed on the whole 920px lesson column, plus a 5x read of the figure region.
`**/__screenshots__/` is gitignored, so these are local artifacts and not review attachments.

The GEO.1 lane flagged this frame as its least comfortable, and the flag is accurate. `80 / 80`
is the sharpest apex `d10.geo1.angle-third.l2` can deal, so the triangle is a needle: the two
base labels have very little room between the vertices, and the deliberate trade is to give up
clearance from the corner's own sides rather than let the two sets of digits merge.

**Verdict: acceptable as shipped.** At 5x, the two `80^{\circ}` labels are separated by a clear
gap and neither digit touches the other; what they cross is the outline — the left label
straddles the left leg at the vertex, and the right label's degree ring sits on the right leg,
as does the `20^{\circ}`'s inside the narrow apex. That is a hairline at `strokeWidth` 1.6 in a
muted tan, under dark label text, so nothing about which number sits in which corner is in
doubt. Correctness is separately guarded rather than eyeballed: `cornerMismatches` reads each
corner off the painted outline and compares it with the label printed in it, and that assertion
is inside the shot test (`d10Geo1TriangleShots.browser.test.tsx:98`), which passed.

Worth a later polish pass, not another round: the left base label could be pulled inside its
own wedge so it does not straddle the vertex. Neither that nor the apex label changes what a
learner reads, so neither justifies holding this up. The ordinary draw is clean — the
60 / 60 / 60 frame beside it has every label in open space.

# The merge, and the one conflict

Merged onto `anthony/d10-qa` in the order the branches build on each other, then
`origin/integration`. Every result below was read as a merged FILE, never as a diff, per the
QA skill's note that a clean auto-merge here has twice produced semantically broken code.

| Merged | Result |
|---|---|
| `anthony/d10-geo1-fixes` `5cbd2fe6` | clean |
| `anthony/d10-geo2-fixes` `221184bb` | **1 conflict**, `scan-lesson-text.mjs` |
| `anthony/d10-pi-dispatch` `e5ecfae2` (carries `anthony/d10-guards` `c31e2fde`) | clean |
| `anthony/d10-cfu-figures` `5d458b2b` | clean, `GEO.1.json` auto-merged |
| `origin/integration` `382c6da0` | clean; `visualsMath.test.tsx`, `workedFigureLabels.browser.test.tsx` and `workedSolutionVisuals.tsx` auto-merged |
| `origin/integration` `aab2da35` | **4 conflicts**, all from #357 — see "The CFU-figure collision" |

**The conflict.** Both prose lanes appended to `BANNED_PHRASES`: GEO.1 added four entries,
GEO.2 added one, at the same end of the same array. Union-resolved, keeping all five. Verified
by *measurement rather than by reading the resolution*: the merged ledger holds **32** entries
and its last five are the round's five, and injecting each one back into the surface it was cut
from makes the scanner name it (5 of 5 on the wider invocation — see X-6 for the split on the
documented one). Losing an entry silently is the failure the ledger exists to prevent, so the
count and the per-entry fire are both recorded.

**The three collisions that were watched and what they turned out to be.**

- `content/lessons/d10/GEO.1.json` — different hunks as expected. The merged file carries the
  GEO.1 lane's rewritten `mini_lesson[3]` (the bidirectional scale factor, line 8) and the CFU
  lane's `cfu.worked_solution_params` (line 33). Both present.
- `apps/web/src/lessons/worked/d10GEO1.tsx` — **the anticipated collision did not happen.** The
  CFU lane put its registry entries in a new module, `worked/cfuD10.tsx`, wired through
  `workedSolutionVisuals.tsx`, so this file carries only the GEO.1 lane's
  `TriangleAnglesWorked` rewrite. Read the merged file to establish that rather than inferring
  it from the merge summary. (That module is the one #357 later collided with; it no longer
  exists — see below.)
- `apps/web/src/lessons/interactive/GeoCisternPlay.tsx` against the guards lane's new
  `widgetRevealFill` cases — **`widgetRevealFill.browser.test.tsx` re-run after merging: 157
  passed, 0 failed.** It holds structurally and not by luck: the GEO.2 lane changed the module
  comment, the `reading.exact` after-a-miss feedback and the exact board's success line, while
  the two `geo-cistern-play` fill cases drive the RECTANGULAR board and locate by the box's
  `named` label ("the area of the floor, in square meters", "the volume of the cistern, in cubic
  meters"), neither of which the copy rewrite touched.
- `apps/web/src/lessons/answerKeypad.test.ts` was linear, as expected, pi-dispatch building on
  guards.

Also verified as merged results, since integration's two PRs reached them: `visualsMath.test.tsx`
holds both the guards lane's D10 figure-floor block and #364's bracket-height sweep (7 describes,
D10's at line 524); `workedFigureLabels.browser.test.tsx` holds integration's population sweep
and the GEO.1 lane's four new browser cases; `workedSolutionVisuals.tsx` holds both the
`CFU_D10_WORKED_SOLUTIONS` spread and #368's `\left\{ \right\}` change to `acceptedRow`. (That
spread is gone at the tip; see immediately below.)

## The CFU-figure collision: the same finding fixed twice

**What happened.** This round found that D10's two CFUs revealed a step list where twelve packs
reveal an SVG, and fixed it, because #357
had been stranded on a branch and never reached `integration`. Mid-round #357 landed anyway, as
merge `d61da650` off `anthony/cfu-all-figures`, carrying the exact commit `2ecf4261` this lane had
salvaged its figures from. So the fix existed twice, from a common ancestor, and the second
`origin/integration` merge conflicted in four files.

**What shipped, and why.** Integration's implementation, in every case where the two genuinely
duplicate. It is already merged; it covers D1, D2, D4, D5, D7, D8 and D10 rather than D10 alone;
and it carries a coverage guard — `cfuFigureCoverage.test.tsx`, asserting that *every* CFU reveals
a figure on both of its questions — that this lane's version does not. `worked/cfuD10.tsx` (190
lines) was therefore **deleted**, along with its import and spread in `workedSolutionVisuals.tsx`.
That was established by reading both figures rather than by assuming: for GEO.2 they are the same
drawing from the same ancestor, and for GEO.1 integration's is the better of the two.

The deletion was also a latent break, not merely a duplication. Both modules registered
`d10.geo1.*` and `d10.geo2.*` keys into one object literal, and integration's spread sits *after*
this lane's, so the merged registry silently resolved every D10 CFU key to integration's component
while still importing and appearing to use ours. Nothing would have failed; the file would simply
have been dead code that read as live.

**What was kept from this lane**, because integration has no equivalent:

- The **re-ask coverage sweep** in `cfuAuthoredFigure.test.tsx`. It is not the same claim as
  `cfuFigureCoverage.test.tsx`: that file walks the authored card and its authored re-ask, while
  this sweep follows re-asks drawn from the practice pool and requires each figure to name its
  *own* answer rather than the authored one. The two floors were re-measured against the widened
  population and raised, 14 → 39 packs and a new floor of 18 distinct pool-drawn nodes.
- The **`visualsMath.test.tsx`** D10 figure floor and the extension of the bare-`?` source sweep
  to item-bank prompts. Both survived the import-only conflict intact.
- The GEO.1 figure's **legibility fix**, ported onto integration's component. This lane's version
  had solved a problem integration's had not: at a 1:10 scale factor the model rectangle is small
  enough that its hypotenuse label collides with the box, so `ModelDiagonalWorked` now moves that
  label below the box when the drawing is narrow (`across >= 50` gates the roomy layout), captions
  both boxes, and lays the two equations out in a right-hand column instead of under the figures.
  Integration's spelling "metres" was corrected to "meters", which is what the rest of the bank
  and the GEO.2 caption use.

---

## Considered and not filed

Named here so the next round does not re-derive them.

- **"Covering, not filling" pre-empts slide 4 (proposed R14).** One lane filed this against
  `GEO.2.json:14`. Discarded: every slide subtitle in the product names its own slide's topic
  ("Legs and hypotenuse", "Composite figures"), so this reading would condemn all of them. A
  subtitle is a label, not a spoiler.
- **`+5` and `+92` rejected by the shared checker.** Real, reproduced, and not D10's — it is
  shared-checker behaviour across every domain, and an explicit leading `+` is a spelling
  almost nobody types. Not worth a D10 fix.
- **The GEO.1 CFU accepts `10/2` while the re-ask speller would not.** The authored card's
  `check` block accepts it; `integerForms` gives the re-ask `[92, 92.0, 92.00]`-shaped
  spellings only. An asymmetry, but the divergent spelling is one a learner would have to go
  out of their way to enter on a question that says "Enter one number." Not worth fixing.
- **`GeoCisternPlay`'s gate being satisfiable by pressing play.** Checked; it is not. The gate
  requires producing a correct value, so this is not a trivially satisfied gate.
- **R8 (captioned figures) reporting zero over 174 registry entries.** Dormant by design at
  this SHA, not a D10 regression.

## Suggested split for the two fix workers

- **GEO.1 worker**: G1-1 and G1-2 together (one geometry fix, two call sites), then G1-3, then
  G1-4 if there is room.
- **GEO.2 worker**: G2-1 and G2-2 together — they are one decision about how a learner types
  an exact-pi answer, and fixing either alone makes the other worse.
- **X-1 through X-4** belong to neither; X-2 in particular wants a guard worker, not a content
  worker.
