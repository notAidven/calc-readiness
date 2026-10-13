/**
 * RAD.3 interactive (slide 3): build the RADICAL form of a rational power. Given x^(p/q),
 * the learner types the power that goes under the root and the root index, and the radical
 * assembles only from what they entered. Round 1 is x^(6/5) and round 2 is x^(5/6), the same
 * two numbers each way round, so the second round cannot be answered by retyping the first:
 * both differ from the worked example directly above (x^(4/3)), from the derivation slide's
 * root indices, from the reverse builder on the next slide, and from the node's CFU
 * (25^(3/2)). Each box latches and fires the success signal
 * on its own, so getting one right is not lost when the other misses. After a real attempt,
 * the learner may reveal whichever box they are stuck on, with the reasoning that produces
 * it; a revealed box completes the round but earns no success. Gates once both rounds are
 * built.
 *
 * The board states its mapping ONCE. It used to say it three times over: an annotation under
 * the fraction, a second annotation under the assembled radical, and the status line, plus
 * the two input labels making four. The annotation under the fraction survives, because that
 * is where the two numbers actually are; the status line now carries the one thing no label
 * can, which is that the fraction's "root" and the radical's "index" are one number under
 * two names. Shortening the labels alone would have fixed the phrasing and left the density.
 *
 * The labels are bare `Power =` and `Index =` because the diagram already shows where each
 * one goes, so a label that narrates the picture is spending a line to repeat it. "Index that
 * goes in the crook" also quizzed on a word nothing defines: there is no standard name for
 * the notch an index sits in, and radical, radicand and index are all real terms available
 * to this lesson.
 *
 * Neither field carries a colour. They used to be green and rust, which read as correctness
 * once #161 defined green as a right answer, and they were binding nothing to the diagram:
 * the assembled radical renders in one colour for both boxes, so the hue never had a
 * counterpart to point at.
 *
 * ## Each box is answered on its own
 *
 * One button builds the root, because the power and the index are two halves of ONE conversion
 * rather than two questions. What used to be shared with it was the ANSWER: a learner who had
 * the power right and the index wrong was told "Not quite. A fraction exponent splits into two
 * different jobs, so look again at which number is acting as a power and which one is naming
 * the root", which restates the method at both boxes and names neither. The box that had landed
 * only went dim, and a dim box reads as unavailable rather than as right.
 *
 * So each box carries its own verdict and its own sentence, and the sentence is about what was
 * typed INTO THAT BOX: the 3 in the power box is the index, or 7 is neither of the two numbers
 * this exponent has. The status line went back to carrying the one thing no box-level line can,
 * which is that the fraction's "root" and the radical's "index" are the same number.
 */

import { type ReactNode, useState } from "react";

