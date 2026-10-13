/**
 * A `MatchPairs` board only moves in one direction, so its prompt may only name one.
 *
 * `kinds/MatchPairs.tsx` makes the LEFT column the draggable one (`draggable={!done}`,
 * `onDragStart={() => pickup.hold(pair.id)}`) and the RIGHT column the drop target
 * (`onDrop={() => joinTo(pair)}`). The right column is not draggable and the left column is
 * not a target, and `joinTo` opens with `if (leftId === null ... ) return;` — so a learner who
 * follows a backward instruction taps a dead item and gets NEITHER a join NOR a refusal. There
 * is no wrong-answer message, because from the board's point of view nothing happened. The
 * board reads as broken rather than as unforgiving, which is the worst of the two.
 *
 * `InterceptRouteMatch` shipped exactly that: *"Drag a value onto the feature it belongs to, or
 * tap the value and then the feature."* over a board holding features on the left and values on
 * the right. Both halves of that sentence were backward, so both routes into the board were
 * dead, and nothing in the type system or in any existing sweep had an opinion about it.
 *
 * ## Why the rule here is "anchor the side" and not "get the nouns the right way round"
 *
 * The defect is that the prompt's first noun does not name the left column. Checking THAT
 * mechanically would mean deciding which column a noun phrase denotes, which is semantic and is
 * not writable. So the rule inverts it: name the side, in the sentence, and the question of
 * which noun goes first stops arising. A prompt that says *"on the left"* is right or wrong
 * about a fact the learner can see on screen, and it cannot be silently backward.
 *
 * Adopters that do not carry the anchored form are DECLARED below rather than skipped, in two
 * lists because they are two different claims, and both lists fail in both directions. See
 * `revealReAsk.test.ts` for the shape and `.cursor/rules/qa-verification.mdc` for why it is
 * that shape.
 *
 * ## The objective is read too, and on two boards it is the ONLY directional sentence
 *
 * This file used to sweep the `prompt` prop alone, on the ground that `objective` is usually JSX
 * and so is not a string a regex can lift. That was a statement about how hard the prop is to
 * read, not about whether a learner reads it — and it left the rule blind exactly where it was
 * most needed. `TrigDoubleMatch` and `TrigCycleMatch` are the two cases: both prompts are
 * declared below as naming no gesture, so *"join each expression to the single function it is
 * equal to"* was the only sentence on either board telling the learner what to move onto what,
 * and no assertion looked at it. Both are the right way round; neither was guarded, and the
 * distance between those two states is the whole point of the file.
 *
 * So the objective is lifted with a balanced-brace read and stripped down to its prose, and it
 * owes exactly what a prompt owes: anchor the side, or be declared with a hand-read whose noun
 * order the assertions re-derive from the sentence. The anchored form is NOT the common case
 * here — two of the seven directional objectives use it — so no claim is made that it is; what is
 * claimed is that every directional objective is one or the other, and that a real number of them
 * were read at all.
 */

import { describe, expect, it } from "vitest";

const WIDGET_SOURCES = import.meta.glob("./interactive/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/**
 * The population: every board that gets its drag direction from the shared kind.
 *
 * Scoped to the importers deliberately, and the reason is about the BEHAVIOUR rather than about
 * where the code lives. What makes this defect possible is a surface whose two halves are not
 * interchangeable — one side picks up, the other receives — combined with a sentence that names
 * an actor and a target. The kind is what fixes that asymmetry to left-picks-up for all sixteen
 * of these at once, which is what makes a single written rule ("say which side") meaningful
 * across the whole set. Other boards under `interactive/` also drag (`ExpShiftDrag`,
 * `CompleteSquareDrag`, `DifferenceSquaresDrag`, `GeoNetDrag`, the sorters, and the `LabelParts`
 * and `FillTable` kinds), and they exhibit the same CLASS of defect, but each fixes its own
 * geometry — tiles into slots, chips into bins — so "name the side" is not the rule that saves
 * them and they are not in this population. That is a boundary drawn on purpose, and it is a
 * gap: a sweep for those owes its own reading of what each of them can and cannot receive.
 */
const ADOPTS_MATCH_PAIRS = Object.entries(WIDGET_SOURCES)
  .filter(([path]) => !path.includes(".test."))
  .filter(([, source]) => /from "\.\/kinds\/MatchPairs"/.test(source));

/**
 * The floor. Sixteen adopters at the time of writing; this is not a count to maintain but a
 * statement that the sweep below is sweeping something. A glob that stops resolving, or an
 * import path that changes, fails here rather than passing vacuously over nothing.
 */
const ADOPTER_FLOOR = 14;

/**
 * The floor under the adopters that carry the anchored form UNDECLARED — the composition, not
 * the size. Six today. A floor on the exception lists alone would be satisfied by six of
 * anything, including six more declared exceptions, so this is what says the rule is still the
 * common case and the lists have not swallowed the population.
 */
const ANCHORED_FLOOR = 6;

/** The prompt as authored. A plain string in every adopter, which is what keeps it readable. */
const PROMPT = /\bprompt="([^"]*)"/;

