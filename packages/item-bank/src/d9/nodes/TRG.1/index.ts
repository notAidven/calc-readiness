import {
  exactRadianAnswer,
  gcd,
  type ItemTemplate,
  numericAnswer,
  type Rng,
} from "../../../template";

/**
 * TRG.1 practice templates: one heading, two units, and the turns that leave a heading where
 * it already was. Five shapes across the locked 1xL1 / 2xL2 / 2xL3 mix:
 *
 *  - L1  `deg-to-rad`        a degree measure written as an exact multiple of pi;
 *  - L2a `rad-to-deg`        the same conversion run backwards, answering a plain number;
 *  - L2b `coterminal-degree` the smallest positive heading coterminal with a given one;
 *  - L3a `coterminal-radian` the same move in radians, where the full turn has to be put over
 *        the heading's own denominator before it can be taken off;
 *  - L3b `arc-length`        `r * theta` for a radian theta, exact, so the radian measure is
 *        used as the pure number it is rather than converted first.
 *
 * ## `arc-length` answers a LENGTH through `exactRadianAnswer`, and that is deliberate
 *
 * D9_Domain_Plan.md says so explicitly and it is worth repeating at the point of use, because
 * the builder's name reads as a claim about units and is not one. What `exactRadianAnswer`
 * does is bind `pi` as an allowed symbol and require the exact representation; an arc length
 * of `6pi` meters needs both of those exactly as much as a heading of `2pi/3` radians does.
 * No prompt below writes a unit into the typed answer either way.
 *
 * ## What the checker settled before any of this was written
 *
 * From the plan's spike, graded through the real v2 checker rather than read off the
 * equivalence spec, against key `5pi/6`:
 *
 *  - `5pi/6`, `5*pi/6`, `(5/6)pi` and `5/6 pi` all grade `correct/match`, so the keys here are
 *    written star-free and no prompt insists on one spelling.
 *  - `8pi/6` grades `correct/match` against key `4pi/3`. **A pi answer does not have to be in
 *    lowest terms**, so no prompt below asks for one reduced, and the two hints that mention
 *    reducing say in the same breath that an unreduced answer grades the same. A prompt
 *    demanding lowest terms would be demanding something the grader does not enforce, which is
 *    the way a learner comes to distrust the field.
 *  - `2.618` grades `incorrect/wrong_representation`. **A decimal coefficient on pi is
 *    rejected**, so every prompt here asks for a fraction (or a whole number) times pi and
 *    names the ASCII spelling.
 *
 * ## Why no hint here writes a digit against `pi`, and why no answer is bare `pi`
 *
 * `hint_leaks_answer` normalizes a hint by stripping whitespace and lowercasing it, and then
 * looks for the answer key bounded only by digits. Two consequences shape the hints below.
 * A key like `6pi` would leak from any hint that happened to write `6\pi`, so the hints name
 * the radius and the fraction instead of ever substituting into them. And a key of bare `pi`
 * would leak from the word "pi" ANYWHERE in a hint, including inside `$\pi$` itself and inside
 * an ordinary English word that contains those two letters, which would make the template
 * unauthorable for one draw out of many rather than for all of them. Both radian templates
 * therefore exclude the draw whose answer is a bare `pi`: `coterminal-radian` by refusing a
 * numerator equal to its denominator, and `arc-length` by redrawing when the coefficient
 * lands on one.
 *
 * ## Seeding note
 *
 * Shape seeded from *Precalculus: An Investigation of Functions* (Lippman & Rasmussen),
 * catalogued at opentextbookstore.com under Precalculus and licensed CC BY-SA: its "Circles"
 * and "Angles" sections run degree/radian conversion, coterminal angles and arc length as
 * consecutive exercise sets in that order, which is the escalation used here. Nothing is
 * transcribed. The book's exercises are largely stated on a fixed circle radius and several of
 * its arc-length answers are decimal, which the `wrong_representation` finding above rules
 * out, so every instance here is re-derived by hand on exact multiples of pi and every value
 * is redrawn by `generate()`.
 */

export const TRG1_NODE = "TRG.1";

/**
 * The degree measures both conversion templates draw from: every multiple of 15 strictly
 * inside one turn whose radian form still carries a denominator.
 *
 * Multiples of 15 because 15 divides 180, so `deg/180` always reduces to a small bar and the
 * L1 tier is testing the CONVERSION rather than arithmetic with an awkward fraction. 180 and
 * 360 are left out on purpose: both reduce to a whole number of pi, which is the one shape
 * whose answer key carries no bar at all, and a cell that served it would be teaching the
 * conversion on the instance where the interesting half of the notation disappears.
 */
