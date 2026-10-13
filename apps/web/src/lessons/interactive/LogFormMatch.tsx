import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type MatchPair, MatchPairs } from "./kinds/MatchPairs";

/**
 * EL.3 slide 1: the two forms of one statement, joined.
 *
 * A correspondence rather than a procedure, which is what `MatchPairs` is for: every
 * exponential statement on the left is the same three numbers as exactly one logarithm
 * statement on the right, in the same three roles. The board also does the work a set of
 * separate questions could not, because the distractors are each other. Two pairs on every
 * board are a base-and-exponent SWAP apart, so a learner who reads $\log_{2} 128 = 7$ as
 * "two and seven, in some order" finds a plausible wrong partner waiting for them.
 *
 * The first board's opening pair used to be $2^{5} = 32$ against $\log_{2} 32 = 5$, which is
 * the worked example on this slide written out in both directions: the first join a learner
 * met was printed above the board, in both of the forms they were being asked to connect.
 * The swap pair moved with it, since a swap only teaches anything against the statement it
 * is the swap OF.
 */

interface Board {
  pairs: readonly MatchPair[];
  /** A derangement: no right item is dealt against the left item it belongs to. */
  rightOrder: readonly number[];
}

const BOARDS: readonly Board[] = [
  {
    pairs: [
      {
        id: "b0-p0",
        left: "2^{7} = 128",
        right: "\\log_{2} 128 = 7",
        leftSpoken: "2 to the 7 equals 128",
        rightSpoken: "log base 2 of 128 equals 7",
        why: (
          <>
            The base is the number being raised to a power, so it stays the base on both
            sides: it is the <InlineMath latex="2" /> in <InlineMath latex="2^{7}" /> and
            the <InlineMath latex="2" /> written under the <InlineMath latex="\log" />. What
            the logarithm equals is the EXPONENT, <InlineMath latex="7" />, and the number
            inside it is the result, <InlineMath latex="128" />.
          </>
        ),
      },
      {
        id: "b0-p1",
        left: "7^{2} = 49",
        right: "\\log_{7} 49 = 2",
        leftSpoken: "7 squared equals 49",
        rightSpoken: "log base 7 of 49 equals 2",
        why: (
          <>
            Here the base is <InlineMath latex="7" /> and the exponent is{" "}
            <InlineMath latex="2" />, the other way round from <InlineMath latex="2^{7}" />,
            and swapping them changes the statement entirely: <InlineMath latex="49" />{" "}
            rather than <InlineMath latex="128" />. So the two numbers are not
            interchangeable, and which one goes under the <InlineMath latex="\log" />{" "}
            decides everything.
          </>
        ),
      },
      {
        id: "b0-p2",
        left: "3^{4} = 81",
        right: "\\log_{3} 81 = 4",
        leftSpoken: "3 to the 4 equals 81",
        rightSpoken: "log base 3 of 81 equals 4",
        why: (
          <>
            Four factors of <InlineMath latex="3" /> reach <InlineMath latex="81" />, so the
            exponent that turns <InlineMath latex="3" /> into <InlineMath latex="81" /> is{" "}
            <InlineMath latex="4" />, and that exponent is what{" "}
            <InlineMath latex="\log_{3} 81" /> means.
          </>
        ),
      },
      {
        id: "b0-p3",
        left: "4^{3} = 64",
        right: "\\log_{4} 64 = 3",
        leftSpoken: "4 cubed equals 64",
        rightSpoken: "log base 4 of 64 equals 3",
        why: (
          <>
            <InlineMath latex="4 \cdot 4 \cdot 4 = 64" />, which is three factors, so{" "}
            <InlineMath latex="\log_{4} 64 = 3" />. Reading it the other way round would ask
            for four factors of <InlineMath latex="3" />, and that is{" "}
            <InlineMath latex="81" /> rather than <InlineMath latex="64" />.
          </>
        ),
      },
    ],
    rightOrder: [2, 3, 1, 0],
  },
  {
    pairs: [
      {
        id: "b1-p0",
        left: "2^{6} = 64",
        right: "\\log_{2} 64 = 6",
        leftSpoken: "2 to the 6 equals 64",
        rightSpoken: "log base 2 of 64 equals 6",
        why: (
          <>
            Six factors of <InlineMath latex="2" /> reach <InlineMath latex="64" />, so the
            exponent is <InlineMath latex="6" /> and the base stays <InlineMath latex="2" />{" "}
            in both forms.
          </>
        ),
      },
      {
        id: "b1-p1",
        left: "6^{2} = 36",
        right: "\\log_{6} 36 = 2",
        leftSpoken: "6 squared equals 36",
        rightSpoken: "log base 6 of 36 equals 2",
        why: (
          <>
            The same two numbers as <InlineMath latex="2^{6}" /> in the other order, and
            they give <InlineMath latex="36" /> rather than <InlineMath latex="64" />. The
            number written under the <InlineMath latex="\log" /> is the one being
            multiplied, and the number the logarithm equals is how many times.
          </>
        ),
      },
      {
        id: "b1-p2",
        left: "3^{3} = 27",
        right: "\\log_{3} 27 = 3",
        leftSpoken: "3 cubed equals 27",
        rightSpoken: "log base 3 of 27 equals 3",
        why: (
          <>
            The base and the exponent happen to be the same number here, which is why the
            statement survives being read backwards. That is a coincidence of{" "}
            <InlineMath latex="3" /> and not a rule: it fails for every other pair on this
            board.
          </>
        ),
      },
      {
        id: "b1-p3",
        left: "5^{4} = 625",
        right: "\\log_{5} 625 = 4",
        leftSpoken: "5 to the 4 equals 625",
        rightSpoken: "log base 5 of 625 equals 4",
        why: (
          <>
            <InlineMath latex="5 \cdot 5 \cdot 5 \cdot 5 = 625" />, four factors, so{" "}
            <InlineMath latex="\log_{5} 625 = 4" />. The result is the big number inside the
            logarithm, never the value the logarithm equals.
          </>
        ),
      },
    ],
    rightOrder: [1, 2, 3, 0],
  },
];

export function LogFormMatch(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <MatchPairs
      key={variant.nonce}
      pairs={board.pairs}
      rightOrder={board.rightOrder}
      prompt="Join each exponential statement to the logarithm statement holding the same three numbers in the same three roles."
      conclusion={
        <>
          Every pair joined. A logarithm statement and an exponential statement are one
          statement written two ways: the base stays the base, the number the logarithm
          equals is the exponent, and the number inside it is the result.
        </>
      }
      ariaLabel="Exponential statements on the left, logarithm statements on the right, to be joined in pairs"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over on a different set of statements"
    />
  );
}