/**
 * The anchored form: the sentence says where the thing the learner moves is.
 *
 * The LEFT is what has to be named, because left is the side that picks up. "On the right"
 * alone names the target and leaves the actor unstated, which is the half a learner needs.
 */
const ANCHORS_THE_DRAGGABLE_SIDE = /on the left/i;

/**
 * A gesture: the prompt tells the learner to move something onto something else. A prompt with
 * no gesture in it states a strategy rather than an action, and has no direction to get wrong.
 */
const NAMES_A_GESTURE =
  /\b(drag|drop|drops|tap|taps|click|clicks|pick up|move|join|joins|match)\b/i;

/**
 * Adopters whose prompt names no gesture at all, so there is no direction in it to reverse.
 *
 * These are strategy notes — what to work out before joining — and the mechanic reaches the
 * learner through the objective line and the buttons' own labels instead. The exemption is
 * machine-checked rather than trusted: the assertion below re-reads each prompt and fails if one
 * of them starts naming a gesture, so a listed adopter cannot quietly acquire the very thing the
 * list says it does not have.
 */
const NAMES_NO_GESTURE: readonly string[] = [
  // "Decide which function each one is paired with before you look at what is on offer."
  "./interactive/TrigReciprocalMatch.tsx",
  // "Decide which function the form produces before you double the angle."
  "./interactive/TrigDoubleMatch.tsx",
  // "Decide the base length first, then divide it by whatever sits with theta inside."
  "./interactive/TrigCycleMatch.tsx",
  // "Every equation here holds more than one logarithm, so there is nothing to convert yet."
  "./interactive/EquationGatherConvertMatch.tsx",
];

/**
 * Adopters whose prompt IS directional and does not name a side, where a human read the board
 * and confirmed the noun order matches the columns.
 *
 * The read is the evidence and the entry is where it is recorded, but a recorded read that
 * nothing checks is a comment, and a comment cannot fail. So each entry names the two nouns as
 * the prompt spells them, and the assertion below re-derives the claim from the sentence: the
 * noun a human found on the LEFT must be named BEFORE the noun they found on the right. Reverse
 * the sentence and the entry stops describing it, which is what makes the shipped
 * `InterceptRouteMatch` defect fail here rather than sit quietly inside its own exemption.
 */
interface ReadByHand {
  path: string;
  /** The noun the prompt tells the learner to move. Verified to be the LEFT column. */
  actor: string;
  /** The noun the prompt tells them to move it onto. Verified to be the RIGHT column. */
  target: string;
  /** What the columns actually hold, as the reader found them. */
  columns: string;
}

