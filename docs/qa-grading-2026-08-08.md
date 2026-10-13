# Cross-domain grading sweep — 2026-08-08

**Stream C (`grading`) of the all-domain cross-cutting QA plan.** Read-only on product code:
nothing in this round was fixed, and the two harnesses that produced the numbers below were
deleted after the run.

- **Tree:** `anthony/all-domain-qa` at `3fbe5fcb`, worktree `wt-all-domain-qa`.
- **How it was run:** one harness per surface, `vitest run --maxWorkers=1`.
  - `apps/web/src/lessons/qaGradingSweepTmp.test.ts` — every CFU instance and every practice
    item, canonical key plus alternate spellings, both graders, plus the parity join.
  - `packages/item-bank/src/qaPromptDeriveTmp.test.ts` — technique 3, D1 and D10.
- **Provenance:** every count in this document was measured by those harnesses on that SHA.
  Both are deleted, so re-deriving requires rebuilding them; the findings below carry the exact
  submitted string so each one can be reproduced by hand in a single call to the named grader.

A finding expires when the tree moves. Four sibling streams share this worktree, so treat every
file:line citation here as a measurement at `3fbe5fcb`.

---

## 1. Populations derived

All derived from source (`allLessons`, `cfuInstances`, `PRACTICE_AUTHORITY_ITEMS`), never from a
written list.

### CFU side

| Quantity | Count |
|---|---|
| Lesson packs (`allLessons`) | 62 |
| Packs carrying a CFU | 62 |
| Rendered CFU instances graded | **124** (62 authored asks + 62 computed re-asks) |
| Packs with a `cfu.check` block | 34 |
| Packs with no check block (exact-match fallback) | **28** |
| Canonical keys graded through `gradeCfuAnswer` | 124 |
| Accepted-list forms graded (every entry, both instances) | 36,112 |
| Alternate-spelling probes attempted | 359 |

Pack counts by domain: d1 6, d2 5, d3 5, d4 8, d5 6, d6 11, d7 4, d8 6, d9 9, d10 2 = 62.

The 34 checked packs by `answer_type`: numeric 23, expression 5, interval 3, solution_set 3.
By `simplification`: none 29, `reduced_fraction` 4, `simplified_radical` 1.

### Practice side

**Eleven registered pools, not ten.** The plan says ten; the eleventh is the `interactive` pool
(35 items), which is registered alongside the domain pools and is graded by the same
`checkAnswer` entry point.

| Pool | Items | | Pool | Items |
|---|---:|---|---|---:|
| d1 | 234 | | d6 | 385 |
| d2 | 187 | | d7 | 140 |
| d3 | 181 | | d8 | 216 |
| d4 | 280 | | d9 | 327 |
| d5 | 210 | | d10 | 70 |
| interactive | 35 | | **Total** | **2,265** |

Of the 2,265: 2,048 string-keyed (gradable through a text field) and **217 non-string** — see
§5, the compound/multipart claim.

- Canonical practice keys graded through `checkAnswer`: **2,265 of 2,265**.
- Alternate-spelling probes attempted: 5,522.

### Canonical baseline, both surfaces

**Every canonical key is graded correct on its own surface: 124 of 124 CFU instances, 2,265 of
2,265 practice items, zero failures.** That is the floor the rest of this report sits on — the
defects below are all about spellings of a correct answer, not about keys that are wrong.

---

## 2. P0 — correct answers graded wrong

### P0-1. The CFU numeric pre-gate refuses three correct spellings, one of them the pack's own

`gradeCfuAnswer` runs two format gates **before** it consults the accepted list:

```302:312:apps/web/src/lessons/cfuChecker.ts
  if (check?.answer_type === "numeric" && !isNumericLiteral(value)) {
    return { correct: false, note: NUMERIC_LITERAL_NOTE, unreadable: null };
  }
  if (
    check?.simplification === "reduced_fraction" &&
    isNumericLiteral(value) &&
    /\d+\s*\/\s*\d+/.test(value) &&
    !isReducedFraction(value)
  ) {
    return { correct: false, note: REDUCED_FRACTION_NOTE, unreadable: null };
  }
```