const CONVERT_DEGREES: readonly number[] = [
  30, 45, 60, 75, 90, 105, 120, 135, 150, 210, 225, 240, 270, 300, 315, 330,
];

/** `n/d` times pi as LaTeX, with `d === 1` printing as a bare multiple. */
function radTex(numerator: number, denominator: number): string {
  const sign = numerator < 0 ? "-" : "";
  const size = Math.abs(numerator);
  const top = size === 1 ? "\\pi" : `${size}\\pi`;
  return denominator === 1 ? `${sign}${top}` : `${sign}\\dfrac{${top}}{${denominator}}`;
}

/**
 * The same value as the learner types it. Star-free (`5pi/6` rather than `5*pi/6`) because the
 * spike graded both `correct/match` and the shorter one is what the prompts show.
 */
function radKey(numerator: number, denominator: number): string {
  const sign = numerator < 0 ? "-" : "";
  const size = Math.abs(numerator);
  const top = size === 1 ? "pi" : `${size}pi`;
  return denominator === 1 ? `${sign}${top}` : `${sign}${top}/${denominator}`;
}

/**
 * The typed spelling every pi prompt shows, chosen so it is never an answer.
 *
 * A worked example inside a prompt that happens to coincide with that draw's answer hands the
 * answer over, and it would do it on a minority of seeds, which is the kind of leak that
 * survives a spot check. No template here can reach a denominator of nine: the conversion pair
 * reduces `deg/180` for a `deg` that is a multiple of 15, and the two radian templates draw
 * their denominators from a fixed short list. So this example is unreachable by construction
 * rather than by inspection of a sample.
 */
const TYPED_EXAMPLE = "7pi/9";

/**
 * L1, degrees to exact radians. The conversion stated in the direction the learner meets it
 * in: one factor, applied once, and the only judgement is which way up the factor goes.
 *
 * The wrong turning is the whole point of the tier. A learner who multiplies by
 * `180/pi` instead gets a number with no pi in it at all, which the field rejects as a
 * representation rather than marking a near miss, so the error announces itself.
 */
export const d9_trg1_deg_to_rad_l1: ItemTemplate = {
  template_id: "d9.trg1.deg-to-rad.l1",
  node_id: TRG1_NODE,
  difficulty: 1,
  concept: "degrees-to-exact-radians",
  generate(rng: Rng) {
    const degrees = CONVERT_DEGREES[rng.int(0, CONVERT_DEGREES.length - 1)] ?? 30;
    const divisor = gcd(degrees, 180);
    const top = degrees / divisor;
    const bottom = 180 / divisor;
    return {
      prompt: `The pad shows a dish heading of $${degrees}^{\\circ}$. The controller wants that same heading in radians. Give it as a fraction times $\\pi$, typing pi for $\\pi$, for example ${TYPED_EXAMPLE}.`,
      answer: exactRadianAnswer(radKey(top, bottom)),
      params: { degrees, top, bottom },
      hints: [
        "A half turn has two names for one angle: $180^{\\circ}$ and $\\pi$ radians. That single fact is the whole conversion.",
        "Because those two measure the same turn, $\\dfrac{\\pi}{180^{\\circ}}$ is worth one, and multiplying by it changes the unit without moving the dish. So the degree measure goes underneath a $180$, with $\\pi$ left on top.",
        "Then divide the top and the bottom by the largest number that goes into both. An unreduced bar grades the same, so this last step is for readability rather than for the grader.",
      ],
      worked_solution: [
        `A half turn is $180^{\\circ}$ and it is also $\\pi$ radians, so $\\dfrac{\\pi}{180^{\\circ}}$ is worth one and multiplying by it changes only the unit.`,
        `Multiplying the heading by it gives $${degrees}^{\\circ} \\times \\dfrac{\\pi}{180^{\\circ}} = \\dfrac{${degrees}\\pi}{180}$.`,
        `Both numbers divide by $${divisor}$, which leaves $${radTex(top, bottom)}$.`,
        `So the heading is $${radTex(top, bottom)}$ radians, typed as ${radKey(top, bottom)}.`,
      ],
    };
  },
  varietyKey: (params) => `deg:${params.degrees ?? 0}`,
};

/**
 * L2a, radians back to degrees. The step up from L1 is that the factor now has to be inverted
 * and the pi has to CANCEL, so a learner cannot get through by pattern-matching "put it over
 * 180": doing that here leaves a pi in an answer the field wants as a plain number.
 *
 * `numericAnswer` rather than `exactRadianAnswer`, per the plan's table, because the answer
 * carries no pi at all once the cancellation has happened.
 */
