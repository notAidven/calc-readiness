/**
 * The Hard Winter's BOARD, in real Chromium with the real stylesheets.
 *
 * jsdom has no layout and no cascade, so `HardWinterSurface.test.tsx` can only assert that
 * a cell carries `hw-cell--frozen`. That is not the claim the design makes. The claim is
 * that a player can look at the island and see where the frost line is, which way it will
 * move, and which of their buildings is about to become a ruin — and a class name is not a
 * picture. So everything visual is measured here: computed backgrounds, computed borders,
 * real geometry.
 *
 * The stylesheets load in the order `main.tsx` uses them, with the shared `styles.css`
 * LAST, following `lessonVisualSurd.browser.test.tsx` — that file documents a collapsed
 * radical that this exact ordering decides. `hard-winter.css` arrives with the component
 * (it imports its own), which is the property the first test here pins: a component-scoped
 * stylesheet that silently failed to load would leave every other assertion measuring
 * browser defaults.
 */

import { HARD_WINTER } from "@cr/game";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";
import { DEV_SESSION_SCHEMA_VERSION, devSessionStore } from "../devPersistence/devSession";
import {
  findButton,
  type Harness,
  mount,
  setInputValue,
  waitFor,
} from "../lessons/testHarness";
import { HardWinterSurface } from "./HardWinterSurface";
import { WINTER_NODE_ORDER, winterBatchFor, winterFrozenItem } from "./hardWinterItems";

import "../styles.css";
import { wrongButReadable } from "../test/wrongButReadable";

/**
 * A learner who has practised every era-one skill, stated rather than assumed.
 *
 * The surface reads the learner's REAL practised set now, so a bare mount would draw from an
 * empty store and refuse the batch. These tests are about the mechanic and not about
 * progress, so each one says which learner it is playing as; the progress rule itself is
 * `crisisQuestionPool.test.ts`'s claim.
 */
const allPractised = (): readonly string[] => WINTER_NODE_ORDER;

let h: Harness | null = null;

/** A laptop. The headless default is phone-shaped, where the two-column board never binds. */
const DESKTOP = { width: 1440, height: 960 };
let restore: { width: number; height: number } | null = null;

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(DESKTOP.width, DESKTOP.height);
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

function query<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`nothing matched ${selector}`);
  }
  return found;
}

function boardCell(coords: string): HTMLElement {
  return query<HTMLElement>(`.hw-grid [data-cell="${coords}"]`);
}

function background(el: Element): string {
  return getComputedStyle(el).backgroundColor;
}

async function openBoard(): Promise<void> {
  h = mount(<HardWinterSurface readMasteredNodes={allPractised} />);
  await waitFor(() => document.querySelector(".hw-grid") !== null, "the island renders");
}

/**
 * Aim a fire at `coords` without committing it — which is the state the nested preview is
 * drawn in, and so a step several tests need on its own.
 */
async function aimFire(coords: string): Promise<void> {
  const shell = query<HTMLElement>(".hw-shell");
  findButton(shell, /Light a fire/).click();
  await waitFor(
    () => boardCell(coords).tagName === "BUTTON",
    `cell ${coords} becomes a target`,
  );
  boardCell(coords).click();
  await waitFor(
    () => !findButton(shell, /Commit and face/).disabled,
    "the commit button arms",
  );
}

