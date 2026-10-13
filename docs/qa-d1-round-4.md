# D1 (Numbers & Operations) QA round 4, at `65d7cdbf`

Branch `anthony/d1-qa-round-4`, worktree pinned at `65d7cdbf118682449aba4777a594e682b5f1d369`
(`Merge pull request #553 from <org>/evan/era5-runtime-wiring`, 2026-08-04). Not
re-pinned mid-review. No fetch, pull, rebase or merge was run.

Nodes reviewed: `NUM.S`, `NUM.F`, `NUM.2`, `NUM.3`, `NUM.4`, `NUM.5`. One directory,
`content/lessons/d1`, plus the widget sources those packs mount and
`packages/item-bank/src/d1`.

This is the QA round (PR A). No reveal and no re-parameterised reset was implemented; the
classification in §6 is the deliverable the authoring PR (PR B) starts from.

---

## 1. Counts re-derived at this SHA

Every figure below was measured here, not carried over. The derivation reads
`content/lessons/d1/*.json` for the packs, maps each `visuals[].id` through the `REGISTRY`
literal in `apps/web/src/lessons/visuals.tsx` to a component, and resolves the component
through the `import { X } from "./interactive/X"` lines to a source file (two resolve to no
import line, which is how the two inline widgets are found).

| Figure | Plan, at `4cbba050` | Measured at `65d7cdbf` | Verdict |
|---|---|---|---|
| Packs | 6 | **6** | confirmed |
| Slides (`mini_lesson.length` summed) | 23 | **23** | confirmed |
| Worked examples (non-null `worked_examples[i]`) | 21 | **21** | confirmed |
| Placed widgets (`visuals[]` entries summed) | 24 | **24** | confirmed |
| Widgets lacking a reveal | 18 | **18** | confirmed |
| Same 18 in `SINGLE_BOARD` | yes | **yes, exactly** | confirmed |
| Replay pairs (slide has a worked example AND a widget) | 21 | **21** | confirmed |
| Widgets inline in `visuals.tsx` | 2 | **2** (`pemdas-solver`, `pemdas-solver-ltr`) | confirmed |

Per-pack: `NUM.2` 4 slides / 3 examples / 5 visuals, `NUM.3` 3/3/3, `NUM.4` 3/3/3,
`NUM.5` 4/4/4, `NUM.F` 5/4/5, `NUM.S` 4/4/4. The two skipped examples are `NUM.F` slide 0
and `NUM.2` slide 0, both `null`, both deliberate per the 2026-08-02 log. `NUM.2` slide 0 is
also the one slide carrying two widgets, which is why 24 visuals sit over 23 slides while
only 21 slides pair a widget with an example.

**"Lacking a reveal"** is `!source.includes("<WidgetReveal")` AND no `./kinds/*` import, which
is the same predicate `revealReAsk.test.ts` derives `OFFERS_REVEAL` from, widened by the kind
check because a wrapper reaches its reveal through the kind. The 18:

```
pemdas-key-explore            pemdas-mnemonic-explore       pemdas-solver-ltr
order-matters-play            pemdas-solver                 commutative-associative-play
distribute-builder            like-terms-sorter             distribute-combine-play
unit-rate-play                proportion-cross-play         percent-slider
fraction-parts-explore        equivalent-fraction-play      common-denominator-multiples
fraction-multiply-play        absolute-value-explore        subtract-as-add-play
```

That set is character-for-character the D1 section of `SINGLE_BOARD` in
`widgetVariantPool.test.tsx:135-152`, and the file's own composition assertion
(`arrivedWithoutAPool` equals `SINGLE_BOARD`, line 368) passes at this tip, so the equality is
asserted rather than eyeballed. The complementary six — `signed-addition-walkthrough`,
`sign-rules-table`, `fraction-divide-play`, `identity-inverse-match`, `like-terms-classify`,
`unit-conversion-spot` — are the D1 widgets that both deal a pool and reach a reveal.

---

## 2. Round 3 reconciliation, at `65d7cdbf`

D1 has no `docs/qa-d1-round-N.md`; the prior record is
`work-log/anthony/2026-07-29-d1-d5-d7-qa-round-3.md` and
`work-log/anthony/2026-08-02-d1-three-section-lessons-wired.md`.

