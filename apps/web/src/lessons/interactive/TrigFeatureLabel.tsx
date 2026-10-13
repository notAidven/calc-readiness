/**
 * TRG.5 slide 3: the numbers an engineer names when they describe a repeating signal, and
 * which reading off the rule each name belongs to. Three of them on the unshifted board and
 * four on the shifted one, which is why nothing here closes over a fixed count.
 *
 * `LabelParts` is the shape because this is a CORRESPONDENCE and not a procedure. By this
 * slide the learner can already work out all three values; what they cannot yet do reliably
 * is say which one a question is asking for, and that is the whole difficulty of the node's
 * L3 practice, where one prompt asks for all three at once and a part answered in the wrong
 * box is simply wrong.
 *
 * **The readings are the values, not the symbols in the rule.** Every reading but the period
 * could be copied straight out of the rule if the slots held coefficients, and a learner would
 * then be matching positions rather than meanings. Holding the VALUES means the period slot
 * holds a number that never appears in the rule at all, so the correspondence has to be
 * understood before it can be placed.
 *
 * The second board adds the lag, which is the reading that is neither a height nor a length
 * and is the one most often mistaken for the period. It is a different rule, a cosine rather
 * than a sine, and it has four slots rather than three, so a learner who took the first board
 * cannot walk the second one from memory of an arrangement.
 *
 * `labelPartsDeal` deals the names in a derangement, so no name is ever offered opposite the
 * reading it belongs to, and `LabelParts` passes its own live `othersRemain`, so being told
 * one name hands the figure back with every other slot still to place.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type FigurePart, LabelParts, labelPartsDeal } from "./kinds/LabelParts";

interface Variant {
  /** Strength out front, which may be read as a height either side of the level. */
  a: number;
  /** The coefficient beside the input, which sets how often the cycle repeats. */
  b: number;
  /** The level the trace swings about. */
  d: number;
  fn: "sin" | "cos";
  /** The lag, as a fraction of a turn: `null` on the unshifted board. */
  shift: { num: number; den: number } | null;
}

const VARIANTS: readonly Variant[] = [
  { a: 5, b: 4, d: 2, fn: "sin", shift: null },
  { a: 4, b: 3, d: -2, fn: "cos", shift: { num: 1, den: 6 } },
];

/** One turn shared out by the coefficient, written the way a period is written. */
function periodTex(b: number): string {
  const g = b % 2 === 0 ? 2 : 1;
  const num = 2 / g;
  const den = b / g;
  if (den === 1) {
    return num === 1 ? "\\pi" : `${num}\\pi`;
  }
  return num === 1 ? `\\dfrac{\\pi}{${den}}` : `\\dfrac{${num}\\pi}{${den}}`;
}

/** The same value said out loud, for a slot whose KaTeX cannot be read back. */
function periodSpoken(b: number): string {
  const g = b % 2 === 0 ? 2 : 1;
  const num = 2 / g;
  const den = b / g;
  if (den === 1) {
    return num === 1 ? "pi" : `${num} pi`;
  }
  return num === 1 ? `pi over ${den}` : `${num} pi over ${den}`;
}

function ruleTex(v: Variant): string {
  const inside =
    v.shift === null
      ? `${v.b}x`
      : `${v.b}\\left(x - \\dfrac{${v.shift.num === 1 ? "" : v.shift.num}\\pi}{${v.shift.den}}\\right)`;
  const tail = v.d < 0 ? `- ${Math.abs(v.d)}` : `+ ${v.d}`;
  return `${v.a}\\${v.fn}\\left(${inside}\\right) ${tail}`;
}

function ruleSpoken(v: Variant): string {
  const named = v.fn === "sin" ? "sine" : "cosine";
  const lag =
    v.shift === null
      ? ""
      : ` minus ${v.shift.num === 1 ? "" : `${v.shift.num} `}pi over ${v.shift.den}`;
  return `y equals ${v.a} ${named} of ${v.b} times x${lag}, ${v.d < 0 ? "minus" : "plus"} ${Math.abs(v.d)}`;
}