export const d9_trg1_rad_to_deg_l2: ItemTemplate = {
  template_id: "d9.trg1.rad-to-deg.l2",
  node_id: TRG1_NODE,
  difficulty: 2,
  concept: "exact-radians-to-degrees",
  generate(rng: Rng) {
    const degrees = CONVERT_DEGREES[rng.int(0, CONVERT_DEGREES.length - 1)] ?? 30;
    const divisor = gcd(degrees, 180);
    const top = degrees / divisor;
    const bottom = 180 / divisor;
    return {
      prompt: `The controller reports a dish heading of $${radTex(top, bottom)}$ radians. Give that same heading in degrees. Enter one number, with no degree sign.`,
      answer: numericAnswer(`${degrees}`),
      params: { degrees, top, bottom },
      hints: [
        "A half turn has two names for one angle: $180^{\\circ}$ and $\\pi$ radians. That single fact is the whole conversion.",
        "Going this way, the factor worth one is $\\dfrac{180^{\\circ}}{\\pi}$. Multiply the heading by it and the two $\\pi$ symbols cancel, which is what leaves a plain number of degrees behind.",
        "So the top of the fraction is multiplied by $180$ and the bottom divides into it.",
      ],
      worked_solution: [
        `A half turn is $\\pi$ radians and it is also $180^{\\circ}$, so this time the factor worth one is $\\dfrac{180^{\\circ}}{\\pi}$.`,
        `Multiplying gives $${radTex(top, bottom)} \\times \\dfrac{180^{\\circ}}{\\pi}$, and the $\\pi$ on the top cancels the $\\pi$ on the bottom.`,
        `What is left is $\\dfrac{${top} \\times 180}{${bottom}} = ${degrees}$.`,
        `So the heading is $${degrees}^{\\circ}$, entered as ${degrees}.`,
      ],
    };
  },
  varietyKey: (params) => `rad:${params.top ?? 0}:${params.bottom ?? 0}`,
};

/**
 * L2b, the smallest positive coterminal heading in degrees. Two draws of one idea, and the
 * second is the one that does the teaching: a heading BELOW zero needs turns added rather than
 * taken away, and a learner who has memorized "subtract 360" runs further from the window
 * instead of into it.
 *
 * Two turns as well as one, so the answer cannot be reached by applying the move once and
 * stopping. Both hints and both worked-solution branches are written to fit either sign, since
 * a hint that only arrived for the positive draw would announce which draw the learner had.
 */
export const d9_trg1_coterminal_degree_l2: ItemTemplate = {
  template_id: "d9.trg1.coterminal-degree.l2",
  node_id: TRG1_NODE,
  difficulty: 2,
  concept: "smallest-positive-coterminal-degree",
  generate(rng: Rng) {
    // Multiples of 15 strictly inside one turn, so the answer is a heading a learner can
    // picture and 0 is never the answer (the prompt asks for the smallest POSITIVE one).
    const base = 15 * rng.int(1, 23);
    const turns = rng.int(1, 2);
    const clockwise = rng.int(0, 1) === 1;
    const given = clockwise ? base - 360 * turns : base + 360 * turns;

    const chain: number[] = [];
    let running = given;
    for (let step = 0; step < turns; step += 1) {
      running = clockwise ? running + 360 : running - 360;
      chain.push(running);
    }
    const arithmetic = chain
      .map((value, index) => {
        const from = index === 0 ? given : (chain[index - 1] ?? given);
        return `$${from} ${clockwise ? "+" : "-"} 360 = ${value}$`;
      })
      .join(", then ");

    return {
      prompt: `A dish ends a sweep at a heading of $${given}^{\\circ}$. Give the smallest positive heading coterminal with it, in degrees. Enter one number, with no degree sign.`,
      answer: numericAnswer(`${base}`),
      params: { given, base, turns, clockwise: clockwise ? 1 : 0 },
      hints: [
        "Coterminal headings leave the dish pointing the same way, and they differ by a whole number of full turns. One full turn is $360^{\\circ}$.",
        "So a whole turn can be added or taken away as often as you like without the dish moving. Keep going until what is left sits below one full turn and still above zero.",
        "Which way you go depends on where the heading starts: one above a full turn has turns taken away, and one below zero has them added.",
      ],
      worked_solution: [
        `Coterminal headings differ by a whole number of full turns, and a full turn is $360^{\\circ}$, so adding or removing one leaves the dish pointing the same way.`,
        clockwise
          ? `This heading is below $0^{\\circ}$, so full turns are ADDED until what is left is positive.`
          : `This heading is at or above $360^{\\circ}$, so full turns are taken away until what is left is under one turn.`,
        `That takes ${turns === 1 ? "one turn" : "two turns"}: ${arithmetic}.`,
        `The result sits between $0^{\\circ}$ and $360^{\\circ}$, so the smallest positive coterminal heading is $${base}^{\\circ}$, entered as ${base}.`,
      ],
    };
  },
  varietyKey: (params) => `given:${params.given ?? 0}`,
};

