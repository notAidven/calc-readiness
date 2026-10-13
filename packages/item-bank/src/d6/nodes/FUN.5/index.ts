import { latexNum } from "../../../promptFormat";
import { type ItemTemplate, numericAnswer, type Rng } from "../../../template";

/**
 * FUN.5 practice templates: average rate of change over an interval. Themed for "The
 * Gearwright's Menagerie"; Atomic Age era, so the scenario is the telemetry loft's chart
 * recorder and its readings per hour (`docs/superpowers/specs/eras/era-08-atomic`, Lesson
 * framings: "units per hour between two chart marks", and "the same chart read over two
 * different windows").
 *
 * The registry gives FUN.5 only `FUN.1` as a prereq, so slope (`LF.1`) may NOT be assumed
 * taught: every shape here stands up as "change in output over change in input" and no
 * prompt, hint or worked-solution step names slope, rise or run. The coordinate plane is not
 * assumed either (`CG.1` is a sibling), so nothing here is stated as a point or a graph.
 *
 * ## Every key is an integer, and the sign is the content
 *
 * Each generator draws the RATE first and derives the readings from it, which is what keeps
 * the division exact without a reroll loop and lets a falling trace be dealt as often as a
 * rising one. Reading the size of the change and dropping its direction is the misconception
 * the node exists for, so no template is allowed to draw only rises: `fall` / the sign flags
 * are drawn independently of everything else, and the hints state the rule in both
 * directions rather than assuming either.
 *
 * ## Theming is the prompt's only
 *
 * Four of the five shapes are genuine word problems about a chart recorder, so they carry the
 * scenario when `ctx?.form === "practice"` and a neutral prompt otherwise. `function-rule.l2`
 * is an abstract exercise on a rule and stays neutral in every form: a decorative lead-in
 * would add nothing to it. No answer, param, difficulty or worked-solution step depends on
 * the wording either way.
 *
 * Shapes seeded from the free "Business Calculus" and "Precalculus: An Investigation of
 * Functions" texts on opentextbookstore.com, whose average-rate-of-change exercises run
 * two-readings, then a rule, then a table read over a named sub-interval, then a comparison
 * of two windows. The numbers here are re-derived rather than transcribed, the arithmetic was
 * worked by hand, and the fifth shape (recover a reading from the rate) is an inverse of the
 * first that those books state only as a formula rearrangement.
 */

export const FUN5_NODE = "FUN.5";

/** The trailing instruction every prompt carries, kept outside the math delimiters. */
const ONE_NUMBER = " Enter one number.";

/** A signed value as the subtrahend or factor it is, keeping a negative in parentheses. */
function signed(value: number): string {
  return value < 0 ? `(${value})` : `${value}`;
}

/** A list of marks read out as prose: "a, b, c, and d". */
function joinMarks(marks: readonly string[]): string {
  if (marks.length < 2) {
    return marks[0] ?? "";
  }
  return `${marks.slice(0, -1).join(", ")}, and ${marks[marks.length - 1]}`;
}

/**
 * L1: two marks, one rate. The whole of the definition with nothing else in the way, so the
 * only decisions are which subtraction runs on top and which sign it comes out with.
 */
