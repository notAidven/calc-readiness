/**
 * LIN.3 slide 3: predict what each candidate rule returns, then run the trial.
 *
 * The slide's claim is that one trial exposes most wrong rearrangements. Watching a trial run
 * would demonstrate nothing, because a learner who is shown two numbers and told they differ has
 * not tested anything. So the learner commits to BOTH candidates' outputs first, on a floor whose
 * real width they can see, and only then is the trial run against the original rule.
 *
 * Two predictions, checked separately, because they are separately winnable: the sound candidate
 * needs the loose term cleared and the division done after it, and the unsound one needs the
 * same arithmetic with the division left out. A learner can do one and slip on the other.
 */

import { useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, SOFT } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { partName, WidgetPartNote, WidgetPartVerdict } from "../widgetPartVerdict";
import { WidgetTask } from "../widgetTask";

interface Candidate {
  id: string;
  /** The candidate rearrangement, as the learner reads it. */
  latex: string;
  spoken: string;
  /** What it returns on this board's trial floor. */
  returns: number;
  /** True when that matches the floor's real measurement. */
  sound: boolean;
  /** The arithmetic, for the reveal and for a missed prediction. */
  working: string;
}

interface Board {
  /** The rule as the tablet has it, and the quantity being isolated. */
  rule: string;
  target: string;
  /** The trial case: the quantities that are known, and the one the trial is checking. */
  known: string;
  trueValue: number;
  candidates: readonly [Candidate, Candidate];
}

/**
 * Neither board is the paragraph's own worked curb trial, which already gives its numbers away.
 *
 * Nor is either one the curb rule itself. This board used to trial $P = 2l + 2w$ for $w$, whose
 * rearrangement worked example 2 derives in full three slides earlier: the trial was being run
 * on a rule the learner had just been handed the answer to, so the only thing left to do was
 * the arithmetic. The sand rule is the same shape of trial on a rearrangement nothing in the
 * lesson works out, and it subtracts where the curb rule adds, so the sound candidate has to
 * add the saving back before it divides.
 */
const BOARDS: readonly Board[] = [
  {
    rule: "S = 4w - r",
    target: "w",
    known: "S = 40, \\;\\; r = 8",
    trueValue: 12,
    candidates: [
      {
        id: "sound",
        latex: "w = \\dfrac{S + r}{4}",
        spoken: "w equals S plus r over 4",
        returns: 12,
        sound: true,
        working: "\\dfrac{40 + 8}{4} = \\dfrac{48}{4} = 12",
      },
      {
        id: "unsound",
        latex: "w = S + r",
        spoken: "w equals S plus r",
        returns: 48,
        sound: false,
        working: "40 + 8 = 48",
      },
    ],
  },
  {
    rule: "T = 3q + k",
    target: "q",
    known: "T = 41, \\;\\; k = 8",
    trueValue: 11,
    candidates: [
      {
        id: "sound",
        latex: "q = \\dfrac{T - k}{3}",
        spoken: "q equals T minus k over 3",
        returns: 11,
        sound: true,
        working: "\\dfrac{41 - 8}{3} = \\dfrac{33}{3} = 11",
      },
      {
        id: "unsound",
        latex: "q = \\dfrac{T}{3} - k",
        spoken: "q equals T over 3 minus k",
        returns: -1,
        sound: false,
        working: "\\dfrac{41}{3} - 8 \\approx 13.67 - 8 = 5.67",
      },
    ],
  },
];

type Verdict = "right" | "wrong";

