# lesson-qa reference

Deep detail for the QA process in `SKILL.md`. The quality bar itself is `author`'s
R1..R34; nothing here restates it.

## 1. What the validator can and cannot see

`.cursor/skills/author/scripts/validate-lesson-pack.mjs`. Eleven error rules (numbered 1
to 11 in its header) and six warning rules (lettered A to F), plus one self-check, and a
`--strict` flag that promotes the warnings to failures. Six of the error rules carry R
numbers and four are structural; every warning rule carries one. Mapped to R1..R34 below so
a reviewer knows exactly which rules are still theirs to check by reading. **Count the rows
in the script's own header rather than trusting a total in this sentence**: this line has
been wrong twice, once saying "four warning rules" against a table of five, and the error
tier has grown since.

| Rule | Tier | What the mechanical check actually is |
|---|---|---|
| **R1** density | error | `mini_lesson[i]` sentence count, ceiling 7, with `$...$` masked so math never ends a sentence |
| **R4** meta-commentary | error | a ban-list of phrases, matched on WORD boundaries, over prose and cfu text |
| **R8** one instruction | error | registry `caption` vs the slide's task sentence, Jaccard over content words, threshold 0.7 |
| **R11** variety | error | same visual id twice in one lesson; per DOMAIN, >= 5 distinct kinds and no kind >= 60% |
| **R14** subtitle length | error | a subtitle that EXISTS runs at most 4 words, counted as a reader counts a heading; em-dash and meta-commentary rules also run over the field |
| **R18** node id | error | the LITERAL node ids from `packages/skill-graph/src/skill_graph.json`, over every learner-visible string, markdown emphasis stripped |
| **R9** task in prose | warning | `your turn` / `now you try` / ... , else prose describing widget mechanics |
| **R11** per lesson | warning | fewer than 3 distinct interaction kinds in one lesson |
| **R14** subtitle presence | warning | a `mini_lesson` index with no `slide_subtitles` entry |
| **R19** comma aside | warning | a determiner-led, verbless noun phrase of at most 8 words between two commas, against a blocklist of clause words |
| **R20** letter vs variable | warning | the word `letter`/`letters` in a learner-visible string |
| **R15** demonstrative opener | warning | the FIRST WORD of a `mini_lesson` entry is a bare `That`/`This`/`These`/`Those`/`It`/`They`/`Such`. Nothing in the entry precedes token 1, so the referent is necessarily outside it. A demonstrative DETERMINER (`This rule ...`, `This morning ...`) is exempt: it names the class of the thing |
| R2, R3, R5, R6, R7 | **none** | measured and rejected; see below |
| R10 resets, R12 gating | **none** | behavioural, only a browser test or a human sees them |
| R13 hints, R16 hinges, and R15 apart from the row above | **none** | the review halves are `SKILL.md`'s reading pass |
| R17 objective, R24 task order, R25 binary rows, R26 palette | **none here** | enforced by a required PROP and by Chromium guards, which is stronger; see below |
| R21 label terms, R22 sibling labels, R23 coinages | **none** | judgements about meaning; `SKILL.md`'s reading pass |
| R27 reveal badge, R28 per-part feedback, R29 the gate, R30 placeholder + key row + preview, R31 hidden operands | **none here** | shared components plus Chromium guards over source-derived populations; the table in `SKILL.md`'s reading pass names each one and why reading cannot substitute |
| R32 unearned real terms, R33 copy after a miss | **none** | judgements. The mechanical half of R32 is `scan-lesson-text.mjs`'s ledger, entry by entry after each sentence is cut; R33's obvious rule was measured against R13 and fires on the hint wording R13 endorses |
| **R34** three-section slides | **validator rule 13**, on the packs that DECLARE `worked_examples`: shape, positional alignment, a prompt within 2 sentences, 2-6 steps, plus a population floor | the judgements are review-only: whether the prompt names the instance the steps work, whether the steps follow one another, whether a skip was the right call. N/A on packs that have not migrated; see `SKILL.md` reading pass |

