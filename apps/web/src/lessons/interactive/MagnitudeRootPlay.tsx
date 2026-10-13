/**
 * RAD.4 interactive (slide 0): run a signed number through a two-step machine that SQUARES
 * it and then takes the square root, and watch what comes back.
 *
 * The learner types both stages themselves for two numbers, one negative and one positive,
 * so the conclusion is their own arithmetic rather than an assertion: the machine returns 7
 * for an input of -8 and 5 for an input of 5. Nothing about the output is printed until
 * they enter it. Both inputs differ from the paragraph above, which works 7 and -7. Gates
 * once both numbers have been squared and rooted.
 *
 * Every stage scores on its own: each correct square and each correct root fires the shared
 * success signal once. Each stage also carries its own reveal, offered only after a real
 * attempt, which fills the stage in and explains the reasoning behind it, so a stuck learner
 * still reaches the gate. The root reveal carries the punchline of the slide, because the
 * status line stands down once a reveal has spoken.
 */

import { useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

interface Reading {
  /** The signed number fed into the machine. */
  value: number;
  /** value^2, the machine's first step. */
  squared: number;
  /** sqrt(value^2), the machine's second step: the input's distance from zero. */
  out: number;
}

/**
 * Two pairs, each one number either side of zero. Neither pair is the 7 / -7 worked in the
 * paragraph above, and "start over" hands out the pair the learner has not just run.
 */
const POOLS: readonly (readonly Reading[])[] = [
  [
    { value: -8, squared: 64, out: 8 },
    { value: 5, squared: 25, out: 5 },
  ],
  [
    { value: -9, squared: 81, out: 9 },
    { value: 4, squared: 16, out: 4 },
  ],
];

export function MagnitudeRootPlay(props: LessonWidgetProps) {
  const variant = useWidgetVariants(POOLS.length, props);
  const readings = POOLS[variant.index] ?? (POOLS[0] as readonly Reading[]);
  return (
    <MagnitudeRootPlayBody
      key={variant.nonce}
      readings={readings}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function MagnitudeRootPlayBody({
  readings,
  onSolved,
  onRestart,
}: {
  readings: readonly Reading[];
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [squareEntry, setSquareEntry] = useState("");
  const [rootEntry, setRootEntry] = useState("");
  const [squareDone, setSquareDone] = useState(false);
  const [rootDone, setRootDone] = useState(false);
  const [squareTried, setSquareTried] = useState(false);
  const [squareRevealed, setSquareRevealed] = useState(false);
  const [rootTried, setRootTried] = useState(false);
  const [rootRevealed, setRootRevealed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const reading = readings[index] ?? (readings[0] as Reading);
  const lastIndex = readings.length - 1;
  const isLast = index === lastIndex;
  const outMatchesReading = reading.out === reading.value;

  /** Close the squaring stage. `earned` is false when the learner revealed it. */
  function finishSquare(earned: boolean) {
    setSquareDone(true);
    setFeedback(null);
    if (earned) {
      success();
    }
  }

  /** Close the rooting stage. `earned` is false when the learner revealed it. */
  function finishRoot(earned: boolean) {
    setRootDone(true);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (isLast && !done) {
      setDone(true);
      onSolved();
    }
  }

  function checkSquare() {
    if (squareDone) {
      return;
    }
    const entry = squareEntry.trim();
    if (entry === "") {
      setFeedback("The box is empty. Enter a number before you go on.");
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to the note about what squaring does, which would answer a question the
    // learner did not ask. It still counts as an attempt, so the reveal comes on offer.
    const read = readNumericEntry(entry, "integer");
    if (!read.ok) {
      setSquareTried(true);
      setFeedback(WHOLE_NUMBER_MISS);
      return;
    }
    if (read.value === reading.squared) {
      finishSquare(true);
      return;
    }
    setSquareTried(true);
    setFeedback(
      reading.value < 0
        ? "Not quite. Squaring means multiplying the number by itself, and a negative times a negative is positive, so the square lands above zero."
        : "Not quite. Squaring means multiplying the number by itself, so multiply it by itself once and enter what you get.",
    );
  }

  function checkRoot() {
    if (rootDone) {
      return;
    }
    const entry = rootEntry.trim();
    if (entry === "") {
      setFeedback("The box is empty. Enter a number before you go on.");
      return;
    }
    const read = readNumericEntry(entry, "integer");
    if (!read.ok) {
      setRootTried(true);
      setFeedback(WHOLE_NUMBER_MISS);
      return;
    }
    if (read.value === reading.out) {
      finishRoot(true);
      return;
    }
    setRootTried(true);
    setFeedback(
      read.value === -reading.out
        ? "A square root hands back one value, and it is never negative, so try the other sign."
        : "Not quite. Ask yourself which number, multiplied by itself, gives the number under the root.",
    );
  }

  function revealSquare() {
    setSquareEntry(String(reading.squared));
    setSquareRevealed(true);
    finishSquare(false);
  }

  function revealRoot() {
    setRootEntry(String(reading.out));
    setRootRevealed(true);
    finishRoot(false);
  }

  function nextReading() {
    if (index < lastIndex) {
      setIndex(index + 1);
      setSquareEntry("");
      setRootEntry("");
      setSquareDone(false);
      setRootDone(false);
      setSquareTried(false);
      setSquareRevealed(false);
      setRootTried(false);
      setRootRevealed(false);
      setFeedback(null);
    }
  }

  return (
    <div className="lesson-interactive lesson-interactive--play">
      <WidgetTask>
        Square each of these two numbers and then take the square root of what you get, and
        compare what the machine hands back with what you fed into it.
      </WidgetTask>

      <svg
        viewBox="0 0 440 186"
        role="img"
        aria-label={`A two-step machine: ${reading.value} goes in, it is squared, and then its square root is taken`}
      >
        <title>Square a number, then take its square root</title>

        <text x={220} y={18} textAnchor="middle" fontSize={12} fill={SOFT}>
          {`Number ${index + 1} of ${readings.length}`}
        </text>

        {/* Stage boxes: reading -> squared -> output. */}
        <rect
          x={14}
          y={52}
          width={116}
          height={46}
          rx={10}
          fill={LINE}
          fillOpacity={0.12}
          stroke={LINE}
          strokeWidth={1.5}
        />
        <SvgMath
          latex={`x = ${reading.value}`}
          x={72}
          y={75}
          fontSize={18}
          color={LABEL}
          w={116}
        />
        <text x={72} y={116} textAnchor="middle" fontSize={11} fill={SOFT}>
          number in
        </text>

        <path d="M 134 75 L 158 75" fill="none" stroke={LINE} strokeWidth={1.5} />
        <SvgMath latex="x^{2}" x={146} y={56} fontSize={12} color={SOFT} w={40} />

        <rect
          x={162}
          y={52}
          width={116}
          height={46}
          rx={10}
          fill={CIVIC}
          fillOpacity={squareDone ? 0.16 : 0.05}
          stroke={squareDone ? CIVIC : LINE}
          strokeWidth={1.5}
        />
        <SvgMath
          latex={squareDone ? `${reading.squared}` : "?"}
          x={220}
          y={75}
          fontSize={18}
          color={squareDone ? LABEL : SOFT}
          w={116}
        />
        <text x={220} y={116} textAnchor="middle" fontSize={11} fill={SOFT}>
          squared
        </text>

        <path d="M 282 75 L 306 75" fill="none" stroke={LINE} strokeWidth={1.5} />
        <SvgMath latex="\sqrt{\;}" x={294} y={54} fontSize={12} color={SOFT} w={40} />

        <rect
          x={310}
          y={52}
          width={116}
          height={46}
          rx={10}
          fill={rootDone ? CIVIC : LINE}
          fillOpacity={rootDone ? 0.16 : 0.05}
          stroke={rootDone ? CIVIC : LINE}
          strokeWidth={1.5}
        />
        <SvgMath
          latex={rootDone ? `${reading.out}` : "?"}
          x={368}
          y={75}
          fontSize={18}
          color={rootDone ? LABEL : SOFT}
          w={116}
        />
        <text x={368} y={116} textAnchor="middle" fontSize={11} fill={SOFT}>
          number out
        </text>

        {rootDone && (
          <SvgMath
            latex={
              outMatchesReading
                ? `\\sqrt{(${reading.value})^{2}} = ${reading.out}, \\;\\text{the number itself}`
                : `\\sqrt{(${reading.value})^{2}} = ${reading.out}, \\;\\text{not } ${reading.value}`
            }
            x={220}
            y={152}
            fontSize={17}
            color={outMatchesReading ? CIVIC : BRICK}
          />
        )}
      </svg>

      {rootDone ? (
        isLast ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with two new numbers
          </button>
        ) : (
          <button type="button" className="lesson-interactive__check" onClick={nextReading}>
            Next: a new number
          </button>
        )
      ) : (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field" style={{ color: CIVIC }}>
            <span className="lesson-interactive__field-label">
              <InlineMath latex={squareDone ? "\\sqrt{\\;}" : `(${reading.value})^{2}`} />
            </span>
            <input
              className="lesson-interactive__input"
              {...numericEntryProps("integer")}
              value={squareDone ? rootEntry : squareEntry}
              aria-label={
                squareDone
                  ? `Square root of ${reading.squared}`
                  : `${reading.value} squared`
              }
              onChange={(event) =>
                squareDone
                  ? setRootEntry(event.target.value)
                  : setSquareEntry(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  if (squareDone) {
                    checkRoot();
                  } else {
                    checkSquare();
                  }
                }
              }}
              // Last, so the answer overrides whatever the learner typed for as long as the
              // reveal is up. One box carries both stages in turn, and `squareDone` is the
              // same flag that decides which check the button runs and which of the two
              // reveals is on offer, so the value here is the one the passage just stated.
              {...fill.entry(squareDone ? reading.out : reading.squared)}
            />
          </div>
          <button
            type="button"
            className="lesson-interactive__check"
            onClick={squareDone ? checkRoot : checkSquare}
          >
            {squareDone ? "Take the root" : "Square it"}
          </button>
        </div>
      )}

      <WidgetReveal
        available={squareTried && !squareDone}
        revealed={squareRevealed}
        answer={<InlineMath latex={`${reading.squared}`} />}
        why={
          <>
            Squaring means multiplying the number by itself, so this step is{" "}
            <InlineMath
              latex={`(${reading.value}) \\cdot (${reading.value}) = ${reading.squared}`}
            />
            .{" "}
            {reading.value < 0
              ? "A negative multiplied by a negative gives a positive, so the sign of the number you started with disappears here."
              : "A positive multiplied by a positive stays positive, so the sign of the number you started with is unchanged here."}
          </>
        }
        onReveal={revealSquare}
        label="Reveal the square"
        // Taking the root back off is the round's second question, so explaining the square
        // never spends the round.
        othersRemain={!rootDone}
      />

      <WidgetReveal
        available={squareDone && rootTried && !rootDone}
        revealed={rootRevealed}
        answer={<InlineMath latex={`${reading.out}`} />}
        why={
          <>
            The square root sign asks for the one value that is not negative and gives{" "}
            <InlineMath latex={`${reading.squared}`} /> when it is multiplied by itself, and
            that value is <InlineMath latex={`${reading.out}`} />.{" "}
            {outMatchesReading
              ? "Here it matches the number you started with, because that number was already positive; what the machine hands back is the distance from zero, which for a positive number is the number itself."
              : "That is not the number you started with at all! Squaring threw the sign away, the principal root never hands a negative back, and what comes out is the distance from zero."}
          </>
        }
        onReveal={revealRoot}
        label="Reveal the root"
        // The root closes the reading, so what is left after it is explained is the readings
        // after it. False on the last one, which is the gate.
        othersRemain={!isLast}
      />

      <p
        className="lesson-interactive__status"
        data-state={rootDone ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {rootRevealed ? null : rootDone ? (
          isLast ? (
            <>
              The machine gave back <InlineMath latex={`${readings[0]?.out}`} /> for{" "}
              <InlineMath latex={`${readings[0]?.value}`} /> and{" "}
              <InlineMath latex={`${readings[1]?.out}`} /> for{" "}
              <InlineMath latex={`${readings[1]?.value}`} />. It never hands back a
              negative, so what comes out is the distance of the number from zero rather
              than the number itself.
            </>
          ) : (
            <>
              You put in <InlineMath latex={`${reading.value}`} /> and got back{" "}
              <InlineMath latex={`${reading.out}`} />. Now try a number on the other side of
              zero.
            </>
          )
        ) : feedback ? (
          feedback
        ) : squareDone ? (
          squareRevealed ? (
            <>
              Now take the square root of <InlineMath latex={`${reading.squared}`} /> and
              see what the machine hands back.
            </>
          ) : (
            <>
              Squaring has thrown the sign away, so the machine is now holding a positive
              number. Take the square root of <InlineMath latex={`${reading.squared}`} />{" "}
              and see what comes back.
            </>
          )
        ) : (
          <>
            The machine works in two steps. Start by squaring{" "}
            <InlineMath latex={`${reading.value}`} /> (multiplying it by itself) and enter
            what you get.
          </>
        )}
      </p>
    </div>
  );
}
