/**
 * The widths a lesson figure is really given, and what each one is.
 *
 * This module exists because one number came to stand for three different things. Ten
 * places pinned `const CARD_WIDTH = 460` independently, each with a comment calling it
 * "the width the stylesheet gives every lesson card" — and no lesson card is 460px wide.
 * `460px` is a `max-width` the stylesheet puts on figure CONTENT (`.lesson-visual svg`,
 * `.lesson-interactive svg`, the sorter trays, the equation grid); grep it and every hit
 * is a cap on something drawn INSIDE a figure. Nothing sizes a container to it.
 *
 * The cost of the confusion was a real defect. A fix that shrank the labelling figures'
 * slots to fit "the card" measured itself at 460 and passed, while the width a phone
 * actually gives those figures — a third narrower — still wrapped every one of them.
 *
 * So the three widths below are the containers a learner really gets, and they are
 * MEASURED rather than computed: `labelFigureNarrow.browser.test.tsx` mounts the shipped
 * chain at the real viewports and fails if any of these numbers stops being true. (This
 * header used to name a `readingWidths.browser.test.tsx`. No such file has ever existed in
 * this tree, so the sentence promising a measurement named nothing that took one.)
 *
 * ## The two measures, which are 26px apart and must not be mixed
 *
 * `column` is the width of the box `figure.lesson-visual` fills — what a test sets on its
 * mount host. `inside` is what is left after that figure's own 12px padding and 1px border
 * on each side: the width `.lesson-interactive` gets, and therefore the width a widget's
 * layout actually has to work in. Reports quote `inside`, because that is the number a
 * figure's own measurements compare against.
 */

/** One container a lesson figure is drawn in. */
export interface ReadingWidth {
  /** Where a learner meets this width. */
  readonly where: string;
  /** The width of the column `figure.lesson-visual` fills. Set this on a test host. */
  readonly column: number;
  /** What is left inside the figure's padding and border: the widget's own working width. */
  readonly inside: number;
}

/**
 * The in-city lesson window on a desktop: `--lesson-column` inside `.world-scene--large`.
 * The widest surface, and the one where nothing has ever wrapped.
 */
export const CITY_DESKTOP: ReadingWidth = {
  where: "the in-city lesson window, desktop",
  column: 920,
  inside: 894,
};

/** The Lessons reading surface: the `.lesson-player` article's 720px prose column. */
export const LESSONS_READING: ReadingWidth = {
  where: "the Lessons reading surface",
  column: 654,
  inside: 628,
};

/**
 * The in-city lesson window on a 390px phone — the narrowest container that ships, and
 * the one no test measured until this module existed.
 *
 * The immersive card is the 390px viewport itself. Its body keeps 12px inline padding on
 * each side, so the figure column is 366px; the figure's own 12px padding and 1px border on
 * each side leave a 340px widget well.
 */
export const CITY_PHONE: ReadingWidth = {
  where: "the in-city lesson window, on a 390px phone",
  column: 366,
  inside: 340,
};

/** The viewport `CITY_PHONE` is measured at: a 390pt phone in portrait. */
export const PHONE_VIEWPORT = { width: 390, height: 844 } as const;

/** A viewport wide enough for `CITY_DESKTOP` and `LESSONS_READING` to reach their caps. */
export const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const;

/**
 * `max-width: 460px`, the cap the stylesheet puts on figure CONTENT.
 *
 * NOT a container: see the header. It is kept as a named constant precisely so that the
 * files measuring at it say what they are measuring at, and so that widening it is
 * visibly a different decision from adding a width. Widening it would in fact be a
 * REGRESSION in coverage: at `CITY_DESKTOP` no labelling figure wraps at any slot size in
 * range, so a family that measured only there could not see a wrap at all. 460 is a
 * defensible mid-range spot check between 894 and 340, and it stays exactly where it is.
 */
export const FIGURE_CONTENT_CAP = 460;
