# D8 (Exponential & Logarithmic) — QA round 2

Reviewed at **`fc0b53ea47b40d0b6c5018a059175308d541dc1b`** (`fc0b53ea`), the branch point of
`anthony/d8-qa-round-2`. Every citation below is at that SHA unless it names another.
Owner: Anthony — ownership of the lesson machinery including the answer checker moved to this
lane on 2026-07-31 (`docs/Content_Authoring_Split.md` §11), which is why the two blockers
round 1 filed for another owner are worked here.

Era 9, Information Age. Node set taken from `getEraNodes`, not from the brief:
`packages/skill-graph/src/eras.ts` lists `information_age` as
`["EL.1", "EL.2", "EL.3", "EL.4", "EL.5", "EL.6"]`, and all six map to `content/lessons/d8`.
**6 packs, measured** — `check:lessons` reports `d8: 6 pack(s)`.

This round was spent almost entirely on the two blockers, and the honest shape of it is: one
is **fixed with red demonstrated first**, and the other turned out to rest on a false premise
and is reported as a **design decision, not implemented**. Sections at the end say explicitly
what was NOT done.

## Reconciliation with round 1

`docs/qa-d8-round-1.md` recorded 28 findings (2 P0, 10 P1, 16 P2), all closed except one half
of P1-2. Round 1 deliberately did not restate line numbers at its tip, so the rows below are
re-verified by **quoting the tree at `fc0b53ea`** rather than by re-reading its citations.

I re-verified **eight named findings individually**. The other twenty I did **not** re-verify
one by one — see "What was NOT done".

| Round-1 finding | State at `fc0b53ea` | Evidence |
|---|---|---|
| **P0-1** `ExpContinuousWalkthrough` monthly rung printed `1.6319` | **FIXED** | `ExpContinuousWalkthrough.tsx:66` now reads `{ times: 12, reaches: "1.6321", spoken: "monthly reaches 1.6321" }`. $(1+0.5/12)^{12} = 1.63209413$, so `1.6321` is correct at the four decimals the column uses. The only surviving `1.6319` in the tree is `ExpContinuousWalkthrough.browser.test.tsx:228`, a comment recording the defect. |
| **P0-2** EL.4 hook out by a factor of a million ("a trillion", "trillion-fold") | **FIXED** | `trillion` returns **zero hits** across `content/lessons/d8`, `packages/item-bank/src/d8` and `apps/web/src/lessons/interactive`. The live text at `content/lessons/d8/EL.4.json:22` reads *"So one intensity is a million times the other"*. |
| **P1-1** two CFUs graded their first ask harder than their own re-ask | **FIXED, and re-proved this round** | `d8El4Cfu.test.tsx` measures set-equality in both directions and reports *"compares 768 authored spellings against 768 re-asked ones"* passing; `d8El2Cfu.test.tsx` green. Zero spellings refused in either direction. |
| **P1-2** EL.4 refused the set-builder notation its own slide 4 introduced | **STILL BROKEN at `fc0b53ea`, FIXED by this round** | This is the round's main event. See P1-2 below for the red-first evidence. |
| **P1-3** `LogEvaluateStepper` printed stage one's answer as a rung count | **FIXED** | `rungs.length` survives only at `LogEvaluateStepper.tsx:156` (an `aria-label` join) and `:176` (an empty-state branch); it is never rendered as a count of factors. The string *"4 factors on the ladder"* survives only at `:23`, in the header comment recording the removal. |
| **P1-4** `ExpFeatureLabel` glossed the growth factor falsely | **FIXED** | *"what the amount is multiplied by at every step"* returns **zero hits** tree-wide in the three searched roots. |
| **P1-5** EL.2 L1 asymptote hint instructed a procedure wrong on 303/600 draws | **FIXED** | `packages/item-bank/src/d8/nodes/EL.2/index.ts:150` now reads *"Read that constant off on its own, **carrying the sign written in front of it rather than dropping it**: the coefficient in front of the power has no say in where the graph levels off."* The clause whose absence caused the miss is present. |
| **P1-6** EL.6's opening scenario could not produce its own equation | **FIXED** | *"stands at one squadron"* returns **zero hits**. |
| **P1-8** EL.6 L3 prompt advertised an example that was sometimes the literal key | **FIXED** | `ln(5), ln(7)` survives only at `packages/item-bank/src/d8/nodes/EL.6/index.ts:426`, in a comment reading *"It was `{ln(5), ln(7)}`, which is exactly the key on the (5, 7) draw"*. Not in a prompt. |
| **P1-10** EL.4 `domain-shift.l3` hint 2 named the flipped direction | **FIXED** | *"opposite side"* returns zero hits in `packages/item-bank/src/d8`; the ten surviving hits are all trig and unrelated widgets (`TrigGuyWireLabel`, `TrigRatioTable`, `LogExpandOrder`, `GraphFeatureTable`, `PiecewisePieceSelect`). |
| **P1-7, P1-9, and the 16 P2 findings** | **NOT RE-VERIFIED** | Not checked individually this round. Round 1 records them closed with a commit each; that is round 1's word, not evidence at `fc0b53ea`. Claimed but unverified. |

