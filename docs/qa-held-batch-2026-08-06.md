# The held batch: three PRs, and the eight things they proved wrong

Consolidated evidence for the batch merged into `integration` on 2026-08-05/06. Written
against the integration tip **`80141a35`**, which contains all three merge commits.

| PR | Merge commit | Merged (UTC) | What it is |
| --- | --- | --- | --- |
| #653 | `242adfa0` | 2026-08-05T22:52:35Z | The checker reads all three roster separators; the preview learned four notations |
| #654 | `2387124f` | 2026-08-06T02:20:09Z | The lesson shell fits a short screen, and the way forward is pinned |
| #667 | `ad3e280f` | 2026-08-06T05:07:39Z | CFU grading moved onto the product checker; ten packs migrated; five D3 fills driven |

Merge state is read from each PR's own `mergedAt` and `mergeCommit.oid` rather than
inferred from pushes, and `ad3e280f` was confirmed to be an ancestor of the integration
tip.

**How to read the evidence below.** Each item names its evidence type. Items marked
**measured here** were re-measured against `80141a35` while writing this document; items
marked **from the PR body** are the author's evidence, reproduced but *not* independently
re-run here, and they are exactly as strong as the PR body is. The distinction is not
decorative: a test count copied out of a PR is a claim about a run nobody in this document
watched. See `.cursor/rules/qa-verification.mdc`.

---

## Part 1 — What the batch delivered

### #653: the answer checker and the live preview

1. **`parseValueList` splits on `,`, `;` and `" and "` at bracket depth zero.**
   *Evidence: a demonstrated red, from the PR body.* No test asserted the rejection, so the
   cases were written first; with only `product-answer-checker.ts` reverted to `da781d1f`,
   24 of 148 failed. One correction the PR itself carries: the verdict is `invalid_input`
   but the reason code is mostly `unsupported_syntax`, not `parse_error` — mathjs reads `;`
   as a matrix row separator and `and` as a logical operator, so the unsplit member is
   refused as a shape it will not take rather than as unreadable text.
2. **The interval-versus-roster ruling survives the widening.** *Evidence: a counter-claim
   asserted in the same block, from the PR body.* `[39, 51]`, `(39, 51)`, `[51, 39]` and
   `(-inf, 51]` all still grade not-correct against the key `{39, 51}`. Square brackets are
   deliberately not group delimiters. A flat `.split(/[,;]| and /)` passes the widening
   assertion and fails this one, which is the point of writing both.
3. **The preview reads intervals, unions, rosters and the empty set.** *Evidence: new
   behaviour with tests, from the PR body.* `mathPreviewParser.test.ts`, 30 tests.
   Deleting the keypad gate would have been a regression rather than a fix: at the base,
   `previewOf` returned `null` for all four grammars, and `MathPreview` draws its labelled
   box unconditionally, so the learner would have met an empty box.
4. **The preview gate is split from the keypad gate as `previewsNotation`.** *Evidence:
   measured here.* The symbol resolves in `apps/web/src/lessons/answerFormat.ts`, and both
   guard rewrites in `mathKeypad.browser.test.tsx` were proved load-bearing by injection in
   both directions (from the PR body): forcing `previewsNotation` false for
   `numeric_literal` and `rational_expression` reds the two cards, and forcing it *true*
   for `multiple_choice` draws an empty preview box over the word `decreasing`.

### #654: the lesson shell fit

5. **The defect, measured on the learner's mount rather than through `?dev`.** *Evidence:
   from the PR body and `docs/qa-shell-fit-measurement.md`.* At 1024x580 on
   `d1LessonHost`'s `size="large"` frame, all ten domains arrived on their tallest gated
   board with 15px to 116px of it visible.
6. **`AdvisorControls` is pinned as the lesson column's last child.** *Evidence: measured
   here for the mechanism, from the PR body for the frames.* `.advisor-lesson >
   .advisor-npc__controls` takes `position: sticky; bottom: 0` (`styles.css:8827-8831`).
   Sticky is constrained to its containing block, so a row inside the bubble could only
   stay on screen while the bubble did — which is the thing that scrolls away.
