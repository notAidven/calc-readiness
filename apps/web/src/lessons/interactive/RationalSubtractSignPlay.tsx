/**
 * RAT.3 interactive (Verdigris Hold, the Blending Vat): the subtraction sign trap. Skimming
 * `(3x - 1)/(x - 2)` off `(x + 5)/(x - 2)` subtracts the WHOLE numerator, so the learner
 * sets the sign each term of the bracket comes out with. The live "distribute" row rewrites
 * itself as the toggles change, so a wrong pair is visible before Check is pressed, and the
 * classic error (leaving both signs alone) is the starting state.
 *
 * The two signs the learner owns are drawn in the attention color that the bracket row above
 * already uses, so the row says which two glyphs are in play and where they came from. That
 * is why the distribute row is built as a numerator row over a drawn bar rather than handed
 * to KaTeX as one `\dfrac`: the palette is CSS variables, which KaTeX's own color parser
 * rejects, so a differently colored sign has to be its own span.
 *
 * Gates the lesson once both signs are right.
 */

import { type ReactNode, useState } from "react";

import {
  BRICK,
  CIVIC,
  type EqToken,
  EquationRow,
  InlineMath,
  LABEL,
  SIGNAL,
  SOFT,
  SvgMath,
} from "../svgKit";
import { useWidgetSuccess } from "../widgetMechanics";

type Sign = "+" | "-";

const START_ROW = "\\dfrac{x + 5}{x - 2} - \\dfrac{3x - 1}{x - 2}";
const BRACKET_ROW = "= \\dfrac{(x + 5) - (3x - 1)}{x - 2}";
const COMBINE_ROW = "= \\dfrac{-2x + 6}{x - 2}";
const DOMAIN_ROW = "x \\neq 2";

/* The distribute row, drawn as a fraction so its two signs can carry their own color: the
   numerator sits above a bar wide enough for it, with the denominator under the bar. */
const FRACTION_CX = 250;
const NUMERATOR_Y = 142;
const BAR_Y = 164;
const DENOMINATOR_Y = 186;
const BAR_HALF_WIDTH = 76;

const spokenSign = (sign: Sign): string => (sign === "+" ? "plus" : "minus");

