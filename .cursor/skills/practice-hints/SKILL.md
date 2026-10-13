---
name: practice-hints
description: Author progressive hints and worked-solution step arrays for calc-readiness item-bank practice templates. Use when writing or editing a template's generate() in packages/item-bank (d1/templates.ts, d1/practice.ts) so its hints and worked_solution satisfy validateTemplates and the reveal flow. Covers the 1-3 progressive-hint rule, never-leak-the-answer guard, no-em-dash punctuation, the ordered worked_solution steps array, and when to surface a same-domain non-prereq cross-skill NPC disclaimer keyed by template_id.
---

# Practice hints and worked solutions

Every practice item carries **progressive hints** and a **worked solution**, returned by the template's `generate()` on each rendered/frozen instance (`RenderedItem.hints`, `RenderedItem.worked_solution` in `packages/item-bank/src/template.ts`). The web UI (`apps/web/src/lessons/LessonPractice.tsx`) reveals hints one at a time; only after all hints are exhausted may the learner reveal the worked solution, then retry a fresh instance or move on. Source of truth: `docs/Mastery_Scoring_Spec.md` §4.

For the **full template pipeline** (shape, generate, pool registration, SVG pairing, NPC notes), follow the **`practice-templates`** skill. This skill is the deep-dive for hints + the `worked_solution` steps array.

**These rules also govern the end-of-lesson CFU.** A lesson pack's `cfu.worked_solution` is rendered by the same `WorkedSolution` component, on the same reveal-after-the-hint contract, so every rule below about the steps array applies to it unchanged: one move per entry, KaTeX in `$...$`, no em dashes, no step that restates itself across an `=`, and the last entry naming the answer. Two differences, both about where the array lives rather than what it says. It is authored in `content/lessons/<domain>/<NODE>.json` instead of returned by a `generate()`, so it is written once against fixed numbers and has no draw to branch on; and it is checked by `npm run check:lessons` rather than by `validateTemplates`, which additionally requires the last step to name an accepted spelling. A converted check's re-asked instances take their steps from the drawn template, so those are covered by the ordinary template rules here. See `.cursor/skills/author/reference.md` §5a for the CFU-side contract.

**The same step-array rules apply to teaching slide section 2** (`worked_examples[i].steps`, documented in `author/reference.md` §1). Differences from CFU/practice worked solutions:

- Shown **during teaching** (between the lecture and the gated widget), not on reveal after a miss.
- The steps sit under an authored **`prompt`** naming the instance, which a reveal has no equivalent of and does not need: a practice reveal still has the item's own question above it, where a teaching slide has only the advisor's line about the idea. So the prompt is required here and is capped at 2 sentences.
- Written once against fixed numbers for that slide; may use the **same instance** the section-3 widget will practice (unlike the CFU, which must use fresh numbers).
- Early steps must not leak the final answer (same progressive discipline as hints), but the last step **does** name the result, because section 2 is the full walkthrough.
- **2 to 6 steps per entry**, checked by `npm run check:lessons` (validator rule 13) along with the em-dash and meta-commentary rules, which run over the prompt as well. An entry may be `null` where the slide has no instance to walk.

**The BAR a hint is written against is `author` R13, and this skill does not restate it.** Read it before authoring hints. The split is deliberate and there is no second source of truth: R13 rules on what a hint may SAY (name the rule, point at the part of the expression it governs, then stop; tiers escalate name the rule → point at the part → work a DIFFERENT instance), and this file covers the mechanics of getting one written. Two things R13 carries that nothing below repeats, and both are easy to trip:

- **A hint must not assert a property of the learner's own instance.** "The bottom number is a perfect square, so its root is a whole number" does the diagnosis for them. Point at the check instead: "check each half against the perfect squares you know."
- **A hint must not BRANCH on the answer.** Serving one wording when the net exponent is zero and another otherwise leaks through the correspondence rather than through either wording: only the zero case sends the learner to the zero-exponent rule, so being sent there announces the answer. Cover every case in one wording. This is the strict form of the every-draw rule below.

R13 also carves out two things this skill's rules must not be read as contradicting: a **worked solution is supposed to substitute the numbers**, because it arrives after the attempt and that is its whole job, and a hint **may state a general consequence of the rule** ("a square root times itself gives back the number inside it"), because that is the rule's content and not this instance's answer.

## Hints

