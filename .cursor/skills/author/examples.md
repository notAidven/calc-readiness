# Author examples: the D1 gold references

Use these as STRUCTURAL models, not content to copy. D1 is the built, shipped
domain; imitate its shape and rigor, author your own era's math and story.

**A warning about D1 as a prose model.** D1 is the structural gold standard and it
predates SKILL.md's R9: nearly every D1 paragraph ends with a "Your turn: ..." task
statement, which authors now fold into the widget instead. Copy D1's shape, its
gating, its CFU grading and its widget contract. Do not copy its lead-ins.

The teaching-prose contrasts in the second half of this file come from the D2 review
on 2026-07-26. They are the actual rejected and accepted text, not invented examples.

## NUM.2: multi-widget teaching flow

`content/lessons/d1/NUM.2.json` (Order of operations). Every one of its four
`mini_lesson` paragraphs is paired with a gating interactive visual, and the first
paragraph carries TWO (both must complete before Next):

```json
"visuals": [
  { "after": 0, "id": "pemdas-key-explore", "gates": true },
  { "after": 0, "id": "pemdas-mnemonic-explore", "gates": true },
  { "after": 1, "id": "pemdas-solver-ltr", "gates": true },
  { "after": 2, "id": "order-matters-play", "gates": true },
  { "after": 3, "id": "pemdas-solver", "gates": true }
]
```

What to copy: distinct archetypes across the lesson (tap-to-reveal key + mnemonic,
a click-through solver, a pick-first "order matters", a second solver instance),
prose trimmed to short lead-ins that hand off to the widget, and the intentional
solver pair (`pemdas-solver` / `pemdas-solver-ltr`) as the one allowed id-family
reuse. The CFU is a single combining value question graded by `check`:

```json
"cfu": {
  "prompt": "Evaluate $15 - 2 \\times 3^2$.",
  "accepted": ["-3"],
  "hint": "First evaluate the exponent: $3^2 = 9$. Then multiply ...",
  "check": { "answer_type": "numeric", "answer_key": "-3" }
}
```

## NUM.4: form-sensitive CFU via `accepted`

`content/lessons/d1/NUM.4.json` (simplify / combine like terms). Simplifying wants a
SPECIFIC form, so the CFU relies on the exact `accepted` list (or an expression
`check` with the combined-polynomial profile), not a loose numeric match. Copy the
principle: when the answer's FORM is the point (simplified, expanded, combined),
grade the form, do not accept an unsimplified equivalent.

## NUM.F: `reduced_fraction` via `check`

`content/lessons/d1/NUM.F.json` (fraction arithmetic). The CFU demands lowest terms
by setting the numeric `check` with a reduced-fraction profile:

```json
"check": {
  "answer_type": "numeric",
  "answer_key": "1/3",
  "representation": "fraction",
  "simplification": "reduced_fraction"
}
```

So `2/6` is rejected and `1/3` is accepted. The advisor copy for NUM.F also reminds
the learner to write lowest terms (`AdvisorLesson.tsx`, `NUM_F_IDLE_LINE`). Copy
this pattern for any domain where reduced form is load-bearing.

## The interactive-practice-item reference: the graph pack

`packages/item-bank/src/graph/slices.ts` + `packages/shared-components/src/graph-input.tsx`
+ `graph-comparator.ts` are the ONLY widget-graded question path today. Read them as
the reference implementation when you land the interactive-practice-item
prerequisite (SKILL.md Phase 5): an authored slice bundles an answer key
(reference curve + tolerances + scored features) with a `valid` response, >= 2
`alternate_valid`, and reason-coded `near_miss` responses; `validateGraphPool`
grades every authored response through the real comparator; `toGraphWorkspace`
hands the widget an answer-free workspace so the client never holds the key. A new
non-graph interactive answer_type mirrors this end to end.

## Teaching-prose contrasts (from the D2 review, 2026-07-26)

Four rules are much easier to see than to describe. Each pair below is real: the
REJECTED text shipped in `content/lessons/d2/`, and the ACCEPTED text is what the
rewrite replaced it with.

### R3: the opening motivates, it does not define (RAD.1 slide 1)

REJECTED. It opens with the definition, so the term arrives before the learner has
any reason to want it. The story is then bolted on halfway down, as decoration.

> **A square root asks: what number times itself gives you this?** So $\sqrt{36} = 6$,
> because $6 \times 6 = 36$. That root symbol is called a **radical**, and the number
> inside it is the **radicand** [...] In Boomtown Square this is how you get the side
> of a square patch of ground back from its area.

