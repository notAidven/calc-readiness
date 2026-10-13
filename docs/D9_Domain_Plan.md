# D9 (Trigonometry) domain plan

Phase 1 of `.cursor/skills/author/SKILL.md`, written before any JSON so the domain-level
constraints (R6 vocabulary, R11 interaction variety, R2 scenario budget) are decided once
rather than negotiated nine times. This file is also the brief each parallel author works
from, so the shared-file wiring can be done centrally without collisions. Modelled on
`docs/D8_Domain_Plan.md` and `docs/D10_Domain_Plan.md`, which are the same document for the
previous two domains.

Authoring owner: Anthony (`docs/Content_Authoring_Split.md` §11 — Anthony owns all 44
remaining nodes as of 2026-07-31).

**Nine nodes is more than any previous domain pass here**, and the whole point of this file
is that nine subagents can work in parallel without reading each other's output. Every
identifier below is FIXED: the 36 widget ids and component names, the 45 `template_id`s, the
nine worked-solution module names, the nine CFU generator ids. A name invented at authoring
time instead of read from here is a merge conflict or a missing import at Stage C.

## Scope: nine nodes

| Node | Skill | Lesson shell | Prereqs |
|---|---|---|---|
| TRG.1 | Angle measure: degrees and radians, coterminal angles | L17 | NUM.4 |
| TRG.2 | Right-triangle trigonometry; 30/45/60; cofunctions | L18 | RAD.1, NUM.5 |
| TRG.3 | Unit circle; reference angles for sine and cosine | L18 | — |
| TRG.4 | The six functions; even and odd; fundamental identities | L19 | TRG.3 |
| TRG.5 | Graph sine and cosine: amplitude, period, phase shift | L24 | TRG.3, FUN.9 |
| TRG.6 | Graph tangent and the reciprocal functions; period and asymptotes | L30 | TRG.4, TRG.5 |
| TRG.7 | Inverse trigonometric functions: evaluate and compose | L40 | TRG.4, FUN.8 |
| TRG.8 | Solve basic trigonometric equations over an interval | L31 | item-family, see below |
| TRG.9 | Core identities: sum, difference and double-angle | L42 | TRG.4 |

All nine are `product_scope: "target"`, `status: "active_post_mvp"`, `domain: "D9"` in
`packages/skill-graph/src/skill_graph.json`. **No registry edit is needed or permitted**,
which is the lesson-planner agent's hard scope guard.

Reading order is the numeric order TRG.1 through TRG.9, which is already a valid topological
order: TRG.3 has no prereqs, TRG.4 needs TRG.3, TRG.5 needs TRG.3, TRG.6 needs TRG.4 and
TRG.5, and TRG.7 and TRG.9 both need TRG.4. `NODE_ORDER` in `apps/web/src/lessons/d9.ts` is
therefore `["TRG.1", ..., "TRG.9"]` and display order and prereq order do not diverge.

**TRG.5's graph prereq FUN.9 is unauthored.** That is a fact about the graph, not a build
blocker: `lessonDomains.reachability.test.ts` checks that a registered pack can build a
gradable five-slot practice set from its own domain's pool, and says nothing about a
prereq's lesson existing. Record it in the PR body rather than waiting on it.

**TRG.8 is `item_family: true` with empty `prereqs`**, so its real prerequisites are its
three families in the registry: `unit_circle` (TRG.4), `linear_form` (TRG.4, LIN.1) and
`quadratic_in_form` (TRG.4, POL.3). Its `in_authoring_scope` is `false` and `mvp_family` is
null, so the family split below is a design record rather than a hard edge. The five
practice shapes are assigned to families explicitly in TRG.8's section.

**TRG.1 and TRG.2 already have frozen product items** in
`packages/item-bank/src/product/nodes/TRG.1` and `.../TRG.2`. Those are the spine's items,
authored and validated by Gabe. **Do not touch them and do not re-pin their content hashes.**
The D9 practice pool is a separate pool on a separate seed block, and `d9.test.ts` asserts
that the two do not collide on id or hash.

## Era theming: era 10, Cyberpunk, and not the buildings

`docs/superpowers/specs/eras/era-10-cyberpunk/style-guide.md` §"Lesson framings" carries two
to three approved framings for every one of the nine nodes and is the authority. Authors use
them rather than inventing. The era's context palette, from that section: the **dish yard**
and its steerable dishes, the **mast** with its drum antennas at two levels, the **animated
display** whose count moves, the **retrofit** of new bolted onto old, the **lit deck** over
the older ground, and the **broadcast hall** with its control gallery.

Three hard boundaries, all from that guide:

- **The framing comes from the era's WORLD, not the node's BUILDING** (D-ERA8). The comms
  tower hosts TRG.4; a mast is not a picture of an identity. No lesson in this domain is
  framed as "the building where you learn X".
- **Never frame a trig lesson as a waveform on a monitor.** The guide calls this out by name
  as the failure that collapses nine distinct nodes into one picture and teaches the graph
  instead of the idea. Use the physical thing — the sweep, the mast, the guy wire, the deck —
  and let a display be where a result is *read*, never where the mathematics lives. **This
  binds TRG.5 and TRG.6 hardest**, because they are the two graphing nodes and the monitor is
  the obvious wrong reach. Their framings below are a lagging link and a dish tracking to the
  horizon, both physical.
- **This era's absence paragraph looks BACKWARDS.** The boundary is not a list of things not
  yet invented but a list of things that have left: no brick or timber in a wall, no visible
  hand-work, no open working floor. A word problem set in a workshop with the doors open is
  several eras out of date.

## Spike findings that constrain authoring

Measured against the real checkers before any template was written, in three rounds. Every
row below is a graded submission, not a reading of `docs/Answer_Equivalence_Spec.md`. Rounds
1 and 2 ran `createProductAnswerChecker` (the practice path, checker version 2); round 3 ran
`createD1AnswerChecker` through the exact `cfuChecker.ts` construction (the CFU path, checker
version 1), because the two are different code and D9 is the first domain where the
difference decides a question.

`docs/Content_Authoring_Split.md` §4.4 records residual checker gates on **TRG.4**, **TRG.8**
and **TRG.9** (general trig-identity equivalence) and conditionally on **TRG.7** (gated only
if items are authored in solved/identity form). The spike establishes what those four nodes
can be graded on. Its short answer: the gate is real and total for anything symbolic, and
completely absent for anything evaluated.

### What grades, and what the alternate spellings are

**Exact radian multiples of pi grade, through `exactRadianAnswer`.** Key `5pi/6`:

| Submission | Result |
|---|---|
| `5pi/6` | `correct/match` |
| `5*pi/6` | `correct/match` |
| `(5/6)pi` | `correct/match` |
| `5/6 pi` | `correct/match` |
| `8pi/6` (against key `4pi/3`) | `correct/match` |
| `2.618` | `incorrect/wrong_representation` |
| `pi/6` | `incorrect/value_mismatch` |
| `150` | `incorrect/value_mismatch` |

Four things follow. **A pi answer does not have to be in lowest terms** (`14pi/12` grades
against key `7pi/6`), so no prompt may ask for it "reduced" and no hint may claim reduction
is required. **A decimal coefficient on pi is rejected**: `0.5pi` and `1.5pi` both grade
`wrong_representation`, while `(1/2)pi`, `(3/2)pi` and `3/2pi` all grade `correct/match`. So
prompts ask for a fraction times pi, never a decimal times pi. **A sign error has its own
code** (`pi/3` against key `-pi/3` is `sign_error`), which is what makes a signed-angle item
worth asking. And **the decimal is refused rather than approximated**, so an exact-radian
prompt must not invite rounding.

**Exact special-angle values with radicals grade, through `exactTrigValueAnswer`,** and the
simplification check genuinely bites. Key `sqrt(3)/2`:

