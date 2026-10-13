/**
 * A stack of worked lines sits on the card's centre line, on EVERY spot-the-error board.
 *
 * The defect: the work list was indented from the left on six of the eight boards and centred
 * on two, so the same interaction arrived in two different places on the card depending on
 * which lesson the learner had reached. The stack of derivation steps IS the figure on this
 * kind, and a figure reads as one object when it sits on the axis every other figure in the
 * card sits on; indented, the shortest line hangs off to one side of an empty right half.
 *
 * Centring is a property of the KIND, so it is asserted over every widget built on the kind
 * rather than over the two that happened to opt in. The population is read off the sources by
 * `kindFamily`, the same way `spotTheErrorPalette.browser.test.tsx` reads it, so a ninth board
 * is swept the day it is written and nobody has to remember a list.
 *
 * ## Why this needs real Chromium and a real width
 *
 * "Centred" is not a class name, it is a geometry: the claim is that the button holding a line
 * of maths has the same centre-x as the list it sits in. A test that asserted the class would
 * pass on a stylesheet that had stopped centring anything, and jsdom has no layout to measure.
 * The mount host is sized to `FIGURE_CONTENT_CAP`, because at the headless default the list is
 * narrower than its own max-width and an indent measures smaller than it really is.
 *
 * Every assertion is a distance, and a distance over nothing is zero, so the sweep carries
 * floors on both the boards mounted and the lines measured.
 */

import { afterEach, expect, test } from "vitest";

