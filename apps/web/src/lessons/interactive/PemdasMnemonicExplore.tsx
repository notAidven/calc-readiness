/**
 * NUM.2 interactive: reveal the PEMDAS mnemonic. The six letters P E M D A S are shown;
 * the learner taps each letter in order to reveal its word (Please Excuse My Dear Aunt
 * Sally) and the operation it maps to. Gates the lesson once all six are revealed in
 * order.
 */

import { useState } from "react";

import { LINE, PEMDAS, type PemdasRole, SOFT } from "../svgKit";
import { useWidgetSuccess } from "../widgetMechanics";

interface Rung {
  role: PemdasRole;
  letter: string;
  word: string;
  op: string;
}

const RUNGS: readonly Rung[] = [
  { role: "paren", letter: "P", word: "Please", op: "Parentheses" },
  { role: "exp", letter: "E", word: "Excuse", op: "Exponents" },
  { role: "muldiv", letter: "M", word: "My", op: "Multiply" },
  { role: "muldiv", letter: "D", word: "Dear", op: "Divide" },
  { role: "addsub", letter: "A", word: "Aunt", op: "Add" },
  { role: "addsub", letter: "S", word: "Sally", op: "Subtract" },
];

export function PemdasMnemonicExplore({ onComplete }: { onComplete?: () => void }) {
  const [revealed, setRevealed] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();

  const solved = revealed >= RUNGS.length;

  function tap(index: number) {
    if (index < revealed) {
      return;
    }
    if (index === revealed) {
      setFeedback(null);
      const next = revealed + 1;
      setRevealed(next);
      success();
      if (next >= RUNGS.length && !done) {
        setDone(true);
        onComplete?.();
      }
      return;
    }
    setFeedback("Tap the letters in order, starting from P.");
  }

  function reset() {
    setRevealed(0);
    setFeedback(null);
  }

  return (
    <div className="lesson-interactive lesson-interactive--pemdas-mnemonic">
      <div
        className="lesson-interactive__controls"
        style={{ flexDirection: "column", alignItems: "stretch" }}
      >
        {RUNGS.map((rung, index) => {
          const isRevealed = index < revealed;
          const color = PEMDAS[rung.role];
          return (
            <button
              key={rung.letter}
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
              <span style={{ fontWeight: 700, minWidth: 22 }}>{rung.letter}</span>
              <span style={{ fontWeight: 700, minWidth: 72 }}>
                {isRevealed ? rung.word : "Tap to reveal"}
              </span>
              {isRevealed && <span style={{ color: SOFT }}>{rung.op}</span>}
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
          ? "Please Excuse My Dear Aunt Sally: Parentheses, Exponents, Multiply, Divide, Add, Subtract."
          : (feedback ?? "Tap each letter in order to reveal the word and its operation.")}
      </p>
    </div>
  );
}
