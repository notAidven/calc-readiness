/**
 * POL.2 slide 1: pick the largest module that divides the whole order.
 *
 * "Greatest" is the word the learner skips. A common factor that is merely common leaves
 * something still shared inside the bracket, and the next stage of the factoring then fails for
 * a reason that looks like the trinomial's fault rather than this step's. So the options are a
 * ladder of genuine common factors: every one of them divides both terms, only one of them is
 * the largest, and picking a smaller one is answered by showing what is left over still
 * carrying a factor.
 *
 * A wrong pick locks that option and names what survived it, so the board teaches the
 * difference between common and greatest rather than only marking the tap.
 */

import { type ReactNode, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, SIGNAL_DEEP, SOFT } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

interface Board {
  /** The order is `k*m*x^{e+1} + k*n*x^{e}`, so the greatest common factor is `k x^e`. */
  k: number;
  e: number;
  m: number;
  n: number;
  /** The smaller common factors offered beside the right one. */
  decoys: readonly { latex: string; spoken: string; left: string }[];
}

const BOARDS: readonly Board[] = [
  {
    k: 6,
    e: 1,
    m: 2,
    n: 3,
    decoys: [
      { latex: "2x", spoken: "2 x", left: "6x + 9" },
      { latex: "3", spoken: "3", left: "4x^{2} + 6x" },
      { latex: "6", spoken: "6", left: "2x^{2} + 3x" },
    ],
  },
  {
    k: 5,
    e: 2,
    m: 3,
    n: 4,
    decoys: [
      { latex: "5x", spoken: "5 x", left: "3x^{2} + 4x" },
      { latex: "x^{2}", spoken: "x squared", left: "15x + 20" },
      { latex: "5", spoken: "5", left: "3x^{3} + 4x^{2}" },
    ],
  },
];

export function CommonMeasureClassify(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <CommonMeasureClassifyBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function pow(e: number): string {
  return e === 0 ? "" : e === 1 ? "x" : `x^{${e}}`;
}

function CommonMeasureClassifyBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const { k, e, m, n } = board;
  const order = `${k * m}${pow(e + 1)} + ${k * n}${pow(e)}`;
  const gcf = `${k}${pow(e)}`;
  const remainder = `${m}x + ${n}`;

  const options: readonly {
    id: string;
    latex: string;
    spoken: string;
    right: boolean;
    note: ReactNode;
  }[] = [
    ...board.decoys.map((decoy) => ({
      id: decoy.latex,
      latex: decoy.latex,
      spoken: decoy.spoken,
      right: false,
      note: (
        <>
          <InlineMath latex={decoy.latex} /> does divide both terms, so it is common. Taking
          it out leaves <InlineMath latex={decoy.left} />, and those two still share
          something, so the job is not finished and the trinomial work that follows would
          run on the wrong amount.
        </>
      ),
    })),
    {
      id: gcf,
      latex: gcf,
      spoken: `${k} ${e === 0 ? "" : e === 1 ? "x" : "x squared"}`.trim(),
      right: true,
      note: null,
    },
  ];
  /** Dealt with the answer neither first nor last, so position never carries it. */
  const dealt = [options[1], options[3], options[0], options[2]].filter(
    (option): option is (typeof options)[number] => Boolean(option),
  );

  const [locked, setLocked] = useState<Record<string, boolean>>({});
  const [chosen, setChosen] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const settled = chosen !== null;
  const missedNote = options.find((option) => option.id === chosen && !option.right)?.note;

  function open() {
    if (!gateOpen) {
      setGateOpen(true);
      onSolved();
    }
  }

  function pick(id: string, right: boolean) {
    if (settled || locked[id]) {
      return;
    }
    if (right) {
      setChosen(id);
      success();
      open();
      return;
    }
    setLocked({ ...locked, [id]: true });
    setChosen(id);
  }

  function reveal() {
    setRevealed(true);
    setChosen(gcf);
    open();
  }

  return (
    <div className="lesson-interactive lesson-interactive--classify">
      <WidgetTask>
        Goal: name the largest module that divides every term of this order, so that what is
        left inside the bracket has nothing further in common.
      </WidgetTask>

      <p className="lesson-equation__naming">
        <InlineMath latex={order} color={LABEL} />
      </p>

      <div className="lesson-interactive__controls">
        {dealt.map((option) => {
          const isChosen = chosen === option.id;
          const wrongPick = locked[option.id] === true;
          const standing = revealed && option.right && !isChosen;
          return (
            <button
              key={option.id}
              type="button"
              className="lesson-interactive__chip"
              disabled={settled || wrongPick}
              aria-pressed={isChosen}
              aria-label={
                wrongPick
                  ? `${option.spoken}, your answer, wrong`
                  : isChosen && option.right
                    ? `${option.spoken}, your answer, correct`
                    : standing
                      ? `${option.spoken}, the right call here, which you did not pick`
                      : option.spoken
              }
              style={{
                color: LABEL,
                borderColor: wrongPick
                  ? BRICK
                  : isChosen && option.right
                    ? CIVIC
                    : standing
                      ? SIGNAL_DEEP
                      : SOFT,
                borderStyle: standing ? "dashed" : "solid",
              }}
              onClick={() => pick(option.id, option.right)}
            >
              <InlineMath latex={option.latex} />
              {wrongPick ? " \u2717" : isChosen && option.right ? " \u2713" : null}
            </button>
          );
        })}
      </div>

      {settled ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different order
        </button>
      ) : null}

      <WidgetReveal
        available={settled && missedNote !== undefined && missedNote !== null && !revealed}
        revealed={revealed}
        answer={<InlineMath latex={gcf} />}
        why={
          <>
            The numbers <InlineMath latex={`${k * m}`} /> and{" "}
            <InlineMath latex={`${k * n}`} /> share <InlineMath latex={`${k}`} /> and
            nothing larger, and the lowest power of <InlineMath latex="x" /> present is{" "}
            <InlineMath latex={pow(e) || "1"} />, so the greatest common factor takes both:{" "}
            <InlineMath latex={gcf} />. Taking it out leaves{" "}
            <InlineMath latex={remainder} />, which shares nothing further, and that is the
            test that says the right module was chosen.
          </>
        }
        onReveal={reveal}
        label="Reveal the common measure"
      />

      <p
        className="lesson-interactive__status"
        data-state={settled && missedNote ? "wrong" : settled ? "solved" : "prompt"}
        aria-live="polite"
      >
        {revealed ? null : settled ? (
          missedNote ? (
            <span style={{ color: BRICK }}>{missedNote}</span>
          ) : (
            <>
              <InlineMath latex={`${order} = ${gcf}(${remainder})`} color={CIVIC} />, and{" "}
              <InlineMath latex={remainder} /> shares nothing further, which is what makes
              this module the greatest rather than merely a common one.
            </>
          )
        ) : (
          <span style={{ color: SOFT }}>
            Every option here divides both terms. Only one of them leaves nothing shared
            behind.
          </span>
        )}
      </p>
    </div>
  );
}