| Submission | Result |
|---|---|
| `sqrt(3)/2` | `correct/match` |
| `(sqrt(3))/2` | `correct/match` |
| `sqrt3/2` | `invalid_input/unknown_symbol` |
| `3^(1/2)/2` | `invalid_input/unsupported_exponent` |
| `0.866`, `0.8660254037844386` | `incorrect/wrong_representation` |
| `-sqrt(3)/2` | `incorrect/sign_error` |
| `1/2` | `incorrect/value_mismatch` |

`sqrt` needs its parentheses, and `^(1/2)` is not a spelling of a root. **A radical
denominator is rejected `not_simplified`**: against key `sqrt(2)/2` the answer `1/sqrt(2)` is
a form miss, and against `2sqrt(3)/3` so is `2/sqrt(3)`. That is exactly the rationalization
TRG.2 and TRG.6 teach, so the checker is enforcing the teaching rather than merely the value,
and the prompt must state that it wants the rationalized form. A plain fraction key does NOT
have to be in lowest terms (`-2/4` grades against `-1/2`, `-8/6` against `-4/3`), so no
fraction-valued trig item may hinge on reduction.

Sum-formula values grade in the same category: key `(sqrt(6)-sqrt(2))/4` accepts itself and
also `sqrt(6)/4 - sqrt(2)/4`, and rejects `0.2588` as `wrong_representation`. **That is what
makes TRG.9 authorable at all.**

**Solution-set rosters grade ONLY in degrees.** This is the finding that reshaped the domain:

| Key | Submission | Result |
|---|---|---|
| `{pi/6, 5pi/6}` (`solutionSetAnswer`) | `{pi/6, 5pi/6}` | `invalid_input/unknown_symbol` |
| `{pi/6, 5pi/6}` (`exactSolutionSetAnswer`) | `{pi/6, 5pi/6}` | `invalid_input/unknown_symbol` |
| `{pi/6, 5pi/6}` + `allowed_symbols: ["pi"]`, both builders | `{pi/6, 5pi/6}` | `invalid_input/unknown_symbol` |
| `{30, 150}` | `{30, 150}` | `correct/match` |
| `{30, 150}` | `{150, 30}` | `correct/match` |
| `{30, 150}` | `30, 150` (no braces) | `correct/match` |
| `{30, 150}` | `{30}` | `incorrect/incomplete_solution_set` |
| `{30, 150}` | `{30, 150, 210}` | `incorrect/extra_solution` |
| `{30, 150}` | `{30, 210}` | `incorrect/value_mismatch` |

**A roster cannot hold pi under any builder or any `allowed_symbols` setting**, and the
failure is at the KEY as much as at the submission: `{0.5236, 2.618}` against a plain
`solutionSetAnswer` pi key returns `scoring_error/invalid_answer_key`, which is the checker
saying the item is unauthorable rather than the learner being wrong. The `exact` variant
widens the member grammar to `ln(2)` and `sqrt(3)` for EL.6, and `pi` is not in it.

The degree path, by contrast, is complete and its three failure modes are separately named,
which is worth more to a solve-over-an-interval node than the notation is. Braces are
optional, order is free, four-member rosters work (`{30, 150, 210, 330}`), negative and zero
members work (`{-45, 45}`, `{0, 180}`), non-integer members work (`{22.5, 157.5}`), and the
empty set accepts `{}`, `no solution` and `none`. Non-special decimal members work but have
no tolerance (`{36.9, 143.1}` is `value_mismatch` against `{36.87, 143.13}`), so every D9
roster lands on exact special angles.

**Interval answers grade only in degrees too, for the same reason.**
`intervalAnswer("[-pi/2, pi/2]")` is `invalid_input/parse_error` on the key itself, with or
without `allowed_symbols: ["pi"]`, and so is `[0, pi]`. In degrees everything works: `[-90,
90]` accepts itself and `[-90,90]`, rejects `(-90, 90)` as `wrong_bound_inclusivity` and
`[-90, 180]` as `value_mismatch`; unions parse in either order when whitespace-delimited
(`[-90, 0) U (0, 90]`); `(-inf, inf)` and `(-infinity, infinity)` both grade.
`setBuilderAnswer("{x | -90 <= x <= 90}")` also grades and rejects the interval spelling as
`wrong_notation`.

**Degree answers needing rounding grade, and precision is a FLOOR rather than a format.**
`precisionAnswer("36.87", 2 dp)` accepts `36.87`, `36.8699` and `36.86989765`; it rejects the
under-rounded `36.9` and the mis-rounded `36.88` as `value_mismatch`, and `36.87 degrees` as
`wrong_representation`. A learner who carries more digits is not punished; one who rounds too
early is. So the prompt states the rounding, and parameters must avoid values sitting near a
rounding boundary.

**Every multiple-choice key must be lower case, and a capital in a key makes the item
unwinnable.** The checker compares a choose-one answer with a bare `===`, which is what the
first draft of this section recorded, but that is only half the path. `normalizeTextSubmission`
in `apps/web/src/lessons/answerFormat.ts` lower-cases and space-collapses every
`multiple_choice` submission, and it is the only route to the grader from all three surfaces
that serve practice (`LessonPractice.tsx`, `InfiniteDrill.tsx`, `EraAdvanceCeremony.tsx`). So
a key of `B` or `Pythagorean` cannot be matched by anything a learner types, while `odd `
and `Odd` both reach a key of `odd` fine. Proper nouns are not an exception. Each option
label is still presented as a selectable option rather than a free-text field, and is
byte-identical to the lower-case key it produces.

Nothing in the item bank catches a violation, because `validateTemplates` submits the
canonical key directly and never crosses the fold — a dead item validates clean. This matters
more in D9 than elsewhere because three nodes lean on multiple choice as the substitute for an
ungradable symbolic shape.

**Plain numerics behave as everywhere else.** `210` accepts `210.0`; `210 degrees` is
`invalid_input/unknown_symbol`, so **no prompt invites a unit or a degree sign in the typed
answer**. Fractions and decimals are interchangeable in a plain `numericAnswer` (`24/25`,
`0.96` and `48/50` all grade against key `24/25`), but NOT under `exactTrigValueAnswer`,
where `2.6` against `13/5` is `wrong_representation`. Pick the builder by whether the item
wants the exact form.

### Three shapes that had to be designed out

**1. An ordered pair cannot hold a radical or a pi, so TRG.3's unit-circle coordinates are a
multipart answer instead.** `pointAnswer("(sqrt(2)/2, sqrt(2)/2)")` and
`pointAnswer("(pi/2, 1)")` are `invalid_input/parse_error` on the key. `pointAnswer` is fine
for integers, fractions and decimals (`(0, 1)`, `(-1/2, 0)` and `(0.5, 0.87)` all grade, and
a swap is reported as `coordinates_swapped`), which covers the quadrantal headings and
nothing else. Since the whole of TRG.3 is exactly the headings whose coordinates carry
radicals, the shape is replaced by:

```
multipartAnswer([
  { part_id: "cos", answer: exactTrigValueAnswer("-1/2") },
  { part_id: "sin", answer: exactTrigValueAnswer("sqrt(3)/2") },
])
```

Measured: `{cos: "-1/2", sin: "sqrt(3)/2"}` grades `correct/match`; a decimal in one part
returns `incorrect/sin:wrong_representation`; a sign slip in the other returns
`incorrect/cos:sign_error`; a missing part returns `invalid_input/sin:wrong_input_type`. The
per-part reason code is a real gain over an ordered pair, which reports one code for two
coordinates.

**The stated cost is wrong, and it is worse than stated: there is no multi-field answer input
in this tree at all.** This section cited `docs/D10_Domain_Plan.md` for multipart being "a
multi-field answer input with its own keypad and placeholder behaviour" and had D9 accept that
cost. Measured instead: `apps/web/src` contains **zero** occurrences of `multipart` or
`part_id`, so no such input exists. `compareMultipart` requires `rawAnswer` to be a non-array
object keyed by `part_id`, and both practice surfaces submit a string, so every submission to
a multipart practice item returns `invalid_input/invalid_multipart_answer`. The item cannot be
answered at all, correctly or otherwise.