### The wave-1 note on EL.5 slide 0 — CONFIRMED, and it reads well

The brief asked me to confirm that the pre-existing contradiction, where EL.5 slide 0's
lecture named the specific pair its `LogProductTable` widget asks the learner to discover, was
resolved by cutting the pair. **It landed.**

`content/lessons/d8/EL.5.json:5` (`mini_lesson[0]`) names no pair at all. It ends on a hedged
hypothesis — *"Multiplying powers of one base adds their exponents, so multiplying the numbers
underneath two logarithms **ought to show up as an addition**"* — which sets up a discovery
rather than pre-empting one. The widget's two boards are `4 × 25 = 100`
(`LogProductTable.tsx:41-43`) and `5 × 200 = 1000` (`:102-104`), and the file's own comment at
`:35` claims *"Two boards, neither of them the pair named in the slide's own opening"*, which
is true of both.

**One residual overlap, examined and deliberately NOT changed.** Slide 0's worked example still
walks `8 × 125 = 1000` and closes on *"$\log 8 + \log 125 = \log 1000$"* (`EL.5.json:18-24`),
and Board 1's product is also `1000`. That is the same number on screen, but it does not hand
over either of Board 1's blanks: the worked example never **evaluates** $\log 1000$, and Board
1 asks for exactly that value by two routes — `b1-sum` ($0.699 + 2.301 = 3$) and `b1-product`
($\log 1000 = 3$, *"counted off the powers of ten without looking at the row above it"*). The
factors differ, so no arithmetic is transferred either. I recorded a plan earlier in this round
to re-number the worked example to `16 × 625`; on re-reading the widget's blanks that plan was
**wrong** and I dropped it, because the edit would have bought nothing and moved shipped prose.

## Findings

### P1-2 (round 1's open half) — EL.4's CFU refused the notation its own slide defines last — FIXED

**Still broken at `fc0b53ea`, fixed on this branch at `34b5ab96`.**

`apps/web/src/lessons/answerFormat.ts:477-479` at `fc0b53ea` read:

```
export function isAbsoluteValueAnswerText(value: string): boolean {
  return /(abs\(|\||\\lvert|\\rvert)/i.test(value);
}
```

Any bare `|` counted as absolute value. `cfuNotation` applies that predicate with `.some` over
the **whole** accepted list, above the roster and interval rules
(`answerFormat.ts:1304-1306`, `if (accepted.some(isAbsoluteValueAnswerText)) return
"variable_radical";`), so **one** set-builder spelling anywhere in a list retagged the entire
question. `apps/web/src/lessons/cfuVariants.ts:2880-2894` therefore omitted set-builder from
EL.4's speller on purpose, with the reason written in: *"SET-BUILDER IS DELIBERATELY ABSENT,
and it is the one spelling this list owes a learner and cannot pay."*

**What the learner met.** EL.4's `mini_lesson[3]` (`EL.4.json:8`) closes by defining the term:
*"**Set-builder notation** writes the two cases as $\{x \mid x > h\}$ and $\{x \mid x < h\}$,
where the braces say the collection of all values of $x$ for which the condition after the bar
holds."* The worked example on that same slide **answers in it** (`EL.4.json:49`): *"the domain
is $\{x \mid x < 12\}$."* Two of the node's five practice templates (`d8.el4.domain.l2`,
`d8.el4.domain-shift.l3`) grade nothing else. The CFU then asked
(`EL.4.json:77`) *"For $g(x) = \log(9 - x)$, state the domain as an inequality in $x$ and give
the vertical asymptote as an equation."* and graded `{x | x < 9}; x = 9` **wrong**.

**The wrong conclusion a learner draws:** that the notation the slide just defined, and that
their own worked example used, is not an acceptable way to write a domain — immediately before
practice requires it of them twice. Round 1 rated this P1 rather than P0 and that was right:
the prompt does say *"as an inequality in $x$"* and gives a format example, `x > 4; x = 4`, so
a learner who follows the prompt is not punished. The defect lands on the learner primed by
slide 4's own answer.

**Why it could not be fixed in the pack, measured.** Adding the spelling retags the question.
Injecting the old predicate back at the changed lines and running the guard:

```
AssertionError: EL.4's set-builder spellings retag the whole question's notation:
expected 'variable_radical' to be 'none'
```

So the field advertised radical notation, `2*x*sqrt(2*x), abs(x^5), |x^5|`, over a
sqrt-and-bars keypad on a domain-and-asymptote question. Round 1 measured that cost, declined
to ship it, and filed the dispatch. That was the correct call.

