/**
 * LF.3 interactive (slide 1): read a description, tag the two numbers it hides.
 *
 * The learner is asked for the rate first and the starting value second, and each
 * question is answered by tapping one of the sentence's own phrases. The model row
 * assembles as the tags land, so a correct tag is immediately visible as the term it
 * produces rather than as a tick.
 *
 * The third chip on every scenario is the INPUT value ("rents for 5 hours"), which is
 * the number a learner most often mistakes for a rate. Tapping it locks that chip and
 * says what it actually is. Round two drains instead of filling, so the rate lands
 * negative and the assembled model shows it.
 *
 * Neither scenario is used by the CFU or the practice bank.
 */

import { type ReactNode, useState } from "react";

import {
  CIVIC,
  type EqToken,
  EquationRow,
  InlineMath,
  LABEL,
  LINE,
  SIGNAL,
  SOFT,
  SvgMath,
} from "../svgKit";
import { useWidgetSuccess } from "../widgetMechanics";

/** Which of the two model numbers a question is asking for. */
type Role = "rate" | "start";

/** A tappable phrase from the sentence: the rate, the starting value, or the input. */
type ChipId = "rate" | "start" | "input";

interface Chip {
  id: ChipId;
  /** Words before the phrase's number. */
  before: string;
  /** The number itself, as LaTeX. */
  math: string;
  /** Words after the number. */
  after: string;
  /** The whole phrase spelled out, for the button's accessible name. */
  aria: string;
}

interface Scenario {
  /** The description, split into two lines so neither overflows the diagram. */
  lineOne: string;
  lineTwo: string;
  /** The signed rate and the starting value the sentence hides. */
  rate: number;
  start: number;
  /** The rate and the starting value with their units, shown once tagged. */
  rateLatex: string;
  startLatex: string;
  /** The whole board read aloud, for the SVG's accessible description. */
  spoken: string;
  chips: readonly Chip[];
  /** Why the input chip is neither of the two model numbers. */
  inputMiss: ReactNode;
}

const SCENARIOS: readonly Scenario[] = [
  {
    lineOne: "\\text{A bike rental charges a flat fee of } \\$8 \\text{,}",
    lineTwo: "\\text{plus } \\$3 \\text{ for each hour. Mia rents for } 5 \\text{ hours.}",
    rate: 3,
    start: 8,
    rateLatex: "\\$3 \\text{ per hour}",
    startLatex: "\\$8",
    spoken:
      "A bike rental charges a flat fee of 8 dollars plus 3 dollars for each hour, and Mia rents for 5 hours",
    chips: [
      {
        id: "start",
        before: "a flat fee of ",
        math: "\\$8",
        after: "",
        aria: "a flat fee of 8 dollars",
      },
      {
        id: "rate",
        before: "",
        math: "\\$3",
        after: " for each hour",
        aria: "3 dollars for each hour",
      },
      {
        id: "input",
        before: "rents for ",
        math: "5",
        after: " hours",
        aria: "rents for 5 hours",
      },
    ],
    inputMiss: (
      <>
        <InlineMath latex="5" /> hours is the input you will substitute later, not part of
        the model. The rate is what one extra hour costs, and it is the same whether Mia
        rents for <InlineMath latex="5" /> hours or <InlineMath latex="50" />.
      </>
    ),
  },
  {
    lineOne: "\\text{A tank holds } 40 \\text{ liters and drains}",
    lineTwo: "2 \\text{ liters per minute. You check it after } 7 \\text{ minutes.}",
    rate: -2,
    start: 40,
    rateLatex: "-2 \\text{ liters per minute}",
    startLatex: "40 \\text{ liters}",
    spoken:
      "A tank holds 40 liters and drains 2 liters per minute, and you check it after 7 minutes",
    chips: [
      {
        id: "start",
        before: "holds ",
        math: "40",
        after: " liters",
        aria: "holds 40 liters",
      },
      {
        id: "rate",
        before: "drains ",
        math: "2",
        after: " liters per minute",
        aria: "drains 2 liters per minute",
      },
      {
        id: "input",
        before: "after ",
        math: "7",
        after: " minutes",
        aria: "after 7 minutes",
      },
    ],
    inputMiss: (
      <>
        <InlineMath latex="7" /> minutes is the moment you are asking about, the input. The
        model has to work at every minute, not just that one.
      </>
    ),
  },
];

function scenarioAt(index: number): Scenario {
  return SCENARIOS[index % SCENARIOS.length] ?? (SCENARIOS[0] as Scenario);
}

/** A signed coefficient on `x`, e.g. `3x` or `-2x`. */
function rateTermTex(rate: number): string {
  return rate === 1 ? "x" : rate === -1 ? "-x" : `${rate}x`;
}

const ROW_RATE_Y = 86;
const ROW_START_Y = 116;
const ROW_MODEL_Y = 156;

