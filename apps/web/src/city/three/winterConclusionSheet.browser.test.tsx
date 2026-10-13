import { HARD_WINTER } from "@cr/game";
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
import { MILESTONE_FIRST_CRISIS } from "../milestones";
import type { PlacedTransform } from "../worldLayout";
import { ISLAND_LEGEND, type WinterCityBoard, WinterInCity } from "./WinterInCity";
import { crisisPanelReach } from "./winterFraming";

import "../../styles.css";
import { wrongButReadable } from "../../test/wrongButReadable";

/**
 * **THE STRIPPED QUESTION SURFACE AND THE CONCLUDING SCREEN, AT THE WINDOW THE LEAD REVIEWS ON.**
 *
 * ## 1024x580, and why every viewport in this file is that one
 *
 * The lead's own note, with a screenshot of the settlement block running off the bottom of his
 * window: *"its just taking up extra space on the bottom and bleeding over"*. His window is about
 * **1024 x 580**, which is shorter than every viewport `winterInCitySheet.browser.test.tsx`
 * measures at — its shortest is 720 tall — and shorter than `winterIslandVisible`'s 640. A panel
 * whose content fits at 720 can overflow at 580 by a hundred pixels, so a claim about *"bleeding
 * over"* made at a comfortable developer viewport says nothing about the screen the objection was
 * about.
 *
 * ## What the pictures are for, and why there are three of the conclusion
 *
 * D-CRISIS-26 rules that a crisis may end **unsolved with the damage standing**. So *"the
 * conclusion reads honestly"* is not a claim one screenshot can support: a single picture of a
 * clean run proves nothing about the outcome the ruling is about, and a single picture of a
 * ruined city proves nothing about the other end. Three endings are played out through the real
 * reducer — untouched, mauled, and everything lost — and photographed.
 *
 * ## And the one claim that is geometry rather than a picture
 *
 * The conclusion must not cover the settlement it is reporting on. That is a SPATIAL claim, so it
 * gets both: a frame taken at 1024x580 that somebody looked at, and an assertion against
 * `crisisPanelReach`, which is the same arithmetic `winterFraming.ts` uses to slide the city camera
 * into the strip the panel leaves free. Reading the card's own width instead would be a claim about
 * CSS; reading it against the strip the camera framed the island into is a claim about whether the
 * island is behind it.
 *
 * THE AXIS OF THAT CLAIM CHANGED WITH THE PANEL, and the claim did not. The crisis was a bottom
 * band when this file was written, so the camera lifted the settlement into the strip ABOVE it and
 * the card had to stay below a HEIGHT. It is a left side panel now, the camera slides the settlement
 * into the strip BESIDE it, and the card takes the panel's own column — so the assertion is that
 * the card stays clear of that strip's left edge. A bottom card 88vw wide would have covered the
 * settlement's lower half from y=230 down at this viewport, which is why the card is re-placed
 * in-city (`winter-in-city.css`) rather than the assertion re-pointed at something it still
 * passes.
 */

/** The lead's own window. Every measurement and every picture in this file is taken here. */
const LEAD = { width: 1024, height: 580 } as const;

/**
 * Whether this run may write the three COMMITTED frames, as every other capture in this
 * directory asks.
 *
 * The frames used to be written unconditionally, on the reasoning recorded in
 * `docs/design-refs/city-says-what-it-knows/README.md`: *"Frame 6 is not [behind the flag]:
 * that suite is already playing three full winters through the real reducer."* That is a true
 * statement about COST and the wrong criterion. What a flag buys is not runtime, it is that a
 * committed file changes only when somebody meant it to — and three agents in one day ran
 * `npm run check`, found `6-conclusion-milestone-{untouched,mauled,lost}-1024x580.png` dirty,
 * and restored them by hand. The frames are byte-different and picture-identical every run,
 * so the noise is total and the signal is nil.
 *
 * The frames stay in `docs/` rather than moving to the gitignored `__screenshots__/`, because
 * they are the evidence a reviewer opens for the claim below: the acknowledgement is on the
 * card at all three verdicts and is never the headline. `keepConclusion`'s own comment argues
 * that, and it still holds. What changes is only that regenerating them is now something a
 * capture run does on purpose.
 */
const SHOTS = Boolean(import.meta.env.VITE_WINTER_SHOTS);