| # | Finding | Status | Evidence read at this tip |
|---|---|---|---|
| 1 | `FractionDividePlay` reveal spends the whole multi-answer instance | **STILL BROKEN** | Source carries `<WidgetReveal` (line 327) and no `othersRemain`. It sits in `HAND_BACK_OWED_IN_D1` (`revealReAsk.test.ts:225`), and that exemption is load-bearing: see the injection under #3. |
| 2 | `LikeTermsClassify` reveal spends the whole multi-answer instance | **STILL BROKEN** | `<WidgetReveal` at line 213, one per row, three rows per board; no `othersRemain` anywhere in the file. Listed at `revealReAsk.test.ts:227`. |
| 3 | `SignRulesTable` reveal spends the whole multi-answer instance | **STILL BROKEN**, demonstrated | Removed `"./interactive/SignRulesTable.tsx"` from `HAND_BACK_OWED_IN_D1` and ran the guard exactly as it ships: `1 failed \| 492 passed`, at *"./interactive/SignRulesTable.tsx tells the shared layer what is left of its board"*, `AssertionError: expected '/**\n * NUM.S interactive (slide 3): …' to match /othersRemain=\{/`. Restored; `git diff --stat` empty; `494 passed`. |
| 4 | Section-2 worked-example card overflows the ~347px scene body at 1024x580 | **CLAIMED BUT UNVERIFIED** | This is a spatial claim and I have no rendered frame at this tip. The prior frame is a true reading about the 2026-08-02 branch tip (`55175a36`) and nothing more. It has since expired in the ordinary way: `6affcfb6` (2026-08-04, *"Add a dev-only skip-to-CFU control in the in-city lesson footer"*) added a control inside that same scroller, so even the 347px number is void. I deliberately did **not** substitute a computed box for the frame. See §7 for what would discharge it. |
| 5 | Two deliberate R11 variety warnings on `NUM.3` / `NUM.5` | **NO LONGER APPLICABLE** | `node .cursor/skills/author/scripts/validate-lesson-pack.mjs --strict content/lessons/d1` exits `0` and prints no warning line; `npm run check:lessons` reports `d1: 6 pack(s), 0 error(s), 0 warning(s) -> PASS`. No landed note records the warnings' text, so this is a measurement of zero rather than a verified closure of two named items. |

---

## 3. Mechanical checks

**Lesson pack validator**, per directory, `--strict`, at this tip:

```
node .cursor/skills/author/scripts/validate-lesson-pack.mjs --strict content/lessons/d1
note: visuals.tsx parsed ... 254 registry entries, 0 of them captioned ... the INTENDED END STATE ...
OK: 6 lesson pack(s) passed validation.
=== VALIDATOR EXIT 0 ===
```

R8 is dormant-not-dead, and the note printed is the **parsed-and-empty** one, so the rule had
nothing to check rather than failing open. No `skill_graph.json not readable` line, so R18 ran.

`npm run check:lessons`: `10 domain(s) passed at the error tier`, `d1: 6 pack(s),
0 error(s), 0 warning(s) -> PASS`.

**Text scanner**, the four-path invocation the skill documents:

```
node .cursor/skills/lesson-qa/scripts/scan-lesson-text.mjs \
  content/lessons/d1 apps/web/src/lessons/interactive packages/item-bank/src/d1 \
  apps/web/src/lessons/cfuVariants.ts
OK: 218 learner-facing string(s) across 6 pack(s) and 4099 prose-shaped run(s) across 278 widget file(s), no rendering artifacts.
=== SCANNER EXIT 0 ===
```

218 strings and 4099 runs, so the sweep was not vacuous.

---

## 4. R34 three-section reading pass, all 23 slides

All six D1 packs declare `worked_examples`, so R34 applies to every slide.

**Section 1 budgets.** Read per slide, counted by hand: every `mini_lesson[i]` is 2 or 3
sentences. None reaches the 4-sentence shortlist ceiling, and none walks arithmetic — the
closest is `NUM.5[1]`, which states `ad = bc` as the property rather than working an instance.