- **No em dashes** in hint or worked-solution text. Use commas for mid-sentence breaks and periods or colons for elaboration.
- **Author as many hints as add information, 1 to 3, and never pad.** There is no target count: most items land on 2, and 3 is right only when all three genuinely advance the learner. Cut any hint that restates an earlier one ("do the multiplication first" then "work out the product first") or that closes with no new content ("then combine the two results using the operation shown"). `validateTemplates` enforces `1 <= hints.length <= 3` (`hint_count_mismatch` otherwise). Remember that reveal unlocks once hints are exhausted, so a lone hint hands the learner the reveal button immediately.
- **Progressive scaffolding.** Each hint reveals the next step/strategy: identify the operation → carry it out conceptually → assemble the result. Later hints help more than earlier ones. Do not reword the same hint.
- **Never reveal the answer.** A hint must not state the final value or write a full solving expression. Authoring hints **param-free** (no numbers from the instance) reliably guarantees this; `validateTemplates` also rejects any hint containing the instance's `answer_key` (`hint_leaks_answer`). Watch bare single-letter keys (`x`, `n`, `t`): the leak check matches them as standalone tokens inside hint words. **A word key leaks as easily as a number.** Where the key is a verdict (`parallel` / `perpendicular` / `neither`, `one solution` / `no solution` / `infinitely many`) or a bare `0`, the hint has to DESCRIBE the outcome rather than name it: "no relationship holds", "the graph settles onto the x-axis". The check strips whitespace before matching, so "neither test passes" leaks `neither` too, and it fires only on the branch where that word is the key, which is why a hint can pass every other draw and still fail.
- **Every hint must be true for every draw.** One hints array is authored once and rendered for every instance the template can produce, so a sentence describing the draw you happened to picture is wrong on the other branches, and `validateTemplates` cannot catch it. Three fixes, in order of preference: **state the rule rather than the inventory** ("nothing that is left outranks anything else, so work from left to right" instead of "only adding and subtracting is left", which is false when `op` gives two additions); **interpolate the params-derived word** (`opWord`, `obj.singular`, or a whole clause such as `op === 1 ? "add the two results" : "subtract the product from the square"` — these are derived shape words, not instance values, so they do not break param-freedom); or **make it conditional** ("rewrite them over a common denominator if they do not already share one", "the sum may still reduce"). The recurring traps:
  - Listing the operations a draw contains when an `op` flag can drop one of them.
  - Prescribing a term order ("multiply by the variable, then by the constant") when an `order` flag can flip the prompt. Say "each of the two terms inside" instead.
  - Naming a subtraction without its direction. "Subtract the two results" does not say which comes first.
  - Describing both halves of a sign rule ("a negative times a negative … and a negative times a positive …") when the guard only forces **one** negative factor, so one half may never occur. Attach the rule to each product instead: "each product takes its sign from its own two factors".
  - Firing on one branch only, so the other branch gets a hint that says nothing. A hint opening "When the changes pull in opposite directions" is dead weight on the draw where the water falls twice; cover both directions in the one sentence, as `d1.num-s.l1` does. A hint whose whole body sits behind "When the slopes match" is dead on the draw where they differ, and if that draw is the one the earlier hint already settled, the learner's last hint tells them nothing at all.
  - Borrowing one scenario's vocabulary when the template draws several stories. "The flat amount" is the van rental; the same template's other draw is a pool that already holds water, and a fee it never mentions. Use the term the node uses across all of them ("the starting value").
  - Claiming a step that a coefficient of $1$ removes. "Then divide" is false on the draw where the collected coefficient came out $1$, which is exactly the draw whose `worked_solution` drops the divide step. Say "divide if the coefficient is not already $1$", and check the steps array for a `cond ? "" : step` as the tell that such a draw exists.
  - Demanding work the grader does not require. `d1.num-3.l3` grades under `combined_constants` and its advisor note tells the learner the variable terms may stay uncombined, so a hint ordering them combined contradicts the note.
- **Era word-problem prompts get a story-to-math first hint.** When a prompt is a genuine era word problem (in D1, the Prehistoric era: a waterline stake that rises and falls, a coil of cord measured in paces, tool bundles handed to groups, parts of one drying rack; see the `practice-templates` skill), the learner's first obstacle is translating the story, not the arithmetic, so a hint that opens "Look at the sign of each number" is useless against a prompt that says the water "falls $8$ notches". Lead with the translation, which is what `d1.num-s.l1` actually ships: *"A rise counts up from the mark and a fall counts down, so write each change as a signed number before you combine anything."* Then stay procedural for the remaining hints. This is safe because **hints are practice-only**: `hashItemDefinition` covers `node_id`/`prompt`/`answer` only, the diagnostic shows no hints at all, and every pool that carries hints is built with `form: "practice"`, so a hint is never read against the neutral assessment prompt. A template that themes only conditionally (`NUM.F` themes only when the result stays under $1$) still needs wording that reads both ways: its shipped *"Both amounts count the same size piece"* works for the drying rack and for a bare `Evaluate`. The `worked_solution` stays purely procedural and answer-derived either way.

