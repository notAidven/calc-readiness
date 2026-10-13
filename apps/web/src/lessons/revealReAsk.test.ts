/**
 * Every widget that offers a reveal has to lend the shared machine its own redraw.
 *
 * `widgetRevealReAsk.browser.test.tsx` drives the behaviour, but it drives a written-down
 * list of visual ids, and a list is exactly the thing a new widget gets left off. This
 * reads the sources instead, so the guard grows on its own: render `WidgetReveal` without
 * calling `useRevealReAsk`, and the reveal quietly goes back to being a free pass through
 * the slide with nothing on screen to say so.
 *
 * It also pins WHICH pair is lent. `reAsk` and `release` swapped would open the gate on the
 * first reveal and redraw on the second, which is the old behaviour wearing the new
 * mechanic's clothes, and no type would catch it: both are `() => void`.
 */

import { describe, expect, it } from "vitest";

const WIDGET_SOURCES = import.meta.glob(
  // `cfu.tsx` is here because the failure mode is the file's, not the widget's: the
  // end-of-lesson check offers the same reveal, and rendering it without lending the machine a
  // redraw would put the first reveal straight through the lesson's gate with nothing on screen
  // to say so. It is not under `interactive/` because it is not a board, which is exactly how a
  // path-shaped sweep loses a surface.
  ["./interactive/*.tsx", "./interactive/kinds/*.tsx", "./cfu.tsx"],
  {
    query: "?raw",
    import: "default",
    eager: true,
  },
) as Record<string, string>;

/** The one line a widget body adds to join in. Whitespace-insensitive, order-sensitive. */
const BINDING = /useRevealReAsk\(\{\s*reAsk:\s*onRestart,\s*release:\s*onSolved,?\s*\}\)/;

const OFFERS_REVEAL = Object.entries(WIDGET_SOURCES)
  .filter(([path]) => !path.includes(".test."))
  .filter(([, source]) => source.includes("<WidgetReveal"));

describe("the teach-then-re-ask reveal is wired the same way everywhere", () => {
  it("the sweep found the widgets that offer a reveal", () => {
    // Nineteen in D2's own widgets and four retrofitted D1 ones, plus the seven shared
    // interaction kinds behind the rest, plus the end-of-lesson check, which is not a widget
    // and lends the same pair anyway, plus three of D8's EL.1 widgets and two of its EL.3
    // ones (the other three D8 pilot widgets reach the reveal through a shared kind), plus
    // nine more across EL.2, EL.4 and EL.5 (EL.2's feature label and EL.5's table and
    // expand steps reach the reveal through a shared kind too), plus eleven of D3's
    // twenty-one (the other ten are built on a shared kind and reach the reveal through it),
    // plus twelve of D4's twenty-five (the other thirteen reach it through a kind), plus two of
    // EL.6's four (the gather-then-convert match and the extraneous-root spot are wrappers over
    // `MatchPairs` and `SpotTheError`, so their reveals are the kinds'), plus seven of D10's
    // eight (`GeoCordTable` is built on a shared kind and reaches the reveal through it),
    // plus thirty-five of D6's forty-four (the other nine are wrappers over `FillTable`,
    // `SpotTheError`, `OrderSteps`, `BinaryRowSort` and `LabelParts`, so their reveals are
    // the kinds'), plus five of D9's thirty-six: the explorers and sliders that hold a live
    // figure (`TrigUnitCircleExplore`, `TrigSweepPlay`, `TrigTangentExplore`,
    // `TrigAmplitudeSlider`, `TrigPhaseDrag`). The other thirty-one are tables, sorters and
    // matches built on shared kinds, so their reveals are the kinds' and they are reached
    // through them, plus six of D7's sixteen: the two typed walkthroughs
    // (`LinearSlopeWalkthrough`, `LinearModelTableBuild`), the slider build and the lattice
    // play whose plot draws the LEARNER's line rather than the target's
    // (`LinearLineFormBuild`, `LinearSlopeTrianglePlay`), and the two system boards whose
    // gate is an unbounded search or a typed solve (`LinearSystemGraphExplore`,
    // `LinearSystemSubstitutePlay`). D7's other ten are either wrappers over a shared kind,
    // auto-play walkthroughs with no typed answer, or bounded chip sets whose every miss
    // names the misreading it represents, which converge by construction.
    //
    // COUNTED on the merged tree rather than added up: D6 landed on 112 and D9 on 82 over a
    // shared base of 77, and each of those is a true statement about a tree that no longer
    // exists. After D7's six (#623) raised the floor to 123, D1's authoring pass gave a
    // reveal to the five widgets its QA round found trapping a learner behind a free-text
    // field with no option list: `PercentSlider`, `ProportionCrossPlay`,
    // `DistributeBuilder`, `CommonDenominatorMultiples` and `LikeTermsSorter`. Counted at
    // the tip with both lands present: 128, not 123 + 5 written down.
    expect(OFFERS_REVEAL.length).toBe(128);
  });

  it.each(OFFERS_REVEAL.map(([path]) => path))(
    "%s lends its redraw and its gate",
    (path) => {
      const source = WIDGET_SOURCES[path] ?? "";
      expect(source).toMatch(BINDING);
    },
  );

  it.each(OFFERS_REVEAL.map(([path]) => path))(
    "%s reads its answer and reasoning from the step in hand",
    (path) => {
      // The host reads `answer` and `why` at the moment of the click, which is before
      // anything has moved. A widget that derived them from its own "revealed" state
      // handed up a pair of nulls and printed a passage that taught nothing.
      const source = WIDGET_SOURCES[path] ?? "";
      const taught = [
        ...propExpressions(source, "answer"),
        ...propExpressions(source, "why"),
      ];
      for (const expression of taught) {
        expect(expression).not.toMatch(/\brevealed[A-Za-z]*\b/);
      }
    },
  );
});