The list is only reached at line 319, after both. So on a `numeric` pack, anything
`isNumericLiteral` cannot read is refused **even when the pack itself lists it as accepted**.

The gate's regex is at `answerFormat.ts:36`:

```35:37:apps/web/src/lessons/answerFormat.ts
export function isNumericLiteral(value: string): boolean {
  return /^[+-]?(\d+(\.\d+)?|\.\d+|\d+\/\d+)$/.test(value.trim());
}
```

Three shapes fall outside it. All three are the same root cause and would be fixed together.

**(a) A fraction with spaces around the slash — `1 / 3`.** Refused on all four
`reduced_fraction` packs, 8 instances.

| Node | Submitted | Verdict | Refusing layer |
|---|---|---|---|
| NUM.F | `1 / 3` | incorrect | `cfuChecker.ts:302` |
| TRG.9 | `7 / 25` | incorrect | `cfuChecker.ts:302` |
| TRG.3 | `-1 / 2` | incorrect | `cfuChecker.ts:302` |
| TRG.4 | `4 / 3` | incorrect | `cfuChecker.ts:302` |

The note shown is:

> Enter your final answer as a single number (for example, 6), not the expression.

which is false about the input — `1 / 3` **is** a single number, and `1/3` on the same instance
is graded **correct** (`layer: accepted`). This is the sharpest form of the defect, because the
two functions in the same file disagree with each other about whether spaces are allowed around
a slash: `isNumericLiteral` at line 36 writes `\d+\/\d+`, while `isReducedFraction` at line 54
writes `^([+-]?\d+)\s*\/\s*([+-]?\d+)$` — it explicitly tolerates the spaces the gate in front of
it rejects. Practice accepts the spaced form on the same nodes (§4).

**(b) The pack's own advertised accepted forms — 12 refusals.** These are the worst of the set,
because the string was written into `cfu.accepted` by the author and the learner is being told
to type something the pack already promised to take. All 12 are on the **computed re-ask**
(instance index 1), all `answer_type: numeric`, all refused at `cfuChecker.ts:302` before the
list at line 319 could accept them:

| Node | Key | Advertised form refused |
|---|---|---|
| NUM.F | `1/6` | `\dfrac{1}{6}`, `\frac{1}{6}` |
| TRG.3 | `1/2` | `\dfrac{1}{2}`, `\frac{1}{2}` |
| TRG.4 | `-7/24` | `\dfrac{-7}{24}`, `\frac{-7}{24}`, `-\dfrac{7}{24}`, `-\frac{7}{24}` |
| TRG.9 | `-7/25` | `\dfrac{-7}{25}`, `\frac{-7}{25}`, `-\dfrac{7}{25}`, `-\frac{7}{25}` |

Every one returns the same note quoted above. A learner copying the LaTeX fraction off the
rendered prompt — the most likely way to produce `-\dfrac{7}{25}` — is told their correct answer
is "the expression".

Measured against the rest: 36,112 accepted-list forms were graded across all 124 instances and
**exactly these 12 fail**, so the union design works everywhere the numeric gate is not in front
of it.

**(c) A trailing decimal point on an integer key — `16.`** Refused on all 19 integer-key numeric
packs, both instances, **38 refusals**: NUM.S, NUM.2, NUM.5, RAD.3, LIN.1, LIN.3, POL.7, POL.5,
FUN.7, FUN.9, EL.1, EL.3, EL.6, TRG.2, TRG.5, TRG.7, TRG.8, GEO.1, GEO.2.

Reproduction, EL.3 authored ask: `5.` → incorrect, note *"Enter your final answer as a single
number (for example, 6), not the expression."*, layer `cfuChecker.ts:302`. On the same instance
`5.0` is **correct**. The regex admits `\d+(\.\d+)?` and `\.\d+` but not `\d+\.`, so the one
spelling with nothing after the point is the one that falls through.