/** Commit whatever is aimed, answer `correct` of three, and close the round. */
async function commitAndResolve(round: number, correct: number): Promise<void> {
  const shell = query<HTMLElement>(".hw-shell");
  findButton(shell, /Commit and face/).click();

  const batch = winterBatchFor({
    masteredNodeIds: WINTER_NODE_ORDER,
    encounter: 1,
    round,
  });
  if (batch.status !== "ready") {
    throw new Error(batch.message);
  }

  for (const [index, prompt] of batch.prompts.entries()) {
    const key = winterFrozenItem(prompt.item_version_id)?.answer.answer_key;
    if (typeof key !== "string") {
      throw new Error(`no text answer key for ${prompt.item_version_id}`);
    }
    await waitFor(
      () => document.querySelector<HTMLInputElement>(".hw-panel input") !== null,
      `question ${index + 1} renders its field`,
    );
    setInputValue(
      query<HTMLInputElement>(".hw-panel input"),
      index < correct ? key : wrongButReadable(key),
    );
    await waitFor(() => {
      try {
        return !findButton(shell, "Check").disabled;
      } catch {
        return false;
      }
    }, "Check arms");
    findButton(shell, "Check").click();
    await waitFor(
      () => document.querySelector(".hw-verdict") !== null,
      `question ${index + 1} is graded`,
    );
    findButton(
      shell,
      index + 1 >= batch.prompts.length ? /See what you earned/ : /Next question/,
    ).click();
  }

  // No commit press: the last answer resolves the round itself, so the round is over the
  // moment the final verdict is banked. The button that used to sit here is gone by the
  // lead's ruling — see `nextQuestion` in `HardWinterSurface.tsx`.
  await waitFor(
    () => document.querySelector(".hw-magnitude") !== null,
    "the resolution renders",
  );
  findButton(shell, /Let the frost advance/).click();
}

/** Play one round: declare a fire at `coords`, answer `correct` of three, close the round. */
async function playFire(round: number, coords: string, correct: number): Promise<void> {
  await aimFire(coords);
  await commitAndResolve(round, correct);
}

/**
 * Play one round as a SHIELD on the building at `coords`.
 *
 * Needed since `HARD_WINTER.damage.ruin_at: 2`: a scar is only reachable through a shield that
 * almost covers a bite, so a test about how a damaged building is DRAWN has to be able to buy
 * one. See *"a damaged building shows frost climbing it"* for the arithmetic.
 */
async function playReinforce(
  round: number,
  coords: string,
  correct: number,
): Promise<void> {
  const shell = query<HTMLElement>(".hw-shell");
  findButton(shell, /Reinforce a building/).click();
  await waitFor(
    () => boardCell(coords).tagName === "BUTTON",
    `cell ${coords} becomes a target`,
  );
  boardCell(coords).click();
  await waitFor(
    () => !findButton(shell, /Commit and face/).disabled,
    "the commit button arms",
  );
  await commitAndResolve(round, correct);
}

/* ------------------------------------------------ 1. the board is really drawn */

test("the island renders as 88 square land cells in a ten-by-ten grid, with no overflow", async () => {
  await openBoard();

  const rows = document.querySelectorAll(".hw-grid .hw-grid__row");
  expect(rows).toHaveLength(10);

  const cells = document.querySelectorAll<HTMLElement>(".hw-grid [data-cell]");
  expect(cells).toHaveLength(100);
  expect(document.querySelectorAll(".hw-grid .hw-cell--water")).toHaveLength(12);

  // The cells are really laid out, and really square. A grid whose stylesheet failed to
  // load would measure zero-height rows here, which is the failure this test exists for.
  let measured = 0;
  for (const cell of cells) {
    const box = cell.getBoundingClientRect();
    expect(box.width, "a cell has width").toBeGreaterThan(8);
    expect(box.height, "a cell has height").toBeGreaterThan(8);
    expect(
      Math.abs(box.width - box.height),
      "a cell is square, so a Chebyshev ward reads as a square",
    ).toBeLessThan(1.5);
    measured += 1;
  }
  expect(measured).toBe(100);

  // Nothing sticks out sideways at a laptop footprint.
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
    document.documentElement.clientWidth,
  );
});

/**
 * Rim depth is what makes "light it AHEAD of the line" a plannable decision rather than a
 * guess, so the shading has to be visible before the frost arrives. Asserted as five
 * DISTINCT computed colours, not as five class names.
 */
