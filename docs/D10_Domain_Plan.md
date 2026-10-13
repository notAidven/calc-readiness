# D10 (Geometry) domain plan

Phase 1 of `.cursor/skills/author/SKILL.md`, written before any JSON so the domain-level
constraints (R6 vocabulary, R11 interaction variety, R2 scenario budget) are decided once
rather than negotiated twice. This file is also the brief each parallel author works from,
so the shared-file wiring can be done centrally without collisions. Modelled on
`docs/D8_Domain_Plan.md`, which is the same document for the previous domain.

Authoring owner: Anthony.

## Scope: the whole domain, both nodes

| Node | Skill | Prereqs |
|---|---|---|
| GEO.1 | Pythagorean theorem, similar triangles, basic angle relationships | NUM.4 |
| GEO.2 | Area, perimeter, volume, surface area of standard figures | GEO.1 |

From `packages/skill-graph/src/skill_graph.json`. Nothing else in the graph declares either
node as a prereq, so D10 is additive and its blast radius is the shared registries alone.

Reading order is the numeric order: GEO.2's figures are measured with the relations GEO.1
establishes, and `NODE_ORDER` in `apps/web/src/lessons/d10.ts` is `["GEO.1", "GEO.2"]`.

## Era theming: Early Modern (Northern Renaissance, era 6)

`docs/superpowers/specs/eras/era-06-early-modern/style-guide.md` §"Lesson framings" already
carries authored framings for both nodes. Authors use them rather than inventing, and take
props from that section's context palette (drawing office, building site with its timber
model, surveyed piazza, cistern and depth-staff, print shop, dome under construction).

- **GEO.1** — (1) setting out a right angle on the ground with a knotted 3-4-5 cord, then
  checking a laid-out foundation by measuring its diagonal; (2) a scale model and the
  building itself as similar figures; (3) height by shadow, the campanile's shadow and a
  staff's shadow at the same hour giving two similar triangles.
- **GEO.2** — (1) lead for a dome, where the sheet needed is a surface area; (2) lining the
  cistern versus filling it, a surface area and a volume asked of one tank; (3) paving the
  piazza, where area gives the slabs and perimeter gives the kerb.

Three hard boundaries, all from that guide:

- **The framing comes from the era's WORLD, not the node's BUILDING.** D-ERA8 forbids a
  building that symbolises its skill, so GEO.1's domed hall is never "the Pythagoras
  building".
- **The "Explicitly absent" list is a boundary on the prose**: no structural iron, no
  machine-made brick, no soot, no reinforced concrete or cantilever, no curtain wall.
- **Theming follows the era, not the domain**, so it does not matter that D10's siblings
  sit elsewhere.

Voice reference is `content/lessons/d5/RAT.5.json`, the one other era-6 lesson authored.
Its opener is the shape to copy — one concrete era artefact, then the mathematical idea,
then the formal definition in bold — not its subject matter. *(The style guide's note that
RAT.5 "is framed Medieval and owes a re-theme" is stale against the file: `mini_lesson[0]`
at this tip opens on the cistern and its depth-staff, which is that guide's own Early Modern
framing (1) for RAT.5. Read the file, not the note.)*

## Spike findings that constrain authoring

Measured against the real v2 product checker (`createProductAnswerChecker`) before any
template was written, in three rounds. Every row below is a graded submission, not a
reading of `docs/Answer_Equivalence_Spec.md`. GEO.1 and GEO.2 are absent from that spec's
checker-gated node table, so nothing here is blocked; what follows is which shapes are
*authorable*, and the traps in each.

**An exact radical answer works, and the form check genuinely bites.** `radicalAnswer`:

- Key `5*sqrt(2)`: `5*sqrt(2)`, `5 * sqrt(2)` and the implicit-multiplication `5sqrt(2)`
  all grade `correct/match`.