/**
 * The other half of the wiring: which reveals may hand a part-answered instance BACK.
 *
 * A reveal that explains one of several answers must not spend the whole instance, and the
 * widget is the only thing that knows what is left of its board, so it says so with
 * `othersRemain`. Two things can go wrong with that and neither has a type to catch it.
 *
 * The first is forgetting it, which puts a widget back to ending a multi-answer round on one
 * reveal. The population for that claim used to be the seven kinds under `kinds/`, on the
 * reasoning that a kind holds several answers at once — true, and true of nearly every
 * BESPOKE widget as well, so the guard checked the layer where the mechanic was shared and
 * left every widget that owns its own copy of it unchecked. `RationalizeExplore` sat there
 * spending a board of three pairs on a reveal of one of them while this file was green, and
 * while the same defect class was fixed twice over in the kinds (`#184`, `#214`). So the
 * population is now every source that renders a reveal, derived the same way `OFFERS_REVEAL`
 * is, with the exceptions DECLARED below rather than left to omission.
 *
 * The second is passing a CONSTANT, which is worse than forgetting it, because it reads as
 * done. `othersRemain` is false on the reveal that explains the LAST outstanding answer, and
 * that is exactly the case where handing the board back hands over the gate: the learner
 * would be told the answer, given the board, and typing it in would open the gate on a
 * question they never worked. So a literal `true`, or the bare-prop shorthand for it, is
 * refused for every widget.
 */

/**
 * The shared interaction kinds, kept as a population pin now that the sweep runs wider.
 *
 * It no longer selects who owes the flag. What it still says is how many archetypes there
 * are, which is a number two other files reason about, so a kind added or a kind that stopped
 * offering a reveal is something this notices rather than absorbs.
 */
const KIND_SOURCES = OFFERS_REVEAL.filter(([path]) => path.includes("/kinds/"));

/** `othersRemain` handed a literal `true`, or written bare, which JSX reads as `true`. */
const CONSTANT_REMAIN = /othersRemain\s*=\s*\{\s*true\s*\}|othersRemain(?=\s*[/>\n])/;

/**
 * The reveal surfaces that legitimately never hand an instance back, because there is never
 * anything else outstanding to hand it back FOR.
 *
 * Declared rather than omitted, which is the whole point of widening the population: a widget
 * that does not owe the flag and a widget that forgot it look identical from the outside, and
 * the second one is how `RationalizeExplore` shipped. Every entry is a one-answer surface, so
 * `othersRemain` on it could only ever be false, and a hand-back offered on the strength of
 * it would be handing over the gate.
 */