export function TrigFeatureLabel(props: LessonWidgetProps) {
  const variant = useWidgetVariants(VARIANTS.length, props);
  const v = VARIANTS[variant.index] ?? (VARIANTS[0] as Variant);
  const strength = Math.abs(v.a);
  const high = v.d + strength;
  const low = v.d - strength;

  const parts: FigurePart[] = [
    {
      id: "amplitude",
      latex: `${strength}`,
      name: "amplitude",
      spoken: `the reading ${strength}`,
      why: (
        <>
          Amplitude is how far the trace reaches from its level to a peak, and the number
          out front is exactly that reach. This signal runs up to{" "}
          <InlineMath latex={`${high}`} /> and down to <InlineMath latex={`${low}`} />,
          which is <InlineMath latex={`${strength}`} /> either side of{" "}
          <InlineMath latex={`${v.d}`} />. It is never negative, because a distance is not.
        </>
      ),
    },
    {
      id: "period",
      latex: periodTex(v.b),
      name: "period",
      spoken: `the reading ${periodSpoken(v.b)}`,
      why: (
        <>
          Period is how far along <InlineMath latex="x" /> the signal runs before it repeats
          itself. The inside covers one whole turn of <InlineMath latex="2\pi" /> in that
          distance, and the inside moves <InlineMath latex={`${v.b}`} /> times as fast as{" "}
          <InlineMath latex="x" /> does, so the repeat comes after{" "}
          <InlineMath latex={periodTex(v.b)} />. Notice this value appears nowhere in the
          rule: it has to be worked out.
        </>
      ),
    },
    {
      id: "midline",
      latex: `y = ${v.d}`,
      name: "midline",
      spoken: `the line y equals ${v.d}`,
      why: (
        <>
          The midline is the level the trace swings about, halfway between its highest and
          lowest readings: <InlineMath latex={`\\dfrac{${high} + (${low})}{2} = ${v.d}`} />.
          Adding a constant on the end of the rule lifts the whole trace to that level and
          changes nothing else about it.
        </>
      ),
    },
  ];

  if (v.shift !== null) {
    const lagTex = `\\dfrac{${v.shift.num === 1 ? "" : v.shift.num}\\pi}{${v.shift.den}}`;
    parts.push({
      id: "lag",
      latex: lagTex,
      name: "phase shift",
      spoken: `the reading ${v.shift.num === 1 ? "" : `${v.shift.num} `}pi over ${v.shift.den}`,
      why: (
        <>
          The phase shift is how far the whole trace has slid along <InlineMath latex="x" />
          . The inside is subtracting <InlineMath latex={lagTex} /> from{" "}
          <InlineMath latex="x" /> before anything else happens, so every part of this trace
          arrives <InlineMath latex={lagTex} /> LATER than it would without it. It is a
          distance along the axis, not a height, which is what separates it from the other
          three.
        </>
      ),
    });
  }

  return (
    <LabelParts
      key={variant.nonce}
      dealt={labelPartsDeal(parts.length, variant.index)}
      // `\Rightarrow` alone, with the thickspace KaTeX gives a relation, rather than the
      // `\quad` either side it carried first. Those two quads are 2em, which is 51.2px at this
      // figure's font size, and they took a 224.6px rule to 275.8px against a 434px card
      // already spending 180.4px on its terms: the statement then broke between its lead and
      // its terms and the rule was read a line above the blanks taken off it. Padding is the
      // only thing in a lead that can be spent without spending maths.
      lead={`y = ${ruleTex(v)} \\Rightarrow`}
      parts={parts}
      objective={
        <>
          Goal: put the right name to each reading taken off this rule, so a question asking
          for one of them names the reading it wants.
        </>
      }
      prompt="Drag each name into the box above the reading it belongs to, or tap a name and then tap its box."
      conclusion={
        <>
          These are the numbers an engineer says out loud about a repeating signal: how
          strong it is, how often it comes back around, and what level it sits on
          {v.shift === null ? "" : ", plus how far behind it is running"}. All of them but
          one are read straight off the rule. The period is not: it is{" "}
          <InlineMath latex="2\pi" /> shared out by the coefficient beside{" "}
          <InlineMath latex="x" />.
        </>
      }
      ariaLabel={`The rule ${ruleSpoken(v)}, beside the readings taken off it`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different rule"
    />
  );
}