I rank (c) P0 by the rubric — a correct answer graded wrong — while noting it is the least likely
of the three to be typed. Practice accepts it 751 times out of 797 on bare-number keys (§4).

### P0-2. RAT.6 refuses `+3`

RAT.6 has no check block, so the accepted list is the whole decision:

```322:326:apps/web/src/lessons/cfuChecker.ts
  if (check === undefined) {
    // Form matters and there is no checker to fall through to, so the list is the whole
    // decision.
    return { correct: false, note: null, unreadable: null };
  }
```

| Node | Key | Submitted | Verdict | Refusing layer |
|---|---|---|---|---|
| RAT.6 | `3` | `+3` | incorrect, **note `null`** | `cfuChecker.ts:322` |

The note is `null`, so the card renders its generic miss line rather than anything that would
tell the learner what to change. `3` on the same instance is correct. Practice accepts a leading
plus on **589 of 589** items swept, so this is also a parity gap.

This is the only leading-plus refusal in the whole CFU population (2 of 2 probes on the one node;
the probe only applies where the key is a bare positive number).

**The fix is a list entry, not a migration.** `docs/cfu-check-migration-rulings.md` §"Ruling two"
keeps RAT.6 on exact match by measurement — migrating it to the checker would lose 12 of its 14
spellings, including `x = 3` and `{x = 3}`. That ruling is sound and `+3` does not disturb it:
the pack simply never listed the leading-plus spelling.

Note also that RAT.6 **is** inside the population of
`cfuAcceptanceConvention.test.tsx` (`:94`, "all six D5 packs"), so this is not a guard-population
gap. That guard asserts closure under the *part-joining separators* at bracket depth zero —
`,`, `;`, `" and "` — which is why my sweep found those spellings accepted 8/8 and 4/4 across the
exact-match cohort. A leading `+` is outside what it asserts, so it was never going to catch this.

---

## 3. P1 / P2 — narrower, or arguably intended

### P1-1. POL.2 refuses an explicit multiplication sign in a factored form

| Node | Key | Submitted | Verdict | Refusing layer |
|---|---|---|---|---|
| POL.2 | `2(x + 4)(x - 3)` | `2*(x + 4)(x - 3)` | incorrect, note `null` | `cfuChecker.ts:322` |

POL.2 is exact-match, so no checker ever sees the string. Its own practice pool accepts the
explicit product on **18 of 18** items. Across the 28 exact-match packs the explicit-product
probe is accepted 17 times out of 19 — POL.2's two instances are the only refusals — so the
normalizer handles this shape everywhere else and POL.2 is an outlier, not the rule.

As with RAT.6, the fix is a list entry. `docs/cfu-check-migration-rulings.md` §"Ruling one" keeps
POL.2 on exact match deliberately — the prompt says "factor completely", so equivalence would let
the unfactored `2x^2 + 2x - 24` through — and that reasoning is untouched by accepting an
explicit `*` between factors that are still factored. POL.2 is likewise inside
`cfuAcceptanceConvention.test.tsx`'s population (`:94`), which asserts separators rather than
multiplication signs.

### P1-2. D9's reduced-fraction rule is CFU-only

`simplification: reduced_fraction` on TRG.3, TRG.4, TRG.9 makes the CFU refuse an unreduced
equivalent at `cfuChecker.ts:305` with *"Write your answer as a fraction in lowest terms (for
example, 1/3, not 2/6)."* Their own practice pools accept the same unreduced strings:

| Node | CFU accepted | Practice accepted | Practice sample |
|---|---|---|---|
| TRG.3 | 0/2 | **3/3** | `-3/6` |
| TRG.4 | 0/2 | **28/28** | `60/63` |
| TRG.9 | 0/2 | **21/21** | `-2520/2523` |

Either rule is defensible; holding both on one node is the finding. Note that the CFU is the
**stricter** surface here, which is the opposite direction from every other gap in this report.

### P1-3. EL.2 practice refuses an uppercase variable its CFU accepts

