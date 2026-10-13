# Author reference: the deep authoring contract

Everything SKILL.md defers to. Confirm the CURRENT shapes in the cited files before
authoring; line numbers drift, field names are the contract.

## 1. LessonContent JSON schema (additive only)

Source of truth for **shipped** fields: `apps/web/src/lessons/types.ts`. Do NOT add fields to shipped packs until the player consumes them.

```ts
interface LessonContent {
  node_id: string;                         // e.g. "RAT.1"
  title: string;
  mini_lesson: readonly string[];          // section 1 per slide: short conceptual lecture
  slide_subtitles?: readonly string[];     // one heading per slide index (optional)
  worked_examples?: readonly (LessonWorkedExample | null)[]; // section 2 per slide; omit or null to skip
  visuals?: readonly LessonVisualPlacement[];
  cfu?: LessonCfuSpec;                      // end-of-lesson combining question
}

interface LessonWorkedExample {
  prompt: string;                          // the instance this walks, named before the moves
  steps: readonly string[];                // 2-6 ordered moves, last one names the result
}

interface LessonVisualPlacement {
  after: number;                           // insert AFTER this mini_lesson index
  id: LessonVisualId;                      // must be a registered interactive id
  gates?: boolean;                         // true = block NPC "Next" until onComplete
}

interface LessonCfuSpec {
  prompt: string;                          // Markdown + $LaTeX$ (LessonProse)
  accepted: readonly string[];             // exact-match fallback (form matters)
  hint: string;                            // one hint, Markdown + $LaTeX$
  check?: LessonCfuCheck;                  // present = form-independent grading
  worked_solution: readonly string[];      // REQUIRED; ordered steps, last one names the answer
  worked_solution_params?: Record<string, number>; // optional; the same solution as a FIGURE
  worked_solution_template?: string;       // optional; a DIFFERENT template for that figure
  variants: LessonCfuVariants;             // REQUIRED; where the re-ask draws its questions
}

interface LessonCfuVariants {
  template_id: string;                     // an item-bank template, or a CFU-only one
  count: number;                           // >= 2, and INCLUDES the authored question
}

interface LessonCfuCheck {
  answer_type: "numeric" | "expression";
  answer_key: string;
  representation?: AnswerSpec["representation"]; // numeric only
  simplification?: AnswerSpec["simplification"]; // numeric only (e.g. reduced_fraction)
  allowed_symbols?: readonly string[];           // expression only, e.g. ["x"]
}
```

Pack files live at `content/lessons/<domain>/<NODE>.json`, one per node. Glob keys
are alphabetical, so the loader supplies the real display order (see §4).

### `worked_examples`: section 2

**Status:** in `types.ts`, consumed by the player, and authorable. D1 is migrated in the same
change that wired the player; a pack that omits the field teaches from one paragraph per slide
and stays valid, so migration is per PACK rather than per domain.

```ts
worked_examples?: readonly (LessonWorkedExample | null)[];
```

```json
"worked_examples": [
  null,
  {
    "prompt": "Add $\\dfrac{3}{8} + \\dfrac{5}{12}$.",
    "steps": ["...", "..."]
  }
]
```

- **Aligned by POSITION with `mini_lesson`.** `worked_examples[i]` is slide `i`'s section 2 and nothing else reads it, so an entry cannot be moved without the slide it belongs to, and an entry past the last slide is a section 2 nothing renders (validator rule 13 errors on it).
- **`prompt` is REQUIRED on every authored entry and is not a title.** It names the instance the steps are about to work, in **at most 2 sentences**, and it renders above them. Steps with no question above them are a solution to something the learner was never shown, so they read the moves backwards to recover the problem, which is the one thing section 2 exists to spare them. State the instance and stop: the idea belongs in `mini_lesson[i]` and the result belongs in the last step.
- `steps` is an ordered list (Markdown + `$...$`), **2 to 6 steps**, one move per step, last step naming the result: the same rules as `cfu.worked_solution` / practice `worked_solution` (see `practice-hints`), because it is the same `WorkedSolution` renderer.
- Skipping a slide is legal in both of its spellings: a **`null` entry**, or a shorter array than `mini_lesson`. Skip when the slide is purely definitional or its section-3 widget IS the demonstration. A bare step array is the OLD shape, renders as no example at all, and rule 13 errors on it by name.
- A pack that DECLARES the field has its `mini_lesson` entries held to the tighter migrated lecture budget: **2-3 sentences**, a fourth warned, a fifth an error. `MAX_SENTENCES = 7` is what still holds the unmigrated packs.

### Three-section slide flow (shipped player behavior)

For each slide index `i`, the learner advances through:

1. **Section 1 — Lecture:** NPC bubble shows `mini_lesson[i]`. Next is available immediately (no gate). No widget and no worked example is on screen yet.
2. **Section 2 — Worked example:** If `worked_examples[i]` carries steps, the card renders its `prompt` at the top, then the step list, as read-only prose; Next is available immediately. Where the entry is `null` or absent, this section is skipped and section 1 hands straight to section 3.
3. **Section 3 — Interactive visual:** Render `visuals` with `after === i`. Next is withheld until every gating widget on that slide completes.

The NPC bubble keeps speaking `mini_lesson[i]` across all three sections; what changes is
which card sits under it. Then advance to slide `i + 1`, and Previous from a slide's first
section lands on the previous slide's last section. Combined review shows each slide's
worked example between its prose and its widgets, with the widgets ungated.

### The every-slide-interactive pairing rule

For every index `i` in `0..mini_lesson.length-1`, there must be at least one
`visuals` entry with `after === i` AND `gates === true` (section 3). Sections 1
and 2 are prose-only. A slide may hold more than one gating visual (all must
complete before Next advances past section 3). The validator enforces the PAIRING
against section 3 only, which is correct: section 2 is optional, so its absence
is not a finding. What it checks about section 2 instead is rule 13 above.

## 2. Widget catalog + the universal contract

### The `LessonWidgetProps` / gates contract

Every interactive teaching visual is a React component:

```ts
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";

export function <Name>(props: LessonWidgetProps) { ... }
```

`LessonWidgetProps` is `{ onComplete?, onReopen?, onPlayingChange? }`. `onReopen`
takes the gate back OFF the latch, which is what makes a restart hand out a fresh
instance instead of a free pass.