The existing multipart item does not contradict this. `product/nodes/TRG.2` is graded by the
assessment path and never reaches `MathAnswerColumn`, which is exactly why the shape looked
available.

**So the two practice templates that took this shape must be reshaped to a single answer at
Stage C**, because building the input is a feature and not a draft's work:

- `d9.trg3.coordinates.l3` asks for ONE named coordinate at the heading, varying `cos` or
  `sin` by param, keyed `exactTrigValueAnswer`.
- `d9.trg5.features.l3` asks for ONE named feature, varying amplitude, period or midline by
  param, keyed `numericAnswer` or `exactRadianAnswer` to match.

Both lose the per-part reason code, which is the price of being answerable. Whoever reshapes
them must move the prompt, hints, worked solution and worked-solution visual together, since
all four currently speak about two or three answers.

**2. No symbolic identity shape grades, anywhere, at all.** This is the residual gate,
measured rather than inferred, and it is total:

| Key | Submission | Result |
|---|---|---|
| `cos(x)` | `cos(x)` (the key itself) | `invalid_input/unsupported_syntax` |
| `2*sin(x)*cos(x)` | `sin(2*x)` | `invalid_input/unsupported_syntax` |
| `sin(x)^2` | `1 - cos(x)^2` | `invalid_input/unsupported_syntax` |
| `tan(x)` | `sin(x)/cos(x)` | `invalid_input/unsupported_symbolic_denominator` |
| `1` | `sin(x)^2 + cos(x)^2` | `invalid_input/unsupported_syntax` |
| `cos(2*t)` | `2*cos(t)^2 - 1` | `invalid_input/unsupported_syntax` |
| `2*sin(x) + 1` | `2*sin(x) + 1` (the key itself) | `invalid_input/unsupported_syntax` |

The expression grammar has no trigonometric functions in it. **A key containing `sin`, `cos`
or `tan` does not grade against itself**, so this is not a strictness that a learner could
work around by typing more carefully; the item is simply unauthorable. Nothing in D9 may ask
for an expression containing a trigonometric function — not "simplify this to a single
function", not "write the equation of this graph", not "verify this identity", not "give the
right-hand side after the shift".

**Every one of those questions is replaced by an evaluation shape**, exactly as D8 did for
change of base:

| Node | The symbolic shape that is out | What replaces it |
|---|---|---|
| TRG.4 | "rewrite `tan x` using sine and cosine" | given sine and cosine, **evaluate** the tangent — `exactTrigValueAnswer` |
| TRG.4 | "verify `sin^2 + cos^2 = 1`" | given one function and the quadrant, **solve for** the other — `exactTrigValueAnswer` |
| TRG.4 | "which identity is this" as an expression | the identity's **name** as a choice — `multipleChoiceAnswer` |
| TRG.5 | "write the equation of this trace" | its amplitude, period and midline as **numbers** — `numericAnswer` / `exactRadianAnswer` / `multipartAnswer` |
| TRG.7 | "simplify `sin(arcsin x)`" | **evaluate** a composition at a special angle — `numericAnswer` |
| TRG.9 | "expand `cos(A + B)`" | **evaluate** `cos 75` exactly — `exactTrigValueAnswer` |
| TRG.9 | "reduce `2 sin t cos t` to one function" | **name** the formula that does it — `multipleChoiceAnswer` |

**So TRG.4 and TRG.9 are fully authorable and neither is blocked**, on the strict condition
that all ten of their slots are evaluation or naming. TRG.7 is un-gated on the same terms:
`docs/Content_Authoring_Split.md` gates it "only if items are authored in solved/identity
form", and none of its five are. TRG.8's gate falls away entirely, because a solve-over-an-
interval item submits a roster of angles and never an equation.

**3. A CFU cannot hold a radical, but it CAN hold a radian.** The CFU path is the D1 checker
and its `check` field accepts `answer_type` of `numeric` or `expression` only
(`content/lessons/d1/README.md`), with `allowed_symbols` passed through for `expression` and
not for `numeric` (`apps/web/src/lessons/cfuChecker.ts`). Measured on that construction:

| `check` | Submission | Result |
|---|---|---|
| numeric, key `5pi/6` | `5pi/6` | `invalid_input/unknown_symbol` |
| numeric, key `5pi/6`, `representation: "exact"` | `5pi/6` | `invalid_input/unknown_symbol` |
| **expression, key `5pi/6`, `allowed_symbols: ["pi"]`** | `5pi/6` | **`correct/match`** |
| expression, key `5pi/6`, `allowed_symbols: ["pi"]` | `5*pi/6`, `(5/6)pi`, `10pi/12` | `correct/match` |
| expression, key `5pi/6`, `allowed_symbols: ["pi"]` | `2.618` | `incorrect/value_mismatch` |
| numeric or expression, key `sqrt(3)/2` | `sqrt(3)/2` | `invalid_input/unsupported_syntax` |
| expression, key `2*sin(x)`, `allowed_symbols: ["x"]` | `2*sin(x)` | `invalid_input/unsupported_syntax` |
| numeric, key `-3/5` | `-3/5`, `-0.6` | `correct/match` |
| numeric, key `36.87` | `36.8699` | `incorrect/value_mismatch` |

Three rules for the nine CFUs, all of which the table below obeys. **A radian CFU is
authored as `expression` with `allowed_symbols: ["pi"]`**, which is the only spelling that
binds pi on this path. **No CFU answer may be a radical**, so an exact-value combining
question is re-asked as a rational-valued one. **The D1 checker has no precision floor** —
`36.8699` is a wrong answer against `36.87`, where the practice path would accept it — so no
CFU asks for a rounded decimal.

## Interaction-kind budget (R11)

`validate-lesson-pack.mjs` derives a widget's kind from its id suffix, errors below
`MIN_DOMAIN_KINDS = 5` distinct kinds per domain, errors when one kind reaches
`MAX_DOMAIN_KIND_SHARE = 0.6` of the domain's widgets, and warns below `MIN_LESSON_KINDS = 3`
per lesson. Thirty-six widgets, four per node, **eleven distinct kinds, top share 7 of 36
(19.4%), four distinct kinds in every lesson.**

**Thirty-six bespoke widgets is the single largest risk to this domain landing, so
thirty-one of the thirty-six are a shared kind from `apps/web/src/lessons/interactive/kinds/`
and only five are bespoke.** R11's variety requirement is satisfied by interaction KIND,
which the shared kinds supply; a wrapper around `FillTable` scores exactly as `table` as a
hand-built one does. The five bespoke widgets are the ones whose teaching genuinely needs a
circle or a moving trace, and each has a named shared-kind fallback if its author overruns.

| Node | Slide 0 | Slide 1 | Slide 2 | Slide 3 |
|---|---|---|---|---|
| TRG.1 | `trg-bearing-table` | `trg-radian-match` | `trg-coterminal-sorter` | `trg-convert-spot` |
| TRG.2 | `trg-guywire-label` | `trg-ratio-table` | `trg-special-match` | `trg-cofunction-spot` |
| TRG.3 | `trg-unitcircle-explore` | `trg-quadrant-sorter` | `trg-reference-table` | `trg-reference-order` |
| TRG.4 | `trg-six-table` | `trg-reciprocal-match` | `trg-evenodd-sorter` | `trg-identity-spot` |
| TRG.5 | `trg-amplitude-slider` | `trg-period-table` | `trg-phase-drag` | `trg-feature-label` |
| TRG.6 | `trg-tangent-explore` | `trg-asymptote-table` | `trg-secant-sorter` | `trg-cycle-match` |
| TRG.7 | `trg-inverse-order` | `trg-range-label` | `trg-compose-sorter` | `trg-inverse-estimate` |
| TRG.8 | `trg-sweep-play` | `trg-solve-order` | `trg-roster-spot` | `trg-window-sorter` |
| TRG.9 | `trg-combine-estimate` | `trg-sum-table` | `trg-double-match` | `trg-shorten-order` |

