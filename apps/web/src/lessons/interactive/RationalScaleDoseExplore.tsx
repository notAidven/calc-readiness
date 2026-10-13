/**
 * RAT.2 interactive (slide 2): where the forbidden measures of a PRODUCT come from. The
 * learner works out the dose each ORIGINAL bottom rules out and types it in, and then has
 * to rule on the one whose factor cancelled, which is the whole point of the slide: the
 * factor leaves, the restriction does not.
 *
 * Typed rather than tapped. The version this replaces uncovered each excluded value on a
 * tap, so a learner could reach the ruling question having solved neither denominator; the
 * value is one step of arithmetic, and asking for it is what makes the ruling mean anything.
 * Its instance, 3/(x - 2) times (x - 2)/(x + 7), appears nowhere else in the lesson.
 *
 * The two denominators are solved one at a time: only the active row shows an input and a
 * Check button, so the order is visible and the button sits beside the value it grades.
 */

import { type ReactNode, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SOFT, SvgMath } from "../svgKit";
import { useWidgetSuccess } from "../widgetMechanics";

const PRODUCT = "\\dfrac{3}{x - 2} \\times \\dfrac{x - 2}{x + 7}";
const REDUCED = "= \\dfrac{3}{x + 7}";

interface Bottom {
  /** The denominator, as LaTeX. */
  latex: string;
  /** The dose it forbids, as LaTeX. */
  dose: string;
  /** The value that makes this denominator zero. */
  root: number;
  /** Does this factor survive into the reduced recipe? */
  survives: boolean;
  /** The field's label, ending in the `x =` the learner completes. */
  fieldLatex: string;
  /** The field's accessible name, with the math spelled out in words. */
  aria: string;
  /** Short name for the step label. */
  stepLabel: string;
  /** What the denominator comes to at a value that is not its root. */
  valueAt(x: number): number;
}

const BOTTOMS: readonly Bottom[] = [
  {
    latex: "x - 2",
    dose: "x \\ne 2",
    root: 2,
    survives: false,
    fieldLatex: "x - 2 = 0 \\;\\Rightarrow\\; x =",
    aria: "the value that makes the first fraction's denominator, x minus 2, zero",
    stepLabel: "first denominator",
    valueAt: (x) => x - 2,
  },
  {
    latex: "x + 7",
    dose: "x \\ne -7",
    root: -7,
    survives: true,
    fieldLatex: "x + 7 = 0 \\;\\Rightarrow\\; x =",
    aria: "the value that makes the second fraction's denominator, x plus 7, zero",
    stepLabel: "second denominator",
    valueAt: (x) => x + 7,
  },
];

/**
 * The number a learner typed, read out of the notations they might reach for: a bare `-7`,
 * `x = -7`, `x ≠ -7`, or the same with a unicode minus off a phone keyboard. Judging the
 * value rather than the spelling keeps the widget about the mathematics.
 */
function typedValue(raw: string): number | null {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/\u2212/g, "-")
    .replace(/\s+/g, "")
    .replace(/^x?(\\ne|\\neq|≠|!=|=)?/, "");
  if (!/^[+-]?\d+(\.\d+)?$/.test(cleaned)) {
    return null;
  }
  return Number(cleaned);
}

