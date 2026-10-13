/**
 * INTERACTION KIND: finding the wrong line in a worked solution.
 *
 * A short piece of work is set out line by line, one line of it is wrong, and the learner
 * taps the first line that does not follow. Then, because pointing at a mistake is not the
 * same as knowing what should have happened, they choose the line that belongs there
 * instead. Two answers, both produced, and the second is what the gate turns on.
 *
 * This kind is the natural fit for a misconception that survives being told about it: the
 * learner meets the wrong move already made, in work that looks reasonable, which is how
 * they will meet it in their own writing.
 *
 * ## Why the marker on the flagged line is not red
 *
 * It was, and a correct pick came back boxed in the app's WRONG colour. Two different
 * meanings had been collapsed onto one palette: red and green are the correctness channel
 * everywhere else in the app and they report on the LEARNER'S ACTION, but here they were
 * being spent on the MATHEMATICAL STATUS of the line the learner had chosen. Both readings
 * are coherent, which is why it shipped; the learner reads colour as feedback about
 * themselves first, so finding the mistake was answered with rejection.
 *
 * The marker cannot simply change colour, because it is doing two jobs in sequence. It
 * acknowledges a correct pick, and then it has to KEEP saying which line is under repair
 * for as long as stage two is being answered. So it does them one at a time: green for the
 * pick, and then a third colour, `SIGNAL_DEEP`, for the standing mark. Green and red keep
 * meaning what they mean everywhere else, and a wrong pick still goes red.
 *
 * None of the three states is carried by colour ALONE. Each one names itself in the caption
 * beside the line and in the line's accessible name, and the standing mark is dashed where
 * the two verdicts are solid, so a learner who cannot separate the hues still gets all
 * three, and a later palette edit cannot quietly turn this back into colour-only signalling.
 */

import { type ReactNode, useEffect, useRef, useState } from "react";

import { ComplexFractionInline } from "../../complexFraction";
import { BRICK, CIVIC, InlineMath, LABEL, LINE, SIGNAL_DEEP, SOFT } from "../../svgKit";
import { WidgetReveal } from "../../widgetFeedback";
import { useRevealFill, useRevealReAsk, useWidgetSuccess } from "../../widgetMechanics";
import { WidgetTask } from "../../widgetTask";

/**
 * How long a correct pick is acknowledged in the success colour before the same box settles
 * into the standing mark. Matched to the shared success badge, so the green on the line and
 * the green on the badge come and go together rather than reading as two separate events.
 */
const ACKNOWLEDGE_MS = 1200;

/** What a marked line is currently saying, and every channel it says it in. */
const MARKS = {
  /** The learner picked the wrong line, and this is feedback about that pick. */
  wrong: {
    colour: BRICK,
    style: "solid",
    caption: "this line does follow",
    spoken: "not the line that fails",
  },
  /** They picked the right one. Still feedback about the pick, so still the success colour. */
  correct: {
    colour: CIVIC,
    style: "solid",
    caption: "correct, this is the line",
    spoken: "correct, this is the line that fails",
  },
  /** No longer about the pick: the line stage two is replacing, marked until it is. */
  repair: {
    colour: SIGNAL_DEEP,
    style: "dashed",
    caption: "the line being replaced",
    spoken: "the line being replaced",
  },
  /**
   * The reveal named this line rather than the learner finding it. On this kind the blank IS
   * which line is boxed, so a passage saying "the answer is <line>" over an unboxed listing
   * left the learner to match a rendered formula against four others by eye.
   */
  given: {
    colour: SIGNAL_DEEP,
    style: "dashed",
    caption: "given: this is the line",
    spoken: "given as the line that fails, not answered",
  },
} as const;

type MarkName = keyof typeof MARKS;

export interface WorkedLine {
  id: string;
  latex: string;
  spoken: string;
  /** Set on exactly one line: the first line that does not follow. */
  wrong?: boolean;
  /**
   * Why this line is fine, said only when the learner taps it by mistake.
   *
   * A node rather than a string, like `Correction.miss`, because conceding that a line's
   * arithmetic is right usually means restating that arithmetic, and it has to be typeset
   * where it is restated. As a `string` it could not be, so five boards said "45 times 3
   * really is 135" in bare prose beside the KaTeX they were talking about.
   */
  fine?: ReactNode;
  /**
   * When set, the line is drawn as a spaced complex fraction (numerator, long bar,
   * denominator) instead of one nested `\dfrac`, which KaTeX packs too tight.
   */
  complex?: { numerator: string; denominator: string };
}