**Kind census: table 7, sorter 6, match 5, order 4, spot 4, label 3, estimate 2, explore 2,
slider 1, drag 1, play 1.** Eleven kinds against a floor of five; the top kind is 19.4%
against a ceiling of 60%; every lesson uses four distinct kinds against a floor of three.

### The 36 widgets: component name, file path, shared or bespoke

Components are `Trig*` under `apps/web/src/lessons/interactive/`, mirroring D8's `Exp*` /
`Log*` and D10's `Geo*`. Every placement is `"gates": true`, one per `mini_lesson` index.
Each widget also owns its `*.browser.test.tsx` beside it.

| Widget id | Component / file | Kind | Shared kind used | What the learner does |
|---|---|---|---|---|
| `trg-bearing-table` | `TrigBearingTable.tsx` | table | `FillTable` | fill the same heading's measure in degrees and in radians |
| `trg-radian-match` | `TrigRadianMatch.tsx` | match | `MatchPairs` | pair degree measures with their radian measures |
| `trg-coterminal-sorter` | `TrigCoterminalSorter.tsx` | sorter | `BinaryRowSort` | sort headings into coterminal with the given one, or not |
| `trg-convert-spot` | `TrigConvertSpot.tsx` | spot | `SpotTheError` | find the line that used the conversion factor upside down |
| `trg-guywire-label` | `TrigGuyWireLabel.tsx` | label | `LabelParts` | label opposite, adjacent and hypotenuse for a marked angle |
| `trg-ratio-table` | `TrigRatioTable.tsx` | table | `FillTable` | fill sine, cosine and tangent for one triangle |
| `trg-special-match` | `TrigSpecialMatch.tsx` | match | `MatchPairs` | pair 30, 45 and 60 with their exact sine and cosine |
| `trg-cofunction-spot` | `TrigCofunctionSpot.tsx` | spot | `SpotTheError` | find the line that pairs a function with the wrong complement |
| `trg-unitcircle-explore` | `TrigUnitCircleExplore.tsx` | explore | **bespoke** | drag an antenna round its pad and read its horizontal reach and its vertical reach *(Amended 2026-08-03: this read "how far along and how far across". Neither word named a direction, so which of the two was the horizontal one had to be guessed, and the widget contradicted itself, asking for "as far across the pad as it can go" on one board and "as far below the center" for the same axis on the other. Each reach is now named for the axis it is measured from, which is the vocabulary the sibling boards on the same three slides already used.)* |
| `trg-quadrant-sorter` | `TrigQuadrantSorter.tsx` | sorter | `BinaryRowSort` | sort headings by whether the named function is positive there |
| `trg-reference-table` | `TrigReferenceTable.tsx` | table | `FillTable` | fill heading, quadrant and reference angle |
| `trg-reference-order` | `TrigReferenceOrder.tsx` | order | `OrderSteps` | order the four steps of taking an exact value at a non-acute heading |
| `trg-six-table` | `TrigSixTable.tsx` | table | `FillTable` | fill all six functions at one heading, from sine and cosine |
| `trg-reciprocal-match` | `TrigReciprocalMatch.tsx` | match | `MatchPairs` | pair each function with its reciprocal |
| `trg-evenodd-sorter` | `TrigEvenOddSorter.tsx` | sorter | `BinaryRowSort` | sort the six functions into even and odd |
| `trg-identity-spot` | `TrigIdentitySpot.tsx` | spot | `SpotTheError` | find the meter check that misapplied the Pythagorean identity |
| `trg-amplitude-slider` | `TrigAmplitudeSlider.tsx` | slider | **bespoke** | tune strength and midline and watch the trace respond |
| `trg-period-table` | `TrigPeriodTable.tsx` | table | `FillTable` | fill the coefficient, the period, and the five key headings |
| `trg-phase-drag` | `TrigPhaseDrag.tsx` | drag | **bespoke** | drag the second link's trace onto the first and read the lag |
| `trg-feature-label` | `TrigFeatureLabel.tsx` | label | `LabelParts` | label amplitude, period and midline on a drawn trace |
| `trg-tangent-explore` | `TrigTangentExplore.tsx` | explore | **bespoke** | track a dish toward the horizon and watch the correction run away |
| `trg-asymptote-table` | `TrigAsymptoteTable.tsx` | table | `FillTable` | fill heading, cosine value, and whether tangent has a value |
| `trg-secant-sorter` | `TrigSecantSorter.tsx` | sorter | `BinaryRowSort` | sort headings by whether secant is defined there |
| `trg-cycle-match` | `TrigCycleMatch.tsx` | match | `MatchPairs` | pair each function with its period |
| `trg-inverse-order` | `TrigInverseOrder.tsx` | order | `OrderSteps` | order the steps of recovering a bearing from a meter reading |
| `trg-range-label` | `TrigRangeLabel.tsx` | label | `LabelParts` | label the restricted range each inverse function returns |
| `trg-compose-sorter` | `TrigComposeSorter.tsx` | sorter | `BinaryRowSort` | sort compositions by whether they hand back the input |
| `trg-inverse-estimate` | `TrigInverseEstimate.tsx` | estimate | `EstimateThenCheck` | estimate a bearing from two offsets, then compute it |
| `trg-sweep-play` | `TrigSweepPlay.tsx` | play | **bespoke** | run one full sweep and mark every heading at the given strength |
| `trg-solve-order` | `TrigSolveOrder.tsx` | order | `OrderSteps` | order reference angle, second quadrant, then the roster |
| `trg-roster-spot` | `TrigRosterSpot.tsx` | spot | `SpotTheError` | find the solution that stopped after one answer |
| `trg-window-sorter` | `TrigWindowSorter.tsx` | sorter | `BinaryRowSort` | sort candidate headings by whether they fall inside the stated window |
| `trg-combine-estimate` | `TrigCombineEstimate.tsx` | estimate | `EstimateThenCheck` | predict whether two rotations add, then check against the real value |
| `trg-sum-table` | `TrigSumTable.tsx` | table | `FillTable` | split 75 into 45 and 30 and fill the formula's four slots |
| `trg-double-match` | `TrigDoubleMatch.tsx` | match | `MatchPairs` | pair each double-angle form with what it equals |
| `trg-shorten-order` | `TrigShortenOrder.tsx` | order | `OrderSteps` | order the steps that shorten a control expression |

**Fallbacks for the five bespoke widgets, if an author overruns.** Each substitute keeps the
node at four distinct kinds and keeps the domain above the five-kind floor:
`trg-unitcircle-explore` becomes a `MatchPairs` heading-to-coordinates widget renamed
`trg-unitcircle-match`; `trg-amplitude-slider` becomes a `FillTable` renamed
`trg-amplitude-table`; `trg-phase-drag` becomes a `MatchPairs` renamed `trg-phase-match`;
`trg-tangent-explore` becomes an `EstimateThenCheck` renamed `trg-tangent-estimate`;
`trg-sweep-play` becomes an `EstimateThenCheck` renamed `trg-sweep-estimate`. **An author who
takes a fallback must say so in its return**, because the coordinator's `visuals.tsx` entry
and the lesson JSON's visual id both have to move together.

### Standing widget requirements, repeated in every brief

- Every widget calls `useWidgetSuccess` (`widgetSuccessCoverage.test.ts` sweeps the tree for
  it) and offers a `WidgetReveal` carrying a `why` (R12).
- **Any widget holding more than one answer at a time passes `othersRemain`.** This is the
  defect that reached eighteen boards (`.cursor/rules/qa-verification.mdc`, `#219`): a reveal
  that destroys the answers a learner has not yet given. In this table that is at minimum
  every `-table`, `-match`, `-sorter`, `-order` and `-label` widget, which is thirty-one of
  the thirty-six, plus `trg-sweep-play`, which holds several headings at once.
- All learner-visible math is KaTeX (`.cursor/skills/lesson-katex/SKILL.md`); no em dashes;
  American English.