export function FormulaCheckPlay(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <FormulaCheckPlayBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function FormulaCheckPlayBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [settled, setSettled] = useState<Record<string, boolean>>({});
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [ran, setRan] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const bothCalled = board.candidates.every((candidate) => settled[candidate.id]);

  /**
   * The candidate a reveal is on offer for: called, missed, and still the learner's.
   *
   * ONE at a time, and the fill is what makes that necessary rather than tidy. Both rows can be
   * missed before either is settled, and the shared fill flag carries no row with it: two
   * reveals on offer would put a passage about one prediction over a blank filled with the
   * other. Filling both is worse still, which is what this board did — every input took
   * `fill.entry` unconditionally, so a reveal on one prediction printed the other one's value
   * into a box the passage said nothing about, and marked a prediction the learner had already
   * earned as handed to them.
   */
  const outstanding =
    board.candidates.find(
      (candidate) => verdicts[candidate.id] !== undefined && settled[candidate.id] !== true,
    ) ?? null;
  const givenId = fill.given ? (outstanding?.id ?? null) : null;

  function check(candidate: Candidate) {
    if (settled[candidate.id]) {
      return;
    }
    const typed = entries[candidate.id]?.trim() ?? "";
    if (typed === "") {
      setVerdicts((prev) => ({ ...prev, [candidate.id]: "wrong" }));
      return;
    }
    // The unsound candidate on board two returns a non-integer, so the prompt asks for the
    // whole part and the compare is on rounding down rather than on an exact decimal.
    const predicted = Number.parseFloat(typed);
    const wanted =
      candidate.returns < 0 ? Number.NaN : Math.round(candidate.returns * 100) / 100;
    const hit =
      candidate.returns < 0
        ? Number.isFinite(predicted) && Math.abs(predicted - 5.67) < 0.02
        : Math.abs(predicted - wanted) < 0.001;
    if (hit) {
      setVerdicts((prev) => ({ ...prev, [candidate.id]: "right" }));
      setSettled((prev) => ({ ...prev, [candidate.id]: true }));
      success();
      return;
    }
    setVerdicts((prev) => ({ ...prev, [candidate.id]: "wrong" }));
  }

  function reveal(candidate: Candidate) {
    setEntries((prev) => ({
      ...prev,
      [candidate.id]: candidate.returns < 0 ? "5.67" : String(candidate.returns),
    }));
    setRevealedId(candidate.id);
    setVerdicts((prev) => ({ ...prev, [candidate.id]: "wrong" }));
    setSettled((prev) => ({ ...prev, [candidate.id]: true }));
  }

  function runTrial() {
    setRan(true);
    if (!gateOpen) {
      setGateOpen(true);
      onSolved();
    }
  }

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <WidgetTask>
        Goal: say what each candidate rule returns for this floor before the trial is run,
        then run it and see which of the two agrees with the floor's real measurement.
      </WidgetTask>

      <p className="lesson-equation__naming">
        <InlineMath latex={board.rule} color={SOFT} />, and a floor with{" "}
        <InlineMath latex={board.known} color={SOFT} />
      </p>

      <div className="lesson-equation">
        {board.candidates.map((candidate) => {
          const verdict = verdicts[candidate.id] ?? null;
          const done = settled[candidate.id] === true;
          return (
            <div key={candidate.id} data-part-row={candidate.id}>
              <div className="lesson-equation__row" data-state={done ? "done" : "open"}>
                <span className="lesson-equation__stage lesson-equation__stage--math">
                  <InlineMath latex={candidate.latex} color={done ? CIVIC : LABEL} />
                </span>
                <span className="lesson-equation__body">
                  <InlineMath latex={`${board.target} =`} color={done ? CIVIC : LABEL} />
                  <input
                    className="lesson-equation__slot"
                    type="text"
                    inputMode="decimal"
                    value={entries[candidate.id] ?? ""}
                    readOnly={done}
                    placeholder="A number"
                    aria-label={partName(
                      `What ${candidate.spoken} returns for this floor`,
                      verdict,
                    )}
                    onChange={(event) =>
                      setEntries((prev) => ({
                        ...prev,
                        [candidate.id]: event.target.value,
                      }))
                    }
                    {...(givenId === candidate.id
                      ? fill.entry(candidate.returns < 0 ? "5.67" : candidate.returns)
                      : {})}
                  />
                </span>
                <span className="lesson-equation__aside">
                  {verdict ? <WidgetPartVerdict verdict={verdict} /> : null}
                  {done ? null : (
                    <button
                      type="button"
                      className="lesson-interactive__check lesson-interactive__check--part"
                      onClick={() => check(candidate)}
                    >
                      Check
                    </button>
                  )}
                </span>
              </div>
              {verdict === "wrong" && !done && !fill.given ? (
                <WidgetPartNote>
                  Put the floor's two known measurements into that rule exactly as it is
                  written, and work it out to two decimal places if it does not come out
                  whole.
                </WidgetPartNote>
              ) : null}
              {ran ? (
                <WidgetPartNote>
                  <span style={{ color: candidate.sound ? CIVIC : BRICK }}>
                    <InlineMath
                      latex={candidate.working}
                      color={candidate.sound ? CIVIC : BRICK}
                    />
                    {candidate.sound
                      ? `, which is the floor's own measurement, so this rearrangement survives the trial.`
                      : `, and the floor measures ${board.trueValue}, so this rearrangement fails the trial.`}
                  </span>
                </WidgetPartNote>
              ) : null}
            </div>
          );
        })}
      </div>

      {ran ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Try the trial on a different rule
        </button>
      ) : bothCalled ? (
        <div className="lesson-interactive__controls">
          <button type="button" className="lesson-interactive__check" onClick={runTrial}>
            Run the trial
          </button>
        </div>
      ) : null}

      {board.candidates.map((candidate) => (
        <WidgetReveal
          key={candidate.id}
          available={outstanding?.id === candidate.id}
          revealed={revealedId === candidate.id}
          answer={
            <InlineMath
              latex={`${board.target} = ${candidate.returns < 0 ? "5.67" : candidate.returns}`}
            />
          }
          why={
            <>
              Substituting the floor's measurements into{" "}
              <InlineMath latex={candidate.latex} /> gives{" "}
              <InlineMath latex={candidate.working} />. Whether that is the right ANSWER is
              the trial's business, and this is only what the candidate returns.
            </>
          }
          onReveal={() => reveal(candidate)}
          othersRemain={board.candidates.some(
            (other) => other.id !== candidate.id && !settled[other.id],
          )}
          label="Reveal what it returns"
        />
      ))}

      <p
        className="lesson-interactive__status"
        data-state={ran ? "solved" : "prompt"}
        aria-live="polite"
      >
        {fill.given ? null : ran ? (
          <>
            The floor measures <InlineMath latex={String(board.trueValue)} />, so one
            candidate agreed with it and one did not. A single floor was enough to separate
            them, which is what makes the trial worth running before a rearrangement is
            trusted.
          </>
        ) : bothCalled ? (
          <>Both predictions are in, so the trial can be run against the floor itself.</>
        ) : (
          <span style={{ color: SOFT }}>
            Each candidate is checked on its own, so getting one settles it whatever happens
            to the other.
          </span>
        )}
      </p>
    </div>
  );
}
