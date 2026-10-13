# D1 Answer-Checker Capability Spike

**Status: PASS (implementation candidate).** The same immutable-item checker and
golden fixtures pass in Node and headless Chromium. This clears the implemented
D1 arithmetic categories for team review. The Phase-2 product checker (v2) now
clears many later symbolic categories on the same shared core (see "Phase-2
product checker (v2)" below), and as of `Answer_Equivalence_Spec.md` v0.13 the
graph comparator, `is_vertex_form`, `set_builder`, and the EL.5 log
expand/condense slice are cleared too; only general equation/inequality and
general trig/log-identity equivalence remains uncleared (see "Still uncleared"
below; `Answer_Equivalence_Spec.md` §10 is the source of truth).

## Candidate stack

- `mathjs` 15.2 with a custom dependency bundle
- `number: "Fraction"` for exact rational/decimal/percent comparison
- Restricted AST validation before evaluation
- `rationalize` for D1 polynomial-expression equivalence
- React `MathInput` wrapper over the frozen `checkAnswer` contract

The checker remains deterministic and synchronous in both runtimes. It reads an
immutable `item_version_id`; item-specific answer constraints and keys live in
the item-version definition, not in surface code.

## D1 categories exercised

The executable fixture set covers all six MVP nodes:

- `NUM.S`: signed arithmetic and sign-error typing
- `NUM.F`: exact fractions, required fraction representation, reduced form
- `NUM.2`: precedence and malformed-input handling
- `NUM.3`: equivalent distributive/field-property expressions
- `NUM.4`: equivalent but uncombined/unexpanded expression rejection
- `NUM.5`: percent representation, exact unit aliases, multipart responses
- Shared: multiple-choice immutable option IDs, version mismatch, missing item
  versions, expression depth/size/exponent limits

Twenty-two golden cases run unchanged in Node and Chromium (44 parity fixture
executions). Four additional Node tests cover registry/version/safety behavior.

## Deliberate limits

This is a D1 checker, not a general CAS:

- Allowed operators are `+`, `-`, `*`, `/`, and bounded nonnegative integer
  powers.
- Input length, AST depth, AST node count, and exponent size are capped.
- Unknown symbols, functions, assignments, and unsupported syntax return
  `invalid_input`; application/configuration faults fail closed as
  `scoring_error`.
- Unit policy accepts authored aliases of the required unit only; it does not
  perform conversions.
- This v1 checker itself does not grade Phase-2 forms; radicals, domain-aware
  rationals, factoring predicates, solution sets/intervals/points, target
  equation forms, and precision modes are now handled by the separate product
  checker (v2, see below). Per `Answer_Equivalence_Spec.md` v0.13 the §8 graph
  geometric comparator, `is_vertex_form`, `set_builder` notation, and the EL.5
  log expand/condense slice are now cleared; only general equation/inequality and
  general trig/log-identity equivalence remains uncleared in either checker.

## Commands

```bash
npm run test:unit
npm run test:browser
```

CI installs Chromium and runs both suites. The web scaffold exposes a live
reduced-fraction probe on the Survey surface; the heavy checker code is loaded
only when that surface is opened.

## Remaining freeze work

1. Team-review the D1 fixture coverage and accepted grammar.
2. Replace spike item definitions with the validated immutable D1 item bank.
3. Write the final node-to-simplification-profile authoring table.
4. Add item-bank invariants as authored content lands.
5. Increment `D1_CHECKER_VERSION` whenever a verdict-affecting checker change
   ships; never silently rescore historical responses under a new version.

## Phase-2 product checker (v2)

**Status: PASS (implementation candidate).** A second checker
(`createProductAnswerChecker`, `PRODUCT_CHECKER_VERSION = 2`) extends the locked
D1 (v1) grammar to the Phase-2 categories that gate the 56 expansion nodes (was 42
before the 2026-07-24 coverage expansion, PR #50; count from the registry). Both
checkers build on one shared `checker-core`: a Fraction-typed mathjs instance for
exact rational/decimal/percent arithmetic plus a number-typed instance for
radicals/exact constants judged by relative tolerance (the Fraction instance
throws on irrational evaluation). So Node and Chromium stay byte-for-byte
consistent across both versions. v1 was refactored onto that core with NO verdict
change; `D1_CHECKER_VERSION` is unchanged (a behavior-preserving refactor needs no
version bump).

### Categories cleared (Node + Chromium)

- Radicals / exact constants (`simplified_radical` + `representation:exact`):
  rejects an unsimplified perfect-power factor, a non-rationalized denominator,
  and a decimal approximation of an exact value.
- Univariate factoring structure (`fully_factored_over_integers`): expands to the
  key's coefficients AND every factor passes a per-factor irreducible + primitive
  check; factor order irrelevant; repeated factors as powers or written out.
- Domain-aware `rational_answer`: structured `{expression, excluded_values}`
  compared to the key AND the inherited exclusion set (a dropped exclusion is
  wrong even with a correct expression, §3).
- `solution_set` (order-insensitive roster, empty-set phrases), `interval`
  (bounds + inclusivity, +/-inf, unions), `point` (ordered pair, swap detection).
- Numeric `precision` (`decimal_places` / `sig_figs`, half-away-from-zero).
- `is_standard_polynomial` and `equation_form:is_slope_intercept`.
- `positive_exponents` (EXP.1): equality by a deterministic multi-point NUMERIC
  IDENTITY test (a prior probe showed `rationalize` does not reliably cancel these
  possibly-rational expressions), then a no-negative-exponent AST predicate, so a
  value-correct `x^-2` is graded `not_simplified`, not `correct`. The grammar
  accepts bounded negative integer exponents behind an `allowNegativeExponent`
  parse option that DEFAULTS OFF (v1 and the existing v2 radical/expression paths
  are byte-for-byte unchanged), enabled only for EXP.1-style items.
- `canonical_exact_trig_value` (TRG.2): exact special-angle values
  (`0, 1/2, sqrt(2)/2, sqrt(3)/2, 1, sqrt(3)/3, sqrt(3), 2*sqrt(3)/3`) reuse the
  radical machinery (representation:exact rejects decimals, no perfect-power factor
  under a root, no radical denominator) and float value-match. Naturally authored
  as a multipart angle->value table via the existing multipart comparator.
- Exact radian / `pi`-multiple conversions (TRG.1): `pi` is a recognized constant
  bound in the eval scope (the number instance has no `pi` constant) and allowed in
  the grammar (parameterized so v1 is untouched); representation:exact rejects a
  decimal approximation of the radian; compared by float tolerance. Degree and
  coterminal forms are plain numeric.
- Plus the full v1 numeric / expression / multiple_choice / multipart set: v2 is
  a strict superset.

### Versioning discipline (no silent rescore, §13.13)

The two checkers are composed by `createVersionedAnswerChecker(Map<version,
checker>)`, which routes each request by its declared
`equivalence_checker_version` and fails closed (`scoring_error` /
`checker_version_unsupported`) on an unknown version. A v1 item is always graded
by the v1 checker and a v2 item by the v2 checker; re-requesting a historical
response under the OTHER version fails closed rather than re-grading it. So adding
v2 never rescores a v1 response. A verdict-affecting v2 change increments
`PRODUCT_CHECKER_VERSION`, never a silent rescore.

### Evidence (final counts)

- `product-answer-checker.test.ts`: 82 Node tests (76 golden valid /
  alternate-valid / near-miss cases across every category, incl. positive
  exponents, exact trig values + a multipart trig table, and exact radians, plus 6
  registry / category-coverage / fail-closed tests).
- `product-answer-checker.browser.test.ts`: the same 76 golden cases in headless
  Chromium (cross-runtime parity).
- `product-answer-checker.fuzz.test.ts`: 21 Node tests: parser fuzz (adversarial
  input never throws and never grades `correct`, now incl. out-of-bounds/in-bounds
  negative exponents and bare/dangling `pi`) + structural properties
  (factor-permutation and set/union order invariance), §13.8 / §13.10.
- `versioned-answer-checker.test.ts`: 6 Node tests for the cross-version
  isolation above (§13.13).
- Item-bank product pack (`@cr/item-bank`): `product.test.ts` (14, incl. the
  1000-sample `validateTemplates` net over all 12 spine templates + `validateWalkPool`),
  `product-golden.test.ts` (41 Node), `product-golden.browser.test.ts` (18 Chromium).
- Full browser suite: 116 (22 D1 + 76 product spike + 18 product node goldens);
  full unit suite: 482 pass / 2 env-gated skips. `npm run check` and
  `npm run test:browser` green. D1 (v1) node + browser suites unchanged; the v1
  immutability snapshot is byte-identical.

### Still uncleared (deferred)

Per `Answer_Equivalence_Spec.md` **v0.13** (§10, the source of truth), the ONLY
still-uncleared categories are **general equation / inequality equivalence** and
**general trig / log identities** *beyond* the cleared EL.5 expand/condense slice
(and distinct from the specific TRG.1/TRG.2 value/conversion skills cleared
above). These remain unimplemented and return `unsupported_expression`, gating
only the **items** of **EL.6, TRG.4, TRG.8** (lessons never blocked).

Everything else previously listed here as deferred is now **cleared** and
authorable: `is_vertex_form` (POL.5) and `set_builder` (RAT.5 / FUN.4) landed in
spec v0.12, and the §8 graph geometric comparator (POL.5 / FUN.4 / FUN.9 / RAT.5
graph slices) landed in v0.13, alongside `is_standard_form` (LIN.1) and the EL.5
log expand/condense slice. The live diagnostic runtime/scorer is NOT yet wired to
v2 (no Phase-2 items authored into the live scope yet); this checker is additive.
