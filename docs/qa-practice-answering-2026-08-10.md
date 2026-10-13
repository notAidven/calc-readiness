# Practice answering: a full-bank solve, a false-positive census, and six comparator fixes

**Anchor SHA `b88bb0c7`** (`b88bb0c7e280243aca038dc55921219f19109c8b`). Branch
`anthony/practice-answer-sweep`. Every number below is a measurement at that anchor plus the
commits on this branch; re-read anything here at the current tip before acting on it.

This round asked one question — *does the practice bank grade a learner's answer correctly* —
and answered it three ways at once: a swarm solved 654 drawn instances by hand from the prompt
alone, a census mutated every served item's own key into 13,614 wrong answers, and a strictness
audit built adversarial answers aimed at named comparators. What each method found, and what it
could not see, is the most useful thing in this document.

---

## 1. What was found and fixed

### The P0: the drill graded an empty string for every rational item

`InfiniteDrill.tsx` decided what to hand the checker from `isInteractiveAnswerType`, where
`LessonPractice.tsx` decides it from the payload's shape. `rational_answer` is not an
interactive type, so a rational item's `{ expression, excluded_values }` payload collapsed to
`""` and the empty string was graded: **all 140 rational items, 4 of 4 RAT nodes, 100% of each
node's drill pool**, answered `invalid_input / invalid_rational_answer` with a message telling
the learner to fill in the two boxes they had just filled in. Fixed by branching on the payload
shape, as the graded surface does.

No key-only sweep could see this, because it is not a grading defect: it is a defect in what
reaches the grader, and only on one of the two surfaces.

### Five comparator defects, each closed with a witnessed red

| ID | Defect | Fix |
|---|---|---|
| F1 | `d9.trg3.exact-value-circle.l3` instructs *"write any square root as `sqrt(...)`"* and then a pre-submit guard refuses exactly that, on the 37% of draws whose key is a plain fraction | `requiresNumericLiteral` stands down where the prompt asks for a radical |
| F2 | `MAX_EXPONENT` 8 made the archetypal power-law slip (`y^8` → `y^16`) `invalid_input`, so it was never scored as a miss | cap raised to 16 |
| F3 | `rationalize` throws `Invalid + placing` on `(x - 9)/4`, so a polynomial over a constant was `parse_error` and the inverse-operation miss was discarded | an exact AST polynomial reader ahead of the `rationalize` fallback |
| F4 | *"Factor completely"* accepted `x^2(x + 9) + 13(x + 9)` — a sum, not a product — on 32 of 60 draws | `isAdditiveTopLevel` / `notFactoredIssue`, conditional on the key's own top-level operation |
| — | A constant radical compared by float tolerance accepted a near-miss; a solution-set roster collapsed distinct members under tolerance; a condensed-log item accepted `log(y) + ln(n)`, which is `log_b` of nothing for any `b` | exact surd arithmetic, `rosterValuesEqual` on exact values, `logTokenNames` reading the submission's own base names |

F1, F2 and F3 are one family and were fixed as one: **a wrong answer that is never scored.**
`invalid_input` and `blocked_by_guard` are not misses — the engine declines to score either, no
attempt is recorded, and the learner is re-served rather than corrected. Every existing sweep in
this tree was structurally blind to all three, because every existing sweep submits keys, and a
key is by construction never one of these shapes.

### Found during verification: the graded surface painted a guard refusal as a miss

Found by the browser confirmation matrix in §4, which is exactly what it was built to find.
`LessonPractice.tsx` rendered its feedback line with `data-status="incorrect"` hardcoded, and
three of the four things that set that line are not misses: both pre-submit guards refuse before
`submitAnswer` is ever called, and the scoring-fault line is the app breaking rather than the
learner. So a refusal that recorded no attempt and left the slot untouched told the DOM it was a
wrong answer. `InfiniteDrill` never had this: it derives the attribute from its phase, which is
why the two surfaces disagreed and why the matrix caught it.

The fix carries a `scored` flag beside the message, the same distinction the component already
keeps for an unreadable answer, whose comment says the reason outright: *"an answer the reader
could not read has not been judged incorrect or anything else, so it must not wear a miss."*
The note now renders in neutral ink rather than brick, with the field still live and the hint
still offered.