test("clear ground is shaded by distance from the shore, in five distinguishable steps", async () => {
  await openBoard();

  const shades = new Set<string>();
  for (const depth of [0, 1, 2, 3, 4]) {
    const cell = document.querySelector(`.hw-grid .hw-cell--depth-${depth}`);
    if (!cell) {
      throw new Error(`no cell at rim depth ${depth}`);
    }
    const colour = background(cell);
    expect(colour, `depth ${depth} has a background`).not.toBe("rgba(0, 0, 0, 0)");
    shades.add(colour);
  }
  expect(shades.size, "the five bands are five different colours").toBe(5);
});

/* ------------------------------------------------------- 2. the frost is visible */

test("the frost line is drawn on the leading edge and nowhere else", async () => {
  await openBoard();
  const clearGround = background(boardCell("0,0"));

  await playFire(1, "-2,-2", 0);

  await waitFor(
    () => document.querySelectorAll(".hw-grid .hw-cell--frozen").length > 0,
    "the frost arrives",
  );

  const frozen = document.querySelectorAll<HTMLElement>(".hw-grid .hw-cell--frozen");
  const line = document.querySelectorAll<HTMLElement>(".hw-grid .hw-cell--line");
  // After round one exactly the shoreline is frozen, so the whole of it is the edge.
  expect(frozen.length).toBe(28);
  expect(line.length).toBe(28);

  // Ice does not look like clear ground...
  const ice = background(frozen[0] as HTMLElement);
  expect(ice).not.toBe(clearGround);
  // ...and the edge is marked with something a player can see, over and above the ice.
  const edgeShadow = getComputedStyle(line[0] as HTMLElement).boxShadow;
  expect(edgeShadow).not.toBe("none");
  expect(edgeShadow.length).toBeGreaterThan(4);

  // The interior of the island is still clear, so the picture distinguishes the two.
  expect(background(boardCell("0,0"))).toBe(clearGround);
});

/**
 * The rescue, made visible: a fire on frozen ground keeps its building warm even though
 * the ground stays frozen. If warmth were drawn UNDER the ice a player could not tell a
 * rescued building from a doomed one, which is the single most important read on the board.
 */
test("a fire's warmth is drawn over the ice, not under it", async () => {
  await openBoard();

  // Round one: nothing but a wasted fire, so the shoreline freezes.
  await playFire(1, "-2,-2", 0);
  await waitFor(
    () => boardCell("4,0").className.includes("hw-cell--frozen"),
    "the Lookout's ground freezes",
  );
  const frozenLookout = background(boardCell("4,0"));

  // Round two: the widest bonfire, directly on the frozen Lookout.
  await playFire(2, "4,0", 3);
  await waitFor(
    () => boardCell("4,0").className.includes("hw-cell--warded"),
    "the Lookout is sheltered",
  );

  const cell = boardCell("4,0");
  expect(cell.className, "the ground is still frozen").toContain("hw-cell--frozen");
  expect(background(cell), "but it no longer looks frozen").not.toBe(frozenLookout);

  // And the warm patch is a real disc on the board, clipped by the shoreline: the Tower is
  // on the eastern shore, so the disc's eastern arm falls in the water and nine of its
  // thirteen cells land.
  const warded = document.querySelectorAll(".hw-grid .hw-cell--warded");
  expect(warded.length).toBe(9);
});

/* ---------------------------------------- 2b. the nested tier preview, drawn */

/**
 * THE PREVIEW HAS TO BE LOOKED AT, which is why the interesting half of it is here.
 *
 * jsdom can prove that thirteen cells carry `hw-cell--preview-strong` and that each wears
 * the right digit. It cannot prove the thing the feature is for: that a player aiming a
 * fire can SEE three nested footprints, tell them apart from each other, and tell all three
 * apart from the warm ground a live fire makes. Those are claims about computed style and
 * real geometry, so they are measured in Chromium.
 *
 * The both-ways structure matters. It is easy to write a preview that is visible and
 * indistinguishable (three identical rings), and just as easy to write one that is
 * distinguishable only by colour. Each is checked against.
 */