- The unsimplified `sqrt(50)` is rejected `incorrect/not_simplified`, and against key
  `2*sqrt(13)` so is `sqrt(52)`. That is the simplification GEO.1 teaches, so the checker
  enforces the teaching rather than merely the value.
- **The `√` glyph is a parse error.** Both `5√2` and `√50` return
  `invalid_input/parse_error`. Every authored key and every hint that shows a typed answer
  uses `sqrt(...)`. KaTeX `\sqrt{}` in the *prompt* is unaffected; this is about what the
  learner types.
- A decimal is rejected `incorrect/wrong_representation` (`7.07` and `7.0710678` both), so
  an exact-answer prompt must not invite rounding.

**A numeric key does NOT accept a `sqrt` call.** Against key `10`, `sqrt(100)` grades
`invalid_input/unsupported_syntax`. So a Pythagorean item whose answer is a whole number
asks for the value and must not suggest leaving it under a root. `10`, `10.0`, `10.00` and
a space-padded `" 10 "` are all `correct/match`; `14` is `incorrect/value_mismatch`.

**Fractions and decimals are interchangeable in a numeric key, with no tolerance.**
Against key `7.5`, both `15/2` and `7.50` grade `correct/match`; against key `3/2`, so do
`1.5`, `6/4` and `1.50`. A similar-triangles answer therefore never has to declare a form.
But `7.500001` against `7.5` is `value_mismatch`, so parameters must land on exactly
representable values rather than anything a learner would reach by rounding mid-way.

**No unit, no degree sign, may appear in a typed answer.** `48 m^2`, `48m2`,
`48 square metres` and `35 degrees` are all `invalid_input/unknown_symbol`, and `35°` is
`invalid_input/parse_error`. **Every GEO prompt states the unit and asks for a plain
number.** Unit conversion is not asked anywhere in D10: `required_exact_unit` accepts
aliases of one declared unit only, so `3 ft` never equals `36 in`.

**Exact π is authorable, but only through one spelling.**

- `numericAnswer("36*pi")` is **broken at the key**: the answer key itself returns
  `scoring_error/invalid_answer_key`, and a typed `36*pi` returns
  `invalid_input/unknown_symbol`. `radicalAnswer("36*pi")` fails the same way. There is no
  ambient `pi` binding.
- `expressionAnswer("36*pi", ["pi"])` — **declaring `pi` in `allowed_symbols` is what binds
  it** — grades `36*pi`, `36pi` and `18*2*pi` all `correct/match`, and `35*pi`
  `incorrect/value_mismatch`. The default `combined_polynomial` simplification is enough;
  passing `"none"` changes only that `72*pi/2` also passes, so the default is what D10 uses.
- Note what this does **not** do: against key `45*pi`, the answer `pi*9*5` grades
  `correct/match`. **An exact-π item does not require the arithmetic to be finished**, so
  no hint or worked solution may claim it does.
- The two π shapes are mutually exclusive per item and the prompt must pick one. A
  `precisionAnswer` key rejects `16*pi` as `wrong_representation`, and an exact-π
  expression key rejects the decimal `113.097` as `value_mismatch`.

**A rounded decimal works as the alternative, and precision is a floor.**
`precisionAnswer("113.10", 2 dp)` accepts `113.10`, `113.1` and the more precise `113.097`;
`113` is rejected `wrong_representation`. A learner who carries more digits is not
punished, but one who rounds too early is, so the prompt states the rounding.

**A two-part item grades, and names the part that failed — but D10 does not use one.**
`multipartAnswer` over `{area, perimeter}` grades `{area: "48", perimeter: "28"}` as
`correct/match` and returns `incorrect/perimeter:value_mismatch` when only the second part
is wrong. It is nonetheless **out of scope here**, for a reason that is not about the
checker: a lesson CFU's `check` accepts `answer_type` of `numeric` or `expression` only
(`content/lessons/d1/README.md`), so a multipart CFU is not authorable at all, and on the
practice side multipart would be D10 introducing the domain's only multi-field answer
input, with its own keypad and placeholder behaviour, for no teaching gain. Both nodes'
combining questions are single-answer instead, and are written so that the combination is
in the reasoning rather than in the answer shape.