- No dropdowns (`.cursor/skills/interactive-visuals/SKILL.md`).

## Vocabulary (R6): term, and the slide that bolds it

Every term is bolded on first use in the named slide. No coined vocabulary (R23): all of
these are standard. R32 applies to **period**, **amplitude**, **argument** and **identity**,
which are ordinary English words carrying precise meanings here, so each is earned on its
slide before any item uses it.

- **standard position**, **initial side**, **terminal side**: TRG.1 slide 0
- **radian**: TRG.1 slide 1
- **coterminal**: TRG.1 slide 2
- **opposite**, **adjacent**, **hypotenuse**: TRG.2 slide 0
- **sine**, **cosine**, **tangent**: TRG.2 slide 1
- **special angle**: TRG.2 slide 2
- **cofunction**, **complementary**: TRG.2 slide 3
- **unit circle**: TRG.3 slide 0
- **quadrant**: TRG.3 slide 1
- **reference angle**: TRG.3 slide 2
- **secant**, **cosecant**, **cotangent**: TRG.4 slide 0
- **reciprocal identity**: TRG.4 slide 1
- **even function**, **odd function**: TRG.4 slide 2
- **Pythagorean identity**, **quotient identity**: TRG.4 slide 3
- **periodic**, **amplitude**: TRG.5 slide 0
- **period**, **midline**: TRG.5 slide 1
- **phase shift**: TRG.5 slide 2
- **vertical asymptote**: TRG.6 slide 0
- **undefined**: TRG.6 slide 1
- **restricted range**, **principal value**: TRG.7 slide 1
- **inverse function**: TRG.7 slide 0 (FUN.8 is a prereq; bolded on first use anyway, since
  `base` in D8 is the term the D2 review caught being used undefined)
- **solution over an interval**: TRG.8 slide 0
- **general solution**: TRG.8 slide 3
- **sum formula**, **difference formula**: TRG.9 slide 1
- **double-angle formula**: TRG.9 slide 2

**vertical asymptote** is also defined in D8 EL.4. It is bolded again here rather than
assumed, because D8 is not a prereq of any D9 node and a learner can reach TRG.6 without
having seen it.

## Scenario budget (R2), one per node, on slide 0 only

Each is the style guide's own framing for that node, taken verbatim in substance. Every later
slide is marked **no scenario**: the mathematics carries slides 1 to 3, with the era's props
appearing as the objects being measured rather than as new stories.

- **TRG.1**: aiming a dish by bearing, given in degrees on the pad and in radians by the
  controller. The same heading in two units, which is the conversion in its natural home.
- **TRG.2**: a guy wire running from a mast to its anchor pad. The height, the ground
  distance and the wire are a right triangle, and any two of them give the third.
- **TRG.3**: a rotating antenna's position, given as its horizontal reach from the vertical
  axis and its vertical reach from the horizontal axis. *(Amended 2026-08-03: this read "how
  far along and how far across from the centre of its pad", which is the wording the node
  shipped with at `b44b953a` and which #456 moved into the top task slot. The antenna, the pad
  and the headings all stay; what went is using "along" and "across" as if they named a
  direction. The rewrite reached `TRG.3.json`, `TrigUnitCircleExplore.tsx`, the TRG.3 CFU
  worked solution, and the `quadrant-sign.l2` and `coordinates.l3` practice templates, whose
  copies of the phrase are interpolated and so were invisible to a grep.
  `docs/superpowers/specs/eras/era-10-cyberpunk/style-guide.md` still carries the old wording
  and is deliberately untouched: it is the design lane's record of the brief the metaphor came
  from.)*
- **TRG.4**: two instruments reading the same signal differently and always agreeing once
  converted, which is what an identity is.
- **TRG.5**: a signal's strength, its repeat interval and how far it lags. The three numbers
  an engineer actually names, which are exactly amplitude, period and phase.
- **TRG.6**: a dish tracking toward the horizon, where the correction needed grows without
  limit as the angle approaches the flat. The asymptote as a physical impossibility rather
  than a feature of a curve.
- **TRG.7**: working the bearing back out of a measurement. The meter reads a ratio and the
  engineer needs the heading.
- **TRG.8**: all headings in one full sweep at which a signal hits a given strength. The
  interval is one revolution and there is usually more than one answer, which is the whole
  lesson.
- **TRG.9**: simplifying a control expression so a slower processor can run it, which is this
  era's own reason for caring about a shorter form.

## Per-node practice shapes (5 slots: 1xL1 / 2xL2 / 2xL3)

Forty-five templates. Every shape sits inside a category the spike graded end to end. **No
item asks for an expression containing a trigonometric function, no roster or interval is
written in radians, and no prompt invites a unit or a degree sign in the typed answer.**

Each template carries 1 to 3 progressive hints that name the rule without substituting (R13),
an ordered `worked_solution`, and a `WORKED_SOLUTION_VISUALS` entry keyed by `template_id`.
See `.cursor/skills/practice-hints/SKILL.md` and `.cursor/skills/worked-solution-svg/SKILL.md`.

### The hardest tier is never a choice off a printed list

Two of the eighteen L3 slots were choose-one items — `d9.trg4.identity-name`, three printed
family names, and `d9.trg9.formula-name`, three printed formula names — and both now sit at
L2. The reasoning that put them at the top was about content and it holds: naming the
relation you have just used is a different thing from running it, and on those two nodes no
other slot separates a learner who has the procedure from one who has the idea. What it does
not speak to is cost. A choose-one over three options is scored a third of the time by a
learner who reads nothing, and the hardest slot on a node is the one place that floor cannot
be afforded, whatever the item is testing. `d9.test.ts` records the same fact from the other
side and had already had to name it as an exception: `THIN_ANSWER_CELLS` measures the TRG.9
naming shape at three distinct answers across its entire retry chain, against a budget of
six, because a choose-one has as many answers as it has options.

Each node's fifth slot went to the retirement that cost the node least:

- **`d9.trg4.evenodd-value.l2`.** One decision, taken from a list of two — is the named
  function even or odd — and on an even draw the answer is byte-identical to the reading the
  prompt states, which is the whole content of the item and also the reason every hint on the
  node is digit-free. Parity does not leave the node with it: it is one of the five rules
  `compound-evaluate.l3` chains, so it is still tested, now inside an item that cannot be
  answered by knowing it alone.
- **`d9.trg9.difference-exact.l2`.** It and `sum-exact.l1` are one generator with a flag
  flipped, and the tier between them is a single sign. `THIN_ANSWER_CELLS` measures it at two
  distinct answers and `THIN_CELLS` at three distinct prompts, both floors of the node rather
  than of the authoring. The difference formula stays, at L3, inside `compound-angle.l3`.

Neither replacement reopens the gate above. Both answer with an exact fraction through
`exactTrigValueAnswer`, so the rows in "Three shapes that had to be designed out" that trade a
symbolic question for a NAME still hold and the name is still asked; it is asked at L2.

**`packages/item-bank/src/d9/tierSemantics.test.ts` now enforces this**, so the next author
to reach for a choose-one L3 meets the ruling rather than rediscovering it. It derives its
population from the templates instead of from a written-down list of ids: every D9 shape at
difficulty 3, having first measured that difficulty 3 IS the hardest tier at all nine nodes,
with the answer type read off generated instances rather than off which builder a source
imports — a shape that hand-rolled the same `answer_spec` exhibits the defect without
importing a line of the helper. It fails naming any L3 shape that grades `multiple_choice`,
and it asserts the reverse direction with a floor, so a domain that had quietly stopped
serving choose-one anywhere could not pass it green.

**TRG.1** (`d9.trg1.*`)