## Worked solution

- `worked_solution` is `readonly string[]` — **one clear step per entry**, and the **last entry is the final answer**. Shown only on reveal (as the colorful step-card fallback when no SVG is registered). It **does** walk the full computed steps to the value.
- **Do not** hardcode step numbers, colors, or bullet/list markup. The renderer (`apps/web/src/lessons/WorkedSolution.tsx`) supplies numbering, colored badges, connectors, and final-answer emphasis — author only the step text.
- **Compute each step from the same params as the prompt** so retries/variants stay correct.
- **Never claim a step the params did not require.** A steps array is authored once but rendered for every draw, so "Reduce to lowest terms: …" prints `3/5 = 3/5` on every draw that arrived already reduced. Test the values and branch: either swap in a confirming step (`… is already in lowest terms, so that is the answer.`) or drop it, since `workedSolution([...])` filters blanks so `cond ? "" : step` removes an entry. `d1.num-f.l1/l2/l3` and `d1.num-f.l2b` in `packages/item-bank/src/d1/nodes/NUM.F/index.ts` are the worked examples. The same applies to any "combine", "distribute" or "simplify" wording. `validateTemplates` enforces the narrow half of this (`worked_solution_identity_step`, raised when a step repeats itself across an `=` on any sampled draw); wording that merely overclaims is on you.
- **Hints stay param-free, so soften instead of branching.** A hint cannot see the values, so write "then reduce if needed" rather than "then reduce".
- Use the shared helper `workedSolution([...])` and formatters in `packages/item-bank/src/d1/hints.ts` (`signed`, `fracFromString`) plus the KaTeX prompt builders. Every math element stays in `$...$` — that holds for hints too, and for anything else a learner reads (see the **`lesson-katex`** skill, which now covers the diagram renderers as well). The renderer auto-colors operators/relations.

## Scoring behavior (don't re-implement in content)

Hints do not cost credit; reveal does. A hinted-then-correct slot counts correct; a revealed slot counts not-correct until recovered on a fresh instance. This is engine/mastery behavior.

## Cross-skill / other-node dependencies

If the problem requires a skill taught on another node, the learner should be notified, but **only for nontrivial deps**. Rule of thumb (skill graph in `packages/skill-graph/src/skill_graph.json`): **same domain, and the two nodes are not prerequisites of each other** → add a short advisor NPC disclaimer. **Do not** call out obvious foundation deps (e.g. a later domain relying on Domain 1, or a node that is already a prereq of the current one).

- Put the disclaimer in `apps/web/src/lessons/practiceNotes.ts` as a line constant, and register it on the **exact** `template_id` in `PRACTICE_NPC_NOTES` (looked up by `getPracticeNpcNote(frozen.template_id)` in `LessonPractice.tsx`).
- **Key by `template_id`, never by node/difficulty alone.** A `(node, difficulty)` cell can hold alternate shapes that do not need the other skill; those shapes must not inherit the warning.
- **Do not** put the disclaimer in hints, the prompt, or the `worked_solution` steps, and do not remove/contradict/duplicate an existing line.

## Also required

Every new practice template needs a registered SVG worked-solution visual too — see the `worked-solution-svg` skill (and the pairing checklist in `practice-templates`). The `worked_solution` steps array is the fallback; the SVG is the primary reveal UI, and its math and caption are KaTeX just like the steps.

## Verify before finishing

- 1-3 hints, progressive, no two saying the same thing, none leaking the answer (ideally param-free).
- Every hint is true for every draw: read each one against the extreme instances, not the typical one. Both `op` values, both `order` values, every `kind` / `dir` / `scen` value, the sign combination with the fewest negatives the guard allows, the draw whose quotient came out a whole number, and the result that arrived already reduced.
- `worked_solution` is an ordered steps array ending in the final answer, computed from the prompt's params.
- No step claims work the params did not require: generate several instances and read the already-reduced / nothing-to-combine branch, not just the interesting one.
- No hardcoded numbering/markup in steps; all math in `$...$`.
- No em dashes (—) in any hint or worked-solution step (use commas, colons, periods, or exclamations).
- Same-domain non-prereq cross-skill deps have a `PRACTICE_NPC_NOTES[template_id]` entry (or are explicitly not needed); no disclaimer duplicated into hints/prompts.
- `validateTemplates` passes.
