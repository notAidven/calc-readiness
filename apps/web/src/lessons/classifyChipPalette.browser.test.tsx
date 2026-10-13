/**
 * A choice a learner has not made yet is not coloured as right or wrong.
 *
 * `CIVIC` green and `BRICK` red are the correctness channel (R26), and they report on the
 * LEARNER'S ACTION: green means their pick was right, red means it was not. Painting the
 * options themselves in those two colours spends the channel before the learner has done
 * anything, and on these boards it does worse than that. `rational-exclusion-classify` deals
 * rows where most doses ARE excluded, so a standing green on "Allowed" points steadily at the
 * wrong answer while a standing red on "Excluded" points at the right one.
 *
 * The sweep asserts the state BEFORE any pick, which is the only state where the rule is
 * unambiguous: after a pick the same two colours are correct and expected, and they are
 * asserted elsewhere by the row's own check glyph.
 *
 * ## The population, and the seven-entry list it used to be
 *
 * It was seven authored D5 ids with `expect(NEUTRAL_CHIP_VISUALS.length).toBe(7)` under them:
 * a list counted against a literal six lines above it, so the only edit that could ever fail
 * that line was an edit to the line above it. This is the `spotTheErrorPalette` trap verbatim,
 * in a second file, and the docblock stating the criterion behaviourally sat directly above a
 * sweep scoped to one domain.
 *
 * Worse than inert. Measured at `3fbe5fcb`: paint every unpicked chip on D8's
 * `exp-decay-classify` green and the file reports `8 passed`; add that board to the list to
 * prove the assertions work and it fails TWICE, once on the palette and once on
 * `expected 8 to be 7`. A guard that counts its own list does not merely fail to notice
 * growth, it makes correct growth fail, so the cheapest way past it is to leave a board out.
 *
 * So the population is read off the sources: every widget rendering `.lesson-interactive__chip`,
 * which is 67 of them across all ten domains, and `BinaryRowSort`'s whole family with it. The
 * colours are not readable from those sources — `--brick` and `--civic` reach a chip through
 * `[data-state]` in `styles.css` or through an inline style, and all 67 read clean — which is
 * why this is a browser test and why the derived set is only the CANDIDATES. The rule is about
 * a board that offers live, unpicked options, and only a mount can say which boards those are.
 *
 * ## Why the assertions are paired with a count, and the skip with a list
 *
 * "No chip is red or green" is trivially true of a board with no chips, and several of these
 * widgets render their chips conditionally: `rational-scale-dose-explore` withholds them until
 * both denominators are solved. So every board states how many options it offered and that
 * they were still live, and the colour claim is made only against that floor.
 *
 * A board that offers no unpicked options at mount owes this rule nothing, and it is
 * indistinguishable from a board that has stopped rendering its chips at all — so it is not
 * skipped quietly. `NO_OPEN_CHOICE_AT_MOUNT` names every one, and the census at the foot of
 * the file asserts it in both directions: an entry that starts offering options at mount fails,
 * and a board that stops offering them without being listed fails by name.
 *
 * `PRE_PRESSED_CURSOR` is the second such list, over the second thing a board can hand a
 * learner before they act, and it is asserted the same way.
 */

import { afterEach, expect, test } from "vitest";