test("the three tier footprints are drawn, nested, and told apart without colour", async () => {
  await openBoard();

  const shell = query<HTMLElement>(".hw-shell");
  // The ground of the cell whose background is checked AFTER the preview lands. Read from
  // that same cell rather than from a neighbour, because the island is shaded by rim depth
  // and two cells one step apart are two different greens by design.
  const clearGround = background(boardCell("0,-1"));

  findButton(shell, /Light a fire/).click();
  await waitFor(
    () => boardCell("0,-2").tagName === "BUTTON",
    "the board starts taking a fire",
  );
  // Nothing provisional is drawn until a cell is chosen.
  expect(document.querySelectorAll(".hw-grid .hw-cell--preview")).toHaveLength(0);

  boardCell("0,-2").click();
  await waitFor(
    () => document.querySelectorAll(".hw-grid .hw-cell--preview").length > 0,
    "the preview appears",
  );

  // Thirteen cells, in three nested bands. `(0, -2)` is deep enough that none of the disc
  // falls in the water, so this is the top tier's whole footprint.
  const bands = ["weak", "steady", "strong"] as const;
  const counts = bands.map(
    (tier) => document.querySelectorAll(`.hw-grid .hw-cell--preview-${tier}`).length,
  );
  expect(counts).toEqual([1, 4, 8]);
  expect(counts.reduce((a, b) => a + b, 0)).toBe(13);

  // 1. THE PREVIEW IS REALLY DRAWN, and it is drawn OVER the ground rather than replacing
  //    it: the ring is an ::after overlay, so the cell keeps its own size and its own
  //    background and a preview over ice still reads as ice.
  const previewed = boardCell("0,-1");
  expect(previewed.className).toContain("hw-cell--preview");
  const ring = getComputedStyle(previewed, "::after");
  expect(ring.borderTopStyle, "the ring has a stroke").not.toBe("none");
  expect(Number.parseFloat(ring.borderTopWidth), "the ring has width").toBeGreaterThan(0);
  expect(ring.backgroundColor, "the band has a tint").not.toBe("rgba(0, 0, 0, 0)");
  // The ground underneath is untouched, which is what makes this provisional rather than a
  // fifth ground state.
  expect(background(previewed)).toBe(clearGround);

  // 2. THE THREE BANDS ARE TOLD APART WITHOUT HUE. Two independent non-colour channels:
  //    the stroke style, and the digit.
  const strokes = bands.map((tier) => {
    const cell = document.querySelector(`.hw-grid .hw-cell--preview-${tier}`);
    if (!cell) {
      throw new Error(`no ${tier} band on the board`);
    }
    return getComputedStyle(cell, "::after").borderTopStyle;
  });
  expect(new Set(strokes).size, `strokes were ${strokes.join(", ")}`).toBe(3);

  const digits = [...document.querySelectorAll<HTMLElement>(".hw-grid .hw-cell__need")];
  expect(digits).toHaveLength(13);
  for (const digit of digits) {
    const box = digit.getBoundingClientRect();
    expect(box.width, `digit ${digit.textContent} has width`).toBeGreaterThan(4);
    expect(box.height, `digit ${digit.textContent} has height`).toBeGreaterThan(4);
    // Inside its own cell, so the badge cannot spill onto a neighbour and mislabel it.
    const cellBox = (digit.closest("[data-cell]") as HTMLElement).getBoundingClientRect();
    expect(box.right).toBeLessThanOrEqual(cellBox.right + 0.5);
    expect(box.bottom).toBeLessThanOrEqual(cellBox.bottom + 0.5);
  }
  expect(new Set(digits.map((d) => d.textContent))).toEqual(new Set(["1", "2", "3"]));

  // 3. THE BANDS REALLY ARE NESTED ON SCREEN, measured as geometry rather than trusted
  //    from the class names: each band's cells are further from the chosen cell than the
  //    last band's.
  const centre = boardCell("0,-2").getBoundingClientRect();
  const meanDistance = (tier: string): number => {
    const cells = [...document.querySelectorAll(`.hw-grid .hw-cell--preview-${tier}`)];
    const total = cells.reduce((sum, cell) => {
      const box = cell.getBoundingClientRect();
      return (
        sum +
        Math.hypot(
          box.left + box.width / 2 - (centre.left + centre.width / 2),
          box.top + box.height / 2 - (centre.top + centre.height / 2),
        )
      );
    }, 0);
    return total / cells.length;
  };
  expect(meanDistance("weak")).toBeLessThan(meanDistance("steady"));
  expect(meanDistance("steady")).toBeLessThan(meanDistance("strong"));

  // 4. A PREVIEW IS NOT A WARD. Nothing on the board is warm yet, so the provisional
  //    figure cannot be read as the live state a fire produces.
  expect(document.querySelectorAll(".hw-grid .hw-cell--warded")).toHaveLength(0);

  // And the panel names what each tier would hold, beside the board, on screen.
  const ladder = query<HTMLElement>(".hw-ladder--preview");
  expect(ladder.getBoundingClientRect().height).toBeGreaterThan(0);
  expect(ladder.textContent).toContain("13 cells (15% of the island)");
});