**The fix.** What separates the two notations is what the bar is *doing*. An absolute value
brackets an expression, so its bar arrives as one of a pair or as a named macro; the
set-builder bar separates a variable from a condition and arrives **alone inside braces**. The
predicate now answers the named spellings first, then tests for a bar over the string with the
set-builder separator removed:

```
const SET_BUILDER_SEPARATOR = /(\{[^{}|]*)\|/g;

export function isAbsoluteValueAnswerText(value: string): boolean {
  if (/(abs\(|\\lvert|\\rvert)/i.test(value)) {
    return true;
  }
  return value.replace(SET_BUILDER_SEPARATOR, "$1").includes("|");
}
```

Only the **separator** is removed, not the braced group, so `{x | |x| < 9}` — a set of values
of an absolute value, which does want its bars named — still reads as absolute value.

EL.4's speller gained the bare and the `domain:`-labelled set-builder spellings, taking each
instance from **512 to 768** forms, and `content/lessons/d8/EL.4.json` was regenerated **from
the speller** rather than hand-edited, canonical form first.

**Red before green, in that order.**

1. **RED.** With the fix in and round 1's exemption still in place, the exemption failed in
   exactly the direction it was written to fail — three times, once per declared spelling:

   ```
   AssertionError: EL.4 now ACCEPTS "{x | x < 9}; x = 9", so the set-builder half of the
   round-one finding has been fixed: drop it from SET_BUILDER_BLOCKED and move it into
   NAMED_SPELLINGS: expected true to be false
   ```

   plus `the absolute-value predicate no longer matches a set-builder brace: expected false to
   be true`. **4 failed | 28 passed.**

2. **GREEN.** `npx vitest run src/lessons/d8El4Cfu.test.tsx` → **33 passed**, including
   `grades {x | x < 9}; x = 9 correct on the first attempt` and its two siblings, graded by
   rendering the real `LessonCfu` card, typing into the real field and submitting the real
   form. The four `REFUSED` wrong answers (`x > 9; x = 9`, `x < 8; x = 8`,
   `{x | x > 9}; x = 9`, `x < 9`) are all still refused, so the list did not become one that
   accepts everything.

3. **INJECTION at the changed lines.** Reverting the predicate to the one-liner reds the new
   guard on both halves, quoted above and in the injection block.

`answerFormat.test.ts` is green (**202 tests** with `d8El2Cfu.test.tsx` in the same run),
including RAD.4's eleven absolute-value spellings (`6*abs(x^3)` … `6x^2|x|`) and the
composite-answer line the old `cfuVariants.ts` comment cited as the pin on this behaviour. The
new guard also asserts the narrowing in **both** directions on one run: false for the three
set-builder forms, true for six genuine absolute values including `6\left|x^3\right|` and
`{x | |x| < 9}`.

### P1-11 (new) — the compound-answer route does not exist as described — DESIGN DECISION, NOT IMPLEMENTED

**This is the decision point the brief authorised me to stop at, and I am stopping at it
rather than guessing.**

The brief's premise was that *"Multipart grading already exists at
`packages/.../d1-answer-checker.ts:248-252` (`compareMultipart`) and is simply not wired to the
CFU route."* **Measured, that premise is false**, and wiring it would have made EL.2 and EL.4
worse rather than better. Two independent blockers, both measured through the real checkers.

**1. Shape.** Both `compareMultipart` implementations require `raw_answer` to be a
`Record<part_id, value>` object — D1's at `d1-answer-checker.ts:196-217`, v2's at
`product-answer-checker.ts:2001-2018`, and they are the same six lines of guard. `cfu.tsx`
renders exactly **one** text input. Handed the string that field yields, both return
`invalid_multipart_answer`:

| Probe | Result |
|---|---|
| D1 multipart, `raw_answer: "x < 9; x = 9"` | `no / invalid_multipart_answer` |
| v2 multipart, `raw_answer: "x < 9; x = 9"` | `no / invalid_multipart_answer` |

So "wire `compareMultipart`" is really "write a splitter", and the splitter is the design
question, not the wiring. EL.4 accepts `, `, `; `, ` and ` **and a bare space** as separators
between its two clauses, while EL.2's second clause is a coordinate pair `(0, 4)` that contains
a comma. A separator set that splits `x < 9, x = 9` also splits `(0, 4)`.

**2. Capability — the D1 checker cannot read a relation at all.** Even handed a *correctly
split* object, D1's multipart delegates each part back to the `numeric`/`expression`
sub-graders (`d1-answer-checker.ts:206-213`), and every relation fails. Graded through
`createD1AnswerChecker`, key against itself:

| Part | `numeric` | `expression` |
|---|---|---|
| `x < 9` | `unsupported_syntax` | `unsupported_syntax` |
| `9 > x` | `unsupported_syntax` | `unsupported_syntax` |
| `x <= 9` | `unsupported_syntax` | `unsupported_syntax` |
| `x = 9` | `unsupported_syntax` | `unsupported_syntax` |
| `y = 5` (EL.2) | `unsupported_syntax` | `unsupported_syntax` |
| `{x | x < 9}` | `parse_error` | `parse_error` |
| `(0, 4)` (EL.2) | `parse_error` | `parse_error` |
| `9` | **CORRECT / match** | **CORRECT / match** |

