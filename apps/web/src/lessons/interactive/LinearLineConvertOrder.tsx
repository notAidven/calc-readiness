/**
 * LF.2 interactive (slide 3): order the two moves that turn point-slope form into
 * slope-intercept form.
 *
 * The slide's claim is that the two forms sit two moves apart, and a claim about how far apart
 * two things are is a claim about a sequence. Each line on the board follows from exactly one
 * other line, so building the chain is what shows the distance: distribute the slope across
 * the bracket, take the leftover constant across the equals sign, tidy the two plain numbers,
 * and the intercept that point-slope form never named is written down.
 *
 * The tidied line and the line before it are both dealt, so a learner who reaches for the
 * finished equation before the constants have been collected is refused rather than carried.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type OrderedStep, OrderSteps } from "./kinds/OrderSteps";

interface Board {
  /** The point-slope line, and the pieces every later line is built from. */
  given: string;
  distributed: string;
  isolated: string;
  finished: string;
  readOff: string;
  spokenGiven: string;
  /** The slope, and the sentence fragments the reasons need. */
  slope: string;
  bracket: string;
  moved: string;
  dealt: readonly number[];
}

/** Neither board is the CFU's $y = -3x - 1$. */
const BOARDS: readonly Board[] = [
  {
    given: "y + 2 = 4(x - 1)",
    distributed: "y + 2 = 4x - 4",
    isolated: "y = 4x - 4 - 2",
    finished: "y = 4x - 6",
    readOff: "m = 4, \\;\\; b = -6",
    spokenGiven: "y plus 2 equals 4 times x minus 1",
    slope: "4",
    bracket: "4(x - 1) = 4x - 4",
    moved: "-4 - 2 = -6",
    dealt: [3, 1, 0, 2],
  },
  {
    given: "y - 3 = -2(x + 5)",
    distributed: "y - 3 = -2x - 10",
    isolated: "y = -2x - 10 + 3",
    finished: "y = -2x - 7",
    readOff: "m = -2, \\;\\; b = -7",
    spokenGiven: "y minus 3 equals negative 2 times x plus 5",
    slope: "-2",
    bracket: "-2(x + 5) = -2x - 10",
    moved: "-10 + 3 = -7",
    dealt: [2, 0, 3, 1],
  },
];

export function LinearLineConvertOrder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  const steps: readonly OrderedStep[] = [
    {
      id: "distribute",
      latex: board.distributed,
      spoken: "the bracket multiplied out",
      why: (
        <>
          The first move is the only one available: the slope has to reach both terms in the
          bracket, so <InlineMath latex={board.bracket} />. Nothing can be tidied or moved
          while the right-hand side is still a product.
        </>
      ),
    },
    {
      id: "isolate",
      latex: board.isolated,
      spoken: "the constant taken across the equals sign",
      why: (
        <>
          With the bracket gone, the only thing standing between this and{" "}
          <InlineMath latex="y = mx + b" /> is the constant sitting beside{" "}
          <InlineMath latex="y" />. Undoing it on both sides moves it across, and it lands
          next to the constant already there.
        </>
      ),
    },
    {
      id: "finish",
      latex: board.finished,
      spoken: "the two constants combined",
      why: (
        <>
          Two plain numbers on the right, so they collect into one:{" "}
          <InlineMath latex={board.moved} />. This line cannot come earlier, because until
          both constants are on that side there is nothing to combine.
        </>
      ),
    },
    {
      id: "read",
      latex: board.readOff,
      spoken: "the slope and the intercept read off",
      why: (
        <>
          Last, because reading <InlineMath latex="b" /> off is only possible once the
          equation is in the form that shows it. The slope was visible in the point-slope
          line all along; the intercept <InlineMath latex="b" /> was not, and that is what
          the two moves bought.
        </>
      ),
    },
  ];

  return (
    <OrderSteps
      key={variant.nonce}
      steps={steps}
      dealt={board.dealt}
      objective={
        <>
          Goal: get <InlineMath latex={board.given} /> to a line in{" "}
          <InlineMath latex="y = mx + b" /> form, where the intercept that point-slope form
          never names can be read straight off it.
        </>
      }
      prompt="Tap the line that comes next in converting this equation to slope-intercept form."
      conclusion={
        <>
          <InlineMath latex={board.given} /> is <InlineMath latex={board.finished} />, and
          it took two moves to say so: distribute, then move the constant. The slope{" "}
          <InlineMath latex={board.slope} /> never changed on the way, which is why
          point-slope form is the quicker thing to write down first.
        </>
      }
      ariaLabel={`Four lines converting ${board.spokenGiven} into slope-intercept form, to be put in order`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different equation"
    />
  );
}