let h: Harness | null = null;
let published: WinterCityBoard | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(() => {
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

/**
 * THREE CITIES, because the outcome a winter reaches is a function of where the buildings stand
 * and not only of how the player answers.
 *
 * `PACKED` is the authored `packed` board's own cells, which is the one arrangement era one deals
 * on which a full-accuracy plan comes through completely unmarked (`hard-winter-layouts.test.ts`
 * pins that plan as its no-dead-end witness). `SPREAD` is the authored `spread` board: six
 * buildings across four rim bands, the widest the prototype deals, where the frost is on something
 * from round one.
 */
const PACKED: readonly PlacedTransform[] = [
  placed("NUM.S", -1, -1),
  placed("NUM.F", -1, -2),
  placed("NUM.2", -1, 1),
  placed("NUM.3", -2, -1),
  placed("NUM.4", -2, 0),
  placed("NUM.5", 1, -1),
];

const SPREAD: readonly PlacedTransform[] = [
  placed("NUM.S", 0, 0),
  placed("NUM.F", 2, 2),
  placed("NUM.2", -3, -2),
  placed("NUM.3", 0, 2),
  placed("NUM.4", -4, -3),
  placed("NUM.5", 4, 0),
];

function query<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`nothing matched ${selector}`);
  }
  return found;
}

function panel(): HTMLElement {
  return query<HTMLElement>(".winter-in-city .hw-shell");
}

function conclusion(): HTMLElement {
  return query<HTMLElement>(".hw-conclusion");
}

/** Whole and unscrolled inside its own visible box, which is what "not bleeding over" means. */
function insideTheFold(element: Element, container: HTMLElement): boolean {
  const box = element.getBoundingClientRect();
  const outer = container.getBoundingClientRect();
  return box.top >= outer.top - 1 && box.bottom <= outer.bottom + 1;
}

async function openCrisis(city: readonly PlacedTransform[]): Promise<void> {
  await page.viewport(LEAD.width, LEAD.height);
  h = mount(
    <WinterInCity
      placements={city}
      townHall={null}
      canvasLive
      practisedNodeIds={WINTER_NODE_ORDER}
      /*
        THE FIRST-CRISIS MILESTONE, handed down exactly as `CitySurface` hands it down over
        a city no crisis has reached yet. It is passed on EVERY ending rather than only the
        clean one, because that is what the guardrail requires: a milestone that could be
        missed would be a punishment wearing a reward's clothes, so it fires on the crisis
        being over and not on how it went. The three frames below are therefore also the
        evidence that one line survives the bottom of the range without reading as a
        victory card — see the per-ending assertion that it is not the headline.
      */
      milestone={MILESTONE_FIRST_CRISIS}
      onBoard={(board) => {
        published = board;
      }}
      onExit={() => undefined}
    />,
  );
  await waitFor(
    () => document.querySelector(".winter-in-city .hw-shell") !== null,
    "the crisis panel renders",
  );
  await document.fonts.ready;
}

/**
 * Play one round: declare `action`, then answer `right` of the batch correctly.
 *
 * Driven through the surface's own controls and the board's own `onAimCell` seam, so the state
 * these pictures are taken of is the state a player reaches. A wrong answer is the real key with a
 * marker appended, so it fails through the real checker.
 */
/**
 * Declare a shield, aimed through the island's own `onPickBuilding` seam.
 *
 * **THE PULL-BACK NEEDED NO TARGET UNTIL 2026-08-02**, which made it one click. The lead ruled that
 * action out, and the shortest declaration left needs a building — picked the way a player picks
 * one in the city, because there is no 2D grid on this mount.
 */
async function declareAShield(nodeId: string): Promise<void> {
  findButton(panel(), /Reinforce a building/).click();
  await waitFor(() => published !== null, "the island was never handed a board");
  published?.onPickBuilding(nodeId);
}

async function playRound(
  round: number,
  right: number,
  action:
    | { readonly kind: "abandon" }
    | { readonly kind: "fire"; col: number; row: number },
): Promise<void> {
  if (action.kind === "abandon") {
    throw new Error(
      "the give-up-ground action was ruled out on 2026-08-02; declare a reinforce instead",
    );
  } else {
    findButton(panel(), /Light a fire/).click();
    await waitFor(() => published?.onAimCell != null, "the board takes a cell pick");
    published?.onAimCell?.(action.col, action.row);
  }
  await waitFor(() => !findButton(panel(), /Commit and face/).disabled, "commit arms");
  findButton(panel(), /Commit and face/).click();
  await waitFor(() => panel().dataset.phase === "answering", "the batch opens");

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
    setInputValue(
      query<HTMLInputElement>(".winter-in-city .hw-panel input"),
      index < right ? key : wrongButReadable(key),
    );
    await waitFor(() => !findButton(panel(), /^Check$/).disabled, "Check arms");
    findButton(panel(), /^Check$/).click();
    await waitFor(
      () => document.querySelector(".winter-in-city .hw-verdict") !== null,
      "a verdict lands",
    );
    findButton(panel(), /See what you earned|Next question/).click();
    await waitFor(
      () =>
        index + 1 >= keys.length
          ? panel().dataset.phase !== "answering"
          : document.querySelector(".winter-in-city .hw-verdict") === null,
      "the batch moves on",
    );
  }

  if (panel().dataset.phase === "resolved") {
    findButton(panel(), /Let the frost advance/).click();
    await waitFor(
      () => panel().dataset.phase !== "resolved",
      "the frost advances out of resolved",
    );
  }
}