**A multiple-choice key is matched exactly, including case and surrounding space.**
Against key `right`, both `Right` and `" right "` grade `incorrect/value_mismatch`. So a
classification is always presented as choices the learner selects, never as a free-text
field, and each option label must be byte-identical to the key it can produce.

## Interaction-kind budget (R11)

`validate-lesson-pack.mjs` derives a widget's kind from its id suffix, errors below
`MIN_DOMAIN_KINDS = 5` distinct kinds per domain, errors below 3 per lesson, and errors
when one kind reaches `MAX_DOMAIN_KIND_SHARE = 0.6` of the domain's widgets. With only
eight widgets that ceiling is four, which is not close: D10 uses **eight widgets and eight
distinct kinds**, top share 1 of 8 (12.5%), four distinct kinds in each lesson.

| Node | Slide 0 | Slide 1 | Slide 2 | Slide 3 |
|---|---|---|---|---|
| GEO.1 | `geo-cord-table` | `geo-diagonal-stepper` | `geo-angle-explore` | `geo-shadow-slider` |
| GEO.2 | `geo-paving-classify` | `geo-compose-builder` | `geo-cistern-play` | `geo-net-drag` |

Kind census: table, stepper, explore, slider, classify, builder, play, drag — one each.
Against R11's twelve real archetypes this covers filling a table, sequencing steps,
predict-then-check, tuning a control, sort-into-bins, build-an-expression, free
exploration, and drag-onto-a-diagram.

Components are `Geo*` under `apps/web/src/lessons/interactive/`, mirroring D8's `Exp*` /
`Log*`. Every placement is `"gates": true`.

## Vocabulary (R6): term, and the slide that introduces it in bold

- **leg**, **hypotenuse**, **Pythagorean theorem**: GEO.1 slide 0
- **square root** as the inverse of squaring: GEO.1 slide 1 (assumed from NUM.4, bolded on
  first use anyway — `base` in D8 is the term the D2 review caught being used undefined)
- **supplementary**, **vertical angles**: GEO.1 slide 2
- **similar**, **corresponding sides**, **scale factor**: GEO.1 slide 3
- **area**, **perimeter**: GEO.2 slide 0
- **composite figure**: GEO.2 slide 1
- **volume**: GEO.2 slide 2
- **surface area**, **net**: GEO.2 slide 3

No coined vocabulary (R23): every term above is standard. R32 applies to **similar**, which
is an ordinary English word carrying a precise meaning here, so it is earned on GEO.1 slide
3 before any item uses it.

## Scenario budget (R2), one per node, on slide 0 only

- **GEO.1**: a corner has to be set out square on open ground before anything is built, and
  a knotted cord of twelve equal lengths is the only instrument to hand.
- **GEO.2**: a piazza is to be paved and kerbed, and the two orders are counted by
  different measurements of the same rectangle.

Every later slide is marked **no scenario**. The mathematics carries slides 1 to 3, with
the era's props appearing as the objects being measured rather than as new stories.

## Per-node practice shapes (5 slots: 1xL1 / 2xL2 / 2xL3)

Every shape sits inside a category the spike above graded end to end. No item asks for a
unit, a degree sign, or a conversion.

**GEO.1** (`d10.geo1.*`)

- L1 `hypotenuse`: hypotenuse of a right triangle from two integer legs, landing on a
  Pythagorean triple. `numericAnswer`.
- L2 `leg`: the missing leg, given hypotenuse and one leg, again on a triple.
  `numericAnswer`.
- L2 `angle-third`: the third angle of a triangle, or the angle supplementary to a given
  one. `numericAnswer`, prompt says "in degrees" and asks for a plain number.
- L3 `exact-diagonal`: the diagonal of a rectangle as an exact simplified radical.
  `radicalAnswer`, key written `a*sqrt(b)`.
