/**
 * THE CRISIS PANEL'S GEOMETRY, in real Chromium.
 *
 * ## The three objections this file is the referee for
 *
 * The panel was a `min(430px, 42vw)` right-hand rail, and the lead's first objection was that it
 * made the questions the least significant thing on screen, *"not very significant and hard to
 * read for a viewer"* — someone watching from across a room. So it became a centred sheet at two
 * thirds of the viewport, and three hours later, the same reviewer on the same panel: *"i dont get
 * to see the actual changes in the island because its completely blocked by the panel."* So it
 * became a band along the bottom with the camera lifting the frame over it, and the verdict on
 * that was *"now we're too zoomed out to see the actual island."* Then the ruling: *"maybe make it
 * a sidebar instead of at the bottom - i think that makes more sense."*
 *
 * A side panel is what answers all three, and `winter-in-city.css` carries the argument: the
 * island is a wide disc in a wide viewport, so width is the axis with slack in it and height is
 * not. What this file has to keep is that it is a side panel and NOT THE RAIL HE THREW OUT, which
 * is the one failure mode the new shape can wear.
 *
 * So the claims come in pairs, and BOTH halves have to hold or the layout has traded one loss for
 * another:
 *
 *  1. **The panel is the main event** — as wide as its own content, the full height of the
 *     screen, the question and the field above the fold, and the type stepped up. Never a rail:
 *     a floor on the width in pixels, and a floor on the CONTENT, which is what a rail actually
 *     failed. It was half the width, and `crisisPanelFitsItsContent.browser.test.tsx` is the
 *     file that ended that: it re-measures what the declare step needs and ceilings the panel
 *     just above it, which is the assertion nothing in here could make.
 *  2. **The island is beside it, in every phase** — a real share of the width uncovered, and
 *     nothing of the panel over the middle of that strip, which is the point the camera aims at.
 *  3. **One box for every phase**, which is the side shape's dividend: declaring, answering and
 *     resolved measure the same, so there is no re-layout on a phase change and no second
 *     geometry for a later phase to be forgotten by.
 *  4. **Aiming leaves the island clickable** — the stricter form of 2, and the one that matters:
 *     a cell under the panel is a cell the player cannot click.
 *  5. **Nothing is drawn outside the panel**, at four laptop viewports and phone width.
 *  6. **460px has its own answer** and it is not a 230px column.
 *  7. **Focus order survives**, asserted as a walk rather than assumed from "the DOM did not
 *     move".
 *
 * Every claim is geometry read off a laid-out page, because that is what the request was about.
 * jsdom has no layout at all, so this file is the only place any of it is measurable.
 *
 * The COMPOSITION — whether the island is really drawn in that strip, and whether it is big enough
 * to read — is `winterIslandVisible.browser.test.tsx`, which mounts the city's own canvas
 * underneath. This file mounts the panel on a blank page, which is exactly how its box could once
 * be measured at five viewports and declared fixed while the screen still looked wrong.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";
import {
  findButton,
  type Harness,
  mount,
  setInputValue,
  waitFor,
} from "../../lessons/testHarness";
import {
  WINTER_NODE_ORDER,
  winterBatchFor,
  winterFrozenItem,
} from "../../winter/hardWinterItems";
import type { PlacedTransform } from "../worldLayout";
import { type WinterCityBoard, WinterInCity } from "./WinterInCity";

import "../../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

let h: Harness | null = null;
let published: WinterCityBoard | null = null;
let restore: { width: number; height: number } | null = null;

/** The game's own camera, and the width the earlier brief measured this surface at. */
const GAME = { width: 920, height: 800 };

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
  published = null;
});

function placed(nodeId: string, col: number, row: number): PlacedTransform {
  return { nodeId, col, row, rot: 0 };
}

/** Era one's six skills on the island, so a batch is always servable. */
const CITY: readonly PlacedTransform[] = [
  placed("NUM.S", -2, -2),
  placed("NUM.F", 0, 3),
  placed("NUM.2", 3, -1),
  placed("NUM.3", -3, 1),
  placed("NUM.4", 1, 1),
  placed("NUM.5", 4, 0),
];

function query<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`nothing matched ${selector}`);
  }
  return found;
}

/**
 * Only the elements this surface actually renders.
 *
 * `winter-in-city.css` hides five things the grid route shows — the 2D map key, the prototype
 * grading note, the layout line, the `?winter` return link and the dev panel — and a
 * `display: none` element reports a zero rect at the document origin and cannot take focus. A
 * sweep that included them would fail on the hidden ones and say nothing about the visible
 * ones, which is what the first run of this file did.
 */
