# Answer-Equivalence Spec (v0.19, NOT yet locked)

*The deterministic rule for what the answer-checker treats as correct. Paired with Mastery_Scoring_Spec: mastery scoring decides how many correct answers mean mastered; THIS decides what "correct" means for a single answer. Referenced by Contracts §4.2. The SAME checker version runs client-side (instant UX) and server-side (authoritative recompute), so both must produce the identical verdict. No runtime LLM: the checker is deterministic code.*

**Status: v0.18, freeze-blocked by category.** The D1 (v1) implementation candidate passes the shared golden suite in Node and Chromium (`D1_Checker_Spike.md`); team review of the fixture coverage and accepted grammar remains before lock. (v0.11 records the owner-ratified D1 `combined_polynomial` + NUM.F change from PR #17 — see the change note below.) The **Phase-2 product checker (version 2)** is now IMPLEMENTED and passes a Node+Chromium spike for radicals/exact constants, univariate factoring structure (`fully_factored_over_integers`), domain-aware `rational_answer` with exclusions, `solution_set`, `interval`, `point`, numeric `precision`, `is_standard_polynomial`, `equation_form:is_slope_intercept`, `positive_exponents` (EXP.1 positive-exponent form), `canonical_exact_trig_value` (TRG.2 special-angle values), and exact radian / `pi`-multiple conversions (TRG.1); those categories are now authorable. **v0.12 (2026-07-23) cleared four deferred ALGEBRAIC categories** (see the dated change note below): `is_vertex_form` (POL.5 vertex-form slice), `set_builder` notation (RAT.5 domain slice, FUN.4 feature intervals), a restricted standard-form linear equation `is_standard_form`, and the log expand/condense identities `is_expanded_log` / `is_condensed_log` (EL.5). **v0.13 (2026-07-23) CLEARS the §8 graph geometric comparator**: region/shading membership is now implemented (was a typed stub), the interactive scored-SVG widget is built and wired into the diagnostic answer/check flow, and a false-positive tolerance battery guards against accepting visually-close-but-wrong graphs; the GRAPH slices of POL.5 / FUN.4 / FUN.9 / RAT.5 are now authorable (see the dated change note below). **v0.14 (2026-07-25) records the owner ratification of the D1 `combined_constants` simplification profile** from PR #56 and wires the one item that needs it (`d1.num-3.l3`) onto it (see the dated change note below); no checker version moved. **v0.15 (2026-07-25) CLEARS the VARIABLE side of the radical category** — variable radicands graded by domain-aware numeric sampling, a variable-aware `simplified_radical`, and `abs` / `|x|` pipe notation — which un-gates **RAD.4** (see the dated change note below); no checker version moved. **v0.16 (2026-07-27) UN-GATES LIN.5 and LIN.6 by correcting a mis-stated gate rather than by adding a checker capability**: their answers are a `solution_set` and an `interval` / `set_builder`, all cleared at or before v0.12, so the "general equation / inequality equivalence" they were recorded against was never what their items needed (see the dated change note below). No checker logic changed and no checker version moved. **v0.17 (2026-07-30) UN-GATES EL.6**, half by the same correction and half by one narrow capability: solving an exponential or logarithmic equation submits a number, a rounded number or a `solution_set` rather than an equation, and `compareSolutionSet` now also grades a roster of **exact symbolic members** (`{ln(2), ln(3)}`) for items declaring `representation: "exact"` (see the dated change note below). Checker source did change, so the version is held at 2 on measured additivity rather than on an untouched file: a 45-verdict baseline over the existing rational rosters plus a bank-wide census that exactly one item opts in. **v0.18 (2026-08-02) records an owner-ratified NARROWING and clears nothing**: a bracketed spelling of a solution set (`[6, 20]` for `{6, 20}`) was being parsed as the roster of its endpoints and graded correct, which is the one confusion LIN.4 and LIN.6 exist to teach against; it now grades `invalid_input/parse_error` (see the dated change note below). `PRODUCT_CHECKER_VERSION` is held at **2** on the NUM.F ratification precedent rather than on additivity, and that note explains why a bump would not deliver its §13.13 guarantee here. **§10 and the cleared-category list are UNCHANGED by v0.18**, so anything citing v0.17 for what is authorable is still current. **v0.19 (2026-08-04) records a WIDENING and clears nothing**: a juxtaposed product written the way a learner writes it (`x(x + 2)` for `x*(x + 2)`) was read by mathjs as a call to a function named `x` and refused as `invalid_input/unsupported_syntax`, which §12 scores as UNANSWERED; the star is now inserted at `prepareRawAnswer` under two conditions that hold it to `invalid_input`, and §11's list of declared canonical readings gains the bracket case (see the dated change note below). Both checker versions are held — `PRODUCT_CHECKER_VERSION` at **2**, `D1_CHECKER_VERSION` at **1** — on the 2026-07-26 symbol-case-fold precedent, which is the same function, the same gate and the same direction of movement. **§10 and the cleared-category list are UNCHANGED by v0.19** as well. Still deferred (uncleared): general equation/inequality equivalence (incl. general trig/log identities beyond the EL.5 expand/condense slice), and free-form bitmap graph scoring (the comparator only ever reads a structured numeric payload). Do NOT begin authoring an item category the relevant spike has not cleared. Rationale: library capability determines which item forms are supportable, so "author now, confirm the checker later" produces expensive rework. No em dashes.

*(Term: a **node** is one measurable prerequisite skill, e.g. `RAT.1`; items are authored per node. Full definitions in PRD §1.5.)*

---

## Owner-ratified change — D1 `combined_polynomial` + NUM.F (2026-07-23)

Under the cross-lane change policy (`OWNERS.md`), **Gabe** (owner of `packages/shared-components` and `packages/item-bank`) has reviewed and **ratified** the D1 answer-checker change that landed via **PR #17** (Anthony's practice-problems lane; the `combined_polynomial` rewrite was folded into the shared `checker-core.ts` as part of that merge). Two behavior changes are now **intended and normative** for the D1 (v1) checker. `D1_CHECKER_VERSION` stays **1** — no rescore, and the v1 D1 assessment forms were **rebaselined** with their immutability snapshot intentionally re-pinned (item-bank provenance note in `packages/item-bank/src/d1/index.ts`).

- **`combined_polynomial` accepts reordered / like-terms-combined forms via structural predicates, not a canonical-text compare.** The profile now returns `not_simplified` **only** when the parsed AST still contains an expandable product (`hasExpandableProduct`) or uncombined like terms (`hasUncombinedLikeTerms`); term *order* is no longer graded. Concrete verdicts (reach the live v2 diagnostic walk, which serves NUM.3/NUM.4): reordered-but-correct answers such as `12 + 3x` for `3x + 12` and `-4 + 8x` for `8x - 4` now grade **correct** (previously rejected as a form miss); genuinely unsimplified answers (`2x + 3x`, an un-distributed `3(x+4)`) still grade **`not_simplified`**. This is deliberately **more lenient**.
- **NUM.F enforces `representation:"fraction"` + `simplification:"reduced_fraction"`.** A NUM.F answer must be a reduced fraction, so `0.75` (decimal → `wrong_representation`), `6/8`, and `10/12` (unreduced → `not_simplified`) now grade **incorrect**; only the reduced form (`3/4`, `5/6`, …) is accepted (`reducedFractionAnswer` in the templates + golden fixtures). This is deliberately **stricter** and is the §1 "reduce 2/4, don't type 0.5" principle applied to live NUM.F items.

Both changes are recorded here as **intended, owner-approved** behavior (not an accidental regression), ratified 2026-07-23 per the owner-approval policy. Spine + product (v2) checker behavior is unaffected.

---

## Owner-ratified change — new simplification profile `combined_constants` (2026-07-24, ratified 2026-07-25)

Added in Anthony's lesson lane (**PR #56**) but landing in the shared `checker-core.ts`, so under the `OWNERS.md` cross-lane policy it needed **Gabe**'s ratification (owner of `packages/shared-components` and `packages/item-bank`) before it was normative. **Gabe reviewed and RATIFIED the `checker-core.ts` change as-is on 2026-07-25**; its logic is unchanged by the ratification and the profile is now normative for the D1 (v1) checker.

The lesson practice item `d1.num-3.l3` ("expand two products") is a NUM.3 item whose canonical answer needs a NUM.4 skill — collecting like terms — that the learner has not been taught yet. Its advisor NPC already told learners they need not combine the variable terms, but `combined_polynomial` graded exactly those answers `not_simplified`. `combined_constants` (§4) resolves the contradiction: the products must still be **distributed** and the plain numbers **combined**, but repeated variable terms are accepted.

**Ratification rationale (why no version bump).** The branch is **provably additive**: it is guarded on `profile === "combined_constants"` and sits immediately before the terminal `unsupported("unsupported_simplification_profile")`, so it is **unreachable for every pre-existing profile string** and no previously authored item can enter it. No pinned snapshot moved and no recorded response replays differently, so nothing is rescored: `D1_CHECKER_VERSION` stays **1** and `PRODUCT_CHECKER_VERSION` stays **2**. Note this is a *different* argument from the one that let `positive_exponents` land without a bump: that profile held `PRODUCT_CHECKER_VERSION` at **2** because **no v2 response exists in production** (§13.13), which is a deployment fact that would stop protecting a change the moment v2 responses are recorded. Additivity is the stronger, durable claim, and it is the one that applies here. Do not cite the two interchangeably.

**Wiring the item (2026-07-25).** As merged, PR #56 added the profile but left `d1.num-3.l3` authored with `expressionAnswer(...)`, which defaults to `combined_polynomial` — so the new profile was **unreachable in production** while the shipped advisor line told learners to submit exactly the answers the grader rejected. `d1.num-3.l3` now uses `combinedConstantsAnswer(...)`. Changing `answer_spec` changes that item's `hashItemDefinition` and therefore its practice-pool entry: that is a deliberate **item-version** change, NOT a checker-version change, and the checker versions above are unaffected. The item is registered in `D1_PRACTICE_ONLY_TEMPLATES`, so it never enters the pinned assessment forms; all five pinned snapshots (`template` / `walk` / `product` / `d2` / `interactive`) are byte-identical.

Covered by **eleven** golden fixtures across two spike items (`spike:num-3:expand-only:v1`, `spike:num-3:expand-only-negative:v1`) running in both Node and Chromium for §13.7 parity, plus end-to-end cases that grade real served `d1.num-3.l3` instances through the real D1 checker. The fixtures pin a negative combined constant (`6x - 4` passes: `flattenAddSub` returns signed terms, so that is one plain number, not two), a `+ 0` tail (rejected: a second plain-number term), and one **known inherited leniency** — a constant left as an unevaluated product (`6x + 7*2`) counts as a single constant and passes. `combined_polynomial` has the identical hole, so this is not a regression the new profile introduced; it is pinned so that narrowing it later is a deliberate, visible fixture change.

---

## Owner-directed change — a juxtaposed product is a product (v0.19, 2026-08-04)

Directed by the product lead. Fourteen served D5 items key a denominator like `(11*x + 8)/(x*(x + 2))`, and the spelling every textbook prints — `(11x + 8)/(x(x + 2))` — graded **`invalid_input/unsupported_syntax`** on all fourteen. §12 scores that as UNANSWERED, so the learner kept their mark, lost the attempt, and was told only "Check the format so the expression can be read"; the one thing on screen naming the star was a key on the `MathKeypad` strip, and `RATIONAL_EXPRESSION_PLACEHOLDER` ("Simplified, e.g. (x+3)/(x+2)") does not contain one. The lead chose to fix the cause rather than reword the line. This is deliberately **more lenient** and is recorded here as **intended, owner-directed** behaviour.

**mathjs already read every other shape of juxtaposition as a product.** `2x`, `2(x + 1)`, `(x + 1)(x + 2)`, `2pi` and `sqrt(2)x` all parse to an `OperatorNode` with `implicit: true`, and §11's list of declared canonical readings already covers the ambiguous ones (`1/2x` is `(1/2)*x`, which is what mathjs does). The single shape it read differently is a **bare identifier immediately before `(`**, which its grammar takes for a function call. §11's list now names that case too.

**Two conditions, and together they are the whole safety argument.** `insertImplicitProductStar` (`checker-core.ts`) inserts the star only where BOTH hold:

1. **the name is not one of the six the grammar can ever call.** `sqrt`, `nthRoot`, `cbrt`, `abs`, `log`, `ln` — the union of every `allowedFunctions` set the two checkers pass to `parseSafeExpression`, plus the graph comparator's. Every one is a fixed string literal in this package and **none is read from item data**, which is why the set can be written down at all. Compared lower-cased, which can only ever decline to insert;
2. **the name is a symbol the ITEM ITSELF declares.** So `f(x)`, `sin(x)` and `g(2)` keep their verdict AND their reason code byte-for-byte. This is also what protects a notation the checker parses with its own reader: `d3.lin4.compound-or.l3` keys `(-inf, 2) U (8, inf)`, where `U` stands immediately before a bracket, and a rewrite gated only on condition 1 would have turned it into `U*(8, inf)`.

`compareRationalAnswer` reads its two-field payload directly and has never reached `prepareRawAnswer`, so the call is wired into that path by name — which is where all fourteen items live.

**Deliberately refused, and the refusals are pinned as hard as the acceptances** (`implicitProduct.test.ts`). `xy` is the dangerous one: mathjs lexes consecutive letters as ONE identifier, so `xy` is the symbol `xy` and grades `unknown_symbol`. Splitting it would be the checker inventing a reading, and it would silently change meaning the day the grammar admits a multi-character variable name — so the bank's declared alphabet (`a b h m n p pi q t u v x y`, all single letters plus `pi`) is asserted by set equality in `implicitProductAdditive.test.ts`, and a two-letter symbol entering the bank fails there. **Space-separated juxtaposition** is left exactly as mathjs already reads it and is not extended: §11 reserves a space between a number and a fraction for a MIXED NUMBER (`1 1/2` is `3/2`), a reading mathjs does not implement, and `math.rationalize` does not normalize `x y` against `x*y` at all — both recorded rather than fixed. A space between a name and a BRACKET is not that case and is covered, because mathjs reads `x (x + 2)` as the same call.

**Additivity, measured rather than argued (§13.13).** 415,182 verdicts over 6,937 items — every served instance plus 16 seeded samples of every practice template, each against a 60-submission battery — graded before and after. **12,490 moved and every one of them had `invalid_input` as its source**: 11,977 to `incorrect/value_mismatch` (the answer now reads, and is judged wrong), 399 to `invalid_input/parse_error`, 113 to `correct/match`, 1 to `incorrect/not_simplified`. `correct -> incorrect` was **0** and `incorrect -> correct` was **0**. The CFU population — 118 rendered asks, 35,431 rows, graded at v1 — moved 6 rows, all `invalid_input/unsupported_syntax` to `incorrect/value_mismatch`, and flipped **no** learner-visible PASS/FAIL. A one-off differential is not a standing guard, so the MECHANISM is pinned instead: a string the rewrite leaves alone reaches the grader byte-for-byte, and every string it changes parses to a call the grammar refuses under every `allowedFunctions` configuration in the package.

**Both checker versions are held, on the 2026-07-26 symbol-case-fold precedent.** That change (`foldSymbolCase`, PR "Stop a phone keyboard's capital from scoring as an unanswered attempt") is the same function, the same `allowed_symbols` gate, the same UNANSWERED-to-real-verdict direction, and it moved neither version and added no note here. This is that change's sibling and takes its ground. Read alongside the three other grounds this document uses: it is not the untouched-file ground (a checker source file changed); it is stronger than the `positive_exponents` deployment ground, which §13.13 limits to changes made while no v2 response exists and which the `√` analysis below already refuses to extend; and it is a weaker form of the `combined_constants` additivity ground, because the movement is confined rather than unreachable. **What it shares with the `√` case is the direction and not the exposure**: a recorded `invalid_input` on a frozen spine node would replay as a real verdict. The `√` note blocked that at option (A) and recommended (C), normalizing at the input boundary. (C) is not available here: the notation strip's removability is measured by re-grading through the checker, three surfaces reach the grader by routes that do not pass `normalizeTextSubmission`, and the two-field rational payload is one of them. So the movement is accepted rather than avoided, on the ground that it can only ever restore an attempt the learner already lost.

**Not fixed here, and named so the next reader does not mistake either for this change's doing.** `math.rationalize` throws `Invalid ^ placing` on a leading unary minus over a power (`-(x + 4)^2`, and now `-x*(x + 2)`) and `Invalid + placing` on a sum over a constant denominator (`(x + 1)/3`); both PARSE cleanly and die inside `rationalize`, so they are a different family from this defect and the `catch` in `symbolicEqual` mislabels them `parse_error`. Those are the 399 rows above: this change makes `-x(x + 2)` reachable and it lands on that second hole. And `compareRationalAnswer` still does not fold symbol case, because it never reaches `prepareRawAnswer` — a one-line addition, left for its own argument.

---

## Owner-ratified change — a bracketed roster is no longer a roster (2026-08-02)

Found in the D3 QA round. `parseValueList` in `product-answer-checker.ts` stripped `[` and `]` **exactly as it strips `{` and `}`**, so a closed interval submitted against a solution-set item was parsed as the roster of its two endpoints: `[6, 20]` graded **`correct/match`** against the key `{6, 20}`. LIN.4 and LIN.6 teach that `[6, 20]` is every number between six and twenty, and LIN.5's own CFU tells the learner to type a set as `{-6, 1}`, so the checker was accepting the one spelling the surrounding lesson exists to distinguish. It now grades **`invalid_input/parse_error`**. This is deliberately **stricter**, and it is recorded here as **intended, owner-approved** behavior rather than an accidental regression, ratified 2026-08-02 per the owner-approval policy.

Three pinned guards had recorded the old acceptance as intended and were corrected with it, and two layers above the checker were generating the bad spelling: `solutionSetForms` (`cfuAcceptedForms.ts`) pushed a bracketed alternative beside every braced roster it built, and `content/lessons/d5/RAT.6.json` authored `"[3]"` by hand. Both are removed, so a CFU no longer accepts an interval spelling of a set by exact-string match — the path that bypasses the checker entirely. EL.6's `[ln(2), ln(3)]` alternate-valid form went with them, which is why the v0.17 EL.6 note below now records that wave's golden cases as 5 correct / 9 rejecting. Measured over every instance `cfuInstances` can serve in every registered domain: 5 roster instances across 4 nodes (LIN.5, POL.3, POL.4, RAT.6) offered the bracketed form, no instance was orphaned by the removal, and no canonical `accepted[0]` was bracketed, so no correct answer became unreachable. Genuine `interval` answers keep their brackets and are asserted to, both ways, in `cfuRosterBracketing.test.ts`.

**`PRODUCT_CHECKER_VERSION` stays 2, and NOT on any of the three grounds this document has used before.** It is not the untouched-file ground: a checker source file changed. It is not the `combined_constants` additivity ground: this narrows a shared roster path every `solution_set` item reaches, which is the opposite of unreachable-for-pre-existing-input. And it is expressly not the `positive_exponents` deployment ground, which §13.13 already limits to changes made while no v2 response exists — absence of a deploy workflow is not evidence of absence of a deployment, and the exposure here is real and named: `prod.lin-1.l2` keys `{x0}` on a spine node with frozen assessment forms, so a recorded `[7]` graded `correct` before this change and is a parse error after it.

The ground is the **NUM.F precedent above**: an owner recording a narrowing as intended and normative, holding the version, rather than rescoring. What makes that the right instrument here rather than a convenience is that a bump would not buy the §13.13 guarantee it exists for. `createProductAnswerChecker` treats `checkerVersion` as a **label**, gated by equality at a single implementation. Bumping to 3 therefore delivers "an old verdict never silently flips" only if `product-answer-checker.ts` is forked so that version 2 goes on reproducing the defect for replay. Left unforked, version 2 either points at the fixed checker, so the bump changes nothing, or goes unregistered, so every historical v2 response replays as `scoring_error/checker_version_unsupported` — which §6 says invalidates that response for review, and which is strictly worse for the learner than the flip it was meant to prevent. The cost of the bump is thus a permanent second grader whose only distinguishing behaviour is a defect the lesson content contradicts.

**Do not read this as a general licence to hold the version through a narrowing.** It is the narrowest of the four grounds and the only one that rests on a judgement rather than a measurement, so it is the owner's each time and does not generalise from this entry. A narrowing that is worth preserving under an old version — one where the old verdict is defensible rather than a defect — still owes the fork and the bump.

---

## EL.6 UN-GATED (v0.17, 2026-07-30) — a mis-stated gate, plus one genuine capability

**Two separate things were wrong, and only one of them needed code.** §10 listed EL.6 (solve exponential and logarithmic equations) against **arbitrary equation equivalence**, the same never-planned general-CAS category that held LIN.5 and LIN.6 until v0.16. Read against the checker, that category is only reached when the *answer* is itself an equation (`compareExpressionSymbolic`, or `equation_form` outside its two cleared families). Solving `2^x = 8` submits **`3`**. So the answer shapes EL.6's items actually ask for are `numeric`, `precision` and `solution_set`, all three cleared at or before checker version 2, and most of the node was authorable already. That is the v0.16 lesson applying a second time to the same table.

**The one real gap, and it was narrow.** `compareSolutionSet` evaluated each roster member through `evalExactNumber` -> `evaluateNumeric` -> `parseSafeExpression` with **no allowed functions**, so a member spelled `ln(2)` failed `unsupported_syntax`. That closed off the shape EL.6 most needs to teach: an equation quadratic in `e^x`, whose roots are `ln 2` and `ln 3` and have no finite decimal spelling. A rounded answer is not the same claim as an exact one, so asking for the exact roster is the point rather than a preference.

**What was added, and how it is gated.** `compareSolutionSet` now evaluates members through `log`, `ln` and `sqrt` **when, and only when, the ITEM declares `representation: "exact"`**. This is the radical wave's additivity pattern with a different field: capability keyed off item metadata, so an item that does not opt in reaches byte-identical code. Three details are load-bearing:

- **`LOG_SCOPE` is deliberately NOT reused.** It binds `log` and `ln` both to `Math.log`, which is right for EL.5's base-independent identities and wrong here: a roster is specific numbers, so `log 2` (0.301) and `ln 2` (0.693) must differ. The exact-roster scope binds `log` to `Math.log10` and `ln` to `Math.log`, and a near-miss fixture pins it from **both** sides, with a common-log key as well as a natural-log one.
- **`representation` is honoured on this path** via the existing `representationIssue`, so a decimal approximation of an exact root grades `wrong_representation` rather than a confusing `value_mismatch`. Same rationale as `comparePiExact`'s: a learner who wrote `0.693` did the mathematics and not the notation, and the two mistakes should not read alike.
- **`precision` stays unread on solution sets.** An item wanting a rounded root stays a single-answer `precisionAnswer`, which already worked. Per-member precision is out of scope.

**Evidence (real checker, both runtimes).** Three spike items declare `representation: "exact"` (a natural-log roster, a `sqrt` roster and a common-log roster) and carry **14 golden cases**: 5 grade `correct/match` (the key, the order swap, the padded spelling, the radical pair and the evaluated common log), and 9 reject with their authored code — 2 `incomplete_solution_set`, 1 `extra_solution`, 3 `value_mismatch`, 1 `wrong_representation`, 1 `invalid_input/unknown_symbol` for a member naming a symbol this scope does not bind, and 1 `invalid_input/parse_error` for the interval bracketing. `product-answer-checker.test.ts` and its Chromium twin both consume `PRODUCT_GOLDEN_CASES`, so §13.7 parity is by construction: **353 tests pass in Node across the four checker suites, 142 in Chromium.** Five EL.6 node goldens under `packages/item-bank/src/product/nodes/EL.6/` grade the five shipped practice shapes through the same comparator.

**Additivity, measured rather than argued (§13.13).** A checker source file *was* modified this time, so "no file was touched" is not available as the ground for holding `PRODUCT_CHECKER_VERSION` at **2**. Two assertions stand in its place, and both were proved by forcing them false:

- `RATIONAL_ROSTER_BASELINE` (45 pinned verdicts, `product-answer-checker.additive.test.ts`) grades every existing rational roster — LIN.1's and LIN.5's, including symbolic submissions that must stay **refused** for a non-exact item — and pins the verdict and reason code each returns. Removing the `representation` gate turns the refusals into acceptances and the baseline fails at them.
- A **bank-wide census** (`packages/item-bank/src/d8.test.ts`) filters every `solution_set` item in every bank by `representation` and asserts that exactly one, `d8.el6.exp-quadratic.l3`, declares `"exact"`. That is what makes "every other roster item takes the old path" a fact about the bank rather than a claim about the diff, and it fails if a second item quietly opts in.

**False-positive battery (§13.16-style, voluntary here).** §13.16 obliges a battery only where equality is decided by sampling; an exact roster is decided by exact evaluation at a fixed scope, so this one is voluntary for the same reason LIN.5's was: the confusable spellings sit right next to the right answer. `EXACT_ROSTER_FALSE_POSITIVE_CASES` (13 cases, `product-answer-checker.falsepos.test.ts`) submits the log/ln base confusion in both directions, the rounded decimal at several precisions, the intermediate substitution values a learner stops at when they forget to convert back through the logarithm, and rosters short or long by one member. None grades `correct`; 8 read `value_mismatch`, 3 `wrong_representation` and 2 `incomplete_solution_set`, which keeps a notation slip separable from a solving error under `misconception_tags.by_reason_code`.

**Still deferred, named precisely so this does not get re-broadened.** Symbolic roster members beyond `log` / `ln` / `sqrt`; per-member `precision` on a solution set; and **submitting an equivalent EQUATION**, which is the residual `equation_form` / general-equivalence category and which nothing in EL.6 asks for. TRG.4, TRG.8 and TRG.9 stay gated on trig identities this change does not touch.

**§10 is the spec owner's to ratify.** The gate table below has EL.6 struck from it on the evidence above, in the same shape as v0.16's LIN.5 / LIN.6 correction. Flagged for Gabe in the PR.

---

## LIN.5 / LIN.6 UN-GATED (v0.16, 2026-07-27) — the gate was mis-stated, not narrowed

**The recorded gate description was wrong, and it was wrong in the expensive direction.** LIN.5 (absolute-value equations) and LIN.6 (absolute-value inequalities) were listed in §10 and in `Content_Authoring_Split.md` §4.4 as blocked on **general equation / inequality equivalence** — a general-CAS category this spec has deferred since v0.8 and has no plan to build. On that description their items were unauthorable indefinitely. In fact **neither node ever needed that category**, and no checker code was written to un-gate them.

**Why.** The deferred category is about the checker being handed an EQUATION or an INEQUALITY as the *answer* and having to decide whether it is equivalent to another one. That is not the answer an absolute-value item asks for:

- An absolute-value equation has **two** solutions, so its answer is a **`solution_set`** — the type §2 introduced specifically so that "solve x²=4" is never conflated with the equation itself. Cleared in checker version 2. LIN.5's own prereq LIN.1 already answers this way (`prod.lin-1.l2` keys `{x0}`); LIN.5 keys `{-2, 8}` instead of `{3}`.
- An absolute-value inequality's answer is an **`interval`**, or a **union** of two rays when the inequality points outward. Cleared in checker version 2, unions included. LIN.6's own prereq **LIN.4** was un-gated on exactly this ground, and LIN.6's answers have the identical shape.
- The absolute-value bars appear only in the **prompt**, which is KaTeX text the checker never parses. So the v0.15 limitation that keeps `abs` out of the general expression grammar cannot reach these nodes. It reaches **FUN.10**, whose answer *is* an expression containing `abs`, and FUN.10 stays gated on that.

This was already half-recorded: a 2026-07-26 aside in §10 said an absolute-value equation answering as a `solution_set` "is already gradeable by categories cleared in v0.12/earlier". That aside contradicted the gate table three lines above it, and the table won every time anyone read the doc. The table is now corrected so the two agree.

**What was actually missing was one authoring primitive, not a checker capability.** `packages/item-bank/src/template.ts` had `solutionSetAnswer` and `setBuilderAnswer` but **no `intervalAnswer`** — the plain-interval-notation `AnswerSpec` had no helper, and no authored item in the bank had ever used that path (`setBuilderAnswer` reaches `compareSetBuilder`, a different comparator). An author reaching for LIN.6 would have had to hand-write all eight `AnswerSpec` fields, which §13.3 requires be explicit and which is exactly what the helpers exist to get right. `intervalAnswer()` is added, and it records the three input limits measured against the real checker rather than assumed: the union join must be whitespace-delimited (`(-inf, -2) U (8, inf)` parses, `(-inf,-2)U(8,inf)` does not), infinity is spelled `inf` or `infinity` (`oo` is not a token), and the empty solution set has no interval spelling, so a no-solution inequality must be asked as `solutionSetAnswer("{}")`. All three fail CLOSED as `invalid_input` (unanswered per §12, never a wrong answer), so they are authoring guidance, not grading risk.

**Evidence (real checker, both runtimes).** Eight golden fixtures, four per node, in `packages/item-bank/src/product/nodes/LIN.{5,6}/`, graded through the real v2 checker by `product-golden.test.ts` and its Chromium twin for §13.7 parity. They cover the two-branch equation, a coefficient inside the bars, the degenerate single-root case with a fractional key, no-solution, the `<` interval, the `>` union, the `<=` closed interval, and the set-builder spelling. Every key and every alternate-valid form grades `correct` (including a union written in the other order, joined with `or` or `∪`, spelled `-infinity`, and with an endpoint left as the unevaluated fraction `-6/3`); every one of the 25 near-misses grades `incorrect` with its exact authored reason code. These fixtures carry **no walk template**, so no frozen form and no pinned hash moves: all seven item-bank snapshots are byte-identical.

**False-positive battery (§13.16-style, voluntary here).** §13.16 obliges a battery only where equality is decided by SAMPLING, and neither of these categories is: a `solution_set` is an exact rational roster and an `interval` is exact endpoints plus inclusivity flags, both proofs rather than evidence. A battery is still owed for a different reason, and `ABSOLUTE_VALUE_FALSE_POSITIVE_CASES` (28 cases, `product-answer-checker.falsepos.test.ts`) supplies it: the two shapes these nodes exist to distinguish are **neighbours**, solved by identical arithmetic and differing only in whether the result is one interval or the union of two rays. Every case submits one neighbour against the other's key. The AND/OR confusion is rejected in **both** directions; solving one branch of an equation reads `incomplete_solution_set` and dropping one ray reads `value_mismatch`; a right set with wrong brackets reads `wrong_bound_inclusivity`, kept distinct from a wrong set so `misconception_tags.by_reason_code` can tell a form slip from a solving error; and swapping the shapes across nodes (a solution set submitted to an interval item, and the reverse) fails closed rather than being coerced.

**Versioning.** `PRODUCT_CHECKER_VERSION` stays **2** and `D1_CHECKER_VERSION` stays **1**, on the strongest possible ground: **no checker source file was modified.** The change is one new item-bank helper plus fixtures and tests, so no recorded response can replay differently under §13.13 by construction.

**Still gated for absolute value, and named precisely so this does not get re-broadened.** Only the **`equation_form`** answer shape — an item that asks the learner to submit the compound statement itself (`x - 3 = 5 or x - 3 = -5`) rather than its solution set — plus **FUN.10**'s `expression` answer containing `abs`. Neither is needed to author LIN.5 or LIN.6, and an author who wants the compound-statement shape should ask for the solution set instead. This is the same move D7 already makes to stay inside cleared categories (`d7.test.ts`: a line is asked for as the right-hand side of `y = ...` and graded as an expression, "because general two-sided equation equivalence is not a cleared category").

**Follow-up in `apps/web` — ✅ BOTH DONE (2026-07-28, `cursor/placeholder-syntax-examples-25ed`).** Two learner-facing surfaces had no branch for the interval category, and both now do, ahead of LIN.6 items shipping. `practicePlaceholder` returns `INTERVAL_PLACEHOLDER` (`Interval, e.g. (-inf, 2] U (7, inf)`) for an `interval` answer type, which surfaces every input limit measured above that a LEARNER can hit, in one union: infinity is `inf` and takes a sign, the union is whitespace-delimited, the bracket carries the inclusivity and is chosen per END rather than per interval, and an infinite end cannot take a square bracket. The third limit above is not on that list because it is not a learner's to know — an empty solution set has no interval spelling at all, so the item is authored as `solutionSetAnswer("{}")` and this placeholder is never the one on screen for it. `missNote` has a `wrong_bound_inclusivity` branch (`BOUND_INCLUSIVITY_NOTE`), driven end-to-end through this checker rather than off the code name: a `[-3, 7]` key submitted as `(-3, 7)` is graded here and the note is keyed off the verdict that comes back. All three advertised interval forms — the union and each ray on its own, since a learner with a one-ray answer copies one ray — are graded through the real v2 comparator in `answerFormat.test.ts`, so the guidance cannot advertise a spelling this checker refuses (`oo` is not offered, and an unspaced `U` is not either). No checker source file was touched, so `PRODUCT_CHECKER_VERSION` stays 2.

---

## RESOLVED — the `√` (U+221A) glyph (2026-08-18)

**Option C shipped on 2026-08-18.** `canonicalizeRootGlyphInput` runs at the input boundary, before the value becomes `raw_answer`. Both local grading and persisted submissions therefore receive the same canonical string, and the authoritative scorer replays that string without needing a second server normalizer. No checker source or checker version changed.

The conversion is deliberately narrow: unambiguous forms such as `√2`, `5√2`, `√(2*x)`, and `√(2)x` become `sqrt(2)`, `5*sqrt(2)`, `sqrt(2*x)`, and `sqrt(2)*x`. Ambiguous or incomplete forms such as `√2x`, `√x`, `√`, unmatched groups, and empty roots are left unchanged so the existing checker fails closed. Unit, shared `MathInput`, graded-practice, infinite-practice, syntax-guidance, keypad, and browser placeholder-fit tests cover the boundary.

The historical decision analysis below is retained because it explains why the checker itself remains untouched.

### The gap, verified

The shared text checker has **no U+221A handling anywhere** — a search of `packages/` returns zero occurrences of the glyph, in any file. What does exist:

- `content/lessons/d2/RAD.1.json`'s CFU `accepted` list contains `6√2/5`, `6*√2/5` and `(6√2)/5`; `content/lessons/d2/RAD.2.json`'s contains `√10`, `1*√10` and `1√10`. These are graded by exact accepted-list string match (`normalizeAcceptedAnswer`: trim, lowercase, strip whitespace) and **never reach the checker**.
- A PRACTICE item on the same node does reach the checker, so the identical keystrokes are refused there.
- `RADICAL_PLACEHOLDER` therefore advertises only `5*sqrt(2)`, and `answerFormat.test.ts` asserts that it and `VARIABLE_RADICAL_PLACEHOLDER` do **not** contain `√`. The inconsistency is deliberate and documented; it is not an oversight.

So the learner-visible defect is real: every lesson widget and KaTeX prompt draws the root as `√`, a learner copies it, and CFU accepts while practice refuses.

### Which recorded responses would grade differently

The honest answer is **"we cannot establish that none would, and two independent blockers make it worse than the v0.15 note said."**

1. **RAD.1's frozen assessment.** Teaching the checker `√` turns a currently-refused input into an accepted one. RAD.1 is one of the 12 authored-and-validated spine nodes, it exists on `integration`, and its assessment forms are FROZEN. A recorded response of `2√2` on `prod.rad-1.l2` would flip from `invalid_input` to `correct` — a §13.13 rescore, not a free addition.
2. **The natural implementation point is shared with the LOCKED v1 checker.** Glyph normalization belongs in `checker-core.prepareRawAnswer`, which is called by `d1-answer-checker.ts` as well as `product-answer-checker.ts` (16 call sites across the two). So the blast radius is not just RAD.1 in the v2 generation; it includes the six shipped D1 MVP nodes graded by `D1_CHECKER_VERSION` **1**, which is locked. This second blocker was not spelled out before and is the more serious of the two.
3. **The "no production response exists" precedent does not transfer.** `positive_exponents`, the graph category, and the `expr_builder` base normalization each rested on a **node-scoped** deployment fact — the `expr_builder` one reasoned explicitly that "RAD.3 does not exist on integration". RAD.1 does exist on integration, so that leg is simply unavailable. The only remaining leg is the blanket claim that nothing is deployed, and the repo does not positively establish it: `assessment_item_response` ships in migrations 0001-0003, the CDK stack is defined (`infra/lib/calc-readiness-stack.ts`), and the sole GitHub workflow is `invariants.yml` with no deploy job. **Absence of a deploy workflow is not evidence of absence of a deployment**, and no document states the system is undeployed. Under §13.13 that is not good enough.

### Whether `PRODUCT_CHECKER_VERSION` would need to bump, and what it costs

It would, for the v2 side (and `D1_CHECKER_VERSION` for the v1 side, which is locked and therefore a much larger conversation). The cost, measured rather than assumed:

- **Pre/post comparability is NOT affected. The claim held.** Both gates — `comparabilityStatus` in `engines/diagnostic/src/measurement.ts` and in `coverage-measurement.ts` — compare exactly three things: `blueprint_version`, `scoring_model_version`, and `form_id` (counterbalancing). **Neither reads `equivalence_checker_version`**, so bumping the checker version cannot make a pre/post pair `not_comparable`. Verified by reading both functions, not inferred.
- **The real cost is generation maintenance.** `createVersionedAnswerChecker` routes each request by the response's own recorded `equivalence_checker_version` and fails closed on an unknown one. So a bump means version 2 must stay registered and maintained forever to replay existing responses, every authored item has to be re-pointed at version 3, and the golden/additive suites fork per generation. That is the same permanent overhead the v0.15 note was trying to avoid, and it buys only the glyph.
- **A bump does not even fix the whole defect**, because the CFU path does not consult the checker at all. The CFU-versus-practice inconsistency would still need the accepted-lists and the checker kept in sync by hand.

### What it would unblock

The known QA finding that RAD.1/RAD.2 CFUs accept notation their own practice items reject. That finding cannot be fully closed while the two paths disagree, and it is a genuine "correct student marked wrong" case, which is the class of bug the D2 QA pass treated as release-blocking.

### The three options, and the recommendation

- **(A) Teach the checker `√`.** Blocked. Requires a rescore judgement under §13.13 that the repo cannot support, and lands in code shared with the locked v1 generation.
- **(B) Bump the checker version and teach it `√`.** Legal, and comparability survives, but it buys one glyph at the price of maintaining two checker generations forever, and still leaves the CFU path unsynchronized.
- **(C) RECOMMENDED — normalize `√` at the INPUT BOUNDARY, leaving every checker byte-identical.** `MathInput` (`packages/shared-components/src/math-input.tsx`) holds the `rawAnswer` state and is the single place a learner's keystrokes become a `raw_answer`. Rewriting `√` to `sqrt(...)` there means the string that reaches the grader is already the notation it accepts, and **the checker remains a pure function of (raw answer, item) that nobody has touched** — so no recorded response can replay differently no matter how many exist, and §13.13 is satisfied **by construction rather than by a deployment fact**. No version moves, on either generation. This is also the canon §11 already declares for exactly this class of problem: "the math-input component emits a canonical AST, not raw keyboard strings, so precedence is fixed at entry." The glyph is the same kind of entry-time ambiguity as precedence.

Option C owed two proofs before shipping. First, scope must be unambiguous: `√2` is `sqrt(2)`, while `√2x` is refused instead of guessing between `sqrt(2)*x` and `sqrt(2*x)`. Second, normalization must happen on the value that becomes `raw_answer`, not only on the local-checker copy. The shipped implementation satisfies both: `MathInput` grades and emits the canonical value, `normalizeTextSubmission` applies the same shared helper on practice surfaces, and the server replays the already-canonical persisted value.

---

## Variable radicands + absolute value CLEARED (v0.15, 2026-07-25) — un-gates RAD.4

The 2026-07-25 D2 QA pass found a hole nobody had noticed: the v2 checker could not grade a radical answer containing a **free variable** at all. Three independent blockers, all now closed. **RAD.4** (variable radicands, `sqrt(x^2) = |x|`, even-root domain restriction) was ITEM-GATED on exactly this and is now **authorable**; `Content_Authoring_Split.md` §4.4 is updated to match.

1. **Free variables never evaluated.** `compareRadical` judged value with a single scope-less `evaluateFloat`, which throws on any free variable. Measured against a key of `x^2*sqrt(x)`: the correct answer, the unsimplified `sqrt(x^5)`, and the plainly wrong `x^3` **all** returned `invalid_input` / `parse_error` — correct and incorrect were indistinguishable and the node would have failed closed on every response. Value is now decided by **domain-aware multi-point sampling** (`packages/shared-components/src/domain-sampling.ts`).
2. **`simplified_radical` was blind to an unsimplified variable radicand.** `radicalNotSimplified` ran its perfect-power test only when the radicand was a `ConstantNode`, so `sqrt(x^5)` graded as *simplified* — the exact predicate the node exists to teach. It now decomposes a product radicand into factors and flags an extractable variable power (see the canonical form in §4).
3. **`abs()` was outside the grammar and `|x|` did not parse.** The product checker's radical grammar was `{sqrt, nthRoot, cbrt}`, so `abs(x)` graded `unsupported_syntax` and an `abs(x)` answer KEY graded `invalid_answer_key` — the checker could not even *state* RAD.4's answer. `abs` joins the variable-radical grammar and `|expr|` is rewritten to `abs(expr)` before parsing.

### The sampling methodology (§9 fallback, extended)

Radicals are not rational functions, so `rationalize` cannot decide `sqrt(x^5)` vs `x^2*sqrt(x)`. Equality is therefore judged by **evaluating both sides at a fixed battery of probe points and requiring agreement**:

- **Points.** 23 fixed values (a prime count, so the multivariate strides below visit every offset): 15 positive and 8 negative, with both signs represented on **both sides of 1** (e.g. `0.13 … 0.91`, `1.19 … 7.83`, `-0.17 … -0.89`, `-1.23 … -5.71`). All are non-integer, all nonzero, and none is ±1, so distinct powers and radicals cannot coincide by accident and no negative exponent divides by zero. Both sides of 1 matter because powers and radicals **order differently across 1** (for 0<x<1, `sqrt(x) > x^2`; for x>1, `sqrt(x) < x^2`), so a battery drawn only from (1, ∞) would let some near-misses hide.
- **Why the battery MUST straddle zero.** This is the correctness requirement, not a nicety. On the positive half alone, `x`, `abs(x)` and `sqrt(x^2)` are **identical to the last bit** — so a positive-only sampler would grade `x` CORRECT against a key of `sqrt(x^2)` and destroy the single distinction RAD.4 exists to teach. The negative probes are what reject `x`. This is pinned by a counterfactual test (`domain-sampling.test.ts`, "why positive-only sampling would be wrong") that asserts the positive-half agreement explicitly, so nobody can "simplify" the battery later without the test spelling out what breaks.
- **Domain-awareness (derived, never assumed).** An even root of a negative radicand is not real, so `sqrt(x^5)` is samplable only at x >= 0. Rather than assume a domain, the legal domain is **read off the expression**: a point is in the domain exactly when evaluating there yields a finite real JS number. (The float mathjs instance returns a `Complex` for `sqrt(-4)` and `Infinity` for `1/0`; both fail that test, so the domain falls out of the evaluation itself.) A point where **both** sides are undefined is skipped as a shared domain exclusion; a point where **exactly one** is defined is a real difference between the functions — this is what rejects `x^3` for a key of `sqrt(x^5)` and `abs(x)` for a key of `cbrt(x^3)`. An **odd** root needs no absolute value and is sampled across the whole line, so `cbrt(x^3) = x` is accepted while `abs(x)` is not.
- **Tolerance.** `1e-9`, via the shared `floatEqual` (absolute below 1, relative above). That sits ~7 orders of magnitude above the ~1e-16 relative error a double-precision radical evaluation accumulates, so it never produces a false negative, while staying far too tight for two genuinely different expressions to satisfy at **every** probe point.
- **Multivariate.** Symbol *i* reads the table at `(sample + i*stride) mod 23` for two different strides (7 and 11), so a two-symbol pair is probed at 46 distinct tuples rather than along the diagonal x=y — where `sqrt(x)*sqrt(y)`, `sqrt(x*y)` and `abs(x)` would all agree.
- **Determinism.** The points and strides are hard-coded tables; there is no RNG anywhere, so a given (submitted, key) pair grades identically on every call, in every runtime (Node and Chromium, §13.7), and independently of call order. Pinned by test.
- **Fails CLOSED.** Every evaluation is wrapped: a throw, a complex result, a NaN or an infinity is treated as "undefined here", never as agreement. A key that is real-defined at NO probe point is `invalid_answer_key` (`scoring_error`, an authoring fault). If the two sides share fewer than **3** defined points, the comparison refuses to ACCEPT on that thin evidence and returns `insufficient_domain_samples` (`invalid_input`, treated as unanswered per §12). Rejection needs no minimum: one disagreement is decisive. No exception escapes the module.

### Known limitations (deliberate, and safe in one direction)

- **Only a product radicand is decomposed** for the form check. A radicand that is a SUM (`sqrt(x+1)`), a QUOTIENT (`sqrt(x^3/y)`), or a power of a product (`sqrt((x*y)^2)`) is not analyzed and so is not flagged `not_simplified` — exactly as the pre-existing constant path declines to analyze what it does not recognize. Value equality is enforced independently, so an unanalyzed form can only ever be too LENIENT about form, never wrong about value.
- **Sampling is evidence, not proof.** Two different functions could in principle agree at all 23 points. This is the only equality decision in the checker not made by exact arithmetic or a structural predicate, so it carries a dedicated **27-case false-positive battery** (`product-answer-checker.falsepos.test.ts`, modelled on the graph comparator's) covering sign errors, off-by-one exponents, wrong coefficients, wrong indices, missing and spurious absolute values, dropped factors, and radicals distributed over the wrong operation.
- **Pipe notation supports only NON-NESTED pairs.** Pipes have no distinct open/close glyph, so `|a|b|c|` genuinely reads as either `abs(a)*b*abs(c)` or `abs(a*abs(b)*c)`. The rewriter accepts an even number of pipes paired left to right, each pair non-empty, with consecutive pairs joined by an **explicit** operator; everything else is refused with `unbalanced_pipes` or `ambiguous_pipe_notation` rather than guessed. `|x| + |y|`, `2|x|`, `sqrt(|x|)` and `|x|2` are accepted; `|x||y|`, `|a|b|c|` and the nested intent `|x + |y||` are refused.
- **Strict real-domain equality.** `sqrt(x)*sqrt(y)` and `sqrt(x*y)` are different functions over the reals (the second is defined when both arguments are negative), so they do not compare equal. That is mathematically right, but an author who intends a nonnegative domain must key the item in the form they want.
- **`abs` is confined to the radical category.** `compareExpressionSymbolic` still parses with an empty function grammar, so a general expression answer containing `abs` (e.g. FUN.10's `abs(x-2)+3`) remains `unsupported_syntax`. Extending it is a small follow-up, deliberately left out here to keep the additivity proof below airtight.

### Versioning: `PRODUCT_CHECKER_VERSION` stays 2, `D1_CHECKER_VERSION` stays 1

Per §13.13 ("a checker-version bump never silently flips an old verdict"), the question is whether any RECORDED response could replay differently. It cannot, and on the **strong, durable** ground rather than the weak one: the change is **provably additive**.

The entire wave sits behind ONE gate — **the ITEM declares `allowed_symbols`**. `radicalAnswer()` and `exactTrigValueAnswer()` author every radical and exact-trig item in the bank and neither emits `allowed_symbols`, so no existing item can reach the pipe rewriter, the widened grammar, or the sampler. The gate is a property of the item, not of the submitted string, so nothing a student types can flip it. `compareRadical` dispatches to a separate `compareConstantRadical` that is the pre-existing path byte for byte.

**Evidence.** Grading a 49-input constant-radicand corpus (including `abs(9)`, `|9|`, `sqrt(-4)`, `1/0`, malformed input and adversarial input) against all three pre-existing radical/trig spike items with BOTH this checker and the one on `origin/integration`: **147/147 verdicts byte-identical**, and **111/111** pre-existing golden cases byte-identical. That differential is preserved as a pinned baseline table in `product-answer-checker.additive.test.ts`. All five item-bank snapshots are byte-identical. This is the same argument that let `combined_constants` land without a bump, NOT the weaker "no v2 response exists in production" deployment fact (see the 2026-07-24 note above; the two are not interchangeable).

**The `√` (U+221A) glyph gap was intentionally not addressed by this checker change.** It was later resolved on 2026-08-18 at the input boundary as documented above. This distinction matters: teaching the checker to parse `√` would have changed grading for **RAD.1**, a frozen shipped-spine assessment, while canonicalizing before persistence leaves every checker byte-identical and gives client and authoritative replay the same `raw_answer`.

---

## Deferred algebraic categories cleared (v0.12, 2026-07-23)

The item authoring for the 30 remaining non-spine nodes moved to Anthony, but that authoring VALIDATES against this checker, so the deferred checker categories were the critical-path dependency blocking ~5 wave-2 expansion nodes. This wave clears the tractable ALGEBRAIC categories in the product (v2) checker (`product-answer-checker.ts`), each with golden fixtures (valid / alternate-valid / near-miss) and Node+Chromium parity tests. `PRODUCT_CHECKER_VERSION` stays **2** (no v2 response exists in production, so nothing is rescored, §13.13); each category fails closed on unsupported input.

- **`is_vertex_form`** (required_form, §5): `a(x-h)^2 + k`, constants combined. Value equality is judged by the multi-point numeric identity (robust: mathjs `rationalize` throws on a bare leading unary minus like `-(x+2)^2`, common for downward parabolas), and the FORM by a structural AST check, so a value-correct STANDARD form grades `not_vertex_form`. **Unblocks the POL.5 vertex-form algebraic slice.**
- **`set_builder`** (required_notation, §1/§2): `{x | <condition>}` for a domain or inequality solution. The condition (single comparison, chained double bound, `!=` exclusion, `and`/`or`, "x in R") is normalized to interval(s) and compared with the interval machinery; a non-set-builder answer (e.g. interval notation) is graded `wrong_notation` because the notation is the skill. **Unblocks the RAT.5 domain slice and the FUN.4 increasing/decreasing/feature-interval slice.**
- **`is_standard_form`** (equation_form required_form, §2/§5): a restricted linear standard form `Ax + By = C` with integer coefficients, positive leading coefficient, primitive (gcd 1), constant on the right. This completes the "standard, slope-intercept" target-form family named in §2; general equation equivalence stays deferred. **Supports LIN.1 standard-form authoring and the line side of graph items.**
- **`is_expanded_log` / `is_condensed_log`** (required_form, EL.5): the log product/quotient/power expand/condense slice. Value equality is a base-independent numeric identity over the positive domain (`log`/`ln` bound in the eval scope, mirroring how `pi` is bound for TRG.1); the FORM is an AST predicate (expanded = no log of a product/quotient/power; condensed = a single logarithm). **Unblocks EL.5 (log properties).** General logarithmic and trigonometric identities beyond this slice stay deferred (§10).

New `reason_code`s: `not_vertex_form`, `not_expanded`, `not_condensed` (plus reused `value_mismatch`, `not_simplified`, `wrong_form`, `wrong_notation`, `wrong_bound_inclusivity`). The §8 graph geometric comparator core also landed as a tests-backed SPIKE this wave (`Graph_Comparator_Spike.md`) but the graph category stayed gated (widget + region/shading scoring outstanding) until v0.13 (below).

---

## Graph category CLEARED (v0.13, 2026-07-23)

The §8 geometric graph comparator's follow-up plan (`Graph_Comparator_Spike.md`) is done, so the **scored graph category is now CLEARED** and the GRAPH slices of the wave-2 nodes are authorable. `GRAPH_COMPARATOR_VERSION` stays **2** (same generation as the product text checker; no v2 graph response exists in production, so nothing is rescored, §13.13). A graph answer is still a structured numeric payload (samples / points / scalars / region memberships, NEVER a bitmap) scored by `createGraphComparator` — never the text checker (`product-answer-checker.ts` still returns `graph_uses_geometric_comparator` for a `graph` `answer_type`, by design).

- **Region / shading membership implemented** (was a typed stub that failed closed). A `region` feature declares author-owned ground-truth probe memberships `{point, inside}`; the widget reports the student's inside/outside call at the SAME probe coordinates; the comparator checks boolean agreement at every probe (no tolerance — a probe is chosen to be unambiguously in or out). This covers linear-inequality (half-plane) **shading** and rational/polynomial **sign regions**. Reason codes: `region_mismatch` (a probe disagrees), `region_missing` (the region is unanswered), `region_incomplete` (a probe went unreported). A `region` feature declared with **no probes** is an unsupported descriptor and **fails closed** as an authoring reject (`region_no_probes` / `region_missing_label` / `region_invalid_probe`, all `scoring_error`), so nothing silently passes.
- **Interactive scored-SVG widget built** (`GraphInput`, `packages/shared-components`) and **wired into the diagnostic answer/check flow** (`apps/web/src/diagnostic/GraphProbe.tsx`, reached with `?graph`), over the SAME injected-checker seam `MathInput` uses. It is handed an ANSWER-FREE workspace (`toGraphWorkspace` strips the reference curve, the feature coordinates, and the region truth) so the client never holds the answer key. It is keyboard-accessible (native number fields for coordinates + scalars, a toggle per region probe, arrow-key-nudged on-plane markers).
- **False-positive tolerance battery** (`graph-comparator.falsepos.test.ts`, Node + Chromium): feeds slightly-off curves, wrong/missing features, wrong regions, and just-past-tolerance near-misses and asserts the comparator REJECTS each with the correct reason code — the §8 false-positive-risk guard, proving no visually-close-but-wrong graph is accepted.
- **Node-unblock mapping (authored + validated GRAPH slices, `packages/item-bank/src/graph/`, `validateGraphPool`):** **POL.5** (plot a parabola: curve + vertex + both x-intercepts + y-intercept), **FUN.9** (graph a transformation g(x)=(x+3)²−2: curve + vertex + y-intercept), **RAT.5** (graph 1/(x+1)+2: curve across the asymptote + vertical + horizontal asymptote scalars), **FUN.4** (read features off a graph + shade the region where f(x)≥0: points + region membership). Each slice ships >=2 alternate-valid and reason-coded near-miss responses, graded Node + Chromium.

Still fail-closed / out of scope: a curve that is not a single-valued function of x (implicit curves, closed shapes); oblique/slant asymptotes as a scored feature; and any bitmap/pixel graph scoring.

---

## 0. The one principle that drives everything

**Equivalence is judged relative to what the item is testing, not by raw mathematical equality alone.** Two answers can be mathematically equal and yet one is wrong, because the *form* or *representation* is the skill being assessed.

Canonical example: "Factor x² + 5x + 6." The answer `(x+2)(x+3)` is correct; `x² + 5x + 6` is mathematically equal but WRONG (the student did not factor). A blanket equality checker marks it correct. So correctness is a function of several independent constraints, declared per item (§1).

---

## 1. Compositional constraint schema (the core fix)

An item does NOT carry one bundled "mode." It carries **independent constraint fields**, because these questions co-occur in arbitrary combinations ("give the exact answer in simplified radical form" needs equivalence + exactness + simplification + representation all at once, which no single mode can express):

```ts
AnswerSpec = {
  answer_type:      "numeric" | "expression" | "solution_set" |
                    "interval" | "equation_form" | "point" |
                    "multiple_choice" | "rational_answer" |
                    "graph" | "multipart",
  equivalence:      "exact_value" | "symbolic" | "structural" | "none",
  representation:   "any" | "fraction" | "decimal" | "exact" | "percent",
  simplification:   "none" | SimplificationProfile,   // §4
  required_form:    null | FormPredicate,              // §5
  required_notation:"none" | "interval" | "set_builder",
  precision:        null | { mode, value, rounding },  // §6
  unit_policy:      "none" | "required_exact_unit",     // §7
}
```

`acceptance_mode` from v1 survives ONLY as an author-facing **preset** that expands into these fields. The checker operates on the expanded fields, never on the preset. Presets:
- `solve_any` -> equivalence:symbolic, representation:any, simplification:none.
- `simplify` -> equivalence:symbolic, simplification:<node profile>, representation as declared.
- `factor` -> equivalence:structural, required_form:fully_factored_over_integers.
- `notation` -> answer_type:interval/solution_set, required_notation set, equivalence:structural.

### The failure this fixes
Under old `equivalent_simplified`, "reduce 2/4 to lowest terms" could be passed by typing `0.5` (equal, and a decimal is trivially "simplified"). Now the item declares `representation: "fraction"` + `simplification: "reduced_fraction"`, so `0.5` is rejected for wrong representation and the student must actually reduce the fraction. Representation and simplification are separate axes. This is now enforced on the live D1 NUM.F items (`0.75` → `wrong_representation`, `6/8`/`10/12` → `not_simplified`; owner-ratified 2026-07-23, see the change note near the top).

### Item schema also carries error-typing tags (see Error_Typing_Spec)
Beyond the correctness fields above, each item definition also carries misconception tags used for error typing (feedback + logging, never a correctness/mastery input):
```ts
misconception_tags?: {
  // MCQ: each wrong option maps to a node misconception ID (or "other")
  by_distractor?: Record<optionId, misconceptionId>,
  // constructed-response: map the checker's reason_code to a node misconception
  by_reason_code?: Record<reasonCode, misconceptionId>,
}
```
The checker's `reason_code` (see §12) is the input the lesson layer maps to a misconception for constructed-response items; MCQ distractors resolve directly. This is metadata on the item; it does not change any equivalence verdict.

---

## 2. Answer types (dispatch)

`numeric`, `expression`, `solution_set`, `interval`, `equation_form`, `point`, `multiple_choice`, `rational_answer` (expression + excluded values, §3), `graph` (own comparator, §8), `multipart` (bundle; each part its own AnswerSpec; item declares all-required or per-part-slots). This replaces the v1 flat list and, crucially, splits equations from solutions (§below).

### Equations are NOT one type (review #3)
Three distinct semantics, kept separate so `x²=4` is never conflated with `x=2`:
- **`solution_set`**: "Solve x²=4" -> `{-2, 2}`. Checked as a set, order-insensitive. Members are rational values by default. An item that declares **`representation: "exact"`** may instead hold **exact symbolic members** built from `log`, `ln` and `sqrt` (EL.6's `{ln(2), ln(3)}`), on a scope where `log` is base ten and `ln` is base `e` so the two are distinguishable, and a decimal approximation of such a member grades `wrong_representation` rather than `value_mismatch` (v0.17). An item that does not declare it reaches the rational path unchanged, which a bank-wide census pins.
- **`interval`** (inequality solution): "Solve 2x<6" -> `(-∞, 3)`. Checked as a parsed interval (§below), direction preserved.
- **`equation_form`**: "Rewrite y=2x+1 in standard form" -> another equation defining the same relation, checked by canonicalization. **Product-restricted:** only the declared target-form families (standard, slope-intercept), never arbitrary equation equivalence.
- General equation-equivalence and general symbolic-inequality solving are **deferred** (§10). LIN.1 emits a solution_set; inequalities emit an interval. Less to build, less to mis-grade.

---

## 3. Domain-aware rational answers (the most serious fix, review #2)

`(x²−1)/(x−1)` and `x+1` are CAS-equal but NOT equal as functions: the first is undefined at x=1. RAT.1's node definition explicitly requires tracking excluded values, so an expression-only answer is INCOMPLETE, not merely unsimplified.

`rational_answer` is modeled as a structured object, never a bare expression:
```ts
{ simplified_expression: "x + 1", excluded_values: ["1"] }
```
The checker compares BOTH: (a) the expression on its valid domain, and (b) the excluded-value set inherited from the ORIGINAL denominator (not the simplified one). Dropping the exclusion is wrong even with a correct expression.

Every symbolic item declares its mathematical universe (`number_system: "real"` for all MVP content) and domain restrictions where relevant. The same domain care governs `√(x²)` vs `x` (equals `|x|` over reals), `log(x²)` vs `2·log x` (domain differs), even roots, and division by variable expressions. Items whose correctness hinges on these are flagged high-risk (§11) and must clear the spike before authoring.

### Owner-gated fix — `rational_answer` keys that are themselves fractions (2026-07-25, Anthony; PENDING Gabe's sign-off)

**Cross-lane change to `packages/shared-components` (Gabe's lane) under the OWNERS.md cross-lane change policy. Recorded here, in `work-log/anthony.md`, and in the PR description; it needs Gabe's explicit approval before merge.**

Until now every authored `rational_answer` reduced to a **polynomial** (`prod.rat-1.l2`'s key is `x + 1`), so the category had never been exercised on a key with a denominator. D5 (RAT.1-RAT.3) is the first content whose answers ARE quotients, and every one of them graded `invalid_input`. Two independent defects in `compareRationalAnswer` / `symbolicEqual`:

1. `symbolicEqual` parsed under the default grammar, which rejects any variable denominator as `unsupported_symbolic_denominator` **before comparing**. So `(x+3)/(x+2)` could not be read at all.
2. Its zero test was `math.rationalize(diff).toString() === "0"`. Rationalizing a difference of *fractions* prints `0 / (x^4 + 2x^3 + x^2)`, never the bare string `0`, so even an answer identical to the key compared unequal.

**Still open, deliberately not fixed here (narrower, and no MVP content needs it):** a parenthesized sum over a plain NUMBER, e.g. `(x + 5)/6`, still returns `parse_error` on this path. `x/6` alone grades fine and `(x + 5)/(x + 6)` grades fine, so the gap is specifically a multi-term numerator over a numeric denominator. D5 authoring avoids that one form; anyone authoring a shape whose reduced answer takes it should expect to fix this first.

The fix reads the **numerator** of the detailed rationalization and passes `allowSymbolicDenominator` on this path only. It is backward-compatible by construction: for a polynomial difference the denominator is 1, so the numerator IS the whole result, and the two non-rational callers of `symbolicEqual` are unchanged (verified: `rationalize("(x+3) - (x+3)", {}, true).numerator` is `0` and `rationalize("(x+3) - (x+4)", {}, true).numerator` is `-1`, matching the old printed forms exactly). Four golden fixtures on a new fraction-keyed item (`spike:rat-3:rational-fraction:v2`) pin the behaviour, including that an equivalent factored denominator passes and that a dropped exclusion still fails. Full `packages/shared-components` suite: 545/545 green.

---

## 4. Simplification profiles (review #4)

"Simplified" is not universal. Replace generic `equivalent_simplified` with a declared profile, tied to node-level authoring rules so two authors never apply different definitions inside one lesson:

- `reduced_fraction`: numerator/denominator relatively prime.
- `simplified_radical`: no perfect-power factor under the radical; rationalized denominator per declared curriculum convention. **Canonical form over a VARIABLE radicand (cleared v0.15):** for a root of index *n*, every extractable factor lives OUTSIDE the radical and the radicand is minimal — no integer factor of the constant part is a perfect *n*-th power, and every variable factor `x^k` has **k < n**. So `sqrt(x^5)` is `not_simplified` (canonical: `x^2*sqrt(x)`), `sqrt(x^2)` is `not_simplified` (canonical: `abs(x)`, NOT `x` — the even root of an even power is an absolute value), and the MIXED radicand `sqrt(8*x^5)` is `not_simplified` (canonical: `2*x^2*sqrt(2*x)`). An ODD root needs no absolute value: `cbrt(x^3)` is `x`. Only a PRODUCT radicand is decomposed; a sum, a quotient, or a power of a product is not analyzed (see the v0.15 change note for the full limitation list).
- `combined_polynomial`: like terms combined, no un-expanded products. Graded by **structural AST predicates** — reject only an expandable product (`hasExpandableProduct`) or uncombined like terms (`hasUncombinedLikeTerms`) — NOT by a canonical-text compare, so a correct but reordered form (`12 + 3x` for `3x + 12`) is accepted (owner-ratified 2026-07-23; see the change note near the top).
- `combined_constants`: a lenient sibling of `combined_polynomial` for prompts whose node teaches distribution but NOT collecting like terms. Reject an expandable product (`hasExpandableProduct`) or more than one plain-number term in an additive chain (`hasUncombinedConstants`); repeated variable terms are **accepted**. So against a key of `6x + 14`: `2x + 4x + 14` grades **correct**, while `2x + 6 + 4x + 8` and an un-distributed `2(x+3) + 4(x+2)` grade **`not_simplified`** (added 2026-07-24; see the change note near the top).
- `reduced_rational_expression`: common factors cancelled, exclusions retained (§3).
- `positive_exponents`: no negative exponents (only where the prompt asks).
- `canonical_exact_trig_value`: exact standard value, not decimal.

Each profile is a concrete deterministic predicate on the parsed AST, defined once in the checker, referenced by nodes. The node authoring rules (a small table mapping node -> allowed profiles) ship with the item bank.

### Owner-gated fix — a negative leading coefficient read as an unexpanded product (2026-07-26, Anthony; PENDING Gabe's sign-off)

**Cross-lane change to `packages/shared-components/src/checker-core.ts` (Gabe's lane) under the OWNERS.md cross-lane change policy. Recorded here, in `work-log/anthony.md`, and in the PR description; it needs Gabe's explicit approval before merge.**

`hasExpandableProduct` treated a unary minus as if it were a binary sum, so under `combined_polynomial` (and any other profile calling it) a **fully simplified** answer with a negative leading coefficient graded `not_simplified`. mathjs gives a unary minus the same `op` string as subtraction (`"-"`) and distinguishes the two only by operand count, so `-2x` parses as `(-2) * x` — a product whose left operand is an OperatorNode with `op === "-"`, structurally indistinguishable from the `(x + 5)` in `2 * (x + 5)` unless the operand count is checked. The predicate checked only the `op` string.

This failed a **correct student**, not just an answer key: no authoring could work around it, because `-2x + 5` was rejected however the key was written, and a bare `-2x` was rejected too. It went unnoticed because every previously authored `combined_polynomial` item happens to have a positive leading coefficient; D7 is the first content where it cannot be avoided, since half of all lines have a negative slope.

The fix adds the operand-count guard (`args.length === 2`) that `readConstantExponent` already applies for the same reason when reading `x^-2`. It is **narrowing only in the false-positive direction**: it can only stop the predicate returning `true`, and it does so exactly when the "sum" has one operand, which no genuine expandable product ever has. Verified against the old behavior: `-2x + 5` and `-3x + x + 5` flip from flagged to unflagged, while `2 * (x - 2/5)` and `-2 * (x - 5/2)` stay flagged — a negative outer factor on a real parenthesized sum is still unexpanded. `-3x + x + 5` remains `not_simplified` via `hasUncombinedLikeTerms`, which is the correct predicate for it.

The two neighboring predicates, `hasUncombinedLikeTerms` and `hasUncombinedConstants`, key off the same `op` string and were left alone deliberately: a unary minus flattens to a single-term chain in `flattenAddSub`, so neither can see a duplicate symbol or a second plain number because of one. Four golden fixtures on a new item (`spike:num-4:combine-negative:v1`) pin all four verdicts above in Node and Chromium for §13.7 parity. `D1_CHECKER_VERSION` stays **1** and `PRODUCT_CHECKER_VERSION` stays **2**: no pinned snapshot moved, and the only responses whose verdict changes are ones that were graded wrong while correct.

**Adjacent latent bug, found and NOT fixed here (out of scope, no behavior depends on it).** `flattenAddSub` branches on `shaped.op === "unaryMinus"`, but mathjs puts `"unaryMinus"` in `fn`, not `op` — `op` is `"-"`. That branch is therefore dead, and a negated term keeps sign `+1` in the returned chain. Harmless today because both consumers destructure only `{ node }` and ignore the sign, but anyone who starts reading the sign must fix the branch first.

---

## 5. Form predicates (exact definitions, not labels)

`required_form` predicates are AST rules, not descriptions. v1 set, fully specified:

**`fully_factored_over_integers`** (POL.2). Deterministically verify ALL of:
1. The product expands to the answer key.
2. Leading constant normalized (a single numeric factor allowed and combined, e.g. `2(x+1)(x+2)` valid; `(2x+2)(x+2)` accepted only if the primitive check passes, see 4).
3. Every non-constant factor is irreducible over the integers.
4. Each polynomial factor is primitive (no common integer factor left inside).
5. Factor ORDER irrelevant; equivalent sign placement accepted (`-(x+1)(x-2)` = `(x+1)(2-x)`... resolved by normalizing sign to the leading factor).
6. Repeated factors may be written as powers or repeated (`(x+1)(x+1)` = `(x+1)²`), both accepted.
7. `x(x+1)` accepted (monomial is a valid factor).

**`is_standard_polynomial`**: single expression, like terms combined, strictly descending degree, no parentheses remaining.

**`is_slope_intercept`**: LHS is exactly the dependent variable; RHS parses as `m*x + b` with m,b constants (m may be a reduced fraction), terms combined, no other variables; `y=x` and `y=x+0` both accepted (normalize b=0); `y=0x+3` rejected in favor of `y=3` (zero coefficient must be simplified).

**`is_vertex_form`** (POL.5, cleared v0.12): `a(x-h)²+k` structure, constants combined. Deterministically verify: (1) the expression is exactly one scaled monic squared binomial term `a·(x±h)²` (base linear in x with x-coefficient 1, verified by finite differences, so `(2x-3)²` and a nonlinear base are rejected) plus AT MOST one constant term k; (2) k is a single combined constant (splitting into more than two additive terms is `not_simplified`); (3) it expands to the answer key (value equality by multi-point numeric identity, since `rationalize` throws on a bare leading unary minus). A value-correct standard form is `not_vertex_form`.

**`is_standard_form`** (linear, LIN.1, cleared v0.12): `Ax + By = C` with the variables on the left and a bare constant on the right; A, B, C integers; leading coefficient positive (A>0, or A=0 and B>0); primitive (gcd(|A|,|B|,|C|)=1). Coefficients are extracted by evaluating `LHS - RHS` at (0,0), (1,0), (0,1) with a superposition linearity guard at (1,1); the canonical (A,B,C) is compared to the key's. Fractional coefficients or a negative leading coefficient are `wrong_form`; a scaled (non-primitive) multiple is `not_simplified`; a different line is `value_mismatch`. This is the "standard" target-form family named in §2; general equation equivalence stays deferred (§10).

**`is_expanded_log` / `is_condensed_log`** (EL.5, cleared v0.12): the log product/quotient/power expand-condense forms. Value equality is a base-independent numeric identity over positive probe points (`log`/`ln` bound in the eval scope). `is_expanded_log` requires no logarithm to take a product/quotient/power argument (each log applies to an atom; powers are pulled out as coefficients); `is_condensed_log` requires the whole expression to be a SINGLE logarithm with no external coefficient. A value-correct wrong form grades `not_expanded` / `not_condensed`. General logarithmic/trigonometric identities beyond this slice stay deferred (§10).

A `required_form` an author needs that is not on this list means the item is deferred, not hand-waved. The CI test (§12) rejects a `required_form` referencing an undefined predicate.

---

## 6. Numeric precision (review, precision section)

Exact rational comparison by default (parse `1/3` as exact rational, never `0.333`). Under `representation:any`, `1/2`=`0.5`=`50%`; under `representation:fraction`, a decimal is rejected (§1).

Irrational/decimal-requested answers carry explicit metadata (no implicit tolerance):
```ts
precision: { mode: "decimal_places" | "sig_figs", value: 2, rounding: "half_up" }
```
Specified: boundary inclusivity (a value exactly at the rounding boundary is judged by the declared rounding rule, not tolerance), tie rounding (`half_up` default, declarable), significant figures preserve the student's lexical input (`1.0` vs `1.00` differ in communicated precision when `sig_figs` mode is on), scientific notation accepted and normalized, tolerance absolute by default with a relative option for very large/small magnitudes.

**Exact-vs-approximate is its own axis:** an item wanting `√2/2` rejects `0.7071` even though numerically near, via `representation:exact` / `approximation_allowed:false`. This is not a tolerance decision; it is a representation decision.

Absent metadata on an irrational-answer item = authoring reject (the item must say how precise).

---

## 7. Units (review, unit section)

MVP policy is deliberately narrow: `unit_policy: "required_exact_unit"`. The prompt tells the student which unit to use; the checker accepts standard *aliases* of that one unit only (`ft`/`feet`/`foot`), NOT conversions (`3 ft` != `36 in`). Missing a required unit fails.

General unit conversion (compound units, rates, exponents, affine temperature, sig-fig interaction) is **deferred** (§10). Percentage-as-representation is distinct from a unit: "what percent" with `representation:percent` rejects `0.25` in favor of `25%`, because the representation is the skill.

---

## 8. Graph responses (Phase-2 comparator) — CLEARED v0.13

The 6-node D1 MVP has no graph-response items. Graphs enter with later product nodes and are checked by a **separate geometric comparator** (`graph-comparator.ts`, `createGraphComparator`), not the text checker (different failure modes, kept isolated). As of v0.13 the comparator, the interactive widget, and the region/shading scoring are IMPLEMENTED (`Graph_Comparator_Spike.md`), so the category is cleared.

- Student plots/manipulates a curve, places points, sets scalars, or shades a region via the scored-SVG widget (`GraphInput`), which emits a structured numeric `GraphResponsePayload` (`{ samples?, points?, scalars?, regions? }` in GRAPH coordinates, NEVER a bitmap). The widget receives an ANSWER-FREE workspace (`toGraphWorkspace`), so the client never holds the answer key.
- The comparator scores in three phases and returns the first failure (fail-closed): (1) **authoring validity** (>=1 scored feature, finite domain, a `curveTolerance` when a curve is declared, and every `region` feature carries a label + >=1 probe; else `scoring_error`); (2) **sampled-point curve match** within an absolute tolerance over the declared domain, skipping `excludedX` (asymptotes/holes) — `curve_incomplete` if the student never covered a sample x, `curve_mismatch` if off by more than the tolerance; (3) **scored-feature match**.
- **Supported curve kinds:** a `function` reference (single-valued in x) and a `polyline` reference.
- **Supported point features** (nearest student point within a per-feature tolerance): `point`, `vertex`, `x_intercept`, `y_intercept`, `hole`. **Supported scalar features** (value within tolerance): `vertical_asymptote`, `horizontal_asymptote`, `period`, `amplitude`. **Supported region features:** membership by boolean agreement at author-declared probes (linear-inequality/half-plane shading and rational/polynomial sign regions).
- Cosmetic aspects (color, gridline style, stroke, off-domain behavior) are un-scorable by construction: the payload carries none of them.
- The item declares which features are scored and their tolerances; a graph item with **no declared scored features is an authoring reject** (`no_scored_features`). There is no implicit tolerance (§6).
- **Still fail-closed (out of MVP scope):** a curve that is not a single-valued function of x (implicit curves, closed shapes); oblique/slant asymptotes as a scored feature; region descriptors given without probes; and any bitmap/pixel scoring.
- Honest caution about the false-positive risk (visually-close-but-wrong curves) and false-negative risk (correct curve, tolerance too tight) is discharged by the comparator's own golden set PLUS a dedicated **false-positive tolerance battery** (Node + Chromium, §13.15) that proves wrong graphs are rejected with the correct reason codes. Owned with the graphing widget (Gabe).

---

## 9. Capability spike (the freeze gate, review #6)

Before D1 authoring, and before the MVP checker slice can move from v0.8 to locked:
1. Assemble representative answers (valid, near-miss-invalid, alternate-valid-form) for EVERY MVP node's answer forms.
2. Run the candidate parser/evaluator against them in BOTH the browser and the server/edge runtime.
3. The library must pass the fixed suite identically in both runtimes.

Per category that fails, choose one and record it: narrow that category's accepted grammar, write a deterministic node-specific checker, or remove that item form from the MVP. For D1, prioritize signed/fraction arithmetic, order-of-operations precedence, expression simplification, proportion/percent representation, and exact-unit aliases. Later product categories (radicals, domain-aware rationals, factoring structure, solution sets, exact trig constants, and graphs) remain separately gated until their own browser/server probes pass.

Candidate stack is a math.js-class evaluator for numeric/expression plus a light symbolic-equality routine; radicals/exact constants may need a fuller symbolic layer or a canonical-form-key fallback (store the accepted canonical form rather than live-deriving it). Final choice is the spike's output, not an assumption.

---

## 10. Explicit D1 MVP checker scope (in vs deferred)

**In scope for the 6-node D1 MVP:** exact integer/rational/decimal arithmetic; signed-number and fraction representation; order-of-operations precedence; equivalent arithmetic expressions under a declared simplification rule; ratios, rates, proportions, and percent representation; multiple choice; constrained multipart items; and exact-unit aliases when the prompt requires a unit.

**Phase-2 gated categories:** radicals and exact constants (including, since v0.15, **variable radicands**, the variable-aware `simplified_radical` canonical form, and `abs` / `|x|` pipe notation — RAD.4); univariate polynomial and factoring structure; solution sets and intervals; rational answers with excluded values; ordered pairs; target equation forms; exponent-law simplification to positive-exponent form (EXP.1); exact special-angle trig values (TRG.2); exact radian / `pi`-multiple angle conversions (TRG.1); vertex form (`is_vertex_form`, POL.5); set-builder notation (`set_builder`, RAT.5 domain / FUN.4 feature intervals); restricted standard-form linear equations (`is_standard_form`, LIN.1); the log expand/condense slice (`is_expanded_log` / `is_condensed_log`, EL.5); and scored graph responses (§8). Each category becomes authorable only after its browser/server spike passes. All of these have now cleared their Node+Chromium spike (§9 fallback for the exponent/trig/log/variable-radical cases: variable radicands are graded by deterministic **domain-aware** multi-point sampling that probes both signs and restricts to the legal real domain, plus a variable-aware `simplified_radical` AST predicate, see the v0.15 change note; `positive_exponents` is graded by a deterministic multi-point numeric-identity test plus a no-negative-exponent AST predicate, since `rationalize` does not reliably cancel these; trig values reuse the radical machinery; radians bind `pi`, and log expand/condense binds `log`/`ln`, in the eval scope; vertex form uses numeric identity because `rationalize` throws on a bare leading unary minus). The §8 graph comparator is now fully implemented (v0.13): the sampled-point curve match, point/scalar features, and region/shading membership are all live, backed by the interactive scored-SVG widget and a false-positive tolerance battery (`Graph_Comparator_Spike.md`); only implicit/non-functional curves, oblique asymptotes, and bitmap scoring remain out of scope.

**Explicitly deferred beyond the product target's narrow checker:** arbitrary equation equivalence; general symbolic inequalities; general logarithmic identities and general trigonometric identities (beyond the cleared EL.5 expand/condense slice); automatic unit conversion; unrestricted multivariate CAS input; and free-form bitmap graph scoring.

**Product nodes gated by this residual (node → deferred category), incl. the 2026-07-24 coverage-expansion promotions/additions.** These nodes are **in product** but their **ITEMS are checker-gated** until the residual category clears; their **lessons are NOT gated**. The checker code is unchanged by the coverage expansion — this is a mapping-only update.

| Node | Owner | Deferred category the items depend on |
|---|---|---|
| TRG.4 | Anthony | general trig identities (fundamental-identity manipulation) |
| TRG.8 | Anthony | arbitrary equation equivalence (trig equation solving) |
| **TRG.9** *(new node 2026-07-24)* | Anthony | general trigonometric identities (sum/difference & double-angle) |
| **TRG.7** *(new to product 2026-07-24)* | Anthony | general trig identities — **only if** items are authored in solved/identity form; plain exact-value inverse-trig evaluation is not gated |
| **FUN.10** | Gabe | `abs` in the general EXPRESSION grammar — its answer *is* an expression containing `abs` (e.g. `abs(x-2)+3`), which `compareExpressionSymbolic` still refuses as `unsupported_syntax` (v0.15 limitation list). This is a narrow, tractable follow-up, NOT the general equation/inequality residual |

**EL.6 was on this list until v0.17, and the category it was listed against was the wrong one.** It was recorded against "arbitrary equation equivalence (exp/log solving)", but solving an exponential or logarithmic equation submits a **number**, a **rounded number** or a **`solution_set`**, never an equation. What EL.6 genuinely needed was narrower than the whole category and narrower than one node: a roster able to hold **exact symbolic members** (`{ln(2), ln(3)}`), which `compareSolutionSet` now evaluates for items declaring `representation: "exact"`. Evidence is 3 spike items with 14 golden cases in Node and Chromium, a 45-verdict additivity baseline, a bank-wide census that exactly one item opts in, and a 13-case false-positive battery (see the v0.17 change note). Submitting an equivalent **equation** stays deferred, and no EL.6 item asks for one. **This is the second time this table recorded a node against a general category it did not need**, after LIN.5 / LIN.6 at v0.16, which is why §9's closing rule now reads as a standing procedure rather than a one-off correction.

**LIN.5 and LIN.6 were on this list until v0.16 and should never have been.** They were recorded against "arbitrary equation equivalence" / "general symbolic inequalities", but an absolute-value equation answers as a **`solution_set`** and an absolute-value inequality as an **`interval`** (union included) or **`set_builder`** — every one of those cleared at or before v0.12 — and the bars appear only in the KaTeX prompt, which the checker never parses. Both are now authorable with no checker change; the evidence is eight golden fixtures plus a 28-case false-positive battery (see the v0.16 change note). What remains gated for absolute value is ONLY the `equation_form` answer shape (submitting `x - 3 = 5 or x - 3 = -5` itself) and FUN.10's `abs`-bearing `expression`.

**RAD.4 is no longer on this list (cleared v0.15).** The 2026-07-25 D2 QA pass filed RAD.4 (variable radicands, `sqrt(x^2) = abs(x)`, even-root domain) as a SECOND, distinct residual in `Content_Authoring_Split.md` §4.4 — not the equation/identity residual above. All three of its blockers are closed and its items are authorable; see the v0.15 change note.

**LIN.5 / LIN.6: the v0.15 note was right about the checker and wrong about the conclusion (resolved v0.16).** v0.15's `abs` grammar addition is indeed confined to the radical category and does not touch the `expression`, `equation_form`, `solution_set` or `interval` paths. The error was inferring from that that LIN.5/LIN.6 stayed gated: those nodes never needed the `abs` grammar OR the equation/inequality residual, because their answers are a `solution_set` and an `interval`/`set_builder` and the bars live only in the prompt. v0.15's own closing aside said as much and was overruled by the gate table; **v0.16 corrects the table and un-gates both nodes.** FUN.10 is the node the `abs`-grammar limitation actually blocks, and it is now listed above.

This narrowing is the primary defense against the checker becoming a general-CAS project that blows the sprint.

---

## 11. Parsing canon + safety limits (review, parsing section)

Ambiguous grammar is not solved by normalization; it needs a canonical policy. The primary protection: the **math-input component emits a canonical AST**, not raw keyboard strings, so precedence is fixed at entry. The server independently re-parses the original serialization (or verifies the submitted AST against it) so client and server agree.

Declared canonical readings for the known ambiguities: `-2^2` = `-(2^2)`; `1/2x` = `(1/2)*x` (coefficient reading; but the input widget should render this unambiguously so the student sees which); `2x^2` = `2*(x^2)`; `x^-2` = `x^(-2)`; `1 1/2` = mixed number `3/2` (space-separated), distinct from `1*1/2`; radical scope requires explicit grouping (`sqrt(x)+1` vs `sqrt(x+1)`), the widget supplies the grouping visually. `sin 2x` requires explicit argument grouping in the widget.

**A DECLARED SYMBOL immediately before `(` is a PRODUCT, not a call** (v0.19): `x(x + 2)` = `x*(x + 2)`, and so is `x (x + 2)`, because mathjs reads the space as incidental. It is safe to declare because every function name the grammar admits is a fixed literal in `checker-core.ts` (`sqrt`, `nthRoot`, `cbrt`, `abs`, `log`, `ln`) and none is read from item data, so there is no construct in which a name outside those six is a call; a name the item does not DECLARE as a symbol is left refused rather than guessed at. **A RUN OF LETTERS is one identifier and is deliberately NOT a product**: `xy` is the symbol `xy` and grades `unknown_symbol`, which is why the declared alphabet is single letters plus `pi` and is asserted by set equality. The `1 1/2` reading above remains a **known disagreement with the implementation** — mathjs reads it as `1*1/2` — and is recorded rather than resolved; do not read the bracket case as licence to build on space-juxtaposition, which `math.rationalize` also declines to normalize.

Safety limits (guard the CAS against hang/adversarial input): max input length, max AST depth, max exponent magnitude, evaluation timeout. Exceeding any is a `scoring_error`/`invalid_input`, never a silent pass or hang.

---

## 12. Error status + metric protection (review, error-handling section)

The checker returns a status enum, not a bare boolean:
```ts
{ status: "correct" | "incorrect" | "invalid_input" |
          "unsupported_expression" | "scoring_error",
  reason_code, checker_version }
```
- `invalid_input` (malformed STUDENT input): treated as unanswered; student is prompted to correct it. Not a wrong answer.
- `incorrect`: a genuine wrong answer; counts as not-correct for mastery.
- `scoring_error` / `unsupported_expression` (an APPLICATION fault, not the student's): **must NOT count as wrong in the marketed pre/post metric.** It invalidates that item response (and, if pervasive, the administration) for review. This is the critical distinction the v1 draft got wrong by treating every parse failure as not-correct.

Reason codes (`value_mismatch`, `form_mismatch`, `not_simplified`, `wrong_representation`, `sign_error`, `missing_exclusion`, `wrong_unit`, `parse_error`, ...) drive lesson feedback and authoring diagnostics.

---

## 13. CI invariants (review, expanded)

The golden set is necessary but not sufficient. Full suite:
1. Every answer key passes its own checker.
2. Every `required_form` key satisfies its declared predicate.
3. Every item declares all required AnswerSpec fields (no defaults; missing = reject).
4. `required_form` references only defined predicates (§5); simplification references only defined profiles (§4).
5. Each item with expected alternate forms has >=2 known-valid variants.
6. Each item has >=1 known-invalid near-miss.
7. Cross-runtime parity: browser and server produce identical verdicts for the whole golden set.
8. Property-based tests: commutative/associative reorderings, sign placement.
9. Domain-sensitive tests for every `rational_answer` (exclusion required).
10. Parser fuzz tests for malformed input (must return `invalid_input`, never hang).
11. Precedence/negative-sign regression battery (§11 cases).
12. Checker-timeout test.
13. Versioned-rescoring test: a checker-version bump never silently flips an old verdict.
14. No pre/post item uses a deferred/unsupported answer feature (§10).
15. Graph golden set: scored-feature match and cosmetic-ignore, both runtimes (§8).
16. **False-positive battery for every equality decided by SAMPLING rather than by exact arithmetic or a structural predicate** (currently the geometric graph comparator and variable radicands): a dedicated suite of plausible near-misses that must all be rejected, with a minimum-size tripwire so it cannot be quietly gutted. Sampling is evidence, not proof, so each such category owes this battery before it clears. **A category may also owe one VOLUNTARILY when its risk is neighbouring shapes rather than thin sampling**: LIN.5 / LIN.6 decide equality exactly (a rational roster, exact endpoints plus inclusivity flags) and so are not obliged here, but the two shapes they exist to distinguish are reached by identical arithmetic, so `ABSOLUTE_VALUE_FALSE_POSITIVE_CASES` submits each neighbour against the other's key (v0.16). When a battery exists for either reason it must also keep the partial-credit codes distinct from the wrong-answer codes, so `misconception_tags.by_reason_code` can separate a form slip from a solving error.

---

## 14. Node-level risk register (review's table, adopted)

**D1 MVP first:** NUM.S/F (fraction-vs-decimal representation and unary-minus precedence), NUM.2/3/4 (precedence, equivalent forms, and the definition of simplified), and NUM.5 (percent/unit representation).

**Phase-2 high risk:** RAT.1 (domain exclusions, expression alone insufficient), POL.2 (full factoring over integers), RAD.1 (radical canonicalization/rationalization), followed by EXP.1, LIN.1, POL.1, CG.1, FUN.1, LF.1, EL.1, and TRG.1/TRG.2. These do not block the D1 MVP checker, but they do block authoring their respective product nodes.

---

## 15. Contract impact (see Contracts patch)

`checkAnswer` must take an immutable item version + checker version, not a mutable item ID:
```ts
checkAnswer({ studentAnswer, itemVersionId, equivalenceCheckerVersion })
  -> { status, reason_code, client_correct, checker_version }
```
(Contracts §4.2 is authoritative for this signature. `checkAnswer` is the CLIENT call, so it returns `client_correct` (UX only); the server recompute produces `authoritative_correct`, which the metric and response log record. Same checker version both sides.)
Response log adds `equivalence_checker_version`, `authoritative_correct`, `scoring_status`, `reason_code`, `assessment_session_id`, immutable `item_version_id` + item-definition hash. The full answer key need NOT be duplicated into every response row: an immutable, never-modified item-version record plus a cryptographic hash is smaller and safer, provided old versions are truly immutable. PRD + Contracts must state: the client verdict is for immediate feedback; server recomputation is authoritative for assessment reporting.

---

## Status and path to lock
**v0.17.** Step (1), executable Node/Chromium capability evidence, passes for the implemented D1 (v1) categories AND the Phase-2 product (v2) categories: radicals/exact constants, univariate factoring structure (`fully_factored_over_integers`), domain-aware `rational_answer` with exclusions, `solution_set`, `interval`, `point`, numeric `precision`, `is_standard_polynomial`, `equation_form:is_slope_intercept`, `positive_exponents` (EXP.1), `canonical_exact_trig_value` (TRG.2), exact radian / `pi`-multiple conversions (TRG.1), `is_vertex_form` (POL.5), `set_builder` notation (RAT.5 / FUN.4), `is_standard_form` linear equations (LIN.1), the `is_expanded_log` / `is_condensed_log` slice (EL.5), and (new in v0.13) the §8 **scored graph comparator** — sampled-point curve match, point/scalar features, and region/shading membership, with the interactive scored-SVG widget and a false-positive tolerance battery (evidence in `D1_Checker_Spike.md`, "Phase-2 product checker (v2)", the product golden suite, and the graph comparator + authored-slice suites). The D1 MVP slice is freeze-ready after: (2) team review accepts the fixture grammar and the D1 node-to-simplification-profile authoring table; (3) Contracts + response log are confirmed against the implementation (§15); and (4) any uncovered D1 category is explicitly narrowed or deferred. Still deferred (uncleared): general equation/inequality equivalence (incl. general trig/log identities beyond the EL.5 expand/condense slice), and free-form bitmap graph scoring. Authoring proceeds ONLY for categories already cleared. **A node listed as gated is not evidence that it needs the category it is listed against** — v0.16 found LIN.5 and LIN.6 recorded against general equation/inequality equivalence when their answers were `solution_set` and `interval` all along, and v0.17 found EL.6 recorded against the same category when its answers are a number, a rounded number and a `solution_set`. Two corrections to one table make this a standing procedure and not a pair of accidents: before queueing a node behind a category, check what its items would actually ASK the learner to submit, and note that the residual left after that check can be far narrower than the category (EL.6's was one roster spelling, closed additively without moving the checker version).

## Locked design decisions captured here
- Constraints are compositional, not one bundled mode; `acceptance_mode` is a preset only. *(This session, review #1.)*
- Rational answers carry excluded values; correctness is domain-aware. *(Review #2.)*
- Equations split into solution_set / interval / restricted equation_form; general equation equivalence deferred. *(Review #3.)*
- Simplification is a per-node declared profile, not one predicate. *(Review #4.)*
- Interval/set answers parsed to an AST, not literal-matched. *(Review #5.)*
- Parser/CAS chosen by a capability spike before authoring; spec is v0.8 until then. *(Review #6, and correcting my own "locked v1" contradiction.)*
- Graph responses are scored by a separate geometric comparator, gated before Phase-2 graph authoring. *(Gabe-owned.)*
- Application scoring faults never count as wrong answers in the metric. *(Review, error handling.)*
- The deterministic checkers share one core running TWO mathjs instances: a Fraction-typed instance for exact rational/decimal/percent equality, and a number-typed instance for radicals/exact constants (the Fraction instance throws on irrational evaluation) judged by relative tolerance. *(Phase-2 product checker v2, this session.)*
- Radicals and factoring are graded by canonical form + structural predicates on the parsed AST (radical: no perfect-power factor under the root, no radical left in a denominator; factoring: expands to the key's coefficients AND every factor passes an integer irreducible + primitive check), never by live CAS re-derivation. *(Phase-2 product checker v2, this session.)*
- Value equality and FORM are separate axes for the v0.12 algebraic categories: `is_vertex_form` and the EL.5 log expand/condense forms check value by a multi-point numeric identity (base-independent for logs) and then a structural AST FORM predicate, so a value-correct wrong form grades `not_vertex_form` / `not_expanded` / `not_condensed`, not `correct`. `set_builder` normalizes the condition to intervals and reuses the interval comparator; `is_standard_form` is a restricted linear target form, not general equation equivalence. *(v0.12, 2026-07-23.)*
- A node's gate is decided by the ANSWER SHAPE its items ask for, never by the notation in its prompt. Prompts are KaTeX text the checker never parses, so an absolute-value equation answering as a `solution_set` and an absolute-value inequality answering as an `interval` / `set_builder` are gradable by long-cleared categories: LIN.5 and LIN.6 needed no checker work, only the missing `intervalAnswer` authoring helper. The residual "general equation / inequality equivalence" applies only where the ANSWER is itself an equation or inequality. *(v0.16, 2026-07-27; applied again to EL.6 at v0.17, 2026-07-30.)*
- A capability added to a shared comparator is gated on ITEM metadata, and the additivity claim is measured, not argued: a pinned baseline over the population that keeps the old path, plus a bank-wide census that names every item opting into the new one. That is what holds `PRODUCT_CHECKER_VERSION` when a checker source file HAS been edited, and "no file was touched" is not available. *(v0.17, 2026-07-30, exact solution rosters.)*
- Graph responses are scored by a separate geometric comparator on a structured numeric payload (sampled-point curve match within tolerance PLUS declared scored point/scalar features PLUS region/shading membership by boolean probe agreement; cosmetic aspects un-scorable). CLEARED v0.13: the interactive scored-SVG widget, region membership, and a false-positive tolerance battery all landed, so the POL.5 / FUN.4 / FUN.9 / RAT.5 graph slices are authorable. *(§8; Graph_Comparator_Spike.md, v0.13.)*