export interface Correction {
  id: string;
  latex: string;
  spoken: string;
  correct?: boolean;
  /** Why this replacement is wrong, said when it is chosen. */
  miss?: ReactNode;
}

export interface SpotTheErrorProps {
  /**
   * WHAT the learner is being asked to produce, in the imperative, above the work.
   *
   * Required, and separate from both of the prompts below. `heading` frames the SITUATION
   * ("somebody has worked this out and reached an answer that cannot be right") and the two
   * prompts name the CONTROL for whichever stage is live, and both of those left the task
   * itself unstated until the status line at the very bottom. So a learner met the work, then
   * three tappable lines, and only then a sentence saying what to do with them.
   */
  objective: ReactNode;
  /** The heading above the work, e.g. "somebody's answer to ...". */
  heading: ReactNode;
  lines: readonly WorkedLine[];
  corrections: readonly Correction[];
  /** Why the flagged line is wrong. Shown once it is found, and by the reveal. */
  diagnosis: ReactNode;
  /** Why the right replacement is right. */
  remedy: ReactNode;
  findPrompt: string;
  fixPrompt: string;
  conclusion: ReactNode;
  ariaLabel: string;
  onSolved: () => void;
  onRestart: () => void;
  restartLabel: string;
}

export function SpotTheError({
  objective,
  heading,
  lines,
  corrections,
  diagnosis,
  remedy,
  findPrompt,
  fixPrompt,
  conclusion,
  ariaLabel,
  onSolved,
  onRestart,
  restartLabel,
}: SpotTheErrorProps) {
  const [found, setFound] = useState(false);
  const [fixed, setFixed] = useState(false);
  const [findTried, setFindTried] = useState(false);
  const [fixTried, setFixTried] = useState(false);
  const [findRevealed, setFindRevealed] = useState(false);
  const [fixRevealed, setFixRevealed] = useState(false);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  /** Which of the two jobs the mark on the flagged line is currently doing. */
  const [flagMark, setFlagMark] = useState<"correct" | "repair">("repair");
  /** The last line tapped by mistake, marked as a wrong pick until the next tap. */
  const [missedLine, setMissedLine] = useState<string | null>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  useEffect(
    () => () => {
      if (settle.current !== null) {
        clearTimeout(settle.current);
      }
    },
    [],
  );

  const badLine = lines.find((l) => l.wrong) ?? null;
  const rightFix = corrections.find((c) => c.correct) ?? null;
  const solved = fixed;

  function tapLine(line: WorkedLine) {
    if (found) {
      return;
    }
    if (line.wrong) {
      setFound(true);
      setFeedback(null);
      setFindRevealed(false);
      setMissedLine(null);
      // Green first, because this is the moment the learner's pick is being answered. The
      // box then hands over to the standing mark: from there on it is saying which line
      // stage two is replacing, which is not a verdict on anybody.
      setFlagMark("correct");
      if (settle.current !== null) {
        clearTimeout(settle.current);
      }
      settle.current = setTimeout(() => setFlagMark("repair"), ACKNOWLEDGE_MS);
      success();
      return;
    }
    setFindTried(true);
    setFindRevealed(false);
    setMissedLine(line.id);
    setFeedback(
      line.fine ??
        "That line does follow from the one above it. Read on for the one that does not.",
    );
  }

  function finish(earned: boolean) {
    setFixed(true);
    setFeedback(null);
    if (earned) {
      success();
    }
    onSolved();
  }

  function tapFix(fix: Correction) {
    if (fixed) {
      return;
    }
    if (fix.correct) {
      setFixRevealed(false);
      finish(true);
      return;
    }
    setFixTried(true);
    setFixRevealed(false);
    setFeedback(fix.miss ?? "Not that one. Look again at what the rule actually allows.");
  }

  const neutral = { color: LABEL, borderColor: LINE };

  return (
    <div className="lesson-interactive lesson-interactive--spot">
      {/* The task first, then the situation it is about. Both stand for the whole
          interaction, so neither belongs on the status line, which is spent on feedback. */}
      <WidgetTask>{objective}</WidgetTask>
      <p className="lesson-spot__heading">{heading}</p>

      {/* The work is centred by the stylesheet on every board. It used to be an opt-in prop,
          which two of the eight boards passed and six forgot, so the same interaction landed
          in two different places on the card depending on the lesson. A layout that every
          instance owes is the kind's job, and a prop nobody can pass cannot be forgotten. */}
      <ol className="lesson-spot__work" aria-label={ariaLabel}>
        {lines.map((line) => {
          const marked: MarkName | null = found
            ? line.wrong
              ? flagMark
              : null
            : // Not found yet, so a reveal on screen is the one naming the line.
              fill.given && line.wrong
              ? "given"
              : line.id === missedLine
                ? "wrong"
                : null;
          const mark = marked === null ? null : MARKS[marked];
          return (
            <li key={line.id} className="lesson-spot__line" data-state={marked ?? "plain"}>
              <button
                type="button"
                className="lesson-spot__line-button"
                disabled={found}
                aria-label={
                  mark === null
                    ? found
                      ? line.spoken
                      : `Flag the line ${line.spoken}`
                    : `${line.spoken}, ${mark.spoken}`
                }
                style={{
                  borderColor: mark?.colour ?? "transparent",
                  borderStyle: mark?.style ?? "solid",
                }}
                onClick={() => tapLine(line)}
                {...fill.mark(marked === "given")}
              >
                {/* The maths itself stays ink in every state. Tinting the line by its own
                    verdict was half of what made a correct pick read as a rejection, and
                    the marker beside it already says everything the tint was saying. */}
                {line.complex ? (
                  <ComplexFractionInline
                    numerator={line.complex.numerator}
                    denominator={line.complex.denominator}
                    color={LABEL}
                  />
                ) : (
                  <InlineMath latex={line.latex} color={LABEL} />
                )}
              </button>
              {mark === null ? null : (
                <span className="lesson-spot__flag" style={{ color: mark.colour }}>
                  {mark.caption}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {found && !fixed && (
        <div className="lesson-interactive__controls">
          {corrections.map((fix) => (
            <button
              key={fix.id}
              type="button"
              className="lesson-interactive__step"
              style={neutral}
              aria-label={`Replace it with ${fix.spoken}`}
              onClick={() => tapFix(fix)}
            >
              <InlineMath latex={fix.latex} />
            </button>
          ))}
        </div>
      )}

      {fixed && rightFix && (
        <p className="lesson-sorter__result" style={{ color: LABEL }}>
          The line should read <InlineMath latex={rightFix.latex} color={CIVIC} />
        </p>
      )}

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          {restartLabel}
        </button>
      )}

      <WidgetReveal
        available={findTried && !found}
        revealed={findRevealed}
        // Stage one of two, so the replacement is still outstanding: this reveal explains
        // which line fails and hands the work back for the learner to flag it and fix it.
        // Written off `fixed` rather than as a constant, because what makes it resumable is
        // that another answer is genuinely still owed, not that this is the first reveal.
        othersRemain={!fixed}
        answer={badLine === null ? null : <InlineMath latex={badLine.latex} />}
        why={diagnosis}
        onReveal={() => {
          setFindRevealed(true);
          setFound(true);
          setFeedback(null);
          setMissedLine(null);
          // Straight to the standing mark, with no green on the way. Nothing was answered,
          // and the success colour here would credit the learner with a pick they never made.
          setFlagMark("repair");
        }}
        label="Reveal which line is wrong"
      />

      {found && (
        /* Stage two, and deliberately NOT resumable: the replacement is the last answer this
           work is asking for and the gate turns on it, so handing the work back here would
           hand over the gate. The spent instance and its fresh replacement, as before. */
        <WidgetReveal
          available={fixTried && !fixed}
          revealed={fixRevealed}
          answer={rightFix === null ? null : <InlineMath latex={rightFix.latex} />}
          why={remedy}
          onReveal={() => {
            setFixRevealed(true);
            finish(false);
          }}
          label="Reveal what it should say"
        />
      )}

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {fixRevealed ? null : solved ? (
          conclusion
        ) : feedback ? (
          feedback
        ) : found ? (
          <>
            {diagnosis} {fixPrompt}
          </>
        ) : (
          <span style={{ color: SOFT }}>{findPrompt}</span>
        )}
      </p>
    </div>
  );
}