const NOUN_ORDER_READ_BY_HAND: readonly ReadByHand[] = [
  {
    // "Drag a feature onto the value it takes, or tap the feature and then the value."
    // The sentence this replaced was the defect: it named the value first.
    path: "./interactive/InterceptRouteMatch.tsx",
    actor: "feature",
    target: "value",
    columns:
      'left is `leftProse` graph features ("The vertical line the turning point sits on"); right is `x = ...` values',
  },
  {
    // "Drag a number onto what it is, or tap the number and then what it is."
    path: "./interactive/SyntheticLongMatch.tsx",
    actor: "number",
    target: "what it is",
    columns:
      'left is the numbers of the synthetic row ("the 3 at the left of the synthetic row"); right is what each one is ("the quotient", "the remainder")',
  },
  {
    // "Drag a polynomial onto its leading term, or tap the polynomial and then the term."
    path: "./interactive/LeadingTermMatch.tsx",
    actor: "polynomial",
    target: "leading term",
    columns:
      'left is the polynomials ("7 minus 2 x to the fifth plus 4 x squared"); right is the leading terms ("negative 2 x to the fifth")',
  },
  {
    // "Drag an area onto the pair of sides that produces it, or tap the area and then the sides."
    path: "./interactive/FactorPairsMatch.tsx",
    actor: "area",
    target: "pair of sides",
    columns:
      'left is the area as a quadratic ("x squared plus 7 x plus 12"); right is the side pair ("x plus 3, times x plus 4")',
  },
  {
    // "Join each exponential statement to the logarithm statement holding the same three
    // numbers in the same three roles."
    path: "./interactive/LogFormMatch.tsx",
    actor: "exponential statement",
    target: "logarithm statement",
    columns:
      'left is the exponential statements ("2 to the 5 equals 32"); right is the logarithm statements ("log base 2 of 32 equals 5")',
  },
  {
    // "Join each question to the version of the rule that answers it."
    path: "./interactive/FormulaTargetMatch.tsx",
    actor: "question",
    target: "version of the rule",
    columns:
      'left is the questions ("how many ingots did that bill cover"); right is the rearranged rules ("n equals C minus f over p")',
  },
];

const DECLARED = [...NAMES_NO_GESTURE, ...NOUN_ORDER_READ_BY_HAND.map((e) => e.path)];

function promptOf(path: string): string {
  return WIDGET_SOURCES[path]?.match(PROMPT)?.[1] ?? "";
}

/* -------------------------------------------------------------------------- */
/* The objective, which is the other sentence the learner reads                 */
/* -------------------------------------------------------------------------- */

/**
 * The objective as prose, whether it was authored as a string or as JSX.
 *
 * A regex cannot do this half of it: `objective={<>...</>}` nests braces (`{" "}`, an
 * `<InlineMath latex={...} />`), and a lazy `\{([\s\S]*?)\}` stops at the first inner one and
 * silently returns the first clause of a two-clause sentence — which would look like a working
 * sweep and would read half of every objective on the board. So the braces are balanced by hand
 * and the result is stripped of tags and embedded expressions, leaving what a learner would read
 * aloud. The assertion below refuses an empty read, so a board that changes shape enough to
 * defeat this fails here rather than dropping quietly out of the sweep.
 */
function objectiveOf(path: string): string {
  const source = WIDGET_SOURCES[path] ?? "";
  const at = source.indexOf("objective=");
  if (at < 0) {
    return "";
  }
  const rest = source.slice(at + "objective=".length);
  if (rest.startsWith('"')) {
    const end = rest.indexOf('"', 1);
    return end < 0 ? "" : rest.slice(1, end);
  }
  if (!rest.startsWith("{")) {
    return "";
  }
  let depth = 0;
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i] === "{") {
      depth += 1;
    } else if (rest[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        return rest
          .slice(1, i)
          .replace(/<[^>]*>/g, " ")
          .replace(/\{[^{}]*\}/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }
    }
  }
  return "";
}

/**
 * The adopters that pass one. Optional on this kind per R17, and six of the sixteen omit it, so
 * the population is derived from what is authored rather than assumed to be all of them.
 */
const CARRIES_AN_OBJECTIVE = ADOPTS_MATCH_PAIRS.map(([path]) => path).filter(
  (path) => objectiveOf(path) !== "",
);

/** Ten today. A floor, so a broken extractor reports an empty sweep instead of a green one. */
const OBJECTIVE_FLOOR = 8;

/**
 * The floor under the objectives that carry a gesture — the population the rule actually bites
 * on. Seven today. Without it, an edit that softened every objective into a strategy note would
 * leave the assertions below true over nothing and reading as if the rule still held.
 */
const DIRECTIONAL_OBJECTIVE_FLOOR = 5;

