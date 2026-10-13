import {
  type GenerateContext,
  type ItemTemplate,
  intervalAnswer,
  multipleChoiceAnswer,
  numericAnswer,
  type Rng,
} from "../../../template";

/**
 * FUN.4 practice templates: reading a graph's features, where it increases, where it
 * decreases, and where its maxima and minima sit. Themed for "The Gearwright's Menagerie";
 * Atomic Age era, so the practice form picks one of three framings from the era style guide
 * (`docs/superpowers/specs/eras/era-08-atomic/style-guide.md`, FUN.4 row): a strip chart from
 * the control hall, a demand curve over twenty-four hours, or a test run's temperature trace.
 * The framing is skin only; answers, params, hints and worked solutions are unchanged.
 *
 * Five shapes across the locked 1xL1 / 2xL2 / 2xL3 mix:
 *
 *  - L1  a three-leg run, with ONE named leg to classify as increasing / decreasing /
 *        constant. Entry tier because only the direction is wanted, and the point of it is
 *        that the SAME trace does different things on different stretches of the input.
 *  - L2a a run with one turn: name the stretch it climbs on (or falls on), as an interval.
 *  - L2b the same shape asked the other way: the VALUE at the turn, not the input at it.
 *  - L3a a run with a turn that is only a LOCAL high or low point, because an end of the
 *        run beats it. Asks for the extreme value of the whole run.
 *  - L3b a four-leg run that goes the asked way TWICE, so the answer is a union.
 *
 * ## The precision this node lives on
 *
 * Increasing and decreasing are properties of INTERVALS OF THE INPUT, and an extremum is a
 * VALUE of the output attained at an input. A learner reporting a maximum as the hour it
 * happened is the characteristic miss, so the two are deliberately split across L2a/L2b and
 * asked again at L3a, and every prompt that wants a value says so in as many words.
 *
 * ## Seeding
 *
 * Shapes seeded from Lippman and Rasmussen, *Precalculus: An Investigation of Functions*
 * (opentextbookstore.com), Section 1.3 "Rates of Change and Behavior of Graphs": exercises
 * 21 to 24 ("estimate the intervals on which the function is increasing and decreasing"),
 * 25 to 32 (a table of values, classified as increasing or decreasing), and 37 to 42
 * ("estimate the local extrema ... and the intervals on which the function is increasing,
 * decreasing"). Every one of those is asked OVER A PRINTED GRAPH, which a text item bank
 * cannot serve and which extracts from the PDF as bare exercise numbers with no figure at
 * all, so each shape here re-expresses the graph as a run of marks described in words and
 * re-derives its own numbers. The seed sets the ladder (classify, then name an interval,
 * then read an extremum, then local against absolute); none of its numbers are used.
 *
 * ## Answer paths
 *
 * Three graders, each on the one form its answer can take, and none of them needs a
 * notation key the learner cannot type from a phone keyboard's first layer:
 *
 *  - a direction is one of three WORDS, so `multipleChoiceAnswer` (tag `multiple_choice`);
 *  - a stretch of input is an `intervalAnswer` (tag `interval`), whose bracket is graded, so
 *    every prompt asking for one says "with round brackets" and the union shape additionally
 *    spells out the whitespace-delimited `U` the parser requires;
 *  - an extreme reading is one integer, so `numericAnswer`. Its key is never `int/int`, so it
 *    stays keyless, which is correct: an integer needs no notation named for it.
 *
 * ## Why the two numeric shapes' hints carry no standalone digits
 *
 * `hint_leaks_answer` matches the answer key as a standalone value, and the keys of L2b and
 * L3a are small integers. A hint reading "compare it with $9$" would leak on precisely the
 * draws whose answer is $9$ and pass on every other, which is worse than a constant leak
 * because whether the sweep catches it depends on the seed. Those hints are written
 * digit-free. L1's key is a WORD, and the leak check strips whitespace before matching, so
 * its hints never contain "increasing", "decreasing" or "constant" either: they describe the
 * comparison and leave the naming to the learner.
 *
 * FUN.4 also has DIAGNOSTIC slices in `../../../graph/slices.ts` (a drawn-on parabola with a
 * shaded sign region). That is a different surface with a different answer type; nothing here
 * reuses or renumbers it, and no shape below is one the lesson's own widgets or CFU work.
 */