- Manage own state; render `<div className="lesson-interactive lesson-interactive--<kind>">`.
- Open the gate EXACTLY ONCE when the learner reaches the correct final state.
  Use `useWidgetVariants(count, props)` and call its idempotent `latch` rather
  than calling `onComplete` by hand; spend its `nonce` as the body's React `key`
  and its `restart` on the reset button, which deals the NEXT parameter set and
  re-closes the gate. `AdvisorLesson` adds the visual id to `doneVisuals` and
  reveals "Next" only when every gating visual on the active paragraph is done
  (`AdvisorLesson.tsx` gate logic: `activeGates` / `gateBlocked`).
- After a wrong attempt, offer a `WidgetReveal` with both an answer and the
  reasoning, bound with `useRevealReAsk({ reAsk: onRestart, release: onSolved })`.
  The shared host teaches and re-asks on the first reveal, and lets the learner
  past on the second. See the `interactive-visuals` skill for the full layer.
- `aria-live` status line (`data-state="prompt" | "wrong" | "solved"`);
  `aria-valuetext` on any range/stepper. Keyboard-operable. No `<select>`.
- Theme tokens from `apps/web/src/lessons/svgKit.tsx`
  (`LABEL/SOFT/LINE/CIVIC/BRICK/SIGNAL`, `PEMDAS`, `EqToken`, `EquationRow`,
  `stackGapMid`). Import primitives from `svgKit`, never from `visuals.tsx`
  (avoids a cycle). One widget per file in `apps/web/src/lessons/interactive/`.
- Never set a `font-family` on a widget surface. KaTeX owns the face of all math,
  and a non-math label is prose in the body font. The typed `<input>` is the one
  exception, and `styles.css` already handles it.
- Renders fine ungated (no `onComplete`) on the review page.

## 2.1 The shared answer mechanics every widget inherits

**Source of truth: `apps/web/src/lessons/widgetFeedback.tsx`, mounted once by
`LessonVisual` in `visuals.tsx`.** These are cross-cutting behaviours a widget author
CALLS INTO and never reimplements: success feedback, the check tone, the mute
preference, the live-region announcement, and the reveal affordance. Building any of
them per widget is the bug.

> **Status: LANDED.** PR #111 (`gabe/d2-lesson-quality`) merged 2026-07-27, so
> `apps/web/src/lessons/widgetFeedback.tsx` is on `integration` and is the source of
> truth. Read the file rather than this section for the current exports; what follows
> is the contract, not a transcript. Never fork a parallel mechanism for any of these
> behaviours.

### What `LessonVisual` already does for you

```tsx
<figure className="lesson-visual">
  <WidgetFeedbackHost>
    <Svg onComplete={onComplete} />
  </WidgetFeedbackHost>
  {caption && <figcaption><LessonProse markdown={caption} /></figcaption>}
</figure>
```

Every registered visual is wrapped, so the context below is always present. A widget
rendered bare (a test, the review page) degrades to a no-op rather than throwing.

### Success: `useWidgetSuccess()`

```tsx
const correct = useWidgetSuccess();      // () => void
// ...on each correct answer, not only on the final one:
correct();
```

One call pops the check-mark badge over the widget, announces "Correct." on the
polite live region, and plays a short synthesized two-note chime. The animation, the
reduced-motion opt-out, the mute preference and the announcement are all owned by the
host. Call it per correct round; it restarts rather than merges. It is INDEPENDENT of
`onComplete?.()`, which is still what latches the gate exactly once at the end.

Two things it must not do. It must not fire on a reveal: where a correct branch is
shared with the reveal path, gate it the way `SignedAdditionWalkthrough.finish(earned)`
does. And it must not fire on a re-satisfied condition, only on new progress, so attach
it to the state transition (the set-add, the `!done` guard, the `next` advance) rather
than the predicate: `AbsoluteValueExplore` re-enters its correct branch whenever
`|value| === 4`, and stepping off 4 and back would re-pop the badge and replay the chime.

Widgets with no correct-or-wrong moment do not fire it at all. Animation walkthroughs
(Play / Pause / Step / Back / Replay only) and tap-to-reveal or free-exploration widgets
whose every tap is valid by construction would be celebrating a button press. Those are
pinned by name with a reason in the `UNJUDGED` list of
`apps/web/src/lessons/widgetSuccessCoverage.test.ts`, which sweeps the widget sources
and fails any other widget that fires nothing.

### Reveal: `<WidgetReveal>` and `useRevealGate()`

```tsx
const { attempted, revealed, markAttempt, markRevealed } = useRevealGate();

<WidgetReveal
  available={attempted}                 // offered only after a real attempt
  revealed={revealed}
  answer={<InlineMath latex="x^{-4}" />}
  why="Both powers share a base, so the exponents add: 3 + (-7) = -4."
  onReveal={() => { markRevealed(); fillInAnswer(); unlockNextStep(); }}
  label="Reveal answer"                 // optional
/>
```

- `why` is **required** by the prop type. That is deliberate: a reveal that only
  prints the answer teaches nothing, so the API will not let you ship one (R12).
- `available` gates the affordance behind a genuine attempt, so it is not a
  first-click bypass of the teaching.
- Revealing announces itself and deliberately does NOT fire the success state:
  nothing was answered.
- `onReveal` must also unblock the widget's own next step, or the learner is still
  stuck.
- **Scope.** This is the LESSON layer. Revealing in a mini-lesson is free and
  unpenalised; a revealed PRACTICE slot still scores zero
  (`docs/Mastery_Scoring_Spec.md` §4, enforced in `@cr/mastery-service`), and nothing
  here can reach that path. Do not add an "Explain this another way" control: it was
  considered and rejected.

### Sound

`LessonSoundToggle` lives in the lesson frame header; `useLessonSoundMuted()` and
`setLessonSoundMuted()` read and write the persisted `cr.lessonSound.muted`
preference. A widget never plays audio itself: `correct()` is the only sound path,
and it stays silent before the learner's first gesture and wherever Web Audio is
missing.

## 2.2 Interaction kinds (count these across the ERA)

SKILL.md R11 makes variety a requirement measured across the era you are authoring, while
the validator's own count is per directory. These are the kinds to
spread across; the id suffix the validator counts is only a proxy for them. The last
five rows name the dedicated suffixes that arrived with D2's archetype set in
`apps/web/src/lessons/interactive/kinds/`; older D1 packs spell some of those
interactions with a general `-play` or `-explore`, which stays valid.