/**
 * `packed`'s pinned no-dead-end witness, which is the only clean winter on that board.
 *
 * Borrowed rather than invented: it is `hard-winter-layouts.test.ts`'s
 * `NO_DEAD_END_WITNESS.packed`, and its length is checked against the tuning below, because a
 * plan longer than the winter does not fail on its own — the reducer ignores a declaration in
 * the `ended` phase, so the extra step is silently dead. It lost its trailing reinforce while
 * `HARD_WINTER.rounds` briefly read 4 on 2026-08-01 and got it back when that was reversed;
 * `HARD_WINTER.damage.ruin_at: 2` left it untouched. **At the 2026-08-02 set it is three fires and
 * no shields at all**, and it is exhaustively optimal rather than searched: three rounds means the
 * whole plan space could be walked, which that file did.
 */
const WITNESS = [
  { kind: "fire" as const, col: -3, row: -5 },
  { kind: "fire" as const, col: -3, row: -5 },
  { kind: "fire" as const, col: -1, row: -1 },
];

/** Reinforce is aimed at a building through the board, the way the canvas reports one. */
async function reinforce(nodeId: string): Promise<void> {
  findButton(panel(), /Reinforce a building/).click();
  await waitFor(() => published?.onPickBuilding != null, "the board takes a building");
  published?.onPickBuilding(nodeId);
}

async function playWitnessRound(round: number, right: number): Promise<void> {
  expect(WITNESS, "the witness is not a whole winter").toHaveLength(HARD_WINTER.rounds);
  const step = WITNESS[round - 1];
  if (!step) {
    throw new Error(`no witness step for round ${round}`);
  }
  // THE WITNESS IS ALL FIRES AT THE 2026-08-02 SET, so the reinforce branch this carried is gone
  // with it: `reinforce` is still exported and still used by the shield fixtures below.
  await playRound(round, right, step);
}

/** The answering half of a round, once a declaration has already been committed. */
async function answerBatchOnly(round: number, right: number): Promise<void> {
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
    setInputValue(
      query<HTMLInputElement>(".winter-in-city .hw-panel input"),
      index < right ? key : wrongButReadable(key),
    );
    await waitFor(() => !findButton(panel(), /^Check$/).disabled, "Check arms");
    findButton(panel(), /^Check$/).click();
    await waitFor(
      () => document.querySelector(".winter-in-city .hw-verdict") !== null,
      "a verdict lands",
    );
    findButton(panel(), /See what you earned|Next question/).click();
    await waitFor(
      () =>
        index + 1 >= keys.length
          ? panel().dataset.phase !== "answering"
          : document.querySelector(".winter-in-city .hw-verdict") === null,
      "the batch moves on",
    );
  }
  if (panel().dataset.phase === "resolved") {
    findButton(panel(), /Let the frost advance/).click();
    await waitFor(
      () => panel().dataset.phase !== "resolved",
      "the frost advances out of resolved",
    );
  }
}

async function shoot(name: string): Promise<void> {
  await document.fonts.ready;
  if (SHOTS) {
    expect(
      await page.screenshot({ path: `__screenshots__/winter-1024x580/${name}.png` }),
      `no screenshot for ${name}`,
    ).toBeTruthy();
  }
}

/**
 * The three conclusion frames, kept where a reviewer can open them — under `VITE_WINTER_SHOTS`.
 *
 * `.gitignore` ignores `__screenshots__` at any depth, so {@link shoot}'s frames have only
 * ever been readable by the machine that took them. These three are the ONLY ones retargeted,
 * because they are the only ones carrying a claim someone has to look at across all three
 * endings: the milestone acknowledgement is on the card at the top of the range and at the
 * bottom of it, and *"it is never the headline"* asserted at three verdicts is a claim a
 * reader should be able to check against three pictures. Same precedent as
 * `docs/design-refs/advisor-wardrobe/`, and now the same gate as it: a tracked path is written
 * only when {@link SHOTS} says the run is a capture run. Everything this test asserts about the
 * three endings runs either way; only the writing of the frames is behind the flag.
 */