export const FUN4_NODE = "FUN.4";

/** How many practice-form framings FUN.4 rotates through. */
export const FUN4_CHART_FRAME_COUNT = 3;

/**
 * The opening clause of each practice framing, before the instance numbers vary.
 * Exported so the diversity guard can census openings without parsing prompts.
 */
export const FUN4_CHART_FRAME_OPENINGS: readonly string[] = [
  "A strip chart in the control hall records one reading each hour of the shift.",
  "A demand curve over twenty-four hours tracks one level each hour.",
  "A test run's temperature trace records one reading each hour.",
];

/** One recorded mark: the input (an hour on the practice form) and the reading at it. */
type Mark = readonly [number, number];

/** An ordered pair as LaTeX, spaced the way the lesson diagrams space it. */
function point(x: number, y: number): string {
  return `(${x},\\, ${y})`;
}

/**
 * The legs of a run as one sentence tail.
 *
 * "then" goes on the LAST leg only. Joining every leg with it gave a four-leg run three of
 * them in one sentence, which reads as three separate afterthoughts rather than as one trace.
 */
function joinLegs(legs: readonly string[]): string {
  if (legs.length < 2) {
    return legs.join("");
  }
  return `${legs.slice(0, -1).join(", ")}, then ${legs[legs.length - 1]}`;
}

type ChartFrameLead = (first: Mark, legsTail: string) => string;

/** Practice-form framings from the Atomic Age style guide (FUN.4 row). */
const CHART_FRAME_LEADS: readonly ChartFrameLead[] = [
  (first, legsTail) =>
    `${FUN4_CHART_FRAME_OPENINGS[0]} The pen starts at $${first[1]}$ at hour $${first[0]}$, ${legsTail}.`,
  (first, legsTail) =>
    `${FUN4_CHART_FRAME_OPENINGS[1]} The trace starts at $${first[1]}$ at hour $${first[0]}$, ${legsTail}.`,
  (first, legsTail) =>
    `${FUN4_CHART_FRAME_OPENINGS[2]} The recorder starts at $${first[1]}$ at hour $${first[0]}$, ${legsTail}.`,
];

/**
 * The run described for the practice form, in one of three Atomic Age framings.
 *
 * The verb per leg is derived from the two readings rather than authored, so a level leg
 * never prints as a climb on the draw that flattens it.
 */
function chartProse(marks: readonly Mark[], frame: number): string {
  const first = marks[0] as Mark;
  const legs = marks.slice(1).map((mark, index) => {
    const previous = marks[index] as Mark;
    // A level leg takes "until", because a pen that has not moved has not arrived anywhere
    // "by" an hour.
    return mark[1] === previous[1]
      ? `holds steady at $${mark[1]}$ until hour $${mark[0]}$`
      : `${mark[1] > previous[1] ? "climbs" : "falls"} steadily to $${mark[1]}$ by hour $${mark[0]}$`;
  });
  const index = frame >= 0 && frame < CHART_FRAME_LEADS.length ? frame : 0;
  const lead = CHART_FRAME_LEADS[index] as ChartFrameLead;
  return lead(first, joinLegs(legs));
}

/** The same run stated neutrally, for the assessment forms. */
function graphProse(marks: readonly Mark[]): string {
  const first = marks[0] as Mark;
  const legs = marks.slice(1).map((mark, index) => {
    const previous = marks[index] as Mark;
    const verb =
      mark[1] > previous[1]
        ? "rises steadily to"
        : mark[1] < previous[1]
          ? "falls steadily to"
          : "runs level to";
    return `${verb} $${point(mark[0], mark[1])}$`;
  });
  return `The graph of a function starts at $${point(first[0], first[1])}$, ${joinLegs(legs)}.`;
}

/** The run, framed for whichever form is being rendered. */
function traceProse(
  marks: readonly Mark[],
  ctx: GenerateContext | undefined,
  frame: number,
): string {
  return ctx?.form === "practice" ? chartProse(marks, frame) : graphProse(marks);
}