D1 multipart over EL.4's two halves, handed the perfectly split object
`{ domain: "x < 9", asymptote: "9" }`: **`no / domain:unsupported_syntax`**. Only the bare
number grades. So opening `answer_type: "multipart"` on `LessonCfuCheck` and pointing it at the
D1 checker would mark a learner **wrong for typing the exact string the reveal prints** —
strictly worse than today's exact match. `d8El4Cfu.test.tsx`'s existing route probe already
measures this and passes, so the claim that those two files "go red when this opens" is
**correct as written but about a route that does not open**: they red when the checker gains the
capability, which it has not.

**3. The v2 product checker CAN grade the parts — but only one notation family each.** This is
the finding that makes the decision a real choice. `createProductAnswerChecker`:

| Probe | Result |
|---|---|
| `set_builder` key `{x | x < 9}` ← `{x | x < 9}` | **CORRECT / match** |
| `set_builder` key `{x | x < 9}` ← `{x|x<9}` | **CORRECT / match** |
| `set_builder` key `{x | x < 9}` ← `{x | 9 > x}` | **CORRECT / match** |
| `set_builder` key `{x | x < 9}` ← `{x | x > 9}` (wrong) | `value_mismatch` |
| `set_builder` key `{x | x < 9}` ← `x < 9` | **`wrong_notation`** |
| `interval` key `(-inf, 9)` ← `x < 9` | **`wrong_notation`** |
| `interval` key `(-inf, 9)` ← `{x | x < 9}` | **`wrong_notation`** |
| `point` key `(0, 4)` ← `(0,4)` | **CORRECT / match** |
| `point` key `(0, 4)` ← `x = 0, y = 4` | **`wrong_notation`** |
| `point` key `(0, 4)` ← `(4, 0)` | `coordinates_swapped` |
| v2 multipart, correctly split object | **CORRECT / match** |

v2 grades structurally *within* a notation family and refuses the others as `wrong_notation`,
by design — `product-answer-checker.ts:966-967` says so: *"A recognizable non-set-builder
answer (e.g. interval notation) is a wrong FORM (`wrong_notation`, since the notation is the
skill)"*. EL.4's accepted list deliberately spans **four** families: bare (`x < 9`), reversed
(`9 > x`), labelled (`domain: x < 9`) and set-builder (`{x | x < 9}`). Under any single v2 spec,
three of the four are refused. **So routing EL.4's CFU at v2 would make it stricter, not more
forgiving** — it would newly refuse the canonical spelling the prompt's own format example
tells the learner to type.

**The options, with what each costs.**

- **A — leave the CFU on exact match, with both instances generated from one speller.** What
  ships now. Cost: 768 enumerated forms per instance, regenerated whenever the speller widens,
  with `d8El4Cfu.test.tsx` failing in both directions if pack and speller drift. Benefit: the
  CFU accepts every notation family the lesson teaches, which is what a check sitting
  immediately after the mini-lesson should do.
- **B — open `answer_type` to `"multipart"`, route the CFU at v2, add an app-layer splitter.**
  Buys real diagnostics (`coordinates_swapped` on EL.2 beats "not correct") and
  form-independence within a family. Costs a splitter design that survives a comma inside a
  part, and it **narrows** EL.4 unless a part may carry several alternative specs, which
  neither checker supports today. Also a change to the shared CFU route affecting all eight
  spec-carrying CFUs, not just D8's two.
- **C — widen the D1 checker's grammar to admit relations.** Rejected on evidence rather than
  taste: `D1_CHECKER_VERSION` is a pinned contract and that checker grades all D1 practice, so
  admitting `<` and `=` to its parser changes grading in every domain, against frozen
  item-bank snapshots.

**What I need a decision on before implementing anything:** whether a CFU part may declare
*alternative* notations (which is a checker feature nobody has), and what separator grammar the
splitter may assume given that EL.2's own answer contains a comma. Absent that, B trades a
learner-visible regression for an internal tidiness, so I did not build it.

`LessonCfuCheck.answer_type` is therefore **unchanged** at `"numeric" | "expression"`, and
`types.ts`, `cfuChecker.ts` and `cfu.tsx` are **untouched** this round.

### P2-R34-1 (new) — three widgets replay the worked example printed directly above them — REPORTED

The R34 pass over EL.1, EL.2, EL.3 and EL.6 read all 16 slides in all three sections. Sections
1 and 2 are clean (below). **Three of the 16 section-3 widgets replay section 2's instance**, and
in each case the worked example prints the answer the widget then asks the learner to produce.
This is the defect class the three-section migration introduced, judged by the same standard
applied to EL.5: a shared number is a finding only when it hands over an answer.