export function RationalScaleDoseExplore({ onComplete }: { onComplete?: () => void }) {
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [found, setFound] = useState<Record<string, boolean>>({});
  const [ruled, setRuled] = useState(false);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();

  const bothFound = BOTTOMS.every((bottom) => found[bottom.latex]);
  const active = BOTTOMS.find((bottom) => !found[bottom.latex]) ?? null;
  const solvedCount = BOTTOMS.filter((bottom) => found[bottom.latex]).length;

  function checkActive() {
    if (active === null) {
      return;
    }
    const raw = entries[active.latex] ?? "";
    if (raw.trim() === "") {
      setFeedback(
        <>
          Type the value that makes <InlineMath latex={active.latex} /> zero, then check.
        </>,
      );
      return;
    }
    const value = typedValue(raw);
    if (value === null) {
      setFeedback(
        <>
          That is not a value yet. Type the number that makes{" "}
          <InlineMath latex={active.latex} /> zero, like <InlineMath latex="-3" />.
        </>,
      );
      return;
    }
    if (value !== active.root) {
      setFeedback(
        <>
          Not that one. At <InlineMath latex={`x = ${value}`} /> the denominator{" "}
          <InlineMath latex={active.latex} /> comes to{" "}
          <InlineMath latex={`${active.valueAt(value)}`} />, and only a denominator of{" "}
          <InlineMath latex="0" /> is forbidden.
        </>,
      );
      return;
    }
    setFeedback(null);
    setFound((prev) => ({ ...prev, [active.latex]: true }));
    success();
  }

  function rule(stillForbidden: boolean) {
    if (!stillForbidden) {
      setFeedback(
        "Not quite. At that value the original expression is undefined, and cancelling a factor cannot undo that.",
      );
      return;
    }
    setFeedback(null);
    setRuled(true);
    success();
    if (!done) {
      setDone(true);
      onComplete?.();
    }
  }

  function reset() {
    setEntries({});
    setFound({});
    setRuled(false);
    setFeedback(null);
  }

  let status: ReactNode;
  if (feedback) {
    status = feedback;
  } else if (!bothFound && active !== null) {
    status =
      solvedCount === 0 ? (
        <>
          Set the <strong>{active.stepLabel}</strong> to <InlineMath latex="0" /> and type
          the value of <InlineMath latex="x" />.
        </>
      ) : (
        <>
          Good. Now the <strong>{active.stepLabel}</strong>: set{" "}
          <InlineMath latex={active.latex} /> to <InlineMath latex="0" /> and type{" "}
          <InlineMath latex="x" />.
        </>
      );
  } else if (!ruled) {
    status = (
      <>
        The factor <InlineMath latex="x - 2" /> cancelled and is gone from the reduced
        expression. Is <InlineMath latex="x = 2" /> still excluded?
      </>
    );
  } else {
    status = (
      <>
        Right. Both <InlineMath latex="x \ne 2" /> and <InlineMath latex="x \ne -7" /> apply
        to <InlineMath latex="\dfrac{3}{x + 7}" />, because the excluded values come from
        the denominators you started with.
      </>
    );
  }

  // Both chips render in the SAME neutral token, so colour is never a tell.
  const neutral = { color: LABEL, borderColor: LINE };

  return (
    <div className="lesson-interactive lesson-interactive--explore">
      <svg
        viewBox="0 0 440 190"
        role="img"
        aria-label="3 over x minus 2, times x minus 2 over x plus 7, reduces to 3 over x plus 7 and forbids x equals 2 and x equals negative 7"
      >
        <title>Excluded values of a product come from the original denominators</title>

        <SvgMath latex={PRODUCT} x={220} y={34} fontSize={20} color={LABEL} h={80} />
        <SvgMath latex={REDUCED} x={220} y={96} fontSize={20} color={LABEL} h={80} />

        <line x1={40} y1={128} x2={400} y2={128} stroke={LINE} strokeWidth={1} />
        <text x={220} y={146} textAnchor="middle" fontSize={13} fill={SOFT}>
          excluded values
        </text>

        {BOTTOMS.map((bottom, index) =>
          found[bottom.latex] ? (
            <SvgMath
              key={bottom.latex}
              latex={bottom.dose}
              x={index === 0 ? 150 : 290}
              y={172}
              fontSize={18}
              color={bottom.survives ? CIVIC : BRICK}
              w={140}
            />
          ) : null,
        )}
      </svg>

      {!bothFound && active !== null && (
        <div className="lesson-interactive__controls">
          <span className="lesson-interactive__step-label">
            {solvedCount + 1} of {BOTTOMS.length}: {active.stepLabel}
          </span>
          <div className="lesson-interactive__field">
            <span className="lesson-interactive__field-label">
              <InlineMath latex={active.fieldLatex} />
            </span>
            <input
              className="lesson-interactive__input"
              type="text"
              inputMode="text"
              value={entries[active.latex] ?? ""}
              aria-label={active.aria}
              onChange={(event) =>
                setEntries((prev) => ({ ...prev, [active.latex]: event.target.value }))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  checkActive();
                }
              }}
            />
            <button
              type="button"
              className="lesson-interactive__check"
              onClick={checkActive}
            >
              Check
            </button>
          </div>
        </div>
      )}

      {bothFound && !ruled && (
        <div className="lesson-interactive__controls">
          <button
            type="button"
            className="lesson-interactive__chip"
            style={neutral}
            onClick={() => rule(true)}
          >
            Still excluded
          </button>
          <button
            type="button"
            className="lesson-interactive__chip"
            style={neutral}
            onClick={() => rule(false)}
          >
            Allowed now
          </button>
        </div>
      )}

      {ruled && (
        <button type="button" className="lesson-interactive__reset" onClick={reset}>
          Start over
        </button>
      )}

      <p
        className="lesson-interactive__status"
        data-state={ruled ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {status}
      </p>
    </div>
  );
}