/** Every mark listed in order, for the first worked-solution step. */
function markList(marks: readonly Mark[]): string {
  return marks.map((mark) => `$${point(mark[0], mark[1])}$`).join(", ");
}

/** The delta for one leg: forced to the asked behavior on the leg the question names. */
function legDelta(rng: Rng, asked: boolean, kind: number): number {
  if (asked) {
    return kind === 0 ? 0 : kind === 1 ? rng.int(2, 4) : -rng.int(2, 4);
  }
  return rng.int(0, 1) === 1 ? rng.int(2, 4) : -rng.int(2, 4);
}

/**
 * L1, classify ONE named leg of a three-leg run.
 *
 * `kind` is drawn before anything else and the asked leg's change follows from it, exactly
 * as `d7.lf1.direction.l2` does, so a level leg is a third of the draws rather than a
 * one-in-nineteen accident of a random delta. `ask` moves the named leg around the run, so
 * the learner cannot answer by reading the first two marks out of habit.
 */
export const d6_fun4_direction_l1: ItemTemplate = {
  template_id: "d6.fun4.direction.l1",
  node_id: FUN4_NODE,
  difficulty: 1,
  concept: "direction-on-a-named-interval",
  generate(rng: Rng, ctx?: GenerateContext) {
    const frame = rng.int(0, FUN4_CHART_FRAME_COUNT - 1);
    const kind = rng.int(0, 2);
    const ask = rng.int(0, 2);
    let x1 = 0;
    let x2 = 0;
    let x3 = 0;
    let y0 = 0;
    let y1 = 0;
    let y2 = 0;
    let y3 = 0;
    // Redraw until every reading sits on the readable part of the scale. Three legs of up
    // to five each off a start in the middle can otherwise run off either end.
    do {
      x1 = rng.int(2, 4);
      x2 = x1 + rng.int(2, 4);
      x3 = x2 + rng.int(2, 4);
      y0 = rng.int(5, 9);
      y1 = y0 + legDelta(rng, ask === 0, kind);
      y2 = y1 + legDelta(rng, ask === 1, kind);
      y3 = y2 + legDelta(rng, ask === 2, kind);
    } while ([y0, y1, y2, y3].some((y) => y < 1 || y > 17));

    const marks: readonly Mark[] = [
      [0, y0],
      [x1, y1],
      [x2, y2],
      [x3, y3],
    ];
    const from = ask === 0 ? 0 : ask === 1 ? x1 : x2;
    const to = ask === 0 ? x1 : ask === 1 ? x2 : x3;
    const fromY = ask === 0 ? y0 : ask === 1 ? y1 : y2;
    const toY = ask === 0 ? y1 : ask === 1 ? y2 : y3;
    const verdict = toY > fromY ? "increasing" : toY < fromY ? "decreasing" : "constant";
    const sense =
      toY > fromY
        ? "The value at the right end of that stretch is the larger of the two, so the run climbs across it."
        : toY < fromY
          ? "The value at the right end of that stretch is the smaller of the two, so the run falls across it."
          : "The two values are the same, so the run does not move up or down across that stretch.";
    const question =
      ctx?.form === "practice"
        ? `Between hour $${from}$ and hour $${to}$, is the reading increasing, decreasing, or constant? Type one of those three words.`
        : `Between $x = ${from}$ and $x = ${to}$, is the function increasing, decreasing, or constant? Type one of those three words.`;
    return {
      prompt: `${traceProse(marks, ctx, frame)} ${question}`,
      answer: multipleChoiceAnswer(verdict),
      params: { frame, kind, ask, x1, x2, x3, y0, y1, y2, y3 },
      hints: [
        "The question names one stretch of the run and asks about that stretch only, so find the two marks at its ends and ignore every other mark on the chart.",
        "Compare those two values, reading from the earlier mark to the later one. A larger value at the later mark means the run climbs, a smaller one means it falls, and two equal values mean the run stays level. Match what you found to one of the three words in the question.",
      ],
      worked_solution: [
        `The marks in order are ${markList(marks)}.`,
        `The stretch the question names runs from $${from}$ to $${to}$, so the only two marks that matter are $${point(from, fromY)}$ and $${point(to, toY)}$.`,
        sense,
        `Across that stretch the run is ${verdict}.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.frame ?? 0}:${params.kind ?? 0}:${params.ask ?? 0}:${params.y0 ?? 0}`,
};

/**
 * L2a, name the stretch, as an interval.
 *
 * One turn, so the run splits into exactly two stretches and each behaves one way. `want`
 * asks for the climbing stretch on half the draws and the falling one on the other half, and
 * `peak` decides whether the turn is a high point or a low one, so the wanted stretch is not
 * always the first or always the second.
 *
 * The bracket is graded (a right set with the wrong brackets comes back
 * `wrong_bound_inclusivity`), and which bracket an interval of increase takes is a
 * CONVENTION rather than something the run decides, so the prompt states it.
 */
export const d6_fun4_rising_interval_l2: ItemTemplate = {
  template_id: "d6.fun4.rising-interval.l2",
  node_id: FUN4_NODE,
  difficulty: 2,
  concept: "name-the-interval",
  generate(rng: Rng, ctx?: GenerateContext) {
    const frame = rng.int(0, FUN4_CHART_FRAME_COUNT - 1);
    const peak = rng.int(0, 1);
    const want = rng.int(0, 1);
    const xt = rng.int(3, 7);
    const xe = xt + rng.int(3, 6);
    const y0 = peak === 1 ? rng.int(1, 5) : rng.int(9, 13);
    const yt = peak === 1 ? y0 + rng.int(4, 8) : y0 - rng.int(4, 8);
    /*
     * The far end lands back on the near side of the turn without matching the start, so the
     * run genuinely turns rather than tracing a symmetric tent nobody has to read.
     *
     * Drawn from a range that is legal by construction rather than rerolled: the reroll this
     * replaces could not terminate on the draw `y0 = 1, yt = 4`, where the only value in
     * range is `1` and `1` is the value it was rejecting. The nudge off a collision is always
     * available because the turn clears the start by at least four.
     */
    const raw = peak === 1 ? rng.int(1, yt - 1) : rng.int(yt + 1, yt + 8);
    const ye = raw === y0 ? (peak === 1 ? y0 + 1 : y0 - 1) : raw;

    const marks: readonly Mark[] = [
      [0, y0],
      [xt, yt],
      [xe, ye],
    ];
    // A high turn climbs first and falls second; a low turn does the reverse.
    const climbFirst = peak === 1;
    const wantClimb = want === 0;
    const first = wantClimb === climbFirst;
    const a = first ? 0 : xt;
    const b = first ? xt : xe;
    const dirWord = wantClimb ? "increasing" : "decreasing";
    const turnPhrase =
      peak === 1
        ? `The readings climb up to the mark at $${xt}$ and fall away after it, so the run turns there.`
        : `The readings fall to the mark at $${xt}$ and climb away after it, so the run turns there.`;
    const question =
      ctx?.form === "practice"
        ? `Over which stretch of hours is the reading ${dirWord}? Give the stretch in interval notation, using the hour numbers, with round brackets.`
        : `On which interval is the function ${dirWord}? Give the interval in interval notation, using the $x$-values, with round brackets.`;
    return {
      prompt: `${traceProse(marks, ctx, frame)} ${question}`,
      answer: intervalAnswer(`(${a}, ${b})`),
      params: { frame, peak, want, xt, xe, y0, yt, ye },
      hints: [
        "Find the mark where the run turns, the one where it stops going one way and starts going the other. That single mark splits the whole run into two stretches, and each stretch behaves one way the whole time.",
        "An interval names the INPUT values a stretch runs across, never the readings taken on it, so write the two input values at the ends of the stretch you picked.",
        "Put the smaller input first and the larger one second, and wrap the pair in round brackets.",
      ],
      worked_solution: [
        `The marks in order are ${markList(marks)}.`,
        turnPhrase,
        `The stretch where the run is ${dirWord} therefore reaches from an input of $${a}$ to an input of $${b}$.`,
        `Written in interval notation, that stretch is $(${a},\\, ${b})$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.frame ?? 0}:${params.want ?? 0}:${params.xt ?? 0}:${params.xe ?? 0}`,
};

/**
 * L2b, the same picture asked the other way: the VALUE at the turn.
 *
 * The turn is the extreme of the whole run by construction here (both ends sit inside it), so
 * nothing about local against absolute is being asked yet; that is L3a's job. What this shape
 * measures is only the value-against-input distinction, which is why the turn's input and its
 * reading are forced to be DIFFERENT numbers: with them equal, a learner who reported the
 * input would be marked correct and would never find out.
 */
export const d6_fun4_peak_value_l2: ItemTemplate = {
  template_id: "d6.fun4.peak-value.l2",
  node_id: FUN4_NODE,
  difficulty: 2,
  concept: "extremum-is-a-value",
  generate(rng: Rng, ctx?: GenerateContext) {
    const frame = rng.int(0, FUN4_CHART_FRAME_COUNT - 1);
    const high = rng.int(0, 1);
    const xt = rng.int(3, 7);
    const xe = xt + rng.int(3, 6);
    const y0 = high === 1 ? rng.int(1, 6) : rng.int(11, 16);
    const turn = high === 1 ? y0 + rng.int(4, 8) : y0 - rng.int(4, 8);
    /*
     * The turn's READING must not be the same number as the input it happens at, or a learner
     * who reported the input would be marked correct and would never find out that this node
     * is about the difference. Nudged rather than rerolled, and always away from the start, so
     * the turn keeps clearing both ends of the run.
     */
    const yt = turn === xt ? (high === 1 ? turn + 1 : turn - 1) : turn;
    const ye = high === 1 ? rng.int(1, yt - 1) : rng.int(yt + 1, yt + 8);

    const marks: readonly Mark[] = [
      [0, y0],
      [xt, yt],
      [xe, ye],
    ];
    const question =
      ctx?.form === "practice"
        ? `What is the ${high === 1 ? "highest" : "lowest"} reading the pen records anywhere on this shift? Enter one number, the reading itself rather than the hour it happens at.`
        : `What is the ${high === 1 ? "largest" : "smallest"} value the function takes anywhere on this graph? Enter one number, the value itself rather than the input it happens at.`;
    return {
      prompt: `${traceProse(marks, ctx, frame)} ${question}`,
      answer: numericAnswer(`${yt}`),
      params: { frame, high, xt, xe, y0, yt, ye },
      hints: [
        "The question asks for a value the run reaches, not the input it reaches it at, so decide which of the two numbers in a mark you are being asked for before you read anything off.",
        "Find the mark where the run turns, then compare its value against the values at the two ends of the run as well. An extreme value of the whole run has to beat every mark on it, ends included.",
      ],
      worked_solution: [
        `The marks in order are ${markList(marks)}.`,
        high === 1
          ? `The run climbs to the middle mark and falls away after it, so that mark is where it turns.`
          : `The run falls to the middle mark and climbs away after it, so that mark is where it turns.`,
        `Compare the three values, $${y0}$, $${yt}$ and $${ye}$: the ${high === 1 ? "largest" : "smallest"} of them is $${yt}$.`,
        `The ${high === 1 ? "highest" : "lowest"} reading on the run is $${yt}$, which is the value at the turn and not the input $${xt}$ where the turn happens.`,
      ],
    };
  },
  varietyKey: (params) => `${params.frame ?? 0}:${params.high ?? 0}:${params.yt ?? 0}`,
};

/**
 * L3a, a turn that is only a LOCAL extreme, because an END of the run beats it.
 *
 * This is the shape the two easier tiers set up. A learner who has learned "the extreme is at
 * the turn" answers the local value, and the whole difficulty is that a run has ends as well
 * as turns. The end that wins is forced by construction rather than left to a draw, so the
 * trap is served on every instance.
 */
export const d6_fun4_absolute_extreme_l3: ItemTemplate = {
  template_id: "d6.fun4.absolute-extreme.l3",
  node_id: FUN4_NODE,
  difficulty: 3,
  concept: "local-versus-absolute",
  generate(rng: Rng, ctx?: GenerateContext) {
    const frame = rng.int(0, FUN4_CHART_FRAME_COUNT - 1);
    const high = rng.int(0, 1);
    const x1 = rng.int(2, 4);
    const x2 = x1 + rng.int(2, 4);
    const x3 = x2 + rng.int(2, 4);
    let y0 = 0;
    let y1 = 0;
    let y2 = 0;
    let y3 = 0;
    if (high === 1) {
      // Up to a local high, down to a dip, then up past that local high to the far end.
      y0 = rng.int(1, 4);
      y1 = y0 + rng.int(4, 6);
      y2 = y1 - rng.int(2, 4);
      y3 = y1 + rng.int(2, 6);
    } else {
      // Down to a local low, up to a rise, then down past that local low to the far end.
      y0 = rng.int(13, 17);
      y1 = y0 - rng.int(4, 6);
      y2 = y1 + rng.int(2, 4);
      y3 = y1 - rng.int(2, 6);
    }
    /*
     * The answer is a READING, so it must not print as the same number as the input it is
     * reached at. Nudging up by one is safe either way round: the far end clears the local
     * turn by at least two, so one step towards it cannot cross it.
     */
    if (y3 === x3) {
      y3 += 1;
    }
    const marks: readonly Mark[] = [
      [0, y0],
      [x1, y1],
      [x2, y2],
      [x3, y3],
    ];
    // The far end is the extreme by construction, and the turn at `x1` is the near miss.
    const answer = y3;
    const question =
      ctx?.form === "practice"
        ? `Reading the whole shift from the first hour to the last, what is the ${high === 1 ? "highest" : "lowest"} reading the pen records? Enter one number, the reading itself rather than the hour it happens at.`
        : `Reading the whole graph from its first mark to its last, what is the ${high === 1 ? "largest" : "smallest"} value the function takes? Enter one number, the value itself rather than the input it happens at.`;
    return {
      prompt: `${traceProse(marks, ctx, frame)} ${question}`,
      answer: numericAnswer(`${answer}`),
      params: { frame, high, x1, x2, x3, y0, y1, y2, y3 },
      hints: [
        "A turn is only a LOCAL high or low point. It beats the marks immediately either side of it, and it says nothing at all about the rest of the run.",
        "The extreme value of the WHOLE run has to be compared against every mark on it, and the two ends of the run count as marks even though the run does not turn there.",
        "Once you have compared them all, report the value the run reaches rather than the input it reaches it at.",
      ],
      worked_solution: [
        `The marks in order are ${markList(marks)}.`,
        high === 1
          ? `The run turns twice: it climbs to $${point(x1, y1)}$ and falls away, so that is a local high point, and it dips to $${point(x2, y2)}$ before climbing again.`
          : `The run turns twice: it falls to $${point(x1, y1)}$ and climbs away, so that is a local low point, and it rises to $${point(x2, y2)}$ before falling again.`,
        `A local turn only beats its immediate neighbors, so compare every value on the run, ends included: $${y0}$, $${y1}$, $${y2}$ and $${y3}$.`,
        high === 1
          ? `The largest of those is $${answer}$, which the run reaches at its far end rather than at either turn.`
          : `The smallest of those is $${answer}$, which the run reaches at its far end rather than at either turn.`,
        `The ${high === 1 ? "highest" : "lowest"} reading on the whole run is $${answer}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.frame ?? 0}:${params.high ?? 0}:${params.y3 ?? 0}:${params.y1 ?? 0}`,
};

/**
 * L3b, a run that goes the asked way TWICE, so the answer is a union of two intervals.
 *
 * Four legs, alternating, so the wanted behavior is on the second and fourth of them and the
 * two stretches never touch. Two input rules are load-bearing and the prompt states both: the
 * union join has to be whitespace-delimited (`(2, 5) U (9, 12)` parses and the same string
 * closed up does not), and the brackets are graded.
 */
export const d6_fun4_fall_union_l3: ItemTemplate = {
  template_id: "d6.fun4.fall-union.l3",
  node_id: FUN4_NODE,
  difficulty: 3,
  concept: "union-of-intervals",
  generate(rng: Rng, ctx?: GenerateContext) {
    const frame = rng.int(0, FUN4_CHART_FRAME_COUNT - 1);
    // 0 wants the falling stretches (the run goes up, down, up, down); 1 wants the climbing
    // ones (down, up, down, up). Either way the wanted pair is legs two and four.
    const want = rng.int(0, 1);
    const x1 = rng.int(2, 4);
    const x2 = x1 + rng.int(2, 4);
    const x3 = x2 + rng.int(2, 4);
    const x4 = x3 + rng.int(2, 4);
    const step = (): number => rng.int(2, 5);
    let y0 = 0;
    let y1 = 0;
    let y2 = 0;
    let y3 = 0;
    let y4 = 0;
    do {
      y0 = want === 0 ? rng.int(2, 6) : rng.int(12, 17);
      const s1 = step();
      const s2 = step();
      const s3 = step();
      const s4 = step();
      y1 = want === 0 ? y0 + s1 : y0 - s1;
      y2 = want === 0 ? y1 - s2 : y1 + s2;
      y3 = want === 0 ? y2 + s3 : y2 - s3;
      y4 = want === 0 ? y3 - s4 : y3 + s4;
    } while ([y0, y1, y2, y3, y4].some((y) => y < 1 || y > 19));

    const marks: readonly Mark[] = [
      [0, y0],
      [x1, y1],
      [x2, y2],
      [x3, y3],
      [x4, y4],
    ];
    const dirWord = want === 0 ? "decreasing" : "increasing";
    const otherWord = want === 0 ? "climbs" : "falls";
    const wantedVerb = want === 0 ? "falls" : "climbs";
    const question =
      ctx?.form === "practice"
        ? `List every stretch of hours on which the reading is ${dirWord}. Give each stretch in interval notation with round brackets, using the hour numbers, and join the two of them with the letter U with a space on each side.`
        : `List every interval on which the function is ${dirWord}. Give each interval in interval notation with round brackets, using the $x$-values, and join the two of them with the letter U with a space on each side.`;
    return {
      prompt: `${traceProse(marks, ctx, frame)} ${question}`,
      answer: intervalAnswer(`(${x1}, ${x2}) U (${x3}, ${x4})`),
      params: { frame, want, x1, x2, x3, x4, y0, y1, y2, y3, y4 },
      hints: [
        "Walk the marks from left to right and settle each stretch between two neighboring marks on its own, by comparing just those two readings.",
        "Stretches that behave the same way do not have to touch, so a run can go the asked way, come back, and go that way again. Collect every stretch that qualifies rather than stopping at the first one.",
        "Write each collected stretch from the input at its left end to the input at its right end, in round brackets, then join them with a union, typed the way the question asks for it.",
      ],
      worked_solution: [
        `The marks in order are ${markList(marks)}.`,
        `Take the legs one at a time: the run ${otherWord} from $0$ to $${x1}$, ${wantedVerb} from $${x1}$ to $${x2}$, ${otherWord} again from $${x2}$ to $${x3}$, and ${wantedVerb} again from $${x3}$ to $${x4}$.`,
        `Two of the four legs are ${dirWord}, and they do not touch: the one from $${x1}$ to $${x2}$ and the one from $${x3}$ to $${x4}$.`,
        `Written as intervals over the input and joined, that is $(${x1},\\, ${x2}) \\cup (${x3},\\, ${x4})$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.frame ?? 0}:${params.want ?? 0}:${params.x1 ?? 0}:${params.x2 ?? 0}:${params.x3 ?? 0}:${params.x4 ?? 0}`,
};

/** Every FUN.4 practice template, in stable authoring order (L1, L2a, L2b, L3a, L3b). */
export const FUN4_TEMPLATES: readonly ItemTemplate[] = [
  d6_fun4_direction_l1,
  d6_fun4_rising_interval_l2,
  d6_fun4_peak_value_l2,
  d6_fun4_absolute_extreme_l3,
  d6_fun4_fall_union_l3,
];