function rendered<T extends HTMLElement>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector)).filter(
    (element) => element.offsetParent !== null || element.getClientRects().length > 0,
  );
}

async function openCrisis(): Promise<HTMLElement> {
  h = mount(
    <WinterInCity
      placements={CITY}
      townHall={null}
      canvasLive
      practisedNodeIds={WINTER_NODE_ORDER}
      onBoard={(board) => {
        published = board;
      }}
      onExit={() => {}}
    />,
  );
  await waitFor(
    () => document.querySelector(".winter-in-city .hw-shell") !== null,
    "the crisis panel renders",
  );
  await document.fonts.ready;
  return query<HTMLElement>(".winter-in-city .hw-shell");
}

/** The panel, re-read: the phase rules change its box, so a cached rect goes stale. */
function panel(): HTMLElement {
  return query<HTMLElement>(".winter-in-city .hw-shell");
}

/** The island the panel is sitting over: the whole mount is fixed to the viewport. */
function viewport(): { width: number; height: number } {
  return { width: window.innerWidth, height: window.innerHeight };
}

/**
 * Whole and unscrolled inside the panel's visible box.
 *
 * "Its top is on screen" is not the claim: a control whose label is cut off is not one a
 * player can use, and the panel legitimately scrolls, so the assertion has to be about the
 * VISIBLE box rather than about the scroll extent.
 */
function insideTheFold(element: Element): boolean {
  const box = element.getBoundingClientRect();
  const shell = panel().getBoundingClientRect();
  return box.top >= shell.top - 1 && box.bottom <= shell.bottom + 1;
}

/**
 * Arm a fire and pick a cell THE WAY THE CANVAS DOES, through the board the winter publishes.
 *
 * There is no 2D grid to click in-city: the board is the city's own canvas, and `onAimCell` is
 * the seam it reports a pick through. Driving that seam rather than a test-only shortcut is
 * what makes the picked state here the same state a player reaches.
 */
async function aimAndPick(col: number, row: number): Promise<void> {
  findButton(panel(), /Light a fire/).click();
  await waitFor(
    () => panel().dataset.aiming === "true",
    "the panel enters the aiming state",
  );
  await waitFor(() => published?.onAimCell != null, "the board takes a cell pick");
  published?.onAimCell?.(col, row);
  await waitFor(() => panel().dataset.aiming === "false", "a cell is picked");
}

/**
 * Declare a shield, aimed through the island's own `onPickBuilding` seam.
 *
 * **THIS WAS A PULL-BACK UNTIL 2026-08-02**, which needed no target and so was one click. The lead
 * ruled that action out, and the shortest declaration left needs a building — picked the way a
 * player picks one in the city, because there is no 2D grid on this mount.
 */
async function declareAShield(nodeId: string): Promise<void> {
  findButton(panel(), /Reinforce a building/).click();
  await waitFor(() => published !== null, "the island was never handed a board");
  published?.onPickBuilding(nodeId);
}

/** Declare a shield and commit into the answering phase. */
async function reachAnswering(): Promise<void> {
  await declareAShield("NUM.S");
  await waitFor(() => !findButton(panel(), /Commit and face/).disabled, "commit arms");
  findButton(panel(), /Commit and face/).click();
  await waitFor(() => panel().dataset.phase === "answering", "the batch opens");
  await document.fonts.ready;
}

/** Answer the round's whole batch, so the round resolves. */
async function reachResolved(round: number): Promise<void> {
  const batch = winterBatchFor({
    masteredNodeIds: WINTER_NODE_ORDER,
    encounter: 1,
    round,
  });
  if (batch.status !== "ready") {
    throw new Error(`no batch for round ${round}`);
  }
  const keys = batch.prompts.map((prompt) => {
    const key = winterFrozenItem(prompt.item_version_id)?.answer.answer_key;
    if (typeof key !== "string") {
      throw new Error(`no text answer key for ${prompt.item_version_id}`);
    }
    return key;
  });

  for (const [index, key] of keys.entries()) {
    setInputValue(query<HTMLInputElement>(".winter-in-city .hw-panel input"), key);
    await waitFor(
      () => !findButton(panel(), /^Check$/).disabled,
      `Check arms on question ${index + 1}`,
    );
    findButton(panel(), /^Check$/).click();
    await waitFor(
      () => document.querySelector(".winter-in-city .hw-verdict") !== null,
      `a verdict lands on question ${index + 1}`,
    );
    findButton(panel(), /See what you earned|Next question/).click();
    await waitFor(
      () =>
        index + 1 >= keys.length
          ? panel().dataset.phase === "resolved"
          : document.querySelector(".winter-in-city .hw-verdict") === null,
      `the batch moves on from question ${index + 1}`,
    );
  }
}

