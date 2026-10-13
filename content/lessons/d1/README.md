# D1 lesson packs

One JSON pack **per node**, 1:1 with the six MVP buildings on the city map:

- `NUM.S.json` - Signed numbers
- `NUM.F.json` - Fractions
- `NUM.2.json` - Order of operations
- `NUM.3.json` - Field properties / distributive
- `NUM.4.json` - Simplify / combine like terms
- `NUM.5.json` - Ratios, rates, proportions, percents, units

`apps/web` loads these packs directly (`apps/web/src/lessons/d1.ts` globs this
directory) and opens the matching node's mini-lesson when a building is entered.

## Pack schema

```jsonc
{
  "node_id": "NUM.S",          // MVP node id (matches the building)
  "title": "Signed numbers",   // shown as the lesson heading
  "mini_lesson": [              // one string per paragraph
    "Markdown text; **bold** and LaTeX math delimited by $...$ are supported."
  ],
  "visuals": [                  // optional inline widgets
    { "after": 0, "id": "absolute-value-explore", "gates": true }
  ],
  "cfu": {                      // optional end-of-lesson check
    "prompt": "Evaluate $-7 + 4$.",     // Markdown + LaTeX, via LessonProse
    "accepted": ["-3"],                  // matched after normalization
    "hint": "One short hint (Markdown + LaTeX).",
    "check": {                            // optional: grade by math equivalence
      "answer_type": "numeric",           // "numeric" | "expression"
      "answer_key": "-3",                 // canonical correct answer
      "allowed_symbols": ["x"]            // expression only
    },
    "worked_solution": [                  // required: the reveal's steps
      "Adding a positive to a negative moves right along the line: $-7 + 4$.",
      "Four steps right from $-7$ lands on $-3$."
    ],
    "variants": {                         // required: where the re-ask draws from
      "template_id": "d1.num-s.l1",
      "count": 2                          // >= 2, and it counts the authored question
    }
  }
}
```

- `mini_lesson` paragraphs render through `LessonProse` (Markdown + KaTeX).
  Backslash LaTeX commands must be JSON-escaped, e.g. `"$\\dfrac{2}{3}$"`.
- `visuals` is optional in the schema, but every D1 slide carries one. Each entry
  places a widget after the given `mini_lesson` paragraph index, and all 24 in this
  domain set `"gates": true`, so the advisor's "Next" stays locked until the learner
  finishes the interaction.
- **Which `id`s are valid is not a list kept in this file.** `REGISTRY` in
  `apps/web/src/lessons/visuals.tsx` is the source of truth, and the validator
  requires two things of an entry: the id is registered there, and it ends in an
  interaction-suffix word (`-explore`, `-play`, `-builder`, `-sorter`, `-classify`
  and the rest; `.cursor/skills/author/reference.md` carries the full allowlist,
  and `test/interactionSuffixAllowlistParity.test.ts` keeps that document and the
  validator from parting company). The suffix is how a pack declares a gated,
  `onComplete`-driven widget rather than a static diagram, which is why the legacy
  static ids this bullet used to list -- `signed-number-line`,
  `equivalent-fraction-bars`, `percent-bar`, `pemdas-key`, `unit-rate` and the rest
  of that set -- are now exactly what the rule REJECTS. They are gone from the
  registry, superseded by the gated widgets below.
- The ids D1 ships today, in slide order, with the packs themselves as the record:
  - `NUM.2` -- `pemdas-key-explore`, `pemdas-mnemonic-explore`, `pemdas-solver-ltr`,
    `order-matters-play`, `pemdas-solver`
  - `NUM.3` -- `commutative-associative-play`, `distribute-builder`,
    `identity-inverse-match`
  - `NUM.4` -- `like-terms-classify`, `like-terms-sorter`, `distribute-combine-play`
  - `NUM.5` -- `unit-rate-play`, `proportion-cross-play`, `percent-slider`,
    `unit-conversion-spot`
  - `NUM.F` -- `fraction-parts-explore`, `equivalent-fraction-play`,
    `common-denominator-multiples`, `fraction-multiply-play`, `fraction-divide-play`
  - `NUM.S` -- `absolute-value-explore`, `signed-addition-walkthrough`,
    `subtract-as-add-play`, `sign-rules-table`
- `cfu` is optional: one lightweight check-your-understanding question shown at
  the end of the lesson. `prompt` and `hint` render through `LessonProse`
  (Markdown + KaTeX). `accepted` is the list of correct answers; the learner's
  input is matched after normalization (trim, lowercase, strip whitespace), so
  include spacing/order variants (e.g. `["3x+12", "12+3x"]`). It is a teaching
  check only — unlimited tries and one revealable hint, with no scoring or
  mastery write.
- **The reveal.** Once the hint is spent, a wrong attempt offers "Reveal answer".
  Taking it prints the answer, the reasoning and the worked solution, then re-asks
  a different question of the same concept; only a second reveal releases the
  lesson. Two fields carry that and both are required, enforced by
  `npm run check:lessons`:
  - `cfu.worked_solution` — ordered steps, one move per entry, and the last one
    has to name the answer. Same component and same rules as a practice
    template's, so `.cursor/skills/practice-hints/SKILL.md` governs it.
  - `cfu.variants` — `{ template_id, count }`, where `count` includes the authored
    question. The template is a pool one or a CFU-only generator in
    `apps/web/src/lessons/cfuVariants.ts`, and it needs a speller registered there
    under the same id that reproduces this pack's whole `accepted` list.
- `cfu.check` is optional and makes grading **form-independent**: the shared D1
  answer checker judges mathematical equivalence, so any equal form is accepted
  (e.g. `-2`, `-2.0`). Use it only for evaluate/compute questions where the form
  does not matter. Fields: `answer_type` (`numeric` uses exact-value equivalence;
  `expression` uses symbolic equivalence), `answer_key` (the canonical answer),
  and `allowed_symbols` (expression only, e.g. `["x"]`). Omit `check` for
  questions that require a specific form (simplify, expand, lowest terms) — those
  keep the exact `accepted` match. `accepted` is still authored as a fallback.
  For `numeric` checks the learner must enter a single evaluated number (integer,
  decimal, or simple fraction); an expression like `-8+6` is rejected, so
  "Evaluate/compute" questions require the computed result.

## Scope

Teaching text plus an optional per-lesson check-your-understanding question.
Practice items and any mastery/scoring remain out of scope here and gated on the
documented instructional-design review.
