# D8 (Exponential & Logarithmic) domain plan

Phase 1 of `.cursor/skills/author/SKILL.md`, written before any JSON so the domain-level
constraints (R6 vocabulary, R11 interaction variety, R2 scenario budget) are decided once
rather than negotiated five times. This file is also the brief each parallel author works
from, so the shared-file wiring can be done centrally without collisions.

Authoring owner: Anthony (`docs/Content_Authoring_Split.md` §"Anthony", D8).

## Scope: six nodes

| Node | Skill | Lesson shell | Prereqs |
|---|---|---|---|
| EL.1 | Evaluate exponentials, including base $e$ | L15 | EXP.1, FUN.1 |
| EL.2 | Graph exponential functions and transformations | L28 | EL.1, FUN.9 |
| EL.3 | Logarithms: convert form, evaluate common and natural logs | L16 | EL.1 |
| EL.4 | Graph logarithmic functions; state domain | L39 | EL.3, FUN.9 |
| EL.5 | Logarithm properties: product, quotient, power, expand and condense | L23 | EL.3 |
| EL.6 | Solve exponential and logarithmic equations | — | item-family, see below |

**EL.6 was authored on 2026-07-30, and this section previously said it never would be.**
That earlier ruling read `docs/Answer_Equivalence_Spec.md` §10 as gating the node behind
deferred arbitrary equation equivalence. Measured rather than assumed, the gate was
mis-stated: solving $2^{x} = 8$ submits `3`, not an equation, so the answer shapes EL.6
actually needs are `numeric`, `precision` and `solution_set`, all three of which the v2
checker already graded. The one genuine gap was a roster holding exact symbolic members
(`{ln 2, ln 3}`), which `compareSolutionSet` now handles. The reasoning is recorded at the
head of `apps/web/src/lessons/d8.ts`, which is the authority if this file and the source
ever disagree again.

EL.6 is `item_family: true` with empty `prereqs`, so its real prerequisites are its
families in `packages/skill-graph/src/skill_graph.json`: `same_base` (EXP.1, LIN.1),
`log_requiring` (EL.3, EL.5, LIN.1), `log_equation` (EL.5, LIN.1), and
`quadratic_in_exponential` (EL.3, POL.3). The fourth was added in QA round 1, which found
that both L3 shapes run a quadratic factoring step no family earned; it follows TRG.8's
`quadratic_in_form` precedent and is a design record, not a hard edge, since `mvp_family`
is null.

Reading order is EL.1, EL.3, EL.5, EL.2, EL.4, EL.6: the two graphing nodes both need
FUN.9, EL.4 reads much better once EL.3 has defined a logarithm, and EL.6 solves with the
properties EL.5 establishes. `NODE_ORDER` in `apps/web/src/lessons/d8.ts` uses the numeric
order EL.1..EL.6, which is the display order.

## Spike findings that constrain authoring

Measured against the real v2 product checker (`createProductAnswerChecker`) before any
template was written. Each row is a graded submission, not a reading of the spec.

**EL.5 expand/condense is fully gradable, and the form check genuinely bites.**

- `is_expanded_log` key `log(x) + log(y)`: the key grades `correct/match`, and so does the
  reordered `log(y) + log(x)`.
- The condensed `log(x*y)` is rejected `incorrect/not_expanded`, and a value-wrong
  `log(x) - log(y)` is rejected `incorrect/value_mismatch`. Two different reason codes, so
  form and value are checked separately.
- Partial expansion is caught: against key `2 * log(x) + log(y)`, the answer
  `log(x^2) + log(y)` is rejected `not_expanded`. That is exactly the power rule the node
  teaches, so the checker is enforcing the teaching rather than merely the value.
- `is_condensed_log` key `log(x^3 * y)` accepts itself and rejects `3*log(x) + log(y)`
  as `not_condensed`.
- **`log` and `ln` are interchangeable to the checker.** Against an `ln(x) - ln(y)` key,
  `log(x) - log(y)` grades `correct/match`. Right for identities that hold in any base, but
  it means **no item may hinge on which log token the learner typed.** Never ask for "the
  natural log form" and expect the base to be graded.