import { widgetsBuiltOn } from "./kindFamily";
import { FIGURE_CONTENT_CAP } from "./readingWidths";
import { type Harness, mount, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

const SPOT_WIDGETS = widgetsBuiltOn("SpotTheError");

const SPOT_VISUALS: readonly LessonVisualId[] = SPOT_WIDGETS.flatMap(
  (widget) => widget.ids,
);

/**
 * The floor. Eight boards are built on the kind today, so this is not a count to maintain but
 * a statement that the sweep swept something: a glob that stops resolving, a renamed registry
 * entry or a deleted widget fails here instead of passing vacuously over an empty list.
 */
const FAMILY_FLOOR = 8;

/** Subpixel rounding on a KaTeX box, and nothing more: an indent is tens of pixels. */
const TOLERANCE = 2;

/**
 * The list is 420px at most and the host is wider, so a list narrower than this is a sign the
 * measurement is happening somewhere the indent could not show up. Without it, a board whose
 * lines filled their list edge to edge would satisfy the centring claim by having no room to
 * be off-centre.
 */
const LIST_FLOOR = 380;

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

async function board(id: LessonVisualId): Promise<HTMLElement> {
  h = mount(<LessonVisual id={id} />);
  const host = h.host;
  host.style.width = `${FIGURE_CONTENT_CAP}px`;
  await waitFor(() => host.querySelector(".lesson-spot__work") !== null, `${id} mounts`);
  return host;
}

function centreX(box: DOMRect): number {
  return box.left + box.width / 2;
}

test("every spot-the-error board centres its worked lines in the work list", async () => {
  let boards = 0;
  let measured = 0;

  for (const id of SPOT_VISUALS) {
    const host = await board(id);
    const work = host.querySelector<HTMLElement>(".lesson-spot__work") as HTMLElement;
    const list = work.getBoundingClientRect();
    boards += 1;

    // The list has to be a real region, or "centred" is a claim about nothing.
    expect(
      list.width,
      `${id}: the work list is only ${list.width.toFixed(1)}px wide, so an indent could not show`,
    ).toBeGreaterThanOrEqual(LIST_FLOOR);

    const buttons = Array.from(
      work.querySelectorAll<HTMLElement>(".lesson-spot__line-button"),
    );
    expect(buttons.length, `${id}: the work list holds no lines`).toBeGreaterThan(1);

    buttons.forEach((button, index) => {
      const box = button.getBoundingClientRect();
      measured += 1;
      expect(box.width, `${id}: line ${index + 1} has no box`).toBeGreaterThan(0);

      // THE DEFECT, stated as the geometry it is: the line of maths and the list it sits in
      // share a centre. An indented list puts every line left of it by the whole indent.
      const drift = centreX(box) - centreX(list);
      expect(
        Math.abs(drift),
        `${id}: line ${index + 1} sits ${drift.toFixed(1)}px off the centre of its work list (line spans ${box.left.toFixed(1)}-${box.right.toFixed(1)}, list spans ${list.left.toFixed(1)}-${list.right.toFixed(1)})`,
      ).toBeLessThanOrEqual(TOLERANCE);
    });

    h?.cleanup();
    h = null;
  }

  expect(boards, "no spot-the-error board was mounted at all").toBeGreaterThanOrEqual(
    FAMILY_FLOOR,
  );
  expect(measured, "the boards held no lines to measure").toBeGreaterThanOrEqual(
    FAMILY_FLOOR,
  );
});

test("the flag caption beside a tapped line leaves the maths on the centre line", async () => {
  let flagged = 0;

  for (const id of SPOT_VISUALS) {
    const host = await board(id);
    const work = host.querySelector<HTMLElement>(".lesson-spot__work") as HTMLElement;
    const line = work.querySelector<HTMLElement>(".lesson-spot__line") as HTMLElement;
    const button = line.querySelector("button") as HTMLButtonElement;
    const before = centreX(button.getBoundingClientRect());

    // Either verdict puts a caption beside the line, so the first line does for this whether
    // it is the one that fails or one that follows.
    button.click();
    await waitFor(
      () => line.querySelector(".lesson-spot__flag") !== null,
      `${id}: tapping the first line said nothing beside it`,
    );
    const caption = (line.querySelector(".lesson-spot__flag")?.textContent ?? "").trim();
    expect(caption.length, `${id}: the caption beside the line is empty`).toBeGreaterThan(
      0,
    );

    const list = work.getBoundingClientRect();
    const box = button.getBoundingClientRect();
    flagged += 1;

    // The caption belongs AFTER the maths it is about, in the column reserved for it. Auto
    // placement puts it in the empty column on the far side instead, which reads as a verdict
    // arriving before the thing it judges, and the two side columns are the same width so the
    // centring assertion below cannot see the difference.
    const flag = line.querySelector<HTMLElement>(".lesson-spot__flag") as HTMLElement;
    expect(
      flag.getBoundingClientRect().left,
      `${id}: "${caption}" is drawn to the LEFT of the line it is about`,
    ).toBeGreaterThanOrEqual(box.right - TOLERANCE);

    // The caption is why the line is a three-column grid rather than a centred row: laid out
    // beside the maths in the same box, it pushed the maths left by half its own width on
    // every tap. So the claim is BOTH that the line is still centred with the caption up, and
    // that it did not move when the caption appeared.
    const drift = centreX(box) - centreX(list);
    expect(
      Math.abs(drift),
      `${id}: with "${caption}" beside it, line 1 sits ${drift.toFixed(1)}px off the centre of its work list`,
    ).toBeLessThanOrEqual(TOLERANCE);
    expect(
      Math.abs(centreX(box) - before),
      `${id}: "${caption}" appearing shifted the maths by ${(centreX(box) - before).toFixed(1)}px`,
    ).toBeLessThanOrEqual(TOLERANCE);

    h?.cleanup();
    h = null;
  }

  expect(flagged, "no board answered a tap with a caption").toBeGreaterThanOrEqual(
    FAMILY_FLOOR,
  );
});

test("the swept population is read off the tree, not written down here", () => {
  expect(
    SPOT_WIDGETS.length,
    "the source sweep found fewer widgets built on the kind than exist",
  ).toBeGreaterThanOrEqual(FAMILY_FLOOR);
  expect(
    SPOT_VISUALS.length,
    "fewer registered ids than widgets built on the kind, so a board left the sweep",
  ).toBeGreaterThanOrEqual(FAMILY_FLOOR);
  expect(new Set(SPOT_VISUALS).size).toBe(SPOT_VISUALS.length);
});

test.each(SPOT_WIDGETS.map((widget) => widget.path))(
  "%s is registered, so it reaches the sweep rather than dropping out of it",
  (path) => {
    // A rename on either side of the registry would otherwise shrink the population in
    // silence, which is the derived-population version of a hardcoded count.
    const widget = SPOT_WIDGETS.find((w) => w.path === path);
    expect(widget?.component, `${path}: no exported component to look up`).not.toBeNull();
    expect(
      widget?.ids.length ?? 0,
      `${path}: built on the kind but not found in the visual registry`,
    ).toBeGreaterThanOrEqual(1);
  },
);