**Section 2 prompt budgets.** All 21 prompts are 1 or 2 sentences. The two 2-sentence
prompts are `NUM.S[0]` (*"Two readings off the stake: $-11$ notches and $7$ notches. Which of
them sits farther from zero?"*) and `NUM.5[3]` (*"A stretch measures $72$ paces and one cord
is $8$ paces. How many cords long is it?"*), and both spend the second sentence asking the
question rather than restating the lecture. Every prompt names its instance and none states
the result. Steps are one move each, and the last step names the result, on all 21.

This half is also mechanically gated by validator rule 13 and it reports clean, which is
consistent rather than redundant: the rule counts sentences, and the read above is about
whether the prompt names the instance without becoming the lecture.

**Section 3, read as part of the slide.** Twenty-two of the 23 slides ask the learner to
produce something. **One does not: `NUM.S` slide 2** — see F-1.

---

## 5. Worked-example replay sweep — all 21 pairs

Compared against `worked_examples[i].prompt` and its steps, never against `mini_lesson[i]` and
never against the widget's header comment. Every pool enumerated, not just board 0. Six of the
24 widgets deal a pool: `IdentityInverseMatch` (2), `LikeTermsClassify` (2),
`UnitConversionSpot` (2), `FractionDividePlay` (2), `SignedAdditionWalkthrough` (2),
`SignRulesTable` (4). Every one of their boards is listed below.

| # | Slide | Section 2 instance | Widget | Every instance the widget deals | Collision |
|---|---|---|---|---|---|
| 1 | NUM.S 0 | $\lvert-11\rvert$ vs $\lvert 7\rvert$ | `absolute-value-explore` | one board: line $-5..5$, targets $-4$ and $4$ | none |
| 2 | NUM.S 1 | $-12 + 5$ | `signed-addition-walkthrough` | pool 0 $4 + (-7)$; pool 1 $-6 + 9$ | none |
| 3 | NUM.S 2 | $6 - (-11)$ | `subtract-as-add-play` | one board: $5 - 9$ | none |
| 4 | NUM.S 3 | $(-7)\times 8$, then $\div(-7)$ | `sign-rules-table` | four boards, differing only in which of the four sign cells arrives worked; the grid carries signs, not operands, and `whyCell` argues on $4$ and $3$ | none |
| 5 | NUM.F 1 | $\tfrac{6}{14}$ up and down | `equivalent-fraction-play` | one board: $\tfrac{12}{16}$ under $\div2$, $\div4$, $\times2$ | none |
| 6 | NUM.F 2 | $\tfrac{3}{8} + \tfrac{5}{12}$, LCD $24$ | `common-denominator-multiples` | one board: $\tfrac13 + \tfrac14$, LCD $12$ | none |
| 7 | NUM.F 3 | $\tfrac49 \times \tfrac38$ | `fraction-multiply-play` | one board: $\tfrac23 \times \tfrac45$ | none |
| 8 | NUM.F 4 | $\tfrac78 \div \tfrac{3}{10}$ | `fraction-divide-play` | pool 0 $\tfrac34 \div \tfrac27$; pool 1 $\tfrac56 \div \tfrac{10}{9}$ | none |
| 9 | NUM.2 1 | $36 \div 6 \times 3$ | `pemdas-solver-ltr` | one board: $20 \div 4 \times 2 - 7 + 1$ | none |
| 10 | NUM.2 2 | $9 + 8\times 2$ vs $(9+8)\times 2$ | `order-matters-play` | one board: $3 + 4 \times 2$ | none (see note) |
| 11 | NUM.2 3 | $30 - (2+4)^2 \div 4$ | `pemdas-solver` | one board: $2\times(1+3)^2 - 5$ | none |
| 12 | NUM.3 0 | $8 + 7 + 2$ | `commutative-associative-play` | one board: $3+5$ and $(2+4)+6$ | none |
| 13 | NUM.3 1 | $5(t-3)$ | `distribute-builder` | round 0 $2(n+5)$; round 1 $3(n-4)$ | none |
| 14 | NUM.3 2 | $8 \times \tfrac18 \times 13$ | `identity-inverse-match` | pool 0 over $a$ and $b$; pool 1 over $7$ and $5$ | none |
| 15 | NUM.4 0 | $9b + 4b^2 + b$ | `like-terms-classify` | pool 0 $(2x,5x)$, $(4x^2,7x^2)$, $(3x,3x^2)$; pool 1 $(2y^2,2y)$, $(8m,m)$, $(5y^3,9y^3)$ | none |
| 16 | NUM.4 1 | $6a + 7 - 4a + 2$ | `like-terms-sorter` | one board: $3x, 5x, x^2, -2, 4$ | none |
| 17 | NUM.4 2 | $5(w+2) - 3w$ | `distribute-combine-play` | one board: $2(x+3) + 4x$ | none |
| 18 | NUM.5 0 | $84$ baskets over $6$ trips | `unit-rate-play` | one board: $120$ mi over $2$ hr | none |
| 19 | NUM.5 1 | $\tfrac25 = \tfrac{x}{35}$ | `proportion-cross-play` | one board: $\tfrac34 = \tfrac{x}{12}$ | none |
| 20 | NUM.5 2 | $15\%$ of $240$ | `percent-slider` | one board: $25\%$ of $60$ | none |
| 21 | NUM.5 3 | $72$ paces into $8$-pace cords | `unit-conversion-spot` | pool 0 $150$ min into hr; pool 1 $250$ cm into m | none |

**Result: 0 collisions over 21 pairs and 30 dealt boards.**

Note on row 10, recorded because it is the nearest miss and someone will look at it again.
`OrderMattersPlay` teaches the same MOVE as `NUM.2`'s slide-2 example — multiply-first against
add-first, with the wrong branch shown and struck through — on different operands ($3+4\times2$
against $9+8\times2$). The defect class is a replayed INSTANCE, and this is not one: the
learner is asked to decide on numbers they have not seen resolved. Recorded as checked and
clean, not filed.

Also checked while reading, since a header comment is exactly what this sweep must not trust:
three widgets assert in a comment that they avoid their pack's CFU (`FractionDividePlay`,
`FractionPartsExplore`, `SignedAdditionWalkthrough`) and all three assertions are true at this
tip. A fourth was false and is fixed under F-3.

