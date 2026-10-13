/**
 * TRG.7 interactive (slide 3): commit to the bearing two offsets produce, then work it out.
 *
 * The misconception here is about MAGNITUDE, which is what this kind is for. A ratio of two
 * offsets looks like a share of the quarter turn, so a learner who has not yet felt that the
 * tangent and the bearing move at different rates parks the marker where the fraction points:
 * eight along for every fifteen across reads as roughly half of ninety degrees, and the answer
 * is twenty eight. Committing first is what makes the gap teach, because the distance between
 * the stake and the true mark is the lesson.
 *
 * The landmark sits at 45 degrees because that is the one bearing a learner can place without
 * computing anything: it is where the two offsets are equal, so which side of it a round lands
 * on is decided by which offset is the larger. Both boards carry one round each side of it.
 *
 * The four offset pairs are the ones the practice item `d9.trg7.arctan-round.l3` REJECTED for
 * sitting too near a two-place rounding boundary, and that is deliberate rather than reuse: a
 * pair whose fourth decimal decides its second is unfit for a rounding rule and perfectly fit
 * here, where a tolerance of two degrees decides. So the two surfaces partition the pairs
 * instead of competing for them, and no bearing on this board is one the practice set asks for.
 *
 * The quantity names its own rounding, because a settled round prints `quantity = value` and
 * the value it prints is not a whole number. The kind states a true value at the precision the
 * value actually needs, floored at the precision the scale steps in and capped at three; every
 * bearing here is irrational, so every one of the four is stated to three decimals on a scale
 * that steps in whole degrees, and the caption is the honest reading of that.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { EstimateThenCheck } from "./kinds/EstimateThenCheck";

/** `[across, along]`: the leg beside the bearing, then the leg opposite it. */
type Offsets = readonly [number, number];

interface Board {
  rounds: readonly [Offsets, Offsets];
}

/** One round under the 45 degree landmark and one over it, on each board. */
const BOARDS: readonly Board[] = [
  {
    rounds: [
      [15, 8],
      [4, 9],
    ],
  },
  {
    rounds: [
      [9, 4],
      [8, 15],
    ],
  },
];

function bearing([across, along]: Offsets): number {
  return (Math.atan2(along, across) * 180) / Math.PI;
}

export function TrigInverseEstimate(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <EstimateThenCheck
      key={variant.nonce}
      rounds={board.rounds.map((offsets) => {
        const [across, along] = offsets;
        const ratio = `\\dfrac{${along}}{${across}}`;
        const value = bearing(offsets);
        const doubled = bearing([across, along * 2]);
        return {
          id: `${across}x${along}`,
          quantity: `\\arctan ${ratio}\\ \\text{in degrees, to 3 dp}`,
          spoken: `the arctangent of ${along} over ${across}, in degrees`,
          value,
          // An estimate, so the marker steps in whole degrees and landing within two of the
          // bearing counts. The board is about how far off the ratio's own size is, and a
          // learner who has the size right has made the point.
          tolerance: 2,
          landmark: { at: 45, latex: "45^{\\circ}" },
          why: (
            <>
              The two offsets are the legs of the right triangle, so{" "}
              <InlineMath latex={ratio} /> is the TANGENT of the bearing rather than the
              bearing itself, and undoing the tangent is what turns one into the other:{" "}
              <InlineMath
                latex={`\\arctan ${ratio} \\approx ${value.toFixed(3)}^{\\circ}`}
              />
              .{" "}
              {along < across ? (
                <>
                  The offset along is the smaller of the two, so the sight line leans under{" "}
                  <InlineMath latex="45^{\circ}" />.
                </>
              ) : (
                <>
                  The offset along is the larger of the two, so the sight line leans over{" "}
                  <InlineMath latex="45^{\circ}" />.
                </>
              )}{" "}
              The two do not move in step, either: doubling the along offset to{" "}
              <InlineMath latex={`${along * 2}`} /> takes the bearing to only{" "}
              <InlineMath latex={`${doubled.toFixed(3)}^{\\circ}`} />, well short of double.
            </>
          ),
        };
      })}
      min={0}
      max={90}
      step={1}
      ticks={[0, 15, 30, 45, 60, 75, 90]}
      objective={
        <>
          Goal: put a stake in the ground for the bearing each pair of offsets produces
          before you work it out, and read off how far the bearing sits from the share of a
          quarter turn that the ratio looks like.
        </>
      }
      prompt="Park the marker on the bearing you expect, then check it. Landing within two degrees counts."
      conclusion={
        <>
          A ratio of offsets is a tangent, and a bearing is what{" "}
          <InlineMath latex="\arctan" /> hands back when you undo it. The dashed landmark is
          the one bearing you can place without computing anything: equal offsets, and{" "}
          <InlineMath latex="45^{\circ}" />. Everything else leans toward the larger offset,
          and never by the share of the quarter turn the fraction suggests.
        </>
      }
      ariaLabel="A scale of bearings from 0 to 90 degrees, for committing to the bearing a pair of offsets produces"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with two different pairs of offsets"
    />
  );
}
