/**
 * FUN.2 slide 1: the range of a rule that accepts every input, found by driving the input and
 * watching where the output refuses to go.
 *
 * The slide's claim is that a range depends on what the rule DOES, and the squaring and the
 * absolute value are the two moves that put a limit on one side and none on the other. So the
 * board is a dial the learner sweeps: every reading it produces leaves a mark on the output
 * scale, and after a few sweeps the marks pile up against a line they never cross.
 *
 * Two parts, judged separately, because they are separately winnable and they are separately
 * wrong. WHICH WAY the readings run is a claim about the rule, and a wrong call LOCKS, so it
 * cannot be answered by trying the other one; the LIMIT ITSELF is typed, which is a value the
 * learner produces rather than a row they uncover. The scale is deliberately unnumbered: an
 * axis labelled at its ends would print the answer beside the question.
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
import { partName, WidgetPartNote, WidgetPartVerdict } from "../widgetPartVerdict";
import { WidgetTask } from "../widgetTask";

/** The three claims a learner can make about which way a range runs. */
const WAYS = [
  "Upward from a lowest reading",
  "Downward from a highest reading",
  "Both ways without limit",
] as const;

interface Rule {
  /** The rule, as LaTeX. */
  latex: string;
  spoken: string;
  /** The reading at a setting. */
  at: (x: number) => number;
  /** The settings the dial offers, inclusive. */
  lo: number;
  hi: number;
  /** The reading the rule cannot get past, and which way the rest of them run from it. */
  limit: number;
  /** Index into {@link WAYS}. */
  way: 0 | 1;
  /** The part of the rule that puts the limit there, named for the note and the reveal. */
  cause: string;
}

/**
 * Four dials, alternating floor and ceiling so two restarts in a row cannot be answered the
 * same way, and none of them is the CFU's rule.
 */
const RULES: readonly Rule[] = [
  {
    latex: "f(x) = x^{2} + 3",
    spoken: "f of x equals x squared plus 3",
    at: (x) => x * x + 3,
    lo: -4,
    hi: 4,
    limit: 3,
    way: 0,
    cause: "x^{2}",
  },
  {
    latex: "f(x) = 8 - x^{2}",
    spoken: "f of x equals 8 minus x squared",
    at: (x) => 8 - x * x,
    lo: -4,
    hi: 4,
    limit: 8,
    way: 1,
    cause: "x^{2}",
  },
  {
    latex: "f(x) = \\left|x\\right| - 4",
    spoken: "f of x equals the absolute value of x, minus 4",
    at: (x) => Math.abs(x) - 4,
    lo: -5,
    hi: 5,
    limit: -4,
    way: 0,
    cause: "\\left|x\\right|",
  },
  {
    latex: "f(x) = 5 - \\left|x\\right|",
    spoken: "f of x equals 5 minus the absolute value of x",
    at: (x) => 5 - Math.abs(x),
    lo: -5,
    hi: 5,
    limit: 5,
    way: 1,
    cause: "\\left|x\\right|",
  },
];

/** A value read aloud, since KaTeX makes `textContent` unusable for an accessible name. */
function spoken(value: number): string {
  return value < 0 ? `negative ${-value}` : `${value}`;
}

/**
 * A part row is the FULL width of the board, whatever is inside it.
 *
 * `.lesson-interactive` is a flex column with `align-items: center`, so a part row left to size
 * itself is as wide as its widest child — and the sentence answering a missed part is far wider
 * than the controls above it. Printing that sentence therefore widened the row and dropped the
 * controls, which sit at its start, out from under the learner's cursor: measured at 217.0px left
 * for the three calls in the 920px in-city column. Pinning the row to the board's width makes its
 * geometry independent of what has been said inside it.
 */
const PART_ROW = { width: "100%" } as const;

/**
 * And the controls are centred INSIDE that row rather than by it.
 *
 * `.lesson-interactive--slider .lesson-interactive__controls` is `width: 100%; max-width: 460px`,
 * which in a full-width row leaves it at the left edge. It was centred before only as a
 * side-effect of the row hugging it, which is the thing above that had to stop.
 */
const CENTRED_CONTROLS = { marginInline: "auto" } as const;