7. **`lessonShellFit.browser.test.tsx` is the first guard measuring the learner mount at a
   short viewport.** *Evidence: measured here for existence, from the PR body for the red.*
   The file is tracked. It went red against the pre-fix tree at 10 failed tests / 28
   assertions before a line of the fix was written, and its `DevLessons.tsx` exception is
   asserted in both directions with each direction forced false.
8. **The spatial claim was framed, not computed.** *Evidence: rendered frames, from the PR
   body.* Two findings came out of the frames rather than out of reasoning: a pinned fill
   with no edge reads as the board having been cut off mid-panel, and `bottom: 0` does not
   reach the bottom, because sticky stops at the scrollport's content edge and the board
   slid through the 16px slot underneath.

### #667: CFU grading on the product checker

9. **The route swapped before the schema widened.** *Evidence: from the PR body.*
   `createD1AnswerChecker` answers `unsupported_answer_type` to `interval`, `solution_set`
   and `point`, so widening the JSON schema alone would have produced silent all-wrong
   grading.
10. **The 23 already-checked CFUs grade identically.** *Evidence: from the PR body.*
    `cfuCheckerProductParity.test.ts` runs every accepted spelling plus wrong-answer
    mutations through both graders. Zero divergences. Its population is a written-down
    historical list on purpose — derived, it would have absorbed the ten packs migrated
    below and stopped being a parity claim about the packs that predate the change.
11. **Ten packs migrated; the census partitions.** *Evidence: measured here.* Counted over
    `content/lessons/**/*.json` at `80141a35`: **62 packs, 33 carrying `cfu.check`**. All
    ten named packs (RAD.3, RAD.4, LIN.4, LIN.5, LIN.6, FUN.2, POL.3, POL.4, POL.5, POL.7)
    carry one; all five refused packs (RAD.1, RAD.2, RAT.6, LF.2, LF.4) do not. That
    matches `docs/cfu-check-migration-rulings.md`'s own census of 33 checked + 29
    check-less = 62, being 8 + 5 + 16.
12. **The LIN.6 win is the demonstration.** *Evidence: measured here for the assertion,
    from the PR body for the run.* `cfuIntervalNote.test.tsx` imports
    `BOUND_INCLUSIVITY_NOTE` and asserts it on `[15, 25]` against the key `(15, 25)`, with
    the negative direction asserted twice in the same file.
13. **The coverage trap is closed rather than sprung.** *Evidence: from the PR body.*
    `cfuAcceptanceConvention.test.tsx` scopes its population to `cfu.check === undefined`,
    so the day LIN.5 gained a check it left that population and stopped being asked, with
    nothing going red. `cfuCheckAcceptance.test.ts` holds every migrated pack's accepted
    spellings open through the new path, so coverage moves with the behaviour instead of
    evaporating with it.
14. **Validator rule 12f.** *Evidence: from the PR body.* `validate-lesson-pack.mjs` did
    not read `cfu.check` at all, so a malformed block passed `check:lessons` in silence —
    the worst place for one, because a check block does not degrade grading, it replaces
    it.

---

## Part 2 — Corrections to the record

Each of these contradicts something previously written down and would otherwise be
re-briefed as fact.

### 1. The migration was ten packs, not the ~16 the plan predicted

Five packs on the earlier census's migratable list were refused **by measurement**, not by
taste. On a checked pack the authored question's `accepted` list is never consulted — the
checker decides alone — so every spelling in the list is a promise that migrating breaks.
*Evidence: `docs/cfu-check-migration-rulings.md` §"Ruling two", verified line-by-line here.*

| Pack | Spellings lost | The family that goes |
| --- | --- | --- |
| RAD.1 | 11 of 15 | LaTeX and the root glyph (`\dfrac{6\sqrt{2}}{5}`, `6√2/5`), `invalid_input` |
| RAD.2 | 6 of 9 | the same |
| RAT.6 | 12 of 14 | a value written as an equation (`x = 3`, `{x = 3}`) |
| LF.2 | 7 of 17 | the right-hand side alone, and function notation |
| LF.4 | 26 of 31 | the whole `x = 2, y = -3` family, read as `wrong_notation` |

