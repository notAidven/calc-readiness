# The v2 checker's polynomial reading is super-exponential in degree

**Measured 2026-08-04 on the shipped `math` instance in
`packages/shared-components/src/checker-core.ts`.** Found while re-verifying PR #524's failures;
recorded here rather than acted on in full, because the only fix that removes it also changes
what a learner's answer grades as. **That part is a decision for the answer checker's owner
(Anthony, `OWNERS.md`), not for the agent that measured it.**

## What was measured

`compareFactored` and `compareStandardPolynomial` decide value equality by reading a
polynomial's coefficients, and that reading is `math.rationalize(expression, {}, true)`.
Rationalize runs `simplify`'s whole rule set before extracting coefficients, and the cost of
that is super-exponential in the degree of a written PRODUCT rather than proportional to it:

| expression | shape | cost |
|---|---|--:|
| `3*(x - 4)` | one bracket | 19ms |
| `(x + 2)*(x + 3)` | two brackets, degree 2 | 19ms |
| `(x+1)*(x+2)*(x+3)` | three brackets, degree 3 | 22ms |
| `(x+1)^2*(x+2)*(x+3)` | degree 4 | 215ms |
| `-2(x + 5)(x + 4)^2(x - 4)` | degree 4, the key `d4.pol7.build-from-graph.l3` serves | **552ms** |
| `(x+1)^5` | degree 5 | **122,347ms** |
| `(x+1)^6` | degree 6 | **unfinished after a further 58s** |
| `(x+1)*(x+2)*(x+3)*(x+4)*(x+5)` | degree 5 | **unfinished after 270s** |

Each `compareFactored` call reads twice (the submitted spelling and the key) and then reads each
bracket again through `factorIssue`, so a single degree-4 factored answer costs about 1.1s of
CPU.

**`MAX_EXPONENT` is 8** (`checker-core.ts`), so `(x + 1)^5` is inside the grammar the checker
advertises. A learner can type it into any question whose `required_form` is
`fully_factored_over_integers` or `is_standard_polynomial` and hold the checker for two minutes;
`(x + 1)^6` does not come back at all. That is a production hazard in the answer path and not
only a slow test.

## What this did to CI, and why the budget was not raised