const NEVER_HANDS_BACK: ReadonlySet<string> = new Set([
  // The end-of-lesson check: one authored question, one field. Its reveal is also withdrawn by
  // a correct answer (`available={attempts > 0 && !settled}`), so it cannot be beside an open
  // gate either, which is what keeps the earned-gate path out of this file's reach.
  "./cfu.tsx",
  // D1's number-line walkthrough. Stepping the marker along is transport, not answering; the
  // sum in the box is the only answer the instance holds, and it IS the gate.
  "./interactive/SignedAdditionWalkthrough.tsx",
  // NUM.5 s2: the slider is a control rather than an answer — the round is judged by a single
  // `pct === TARGET_PCT && entered === TARGET_VALUE`, so the position and the typed amount are
  // two readings of ONE answer. Once the reveal has stated it there is nothing else on the
  // board to hand it back for. The other four reveals D1 gained on the same pass hold two or
  // three independent answers apiece and all carry the flag.
  "./interactive/PercentSlider.tsx",
  // D8's one-answer reveals. Each of the nine below is a board whose reveal only ever explains
  // the single outstanding answer, so nothing is left to hand back for once it is shown.
  // EL.6 s1: laying the four lines out produces nothing, and the one answer the board holds is
  // the value the division comes to, which IS the gate. Its sibling on the same lesson, the
  // same-base stepper, is TWO answers and so passes the flag rather than appearing here.
  "./interactive/EquationTakeLogWalkthrough.tsx",
  // EL.1 s3: pressing Play produces nothing; the gate is the exponent rt alone.
  "./interactive/ExpContinuousWalkthrough.tsx",
  // EL.1 s1: the dial's factor and the box's predicted reading are one answer judged together,
  // with nothing else on the board once the pair is in.
  "./interactive/ExpFactorSlider.tsx",
  // EL.2 s0: a wrong call spends the instance; a right call leaves only the gap, which the
  // reveal explains, so the reveal always lands on the last outstanding answer.
  "./interactive/ExpGraphPlay.tsx",
  // EL.5 s3: one value, the quotient the change-of-base division comes to.
  "./interactive/LogBaseChangeWalkthrough.tsx",
  // EL.4 s3: direction and boundary are two parts of one answer judged together; the reveal
  // states both at once and the instance is done.
  "./interactive/LogDomainBuilder.tsx",
  // EL.4 s0: free exploration, then one produced value (the reflected point's coordinate).
  "./interactive/LogMirrorExplore.tsx",
  // EL.3 s0: free exploration, then one produced value (the missing multiple's factor count).
  "./interactive/LogQuestionExplore.tsx",
  // EL.4 s2: boundary and smallest integer are two answers behind one gate, judged together;
  // the reveal states both at once.
  "./interactive/LogShiftSlider.tsx",
  // D3's three one-answer boards. Each holds exactly one independently-determined answer, so
  // `othersRemain` on it could only ever be false, and a hand-back offered on the strength of it
  // would be handing over the gate. The other eight D3 widgets that render a reveal do owe the
  // flag and pass it.
  // LIN.1 s0: the dial's value is the whole of the board, and reaching it IS the gate.
  "./interactive/BalanceBeamSlider.tsx",
  // LIN.4 s0: the marker's position and its bracket are two parts of ONE range, judged together
  // and stated together by the reveal, so nothing is left outstanding once it is shown.
  "./interactive/InequalityEndpointDrag.tsx",
  // LIN.4 s1: one direction to call, and the value test that settles it is the widget's own
  // demonstration rather than a second answer.
  "./interactive/NegativeFlipPlay.tsx",
  // D4's two one-answer boards. Each holds exactly one independently-determined answer, so
  // `othersRemain` on it could only ever be false, and a hand-back offered on the strength of
  // it would be handing over the gate. The other ten D4 widgets that render a reveal do owe the
  // flag and pass it.
  // POL.2 s1: one pick from four common factors, and the pick IS the gate.
  "./interactive/CommonMeasureClassify.tsx",
  // POL.2 s2: one committed position on the pair control, and committing it is the gate.
  "./interactive/FactorPairStepper.tsx",
  // D10's two one-answer boards. The other five that render a reveal hold several answers at
  // once and do carry the flag, so these two are a decision about these two rather than a
  // domain-wide excuse.
  // GEO.1 s1: the stepper lays out the working, but the working is transport. One field holds
  // the missing side, and that field IS the gate, so a reveal of it leaves nothing outstanding.
  "./interactive/GeoDiagonalStepper.tsx",
  // GEO.1 s3: the dial sets the shadow and is a control rather than an answer. The scale factor
  // and the height the reveal states are two readings of ONE entry, judged together, so the
  // instance is spent once it is shown.
  "./interactive/GeoShadowSlider.tsx",
  // D6's one one-answer board. The other thirty-four D6 widgets that render a reveal hold
  // several answers at once and do carry the flag, so this is a decision about this one board
  // rather than a domain-wide excuse.
  // FUN.10 s1: the corner the dial stands at and the height typed in the box are judged by a
  // single `dial === shift && Number(typed) === height`, so they are two parts of ONE answer
  // rather than two answers. The reveal sets both and closes the round, which leaves nothing
  // outstanding to hand the board back for.
  "./interactive/AbsValueVertexSlider.tsx",
]);

/**
 * And the ones that DO owe it and have not got it, in a lane this repo does not author.
 *
 * Three D1 widgets, each a genuine multi-answer board whose reveal still spends the whole
 * instance: the defect `widgetRevealResume.browser.test.tsx` was written against, unfixed.
 * They are recorded here with the same force as the list above — an explicit exception, so
 * that nothing is exempt merely by being forgotten — and reported with file and line in the
 * work-log entry for this change. The assertions below keep the list honest in both
 * directions: an entry that stops offering a reveal fails, and so does one that adopts the
 * flag without being taken off.
 *
 * D1's authoring pass of 2026-08-04 did NOT close them. It gave five other D1 widgets a reveal
 * and four of those five carry the flag, so the lane is no longer unauthored and these three
 * are a deliberate omission rather than an inherited one: each needs its own read of what its
 * board still holds open, and none of them was in the classification that pass was working
 * from. They stay here, with the same force, as findings for the next one.
 */