| L | `template_id` | Shape | Answer builder |
|---|---|---|---|
| 1 | `d9.trg1.deg-to-rad.l1` | a degree measure converted to exact radians | `exactRadianAnswer` |
| 2 | `d9.trg1.rad-to-deg.l2` | a radian measure converted to degrees | `numericAnswer` |
| 2 | `d9.trg1.coterminal-degree.l2` | the smallest positive coterminal heading, in degrees | `numericAnswer` |
| 3 | `d9.trg1.coterminal-radian.l3` | the coterminal heading inside $[0, 2\pi)$, in exact radians | `exactRadianAnswer` |
| 3 | `d9.trg1.arc-length.l3` | arc length $r\theta$ for a radian $\theta$, exact multiple of pi | `exactRadianAnswer` |

`arc-length` reuses `exactRadianAnswer` for a LENGTH rather than an angle. That is correct:
the builder's job is to bind `pi` and require the exact representation, and the answer is a
`k*pi` either way. Say so in the template's comment so a later reader does not read the name
as a claim about units.

**TRG.2** (`d9.trg2.*`)

| L | `template_id` | Shape | Answer builder |
|---|---|---|---|
| 1 | `d9.trg2.ratio-from-sides.l1` | sine, cosine or tangent of a marked angle from integer sides | `exactTrigValueAnswer` |
| 2 | `d9.trg2.special-exact.l2` | the exact value at 30, 45 or 60 | `exactTrigValueAnswer` |
| 2 | `d9.trg2.missing-side.l2` | a side solved with a special-angle ratio, integer result | `numericAnswer` |
| 3 | `d9.trg2.exact-side-radical.l3` | a side that comes out a simplified radical | `radicalAnswer` |
| 3 | `d9.trg2.cofunction-angle.l3` | the complementary angle a cofunction names | `numericAnswer` |

`cofunction-angle` asks for the ANGLE, not the identity: "$\sin 25^\circ$ equals the cosine
of what angle" answers `65`. That is the only cofunction shape that grades, since the
symbolic form is in the ungradable set.

**TRG.3** (`d9.trg3.*`)

| L | `template_id` | Shape | Answer builder |
|---|---|---|---|
| 1 | `d9.trg3.reference-degree.l1` | the reference angle of a degree measure | `numericAnswer` |
| 2 | `d9.trg3.reference-radian.l2` | the reference angle of a radian measure | `exactRadianAnswer` |
| 2 | `d9.trg3.quadrant-sign.l2` | the sign of a named function at a heading | `multipleChoiceAnswer` |
| 3 | `d9.trg3.exact-value-circle.l3` | the exact sine or cosine at a non-acute special heading | `exactTrigValueAnswer` |
| 3 | `d9.trg3.coordinates.l3` | one named coordinate of the point on the unit circle at a given heading | `exactTrigValueAnswer` (was `multipartAnswer`; see the reshape ruling above) |

`quadrant-sign` options are exactly `positive`, `negative` and `zero`, lower case per the
case-folding rule above.

**TRG.4** (`d9.trg4.*`) — **every slot is evaluation or naming; see the gate above**

| L | `template_id` | Shape | Answer builder |
|---|---|---|---|
| 1 | `d9.trg4.reciprocal-value.l1` | given one function, evaluate its reciprocal | `exactTrigValueAnswer` |
| 2 | `d9.trg4.quotient-value.l2` | given sine and cosine, evaluate the tangent | `exactTrigValueAnswer` |
| 2 | `d9.trg4.identity-name.l2` | which family of identities a shown line is a statement of | `multipleChoiceAnswer` |
| 3 | `d9.trg4.pythagorean-solve.l3` | given one function and the quadrant, solve for the other | `exactTrigValueAnswer` |
| 3 | `d9.trg4.compound-evaluate.l3` | given one function and the quadrant, evaluate a two-factor product that collapses to a single function | `exactTrigValueAnswer` |

`identity-name` options are exactly `pythagorean`, `quotient` and `reciprocal`, all lower
case. An earlier revision of this plan called for a capitalized `Pythagorean`, which the
case-folding rule above makes unwinnable; the lower-case spelling is the correction and it
carries into the prompt, the key and the worked solution alike. **It is an L2 and not the
node's hardest slot**, per the tiering ruling above: it grades the one thing on this node
that is a recognition rather than a calculation, which is worth a slot and is not worth the
top one when a third of the marks are available for reading nothing. Its cut is the SHAPE of
the relation, not what would justify it, and no line keyed `reciprocal` may name the tangent
or the cotangent — both rules are held in both directions by `nodes/TRG.4/practiceShapes.test.ts`.

`compound-evaluate.l3` is what the top slot is for. It gives one function value and a
quadrant and asks for a product of two factors that collapses to a single function — given
$\cos\theta = \dfrac{5}{13}$ in Quadrant IV, $\sin(-\theta)\sec\theta$ is $\dfrac{12}{5}$,
because the product is $-\tan\theta$ — so a learner runs parity, a reciprocal, the quotient
identity and the Pythagorean identity, and then signs the result off the quadrant. Four
identities and a sign decision, none of which the node's L1 or either L2 asks for more than
one of. It is an evaluation, so the identity gate above does not touch it.

**TRG.5** (`d9.trg5.*`)

| L | `template_id` | Shape | Answer builder |
|---|---|---|---|
| 1 | `d9.trg5.amplitude.l1` | the amplitude of $a\sin(bx) + d$ | `numericAnswer` |
| 2 | `d9.trg5.period-radian.l2` | the period of $a\sin(bx)$, in exact radians | `exactRadianAnswer` |
| 2 | `d9.trg5.midline.l2` | the midline value | `numericAnswer` |
| 3 | `d9.trg5.phase-shift.l3` | the phase shift of $a\sin(b(x - c))$, in exact radians | `exactRadianAnswer` |
| 3 | `d9.trg5.features.l3` | one named feature of a given function, varying amplitude, period or midline | `numericAnswer` or `exactRadianAnswer` to match the feature (was `multipartAnswer`; see the reshape ruling above) |

**No TRG.5 item asks the learner to write the function.** That is the shape the identity gate
removes, and `features.l3` is what replaces it: the same three facts, asked as three numbers.

**TRG.6** (`d9.trg6.*`)

| L | `template_id` | Shape | Answer builder |
|---|---|---|---|
| 1 | `d9.trg6.tangent-period.l1` | the period of $a\tan(bx)$, in exact radians | `exactRadianAnswer` |
| 2 | `d9.trg6.asymptote-degree.l2` | the asymptote headings of tangent over $[0, 360)$ | `solutionSetAnswer` |
| 2 | `d9.trg6.secant-defined.l2` | whether secant has a value at a named heading | `multipleChoiceAnswer` |
| 3 | `d9.trg6.reciprocal-exact.l3` | the exact secant, cosecant or cotangent at a special heading, rationalized | `exactTrigValueAnswer` |
| 3 | `d9.trg6.asymptote-radian.l3` | the smallest positive asymptote of $\tan(bx)$, in exact radians | `exactRadianAnswer` |

Note the split, which is the spike's ruling applied: **a single asymptote is asked in
radians and a ROSTER of them in degrees**, because a roster cannot hold pi. `secant-defined`
options are exactly `defined` and `undefined`.

**TRG.7** (`d9.trg7.*`) — **no slot is in solved or identity form, so the conditional gate
does not bind**

| L | `template_id` | Shape | Answer builder |
|---|---|---|---|
| 1 | `d9.trg7.arcsin-degree.l1` | the arcsine of a special value, in degrees | `numericAnswer` |
| 2 | `d9.trg7.arccos-radian.l2` | the arccosine of a special value, in exact radians | `exactRadianAnswer` |
| 2 | `d9.trg7.range-interval.l2` | the range of an inverse function, in degrees | `intervalAnswer` |
| 3 | `d9.trg7.compose-principal.l3` | a composition where the restricted range changes the answer | `numericAnswer` |
| 3 | `d9.trg7.arctan-round.l3` | the bearing from two offsets, to 2 dp in degrees | `precisionAnswer`, 2 dp |

`range-interval` is the reason TRG.7's ranges are stated in degrees throughout the lesson:
`[-pi/2, pi/2]` is a parse error at the key. The prompt says "in degrees" and the worked
solution stays in degrees so a learner is never shown a spelling the field refuses.
`arctan-round` states its rounding, and its parameters avoid values near a rounding boundary.