---

## 6. Reveal classification — D1's 24 placed widgets

The question answered per widget is R12's: **can a learner get stuck producing what the gate
wants, with no escape but guessing?** A free-text field with no option list is the shape that
traps. A multiple-choice board with unlimited retry and a diagnosing nudge is not, because the
retry IS the escape. A locking board is, which is why the four that lock already carry reveals.
Exceptions are named with a reason each, per `.cursor/rules/qa-verification.mdc`, never left
out.

| # | Widget source | Owes a reveal | Reason |
|---|---|---|---|
| 1 | `interactive/AbsoluteValueExplore.tsx` | **no** — explore, no trap | Stepper over 11 integer positions. No wrong state exists; the status names the target distance and counts progress `n of 2`. There is no answer a reveal could give. |
| 2 | `interactive/SignedAdditionWalkthrough.tsx` | **yes — has one** | Typed sum after the hops. Correctly in `NEVER_HANDS_BACK`: the sum is the only answer the board holds. |
| 3 | `interactive/SubtractAsAddPlay.tsx` | **no** — walkthrough, no typed answer | Two taps uncover rows written in `REWRITE` and `RESULT` at lines 20-26. The learner produces nothing, so a reveal has nothing to reveal. **Named exception, and separately a defect: see F-1.** |
| 4 | `interactive/SignRulesTable.tsx` | **yes — has one**, owes `othersRemain` | Locking 2x2 grid, three blanks per board, one reveal per missed cell. |
| 5 | `interactive/FractionPartsExplore.tsx` | **no** — explore, no trap | Two labelled targets; an out-of-order tap explains the ordering rather than locking. |
| 6 | `interactive/EquivalentFractionPlay.tsx` | **no** — every option correct | `OPS` is three operations that all preserve the value (`"Every option lands on the same value, so no invalid-choice state is needed"`, line 23). There is no wrong pick to be stuck behind. |
| 7 | `interactive/CommonDenominatorMultiples.tsx` | **YES — owed and missing** | Past the LCD chips, two free-text numerators over $12$. The nudge asks the question again (*"how many 12ths equal 1/3?"*) and never gives $4$. |
| 8 | `interactive/FractionMultiplyPlay.tsx` | **no** — the task names its own target | Status line reads *"Shade 2 rows and 4 columns"* and the edge labels carry $\tfrac23$ and $\tfrac45$; the steppers reach it without a decision. |
| 9 | `interactive/FractionDividePlay.tsx` | **yes — has one**, owes `othersRemain` | Two answers: which fraction turns over, then the reduced product. |
| 10 | `interactive/PemdasKeyExplore.tsx` | **no** — ordered walkthrough | Tap-to-reveal ladder; the prompt gives the order (*"from the top down"*) and an out-of-order tap says *"Start from the top tier."* |
| 11 | `interactive/PemdasMnemonicExplore.tsx` | **no** — ordered walkthrough | Same shape over P E M D A S, order given in the prompt. |
| 12 | `visuals.tsx` inline, `PemdasStepSolverLtr` (l. 995) | **no** — retry with a diagnosis | Four tier chips, unlimited retry, and each wrong pick names why: already handled, not present in this expression, or a higher tier still outstanding (l. 858-868). |
| 13 | `interactive/OrderMattersPlay.tsx` | **no** — retry, and the wrong branch teaches | Two chips; the wrong pick draws its own result $14$ struck through beside the correct $11$, which is the teaching, and the board stays open. |
| 14 | `visuals.tsx` inline, `PemdasStepSolver` (l. 825) | **no** — retry with a diagnosis | As row 12; same component, different config. |
| 15 | `interactive/CommutativeAssociativePlay.tsx` | **no** — both options correct | Two toggles; the gate is having used each once. Nothing can be got wrong. |
| 16 | `interactive/DistributeBuilder.tsx` | **YES — owed and missing** | Two free-text products per round over two rounds, and round 1 is $3(n-4)$, the sign trap the widget exists for. The only feedback is *"Multiply the 3 by each term inside, and mind the sign"* — the instruction restated. |
| 17 | `interactive/IdentityInverseMatch.tsx` | **yes — reached through `MatchPairs`** | Four-pair match; the kind renders the reveal and carries `othersRemain`. |
| 18 | `interactive/LikeTermsClassify.tsx` | **yes — has one**, owes `othersRemain` | Three locking rows per board, one reveal per row. |
| 19 | `interactive/LikeTermsSorter.tsx` | **YES — owed and missing** | After sorting, three free-text combined terms behind ONE Check. The single message *"Combine each bin: add the coefficients and keep the variable part"* does not say which bin is wrong, so a learner stuck on $x^2$ cannot tell it from the two they got right. |
| 20 | `interactive/DistributeCombinePlay.tsx` | **no** — retry with a diagnosis | Two action chips per step, unlimited retry, each `nudge` explains why that move is not available yet. |
| 21 | `interactive/UnitRatePlay.tsx` | **no** — retry with a diagnosis | Three divisor chips; the nudge states the criterion and works the pick just made ($2 \div 3$ is not $1$). |
| 22 | `interactive/ProportionCrossPlay.tsx` | **YES — owed and missing** | Two free-text diagonals. The wrong-answer line restates the products to compute ($3\times12$, $4\times x$) and never gives $36$ or $4x$; the two settle independently, so a learner stuck on one is held there. |
| 23 | `interactive/PercentSlider.tsx` | **YES — owed and missing** | A free-text amount at a fixed target percent. It has an escape today and it is the wrong kind of one — see F-2. |
| 24 | `interactive/UnitConversionSpot.tsx` | **yes — reached through `SpotTheError`** | Find-then-fix over three lines; the kind renders both reveals. |