/* ---------------------------------------------- 1, 2, 3, 4. the side panel */

/*
 * THE TWO TESTS THAT USED TO OPEN THIS FILE ARE GONE, and they are gone because there is no
 * centred sheet left for them to measure. They asked whether the ANSWERING sheet took two thirds
 * of the width with island on all four sides of it and a floor under its share of the height,
 * and both facts have been replaced rather than dropped: `keeps one box through declaring,
 * answering and resolving` below proves the answering phase is the same box as the declaring one,
 * and the box's floors are asserted where that box is measured.
 *
 * #332's own reasoning about that height floor is worth carrying across, because it applies to
 * the side panel too: the panel is `height: fit-content` under a ceiling, so an AREA floor is a
 * floor on how much the panel has to say, and it failed once already on a panel that had got
 * better at the thing it was asserting. Nothing below floors an area.
 */

/**
 * **THE CLAIM ALL THREE OBJECTIONS COME DOWN TO, at every laptop viewport he reviews on.**
 *
 * Four separate things, and each would have let the layout fail while the other three passed:
 * the panel is genuinely a side panel and not the rail he threw out, the island beside it is a
 * real share of the screen rather than a strip, the middle of that strip — the point the camera
 * aims the island at — is not under the panel, and the panel's own controls are usable without
 * scrolling, because a panel whose button has to be hunted for is worse than the sheet it
 * replaced.
 *
 * 1024x580 is the lead's own window, measured off his screenshot; 1440x720 is where the `620px`
 * cap binds instead of the `50vw` share, so both branches of the width are under test.
 */
const LAPTOPS = [
  { width: 920, height: 800 },
  { width: 1024, height: 580 },
  { width: 1440, height: 720 },
] as const;

/** What `--hw-side` plus its gutter comes to, which is the CSS restated for the assertions. */
function declaredReach(view: { readonly width: number }): number {
  return Math.min(view.width * 0.5, 470) + 14;
}

/**
 * How many visual lines each action card spends on its description.
 *
 * `Range` over the text node, so this counts LINE BOXES rather than inferring them from a
 * height. Used below as the floor that replaced a share floor: see that comment for why.
 */
function descriptionLines(): number[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(".winter-in-city .hw-action small"),
  ).map((small) => {
    const text = small.childNodes[0];
    if (!text) {
      throw new Error("an action card has no description to measure");
    }
    const range = document.createRange();
    range.selectNodeContents(text);
    return range.getClientRects().length;
  });
}