---

## 2. The two measurements, and the contrast between them

**The swarm: 654 of 654 answers agreed with the declared key. 100%.** Ten solvers derived every
answer from the rendered prompt without reading the key, over 327 templates and all ten domains,
and not one disagreed. **No wrong answer key exists in this bank**, as far as an independent
human-style derivation can tell.

That figure is only worth something with its controls, so: the same path marked **1,852 of 1,869**
deliberately wrong answers not-correct, so the pipeline demonstrably discriminates; **89 of 632**
answers (14.1%) were byte-different from the key while still grading correct (`4t + 32` against
`4*t + 32`, `13.50` against `13.5`), which is not what copying a key looks like; and a **second,
independently launched, key-blind pass** over the hardest 66 rows missed **0**.

**The census: 0 false positives over 13,614 key-derived mutations**, on both surfaces, spanning
25 families and all nine answer types. 10,797 reached the grader; 2,817 were refused by a
pre-submit guard first, and those are counted separately because a guard refusal says nothing
about the comparator.

**And here is the contrast that matters for the next round.** Mechanical key mutation found
nothing. Every one of the five comparator defects above came from ADVERSARIAL CONSTRUCTION —
answers built to attack a named comparator's specific weakness, not derived from the key by rule.
A census tells you the comparator is not obviously broken. It does not tell you it is sound, and
on this bank the two methods had almost disjoint yields.

The referee's own caution belongs beside that, because it is the sharpest version of the point:
its first sweep over the factoring comparator also found zero false positives, and the reason was
that it had built its attack strings with an explicit `*`. `x^2*(x + 9) + 13*(x + 9)` is
`invalid_input`; the identical answer written `x^2(x + 9) + 13(x + 9)` is accepted. **The verdict
flips on one character**, and the spelling the sweep chose was the one the defect does not survive.
A zero from a sweep is a fact about the strings the sweep happened to spell.

### Adjudication tally, and the false-alarm rate

| | Count |
|---|---|
| Candidates raised | **3** |
| Survived adjudication | **1** (F4) |
| False alarms | **2** — both instrument errors, both the measurer's own |
| Solver errors | **0** over 698 gradeable derivations (632 + 66) |

**A 67% false-alarm rate, and both false alarms were the instrument rather than the bank.** One
probe called `-2*(x + 1)*(x + 1)*(x - 3)*(x - 5)` a false positive when writing a repeated factor
twice instead of squared is a perfectly complete factorisation. The other submitted a
`rational_answer` key as a bare string, which grades `invalid_rational_answer` whatever it says,
and reported a draw refusing its own key — **that one would have been a fabricated P0**, the
highest-severity finding of the round, manufactured entirely by the measuring instrument. Re-run
with the right payload shape, 654 of 654 draws accept their own key.

F4 was adjudicated by a referee launched key-blind — given the prompt and the string, with no
key file, no source, and no grader. It confirmed F4 and, in the same pass and from the same
evidence, cleared the control string the probe had wrongly flagged, separating them on
`+`-versus-`*`. A referee that condemned both would only have shown it agrees with whoever asks.

---

## 3. The permanent guards

Each owes an injected red, a population derived from source with a floor, and a composition
assertion so the population cannot drift back to the wrong shape.

**1. `submitPathAcceptance.test.ts` — every served item accepts its own answer through the whole
submit path, on both surfaces.** 2,265 items x 2 surfaces. The only guard in the tree that can
catch a pre-submit gate refusing the key it demands (the RAD.1 class), and the only one that
would have caught the P0, which is why the surfaces are asserted to AGREE rather than each
asserted correct. `blocked_by_guard` is a distinct outcome from `incorrect` throughout. The
composition assertion floors each of the nine answer types separately, because a sweep scoped to
string-keyed items would have excluded all 217 non-string ones — exactly the cohort the P0 lived
in.