/**
 * Objectives that are directional and do not name a side, each with the read that settles them.
 *
 * Same shape as `NOUN_ORDER_READ_BY_HAND` and for the same reason: the read is the evidence, the
 * entry is where it is recorded, and the assertions re-derive the claim from the sentence so a
 * reversed objective stops matching its own exemption.
 */
const OBJECTIVE_READ_BY_HAND: readonly ReadByHand[] = [
  {
    // "Goal: join each expression to the single function it is equal to, so the board ends up
    // showing four long expressions and the four short ones they can each be traded for."
    // This board's prompt names no gesture, so this sentence is the only direction on it.
    path: "./interactive/TrigDoubleMatch.tsx",
    actor: "expression",
    target: "function",
    columns:
      'left is the double-angle forms ("2 sine theta cosine theta"); right is the single functions they equal ("sine of 2 theta")',
  },
  {
    // "Goal: join each function to the length of one of its cycles, so the board ends up showing
    // which base length each one starts from and what the coefficient inside does to it."
    // Its prompt names no gesture either, so this is the whole of the instruction.
    path: "./interactive/TrigCycleMatch.tsx",
    actor: "function",
    target: "length of one of its cycles",
    columns: "left is the functions; right is the cycle lengths",
  },
  {
    // "Goal: join each special angle to its exact value, and read off which of the two reference
    // triangles each one comes from."
    path: "./interactive/TrigSpecialMatch.tsx",
    actor: "special angle",
    target: "exact value",
    columns:
      'left is the ratio taken AT a special angle ("sine of 30 degrees"), which is what the anchored prompt beside this calls "a ratio"; right is the exact values ("one half")',
  },
  {
    // "Goal: join all four headings to the same four headings written the other way, so the two
    // columns end up as one set of directions rather than two."
    path: "./interactive/TrigRadianMatch.tsx",
    actor: "headings",
    target: "headings written the other way",
    columns:
      'left is the headings in degrees; right is the same headings in radians, which is what "written the other way" denotes',
  },
  {
    // "Goal: join each feature of f(x) = ... to its value, so the board shows where each one
    // comes from ..." — the same two nouns, in the same order, as the prompt's own hand-read.
    path: "./interactive/InterceptRouteMatch.tsx",
    actor: "feature",
    target: "value",
    columns:
      'left is `leftProse` graph features ("The vertical line the turning point sits on"); right is `x = ...` values',
  },
];