**TRG.8** (`d9.trg8.*`) — **all rosters in degrees; family assignment per the registry**

| L | `template_id` | Shape | Family | Answer builder |
|---|---|---|---|---|
| 1 | `d9.trg8.sine-basic.l1` | $\sin x = k$ over $[0, 360)$, two roots | `unit_circle` | `solutionSetAnswer` |
| 2 | `d9.trg8.cosine-negative.l2` | $\cos x = -k$ over $[0, 360)$, two roots | `unit_circle` | `solutionSetAnswer` |
| 2 | `d9.trg8.tangent-basic.l2` | $\tan x = k$ over $[0, 360)$, two roots | `unit_circle` | `solutionSetAnswer` |
| 3 | `d9.trg8.linear-in-trig.l3` | one algebra step, then the roster | `linear_form` | `solutionSetAnswer` |
| 3 | `d9.trg8.quadratic-in-form.l3` | factored by substitution, three roots | `quadratic_in_form` | `solutionSetAnswer` |

Every prompt states the window as $0^\circ \le x < 360^\circ$ and asks for the headings in
degrees. The three failure codes the roster comparator separates — `incomplete_solution_set`,
`extra_solution` and `value_mismatch` — are what makes this node's items diagnostic, so the
hints are written to distinguish stopping early from picking the wrong quadrant.
`quadratic-in-form` is the family that draws on POL.3, per `_edge_overrides`.

**TRG.9** (`d9.trg9.*`) — **every slot is evaluation or naming; see the gate above**

| L | `template_id` | Shape | Answer builder |
|---|---|---|---|
| 1 | `d9.trg9.sum-exact.l1` | $\cos 75^\circ$ as $\cos(45 + 30)$, exact | `exactTrigValueAnswer` |
| 2 | `d9.trg9.double-sine.l2` | $\sin 2\theta$ from a given $\sin\theta$ and quadrant | `exactTrigValueAnswer` |
| 2 | `d9.trg9.formula-name.l2` | which formula collapses a shown expression to one function | `multipleChoiceAnswer` |
| 3 | `d9.trg9.double-cosine.l3` | $\cos 2\theta$ from one of its three forms | `exactTrigValueAnswer` |
| 3 | `d9.trg9.compound-angle.l3` | a compound angle from two functions given at two headings in two quadrants | `exactTrigValueAnswer` |

`sum-exact.l1` keys as `(sqrt(6)-sqrt(2))/4` or `(sqrt(6)+sqrt(2))/4`, both graded and both
accepting the split spelling `sqrt(6)/4 - sqrt(2)/4`; those two are the whole authorable set
of exact radical shapes on this node, since `cos 105^\circ` keys as a third form the spike
never measured. That ceiling is why the L1 kept the radical evaluation and its L2 twin did
not: `difference-exact.l2` reached the same two keys through the same generator with one flag
flipped, so the tier between them was a sign, and it is retired per the ruling above.

`formula-name` options are exactly `sum`, `difference` and `double-angle`, and its prompt
sorts on how many DISTINCT angles the expression is written over rather than on the operator,
because two of its eight shapes are the degenerate $A = B$ case of a listed sum pattern and
were defensibly answerable two ways before that cut was stated. **It is an L2**: recognising
which identity a shape belongs to is the node's one non-computational skill and worth a slot,
but the answer is one of three printed words and the hardest slot cannot be a third of a mark
for reading nothing.

`compound-angle.l3` is what took that slot. It gives two functions at two separate headings in
two separate quadrants — $\sin A = \dfrac{3}{5}$ in Quadrant II and $\cos B = \dfrac{5}{13}$
in Quadrant IV, find $\cos(A - B)$, which is $-\dfrac{56}{65}$ — so the Pythagorean identity
runs twice, two sign decisions are taken independently, and only then does the sum or
difference formula apply. The four shapes are $\sin(A + B)$, $\sin(A - B)$, $\cos(A + B)$ and
$\cos(A - B)$, so the sign pattern `difference-exact.l2` used to carry is still graded, now
downstream of work that can go wrong first. Its given values come off Pythagorean triples, so
the result is a rational fraction rather than a radical: it sidesteps the two-key radical
ceiling above entirely instead of testing its edge, which is what makes a fourth combining
shape authorable on a node that had run out of radicals.

## Worked-solution modules

One per node, owned by that node's author. File and export are both fixed here because
`workedSolutionVisuals.tsx` imports them by name at Stage C.

| Node | File | Export |
|---|---|---|
| TRG.1 | `apps/web/src/lessons/worked/d9TRG1.tsx` | `TRG1_WORKED_SOLUTIONS` |
| TRG.2 | `apps/web/src/lessons/worked/d9TRG2.tsx` | `TRG2_WORKED_SOLUTIONS` |
| TRG.3 | `apps/web/src/lessons/worked/d9TRG3.tsx` | `TRG3_WORKED_SOLUTIONS` |
| TRG.4 | `apps/web/src/lessons/worked/d9TRG4.tsx` | `TRG4_WORKED_SOLUTIONS` |
| TRG.5 | `apps/web/src/lessons/worked/d9TRG5.tsx` | `TRG5_WORKED_SOLUTIONS` |
| TRG.6 | `apps/web/src/lessons/worked/d9TRG6.tsx` | `TRG6_WORKED_SOLUTIONS` |
| TRG.7 | `apps/web/src/lessons/worked/d9TRG7.tsx` | `TRG7_WORKED_SOLUTIONS` |
| TRG.8 | `apps/web/src/lessons/worked/d9TRG8.tsx` | `TRG8_WORKED_SOLUTIONS` |
| TRG.9 | `apps/web/src/lessons/worked/d9TRG9.tsx` | `TRG9_WORKED_SOLUTIONS` |

Each is a `Record<string, WorkedSolutionVisual>` keyed by `template_id`, with one entry per
that node's five templates: 45 entries across the domain. The type and the shape are
`d10GEO1.tsx`'s.

## CFU per node (one combining question)

Every CFU is a combining question that no single practice template asks, so **each gets a
generator in `CFU_ONLY_TEMPLATES` rather than a retarget**, following D10. All nine are
`check`-gradable, which is a deliberate consequence of the CFU spike: seven are `numeric` and
two are `expression` with `allowed_symbols: ["pi"]`, and **not one is a radical or a rounded
decimal**, because the D1 checker refuses the first and has no precision floor for the second.

| Node | `cfu.variants.template_id` | The combining question | Answer | `check` |
|---|---|---|---|---|
| TRG.1 | `cfu.trg1.coterminal-radian` | a sweep stops at $405^\circ$; give the smallest positive coterminal heading in exact radians | `pi/4` | expression, `["pi"]` |
| TRG.2 | `cfu.trg2.wire-length` | a guy wire meets the ground at $60^\circ$, $20$ m out from the mast; give the wire's length | `40` | numeric |
| TRG.3 | `cfu.trg3.circle-cosine` | give the exact cosine at $240^\circ$ | `-1/2` | numeric |
| TRG.4 | `cfu.trg4.quadrant-tangent` | given $\sin\theta = -4/5$ with $\theta$ in the third quadrant, give $\tan\theta$ | `4/3` | numeric |
| TRG.5 | `cfu.trg5.max-value` | for $y = 3\sin(2x) - 1$, give the largest value the signal reaches | `2` | numeric |
| TRG.6 | `cfu.trg6.first-asymptote` | for $y = \tan(3x)$, give the smallest positive heading at which it has an asymptote, in exact radians | `pi/6` | expression, `["pi"]` |
| TRG.7 | `cfu.trg7.compose-principal` | give $\arccos(\cos 300^\circ)$ in degrees | `60` | numeric |
| TRG.8 | `cfu.trg8.larger-root` | solve $2\sin x + 1 = 0$ over $0^\circ \le x < 360^\circ$ and give the LARGER heading | `330` | numeric |
| TRG.9 | `cfu.trg9.double-from-sine` | given $\sin\theta = 3/5$ with $\theta$ in the first quadrant, give $\cos 2\theta$ | `7/25` | numeric |