| Surface | Submitted | Result |
|---|---|---|
| EL.2 CFU | `Y = 5, (0, 4)` | correct (`layer: accepted`) |
| EL.2 practice | `X + 2` | **incorrect / `value_mismatch` (v2)**, 3 of 10 items |

7 of 10 practice items accept the uppercase form, so this is three items diverging from their
own pool as well as from the CFU. Across the whole practice sweep the uppercase probe is
accepted 1,079 times out of 1,082, and these three are the entire remainder.

### P2-1. RAD.1 / RAD.2 — `\sqrt{}` and `√` are CFU-only

| Node | Submitted | CFU | Practice |
|---|---|---|---|
| RAD.1 | `6*\sqrt{2}/5` (CFU) / `4*\sqrt{2}` (practice) | correct, `accepted` | **0/21**, `invalid_input/parse_error (v2)` |
| RAD.2 | `\sqrt{10}` / `6*\sqrt{3}` | correct, `accepted` | **0/34**, `invalid_input/parse_error (v2)` |
| RAD.1 | `6*√2/5` / `4*√2` | correct, `accepted` | **0/21**, `invalid_input/parse_error (v2)` |
| RAD.2 | `√10` / `6*√3` | correct, `accepted` | **0/34**, `invalid_input/parse_error (v2)` |

The packs' accepted lists carry the LaTeX and glyph spellings; the v2 product grammar reads
neither. A learner who learns on the CFU that `\sqrt{10}` is acceptable and then types it into
practice gets a parse error. I hold the glyph at P2 (arguably out of scope for an ASCII grammar);
the `\sqrt{}` half is the same class as P0-1(b) — a form one surface advertises and the other
cannot read — and is only not P0 because the ASCII spelling is what the notation note tells the
learner to type.

The CFU side of this is deliberate and already ruled on:
`docs/cfu-check-migration-rulings.md` §"Ruling two" keeps RAD.1 and RAD.2 off the checker
precisely because migrating would lose 11 of 15 and 6 of 9 spellings, naming
*"`\dfrac{6\sqrt{2}}{5}`, `6√2/5`, `6sqrt2/5` — LaTeX and the root glyph, `invalid_input`"*. It
also names the correct fix, which is on the checker rather than the packs: *"a LaTeX and
root-glyph normalizer in front of the parse would take RAD.1 and RAD.2."* My measurement adds the
half the ruling did not cover — that the same grammar gap is live on the **practice** surface
today, on 55 items, where there is no accepted list to fall back to.

---

## 4. CFU-versus-practice parity

**54 (node, probe) pairs diverge**, over a join of every node that has both a CFU and a practice
pool. Grouped by probe, with the tier I assigned:

| Probe | Nodes | Which |
|---|---:|---|
| trailing period | 40 | NUM.S NUM.2 NUM.3 NUM.4 NUM.5 EXP.1 RAD.1 RAD.3 RAD.4 LIN.1 LIN.3 LIN.5 POL.1 POL.3 POL.5 POL.6 POL.7 POL.8 RAT.5 CG.1 FUN.4 FUN.6 FUN.7 FUN.9 FUN.10 LF.1 LF.2 EL.1 EL.2 EL.3 EL.4 EL.6 TRG.1 TRG.2 TRG.3 TRG.5 TRG.6 TRG.7 GEO.1 GEO.2 |
| spaces around operators | 4 | NUM.F TRG.3 TRG.4 TRG.9 |
| unreduced fraction | 3 | TRG.3 TRG.4 TRG.9 |
| `\sqrt{}` for ascii `sqrt()` | 2 | RAD.1 RAD.2 |
| root glyph `√` | 2 | RAD.1 RAD.2 |
| explicit product `*` | 1 | POL.2 |
| uppercase variable | 1 | EL.2 |
| U+2212 minus | 1 | NUM.S |

Two things are worth separating out of the trailing-period row, because it is the largest and
the least uniform:

- **On bare-number keys the divergence is total and one-directional.** CFU accepts `16.` on
  **0 of 40** instances; practice accepts the equivalent on **751 of 797** items. 38 of the 40
  are the numeric gate at `cfuChecker.ts:302`, showing the "not the expression" note; the other
  two are RAT.6, which has no check block and refuses at line 322 with no note at all.
- **On structured keys the divergence runs the other way.** LIN.5 CFU accepts `39, 51.`
  (`layer: accepted`) while its practice refuses `{-9, 7}.` on **35 of 35** items with
  `invalid_input/parse_error (v2)`. Same for TRG.6: CFU accepts `pi/6.`, practice refuses
  `pi/2.` 35 of 35 with `incorrect/wrong_representation (v2)`. So a trailing period is not
  simply "CFU strict, practice lax" — the two surfaces disagree in both directions depending on
  the key's shape, which is why I read the whole row as one inconsistency rather than 40.

I tier trailing period **debatable**: refusing terminal punctuation is a defensible product call.
What is not defensible is that it is made differently on the two surfaces for the same node, and
that on the CFU side the refusal message describes a different mistake than the one made.

### #735's U+2212 scope call: confirmed, not re-reported

Swept independently rather than taken from the note. Of 580 U+2212 probes across the practice
population, **exactly 35 refuse**, all in D1, all `invalid_input/parse_error (v1)`:

- NUM.S — 20 items
- NUM.4 — 14 items
- NUM.3 — 1 item

Distinct refusing item ids: 35 (e.g. `d1.num-s.l2:practice:5001`, `d1.num-4.l3:practice:7066`,
`d1.num-3.l1b:practice:7143`). **This matches the documented count exactly.** The CFU side folds
the rendered minus before its gates (`foldRenderedMinus` at `cfuChecker.ts:300`) and accepts it
on 2 of 2 NUM.S probes, which is the asymmetry #735 knowingly left in place. No new finding.

### Where parity is clean, and the counts behind it

These probes were tried on both surfaces and produced **no** divergence:

| Probe | CFU accepted | Practice accepted |
|---|---|---|
| leading `+` | 15/17 (RAT.6 is the 2) | 589/589 |
| roster joined by `;` | 8/8 | n/a (no string-keyed roster items) |
| roster joined by ` and ` | 8/8 | n/a |
| implicit product (drop `*`) | 22/22 | 341/341 |
| decimal approximation | tried, 0 divergences | — |
| uppercase variable | 68/68 | 1,079/1,082 (EL.2, §3) |

**Spelled-out numbers are refused on both surfaces** — 0 of 16 CFU probes, 0 of 298 practice
probes — so "three" for `3` is consistently rejected. I record it as deliberate rather than as a
finding, but it is a real learner loss on the small-integer keys and nothing tells the learner
digits are required.

---

## 5. The exact-match CFU census

**28 packs, not 29** — and the 29 in the plan is traceable to
`docs/cfu-check-migration-rulings.md`, whose census has since gone stale by one pack. See the end
of this section. Derived by testing for the absence of a `cfu.check` block:

NUM.3, NUM.4, EXP.1, RAD.1, RAD.2, POL.1, POL.2, POL.8, RAT.1, RAT.2, RAT.3, RAT.4, RAT.5,
RAT.6, CG.1, FUN.1, FUN.3, FUN.4, FUN.5, FUN.8, FUN.10, LF.1, LF.2, LF.3, LF.4, EL.2, EL.4,
EL.5.

All 28 have no `answer_type` at all, which is consistent — the field lives on the check block.

**What a learner actually loses.** This is the surprise of the round and it cuts against the
prior framing: exact-match is **not** the weak surface. `acceptedByForm` normalizes before
comparing, so across 28 packs × 2 instances the alternate spellings mostly land:

| Probe | Accepted | Refused |
|---|---|---|
| uppercase variable | 34/34 | 0 |
| U+2212 minus | 27/27 | 0 |
| spaces around operators | 14/14 | 0 |
| roster joined by `;` | 4/4 | 0 |
| roster joined by ` and ` | 4/4 | 0 |
| `\sqrt{}` for ascii | 4/4 | 0 |
| root glyph `√` | 4/4 | 0 |
| implicit product | 2/2 | 0 |
| explicit product | 17/19 | **2** (POL.2) |
| leading `+` | 0/2 | **2** (RAT.6) |
| spelled-out number | 0/2 | **2** (RAT.6) |
| trailing period | 25/56 | **31** |

Total loss on the exact-match cohort: **37 refusals out of 176 probes**, concentrated in the
trailing-period row. The 16 nodes refusing a trailing period are NUM.3, NUM.4, EXP.1, RAD.1,
RAD.2, POL.1, POL.2, POL.8, RAT.1, RAT.2, RAT.3, RAT.4, RAT.6, LF.2, LF.4, EL.5 — for example
RAT.1 refuses `(x + 8)/(x + 5), x = 8, x = -5.` where the key is the same string without the
period.

Every exact-match refusal returns `note: null` (line 325), so the card shows only its generic
miss line. On a checked pack a learner at least gets a note naming the format; on these 28 they
get nothing to act on. That asymmetry in *feedback* is a more consistent loss than the
correctness misses, and it applies to all 37.

### The "16 compound/multipart packs need a string-to-payload adapter" claim

**Still true, and the 16 are named.** `docs/cfu-check-migration-rulings.md` §"Ruling three" is
the standing ruling, and all 16 packs are inside my measured exact-match 28:

- **`rational_answer`, wanting `{expression, excluded_values}`** — RAT.1, RAT.2, RAT.3, RAT.4,
  RAT.5.
- **`multipart`, two quantities of different kinds** — CG.1, FUN.1, FUN.4, FUN.8, FUN.10, LF.1,
  LF.3, EL.2, EL.4.
- **`multipart`, two quantities of the same kind in a fixed order** — FUN.3, FUN.5. The ruling
  is explicit that these must not be given `solution_set`, since a set is unordered and `14, 38`
  would then grade correct against FUN.3, whose prompt fixes the order.

The adapter does not exist in the tree. Nothing in this sweep contradicts the ruling.

One clarification about what my sweep does and does not say here, because it is easy to read it
the wrong way: all 16 grade correctly today, and all 124 CFU instances are string-keyed and were
graded from a plain string. That is **not** evidence against the claim. The adapter is not needed
to grade these packs — exact match already does — it is needed to *route them to the checker*, so
they can earn a `reason_code` instead of a bare "Not quite". Gradability and routability are
different questions and only the second is at issue.

(For completeness on the practice side: 217 of 2,265 practice items carry a non-string key. They
were graded by handing `checkAnswer` the key object and all 217 pass. Mapping those 217 back to
pack names is **NOT DONE**.)

### The migration doc's own census has gone stale — POL.6 moved

`docs/cfu-check-migration-rulings.md` closes with a census it calls exhaustive: *"62 CFUs: 33
checked ... and 29 check-less, being 8 whose form is the teaching point, 5 the checker would
withdraw acceptance from, and 16 whose answer will not fit one field. 8 + 5 + 16 = 29, with
nothing left over and nothing counted twice."*

**At `3fbe5fcb` it is 34 checked and 28 check-less.** The pack that moved is **POL.6**, which the
doc still lists in Ruling one as permanently exact-match. So the partition no longer partitions:
Ruling one's table names 8 packs and only 7 of them are still check-less.

This is corroborated inside the tree rather than only by my count —
`cfuAcceptanceConvention.test.tsx:96` already records it: *"POL.6 left afterwards, as the
eleventh, so the figure above is twenty-five at this tip."* The guard tracked the departure; the
prose doc did not.

**The regression Ruling one predicted did not happen.** It warned that a check on POL.6 would let
through *"`-5(2x - 3)(x + 1)^3`, the whole function"* when the prompt asks only for the leading
term. Graded at this tip:

| Node | Submitted | Verdict |
|---|---|---|
| POL.6 | `-10x^4` (the key) | correct |
| POL.6 | `-5(2x - 3)(x + 1)^3` | **incorrect / `value_mismatch`** |
| POL.6 | `-5*(2*x - 3)*(x + 1)^3` | **incorrect / `value_mismatch`** |

So the migration was safe on the exact spelling the ruling feared. The finding is the stale
document, not a bad migration.

---

## 6. Technique 3 — prompt-versus-key derivation

The point of the technique is to catch a prompt that no longer asks for its own answer, so the
derivation must read the **rendered prompt text** and never `template_params`. A derivation that
touches the params agrees with the key by construction.

**Prior rounds are confirmed: there is no prompt-derivation guard for D1 or D10 in the tree.**
`validateTemplates` checks key-against-spec, which is a different claim. Nothing in either
package re-reads the rendered prompt.

What this round measured, with a throwaway harness that parses the prompt's KaTeX/ASCII math,
evaluates it, and compares against the item's key:

| | Count |
|---|---:|
| D1 templates | 34 |
| D10 templates | 10 |
| **Total templates** | **44** |
| Covered by a prompt-text derivation | **44** |
| Uncovered | **0** |
| Draws per template | 60 |
| Derivations run | **2,640** |
| **Disagreements between prompt and key** | **0** |

**Every D1 and D10 template's rendered prompt agrees with its answer key across 2,640 sampled
draws.** No reworded-prompt defect exists in these two domains today.

### Proving the derivation reads the prompt

A clean green here is exactly the result a params-reading derivation would also produce, so the
green is worthless without a demonstrated red. The harness therefore injects a defect: for each
covered template it takes a rendered prompt, finds the math spans, increments the first digit in
each, and re-runs the derivation against the unchanged key. A derivation reading the prompt must
now disagree; one reading the params will not notice.

| | Count |
|---|---:|
| Prompts injected | 49 |
| **Inert under injection** (derivation did not notice) | **0** |

All 49 flipped to a disagreement. So the zero above is a measurement of the prompts, not an
artifact of the harness.

**Caveat on scope:** 44 templates is D1 and D10 only, as the plan scoped it. The other eight
domains have no prompt-derivation coverage either and were not swept here. That is **NOT DONE**
and is the largest remaining hole in this stream.

---

## 7. Summary of what to fix, in order

1. **P0-1** — move the accepted-list check ahead of the two format gates in `gradeCfuAnswer`, or
   teach `isNumericLiteral` the three shapes. Clears 12 advertised-form refusals, 8 spaced
   fractions, 38 trailing periods, and stops a false note from being shown over a right answer.
2. **P0-2** — RAT.6 `+3`.
3. **P1-1** — POL.2 explicit product.
4. **P1-2** — decide whether lowest terms is a rule for the node or for the surface, on TRG.3/4/9.
5. **P1-3** — EL.2's three uppercase-refusing practice items.
6. **P2-1** — RAD.1/RAD.2 `\sqrt{}` parity. The migration doc already prescribes the fix (a LaTeX
   and root-glyph normalizer in front of the parse); this round adds that it is needed on the
   practice surface too, on 55 items.
7. Trailing period generally: pick one behaviour and apply it to both surfaces.
8. **Docs** — correct `docs/cfu-check-migration-rulings.md`: POL.6 has migrated, so the closing
   census (33/29, and Ruling one's 8) no longer partitions the population.

Note that items 2 and 3 are both **one accepted-list entry each**, on packs whose exact-match
status is deliberate and correctly ruled. Neither needs a migration and neither is caught by
`cfuAcceptanceConvention.test.tsx`, which asserts separator closure rather than closure under
every notation a learner types.

Nothing above was fixed in this stream.

## 8. Not done

- Mapping the 217 non-string practice items back to pack names.
- Prompt-derivation coverage for d2–d9 (34 of 44 templates swept were D1; the other eight domains
  are unswept).
- Both harnesses were deleted, so these numbers are reproducible only by rebuilding them.
