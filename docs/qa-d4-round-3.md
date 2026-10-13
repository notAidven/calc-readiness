# D4's POL.5, POL.6 and POL.7 — QA round 3, at `ff465269`

**The review was conducted at `ff465269`**, the commit that migrated these three packs to
three-section slides (#729). `HEAD` is
still exactly that: **the whole of this round's change set is uncommitted working-tree state**, so
every line reference below is a reading of the working tree, and "at the base" means "with these
edits reverted", not "at an earlier commit". The change set is **fourteen modified tracked files and
four new test files** — three lesson packs, seven widgets, two guards, the banned-phrase ledger and
the `lesson-qa` skill — and `git diff --stat` over those fourteen reports 151 insertions and 46
deletions. Anything else in the working tree at the time of reading belongs to another lane.

Numbers are measurements taken at that pin. Where a figure was measured by one of the sweep agents
and could not be cheaply re-taken here — draw counts, injection counts, the reds recorded before a
fix that now exists only as a revert — it is **attributed in the text** rather than presented as a
reading of my own. Everything else in this document was re-read or re-run against the working tree
while writing it, because a digest of four agents' reports is a summary and a summary is not proof
about a named instance.

**Scope, stated plainly.** Three packs: POL.5, POL.6, POL.7. The fix boundary the user set was
**lesson JSON and D4-only widget adopters**; shared widget kinds, the shared grading surface, the
item-bank templates and every other lane were **reported and not fixed**, and each such finding
says so where it sits. This round does not speak for D4's other five packs, nor for the rest of
Early Modern or Industrial. It is D4's third round and the first to look at these three packs at
all.

**No practice-pool hash moved.** `git diff --name-only ff465269 -- packages/item-bank` is empty at
delivery, so nothing in this branch can have moved a `hashItemDefinition`. Re-checked rather than
inferred, because a report is the wrong place to learn that a frozen pool drifted.

## Round 2 reconciliation, at `ff465269`

Round 2 ([`docs/qa-d4-round-2.md`](qa-d4-round-2.md)) was conducted at `68c5aa9a` and covered **5 of
D4's 8 packs**. It disclaims all three of this round's packs, and that disclaimer was verified
against round 2's own coverage statement rather than assumed. Verbatim, from its scope section:

> "So read every count below as covering **5 of D4's 8 packs**. Nothing here is evidence about
> POL.5, POL.6 or POL.7: not the arithmetic check, not the R34 reading pass, not the term census,
> not the CFU re-grade. **D4 is not swept, and this report does not claim it is.**"

| Round 2's claim about these three packs | Status at this pin | Evidence type | Evidence |
|---|---|---|---|
| POL.5, POL.6 and POL.7 "landed from another lane, and **this round reviewed none of them**" | **HOLDS** — it is why this round exists | reading | Round 2's scope section, quoted above. No finding, count or frame in that document is about these three packs. |
| "all three carry **no `worked_examples` array**, so they are unmigrated" | **TRUE THEN, SUPERSEDED BY `ff465269`** | reading of both trees | `git show ff465269~1:content/lessons/d4/POL.5.json` contains no `worked_examples` key. At this pin all three declare one, four entries each: **12 slides, 12 authored worked examples, none `null`.** |
| "`threeSectionFlow`'s D4 census reads 5 rather than 8" | **SUPERSEDED, same cause** | reading | The reason round 2 gave was the missing field; #729 supplied it. |
| Validator: "8 packs — POL.5, POL.6, POL.7 from integration, none reviewed here" | **HOLDS; the packs are now reviewed** | re-run | `validate-lesson-pack.mjs --strict content/lessons/d4` → `OK: 8 lesson pack(s) passed validation.`, exit 0, no warning lines. |

**Nothing in round 2 is contradicted by this round.** The two documents disagree about no fact:
round 2 said these packs were unmigrated and unreviewed, both of which were true when it was
written, and #729 changed the first while this round changes the second. One of round 2's own
recorded corrections is extended rather than contested — `.cursor/skills/lesson-qa/SKILL.md`'s
migration census, which round 2 inherited and this round has had to correct again; see the last
section.

## Mechanical checks

```
node .cursor/skills/author/scripts/validate-lesson-pack.mjs --strict content/lessons/d4
```

```
note: visuals.tsx parsed from ...\apps\web\src\lessons\visuals.tsx: 266 registry entries, 0 of them
captioned. R8 ... therefore has nothing to check, and this is the INTENDED END STATE rather than a
tooling fault: #179 removed every widget caption on purpose. The rule is dormant, not dead ...
OK: 8 lesson pack(s) passed validation.
```

Exit 0, **8 packs, 0 errors, 0 warnings**. The R8 state line is present and reports the intended end
state, which is worth reading as what it is: **R8 is dormant, 0 of 266 registry entries captioned,
so a strict green certifies nothing whatever about widget captions.** That is the end state #179
designed and not a fault, but a reviewer who reads "0 errors, 0 warnings" as "captions checked" has
read it wrong.

```
node .cursor/skills/lesson-qa/scripts/scan-lesson-text.mjs \
  content/lessons/d4 apps/web/src/lessons/interactive apps/web/src/lessons/worked \
  apps/web/src/lessons/cfuVariants.ts packages/item-bank/src/d4
OK: 366 learner-facing string(s) across 8 pack(s) and 5446 prose-shaped run(s) across 347 widget
file(s), no rendering artifacts.
```

Re-run here rather than quoted: **366 strings across 8 packs, 5,446 prose-shaped runs across 347
widget files**, exit 0, no artifacts. Ten entries were added to `BANNED_PHRASES` this round; the
measuring agent reports each was watched to fire on its own injection with a green scan either side,
which is the only thing that distinguishes an entry from a comment.

**The string count reconciles with round 2's, which is worth checking rather than assuming.** Round
2 recorded **299** learner-facing strings for D4 on the tree it delivered, and that figure is still
written into `SKILL.md:739`. This round reads 366, and the difference is exactly what #729 added:
12 worked-example prompts and 55 steps across these three packs, **67 strings**, and
299 + 67 = 366. Two different trees, so the arithmetic is a corroboration rather than a proof — but
a jump of 67 with no explanation is how a scanner's population silently changes shape, and this one
has an explanation that lands on the nose.

## P0 — POL.6's CFU was stricter than its own practice checker. FIXED

`content/lessons/d4/POL.6.json`, the `cfu` block. At the base it declared **no `check`**, so
`gradeCfuAnswer` fell through to exact string membership in a hand-typed list of two:

```json
"accepted": ["-10x^4", "-10*x^4"],
```

Graded through the surface's own entry point, the measuring agent reports that `(-10)x^4` came back
**REJECTED with `note = null`** — wrong, with nothing under the field to say why — while the product
checker accepts that same spelling on practice items drawn from the same node **60 out of 60**. The
re-ask has the mirror of it: its key is positive, and `+20x^3`, the `+` a learner writes down to
record the sign they have just derived, was refused by the CFU and accepted **18/18 and 23/23** in
practice.

**The wrong conclusion a learner draws:** that bracketing a negative coefficient is a different
answer. And they have been taught to bracket it by this pack, four lines above the field —
`POL.6.json:83`, the third step of the CFU's own worked solution, verbatim:

> "The coefficients multiply: $\\left(-5\\right) \\times 2 = -10$."

So the reveal writes the negative factor in brackets, the learner carries the bracket into the
answer, and the card that printed it marks them wrong in silence.

**The guard that should have caught it was holding POL.6 out on a reason that was not true of it.**
`apps/web/src/lessons/cfuAuthoredAskParity.test.ts` keeps a `FORM_IS_THE_SKILL` list: packs allowed
to stay on exact-match grading because the FORM is what the question assesses, so a
form-indifferent grader would take the answer the lesson is teaching them not to write. POL.6's
entry read, verbatim at the base:

> "asks for the leading term as a coefficient times a power of x, so the whole function
> -5(2x - 3)(x + 1)^3 would pass"

The other three entries each name an answer that is EQUAL to the key and merely written in the wrong
form — an unexpanded product against a standard-form key, an unfactored trinomial against a factored
one, a dividend over a divisor against a quotient — and *equal* is precisely what makes a
form-indifferent grader take them. **A leading term is not equal to the polynomial it leads.** The
measuring agent graded it and reports `incorrect / value_mismatch`; that refusal is now a standing
assertion rather than an argument, and it passed here (below).

**Fixed** by giving the pack the check it always warranted, at `POL.6.json:95-99`:

```json
"check": {
  "answer_type": "expression",
  "answer_key": "-10x^4",
  "allowed_symbols": ["x"]
},
```

POL.6 is removed from `FORM_IS_THE_SKILL` and added to `MIGRATED_TO_A_CHECK` in
`cfuAcceptanceConvention.test.tsx:140` as `"expression"`, with the deleted entry's reasoning written
into both files rather than dropped. `cfuAuthoredAskParity`'s composition assertion moves with it:
`["POL.3", "POL.4", "POL.5", "POL.7"]` becomes `["POL.3", "POL.4", "POL.5", "POL.6", "POL.7"]`, so
the split it records is still a split and not one side plus a stale list.

**The new guard is `apps/web/src/lessons/monomialCfuGrading.test.ts`.** Its population is derived
from the SHAPE OF THE ANSWER — every pack whose `accepted[0]` matches a single signed term — rather
than from a node id or a domain, floored, with POL.6 named inside the floor because a floor
constrains size and not shape. It sweeps every instance, not only the authored one, on the reasoning
that the re-ask is the ask a learner meets *after* being told they were wrong. And it asserts the
other direction: the polynomial is EXTRACTED from POL.6's own prompt and the checker is required to
refuse it, so the argument for deleting the `FORM_IS_THE_SKILL` entry lives somewhere it can go red.

Red before the fix, as reported by the measuring agent: **8 failed / 7 passed**. Green now, measured
here rather than quoted:

```
npx vitest run --project @cr/web apps/web/src/lessons/monomialCfuGrading.test.ts
 Test Files  1 passed (1)
      Tests  15 passed (15)
```

**A correction to the figure I was handed.** The digest for this round recorded the green run as
"21 passed"; it is **15**, measured above. The red figures are consistent with 15 (8 + 7), so it is
the green number that was wrong, and the file has fifteen cases: one census, twelve accept rows and
two rejection rows. Recorded rather than silently amended, because a count in a report is how the
next reviewer decides whether the file has since shrunk.

## P1 findings

### P1-1 — POL.5's second lecture was false for every downward parabola. FIXED

`content/lessons/d4/POL.5.json`, `mini_lesson[1]`. At the base, verbatim:

> "**Vertex form** is $a(x - h)^{2} + k$, and a square is never negative, so the squared part
> contributes nothing at exactly one input and something positive everywhere else."

"The squared part" of a two-term rule reads as $a(x - h)^{2}$ — the whole first summand — and that
summand is NEGATIVE everywhere except $x = h$ whenever $a < 0$. **The wrong conclusion a learner
draws:** that $k$ is a minimum on every parabola, which is the exact error the slide before it
spends its closing clause preventing (`mini_lesson[0]`: *"negative and they both fall, so the vertex
is the highest point"*).

Not a corner case, and measured on the two surfaces this slide owns rather than argued:

- `interactive/VertexFormReadTable.tsx:32-43` — board 0's blank row is `{ a: -3, h: -6, k: 2 }` and
  board 1's middle worked row is `{ a: -1, h: -4, k: -1 }`, so **each of the two boards the learner
  can be dealt on this very slide carries a negative $a$.**
- `packages/item-bank/src/d4/nodes/POL.5/index.ts:251` — `d4.pol5.y-intercept-vertex-form.l2`, the
  template the CFU re-asks from, draws `const a = rng.pick([-3, -2, -1, 1, 2, 3]);`. **Half that
  pool opens downward.**

Fixed by naming the bracket literally so the claim is about $(x - h)^{2}$ and is true, and putting
the sign of $a$ beside the claim about which extreme the vertex is:

> "Some rules hand the vertex over without any work: **vertex form** is $a(x - h)^{2} + k$, and
> $(x - h)^{2}$ is never negative, so it is zero at exactly one input and positive everywhere else.
> The rule is therefore at its most extreme where the bracket vanishes, and that input is $h$ while
> the height there is $k$, so the vertex is the point $(h, k)$: the lowest point if $a$ is positive
> and the highest if $a$ is negative."

Two P2 objections were repaired in the same rewrite and are recorded under P2 rather than folded in
silently: the lost connective at the head of the paragraph, and the subtitle above it. The paragraph
is still **three sentences**; the measuring agent proved the count by injecting a fourth and
watching the validator's warning tier fire, which is finding H in
`validate-lesson-pack.mjs`'s header — *"a MIGRATED pack whose `mini_lesson[i]` runs exactly
MIGRATED_LECTURE_CEILING sentences"*.

### P1-2 — POL.6's first worked example stated a falsehood about the three numbers it had just printed. FIXED

`content/lessons/d4/POL.6.json`, `worked_examples[0].steps[0]`. At the base, verbatim:

> "At $x = 10$ the leading term is $1000$ while the other two come to $2000 + 300 = 2300$, so it is
> the smallest part of the rule."

The parts are $1000$, $2000$ and $300$. The smallest is $300$; the leading term is the middle one.
**The wrong conclusion a learner draws:** that the leading term is the smallest of the three terms
at $x = 10$, which is false, and which makes the reversal the next step announces read as a
different phenomenon from the one it is.

The intended claim is that it is smaller than everything else *put together* — and the widget
mounted on this same slide already says so correctly in its own column heading. Now:

> "At $x = 10$ the leading term is $1000$ while the other two come to $2000 + 300 = 2300$, so it is
> smaller than everything else put together."

which is the comparison `LeadingTermDominanceTable`'s third heading names: `"everything else,
together"`. The pack was saying the false version one line above a board saying the true one.

### P1-3 — "parity" was used ten times across these packs and glossed nowhere (R32). FIXED

Censused independently here rather than taken from the ledger entry. Ten learner-facing uses at this
pin, none of them glossed; the ledger entry's wider claim, that nothing anywhere in the repository
glosses the word, is the measuring agent's and is not re-taken here:

| Surface | Uses |
|---|---|
| `POL.6.json` `mini_lesson[3]`, `worked_examples[2].steps[1]` | 2 |
| `POL.7.json` `mini_lesson[1]`, `mini_lesson[3]` | 2 |
| `interactive/EndBehaviorParitySorter.tsx` — `prompt` (`:160`), `conclusion` (`:161`) | 2 |
| `interactive/EndBehaviorDescribeOrder.tsx` — `:80`, `:106`, `:134` | 3 |
| `interactive/MultiplicityCrossSorter.tsx` — `conclusion` (`:161`) | 1 |

(The other occurrences of the string in those files are header comments, a component name and a
registry id, none of which a learner reads.)

**The wrong conclusion a learner draws** is not a wrong fact but a wrong self-assessment: the word
is load-bearing on three boards and is the whole subject of one of them, so a learner who does not
know it cannot tell whether they have failed to understand the idea or merely failed to recognise
the word.

Glossed once, at the first learner-facing use in reading order — `POL.6.json:39`,
`worked_examples[2].steps[1]`, slide 2 section 2:

> "That exponent is odd, and whether a number is odd or even is its parity, which is the whole of
> what this question turns on."

That position was chosen and checked rather than picked: it precedes slide 2's own widget
(`end-behavior-parity-sorter`, `after: 2`), slide 3's lecture, and all of POL.7. It leans on nothing
unearned, because slide 2's lecture (`POL.6.json:7`) has already said *"An even power turns a
negative input positive"* and *"an odd power keeps the sign of its input"*. R32 asks whether a term
is EARNED, not whether it is avoidable, and this one is the subject of the board on the slide, so it
is glossed rather than dropped. **No lecture changed sentence count**, since the gloss went into a
worked-example step.

### P1-4 — POL.5's matching board told the learner to work it backwards, in the one line that says how. FIXED

`apps/web/src/lessons/interactive/InterceptRouteMatch.tsx:131`. At the base, verbatim:

> `prompt="Drag a value onto the feature it belongs to, or tap the value and then the feature."`

Both clauses are backward, and the board cannot say so. Read off the shared kind
(`interactive/kinds/MatchPairs.tsx`): the LEFT column is the draggable one (`draggable={!done}` at
`:272`, `onDragStart={() => pickup.hold(pair.id)}` at `:295`) and the RIGHT column is the drop
target (`onDrop={() => joinTo(pair)}` at `:335`). `joinTo` opens at `:192-194` with
`const leftId = pickup.take();` and `if (leftId === null || joined[right.id] === true) { return; }`
— it returns with no feedback set. On this adopter the left items are the graph features and the
right ones are the values.

**The wrong conclusion a learner draws:** that the widget is broken. Obeying the sentence, they pick
up a value, tap a feature, and get **neither a join nor a refusal** — there is no wrong-answer
message, because from the board's point of view nothing happened. Misinstructed reads as dead, which
is the worse of the two.

The reproduction was written first and is in `apps/web/src/lessons/d4Pol5WidgetCopy.test.tsx:80-105`,
*"gives the learner nothing when the value is tapped before the feature"*: it asserts zero joined
items AND that the status line is still in `data-state="prompt"` — *"and it is not even refused, so
the board looks dead"*. Fixed to:

> `prompt="Drag a feature onto the value it takes, or tap the feature and then the value."`

**The guard reads the board, not the string.** `d4Pol5WidgetCopy.test.tsx:134-166` asserts off the
rendered DOM that every left button is `draggable` and no right button is, that the left column
holds the features and the right holds `x = ...` values, and only then that the status line names
them in that order. If the shared kind ever flips its affordances, that file fails at the adopter
whose sentence has silently gone backwards instead of going on pinning a now-wrong string.

## P2 findings

### Fixed

**P2-1 — POL.5's third subtitle had lost its antecedent to #729.** `slide_subtitles[2]` read
*"Standard form hides it"*, and the "it" pointed at a sentence the migration had rewritten;
confirmed against `ff465269~1`. Now *"The axis of symmetry"*. A first attempt was rejected by the
validator at 5 words against `MAX_SUBTITLE_WORDS = 4`
(`validate-lesson-pack.mjs:264`, rule 10 / R14) — worth recording because it is the ceiling doing
its job on a QA fix rather than on an authoring one.

**P2-2 — POL.5's `mini_lesson[1]` opened with no connective**, which is what the *"Some rules hand
the vertex over without any work:"* clause restores. Same paragraph as P1-1; the sentence count was
proved at three by injection rather than by counting full stops.

**P2-3 — `InterceptRouteMatch`'s objective posed a two-way partition over four pairs (R22).** The
board deals four: `y-intercept`, `left-crossing`, `right-crossing` and `axis` (`:53`, `:72`, `:89`,
`:104`). The fourth comes from neither zero — `const axis = (p + q) / 2;` at `:46`, the midpoint of
the two crossings. The objective asked the learner to sort them into *"which of them come from
setting the input to zero and which from setting the output to zero"*, so one of four values had
nowhere to go on a board whose gate needs all four joined. Now three-way: *"setting the input to
zero, setting the output to zero, or the two crossings once they are known."*

**P2-4 — `VertexFormReadTable`'s conclusion cited a bracket that is not on board 1.** It hardcoded
`\left(x + 6\right)^{2}` and `x = -6`, which are board 0's blank row (`third: { a: -3, h: -6, k: 2
}`). Board 1's blank row is `{ a: 4, h: -3, k: -8 }`, so a learner who was dealt board 1 read a
conclusion about a bracket that had never been on the screen. Now interpolated from `third.h`
(`:137-139`). Red was taken on board 1 before the fix, and the assertion that holds it is
`d4Pol5WidgetCopy.test.tsx:187-218`, which solves board 0, restarts, solves board 1 and requires the
conclusion to contain board 1's bracket and **not** board 0's — with a floor of two typeset
expressions under it, because an empty conclusion would satisfy the two negatives on its own.

**P2-5 — "quartic" and "cubic" removed from two reveals (R32, on the worst surface for it).**
Neither word is defined anywhere in D4's learner-facing text. Checked here across all eight packs:
the only occurrence of either string in `content/lessons/d4` is `POL.8.json:85`, the template id
`d4.pol8.synthetic-cubic.l2`, which no learner reads.
`EndBehaviorParitySorter.tsx:101` is a row `note`, which
`BinaryRowSort` prints **only on a wrong call** and splices into the reveal — so the term was being
introduced to precisely the learner who had just missed the row (R33), and nothing renders it in a
passing run. Now *"The degrees of the two brackets add: 2 from the first and 1 from the second."*
`BuildFromGraphOrder.tsx:95-107` had both words in one short passage on a board whose whole subject
is reading a degree off a sum of exponents; now *"the degree is four"*, *"an even degree"*, *"would
be at degree three, and an odd degree makes the two ends disagree"*.

**P2-6 — two `FillTable` headings named their columns instead of glossing them (R21).**
`LeadingTermDominanceTable.tsx:48`, `"at"` → `"the input"`. `ZerosFromFactorsTable.tsx:42`,
`"set it to zero"` → `"factor set to zero"`.

**P2-7 — "degree" was spent on POL.6 slide 0, one slide before POL.6 defines it.** `mini_lesson[1]`
is where *"The **degree** of a polynomial is the largest exponent on the variable anywhere in it"*
lands, and slide 0 used the word twice to introduce a *different* bolded term — once in the lecture
and once in `worked_examples[0].steps[3]`, four lines further down the same slide, which is why both
were repaired and both were banned separately. Both now say "the largest exponent" / "the term
carrying the largest exponent", which is slide 0's own vocabulary. In POL.7 the word is **kept** and
only its second **bold** removed (`mini_lesson[2]`), because POL.6 is a hard prerequisite of POL.7 —
`skill_graph.json` gives `POL.7.prereqs = ["POL.2", "POL.6"]` — so the term is earned there and only
the bolding was promising an introduction that never arrives.

**P2-8 — POL.7's fourth slide pointed twice at nothing (R15).** `mini_lesson[3]` opened *"All of it
runs backwards as well, and running it backwards is the test of whether the correspondence is really
held."* — two definite pointers in one sentence, and "the correspondence" is a word POL.7 has never
used in any learner-facing string (it lives only in widget header comments). The subtitle above it,
*"Reading it backwards"*, had the same problem. Now the lecture names the direction the pack has
travelled — *"Every reading so far has gone from a factored form to its graph, and each of them runs
the other way as well"* — and the subtitle is *"Factors from the zeros"*, against slide 0's *"Zeros
from the factors"*.

**P2-9 — `TurningPointsEstimate` board 0 dealt the same question twice.** Both rounds were degree
five, so both bounded at four, and the landmark on the scale — the number of brackets, which is the
wrong answer made visible — sat at two on each. A learner who worked round 1 out and left the marker
where it was cleared round 2 without adding anything up, on a kind whose entire claim is that the
learner commits a number they derived. Round 2's exponents are now `[6, 1]` rather than `[4, 1]`
(`TurningPointsEstimate.tsx:49-54`), and the constraint is written into the file's header rather
than left as an accident of the draw.

### Reported, not fixed

Each of these is outside the fix boundary the user set. Where the reason to hold it is not
difficulty, that is said, because "shared" and "hard" are different reasons and only one of them
argues for waiting.

**P2-10 — numeric CFUs reject a leading `+` before the checker runs. Shared grader, P1 severity.**
`cfuChecker.ts:289` returns early on `check?.answer_type === "numeric" && !isNumericLiteral(value)`,
and `answerFormat.ts:14-15` is

```ts
export function isNumericLiteral(value: string): boolean {
  return /^-?(\d+(\.\d+)?|\.\d+|\d+\/\d+)$/.test(value.trim());
}
```

— `-?` with no `+` branch. POL.5's own prompt says *"Enter one number, with its sign"*
(`POL.5.json:81`), so `+13` is the answer the question asks for, spelled the way the question asks
for it. It is refused, and the note it is refused with is `NUMERIC_LITERAL_NOTE`
(`answerFormat.ts:19-20`): *"Enter your final answer as a single number (for example, 6), not the
expression."* **The wrong conclusion a learner draws:** that they have typed an expression. They
have typed a number. The measuring agent reports three of the four numeric instances across POL.5
and POL.7 are affected, and that practice accepts `+n`. It is one character of regex; the reason to
hold it is that it changes grading product-wide and owes its own guard, not that it is hard.

**P2-11 — U+2212 is rejected everywhere, including practice, and it is the glyph the prompt
paints.** Reported by the measuring agent: a learner copying a negative coefficient off the rendered
KaTeX types a minus sign that nothing in the tree can read. Shared grader; same lane as P2-10.

**P2-12 — the sign of a drawn coefficient picks the answer-field placeholder.**
`answerFormat.ts:558-567`, `isPositiveExponentAnswerText`, compacts the key and tests
`/^[0-9a-z^*/]+$/` — a character class with no `-` in it, which the docblock at `:554-556` records as
deliberate. So a key of `-10x^4` fails the predicate and a key of `20x^3` passes it, and passing it
routes through `cfuNotation` (`:1426`) to `POSITIVE_EXPONENT_PLACEHOLDER`, which is
`"Positive exponents: a^3, 1/a^5"` (`:135`). POL.6's re-ask therefore advertises a quotient
placeholder and a fraction key on an answer that can never be a quotient, and its authored ask does
not, on the strength of nothing but the sign of the number that was drawn. Shared; P2 because the
guidance is misleading rather than the grading wrong.

**P2-13 — three shared kinds paint or format against their own conventions.**
`kinds/EstimateThenCheck.tsx:302` and `:360` format the revealed answer with `toFixed(3)`
unconditionally, so an answer of 4 is revealed as `4.000` on a board about counting turning points.
`kinds/MatchPairs.tsx:291` paints a held item `BRICK` and `kinds/FillTable.tsx:264` paints a held
chip `CIVIC` — and `svgKit.tsx:36-37` says what those two are for: *"`CIVIC` and `BRICK` are the
app's correctness channel and they belong to the LEARNER'S ACTION: green means they got it right,
red means they did not."* So picking a chip up says "correct" on one kind and "incorrect" on the
other, before anything has been judged.

**This one has a population gap as well as a defect.** Nothing in the tree measures the pickup
palette: across every `*.test.tsx` under `apps/web/src`, the string `borderColor` appears exactly
once, in a comment in `chipPressedState.browser.test.tsx:11`. So there is no guard to widen and no
red to quote. Per the always-applied rule this is a **visual claim, and it owes a rendered frame on
the learner's mount at ~1024x580 that somebody LOOKED at. Nobody took one.** Two colour tokens
resolving through `.city-shell` also mean a bare mount would misreport them. **Claimed but
unverified as a rendered fact**; what is verified is the source, quoted above.

**P2-14 — POL.7's L1 hint names a constant the prompt does not always print.**
`packages/item-bank/src/d4/nodes/POL.7/index.ts:128`, `hints[0]`, ends *"and the constant in front
cannot be zero at all"*. At `:121-122` the template draws `outer = rng.pick([1, 2, 3])` and writes
`${outer === 1 ? "" : outer}` — so on a third of draws there is no constant on the page. Item bank;
outside the boundary.

## Two structural limits of the banned-phrase ledger, both measured

Recorded because both were discovered by trying to write an entry and failing, and neither is
written down anywhere else. Both are now in the script's own docblock so the next author meets them
before writing the entry rather than after.

**An objection to the BOLDING ALONE cannot be expressed.** `normalizeProse`
(`scan-lesson-text.mjs:706-708`) is `text.replace(/\*/g, "")...` — every asterisk is dropped, on
purpose, so that bolding one word inside a banned sentence cannot evade the ban. The cost of that is
exact: where the whole fix WAS the emphasis, the needle and the corrected sentence normalize to the
same string, and the entry fires on the FIXED pack. That is why POL.7 `mini_lesson[2]` (P2-7) has no
ledger entry: the repair removed four asterisks and no other character. Re-measured here against
`ff465269` — **446 bytes to 442, and `base.replace(/\*/g, "") === now.replace(/\*/g, "")` is
`true`** — so a needle quoting the banned wording would match the correction byte for byte.
**Demonstrated with no injection at all**, which is the cleanest form this demonstration can take.

**A needle cannot span a `{...}` conditional; it CAN span an inline math element.** The script's own
docblock draws the line at `:723-732`: *"Elements are elided rather than ended, so `at <InlineMath
... />, never` stays one run"*, while *"A conditional (`{flag ? "half a sentence" : ...}`) ends the
run, so a sentence assembled across a conditional is seen as its pieces and not as the sentence."*
An entry crossing inline math is therefore writable and must omit the elided content — two shipped
entries already do exactly that, at `:290` and `:513`, both saying so in their `why`. **This
corrects a claim made earlier in this round**, that inline math splits a run; it does not, and an
author who believes it does will decline to write an entry that would have worked. The new entry at
`:696` is quoted from mid-passage for the other reason, the conditional, and says so.

## Guards added or widened this round

Every one owes a demonstrated red, because an assertion written green may be asserting nothing.
Reds attributed to the measuring agents where they exist only as a revert; the greens in the last
column were re-run here.

| Guard | New or widened | Population, and how it is scoped | Red demonstrated | Green now |
|---|---|---|---|---|
| `monomialCfuGrading.test.ts` | new | derived by ANSWER SHAPE (`accepted[0]` is one signed term), every instance not only the authored one, floored at 1 with POL.6 asserted into it by name | **8 failed / 7 passed** (agent) | **15 passed**, measured here |
| `d4Pol5WidgetCopy.test.tsx` | new | POL.5's two authored widgets; reads the RENDERED board for which column is draggable rather than pinning a string | reproduction written first; board-1 red on the `VertexFormReadTable` half (agent) | green in the six-file run below |
| `matchPairsDragDirection.test.ts` | new | every adopter of `kinds/MatchPairs`, derived from the import; floor 14, plus an `ANCHORED_FLOOR` of 6 on the un-declared members so the exception lists cannot swallow the population | (agent) | green in the six-file run below |
| `estimateRoundsDiffer.test.tsx` | new | `visualsBuiltOn("EstimateThenCheck")`, floored at 4 with `turning-points-estimate` asserted into it; drives the real slider and Check, settling each round by bisection and offering that mark to every later round | (agent) | green in the six-file run below |
| `cfuAuthoredAskParity.test.ts` | narrowed by one exemption | `FORM_IS_THE_SKILL` loses POL.6; the D4 composition assertion gains it | the deleted entry's claim is now a standing assertion in `monomialCfuGrading` | green |
| `cfuAcceptanceConvention.test.tsx` | widened | `MIGRATED_TO_A_CHECK` gains `POL.6: "expression"` | — (a bookkeeping move; the red is P0's) | green |
| `scan-lesson-text.mjs` | 10 entries | the D4 ledger | each watched to fire on its own injection, green either side (agent) | scanner green, above |

`matchPairsDragDirection` is the one worth reading for its shape rather than its subject. It could
not check "are the nouns the right way round", which is semantic; so it inverts the rule to "name
the side", which is a fact a learner can see. The adopters that do not carry the anchored form are
**declared in two lists, because they are two different claims** — `NAMES_NO_GESTURE` for prompts
with no direction in them, `NOUN_ORDER_READ_BY_HAND` for directional prompts a human read — with a
disjointness check, a duplicate check, an existence check on every declared path, and both
directions on each list: a listed strategy note that starts naming a gesture fails, and a listed
hand-read that adopts the anchored form fails. The hand-read entries carry the two nouns as the
prompt spells them and the assertion re-derives the ordering claim from the sentence, so the shipped
`InterceptRouteMatch` defect would fail inside its own exemption rather than sit quietly in it.

**The guards' own limits, self-reported.**

- `estimateRoundsDiffer`'s population is `visualsBuiltOn("EstimateThenCheck")` — **scoped by
  implementation, not by behaviour**, which is the failure mode `qa-verification.mdc` describes at
  length. A bespoke widget dealing repeated numeric rounds exhibits the defect and is outside the
  sweep. Named here rather than left for the next round to find.
- `matchPairsDragDirection` reads the `prompt` prop only. `objective` is learner-visible too and is
  usually JSX; two adopters carry a directional instruction there alone (`TrigDoubleMatch`,
  `TrigCycleMatch`), and both were read by hand and are correct. **Correct and unguarded is a
  smaller claim than correct and guarded.** It also cannot check a recorded noun against the actual
  columns, and it checks an anchored prompt for the presence of "on the left" rather than for its
  truth.
- A discrepancy between the two new files worth a glance: `d4Pol5WidgetCopy.test.tsx:21` says *"15
  files import the kind at this SHA"* while `matchPairsDragDirection.test.ts:69` says *"Sixteen
  adopters at the time of writing"*. **Measured here: 16** non-test files under
  `apps/web/src/lessons/interactive/` import `./kinds/MatchPairs`. The comment is either off by one
  or is counting the population minus its own subject; either way the guard's floor of 14 and its
  anchored floor of 6 are both correct against 16.

## Coverage, every number measured at this pin

The figures below were taken by the sweep agents unless marked otherwise, and they are attributed
because that is what they are; those marked **(re-run here)** were re-taken against the working tree
while writing this.

**Content.** Validator `--strict` over `content/lessons/d4`: **8 packs, 0 errors, 0 warnings**
(re-run here). Five-path scanner: **366 learner-facing strings across 8 packs, 5,446 prose-shaped
runs across 347 widget files**, no artifacts (re-run here). Rendering: **136 learner-facing strings**
put through the real `LessonProse`, with **14 detectors each demonstrated red on a canary**; 12 tags
raised and all 12 explained — 8 are KaTeX correctly painting `\times`, 4 are POL.6 deliberately
teaching the ASCII `^` its own CFU asks for — so **0 real artifacts**.

**Practice.** **15 templates × 500 draws = 7,500 instances**, with the answer re-derived from the
RENDERED prompt rather than from `template_params`, **0 failures**. The zero is not vacuous: every
one of the 15 shapes was demonstrated red under prompt perturbation, and the measuring agent's own
caveat is recorded rather than dropped — two of the fifteen reached red on only some perturbation
strategies. R13 hint-leak sweep clean over **120 generated instances**.

**Worked examples against widget boards.** All **12 slides** compared by hand, because
`workedExampleReplay`'s population is D7 and D9 only and cannot see D4 at all. **Zero collisions**:
no worked example works the instance its slide's widget deals.

**Widgets.** Guard suites over these packs' boards: **2,651 cases across 13 files**. All **16**
`MatchPairs` adopters read against their rendered columns; the **6** carrying a directional prompt
with no anchor are all correct, and are the six now declared in `NOUN_ORDER_READ_BY_HAND`
(adopter count re-run here).

**Item bank.** Untouched: `git diff --name-only ff465269 -- packages/item-bank` is empty (re-run
here), and `practiceWalk.test.ts` and `diagnostic-scope.test.ts`, which do assert over
`hashItemDefinition`, both pass.

### What the coverage does NOT reach, named rather than left out

- **The documented five-path scan leaves 302 prose-shaped runs across 10 files unswept.** All clean
  at this SHA, and none of them ever recorded clean before. The largest is
  `apps/web/src/lessons/workedSolutionVisuals.tsx` at **216 runs** — invisible precisely because the
  path list names `apps/web/src/lessons/worked` and this file is that directory's *sibling*, which
  is the same shape of miss round 2's P1-3 and D2's P1-3 each found once. The one that bites here is
  `apps/web/src/lessons/answerFormat.ts` at **22 runs**, which is where `NUMERIC_LITERAL_NOTE`
  lives: the very string P2-10 is about. Both counts re-run here:

  ```
  scan-lesson-text.mjs apps/web/src/lessons/workedSolutionVisuals.tsx
  OK: 0 learner-facing string(s) ... and 216 prose-shaped run(s) across 1 widget file(s) ...
  scan-lesson-text.mjs apps/web/src/lessons/answerFormat.ts
  OK: 0 learner-facing string(s) ... and 22 prose-shaped run(s) across 1 widget file(s) ...
  ```

  Round 2 wrote the sentence this confirms: *"a list of directories named one at a time will keep
  coming up short."* It is now four rounds in a row.
- **`SKILL.md` still documents two different invocations**, found while re-reading it here and not
  previously recorded: the step-3 block at `:204-208` says *"Name all four surfaces"* and lists four
  paths, while the Scripts section at `:704` says *"Five surfaces, so name five paths"* and gives
  five at `:736-738`. A reviewer following the numbered procedure runs the four-path form and never
  opens `cfuVariants.ts`. Pre-existing at `ff465269`; **reported, not fixed**, since `SKILL.md` is
  outside the fix boundary except for the census correction below.
- **R8 is dormant** — 0 of 266 registry entries captioned — so the strict green certifies nothing
  about widget captions. Intended end state per #179, not a fault, but it is not coverage.
- **No rendered frame was taken for P2-13.** See the finding.

## Verifying the tree

Every link was run alone. Six gates, all green; those marked **(re-run here)** were re-taken while
writing this document, the rest are the measuring agents' runs.

| # | Link | Result | Exit |
|---|---|---|---|
| 1 | `npm run check:lessons` | 0 errors / 0 warnings across 10 domains | 0 |
| 2 | `validate-lesson-pack.mjs --strict content/lessons/d4` | `OK: 8 lesson pack(s) passed validation.` **(re-run here)** | 0 |
| 3 | `scan-lesson-text.mjs`, five paths | `OK: 366 ... 5446 ... no rendering artifacts.` **(re-run here)** | 0 |
| 4 | `npm run format:check` | `Checked 2095 files in 10s. No fixes applied.` **(re-run here)** | 0 |
| 5 | `npm run lint` | clean | 0 |
| 6 | `npm run typecheck` | clean | 0 |

The four new test files pass inside a 15-file run of **4,218 tests**. Re-run here as a six-file
group, the four new files plus the two edited guards:

```
npx vitest run --project @cr/web \
  apps/web/src/lessons/monomialCfuGrading.test.ts apps/web/src/lessons/d4Pol5WidgetCopy.test.tsx \
  apps/web/src/lessons/matchPairsDragDirection.test.ts apps/web/src/lessons/estimateRoundsDiffer.test.tsx \
  apps/web/src/lessons/cfuAuthoredAskParity.test.ts apps/web/src/lessons/cfuAcceptanceConvention.test.tsx

 Test Files  6 passed (6)
      Tests  185 passed (185)
```

Fifteen named D4/CFU guards were run, split across three invocations because `d4.test.ts` and
`d4LectureNotation.test.ts` live in `packages/item-bank` rather than in `apps/web`.

**Chromium: the population was derived from source as 27 files, not the 4 the brief named**, because
several browser guards sweep the whole 266-entry registry through a `liveVisualIds()` helper and so
see these packs' boards without naming them. One red, `classifyChipFit`, **verdict environmental**:
a 15s timeout under five concurrent Chromium instances, **13/13 passing in isolation on the
identical tree**, and a timeout rather than a spill assertion, so the fit claim it exists for was
never reached. That is the measuring agent's triage; it is recorded as environmental on the strength
of the isolated green and the failure mode, not on resemblance to a known flake.

**`format:check` was a genuine regression from this change set and was repaired, not waived.** Two
added lines in the banned-phrase ledger ran over; biome's own reflow fixed them with the string
contents byte-identical, and both the red and the green were shown. It is green here at 2,095 files.

**Verification scope, stated honestly.** This is **27 derived browser files rather than the full
browser suite**, and **fifteen named guards rather than a full `test:unit` sweep**. A green over a
named set is a statement about that set. CI runs the whole gate; this document does not claim to
have.

## One correction to the methodology, and what it is evidence about

`.cursor/skills/lesson-qa/SKILL.md` carried a census saying seven domains were migrated and *"D4, D6
and D9 declare `worked_examples` in no pack at all"*, so R34 was N/A on those three. That is false at
this pin. Corrected to what the tree says, and re-counted here over `content/lessons` rather than
taken from the correction: **all 62 packs across all ten domains declare `worked_examples`**, over
264 slides, 251 carrying an authored entry and 13 `null`, with no pack missing the field.
R34 is owed on every pack and pack-level N/A is no longer available to anything; the only skip left
is the per-slide `null`, which is a judgement to be argued rather than an exemption to be claimed.

**The sentence has now gone stale twice, in both directions, which is the finding.** Round 2 recorded
the first: D3 sat in an N/A list while its five packs already declared the field, so its first R34
pass came a round late. Then D4, D6 and D9 migrated underneath the sentence written to replace it,
and this round's three packs were among them. **The recurring defect is the carve-out that names
domains, not the domains it happened to name.** The correction says so in the file, and says to count
the field rather than trust the sentence — the same instruction round 2 wrote about the scanner's
path list, arrived at independently in a second place.

## What this round is, and what it is not

**It is:** POL.5, POL.6 and POL.7 — 3 packs, 12 slides, 12 lectures, 12 worked examples and 55
worked-example steps, 3 CFUs with their re-asks, 12 gated widgets (every `visuals` entry in all
three packs carries `gates: true`), 15 practice templates (5 per node, counted here), and the shared
surfaces those reach. One P0 fixed, four P1s fixed, nine P2s fixed, five findings reported
across the shared grader, the shared widget kinds and the item bank, two structural limits of the
banned-phrase ledger measured, four guards added, one methodology census corrected.

**It is not** a round on D4. Five of D4's eight packs — POL.1, POL.2, POL.3, POL.4, POL.8 — were
covered by round 2 at `68c5aa9a` and are not re-read here, and a finding at `68c5aa9a` is evidence
about `68c5aa9a`. It is not a round on any other domain, though four of its findings are
cross-domain and are filed as such. It does not speak for the rest of Early Modern or Industrial. It
has taken **no rendered frame**, so it makes no spatial or visual claim that is verified: P2-13 is
the one finding that wanted one, and it is marked **claimed but unverified** rather than counted.