Helpers `expandedLogAnswer` and `condensedLogAnswer` were added to
`packages/item-bank/src/template.ts` so EL.5 templates do not hand-write the spec.

**EL.1 base $e$: keys are precomputed decimals, and the prompt must say so.**

- `precisionAnswer("1161.83", { decimal_places: 2 })` accepts `1161.83`, and also accepts
  the more precise `1161.8342` and the full `1161.834242728283`. Precision is a floor, not
  a format: a learner who does not round is not punished.
- A mis-round, `1161.84`, is rejected `value_mismatch`. So avoid parameters whose exact
  value sits near a rounding boundary, where intermediate rounding could land a learner on
  the wrong cent.
- The symbolic `1000*e^(0.15)` is rejected `wrong_representation` when the spec's
  representation is `decimal`. There is no `e` symbol binding the way `pi` has one, so a
  base-$e$ answer is a rounded decimal and the prompt states the rounding.
- `$1161.83` and `1,161.83` are both rejected `wrong_representation`. Prompts ask for a
  plain number and do not invite a currency symbol or comma grouping.

**EL.3 numeric answers cannot be typed as a log call.** Against key `3`, both `log10(1000)`
and `log(1000)` grade `invalid_input/unsupported_syntax`. Prompts must ask for the value.

**Change of base is authorable only as EVALUATION.** `precisionAnswer("1.861", 3 dp)`
accepts `1.861` and `1.8614` and rejects `1.86` as `value_mismatch`, so the prompt must
state the rounding. The symbolic change-of-base identity stays out: §10 still defers
general log identities, and the cleared slice is expand/condense only.

## Interaction-kind budget (R11)

The validator derives a widget's kind from its id suffix, errors below 5 distinct kinds per
domain, and errors when any one kind reaches 60% of the domain's widgets. Twenty-four
widgets, four per node, thirteen distinct kinds, `builder` and `walkthrough` tied highest
at 3 of 24 (12.5%):

| Node | Slide 0 | Slide 1 | Slide 2 | Slide 3 |
|---|---|---|---|---|
| EL.1 | `exp-growth-table` | `exp-factor-slider` | `exp-decay-classify` | `exp-continuous-walkthrough` |
| EL.2 | `exp-graph-play` | `exp-shift-drag` | `exp-transform-builder` | `exp-feature-label` |
| EL.3 | `log-question-explore` | `log-form-match` | `log-evaluate-stepper` | `log-natural-spot` |
| EL.4 | `log-mirror-explore` | `log-domain-classify` | `log-shift-slider` | `log-domain-builder` |
| EL.5 | `log-product-table` | `log-expand-order` | `log-condense-builder` | `log-base-change-walkthrough` |
| EL.6 | `equation-same-base-stepper` | `equation-take-log-walkthrough` | `equation-gather-convert-match` | `equation-extraneous-spot` |

Kind census: builder 3, walkthrough 3; table 2, slider 2, classify 2, explore 2, match 2,
stepper 2, spot 2; play 1, drag 1, label 1, order 1. Against R11's twelve real kinds this
spreads across filling a table, tuning a control, sort-into-bins, sequencing steps,
matching pairs, labelling a figure, drag-onto-a-diagram, spot-the-error, build-an-expression
and predict-then-check, with no node built from fewer than four distinct kinds.

Components are `Exp*` / `Log*` under `apps/web/src/lessons/interactive/`, mirroring D7's
`Linear*`. Every placement is `"gates": true`.

## Vocabulary (R6): term, and the slide that introduces it in bold