async function keepConclusion(name: string): Promise<void> {
  if (SHOTS) {
    await document.fonts.ready;
    if (SHOTS) {
      expect(
        await page.screenshot({
          path: `../../../../../docs/design-refs/city-says-what-it-knows/${name}.png`,
        }),
        `no committed frame for ${name}`,
      ).toBeTruthy();
    }
  }
}

/* ---------------------------------------------- 1. the stripped question surface */

/**
 * **NOTHING IS BELOW THE FOLD ON THE ANSWERING SHEET AT 1024x580**, which is the shape of the
 * complaint applied to the screen the first note was about.
 *
 * The floor comes first: the question, the field and the stake are all really there, so a sheet
 * that rendered nothing would fail before it reached the containment claim.
 */
test("the answering sheet holds everything it draws at 1024x580", async () => {
  await openCrisis(SPREAD);
  await page.viewport(LEAD.width, LEAD.height);
  await declareAShield(SPREAD[0]?.nodeId ?? "NUM.S");
  await waitFor(() => !findButton(panel(), /Commit and face/).disabled, "commit arms");
  findButton(panel(), /Commit and face/).click();
  await waitFor(() => panel().dataset.phase === "answering", "the batch opens");
  await document.fonts.ready;

  const sheet = panel();
  const question = query<HTMLElement>(".winter-in-city .hw-question");
  const field = query<HTMLElement>(".winter-in-city .hw-panel input");

  // THE FLOOR.
  expect(sheet.scrollTop, "the sheet is already scrolled").toBe(0);
  expect(insideTheFold(question, sheet), "the question is cut off at 1024x580").toBe(true);
  expect(insideTheFold(field, sheet), "the answer field is cut off at 1024x580").toBe(true);

  /*
   * AND THE WHOLE SHEET FITS ITS OWN BOX WITHOUT A SCROLL, which is what the lead means by
   * "bleeding over". The pair that makes overflow impossible is a cap and a scroller, and this
   * is the stronger claim on top of it: at his window there is nothing to scroll to, because
   * what used to be down there has been cut rather than merely made reachable.
   */
  expect(
    sheet.scrollHeight - sheet.clientHeight,
    `${sheet.scrollHeight - sheet.clientHeight}px of the answering sheet is below its own fold at 1024x580`,
  ).toBeLessThanOrEqual(1);
  expect(sheet.getBoundingClientRect().bottom).toBeLessThanOrEqual(LEAD.height + 1);

  await shoot("1-question-1024x580");
});

/**
 * **THE SETTLEMENT AND THE ISLAND'S KEY ARE ONE COMPACT BLOCK**, and the key is all still there,
 * which is the half of the ask that is easy to satisfy by cheating.
 *
 * ## The literal ask was ONE ROW, and the reason it was asked for has gone
 *
 * The lead, with a screenshot of the bottom of the band bleeding off the foot of his window:
 * *"move it to be on the same line as the settlement description … just make the on the same line
 * so we dont tkae up more unnecessary vertical space"*. One row was the instrument; the vertical
 * budget was the point, and in a 94vw band there was width to spare for it.
 *
 * The panel is a LEFT SIDE PANEL now, half the screen wide and the full height of it, so the two
 * quantities have swapped: at 1024x580 the panel has 552px of height against the band's 290px, and
 * about 440px of content width against the band's 930px. The counts and a key with a swatch per
 * ground state come to well over the width available, so ONE ROW IS NO LONGER POSSIBLE at any type
 * size worth reading — and it is no longer worth buying, because the row it would save is a row of
 * a column with 300px of slack in it.
 *
 * So this asserts what the ask was FOR rather than the shape it arrived in: every state named with
 * its swatch, the key inside the strip, and the whole strip inside a bounded budget with the
 * panel's own way forward still above the fold. `?winter` and any viewport wide enough still get
 * the single row, because the flex rule is unchanged — what changed is that this file no longer
 * requires it at a width where it cannot happen.
 */
