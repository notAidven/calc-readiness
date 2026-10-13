# Which CFUs went onto the checker, and why the rest did not

A lesson node's check-for-understanding question is graded one of two ways. With a
`cfu.check` block it goes through the shared answer checker, which computes equivalence and
returns a `reason_code` the card can turn into a diagnostic line. Without one it is exact
string match against the hand-written `cfu.accepted` list, which returns a boolean and no
reason, so a learner gets a bare "Not quite" whatever they got wrong.

Before this change 23 of 62 CFUs carried a check, and the route was closed to most of the
rest at the checker rather than at the packs: `cfuChecker.ts` built `createD1AnswerChecker`,
whose dispatch answers `unsupported_answer_type` to `interval`, `solution_set` and `point`.
Routing CFU grading to `createProductAnswerChecker` opened those types. This is the ruling on
which packs then moved and which stayed, measured against each pack's own source rather than
inferred from the shape of `accepted[0]`.

Ten packs migrated, taking the checked half from 23 to 33. Twenty-nine did not, for three
different reasons, and the three are worth keeping apart because only one of them is a
permanent no.

## Migrated (10)

| Pack | `answer_type` | What it buys |
| --- | --- | --- |
| RAD.3 | `numeric` | equivalent arithmetic spellings of `125` |
| RAD.4 | `expression` | symbolic equivalence over `6\|x^3\|`, whose 16 hand-written spellings are not closed |
| LIN.4 | `interval` | `BOUND_INCLUSIVITY_NOTE` on a wrong bracket |
| LIN.5 | `solution_set` | order-independence over `{39, 51}`, and the three separators as grammar rather than as list entries |
| LIN.6 | `interval` | `BOUND_INCLUSIVITY_NOTE` on a wrong bracket |
| FUN.2 | `interval` | `BOUND_INCLUSIVITY_NOTE` on a wrong bracket |
| POL.3 | `solution_set` | `EXTRA_SOLUTION_NOTE` / `INCOMPLETE_SET_NOTE` on a roster with a member missing or added |
| POL.4 | `solution_set` | the same, plus fraction equivalence inside a member |
| POL.5 | `numeric` | equivalent arithmetic spellings |
| POL.7 | `numeric` | equivalent arithmetic spellings |

LIN.5 could not migrate until `parseValueList` split on a depth-0 `;` and `" and "` as well as
`,`. Before that widening the checker answered `parse_error` to `39; 51`, `51; 39`,
`39 and 51` and `51 and 39`, all four of which the pack's own list accepts, so migrating early
would have turned four correct answers wrong.

RAD.4 needed one content edit beyond the check block. Its check declared
`allowed_symbols: ["x"]`, and its variants template redraws the variable from
`EXPRESSION_VARIABLES` — so the re-ask's own printed answer, `3*abs(t^3)`, came back from the
checker as `unknown_symbol`. `cfuVariantGrading.test.ts` caught it, since a computed instance
inherits the pack's spec and only its answer key changes. The declaration is now the four
letters the template can draw.

## Ruling one: the form IS the teaching point (8 packs)

`types.ts` scopes `check` to grading that does not depend on the form the answer is written
in. These packs are on exact match deliberately, because the representation is the thing being
assessed. A check block with `simplification: "none"` would widen acceptance and undo the
question.

| Pack | Prompt asks for | What a check would let through |
| --- | --- | --- |
| NUM.3 | expand `3(x + 4)` | `3(x + 4)` itself, the unexpanded form |
| NUM.4 | simplify `-2x + x^2 + 7x` | the uncombined `-2x + x^2 + 7x` |
| EXP.1 | "positive exponents only" | `x^-2`, the negative-exponent form |
| POL.1 | "as a polynomial in standard form" | `(x + 6)(2x + 1)`, the unexpanded product |
| POL.2 | "factor completely" | `2x^2 + 2x - 24`, the unfactored polynomial |
| POL.6 | the leading term, "coefficient times a power of x" | `-5(2x - 3)(x + 1)^3`, the whole function |
| POL.8 | the quotient of a division | the undivided dividend over the divisor |
| EL.5 | "condense into a single logarithm" | `3 log 2 + log y`, the expanded sum |

There is a real follow-up here, and it is not a check block: several of these have a
`simplification` profile that WOULD express the rule (`positive_exponents` for EXP.1,
`standard_form` for the polynomials). Giving them one is a different piece of work from this
migration, because it needs each profile measured against the pack's list before it ships, and
`simplification: "none"` is the only setting available without that measurement.