describe("a MatchPairs prompt cannot point the learner at the column that does not move", () => {
  it("the sweep found the boards built on the kind", () => {
    expect(
      ADOPTS_MATCH_PAIRS.length,
      "no adopter was found, so every assertion below is running over nothing",
    ).toBeGreaterThanOrEqual(ADOPTER_FLOOR);
  });

  it.each(ADOPTS_MATCH_PAIRS.map(([path]) => path))(
    "%s states its prompt where this file can read it",
    (path) => {
      // Without this, a board could move its instruction into a template or a JSX expression
      // and drop out of every assertion below while still shipping a sentence to the learner.
      expect(WIDGET_SOURCES[path] ?? "").toMatch(PROMPT);
    },
  );

  it.each(ADOPTS_MATCH_PAIRS.map(([path]) => path))(
    "%s names the side that picks up, or is a declared exception",
    (path) => {
      if (ANCHORS_THE_DRAGGABLE_SIDE.test(promptOf(path))) {
        return;
      }
      expect(
        DECLARED,
        `${path} does not say "on the left", so a learner cannot tell which column moves. Either anchor the sentence, or declare it below with the read that settles its noun order.`,
      ).toContain(path);
    },
  );

  it("the anchored form is still the common case", () => {
    // A floor on the lists constrains their size; this constrains the SHAPE. If the exceptions
    // grow until the rule is the minority, that is the guard being hollowed out rather than
    // the tree being described.
    const anchored = ADOPTS_MATCH_PAIRS.filter(([path]) =>
      ANCHORS_THE_DRAGGABLE_SIDE.test(promptOf(path)),
    );
    expect(
      anchored.length,
      "the declared exceptions have swallowed the population the rule was written for",
    ).toBeGreaterThanOrEqual(ANCHORED_FLOOR);
  });

  it("nothing is declared twice, or excused on two grounds at once", () => {
    // The two lists make two different claims — "there is no direction in this sentence" and
    // "there is one and a human checked it" — and they cannot both be true of one board. An
    // adopter on both would be excused by whichever assertion it happened to satisfy.
    const both = NOUN_ORDER_READ_BY_HAND.filter((e) => NAMES_NO_GESTURE.includes(e.path));
    expect(
      both.map((e) => e.path),
      "declared as having no direction AND as having a hand-checked one",
    ).toEqual([]);
    // A path listed twice within one list reads as two exemptions and is one, which is how a
    // list's length stops measuring how much it excuses.
    expect(new Set(DECLARED).size, "a path is declared more than once").toBe(
      DECLARED.length,
    );
  });

  it.each(DECLARED)(
    "%s is a declared exception that still exists and still adopts the kind",
    (path) => {
      // A renamed or deleted file would otherwise sit in the list forever, exempting nothing and
      // hiding the fact that it exempts nothing.
      expect(
        ADOPTS_MATCH_PAIRS.map(([known]) => known),
        `${path} is declared as an exception but is not in the population: it has been renamed, deleted, or has stopped adopting the kind, so it now excuses nothing.`,
      ).toContain(path);
    },
  );

  it.each(NAMES_NO_GESTURE)("%s still names no gesture to get backwards", (path) => {
    // Read the sentence before judging it. `promptOf` gives "" for a file that is not there, and
    // "" satisfies the refusal below, so without this the exemption could go vacuous.
    const prompt = promptOf(path);
    expect(
      prompt,
      "no prompt was read, so the refusal below would hold over nothing",
    ).not.toBe("");
    // The other direction. A strategy note that starts telling the learner to drag something has
    // a direction in it, and has to be anchored or read by hand rather than go on being excused
    // by a list that says it has no direction at all.
    expect(
      prompt,
      "this prompt now names a gesture, so the exemption has stopped describing it",
    ).not.toMatch(NAMES_A_GESTURE);
  });

  it.each(NOUN_ORDER_READ_BY_HAND)(
    "$path still needs the hand-read: directional, and not anchored",
    ({ path }) => {
      const prompt = promptOf(path);
      expect(
        prompt,
        "this prompt no longer names a gesture, so it belongs with the strategy notes",
      ).toMatch(NAMES_A_GESTURE);
      // And the other direction: a prompt that adopts the anchored form no longer needs a human
      // vouching for its noun order, so leaving it here would be the list excusing nothing.
      expect(
        prompt,
        "this prompt now names the side, so it does not need a hand-read to stay honest",
      ).not.toMatch(ANCHORS_THE_DRAGGABLE_SIDE);
    },
  );

  it.each(NOUN_ORDER_READ_BY_HAND)(
    "$path is still the sentence that was read: it names $actor and $target",
    ({ path, actor, target }) => {
      // Without this the ordering assertion below is vacuous: `indexOf` of a noun that is not
      // there is -1, which is before everything.
      const prompt = promptOf(path).toLowerCase();
      expect(prompt, `the recorded actor "${actor}" is not in this prompt`).toContain(
        actor.toLowerCase(),
      );
      expect(prompt, `the recorded target "${target}" is not in this prompt`).toContain(
        target.toLowerCase(),
      );
    },
  );

  it.each(NOUN_ORDER_READ_BY_HAND)(
    "$path names the left column before the right one",
    ({ path, actor, target, columns }) => {
      const prompt = promptOf(path).toLowerCase();
      expect(
        prompt.indexOf(actor.toLowerCase()),
        `this prompt tells the learner to move "${target}", which is the column that does not move. ${columns}. Tapping it does nothing and refuses nothing.`,
      ).toBeLessThan(prompt.indexOf(target.toLowerCase()));
    },
  );
});

