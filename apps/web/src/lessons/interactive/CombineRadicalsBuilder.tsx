/**
 * RAD.2 interactive (slide 1): simplify each root, THEN decide whether the two terms
 * combine. The learner types both parts of each simplified term, the coefficient AND the
 * radicand, so the widget never pre-fills the shared root and never makes the "do these
 * combine?" call for them. They then choose: add into one term, or declare that the terms
 * do not combine. Round 3 is the case the frozen RAD.2 assessment actually grades,
 * sqrt(18) + sqrt(45), where the square-free parts differ and the answer stays two terms.
 * Rounds 1 and 2 (sqrt(45) + sqrt(20), sqrt(24) + sqrt(54)) are not the pair worked in the
 * paragraph above. Each of the four simplify slots latches on its own and fires the success
 * signal on its own, as do the combine decision and the final coefficient. After a real
 * attempt, the learner may reveal whichever single step they are stuck on, slot by slot,
 * with the reasoning that produces it; a revealed step carries the round forward but earns
 * no success. Gates once all three rounds land.
 *
 * ## The two roots are TWO questions, checked and answered one at a time
 *
 * They used to share one "Simplify" button and one red line. The state was already per box —
 * a correct box latches and dims — but a learner who had sqrt(24) = 2sqrt(6) right and
 * sqrt(54) wrong was answered with "Not quite. Keep taking perfect squares out of each
 * radicand until none are left...", a restatement of the whole method, at the pair. Nothing on
 * screen said which root it meant, so the row already earned read as part of the miss.
 *
 * So each root is its own row with its own check button and its own verdict, and the answer to
 * a missed row is about THAT ROW'S NUMBERS: 2sqrt(27) is sqrt(108) and this row is sqrt(54);
 * 1sqrt(54) holds the value but 54 = 9 * 6 and 9 is a perfect square. Checking one row says
 * nothing about the other, and the round still does not move until both are right.
 *
 * The status line went back to carrying the TASK for the whole of the simplify stage, which is
 * the other half of the same fix: a miss is now reported under the row it happened on, so the
 * shared line no longer turns red about a pair.
 */

import { type ReactNode, useState } from "react";

import {
  BRICK,
  CIVIC,
  InlineMath,
  LABEL,
  LINE,
  SIGNAL,
  SIGNAL_DEEP,
  SOFT,
  SvgMath,
} from "../svgKit";
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
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

interface Round {
  first: number;
  second: number;
  /** sqrt(first) = cA*sqrt(mA). */
  cA: number;
  mA: number;
  /** sqrt(second) = cB*sqrt(mB). */
  cB: number;
  mB: number;
}

/**
 * Two sets of three pairs, and in BOTH sets rounds 1 and 2 combine while round 3 does NOT
 * (different square-free parts), which is the misconception the node's assessment grades.
 * "Start over" hands out the set the learner has NOT just worked, so the second pass is a
 * fresh simplify rather than a recall.
 */
const POOLS: readonly (readonly Round[])[] = [
  [
    { first: 45, second: 20, cA: 3, mA: 5, cB: 2, mB: 5 },
    { first: 24, second: 54, cA: 2, mA: 6, cB: 3, mB: 6 },
    { first: 18, second: 45, cA: 3, mA: 2, cB: 3, mB: 5 },
  ],
  [
    { first: 27, second: 12, cA: 3, mA: 3, cB: 2, mB: 3 },
    { first: 80, second: 20, cA: 4, mA: 5, cB: 2, mB: 5 },
    { first: 50, second: 27, cA: 5, mA: 2, cB: 3, mB: 3 },
  ],
];

/** The four boxes of the simplify stage, in the order the reveal walks them. */
const SLOTS = ["aCoeff", "aRad", "bCoeff", "bRad"] as const;
type Slot = (typeof SLOTS)[number];

/** The two roots, each of which is a question of its own. */
const ROWS = ["a", "b"] as const;
type Row = (typeof ROWS)[number];