const HAND_BACK_OWED_IN_D1: ReadonlySet<string> = new Set([
  // Two answers per instance: which fraction turns over, then the product in lowest terms.
  "./interactive/FractionDividePlay.tsx",
  // One reveal per row, several rows per board.
  "./interactive/LikeTermsClassify.tsx",
  // Several blanks per table; the reveal explains the cell that was missed.
  "./interactive/SignRulesTable.tsx",
]);

/** Every reveal source that owes the flag: the derived population minus the declared two lists. */
const OWES_HAND_BACK = OFFERS_REVEAL.filter(
  ([path]) => !NEVER_HANDS_BACK.has(path) && !HAND_BACK_OWED_IN_D1.has(path),
);

/**
 * The floor. Twenty-six sources owe the flag today — the seven kinds and nineteen bespoke D2
 * widgets — and this is not a count to maintain but a statement that the sweep below is
 * sweeping something. A widget added needs no edit here; a glob that stops resolving, or an
 * exception list that grows until it has swallowed the population, fails rather than passing
 * vacuously over a short one.
 */
const HAND_BACK_FLOOR = 26;

const DECLARED_EXCEPTIONS = [...NEVER_HANDS_BACK, ...HAND_BACK_OWED_IN_D1];

describe("a reveal that explains one answer of several says so", () => {
  it("the sweep found the shared interaction kinds", () => {
    // Six of the seven kinds offer one reveal and `SpotTheError` offers two, one per stage.
    expect(KIND_SOURCES.length).toBe(7);
  });

  it("the sweep runs over the widgets that render a reveal, not the ones built on a kind", () => {
    expect(
      OWES_HAND_BACK.length,
      "the derived population is shorter than the widgets known to owe the flag",
    ).toBeGreaterThanOrEqual(HAND_BACK_FLOOR);
    // And it is genuinely wider than the layer it used to stop at, which is the whole change:
    // a floor alone would still be satisfied by the seven kinds plus nineteen of anything.
    expect(
      OWES_HAND_BACK.filter(([path]) => !path.includes("/kinds/")).length,
      "no bespoke widget is in the population, so this is the old kinds-only sweep again",
    ).toBeGreaterThanOrEqual(HAND_BACK_FLOOR - KIND_SOURCES.length);
  });

  it.each(OWES_HAND_BACK.map(([path]) => path))(
    "%s tells the shared layer what is left of its board",
    (path) => {
      const source = WIDGET_SOURCES[path] ?? "";
      expect(source).toMatch(/othersRemain=\{/);
    },
  );

  it.each(DECLARED_EXCEPTIONS)(
    "%s is a declared exception that still exists and still offers a reveal",
    (path) => {
      // A renamed or deleted file would otherwise sit in the list forever, exempting nothing
      // and hiding the fact that it exempts nothing.
      expect(OFFERS_REVEAL.map(([known]) => known)).toContain(path);
    },
  );

  it.each(DECLARED_EXCEPTIONS)("%s has not quietly adopted the flag", (path) => {
    // The other direction: a widget that starts handing its instance back has to leave the
    // list, or the list stops describing the tree and starts excusing it.
    expect(WIDGET_SOURCES[path] ?? "").not.toMatch(/othersRemain=\{/);
  });

  it("nothing is claimed as both legitimately exempt and owed elsewhere", () => {
    const both = [...NEVER_HANDS_BACK].filter((path) => HAND_BACK_OWED_IN_D1.has(path));
    expect(both).toEqual([]);
    expect(DECLARED_EXCEPTIONS.length).toBe(
      NEVER_HANDS_BACK.size + HAND_BACK_OWED_IN_D1.size,
    );
  });

  it.each(OFFERS_REVEAL.map(([path]) => path))(
    "%s reads what is left off the board rather than hard-coding it",
    (path) => {
      const source = WIDGET_SOURCES[path] ?? "";
      expect(source).not.toMatch(CONSTANT_REMAIN);
    },
  );
});

/** The bodies of every `name={...}` prop in `source`, matched by brace depth. */
function propExpressions(source: string, name: string): string[] {
  const found: string[] = [];
  const opener = new RegExp(`\\b${name}=\\{`, "g");
  for (const match of source.matchAll(opener)) {
    const from = (match.index ?? 0) + match[0].length;
    let depth = 1;
    let at = from;
    while (at < source.length && depth > 0) {
      if (source[at] === "{") {
        depth += 1;
      } else if (source[at] === "}") {
        depth -= 1;
      }
      at += 1;
    }
    found.push(source.slice(from, at - 1));
  }
  return found;
}
