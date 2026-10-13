/**
 * **THE CONTROLS GO BESIDE THE GRAPH, IN THE HALF OF THE WIDGET'S WIDTH NOTHING USES.**
 *
 * A learner on the in-city lesson host at 1024x580 gets a 431px well (`bodyUsableHeight`,
 * measured flat across all ten packs). A board that stacks a graph over its controls is
 * routinely 500-750px, so working it means scrolling down to press a button and back up to
 * see what the press did. That is the reported defect, and it is a defect about HEIGHT on a
 * surface with spare WIDTH: `readingWidths.ts` puts the widget's own well at 894px on that
 * surface while the diagram inside it is drawn at 560.
 *
 * ## Why a container query and not `@media`
 *
 * `.lesson-interactive` already declares `container-type: inline-size` and three
 * `@container widget (max-width: 380px)` rules already read it. The comment there says why,
 * and it applies here unchanged: a figure's width comes from its COLUMN, not from the
 * viewport, so a viewport rule would not fire in the 894px column where the defect lives and
 * would fire in the 305px in-city window where stacking is right.
 *
 * ## The threshold
 *
 * `720px`, from the arithmetic of the layout it turns on: a 460px figure column, the 12px
 * `--space-md` gap, and 240px of panel is 712, rounded up. Measured at the tip it fires on
 * exactly one surface — the 894px in-city desktop column, where it leaves the panel 422px —
 * and on none of the narrow ones: the 340px phone and the 305px in-city window stay stacked,
 * and both clear the existing `max-width: 380px` rules by a wide margin, so the two families
 * of rule can never be in force together.
 *
 * ## The figure column is capped at 460px, and that cap is load-bearing
 *
 * Not a detail inherited from `.lesson-interactive svg { max-width: 460px }`, which does NOT
 * apply on the learner's surface: `.world-scene--large .lesson-visual svg { max-width: 560px }`
 * is more specific and wins there, so LF.1's rise-over-run graph is drawn 560x448. The grid
 * track below is what takes it to 460x368, and 368px is what makes a 431px well reachable at
 * all. `.lesson-beside__figure` is capped in HEIGHT as well, through `--beside-figure-max`,
 * for the graphs a proportional width cut still leaves too tall; an SVG with a viewBox is a
 * replaced element with an intrinsic ratio, so clamping its height narrows it to match rather
 * than squashing it.
 *
 * ## What goes in which column
 *
 * The figure, alone, on the left. Everything the learner operates on the right, INCLUDING the
 * status line and the reveal: in the panel they cost nothing while the panel is shorter than
 * the graph, and full-width beneath both columns they would be added to the taller of the two.
 *
 * The task line ({@link WidgetTask}) stays ABOVE this element rather than inside a column,
 * because `widgetTaskOrder.browser.test.tsx` asserts it precedes every control in DOCUMENT
 * order and a panel-mounted task line on a left-hand figure would read second on a phone.
 *
 * ## `figureWidth`, and the band it is set against
 *
 * The well is 431px, and 431px is NOT the room a board has. `.advisor-lesson >
 * .advisor-npc__controls` is `position: sticky; bottom: 0` INSIDE that scrollport, so the
 * pinned way forward owns the foot of it at every scroll position: measured on the learner
 * mount at 1024x580, the body runs 79..510 and the row's top is at 429, leaving an uncovered
 * band of **350px**. A board taller than 350 has no scroll position that shows it whole, which
 * is the defect `lessonShellFit`'s band assertion now measures.
 *
 * Five boards were over that band while under the well. `figureWidth` is how they came back
 * under it: it sets `--beside-figure-cap`, which BOTH the grid track and the SVG's `max-width`
 * read, so a narrower figure column is a proportionally shorter diagram AND a wider panel. Two
 * of the five (TRG.5, TRG.6) were driven by the PANEL rather than the figure, and the wider
 * panel is what shortened them: their trailing note rewraps to fewer lines.
 *
 * Each caller records its own arithmetic. Do not tune one by eye: the board heights are
 * measured in `lessonShellFit.browser.test.tsx`, and its band assertion fails if a value here
 * stops being enough.
 */

import type { CSSProperties, ReactNode } from "react";

export function WidgetBeside({
  figure,
  figureWidth,
  children,
}: {
  /** The diagram, and nothing else: this is the column that gets capped. */
  figure: ReactNode;
  /**
   * A narrower figure column than the 460px default, in px, for a board the 350px band would
   * otherwise cut. Shortens the diagram in proportion and widens the panel by the same amount.
   */
  figureWidth?: number;
  /** Everything the learner operates, plus the reveal and the status line. */
  children: ReactNode;
}) {
  const style =
    figureWidth === undefined
      ? undefined
      : ({ "--beside-figure-cap": `${figureWidth}px` } as CSSProperties);
  return (
    <div className="lesson-beside" style={style}>
      <div className="lesson-beside__figure">{figure}</div>
      <div className="lesson-beside__panel">{children}</div>
    </div>
  );
}