Exact match is strictly better for the learner than equivalence over a narrower grammar.

**A second discrepancy found while checking this.** #667's PR body says "**Fourteen** cannot
migrate until a string-to-payload adapter exists" and then calls FUN.3 and FUN.5 "two of the
fourteen". Both cannot be true. The rulings doc says **16**, and the doc is right: 5
`rational_answer` (RAT.1-RAT.5) + 9 `multipart` = 14, and FUN.3 and FUN.5 are the fifteenth
and sixteenth. Only the doc's figure partitions the population (8 + 5 + 16 = 29, and
33 + 29 = 62, measured here). **Use 16.** The merged PR body is left as it stands.

### 2. FUN.3 and FUN.5 look like `solution_set` and are not

Their prompts fix the answer order — FUN.3 says "put the charge for the 5 ton load first",
FUN.5 "give the two rates in that order" — and a solution set is unordered, so the type
would grade a transposed answer correct against a question whose answer it is not.

They were caught **only by re-reading each pack's prompt** instead of the shape of
`accepted[0]`. The earlier census was a heuristic over `accepted[0]`, and this is precisely
where it was wrong: `38, 14` is byte-indistinguishable from a two-member roster. This is the
same failure mode `.cursor/rules/qa-verification.mdc` describes under "scope a guard by the
behaviour, not by the implementation" — a clean filter over a real source is at its most
convincing exactly when it is filtering on the wrong property.

### 3. `d7CfuAcceptance.test.tsx` did not break

The plan predicted its `MIN_PACKS = 4` would empty, because LF.2 and LF.4 would migrate.
Both were refused (correction 1), so D7 still has four check-less packs and the guard stands
**unedited**.

*Evidence: measured here.* `MIN_PACKS = 4` at `apps/web/src/lessons/d7CfuAcceptance.test.tsx:50`,
with its own comment reading "LF.1 to LF.4 today". And
`git log 242adfa0~1..HEAD -- apps/web/src/lessons/d7CfuAcceptance.test.tsx` returns **empty**:
no commit in the batch touched the file.

### 4. The advisor bubble had no hardcoded height, and "Next" was never truly unreachable

Two separate over-claims in the earlier notes.

- **The 231-285px bubble figure was a measurement, not a constant.** *Evidence: measured
  here.* `.advisor-npc__bubble` sets padding, border, background and `line-height: 1.7`, and
  no `height`, `min-height` or `max-height` at all. Its height was the length of
  `mini_lesson[i]`. The only cap it now carries is the one #654 added inside the
  short-viewport block (`max-height: min(28vh, 220px)`).
- **"Next" was reachable the whole time.** *Evidence: measured here.* `.coc-card__body` is
  `overflow: hidden auto` (`styles.css:3835-3843`), so the well scrolls and the control row
  was always a scroll away. The real defect is narrower and more interesting: the way
  forward sat **outside the well at the scroll position that finishing a board leaves you
  in**. Finishing a board puts the learner at the board's bottom, and the row was 84px to
  324px above the top of a well that had scrolled past it. Five of the seven boards a driver
  could actually finish had no advance control on screen at the moment it was earned.

Stating this precisely matters, because "unreachable" invites a different fix — and the fix
that shipped is a sticky row, which addresses where the control *is*, not whether it exists.

### 5. `FILL_UNDRIVEN` cites issue #161, and driving five fills uncovered five real defects

*Evidence: measured here.* `widgetRevealFill.browser.test.tsx:1484` reads "They came in with
**#161**'s own pilot". There is no occurrence of `#354` in the file. The earlier note's
attribution was wrong.

Driving D3's five own-copy fills — LIN.3's two rules, LIN.4's endpoints, LIN.5's branches
and LIN.6's rays — was not bookkeeping. It **uncovered five real widget defects**, recorded
at `widgetRevealFill.browser.test.tsx:1495-1500`:

- **three widgets keyed the reveal mark on their own `revealed` id**, which the first
  teach-and-stop reveal never sets, so nothing was marked over the one window the mark
  exists for;