export const d6_fun5_two_readings_l1: ItemTemplate = {
  template_id: "d6.fun5.two-readings.l1",
  node_id: FUN5_NODE,
  difficulty: 1,
  concept: "rate-from-two-readings",
  generate(rng: Rng, ctx) {
    const span = rng.int(2, 6);
    const t1 = rng.int(0, 6);
    const t2 = t1 + span;
    const mag = rng.int(2, 9);
    const fall = rng.int(0, 1);
    const rate = fall === 1 ? -mag : mag;
    // A falling trace has to start high enough to survive the interval, so the base is the
    // reading at the LOW end whichever way round the trace runs. Both readings stay positive
    // without a reroll.
    const base = rng.int(3, 30);
    const v1 = fall === 1 ? base + mag * span : base;
    const v2 = v1 + rate * span;
    const change = v2 - v1;
    return {
      prompt:
        ctx?.form === "practice"
          ? `A chart recorder inks one reading an hour through a shift. The trace sits at $${v1}$ units at hour $${t1}$ and at $${v2}$ units at hour $${t2}$. What is the average rate of change of the reading over those hours, in units per hour?${ONE_NUMBER}`
          : `A quantity reads $${v1}$ at input $${t1}$ and $${v2}$ at input $${t2}$. What is its average rate of change from $${t1}$ to $${t2}$?${ONE_NUMBER}`,
      answer: numericAnswer(String(rate)),
      params: { t1, t2, span, v1, v2, rate, fall },
      hints: [
        "A reading and the hour it was taken at are two different quantities, so write down the pair at the start of the interval and the pair at the end before dividing anything.",
        "The average rate of change is the change in the reading divided by the change in the hours, and both subtractions run the same way round: the later value minus the earlier one.",
        "Keep whatever sign the top subtraction gives. A trace that ends above where it started reports a positive rate, and one that ends below reports a negative rate.",
      ],
      worked_solution: [
        `The interval runs from hour $${t1}$ to hour $${t2}$, so the change in the hours is $${t2} - ${t1} = ${span}$.`,
        `The reading runs from $${v1}$ to $${v2}$, so the change in the reading is $${v2} - ${v1} = ${change}$.`,
        `Divide the change in the reading by the change in the hours: $\\dfrac{${change}}{${span}} = ${rate}$.`,
        fall === 1
          ? `The average rate of change is $${rate}$ units per hour, a fall of $${mag}$ units in each hour.`
          : `The average rate of change is $${rate}$ units per hour, a rise of $${mag}$ units in each hour.`,
      ],
    };
  },
  varietyKey: (params) => `${params.rate}:${params.span}`,
};

/**
 * L2a: the same definition applied to a RULE rather than to a trace, which is the form
 * `FUN.1`'s function notation was taught for. Kept neutral in every form.
 *
 * The quadratic is what makes the shape worth having: its output does not change at a steady
 * pace, so the answer cannot be read off the rule and has to be computed from the two
 * endpoint values. Deriving `b` from a drawn rate is deliberately NOT done here, because it
 * throws up coefficients in the forties; the rate is whatever `a(p + q) + b` comes to, nudged
 * off zero when it lands there.
 */