import { LESSON_DOMAINS } from "./domains";
import { visualsMatching } from "./kindFamily";
import { FIGURE_CONTENT_CAP } from "./readingWidths";
import { findButton, type Harness, mount, setInputValue, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

/**
 * The candidate set: every registered visual whose widget renders the shared chip.
 *
 * `widgetsMatching` pulls in a matching `kinds/` archetype's whole family, which is how
 * `BinaryRowSort`'s widgets arrive here without the class appearing in any of their own files.
 */
const CHIP_VISUALS: readonly LessonVisualId[] = visualsMatching(/lesson-interactive__chip/);

/** Which domain places each visual, so the sweep can say how far it reaches. */
const DOMAIN_OF = new Map<string, string>(
  LESSON_DOMAINS.flatMap((domain) =>
    domain.lessons.flatMap((lesson) =>
      (lesson.visuals ?? []).map((visual) => [visual.id, domain.label] as [string, string]),
    ),
  ),
);

/**
 * Boards that offer no open choice at mount, each with the reason it owes this rule nothing.
 *
 * Every one of these is a board whose chips are real and whose choice is not open YET, which
 * is a different thing from a board that has quietly stopped rendering chips at all. The two
 * are indistinguishable from inside the sweep, which is why the list is named and then
 * asserted in both directions at the foot of the file.
 */
const NO_OPEN_CHOICE_AT_MOUNT: readonly LessonVisualId[] = [
  // Chips arrive as the walkthrough advances; at mount there is one, so no choice is offered.
  "absvalue-walkthrough",
  // The chip is a single toggle for the sweeping line, not a set of named calls.
  "function-vertical-line-slider",
  // Its chips are readout slots that fill as angles are named; the only button is a reset.
  "geo-angle-explore",
  // A sorter: the radicals are dragged into bins, and the one chip is the bin's own label.
  "like-radicals-sorter",
  // The chips name the intersection once the two lines are drawn, so none is live at mount.
  "linear-system-graph-explore",
  // Pieces are built before they are labelled; the labelling chips unlock after the build.
  "piecewise-graph-build",
  // One reset chip beside a gauge the learner drags.
  "rational-gauge-domain-explore",
  // The cancel play offers its ruling chip only once a factor has been struck.
  "rational-scale-cancel-play",
  // "Back to upright" is the lone chip and it is shut while the beam already is upright.
  "trg-tangent-explore",
];

/**
 * Boards whose chip row is a CURSOR, so one chip is pressed before the learner touches it.
 *
 * `coordinate-quadrant-classify` deals four points and asks for a ruling on each. Its chip row
 * picks WHICH point is being ruled on, seeded to the first, and the ruling itself is made on a
 * separate row that starts unpressed. So the pressed chip is not an answer given on the
 * learner's behalf, which is what the assertion below is about, and it is drawn in the neutral
 * token like its siblings, so the correctness channel is not spent either.
 */
const PRE_PRESSED_CURSOR: readonly LessonVisualId[] = ["coordinate-quadrant-classify"];

/** Boards that were mounted and found to be offering live, unpicked options. */
const swept: LessonVisualId[] = [];
/** Boards that offered no open choice at mount, so the rule had nothing to be about. */
const noOpenChoice: LessonVisualId[] = [];
/** Boards observed arriving with one of their live chips already pressed. */
const prePressed: LessonVisualId[] = [];

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

function all<T extends Element>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

/** A theme token as the browser resolves it, for comparing against a chip's own colour. */
function token(name: string): string {
  const probe = document.createElement("div");
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved;
}

async function board(id: LessonVisualId): Promise<HTMLElement> {
  h = mount(<LessonVisual id={id} />);
  const host = h.host;
  host.style.width = `${FIGURE_CONTENT_CAP}px`;
  await waitFor(() => host.querySelector(".lesson-interactive") !== null, `${id} mounts`);
  return host.querySelector(".lesson-interactive") as HTMLElement;
}

/**
 * The OPTIONS on a board: chips the learner can press.
 *
 * `button` is load-bearing rather than tidy. Across ten domains the chip class is also worn by
 * READOUT slots — `geo-angle-explore`'s angle slots, `trg-unitcircle-explore`'s heading list,
 * the reach readout on `trg-tangent-explore` — which are `<span>`s that fill in as the learner
 * works and go `--civic` when they do. Those are answers being reported, which is what the
 * correctness channel is FOR, and reading them as unpicked options would have this file
 * failing four boards for doing the right thing.
 */
function chips(widget: HTMLElement): HTMLButtonElement[] {
  return all<HTMLButtonElement>(widget, "button.lesson-interactive__chip");
}

/**
 * Drive the board to the first moment its chips are on screen and unpicked.
 *
 * Only `rational-scale-dose-explore` needs driving: it asks for the two doses its denominators
 * forbid, one at a time, and offers the ruling chips only once both are in. The values are its
 * own, from `x - 2` and `x + 7`. Every other board is read exactly as it mounts, which is the
 * state the rule is about.
 */
async function reachChips(id: LessonVisualId, widget: HTMLElement): Promise<void> {
  if (id !== "rational-scale-dose-explore") {
    return;
  }
  for (const dose of ["2", "-7"]) {
    await waitFor(
      () => widget.querySelector(".lesson-interactive__input") !== null,
      `${id}: no entry box for ${dose}`,
    );
    const input = widget.querySelector(".lesson-interactive__input") as HTMLInputElement;
    setInputValue(input, dose);
    findButton(widget, "Check").click();
  }
  await waitFor(
    () => chips(widget).length > 0,
    `${id}: both doses are in and the ruling chips never appeared`,
  );
}

test.each(CHIP_VISUALS)(
  "%s: an option the learner has not picked is not painted right or wrong",
  async (id) => {
    const widget = await board(id);
    await reachChips(id, widget);

    const offered = chips(widget);
    // The population's last filter, and it can only be applied here: a board with fewer than
    // two live options is not offering the learner a choice, so there is no unearned
    // recommendation for it to make. Recorded rather than returned from silently — the census
    // at the foot of the file is what stops this branch becoming the quiet exit that a
    // written-down list was.
    const live = offered.filter((chip) => !chip.disabled);
    if (live.length < 2) {
      noOpenChoice.push(id);
      return;
    }
    swept.push(id);

    // "An option was already spent before any pick", which used to be read off `disabled`.
    // Across ten domains that reading is wrong: `trg-tangent-explore` disables "Back to
    // upright" because the beam IS upright, and `domain-intake-explore` holds its naming chips
    // shut until every row has been traced. Both are controls that are not offered YET, and
    // neither is an option the board has answered on the learner's behalf. What that is, is a
    // live option arriving already marked, so that is what is asserted — and it is asserted in
    // the channels a screen reader hears, beside the colour claim below.
    for (const chip of live) {
      const state = chip.getAttribute("data-state");
      expect(
        state === "solved" || state === "wrong",
        `${id}: "${(chip.textContent ?? "").trim()}" is already marked ${state} before any pick`,
      ).toBe(false);
    }
    const pressed = live.filter((chip) => chip.getAttribute("aria-pressed") === "true");
    if (pressed.length > 0) {
      prePressed.push(id);
    }
    if (!PRE_PRESSED_CURSOR.includes(id)) {
      expect(
        pressed.map((chip) => (chip.textContent ?? "").trim()),
        `${id}: an option is already chosen before any pick, and this board is not one of ` +
          `the declared cursor rows in PRE_PRESSED_CURSOR`,
      ).toEqual([]);
    }

    const civic = token("--civic");
    const brick = token("--brick");
    for (const chip of live) {
      const label = (chip.textContent ?? "").trim();
      const style = getComputedStyle(chip);
      expect(
        style.color,
        `${id}: "${label}" is green before the learner picked it, so the board recommends it`,
      ).not.toBe(civic);
      expect(
        style.color,
        `${id}: "${label}" is red before the learner picked it, so the board warns them off it`,
      ).not.toBe(brick);
      expect(
        style.borderTopColor,
        `${id}: "${label}" is bordered green before the learner picked it`,
      ).not.toBe(civic);
      expect(
        style.borderTopColor,
        `${id}: "${label}" is bordered red before the learner picked it`,
      ).not.toBe(brick);
    }

    // Same token on both, which is the positive form of the rule: neutral is not merely
    // "not the correctness colours", it is the two options being indistinguishable by hue.
    const [first, second] = live as [HTMLButtonElement, HTMLButtonElement];
    expect(
      getComputedStyle(first).color,
      `${id}: the two calls are different colours, so hue is a tell`,
    ).toBe(getComputedStyle(second).color);
  },
);

test("the sweep covers every board that offers the learner a set of named chips", () => {
  // THE FLOOR under the derivation. `visualsMatching` reads a glob and then a registry
  // lookup, and either can resolve to nothing; over an empty candidate set every case above
  // would simply not run and the file would report green having mounted nothing.
  expect(
    CHIP_VISUALS.length,
    "the source sweep found no chip-rendering visuals at all, so the derivation has broken",
  ).toBeGreaterThanOrEqual(60);
  expect(new Set(CHIP_VISUALS).size, "a visual id is in the population twice").toBe(
    CHIP_VISUALS.length,
  );

  // Every candidate was accounted for as one or the other, so nothing sat outside both and
  // was swept by neither.
  expect(swept.length + noOpenChoice.length).toBe(CHIP_VISUALS.length);

  // COMPOSITION, and it is the specific failure this file had: seven ids from one domain,
  // with the docblock above explaining why one domain is not the criterion. A floor cannot
  // see that — seven of D5 plus fifty-three of D5 clears any count — so the reach is asserted
  // separately. Ten domains place chip boards today.
  const reached = new Set(swept.map((id) => DOMAIN_OF.get(id) ?? "unplaced"));
  expect(
    reached.size,
    "the sweep no longer reaches most of the domains that place a chip board",
  ).toBeGreaterThanOrEqual(6);

  // And it is not mostly skips: a population that drifts into `NO_OPEN_CHOICE_AT_MOUNT`
  // wholesale is this guard measuring nothing again, in a costume the floor above cannot see.
  expect(
    swept.length,
    "more boards were skipped for offering no open choice than were swept, so the rule is " +
      "being asserted about a minority of the population it derives",
  ).toBeGreaterThan(noOpenChoice.length);
});

test("every board excused for offering no open choice still offers none", () => {
  // BOTH DIRECTIONS, in one comparison. A listed board that starts offering live options at
  // mount lands in `swept` and drops out of the left side, so an excuse cannot outlive the
  // thing it excuses; an unlisted board that stops offering them lands in the left side by
  // name, so the quiet exit above cannot swallow a board that has gone dark.
  expect([...noOpenChoice].sort()).toEqual([...NO_OPEN_CHOICE_AT_MOUNT].sort());
});

test("every board excused for a pre-pressed cursor still arrives with one pressed", () => {
  // Same shape, over the other exemption. Forcing an entry false either way fails here: a
  // cursor row that stops seeding a selection leaves the right side, and any other board that
  // starts arriving pressed joins the left side — having already failed by name above.
  expect([...prePressed].sort()).toEqual([...PRE_PRESSED_CURSOR].sort());
});