**This file is also the primary evidence against the risk running the other way.**
`product-answer-checker.ts` took +1,168 lines this round, and a comparator that starts refusing
CORRECT answers is a worse defect than the false positives the tightening closed. Stated
explicitly: **all 2,265 declared keys are submitted as a learner submits them, on both surfaces,
and every one is accepted.** A tightening that broke a legitimate answer shape fails here.

**2. `falsePositiveCensus.test.ts` — the census, as a standing assertion.** Every served item
gets at least one value-wrong mutation; twelve-plus families; a per-family floor. `empty_string`,
`whitespace_only` and `prompt_echo` are excluded BY NAME from the "the comparator rejects wrong
answers" floor, with the list asserted in both directions, because those three are
parse-dominated and prove nothing about the comparator.

**3. The 409-item coverage gap, encoded rather than scoped around.** The census's own largest gap
was that five simplification rules covering 409 items — including all 97 `simplified_radical` —
had never received a same-value-wrong-shape mutation. `wellFormedWrongRawAnswer` was extended
with shape-aware rewrites per rule: an uncombined `2x + 3x`, an unsimplified `sqrt(8)`, a
reordered polynomial, an unexpanded log, a negative exponent, a distributed partial factorisation.
All ten rules the pool declares now carry form violations with a floor each, and the floor table
is asserted to name every rule the pool serves, so a newly authored rule cannot arrive uncovered.

**And it found one acceptance, recorded rather than assertion-weakened.**
`combined_polynomial` accepts `5*t + 9 + 1` — the right value in a forbidden shape — because
`hasUncombinedLikeTerms` compares additive terms by SYMBOL and never looks at constant terms,
while the sibling profile `combined_constants` refuses the identical payload. It is **not fixed
in this round, deliberately**: `hasUncombinedConstants` lives in `checker-core.ts` shared with
the D1 v1 checker, so tightening it rescores production verdicts and owes a `D1_CHECKER_VERSION`
bump under Answer_Equivalence_Spec §13.13; and `d1-checker-fixtures.ts` already pins the identical
hole on the sibling `expand_only` profile as KNOWN INHERITED LENIENCY, so it predates this round.
It is pinned by name with both-direction assertions: the entry fails when someone fixes the
leniency, and fails if the family stops producing mutations. **Ranked carry, P2.**

**4. `independentAnswers.test.ts` — the human solve, frozen.** 654 rows over 327 templates,
each regenerated at its recorded seed and submitted through the full path on both surfaces. This
is the only guard in the tree that asks whether the declared key is the right answer to the
question the learner is shown; everything else compares the key with itself. Key drift now fails
at the row it drifted on. Floored at 654 rows / 327 templates, with the domain and answer-form
composition asserted, and the 22 prose rows (interactive widgets, where the solver's answer is an
English description of a dragged state) excluded by a named list that fails both ways — including
a check that each listed template really is still an interactive type.

---

## 4. Verification

| Check | Result |
|---|---|
| `check:lessons` | **0 errors, 0 warnings** across 10 domains |
| `typecheck` (`tsc --build`) | clean |
| `lint` (Biome) | clean |
| `format:check` (Biome) | clean |
| Lessons suite (`apps/web/src/lessons`, 97 files) | **6,935 passed, 0 failed** |
| Browser confirmation matrix | **25 passed** (12 cases x 2 surfaces, plus the composition assertion) |
| Full browser suite | 2,827 passed, 59 failed — all screenshot-under-load, see the triage below |
| Frozen snapshots | **14 of 14 byte-identical** to the anchor by `git hash-object`; `vitest -u` never run |

**The browser confirmation matrix** (`harnessFidelity.browser.test.tsx`) exists because every
claim in this round rests on the in-process harness being faithful, and that harness is a
TRANSCRIPTION of two shipped components which has already been wrong once. Twelve cases — one per
answer type, per surface, plus the guard edges — render the real component in real Chromium, type
into the real field, submit the real form, read the verdict off the DOM, and assert that the
screen and the harness AGREE. It found the `data-status` defect in §1 on its first run: two rows
red, both on the graded surface, both saying the screen read `incorrect` where the harness said
`blocked`.

### Re-witnessed reds