**Tally.** 6 already reach a reveal (rows 2, 4, 9, 17, 18, 24) · **5 owe one and have none**
(rows 7, 16, 19, 22, 23) · 13 named exceptions. $6 + 5 + 13 = 24$, and $5 + 13 = 18$, which is
the no-reveal set from §1, so nothing sits outside both.

### What PR B owes the guard, in both directions

The lists above are the population; they are only evidence once they can fail. When the
authoring PR adds the five reveals it should, in the same edit:

- assert each of the 13 named exceptions **still exists and still renders no reveal** — a
  renamed or deleted widget must fail rather than sit in the list exempting nothing;
- assert each of the 13 **has not quietly adopted `<WidgetReveal`** without leaving the list,
  which is the direction that stops an exemption becoming permanent by neglect;
- assert **disjointness** against the owed list, and floor the derived population so the
  exceptions cannot grow until they have swallowed it;
- prove the exemption is load-bearing by forcing one entry false and watching the sweep fail
  at the widget it was excusing — the one-line injection demonstrated for `SignRulesTable`
  under §2 #3 is the shape.

The five owed reveals also move `SINGLE_BOARD` (all five are in it) and `REVEAL_VISUALS` in
`widgetRevealReAsk.browser.test.tsx`, which asserts set equality.

---