| Slide | Section 2 prints | Section 3 asks | Verdict |
|---|---|---|---|
| **EL.2 slide 2** | `EL.2.json:39` — *"Across the $x$-axis every output becomes its opposite, so the rule becomes $y = -5 \cdot 3^{x}$."* | `ExpTransformBuilder.tsx:61-64` board 1 is `a: 5, b: 3, move: "reflected over the $x$-axis"`, and the goal (`:254`) is *"finish the rule so it is the one whose graph is the described mirror image"* | **Answer handed over.** Same coefficient, same base, same move; the rule to be built is printed verbatim one section earlier. |
| **EL.3 slide 1** | `EL.3.json:27-30` — prompt *"Write $\log_{2} 32 = 5$ in exponential form"*, step *"Exponential form puts that exponent on the base: $2^{5} = 32$."* | `LogFormMatch.tsx:27-28` board 1's first pair is `left: "2^{5} = 32"`, `right: "\log_{2} 32 = 5"` | **Answer handed over.** The pairing the learner must make is the conversion just worked, in the same numbers. |
| **EL.6 slide 0** | `EL.6.json:21` — *"The limit is itself a power of that base, since $32 = 2^{5}$"* | `EquationSameBaseStepper.tsx:63` board 1 is `{ base: 2, shift: 1, target: 32, power: 5 }`; `power` is documented at `:54` as *"The exponent that writes the target on the base, and so stage one's answer"* | **Stage one's answer handed over.** Stage two ($x + 1 = 5$, so $x = 4$) is not, and the gate is spent on both stages (`:24`), so the board is not fully bypassed. |

**The wrong conclusion a learner draws** is not a false belief — nothing here is incorrect — but
the widget stops being the thing that teaches. Section 3 exists so the rule is *produced* rather
than read; on these boards it can be copied off the section above, and a learner who copies is
gated through having demonstrated nothing. On `EquationSameBaseStepper` that matters most,
because its own docstring says stage one *"alone would let a learner past on having recognised a
power, which is the easier half and not the half the slide is about"* — and recognising the
power is precisely the half that was printed for them.

**Root cause, and it is legible in the source.** Every one of these widgets carries a comment
recording which collision its author checked. The two bespoke offenders checked the **CFU only**:

- `ExpTransformBuilder.tsx:56` — *"Three boards. None reuses the **CFU's** rule"*
- `EquationSameBaseStepper.tsx:59` — *"Three boards, on three bases, none of them the **CFU's** numbers"*

