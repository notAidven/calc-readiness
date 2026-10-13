/**
 * Worked-solution figures for the nine D9 CHECKS, whose questions no practice template asks.
 *
 * Every one of them reuses the component its own node's practice figures are drawn with, which
 * is what keeps a check looking like the lesson it ends: the coterminal loops for TRG.1, the
 * guy-wire triangle for TRG.2, the unit circle for TRG.3 and TRG.7 and TRG.8, the pad and its
 * two dropped coordinates for TRG.4, the wave and its midline for TRG.5, the break line for
 * TRG.6, the quadrant triangle for TRG.9. Nothing here is a new drawing.
 *
 * Three of them needed one option each, and each option is the same shape of gap: the pooled
 * item is graded on the row its figure already closes with, and the CHECK asks one question
 * further. `d9.trg4.pythagorean-solve.l3` stops at the recovered reading and the check divides
 * it; `d9.trg5.amplitude.l1` measures the swing and the check wants its far end;
 * `d9.trg8.linear-in-trig.l3` is graded on the roster and the check asks which heading of it is
 * larger. So each takes a defaulted-off closing line, and the pooled shapes render exactly as
 * before. Sideways imports between `worked/` modules are safe; only an import of the REGISTRY
 * would make a cycle.
 *
 * None of these answers is composite: each is one heading, one length, one reading or one
 * multiple of pi, so no figure here splits its answer across rows. What they do owe is the
 * whole of that one answer in a form a learner could type, which is why the two RADIAN checks
 * say their answer twice: once typeset as $\dfrac{\pi}{4}$, and once in the caption as the
 * `pi/4` the answer field actually grades.
 *
 * Everything is recomputed from the params by the same route `generate()` took, with a default
 * for every key, and every label is typeset through `SvgMath` rather than `<text>`.
 */

import { CIVIC, LABEL, SOFT } from "../svgKit";
import { gcd, numStr, type WorkedSolutionVisual } from "../workedKit";
import { CoterminalWorked, radSpoken, radTex } from "./d9TRG1";
import { type Side, TriangleWorked } from "./d9TRG2";
import {
  exactTex as circleExactTex,
  degreeSubtraction,
  NUMERAL,
  quadrantOf,
  referenceOf,
  UnitCircleWorked,
} from "./d9TRG3";
import { PythagoreanSolveWorked } from "./d9TRG4";
import { AmplitudeWorked } from "./d9TRG5";
import { BreakLine, piSpoken, piTex } from "./d9TRG6";
import { ComposeWorked, specialValueTex, type TrigKind } from "./d9TRG7";
import {
  FN_TEX,
  FN_WORD,
  fnOf,
  levelFor,
  placements,
  quadrantWords,
  RosterCircleWorked,
  rosterSpoken,
  rosterTex,
  signedTex,
} from "./d9TRG8";
import { QUADRANT_WORD, QuadrantTriangleWorked, signedFracTex } from "./d9TRG9";

/* --------------------------------------------------------------- shared reconstructions */

/** A degree measure as a reduced multiple of pi, by the route the two radian checks take. */
function radianParts(degrees: number): { top: number; bottom: number } {
  const divisor = gcd(degrees, 180) || 1;
  return { top: degrees / divisor, bottom: 180 / divisor };
}

/**
 * The spelling the answer field grades, which is the one thing a typeset fraction cannot show.
 *
 * `\dfrac{\pi}{4}` is the answer and `pi/4` is the answer TYPED, and a learner opening this
 * reveal is about to type something. Mirrors `radianForms`'s first entry in `cfuVariants.ts`,
 * which is the string the reveal prints beside the figure.
 */
function typedRadian(top: number, bottom: number): string {
  const head = top === 1 ? "pi" : `${top}pi`;
  return bottom === 1 ? head : `${head}/${bottom}`;
}

/** The ordinals D9's prompts name their quadrants with. */
const ORDINAL: Record<number, string> = {
  1: "first",
  2: "second",
  3: "third",
  4: "fourth",
};

/**
 * Twice the value of `fn` at a special reference angle, which is the constant TRG.8's check
 * writes into its equation.
 *
 * Function-dependent rather than angle-dependent, and that is the whole of it: across
 * $30^{\circ}$, $45^{\circ}$ and $60^{\circ}$ a sine climbs and a cosine falls, so one table
 * over the reference angle alone is right for one of them and wrong for the other.
 */