- L3 `similar-side`: the missing side of a pair of similar triangles, allowed to be a
  non-integer since fractions and decimals are interchangeable. `numericAnswer`.

**GEO.2** (`d10.geo2.*`)

- L1 `rect-area`: area of a rectangle, unit named in the prompt. `numericAnswer`.
- L2 `perimeter`: perimeter of a rectangle or an L-shaped composite figure.
  `numericAnswer`.
- L2 `prism-volume`: volume of a rectangular prism. `numericAnswer`.
- L3 `cylinder-volume-exact`: volume of a cylinder left exactly in terms of π.
  `expressionAnswer(key, ["pi"])`, prompt says "in terms of pi".
- L3 `prism-surface-area`: surface area of a rectangular prism, which is the shape the node
  most needs separated from volume. `numericAnswer`.

Each template carries 1 to 3 progressive hints that name the rule without substituting
(R13), an ordered `worked_solution`, and a `WORKED_SOLUTION_VISUALS` entry keyed by
`template_id`. The visuals are the geometry itself, so every one is a labelled figure
driven by `template_params` rather than a step card.

## CFU per node (one combining question)

- **GEO.1**: a rectangular foundation with given sides, and a timber model of it at a
  stated scale; the single number asked for is the model's diagonal. Pythagoras gives the
  foundation's diagonal and similarity scales it, so one answer needs both ideas and
  neither alone.
- **GEO.2**: one rectangular cistern, lined on its floor and its four walls but not its
  open top, asked for the number of square metres of lining. One number, but it cannot be
  reached without separating surface area from volume and then noticing which faces are
  actually covered — the distinction the node exists to draw, asked so that a learner who
  computes the capacity instead is wrong for the right reason.

## The CFU contract after #286, and what D10 owes it

This section is written after the fact rather than before it: `anthony/d10-geometry` was cut
from `e3b715a`, and #286 (`cefc952`) landed on `integration` while the nodes were being
authored, so the two CFUs above were authored against the old contract and converted during
the merge. The next domain should read this **before** authoring, not after.

**Two fields are now required on every pack's `cfu`,** enforced by
`validate-lesson-pack.mjs` rules 12a and 12c:

- `cfu.worked_solution` — ordered steps, non-empty strings, no em dash, no meta-commentary,
  and **the last step must name an accepted spelling**. Same rules as a practice template's,
  per the two-line extension #286 made to `.cursor/skills/practice-hints/SKILL.md`.
- `cfu.variants: { template_id, count }` with `count >= 2`, so the CFU can re-ask on a fresh
  instance instead of handing the same numbers back.

**A CFU that no practice template matches gets a generator, not a retarget.** Both D10 CFUs
are combining questions by design (see the section above), so neither could point at a pool
template without changing the question. Each therefore gets an entry in `CFU_ONLY_TEMPLATES`
in `apps/web/src/lessons/cfuVariants.ts`:

| Node | `template_id` | Generated question | Answer |
|---|---|---|---|
| GEO.1 | `cfu.geo1.model-diagonal` | foundation `3m x 4m`, model at `1:n` | `5m/n`, a whole number |
| GEO.2 | `cfu.geo2.open-cistern-lining` | open cistern `l x w x d` | `lw + 2ld + 2wd`, a whole number |

Both generators reroll until the answer is a whole number, which is what lets both spellers
be the existing `integerForms` helper. That is deliberate: the alternative is a decimal
spelling list for a domain whose spike found no tolerance in a numeric key.

**The speller recomputes; it does not read back an answer.** `SPELLERS["cfu.geo1.model-diagonal"]`
takes the rectangle's own sides and the scale from `params` and walks the whole Pythagoras
path again, so a generator that started producing the wrong diagonal would disagree with its
own speller rather than agreeing with itself. Registering the speller is not optional
housekeeping: the validator's error text for a missing one names it directly.

