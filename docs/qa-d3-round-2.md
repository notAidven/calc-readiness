# D3 lesson QA, round 2

**Pinned at `e5d0627c`** (`origin/integration` when the worktree was cut, and HEAD of
`anthony/d3-qa-round-2` before this round's commit). Every measurement below was taken at that
SHA or later on the same branch. Where a lane re-measured a carried finding, the
re-measurement is what is recorded.

D3 is five packs (LIN.1, LIN.3, LIN.4, LIN.5, LIN.6), 21 interactive widgets, 26 practice
templates after this round, and 5 checks. It is also the first round to owe R34, the
three-section reading pass, because #542 migrated all five packs and the review skill still
listed D3 as N/A.

**There are no P0s. No D3 prompt asks for an answer its key does not hold**: 5,000 draws across
all 25 templates were answered from the rendered prompt text, never from `template_params`,
with zero disagreements; 175 served instances re-graded with none rejected; 117 spellings graded
with no correct answer marked wrong.

Two findings matter more than that clean result.

**The round's largest defect is not D3's.** Framed on the surface a learner actually gets,
**0 of 15 gated widgets sampled across nine other domains fit at 1024x580**, and D10's
`geo-net-drag` hides 644px of a 659px board. On a completed board the Next button sits 120px
above the visible band, so a learner is told _"you are good to carry on"_ while the control that
carries them on is off-screen. The cause is one geometry outside the frozen widget directory,
and `?dev` is why nobody caught it (§6).

**Round 1's fix for a false notation claim was wrong rather than incomplete.** It moved a
whitespace rule off interval notation and onto the answer field. The field does not have it
either, so the correction relocated a false claim instead of retiring it — and the ledger entry
recorded the replacement as though it were the fix. Two rounds and three surfaces later, that
is the strongest argument in this document for measuring a grader before writing prose about it.

---

## 1. Fixed, with evidence

Every item below was measured before it was rewritten, not after.

### 1-1. Three hints asserted an input rule the grader does not have, and omitted the one it does

`LIN.4/index.ts` (two sites) and `LIN.6/index.ts` all ended a hint with _"this answer field
reads that symbol with a space either side of it."_ Graded through the product checker:

| Spelling                 | LIN.4, 13 served union items | LIN.6, 14 served union items |
| ------------------------ | ---------------------------- | ---------------------------- |
| authored spaced key      | `correct/match` 13/13        | `correct/match` 14/14        |
| closed up around the `U` | `correct/match` 13/13        | `correct/match` 14/14        |
| every space removed      | `correct/match` 13/13        | `correct/match` 14/14        |
| `oo` for infinity        | `parse_error` 13/13          | `parse_error` 14/14          |

So the sentence sent a learner hunting for a formatting fault in an answer already accepted,
on the one surface a stuck learner reaches, while the rule that _is_ enforced went unstated:
`oo` is a standard textbook spelling and `parse_error` does not say why. All three now name the
real constraint. `inf`, `infinity`, `INF` and `Infinity` all grade `correct/match`; `oo`,
`infty` and `\infty` all `parse_error`.

Two ledger entries stand behind the cut wordings, not one: the third site dropped `the` before
"two pieces", which put it outside the first entry's reach. Both were proved to fire against a
scratch copy of the pre-edit source.

### 1-2. LIN.5's CFU and its practice items disagree about two separators — WITHDRAWN, and the
fix reverted

**This section shipped a wrong fix and CI caught it. The narrowing is reverted; the finding
below stands as a finding only.**

The measurement was sound. `LIN.5.json` accepted `39; 51`, `51; 39`, `39 and 51` and
`51 and 39`, and over all **28** served two-root LIN.5 items both the semicolon and the `and`
form return `invalid_input/unsupported_syntax` — 28 of 28 — while the comma and brace forms
return `correct/match` 28 of 28. What was wrong was the direction I resolved it in. I narrowed
the CFU's accepted list to the four forms practice parses, and

`apps/web/src/lessons/cfuAcceptanceConvention.test.tsx` failed on it:

```
AssertionError: LIN.5 accepts "39, 51" but rejects "39; 51", which is the same answer in
different notation: expected false to be true
```

That guard is the enforcement arm of the D5/D7 CFU swarm (`docs/qa-cfu-swarm-d5-d7.md`), and
its first line states exactly what my narrowing forgot: **a CFU without a `check` is graded by
exact string match, so every spelling of a correct answer the author did not anticipate is a
correct answer marked wrong.** LIN.5 carries no `check`. So the narrowing did not align two
surfaces — it made a check-less CFU mark `39; 51` wrong, which is a right answer, to match a
checker that refuses to parse it. Consistency with a defect is not consistency.

The right direction is the one already HELD below: widen what the shared checker parses. The
authored list is restored to its eight entries at `e5d0627c`, recovered from that SHA rather
than retyped.

**Two process notes, because the guard was not new.** It is byte-identical between `e5d0627c`
and `origin/integration` (`git diff` over the file is empty), so it sat on the base the whole
round and a complete local unit run would have gone red before the PR opened. It did not,
because of the concurrent-suite mess recorded in §7 — this is that mistake's one load-bearing
consequence rather than a bookkeeping detail. And the reason CI had not caught it either is
§7's other finding: this PR had no CI at all until the conflict was merged out.

### 1-3. LIN.4's lecture lost the clause that reconciled it

The three-section migration kept the clerk's observation that a count of ingots cannot run
below zero and cut _"which is true of the loads and not of the inequality"_. The lecture
therefore raised a constraint and never resolved it, inviting a learner to truncate
$(-\infty, 6]$ to $[0, 6]$ — the wrong shape for every item in the pack. Restored from
`ae235ca7^` rather than reconstructed, with "loads" changed to "goods" because the compressed
sentence no longer contains the antecedent.

### 1-4. LIN.1 slide 0 contradicted its own widget

The slide pinned a count of ingots. `BalanceBeamSlider`'s boards deal **4** and **3**, and
`worked_examples[0]` uses **3**, so any specific number contradicts something. The sentence now
carries no numeral at all, which is the only version all three can share, and says the ingots
are _"stacked against"_ the crate rather than balancing it — true on both boards, where the
loose weight closes the gap.

### 1-5. LIN.1 slide 3 taught a notation the CFU rejects

The slide asserted that a bare number and a one-element set say the same thing. Measured
through the card's own path: `{9}` and `{ 9 }` both return `parse_error` at two separate layers
(the numeric-literal guard, then the checker), while `9` returns `match`. Mathematically the
sentence was true and it was worse than silence. The single-number requirement is now
attributed to the answer field, where it lives.

### 1-6. `ADVERTISED_INTERVALS` guarded a string nothing advertises

`_shared.ts` held `(-inf, 2]` while the field advertises `(-inf, 5]`
(`answerFormat.ts:243`). The shifter therefore spent every draw pushing keys off an
unadvertised ray and left the advertised one reachable: measured over 4,000 draws per template,
`(-inf, 5]` came up **127** times across three LIN.4 templates. A learner who copied the field's
own example could have scored such an item outright.

No learner-facing defect existed: re-measured after the template insertion shifted the variant
seeds, **0 of 181 served instances** is keyed to an advertised string. The earlier figure of 175
is stale, which is exactly why it was re-measured.

`_shared.ts` now parses its forms out of the placeholder text rather than holding a second
hand-typed copy, and `d3.test.ts` reads the app's copy off disk and fails if the two part
company. Importing across the boundary is not available — `@cr/item-bank` cannot depend on
`apps/web`, the arrow runs the other way — so one copy of the placeholder _text_ is unavoidable;
what is gone is the second copy of the _forms_.

### 1-7. LIN.4 asked one answer shape and taught two

`d3.lin4.compound-or.l2` is appended as a third L2 so the CFU re-ask can serve the union while
the authored question keeps its ray, wired the way LIN.6 was. This takes LIN.4 off
`NOT_ASKED_YET` and **empties that list**, now pinned with `toEqual([])` so it cannot silently
regrow.

The frozen pool did not move: two L2 slots over three templates still serve indices 0 and 1,
and the stability is guarded rather than lucky — a reorder that moves the new template to second
position reds the snapshot with changed ids and hashes.

---

## 2. NOT DONE, and why

Each of these is a real finding this round declined to fix. None is fixed silently or reported
as done.

| Item                                                            | Why it is held                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **The lesson-shell fit defect** (§6)                            | Product-wide, in `styles.css` and `AdvisorNpc.tsx`. Changes every lesson's layout, so verifying it owes a fresh cross-domain frame sweep that concurrent lesson edits would invalidate. Held for its own PR by decision.                                                                                                                                                                                                                                                                   |
| **Two D3 widget contradictions** carried from #542              | `apps/web/src/lessons/interactive/` is read-only this round while other QA rounds run.                                                                                                                                                                                                                                                                                                                                                                                                     |
| **No D3 answer field gets a live preview**                      | `MathAnswerColumn.tsx:54` returns a bare field when a notation is keyless, dropping the keypad **and** the preview together. `interval`, `solution_set` and `set_builder` are deliberately keyless, which is defensible for the keypad and not for the preview: 0 of 5 D3 CFUs render one, over 70 served interval and 63 solution-set items, so the surface most exposed to mistyped brackets and `inf` spellings has no read-back. Cross-cutting.                                        |
| **LIN.4 and LIN.6 CFUs cannot reach their own miss note**       | Neither declares a `check` block, so `cfuChecker` returns `note: null`. Typed `(-inf, 9)` against a key of `(-inf, 9]` the CFU says only "not quite", while the practice twin returns `wrong_bound_inclusivity`, whose note reads _"The endpoints are right; which ones are included is not."_ The note exists and `missNote` is wired only into `LessonPractice.tsx:174`.                                                                                                                 |
| **The grader is stricter than every authored list**             | `solutionSetForms` loops `[", ", "; ", " and "]` (`cfuAcceptedForms.ts:535`) and the authored packs carry the same three separators, while the shared checker refuses two of them as `unsupported_syntax`. §1-2 tried to resolve this by narrowing one pack and was reverted: `cfuAcceptanceConvention.test.tsx` requires a check-less CFU to accept every notation of its own answer, which is the correct bar, so the fix belongs in the checker. Shared with POL.3, POL.4, RAT.6, GEO.1 and CG.1. Wants a ruling, not a patch — and the ruling is now constrained in one direction, which is progress. |
| **`invariants.yml:674-679` enumerates the prose gate's inputs** | The wiring in §5 widens that set to `packages/item-bank/src/<domain>/**` and `apps/web/src/lessons/interactive/**`. The comment's conclusion still holds and holds more strongly — both are `.ts`/`.tsx`, so any change that could move the verdict already sets `code=true` — but the enumeration is now incomplete. CI is outside §11.1's list, so it is Gabe's line.                                                                                                                    |

---

## 3. Guard changes, each with a demonstrated red

Changing a guard owes the same evidence as a fix, so every assertion loosened, tightened, added
or re-tethered here was injected against and watched fail.

| Change                                       | Injected defect                            | Red                                                                                      |
| -------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Per-cell shape count loosened to `>=`        | LIN.4's L2 cell cut to one shape           | `expected 1 to be greater than or equal to 2`                                            |
| Distinctness within a cell                   | New template given a sibling's id          | `expected 2 to be 3`                                                                     |
| **Added**: the locked 1×L1 / 2×L2 / 2×L3 mix | Locked L2 count changed to 3               | `expected [[1,1],[2,2],[3,2]] to deeply equal [[1,1],[2,3],[3,2]]`                       |
| **Added**: two served L2s are two shapes     | Single-L2-shape tree                       | `LIN.4 L2 fills two slots with one shape, so a learner is asked the same question twice` |
| Hardness restated as total moves             | L2 given the L3's per-half workload        | `expected 4 to be 2`                                                                     |
| Key shape must match stated conditions       | Union L2 keyed as a ray                    | `expected 1 to be 2`                                                                     |
| Difficulty-ladder census                     | New id removed from the `l2` list          | ladder census deep-equal failure                                                         |
| `answerFormat` plain-interval census         | New id removed                             | 19-vs-18 deep-equal failure                                                              |
| `RE_ASK_CHANGES_SHAPE` entry                 | Redirect pointed at the wrong template     | exemption-covers-nothing failure                                                         |
| LIN.4 off `NOT_ASKED_YET`                    | Entry restored                             | `LIN.4 now asks both shapes`                                                             |
| `ADVERTISED_INTERVALS` re-tether             | Shifters neutralised                       | `(7, inf) answers d3.lin4.negative-coefficient.l2:practice:111077`                       |
| same                                         | Placeholder set back to the 2-bound        | `expected 'Interval, e.g. (-inf, 5] U (7, inf)' to be '... (-inf, 2] ...'`               |
| same                                         | `advertisedFormsOf` returns the union only | `expected [...] to have a length of 3 but got 1`                                         |
| `TEMPLATE_FLOOR` 202 → 203                   | D4 removed from `SWEPT_TEMPLATES`          | `expected 202 to be greater than or equal to 203`                                        |

Two of these are worth reading twice. The `(7, inf)` red fired on a **ray**, which the old
single-union assertion could not have graded at all — the guard was green over that defect
before and is red over it now. And `TEMPLATE_FLOOR` had to be **re-derived** rather than nudged:
D3's twenty-sixth template raised the without-D4 subtraction to exactly 202, so a floor left at
202 would have stopped failing on D4 disappearing while passing every run. That is the one
loosening the file cannot detect, because the total it measures grew at the same moment.

One honest note, recorded because it is the failure mode the discipline exists for: the first
draft of the two-served-L2-shapes assertion **passed** under its injected defect, because it
counted registered shapes rather than served ones. It was rewritten against the served pool and
re-injected to get the red above.

---

## 4. What was checked and found clean

- Prompt-versus-key over 5,000 draws, all 25 templates, answered from rendered prompt text.
  Word problems went through prose-keyed extractors, so a reworded prompt fails to match rather
  than silently agreeing with its key.
- 175 served instances re-graded; 0 rejected. 117 spellings; 0 correct answers graded wrong.
  Case variants, `inf`/`infinity`/`∞`, brace-versus-bracket, reordered and unreduced rosters and
  missing spaces all grade correct wherever a correct answer is owed.
- R30 placeholder leaks: none. `13` and `{-1, 4}` answer none of the 63 solution-set items;
  the numeric field's `7` matches none of D3's four numeric CFU keys.
- All 13 frozen snapshots byte-identical to their `e5d0627c` blobs, proved with
  `git diff e5d0627c -- packages/item-bank/src/__snapshots__/` returning empty — a stronger
  statement than a before/after pair, since it compares against the commit rather than a note.
  `vitest -u` was never run.
- `validate-lesson-pack.mjs --strict` over `content/lessons/d3`: `OK: 5 lesson pack(s) passed
validation.`, no warning suffix, so every lecture is still inside the three-sentence budget.

---

## 5. The banned-phrase ledger now gates a merge

The scanner holding the ledger ran by hand until this round, which is how §1-1's sentence
survived round 1. It is now wired into `scripts/check-lesson-packs.sh`, and therefore into
`npm run check:lessons` and the invariants workflow, over three paths per domain: the packs,
`packages/item-bank/src/<domain>`, and the widget corpus once.

The product-wide sweep was clean before wiring — **3,191 learner-facing strings across 59 packs
and 5,768 prose-shaped runs across 353 widget files, zero findings**, with every domain's column
summing to the aggregate so no domain went quietly unread.

The third path is the substance of the wiring, and it is measurable rather than argued. Against
the same sentence planted in `packages/item-bank/src/d10/index.ts`:

```
pack-only invocation (what a two-path gate would run):  OK ... EXIT=0
packs + item-bank sibling (what the wired gate runs):   FAIL ... EXIT=1
```

A pack-only gate reports success on a live banned sentence. Fail-closed if the scanner or the
widget directory is renamed away; a single domain's missing item-bank sibling is tolerated but
**named** in the summary, with a floor that fails if every sibling vanishes at once, so the
tolerance cannot swallow the whole surface on a rename.

Cost: ~+9s on a loaded Windows box, against a job whose existing content gates take ~2s on
Linux where this box measures the validator alone at 11–14s. Read it off the first real run
rather than off that arithmetic.

---

## 6. The fit defect, and why `?dev` hid it

Not one of the constraints is under `apps/web/src/lessons/interactive/`, so the widget freeze
does not touch the fix.

At 1024x580, measured rather than computed: the 90vh cap (`styles.css:3907`) leaves the card
522px; the banner takes 106px with a one-line title and 153px with two; the tray ~69px. **The
band left for content is 300–347px**, and the advisor bubble consumes **231–285px** of it — 77%
to 95%. What remains for a widget is 15–116px, and D3's shortest widget is 165px. Cutting prose
further does not help: D10's frame shows a three-sentence lecture, already inside the migration
budget, eating ~250px of a ~300px band on its own.

The thresholds are sharp, because hidden pixels fall at 0.9px per 1px of viewport: D3's easiest
board first fits at **1024x700**, a middling one at **780**, the worst at **900**. A 900px
viewport is roughly a 1000px window, above a 1080p monitor's usable height once taskbar and
browser chrome come off. **On a 1920x1080 screen the worst D3 boards still do not fit.**

`?dev` is why this went unnoticed. `WorldScene` gives the dev frame `size="full"`, and
`.world-scene--full .coc-card` sets `max-height: none` (`styles.css:4013`), overriding the
learner's cap. Same board, same 1024x580: the learner's body is **347px**, the reviewer's
**409px** — 18% more, with half as many controls off-screen. The comment at `styles.css:3992`
records the choice: the cap _"cost a scroll on every slide"_ in dev, so it was lifted for
reviewers and left for learners.

`.cursor/rules/qa-verification.mdc` now says so, because every spatial claim previously checked
through `?dev` understates what a learner loses even when the viewport was short and named.

Frames live in `.qa-frames/laneD/` (gitignored, the repo's convention for review evidence),
64 PNGs and 42 JSON readings, each naming its viewport.

---

## 7. Verification

| Check           | Result                                                                                                                                                                                                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `check:lessons` | **Green.** 10 domains at the error tier; 10 domains and the widget corpus through the prose sweep; 10 item-bank siblings read.                                                                                                                                                                                                                   |
| `typecheck`     | Clean.                                                                                                                                                                                                                                                                                                                                           |
| `lint`          | Exit 0. Its 39 warnings and 23 infos are all in files outside this diff.                                                                                                                                                                                                                                                                         |
| `format:check`  | Clean, 1762 files.                                                                                                                                                                                                                                                                                                                               |
| `test:unit`     | **10,023 passed.** See the correction below: two suites ran concurrently, and this is the fuller of them. 39 files reported `Failed to start forks worker` and never began; re-run in isolation the union across both runs is **80 files, 1,209 tests, all passing but one pre-existing flake.** No assertion failure attributable to this diff. |
| `test:browser`  | **2,404 passed**, 52 timeouts. Seven lesson files re-ran green in isolation (56 tests, 117s).                                                                                                                                                                                                                                                    |

**One residue, labelled rather than dismissed.** Six browser tests — three.js winter and crisis
sheets, and D10's worked triangle — fail on Playwright's `locator.screenshot: Timeout 5000ms
exceeded`, a cap `--testTimeout` cannot raise, and do not clear in isolation on this box. Their
assertions are never reached, so they cannot have been broken by this diff, and every one is in
a file it never opened. **Unresolved locally; left to CI on clean hardware.**

### Correction to the unit figure, 2026-08-04

**I ran two full unit suites at once, and reported from the wrong one.** The second started
thirteen minutes before the first finished and the two ran alongside each other for about
forty-five minutes, so _I was the load_ that produced the `Failed to start forks worker`
storm this section originally attributed to the box. The row above now carries the fuller
run's numbers: **429 files, 10,152 tests, 10,023 passed, 39 files unstarted**, against the
406 / 8,383 / 8,272 / 32 first reported. The two runs raced each other's collection, which
is why neither saw the whole tree and why their unstarted sets differ.

The consequence worth recording is that **the original isolation re-run covered 32 files
when the union of unstarted files across both runs is larger**, and six of the files it
missed are guards content changes could plausibly move: `cfuFigureCoverage`,
`widgetSuccessCoverage`, `rationalAnswer`, `practiceSession`, `mathInput`, `belowBarRetry`.
All six pass. The second isolation run is 41 files and 907 tests, 40 files green.

**The one failure in it is a pre-existing flake, measured rather than argued.**
`crisisFromAFreshSession.test.tsx > asks its questions instead of refusing the round` fails
in `commitIntoTheQuestions` at `:106`, unable to find the `Reinforce a building` button
within the async timeout. It reproduced at one worker, so it is not a worker-startup
artefact, and it was tempting to read as a regression from the new `LIN.4` template feeding
the winter's unpractised-item draw. It is not. Five fresh full-file runs per side, single
worker, same box: **branch 3 pass / 2 fail, base `e5d0627c` 0 pass / 3 fail** before the
base loop was stopped because per-run time had roughly tripled and the machine's own
degradation had become the dominant variable. The defect is at the base, so this diff did
not introduce it. The winter surface is behind `lazy()`, which makes the first test in the
file pay the chunk import, and that is the load-sensitive step. Measured later, the box had
**0.08 GB of 15.72 free**, which is why workers fail to start even at `--maxWorkers=1`.

### This PR had no CI at all until the conflict was merged out

Zero check-runs on both heads, while every other open PR carried 5-13 and Actions was creating
runs seconds before I checked. The cause was `mergeable: CONFLICTING` /
`mergeStateStatus: DIRTY`: **GitHub cannot build a merge ref for a conflicted pull request, so
it never creates the `pull_request` run** — no queued job and no red X, just an absence.
Everything this report "left to CI" was left to nothing. Draft status was the wrong first
suspicion and one query killed it: twelve open draft PRs carry full check sets.

Merging `origin/integration` in fixed it (`MERGEABLE`, 8 check-runs). The two conflicts were
the ledger, a clean union, and `TEMPLATE_FLOOR`, re-derived at the merged census rather than
taking either lane's number.

### What CI then said

- **The six browser screenshot-cap failures above are green on CI.** 230 passed on the browser
  shard, which retires this section's one labelled residue.
- **One browser test fails, and it is not this branch's:**
  `titleBackdropFraming.browser.test.tsx > the island's whole outline reads around the menu
  card at 1024x580`. Not argued from "my diff does not touch three.js" — measured:
  integration's own latest push run (`30965295592`) fails the same test in the same file with
  the same 1 failed / 230 passed shape, and its message differs between runs (_"the renderer
  submitted nothing"_ there, _"the backdrop canvas never reached the viewport's size"_ here),
  which is the WebGL-context flake `9f4e120d` was written for.
- **One real regression, mine, recorded in §1-2 above**, now reverted.