/**
 * The complement, and the reason the preview needs its own register rather than a fourth
 * colour: once a fire is really burning, its warmth must not look like a proposal.
 */
test("a live ward does not look like a preview", async () => {
  await openBoard();

  await aimFire("0,-2");
  await waitFor(
    () => document.querySelector(".hw-grid .hw-cell--preview") !== null,
    "the preview appears",
  );
  const proposed = background(boardCell("0,-2"));

  // Committed from the aimed state, so the SAME cell is measured before and after.
  await commitAndResolve(1, 3);
  await waitFor(
    () => boardCell("0,-2").className.includes("hw-cell--warded"),
    "the fire catches",
  );

  const warm = boardCell("0,-2");
  // The live ward is a solid FILL where the preview was an outline over untouched ground,
  // so the two states differ in the channel that carries the most weight on a small cell.
  expect(background(warm), "warmth fills the cell").not.toBe(proposed);
  expect(warm.className).not.toContain("hw-cell--preview");
  // And the provisional figure is gone entirely: it described a choice that has been made.
  expect(document.querySelectorAll(".hw-grid .hw-cell--preview")).toHaveLength(0);
  expect(document.querySelectorAll(".hw-grid .hw-cell__need")).toHaveLength(0);
  // The ward it became is the 13 cells the preview promised.
  expect(document.querySelectorAll(".hw-grid .hw-cell--warded")).toHaveLength(13);
});

/* ------------------------------- 2c. REMOVED: the pull-back preview and its register */

/*
 * **TWO TESTS LIVED HERE AND WENT WITH THE GIVE-UP-GROUND ACTION (2026-08-02).** They are the only
 * claims in the suite that no longer have a subject, and each is named because a re-instatement
 * owes exactly the same measurements — these are claims only a real browser can make, so they
 * cannot be re-derived in jsdom:
 *
 *  - ***"a pull-back's ring is drawn as a loss, and never mistakable for a fire's ward"***. Both
 *    previews said *"this has not happened yet"*, and if they said it the same way a player aiming
 *    a pull-back would read it as a fire and the decision would be INVERTED — the worst failure the
 *    feature could have, worse than not drawing it at all. So the two registers were measured
 *    against EACH OTHER, in two channels rather than one: the loss band was hatched
 *    (`repeating-linear-gradient`, which survives a greyscale render) where the gain band was a flat
 *    tint, and the strokes differed in colour. It also measured that one hypothetical was on screen
 *    at a time, that the ring was 28 cells and really the rim, that every cell wore the cross a ruin
 *    wears with real width and height, and that the price was beside it before anything was paid.
 *  - ***"the previewed ring becomes the ruined ground it promised"***. Before and after read as the
 *    same thing at two moments: the settled ground was hatched too, so the preview was a lighter
 *    version of what it would become rather than an unrelated decoration.
 *
 * The FIRE preview's own register is still measured, in `2b` above, which is what stops "one
 * provisional state, drawn provisionally" becoming an untested claim now that there is only one.
 */