ACCEPTED. A person with a problem, the problem stated in plain quantities, the
question it forces, and only then the term, as the answer to a question the learner
is already holding.

> The surveyor at Boomtown Square has a deed in front of him. It records one square
> plot as $36$ square meters and gives nothing else, but he has to order fencing, so
> he needs the length of a single side. A square's area is its side multiplied by
> itself, so he is hunting for the number that gives $36$ when multiplied by itself.
> That is exactly the question a **square root** asks, and we write it $\sqrt{36}$.

The shape Gabe asked for, in his own words, is worth keeping next to it as the
template: *"A surveyor needs to know how long town square's side length is, but he
only knows its area. How would he go about finding this? This is where square roots
come in..."* Problem, question, seamless transition. No seam between the story and
the mathematics.

### R5: the rule is forced, not asserted (EXP.1, negative exponents)

REJECTED. Every sentence is true and the learner is told all of it. "Just not good
teaching": the boxed rule is an announcement, and nothing before it made the
fractions inevitable.

> Step an exponent down one at a time and you divide by the base each step. Start at
> $3^{2} = 9$, then $3^{1} = 3$, then $3^{0} = 1$. **Any base to the power $0$ is
> $1$.** Keep going below zero and the value turns into a fraction: $3^{-1} =
> \dfrac{1}{3}$, then $3^{-2} = \dfrac{1}{9}$. **A negative exponent means one over
> that power:** $x^{-k} = \dfrac{1}{x^{k}}$.

ACCEPTED. The same facts, but the learner watches one motion (halve, step down)
continue past zero and has nowhere else to land. The rule is named only after it has
already happened.

> Each step drops the exponent by one and halves the value. Take one more step and
> the exponent lands on $0$. Half of $2$ is $1$, so $2^{0} = 1$. Nothing unusual
> happened there; we only kept dividing. [...] The exponent becomes $-1$ and the
> value halves once more, from $1$ down to $\dfrac{1}{2}$ [...] Nobody decided that.
> Once you accept that every step down divides by the base, the values below zero are
> **forced** to become fractions, and each one turns out to be $1$ over the matching
> positive power. That is all a negative exponent ever was: $x^{-k} = \dfrac{1}{x^{k}}$.

The same move fixes the other rejected black box, "always pull out the **largest**
perfect square", which the rewrite turned into the learner trying $4$, finding
another $4$ still hiding inside $12$, and concluding for themselves that the largest
square is the one that leaves nothing behind.

### R4: this slide is ALSO the meta-commentary example

That accepted paragraph shipped with two sentences that were rejected on a separate
rule, which is worth seeing, because good teaching and lesson-narration can sit in
the same paragraph:

> ~~That single motion is the whole idea of this slide, so follow it and do not stop
> early.~~ ~~Start high and step down:~~ $2^{3} = 8$, then $2^{2} = 4$ [...]

Both sentences describe the slide rather than the mathematics. Cut them and nothing
mathematical is lost, which is the test. The validator's ban-list catches this exact
register.

### R8 + R9: one instruction, in one place (RAD.3 slide 2)

A live duplicate that still exists in the repo, so you can run the validator and
watch it fire. The lesson prose ends with a task statement:

```json
"... Your turn: build the radical form of a fraction exponent."
```

and the visual registry then says the same sentence again, directly underneath the
widget:

```ts
"radical-form-builder": {
  Svg: RadicalFormBuilder,
  caption: "Build the radical form of a fraction exponent.",
},
```

Two lines, one job, and the learner reads the instruction twice before doing anything.
The correct version states the task ONCE, inside the widget's own status line: the
prose paragraph simply ends when the teaching ends, and the `caption` key is omitted.
This looked like a one-off; it was in all 21 D2 widgets, because the registry pattern
invited a caption for every entry. `caption` is optional for exactly this reason.

## A widget to imitate: AbsoluteValueExplore

`apps/web/src/lessons/interactive/AbsoluteValueExplore.tsx` is a compact model of
the contract: it manages state (a stepped marker), makes the learner PRODUCE the
result (visit BOTH points 4 units from zero) before it latches `done` and fires
`onComplete` once, exposes keyboard `<button>` steppers, and renders an `aria-live`
status line. Mirror this structure (state, latch, produce-before-complete, a11y)
for new widgets.