for (const view of LAPTOPS) {
  test(`declaring is a left side panel with the island beside it at ${view.width}x${view.height}`, async () => {
    await page.viewport(view.width, view.height);
    await openCrisis();
    expect(panel().dataset.phase, "the crisis does not open on the declare phase").toBe(
      "declaring",
    );

    const box = panel().getBoundingClientRect();

    // A SIDE PANEL: against the left edge, and reaching the width the stylesheet declares.
    expect(box.left, "the panel is not against the left edge").toBeLessThan(20);
    expect(box.right).toBeCloseTo(declaredReach(view), 0);

    /*
     * AND NOT THE RAIL HE THREW OUT, which is the one failure mode this shape can wear.
     *
     * TWO FLOORS, AND THE SECOND ONE CHANGED ITS UNITS WHEN THE PANEL WAS SIZED TO ITS CONTENT.
     *
     * It used to be a pixel floor and a SHARE floor, on the argument that `min(430px, 42vw)` was
     * 386px at 920, 430px at 1024 and 430px — thirty percent — at 1440, so the pixel floor
     * separated the two at the narrow end and the share floor at the wide end. That argument
     * depended on both widths being shares of the viewport, and this one is not: `min(470px,
     * 50vw)` is 460px, 470px and 470px at those three, which is 50%, 46% and 33%. A panel sized
     * to its content SHRINKS as a share of a big screen, on purpose, so a share floor here would
     * now be a floor on the wrong quantity — and lowering it to 0.32 to let 1440 through would
     * leave it unable to fail against the rail's own 0.30.
     *
     * So the share floor is replaced rather than loosened, by the thing it was standing in for.
     * What was actually wrong with the rail is that the panel's own content did not fit in it:
     * at 430px the declare step's middle card takes a second line and its last card goes behind
     * the pinned commit control. That is measured here directly, and it fails at all three of
     * these viewports for a rail while passing for this panel.
     * `crisisPanelFitsItsContent.browser.test.tsx` owns the full form, including the CEILING that
     * says the panel is not much wider than that either — which is the half no floor can hold.
     *
     * THIS ONE MEASURES THIS MACHINE'S FONT, deliberately, and that is a division of labour
     * rather than an oversight: the shape below is what the shipped page renders here, and the
     * WORST-CASE font is the other file's job — it re-measures in the widest family the stack
     * can land on, which is how this assertion came to be red on CI and green locally once.
     * 920x800 is where that bit: the `50vw` clamp gives 460px there whatever the cap says, so
     * of these three viewports it is the one with the least room and the first to lose a line.
     */
    expect(box.width, "the panel is back to a rail's width").toBeGreaterThan(450);
    // TWO CARDS since the give-up-ground action was ruled out on 2026-08-02, so the census is two
    // line counts rather than three. The pull-back's card took two lines and is gone with the third
    // entry; the two that remain read exactly as they did.
    expect(
      descriptionLines(),
      "the panel is too narrow for the declare step's own action cards",
    ).toEqual([2, 1]);
    // AND A CEILING, because the lead asked for the city to stay present. Never full-bleed.
    expect(box.width / view.width, "the panel has taken the whole width").toBeLessThan(0.6);

    // THE ISLAND GETS A REAL SHARE OF THE SCREEN, not a strip. Measured it is 48% at 920, 53% at
    // 1024 and 66% at 1440, where the content cap binds instead of the share.
    const strip = view.width - box.right;
    expect(
      strip / view.width,
      `only ${Math.round((strip / view.width) * 100)}% of the screen is island`,
    ).toBeGreaterThan(0.4);

    /*
     * AND THE MIDDLE OF THAT STRIP IS UNCOVERED, which is the point `winterFraming.ts` slides
     * the island's centre to and therefore the exact place a rail would have failed. Read at the
     * middle of the height as well, because a side panel that is short would leave the strip's
     * middle free and still cover the island: this is the point, not the row.
     */
    const middle = document.elementFromPoint(
      box.right + strip / 2,
      Math.round(view.height / 2),
    );
    expect(panel().contains(middle), "the panel covers the middle of the island").toBe(
      false,
    );

    // ITS OWN CONTROLS ARE REACHABLE, unscrolled, in both declaring states: before a cell is
    // armed, and after one is picked — which is when `FirePreviewLadder`, the tallest read-out
    // the panel carries, is on screen. The second was measured failing at all four viewports
    // before the commit row was pinned.
    expect(panel().scrollTop, "the panel is already scrolled").toBe(0);
    expect(
      insideTheFold(findButton(panel(), /Commit and face/)),
      "the commit control is below the panel's fold before anything is armed",
    ).toBe(true);

    await aimAndPick(-1, 0);
    expect(
      document.querySelector(".winter-in-city .hw-preview"),
      "no preview is showing, so the tall-read-out case is untested",
    ).not.toBeNull();
    expect(
      insideTheFold(findButton(panel(), /Commit and face/)),
      "the commit control is below the panel's fold with a preview open",
    ).toBe(true);
  });

  test(`aiming leaves the island clickable at ${view.width}x${view.height}`, async () => {
    await page.viewport(view.width, view.height);
    await openCrisis();
    findButton(panel(), /Light a fire/).click();
    await waitFor(() => panel().dataset.aiming === "true", "the panel enters aiming");
    const box = panel().getBoundingClientRect();
    const strip = view.width - box.right;

    /*
     * THE ISLAND'S HEART IS NOT UNDER THE PANEL, hit-tested at nine points across the strip
     * rather than at one. A cell under the panel is a cell the player cannot click, and the
     * island's clickable ground is the whole strip and not a line down its middle — the band
     * version could only make this claim about one row, because it was over the island's own
     * lower half by construction.
     */
    let probed = 0;
    for (const ax of [0.15, 0.5, 0.85] as const) {
      for (const ay of [0.2, 0.5, 0.8] as const) {
        const at = document.elementFromPoint(
          Math.round(box.right + strip * ax),
          Math.round(view.height * ay),
        );
        expect(
          panel().contains(at),
          `the panel is under the pointer ${Math.round(ax * 100)}% across and ${Math.round(ay * 100)}% down the island`,
        ).toBe(false);
        probed += 1;
      }
    }
    expect(probed, "the hit-test grid was empty").toBe(9);

    // It is still on screen and still usable: the sentence that tells the player what to do
    // has to be VISIBLE inside the panel, not merely present in it. Measured, because with
    // everything the declaring panel carried that sentence once sat about 400px down a 304px
    // band — present in `textContent`, scrolled out of sight.
    expect(box.bottom).toBeLessThanOrEqual(view.height + 1);
    expect(panel().scrollTop, "the panel is already scrolled").toBe(0);
    const prompt = query<HTMLElement>(".winter-in-city .hw-prompt-line");
    expect(prompt.textContent).toContain("Now choose a cell on the island");
    expect(insideTheFold(prompt), "the instruction is scrolled out of the panel").toBe(
      true,
    );
    // And the armed card is still reachable, so the choice can be changed without leaving.
    expect(insideTheFold(findButton(panel(), /Light a fire/))).toBe(true);
  });
}