import { CIVIC, InlineMath, LABEL, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import {
  type PartVerdict,
  partName,
  WidgetPartNote,
  WidgetPartVerdict,
} from "../widgetPartVerdict";
import { WidgetTask } from "../widgetTask";
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

interface Round {
  /** Exponent numerator = the power under the root. */
  p: number;
  /** Exponent denominator = the root index. */
  q: number;
}

/**
 * Two sets of two fraction exponents. "Start over" hands out the set the learner has NOT
 * just built, so the second pass is another conversion rather than the same one retyped.
 *
 * The opening round used to be $x^{4/3}$, which is the worked example on this slide, so both
 * boxes were copied off the text above rather than worked. Neither of its numbers survives
 * here: reusing the index alone would still hand over one of the two boxes, since the whole
 * question is which number does which job.
 */
const POOLS: readonly (readonly Round[])[] = [
  [
    { p: 6, q: 5 },
    { p: 5, q: 6 },
  ],
  [
    { p: 7, q: 4 },
    { p: 2, q: 5 },
  ],
];

const BOXES = ["power", "index"] as const;
type Box = (typeof BOXES)[number];

const NOTHING_CHECKED: Record<Box, PartVerdict | null> = { power: null, index: null };

/** What the root of index q is called in prose, so no label has to say "3th root". */
const ROOT_NAME: Record<number, string> = {
  3: "cube root",
  4: "fourth root",
  5: "fifth root",
  6: "sixth root",
};

function rootName(q: number): string {
  return ROOT_NAME[q] ?? `root of index ${q}`;
}

export function RadicalFormBuilder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(POOLS.length, props);
  const rounds = POOLS[variant.index] ?? (POOLS[0] as readonly Round[]);
  return (
    <RadicalFormBuilderBody
      key={variant.nonce}
      rounds={rounds}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function RadicalFormBuilderBody({
  rounds,
  onSolved,
  onRestart,
}: {
  rounds: readonly Round[];
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [powerVal, setPowerVal] = useState("");
  const [indexVal, setIndexVal] = useState("");
  const [powerDone, setPowerDone] = useState(false);
  const [indexDone, setIndexDone] = useState(false);
  const [marks, setMarks] = useState<Record<Box, PartVerdict | null>>(NOTHING_CHECKED);
  const [attempted, setAttempted] = useState(false);
  const [revealedBox, setRevealedBox] = useState<Box | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const lastIndex = rounds.length - 1;
  const round = rounds[roundIndex] ?? (rounds[0] as Round);
  const isLastRound = roundIndex === lastIndex;
  const solved = powerDone && indexDone;

  /**
   * A box's verdict after a check: right once it has landed, and NOT WRONG while it is empty,
   * because an unanswered box is unanswered rather than incorrect.
   */
  function markFor(landed: boolean, typed: string): PartVerdict | null {
    return landed ? "right" : typed.trim() === "" ? null : "wrong";
  }

  function check() {
    setAttempted(true);
    // Plain entry takes anything, so each box is read before it is compared: a non-number
    // is a miss the note under the row names, not a NaN that reaches the comparison.
    const powerRead = readNumericEntry(powerVal, "integer");
    const indexRead = readNumericEntry(indexVal, "integer");
    const wonPower = !powerDone && powerRead.ok && powerRead.value === round.p;
    const wonIndex = !indexDone && indexRead.ok && indexRead.value === round.q;
    const nextPower = powerDone || wonPower;
    const nextIndex = indexDone || wonIndex;
    setPowerDone(nextPower);
    setIndexDone(nextIndex);
    // One verdict per box, from the one press: a half-right build is half confirmed on screen
    // rather than answered as a whole miss.
    setMarks({
      power: markFor(nextPower, powerVal),
      index: markFor(nextIndex, indexVal),
    });
    if (wonPower) {
      success();
    }
    if (wonIndex) {
      success();
    }
    if (nextPower && nextIndex) {
      if (isLastRound && !done) {
        setDone(true);
        onSolved();
      }
      return;
    }
    // A fresh attempt: the reveal steps aside so it can be offered for the box still open.
    setRevealedBox(null);
  }

  /** Type into one box, which retires its verdict: that was about the previous entry. */
  function typeInto(box: Box, raw: string) {
    if (box === "power") {
      setPowerVal(raw);
    } else {
      setIndexVal(raw);
    }
    setMarks((prev) => (prev[box] === null ? prev : { ...prev, [box]: null }));
  }

  /** Fill one box in for a learner who is stuck. Completes the round, earns no success. */
  function revealBox(box: Box) {
    setRevealedBox(box);
    // A handed answer earns no verdict either way: it was not answered.
    setMarks((prev) => ({ ...prev, [box]: null }));
    if (box === "power") {
      setPowerVal(String(round.p));
      setPowerDone(true);
    } else {
      setIndexVal(String(round.q));
      setIndexDone(true);
    }
    const nextPower = powerDone || box === "power";
    const nextIndex = indexDone || box === "index";
    if (nextPower && nextIndex && isLastRound && !done) {
      setDone(true);
      onSolved();
    }
  }

  function nextRound() {
    if (roundIndex < lastIndex) {
      setRoundIndex(roundIndex + 1);
      setPowerVal("");
      setIndexVal("");
      setPowerDone(false);
      setIndexDone(false);
      setMarks(NOTHING_CHECKED);
      setAttempted(false);
      setRevealedBox(null);
    }
  }

  /** The box the reveal is speaking about: the one just revealed, else the one still open. */
  const revealTarget: Box | null =
    revealedBox ?? (solved ? null : !powerDone ? "power" : "index");

  /** Once the round is built, the reveal panel is the explanation; the status stands down. */
  const revealOwnsExplanation = revealedBox !== null && solved;

  const revealWhy: ReactNode =
    revealTarget === "power" ? (
      <>
        The exponent <InlineMath latex={`\\tfrac{${round.p}}{${round.q}}`} /> is doing two
        jobs at once, and the top number is the one acting as an ordinary power. The base is
        raised to the {round.p}, so it is the {round.p} that goes under the radical.
      </>
    ) : (
      <>
        The bottom of a fraction exponent is what names the root, exactly as{" "}
        <InlineMath latex={`x^{\\frac{1}{${round.q}}} = \\sqrt[${round.q}]{x}`} /> on the
        slide before. So the {round.q} becomes the index, the small number written into the
        radical sign.
      </>
    );

  const builtLatex = `\\sqrt[${indexDone ? round.q : "?"}]{x^{${powerDone ? round.p : "?"}}}`;

  /**
   * The answer to ONE missed box, in the number that box actually holds.
   *
   * This is what the restatement of the method was replaced by, so both branches name a
   * quantity on screen: the number the learner typed, and what that number is here.
   */
  function boxNote(box: Box, raw: string): ReactNode {
    // Plain entry takes anything, so a non-number is its own miss rather than reaching the
    // sentences below as a NaN and being printed back at the learner. The floor the box's
    // `min` used to carry is checked here too, now that the attribute has gone with the
    // spinner: a power is 1 or more, and an index names which root it is, so it is 2 or more.
    const read = readNumericEntry(raw, "integer");
    if (!read.ok) {
      return WHOLE_NUMBER_MISS;
    }
    const floor = box === "power" ? 1 : 2;
    if (read.value < floor) {
      return box === "power" ? (
        <>The power under the root is 1 or more.</>
      ) : (
        <>An index names which root it is, so it is 2 or more.</>
      );
    }
    const typed = read.value;
    const other = box === "power" ? round.q : round.p;
    if (typed === other) {
      return box === "power" ? (
        <>
          That <InlineMath latex={`${typed}`} /> is the index of the root, which the radical
          sign carries rather than covers.
        </>
      ) : (
        <>
          That <InlineMath latex={`${typed}`} /> is the power, which sits under the root
          rather than in the crook of the sign.
        </>
      );
    }
    return (
      <>
        <InlineMath latex={`x^{\\frac{${round.p}}{${round.q}}}`} /> has only{" "}
        <InlineMath latex={`${round.p}`} /> and <InlineMath latex={`${round.q}`} /> in it,
        and this box has <InlineMath latex={`${typed}`} />.
      </>
    );
  }

  /** One box, its verdict, and the sentence answering it. */
  function buildRow(box: Box) {
    const isPower = box === "power";
    const landed = isPower ? powerDone : indexDone;
    const typed = isPower ? powerVal : indexVal;
    const verdict = marks[box];
    return (
      <div key={box} className="lesson-interactive__row">
        <div className="lesson-interactive__field" style={{ color: LABEL }}>
          <span className="lesson-interactive__field-label">
            {isPower ? "Power =" : "Index ="}
          </span>
          <input
            className="lesson-interactive__input"
            {...numericEntryProps("integer")}
            value={landed ? String(isPower ? round.p : round.q) : typed}
            disabled={landed}
            aria-label={partName(isPower ? "Power under the root" : "Root index", verdict)}
            onChange={(e) => typeInto(box, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                check();
              }
            }}
            // Last, so the answer overrides whatever the learner typed for as long as the
            // reveal is up, and only on the box `revealTarget` names: the reveal takes the
            // first box still open and states THAT number, so filling the other one would
            // hand over an answer the passage above says nothing about.
            {...(box === revealTarget ? fill.entry(isPower ? round.p : round.q) : {})}
          />
        </div>
        {verdict !== null && <WidgetPartVerdict verdict={verdict} />}
        {verdict === "wrong" && <WidgetPartNote>{boxNote(box, typed)}</WidgetPartNote>}
      </div>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <WidgetTask>
        Rewrite this fraction exponent with a root sign, by settling which of its two
        numbers does which of the two jobs.
      </WidgetTask>

      <svg
        viewBox="0 0 440 134"
        role="img"
        aria-label={`Build the ${rootName(round.q)} of x to the ${round.p} from x to the ${round.p} over ${round.q}`}
      >
        <title>Build the radical form of a rational power</title>

        <text x={220} y={22} textAnchor="middle" fontSize={12} fill={SOFT}>
          {`Round ${roundIndex + 1} of ${rounds.length}`}
        </text>

        <SvgMath
          latex={`x^{\\frac{${round.p}}{${round.q}}}`}
          x={110}
          y={72}
          fontSize={24}
          color={LABEL}
          w={150}
          h={76}
        />

        {/* Naming the two halves of the fraction right under it is the whole of the
            instruction, so it sits on the figure rather than only in the status line. This
            is the ONLY place the mapping is drawn: the matching pair that used to sit under
            the assembled radical said the same thing a second time in radical vocabulary,
            and the status line said it a third. */}
        <text x={110} y={106} textAnchor="middle" fontSize={11} fill={SOFT}>
          top is the power
        </text>
        <text x={110} y={119} textAnchor="middle" fontSize={11} fill={SOFT}>
          bottom is the root
        </text>

        <SvgMath latex="=" x={190} y={72} fontSize={20} color={SOFT} w={40} />

        <SvgMath
          latex={builtLatex}
          x={300}
          y={72}
          fontSize={24}
          color={solved ? CIVIC : SOFT}
          w={200}
          h={76}
        />
      </svg>

      {solved ? (
        isLastRound ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with two new exponents
          </button>
        ) : (
          <button type="button" className="lesson-interactive__check" onClick={nextRound}>
            Next: a new fraction exponent
          </button>
        )
      ) : (
        // Stacked, one row per box, so each box's verdict and each box's answer sit with the
        // box they are about. One button still, because the power and the index are two halves
        // of one conversion rather than two questions.
        <div className="lesson-interactive__rows">
          {BOXES.map((box) => buildRow(box))}
          <button type="button" className="lesson-interactive__check" onClick={check}>
            Build the root
          </button>
        </div>
      )}

      {revealTarget !== null && (
        <WidgetReveal
          available={attempted && !solved}
          revealed={revealedBox !== null}
          answer={
            <InlineMath latex={revealTarget === "power" ? `${round.p}` : `${round.q}`} />
          }
          why={revealWhy}
          onReveal={() => revealBox(revealTarget)}
          label={revealTarget === "power" ? "Reveal the power" : "Reveal the index"}
          // The reveal takes the first box still open, so the OTHER box is outstanding exactly
          // when both of them are. With one box already landed this reveal ends the round, and
          // then what remains is the rounds after it.
          othersRemain={(!powerDone && !indexDone) || !isLastRound}
        />
      )}

      {/* The board-level line, and only that: a missed box is answered under the box it
          happened in, so this stays on the one fact neither box-level sentence can carry. */}
      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : "prompt"}
        aria-live="polite"
      >
        {revealOwnsExplanation ? null : solved ? (
          <>
            <InlineMath
              latex={`x^{\\frac{${round.p}}{${round.q}}} = \\sqrt[${round.q}]{x^{${round.p}}}`}
            />
            . The top of the fraction is the power that goes under the root, and the bottom
            is the index of the root.
          </>
        ) : (
          "The bottom of the fraction names the root, and the radical calls that same number its index."
        )}
      </p>
    </div>
  );
}