test("the settlement counts and the island's key are one compact block", async () => {
  await openCrisis(SPREAD);
  const strip = query<HTMLElement>(".hw-strip");
  const counts = query<HTMLElement>(".hw-strip__counts");
  const key = query<HTMLElement>(".winter-in-city__legend");

  // THE KEY IS INSIDE THE STRIP, which is what makes one row possible at all.
  expect(strip.contains(key), "the island's key is not on the settlement strip").toBe(true);

  /*
   * EVERY GROUND STATE SURVIVES. The lead was explicit that the key stays; a strip that had
   * dropped two entries to fit would satisfy every geometry assertion here.
   *
   * The count is DERIVED from the key's own table with a floor under it, and it was a hardcoded 4
   * until the ice front became a fifth state — a number that says nothing about whether the DOM
   * and the table agree, and that a real addition then failed as if it were a regression. The
   * floor is what stops an emptied table satisfying the derivation, and the names below are what
   * make it a claim about WHICH states rather than how many.
   */
  const entries = Array.from(key.querySelectorAll("li"));
  // FOUR since 2026-08-02: the "given up for good" entry went with the give-up-ground action, and a
  // key that named a state no board can reach would be worse than a shorter key. The floor is
  // lowered with the population rather than left where a key that dropped an entry would clear it.
  expect(ISLAND_LEGEND.length, "the island's key has lost entries").toBeGreaterThanOrEqual(
    4,
  );
  expect(entries, "the key renders fewer entries than it names").toHaveLength(
    ISLAND_LEGEND.length,
  );
  /*
    Read off each entry's own text NODE rather than its `textContent`: two entries carry an
    explanatory clause in a child span, and at this width the clause is folded away by a media
    query while staying in the DOM. `textContent` would report the folded text, and what this
    asserts is which states are named.
  */
  expect(
    entries.map((li) =>
      Array.from(li.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent?.trim())
        .join(""),
    ),
  ).toEqual(["the ice front", "frozen", "the frost line", "a fire is holding this"]);
  for (const entry of entries) {
    expect(
      entry.querySelector(".winter-in-city__swatch"),
      `${entry.textContent} lost its swatch`,
    ).not.toBeNull();
  }

  /*
    AND THE KEY IS STILL A ROW rather than the stacked column it replaced, which is the part of the
    ask the side panel does not take away. It was a `grid` with a 5px gap and four rows; it is a
    wrapping flex row, so its four entries share lines with each other even where they cannot share
    one with the counts.
  */
  const entryBoxes = entries.map((li) => li.getBoundingClientRect());
  const keyRows = new Set(entryBoxes.map((box) => Math.round(box.top)));
  expect(
    keyRows.size,
    `the key's four entries are on ${keyRows.size} rows, so it is stacking again`,
  ).toBeLessThanOrEqual(2);

  /*
    AND THE WHOLE STRIP IS INSIDE A TWO-ROW BUDGET. Four stacked legend rows plus a four-paragraph
    settlement panel was over 200px; the single row this replaced was under 60. Two rows of 13px
    text with the strip's own padding is about 76px, which is the ceiling here — a strip that went
    back to stacking its key would be over it, and so would one that grew a third row of counts.
  */
  const countsBox = counts.getBoundingClientRect();
  const keyBox = key.getBoundingClientRect();
  expect(countsBox.height, "the counts alone are stacking").toBeLessThan(40);
  expect(keyBox.top, "the key is above the counts").toBeGreaterThanOrEqual(countsBox.top);
  expect(
    strip.getBoundingClientRect().height,
    `the strip is ${Math.round(strip.getBoundingClientRect().height)}px tall, which is more than two rows`,
  ).toBeLessThan(80);

  // AND THE DEV CHROME IS GONE FROM THE PLAYER'S SCREEN. Read through `offsetParent`, because
  // `display: none` is how in-city hides them and a `textContent` sweep would not see it.
  const shell = panel();
  for (const [what, selector] of [
    ["the sandbox notice", ".hw-note--sandbox"],
    ["the round log", ".hw-log"],
    ["the dev panel", ".hw-panel--dev"],
    ["the step badges", ".hw-panel .section-index"],
    ["the prototype eyebrow", ".hw-header .micro-label"],
  ] as const) {
    for (const element of Array.from(shell.querySelectorAll<HTMLElement>(selector))) {
      expect(
        element.offsetParent === null && element.getClientRects().length === 0,
        `${what} is still drawn in-city`,
      ).toBe(true);
    }
  }

  await shoot("2-declare-1024x580");
});

/* ------------------------------------------------- 2. the concluding screen */

/** How many buildings each ending ruins, read off the card's own roll rather than written down. */
function outcomeRuins(_ending: Ending): number {
  return document.querySelectorAll('.hw-roll-tiles li[data-state="ruin"]').length;
}