/**
 * **ONE BOX FOR EVERY PHASE, which is what the side shape bought and the band could not.**
 *
 * The band had to become a centred sheet while answering and a taller band at the end, so the
 * camera's framing had to be derived for one phase and deliberately not re-derived for the
 * others — a camera that re-framed itself on every phase change would lurch four times a round.
 * A side panel holds the answering phase without growing, so this asserts the stronger property
 * the band version could not: declaring, answering and resolved measure THE SAME BOX.
 *
 * A no-change assertion needs a premise, or it is satisfied by a panel that never renders
 * anything: the phase really does change, and the question really is on screen in the middle one.
 */
test("keeps one box through declaring, answering and resolving", async () => {
  await page.viewport(GAME.width, GAME.height);
  await openCrisis();
  const declaring = panel().getBoundingClientRect();
  expect(panel().dataset.phase).toBe("declaring");

  await reachAnswering();
  const answering = panel().getBoundingClientRect();
  expect(panel().dataset.phase, "the phase never changed").toBe("answering");
  expect(
    document.querySelector(".winter-in-city .hw-question"),
    "no question on screen, so there is no answering phase to measure",
  ).not.toBeNull();
  expect(Math.round(answering.left)).toBe(Math.round(declaring.left));
  expect(Math.round(answering.width)).toBe(Math.round(declaring.width));
  expect(Math.round(answering.top)).toBe(Math.round(declaring.top));

  await reachResolved(1);
  const resolved = panel().getBoundingClientRect();
  expect(panel().dataset.phase).toBe("resolved");

  /*
   * EQUALITY IS ON THE THREE THINGS THE LAYOUT FIXES, AND NOT ON THE HEIGHT.
   *
   * #332 removed a `resolved.height === declaring.height` assertion for a good reason worth
   * keeping: the panel is `height: fit-content` under a ceiling, the resolving phase carries less
   * than the declaring one, and equality was measuring the cap rather than the shape. So what is
   * asserted here is the anchor and the width — which the stylesheet really does fix, in every
   * phase — and the height is left to the content.
   */
  expect(Math.round(resolved.left)).toBe(Math.round(declaring.left));
  expect(Math.round(resolved.width)).toBe(Math.round(declaring.width));
  expect(Math.round(resolved.top)).toBe(Math.round(declaring.top));
  expect(
    insideTheFold(findButton(panel(), /Let the frost advance/)),
    "the control that closes the round is below the panel's fold",
  ).toBe(true);
});

/* --------------------------------------- 5. nothing is drawn outside it, at either width */