- **exponential function**, **base**, **growth factor**, **initial amount**: EL.1 slide 0-1
- **exponential decay**: EL.1 slide 2
- **continuous growth**, **the number $e$**: EL.1 slide 3
- **horizontal asymptote**: EL.2 slide 0 (EL.4 reuses it, defined once here)
- **transformation**, **reflection**: EL.2 slides 1-2
- **logarithm**, **argument**: EL.3 slide 1
- **common logarithm**, **natural logarithm**: EL.3 slide 3
- **vertical asymptote**, **domain**: EL.4 slides 1-2
- **expand**, **condense**, **change of base**: EL.5 slides 1, 2, 3
- **extraneous**: EL.6 slide 3

`base` is introduced in EL.1 and is the one term the D2 review caught being used
undefined, so it is bolded on first use even though EXP.1 is a prereq. No coined
vocabulary (R23): every term above is standard.

## Scenario budget (R2), one per node, on slide 0 only

Themes are deliberately out of scope for this pass, so these are plain real-world
quantities with no narrative wrapper, no era flavour and no proper nouns.

- **EL.1**: a bacterial culture that doubles every hour, and the question of what it will
  be after 8 hours when repeated addition gives the wrong answer.
- **EL.2**: two savings plans with the same starting amount and different rates, and where
  the graphs separate.
- **EL.3**: a population known to have grown to 32 times its size, and the question of how
  many doublings that took, which multiplication cannot answer directly.
- **EL.4**: a sound-level reading, and why the scale compresses enormous ranges.
- **EL.5**: a single measurement that must be split into two factors, motivating why one
  log can be taken apart.
- **EL.6**: aircraft on a flight line doubling every quarter against a fixed hangar
  capacity, so the unknown sits in the exponent where arithmetic cannot reach. QA round 1
  rewrote this one: it opened at "one squadron" and capped at "32 airframes", two different
  units, so a learner who modelled it faithfully got $S \cdot 2^{t} = 32$ and never reached
  the $2^{t} = 32$ the slide then solves.

Every later slide is marked **no scenario**. The mathematics carries slides 1 to 3.

## Per-node practice shapes (5 slots: 1xL1 / 2xL2 / 2xL3)

Every shape sits inside a cleared checker category. No shape asks for a two-sided
equation, following the LF.2 and RAT.5 discipline.

**EL.1** (`d8.el1.*`)
- L1 `evaluate`: evaluate $a \cdot b^x$ at a small integer $x$. `numericAnswer`.
- L2 `decay-value`: evaluate a decay model at an integer time. `numericAnswer`.
- L2 `classify`: growth or decay from the base. `multipleChoiceAnswer`.
- L3 `compound`: compound interest to the cent. `precisionAnswer` 2 dp.
- L3 `continuous`: $Pe^{rt}$ to the cent. `precisionAnswer` 2 dp.

**EL.2** (`d8.el2.*`)
- L1 `asymptote`: the horizontal asymptote of $a b^x + k$. `numericAnswer`.
- L2 `intercept`: the $y$-intercept value. `numericAnswer`.
- L2 `anchor-point`: where $(0, 1)$ lands after the transformation. `pointAnswer`.
- L3 `transform-rhs`: the expression after the equals sign for a described shift.
  `expressionAnswer` with `allowed_symbols: ["x"]`.
- L3 `which-transform`: name the transformation between two given functions.
  `multipleChoiceAnswer`.

**EL.3** (`d8.el3.*`)
- L1 `evaluate-common`: $\log_{10}$ of a power of ten. `numericAnswer`.
- L2 `evaluate-base`: $\log_b$ of an exact power of $b$. `numericAnswer`.
- L2 `to-exponential`: given a log statement, give the missing exponent or value.
  `numericAnswer`.
- L3 `evaluate-natural`: $\ln e^k$, including a negative $k$. `numericAnswer`.
- L3 `missing-base`: the base $b$ satisfying a given log statement. `numericAnswer`.

**EL.4** (`d8.el4.*`)
- L1 `asymptote`: the vertical asymptote of $\log(x - h)$. `numericAnswer`.
- L2 `domain`: the domain in set-builder form. `setBuilderAnswer` (RAT.5 pattern).
- L2 `x-intercept`: the $x$-intercept as an ordered pair. `pointAnswer`.
- L3 `domain-shift`: domain of a shifted and reflected log. `setBuilderAnswer`.
- L3 `evaluate-point`: the output at a given input. `numericAnswer`.