/**
 * Denominators the radian coterminal template draws from.
 *
 * Kept to denominators that divide 12, so a full turn `2pi` is a whole number of the
 * heading's own twelfths, sixths, quarters or thirds and the subtraction happens on the TOP
 * with the bar untouched. That is the move the tier is about, and a denominator like 5 would
 * replace it with an unrelated common-denominator step.
 */
const RADIAN_DENOMINATORS: readonly number[] = [3, 4, 6, 12];

/**
 * L3a, the same coterminal move in radians. Harder than its degree twin for one reason that is
 * worth naming: the full turn is `2pi`, and it cannot be taken off a heading written over a
 * denominator until it has been rewritten over that same denominator. A learner who subtracts
 * `2` from the numerator has done the arithmetic the degree version taught and landed nowhere
 * near the answer.
 */
export const d9_trg1_coterminal_radian_l3: ItemTemplate = {
  template_id: "d9.trg1.coterminal-radian.l3",
  node_id: TRG1_NODE,
  difficulty: 3,
  concept: "coterminal-heading-in-exact-radians",
  generate(rng: Rng) {
    const bottom = RADIAN_DENOMINATORS[rng.int(0, RADIAN_DENOMINATORS.length - 1)] ?? 3;
    // A numerator anywhere inside one turn EXCEPT the one equal to the denominator. That draw
    // is the half turn, whose answer reduces to a bare `pi`, and a bare `pi` key leaks from
    // any hint containing those two letters (see the module comment).
    let top = rng.int(1, 2 * bottom - 1);
    while (top === bottom) {
      top = rng.int(1, 2 * bottom - 1);
    }
    const turns = rng.int(1, 2);
    const clockwise = rng.int(0, 1) === 1;
    const fullTurn = 2 * bottom;
    const givenTop = clockwise ? top - fullTurn * turns : top + fullTurn * turns;

    const divisor = gcd(top, bottom);
    const reducedTop = top / divisor;
    const reducedBottom = bottom / divisor;

    const chain: number[] = [];
    let running = givenTop;
    for (let step = 0; step < turns; step += 1) {
      running = clockwise ? running + fullTurn : running - fullTurn;
      chain.push(running);
    }
    const arithmetic = chain
      .map((value, index) => {
        const from = index === 0 ? givenTop : (chain[index - 1] ?? givenTop);
        return `$${from} ${clockwise ? "+" : "-"} ${fullTurn} = ${value}$`;
      })
      .join(", then ");

    return {
      prompt: `A dish ends a sweep at a heading of $${radTex(givenTop, bottom)}$ radians. Give the coterminal heading that lies in $[0, 2\\pi)$, as a fraction times $\\pi$, typing pi for $\\pi$, for example ${TYPED_EXAMPLE}.`,
      answer: exactRadianAnswer(radKey(reducedTop, reducedBottom)),
      params: {
        givenTop,
        bottom,
        top,
        reducedTop,
        reducedBottom,
        turns,
        clockwise: clockwise ? 1 : 0,
      },
      hints: [
        "Coterminal headings leave the dish pointing the same way, and they differ by a whole number of full turns. In radians one full turn is $2\\pi$.",
        `A full turn cannot come off the top until it is written over the same bottom the heading already has. With a bottom of $${bottom}$, one full turn is $\\dfrac{${fullTurn}\\pi}{${bottom}}$.`,
        `Now add or take away that many from the top, as often as it takes, until the top lands between $0$ and $${fullTurn}$. Reducing the bar afterwards is optional: an unreduced answer grades the same.`,
      ],
      worked_solution: [
        `Coterminal headings differ by a whole number of full turns, and in radians a full turn is $2\\pi$.`,
        `Over this heading's own bottom that turn is $2\\pi = \\dfrac{${fullTurn}\\pi}{${bottom}}$, so a turn is ${clockwise ? "added to" : "taken off"} the top and the bottom never changes.`,
        `${clockwise ? `The heading is below $0$, so turns are added` : `The heading is at or above $2\\pi$, so turns are removed`}, ${turns === 1 ? "once" : "twice"}: ${arithmetic}.`,
        divisor === 1
          ? `That leaves $${radTex(top, bottom)}$, whose top is already between $0$ and $${fullTurn}$.`
          : `That leaves $${radTex(top, bottom)}$, and dividing top and bottom by $${divisor}$ writes it as $${radTex(reducedTop, reducedBottom)}$.`,
        `So the coterminal heading is $${radTex(reducedTop, reducedBottom)}$, typed as ${radKey(reducedTop, reducedBottom)}.`,
      ],
    };
  },
  varietyKey: (params) => `rad-given:${params.givenTop ?? 0}:${params.bottom ?? 0}`,
};