export function RationalSubtractSignPlay({ onComplete }: { onComplete?: () => void }) {
  const [firstSign, setFirstSign] = useState<Sign>("+");
  const [secondSign, setSecondSign] = useState<Sign>("+");
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [solved, setSolved] = useState(false);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();

  const signColor = solved ? CIVIC : SIGNAL;
  const numerator: readonly EqToken[] = [
    { text: "x" },
    { text: "+" },
    { text: "5" },
    { text: firstSign, color: signColor },
    { text: "3x" },
    { text: secondSign, color: signColor },
    { text: "1" },
  ];

  function toggleFirst() {
    if (solved) {
      return;
    }
    setFeedback(null);
    setFirstSign((current) => (current === "+" ? "-" : "+"));
  }

  function toggleSecond() {
    if (solved) {
      return;
    }
    setFeedback(null);
    setSecondSign((current) => (current === "+" ? "-" : "+"));
  }

  function check() {
    if (solved) {
      return;
    }
    if (firstSign === "-" && secondSign === "+") {
      setSolved(true);
      setFeedback(null);
      success();
      if (!done) {
        setDone(true);
        onComplete?.();
      }
      return;
    }
    if (firstSign === "+" && secondSign === "+") {
      setFeedback(
        "Not yet. The minus in front of the bracket reaches every term inside, so neither sign can stay as it was.",
      );
      return;
    }
    if (firstSign === "-" && secondSign === "-") {
      setFeedback(
        <>
          Close. The second term inside the bracket was already <InlineMath latex="-1" />,
          and taking a minus of a negative leaves it positive.
        </>,
      );
      return;
    }
    setFeedback("The minus has to reach the first term inside the bracket too.");
  }

  function reset() {
    setFirstSign("+");
    setSecondSign("+");
    setFeedback(null);
    setSolved(false);
  }

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        Both signs flipped, so the result is <InlineMath latex="\dfrac{-2x + 6}{x - 2}" />,
        with <InlineMath latex="x \neq 2" /> from the original denominator.
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else {
    status = (
      <>
        The two highlighted signs in the distribute row are the ones you set. Flip each to
        the sign its term leaves the bracket with, then check.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--play">
      <svg
        viewBox="0 0 440 300"
        role="img"
        aria-label="Subtract 3 x minus 1 over x minus 2 from x plus 5 over x minus 2 by distributing the minus"
      >
        <title>Distributing the minus across a subtracted numerator</title>
        <SvgMath latex={START_ROW} x={230} y={40} fontSize={20} color={LABEL} w={400} />
        <text x={8} y={100} fontSize={12} fill={SOFT}>
          bracket
        </text>
        <SvgMath latex={BRACKET_ROW} x={248} y={96} fontSize={18} color={SIGNAL} w={360} />
        <text x={8} y={168} fontSize={12} fill={SOFT}>
          distribute
        </text>
        <SvgMath
          latex="="
          x={FRACTION_CX - BAR_HALF_WIDTH - 16}
          y={BAR_Y}
          anchor="end"
          fontSize={18}
          color={solved ? CIVIC : LABEL}
          w={40}
        />
        <EquationRow tokens={numerator} cx={FRACTION_CX} y={NUMERATOR_Y} fontSize={18} />
        <line
          x1={FRACTION_CX - BAR_HALF_WIDTH}
          y1={BAR_Y}
          x2={FRACTION_CX + BAR_HALF_WIDTH}
          y2={BAR_Y}
          stroke={solved ? CIVIC : LABEL}
          strokeWidth={1.5}
        />
        <SvgMath
          latex="x - 2"
          x={FRACTION_CX}
          y={DENOMINATOR_Y}
          fontSize={18}
          color={solved ? CIVIC : LABEL}
          w={160}
        />
        {solved && (
          <>
            <text x={8} y={228} fontSize={12} fill={SOFT}>
              combine
            </text>
            <SvgMath
              latex={COMBINE_ROW}
              x={248}
              y={224}
              fontSize={18}
              color={CIVIC}
              w={360}
            />
            <text x={8} y={266} fontSize={12} fill={SOFT}>
              domain
            </text>
            <SvgMath
              latex={DOMAIN_ROW}
              x={248}
              y={262}
              fontSize={18}
              color={BRICK}
              w={360}
            />
          </>
        )}
      </svg>

      <div className="lesson-interactive__controls">
        <span className="lesson-interactive__select-label">Tap a sign to flip it</span>
        <button
          type="button"
          className="lesson-interactive__chip"
          style={{ color: signColor, borderColor: signColor }}
          aria-label={`sign on the 3 x term, currently ${spokenSign(firstSign)}`}
          aria-pressed={firstSign === "-"}
          disabled={solved}
          onClick={toggleFirst}
        >
          <InlineMath latex={`${firstSign} 3x`} />
          {" \u21c4"}
        </button>
        <button
          type="button"
          className="lesson-interactive__chip"
          style={{ color: signColor, borderColor: signColor }}
          aria-label={`sign on the 1 term, currently ${spokenSign(secondSign)}`}
          aria-pressed={secondSign === "-"}
          disabled={solved}
          onClick={toggleSecond}
        >
          <InlineMath latex={`${secondSign} 1`} />
          {" \u21c4"}
        </button>
        <button
          type="button"
          className="lesson-interactive__check"
          disabled={solved}
          onClick={check}
        >
          Check
        </button>
        {solved && (
          <button type="button" className="lesson-interactive__reset" onClick={reset}>
            Start over
          </button>
        )}
      </div>

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {status}
      </p>
    </div>
  );
}