type Ending = {
  readonly name: string;
  readonly city: readonly PlacedTransform[];
  readonly verdict: string;
  readonly play: () => Promise<void>;
};

/**
 * THREE ENDINGS, and three is the minimum that can support the claim.
 *
 * One screenshot cannot show that a screen reads honestly across a range. The clean run is the
 * case where a celebratory card would be fair; the mauled and the lost runs are the cases
 * D-CRISIS-26 is about, and they are where a fixed *"crisis complete!"* would be the game failing
 * to notice what happened.
 */
const ENDINGS: readonly Ending[] = [
  {
    name: "untouched",
    city: PACKED,
    verdict: "untouched",
    play: async () => {
      for (let round = 1; round <= HARD_WINTER.rounds; round += 1) {
        await playWitnessRound(round, 3);
      }
    },
  },
  {
    name: "mauled",
    city: PACKED,
    verdict: "mauled",
    play: async () => {
      /*
       * ONE FIRE HELD IN THE MIDDLE OF THE CLUSTER, every round, at two of three: three of the
       * six come through and three are lost, which is what `mauled` is for.
       *
       * This walked five fires outward until 2026-08-01. At `HARD_WINTER.damage.ruin_at: 2` the
       * walk loses all six, which grades `lost` and collides with the ending below it, so the
       * plan is the one a player with a partial score and no plan actually plays.
       * `winterConclusion.test.ts` carries the same fixture over the pure function.
       */
      const held = Array.from({ length: HARD_WINTER.rounds }, () => [-1, -1] as const);
      expect(held, "the plan is not a whole winter").toHaveLength(HARD_WINTER.rounds);
      for (const [index, [col, row]] of held.entries()) {
        await playRound(index + 1, 2, { kind: "fire", col, row });
      }
    },
  },
  {
    name: "lost",
    city: SPREAD,
    verdict: "lost",
    play: async () => {
      // Every round a wasted fire. Round one gave up the shoreline until 2026-08-02, which was the
      // most destructive opening the board offered; the action is gone and a whole winter answered
      // wrong is what reaches `lost` now.
      for (let round = 1; round <= HARD_WINTER.rounds; round += 1) {
        await playRound(round, 0, { kind: "fire", col: 0, row: 0 });
      }
    },
  },
];