export const d6_fun5_function_rule_l2: ItemTemplate = {
  template_id: "d6.fun5.function-rule.l2",
  node_id: FUN5_NODE,
  difficulty: 2,
  concept: "rate-from-a-function-rule",
  generate(rng: Rng) {
    const a = rng.int(1, 2);
    const p = rng.int(0, 3);
    const d = rng.int(2, 4);
    const q = p + d;
    let b = rng.int(-14, 0);
    // For this family the average rate over [p, q] is exactly a(p + q) + b, so the guard is
    // one comparison rather than a reroll: a rate of zero would make "which end is higher"
    // an empty question.
    let rate = a * (p + q) + b;
    if (rate === 0) {
      b -= 1;
      rate -= 1;
    }
    const cMag = rng.int(1, 9);
    const c = rng.int(0, 1) === 1 ? -cMag : cMag;
    const value = (x: number): number => a * x * x + b * x + c;
    const lead = a === 1 ? "x^{2}" : `${a}x^{2}`;
    const mid = b === 0 ? "" : b === -1 ? " - x" : ` - ${-b}x`;
    const tail = c < 0 ? ` - ${-c}` : ` + ${c}`;
    const rule = `f(x) = ${lead}${mid}${tail}`;
    const substituted = (x: number): string => {
      const head = a === 1 ? `(${x})^{2}` : `${a}(${x})^{2}`;
      const middle = b === 0 ? "" : b === -1 ? ` - (${x})` : ` - ${-b}(${x})`;
      return `${head}${middle}${tail}`;
    };
    const left = value(p);
    const right = value(q);
    const change = right - left;
    return {
      prompt: `For $${rule}$, find the average rate of change from $x = ${p}$ to $x = ${q}$.${ONE_NUMBER}`,
      answer: numericAnswer(String(rate)),
      params: { a, b, c, p, q, d, rate },
      hints: [
        "The average rate of change uses the two endpoint values and nothing between them, so evaluate the rule at each end of the interval first.",
        "Divide the change in the output by the change in the input, subtracting in the same direction on the top and on the bottom: the value at the right end minus the value at the left end, over the right input minus the left input.",
        "The two endpoint values fix the sign between them. If the value at the right end is the smaller of the two, the top of the fraction is negative and so is the rate, whatever the rule did in between.",
      ],
      worked_solution: [
        `Evaluate at the left end: $f(${p}) = ${substituted(p)} = ${left}$.`,
        `Evaluate at the right end: $f(${q}) = ${substituted(q)} = ${right}$.`,
        `The change in the output is $${right} - ${signed(left)} = ${change}$.`,
        `The change in the input is $${q} - ${p} = ${d}$.`,
        `Divide one by the other: $\\dfrac{${change}}{${d}} = ${rate}$.`,
        `The average rate of change from $x = ${p}$ to $x = ${q}$ is $${rate}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.rate}:${params.a}:${params.p}:${params.q}`,
};

/**
 * L2b: four marks on the chart and a named window that uses only two of them. Picking the
 * right pair out is the work; the marks outside the window are there to be left alone, which
 * is the half of the definition a learner drops first.
 */
export const d6_fun5_chart_window_l2: ItemTemplate = {
  template_id: "d6.fun5.chart-window.l2",
  node_id: FUN5_NODE,
  difficulty: 2,
  concept: "rate-over-a-named-window",
  generate(rng: Rng, ctx) {
    const t0 = rng.int(0, 2);
    const g1 = rng.int(2, 4);
    const g2 = rng.int(2, 4);
    const g3 = rng.int(2, 4);
    const m1 = rng.int(1, 7);
    const n1 = rng.int(0, 1);
    const m2 = rng.int(1, 7);
    const n2 = rng.int(0, 1);
    const m3 = rng.int(1, 7);
    const n3 = rng.int(0, 1);
    const which = rng.int(0, 2);
    const lift = rng.int(0, 12);
    const rates = [n1 === 1 ? -m1 : m1, n2 === 1 ? -m2 : m2, n3 === 1 ? -m3 : m3];
    const gaps = [g1, g2, g3];
    const hours = [t0, t0 + g1, t0 + g1 + g2, t0 + g1 + g2 + g3];
    const steps = rates.map((rate, at) => rate * (gaps[at] as number));
    const relative = [0, 0, 0, 0].map((_zero, at) =>
      steps.slice(0, at).reduce((sum, value) => sum + value, 0),
    );
    // Lift the whole trace until its lowest mark is a positive reading, so no scenario has to
    // explain a negative one.
    const base = 2 - Math.min(...relative) + lift;
    const readings = relative.map((value) => base + value);
    const rate = rates[which] as number;
    const gap = gaps[which] as number;
    const fromHour = hours[which] as number;
    const toHour = hours[which + 1] as number;
    const fromReading = readings[which] as number;
    const toReading = readings[which + 1] as number;
    const change = toReading - fromReading;
    const marks = joinMarks(
      readings.map((reading, at) => `$${reading}$ units at hour $${hours[at]}$`),
    );
    const neutralMarks = joinMarks(
      readings.map((reading, at) => `$${reading}$ at input $${hours[at]}$`),
    );
    return {
      prompt:
        ctx?.form === "practice"
          ? `A recorder's marks for one shift read ${marks}. What is the average rate of change of the reading from hour $${fromHour}$ to hour $${toHour}$, in units per hour?${ONE_NUMBER}`
          : `A quantity reads ${neutralMarks}. What is its average rate of change from $${fromHour}$ to $${toHour}$?${ONE_NUMBER}`,
      answer: numericAnswer(String(rate)),
      params: { t0, g1, g2, g3, m1, n1, m2, n2, m3, n3, which, lift, rate },
      hints: [
        "Four marks are listed and the interval the question names is bounded by only two of them, so find the reading at its start and the reading at its end before anything else.",
        "Once those two are picked out, divide the change in the reading by the change in the hours between exactly those two marks. The marks outside the interval take no part in it.",
        "The subtraction on top runs later value minus earlier value, so a window in which the trace came back down reports a negative rate.",
      ],
      worked_solution: [
        `The window named runs from hour $${fromHour}$ to hour $${toHour}$, so only those two marks are used.`,
        `The reading at hour $${fromHour}$ is $${fromReading}$ and the reading at hour $${toHour}$ is $${toReading}$, a change of $${toReading} - ${fromReading} = ${change}$.`,
        `Those two marks are $${toHour} - ${fromHour} = ${gap}$ hours apart.`,
        `Divide the change in the reading by that many hours: $\\dfrac{${change}}{${gap}} = ${rate}$.`,
        `The average rate of change over that window is $${rate}$ units per hour.`,
      ],
    };
  },
  varietyKey: (params) => `${params.rate}:${params.which}`,
};

/**
 * L3a: two windows of one trace, and the gap between what they report. Two full computations
 * and a signed subtraction, and the answer is only interesting because the two windows
 * disagree, which is the node's own point rather than a contrivance.
 */
export const d6_fun5_two_windows_l3: ItemTemplate = {
  template_id: "d6.fun5.two-windows.l3",
  node_id: FUN5_NODE,
  difficulty: 3,
  concept: "compare-two-windows",
  generate(rng: Rng, ctx) {
    const t0 = rng.int(0, 3);
    const g1 = rng.int(2, 5);
    const g2 = rng.int(2, 5);
    const m1 = rng.int(1, 8);
    const n1 = rng.int(0, 1);
    const m2 = rng.int(1, 8);
    const n2 = rng.int(0, 1);
    const lift = rng.int(0, 10);
    const first = n1 === 1 ? -m1 : m1;
    // The two windows have to disagree or the difference asked for is zero, and flipping the
    // sign of a non-zero rate is enough to guarantee it without a reroll.
    const drawn = n2 === 1 ? -m2 : m2;
    const second = drawn === first ? -drawn : drawn;
    const h0 = t0;
    const h1 = t0 + g1;
    const h2 = t0 + g1 + g2;
    const d1 = first * g1;
    const d2 = second * g2;
    const relative = [0, d1, d1 + d2];
    const base = 2 - Math.min(...relative) + lift;
    const r0 = base;
    const r1 = base + d1;
    const r2 = base + d1 + d2;
    const answer = first - second;
    return {
      prompt:
        ctx?.form === "practice"
          ? `A recorder marks $${r0}$ units at hour $${h0}$, $${r1}$ units at hour $${h1}$, and $${r2}$ units at hour $${h2}$. Work out the average rate of change per hour over each of the two windows, then give the rate from hour $${h0}$ to hour $${h1}$ minus the rate from hour $${h1}$ to hour $${h2}$.${ONE_NUMBER}`
          : `A quantity reads $${r0}$ at input $${h0}$, $${r1}$ at $${h1}$ and $${r2}$ at $${h2}$. Work out its average rate of change from $${h0}$ to $${h1}$ and from $${h1}$ to $${h2}$, then give the first of those minus the second.${ONE_NUMBER}`,
      answer: numericAnswer(String(answer)),
      params: { t0, g1, g2, m1, n1, m2, n2, lift, first, second, answer },
      hints: [
        "Each window is its own problem: take the two marks that bound it and nothing else, and finish its average rate before looking at the other window.",
        "Both rates keep the sign their own subtraction gives, so a window whose reading came back down contributes a negative rate to the comparison.",
        "The question asks for the first rate minus the second, in that order. Where the second rate is negative, subtracting it adds its size on rather than taking it off.",
      ],
      worked_solution: [
        `First window: the reading goes from $${r0}$ to $${r1}$, a change of $${r1} - ${r0} = ${d1}$, across $${h1} - ${h0} = ${g1}$ hours.`,
        `So the first window averages $\\dfrac{${d1}}{${g1}} = ${first}$ units per hour.`,
        `Second window: the reading goes from $${r1}$ to $${r2}$, a change of $${r2} - ${r1} = ${d2}$, across $${h2} - ${h1} = ${g2}$ hours.`,
        `So the second window averages $\\dfrac{${d2}}{${g2}} = ${second}$ units per hour.`,
        `Subtract in the order asked: $${first} - ${signed(second)} = ${answer}$.`,
        answer > 0
          ? `The first window's rate is the greater of the two, and the difference asked for is $${answer}$ units per hour.`
          : `The second window's rate is the greater of the two, so the difference asked for comes out negative, at $${answer}$ units per hour.`,
      ],
    };
  },
  varietyKey: (params) => `${params.first}:${params.second}`,
};

/**
 * L3b: the definition run backwards. The rate is given and a reading is missing, so the
 * learner has to spend the rate rather than compute it: a rate per hour is a change repeated
 * once for every hour the interval lasts, and a negative one comes off the starting reading.
 */
export const d6_fun5_missing_reading_l3: ItemTemplate = {
  template_id: "d6.fun5.missing-reading.l3",
  node_id: FUN5_NODE,
  difficulty: 3,
  concept: "recover-a-reading-from-the-rate",
  generate(rng: Rng, ctx) {
    const span = rng.int(2, 6);
    const t1 = rng.int(0, 5);
    const t2 = t1 + span;
    const mag = rng.int(2, 8);
    const fall = rng.int(0, 1);
    const rate = fall === 1 ? -mag : mag;
    const base = rng.int(2, 24);
    const v1 = fall === 1 ? base + mag * span : base;
    const change = rate * span;
    const v2 = v1 + change;
    return {
      prompt:
        ctx?.form === "practice"
          ? `Between hour $${t1}$ and hour $${t2}$ a recorder's trace changed at an average rate of ${latexNum(rate)} units per hour, and at hour $${t1}$ it read $${v1}$ units. What did it read at hour $${t2}$?${ONE_NUMBER}`
          : `A quantity changes at an average rate of ${latexNum(rate)} per unit of input from $${t1}$ to $${t2}$, and it reads $${v1}$ at $${t1}$. What does it read at $${t2}$?${ONE_NUMBER}`,
      answer: numericAnswer(String(v2)),
      params: { t1, t2, span, v1, v2, rate, fall },
      hints: [
        "A rate in units per hour says how far the reading moves in a single hour, so across the whole interval it moves that much once for every hour the interval lasts.",
        "Multiply the rate by the number of hours between the two marks to get the total change, then apply that total to the reading you were given.",
        "Keep the sign of the rate while applying it: a positive rate builds on the starting reading across the interval, and a negative rate comes off it.",
      ],
      worked_solution: [
        `The interval is $${t2} - ${t1} = ${span}$ hours long.`,
        `A rate of ${latexNum(rate)} units per hour repeated over $${span}$ hours is a total change of $${signed(rate)} \\times ${span} = ${change}$ units.`,
        `Apply that change to the reading at the start: $${v1} + ${signed(change)} = ${v2}$.`,
        `At hour $${t2}$ the trace read $${v2}$ units.`,
      ],
    };
  },
  varietyKey: (params) => `${params.rate}:${params.span}:${params.v2}`,
};

/** Every FUN.5 practice template, in stable authoring order (L1, L2a, L2b, L3a, L3b). */
export const FUN5_TEMPLATES: readonly ItemTemplate[] = [
  d6_fun5_two_readings_l1,
  d6_fun5_function_rule_l2,
  d6_fun5_chart_window_l2,
  d6_fun5_two_windows_l3,
  d6_fun5_missing_reading_l3,
];