/**
 * The two verdicts as `widgetPartVerdict.tsx` says them, for the room reserved below.
 *
 * Deliberately a copy rather than an import, and a room built here rather than in the shared file:
 * the population `partVerdicts.browser.test.tsx` sweeps is derived by reading each widget's source
 * for the token `WidgetPartVerdict`, so a room that rendered the mark on this board's behalf would
 * take the board out of that sweep without failing anything.
 *
 * What the copy is load-bearing for is the LINE'S HEIGHT and nothing else, because the room below
 * is full width: a word that grew longer here could not move anything, and one that changed the
 * height of the line — a taller glyph, a second line — is what `d6Fun2RangeControls.browser.test.tsx`
 * reds on, since a correct call there is asserted to move the board in neither axis. Both verdicts
 * are listed rather than one because the two glyphs need not be the same height in every font the
 * app may fall back to, and the reserved line has to be the taller of them.
 */
const VERDICT_SIZES: readonly (readonly [string, string])[] = [
  ["\u2713", "correct"],
  ["\u2717", "not yet"],
];

/**
 * The mark's room, held open from first paint so its arrival cannot move anything.
 *
 * `.lesson-interactive__controls` is a centred, wrapping flex row. A verdict appended to it the
 * moment a part is answered is one more item for that row to centre itself around, so the call
 * chips and the typed field slid sideways as the mark landed beside them — 33.0px for a correct
 * call and 33.7px for a missed one, at every width the app hands this figure. LIN.5 met the same
 * defect through a `min-content` subgrid and answered it the same way, by reserving the mark
 * before there is a mark to put in
 * (`work-log/anthony/2026-08-01-lin5-chip-width-stability.md`).
 *
 * ## Why the room is a LINE of its own rather than a gap in the row
 *
 * Reserved beside the controls, the room is still room the row centres itself around: the chips
 * here are wider than the 460px the row is capped at, so each takes a line of its own, and a room
 * reserved on the last of those lines left "Both ways without limit" sitting 33px left of the two
 * calls above it. Trading a mark that moves the chips for a chip that no longer lines up is not a
 * fix. `flex: 0 0 100%` gives the room a line, which is what `.lesson-interactive__row-note` does
 * two elements below it: the controls then keep the geometry they had before any of this, at every
 * width, and the mark is centred under the part it is about instead of beside it.
 *
 * The line is reserved in BOTH axes, so a correct call — which prints no note — moves nothing at
 * all. A missed call still pushes the board down, because the sentence answering it lands between
 * the two parts; that is the note doing its job.
 *
 * Both sizers and the real mark are stacked in a single grid cell, so the line is as tall as the
 * tallest of the three and the mark is centred in it.
 *
 * The sizers carry the shared class, so their type is the real mark's rather than a second guess
 * at it, and they carry NO `data-verdict`: that attribute is how every guard in the tree reads a
 * verdict off a board, and a placeholder wearing it would make an unanswered part look graded.
 */
function VerdictRoom({ verdict }: { verdict: Verdict | null }) {
  return (
    <span
      style={{
        flex: "0 0 100%",
        display: "grid",
        alignItems: "center",
        justifyItems: "center",
      }}
    >
      {VERDICT_SIZES.map(([glyph, word]) => (
        <span
          key={word}
          aria-hidden="true"
          className="lesson-interactive__verdict"
          style={{ gridArea: "1 / 1", visibility: "hidden" }}
        >
          <span className="lesson-interactive__verdict-mark">{glyph}</span>
          {word}
        </span>
      ))}
      {verdict === null ? null : (
        // `display: flex` rather than a plain wrapper: a blockified inline wrapper draws a line
        // box out of the CONTROLS row's 1rem font, which is taller than the 0.85rem mark inside
        // it, and the line grew 3.1px as the mark landed in it. The sizers are the mark's own
        // element and have no such wrapper, so the two have to be built the same way.
        <span style={{ gridArea: "1 / 1", display: "flex", alignItems: "center" }}>
          <WidgetPartVerdict verdict={verdict} />
        </span>
      )}
    </span>
  );
}