for (const ending of ENDINGS) {
  test(`the conclusion reports a ${ending.name} winter honestly at 1024x580`, async () => {
    await openCrisis(ending.city);
    await ending.play();
    await waitFor(() => panel().dataset.phase === "ended", "the winter ends");
    await waitFor(
      () => document.querySelector(".hw-conclusion") !== null,
      "the card appears",
    );
    await document.fonts.ready;

    const card = conclusion();

    // IT IS THE ENDING THIS CASE CLAIMS TO BE, so the picture below is of the outcome it says.
    expect(
      card.dataset.verdict,
      `this play reached a ${card.dataset.verdict} winter, not a ${ending.verdict} one`,
    ).toBe(ending.verdict);

    /*
      THE MILESTONE IS ON THE CARD IN EVERY ENDING, AND IT IS NEVER THE HEADLINE.

      Those are two claims and the second is the one that matters here. This card may not be
      a victory card (D-CRISIS-26 lets a winter end with everything in ruins), so a
      celebratory sentence in the VERDICT slot would be the game failing to notice what
      happened. It is in the report column instead, at body weight, and the verdict beside it
      is still the derived one. Asserted per ending because "it reads honestly at the bottom
      of the range" is exactly the claim one picture of a clean run cannot support.
    */
    const milestone = query<HTMLElement>('[data-testid="hw-conclusion-milestone"]');
    expect(milestone.textContent).toBe(MILESTONE_FIRST_CRISIS);
    expect(card.contains(milestone), "the milestone is not on the card").toBe(true);
    expect(
      query<HTMLElement>(".hw-conclusion__verdict").textContent,
      `the ${ending.name} ending's headline is the milestone rather than the verdict`,
    ).not.toContain(MILESTONE_FIRST_CRISIS);
    expect(
      query<HTMLElement>(".hw-conclusion__eyebrow").textContent,
      "the milestone has taken over the event eyebrow",
    ).not.toContain(MILESTONE_FIRST_CRISIS);
    // And it is set no larger than the card's own body copy, so it cannot compete with the
    // verdict for the eye. Read as a computed size rather than as a class name.
    expect(
      Number.parseFloat(getComputedStyle(milestone).fontSize),
      "the milestone is set as a second headline",
    ).toBeLessThan(
      Number.parseFloat(getComputedStyle(query(".hw-conclusion__verdict")).fontSize),
    );

    /*
      IT IS AN EVENT AND NOT THE SURFACE'S LAST PANEL, which is D-CRISIS-30's first clause. The
      crisis HUD is gone from the screen, and the card is outside it.
    */
    expect(panel().contains(card), "the conclusion is still inside the crisis shell").toBe(
      false,
    );
    expect(
      panel().offsetParent === null && panel().getClientRects().length === 0,
      "the crisis band is still on screen behind the conclusion",
    ).toBe(true);
    /*
      AND THE SHELL IS STILL MOUNTED, which is not the same claim and is the one a `display:
      none` buys. `renderBoard` lives inside it, and unmounting it publishes `null` to the city,
      which would take the thawed ground, the ruins and the scars off the island the card is
      commenting on.
    */
    expect(published, "the crisis layer was withdrawn from the island").not.toBeNull();
    expect(published?.ended, "the island has not been told the winter ended").toBe(true);

    /*
      AND THE CARD AGREES WITH WHAT THE ISLAND IS DOING, which is D-CRISIS-30's fourth clause and
      the reason it is asserted here rather than left to `winterRevert.test.tsx`: that file proves
      `thawWinterRows` reverts a board, and this proves the board the CONCLUSION is standing over
      has been reverted, at the moment the conclusion is on screen.

      The frost is weather and is gone. The ruins and the given-up ground are damage and are not,
      which is exactly the split the card reports: it bills the ground the settlement gave up and
      never mentions the frost's own share.
    */
    const cells = (published?.rows ?? []).flat();
    expect(cells.length, "no board was published at all").toBeGreaterThan(0);
    expect(
      cells.filter((cell) => cell.frozen || cell.frost_line || cell.warded),
      "the island is still wearing the winter behind its own conclusion",
    ).toHaveLength(0);
    expect(
      published?.ruinedNodeIds.size,
      "the ruins the card lists are not on the island",
    ).toBe(outcomeRuins(ending));
    // **NO SCARRED GROUND SURVIVES THE THAW, because no winter can make any (2026-08-02).** This
    // asserted the opposite on the `lost` ending, whose plan opened with a pull-back; the action was
    // ruled out, so what is asserted is that the thawed board carries none — which is the direction
    // that catches a thaw shipping frozen ground across as damage.
    expect(
      published?.scarredCells,
      "the thawed board is carrying scarred ground a winter cannot produce",
    ).toEqual([]);

    /*
      IT DOES NOT COVER THE SETTLEMENT IT IS REPORTING ON.

      `winterFraming.ts` slides the city camera so the settlement is drawn in the strip the crisis
      panel leaves free, once for the whole encounter. So the strip's left edge is the same number
      the camera framed to, and this asserts the card's right edge is at or before it: the buildings
      the roll names are beside the card rather than behind it.
    */
    const box = card.getBoundingClientRect();
    const stripLeft = crisisPanelReach(LEAD);
    expect(
      box.right,
      `the conclusion reaches ${Math.round(box.right - stripLeft)}px into the strip the island is framed into`,
    ).toBeLessThanOrEqual(stripLeft);
    // And a real share of the screen is island, not a sliver.
    expect((LEAD.width - box.right) / LEAD.width).toBeGreaterThan(0.4);

    /*
      NOTHING BLEEDS OVER, at his window, in every ending. This is the assertion the lost case is
      hardest on: six ruin tiles, a given-up-ground line and a carry-back control.
    */
    expect(box.bottom).toBeLessThanOrEqual(LEAD.height + 1);
    expect(box.left).toBeGreaterThanOrEqual(-1);
    expect(box.right).toBeLessThanOrEqual(LEAD.width + 1);
    expect(
      getComputedStyle(card).overflowY,
      "the card cannot clip, so its cap can spill",
    ).not.toBe("visible");
    expect(card.scrollTop, "the card is already scrolled").toBe(0);
    // Its own way forward is visible without a scroll, which is the whole of "not anticlimactic":
    // a concluding screen has no next action to scroll toward.
    expect(
      insideTheFold(findButton(card, /New winter/), card),
      `the conclusion's own control is below its fold in the ${ending.name} ending`,
    ).toBe(true);

    /*
      AND EVERY BUILDING IS ON THE ROLL, with the state carried in a MARK as well as a tone. Three
      channels per tile, because INV-CRISIS-16 requires two and the mark is what makes the glance
      work at all.
    */
    const tiles = Array.from(card.querySelectorAll<HTMLElement>(".hw-roll-tiles li"));
    expect(tiles, "the damage list is not on the card").toHaveLength(
      WINTER_NODE_ORDER.length,
    );
    const marks = new Set<string>();
    const tones = new Set<string>();
    for (const tile of tiles) {
      expect(tile.dataset.state).toMatch(/^(whole|scarred|ruin)$/);
      const mark = tile.querySelector(".hw-roll-tiles__mark")?.textContent?.trim() ?? "";
      const word = tile.querySelector(".hw-roll-tiles__word")?.textContent?.trim() ?? "";
      expect(mark, "a tile carries its state in colour alone").toBeTruthy();
      expect(word, "a tile has no word for its state").toBeTruthy();
      /*
        KEYED ON THE MARK AND THE COLOUR THEMSELVES, not on `state:mark` pairs. The first shape of
        this assertion keyed the pairs, which made it decorative: two states sharing one colour
        still produce two distinct pairs, and pointing the scarred tone at the ruin tone passed.
        Keyed on the value, a collapse of two states onto one channel fails.
      */
      marks.add(mark);
      tones.add(getComputedStyle(tile).borderLeftColor);
    }

    /*
      THE TONE CHANNEL IS READ AS A COMPUTED COLOUR, not as a class name, and that is a fix for a
      measured defect. `.hw-conclusion` is a SIBLING of `.hw-shell` rather than a descendant of it,
      and this stylesheet's palette used to be declared on the shell alone: custom properties
      inherit down and not sideways, so every `var(--hw-*)` on the card resolved to the inherited
      ink. Measured at 1024x580 before the fix, the card's `border-top-color` was
      `oklch(0.25 0.035 225)` in the mauled and lost grades and so were the ruin and scarred tiles'
      rules — the tone channel dead in exactly the outcomes it exists to separate, while every
      assertion about marks and words carried on passing.
    */
    const accent = getComputedStyle(card).borderTopColor;
    expect(accent, "the card's accent fell back to the inherited ink").not.toBe(
      getComputedStyle(card).color,
    );
    expect(accent, "the card has no accent colour at all").toMatch(/^rgba?\(/);
    // One tone per state, and never the ink: a state map that collapsed to one colour would
    // satisfy every assertion above.
    const states = new Set(tiles.map((tile) => tile.dataset.state));
    expect(
      tones.size,
      `${states.size} building states resolve to only ${tones.size} tones: ${[...tones].join(", ")}`,
    ).toBe(states.size);
    for (const tone of tones) {
      expect(tone, "a tile's rule fell back to the inherited ink").not.toContain("oklch");
    }
    // And one mark per state, so the shape channel cannot collapse either.
    expect(
      marks.size,
      `${states.size} building states use only ${marks.size} marks: ${[...marks].join(" ")}`,
    ).toBe(states.size);

    await keepConclusion(`6-conclusion-milestone-${ending.name}-1024x580`);
  }, 120000);
}

/**
 * **THE THREE ENDINGS DO NOT ALL READ THE SAME**, asserted over the rendered cards rather than
 * over the pure function `winterConclusion.test.ts` already covers.
 *
 * That file proves the ladder; this proves the ladder reaches the screen. They are different
 * claims, and the second is the one a wiring mistake breaks: a card that took its headline from
 * a constant would pass every per-ending assertion above.
 */
test("the three endings put three different verdicts on the screen", async () => {
  const seen: string[] = [];
  for (const ending of ENDINGS) {
    await openCrisis(ending.city);
    await ending.play();
    await waitFor(() => panel().dataset.phase === "ended", "the winter ends");
    await waitFor(
      () => document.querySelector(".hw-conclusion") !== null,
      "the card appears",
    );
    const card = conclusion();
    const headline = query<HTMLElement>(".hw-conclusion__verdict").textContent ?? "";
    seen.push(headline);

    // The eyebrow is the EVENT and is the same in every outcome; the verdict is not.
    expect(query<HTMLElement>(".hw-conclusion__eyebrow").textContent).toBe(
      "The crisis is over",
    );
    // And no ending is congratulated for having lost something.
    if (ending.verdict !== "untouched") {
      expect(headline, `the ${ending.name} ending reads as a win`).not.toMatch(
        /complete|congratulations|well done|victory/i,
      );
    }
    // Overall accuracy is on every card, which the panel this replaced never mentioned at all.
    expect(card.textContent).toMatch(/You answered \d+ of \d+ right/);
    h?.cleanup();
    h = null;
  }
  expect(new Set(seen).size, seen.join(" | ")).toBe(ENDINGS.length);
}, 240000);