**`cfuVariants.test.ts` closes both directions, so a new pack cannot pass by omission.** Its
converted set and `NOT_YET_CONVERTED` (`{}` at this tip) must cover the tree exactly, and
`AUTHORED_PARAMS` needs one entry per pack whose speller must reproduce that pack's whole
authored `accepted` list. D10 adds `GEO.1` (`{ a: 30, b: 40, n: 10 }`) and `GEO.2`
(`{ l: 8, w: 5, d: 2 }`), which are the authored questions' real numbers rather than
convenient ones, and raises the census floors from 36 to 38 by that count rather than by
blind bump.

**What #286 did not change:** `MIN_DOMAIN_KINDS` (5), `MAX_DOMAIN_KIND_SHARE` (0.6) and
`INTERACTION_KINDS` have no changed lines in it, so the R11 budget above stands as measured.
The note that a multipart CFU is unauthorable also stands: `check.answer_type` is still
`numeric` or `expression` only.

**#357 addendum — every check reveals a figure on both questions.** After #357 landed on
`integration`, the reveal surface is no longer optional: both the authored question and
every re-asked variant must show a `figure.lesson-visual`, not `.worked-solution__steps`.
Three routes apply: point `cfu.variants` at a practice template that already has a figure;
set `cfu.worked_solution_template` to a sibling pack's template; or register a new `cfu.*`
entry in `cfuVariants.ts` and `WORKED_SOLUTION_VISUALS`. Composite answers must close on
all parts in the figure. `NO_HONEST_FIGURE` is empty — there is no step-card escape hatch.
See `.cursor/skills/author/reference.md` §5a and
`.cursor/skills/worked-solution-svg/SKILL.md`; guards:
`cfuFigureCoverage.test.tsx`, `cfuHintGate.browser.test.tsx`.

## File ownership, so parallel authors do not collide

**Per-node, owned by that node's author:**
`content/lessons/d10/GEO.n.json`, the four `apps/web/src/lessons/interactive/Geo*.tsx`,
their per-widget `*.browser.test.tsx`, `apps/web/src/lessons/worked/d10GEOn.tsx`,
`packages/item-bank/src/d10/nodes/GEO.n/index.ts`.

**The seed block is 130_000 / 131_000.** Every other pool's bases were read off the tree
rather than assumed: D1 `1000`/`2000`/`5000`/`7000`/`10_000`/`20_000`, interactive
`42_000`/`43_000`, D2 `60_000`, D5 `70_000`, D7 `80_000`, D8 `90_000`, product
`100_000`/`200_000`, D3 `110_000`, **D4 `120_000`**. The next free pair is `130_000` and
`131_000`, so a frozen D10 id or content hash cannot collide with an existing pool's.

**Shared, edited centrally and never by a node author:**
`apps/web/src/lessons/d10.ts`, `domains.ts`, `practiceSession.ts`, `practiceChecker.ts`,
`visuals.tsx`, `workedSolutionVisuals.tsx`, `cfuVariants.ts`,
`packages/item-bank/src/d10/practice.ts`, `packages/item-bank/src/d10/index.ts`,
`packages/item-bank/src/index.ts`, `packages/item-bank/src/d10.test.ts`,
`cfuVariants.test.ts`, and the count-pinning sweeps (`widgetRevealReAsk`,
`widgetDropSlots`, `widgetQaFixes`, `widgetVariantPool`, `widgetSuccessCoverage`,
`widgetRevealFill`, `revealReAsk`, `answerFormat`, `radicalAnswerSubmit`, `visualsMath`).

## Domain gate (Phase 7)

`node .cursor/skills/author/scripts/validate-lesson-pack.mjs --strict content/lessons/d10`
must report zero errors and zero warnings: a new domain has no legacy excuse.
`npx vitest run --project web-reachability` must be green, which is the guard that the
domain is wired rather than merely authored — it requires each registered pack to build a
gradable five-slot practice set from its own domain's pool, with a distinct retry instance
per slot.