/* --------------------------------------------------------- 3. buildings and ruins */

test("every building wears a legible mark, and a ruin is visibly a ruin", async () => {
  await openBoard();

  const marks = document.querySelectorAll<HTMLElement>(".hw-grid .hw-cell__mark");
  expect(marks).toHaveLength(WINTER_NODE_ORDER.length);
  for (const mark of marks) {
    const box = mark.getBoundingClientRect();
    expect(box.width, `${mark.textContent} has width`).toBeGreaterThan(0);
    expect(box.height, `${mark.textContent} has height`).toBeGreaterThan(0);
    expect((mark.textContent ?? "").trim().length).toBeGreaterThan(0);
  }

  const standingBorder = getComputedStyle(boardCell("4,0")).borderTopColor;

  // ONE wasted round takes the shoreline Lookout. This used to take three: two early bites of
  // two points each with the third going over the six a building absorbed. At
  // `HARD_WINTER.damage.ruin_at: 2` the first bite is the whole building.
  await playFire(1, "-2,-2", 0);
  await waitFor(
    () => boardCell("4,0").className.includes("hw-cell--ruin"),
    "the Lookout falls",
  );

  const ruin = boardCell("4,0");
  // Still on the board and still a control, so its lesson is still reachable.
  expect(ruin.tagName).toBe("BUTTON");
  expect(getComputedStyle(ruin).borderTopColor, "a ruin is outlined differently").not.toBe(
    standingBorder,
  );
  const ruinMark = ruin.querySelector<HTMLElement>(".hw-cell__mark");
  expect(ruinMark?.getBoundingClientRect().width).toBeGreaterThan(0);
  expect(ruinMark?.textContent).toBe("\u2715");
});

/**
 * **FROST CLIMBING A BUILDING, RENDERED.** The third building appearance, and the one a
 * class name cannot make a claim about: it is drawn as an `::before` overlay whose HEIGHT
 * is the stage, so what has to be true is that the overlay has real pixels, that it grows
 * between stages, and that it does not swallow the building's own mark.
 *
 * jsdom cannot see any of that — it computes no layout and no pseudo-elements — which is
 * why this test is here and not beside the behavioural ones.
 *
 * ## ⚑ SPLIT IN TWO ON 2026-08-01 AND WHOLLY UNREACHABLE SINCE 2026-08-02
 *
 * It played two wasted rounds and read `hurt-1` then `hurt-2` off the same building, which is what
 * *"higher the worse it is"* was measured on. `HARD_WINTER.damage.ruin_at: 2` removed both states —
 * an unsheltered cold round was the whole building, and the one scar the engine could produce was a
 * two-point shield meeting a three-point bite, which landed on `hurt-2` — so the claim was split:
 * the reached state played on the real board, and the LADDER measured on the shipped stylesheet.
 *
 * **At `ruin_at: 1` there is no reached state at all**, proved over the whole shield-by-bite space
 * in `hard-winter.test.ts`. So the played half is gone and the STYLESHEET half is the whole test —
 * which is the half that was always the one a retune would break silently, and the reason
 * `HARD_WINTER.damage.stages` is deliberately left at 3 with its three CSS rungs in place.
 *
 * What is measured is therefore: that the three rungs draw real pixels, that each is taller than
 * the last, that none fills the cell, and that the building's own mark reads over all three. On a
 * cell that is genuinely laid out by the shipped stylesheet, which is why this is a browser test
 * and not a jsdom one. It is a claim about the VOCABULARY being ready rather than about a state the
 * board reaches, and it is labelled as such.
 */