| Kind | What the learner does | Suffix that usually names it |
|---|---|---|
| type-a-value | Enters a number or expression and it is checked | `-builder`, `-solver` |
| tap-one-of-N | Picks one chip / cell / branch from a small set | `-classify`, `-play` |
| build-an-expression | Assembles an expression from parts, in order | `-builder` |
| sort-into-bins | Drags or taps items into labelled groups | `-sorter` |
| drag-onto-a-diagram | Places something at a position on a figure | `-drag`, `-explore` |
| predict-then-check | Commits to an outcome, then runs it and compares | `-estimate`, `-play`, `-walkthrough` |
| tune-a-control-to-target | Moves a slider / stepper until a condition holds | `-slider`, `-stepper` |
| matching pairs | Connects each item on the left to one on the right | `-match` |
| sequencing steps | Puts the steps of a method into the right order | `-order` |
| labelling a figure | Names the parts of a diagram | `-label` |
| filling a table | Completes a row / column pattern cell by cell | `-table`, `-multiples` |
| spot-the-error-in-a-worked-line | Finds the wrong step in a worked solution | `-spot` |

Two widgets are the SAME kind when the learner's physical action is the same, even if
the mathematics differs. A domain that is mostly type-a-value plus tap-one-of-N fails
R11. And a dropdown is never an interaction: "just disguising multiple-choice
questions via a drop-down is not true interaction."

### Reusable interaction kinds (try these first)

Six shared components in `apps/web/src/lessons/interactive/kinds/` each carry a
whole interaction: drag/tap handling, wrong-answer copy, reveal and restart. A
widget built on one is a thin wrapper supplying content plus `variant.latch` /
`variant.restart`.

| Kind | The content it fits | Exemplars |
|---|---|---|
| `LabelParts` | naming the parts of one figure | `PowerPartsLabel` |
| `MatchPairs` | a correspondence with distinct answers | `PowerOfPowerMatch`, `IdentityInverseMatch`, `RationalNumericTwinMatch` |
| `OrderSteps` | a chain of dependencies | `SimplifyRadicalOrder`, `RationalSimplifyOrder`, `LinearLineConvertOrder` |
| `SpotTheError` | recognising a mistake, then fixing it | `NegativeExponentSpot`, `UnitConversionSpot`, `LinearModelClaimSpot` |
| `FillTable` | "the same move, applied again" | `ZeroExponentTable`, `RationalEndBehaviorTable`, `LinearSlopeRatioTable` |
| `EstimateThenCheck` | a misconception about magnitude | `RootMagnitudeEstimate` |

### Bespoke archetype catalog (models to imitate)

| Archetype | Example widget id | File |
|---|---|---|
| Number-line stepper (distance) | `absolute-value-explore` | `interactive/AbsoluteValueExplore.tsx` |
| Animation that stops before the answer | `signed-addition-walkthrough` | `interactive/SignedAdditionWalkthrough.tsx` |
| Click-through solver | `pemdas-solver`, `pemdas-solver-ltr` | `visuals.tsx` (`PemdasStepSolver`) |
| Pick-first / order | `order-matters-play` | `interactive/OrderMattersPlay.tsx` |
| Type-and-check builder | `distribute-builder` | `interactive/DistributeBuilder.tsx` |
| Drag-to-bin (`usePickup`) | `like-terms-sorter` | `interactive/LikeTermsSorter.tsx` |
| Locked-miss classify | `like-terms-classify` | `interactive/LikeTermsClassify.tsx` |
| Predict-then-verify | `rationalize-explore` | `interactive/RationalizeExplore.tsx` |
| Slider | `percent-slider` | `interactive/PercentSlider.tsx` |
| Tappable ladder | `common-denominator-multiples` | `interactive/CommonDenominatorMultiples.tsx` |
| `foreignObject` buttons over an SVG | `fraction-parts-explore` | `interactive/FractionPartsExplore.tsx` |
| Tap-to-reveal key | `pemdas-key-explore` | `interactive/PemdasKeyExplore.tsx` |
| Fill the cells of a drawn grid | `sign-rules-table` | `interactive/SignRulesTable.tsx` |