export function RangeOutputRead(props: LessonWidgetProps) {
  const variant = useWidgetVariants(RULES.length, props);
  const rule = RULES[variant.index] ?? (RULES[0] as Rule);
  return (
    <RangeOutputReadBody
      key={variant.nonce}
      rule={rule}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

type Verdict = "right" | "wrong";

function RangeOutputReadBody({
  rule,
  onSolved,
  onRestart,
}: {
  rule: Rule;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const settings: number[] = [];
  for (let x = rule.lo; x <= rule.hi; x += 1) {
    settings.push(x);
  }
  const readings = settings.map(rule.at);
  const lowest = Math.min(...readings);
  const highest = Math.max(...readings);

  const [dial, setDial] = useState(rule.lo);
  const [seen, setSeen] = useState<readonly number[]>([rule.lo]);
  const [wayCall, setWayCall] = useState<number | null>(null);
  const [entry, setEntry] = useState("");
  const [limitVerdict, setLimitVerdict] = useState<Verdict | null>(null);
  const [limitDone, setLimitDone] = useState(false);
  const [revealedPart, setRevealedPart] = useState<"way" | "limit" | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const wayVerdict: Verdict | null =
    wayCall === null ? null : wayCall === rule.way ? "right" : "wrong";

  function open(wayOk: boolean, limitOk: boolean) {
    if (wayOk && limitOk && !gateOpen) {
      setGateOpen(true);
      onSolved();
    }
  }

  function sweep(next: number) {
    setDial(next);
    setSeen((prev) => (prev.includes(next) ? prev : [...prev, next]));
  }

  function callWay(at: number) {
    if (wayCall !== null) {
      return;
    }
    setWayCall(at);
    if (at !== rule.way) {
      return;
    }
    success();
    open(true, limitDone);
  }

  function checkLimit() {
    if (limitDone) {
      return;
    }
    const typed = entry.trim();
    if (typed === "" || Number.isNaN(Number(typed))) {
      setLimitVerdict("wrong");
      return;
    }
    if (Number(typed) !== rule.limit) {
      setLimitVerdict("wrong");
      return;
    }
    setLimitVerdict("right");
    setLimitDone(true);
    success();
    open(wayVerdict === "right", true);
  }

  function revealWay() {
    setRevealedPart("way");
  }

  function revealLimit() {
    setRevealedPart("limit");
    setEntry(String(rule.limit));
    setLimitDone(true);
  }

  /* ------------------------------------------------------------------ the output scale */

  const left = 40;
  const right = 400;
  const axis = 96;
  const span = highest - lowest || 1;
  const px = (value: number): number => left + ((value - lowest) / span) * (right - left);
  const reading = rule.at(dial);

  return (
    <div className="lesson-interactive lesson-interactive--slider">
      <WidgetTask>
        Goal: say which way this machine's readings run, and give the one reading they never
        get past. Those two facts together are its range.
      </WidgetTask>

      <svg
        viewBox="0 0 440 150"
        role="img"
        aria-label={`The readings of ${rule.spoken} as the setting is swept from ${spoken(rule.lo)} to ${spoken(rule.hi)}`}
      >
        <title>Sweep the setting and watch where the readings collect</title>

        <SvgMath latex={rule.latex} x={220} y={28} fontSize={20} />

        {/* The scale of readings, deliberately unnumbered: an axis labelled at its ends
            would print the answer next to the question. */}
        <line x1={left} y1={axis} x2={right} y2={axis} stroke={LINE} strokeWidth={1.5} />
        <text x={left} y={axis + 30} textAnchor="start" fontSize={12} fill={SOFT}>
          lower readings
        </text>
        <text x={right} y={axis + 30} textAnchor="end" fontSize={12} fill={SOFT}>
          higher readings
        </text>

        {/* Every reading produced so far, so the pile-up against one end is visible. */}
        {seen.map((x) => (
          <line
            key={x}
            x1={px(rule.at(x))}
            y1={axis - 7}
            x2={px(rule.at(x))}
            y2={axis + 7}
            stroke={SOFT}
            strokeWidth={2}
          />
        ))}

        <circle cx={px(reading)} cy={axis} r={6} fill={CIVIC} />
        <SvgMath
          latex={`f(${dial}) = ${reading}`}
          x={220}
          y={axis - 34}
          fontSize={18}
          color={LABEL}
        />
      </svg>

      <label className="lesson-interactive__slider-label" htmlFor="fun2-range-dial">
        Setting
      </label>
      <input
        id="fun2-range-dial"
        className="lesson-interactive__range"
        type="range"
        min={rule.lo}
        max={rule.hi}
        step={1}
        value={dial}
        aria-valuetext={`setting ${spoken(dial)}, reading ${spoken(reading)}`}
        onChange={(event) => sweep(Number(event.target.value))}
      />

      {/* Part one: which way the readings run. A wrong call LOCKS, because with the options
          on screen a second go at it would be a guess rather than an answer.

          `data-part-row` wraps the call AND the sentence answering it, which is what makes the
          part addressable as one thing: a part answered by tapping has no field of boxes for a
          locator to find it by. */}
      <div data-part-row="way" style={PART_ROW}>
        <div className="lesson-interactive__controls" style={CENTRED_CONTROLS}>
          {WAYS.map((label, at) => {
            const settled = wayCall !== null;
            const chosen = wayCall === at;
            const right = at === rule.way;
            const tone = chosen ? (right ? CIVIC : BRICK) : LABEL;
            return (
              <button
                key={label}
                type="button"
                className="lesson-interactive__chip"
                disabled={settled}
                style={{
                  color: settled && chosen ? tone : LABEL,
                  borderColor: settled && chosen ? tone : LINE,
                }}
                aria-label={partName(
                  `${label}, for ${rule.spoken}`,
                  settled && chosen ? (right ? "right" : "wrong") : null,
                )}
                onClick={() => callWay(at)}
              >
                {label}
              </button>
            );
          })}
          <VerdictRoom verdict={wayVerdict} />
        </div>

        {wayVerdict === "wrong" && revealedPart !== "way" && !fill.given ? (
          <WidgetPartNote>
            Sweep the dial to both ends and back. A reading that keeps climbing in one
            direction and stops dead in the other has a limit on the side it stops on, and
            none at all on the side it climbs.
          </WidgetPartNote>
        ) : null}
      </div>

      {/* Part two: the limit itself, typed. */}
      <div data-part-row="limit" style={PART_ROW}>
        <div className="lesson-interactive__controls" style={CENTRED_CONTROLS}>
          <div className="lesson-interactive__field">
            <span className="lesson-interactive__field-label">
              The reading it never gets past
            </span>
            <input
              className="lesson-interactive__input"
              type="text"
              inputMode="numeric"
              value={entry}
              readOnly={limitDone}
              aria-label={partName("The reading the machine never gets past", limitVerdict)}
              onChange={(event) => setEntry(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  checkLimit();
                }
              }}
              {...fill.entry(rule.limit)}
            />
          </div>
          {limitDone ? null : (
            <button
              type="button"
              className="lesson-interactive__check"
              onClick={checkLimit}
            >
              Check
            </button>
          )}
          {/* AFTER the Check, not between it and the field. The room takes a whole line, so
              written before the button it pushes the button onto a line of its own and takes the
              Check away from the field it belongs to. The field's own accessible name already
              carries the verdict, so nothing is lost by the mark being read last. */}
          <VerdictRoom verdict={limitVerdict} />
        </div>

        {limitVerdict === "wrong" && !limitDone && !fill.given ? (
          <WidgetPartNote>
            Park the dial where the readings turn around, and read that one off. Every other
            setting takes the reading away from it in the same direction.
          </WidgetPartNote>
        ) : null}
      </div>

      {gateOpen || (wayVerdict !== null && limitDone) ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different machine
        </button>
      ) : null}

      <WidgetReveal
        available={wayVerdict === "wrong"}
        revealed={revealedPart === "way"}
        answer={WAYS[rule.way]}
        why={
          <>
            <InlineMath latex={rule.cause} /> is never negative, whatever the setting, so it
            is <InlineMath latex="0" /> at its smallest and climbs without any ceiling above
            it.{" "}
            {rule.way === 0
              ? "Adding a plain number to something like that lifts every reading by the same amount and changes nothing about which way it climbs, so the readings run upward from one lowest value."
              : "Subtracting something like that from a plain number turns the climb around: the readings fall away as it grows, so they run downward from one highest value."}
          </>
        }
        onReveal={revealWay}
        label="Reveal which way they run"
        othersRemain={!limitDone}
      />

      <WidgetReveal
        available={limitVerdict === "wrong" && !limitDone}
        revealed={revealedPart === "limit"}
        answer={<InlineMath latex={String(rule.limit)} />}
        why={
          <>
            <InlineMath latex={rule.cause} /> is smallest when it is{" "}
            <InlineMath latex="0" />, which happens at <InlineMath latex="x = 0" />, so put
            that in the rule: <InlineMath latex={`f(0) = ${rule.limit}`} />. Every other
            setting makes that part bigger, which pushes the reading{" "}
            {rule.way === 0 ? "up from there" : "down from there"} and never back past it.
          </>
        }
        onReveal={revealLimit}
        label="Reveal the limit"
        othersRemain={wayVerdict !== "right"}
      />

      <p
        className="lesson-interactive__status"
        data-state={gateOpen ? "solved" : wayVerdict === "wrong" ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {fill.given ? null : gateOpen ? (
          <>
            Both parts hold. The range stops dead at{" "}
            <InlineMath latex={String(rule.limit)} /> and runs{" "}
            {rule.way === 0 ? "upward" : "downward"} from there with nothing to stop it, so
            it is written{" "}
            <InlineMath
              latex={
                rule.way === 0 ? `[${rule.limit}, \\infty)` : `(-\\infty, ${rule.limit}]`
              }
            />
            .
          </>
        ) : (
          <span style={{ color: SOFT }}>
            Sweep the setting from one end to the other. The marks left behind are the
            readings this machine has produced, and where they stop is what you are after.
          </span>
        )}
      </p>
    </div>
  );
}