test("keeps a three-rung rime ladder in the stylesheet, ready for a ruin threshold with room in it", async () => {
  await openBoard();

  const rime = (cell: HTMLElement): number =>
    Number.parseFloat(getComputedStyle(cell, "::before").height);

  // Nothing is marked, and nothing can be: the engine has no standing-damaged state.
  expect(boardCell("4,0").className).not.toContain("hw-cell--hurt");
  await playFire(1, "-2,-2", 0);
  await waitFor(
    () => boardCell("4,0").className.includes("hw-cell--ruin"),
    "the Lookout is taken",
  );
  expect(boardCell("4,0").className, "a scar is reachable after all").not.toContain(
    "hw-cell--hurt",
  );

  // A LAID-OUT CELL to measure the stylesheet on. The heart, because it is standing and unmarked at
  // this point and so wears nothing that would confound the rungs below.
  const marked = boardCell("0,0");
  marked.classList.add("hw-cell--hurt");
  const cellHeight = marked.getBoundingClientRect().height;
  expect(cellHeight, "the cell is laid out at all").toBeGreaterThan(0);

  /*
   * THE LADDER, on the shipped stylesheet rather than on states this tuning can reach. Nothing
   * re-renders this cell while no event is dispatched, so it can wear each rung in turn and be
   * measured. Every height is a real computed pixel value on a laid-out element, which is the
   * only way this claim can be made at all.
   */
  const rungs = [1, 2, 3].map((stage) => {
    marked.classList.remove("hw-cell--hurt-1", "hw-cell--hurt-2", "hw-cell--hurt-3");
    marked.classList.add(`hw-cell--hurt-${stage}`);
    return { stage, height: rime(marked) };
  });
  const readable = JSON.stringify(rungs);
  for (const rung of rungs) {
    expect(rung.height, `stage ${rung.stage} draws no rime: ${readable}`).toBeGreaterThan(
      0,
    );
    expect(rung.height, `stage ${rung.stage} fills the cell: ${readable}`).toBeLessThan(
      cellHeight,
    );
  }
  for (let index = 1; index < rungs.length; index += 1) {
    expect(
      (rungs[index] as { height: number }).height,
      `the rime does not climb from stage ${index} to ${index + 1}: ${readable}`,
    ).toBeGreaterThan((rungs[index - 1] as { height: number }).height);
  }
  expect(rungs, "one rung per damaged appearance the stylesheet offers").toHaveLength(
    HARD_WINTER.damage.stages,
  );
});

/* --------------------------------------------- 3b. the player's own city, drawn */

/**
 * THE LIVE BOARD, IN A REAL BROWSER — because the whole point of it is to be looked at.
 *
 * The three authored layouts measure a tuning number; this exists so the number can be
 * JUDGED, and judging happens by eye. jsdom can prove the right cells carry the right node
 * ids. It cannot prove the board is legible as *your city* — that the buildings land where
 * you put them at the size they render, that the hall reads as the hub, and that the
 * sandbox promise is on screen rather than in a docblock.
 */