Plus four structural rules that predate the R numbering and belong to `author`'s locked
defaults: a gating interactive visual on every `mini_lesson` index, interactive visual ids
only, no em-dash in any learner-facing string, and `cfu` present with a prompt, a
non-empty `accepted` and a hint.

**R17 and R24 to R31 are not weaker for being absent from this table.** `objective` is a
REQUIRED PROP on five kinds (`OrderSteps`, `LabelParts`, `FillTable`, `SpotTheError`,
`BinaryRowSort`), so a widget built on one of them that omits it does not compile, which
no validator rule can match. R24 to R31 are then pinned by
`widgetTaskOrder.browser.test.tsx`, `binaryRowMarks.browser.test.tsx`,
`spotTheErrorPalette.browser.test.tsx`, `widgetActiveSlot.browser.test.tsx`,
`widgetRevealFill.browser.test.tsx`, `widgetRevealResume.browser.test.tsx`,
`widgetMissedBoardGate.browser.test.tsx`, `labelFigureWhole.browser.test.tsx`,
`answerFormat.test.ts` and `answerPlaceholderFit.browser.test.tsx`. Prefer this shape
wherever a rule can be attached to a shared component instead of to content: none of R27 to
R33 added a validator rule, and the tiers are unchanged by them.

### The six things a green run does not mean

