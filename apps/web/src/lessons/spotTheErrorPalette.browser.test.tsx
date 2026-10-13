/**
 * A correct answer never comes back in the app's WRONG colour.
 *
 * The defect, on EXP.1's spot-the-error board: the learner read four lines of work, tapped the
 * one that does not follow, got it right, and the line they picked was boxed in red/rust with
 * the caption "this is the line". Two semantic axes had been collapsed onto one palette. Red
 * and green are the CORRECTNESS channel everywhere else in the app and they report on the
 * LEARNER'S ACTION; here they were being spent on the MATHEMATICAL STATUS of the chosen line.
 * Both readings are coherent, which is why it shipped, but the learner reads colour as
 * feedback about themselves first, so finding the mistake was answered with rejection.
 *
 * The marker could not simply change colour, because it has two jobs in sequence: acknowledge
 * the pick, and then keep saying which line is under repair while stage two is answered. So
 * they are done one at a time, and the standing mark is a third colour that is neither red nor
 * green, because the correctness palette is spoken for.
 *
 * Every widget whose TARGET IS AN ERROR has the same collapse, so it is fixed in the KIND and
 * swept over every widget built on it rather than over the one that was screenshotted.
 *
 * The colour assertions are paired with NON-COLOUR ones throughout. A palette edit that put
 * red back would be caught by the first; a "fix" that only moved hues around and left the
 * three states indistinguishable to a colourblind learner would be caught by the second.
 */

import { afterEach, expect, test } from "vitest";

import { widgetsBuiltOn } from "./kindFamily";
import { type Harness, mount, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

/**
 * The family is READ OFF THE TREE, not written down here.
 *
 * It was written down, as a two-id list with `toBe(2)` under it to "keep the claim honest if
 * a third one is ever added". Three more were added, the list was not, and the guard stayed
 * green while its stated claim was false for three of five widgets: a number somebody has to
 * remember to bump is the failure, and bumping it to five only restarts the clock. So the
 * population comes from `kindFamily`, which reads the sources, and a sixth widget is swept
 * the day it is written.
 */
const ERROR_TARGET_WIDGETS = widgetsBuiltOn("SpotTheError");

const ERROR_TARGET_VISUALS: readonly LessonVisualId[] = ERROR_TARGET_WIDGETS.flatMap(
  (widget) => widget.ids,
);

/**
 * The floor. Five widgets are built on the kind today; this is not a count to maintain but a
 * statement that the sweep below is sweeping something. Adding a sixth needs no edit here,
 * and losing one — or a glob or a lookup that stops resolving — fails instead of passing
 * vacuously over an empty list.
 */
const FAMILY_FLOOR = 5;

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

function all<T extends Element>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

/** A theme token as the browser actually resolves it, for comparing against a border. */
function token(name: string): string {
  const probe = document.createElement("div");
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved;
}

function lines(host: HTMLElement): HTMLElement[] {
  return all<HTMLElement>(host, ".lesson-spot__line");
}

/** What a marked line is saying in the channels that are not colour. */
function carriers(line: HTMLElement): { caption: string; name: string; border: string } {
  const button = line.querySelector("button") as HTMLButtonElement;
  return {
    caption: (line.querySelector(".lesson-spot__flag")?.textContent ?? "").trim(),
    name: button.getAttribute("aria-label") ?? "",
    border: getComputedStyle(button).borderTopStyle,
  };
}

function borderColour(line: HTMLElement): string {
  return getComputedStyle(line.querySelector("button") as HTMLElement).borderTopColor;
}

async function board(id: LessonVisualId): Promise<HTMLElement> {
  h = mount(<LessonVisual id={id} />);
  const host = h.host;
  await waitFor(() => host.querySelector(".lesson-interactive") !== null, `${id} mounts`);
  return host;
}

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 20));

