/**
 * NUM.2 interactive: reveal the PEMDAS tier color key. The four operation tiers start
 * greyed; the learner taps them top-to-bottom in priority order to reveal each tier's
 * name and on-brand color. Tapping out of order shows a nudge. Gates the lesson once all
 * four tiers are revealed in order.
 */

import { useState } from "react";

import { InlineMath, LINE, PEMDAS, type PemdasRole, SOFT } from "../svgKit";
import { useWidgetSuccess } from "../widgetMechanics";

interface Tier {
  role: PemdasRole;
  /** LaTeX for the tier's operator glyphs. */
  symbol: string;
  label: string;
}

const TIERS: readonly Tier[] = [
  { role: "paren", symbol: "(\\;)", label: "Parentheses" },
  { role: "exp", symbol: "x^{n}", label: "Exponents" },
  { role: "muldiv", symbol: "\\times \\; \\div", label: "Multiply / Divide" },
  { role: "addsub", symbol: "+ \\; -", label: "Add / Subtract" },
];

export function PemdasKeyExplore({ onComplete }: { onComplete?: () => void }) {
  const [revealed, setRevealed] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();

  const solved = revealed >= TIERS.length;

  function tap(index: number) {
    if (index < revealed) {
      return;
    }
    if (index === revealed) {
      setFeedback(null);
      const next = revealed + 1;
      setRevealed(next);
      success();
      if (next >= TIERS.length && !done) {
        setDone(true);
        onComplete?.();
      }
      return;
    }
    setFeedback("Start from the top tier.");
  }

  function reset() {
    setRevealed(0);
    setFeedback(null);
  }

  return (
    <div className="lesson-interactive lesson-interactive--pemdas-key">
      <div
        className="lesson-interactive__controls"
        style={{ flexDirection: "column", alignItems: "stretch" }}
      >
        {TIERS.map((tier, index) => {
          const isRevealed = index < revealed;
          const color = PEMDAS[tier.role];
          return (
            <button
              key={tier.role}
              type="button"
              className="lesson-interactive__step"
              style={{
                color: isRevealed ? color : SOFT,
                borderColor: isRevealed ? color : LINE,
                justifyContent: "flex-start",
                opacity: isRevealed ? 1 : undefined,
              }}
              disabled={isRevealed}
              onClick={() => tap(index)}
            >
              <span style={{ minWidth: 44 }}>
                <InlineMath latex={tier.symbol} />
              </span>
              <span>{isRevealed ? tier.label : "Tap to reveal"}</span>
            </button>
          );
        })}
      </div>

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={reset}>
          Start over
        </button>
      )}

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {solved
          ? "Top tier first: parentheses, then exponents, then multiply or divide, then add or subtract."
          : (feedback ??
            "Tap the tiers from the top down to reveal the order of operations.")}
      </p>
    </div>
  );
}