/**
 * L3b, arc length. The slot where the radian measure stops being a way of naming an angle and
 * starts being the pure number that multiplies a radius, which is the reason the unit exists
 * and the thing a degree measure cannot do.
 *
 * The coefficient is allowed to stay a fraction. Forcing the radius to be a multiple of the
 * denominator would make every answer a whole number of pi and would quietly teach that arc
 * length always comes out that way; leaving it free means half the cell answers `15pi/2` and
 * the learner has to carry the bar through the multiplication.
 *
 * See the module comment on why the answer is an `exactRadianAnswer` even though it is a
 * length in meters, and on why a coefficient of one is redrawn.
 */
export const d9_trg1_arc_length_l3: ItemTemplate = {
  template_id: "d9.trg1.arc-length.l3",
  node_id: TRG1_NODE,
  difficulty: 3,
  concept: "arc-length-from-a-radian-angle",
  generate(rng: Rng) {
    const bottom = rng.pick([2, 3, 4, 6]);
    let radius = rng.int(3, 12);
    let top = rng.int(1, 2 * bottom - 1);
    let divisor = gcd(radius * top, bottom);
    // Redraw the one instance whose answer is a bare `pi`: that key leaks from any hint
    // containing those two letters, including inside `$\pi$` itself.
    while ((radius * top) / divisor === 1 && bottom / divisor === 1) {
      radius = rng.int(3, 12);
      top = rng.int(1, 2 * bottom - 1);
      divisor = gcd(radius * top, bottom);
    }
    const arcTop = (radius * top) / divisor;
    const arcBottom = bottom / divisor;

    return {
      prompt: `A steerable dish has a radius of $${radius}$ meters, and its rim sweeps through an angle of $${radTex(top, bottom)}$ radians. How far does a point on the rim travel? Give the exact distance in meters as a number times $\\pi$, typing pi for $\\pi$, for example ${TYPED_EXAMPLE}.`,
      answer: exactRadianAnswer(radKey(arcTop, arcBottom)),
      params: { radius, top, bottom, arcTop, arcBottom },
      hints: [
        "The distance along a rim is the radius times the angle swept, and that shortcut holds only when the angle is measured in radians. This one already is, so there is nothing to convert first.",
        "So multiply the radius by the fraction standing in front of $\\pi$, and leave the $\\pi$ in the answer instead of turning the whole thing into a decimal.",
        "The radius multiplies the TOP of that fraction and the bottom is left alone. Reducing what comes out is optional: an unreduced coefficient grades the same.",
      ],
      worked_solution: [
        `A radian angle multiplies a radius directly, so the arc length is $s = r\\theta$ with no conversion beforehand.`,
        `Here that reads $s = ${radius} \\times ${radTex(top, bottom)}$, and the radius multiplies the top of the fraction.`,
        divisor === 1
          ? `The top becomes $${radius} \\times ${top} = ${radius * top}$, so $s = ${radTex(arcTop, arcBottom)}$.`
          : `The top becomes $${radius} \\times ${top} = ${radius * top}$, and dividing top and bottom by $${divisor}$ writes that as $${radTex(arcTop, arcBottom)}$.`,
        `So a point on the rim travels $${radTex(arcTop, arcBottom)}$ meters, typed as ${radKey(arcTop, arcBottom)}.`,
      ],
    };
  },
  varietyKey: (params) =>
    `arc:${params.radius ?? 0}:${params.top ?? 0}:${params.bottom ?? 0}`,
};

/** The node's five templates, in the locked 1xL1 / 2xL2 / 2xL3 order. */
export const TRG1_TEMPLATES: readonly ItemTemplate[] = [
  d9_trg1_deg_to_rad_l1,
  d9_trg1_rad_to_deg_l2,
  d9_trg1_coterminal_degree_l2,
  d9_trg1_coterminal_radian_l3,
  d9_trg1_arc_length_l3,
];