/** The coefficient box and the radicand box of one root, in the order they are drawn. */
const ROW_SLOTS: Record<Row, readonly [Slot, Slot]> = {
  a: ["aCoeff", "aRad"],
  b: ["bCoeff", "bRad"],
};

const EMPTY_VALUES: Record<Slot, string> = {
  aCoeff: "",
  aRad: "",
  bCoeff: "",
  bRad: "",
};

const NO_SLOTS_DONE: Record<Slot, boolean> = {
  aCoeff: false,
  aRad: false,
  bCoeff: false,
  bRad: false,
};

const NOTHING_CHECKED: Record<Row, RowMark | null> = { a: null, b: null };

const NOTHING_TRIED: Record<Row, boolean> = { a: false, b: false };

/**
 * What one row's last check came to. `wrong` carries the reading of the entry that produced
 * it, so the sentence under the row can be about the learner's own numbers.
 */
type RowMark = { state: "right" } | { state: "wrong"; miss: Miss };

/** Why a row is not simplified yet, as read off what was actually in its two boxes. */
type Miss =
  | { kind: "blank" }
  /** Plain entry takes anything, so one of the boxes holds something that is not a number. */
  | { kind: "notNumber" }
  | { kind: "range" }
  /** The entry names a different number: `c * sqrt(m)` came to `sqrt(came)`, not `sqrt(n)`. */
  | { kind: "moved"; c: number; m: number; came: number }
  /** The entry holds the value but `square` still divides the radicand. */
  | { kind: "square"; c: number; m: number; square: number };

/** Which step the reveal is speaking about. */
type RevealTarget = { kind: "slot"; slot: Slot } | { kind: "decide" } | { kind: "sum" };

function slotTarget(round: Round, slot: Slot): number {
  switch (slot) {
    case "aCoeff":
      return round.cA;
    case "aRad":
      return round.mA;
    case "bCoeff":
      return round.cB;
    default:
      return round.mB;
  }
}

/** Which root a box belongs to. */
function rowOf(slot: Slot): Row {
  return slot === "aCoeff" || slot === "aRad" ? "a" : "b";
}

/** The largest perfect square dividing `n`, or 1 when nothing but 1 does. */
function squareFactor(n: number): number {
  let largest = 1;
  for (let root = 2; root * root <= n; root += 1) {
    if (n % (root * root) === 0) {
      largest = root * root;
    }
  }
  return largest;
}