Every bespoke widget that names the **slide** is clean, all seven of them:
`ExpGrowthTable.tsx:32` (*"Neither board is the slide's doubling culture, and neither is the
CFU's falling sample"*), `ExpFactorSlider.tsx:38`, `ExpDecayClassify.tsx:81`,
`ExpGraphPlay.tsx:128`, `ExpContinuousWalkthrough.tsx:13` (*"The rate is deliberately not the
slide's $100\%$"*), `LogQuestionExplore.tsx:17`, `ExpShiftDrag.tsx:133`. `LogFormMatch` carries
no collision note at all. So the check predates section 2's existence: it was written against a
CFU, and the migration added a worked example above these widgets that nobody re-ran it against.

**NOT FIXED, deliberately.** Each is a one-line board change, but the right fix is the guard, not
the numbers: a test asserting that no widget board's instance appears in its own slide's
`worked_examples[i]`, derived from the packs rather than from a written-down list. Without that,
the next migration reintroduces this. I did not write it because a new guard owes a demonstrated
red and I had no budget left to run one, and because changing three widgets' numbers owes the
browser guards I am not permitted to run. Filed for round 3 with the population named.

### What the R34 pass found CLEAN

**Section 1 — all 16 lectures.** Every one is conceptual: 3 sentences, no worked arithmetic, no
step-by-step instance. I looked specifically for the two failure modes the brief named, a cut
that removed the reason and kept the rule, and a term introduced without its gloss, and found
neither. Every bolded term is glossed in place: `logarithm` and `argument` (`EL.3.json:6`),
`common logarithm` / `natural logarithm` (`:8`), `horizontal asymptote` (`EL.2.json:5`),
`transformation` (`:6`), `reflection` (`:7`), `exponential function` / `initial amount` / `base`
(`EL.1.json:5`), `growth factor` (`:6`), `exponential decay` (`:7`), `compounding` and
`the number $e$` (`:8`), `extraneous` (`EL.6.json:8`). Two of those are round-1 fixes confirmed
**positively** rather than by absence: `EL.1.json:8` glosses `compounding` (P1-9), and
`EL.6.json:5` reads *"that aircraft on the flight line double every quarter, that one aircraft
stands there now, and that the hangar holds $32$"* — grammatical, each conjunct carrying its own
`that`, and unit-consistent so $2^{t} = 32$ follows (P1-6). Slides that introduce no term
(`EL.2.json:8`, `EL.3.json:5` and `:7`, `EL.6.json:6` and `:7`) are setup or synthesis, which is
not a gloss failure. `EL.3.json:6` names $\log_{2} 32$ without evaluating it and leaves the
evaluation to section 2, which is the division of labour R34 asks for.

**Section 2 — all 16 worked examples.** None is absent or `null`, so there is no skip to justify.
Every prompt is at most 2 sentences, names the instance the steps work, and withholds the result.
**I re-derived every computation in all 64 steps and found zero arithmetic errors**, including
$2^{8} = 256$ and $40 \times 256 = 10240$; $1.5^{5} \times 400 = 3037.5$ against
$2^{5} \times 400 = 12800$ for a gap of $9762.5$; $3 \cdot 2^{-4} = \tfrac{3}{16}$;
$\left(1 + \tfrac{1}{12}\right)^{12} \approx 2.613$; $\log 40 / \log 2 = 1.602060 / 0.301030
\approx 5.322$; $(x-5)(x+2)$ for $x^{2} - 3x - 10$ and $(u-2)(u-3)$ for $u^{2} - 5u + 6$; and
$\log 20 + \log 5 = \log 100 = 2$ in `EquationExtraneousSpot`'s own board.

One P2 on step granularity: **`EL.6.json:49`** compresses three moves into one step — *"Gathering
and converting the first equation gives $x(x - 3) = 10$, which rearranges to $x^{2} - 3x - 10 = 0$
and factors as $(x - 5)(x + 2) = 0$."* R34 asks one move per step. The factoring-without-
derivation half of this is round 1's P1-7, closed at the skill-graph level rather than in prose,
so this is the step-granularity claim only.

**Section 3 — the other 13 widgets.** All 16 ask the learner to produce a result rather than read
one. Thirteen carry an instance genuinely different from their own worked example, checked
against the board data rather than the docstring: `ExpGrowthTable` (`+6` against `\times 3` from
3, versus the slide's 40 doubling), `ExpFactorSlider` (`[5,20,80]`, `[7,21,63]` versus 6, 18, 54),
`ExpDecayClassify` ($7 \cdot 3^{x}$ versus $800\left(\tfrac{1}{2}\right)^{x}$),
`ExpContinuousWalkthrough` (50% and 200% rounds versus the slide's 100%), `ExpGraphPlay`
(`start: 200` and `start: 100` versus 400), `ExpShiftDrag` ($3 \cdot 2^{x} + 4$,
$3 \cdot 2^{x} - 2$, $3 \cdot 2^{x-3}$ versus $+6$ and $x - 4$), `ExpFeatureLabel`
(`{a:2,b:3,k:5}`, `{a:-4,b:2,k:3}` versus $-2 \cdot 6^{x} + 9$), `LogQuestionExplore` (strip tops
at 64 and never offers the slide's 128), `LogEvaluateStepper` ($\log_{4} 256$, $\log_{3} 243$
versus $\log_{3} 81$), `LogNaturalSpot` ($\log 0.001$, $\ln \tfrac{1}{e^{3}}$ versus $\log 0.01$,
$\ln \tfrac{1}{e^{4}}$), `EquationTakeLogWalkthrough`, `EquationGatherConvertMatch`
($\log_{3} x + \log_{3} 5$ versus $\log_{2} x + \log_{2}(x+2)$) and `EquationExtraneousSpot`
($x - 15$ and $x - 6$ versus the slide's $x - 3$).

Two of those are near misses worth naming, because both were resolved by the "does it hand over
an answer" test rather than by the numbers being different:

- `ExpShiftDrag`'s `side` card has asymptote $y = 0$, and `EL.2.json:32` states *"Sliding
  sideways changes no height, so this second graph keeps the asymptote $y = 0$."* But its rule is
  $3 \cdot 2^{x-3}$ against the example's $3 \cdot 2^{x-4}$. What was handed over is the
  **principle**, which section 1 states too, and applying a taught principle to a new instance is
  what section 3 is for. Not a finding.
- `EquationTakeLogWalkthrough` round 1 is `{ base: 5, target: 40, logTarget: "1.6021" }` while
  `EL.6.json:32` prints $\log 40 \approx 1.602060$. The **base differs** (5 against 2), so the
  answer is 2.292 rather than 5.322. A shared table lookup, not a shared answer. Not a finding —
  the same verdict, on the same reasoning, as EL.5's shared product of 1000.
- `ExpFactorSlider` board 2's factor is **3**, the same value `EL.1.json:31` derives. Its readings
  are 7, 21, 63 against the slide's 6, 18, 54, so the learner cannot know the answer transfers
  without dividing; two different geometric sequences sharing a ratio is a coincidence, not a
  hand-over. Not a finding, or the rule would become "no widget may share an answer value with
  its slide", which no small-integer board could satisfy.

### R12 reveal-completeness across the 24 widgets — VERIFIED, with one stated limit

The planning grep's claim holds, and here is the enumeration rather than the grep. **All 24 offer
a reveal.** Sixteen render `WidgetReveal` themselves: `EquationSameBaseStepper`,
`EquationTakeLogWalkthrough`, `ExpContinuousWalkthrough`, `ExpDecayClassify`, `ExpFactorSlider`,
`ExpGraphPlay`, `ExpShiftDrag`, `ExpTransformBuilder`, `LogBaseChangeWalkthrough`,
`LogCondenseBuilder`, `LogDomainBuilder`, `LogDomainClassify`, `LogEvaluateStepper`,
`LogMirrorExplore`, `LogQuestionExplore`, `LogShiftSlider` — all sixteen also using
`useRevealReAsk`.

The remaining **eight delegate to a shared kind**, which is why a grep scoped to the widget files
alone would have found them empty — the trap `qa-verification.mdc` names, a population scoped to
the implementation rather than the behaviour:

| Widget | Shared kind | Kind's reveal |
|---|---|---|
| `ExpGrowthTable`, `LogProductTable` | `kinds/FillTable` | `FillTable.tsx:282` |
| `LogFormMatch`, `EquationGatherConvertMatch` | `kinds/MatchPairs` | `MatchPairs.tsx:355` |
| `LogExpandOrder` | `kinds/OrderSteps` | `OrderSteps.tsx:203` |
| `ExpFeatureLabel` | `kinds/LabelParts` | `LabelParts.tsx:425` |
| `LogNaturalSpot`, `EquationExtraneousSpot` | `kinds/SpotTheError` | `SpotTheError.tsx:333`, `:359` |

No reveal can be answer-only, and that is structural rather than reviewed: `why: ReactNode` is a
**required** prop of `WidgetReveal` (`widgetFeedback.tsx:617`, no `?`), so an answer-only reveal
does not compile — and `tsc --build` exits 0 at this SHA, which is what turns that type into
evidence about the tree.

**The limit, stated rather than glossed over:** this establishes that every widget offers a
reveal, which is what "R12-reveal-complete" was claimed to mean. It does **not** establish
per-STEP coverage inside the multi-step widgets — a widget with three open-ended stages and one
reveal would pass this sweep and still trap on two of them. That narrower claim remains
unverified.

## FIXED versus only REPORTED

| | |
|---|---|
| **FIXED, with red demonstrated first** | P1-2's open half — `isAbsoluteValueAnswerText` tightened, EL.4's speller widened, `EL.4.json` regenerated 512 → 768, guard converted from a declared exception to a two-directional assertion. Commit `34b5ab96`. |
| **REPORTED, not fixed, deliberately** | P1-11, the compound-answer route. Stopped at the decision point with three measured tables. No source touched. P2-R34-1, three widgets replaying their own worked example, where the right fix is a derived guard rather than three renumbered boards. P2 on `EL.6.json:49`'s step granularity. |
| **VERIFIED CLEAN, no change needed** | EL.5 slide 0's pair cut, and the residual `1000` overlap examined and left alone. |

## Gates

| Gate | Result |
|---|---|
| `npm run check:lessons` | **PASS.** `d8: 6 pack(s), 0 error(s), 0 warning(s)`; all 10 domains pass at the error tier. |
| `npm run lint` | **PASS**, exit 0. 28 warnings + 23 infos, every one in `tools/intrusion-injections.mjs` (`noTemplateCurlyInString`), pre-existing and untouched by this round. |
| `npx vitest run src/lessons/d8El4Cfu.test.tsx` | **33 passed.** |
| `npx vitest run src/lessons/answerFormat.test.ts src/lessons/d8El2Cfu.test.tsx` | **202 passed, 2 files.** |
| `npx tsc --noEmit -p apps/web/tsconfig.json` | **PASS**, exit 0, no diagnostics. This is the project holding all three changed TypeScript files. |
| `npm run typecheck` (the whole workspace build) | **PASS**, exit 0. `tsc --build` finished clean after ~11 minutes. |

### The frozen pool

Every `.snap` under `packages/item-bank/src/__snapshots__/` is **byte-identical**. Thirteen
files, hashed with `git hash-object` before and after, and independently confirmed by
`git status --short` never listing one as modified across the round:

```
60ad243b4f3bf13ec70354c6b6b7c495e44387ff  d1.test.ts.snap
530fe49a3ad0131f1e944679a55b1bf97b3c62e5  d10.test.ts.snap
27f6375b4d488a98ba8b3252cf0ad836d36e0db1  d2.test.ts.snap
40674d1e4cd75255fc06d18c8a7880ac1aed98d6  d3.test.ts.snap
e74c1f952882ac5dc967e2e498f61cd5bfa2fd62  d5.test.ts.snap
0051f740d556bd8f7f01657382b3dd30c314a7c8  d6.test.ts.snap
5b71b580ed16cf96b7b49cab050eb8b277ee8b39  d7.test.ts.snap
d7fb56b44e3cc66bab0eff4113069290e93f1b4a  d8.test.ts.snap
75e4c7e4ec9c9844ed98daa98f65167a57b5f39b  d9.test.ts.snap
9ce45bf7f79f744a05274d3f1cc156f3f003ccb7  interactive.test.ts.snap
99c4fac7d14ba1673120794c4aa9f9d9576de209  product.test.ts.snap
c3a7c3551b9486a7430a72ba59b549398990caa3  template.test.ts.snap
e7e79361a77e322ef4028f62bf93302502ae6315  walk.test.ts.snap
```

`vitest -u` was never run. `EL.4.json` is lesson content, not a snapshot, and moving it moved
no hash.

### Browser guards this round's changes require — FOR SERIAL RUN BY THE OPERATOR

Not run here, per the brief. `isAbsoluteValueAnswerText` feeds `cfuPlaceholder` / `cfuKeypad`
dispatch, so the surfaces that render a keypad and a placeholder over the changed predicate
are the ones at risk. In priority order:

1. `apps/web/src/lessons/mathKeypad.browser.test.tsx` — the keypad EL.4 now does *not* get.
2. `apps/web/src/lessons/answerPlaceholderFit.browser.test.tsx` — EL.4's placeholder changed
   family, and its 768-form list is longer than before.
3. Any browser guard over `answerNotation` / `cfuNotation` dispatch, and `WorkedSolution.browser.test.tsx`
   for the D8 pool round 1 added at `dbb6c86e`.

## Coverage — measured

| Measurement | Count |
|---|---|
| D8 packs, from `check:lessons` | **6** |
| Node set resolved from `getEraNodes` / `eras.ts` rather than the brief | **6** (EL.1–EL.6) |
| Round-1 findings re-verified individually at `fc0b53ea` | **8** of 28 |
| Round-1 findings NOT re-verified individually | **20** of 28 |
| CFU spellings graded through the real `LessonCfu` card this round | **23** (4 named + 12 sampled + 4 refused + 3 set-builder) |
| Accepted-form set-equality, authored versus re-ask, both directions | **768 = 768**, 0 refused either way |
| Answer-checker probes run against the real versioned checkers | **38** (20 D1 sub-grader, 2 D1 multipart, 16 v2) |
| Mini-lesson packs read in full this round | **6 of 6** — EL.4 and EL.5 before the R34 pass, EL.1/EL.2/EL.3/EL.6 in it |
| R34 slides read in all three sections | **16** (EL.1, EL.2, EL.3, EL.6 — 4 slides each) |
| Section-1 lectures judged conceptual-only | **16 of 16** clean |
| Bolded terms checked for a gloss in place | **13**, all glossed |
| Section-2 worked examples read | **16 of 16**; none absent or `null` |
| Worked-example steps whose arithmetic I re-derived | **64**, with **0** errors |
| Section-3 widgets checked for verbatim replay of section 2 | **16**; **13 clean, 3 findings** |
| Widgets read this round | **17** — `LogProductTable` plus the 16 mounted by the four R34 packs |
| Widgets swept for an R12 reveal | **24 of 24**; 16 direct, 8 via 5 shared kinds, all present |
| `.snap` files hashed before and after | **13**, all identical |

## What was NOT done — explicitly

- **NOT DONE: re-verifying 20 of round 1's 28 findings** (P1-7, P1-9 and all 16 P2). Round 1
  names a closing commit for each; that is its word, not evidence at this SHA. Claimed but
  unverified.
- **NOT DONE: the widget-contract audit** (`useWidgetVariants`, `useWidgetSuccess`, `usePickup`,
  `othersRemain`) across the 24 widgets. R12 reveal-completeness is now verified per widget
  above, and `useRevealReAsk` was enumerated as part of it, but the other four contracts were
  not read.
- **NOT DONE: per-step reveal coverage inside the multi-step widgets.** The R12 sweep proves
  every widget offers a reveal, not that every open-ended stage within one does.
- **NOT DONE: fixing the three R34 replays.** Reported with file:line and quoted text; the fix
  wants a derived guard and browser guards I may not run.
- **NOT DONE: the prompt-versus-key draw sweeps** round 1 ran at 13,000 draws. No new sweep.
- **NOT DONE: any browser guard**, per the brief. Listed above for serial running.
- **NOT DONE: P1-11's implementation**, by design, as a reported decision point.

## Verdict

Not clean. One real defect closed with the evidence the rule asks for, one premise in the brief
refuted by measurement and escalated as a decision rather than guessed at, and the R34 pass now
run over all sixteen slides of the four migrated packs.

R34's sections 1 and 2 came back clean on every slide, including 64 re-derived computations with
no arithmetic error. Section 3 did not: three of sixteen widgets replay the worked example printed
directly above them, and the source says why — the collision check in each widget's own comment
was written against the CFU, before section 2 existed. That is one root cause with three
instances rather than three coincidences, which is why round 3 should close it with a derived
guard over all 29 migrated packs rather than by renumbering three boards in D8.