for (const view of [
  { width: 920, height: 800 },
  { width: 1024, height: 580 },
  { width: 1440, height: 720 },
  { width: 460, height: 800 },
  { width: 460, height: 720 },
] as const) {
  for (const phase of ["declaring", "answering"] as const) {
    test(`the ${phase} panel clips its own content at ${view.width}x${view.height}`, async () => {
      await page.viewport(view.width, view.height);
      const shell = await openCrisis();
      if (phase === "answering") {
        await reachAnswering();
      }
      expect(panel().dataset.phase).toBe(phase);
      const box = panel().getBoundingClientRect();

      // THE PAIR THAT MAKES THE OVERFLOW DEFECT IMPOSSIBLE: a height cap and a scroller. A cap
      // with `visible` is the shape that drew content outside the ceremony's card.
      const style = getComputedStyle(shell);
      expect(style.overflowY, "the panel does not clip, so a cap can spill").not.toBe(
        "visible",
      );
      expect(shell.scrollHeight).toBeGreaterThan(0);

      // On screen, on every edge.
      expect(box.top, "the panel starts above the viewport").toBeGreaterThanOrEqual(-1);
      expect(
        box.bottom,
        "the panel runs past the bottom of the viewport",
      ).toBeLessThanOrEqual(view.height + 1);
      expect(box.left).toBeGreaterThanOrEqual(-1);
      expect(box.right).toBeLessThanOrEqual(view.width + 1);

      /*
       * And every block inside it is inside it, which is the assertion the ceremony's card would
       * have failed. Read against the horizontal extent, because a scrolled panel legitimately has
       * content below the fold.
       *
       * THE POPULATION IS WIDENED RATHER THAN THE FLOOR LOWERED, which matters: the settlement
       * read-out used to be a `.hw-panel` and is now `.hw-strip`, a status line on one row beside
       * the island's key. Dropping the floor to 1 would have let this sweep go on passing over a
       * shell with one block in it, which is the emptiness the floor exists to rule out. Widened,
       * the count is 2 again and the strip is measured for containment like everything else.
       */
      const panels = rendered<HTMLElement>(shell, ".hw-panel, .hw-strip");
      // A floor, because the filter above could empty the population and an empty sweep passes.
      expect(panels.length, "no rendered blocks to measure").toBeGreaterThanOrEqual(2);
      for (const inner of panels) {
        const innerBox = inner.getBoundingClientRect();
        expect(
          innerBox.left,
          `a panel starts left of the crisis panel at ${view.width}x${view.height}`,
        ).toBeGreaterThanOrEqual(box.left - 1);
        expect(
          innerBox.right,
          `a panel runs past the crisis panel at ${view.width}x${view.height}`,
        ).toBeLessThanOrEqual(box.right + 1);
      }

      // The page itself never scrolls sideways.
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(view.width + 1);

      /*
       * AND THE EXIT'S GUTTER SURVIVES THIS WIDTH AND THIS PHASE. The panel runs the full height
       * of the screen now, so the exit control cannot sit above it: `winter-in-city.css` puts it
       * in the ocean BESIDE the panel, at `calc(var(--hw-side) + var(--hw-gutter) * 2)`, and
       * that expression is the reason both boxes are derived from one declaration. At phone
       * width the panel is a bottom sheet again and the chip goes back to the left margin.
       *
       * Asserted as "the two boxes do not intersect", which is the claim; the hit-test in the
       * focus test is the same claim at one size.
       */
      const exitBox = query<HTMLElement>(".winter-in-city__exit").getBoundingClientRect();
      const overlaps =
        exitBox.right > box.left &&
        exitBox.left < box.right &&
        exitBox.bottom > box.top &&
        exitBox.top < box.bottom;
      expect(
        overlaps,
        `the exit control and the ${phase} panel overlap at ${view.width}x${view.height}`,
      ).toBe(false);
    });
  }
}

/* ------------------------------------------------------- 6. phone width has its own answer */

/**
 * 460px IS NOT A SIDE PANEL, and that is a ruling rather than an omission.
 *
 * Half of 460 is 230px, which is narrower than the rail the lead threw out, and there is no ocean
 * margin to spend at that width because the island already fills it — `winterFraming` refuses to
 * re-frame the camera there for the same reason. So this width keeps the full-width bottom sheet
 * it already had in every phase, and what it must not do is regress to a 230px column.
 */
test("at 460px every phase is a full-width bottom sheet, not a 230px column", async () => {
  await page.viewport(460, 800);
  await openCrisis();
  const view = viewport();

  let measured = 0;
  for (const phase of ["declaring", "answering"] as const) {
    if (phase === "answering") {
      await reachAnswering();
    }
    expect(panel().dataset.phase).toBe(phase);
    const box = panel().getBoundingClientRect();

    // Full width, because half of 460 is 230px — narrower than the rail this replaced, which
    // would make the change a regression at phone size.
    expect(
      box.width,
      `the ${phase} panel is narrower than the viewport at 460px`,
    ).toBeGreaterThan(view.width - 2);
    expect(box.width).toBeGreaterThan(430);

    // Bottom-anchored, with island above it: the city is still present, which is the
    // constraint that survives the breakpoint even though the shape does not.
    expect(box.bottom).toBeGreaterThan(view.height - 2);
    expect(box.top, `no island left above the ${phase} panel at 460px`).toBeGreaterThan(60);
    expect(box.height / view.height).toBeLessThan(0.82);
    measured += 1;
  }
  expect(measured).toBe(2);

  // And the commit control is reachable here too, which it was NOT before the commit row was
  // pinned: measured at 336px below the fold on this viewport.
  h?.cleanup();
  h = null;
  await openCrisis();
  expect(insideTheFold(findButton(panel(), /Commit and face/))).toBe(true);
});

/* --------------------------------------------------------- 7. the keyboard still gets there */