export function CombineRadicalsBuilder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(POOLS.length, props);
  const rounds = POOLS[variant.index] ?? (POOLS[0] as readonly Round[]);
  return (
    <CombineRadicalsBuilderBody
      key={variant.nonce}
      rounds={rounds}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function CombineRadicalsBuilderBody({
  rounds,
  onSolved,
  onRestart,
}: {
  rounds: readonly Round[];
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [values, setValues] = useState<Record<Slot, string>>(EMPTY_VALUES);
  const [slotDone, setSlotDone] = useState<Record<Slot, boolean>>(NO_SLOTS_DONE);
  const [marks, setMarks] = useState<Record<Row, RowMark | null>>(NOTHING_CHECKED);
  const [rowTried, setRowTried] = useState<Record<Row, boolean>>(NOTHING_TRIED);
  const [decided, setDecided] = useState(false);
  const [decideTried, setDecideTried] = useState(false);
  const [sumVal, setSumVal] = useState("");
  const [sumTried, setSumTried] = useState(false);
  const [solved, setSolved] = useState(false);
  const [revealedTarget, setRevealedTarget] = useState<RevealTarget | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const lastIndex = rounds.length - 1;
  const round = rounds[roundIndex] ?? (rounds[0] as Round);
  const isLastRound = roundIndex === lastIndex;
  const combines = round.mA === round.mB;
  const sum = round.cA + round.cB;

  const simplified = SLOTS.every((slot) => slotDone[slot]);

  /**
   * The box the reveal offers: the first one still open in a row the learner has CHECKED.
   *
   * Scoped to checked rows because the rows are now submitted one at a time, and a reveal
   * offered for the row they have not tried yet would be a first click on that question.
   */
  const stuckSlot =
    ROWS.filter((row) => rowTried[row])
      .flatMap((row) => ROW_SLOTS[row])
      .find((slot) => !slotDone[slot]) ?? null;

  /** The step the reveal offers: the one just revealed, else the one now in hand. */
  const revealTarget: RevealTarget | null =
    revealedTarget ??
    (!simplified
      ? stuckSlot
        ? { kind: "slot", slot: stuckSlot }
        : null
      : !decided
        ? { kind: "decide" }
        : !solved
          ? { kind: "sum" }
          : null);

  /** Offered only after a real attempt on the step in hand, never as a first click. */
  const revealAvailable =
    revealTarget !== null &&
    (revealTarget.kind === "slot"
      ? !simplified
      : revealTarget.kind === "decide"
        ? decideTried && !decided
        : sumTried && !solved);

  /**
   * Whether the round is still asking for something BESIDES the step being explained, which
   * is what lets the learner take a part-answered board back instead of losing it.
   *
   * Read off the board at the click, never assumed: on the step this round ENDS on it is
   * false, and handing that one back would be handing over the gate.
   */
  function othersRemainFor(target: RevealTarget): boolean {
    if (target.kind === "slot") {
      return SLOTS.some((slot) => slot !== target.slot && !slotDone[slot]) || !decided;
    }
    if (target.kind === "decide") {
      return combines && !solved;
    }
    return false;
  }

  /** Close this round out. `earned` is false when the learner revealed it instead. */
  function finish(earned: boolean) {
    setSolved(true);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (isLastRound && !done) {
      setDone(true);
      onSolved();
    }
  }

  /** The number under the root on one row. */
  function rowNumber(row: Row): number {
    return row === "a" ? round.first : round.second;
  }

  /** What is in one box: the answer it latched on, else what the learner typed, else nothing. */
  function entered(slot: Slot, done: Record<Slot, boolean>): number | null | "notNumber" {
    if (done[slot]) {
      return slotTarget(round, slot);
    }
    const raw = values[slot].trim();
    if (raw === "") {
      return null;
    }
    const read = readNumericEntry(raw, "integer");
    return read.ok ? read.value : "notNumber";
  }

  /**
   * Read one row's entry and say what is wrong with IT. Called only on a row that did not
   * land, so a coefficient and radicand whose product is right still has a square inside.
   */
  function missOn(row: Row, done: Record<Slot, boolean>): Miss {
    const [coeffSlot, radSlot] = ROW_SLOTS[row];
    const c = entered(coeffSlot, done);
    const m = entered(radSlot, done);
    if (c === null || m === null) {
      return { kind: "blank" };
    }
    // Ahead of every reading of the two numbers, so a non-number is its own miss rather
    // than reaching the notes below as a NaN and printing itself back at the learner.
    if (c === "notNumber" || m === "notNumber") {
      return { kind: "notNumber" };
    }
    if (c < 1 || m < 1) {
      return { kind: "range" };
    }
    const came = c * c * m;
    if (came === rowNumber(row)) {
      return { kind: "square", c, m, square: squareFactor(m) };
    }
    return { kind: "moved", c, m, came };
  }

  /**
   * Check ONE root. The other row is not read and not answered: it is a separate question,
   * and grading it here is what made a half-right board report as a whole miss.
   */
  function checkRow(row: Row) {
    const slots = ROW_SLOTS[row];
    if (slots.every((slot) => slotDone[slot])) {
      return;
    }
    setRowTried((prev) => ({ ...prev, [row]: true }));
    const next = { ...slotDone };
    let earned = 0;
    for (const slot of slots) {
      if (next[slot]) {
        continue;
      }
      const read = readNumericEntry(values[slot], "integer");
      if (read.ok && read.value === slotTarget(round, slot)) {
        next[slot] = true;
        earned += 1;
      }
    }
    setSlotDone(next);
    for (let i = 0; i < earned; i += 1) {
      success();
    }
    const landed = slots.every((slot) => next[slot]);
    setMarks((prev) => ({
      ...prev,
      [row]: landed ? { state: "right" } : { state: "wrong", miss: missOn(row, next) },
    }));
    if (!landed) {
      // A fresh attempt: the reveal steps aside so it can be offered for the next box.
      setRevealedTarget(null);
    }
  }

  /** Type into one box, which retires that row's verdict: it was about the previous entry. */
  function typeInto(slot: Slot, raw: string) {
    const row = rowOf(slot);
    setValues((prev) => ({ ...prev, [slot]: raw }));
    setMarks((prev) => (prev[row] === null ? prev : { ...prev, [row]: null }));
  }

  function decide(wantsCombine: boolean) {
    if (wantsCombine !== combines) {
      setDecideTried(true);
      setRevealedTarget(null);
      setFeedback(
        combines
          ? "Look again. Both terms ended up with the same radicand, so they are like radicals and they do add into one term."
          : "Look again. The two radicands are different, so these are not like radicals and there is no single term to add them into.",
      );
      return;
    }
    setFeedback(null);
    setRevealedTarget(null);
    setDecided(true);
    if (combines) {
      success();
      return;
    }
    finish(true);
  }

  function checkSum() {
    if (solved) {
      return;
    }
    setSumTried(true);
    const read = readNumericEntry(sumVal, "integer");
    if (read.ok && read.value === sum) {
      finish(true);
      return;
    }
    setRevealedTarget(null);
    // Plain entry takes anything, so a non-number is its own miss rather than drawing the
    // note about which parts add, which would answer a question the learner did not ask.
    if (!read.ok) {
      setFeedback(WHOLE_NUMBER_MISS);
      return;
    }
    setFeedback(
      "Not quite. Only the coefficients add here, and the radical itself stays exactly as it is.",
    );
  }

  /** Hand the learner one step, with its reasoning. Carries the round on, earns nothing. */
  function revealStep(target: RevealTarget) {
    setRevealedTarget(target);
    setFeedback(null);
    if (target.kind === "slot") {
      const slot = target.slot;
      const answer = String(slotTarget(round, slot));
      setValues((prev) => ({ ...prev, [slot]: answer }));
      setSlotDone((prev) => ({ ...prev, [slot]: true }));
      // The row's verdict was about the entry this just replaced, and a handed answer earns
      // no verdict either way: it was not answered.
      setMarks((prev) => ({ ...prev, [rowOf(slot)]: null }));
      return;
    }
    if (target.kind === "decide") {
      setDecided(true);
      if (!combines) {
        finish(false);
      }
      return;
    }
    setSumVal(String(sum));
    finish(false);
  }

  function nextRound() {
    if (roundIndex < lastIndex) {
      setRoundIndex(roundIndex + 1);
      setValues(EMPTY_VALUES);
      setSlotDone(NO_SLOTS_DONE);
      setMarks(NOTHING_CHECKED);
      setRowTried(NOTHING_TRIED);
      setDecided(false);
      setDecideTried(false);
      setSumVal("");
      setSumTried(false);
      setSolved(false);
      setRevealedTarget(null);
      setFeedback(null);
    }
  }

  /**
   * The answer to a missed row, in the numbers that row actually holds.
   *
   * This is what the generic restatement of the method was replaced by, so every branch names
   * a quantity the learner can go and check rather than telling them the procedure again.
   */
  function missNote(row: Row, miss: Miss): ReactNode {
    const n = rowNumber(row);
    const thisRoot = <InlineMath latex={`\\sqrt{${n}}`} />;
    if (miss.kind === "blank") {
      return <>{thisRoot} needs a number in both boxes.</>;
    }
    if (miss.kind === "notNumber") {
      return <>Both boxes on this row take a whole number.</>;
    }
    if (miss.kind === "range") {
      return <>Both numbers on this row have to be 1 or more.</>;
    }
    if (miss.kind === "moved") {
      return (
        <>
          <InlineMath latex={`${miss.c}\\sqrt{${miss.m}} = \\sqrt{${miss.came}}`} />, and
          this row is {thisRoot}.
        </>
      );
    }
    return (
      <>
        The value holds: <InlineMath latex={`${miss.c}\\sqrt{${miss.m}} = \\sqrt{${n}}`} />.
        But{" "}
        <InlineMath latex={`${miss.m} = ${miss.square} \\cdot ${miss.m / miss.square}`} />,
        and <InlineMath latex={`${miss.square}`} /> is a perfect square.
      </>
    );
  }

  /** One root, its two boxes, the button that checks THAT root, and its verdict. */
  function radicalRow(row: Row) {
    const [coeffSlot, radSlot] = ROW_SLOTS[row];
    const n = rowNumber(row);
    const mark = marks[row];
    const verdict: PartVerdict | null = mark === null ? null : mark.state;
    const landed = slotDone[coeffSlot] && slotDone[radSlot];
    return (
      <div key={row} className="lesson-interactive__row">
        <div className="lesson-interactive__field" style={{ color: LABEL }}>
          <span className="lesson-interactive__field-label">
            <InlineMath latex={`\\sqrt{${n}} =`} />
          </span>
          <input
            className="lesson-interactive__input"
            {...numericEntryProps("integer")}
            value={values[coeffSlot]}
            disabled={slotDone[coeffSlot]}
            aria-label={partName(`Coefficient of the simplified root of ${n}`, verdict)}
            onChange={(e) => typeInto(coeffSlot, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                checkRow(row);
              }
            }}
            // Last, so the answer overrides whatever the learner typed for as long as the
            // reveal is up, and only on the box `revealTarget` names. Four boxes are live at
            // once here, `revealAnswer` prints the one this reveal is about, and filling any
            // of the other three would hand over an answer the passage says nothing about.
            {...(revealTarget?.kind === "slot" && revealTarget.slot === coeffSlot
              ? fill.entry(slotTarget(round, coeffSlot))
              : {})}
          />
          <span className="lesson-interactive__field-label">
            <InlineMath latex="\sqrt{\phantom{0}}" />
          </span>
          <input
            className="lesson-interactive__input"
            {...numericEntryProps("integer")}
            value={values[radSlot]}
            disabled={slotDone[radSlot]}
            aria-label={partName(`Radicand of the simplified root of ${n}`, verdict)}
            onChange={(e) => typeInto(radSlot, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                checkRow(row);
              }
            }}
            {...(revealTarget?.kind === "slot" && revealTarget.slot === radSlot
              ? fill.entry(slotTarget(round, radSlot))
              : {})}
          />
        </div>
        {!landed && (
          <button
            type="button"
            className="lesson-interactive__check lesson-interactive__check--part"
            aria-label={`Check the simplified root of ${n}`}
            onClick={() => checkRow(row)}
          >
            Check <InlineMath latex={`\\sqrt{${n}}`} />
          </button>
        )}
        {verdict !== null && <WidgetPartVerdict verdict={verdict} />}
        {mark !== null && mark.state === "wrong" && (
          <WidgetPartNote>{missNote(row, mark.miss)}</WidgetPartNote>
        )}
      </div>
    );
  }

  /** The number, the perfect square pulled out of it, and what stays inside, for one slot. */
  function slotFacts(slot: Slot) {
    const isA = slot === "aCoeff" || slot === "aRad";
    const c = isA ? round.cA : round.cB;
    return {
      n: isA ? round.first : round.second,
      c,
      m: isA ? round.mA : round.mB,
      square: c * c,
      isCoeff: slot === "aCoeff" || slot === "bCoeff",
    };
  }

  function revealAnswer(target: RevealTarget): ReactNode {
    if (target.kind === "slot") {
      const { c, m, isCoeff } = slotFacts(target.slot);
      return <InlineMath latex={`${isCoeff ? c : m}`} />;
    }
    if (target.kind === "decide") {
      return combines ? "yes, they combine" : "no, they do not combine";
    }
    return <InlineMath latex={`${sum}`} />;
  }

  function revealWhy(target: RevealTarget): ReactNode {
    if (target.kind === "slot") {
      const { n, c, m, square, isCoeff } = slotFacts(target.slot);
      const split = `${n} = ${square} \\cdot ${m}`;
      return isCoeff ? (
        <>
          Every perfect square inside {n} multiplies up to {square}, because{" "}
          <InlineMath latex={split} />. The principal square root of {square} is {c}, and
          that is the number which steps outside the radical as the coefficient.
        </>
      ) : (
        <>
          Splitting {n} as <InlineMath latex={split} /> lets the perfect square {square}{" "}
          come out of the radical. The {m} has no perfect square factor of its own, so it
          has to stay inside, which makes {m} the radicand of the simplified term.
        </>
      );
    }
    if (target.kind === "decide") {
      return combines ? (
        <>
          Both roots simplified down to the same radicand,{" "}
          <InlineMath latex={`\\sqrt{${round.mA}}`} />, so these are like radicals. Like
          radicals act as matching units, and matching units are exactly what can be
          gathered into a single term.
        </>
      ) : (
        <>
          The two roots simplified to different radicands,{" "}
          <InlineMath latex={`\\sqrt{${round.mA}}`} /> and{" "}
          <InlineMath latex={`\\sqrt{${round.mB}}`} />, so they are not like radicals. There
          is no shared unit to gather, so the sum stays as two separate terms.
        </>
      );
    }
    return (
      <>
        Both terms now carry <InlineMath latex={`\\sqrt{${round.mA}}`} />, so that radical
        is a shared unit and only the coefficients add:{" "}
        <InlineMath latex={`${round.cA} + ${round.cB} = ${sum}`} />. The radicand itself
        never changes when like radicals are added, so the whole term comes to{" "}
        <InlineMath latex={`${sum}\\sqrt{${round.mA}}`} />.
      </>
    );
  }

  /**
   * The status line stands down only while the reveal panel is explaining the step still
   * in hand; once the round has moved on, the two are saying different things.
   */
  const revealOwnsExplanation =
    revealedTarget !== null && (solved || (revealedTarget.kind === "slot" && !simplified));

  const simplifiedLatex = simplified
    ? `${round.cA}\\sqrt{${round.mA}} + ${round.cB}\\sqrt{${round.mB}}`
    : "{?}\\sqrt{?} + {?}\\sqrt{?}";
  const resultLatex = combines
    ? `${sum}\\sqrt{${round.mA}}`
    : `${round.cA}\\sqrt{${round.mA}} + ${round.cB}\\sqrt{${round.mB}}`;
  const neutral = { color: LABEL, borderColor: LINE };

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <svg
        viewBox="0 0 440 164"
        role="img"
        aria-label={`Simplify the square root of ${round.first} and the square root of ${round.second}, then decide whether they combine`}
      >
        <title>Simplify then decide whether two radicals combine</title>

        <text x={220} y={20} textAnchor="middle" fontSize={12} fill={SOFT}>
          {`Round ${roundIndex + 1} of ${rounds.length}`}
        </text>

        <SvgMath
          latex={`\\sqrt{${round.first}} + \\sqrt{${round.second}}`}
          x={220}
          y={44}
          fontSize={22}
          color={LABEL}
        />

        <text x={220} y={64} textAnchor="middle" fontSize={12} fill={LINE}>
          &#8595;
        </text>

        <SvgMath
          latex={simplifiedLatex}
          x={220}
          y={92}
          fontSize={22}
          color={simplified ? SIGNAL : SOFT}
        />

        {solved && (
          <>
            <text x={220} y={112} textAnchor="middle" fontSize={12} fill={LINE}>
              &#8595;
            </text>
            <SvgMath
              latex={resultLatex}
              x={220}
              y={140}
              fontSize={24}
              color={combines ? CIVIC : BRICK}
            />
          </>
        )}
      </svg>

      {solved ? (
        isLastRound ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with three new pairs
          </button>
        ) : (
          <button type="button" className="lesson-interactive__check" onClick={nextRound}>
            Next: a new pair
          </button>
        )
      ) : !simplified ? (
        // Two rows, two buttons: each root is checked and answered on its own. Neither field
        // carries a hue of its own either, so the verdict marks are the only colour here and
        // a row is never drawn in the wrong end of the correctness palette before it is
        // answered.
        <div className="lesson-interactive__rows">{ROWS.map((row) => radicalRow(row))}</div>
      ) : !decided ? (
        // Both calls carry the same neutral token, so colour never marks the answer. The
        // fill dashes the one `decide` accepts, which is what `combines` says and what the
        // decide reveal states in words.
        <div className="lesson-interactive__controls">
          {[true, false].map((wantsCombine) => {
            const given = revealTarget?.kind === "decide" && wantsCombine === combines;
            return (
              <button
                key={wantsCombine ? "combine" : "separate"}
                type="button"
                className="lesson-interactive__step"
                style={{
                  ...neutral,
                  borderColor: given && fill.given ? SIGNAL_DEEP : LINE,
                  borderStyle: given && fill.given ? "dashed" : "solid",
                }}
                onClick={() => decide(wantsCombine)}
                {...fill.mark(given)}
              >
                {wantsCombine ? "Add them into one term" : "They do not combine"}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="lesson-interactive__controls">
          {/* Ink, not CIVIC. Green is a right answer here, and this box has no answer in it
              yet, so drawing it green said the opposite before it was typed into. */}
          <div className="lesson-interactive__field" style={{ color: LABEL }}>
            <span className="lesson-interactive__field-label">
              <InlineMath
                latex={`${round.cA}\\sqrt{${round.mA}} + ${round.cB}\\sqrt{${round.mB}} = {?}\\sqrt{${round.mA}},`}
              />{" "}
              coefficient =
            </span>
            <input
              className="lesson-interactive__input"
              {...numericEntryProps("integer")}
              value={sumVal}
              aria-label={`Coefficient of the combined root of ${round.mA}`}
              onChange={(e) => setSumVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  checkSum();
                }
              }}
              // `sum` is the coefficient total `checkSum` grades against, and the sum reveal
              // is the only one on offer once the board has reached this box.
              {...(revealTarget?.kind === "sum" ? fill.entry(sum) : {})}
            />
          </div>
          <button type="button" className="lesson-interactive__check" onClick={checkSum}>
            Combine
          </button>
        </div>
      )}

      {revealTarget !== null && (
        <WidgetReveal
          available={revealAvailable}
          revealed={revealedTarget !== null}
          answer={revealAnswer(revealTarget)}
          why={revealWhy(revealTarget)}
          onReveal={() => revealStep(revealTarget)}
          // Four boxes are live, so "this box" named none of them. The label says WHICH.
          label={
            revealTarget.kind === "slot"
              ? `Reveal the ${slotFacts(revealTarget.slot).isCoeff ? "coefficient" : "radicand"} for the root of ${slotFacts(revealTarget.slot).n}`
              : revealTarget.kind === "decide"
                ? "Reveal whether they combine"
                : "Reveal answer"
          }
          othersRemain={othersRemainFor(revealTarget)}
        />
      )}

      {/* The board-level line, and only that. A missed root is answered under the row it
          happened on, so this stays on the TASK for the whole of the simplify stage: it is
          shared by both roots, and a red line here could only ever be about the pair. */}
      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealOwnsExplanation ? null : solved ? (
          combines ? (
            <>
              Both terms ended up with the same radicand, so they are like radicals and they
              add:{" "}
              <InlineMath
                latex={`\\sqrt{${round.first}} + \\sqrt{${round.second}} = ${resultLatex}`}
              />
              .
            </>
          ) : (
            <>
              The radicands are different, so these are not like radicals and this is as far
              as it goes:{" "}
              <InlineMath
                latex={`\\sqrt{${round.first}} + \\sqrt{${round.second}} = ${resultLatex}`}
              />
              . Two terms is the finished answer.
            </>
          )
        ) : feedback ? (
          feedback
        ) : !simplified ? (
          "Simplify each root into a coefficient out front and a radicand inside. Only once both are simplified can you tell whether they are like radicals."
        ) : !decided ? (
          "Both terms are simplified now. Compare the radicand left inside each one: do these two combine, or not?"
        ) : (
          "Both terms carry the same radical now, so enter the coefficient their sum comes to."
        )}
      </p>
    </div>
  );
}
