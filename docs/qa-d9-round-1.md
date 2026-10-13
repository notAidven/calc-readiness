# D9 QA — round 1

Reviewed at `24493680`, on branch `anthony/d9-qa` in worktree `../wt-d9-qa`. Scope: the nine
D9 lesson packs (`content/lessons/d9/TRG.1.json` … `TRG.9.json`), their 36 gated widgets, the
45 D9 practice templates and their worked-solution figures.

**This is D9's first QA round.** There is no round 0 to reconcile against: the domain was
authored in #412 and had two
style-fix passes after it (#456
and #501), neither of which was a
content review. `TEAM_CHECKLIST.md` recorded the domain as lessons 27/27 and item packs 22/22
with a note that the lesson-QA pass was still owed. This is that pass.

**Round 1 both reported and fixed.** Five read-only probes swept the domain at `24493680`;
four fix lanes then landed on this branch. Nothing was carried from a lane's report without
being re-measured on the merged result — the fix lanes were interrupted before reporting, so
every number below was taken by hand at the tip rather than quoted from a worker.

**One reported P0 was rejected rather than fixed**, and one guard added by a fix lane was
found passing over the very defect it was written for. Both are below.

## Frozen content: one re-pin, scoped and named

`packages/item-bank/src/__snapshots__/` holds 13 `.snap` files. Twelve are byte-identical
before and after the round (`git hash-object`, both readings). One moved:

| File | Before | After |
|---|---|---|
| `d9.test.ts.snap` | `75e4c7e4ec9c9844ed98daa98f65167a57b5f39b` | `bb7ebe7d86727f1d18996a3da70830a3adb55680` |

The re-pin was authorized in advance for prompts that are genuinely wrong. It is **9 hash
lines changed, 9 added and 9 removed, and no `id` line in the diff at all** — so no item was
added, removed or renumbered, and the pool's composition is unchanged. `hashItemDefinition`
(`packages/item-bank/src/schema.ts:44-49`) canonicalizes `node_id`, `prompt` and `answer`, so
the nine are exactly nine questions whose wording or answer changed. Each is a deliberate
rewrite named in the table below:

| Template | Why it moved |
|---|---|
| `d9.trg2.cofunction-angle.l3` | answer was the number the prompt printed (F5) |
| `d9.trg3.coordinates.l3` | was the same question as its sibling L3 shape (F6) |
| `d9.trg3.reference-degree.l1` | gained the "no degree sign" instruction (F4) |
| `d9.trg4.identity-name.l3` | ambiguous prompt (F13) |
| `d9.trg5.features.l3` | asked for a number the printed rule already showed (F7) |
| `d9.trg7.arcsin-degree.l1` | gained the "no degree sign" instruction (F4) |
| `d9.trg7.arctan-round.l3` | gained the "no degree sign" instruction (F4) |
| `d9.trg7.compose-principal.l3` | gained the "no degree sign" instruction (F4) |
| `d9.trg9.formula-name.l3` | ambiguous prompt (F14) |

Two of those reshapes moved items between census cohorts, and the move was verified by
composition rather than by total. `d9.trg3.coordinates.l3` stopped keying exact trig values
and `d9.trg5.features.l3` stopped keying radian periods, so eight instances crossed from the
"exact" cohort to the "plain number" one. Measured independently in two unrelated files that
agree: `radicalAnswerSubmit.test.tsx` reports `TRG.3|canonical_exact_trig_value` 10 → 5 and
`TRG.5|none` 17 → 14, with every other node's count unchanged and `d9` plain 129 → 137; and
`answerKeypad.test.ts` reports `exact_trig_value` 32 → 27 and `exact_radian` 66 → 63. Same two
templates, same eight instances, two independent measurements.

The one authored string outside that hash which the round also moved: `TRG.3`'s CFU
`accepted` list lost `-0.5`, which is why the artifact sweep counts 155 learner-facing strings
where it counted 156 (the sweep reads `cfu.accepted[i]`,
`.cursor/skills/lesson-qa/scripts/scan-lesson-text.mjs:665-668`).

## What was fixed and what was only reported

Step 7 of `.cursor/skills/lesson-qa/SKILL.md`. Twenty items were raised across the five probes,
one of which was rejected outright; three more came out of the fix lanes themselves (F3b, X2
and X3). The prose probe raised nine of the twenty: its four P1s are F16–F19 below, and its
remaining five were graded P2 and are **not** actioned this round.

| # | Finding | Outcome | Where |
|---|---|---|---|
| F1 | **P0** Authored CFU accepts a form its own re-ask rejects (TRG.3/4/9) | **FIXED** | the three packs' `check`; `cfu.tsx`; `cfuGradingParity.test.tsx` (new) |
| F2 | **P0** Worked solution teaches a roster form the grader refuses | **FIXED** | `d9/nodes/TRG.6`, `TRG.8`; three new guards in `d9.test.ts` |
| F3 | **P0** `TrigTangentExplore` erases its own question at the first miss | **FIXED** | `interactive/TrigTangentExplore.tsx` |
| F3b | The same defect on `GeoAngleExplore`, a bespoke D10 sibling | **FIXED with it** | `interactive/GeoAngleExplore.tsx` |
| F4 | Five templates never say a degree answer takes no degree sign | **FIXED** | `d9/nodes/TRG.3`, `TRG.7`; `degreeAnswerFormat.test.ts` (new) |
| F5 | TRG.2 L2's answer is the number its own prompt gives | **FIXED** | `d9/nodes/TRG.2`; `missingSide.test.ts` (new) |
| F6 | TRG.3's two L3 shapes are one question asked twice | **FIXED** | `d9/nodes/TRG.3`; `worked/d9TRG3.tsx` redrawn to answer the heading; `l3ShapesDiffer.test.ts` (new) |
| F7 | TRG.5 L3 is not harder — it hands back a printed number | **FIXED** | `d9/nodes/TRG.5`; `worked/d9TRG5.tsx` redrawn to measure a position; `featuresHarder.test.ts` (new) |
| F8 | TRG.9's hint branches on the answer two lines below it (R13 leak) | **FIXED** | `d9/nodes/TRG.9` |
| F9 | TRG.8's hint asserts the learner's own placement (R13 leak) | **FIXED** | `d9/nodes/TRG.8` |
| F10 | `THIN_CELLS` counts distinct prompts where the defect is distinct answers | **FIXED** | `d9.test.ts`, `THIN_ANSWER_CELLS` |
| F11 | 10% of reveal-to-retry pairs hand back the answer just revealed | **FIXED for D9; open elsewhere** | `practiceSelect.ts`, `d9/practice.ts` — see below |
| F12 | TRG.4's worked-solution figure ignores the instance it is drawn for | **FIXED** | `worked/d9TRG4.tsx`; `d9TRG4.test.tsx` (new) |
| F13 | TRG.4's identity-name prompt is ambiguous | **FIXED** | `d9/nodes/TRG.4` |
| F14 | TRG.9's formula-name prompt is ambiguous (`todo.txt:28`) | **FIXED** | `d9/nodes/TRG.9` |
| F15 | Three widgets head a column or a call with a paraphrase instead of the term the node teaches (R21) | **FIXED** | `TrigReferenceTable.tsx`, `TrigPeriodTable.tsx`, `TrigWindowSorter.tsx` |
| F16 | TRG.8 teaches from "reference angle" and "quadrant" with no path to the node that defines them | **PROSE FIXED; the graph edge REPORTED, open** | `TRG.8.json:6`; `d9CrossNodeTerms.test.ts` (new) |
| F17 | TRG.7 grades on `arcsin` / `arccos` / `arctan` notation its mini-lesson never names | **FIXED** | `TRG.7.json:5`; same guard |
| F18 | TRG.5's summary contradicts its own slide 3 and two of its served items | **FIXED** | `TRG.5.json:8`; ledger entries |
| F19 | TRG.3's slide 1 implies \(\cos\theta + \sin\theta = 1\) | **FIXED, both surfaces** | `TRG.3.json:5` and `TrigUnitCircleExplore.tsx:644` |
| X1 | **P0 REJECTED** `secant-defined.l2` marks `Defined` incorrect | **WITHDRAWN — false positive** | measured below |
| X2 | The round's own new task-order guard passes over the defect it guards | **FOUND AND CLOSED IN THE FIX LANE** | `widgetTaskOrder.browser.test.tsx` — below |
| X3 | The computed-list / checker split cannot be closed in general | **REPORTED, open** | `cfu.tsx` — below |

## X1: the rejected P0

A probe reported that `d9.trg6.secant-defined.l2` marks `Defined` incorrect while its prompt
never asks for lowercase, and graded it P0. **It is a false positive and nothing was changed
for it.**

`normalizeTextSubmission` (`apps/web/src/lessons/answerFormat.ts`) folds case when the answer
type is `multiple_choice`:

```ts
return answerType === "multiple_choice"
  ? trimmed.toLowerCase().replace(/\s+/g, " ")
  : trimmed;
```

and all three production surfaces that submit a practice answer call it before grading:
`LessonPractice.tsx:153`, `InfiniteDrill.tsx:145`, `EraAdvanceCeremony.tsx:420`. The probe
called the checker directly, which is a path no learner reaches. Recorded here rather than
dropped silently, because the next probe to grade through the checker alone will find it
again.

## X2: a guard that passed over its own defect

This one is worth reading, because the guard is otherwise a good one and it still measured
the wrong thing.

The fix lane that closed F3 also rewrote `widgetTaskOrder.browser.test.tsx`, widening its
population from eleven hand-named ids to a derivation over the sources, and added a two-halved
runtime assertion whose stated job is that *"a right answer MOVES the task on … this is what
says the round's question lives in the slot at all"*.

Re-injecting F3 — deleting `{open?.question}` from `TrigTangentExplore`'s task slot and
leaving everything else — the file reported **197 passed, 0 failed**. The advancing assertion
only required the task text to differ between part 1 and part 2, and the same lane had put a
`Part {at + 1} of {parts.length}` counter in the slot, so the text differed whether or not the
question was there. The counter stood in for the question it was printed beside.

Closed by comparing the body with the counter stripped, and by pinning the content the
question actually carries — on `trg-tangent-explore` the `12` and the `45` whose absence from
the screen is how the defect was reported in the first place. Re-injected, the same file now
fails twice:

```
AssertionError: trg-tangent-explore: the task slot does not carry «12» from the question it
has open, so the question is somewhere else
AssertionError: trg-tangent-explore: «12» is not on the board after one wrong answer, which
is the defect: the learner cannot see what was asked
```

and passes 197/197 with the fix restored.

## F3b: scoping the widget P0 by behaviour

`TrigTangentExplore` rendered its per-round question as `feedback ?? open?.question` in the
status line, and `setFeedback(null)` runs only when the round advances, so one wrong answer
replaced the question permanently. The learner was left an empty box, a Check button and a
note about formatting, with neither the height nor the swing anywhere on screen.

The population that can exhibit this is **boards that hold more than one question at a time**,
not boards in D9: where there is a single question a standing task line states it and nothing
is lost. Derived that way, the defect had exactly two instances tree-wide, and the second was
`GeoAngleExplore` on GEO.1 — a bespoke D10 widget sharing no code with the first, whose own
head comment described the bug in the past tense as already fixed there. It was not. Both are
fixed.

The shape is now asserted in source over every widget that renders the task slot, so a third
board acquiring `feedback ?? <round property>` fails even if it names its field something the
runtime derivation cannot see.

## F15: the board that would not name the thing it taught

Worth a line because of where it lands. `TrigReferenceTable` headed its filled column *"angle
back to the horizontal axis"* — a paraphrase in the slot the term owns (R21), on the one board
where a learner PRODUCES reference angles for the first time. TRG.3's own prose uses the term
six times and every sibling widget touching the idea names it; this board, and only this
board, refused to. `FillTable` renders `headings` into `<th scope="col">`, so the paraphrase
was both the visible and the announced name of the column, and no other learner-visible string
on the board carried the word either.

The consequence is downstream: a learner could finish the slide fluent at the move and without
the word, then meet "the reference angle is 45 degrees" as a draggable chip on TRG.8 with
nothing to connect it to the thing they had just worked out three times. The description now
survives as a gloss beside the term rather than in place of it. `TrigPeriodTable` had the
milder half of the same defect on "period" and is fixed with it.

## F11: fixed for D9, live everywhere else

A reveal shows the answer and the retry button then offers another go; serving an instance
with the same answer makes that a coin flip whose result the learner has already been given.
Measured over D9's 300 served instances at `24493680`: **30 pairs, 10.0%**, worst at
`d9.trg6.secant-defined.l2` where 5 of its 7 instances retried to the verdict just revealed.

`drawRetryInstance` (`packages/item-bank/src/practiceSelect.ts:145`) is the fix and prefers an
unseen ANSWER within the tier that was already going to be served — a preference, never a
constraint, so an exhausted cell still fills the retry.

**It is wired into D9 only.** Eleven domains export a `draw*PracticeInstance`; ten of them
still avoid by item id alone and have the same defect at whatever rate their own answer
distributions give. Adopting the helper is a one-line change per domain, and it belongs to
those domains' owners rather than to this round.

## X3: what the CFU grading split can and cannot promise

F1's mechanism: `cfu.tsx:402` grades the authored question through the lenient real checker
while `cfu.tsx:414-416` grades a re-ask by exact match against an enumerated list, and the
comment above it claimed the list "is built to carry everything the checker would have
allowed". Measured at `24493680` that was false on three packs, and it cannot be made true in
general — an equivalence class is infinite and a list is finite, so nothing enumerable carries
every `k*n/k*d`.

What holds instead is a property a pack opts into: a `check` declaring `representation` and
`simplification` narrows the checker to something an enumeration can match, and then the two
questions agree. The three packs now declare it. **Packs declaring neither, or typed
`expression`, keep an unbounded class and a re-ask strictly narrower than the question beside
it** — that is reported, not fixed, and `cfuGradingParity.test.tsx` measures the residual and
prints it each run rather than leaving a figure here to go stale.

## Coverage actually run

Measured, not asserted. The first four rows were measured by the read-only probes at
`24493680`; everything from "Gates" down was re-measured by hand at the tip.

- **812 answer strings through the real graders** — every served D9 key plus its plausible
  alternate spellings, routed through the production checker rather than a reimplementation.
- **All 45 templates × 400 draws, answer re-derived from the rendered prompt**, zero
  mismatches. Proved non-vacuous by injecting 27 defects: 0 of 45 templates were blind.
- **36 widgets, all nine R24–R31 guards, 529 browser assertions.** Reveal bindings, R10 resets
  and R12 predicates clean 36/36.
- **Nine prose findings** across the nine packs; subtitles clean (zero questions in 36) and
  R33 clean.

### Gates at the tip

| Gate | Result |
|---|---|
| `biome format` | clean, 1661 files |
| `biome lint` | 0 errors, 26 warnings, all pre-existing. The one in a file this round touched (`cfuVariants.ts:1030`, `noUnusedVariables`) reproduces with the round's changes stashed out |
| `tsc --build` | clean |
| Validator, `--strict` over `content/lessons/d9` | exit 0, 9 packs. R8 dormant over 254 registry entries / 0 captioned, the intended end state |
| Artifact sweep over `content/lessons/d9` | exit 0, 155 strings, 0 artifacts (156 before; the one is `-0.5`) |
| `check:graph` | PASS, 87 hard edges over 62 live nodes |
| Unit suite | **453 files / 11,074 tests pass.** 2 files fail: `ciScopeFilter` and `ciGateAggregation`, 34 assertions, which fail **identically at the base SHA** and are a Windows path defect — the test writes a temp `.sh` and bash receives `C:UserszhengAppData…` with the separators eaten |
| Browser suite, D9 surface | **42 files / 617 tests pass** (every `Trig*`, `binaryRowMarks`, `classifyNumericCallOrder`, `workedFigureLabels`, `widgetTaskOrder`, `widgetRevealReAsk`, `estimateLanes`) |
| Browser suite, whole | 18 files red under full-suite load, none of them a D9 file: 21 test timeouts, ~24 screenshot-capture timeouts, 6 known city/three panel timeouts, one missing-font error. The six that could plausibly have been this round's — `classifyChipFit`, `devCfuGameParity`, `mathKeypad`, `mathCaseTransform`, `labelFigureNarrow`, `svgHitTargetCentering` — pass 51/51 run in isolation |

A note on this machine for whoever runs these next: the unit suite at default parallelism
produced 89 `Failed to start forks worker` errors and reported 14 failing files; at
`--maxWorkers=4` it produces zero and reports 2. Eleven of those fourteen were startup noise.
Read a red run here at full parallelism as unmeasured rather than as failing.

## The prose tier

Four P1s, all **re-verified as still true at `2e602b49`** before being acted on rather than
taken from the probe's report at `24493680`.

**F19 needed two surfaces, and the second is the one that mattered.** TRG.3's slide said the
one unit of reach is *"shared between the two"* — an additive claim, on the slide that defines
both reaches, whose own CFU then grades a single reach at \(240^{\circ}\). The replacement says
what is actually fixed at one unit (the distance out to the tip) and states the trade-off as a
trade-off. Deliberately **not** "the two never add to one", which is false at the axis headings.

The lesson pack was only half of it: `TrigUnitCircleExplore.tsx:644` carried the same claim
reworded in its solved status line, and that widget is what the slide MOUNTS — so a learner met
the corrected sentence and the uncorrected one on one screen. The prose lane was fenced out of
widget files and reported it rather than reaching across; it is now fixed, and the two sentences
are two separate ledger entries because they are two surfaces with two owners.

**F16 took the prose route and left the graph alone, which is the right call.** `TRG.8` has
`prereqs: []` and no node reaches it, so TRG.3 is not an ancestor and its transitive closure is
empty — walked, not read. But the empty list looks like a convention rather than an omission:
TRG.8 is `item_family: true`, `_item_family_prereqs` already encodes `TRG.4` under all three of
its families with `TRG.4 → TRG.3`, `EL.6` has the identical shape, and `_edge_overrides` records
the deliberate ruling that a per-family requirement is "encoded as item-family, not a universal
hard edge". Promoting `TRG.4` into TRG.8's `prereqs` is a decision about that convention across
two domains. TRG.8 now recalls both terms where it first uses them, in TRG.3's own wording and
unbolded so each term is still introduced exactly once. **The edge is reported open below.**

**F17** is the plainest of the four: `arcsin`, `arccos` and `arctan` are spelled on TRG.7's
prompts, hints and CFU, and the mini-lesson named none of them — the only use anywhere was one
bare `\sin(\arcsin r)` inside slide 3, which uses the symbol without introducing it. **F18** was
a summary contradicting its own slide 3 on the phase shift and the period, plus an internal
count error ("two of them … and one is not", followed by a sentence naming four and reading
three off the rule) and a false claim about the amplitude on the half of `amplitude.l1` draws
that deal a negative leading coefficient.

### Guards, and their reds

- **Four `BANNED_PHRASES` entries** — three from the lane, one from clearing the widget. This is
  the designated last step of acting on a prose objection: a rewrite has no other regression
  check, and this tree has a recorded case of a phrase cut in one round returning in the next.
  Verified independently of the lane's own report: the sweep run over the **pre-fix** packs
  reports **3 findings over 68 strings**, each naming its file and field, and re-injecting the
  widget sentence reports **1 finding**, `TrigUnitCircleExplore.tsx line 642`.
- **`d9CrossNodeTerms.test.ts`** (new, 13 tests). Populations derived rather than listed:
  borrowed terms come from TRG.3's bold spans filtered by TRG.8's prose, and the filter
  genuinely discards one (TRG.3 bolds "unit circle"; TRG.8 never uses it). The ancestor walk is
  asserted **positive on TRG.7 first**, so the negative TRG.8 claim cannot pass by returning an
  empty set. Re-verified by injection rather than trusted: removing TRG.7's new sentence fails
  at *"TRG.7 grades on `\arccos` without ever naming it"* and *"… `\arctan` …"*, 2 failed / 11
  passed, and restoring it returns 13/13.

One honest gap the lane recorded rather than papered over: `\arcsin` passes its guard even
without the new sentence, because of that one bare use in slide 3 — the finding in miniature.

## The merge, which contained one real ruling rather than five textual conflicts

`integration` moved 101 commits under this round, and five files conflicted. Four were
mechanical. The fifth was two rounds fixing **the same defect in opposite directions**, and it
needed deciding rather than combining.

The defect both rounds found: these packs carry a `check`, so the AUTHORED question went to
`cfuChecker` while the re-ask went to a computed list. The checker built numeric specs with
`simplification: "none"` and took `2/4` against a key of `1/2`; the list spelled no unreduced
form and refused it. One card, two verdicts, one answer.

- **The other round widened the list** (`unreduced: true` on the three TRG spellers).
- **This round narrowed the checker**: the packs declare `representation: "fraction"` and
  `simplification: "reduced_fraction"`, and their prompts ask for lowest terms in as many words.

They cannot both apply. `gradeCfuAnswer` refuses an unreduced fraction at its `simplification`
gate BEFORE any list is read, so the widened spellings would be written and unreachable — a flag
reading as tolerance the surface does not have.

**Narrowing was kept, on the widening side's own stated rule**, which is that a computed list
refuses an unreduced fraction only where lowest terms is the graded skill. That rule was written
when nothing asked these three for lowest terms, which is why it put them on the tolerant side.
This round's content moved them: the prompt asks for it and the pool grades `not_simplified` on
the same values, so a CFU tolerating `-2/4` would be the sole D9 surface disagreeing with its own
pool. POL.4, where reducing genuinely is not the graded skill, keeps its `unreduced: true`.

The other side's guard is what forced this to be explicit rather than quiet: its census asserts
set-equality between `REDUCTION_IS_THE_SKILL` and the packs declaring the profile, so the three
nodes had to be named there with reasons or the file went red. That is an imported guard catching
an imported decision, which is the best case for a merge this size.

**One of their tests emptied out and was rewritten rather than deleted or relaxed.** "The checker
already accepts unreduced on the authored ask of every spec-carrying node" existed to prove the
three TRG nodes were a defect rather than a content question. Fixing them by declaring the profile
made its population zero and its floor fired correctly. Deleting it would have thrown away the
measurement and lowering the floor would have left it passing over nothing, so it now asserts the
AGREEMENT in both directions: a node declaring the profile must have its checker REFUSE the
unreduced form, and a node declaring nothing must have it ACCEPT. Both directions are demonstrated
red — hardcoding `simplification: "none"` back into `itemVersion` fails it by name on all four
nodes (`NUM.F`, `TRG.3`, `TRG.4`, `TRG.9`), and its floor is pinned at that measured 4 rather than
under it, because at 3 stripping one pack's profile left it green while only the census caught it.

This round's own P0 guard was re-verified after the restructuring rather than assumed to survive
it: re-injecting the erased question fails both halves by name at `trg-tangent-explore`, and the
file is 197 green with the fix in place.

## Open at the end of round 1

- **F11 elsewhere.** Ten domains still draw a retry by item id alone.
- **X3.** Packs that declare no answer profile keep a re-ask narrower than their own question.
- **F16's graph edge.** If every TRG.8 item genuinely needs TRG.4, `prereqs` should say so and
  the recall added to TRG.8's prose becomes belt-and-braces. That is a ruling about the
  `item_family` convention across D8 and D9, and it wants the owner of the graph rather than a
  D9 round.
- **`\arcsin`'s guard is weaker than its two siblings'**, for the reason given above.
- **The prose probe's five P2s**, which this round did not act on. A round is a round, not a
  finish.
