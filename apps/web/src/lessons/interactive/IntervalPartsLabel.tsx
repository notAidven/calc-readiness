/**
 * LIN.4 slide 2: name the four things a written interval is made of.
 *
 * Four terms arrive on one slide (endpoint, closed, open, and the bracket that carries each) and
 * a slide that only states them is the shape a learner reads past. Naming is a correspondence, so
 * the interaction is labelling: each name has to land on the mark it belongs to, which is where
 * "a square bracket takes its end in" stops being a sentence and becomes something checked.
 *
 * Every name is the term itself rather than a description of the term: `lower endpoint` and
 * `closed end` are what these are called, and a slot reading "the number the range starts at"
 * would be teaching a paraphrase the learner cannot look up or use.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { LabelParts, labelPartsDeal } from "./kinds/LabelParts";

interface Variant {
  /** The two endpoints, and which ends are taken in. */
  low: number;
  high: number;
  lowClosed: boolean;
  /** The inequality the interval is short for. */
  inequality: string;
}

/** Neither interval is the paragraph's own $[3, 7)$, so the names cannot be read off the prose. */
const VARIANTS: readonly Variant[] = [
  { low: -3, high: 5, lowClosed: true, inequality: "-3 \\le x < 5" },
  { low: 2, high: 11, lowClosed: false, inequality: "2 < x \\le 11" },
];

export function IntervalPartsLabel(props: LessonWidgetProps) {
  const variant = useWidgetVariants(VARIANTS.length, props);
  const shape = VARIANTS[variant.index] ?? (VARIANTS[0] as Variant);
  const openBracket = shape.lowClosed ? "[" : "(";
  const closeBracket = shape.lowClosed ? ")" : "]";
  const written = `${openBracket}${shape.low}, ${shape.high}${closeBracket}`;

  return (
    <LabelParts
      key={variant.nonce}
      dealt={labelPartsDeal(4, variant.index)}
      parts={[
        {
          id: "open-mark",
          latex: openBracket,
          name: shape.lowClosed ? "closed end" : "open end",
          spoken: shape.lowClosed
            ? "the opening square bracket"
            : "the opening round bracket",
          why: (
            <>
              {shape.lowClosed ? (
                <>
                  A square bracket takes its end IN, so this one says{" "}
                  <InlineMath latex={String(shape.low)} /> is itself part of the range. That
                  is what makes it a closed end, and the inequality behind it is{" "}
                  <InlineMath latex={`${shape.low} \\le x`} />.
                </>
              ) : (
                <>
                  A round bracket leaves its end OUT, so this one says{" "}
                  <InlineMath latex={String(shape.low)} /> is not part of the range. That is
                  what makes it an open end, and the inequality behind it is{" "}
                  <InlineMath latex={`${shape.low} < x`} />.
                </>
              )}
            </>
          ),
        },
        {
          id: "low",
          latex: String(shape.low),
          name: "lower endpoint",
          spoken: `the number ${shape.low}`,
          why: (
            <>
              The two numbers in an interval are its endpoints, written in order, so the
              first of them is the lower one. <InlineMath latex={String(shape.low)} /> is
              where the range begins, whether or not the bracket beside it takes that value
              in.
            </>
          ),
        },
        {
          id: "high",
          latex: String(shape.high),
          before: ",",
          name: "upper endpoint",
          spoken: `the number ${shape.high}`,
          why: (
            <>
              The second number is the upper endpoint, and the comma between the two is only
              a separator. <InlineMath latex={String(shape.high)} /> is where the range
              stops, and nothing above it is in the range at all.
            </>
          ),
        },
        {
          id: "close-mark",
          latex: closeBracket,
          name: shape.lowClosed ? "open end" : "closed end",
          spoken: shape.lowClosed
            ? "the closing round bracket"
            : "the closing square bracket",
          why: (
            <>
              {shape.lowClosed ? (
                <>
                  This end carries a round bracket, so{" "}
                  <InlineMath latex={String(shape.high)} /> is left out and the end is open.
                  Each end is decided on its own, which is why one interval can have a
                  closed end and an open one.
                </>
              ) : (
                <>
                  This end carries a square bracket, so{" "}
                  <InlineMath latex={String(shape.high)} /> is taken in and the end is
                  closed. Each end is decided on its own, which is why one interval can have
                  an open end and a closed one.
                </>
              )}
            </>
          ),
        },
      ]}
      lead=""
      objective="Goal: name all four marks in this written range, so it can be read back as the inequality it is short for."
      prompt="Drag each name into the box above the mark it belongs to, or tap a name and then tap its box."
      conclusion={
        <>
          <InlineMath latex={written} /> is exactly <InlineMath latex={shape.inequality} />,
          and the two brackets are the whole of the difference between an end being in the
          range and being outside it. Nothing else in the notation carries that.
        </>
      }
      ariaLabel={`The interval ${written}, with its two endpoints and its two brackets to be named`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different range"
    />
  );
}