test("a saved city is drawn as the board, and says it is a snapshot", async () => {
  const key = devSessionStore.storageKey();
  const saved = JSON.stringify({
    // The CURRENT schema version, and it has to be: the version is part of the storage key
    // AND is re-checked by the parser, so a fixture one version behind is not fetched at all
    // and the surface falls back to an authored board — which measured as six buildings on a
    // three-building city when `crisis_damage` bumped this to 4.
    version: DEV_SESSION_SCHEMA_VERSION,
    saved_at: "2026-07-29T12:00:00.000Z",
    city: {
      node_states: [],
      neighborhood_states: [],
      // Deliberately NOT any authored layout: two on the shore, one at the heart, so the
      // board on screen could only have come from this blob.
      placements: [
        { nodeId: "NUM.5", col: -5, row: 0, rot: 0 },
        { nodeId: "NUM.4", col: 4, row: 2, rot: 0 },
        { nodeId: "NUM.F", col: 0, row: 0, rot: 0 },
      ],
      roads: [],
      road_gold_spent: 0,
      town_hall: { nodeId: "town-hall", col: -1, row: -1, rot: 0 },
    },
  });
  window.localStorage.setItem(key, saved);

  try {
    await openBoard();

    // The board is the saved city, cell for cell, and nothing else is on it.
    const built = document.querySelectorAll<HTMLElement>(".hw-grid [data-node]");
    expect(built).toHaveLength(4);
    for (const [coords, node] of [
      ["-5,0", "NUM.5"],
      ["4,2", "NUM.4"],
      ["0,0", "NUM.F"],
      ["-1,-1", "town-hall"],
    ] as const) {
      expect(boardCell(coords).getAttribute("data-node"), coords).toBe(node);
    }

    // Every one of them is really drawn: a mark with real geometry, inside its own cell.
    const marks = document.querySelectorAll<HTMLElement>(".hw-grid .hw-cell__mark");
    expect(marks).toHaveLength(4);
    for (const mark of marks) {
      const box = mark.getBoundingClientRect();
      expect(box.width, `${mark.textContent} has width`).toBeGreaterThan(0);
      expect(box.height, `${mark.textContent} has height`).toBeGreaterThan(0);
    }

    // The hall wears the hub's name rather than its sentinel id, which is the guard
    // `placementLabel` exists for — `buildingName` would announce the literal `town-hall`.
    const hall = boardCell("-1,-1");
    expect(hall.getAttribute("aria-label")).not.toContain("town-hall");
    expect(hall.querySelector(".hw-cell__mark")?.textContent ?? "").not.toBe("TO");

    // And the sandbox promise is on screen, laid out, above the fold.
    const note = query<HTMLElement>(".hw-note--sandbox");
    const noteBox = note.getBoundingClientRect();
    expect(noteBox.height).toBeGreaterThan(0);
    expect(noteBox.top).toBeLessThan(window.innerHeight);
    expect(note.textContent).toMatch(/snapshot of your saved city/i);
    expect(note.textContent).toMatch(/your island is still exactly where you left it/i);
    // It reads as reassurance, not as a warning: a red banner would say the opposite of
    // what it means to somebody deciding whether this is safe to open.
    expect(background(note)).not.toBe(background(query<HTMLElement>(".hw-note")));

    // The header says which board this is, and the chip for it is the pressed one.
    expect(query<HTMLElement>(".hw-layout").getAttribute("data-layout")).toBe("live");
    expect(query<HTMLElement>(".hw-layout").textContent).toMatch(/your own city/i);
  } finally {
    window.localStorage.removeItem(key);
  }
});

/* -------------------------------------------------------------- 4. the read-out */

test("the panels a decision is made from are all on screen at a laptop size", async () => {
  await openBoard();

  const onScreen = (selector: string, what: string) => {
    const box = query(selector).getBoundingClientRect();
    expect(box.width, `${what} has width`).toBeGreaterThan(0);
    expect(box.height, `${what} has height`).toBeGreaterThan(0);
    expect(box.left, `${what} is not off the left edge`).toBeGreaterThanOrEqual(0);
    expect(box.right, `${what} is not off the right edge`).toBeLessThanOrEqual(
      window.innerWidth + 1,
    );
  };

  onScreen(".hw-grid", "the island");
  onScreen(".hw-legend", "the map key");
  onScreen(".hw-note", "the no-mastery note");
  onScreen(".hw-panel", "the declare panel");

  // The board and the decision panel sit side by side, which is the whole reason the
  // spatial choice is makeable: you read the frost and choose in one glance.
  const board = query(".hw-board").getBoundingClientRect();
  const side = query(".hw-side").getBoundingClientRect();
  expect(side.left, "the panels are beside the board, not below it").toBeGreaterThanOrEqual(
    board.right - 1,
  );

  // The ladder that makes the gamble legible is spelled out before anything is declared.
  const shell = query<HTMLElement>(".hw-shell");
  findButton(shell, /Light a fire/).click();
  await waitFor(() => document.querySelector(".hw-ladder") !== null, "the ladder appears");
  const ladder = query<HTMLElement>(".hw-ladder");
  expect(ladder.textContent).toContain("3 of 3");
  expect(ladder.textContent).toContain("1 of 3");
  expect(ladder.getBoundingClientRect().height).toBeGreaterThan(0);
});