function rootConstantTex(sine: boolean, reference: number): string {
  if (reference === 45) {
    return "\\sqrt{2}";
  }
  if (sine) {
    return reference === 30 ? "1" : "\\sqrt{3}";
  }
  return reference === 30 ? "\\sqrt{3}" : "1";
}

/* ------------------------------------------------------------------------- the registry */

export const CFU_D9_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  /*
   * TRG.1: the surplus turn is drawn, and the conversion is written under it.
   *
   * Two moves in one question, and the loops carry the first of them. A learner who thinks a
   * bigger measure points somewhere else is looking at the one picture where the extra turn
   * ends where it began, and the arithmetic below it changes only the unit.
   */
  "cfu.trg1.coterminal-radian": {
    Svg: ({ base = 45, turns = 1 }) => {
      const { top, bottom } = radianParts(base);
      const given = base + 360 * turns;
      return (
        <CoterminalWorked
          degrees={base}
          givenTex={`${given}^{\\circ}`}
          answerTex={radTex(top, bottom)}
          // The loops are the surplus turns of a sweep measured in DEGREES; the change of
          // unit is the second row, after they have been stripped.
          turnTex="360^{\circ}"
          turns={turns}
          clockwise={false}
          rows={[
            `${given}^{\\circ} - ${360 * turns}^{\\circ} = ${base}^{\\circ}`,
            `${base}^{\\circ} \\times \\dfrac{\\pi}{180^{\\circ}} = ${radTex(top, bottom)}`,
          ]}
          ariaLabel={`A circle with one terminal side at ${radSpoken(top, bottom)} radians. The ${turns === 1 ? "one full turn" : "two full turns"} between it and the swept ${given} degrees are drawn as dashed loops that end where they began.`}
          title="Stripping the surplus turns off a heading, then changing its unit"
        />
      );
    },
    caption: ({ base = 45, turns = 1 }) => {
      const { top, bottom } = radianParts(base);
      const given = base + 360 * turns;
      const loops =
        turns === 1
          ? "The dashed loop inside the rim is the whole turn"
          : "The two dashed loops inside the rim are the whole turns";
      return `${loops} the sweep made before it stopped, and ${turns === 1 ? "it ends" : "they end"} exactly where ${turns === 1 ? "it began" : "they began"}: $${given}^{\\circ}$ and $${base}^{\\circ}$ put the dish in the same place, so the smaller is the one the question wants. Changing the unit is a separate move that moves nothing, since $\\dfrac{\\pi}{180^{\\circ}}$ is worth one, and it leaves $${radTex(top, bottom)}$ radians, typed as ${typedRadian(top, bottom)}.`;
    },
  },

  /*
   * TRG.2: the complement first, then the pair of sides the ratio names.
   *
   * The triangle is drawn to the shape its own numbers describe, so the angle written at the
   * pad is the angle the outline opens by. What the figure exists to settle is which two of
   * the three lengths the question mentions, which is where this check is lost and is not
   * something a column of arithmetic can show.
   */
  "cfu.trg2.wire-length": {
    Svg: ({ masthead = 30, given = 20, asksWire = 1 }) => {
      const pad = 90 - masthead;
      const wantsWire = asksWire === 1;
      const answer = wantsWire ? 2 * given : given / 2;
      // From the pad the deck run lies alongside and the mast rises across, so a pad angle of
      // 60 degrees pairs the deck run with the wire and one of 30 degrees pairs the mast.
      const alongDeck = pad === 60;
      const leg: Side = alongDeck ? "base" : "up";
      const answered: Side = wantsWire ? "hyp" : leg;
      const supplied: Side = wantsWire ? leg : "hyp";
      const wire = wantsWire ? answer : given;
      const radians = (pad * Math.PI) / 180;
      const label = (side: Side): string =>
        side === supplied ? numStr(given) : side === answered ? numStr(answer) : "";
      return (
        <TriangleWorked
          upLength={wire * Math.sin(radians)}
          baseLength={wire * Math.cos(radians)}
          upLabel={label("up")}
          baseLabel={label("base")}
          hypLabel={label("hyp")}
          angleLabel={`${pad}^{\\circ}`}
          cornerLabel={`${masthead}^{\\circ}`}
          // BOTH sides the ratio compares, which is what the prop means and what the caption
          // below says: the point of the figure is which two of the three lengths the question
          // is about, and inking only the answered one leaves the third looking equally
          // uninvolved when it is the one taking no part.
          answered={[answered, supplied]}
          rows={[
            `90^{\\circ} - ${masthead}^{\\circ} = ${pad}^{\\circ}`,
            `\\${alongDeck ? "cos" : "sin"} ${pad}^{\\circ} = \\dfrac{1}{2}`,
            `${wantsWire ? "c" : "x"} = ${numStr(answer)}`,
          ]}
          ariaLabel={`A guy wire meeting the mast at ${masthead} degrees and the deck at ${pad} degrees, with ${wantsWire ? "the wire" : alongDeck ? "the deck run" : "the mast"} measuring ${answer} meters`}
          title="The mast, the deck run and the wire as one right triangle"
        />
      );
    },
    caption: ({ masthead = 30, given = 20, asksWire = 1 }) => {
      const pad = 90 - masthead;
      const wantsWire = asksWire === 1;
      const answer = wantsWire ? 2 * given : given / 2;
      const alongDeck = pad === 60;
      const legWord = alongDeck ? "the deck run" : "the mast";
      const ratioName = alongDeck ? "cosine" : "sine";
      const answerWord = wantsWire
        ? "the wire"
        : alongDeck
          ? "the deck run out to the pad"
          : "the height up the mast";
      return `The corner at the foot of the mast is square, so the two acute corners share what is left of a quarter turn and the angle at the pad comes out at $90^{\\circ} - ${masthead}^{\\circ} = ${pad}^{\\circ}$. From the pad, ${legWord} and the wire are the pair the ${ratioName} compares, and both are inked green here while the third side takes no part in it. At $${pad}^{\\circ}$ that ratio is exactly $\\dfrac{1}{2}$, so ${answerWord} measures $${answer}$ meters.`;
    },
  },

  /*
   * TRG.3: which coordinate, then the quadrant's two jobs.
   *
   * The reading asked for is drawn as a dashed drop onto its own axis, so the horizontal reach
   * and the vertical reach are two visibly different lengths rather than two words. The
   * quadrant then does both remaining jobs at once, choosing the subtraction and the sign, and
   * the figure shows the first as an arc and the second as the side of the axis the drop falls
   * on.
   */
  "cfu.trg3.circle-cosine": {
    Svg: ({ isSine = 0, deg = 240 }) => {
      const sine = isSine === 1;
      const quadrant = quadrantOf(deg);
      const reference = referenceOf(deg);
      const negative = sine ? quadrant >= 3 : quadrant === 2 || quadrant === 3;
      const symbol = sine ? "\\sin" : "\\cos";
      return (
        <UnitCircleWorked
          deg={deg}
          referenceTex={`${reference}^{\\circ}`}
          along={sine ? undefined : circleExactTex(reference, negative, false)}
          across={sine ? circleExactTex(reference, negative, true) : undefined}
          highlight={sine ? "across" : "along"}
          rows={[
            `\\text{the ${sine ? "second" : "first"} coordinate}`,
            degreeSubtraction(deg),
            `${symbol} ${deg}^{\\circ} = ${circleExactTex(reference, negative, sine)}`,
          ]}
          ariaLabel={`A heading of ${deg} degrees on the unit circle, with its acute angle back to the horizontal axis marked and the exact ${sine ? "vertical" : "horizontal"} reach of its point written on`}
          title="One reference angle for the size, and the quadrant for the sign"
        />
      );
    },
    caption: ({ isSine = 0, deg = 240 }) => {
      const sine = isSine === 1;
      const quadrant = quadrantOf(deg);
      const reference = referenceOf(deg);
      const negative = sine ? quadrant >= 3 : quadrant === 2 || quadrant === 3;
      const symbol = sine ? "\\sin" : "\\cos";
      return `The ${sine ? "vertical" : "horizontal"} reach of the tip is the ${sine ? "second" : "first"} coordinate of the point, which is $${symbol} ${deg}^{\\circ}$, and it is the dashed drop drawn in green. The quadrant then settles both of the moves that are left: the acute angle back to the horizontal axis is $${reference}^{\\circ}$, which fixes the size, and Quadrant ${NUMERAL[quadrant] ?? "I"} puts the point ${negative ? "on the far side of the axis, so the reading is negative" : "on the near side of the axis, so the reading is positive"}. That gives $${symbol} ${deg}^{\\circ} = ${circleExactTex(reference, negative, sine)}$.`;
    },
  },

  /*
   * TRG.4: the identity, the quadrant's choice of root, and then the division.
   *
   * The point is drawn at the item's own coordinates, so the sign in the third row is a
   * description of the picture rather than a claim printed beside it. The fourth row is the
   * one the pooled item has no need of: this check is graded on the quotient, and a figure
   * closing on the recovered reading would look finished having answered the step before.
   */
  "cfu.trg4.quadrant-tangent": {
    Svg: ({ opposite = 4, adjacent = 3, hyp = 5, quadrant = 3, givenSine = 1 }) => {
      const tangentSign = quadrant === 1 || quadrant === 3 ? 1 : -1;
      return (
        <PythagoreanSolveWorked
          a={opposite}
          b={adjacent}
          c={hyp}
          quadrant={quadrant}
          given={givenSine === 1 ? 0 : 1}
          closingTex={`\\tan\\theta = ${signedFracTex(tangentSign * opposite, adjacent)}`}
        />
      );
    },
    caption: ({ opposite = 4, adjacent = 3, hyp = 5, quadrant = 3, givenSine = 1 }) => {
      const sine = givenSine === 1;
      const missingWord = sine ? "horizontal" : "vertical";
      const missingNegative = sine ? quadrant === 2 || quadrant === 3 : quadrant >= 3;
      const missingTop = sine ? adjacent : opposite;
      const tangentSign = quadrant === 1 || quadrant === 3 ? 1 : -1;
      return `$\\sin^{2}\\theta + \\cos^{2}\\theta = 1$ recovers the SIZE of the reading that was withheld, $\\dfrac{${missingTop}}{${hyp}}$, and a square root offers that size with either sign. The picture is what chooses between them: the point sits in the ${ORDINAL[quadrant] ?? "first"} quadrant, where the ${missingWord} coordinate is ${missingNegative ? "negative" : "positive"}. Only then is there anything to divide, and the quotient identity finishes it as $\\tan\\theta = ${signedFracTex(tangentSign * opposite, adjacent)}$, ${tangentSign > 0 ? "positive because the two readings carry the same sign" : "negative because the two readings carry opposite signs"}.`;
    },
  },

  /*
   * TRG.5: the level the trace swings about, and the far end of the swing.
   *
   * The arrow is the amplitude and the answer is where the arrow ENDS, which is the whole
   * distinction the check is built on. Drawing the level it reaches in the answer color, and
   * leaving its twin dashed away, is what stops the figure agreeing with a learner who read
   * the number out front and stopped.
   */
  "cfu.trg5.max-value": {
    Svg: ({ amplitude = 3, coefficient = 2, midline = -1, wantsMax = 1, isSine = 1 }) => (
      <AmplitudeWorked
        a={amplitude}
        b={coefficient}
        d={midline}
        fn={isSine === 1 ? 0 : 1}
        extreme={wantsMax === 1 ? "max" : "min"}
      />
    ),
    caption: ({ amplitude = 3, coefficient = 2, midline = -1, wantsMax = 1 }) => {
      const max = wantsMax === 1;
      const answer = max ? midline + amplitude : midline - amplitude;
      return `The constant on the end sets the level the signal swings about, ruled across the plot at $y = ${midline}$, and the number out front is how far it reaches from that level. The coefficient $${coefficient}$ inside changes only how often the cycle comes around, which is why it appears nowhere in the arithmetic. So the arrow measures $${amplitude}$ and the answer is the level its far end lands on: $${midline} ${max ? "+" : "-"} ${amplitude} = ${answer}$.`;
    },
  },

  /*
   * TRG.6: the first break, drawn beside the period it is half of.
   *
   * The gap next door is the distractor made visible. A learner who answered the period is not
   * confused about tangents, they measured the wrong one of two lengths sitting side by side,
   * and this is the picture where those two lengths are both drawn.
   */
  "cfu.trg6.first-asymptote": {
    Svg: ({ outside = 1, inside = 3 }) => (
      <BreakLine
        marks={[
          { at: 0.08, label: piTex(-1, 2 * inside) },
          { at: 0.5, label: piTex(1, 2 * inside), answer: true },
          { at: 0.92, label: piTex(3, 2 * inside) },
        ]}
        span={{ from: 1, to: 2, label: `\\text{period } ${piTex(1, inside)}` }}
        rows={[
          `y = ${outside === 1 ? "" : outside}\\tan(${inside}x)`,
          `${inside}x = \\dfrac{\\pi}{2} \\;\\Rightarrow\\; x = ${piTex(1, 2 * inside)}`,
        ]}
        ariaLabel={`A tangent graph whose first positive break is at ${piSpoken(1, 2 * inside)}, half of its period of ${piSpoken(1, inside)}`}
        title="The first positive break, and the period it is half of"
      />
    ),
    caption: ({ outside = 1, inside = 3 }) => {
      const stretch =
        outside === 1
          ? ""
          : `The $${outside}$ out in front stretches the branches vertically and moves no break at all, so it never enters the working. `;
      return `The break in green is the first one to the right of the origin, and it is where the ARGUMENT reaches a quarter turn: $${inside}x = \\dfrac{\\pi}{2}$ puts $x$ at $${piTex(1, 2 * inside)}$. The bracket beside it is the period, $${piTex(1, inside)}$, and the answer is half of that rather than equal to it, because a tangent's first break comes half a cycle in. ${stretch}Typed, that answer is ${typedRadian(1, 2 * inside)}.`;
    },
  },

  /*
   * TRG.7: two headings with one reading, and only one of them inside the band.
   *
   * The dashed segment between the two rays is the argument: they share a reading, so the
   * inverse cannot tell them apart by it, and the shaded band is the only thing that can. A
   * learner who thinks a composition hands its input straight back is looking at the picture
   * where the two ends of that segment are visibly different points.
   */
  "cfu.trg7.compose-principal": {
    Svg: ({ kind = 0, deg = 300 }) => {
      // The check indexes arccosine first, as its prompts read; `ComposeWorked` indexes the
      // sine first, as the node's pool does. One remap rather than two orders in the tree.
      const fn = kind === 0 ? 1 : kind === 1 ? 0 : 2;
      const principal = kind === 1 ? 180 - deg : kind === 2 ? deg - 180 : 360 - deg;
      return <ComposeWorked fn={fn} inner={deg} principal={principal} />;
    },
    caption: ({ kind = 0, deg = 300 }) => {
      const trig: TrigKind = kind === 1 ? "sin" : kind === 2 ? "tan" : "cos";
      const outer = ["\\arccos", "\\arcsin", "\\arctan"][kind] ?? "\\arccos";
      const band =
        kind === 0
          ? "[0^{\\circ}, 180^{\\circ}]"
          : kind === 2
            ? "(-90^{\\circ}, 90^{\\circ})"
            : "[-90^{\\circ}, 90^{\\circ}]";
      const principal = kind === 1 ? 180 - deg : kind === 2 ? deg - 180 : 360 - deg;
      return `Work from the inside out: both $${deg}^{\\circ}$ and $${principal}^{\\circ}$ give the reading $${specialValueTex(trig, deg)}$, which is the dashed segment joining the two rays. The shading is the stretch $${band}$ the inverse may answer on, and $${deg}^{\\circ}$ is outside it, which is exactly why the heading that went in cannot be the heading that comes back. So $${outer}$ returns the one inside, and $${principal}^{\\circ}$ is the answer.`;
    },
  },

  /*
   * TRG.8: the roster, and then the one heading of it the question asked for.
   *
   * The pooled shape is graded on the roster and closes there. This one is not: a figure
   * ending on the pair has printed the answer beside the two commonest wrong ways to read it,
   * so the closing line names which heading was wanted.
   */
  "cfu.trg8.larger-root": {
    Svg: ({ isSine = 1, reference = 30, negative = 1 }) => {
      const fn = fnOf(isSine === 1 ? 0 : 1);
      const isNegative = negative === 1;
      const headings = placements(fn, reference, isNegative);
      const larger = Math.max(...headings);
      const constant = rootConstantTex(isSine === 1, reference);
      return (
        <RosterCircleWorked
          equationTex={`2${FN_TEX[fn]} x ${isNegative ? "+" : "-"} ${constant} = 0`}
          levels={[levelFor(fn, reference, isNegative)]}
          reference={reference}
          headings={headings}
          rows={[
            `2${FN_TEX[fn]} x = ${isNegative ? "-" : ""}${constant}`,
            `${FN_TEX[fn]} x = ${signedTex(fn, reference, isNegative)}`,
          ]}
          closingTex={`\\text{larger heading} = ${larger}^{\\circ}`}
          ariaLabel={`The equation is rearranged until the ${FN_WORD[fn]} stands alone, and the level it then demands meets the circle at ${rosterSpoken(headings)}, of which ${larger} degrees is the larger`}
          title="Isolating the function, reading the roster, then taking the larger heading"
        />
      );
    },
    caption: ({ isSine = 1, reference = 30, negative = 1 }) => {
      const fn = fnOf(isSine === 1 ? 0 : 1);
      const isNegative = negative === 1;
      const headings = placements(fn, reference, isNegative);
      const larger = Math.max(...headings);
      return `Nothing can be read off the circle while the ${FN_WORD[fn]} is still multiplied and shifted, so the first move is to leave it standing alone at $${signedTex(fn, reference, isNegative)}$. The SIZE of that value fixes the reference angle at $${reference}^{\\circ}$, shaded here, and only afterwards does its ${isNegative ? "minus sign" : "positive sign"} choose the ${quadrantWords(fn, isNegative)} quadrants to measure it into. The dashed level cuts the circle twice, giving $${rosterTex(headings)}$, and the question asks for the larger of the two, $${larger}^{\\circ}$.`;
    },
  },

  /*
   * TRG.9: the form written in the reading you were handed.
   *
   * The leg the chosen identity never reads is drawn dashed rather than left out, because
   * "there is a side here and you do not need it" is the point: the quadrant is stated, the
   * triangle sits in it, and neither enters the arithmetic once the reading has been squared.
   */
  "cfu.trg9.double-from-sine": {
    Svg: ({ opposite = 3, adjacent = 4, hyp = 5, quadrant = 1, givenSine = 1 }) => {
      const sine = givenSine === 1;
      const signedOpposite = quadrant >= 3 ? -opposite : opposite;
      const signedAdjacent = quadrant === 2 || quadrant === 3 ? -adjacent : adjacent;
      const givenTop = sine ? signedOpposite : signedAdjacent;
      const square = givenTop * givenTop;
      const whole = hyp * hyp;
      const value = sine ? whole - 2 * square : 2 * square - whole;
      return (
        <QuadrantTriangleWorked
          oppositeLeg={signedOpposite}
          adjacentLeg={signedAdjacent}
          hyp={hyp}
          quadrantWord={QUADRANT_WORD[quadrant] ?? "first"}
          used={{ opposite: sine, adjacent: !sine }}
          rows={[
            {
              latex: sine
                ? "\\cos 2\\theta = 1 - 2\\sin^{2}\\theta"
                : "\\cos 2\\theta = 2\\cos^{2}\\theta - 1",
              color: SOFT,
            },
            {
              latex: `\\left(${signedFracTex(givenTop, hyp)}\\right)^{2} = \\dfrac{${square}}{${whole}}`,
              color: LABEL,
            },
            {
              latex: sine
                ? `= \\dfrac{${whole}}{${whole}} - \\dfrac{${2 * square}}{${whole}}`
                : `= \\dfrac{${2 * square}}{${whole}} - \\dfrac{${whole}}{${whole}}`,
              color: LABEL,
            },
            {
              latex: `\\cos 2\\theta = ${signedFracTex(value, whole)}`,
              color: CIVIC,
            },
          ]}
          ariaLabel={`A right triangle in the ${QUADRANT_WORD[quadrant] ?? "first"} quadrant, with the leg the chosen identity never reads drawn dashed, over the doubling of the cosine`}
          title="Doubling a cosine from the form written in the given reading"
        />
      );
    },
    caption: ({ opposite = 3, adjacent = 4, hyp = 5, quadrant = 1, givenSine = 1 }) => {
      const sine = givenSine === 1;
      const signedOpposite = quadrant >= 3 ? -opposite : opposite;
      const signedAdjacent = quadrant === 2 || quadrant === 3 ? -adjacent : adjacent;
      const givenTop = sine ? signedOpposite : signedAdjacent;
      const whole = hyp * hyp;
      const value = sine
        ? whole - 2 * givenTop * givenTop
        : 2 * givenTop * givenTop - whole;
      return `Three forms give $\\cos 2\\theta$ and only one of them is written in the function you were handed, so the form is the question rather than a detail: from a ${sine ? "sine" : "cosine"} it is $\\cos 2\\theta = ${sine ? "1 - 2\\sin^{2}\\theta" : "2\\cos^{2}\\theta - 1"}$. The other leg is drawn dashed because that form never reads it. The reading goes in SQUARED, which is what makes the ${ORDINAL[quadrant] ?? "first"} quadrant a fact about the picture and not a step in the arithmetic: a squared value carries no sign. Writing $1$ over the same denominator then leaves $\\cos 2\\theta = ${signedFracTex(value, whole)}$.`;
    },
  },
};