1. **R8 is DORMANT, and the note tells you which of three states you are in.** #179 removed
   every widget caption from the registry (63 to 0), so the rule's population is empty by
   design and it has had nothing to check since. #193 split the one message that used to
   cover every case:
   - *"visuals.tsx parsed from ... : 96 registry entries, 0 of them captioned ... this is
     the INTENDED END STATE rather than a tooling fault"*: the live state on all four
     packs. R8 ran over nothing. It reactivates on the first caption anyone adds.
   - *"apps/web/src/lessons/visuals.tsx was NOT FOUND from here"*: fails open, which is
     what lets a pack be validated outside the repo.
   - *"was found but COULD NOT BE READ"*: the same fail-open path from a different cause,
     given its own
     sentence because borrowing "not found" would be false.
   The emptiness is asserted rather than noted: `EXPECTED_REGISTRY_CAPTIONS` pins 0, so a
   caption appearing is an error here (with R8's own verdict on it printed in the same run),
   and `MIN_REGISTRY_ENTRIES` floors the parse at 80, because a pin of zero is satisfied by
   a parse that has drifted off the registry's shape. **The old wording is why this mattered:
   it described a missing file while the registry was found and 32,234 bytes of it were read,
   so nobody could tell "found nothing" from "could not look."**
1b. **R18 fails OPEN in the old way**, walking up for
   `packages/skill-graph/src/skill_graph.json` and printing
   `note: skill_graph.json not readable from here; skipping the node-id rule (R18).`
   The rule is the literal id set, which is what lets it sit at the error tier with no
   false-positive mode, and it is also what makes an unfound registry a silent skip.
2. **R8 catches repetition, not PARAPHRASE.** The rule needs 0.7 Jaccard over content
   words, so a caption that says the same thing in different words scores under the line.
   Worked example in `examples.md` §1: D7's `linear-line-form-build` states its task in the
   prose, in the caption and in the widget's own status line, and the validator reports
   zero errors on that domain. Only reading found it.
3. **A file-list run skips the domain rules.** Domain variety only runs when argv named
   exactly one DIRECTORY and it held more than one pack. `pack1.json pack2.json` silently
   skips it. And when it does run, its population is the DIRECTORY, pooled over every era
   whose nodes live there, so it is not a measurement of the era under review.
4. **R2, R3, R5, R6 and R7 are not checked at all.** `author`'s SKILL.md section "Why R2,
   R3, R5, R6 and R7 have no validator rule" records why: the only portable proxy for
   scenario placement had zero recall on the defects that were actually rejected, the
   bold-text proxy for term introduction produced 13 wrong findings across D1 and D5, and
   whether an opening motivates or an explanation earns its rule are judgements about
   meaning. Do not propose a proxy. Read the prose.
5. **R19, R20 and R15's demonstrative rule are shortlists, and a near-zero baseline is what
   let each of them land.** **Measure it, do not quote it**, and this item is the standing
   proof of why: it has now carried three different sets of numbers. At `c668d90` the whole
   warning tier fires **zero** times across the sixteen shipped D1/D2/D5/D7 packs, so
   `--strict` exits 0 on all four domains. The previous reading had R19 firing twice, on
   `RAT.5`'s cfu prompt and `LF.1`'s first slide; #201 rewrote both while clearing the 63
   subtitle-presence warnings, and the reading before THAT claimed R19 and R20 both measured
   zero, which was only ever true of R20. None of the three rules ever retroactively FAILED
   content nobody is going to rewrite, which is the durable point the baseline was making,
   and a zero tier now means something extra: a new warning has nothing to hide behind, so it
   is worth reading rather than filtering. What does not move with the numbers: R19 still
   cannot decide parentheses versus absorbing, R20 fires honestly on a figure whose corners
   are labelled A, B and C, and R15's rule fires honestly on a slide whose referent is on
   screen in its widget or named in the subtitle above it.
6. **A rule can be at the error tier and still be checking nothing**, which is item 1's
   general form. Distinguish, per run, a rule that passed from a rule whose population was
   empty; the script now says which for R8, and says it for the registry parse too.

## 2. The four verification techniques

### 2.1 Render, then grep

Three defect classes hid from source review and were obvious in the DOM.

The lesson-pack text half is this skill's script. **Three paths, and the pack directory
alone is not one of them**: the sweep reaches only what the invocation names, and a
pack-only run leaves the widget copy, the worked-solution copy, the answer-field copy and
the item bank's authored literals unread while still printing `OK`. `SKILL.md`'s Scripts
section owns the shape and the history of it going short; this is the same command it
documents, and `scripts/check-lesson-packs.sh` is where CI runs it.

```bash
node .cursor/skills/lesson-qa/scripts/scan-lesson-text.mjs \
  content/lessons/<domain> apps/web/src/lessons packages/item-bank/src/<domain>
```

The rendered half already exists in CI and should be READ as much as run, because its
header documents what each property catches:

```bash
# Every live visual id and every registered worked-solution visual, in every registered
# domain: KaTeX actually typesets, no bare arithmetic left in an SVG <text>, no Unicode
# operator smuggled into the LaTeX, no operator glued to an operand, no row restating
# itself across an `=`.
npx vitest run apps/web/src/lessons/visualsMath.test.tsx

# Layout, cascade and real pointer sequencing. The collapsed-surd guard lives here
# because no jsdom test can see it.
npm run test:browser
```

If a domain's widgets are new, confirm they are IN those sweeps. `visualsMath.test.tsx`
drives its list off the all-domains registry and asserts every registered template is
represented, which is the assertion that keeps a shape from slipping out of the list
again. A widget reachable only through a retry variant has slipped out before.

### 2.2 Grade every answer key through the REAL checker

Not a re-implementation, not an eyeball. The CFU path and the practice path are different
checkers and both must be exercised.

- CFU: `cfuChecker` and `cfuItemVersionId(nodeId)` in `apps/web/src/lessons/cfuChecker.ts`.
  A pack with `cfu.check` grades form-independently through the shared checker; a pack
  without it is EXACT MATCH against `accepted`, so a missing equivalent form reads to the
  learner as a wrong answer. That is a P0.
- Practice: the item-bank checker, `packages/item-bank/src/validate.ts`
  (`PRODUCT_CHECKER_CONFIG`, `D1_CHECKER_CONFIG`) over the domain's frozen pool.
- Alternate spellings to try on every key, because each has been a real defect: an
  uppercase symbol (`X` for `x`), `sqrt(2)` against `\sqrt{2}`, an unreduced fraction, a
  bare base where a power is wanted, and a decimal where an exact form is wanted.
- The notation a CFU accepts must not be notation its own practice items reject. Compare
  the `accepted` list against `apps/web/src/lessons/answerFormat.ts`, which owns the
  learner-facing format notes and placeholders the practice inputs advertise.

By hand, the `?dev` "Step slides" CFU panel shows the accepted list, the hint and which
grading path the pack takes, next to the live question. That is the fastest read.

**A converted check has more than one answer key, and only one of them is in the pack.**
Every pack carries `cfu.variants`, so the question a learner sees after taking the reveal
is DRAWN, and its accepted list is COMPUTED by a speller in
`apps/web/src/lessons/cfuVariants.ts` rather than authored. Grading the pack's `accepted`
list therefore covers the first question and none of the others. Read the drawn instances
with `cfuInstances(cfu)` and grade each one's `accepted[0]`, or the half of the surface
nobody hand-audited goes unchecked. Two failures live here specifically:

- **A canonical form the check would reject.** The reveal PRINTS `answerKey` and then asks
  the learner to type it, so a speller whose first form is not in its own accepted list is
  a reveal teaching a wrong answer. LF.1 shipped that way in review: the template keyed a
  level slope `0/1` where the check accepts `0`.
- **A re-ask that moved the wording and not the answer.** Distinctness by item hash is
  satisfied by a rephrasing, and the learner cannot tell. The resolver rejects an instance
  sharing any accepted spelling with an earlier one, so what to check is whether the
  GENERATOR can vary the answer at all, not whether one draw happened to.

Also read the reveal itself. `cfu.worked_solution` is what it shows, and a last step that
does not name the answer leaves the learner to finish the problem at the moment they said
they could not. The validator's check on that is a character-level containment test after
stripping typesetting, so it passes a step that names the answer and says something wrong
around it.

### 2.3 Sweep the parameter space from the RENDERED PROMPT

The rule: re-derive the expected answer from the prompt STRING the learner sees, then
compare it to the key. Deriving it from `template_params` re-uses the numbers the key was
computed from, so it agrees by construction and passes over the one defect the sweep is
for: a prompt reworded until it no longer asks for its own answer.

The repo's own guard is explicit about this boundary. `validateTemplates` samples each
template (25 by default, 1000 for the product net) and checks that each key satisfies its
OWN spec, with a comment saying so: "not that the key is the right answer to the prompt.
Prompt-vs-key correctness is the job of golden fixtures." It also enforces 1 to 3
non-empty hints, a non-empty worked solution, no step restating itself across an `=`, and
no hint containing the answer key. What it cannot enforce is prompt-versus-key. That gap
is the reviewer's.

```bash
npx vitest run packages/item-bank/src        # the whole item-bank lane
npx vitest run packages/item-bank/src/d2.test.ts
```

`d2.test.ts` is the model for a domain sweep: a `varietyKey` per template, distinct
variety keys inside a (node, difficulty) cell, full retry depth with no silent shortfall,
a five-slot set in the locked mix for every node, no shape served twice, and an explicit
"L3 is harder than its own L2" property. When a new domain lands, the equivalent
assertions should exist for it.

For "one served set repeats an answer across its slots", the mechanism is
`packages/item-bank/src/practiceSelect.ts`: a set-level seen-set threaded through every
cell, as a PREFERENCE not a constraint. Its header records the measured rates before the
fix (9.1% of EXP.1 sets, 19.7% of NUM.5, 25.1% of RAT.6), which is the right shape for
reporting this class: a rate over N sets, not an anecdote.

### 2.4 Revert the fix and confirm the test fails

```bash
git stash push -- <the fixed file>     # or hand-revert the one line
npx vitest run <the test file>          # MUST fail
git stash pop
```

A test that passes both ways is not a regression test. Two shipped examples of exactly
that are in `SKILL.md`'s traps section; the file headers of
`apps/web/src/lessons/lessonVisualSurd.browser.test.tsx` and
`apps/web/src/lessons/workedSolutionArithmetic.test.tsx` document the two failures and
what each test now does instead. Read both before writing a guard of your own:

- The surd test loads the real stylesheet and asserts the stylesheet ORDER it depends on,
  because the rules tie on specificity and the loser is whichever sheet is injected first.
- The worked-solution test asserts over `data-latex` from the rendered diagram rows and
  the KaTeX annotation in the caption, because `WorkedSolution` renders the registered SVG
  INSTEAD of the authored steps whenever one is registered, and every D2 template has one.

## 3. Frozen content

Seven snapshot files exist; all of them are under one directory, so review the directory
rather than a memorized list:

```bash
# Before the review, and again at the end. The two lists must be identical.
git hash-object packages/item-bank/src/__snapshots__/*.snap
```

At the time of writing that is `d2`, `d5`, `d7`, `interactive`, `product`, `template` and
`walk`. Take the count from the glob, not from this paragraph.

- A moved hash after a PROSE edit means the change reached graded content. Report it as a
  finding; do not re-pin.
- The one legitimate exception: prompts are inside the item hash, so a deliberate prompt
  rewrite necessarily moves the practice-pool hashes. Re-pin exactly those snapshots,
  scoped, reviewed, and called out in the report.
- `vitest -u` is never a way to clear a red suite.

## 4. Widget contract facts a reviewer needs

From `apps/web/src/lessons/widgetFeedback.tsx` and `widgetMechanics.ts`. These are the
mechanics R10 and R12 are judged against, and the reveal contract is subtler than "there
is a reveal button".

**The reveal has two stages.** `WidgetReveal` requires a `why` alongside the `answer`, so
an answer-only reveal does not compile (that is R12 made structural). Beyond that:

- The **FIRST** reveal teaches and then **RE-ASKS**. It does NOT open the gate: it prints
  the answer with its reasoning, redraws the exercise on different numbers, and moves
  focus to the fresh instance. A reveal that opened the gate let a learner walk a whole
  slide without once producing a right answer.
- The **SECOND** reveal opens the gate, whatever the widget. That is what stops the
  re-ask from becoming the trap R12 exists to prevent.
- The re-ask needs the widget to have handed up its redraw and its latch via
  `useRevealReAsk({ reAsk, release })`. **A widget that never binds it falls back to the
  no-host behaviour and its first reveal opens the gate immediately.** That is a finding:
  check the binding, not just the button.
- The taught passage is rendered by the HOST, above the widget, because a re-ask remounts
  the widget body and a passage inside that body would be torn down by the redraw it is
  explaining.
- Revealing never fires the success state, and never touches practice: a revealed practice
  slot still scores zero (`Mastery_Scoring_Spec` §4).

**Resets (R10).** `useWidgetVariants(count, { onComplete, onReopen })` owns "start over":
`restart()` advances to the next parameter set AND calls `onReopen`, which un-latches the
gate so Next disappears until the new instance is answered. State is cleared by remounting
the body on the `nonce`. A widget with a hand-written `reset()` is the shape that used to
be half right by forgetting one `useState`, and a `count` of 1 means the reset re-serves
the same numbers.

**Success feedback.** `useWidgetSuccess()` returns one `correct()` callback which owns the
badge, the `aria-live` announcement and the chime. A widget rolling its own is a finding
in itself, and so is a judged widget that never fires it: the badge is required on every
correct step, not just the one that opens the gate. Three further findings on the same
hook: firing it on a reveal, firing it on a re-satisfied predicate rather than on the
state transition (so stepping off a target and back re-pops it), and excusing a widget
that really does judge something by adding it to the `UNJUDGED` list in
`widgetSuccessCoverage.test.ts`. That list is only for widgets with no correct-or-wrong
moment at all.

**Pick-and-place.** `usePickup<T>()` keeps the held item in a ref so a drop handler can
read it in the tick it was written. Its `take()` reads AND releases; that is the correct
call inside a drop handler. A widget holding the selection in plain `useState` has the
two-taps-in-one-frame race.

## 5. Gates, and what each one is for

| Command | Covers |
|---|---|
| `npm run check` | `format:check` + `lint` + `typecheck` + `test:unit` + `test:browser` + `check:graph` |
| `npm run test:unit` | `packages` project, `web-reachability` project, and the web jsdom project |
| `npm run test:browser` | two Chromium projects (`packages`, `web`) via Playwright |
| `npm run check:graph` | skill-graph invariants, a python script, cheap |
| `npx vitest run --project web-reachability` | the domain is registered and can build a gradable five-slot set |

- `npm run setup:browsers` installs Chromium if `test:browser` cannot start.
- The Chromium suite is mandatory whenever widgets, CSS or rendering are touched.
- Never `biome check --write` a directory. `npx biome format <file>` and
  `npx biome lint <file>`.

## 6. Key files

| Path | Why a reviewer opens it |
|---|---|
| `content/lessons/<domain>/*.json` | the packs under review |
| `apps/web/src/lessons/visuals.tsx` | widget registry: ids, captions (R8), the `LessonVisualId` union |
| `apps/web/src/lessons/domains.ts` | `LESSON_DOMAINS`; a domain missing here is unreachable |
| `apps/web/src/lessons/widgetFeedback.tsx` + `widgetMechanics.ts` | the reveal, reset and success contracts |
| `apps/web/src/lessons/interactive/` | the widgets, with `kinds/` holding the six shared archetypes |
| `apps/web/src/lessons/answerFormat.ts` | learner-facing answer format notes, and the one notation dispatch behind every placeholder and every notation row |
| `apps/web/src/lessons/cfuChecker.ts` | how a CFU is graded |
| `apps/web/src/DevLessons.tsx` | the `?dev` viewer, including the CFU answer-key panel |
| `packages/item-bank/src/validate.ts` | `validateTemplates` / `validatePracticePool`, and their stated limits |
| `packages/item-bank/src/practiceSelect.ts` | set assembly, shape spread and the answer-repeat preference |
| `packages/item-bank/src/__snapshots__/` | the frozen hashes |
| `docs/Mastery_Scoring_Spec.md` | the 4-of-5 set rule, hints, and what a reveal costs |

## 7. Three-section slide model

Documented in `author/reference.md` §1 and `author` R34, and **wired**: `AdvisorLesson.tsx`
walks a slide's sections one at a time, `worked_examples` is in `types.ts`, and validator
rule 13 checks it. Migration is per PACK: **D1 is migrated, the other eight domains are
not**, and a pack that omits the field teaches from one bubble per slide and stays valid.

| Section | Pack field | Interaction | QA applies when |
|---|---|---|---|
| 1 — Lecture | `mini_lesson[i]` | none; Next advances | Migrated packs: conceptual only, 2-3 sentences, no worked arithmetic |
| 2 — Worked example | `worked_examples[i]` (`{ prompt, steps }`) | read-only, prompt then step cards | Migrated packs: the prompt names the instance in <= 2 sentences, step quality, or a justified skip (`null`) |
| 3 — Interactive visual | `visuals` with `after === i`, `gates: true` | gated practice | Always: learner produces a result; must not duplicate section 2 verbatim |

**Review scope:** a pack that does not declare `worked_examples` uses the legacy model
(concept + instance often combined in `mini_lesson[i]`). Judge those on R1, R9, etc. against
that bubble — **do not file R34 findings** on them. On a migrated pack, read section 2 as
two things and not one: whether the prompt names the instance the steps actually work, and
whether the steps follow from it.
