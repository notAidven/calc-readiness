/**
 * RAT.5 interactive (slide 0), the depth-staff ranging chart. The learner runs the input
 * along the whole domain and finds the one value where the chart gives no reading at all,
 * then writes that fact down as the function's domain in set-builder form.
 *
 * Two phases, so the notation is earned: the dashed forbidden line and the set-builder
 * chips both stay hidden until the dial has actually landed on the dose that empties the
 * bottom. The recipe, (x + 4) / (x - 3), appears nowhere else in the lesson or the bank.
 */

import { useState } from "react";

import { BRICK, InlineMath, LABEL, SOFT, SvgMath } from "../svgKit";
import { WidgetBeside } from "../widgetBeside";
import { useWidgetSuccess } from "../widgetMechanics";
import {
  createGaugePlane,
  GaugeAxes,
  GaugeCurve,
  GaugePoint,
  GaugeTickLabels,
  GaugeVerticalAsymptote,
} from "./RationalGaugePlane";

/** The gauge's recipe: potency (x + 4) over dilution (x - 3). */
const RECIPE = "P(x) = \\dfrac{x + 4}{x - 3}";
const FORBIDDEN = 3;

const PLANE = createGaugePlane({ xMin: -3, xMax: 9, yMin: -8, yMax: 8 });
const X_TICKS = [-2, 2, 4, 6, 8];
const Y_TICKS = [-6, -3, 3, 6];

function potency(x: number): number {
  return (x + 4) / (x - 3);
}

/** The dial's stops. Whole doses only, so the forbidden one can be landed on exactly. */
const DOSES: readonly number[] = [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

interface DomainChoice {
  latex: string;
  /** The accessible name, with the notation spelled out in words. */
  aria: string;
  correct: boolean;
}

const CHOICES: readonly DomainChoice[] = [
  {
    latex: "\\{x \\mid x \\ne -4\\}",
    aria: "the set of all x such that x is not negative 4",
    correct: false,
  },
  {
    latex: "\\{x \\mid x \\ne 3\\}",
    aria: "the set of all x such that x is not 3",
    correct: true,
  },
  {
    latex: "\\{x \\mid x \\ne 0\\}",
    aria: "the set of all x such that x is not 0",
    correct: false,
  },
];

/** A reading rounded for display, without floating-point noise. */
function reading(x: number): string {
  return String(Number(potency(x).toFixed(2)));
}

export function RationalGaugeDomainExplore({ onComplete }: { onComplete?: () => void }) {
  const [dose, setDose] = useState(-3);
  const [found, setFound] = useState(false);
  const [missed, setMissed] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const [fired, setFired] = useState(false);
  const success = useWidgetSuccess();

  const cracked = dose === FORBIDDEN;

  function moveDial(next: number) {
    if (solved) {
      return;
    }
    setDose(next);
    setMissed(null);
    // Dialing back onto the forbidden dose is not new progress, so only the first find counts.
    if (next === FORBIDDEN && !found) {
      setFound(true);
      success();
    }
  }

  function choose(choice: DomainChoice) {
    if (solved) {
      return;
    }
    if (!choice.correct) {
      setMissed(choice.latex);
      return;
    }
    setMissed(null);
    setSolved(true);
    success();
    if (!fired) {
      setFired(true);
      onComplete?.();
    }
  }

  function reset() {
    setDose(-3);
    setFound(false);
    setMissed(null);
    setSolved(false);
  }

  const dialText = cracked
    ? "at x equals 3 the function is undefined"
    : `at x equals ${dose} the graph reads ${reading(dose)}`;

  return (
    <div className="lesson-interactive lesson-interactive--slider">
      <WidgetBeside
        figure={
          <svg
            viewBox="0 0 440 284"
            role="img"
            aria-label="The graph of x plus 4 over x minus 3. Every x-value gives a reading except 3, where the denominator is zero."
          >
            <title>Move along the x-axis and find the excluded value</title>

            <GaugeAxes plane={PLANE} xTicks={X_TICKS} yTicks={Y_TICKS} yLatex="P(x)" />
            {found && <GaugeVerticalAsymptote plane={PLANE} x={FORBIDDEN} />}
            <GaugeCurve plane={PLANE} f={potency} poles={[FORBIDDEN]} />
            {!cracked && (
              <GaugePoint plane={PLANE} x={dose} y={potency(dose)} color={LABEL} />
            )}
            <GaugeTickLabels plane={PLANE} xTicks={X_TICKS} yTicks={Y_TICKS} />

            <SvgMath latex={RECIPE} x={220} y={212} fontSize={19} color={LABEL} w={260} />
            {/* The reading row sits low enough for the stacked 7/0 the forbidden dose puts
            here, which is twice the height of the one-line reading every other dose gives. */}
            {cracked ? (
              <SvgMath
                latex="P(3) = \dfrac{7}{0} \quad \text{undefined}"
                x={220}
                y={256}
                fontSize={15}
                color={BRICK}
                w={300}
              />
            ) : (
              <SvgMath
                latex={`P(${dose}) = ${reading(dose)}`}
                x={220}
                y={256}
                fontSize={15}
                color={SOFT}
                w={300}
              />
            )}
          </svg>
        }
      >
        <label className="lesson-interactive__slider-label" htmlFor="rat5-dilution-dial">
          Move x across the graph
        </label>
        <input
          id="rat5-dilution-dial"
          className="lesson-interactive__range"
          type="range"
          min={DOSES[0]}
          max={DOSES[DOSES.length - 1]}
          step={1}
          value={dose}
          disabled={solved}
          aria-valuetext={dialText}
          onChange={(event) => moveDial(Number(event.target.value))}
        />

        {found && !solved && (
          <div className="lesson-interactive__controls">
            {CHOICES.map((choice) => (
              <button
                key={choice.latex}
                type="button"
                className="lesson-interactive__chip"
                style={{ color: LABEL }}
                aria-label={choice.aria}
                data-state={missed === choice.latex ? "wrong" : undefined}
                onClick={() => choose(choice)}
              >
                <InlineMath latex={choice.latex} />
              </button>
            ))}
          </div>
        )}

        {solved && (
          <button type="button" className="lesson-interactive__reset" onClick={reset}>
            Start over
          </button>
        )}

        <p
          className="lesson-interactive__status"
          data-state={solved ? "solved" : missed ? "wrong" : "prompt"}
          aria-live="polite"
        >
          {solved ? (
            <>
              That is the domain: <InlineMath latex="\{x \mid x \ne 3\}" />, every x-value
              the graph can use. Only <InlineMath latex="x = 3" /> makes the denominator{" "}
              <InlineMath latex="x - 3" /> zero.
            </>
          ) : missed ? (
            <>
              Not that one. A value is excluded only when it makes the denominator{" "}
              <InlineMath latex="x - 3" /> zero, and <InlineMath latex="x = 3" /> is the
              value that does it.
            </>
          ) : found ? (
            <>
              At <InlineMath latex="x = 3" /> the denominator is <InlineMath latex="0" />{" "}
              and the function is undefined. Write that as the domain.
            </>
          ) : (
            <>
              Every stop is defined so far. Keep going until the graph has nothing to show,
              and watch the denominator <InlineMath latex="x - 3" />.
            </>
          )}
        </p>
      </WidgetBeside>
    </div>
  );
}