Each combines at least two of its node's ideas and cannot be answered by one alone. TRG.4
needs the Pythagorean identity, the quadrant's sign and the quotient identity in that order.
TRG.5 needs amplitude and midline together, so a learner who answers `3` has read only half
the function. TRG.7's answer is `60` and not `300`, which is precisely the restricted range
biting. TRG.8 asks for the larger of two roots rather than the roster, because a
`solution_set` is not one of the two `check` types and an accepted-list CFU would need its
whole spelling list reproduced by a speller; asking for one of the two headings keeps the
work identical and the answer gradable.

**The CFU contract after #286**, enforced by `validate-lesson-pack.mjs` rules 12a and 12c and
recorded in `docs/D10_Domain_Plan.md`. Read this before authoring, not after:

- `cfu.worked_solution` is REQUIRED: ordered steps, non-empty strings, no em dash, no
  meta-commentary, and **the last step must name an accepted spelling**.
- `cfu.variants: { template_id, count }` is REQUIRED with `count >= 2`, so the CFU re-asks on
  a fresh instance instead of handing the same numbers back.
- `accepted` is still authored as a fallback alongside `check`.
- The coordinator registers all nine generators and their spellers in
  `apps/web/src/lessons/cfuVariants.ts` at Stage C, and adds nine `AUTHORED_PARAMS` entries
  in `cfuVariants.test.ts` using each pack's real authored numbers. **A speller recomputes;
  it does not read an answer back**, so a generator that drifted would disagree with its own
  speller rather than agree with itself.

## File ownership, so parallel authors do not collide

**Per-node, owned by that node's author, and nothing else:**

```
content/lessons/d9/TRG.n.json
apps/web/src/lessons/interactive/<the four Trig* names this plan assigned>.tsx
apps/web/src/lessons/interactive/<those four>.browser.test.tsx
apps/web/src/lessons/worked/d9TRGn.tsx
packages/item-bank/src/d9/nodes/TRG.n/index.ts
```

**Shared, edited centrally at Stage C and never by a node author**, because a parallel edit
to any of these is silently lost:

```
apps/web/src/lessons/d9.ts
apps/web/src/lessons/domains.ts
apps/web/src/lessons/practiceSession.ts
apps/web/src/lessons/practiceChecker.ts
apps/web/src/lessons/visuals.tsx
apps/web/src/lessons/workedSolutionVisuals.tsx
apps/web/src/lessons/cfuVariants.ts
apps/web/src/lessons/cfuVariants.test.ts
packages/item-bank/src/d9/practice.ts
packages/item-bank/src/d9/index.ts
packages/item-bank/src/index.ts
packages/item-bank/src/d9.test.ts
```

plus every count-pinned sweep: `widgetRevealReAsk`, `widgetDropSlots`, `widgetQaFixes`,
`widgetVariantPool`, `widgetSuccessCoverage`, `widgetRevealFill`, `revealReAsk`,
`answerFormat`, `radicalAnswerSubmit`, `visualsMath`. **Re-measure each, never increment by
arithmetic:** run it, read the actual number, update to it.

**Subagents must be told the tree will not compile while they work**, because
`visuals.tsx` will not know their widget ids and `d9.ts` will not exist. They must not try to
fix it.

**The seed block is `PRACTICE_SEED_BASE = 140_000` / `VARIANT_SEED_BASE = 141_000`.** Read
off the tree rather than assumed: D1 `1000`/`2000`/`5000`/`7000`/`10_000`/`20_000`,
interactive `42_000`/`43_000`, D2 `60_000`/`61_000`, D5 `70_000`/`71_000`, D7
`80_000`/`81_000`, D8 `90_000`/`91_000`, product `100_000`/`200_000`, D3 `110_000`/`111_000`,
D4 `120_000`/`121_000`, **D10 `130_000`/`131_000`**. The next free pair is `140_000` and
`141_000`, so no frozen D9 id or content hash can collide with an existing pool's.

## Answer-format guidance: one new cohort IS owed

This section originally read "nothing new is owed" on the reasoning that every answer shape
D9 uses already ships somewhere: `exactRadianAnswer` and `exactTrigValueAnswer` in TRG.1's and
TRG.2's frozen product items, `solutionSetAnswer` in LIN.1's, `intervalAnswer` in LIN.4's,
`precisionAnswer` in EL.1's, `multipartAnswer` in TRG.2's, `multipleChoiceAnswer` in FUN.1's.
Shipping a shape and guiding it are different claims, and for radians the second is false.

**Every `exactRadianAnswer` key resolves to notation tag `none`, so a learner gets a bare
"Your answer" field, no keypad and no preview, over answers like `11pi/6`.** Traced through
`answerNotation`: the builder yields `answer_type: "numeric"`, `representation: "exact"`,
`simplification: "none"`, so it reaches the `fraction_bar` rule at `answerFormat.ts:652`,
whose guard is `isPlainFractionAnswerText` — `/^-?\d+\s*\/\s*-?\d+$/`, digits over digits.
`11pi/6` fails it and falls through to `none`. The CFU path does not, because `cfuNotation`
uses the looser `isFractionBarAnswerText` (any `/` that is not a root, exponent or absolute
value), so the same notation is guided on one surface and bare on the other.

**`exactTrigValueAnswer` is in the same hole, for a different reason.** Its spec carries
`simplification: "canonical_exact_trig_value"`, which is not the `simplified_radical` the
radical branch at `answerFormat.ts:641` tests for, and `representation: "exact"` is not the
`"fraction"` at 647, so `sqrt(3)/2` also lands on `none`. Only the non-radical keys escape:
`1/2` satisfies `isPlainFractionAnswerText` and reaches `fraction_bar`, which is why TRG.3
measured this template splitting across two tags. Counted on TRG.6 alone, 29 of 31 distinct
keys owe a key row they never get.

**Stage C owes TWO tags**, each registered in the `AnswerNotation` union, in
`practicePlaceholder`'s switch, and in the key-row switch:

- `exact_radian`, selected on `answer_type === "numeric"` with `allowedSymbols` containing
  `pi`. Key row `[FRACTION_KEY]`. There is no pi key in the keypad and adding one is a larger
  change than this draft should take, so the placeholder carries the pi spelling in words.
  The row cannot be justified by the bar alone, because `21pi` is a valid key with no `/` in
  it, so the placeholder rather than the keypad is what makes these answerable.
- `exact_trig_value`, selected on `simplification === "canonical_exact_trig_value"`. Key row
  `[SQRT_KEY, FRACTION_KEY]`, and its placeholder names both.

**Both rules must sit ABOVE the `fraction_bar` rule at line 652.** Below it, a
`canonical_exact_trig_value` key of `1/2` takes `fraction_bar` and loses its square-root key,
which is the split described above rather than a hypothetical.

The existing sweep missed this because `answerKeypad.test.ts`'s `SERVED_ITEMS` does not
include the D9 product pool. Widening that population belongs with the guard work. RUN
`answerFormat.test.ts` at Stage C rather than trusting this paragraph either, because its
census derives its population from the tree and D9 changes the tree.

## Domain gate (Phase 7)

`node .cursor/skills/author/scripts/validate-lesson-pack.mjs content/lessons/d9` must report
**zero errors**. Warnings are recorded in the PR body as follow-up: the agreed bar for this
pass is green rather than `--strict` clean, because it is a nine-node first draft and no
`lesson-qa` round has run.

`npx vitest run --project web-reachability` must be green, which is the guard that the domain
is wired rather than merely authored. It requires each registered pack to build a gradable
five-slot practice set from its own domain's pool, with a distinct retry instance per slot.
This is why a lesson JSON cannot land without its item-bank templates and why each node is a
full vertical slice.
