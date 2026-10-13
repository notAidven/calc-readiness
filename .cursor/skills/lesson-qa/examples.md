# lesson-qa examples

## 1. The report shape

Reconciliation table first, then new findings by priority, then coverage. Nothing above
the SHA line. Angle brackets mark what you fill in; the D7 entries marked HISTORICAL below
were genuine when the report was written, and are here so the shape is anchored to
something real rather than invented.

**They no longer reproduce, and that is left visible on purpose.** The prose was rewritten,
#179 dropped every registry caption and #201 cleared the warning tier, so a reader who runs
the command in P1-1 gets `0 errors, 0 warnings` instead of 16 warnings. Nothing about the
SHAPE has expired; every NUMBER in it has. Copy the shape and take your own measurements,
which is the whole of the lesson this staleness is being kept to teach.

```markdown
# Atomic Age lesson QA, round 2

Era: Atomic Age. Reviewed here: its 4 Linear Functions nodes (LF.1, LF.2, LF.3, LF.4) in
`content/lessons/d7/`. Its other 5 nodes are unauthored and are listed as not covered.
Pinned at `integration` @ `<sha>`. Every line reference is that tree.

## Round 1 reconciliation, at <sha>

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | LF.2 caption restates the widget prompt | FIXED | caption dropped from `visuals.tsx`; the run prints the parsed-and-empty note with `EXPECTED_REGISTRY_CAPTIONS` satisfied, so R8 saw the reviewed population and neither fail-open note printed |
| 2 | `<widget>` reset replays the same numbers | STILL BROKEN | `<Widget>.tsx:<line>` passes a one-entry pool to `useWidgetVariants` |
| 3 | `<widget>` has no reveal | NO LONGER APPLICABLE | widget removed; `<replacement-id>` replaces it |

## P0 (wrong mathematics, ungradable correct answer, dead end)

None.

## P1 (the teaching fails)

**P1-1. All four D7 packs state the task in the prose (R9), on 16 slides. On LF.2 slide 0
the same task is stated three times (R8).** [HISTORICAL: fixed since, see the note above]

`content/lessons/d7/LF.2.json` `mini_lesson[0]` ends:

> Your turn: build the two lines you are asked for by setting $m$ and $b$ yourself.

The `linear-line-form-build` registry caption then says:

> Set $m$ and $b$ yourself and hit two targets: one handed to you as an equation, one
> described only in words.

And `LinearLineFormBuild.tsx:386` renders its own `lesson-interactive__status` line, which
is where the task belongs. The learner reads the instruction twice before reaching any
control, so both earlier copies are noise they have to discard to find the real task.
Reproduce:

    node .cursor/skills/author/scripts/validate-lesson-pack.mjs --strict content/lessons/d7
    # FAIL: 0 error(s) across 4 pack(s) ... plus 16 warning(s), failing because --strict was passed

`--strict` is the gate reviewed content has to pass. These were warnings rather than errors
only because D1 and D5 predate R9; D7 did not have that excuse, and the packs were fixed.

Note what the run does NOT say: **0 errors, so R8's caption rule did not fire on this
caption.** The rule compares content words against the slide's task sentence at a 0.7
Jaccard threshold, and this pair paraphrases rather than repeats, so it scores under the
line. The duplication is real and only reading found it. This is why R8 stays on the
review list even when the validator is green.

## P2

**P2-1. <one-line title, with the R-number where one applies>.** `<file>:<line>`,
`<quoted text>`, then the wrong thing a learner takes away.

## Checked and found clean

- Validator, whole DIRECTORY, `--strict`: 0 errors, 16 warnings (all P1-1), and the run
  printed neither fail-open note, so R8 was really checked. [HISTORICAL]
- Rendering sweep: 83 learner-facing strings across 4 packs, 0 artifacts. [HISTORICAL]
- Every CFU key graded through `cfuChecker`, plus an uppercase symbol, `sqrt(2)` against
  `\sqrt{2}`, and an unreduced fraction: <result per node>.
- Every D7 practice template swept over <n> draws each (<total> draws), with the expected
  answer re-derived from the RENDERED prompt: <result>.
- `git hash-object packages/item-bank/src/__snapshots__/*.snap` identical before and
  after, all <count> files.
- `npm run check` green, including the Chromium suite. `product.test.ts`'s 1000-sample
  test measured <n>s against its 60s budget.
- Read against `author`'s review checklist for R2, R3, R5, R6 and R7: <what each said>.
```

## 2. Weak versus strong write-ups of the same finding

The finding is real in all three. Only the third is usable.

**Weak: a taste claim.**

> LF.2's first slide is confusing and should be rewritten.

No file, no line, no quote, no rule, and nothing the author can act on without guessing
which sentence is meant.

**Weak: correct but inert.**

> `content/lessons/d7/LF.2.json` `mini_lesson[0]` violates R9.

Checkable, so better, but it makes the author look up both the text and the rule and
infer why it matters. A reviewer who files ten of these has delegated the review back.

**Strong: evidence, quote, and the learner's wrong conclusion.**

> **LF.2 states the task in the prose as well as in the widget (R9).**
> `content/lessons/d7/LF.2.json` `mini_lesson[0]` ends:
>
> > Your turn: build the two lines you are asked for by setting $m$ and $b$ yourself.
>
> `linear-line-form-build`'s own status line already says this. The learner reads the
> instruction once with no controls beside it, looks for something to do, and only then
> finds the real task below. Reproduce with
> `node .cursor/skills/author/scripts/validate-lesson-pack.mjs --strict content/lessons/d7`.

## 3. What a bad reconciliation looks like

**Bad:**

| # | Finding | Status |
|---|---------|--------|
| 2 | reset replays the same numbers | probably fixed |
| 5 | caption duplicates the prompt | could not reproduce |

"Probably fixed" is not a status. "Could not reproduce" is STILL BROKEN with the evidence
missing. Both send the author looking for work that may not exist.

**Good:**

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 2 | reset replays the same numbers | STILL BROKEN | `<Widget>.tsx:<line>`, still a one-entry variant pool |
| 5 | caption duplicates the prompt | FIXED | caption removed from `visuals.tsx`; R8 clean AND the run printed the parsed-and-empty note rather than either fail-open one |

The difference in row 5 is the second clause. R8's caption rule reports nothing when its
population is empty and nothing when it cannot read the registry, so "the rule is clean"
alone does not distinguish a fixed caption from an unrun check. Since #193 the run says
which of the three states it is in; quote that line, not the exit code.

## 4. Proving a guard can fail

A test asserted over the authored `worked_solution` array while the UI rendered a
registered SVG instead, so it guarded nothing and stayed green while a diagram shipped
missing two rows. The check that would have caught it is one command:

```bash
# 1. Break the thing on purpose: delete the diagram row the test claims to cover.
# 2. Run the test. It MUST fail.
npx vitest run apps/web/src/lessons/workedSolutionArithmetic.test.tsx
# 3. Restore, run again, confirm green.
```

If step 2 passes, the test is asserting over something the learner never sees. Move the
assertion onto rendered output: the `data-latex` an `EquationRow` emits per diagram row,
or the KaTeX annotation in the caption. That file's header documents the original failure
and is worth reading before writing a guard of your own.

The same discipline applies to a fix you are REVIEWING rather than writing. "The author
added a test" is not evidence. "I reverted the one-line fix and the test went red" is.

## 5. Reporting a rate, not an anecdote

For anything statistical, a rate over a stated N reads as a measurement and a single
observation reads as a complaint. The repeated-answer defect is the model:
`packages/item-bank/src/practiceSelect.ts` records that, measured over 2000 sets per node,
one five-slot set repeated an answer on 9.1% of EXP.1 sets, 19.7% of NUM.5 and 25.1% of
RAT.6.

**Weak:** "I saw the same answer twice in one practice set."

**Strong:** "Over 2000 generated sets per node, `<node>` repeats an answer within one
five-slot set on `<x>`% of sets; `<other node>` on `<y>`%. Script: `<path>`."

Give the floor too. A sweep that measured 3 cases and a sweep that measured 675 both
print "0 mismatches", and only one of them means anything.

## 6. R34 (three-section slides) — FUTURE / migrated packs only

**N/A on existing shipped packs until migration.** The examples below are hypothetical
shapes for when a pack follows the three-section model (`author` R34) after the player
lands. Do not file R34 against legacy one-paragraph `mini_lesson` slides.

**Weak:** "Slide 1 lecture is too long and walks through the arithmetic."

**Strong:** "`<node>` slide 1 (R34). Section 1 (`mini_lesson[1]`) walks a numeric instance:

> To factor $x^2 + 5x + 6$, look for two numbers that multiply to $6$ and add to $5$…

That arithmetic belongs in section 2, not the lecture. A learner reads the worked instance
twice before the widget asks them to produce anything. Section 2 (`worked_examples[1]`) is
missing while section 3 (`<widget-id>`) repeats the same numbers passively."

The finding names the wrong conclusion (instance in lecture + widget replay, not practice)
and quotes the offending prose.