## Ruling two: the checker withdraws acceptance the learner has today (5 packs)

These were on the earlier census's migratable list and were refused by measurement. On a
checked pack the authored question's `accepted` list is NOT consulted — the checker decides
alone — so every spelling in the list is a promise migrating would break. Graded through the
product checker at this tip:

| Pack | Spellings lost | The family that goes |
| --- | --- | --- |
| RAD.1 | 11 of 15 | `\dfrac{6\sqrt{2}}{5}`, `6√2/5`, `6sqrt2/5` — LaTeX and the root glyph, `invalid_input` |
| RAD.2 | 6 of 9 | the same |
| RAT.6 | 12 of 14 | `x = 3`, `{x = 3}` — a value written as an equation |
| LF.2 | 7 of 17 | `-3x - 1` and `f(x) = -3x - 1` — the right-hand side alone, and function notation |
| LF.4 | 26 of 31 | the whole `x = 2, y = -3` family, which `comparePoint` reads as `wrong_notation` |

`cfuCheckAcceptance.test.ts` is the assertion these would fail; it sweeps every checked pack's
whole accepted list through the checker its check now routes to. The follow-up is on the
checker rather than on the packs: a LaTeX and root-glyph normalizer in front of the parse
would take RAD.1 and RAD.2, and a `point` comparator that reads `x = 2, y = -3` as a
coordinate pair would take LF.4. Until one exists, exact match is strictly better for the
learner than equivalence over a narrower grammar.

## Ruling three: one text field cannot carry the answer (16 packs)

The product checker's compound types need a structured payload, and a CFU has one text input.
This is the set that needs a string-to-payload adapter before any of it can move.

**`rational_answer` wants `{expression, excluded_values}`** — RAT.1, RAT.2, RAT.3, RAT.4,
RAT.5. Each answer is a reduced expression followed by the values the original denominator
forbade: `(x + 8)/(x + 5), x = 8, x = -5`.

**Two quantities of different kinds, which is `multipart`** — CG.1 (`(-3, 4), 10`: a midpoint
and a length), FUN.1 (`-19, no`: a value and a yes/no), FUN.4 (`(3, 8), 11`), FUN.8
(`4x - 5, 7`: a rule and a value), FUN.10 (`(6, 10), maximum`), LF.1 (`-1/2, decreasing`: a
slope and a word), LF.3 (`-15x + 320, 140`), EL.2 (`y = 5, (0, 4)`: an equation and a point),
EL.4 (`x < 9; x = 9`: an inequality and an equation).

**Two quantities of the SAME kind, in a fixed order** — FUN.3 (`38, 14`) and FUN.5 (`2, -4`).
These look like `solution_set` and must not be given it. Both prompts fix the order — FUN.3
says "put the charge for the 5 ton load first", FUN.5 says "give the two rates in that order" —
and a solution set is unordered, so `14, 38` would grade correct against a question whose
answer it is not. This is the misclassification the shape of `accepted[0]` invites, and it is
the reason every pack above was read against its prompt rather than against its list.

### The follow-up this set needs

A **string-to-payload adapter**: one function per compound shape that reads the single field a
learner types and produces the structured payload the checker's type wants, so
`(x + 8)/(x + 5), x = 8, x = -5` becomes `{expression, excluded_values}` and `-1/2, decreasing`
becomes two parts with their own specs. It belongs beside `cfuChecker.ts` rather than in the
checker, because the parsing is about what a CFU's one field means and the checker's contract
is already correct. Two things it has to get right, both visible in this set: the separator
grammar is the one `cfuAcceptanceConvention.test.tsx` measures (`,`, `;` and `" and "` at
bracket depth zero, and never inside a coordinate pair or a fraction's braces), and an ordered
pair of same-kind quantities is a `multipart`, never a `solution_set`.

Until it exists these 16 stay on exact match, and `cfuAcceptanceConvention.test.tsx` is what
holds their lists closed under the notation a learner types.

## The census these three add up to

Measured at this tip rather than tallied from the sections above, because a ruling that does
not partition the population is a ruling with a pack quietly outside it. 62 CFUs: 33 checked
(the 23 that predate this change plus the 10 migrated) and 29 check-less, being 8 whose form is
the teaching point, 5 the checker would withdraw acceptance from, and 16 whose answer will not
fit one field. 8 + 5 + 16 = 29, with nothing left over and nothing counted twice.