describe("the objective is a directional sentence too, and on two boards it is the only one", () => {
  it("the sweep found objectives to read", () => {
    expect(
      CARRIES_AN_OBJECTIVE.length,
      "no adopter's objective could be read, so every assertion below is running over nothing",
    ).toBeGreaterThanOrEqual(OBJECTIVE_FLOOR);
  });

  it.each(CARRIES_AN_OBJECTIVE)("%s yields readable prose, not a fragment", (path) => {
    // The brace-balancing is the part that can silently half-work: a truncated read returns the
    // first clause, which is a plausible-looking sentence and is not the objective. A sentence
    // that has lost its verb is what that looks like from here.
    const objective = objectiveOf(path);
    expect(objective.length, `${path}'s objective read as "${objective}"`).toBeGreaterThan(
      30,
    );
    expect(objective, `${path}'s objective still carries JSX`).not.toMatch(/[<>]/);
  });

  it.each(CARRIES_AN_OBJECTIVE)(
    "%s's objective names the side that picks up, or is a declared exception",
    (path) => {
      const objective = objectiveOf(path);
      if (!NAMES_A_GESTURE.test(objective)) {
        return;
      }
      if (ANCHORS_THE_DRAGGABLE_SIDE.test(objective)) {
        return;
      }
      expect(
        OBJECTIVE_READ_BY_HAND.map((entry) => entry.path),
        `${path}'s objective tells the learner to move something and does not say "on the left". On two adopters the objective is the ONLY directional sentence, so an unread one here is exactly the InterceptRouteMatch defect with nothing looking at it. Either anchor the sentence, or declare it below with the read that settles its noun order.`,
      ).toContain(path);
    },
  );

  it("the rule still has directional objectives to bite on", () => {
    // Not a claim that anchoring is the common case, because in the objectives it is not: two of
    // seven. What this refuses is the vacuous shape, where every objective has softened into a
    // strategy note and the assertions above pass by having nothing to judge.
    const directional = CARRIES_AN_OBJECTIVE.filter((path) =>
      NAMES_A_GESTURE.test(objectiveOf(path)),
    );
    expect(
      directional.length,
      "no objective names a gesture any more, so the rule above holds over an empty population",
    ).toBeGreaterThanOrEqual(DIRECTIONAL_OBJECTIVE_FLOOR);
  });

  it.each(OBJECTIVE_READ_BY_HAND)(
    "$path is a declared exception that still exists and still adopts the kind",
    ({ path }) => {
      expect(
        ADOPTS_MATCH_PAIRS.map(([known]) => known),
        `${path} is declared here but is not in the population: renamed, deleted, or no longer adopting the kind, so it now excuses nothing.`,
      ).toContain(path);
    },
  );

  it("nothing is declared twice in the objective list", () => {
    const paths = OBJECTIVE_READ_BY_HAND.map((entry) => entry.path);
    expect(new Set(paths).size, "a path is declared more than once").toBe(paths.length);
  });

  it.each(OBJECTIVE_READ_BY_HAND)(
    "$path still needs its objective read: directional, and not anchored",
    ({ path }) => {
      const objective = objectiveOf(path);
      expect(
        objective,
        "this objective no longer names a gesture, so there is no direction here to vouch for",
      ).toMatch(NAMES_A_GESTURE);
      // The other direction: an objective that adopts the anchored form has stopped needing a
      // human behind it, and leaving it here would be the list excusing nothing.
      expect(
        objective,
        "this objective now names the side, so it does not need a hand-read to stay honest",
      ).not.toMatch(ANCHORS_THE_DRAGGABLE_SIDE);
    },
  );

  it.each(OBJECTIVE_READ_BY_HAND)(
    "$path's objective is still the sentence that was read: it names $actor and $target",
    ({ path, actor, target }) => {
      // Without this the ordering assertion below is vacuous: `indexOf` of a noun that is not
      // there is -1, which is before everything.
      const objective = objectiveOf(path).toLowerCase();
      expect(objective, `the recorded actor "${actor}" is not in this objective`).toContain(
        actor.toLowerCase(),
      );
      expect(
        objective,
        `the recorded target "${target}" is not in this objective`,
      ).toContain(target.toLowerCase());
    },
  );

  it.each(OBJECTIVE_READ_BY_HAND)(
    "$path's objective names the left column before the right one",
    ({ path, actor, target, columns }) => {
      const objective = objectiveOf(path).toLowerCase();
      expect(
        objective.indexOf(actor.toLowerCase()),
        `this objective tells the learner to move "${target}", which is the column that does not move. ${columns}. Tapping it does nothing and refuses nothing.`,
      ).toBeLessThan(objective.indexOf(target.toLowerCase()));
    },
  );
});