Per the QA rule, a guard added without a demonstrated red is not evidence. All five reds that had
been claimed on a worker's report rather than witnessed were re-injected at the current tip and
each failed at its own assertion lines:

| Fix | Injection | Failure |
|---|---|---|
| F3 exact polynomial reader | force `polyCoefficients` past the exact reader to `rationalize` | 2 failed — `(2*x^2 + 10*x + 12)/2 -> invalid_input/parse_error: expected 'invalid_input' to be 'incorrect'` |
| F4 not-factored | `notFactoredIssue` returns `undefined` unconditionally | 5 failed — `x^2(x + 9) + 13(x + 9) -> unsupported_expression/unsupported_factor_degree: expected ... to match { status: 'incorrect' }` |
| exact surd | `submittedExact = undefined`, falling back to the float path | 1 failed — `expected 'correct/match' to be 'incorrect/value_mismatch'` |
| `rosterValuesEqual` | exact `math.equal` replaced by `floatEqual` | 5 failed — `expected 'correct/match' to be 'incorrect/extra_solution'`, and four siblings |
| mixed log bases | `logTokenNames` collects no names | 3 failed — `mixed ln(y) + log(n): expected 'correct/match' to be 'incorrect/mixed_log_bases'` |

All five injections were reverted and the five files re-run green (131 passed). **No guard in
this round remains claimed-but-unverified.**

### Failures triaged

- **My own instrument error, 76 failures.** The first full web run was launched with the working
  directory set to `apps/web` rather than the repo root, which doubles every asset path to
  `apps\web\apps\web\...`. Re-run correctly, they are gone. Recorded because it is the same class
  of mistake as the two false alarms in §2: a defect-shaped number produced by the measurement.
- **Load timeouts, 14 tests** (`d5.test.ts`, `template.test.ts`, `templateTermination.test.ts`,
  three engine files). All six files pass in isolation — 89 passed — which is the triage the
  verify-changes skill prescribes.
- **Windows-environment failures, ~14 tests** in `repo-hygiene` and the era exporters:
  `bash --noprofile --norc` failing with a mangled `/bin/bash: C:UserszhengAppData...` path,
  `EPERM: operation not permitted, symlink`, `spawnSync git ENAMETOOLONG`. All are the documented
  Windows/WSL hazards, none touches this change surface.
- **Screenshot-under-load, 59 browser tests.** The full browser run took 36 minutes on this
  machine and nearly every failure is a test that photographs a surface — the flake the
  verify-changes skill documents by name. Ten were re-run in isolation and all pass (78 tests),
  including the four that touch this change surface: `unreadableAnswerShots` (the graded-practice
  refusal, the closest thing in the suite to the `data-status` fix), `mathAnswerColumn`,
  `answerAreaShots` and `devCfuGameParity`.
- **`src/archipelago`, `src/city`, `src/succession`, `src/winter`: pre-existing, and measured
  rather than argued.** These fail on this machine in isolation as well as under load, with
  symptoms in island navigation and crisis mounting
  (`Unable to find [data-testid="archipelago-overview"]`), plus five `EPERM ... symlink` rows in
  `era5ExporterSafety` which are the Windows shape above. None of them exercises the answer
  checker, but that is an argument, so I ran the four directories at the anchor as well:
  **`b88bb0c7` fails 20 of 3,067 and the branch tip fails 20 of 3,067**, the same files in the
  same places. The two runs differ by one test each way inside a single island-navigation file
  (`oneNavigationPath.test.tsx`), which is order-dependence in an area this change does not
  touch, not a delta this branch introduced. CI on the PR is still the reading for the machine
  question, but the branch is not the cause.
- Two branch-introduced tests failed on the 20s default because they genuinely exceed it —
  `infiniteDrillRationalAnswer.test.tsx`'s cohort sweep (~40s alone, it mounts the drill 140
  times) and the two whole-pool sweeps in `submitPathHarness.test.ts`. Each now declares its own
  budget, and the cohort sweep gained the floor it was missing.

---

## 5. NOT DONE