**EL.5** (`d8.el5.*`)
- L1 `expand-product`: expand $\log(xy)$. `expandedLogAnswer`.
- L2 `expand-power`: expand $\log(x^n y)$, so the power rule must be applied.
  `expandedLogAnswer`.
- L2 `condense-sum`: condense a sum into one log. `condensedLogAnswer`.
- L3 `expand-quotient`: expand a quotient with a power. `expandedLogAnswer`.
- L3 `change-base-value`: evaluate $\log_b N$ to 3 dp. `precisionAnswer` 3 dp.

**EL.6** (`d8.el6.*`)
- L1 `same-base`: both sides rewritten to one base, then exponents matched.
  `numericAnswer`.
- L2 `log-single`: a single logarithm undone into its exponential form. `numericAnswer`.
- L2 `take-log`: take a logarithm of both sides and divide. `precisionAnswer` 3 dp.
- L3 `extraneous`: two logs gathered by the product rule, with a root the domain rejects.
  `solutionSetAnswer`.
- L3 `exp-quadratic`: quadratic in an exponential, solved by substitution.
  `exactSolutionSetAnswer`, whose members are exact `ln` values.

Each template carries 1 to 3 progressive hints that name the rule without substituting
(R13), an ordered `worked_solution`, and a `WORKED_SOLUTION_VISUALS` entry keyed by
`template_id`.

## CFU per node (one combining question)

- **EL.1**: an amount, a growth factor and a time, answered as a value, combining the
  form $a b^x$ with reading a decay base.
- **EL.2**: given a transformed exponential, state the asymptote and where the anchor
  point moved.
- **EL.3**: convert an exponential statement to log form and evaluate it.
- **EL.4**: state the domain and the vertical asymptote of a shifted log.
- **EL.5**: condense an expression that needs the power rule first, then the product rule.
- **EL.6**: solve $\log_{2} x + \log_{2}(x - 6) = 4$, which needs the product rule to
  gather, the exponential form to undo, and the domain to reject one root.

**CFU reveal contract (#357).** Every check must reveal an SVG figure on **both** the
authored question and every re-asked variant — not step cards. Three routes: point
`cfu.variants` at a practice template that already has a figure; set
`cfu.worked_solution_template` to a sibling pack's template; or register a new `cfu.*` entry
in `cfuVariants.ts` and `WORKED_SOLUTION_VISUALS`. Composite answers must close on all
parts in the figure. See `.cursor/skills/author/reference.md` §5a and
`.cursor/skills/worked-solution-svg/SKILL.md`.

## File ownership, so parallel authors do not collide

**Per-node, owned by that node's author:**
`content/lessons/d8/EL.n.json`, the four `apps/web/src/lessons/interactive/<Name>.tsx`,
their per-widget `*.browser.test.tsx`, `apps/web/src/lessons/worked/d8ELn.tsx`,
`packages/item-bank/src/d8/nodes/EL.n/index.ts`.

**Shared, edited centrally and never by a node author:**
`apps/web/src/lessons/d8.ts`, `domains.ts`, `practiceSession.ts`, `practiceChecker.ts`,
`visuals.tsx`, `workedSolutionVisuals.tsx`, `packages/item-bank/src/d8/practice.ts`,
`packages/item-bank/src/d8/index.ts`, `packages/item-bank/src/index.ts`,
`packages/item-bank/src/d8.test.ts`, and the count-pinning browser sweeps
(`widgetRevealReAsk`, `widgetDropSlots`, `widgetQaFixes`, `widgetVariantPool`,
`widgetSuccessCoverage`).

## Domain gate (Phase 7)

`node .cursor/skills/author/scripts/validate-lesson-pack.mjs --strict content/lessons/d8`
must report zero errors and zero warnings: a new domain has no legacy excuse.
`npx vitest run --project web-reachability` must be green, which is the guard that the
domain is wired rather than merely authored.