## 7. Findings

### F-1 (P1) — `NUM.S` slide 2's section 3 is a second worked example, not a task

`apps/web/src/lessons/interactive/SubtractAsAddPlay.tsx:14-26, 34-43, 59-68`.

Section 2 of the slide is *"Work out $6 - (-11)$."* with four read-only steps ending
*"Both addends point right, so the moves pile up and $6 - (-11) = 17$."* Section 3 then offers
`5 - 9` and two buttons. Both buttons call the same `advance()`; the rows they uncover are the
module constants `REWRITE` (`5 + (-9)`) and `RESULT` (`= -4`), written before the learner
arrives. `onComplete` fires on the second tap (line 38).

So the learner reads one worked example and then clicks through a second one, and the gate
opens on having clicked. R34's bar for section 3 is that the learner is asked to **produce** a
result; the recurring-defect list calls this shape *"a gate satisfied by activity rather than
by producing a value"*. What it costs: the only slide in `NUM.S` about rewriting a subtraction
never asks anybody to rewrite one, and the pack's own CFU ($-8 + 6$) is the first time they
are asked to.

**NOT FIXED**, deliberately. The remedy is to make the learner produce the value — the shape
`SignedAdditionWalkthrough` already uses on the slide before it — and that is a widget
authoring change on a widget PR B is already editing (it is in `SINGLE_BOARD`, so PR B gives
it a pool). Doing it here would collide for no benefit. Routed to PR B.

### F-2 (P1) — `PercentSlider` prints the answer on the first Check, blank entry included

`apps/web/src/lessons/interactive/PercentSlider.tsx:31-39, 51-65, 155-172`.

`showValue = committed || solved` (line 39), and `check()` sets `setCommitted(true)` at line 55
**before** any verdict is reached. So pressing Check with the field empty — which the very next
branch treats as no answer at all, replying *"Type the amount, then press Check"* — has already
painted the computed amount into the SVG readout above the bar and into the
`25\% \text{ of } 60 = 0.25 \times 60 = 15` line at y=105.

The widget's own docblock states the intent it misses by one keystroke: *"The live amount stays
hidden ('?') until the learner commits a typed guess, so the answer can't be brute-forced by
dragging until a number appears."* An empty field is not a guess. Two clicks — set the slider
to 25%, press Check — hand over the number.

It is also the wrong kind of escape for R12. The value arrives with no reasoning, and with no
badge and no `useRevealFill`, so a given answer is indistinguishable on screen from an earned
one, which is the defect `widgetRevealFill.browser.test.tsx` guards for real reveals. A learner
concludes the widget checked their blank answer and approved it.

**NOT FIXED**, routed to PR B, where this widget is getting a real reveal anyway (§6 row 23):
the fix is to gate `committed` on a non-empty parsed entry and let the reveal carry the value
with its reasoning, and doing both in one edit is the only way the second does not re-open the
first.

### F-3 (P2) — a widget header claimed to avoid an instance that is not on the slide — FIXED

`apps/web/src/lessons/interactive/UnitConversionSpot.tsx:33`. The comment above `BOARDS` read
*"Neither board is the slide's own 90 min to hours."* `NUM.5` slide 3's worked example is
$72$ paces into $8$-pace cords, and the strings `90`, `minutes` and `hours` appear nowhere in
`content/lessons/d1/NUM.5.json`. The comment described a slide that no longer exists, on the
one widget in the pack whose own pool 0 IS a minutes-to-hours conversion — which is exactly the
reading that would make a future sweep skip the pair. Rewritten to name the instance the slide
actually carries.

### No P0