`REGISTRY` in `apps/web/src/lessons/visuals.tsx` is the source of truth; these are
the shapes, not the whole inventory. Build a new widget when none of them truly
fits the concept (decision #2). At least one archetype per lesson must be a
genuine build/manipulate (not tap-to-reveal).

### Interactive id naming (what the validator accepts)

An interactive visual id ends in one of these suffix words (optionally followed by a
short variant like `-ltr`): `-explore`, `-play`, `-walkthrough`, `-builder`,
`-sorter`, `-slider`, `-classify`, `-multiples`, `-solver`, `-stepper`, `-drag`,
`-label`, `-match`, `-order`, `-spot`, `-table`, `-estimate`. The last six name the
six shared interaction kinds, so the list grows when a new shape does. `-build` is
accepted as a spelling of `-builder` (D5 `RAT.6` and three D7 packs ship it) but
counts as the `builder` kind, not a kind of its own, so it cannot pad the R11 variety
spread. Prefer `-builder` in new packs.

The suffix names the interaction SHAPE, so changing a widget's mechanic means
renaming its id (`sign-rules-play` became `sign-rules-table` when it stopped
touring the four sign pairs and started asking the learner to fill them in),
which touches `visuals.tsx`, the lesson JSON and these docs.

An id with no interactive suffix is REJECTED: the legacy static D1 visuals have
been deleted from the registry, so such an id no longer resolves to a component at
all, and the finding cascades into "paragraph has no gating visual" for the same
entry.

## 3. Registration steps table

| What | File | What to add |
|---|---|---|
| Per-domain loader | `apps/web/src/lessons/<domain>.ts` | Mirror `d1.ts`: `import.meta.glob<LessonContent>("../../../../content/lessons/<domain>/*.json", { eager: true, import: "default" })` + a `NODE_ORDER` array from the domain's `skill_graph` nodes; export `<domain>Lessons` and `<domain>LessonByNode`. |
| Domain registry (REQUIRED, or the pack is unreachable) | `apps/web/src/lessons/domains.ts` | Add the domain's `LESSON_DOMAINS` entry: `id` (the `content/lessons/<id>/` folder), a short `label`, the loader's `lessons` + `lessonByNode`, the bank's `<D#>_PRACTICE_NODES`, and its practice source. The city lesson host, the `?dev` list, `cfuChecker` and `LessonPractice`'s default source all read this registry, so this entry is the whole wiring. Proven by `npx vitest run --project web-reachability`. |
| Widget id + registry | `apps/web/src/lessons/visuals.tsx` | Import the widget; add its id to the `LessonVisualId` union; add a `REGISTRY[id] = { Svg }` entry. `caption` is OPTIONAL and omitting it is the default (SKILL.md R8): a caption that restates the widget's own prompt is a second instruction for one job, which is what all 21 D2 widgets did. Add one only when it says something the widget does not, and wrap its math in `$...$` (it renders through `LessonProse`). |
| Worked-solution SVG | `apps/web/src/lessons/workedSolutionVisuals.tsx` | Add `WORKED_SOLUTION_VISUALS[template_id] = { Svg: (params) => ..., caption: (params) => ... }` driven by the same `template_params`. |
| Cross-skill NPC note | `apps/web/src/lessons/practiceNotes.ts` | Add `PRACTICE_NPC_NOTES[template_id]` ONLY for a shape that genuinely needs another same-domain non-prereq node. |
| CFU grading | `apps/web/src/lessons/cfuChecker.ts` | Each lesson whose `cfu.check` is set contributes one item version through the shared checker; confirm your domain's lessons are loaded (via the loader). |
| Practice grading | `apps/web/src/lessons/practiceChecker.ts` + `practiceSession.ts` | The practice pool item versions register through `configureAnswerChecker` / `toD1ItemVersions`. Confirm the domain's items flow in, and export its `d<N>PracticeSource` from `practiceSession.ts` for the registry row above to point at. |

## 4. Item-bank per-node layout + practice / infinite mechanics

Layout (`packages/item-bank/AUTHORING.md`, §1): one dir per node under
`packages/item-bank/src/<domain>/nodes/<NODE>/index.ts` holding that node's
generators + golden fixtures. Thin aggregators (`templates.ts`, `practice.ts`,
`golden.ts`) concatenate per-node exports in a frozen order. Answer-def helpers
live in `src/template.ts`. Two authors editing different nodes never collide.

Practice mechanics (`packages/item-bank/src/d1/practice.ts`,
`apps/web/src/lessons/LessonPractice.tsx`):
- `PRACTICE_SET_SIZE` = 5. The locked mix is `1xL1 / 2xL2 / 2xL3`
  (`D1_PRACTICE_MIX`). `buildD1PracticePool` freezes the mix per node; a
  distinctness guard keeps every item unique and never shared with an assessment
  item.
- `D1_PRACTICE_ONLY_TEMPLATES` = a tier the diagnostic does not serve;
  `D1_EXTRA_PRACTICE_TEMPLATES` = a second/third shape sharing a `(node,
  difficulty)` cell (round-robined so a slot does not feel like the same problem).
  Touch `D1_TEMPLATES` only with an explicit assessment-snapshot re-pin.
- Reshuffle / no re-serve: the session seeds a `shownIds` set with the opening five
  instances; reveal to retry draws a fresh, still-unseen number-swapped instance
  (`drawFreshInstance` + `buildD1PracticeVariants`). A revealed slot never counts.
- Mastery: the service's 4-of-5 rule (5/5 = gold), reported via `onComplete`
  (`docs/Mastery_Scoring_Spec.md`). Hints do not reduce credit; a reveal forfeits
  the slot.

Infinite bank, **node-scoped** (`apps/web/src/lessons/InfinitePractice.tsx`): draws random items
from THIS node across difficulties from `practiceItemsById`, grades with the same
checker, tracks a decorative streak only (no mastery write), no hints.

**Era-scoped interleaved drill** (`EraInfinitePractice.tsx`, shared shell
`InfiniteDrill.tsx`, scheduler `infiniteScheduler.ts`): serves the nodes the ERA holds
(`getEra(eraId).nodes`, never a `DomainId`) whose practice set the learner has finished
(`mastery >= 1`, via `lessonProgress.ts`) in a shuffled cycle (each unlocked skill once
per cycle), and shows an unlock panel when none qualify. Skill label hidden while
answering. See **`era-infinite-practice`** skill for wiring (completion gate, dev page,
Town Hall, newly authored eras).

### Interactive (widget-graded) practice: the graph precedent + the prerequisite

Today only `answer_type: "graph"` is widget-graded and it is authored SEPARATELY
from the text `AnswerSpec` / `ItemPackEntry`:
- Slices in `packages/item-bank/src/graph/slices.ts` as `GraphAuthoredSlice`s;
  validated by `validateGraphPool`; scored by the geometric comparator
  `createGraphComparator` (checker version 2), NOT the text checker.
- The interactive input is `GraphInput` (`@cr/components`,
  `packages/shared-components/src/graph-input.tsx`). A served item hands the widget
  an ANSWER-FREE workspace via `toGraphWorkspace`, so the client never holds the
  key. The response is a structured numeric `GraphResponsePayload`
  (samples / points / scalars / region memberships, never a bitmap).

To make a NON-graph practice/bank item interactive you must first land the
generalized infra (SKILL.md Phase 5 prerequisite), modeled on the above: a new
`answer_type` + input widget + comparator + item-bank/checker registration. Until
then, non-graph practice/bank items stay typed-input.

## 5. cfuChecker rules

`apps/web/src/lessons/cfuChecker.ts` builds a form-independent checker from every
lesson whose `cfu.check` is set. Rules:
- Provide `check` for VALUE questions (numeric / expression) so equivalent forms
  pass (`simplification: "none"`). Use `representation` / `simplification` to
  demand a specific numeric form (e.g. `reduced_fraction`), and `allowed_symbols`
  for an expression.
- OMIT `check` for FORM-SENSITIVE questions (simplify, expand, lowest terms that
  must be literally that string); the exact `accepted` list then grades it
  (normalized: trim, lowercase, strip spaces). `accepted` is always required.
- The themed rewrap changes only the story: keep `answer_key`, `accepted`, and the
  representation/simplification identical to the plain item.

## 5a. The reveal: `worked_solution` and `variants`

A learner who is stuck on the check gets ONE hint from the advisor, and once that is
spent a wrong attempt puts **Reveal answer** on offer. Taking it prints the answer, the
reasoning, and the worked solution; then it re-asks a DIFFERENT question of the same
concept, and only a second reveal releases the lesson. Both fields are required, and
`validate-lesson-pack.mjs` fails a pack missing either.

**`worked_solution`** is ordered steps, one move per entry, KaTeX in `$...$`, no em
dashes, no meta-commentary. It renders through the same `WorkedSolution` the practice
card uses, so `.cursor/skills/practice-hints/SKILL.md` governs it. The LAST step must
NAME the answer: the validator strips typesetting from it (expanding `\dfrac{a}{b}` to
`a/b`, dropping backslashes, braces and parentheses) and requires one accepted spelling
to survive inside it. A walkthrough that stops one move short leaves the learner to
finish it at the moment they have said they cannot.

**`variants`** names the template the re-ask draws from, and `count` includes the
authored question, so 2 means one further instance. Two halves have to line up:

| Half | Where | What it owes |
|---|---|---|
| The draw | an `ItemTemplate` | Reachable from `TEMPLATES` in `cfuVariants.ts`: a pool template, or a `CFU_ONLY_TEMPLATES` entry written beside it. It must carry `hints` and a `worked_solution`, since the reveal shows both. |
| The spelling | `SPELLERS` in `cfuVariants.ts` | Keyed by `template_id`, built from `cfuAcceptedForms.ts`. It must reproduce the pack's ENTIRE authored `accepted` list from the pack's own authored parameters, which `cfuVariants.test.ts`'s `AUTHORED_PARAMS` asserts, and `accepted[0]` must be printable ASCII because the reveal prints it and asks the learner to type it. |

**Prefer a pool template, but check the CONCEPT rather than the node.** EL.5 looked like
the easiest conversion in the tree, since `d8.el5.condense-sum.l2` condenses logarithms on
the same node. It condenses BARE ones, and says so in its own comment: moving a coefficient
inside first is the check's job. Drawing from it would have re-asked a strictly easier
question, so EL.5 got a generator. Fifteen of the 31 packs needed one for the same kind of
reason, nine of them because the check is a composite answering in two or three parts where
the pool splits those into separate items.

**`worked_solution_params`** is optional, and it upgrades the AUTHORED question's reveal from
step cards to the diagram its re-ask already gets. The two questions reach a figure by
different routes: a computed one carries the parameters it was drawn from, so it lands on
whatever `WORKED_SOLUTION_VISUALS` has registered for its template, while the authored one was
drawn from nothing. This field is the pack supplying those parameters by hand, read through
`worked_solution_template` when the pack sets one and `variants.template_id` otherwise, so it
does nothing without one of the two and nothing when that template owns no registered visual.

Derive them by reading the visual's own destructured parameters against the item template's
`params: { ... }` line, then check the figure states YOUR question. `d1.num-s.l1` is
`SignedNumberLineWorked({a, b, sa, sb})` with `1` meaning negative, so NUM.S's authored $-8 + 6$
is `{ "a": 8, "b": 6, "sa": 1, "sb": 0 }` and the figure ends on $-2$.

**`worked_solution_template`** is the escape hatch for when the re-ask's template would
misstate the authored question. It names a DIFFERENT registered template for the authored
figure only; the re-ask keeps drawing from `variants.template_id`. It requires
`worked_solution_params`, and the validator rejects it when it merely repeats
`variants.template_id`, since that is what the field already falls back to.

**A figure that would restate the question wrongly is worse than no figure.** All 39 packs
carry one today, but that is the outcome of a per-pack judgement, not a fill, and the four
ways a borrowed figure lies are worth knowing before you point a new pack at one:

| The mismatch | What it took to fix |
|---|---|
| The figure's equation shape is not the question's | LIN.1's practice figure weighs an ingot pile against a crate (`count x + loose = crate`) while the check weighs ingots against ingots. Repointed to `d3.lin1.both-sides.l2`, which draws the variable on both sides |
| A step the figure performs would be FALSE for this question | LF.4's adds the two equations as they stand, valid only for the opposite coefficients its template draws. Repointed to `d7.lf4.elimination.l3`, whose `keepX` says which variable is being cancelled |
| The figure hardcodes a variable letter or a form the prompt did not use | LIN.5 printed `x` where the check asks about $w$, so `d3.lin5` gained a `varIndex`; LF.2 opened in standard form where the check hands the line over already solved for $y$, so its figure gained `solved` |
| The caption is denominated in the template's scenario | EL.1's ladder fits exactly, but its caption counted milligrams by the day where the check counts jobs by the hour. The caption was reworded in terms of STEPS, which is true of both |

The first two repoint; the last two are small edits to the shared visual, because the figure
was right and only its hardcoding was wrong. Prefer the repoint: a sibling in the same node
usually already draws the shape you need.

### When no registered template fits: author one

Fifteen of the 39 checks draw from a `CFU_ONLY_TEMPLATES` generator rather than a pool, which
means the registry held no key for them at all and both questions fell through to step cards.
Those get a figure the same way a practice template does — see
`.cursor/skills/worked-solution-svg/SKILL.md` — registered under the `cfu.` id, in a module
under `apps/web/src/lessons/worked/` spread-merged into `WORKED_SOLUTION_VISUALS`.

**A composite check's figure has to close on EVERY part of its answer.** These generators exist
precisely because the check asks two or three things at once, so a diagram that ends on the
first part looks finished while answering a third of the question:
`cfu.rat5.hole-asymptotes` accepts `(2, 7); x = -3; y = 5` and its closing row prints all three.
`cfuFigureCoverage.test.tsx` reads each part back out of the rendered figure over six draws per
template, so this is checked rather than reviewed.

Both guards over these packs are asserted in both directions — a pack that gains a figure and
one that loses one each fail — so adding a figure is a two-file change: the pack, and the
population list in `cfuAuthoredFigure.test.tsx`.

## 6. Era theming index: a POINTER into the era folders, not a copy

**THREE authorities, over different things, and you need all three.**

| What you are looking for | Where it is authoritative |
|---|---|
| Which ERA each NODE is in, the era order, era names | `packages/skill-graph/src/eras.ts` (`ERA_SEQUENCE`, `getEraOfNode`, `getEraNodes`, `eraNumber`). Landed as #180, 2026-07-28, closing the spec's O-1 |
| What an era IS, the building rules, the design's reasoning | `docs/superpowers/specs/2026-07-27-era-progression-design.md` (#177, merged 2026-07-28). §3 for the intent, §6 and §12 for buildings |
| The WORLD you frame a lesson in — materials, structural language, visible technology, props, the island, the advisor, the dressings, the civic catalogue | **`docs/superpowers/specs/eras/era-NN-<name>/`** — `style-guide.md` and `civic-buildings.md`, plus that directory's own `README.md` for what each guide owes |

**On the first two rows: `eras.ts` is the data and the spec is the intent, and where they
differ the DATA is what ships.** The spec's §3 table maps eras to domains one-for-one
and says in the same section that D-ERA3 will break that; `ERA_SEQUENCE` is the curation
that broke it, and it stores no domain at all. So read §3 for WHY an era holds what it
holds, and call `getEraOfNode` for WHAT it holds.

**Three domains span more than one era and three eras hold more than one domain** (the
Early Modern holds four), measured over all 62 nodes at `c668d90` after PR #210's rebalance.
Those counts moved twice on 2026-07-28, #180 authoring the sets and #210 moving three nodes
the same day, so **re-derive them rather than quoting this line**: map `getEraNodes(eraId)`
through `skill_graph.json`'s `domain` field. `SKILL.md`'s "Which era am I authoring?" names
them and says what is still unsettled about theming an era that pulls two registers. The
authoring unit is the ERA, so the question is not whether your domain is one chapter, it is
which directories your chapter lands in, and note that **one of the three split domains is
authored**: Rational Expressions, whose `RAT.5` sits in Early Modern while the rest is
Medieval. **Ownership is no longer keyed to the era or the domain: all content is Anthony's
as of 2026-07-31**, `docs/Content_Authoring_Split.md` **§11**, which retired the split and
with it §9's per-era ownership reading and the two jointly held eras. The split-domain fact
above is unaffected — it is about theming, not ownership, and `RAT.5` still owes a
Early Modern re-theme.

**`Island_Lesson_Themes_Design_Spec.md` is LEGACY and is not in the table above.** The
owner ruled it "completely legacy" on 2026-07-29 and it now carries a banner saying so.
Do not read it for framings, themes, personas or hues. Its per-node framings are built out
of centuries that do not match the eras their domains actually sit in — an Age-of-Sail
signal rocket for a Classical-era domain, a telegraph office for a Neolithic one — so they
are not salvageable by find-and-replace, and its building names are the rebuses D-ERA8
rejects. **The ERA FOLDERS inherit the framing job** (team lead, 2026-07-29). What they
carry today is world, architecture and dressings; per-era readiness against the framing
standard is tracked in `docs/Evan_Design_Decisions_Consolidated.md`, and `SKILL.md`'s
"Where the framing authority is" says what to do where a folder has not caught up.

**Hue is an ERA property now, not a domain property** (**D-ERA27**, Evan, 2026-07-28).
`City_Art_Bible.md` §1.2's per-domain hue families are retired and that section carries a
superseded banner; era one's palette is terracotta and the nine later palettes are each
PROPOSED inside their own style guide's "The era's palette" section. Do not look up a hue
by domain.

**Any of the three authorities wins over this index; if this index disagrees with one,
this index is the bug.** Fix it here in the same change, never the other way round, and
never edit an era document to match this file (they are all Evan's lane).

**No domain-to-era mapping table is reproduced here, deliberately.** Two reasons:
- **The era data model stores no domain**, so a domain-keyed table here would be a second
  opinion about a relationship `ERA_SEQUENCE` chose not to hold. Call `getEraOfNode`.
- **The domain renumber has not happened.** D-ERA4 is signed off and unimplemented; it
  permutes which content five `DomainId`s name, so a number written down today points
  somewhere else afterwards. `eras.ts` is immune to it because node ids do not move. This
  file is not, which is why it holds no numbers.

The table below therefore keeps the columns that survive both events (what the domain
TEACHES, its register, its hue, its status) and holds no era column at all. The same
discipline applies to your prose: name a domain by what it teaches, not by its number.

**Read the actual spec row before writing any prose.** This index carries only enough to
orient. The premise, motifs, per-node framings, building names, and CFU rewrap patterns
are deliberately NOT reproduced. Copying them into this file is exactly what went wrong
once already: this table's second row kept naming a retired theme long after the spec
moved on, that domain was authored against the stale copy, and the whole of it had to be
re-skinned (PR #76).

**The ten-row DOMAIN theming table that used to sit here is gone**, and its removal is the
point rather than a tidy-up. Every row named an island, a per-domain hue and a register
from the legacy themes spec. Under one city in ten eras, a domain has no theme: **the ERA
has a theme, and a domain can sit in three of them.** A domain-keyed table could only have
been a second opinion about a relationship the data deliberately does not store
(`ERA_SEQUENCE` carries no domain field, INV-ERA-5). The reason not to rebuild it era-keyed
here is the same one that killed the last copy: this table's second row kept naming a
retired theme long after the spec moved on, that domain was authored against the stale
copy, and all of it had to be re-skinned (PR #76). **Read the era folder. Do not read a
summary of the era folder.**

**Your lookup is two calls and one directory:**

1. `getEraOfNode(nodeId)` or `getEraNodes(eraId)` — `packages/skill-graph/src/eras.ts`.
2. Open `docs/superpowers/specs/eras/era-NN-<name>/style-guide.md` for each era your nodes
   sit in, and its `civic-buildings.md` beside it. Its §1 "the era in one line" is the
   orientation; its **Lesson framings** are the per-node source; its **subtitle row**
   (D-ERA29, ratified in PR #278) records the proper-noun dressings Evan wires into
   `eraDressing.ts`. The consolidated rename and defence-form table lives in
   `docs/superpowers/specs/eras/README.md`. Re-theme scenario prose from framings and world
   vocabulary, not from stable building handles or subtitle proper nouns pasted into prompts.
   §2 Materials and its **"Explicitly absent"** paragraph are the hard boundary on what may
   appear in a word problem; §3, §4 and the props kit are the vocabulary; the island section
   is the setting; the palette section is the hue.
3. **A split domain takes its ERA's theming, node by node** (team lead, 2026-07-29: *"if
   it's in medeival, it gets medieval themeing."*). Never carry a motif across an era seam.

**What is NOT in those folders yet, so you do not go looking:** per-node lesson framings
(the folders inherit that job and have not been passed over yet), an advisor for any era
but the first, and a ratified subtitle row for any era but the first. Per-era readiness
against each of those is tracked in `docs/Evan_Design_Decisions_Consolidated.md`, and
`SKILL.md`'s "Where the framing authority is" tells you what to do in the meantime. If your
era needs something that is not there, **ask Evan; do not invent it and do not infer it
from a legacy island document.**

## 7. Validator rule tiers: what is mechanical and what is not

`scripts/validate-lesson-pack.mjs` is the mechanical half of the bar. Know exactly
what it can and cannot see, so a green run is not mistaken for a good lesson.

```
node .cursor/skills/author/scripts/validate-lesson-pack.mjs --strict content/lessons/<domain>
```

Run the DIRECTORY: the variety rules are domain-level and a single-file run skips
them. New content ships with zero errors AND zero warnings, and **run it once per directory
your ERA touches** (Phase 0's map), since nothing here reads an era. The variety figures a
run reports are the directory's, pooled across eras, so they are not your era's R11 tally.

**Error tier (always fails).** Each was measured to fire zero times across the six
shipped D1 packs before being added, with one deliberate exception: rule 13's population
floor is EXPECTED to fail on a tree where no pack has migrated, which is the whole of what
it is for. It goes quiet the moment the first pack declares `worked_examples`.

| Rule | Fails when | Rule ref |
|---|---|---|
| every-slide-interactive | a `mini_lesson` index has no `gates: true` visual with `after === i` | locked defaults |
| interactive id | a visual id has no interactive suffix (a static/legacy diagram) | locked defaults |
| no em-dash | U+2014 in title, prose, a `worked_examples` prompt or step, CFU prompt/hint/accepted, subtitle | locked defaults |
| cfu shape | missing `cfu`, `prompt`, non-empty `accepted`, or `hint` | Phase 4 |
| cfu variants | missing `cfu.variants`, no `template_id`, or a `count` below 2 | 12a |
| cfu worked solution | missing or empty `cfu.worked_solution`, or a last step naming no accepted spelling | 12c |
| cfu figure params | `cfu.worked_solution_params` with neither a `variants` block nor a `worked_solution_template`, empty, or holding a non-number. SHAPE only: whether the figure matches the question is `cfuAuthoredFigure.test.tsx` | 12d |
| cfu figure template | `cfu.worked_solution_template` that is not a non-empty string, carries no `worked_solution_params`, or merely repeats `variants.template_id` | 12e |
| text density | a paragraph runs past 7 sentences | R1 |
| worked_examples shape | the field is not an array, an entry is not a `{ prompt, steps }` object, or an entry sits at an index past the last `mini_lesson` slide (misalignment). A BARE step array is called out as the old shape by name, since it renders as no example at all. A `null` entry and a short array are the two legal ways to skip a slide | 13 / R34 |
| worked_examples prompt | an authored entry has no `prompt`, an empty one, or one running past 2 sentences | 13 / R34 |
| worked_examples steps | an entry runs fewer than 2 or more than 6 steps | 13 / R34 |
| migrated text density | a pack that DECLARES `worked_examples` has a `mini_lesson` paragraph past 4 sentences | 13 / R34 |
| meta-commentary | a ban-listed phrase narrates the lesson, in a `worked_examples` prompt or step, in prose, CFU text or a subtitle | R4 |
| duplicate instruction | a registry caption and its slide's task sentence share >= 70% of their content words | R8 |
| widget-id reuse | the same visual id twice in one lesson | variety bar |
| domain variety | fewer than 5 distinct interaction kinds, or one kind at >= 60% of the domain's widgets | R11 |
| subtitle length | a subtitle that EXISTS runs past 4 words, counted as a reader counts a heading | R14 |
| node id in prose | a LITERAL `skill_graph.json` node id appears in any learner-visible string, a `worked_examples` prompt and steps included | R18 |
| worked_examples population floor | no pack anywhere under `content/lessons` declares `worked_examples`, fewer than 6 slides across the tree carry a non-empty one, or fewer than 6 of those name their instance in a prompt. Not a rule about the pack in front of it: rule 13 is gated on a pack declaring the field, so without this a domain that has not migrated reports rule 13 green having examined nothing. The third count is the same argument one field deeper, since `prompt` arrived after `steps` and a tree could carry every step with no prompt anywhere | 13 / R34 |

**Warning tier (printed; fails only under `--strict`).** At `c668d90` the whole tier fires
**ZERO** times on all four shipped domains, so `--strict` exits 0 on every one of them and
there is no inherited noise anywhere: every one of the six rules is now a tripwire for new
content rather than a cleanup of old. Each stays a warning because each has a real
false-positive mode and so shortlists rather than decides. **These are counts at a tip, not
properties of the rules**, so re-measure rather than quoting this line, and note that this
paragraph has been wrong twice already for exactly that reason. It first said the tier's
first two rules fired on shipped content and the rest measured zero (both halves wrong); it
then recorded 65 warnings, 63 subtitle-presence plus 2 comma-fenced asides, which was true
until #201 cleared all 65 on 2026-07-28.

**What the tier existing still buys, now that it is empty.** The reason it is a warning tier
and not an error tier has not changed: R14's presence rule would have failed sixteen shipped
packs the day it landed, and the fix for that is a warning, not a weaker rule. The zero is a
property of the content today, not a reason to promote anything.

| Rule | Fails when | Rule ref |
|---|---|---|
| task statement in prose | a "Your turn: ..." sentence, or prose describing how to tap/drag/click the widget | R9 |
| lesson archetype floor | one lesson uses fewer than 3 distinct interaction kinds | variety bar |
| subtitle presence | a `mini_lesson` index has no `slide_subtitles` entry | R14 |
| comma-fenced aside | a determiner-led, verbless noun phrase of <= 8 words sits between two commas | R19 |
| letter vs variable | the word "letter" or "letters" appears in a learner-visible string | R20 |
| bare demonstrative opener | a `mini_lesson` entry's FIRST WORD is a bare `That`/`This`/`These`/`Those`/`It`/`They`/`Such`, so its referent is on the previous slide and nowhere in the entry | R15 |
| migrated lecture at four | a pack that DECLARES `worked_examples` has a `mini_lesson` paragraph at exactly 4 sentences. The ruling is 2-3 and the fourth is allowed where genuinely unavoidable, which a sentence count cannot judge, so it shortlists | 13 / R34 |

**Not checked at all, by design.** R2 scenario placement, R3 motivating openings,
R5 intuition before the rule, R6 term definitions, R7 register, R10 reset
re-parameterization, R12 reveal coverage, R13's two innocent hint leaks, R15's cold
openings APART from the demonstrative shape above, R16 leading hinges, R21 label terms,
R22 sibling label coherence, R23 coinages, R32 unearned real terms, R33 copy after a miss.
Every candidate rule for R2/R3/R5/R6/R7 was prototyped and rejected for false
positives on praised content or zero recall on rejected content (SKILL.md records the
measurements). R10 and R12 live inside widget TSX, which this script does not parse. R13,
R16, R21 to R23 and R32 to R33 are judgements, and their review procedures live in
`lesson-qa`'s reading pass. They are Phase 7 review-checklist items. **R15's article tell
stays a reviewer's tool** and is not gated: it fires on plenty of good openings, and it is
also the filter the demonstrative instance slipped through, since a bare demonstrative
carries no article to key on. **R33's obvious mechanical form was measured and rejected on
the same standard as R2's proxy**: a ban on telling the learner what they should have done
fires on the hint wording R13 endorses.

**Stronger than a validator rule, so absent from both tables:** R17's and R24's
`objective` is a REQUIRED PROP, so a widget that omits it does not compile, and R24 to
R31 are pinned by Chromium guards over source-derived populations:
`widgetTaskOrder.browser.test.tsx`, `binaryRowMarks.browser.test.tsx`,
`spotTheErrorPalette.browser.test.tsx`, `widgetActiveSlot.browser.test.tsx`,
`widgetRevealFill.browser.test.tsx`, `widgetRevealResume.browser.test.tsx`,
`widgetMissedBoardGate.browser.test.tsx`, `labelFigureWhole.browser.test.tsx`, plus
`answerFormat.test.ts`, `answerKeypad.test.ts`, `answerPlaceholderFit.browser.test.tsx` and
`mathAnswerColumn.browser.test.tsx` for R30. Prefer
attaching a rule to a shared component over attaching it to content. **Three of those
assert something no text rule could reach at all**: computed `::after` content (R27's badge
was generated content), rendered PAINT (R31's `\phantom` leaves the digits in the DOM, the
text content and the MathML), and a graded comparison rather than a string match (R30's leak
check, since a bare `4` scores correct against a key of `{4}`).

Three lookups fail OPEN, and each prints a `note:` line saying the rule was skipped rather
than passing silently. The caption rule (R8) reads `apps/web/src/lessons/visuals.tsx` as
text, the node-id rule (R18) reads `packages/skill-graph/src/skill_graph.json`, and rule 13's
population floor reads `content/lessons`, each walking up from the pack directory to find
it. No registry, an unparsed entry, or a
caption-less widget skips the rule rather than inventing a finding. **R18's rule IS the
literal id set**, which is what lets it sit at the error tier with no false-positive
mode, and is also what makes an unfound registry a total skip rather than a partial one.

Note what the floor's lookup means for the OTHER direction: it reads the whole content tree
and not the domain under validation, so D1 having migrated satisfies it on the D9 run too.
That is deliberate. The claim it defends is "rule 13 has real content to measure somewhere",
not "every domain has migrated", and a per-domain floor would fail the eight domains that
legitimately have not.

## 8. Key-file index

| Concern | File |
|---|---|
| Lesson JSON schema | `apps/web/src/lessons/types.ts` |
| Visual registry + id union | `apps/web/src/lessons/visuals.tsx` |
| D1 loader (mirror this) | `apps/web/src/lessons/d1.ts` |
| All-domains registry + practice dispatch | `apps/web/src/lessons/domains.ts` |
| Gate logic (Next withheld) | `apps/web/src/lessons/AdvisorLesson.tsx` |
| CFU checker | `apps/web/src/lessons/cfuChecker.ts` |
| Practice UI + mechanics | `apps/web/src/lessons/LessonPractice.tsx` |
| Node infinite bank UI | `apps/web/src/lessons/InfinitePractice.tsx` |
| Era interleaved infinite drill | `apps/web/src/lessons/EraInfinitePractice.tsx`, `interleavedPool.ts`, `InfiniteDrill.tsx`, `infiniteScheduler.ts`, `lessonProgress.ts` |
| Practice checker registration | `apps/web/src/lessons/practiceChecker.ts`, `practiceSession.ts` |
| Cross-skill NPC notes | `apps/web/src/lessons/practiceNotes.ts` |
| Worked-solution SVGs | `apps/web/src/lessons/workedSolutionVisuals.tsx` |
| Interactive widgets | `apps/web/src/lessons/interactive/*.tsx` |
| Shared widget mechanics (success, sound, reveal) | `apps/web/src/lessons/widgetFeedback.tsx` |
| Shared task slot, above the controls (R24) | `apps/web/src/lessons/widgetTask.tsx` |
| Shared per-part verdict mark (R28) | `apps/web/src/lessons/widgetPartVerdict.tsx` |
| Learner-facing answer formats: the one notation dispatch behind every placeholder AND every notation row (R30) | `apps/web/src/lessons/answerFormat.ts` |
| Kind-family population derived from source, for a sweep | `apps/web/src/lessons/kindFamily.ts` |
| SVG primitives / tokens | `apps/web/src/lessons/svgKit.tsx` |
| Item-bank per-node | `packages/item-bank/src/<domain>/nodes/<NODE>/index.ts` |
| Practice pool | `packages/item-bank/src/<domain>/practice.ts` |
| Item authoring guide | `packages/item-bank/AUTHORING.md` |
| Graph precedent (interactive) | `packages/item-bank/src/graph/`, `packages/shared-components/src/graph-input.tsx`, `graph-comparator.ts` |
| Node identity / prereqs | `packages/skill-graph/src/skill_graph.json` |
| Mastery rule | `docs/Mastery_Scoring_Spec.md` |
| Era membership per node, the sequence, era names | `packages/skill-graph/src/eras.ts` (`ERA_SEQUENCE`, `getEraOfNode`) |
| Era progression: what an era is, the building rules (§6 above is only an index) | `docs/superpowers/specs/2026-07-27-era-progression-design.md` |
| Lesson theming: per-node framings and hues (superseded as a MODEL, not replaced as a source) | `docs/superpowers/specs/Island_Lesson_Themes_Design_Spec.md` |
| Shipped building names (D1 only, and D-ERA9 puts them on notice) | `apps/web/src/city/buildingAssets.ts` (`D1_NODE_BUILDINGS`) |
| Answer categories | `docs/Answer_Equivalence_Spec.md` |