`d4.test.ts`'s `every sampled instance of EVERY template self-validates through the v2 product
checker` timed out at 120,000ms on PR #524. The pool it sweeps grew 25 → 35 templates, about
40%, and the natural reading is that the budget should grow with it. It should not, because the
runtime did not grow 40%:

```
old 25 templates, 40 samples each:   2,805ms   (112ms/template)
the 10 added:                       41,965ms  (4,197ms/template)
all 35:                             44,449ms
```

**15.8x, from 40% more templates.** And it is one template, not ten:
`d4.pol7.build-from-graph.l3` alone is 41,639ms of the 41,965ms, because it is the pool's first
degree-4 factored key. Per-template solo timings put every other template in the pool between
0ms and 417ms.

So the budget is untouched. What landed instead is the half that cannot change a verdict:
`polyCoefficients` is a pure function of its string and is now memoized behind a bounded cache,
which removes the duplicate reads inside a single comparison. That took the sweep from 44.6s to
21.8s locally and the whole `d4.test.ts` file from 97.8s to 49.3s — below the 51s it cost before
this PR's templates were added at all. **Measured on the runner rather than extrapolated to it:
the sweep reports 23,237ms in CI (`30928691991`, shard 1) against the same 120,000ms budget it
had blown at 121,315ms.**

**Memoization does not remove the cliff.** It halves a cost that doubles again at every degree.

## The decision this leaves open, and why it is not a speed question

The obvious fix is to stop calling `rationalize` for polynomials and expand them by polynomial
arithmetic, which is quadratic in the degree. A working implementation was written and measured:
it reads `(x + 1)^5` and `(x + 1)^8` in microseconds and agreed with `rationalize` on every
polynomial in `product-checker-fixtures.ts` and on a generated family of two-, three- and
four-bracket products.

**It cannot be landed as a performance change, because it is not one.** `rationalize` on this
instance REFUSES some valid polynomials, and a faster reading answers them:

| expression | `rationalize` | what the comparators return today |
|---|---|---|
| `-(x + 4)^2` | throws `Invalid ^ placing` | `invalid_input / parse_error` |
| `-(x + 4)(x + 4)` | throws `Invalid ^ placing` | `invalid_input / parse_error` |
| `-(x^2 + 3)` | throws `Invalid ^ placing` | `invalid_input / parse_error` |
| `(x + 1)/3` | throws `Invalid + placing` | `invalid_input / parse_error` |

The throw is not a property of the input that could be screened for cheaply: it comes from
`polyToCanonical` rejecting what `simplify` handed it, so `-x^2 + 3` succeeds while
`-(x^2 + 3)` does not, and reducing the exponents to make a cheap probe changes the answer. There
is therefore no composition that is faster AND refuses exactly what is refused now.

So any real fix makes the checker grade answers it currently calls unparseable. Every one of the
four rows above is a correct factored or standard-form polynomial, so the change would be toward
the spec rather than away from it (`docs/Answer_Equivalence_Spec.md`), and §13.13's note that no
product/v2 response exists in production yet means there is no historical verdict to rescore.
None of that makes it a speed fix. **It changes what a learner's answer grades as, which
`OWNERS.md` and `docs/Content_Authoring_Split.md` §11.4 put with the owner of the learning.**

**No key in the bank is affected**, which is worth knowing before deciding: an item whose key
`rationalize` refuses cannot ship, because `validateTemplates` grades every key against the real
checker and would report `scoring_error / invalid_answer_key`. The exposure is entirely on the
submitted side — a learner typing one of these spellings — plus the two-minute hang above.

## 2026-08-10: the owner took it, and what is left is a NAMED CARRY

The reading described below as "the decision this leaves open" landed in the practice answer
sweep, for the reason this document predicted: it was never a speed fix, and it was taken as a
CORRECTNESS fix. `(x + 1)/3` came back `invalid_input / parse_error` on live inverse-function
items, so a learner who divided where they should have multiplied had their answer discarded
instead of marked wrong (`swarm-ledger.md` F3). `readExactPolynomial` in
`product-answer-checker.ts` now reads polynomials by exact rational arithmetic and `rationalize`
is the fallback. All four rows in the table above are read; the ordering was chosen on a
differential run over 2,794 expressions with 0 substantive disagreements, and both conventions
named in point 1 below are preserved deliberately.

**The cliff is narrowed, not closed, and that residue is the carry.** The exact reader stops at
`MAX_READ_DEGREE` (256) and what it refuses still falls through to `rationalize`, whose cost is
unchanged. So the hazard survives at degrees the reader declines: `(((x + 1)^8)^8)^8` is degree
512, and nesting is admitted by the grammar rather than by any bank content.

Written from the evidence already in this file, and deliberately NOT re-measured:

- **122 seconds at `(x + 1)^5`** — the last figure anybody has.
- **Unbounded beyond degree 5.** That is the honest way to write it. `(x + 1)^6` was left running
  for over 140 minutes on 2026-08-10 without returning, and degree 512 is not slow, it is
  intractable. No number is coming, and an agent that goes looking for one will spend a day.
- **Plausibly a grader hang reachable from a learner submission**, which is why it stays open.

Closing it belongs to `MAX_READ_DEGREE` and a refusal — grading an over-degree submission
`invalid_input` rather than handing it to `rationalize` — and that is a verdict change on inputs
no key uses, so it is the owner's call again rather than the next sweep's.

## If the owner takes it

Three things are worth keeping from the measurement, so it does not have to be redone:

1. The walk has to hand back a CONSTANT expression and a polynomial whose LEADING term cancels.
   `rationalize` returns no coefficients at all for `5` (`[]`, not `[5]`) and keeps the written
   degree when the top term cancels (`x - x` is `[0, 0]`, `x^2 - x^2` is `[0, 0, 0]`). Those are
   the only two conventions the two readings disagree about on a polynomial both can read.
2. The differential guard belongs beside the checker with its corpus DERIVED — the fixtures'
   keys and raw answers, plus a generated family of products — and floored on how many
   expressions the fast reading actually answered, since a reading that answers nothing agrees
   with everything. Degree 4 is the last degree where the two can be compared at all.
3. The degrees above 4 cannot be differentially tested, only asserted by value. `(x + 1)^5` is
   `[1, 5, 10, 10, 5, 1]`; that is the whole point of the change and no comparison to
   `rationalize` will finish.