- **two applied the fill to every row while any reveal was holding**, writing one row's
  answer into a box the passage on screen never mentions.

This is the bug-fix row of the QA rule working as designed: a fill that is never driven is a
fill whose correctness nobody has tested, and "probably already handled" would have been the
tell. Each of the five now has a driving case and had its `FILL_UNDRIVEN` line deleted in
the same change.

### 6. A height-keyed CSS rule can move a width-pinned measurement

The fit fix first shipped `padding` shorthand inside `@media (max-height: 700px)`. The
shorthand sets the *inline* padding too, later in source order than the `max-width: 720px`
phone rule, so it cost a 390px reading column 24px (330.8px → 306.8px) and rewrapped the
sentence `d6Fun4AxisAndProse` exists to keep on one line. It **passed locally on Windows
fonts and failed deterministically on CI's**, because a 24px loss rewraps a line here and
not there. The fix is `padding-block`, which is what the merged tree carries
(`styles.css:3977`).

Both lessons are already recorded in `.cursor/rules/qa-verification.mdc` and are **not**
duplicated here:

- the shorthand/width-pinned-guard trap, at that file's lines **74-76** ("Trim one axis with
  `padding-block` / `padding-inline`, and before writing 'nothing sees this', grep the
  viewports");
- "a local green is not evidence when the measurement is text metrics", at line **79**.

*Evidence: measured here — both passages confirmed present in the rule at `80141a35`.*

### 7. The learner's lesson body is 347px, and 300px when a pack's title wraps

*Evidence: measured here.* `.cursor/rules/qa-verification.mdc:46` carries the 347px figure
and **:56** now carries the 300px case — 14% smaller, on the two packs whose title wraps the
banner to two lines, because a second title line costs 47px of a capped card. The measurement
is visible in `docs/qa-shell-fit-measurement.md`: D10's GEO.2 row reads a 300px body against
D2's 347px, and on POL.4 that left 15px of a 483px board on screen.

The number a rule quotes was never one number, and quoting the 347px alone understated the
worst case by 14%. (Post-fix the sweep reads 411px on all ten, with the wrap gone.)

### 8. Six stale file:line anchors corrected

*Evidence: measured here, each one.*

| Anchor as previously written | Reading at `80141a35` |
| --- | --- |
| `d1LessonHost.tsx:21` for `size="large"` | line 21 is `<WorldScene`; the prop is on **line 25** |
| `styles.css:8575` for the bubble rule | 8575-8578 is `.advisor-npc__bubble-wrap`; the bubble rule was **8580-8594** |
| `DevLessons.tsx` `size="full"` at 472/490/511 | **476 / 494 / 515** |
| `apps/web/src/lessons/degreeAnswerFormat.test.ts` | **does not exist**; the only file of that name is `packages/item-bank/src/d9/nodes/TRG.1/degreeAnswerFormat.test.ts` |
| `ceremonyAnswerRow.browser.test.tsx` under `src/lessons/` | it is under **`apps/web/src/city/`** |
| `readingWidths.ts:16` citing `readingWidths.browser.test.tsx` | **no such file has ever existed**; the measurement is `labelFigureNarrow.browser.test.tsx`, and the header now says so |

**One of these corrections is itself already stale, which is the point.** The bubble anchor
was corrected to `styles.css:8580-8594` in `docs/qa-shell-fit-measurement.md:312-313`. At
`80141a35` that range is inside a `@keyframes` block above `.oru-advisor`, and
`.advisor-npc__bubble-wrap` / `.advisor-npc__bubble` have moved to **8692 / 8697** — partly
by #654's own edits and partly by other lanes landing in the same stylesheet. The correction
was true at the SHA it was written and is false now. Re-read anchors at the tip before acting
on them; the precision of a file:line citation is what makes it feel durable, and one merge
in that area voids all of them at once.

---

## NOT DONED

Every deferral across the three PRs, aggregated. Each is a deliberate, reasoned decision
with the reasoning recorded, not an oversight.