No wrong mathematics, no correct answer graded wrong, no dead end. The four packs carrying a
`check` block (`NUM.S`, `NUM.F`, `NUM.2`, `NUM.5`) and the two graded on `accepted` alone
(`NUM.3`, `NUM.4`) all pass `cfuAcceptanceConvention.test.tsx` at this tip, which grades each
check-less pack's canonical closure through the real card.

---

## 8. Coverage

**Read in full:** all 6 packs (23 `mini_lesson` paragraphs, 23 subtitles, 21 worked-example
prompts and their 90 steps, 6 CFUs with their hints and worked solutions) and all 24 widget
sources, including the two inline in `visuals.tsx`.

**Sweeps and how many cases each measured:**

- Validator, `--strict`, `content/lessons/d1`: 6 packs, 0 errors, 0 warnings, exit 0. R8
  parsed-and-empty; R18 ran.
- `npm run check:lessons`: 10 domains, d1 clean.
- Text scanner, four paths: 218 learner-facing strings across 6 packs, 4099 prose runs across
  278 widget files, exit 0.
- Replay sweep: **21 pairs, 30 dealt boards, 0 collisions.** Every pool of all 6 pooled widgets
  enumerated.
- Reveal classification: **24 of 24** placed widgets classified, none omitted.
- R34 reading pass: **23 of 23** slides, both budgets and both judgement halves.
- `revealReAsk.test.ts`, `widgetVariantPool.test.tsx`, `cfuAcceptanceConvention.test.tsx`:
  **850 tests pass**, plus one demonstrated red and its restore.

**Not covered, and why:**

- **The 1024x580 frame for reconciliation item 4.** Browser tests are the parent's to run
  serially this round, so no Chromium ran here. What would discharge it: a frame of the whole
  `WorldScene` lesson panel — not the card cropped to itself — mounted through `d1LessonHost`
  at 1024x580, on `NUM.S` slide 2 in `example`, with someone looking at how much of the card
  and of the surrounding frame is above the fold.
- **A prompt-derived answer sweep over `packages/item-bank/src/d1`.** Round 3 built
  `promptDerivedAnswers` for D5 and D7 and D1 never got one, so D1's templates are still graded
  key-against-spec by `validateTemplates` and nothing re-derives the answer from the RENDERED
  prompt. Not in this round's brief; recorded as the largest remaining D1 blind spot.
- **Item-bank snapshots** were not touched: no prose in `packages/item-bank` was edited, and
  `vitest -u` was not run.

---

## 9. What the authoring pass closed, 2026-08-04

Written by the authoring pass on `anthony/d1-authoring`, which stacks on this branch. Full
evidence, including every injected red and its verbatim failure, is at
`work-log/anthony/2026-08-04-d1-authoring.md`. This section records only what changed about the
findings above.

**§6's five owed reveals are all built** — rows 7, 16, 19, 22, 23. Each uses `WidgetReveal` with
`useRevealReAsk({ reAsk: onRestart, release: onSolved })`, and each teaches the step rather than
printing the answer. Four of the five hold several answers and pass a live `othersRemain`;
`PercentSlider` holds one (the slider position and the typed amount are judged together by a
single condition) and is a declared entry in `NEVER_HANDS_BACK` instead. The five ran the full
browser contract in `widgetRevealReAsk.browser.test.tsx`, filtered: **6 passed / 149 skipped**,
the sixth being the census equality.

**The classification itself held.** All 24 rows were re-read against the sources before anything
was built on them and none was deviated from. Row 3 is the one that could have moved: fixing F-1
turns `SubtractAsAddPlay` into a board that asks two real questions, which is exactly the shape
that would owe a reveal if the questions were free text. They are bounded choices with unlimited
retry and a diagnosing nudge per wrong option, which is §6's own criterion for not trapping, so
the row stays **no** and the reveal population stays at five.

**F-1 — CLOSED.** Section 3 now asks. Two bounded steps: rewrite `5 - 9` as an addition, then
give the sum. Each wrong option is a named misconception (the sign kept, the wrong number
flipped, both flipped) with its own diagnosis. The gate opens on the second correct call and on
nothing else, which is pinned by a new jsdom reproduction,
`apps/web/src/lessons/d1BoardAsksTheQuestion.test.tsx`; injecting the old always-advance
behaviour fails it at `a wrong sum opened the gate: expected 1 to be +0`.