test("focus order runs header to controls in every phase, and every control is reachable", async () => {
  await page.viewport(GAME.width, GAME.height);
  const shell = await openCrisis();

  // Tab order is DOM order for anything not given a tabindex, so the claim to test is that
  // nothing in here has been taken out of the order or reordered by the layout. Every phase is
  // the SAME ELEMENT in the same box with no DOM move, so the walk has to read the same in all
  // of them.
  const walk = () =>
    rendered<HTMLElement>(
      shell,
      'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

  // The three armable action cards. The commit button is disabled until something is declared,
  // so it is correctly out of the order; naming the set rather than counting it is what says
  // so. Each card's own label is its first child node: the `<small>` under it carries the cost
  // line and runs straight on in `textContent`.
  const declaring = walk();
  // TWO ACTION CARDS since the give-up-ground action was ruled out on 2026-08-02.
  expect(declaring.map((element) => element.childNodes[0]?.textContent?.trim())).toEqual([
    "Light a fire",
    "Reinforce a building",
  ]);
  for (const element of declaring) {
    expect(
      element.tabIndex,
      "a control was taken out of the tab order",
    ).toBeGreaterThanOrEqual(0);
    element.focus();
    expect(document.activeElement, "a control in the panel cannot take focus").toBe(
      element,
    );
  }

  // The exit control is outside the panel and must still be reachable, because it is the way
  // out of the crisis.
  const exit = query<HTMLElement>(".winter-in-city__exit");
  exit.focus();
  expect(document.activeElement).toBe(exit);

  /*
   * AND IT MUST NOT BE COVERED, which is a defect a layout change has already introduced once:
   * the centred sheet's left edge landed at 14vw, and at 920px that was 129px against a control
   * needing about 146px. The side panel reaches the full height of the screen, so the chip cannot
   * clear it by sitting above it and is placed beside it instead — which makes this a live risk
   * rather than a historical one. Hit-tested at four points inside the button rather than inferred
   * from a z-index, because the stacking order of two absolutely-positioned siblings is exactly
   * the kind of thing a later rule changes by accident.
   */
  await reachAnswering();
  const exitBox = exit.getBoundingClientRect();
  for (const [dx, dy] of [
    [0.1, 0.5],
    [0.5, 0.5],
    [0.9, 0.5],
    [0.9, 0.85],
  ] as const) {
    const at = document.elementFromPoint(
      exitBox.left + exitBox.width * dx,
      exitBox.top + exitBox.height * dy,
    );
    expect(
      exit === at || exit.contains(at),
      `the panel covers the exit control at ${Math.round(dx * 100)}% across`,
    ).toBe(true);
  }

  // A focused control inside a scrolling panel has to be scrolled to rather than clipped away.
  const answering = walk();
  expect(answering.length, "nothing focusable in the answering phase").toBeGreaterThan(0);
  const last = answering[answering.length - 1] as HTMLElement;
  last.focus();
  expect(insideTheFold(last), "focus landed on a control scrolled out of the panel").toBe(
    true,
  );
});

/* ---------------------------------------------------------------- 8. the pictures for review */

test("photographs the declare phase, which is the one the lead could not see", async () => {
  for (const shot of [
    { width: 920, height: 800, name: "declare-920x800" },
    { width: 1024, height: 580, name: "declare-1024x580" },
    { width: 1440, height: 720, name: "declare-1440x720" },
    { width: 460, height: 800, name: "declare-460x800" },
  ] as const) {
    await page.viewport(shot.width, shot.height);
    await openCrisis();
    expect(panel().dataset.phase).toBe("declaring");
    if (CAPTURE_EVIDENCE) {
      expect(
        await page.screenshot({ path: `__screenshots__/crisis/${shot.name}.png` }),
        `no screenshot for ${shot.name}`,
      ).toBeTruthy();
    }
    h?.cleanup();
    h = null;
  }

  // And the aiming state, which is the moment the island's heart has to be visible.
  await page.viewport(920, 800);
  await openCrisis();
  findButton(panel(), /Light a fire/).click();
  await waitFor(() => panel().dataset.aiming === "true", "the panel enters aiming");
  if (CAPTURE_EVIDENCE) {
    expect(
      await page.screenshot({ path: "__screenshots__/crisis/declare-aiming-920x800.png" }),
    ).toBeTruthy();
  }
});

/**
 * THE QUESTION, which is what the FIRST request was about: "the problems and all the scenario
 * information". A panel that is half the screen and still opens on a legend would have missed the
 * point, so this photographs the answering state and asserts the prompt is above the fold rather
 * than reachable by scrolling. Photographed at the lead's own 1024x580 as well, because a side
 * panel's height budget is the one thing a short viewport does squeeze.
 */
test("the question is above the fold, and photographed at three laptop sizes", async () => {
  for (const shot of [
    { width: 920, height: 800, name: "sheet-question-920x800" },
    { width: 1024, height: 580, name: "sheet-question-1024x580" },
    { width: 1440, height: 720, name: "sheet-question-1440x720" },
  ] as const) {
    await page.viewport(shot.width, shot.height);
    const shell = await openCrisis();
    await reachAnswering();
    await waitFor(
      () => document.querySelector(".winter-in-city .hw-question") !== null,
      "the question renders",
    );

    const question = query<HTMLElement>(".winter-in-city .hw-question");
    const questionBox = question.getBoundingClientRect();

    /*
     * ABOVE THE FOLD, WHOLE. Not "its top is on screen": a prompt whose last line is cut off
     * is not readable, and at this width a one-line prompt is only 34px tall, so a
     * how-much-is-visible measurement would have been measuring the element's own height and
     * passing whatever the layout did. The claim is that the prompt and the field the answer
     * goes in both sit entirely inside the panel's visible box with nothing scrolled.
     */
    expect(shell.scrollTop, "the panel is already scrolled").toBe(0);
    expect(
      insideTheFold(question),
      `the question is cut off at ${shot.width}x${shot.height}`,
    ).toBe(true);
    expect(
      insideTheFold(query<HTMLElement>(".winter-in-city .hw-panel input")),
      `the answer field is cut off at ${shot.width}x${shot.height}`,
    ).toBe(true);

    /*
     * AND IT IS SET TO BE READ FROM A DISTANCE. "Bigger panel" is not the request; "hard to
     * read for a viewer" is, and a wider box with the same 17px prompt in it would satisfy
     * every geometry assertion above while changing nothing a person across a room can see.
     *
     * Read off the PARAGRAPH the prompt renders into, not the wrapper around it: `.hw-panel p`
     * sets that paragraph to 14px, so a wrapper-only rule left the text exactly as it was and
     * an assertion against the wrapper passed while the screenshot showed 14px type.
     */
    const promptSize = Number.parseFloat(
      getComputedStyle(question.querySelector("p") ?? question).fontSize,
    );
    expect(promptSize, "the question is not set larger in-city").toBeGreaterThan(19);
    const fieldSize = Number.parseFloat(
      getComputedStyle(query<HTMLElement>(".winter-in-city .hw-panel input")).fontSize,
    );
    expect(fieldSize, "the answer field is not set larger in-city").toBeGreaterThan(17);

    /*
     * AND THE PRE-AMBLE IS NOT AHEAD OF IT. This asserted the REORDER — the sandbox promise and
     * the island key were moved below the panels so the question could be above the fold — and
     * both have since moved again:
     *
     *  - the sandbox note is no longer rendered in-city at all. It is the block the lead
     *    photographed bleeding off the foot of his window, and it explains a persistence model to
     *    somebody mid-encounter; its one load-bearing fact now sits on the conclusion's own
     *    carry-back control, where the asking happens. `?winter` keeps it;
     *  - the island key moved UP, into the settlement strip under the masthead, because the lead
     *    asked for the two on one line.
     *
     * So the claim becomes the one that survives both moves and is what the reorder was for: the
     * question is the first thing in the panel, and nothing that is not the question is above it.
     * It matters more in a column half the screen's width, not less.
     */
    expect(
      rendered<HTMLElement>(shell, ".hw-note--sandbox"),
      "the sandbox note is drawn in-city again",
    ).toHaveLength(0);
    const abovePanels = rendered<HTMLElement>(
      shell,
      ".hw-panel, .hw-strip, .hw-header",
    ).filter(
      (element) =>
        // Not the panel the question is INSIDE, whose own top is legitimately above it.
        !element.contains(question) &&
        element.getBoundingClientRect().top < questionBox.top,
    );
    // A floor, so this cannot pass over a sheet that rendered nothing: the masthead and the strip
    // are both legitimately above the question and both must be there.
    expect(
      abovePanels.length,
      "nothing at all is above the question",
    ).toBeGreaterThanOrEqual(2);
    for (const element of abovePanels) {
      expect(
        element.classList.contains("hw-header") || element.classList.contains("hw-strip"),
        `${element.className} sits above the question in the answering sheet`,
      ).toBe(true);
    }

    if (CAPTURE_EVIDENCE) {
      expect(
        await page.screenshot({ path: `__screenshots__/crisis/${shot.name}.png` }),
        `no screenshot for ${shot.name}`,
      ).toBeTruthy();
    }
    h?.cleanup();
    h = null;
  }
});