test.each(ERROR_TARGET_VISUALS)(
  "%s: a correct pick is the success treatment, and the standing mark is neither red nor green",
  async (id) => {
    const host = await board(id);
    const civic = token("--civic");
    const brick = token("--brick");

    // Find the line that does not follow by tapping down the work. A wrong tap is refused
    // and leaves everything live, so the sweep reaches the right one within the listing.
    let found: HTMLElement | null = null;
    for (const line of lines(host)) {
      (line.querySelector("button") as HTMLButtonElement).click();
      await settle();
      if (line.getAttribute("data-state") === "correct") {
        found = line;
        break;
      }
    }
    expect(found, `${id}: no line was accepted as the one that fails`).not.toBeNull();
    const line = found as HTMLElement;

    // THE DEFECT, stated on the colour. The pick was right, so it is answered in the colour
    // the app answers every other right answer in, and specifically NOT in the wrong one.
    expect(
      borderColour(line),
      `${id}: a correct pick is boxed in the wrong colour`,
    ).not.toBe(brick);
    expect(borderColour(line), `${id}: a correct pick is not the success colour`).toBe(
      civic,
    );

    // And it says so in words, so the acknowledgement does not depend on seeing the hue.
    const acknowledged = carriers(line);
    expect(
      acknowledged.caption.toLowerCase(),
      `${id}: the caption does not say it`,
    ).toContain("correct");
    expect(acknowledged.name.toLowerCase(), `${id}: the name does not say it`).toContain(
      "correct",
    );

    // Then the same box takes over the OTHER job: marking the line stage two is replacing.
    // That is a standing statement about the work rather than a verdict, so it leaves the
    // correctness palette entirely rather than picking one end of it.
    await waitFor(
      () => line.getAttribute("data-state") === "repair",
      `${id}: the box never settled into the standing mark`,
    );
    expect(
      borderColour(line),
      `${id}: the standing mark is still inside the correctness palette`,
    ).not.toBe(brick);
    expect(
      borderColour(line),
      `${id}: the standing mark reads as a correct answer`,
    ).not.toBe(civic);

    // Distinguished from the correct-pick state without colour as well: different words, a
    // different accessible name, and a dashed rather than a solid box.
    const standing = carriers(line);
    expect(standing.caption, `${id}: the standing mark reuses the pick's caption`).not.toBe(
      acknowledged.caption,
    );
    expect(
      standing.caption.length,
      `${id}: the standing mark says nothing`,
    ).toBeGreaterThan(0);
    expect(standing.name, `${id}: the standing mark reuses the pick's name`).not.toBe(
      acknowledged.name,
    );
    expect(standing.border, `${id}: the standing mark is not dashed`).toBe("dashed");
    expect(acknowledged.border, `${id}: the pick was dashed too`).toBe("solid");

    // The line is still marked, which is the job the box could not simply drop: stage two is
    // being answered against it.
    expect(
      host.querySelectorAll('.lesson-spot__line[data-state="repair"]').length,
      `${id}: the line under repair stopped being marked`,
    ).toBe(1);
  },
);

test.each(ERROR_TARGET_VISUALS)(
  "%s: a wrong pick still goes red, and says so without colour",
  async (id) => {
    const brick = token("--brick");
    const civic = token("--civic");

    // Exactly one line in the work is the one that fails, so of the first two, at least one
    // is a line that does follow, and tapping it is the wrong pick this asserts on.
    let missed: HTMLElement | null = null;
    for (const index of [0, 1]) {
      h?.cleanup();
      h = null;
      const host = await board(id);
      const line = lines(host)[index] as HTMLElement;
      (line.querySelector("button") as HTMLButtonElement).click();
      await settle();
      if (line.getAttribute("data-state") === "wrong") {
        missed = line;
        break;
      }
    }
    expect(
      missed,
      `${id}: neither of the first two lines was a line that follows`,
    ).not.toBeNull();
    const line = missed as HTMLElement;

    // The learner's action was wrong, so this end of the correctness palette is the right one.
    expect(borderColour(line), `${id}: a wrong pick is not marked wrong`).toBe(brick);
    expect(borderColour(line), `${id}: a wrong pick reads as a correct one`).not.toBe(
      civic,
    );

    const said = carriers(line);
    expect(
      said.caption.length,
      `${id}: a wrong pick says nothing but its colour`,
    ).toBeGreaterThan(0);
    expect(
      said.caption.toLowerCase(),
      `${id}: a wrong pick claims to be correct`,
    ).not.toContain("correct");
    expect(said.name.toLowerCase(), `${id}: the name claims to be correct`).not.toContain(
      "correct",
    );
  },
);

test("the sweep found the widgets whose target is an error", () => {
  // The spot-the-error / find-the-mistake / which-step-is-wrong family, which is every widget
  // built on the `SpotTheError` kind. Fixing the kind is what fixes all of them at once, so
  // what has to be true is that the two sweeps above ran over ALL of them, and the only way
  // to know that without a list to forget is to count what the glob found.
  expect(
    ERROR_TARGET_WIDGETS.length,
    "the source sweep found fewer widgets built on the kind than exist",
  ).toBeGreaterThanOrEqual(FAMILY_FLOOR);
  expect(
    ERROR_TARGET_VISUALS.length,
    "the sweep ran over fewer ids than there are widgets in the family",
  ).toBeGreaterThanOrEqual(FAMILY_FLOOR);
  expect(new Set(ERROR_TARGET_VISUALS).size).toBe(ERROR_TARGET_VISUALS.length);
});

test.each(ERROR_TARGET_WIDGETS.map((widget) => widget.path))(
  "%s is registered, so it reaches the sweep rather than dropping out of it",
  (path) => {
    // A rename on either side of the registry would otherwise shrink the population in
    // silence, which is the same defect as the hardcoded count in a different costume.
    const widget = ERROR_TARGET_WIDGETS.find((w) => w.path === path);
    expect(widget?.component, `${path}: no exported component to look up`).not.toBeNull();
    expect(
      widget?.ids.length ?? 0,
      `${path}: built on the kind but not found in the visual registry`,
    ).toBeGreaterThanOrEqual(1);
  },
);
