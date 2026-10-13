/**
 * RAT.1 interactive (slide 0): the Reducing Bench's first rule, that the bottom measure
 * of a recipe can never be zero. The learner taps each candidate dose to substitute it
 * into the bottom, then names the one dose that cracks the recipe.
 *
 * Two phases so the judgement is earned rather than guessed: every dose must be tested
 * before the "which one is forbidden" call unlocks, and a wrong call is recoverable (the
 * point of the slide is the rule, not a trap). The recipe is NOT one the practice bank or
 * the CFU uses, and its bottom is linear so the substitution stays readable.
 */

import { useState } from "react";

import { BRICK, InlineMath, LABEL, LINE, SOFT, SvgMath } from "../svgKit";
import { useWidgetSuccess } from "../widgetMechanics";

/** The bench recipe: (x + 2) / (x - 6). Its only forbidden dose is 6. */
const RECIPE = "\\dfrac{x + 2}{x - 6}";
const OFFSET = 6;
const DOSES: readonly number[] = [3, -2, 6, 0];

function bottomAt(dose: number): number {
  return dose - OFFSET;
}

/** A signed value as LaTeX, with negatives parenthesized. */
function sp(n: number): string {
  return n < 0 ? `(-${-n})` : `${n}`;
}

/** A signed value read aloud, for the aria-labels KaTeX makes textContent unfit for. */
function spoken(n: number): string {
  return n < 0 ? `negative ${-n}` : `${n}`;
}

export function RationalForbiddenDoseExplore({ onComplete }: { onComplete?: () => void }) {
  const [tested, setTested] = useState<readonly number[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [missed, setMissed] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const [fired, setFired] = useState(false);
  const success = useWidgetSuccess();

  const allTested = DOSES.every((dose) => tested.includes(dose));
  const phase = solved ? "done" : allTested ? "choose" : "test";

  function tap(dose: number) {
    if (phase === "done") {
      return;
    }
    setActive(dose);
    if (phase === "test") {
      setMissed(null);
      setTested((prev) => (prev.includes(dose) ? prev : [...prev, dose]));
      return;
    }
    if (bottomAt(dose) !== 0) {
      setMissed(dose);
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
    setTested([]);
    setActive(null);
    setMissed(null);
    setSolved(false);
  }

  const activeBottom = active === null ? null : bottomAt(active);
  const cracks = activeBottom === 0;

  return (
    <div className="lesson-interactive lesson-interactive--explore">
      <svg
        viewBox="0 0 440 170"
        role="img"
        aria-label="The expression x plus 2 over x minus 6. When x equals 6 the denominator is zero, so 6 is the excluded value."
      >
        <title>Test each x-value against the denominator of a rational expression</title>

        <text x={104} y={30} textAnchor="middle" fontSize={12} fill={SOFT}>
          expression
        </text>
        <SvgMath latex={RECIPE} x={104} y={92} fontSize={30} w={200} />

        <line x1={214} y1={44} x2={214} y2={146} stroke={LINE} strokeWidth={1} />

        <text x={330} y={30} textAnchor="middle" fontSize={12} fill={SOFT}>
          denominator at that value
        </text>
        {active === null ? (
          <text x={330} y={96} textAnchor="middle" fontSize={13} fill={SOFT}>
            tap a value below
          </text>
        ) : (
          <SvgMath
            latex={`${sp(active)} - ${OFFSET} = ${activeBottom}`}
            x={330}
            y={92}
            fontSize={22}
            color={cracks ? BRICK : LABEL}
            w={200}
          />
        )}
        {active !== null && cracks && (
          <text x={330} y={136} textAnchor="middle" fontSize={12} fill={BRICK}>
            denominator is zero
          </text>
        )}
      </svg>

      <div className="lesson-interactive__controls">
        {DOSES.map((dose) => (
          <button
            key={dose}
            type="button"
            className="lesson-interactive__chip"
            style={{ color: LABEL, borderColor: LINE }}
            aria-label={`x equals ${spoken(dose)}`}
            data-state={
              solved && bottomAt(dose) === 0
                ? "solved"
                : missed === dose
                  ? "wrong"
                  : undefined
            }
            onClick={() => tap(dose)}
          >
            <InlineMath latex={`x = ${sp(dose)}`} />
          </button>
        ))}
      </div>

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={reset}>
          Start over
        </button>
      )}

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : missed !== null ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {solved ? (
          <>
            When <InlineMath latex="x = 6" /> the denominator <InlineMath latex="x - 6" />{" "}
            equals zero, so <InlineMath latex="6" /> is the excluded value. Every other
            value is allowed.
          </>
        ) : missed !== null ? (
          <>
            At <InlineMath latex={`x = ${sp(missed)}`} /> the denominator is{" "}
            <InlineMath latex={`${bottomAt(missed)}`} />, which is not zero, so the
            expression is defined. Look for the value that makes the denominator zero.
          </>
        ) : phase === "choose" ? (
          "All four tested. Now tap the value that makes the denominator zero."
        ) : (
          "Tap each value to substitute it into the denominator."
        )}
      </p>
    </div>
  );
}