export function LinearModelRateExplore({ onComplete }: { onComplete?: () => void }) {
  const [index, setIndex] = useState(0);
  const [tagged, setTagged] = useState<Partial<Record<Role, true>>>({});
  const [missed, setMissed] = useState<readonly ChipId[]>([]);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [fired, setFired] = useState(false);
  const success = useWidgetSuccess();

  const scenario = scenarioAt(index);
  const asking: Role = tagged.rate ? "start" : "rate";
  const solved = tagged.rate === true && tagged.start === true;

  function tag(chip: Chip) {
    if (solved || missed.includes(chip.id)) {
      return;
    }
    if (chip.id === asking) {
      const next = { ...tagged, [asking]: true } as Partial<Record<Role, true>>;
      setTagged(next);
      setFeedback(null);
      success();
      // A chip locked while the rate was being asked for must come back for the
      // starting-value question, or the phrase that answers it can be unreachable.
      setMissed([]);
      if (next.rate && next.start && !fired) {
        setFired(true);
        onComplete?.();
      }
      return;
    }
    setMissed((current) => [...current, chip.id]);
    if (chip.id === "input") {
      setFeedback(scenario.inputMiss);
      return;
    }
    setFeedback(
      asking === "rate" ? (
        <>
          That amount is there once, before the input starts counting, so it is the starting
          value. A rate has to say "for each" something.
        </>
      ) : (
        <>
          The words "for each" and "per" mark a rate, an amount that repeats. The starting
          value is what the output is when the input is <InlineMath latex="0" />.
        </>
      ),
    );
  }

  function nextScenario() {
    setIndex((current) => (current + 1) % SCENARIOS.length);
    setTagged({});
    setMissed([]);
    setFeedback(null);
  }

  const rateToken: EqToken = tagged.rate
    ? { text: rateTermTex(scenario.rate), color: SIGNAL }
    : { text: "\\square x", color: SOFT };
  const startToken: EqToken = tagged.start
    ? { text: `${scenario.start}`, color: CIVIC }
    : { text: "\\square", color: SOFT };

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        Built. The rate became the coefficient on <InlineMath latex="x" /> and the starting
        value became the constant, so the model is{" "}
        <InlineMath latex={`y = ${rateTermTex(scenario.rate)} + ${scenario.start}`} />
        {scenario.rate < 0 ? (
          <>
            . A quantity that falls as the input grows carries a negative rate, which is
            what makes the model shrink.
          </>
        ) : (
          <>
            . Every extra unit of input adds the rate once more, on top of what was already
            there.
          </>
        )}
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else if (asking === "rate") {
    status =
      "Tap the phrase that gives the rate, the amount that repeats for each unit of input.";
  } else {
    status =
      "Rate placed. Now tap the phrase that gives the starting value, the output before the input starts counting.";
  }

  return (
    <div className="lesson-interactive lesson-interactive--explore">
      <svg viewBox="0 0 440 186" role="img" aria-label={scenario.spoken}>
        <title>Tagging the rate and the starting value in a description</title>

        <SvgMath latex={scenario.lineOne} x={220} y={22} fontSize={14} w={430} />
        <SvgMath latex={scenario.lineTwo} x={220} y={44} fontSize={14} w={430} />
        <line x1={40} y1={64} x2={400} y2={64} stroke={LINE} strokeWidth={1} />

        <text x={22} y={ROW_RATE_Y + 4} fontSize={12} fill={SOFT}>
          rate
        </text>
        <SvgMath
          latex={tagged.rate ? scenario.rateLatex : "?"}
          x={250}
          y={ROW_RATE_Y}
          fontSize={16}
          color={tagged.rate ? SIGNAL : SOFT}
          w={340}
        />

        <text x={22} y={ROW_START_Y + 4} fontSize={12} fill={SOFT}>
          start
        </text>
        <SvgMath
          latex={tagged.start ? scenario.startLatex : "?"}
          x={250}
          y={ROW_START_Y}
          fontSize={16}
          color={tagged.start ? CIVIC : SOFT}
          w={340}
        />

        <EquationRow
          tokens={[
            { text: "y", color: LABEL },
            { text: "=", color: LABEL },
            rateToken,
            { text: "+", color: LABEL },
            startToken,
          ]}
          cx={220}
          y={ROW_MODEL_Y}
          fontSize={22}
        />
      </svg>

      {!solved && (
        <div className="lesson-interactive__controls">
          {scenario.chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="lesson-interactive__chip"
              style={{ color: LABEL, borderColor: LINE }}
              disabled={missed.includes(chip.id)}
              aria-label={`tag the phrase ${chip.aria}`}
              onClick={() => tag(chip)}
            >
              {chip.before}
              <InlineMath latex={chip.math} />
              {chip.after}
            </button>
          ))}
        </div>
      )}

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={nextScenario}>
          Try another description
        </button>
      )}

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