**F-2 — CLOSED, in one edit with the reveal, as §7 required.** The `committed` flag is gone;
`showValue` reads `solved`, which only `finish()` sets and which only a correct answer or the
reveal reaches. The same new test file pins it: injecting a pre-verdict flag fails at `the
amount is on screen without the learner having produced it: expected [ '15', …(1) ] to deeply
equal []`.

**R10.** All eighteen D1 entries in `SINGLE_BOARD` were classified the same way the reveals
were. Six left the list with pools of two authored boards — the five above plus
`SubtractAsAddPlay` — and every new board was checked against its slide's
`worked_examples[i].prompt` and its pack's CFU, so §5's clean replay sweep is not disturbed by
this pass. Nine of the remaining twelve are legitimate exceptions with a reason each, now
written into the list's comment. **Three owe a pool and did not get one:**
`equivalent-fraction-play`, `fraction-multiply-play`, `unit-rate-play`, each of which asks for a
produced value a learner would carry across a reset. They are annotated as owed rather than
filed with the nine.

**Still open after this pass.** §8's 1024x580 frame is still not taken and the overflow is not
fixed: the frame exists and was looked at, but nothing in the tree reproduces it, and a shared
lesson-host layout change with no photograph of the result is not something this pass was
willing to claim. The three widgets in `HAND_BACK_OWED_IN_D1` (`FractionDividePlay`,
`LikeTermsClassify`, `SignRulesTable`) keep their entries, which now record that the omission
was deliberate.

## 10. Follow-up pass: §8 closed, and the R10 debt made assertable

### §8, the worked-example card overflow — CLOSED, with the harness that was missing

`apps/web/src/lessons/lessonPanelSceneFit.browser.test.tsx` is new and committed. It mounts
`d1LessonHost.render(...)` — the real host rather than a hand-copied `WorldScene` chain, because
what is under test is how much room the host's banner and action tray leave — steps to NUM.S
slide 0's `example` section, and photographs the whole 1024x580 viewport over CDP, learner and
`?dev`. It is modelled on `functionNotationLabelShot.browser.test.tsx`, the closest existing
shape in the tree.

Measured, before anything changed: the card is capped at `90vh` = 522px with a 32px gutter above
and below, of which the ribbon takes 101px and the tray 70px, leaving a **347.0px** scrolling
body — so the §8 figure had not expired after all, and this is a fresh reading rather than the
old one restated. Step 1 of the worked example ends **13.4px past the fold**.

Fixed in `apps/web/src/styles.css` 3938–3964: one `@media (max-height: 760px)` block that drops
`.world-scene--large`'s block padding to 8px and lets the card take `100vh - 16px`. That returns
42px at this viewport and step 1 now ends 28.6px ABOVE the fold. Scoped to `--large` (the compact
building callout and the storm encounter are untouched at every height), to screens 760px and
shorter (nothing changes on a normal desktop), and by source order before `--full` — the same
three scopings the `@media (max-width: 720px)` block directly above it already uses.

**The dev skip control `6affcfb6` added is not the cause, and it is not marginal either.** Its
tray wraps to three rows: 176px against the learner tray's 70px, taking the body to 241px and
step 1 to 119.4px past the fold. The learner view fails on its own without it. After the fix the
`?dev` frame is improved but its card's intro line is still cut, which is `?dev` chrome rather
than learner layout and is left open.

### R10's three unpaid debts are now something a run can fail on

`widgetVariantPool.test.tsx` §9 recorded `equivalent-fraction-play`, `fraction-multiply-play` and
`unit-rate-play` as owing a pool in a COMMENT, and noted the list could not tell an owed entry
from an exempt one. That is now structural: `D1_SINGLE_BOARD` holds the nine genuine exemptions,
`POOL_OWED_IN_D1` holds the three debts, the two are checked disjoint, each carries a floor, and
each is asserted in both directions against the measured census rather than against itself.

The floors are the part the pre-existing census could not do. Both lists feed the same union, so
moving a debt into the exemption list leaves the census green — demonstrated: that injection
reports **1 failed, 256 passed**, and the one failure is the debt floor.

The three widgets still do not have pools. The debt is unchanged; what changed is that it can no
longer be written off silently.