1. **The activity-phase bubble collapse — declined by the user.** Considered during #654 and
   turned down; a tall board still scrolling is the accepted outcome.
2. **`simplification` profiles for the eight form-dependent packs.** EXP.1, POL.1, POL.2,
   POL.6, POL.8, NUM.3, NUM.4, EL.5 stay on exact match because the form *is* the teaching
   point. There is a real follow-up here and it is not a check block: several have a profile
   that would express the rule (`positive_exponents` for EXP.1, `standard_form` for the
   polynomials). Each profile needs measuring against the pack's own accepted list before it
   ships, and `simplification: "none"` — the only setting available without that measurement
   — would widen acceptance and undo the question.
3. **The string-to-payload adapter the 16 compound packs need.** RAT.1-RAT.5
   (`rational_answer` wants `{expression, excluded_values}`), the nine `multipart` packs
   (CG.1, FUN.1, FUN.4, FUN.8, FUN.10, LF.1, LF.3, EL.2, EL.4), and FUN.3 / FUN.5. A CFU has
   one text field and these types need a structured payload. Two things the adapter must get
   right, both visible in this set: the separator grammar is the one
   `cfuAcceptanceConvention.test.tsx` measures, and an ordered pair of same-kind quantities
   is a `multipart`, never a `solution_set`.
4. **A LaTeX/root-glyph normalizer, and a `point` comparator.** These are what would let
   RAD.1, RAD.2 and LF.4 migrate — the normalizer in front of the parse for the first two, a
   comparator that reads `x = 2, y = -3` as a coordinate pair for the third. The follow-up is
   on the checker, not on the packs.
5. **Set-builder previews.** `{x | x != 9}` still returns `null` and
   `previewsNotation("set_builder")` is `false`, so no learner meets an empty box. A
   condition needs a grammar for `|`, `!=`, `<=` and a bound variable that none of the four
   readings has — and set-builder is the one notation whose form is graded *as a form*.
6. **Coordinate-pair previews — refused, not merely deferred.** `previewsNotation("point")`
   is `false` because `(6, -7)` is byte-identical to an open interval, so the parser reads it
   as one and would **speak** it as one. Asserted explicitly in `answerFormat.test.ts` rather
   than left as a gap.
7. **A directly measured completed board in D2, D6, D8 and D10.** Those four domains produced
   no completable board across 24 lessons tried, so their completed-board fit numbers rest on
   the controls-row **proxy**. The proxy is good but not exact. Recorded as NOT DONE in
   `docs/qa-shell-fit-measurement.md` (§ at lines 232-236 and 337) rather than smoothed over.

---

## What this document does not verify

Stated plainly, so nothing here is read as stronger than it is.

- **The test runs are not re-run here.** #667's 2,333 passing tests across 20 CFU-touching
  files, #653's 774/774 and 1222/1222, #654's 17-passed guard and its 10-failed pre-fix red,
  and every injected-red demonstration are **from the PR bodies**. They are recorded there
  with their failure output, and this document reproduces rather than re-measures them.
- **The rendered frames are not re-taken here.** #654's spatial claims — what the pinned row
  overlays on D9 and D4, at 1024x580 — rest on frames the author looked at. Re-taking them
  would need the learner mount, not `?dev`.
- **The post-fix 411px sweep is from `docs/qa-shell-fit-measurement.md` §7**, not re-measured.
- Both PR bodies report pre-existing failures on `integration` measured at their own bases
  (`beatVisualsAreMonotonic`, `era5ModelFit`, `terracedFieldsFit` and others, plus the
  `validateTemplates` timeout class). Those are recorded as not-ours **by the PRs**; this
  document did not reproduce that baseline either.

What *was* measured here, at `80141a35`: the pack census (62 / 33 / the ten / the five), the
`MIN_PACKS` value and the emptiness of the batch's log for `d7CfuAcceptance.test.tsx`, the
`#161` citation, every file:line anchor in correction 8, the presence of both lessons in
`.cursor/rules/qa-verification.mdc`, `.coc-card__body`'s `overflow`, the bubble rule's lack of
a height, and the existence of every guard file named above.