- **F5 (P2) — NOT DONE.** 227 rows advertise the unconstrained placeholder `Your answer` and then
  refuse a unit (`75%`) before grading; 102 of them have a prompt naming a unit, a percent or a
  measure. `NUMERIC_LITERAL_PLACEHOLDER` exists in `answerFormat.ts` for exactly this and is not
  used. No learner is ever marked wrong for it — the cost is a wasted turn and misleading copy.
- **F6 (P2) — NOT DONE.** `d3.lin4.compound-or.l2` marks the physically sensible reading wrong: a
  crate cannot weigh a negative number of minas, so a learner who excludes negative weights is
  marked incorrect. Both draws affected. A prompt-quality fix, not a grader fix.
- **C1 (P2 carry) — NOT DONE.** `NumberLinePayload.points` is a bare array of numbers with no
  per-point open/closed flag, so four of the swarm's misconception states ("an OPEN circle at
  -6") cannot be expressed at all: the learner cannot make that mistake and the widget cannot
  elicit it. No correct answer is blocked.
- **The census's third P2 — NOT DONE.** `unreduced_fraction` beyond bare `a/b` keys: an item
  whose key holds a fraction inside a larger expression (`(x + 1)/2`) was never mutated that way,
  because building a value-equal unreduced rewrite of a compound expression needs symbolic work
  the witness harness does not do.
- **The 23-point sampler residual — NOT CLOSED, deliberately pinned.** `SAMPLE_TOLERANCE` was
  narrowed from 1e-9 to 1e-12, which refuses the first of the strictness report's two
  constructions and not the second: a perturbation divided by 1e13 sits under 1e-12 and above the
  2.4e-16 floor legitimate answers need. Closing it properly requires exact comparison of variable
  radicals. `sampleToleranceHeadroom.test.ts` pins what the tightened tolerance still cannot do,
  and says in its own comment that whoever writes the exact comparison should delete the test
  rather than widen anything.
- **`combined_polynomial` accepting an uncombined constant — NOT DONE**, ranked carry, reasons and
  both-direction pin in §3.
- **D2/D3/D8/D9 prompt-derivation readers — NOT BUILT, and this was the right call.** The plan
  made them conditional on a solver/key disagreement, and there was none: 654 of 654 rows agreed.
  Building readers to re-derive answers from prompts, for domains where no disagreement exists,
  would have measured the readers rather than the bank. Recorded as a named carry: if a future
  round finds a disagreement in those domains, this is the tool it should reach for.
- **The `rationalize` cliff — CLOSED CARRY, not re-measured.** `docs/Product_Checker_Poly_Coefficient_Cost.md`
  owns it. The exact reader added this round handles the shapes it can; some inputs are
  intractable rather than slow, and no further timing number is coming. No performance measurement
  was relaunched in this phase.
- **Over-scope, honestly recorded.** The exact-surd module is roughly 250 lines against a finding
  the ledger said could be closed more cheaply. It is correct and it is guarded, but it is more
  machinery than the defect demanded, and a reviewer weighing the +1,168 lines in
  `product-answer-checker.ts` should know that one finding accounts for a fifth of it.
- **Served instances versus fresh draws.** Every population figure in the swarm ledger (F4's "32
  of 60 draws", F1's "22 of 60") is a statement about a template's parameter space at seed
  900,000+, not about the 2,265 served items.
- **Key-blindness is supported, not proved**, and a shared blind spot is undetectable by
  construction: both solve passes are the same model class, so a key that is wrong in a way a
  competent solver would replicate is invisible to this method.

---

## 6. Coverage

| | Count |
|---|---|
| Served practice items, both surfaces, own key accepted | **2,265 x 2** |
| Independently derived answers frozen as a fixture | **654** over 327 templates |
| Key-derived wrong answers submitted by the standing census | **9,000+** (13,614 in the measurement run) |
| Same-value-wrong-shape mutations, over 10 simplification rules | **400+** |
| Answer types covered | **9 of 9** |
| Simplification rules with a form-violation floor | **10 of 10** |
| Comparator defects closed, each with a witnessed red | **6** (P0, F1-F4, plus three comparator hardenings) |
| False positives found by mechanical key mutation | **0** |
| Wrong answer keys found in the bank | **0** |
