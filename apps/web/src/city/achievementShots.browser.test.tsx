import { NO_CRISIS_DAMAGE } from "@cr/game";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  test,
  vi,
} from "vitest";
import { commands, page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { ACHIEVEMENTS } from "./achievements";
import { CitySurface } from "./CitySurface";
import { MOCK_NODE_STATES } from "./mockCity";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "./townHall";
import type { CityLoad } from "./types";
import { resetCityEra, setCityEra } from "./useCityEra";
import { BUILDABLE_RADIUS, defaultPlacements, type PlacedTransform } from "./worldLayout";

import "../styles.css";

/**
 * **THE ACHIEVEMENTS ON A REAL SCREEN: the moment, and the list with a mix on it.**
 *
 * `CitySurface.achievements.test.tsx` measures the DOM, and a DOM assertion says nothing
 * about whether the moment reads as a moment or as a toast that got in the way. **1024x580**
 * is the lead's own window and the only viewport either surface is judged at: the card's
 * scrolling well is `max-height: min(52vh, 420px)`, which is 420px on a tall monitor and
 * about **300px here**, and the moment sits in a corner the HUD is already using.
 *
 * ## What is asserted, and what is only photographed
 *
 * **Asserted.** That the moment leaves the HUD's own furniture uncovered at this viewport,
 * that every row of the list is fully inside the visible well, and that the list is a real
 * mix rather than four rows in one state. Those are the spatial claims, read off
 * `getBoundingClientRect` at the real viewport rather than off the stylesheet.
 *
 * **Photographed, not asserted.** Whether it feels like a moment. There is no baseline, so
 * nothing here can fail on a colour, and the shots are the evidence a reviewer reads. They
 * are of the WHOLE viewport: a shot cropped to the card would prove nothing about what it
 * covers, and what it covers is the entire question about the moment.
 *
 * ## THE 3D CANVAS IS OFF, and the frames are honest about what that means
 *
 * Headless Chromium has no reliable WebGL on this runner, so what sits behind these panels
 * is the city's CSS backdrop and its full HUD rather than the rendered island. Every city
 * browser shot in this tree is taken the same way. It is the right frame for the question
 * being asked — the moment's neighbours are HUD elements, not terrain — and it is the wrong
 * frame for judging the moment against the island's own colour, which is a look nobody can
 * take here.
 *
 * ## ⚑ THE SHOTS ARE BEHIND `VITE_ACHIEVEMENT_SHOTS`, AND THAT IS MEASURED RATHER THAN CAUTIOUS
 *
 * Five `CitySurface` mounts in one always-on file is exactly the load
 * `cityTellsWhatItKnows.browser.test.tsx` records itself being gated for: *"a third [heavy
 * scene] crossed that line, and it was reproduced rather than suspected. On the full browser
 * run with this test always-on, `three/cityFraming.browser.test.tsx` fails."* The same thing
 * happened here on the first full run with these five ungated — two timing assertions in
 * `advisorBandOverTheIsland.browser.test.tsx` went red at *"the shortfall is 238.0px"*, in a
 * file this branch does not touch, and both passed in isolation and on the re-run. A feature
 * that is not on the demo's critical path has no business making a two-core runner's
 * animation-timing assertions a coin toss.
 *
 * **So the SPATIAL ASSERTIONS stay always-on and the pictures do not.** The one test outside
 * the gated blocks mounts the city ONCE and carries every claim the design rests on: where
 * the moment sits, what it does not cover, and that all four rows fit the well at 1024x580.
 * One mount is not what starved anything. The gated blocks below repeat those measurements
 * beside the shots, so the frames come with their own numbers.
 *
 * Take the frames with
 *
 *   VITE_ACHIEVEMENT_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/city/achievementShots.browser.test.tsx
 *
 * and read them out of `apps/web/src/city/__screenshots__/achievements/`, which `.gitignore`
 * excludes for the whole tree. `docs/design-refs/achievements/README.md` is the index, and
 * carries the command that copies them there.
 */

/** Off in the ordinary browser gate. See the header for what it cost when it was not. */
const SHOTS = Boolean(import.meta.env.VITE_ACHIEVEMENT_SHOTS);

/** The lead's window. Not a developer's monitor, which is where any of this looks fine. */
const VIEWPORT = { width: 1024, height: 580 };

/** What `docs/Deployment.md` bakes into the shipped SPA, so the dev hatch is off. */
const DEPLOYED_API = "https://calc-readiness.example/api/diagnostic";

/** Where the PNGs and the measurements land. Gitignored, like every `__screenshots__`. */
const SHOT_DIR = "apps/web/src/city/__screenshots__/achievements";

/**
 * What the frames measured, in a file a reviewer reads beside them.
 *
 * The `city-says-what-it-knows` precedent, and it carries the one thing no picture can: the
 * moment's own box and share of the window, and the verbatim sentence, so a reviewer can
 * check the frame against the numbers rather than eyeballing both.
 *
 * It is written into the gitignored shots directory rather than straight into
 * `docs/design-refs/`, deliberately: `test/testWritesStayOutOfTheTree.test.ts` requires a
 * write onto a tracked path to sit behind a `VITE_` shot flag, and this suite has no such
 * flag because it is cheap enough to be always-on. The frames are copied into `docs/` by the
 * command in that directory's README, which is where the copy belongs when the writer is
 * unflagged.
 */
const measured: string[] = [];

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(VIEWPORT.width, VIEWPORT.height);
});

afterAll(async () => {
  resetCityEra();
  if (measured.length > 0) {
    if (SHOTS) {
      await commands.writeFile(
        `${SHOT_DIR}/measured-${VIEWPORT.width}x${VIEWPORT.height}.txt`,
        `${measured.join("\n")}\n`,
      );
    }
  }
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  h?.cleanup();
  h = null;
  vi.unstubAllEnvs();
  resetCityEra();
  localStorage.clear();
});

const HALL: PlacedTransform = { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM };

function eraIdAt(position: number): EraId {
  const era = ERA_SEQUENCE[position - 1];
  if (!era) {
    throw new Error(`ERA_SEQUENCE has no era ${position}`);
  }
  return era.id;
}

/** A city a learner in era `through` would plausibly have, on the real auto-layout. */
function cityThrough(through: number): PlacedTransform[] {
  return defaultPlacements(
    ERA_SEQUENCE.slice(0, through).flatMap((era) => era.nodes),
    [HALL],
    BUILDABLE_RADIUS,
  );
}

function loadWith(
  placements: readonly PlacedTransform[],
  over: Partial<CityLoad> = {},
): () => Promise<CityLoad> {
  return () =>
    Promise.resolve({
      node_states: MOCK_NODE_STATES,
      placements,
      town_hall: HALL,
      ...over,
    });
}

/**
 * The city, standing where the shot needs it.
 *
 * WRAPPED IN `.city-shell`, WHICH IS NOT DECORATION: `App.tsx` renders the city inside it
 * and that element is where `--game-harbor`, `--game-panel` and `--glass-fill` are DEFINED,
 * so a bare mount resolves every one of them to nothing and photographs a card the backdrop
 * shows straight through. The Album's own shot file found that by taking the shot, before
 * the 2026-08-04 cut took both.
 */
async function city(eraPosition: number, loadCity: () => Promise<CityLoad>): Promise<void> {
  h?.cleanup();
  setCityEra(eraIdAt(eraPosition));
  h = mount(
    <div className="city-shell">
      {/* `reducedMotion` explicitly, so the shots are the state the rule asks for rather
          than whatever the runner's own preference happens to be. */}
      <CitySurface enableCanvas={false} reducedMotion loadCity={loadCity} />
    </div>,
  );
  await waitFor(
    () =>
      Array.from(document.querySelectorAll("button")).some(
        (b) => (b.getAttribute("aria-label") ?? b.textContent ?? "").trim() === "Menu",
      ),
    "the city's ☰ Menu button appears",
    12000,
  );
}

async function openList(): Promise<HTMLElement> {
  Array.from(document.querySelectorAll("button"))
    .find((b) => (b.getAttribute("aria-label") ?? b.textContent ?? "").trim() === "Menu")
    ?.click();
  await waitFor(
    () => document.querySelector('[data-testid="menu-achievements"]') !== null,
    "the Achievements menu item appears",
  );
  document.querySelector<HTMLButtonElement>('[data-testid="menu-achievements"]')?.click();
  await waitFor(
    () => document.querySelector('[data-testid="achievements-panel"]') !== null,
    "the achievements card opens",
  );
  return document.querySelector('[data-testid="achievements-panel"]') as HTMLElement;
}

async function shoot(name: string): Promise<void> {
  await document.fonts.ready;
  // The card pops in from `scale(0.86)` over 200ms and the moment rises over 320ms; a
  // transformed box photographs small and in the wrong place, so shoot at rest.
  await new Promise<void>((resolve) => setTimeout(resolve, 460));
  if (SHOTS) {
    const path = await page.screenshot({
      path: `__screenshots__/achievements/${name}.png`,
    });
    expect(path, `no screenshot was written for ${name}`).toBeTruthy();
  }
}

/** One box, in the form the measurements file records it. */
function recordBox(name: string, what: string, el: Element, line?: string): void {
  const rect = el.getBoundingClientRect();
  const share = (rect.width * rect.height) / (VIEWPORT.width * VIEWPORT.height);
  measured.push(
    `${name}: ${what} ${Math.round(rect.width)}x${Math.round(rect.height)} at ` +
      `(${Math.round(rect.left)},${Math.round(rect.top)}), ` +
      `${Math.round(share * 100)}% of the window` +
      (line === undefined ? "" : `, line "${line}"`),
  );
}

/** Does `a` overlap `b` at all? The occlusion question, as a rectangle intersection. */
function overlaps(a: DOMRect, b: DOMRect): boolean {
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  );
}

/** How much of `inner` sits inside `outer`, as a fraction of `inner`'s own height. */
function verticalOverlap(inner: DOMRect, outer: DOMRect): number {
  const top = Math.max(inner.top, outer.top);
  const bottom = Math.min(inner.bottom, outer.bottom);
  return inner.height === 0 ? 0 : Math.max(0, bottom - top) / inner.height;
}

/**
 * The HUD furniture the moment may never sit on top of.
 *
 * It takes itself away after eight seconds and cannot be dismissed, so anything it covers is
 * unreachable for that whole time. Each is READ rather than assumed to exist, so a renamed
 * HUD element fails the assertion instead of turning it into an absence over nothing.
 */
const MUST_STAY_CLEAR: readonly [string, string][] = [
  ["the ☰ Menu and the era chips", ".hud-top-right"],
  ["the Town capsule", ".hud-top-left"],
  ["the Build dock", ".hud-dock"],
  ["the camera controls", ".hud-camera-cluster"],
];

/** Where the moment sits, and what it must not be on top of. */
function assertMomentFits(note: HTMLElement): DOMRect {
  const box = note.getBoundingClientRect();
  // It is ON SCREEN, all of it. A card whose bottom is past the fold is a moment nobody
  // sees, which is the failure this viewport exists to catch.
  expect(box.top, "the moment is above the viewport").toBeGreaterThanOrEqual(0);
  expect(
    box.bottom,
    `the moment's bottom is at ${Math.round(box.bottom)}px of ${VIEWPORT.height}`,
  ).toBeLessThanOrEqual(VIEWPORT.height);
  expect(box.left).toBeGreaterThanOrEqual(0);
  expect(box.right).toBeLessThanOrEqual(VIEWPORT.width);
  // And it is not enormous: a note that took a third of a 580px window would be a panel.
  expect(box.height, `the moment is ${Math.round(box.height)}px tall`).toBeLessThan(110);

  for (const [what, selector] of MUST_STAY_CLEAR) {
    const el = document.querySelector<HTMLElement>(selector);
    expect(el, `${what} (${selector}) is not on this surface any more`).not.toBeNull();
    const other = (el as HTMLElement).getBoundingClientRect();
    expect(other.width, `${what} has no size`).toBeGreaterThan(0);
    expect(
      overlaps(box, other),
      `the moment covers ${what} for the eight seconds it is up`,
    ).toBe(false);
  }
  return box;
}

/** Every row of the open card, fully inside its own scrolling well. */
function assertEveryRowFits(card: HTMLElement): {
  readonly rows: HTMLElement[];
  readonly wellBox: DOMRect;
} {
  const rows = Array.from(card.querySelectorAll<HTMLElement>("[data-achievement]"));
  expect(rows.length, "the card has no rows").toBe(ACHIEVEMENTS.length);
  const well = card.querySelector<HTMLElement>(".achievements-body");
  expect(well, "the card has no scrolling well").not.toBeNull();
  const wellBox = (well as HTMLElement).getBoundingClientRect();
  for (const row of rows) {
    expect(
      verticalOverlap(row.getBoundingClientRect(), wellBox),
      `${row.dataset.achievement} is cut off by the ${Math.round(wellBox.height)}px well`,
    ).toBeGreaterThanOrEqual(0.999);
  }
  const cardBox = (card.querySelector(".coc-card") as HTMLElement).getBoundingClientRect();
  expect(cardBox.top).toBeGreaterThanOrEqual(0);
  expect(cardBox.bottom).toBeLessThanOrEqual(VIEWPORT.height);
  return { rows, wellBox };
}

/**
 * **THE ONE ALWAYS-ON TEST, and one mount, which is why it is one test.**
 *
 * Every spatial claim the design rests on, at the only viewport that matters, without taking
 * a picture: where the moment sits, what it does not cover, and that all four rows fit the
 * well. The header says why the pictures are gated and this is not.
 *
 * It is a single mount doing both halves deliberately rather than for tidiness. Era two over
 * the demo island earns two rows off real state, which is simultaneously the moment worth
 * measuring and the mixed list worth measuring, so splitting it would double the cost of the
 * thing that had to be made cheap.
 */
test(`the moment and the list both fit ${VIEWPORT.width}x${VIEWPORT.height}`, async () => {
  await city(2, loadWith(cityThrough(2)));
  await waitFor(
    () => document.querySelector('[data-testid="city-achievement"]') !== null,
    "the moment appears",
    8000,
  );
  const note = document.querySelector('[data-testid="city-achievement"]') as HTMLElement;
  assertMomentFits(note);

  const card = await openList();
  const { rows } = assertEveryRowFits(card);
  // And it really is a mix, so "every row fits" is not a measurement of four identical rows.
  const earned = rows.filter((row) => row.dataset.earned === "true");
  expect(earned.length, "no row is earned").toBeGreaterThan(0);
  expect(rows.length - earned.length, "every row is earned").toBeGreaterThan(0);
});

describe.skipIf(!SHOTS)(
  `the achievement moment at ${VIEWPORT.width}x${VIEWPORT.height}`,
  () => {
    /**
     * THE MOMENT, EARNED RATHER THAN FIRED.
     *
     * The city is standing in its second age, which is a real state the advance ceremony
     * leaves, so the card on screen is the shipped earning path and not a preview of it.
     */
    it("photographs a real earning over the city, and covers none of the HUD", async () => {
      await city(2, loadWith(cityThrough(2)));
      await waitFor(
        () => document.querySelector('[data-testid="city-achievement"]') !== null,
        "the moment appears",
        8000,
      );
      const note = document.querySelector(
        '[data-testid="city-achievement"]',
      ) as HTMLElement;
      const earned = ACHIEVEMENTS.find((a) => a.id === "first-age");
      expect(note.textContent, "the moment is not the era row's").toContain(earned?.earned);

      assertMomentFits(note);
      recordBox(
        "moment-earned",
        "the moment",
        note,
        note.querySelector(".achievement-note__line")?.textContent ?? "",
      );
      measured.push(
        `moment-earned: clear of ${MUST_STAY_CLEAR.map(([what]) => what).join(", ")}`,
      );
      await shoot("moment-earned-1024x580");
    });

    /**
     * AND OVER A CITY WITH A CRISIS PANEL UP, which is the busiest right-hand side the island
     * ever has: the repair panel takes the vertical middle and the recovery note takes the slot
     * under it. Two of the four rows are earned in exactly that state.
     */
    it("photographs the moment over a damaged city, where the HUD is busiest", async () => {
      await city(
        2,
        loadWith(cityThrough(2), {
          crisis_damage: {
            ...NO_CRISIS_DAMAGE,
            next_damage_id: NO_CRISIS_DAMAGE.next_damage_id + 1,
            ruined_buildings: [{ node_id: "NUM.F", damage_id: "d1" }],
          },
        }),
      );
      await waitFor(
        () => document.querySelector('[data-testid="city-achievement"]') !== null,
        "the moment appears",
        8000,
      );
      const note = document.querySelector(
        '[data-testid="city-achievement"]',
      ) as HTMLElement;
      const box = note.getBoundingClientRect();

      // The repair panel really is up, so this frame is the busy case it claims to be.
      const repairs = document.querySelector<HTMLElement>(".hud-repairs");
      expect(
        repairs,
        "the crisis repair panel is not up, so this is not the busy case",
      ).not.toBeNull();
      expect(
        overlaps(box, (repairs as HTMLElement).getBoundingClientRect()),
        "the moment covers the crisis repair panel",
      ).toBe(false);

      recordBox(
        "moment-over-a-damaged-city",
        "the moment",
        note,
        note.querySelector(".achievement-note__line")?.textContent ?? "",
      );
      recordBox("moment-over-a-damaged-city", "the repair panel", repairs as HTMLElement);
      await shoot("moment-over-a-damaged-city-1024x580");
    });
  },
);

describe.skipIf(!SHOTS)(
  `the achievements list at ${VIEWPORT.width}x${VIEWPORT.height}`,
  () => {
    /**
     * THE LIST A LEARNER SEES, with the dev hatch gated off by the deployed endpoint so the
     * frame is the product rather than the instrument.
     */
    it("photographs a mix of earned and unearned, every row on screen", async () => {
      vi.stubEnv("VITE_DIAGNOSTIC_API_URL", DEPLOYED_API);
      // Era two and the demo island's mastery-3 node: two rows earned off real state, and the
      // two crisis rows still invitations. That is the state every learner is in for most of
      // the game and the one a completion fraction would be tempting on.
      await city(2, loadWith(cityThrough(2)));
      await waitFor(
        () => document.querySelector('[data-testid="city-achievement"]') !== null,
        "something is earned",
        8000,
      );
      const card = await openList();

      // THE MIX IS REAL, asserted before it is photographed: a frame of four identical rows
      // would look like a list and show nothing about the two states. The fit is the same
      // helper the always-on test uses, so the frame comes with the measurement behind it.
      const { rows, wellBox } = assertEveryRowFits(card);
      const earned = rows.filter((row) => row.dataset.earned === "true");
      expect(earned.length, "no row is earned, so this is not a mix").toBeGreaterThan(0);
      expect(
        rows.length - earned.length,
        "every row is earned, so this is not a mix",
      ).toBeGreaterThan(0);

      // The dev hatch is gated off, which is what makes this the learner's frame.
      expect(card.querySelector('[data-testid="ach-dev"]')).toBeNull();

      recordBox("list-mixed", "the card", card.querySelector(".coc-card") as HTMLElement);
      measured.push(
        `list-mixed: well ${Math.round(wellBox.height)}px tall, all ${rows.length} rows fully inside it`,
        ...rows.map(
          (row) =>
            `list-mixed: ${row.dataset.achievement} ${row.dataset.earned === "true" ? "EARNED" : "NOT YET"} ` +
            `"${row.querySelector(".achievements-row__line")?.textContent ?? ""}"`,
        ),
      );
      await shoot("list-mixed-1024x580");
    });

    it("photographs a list with nothing earned yet, which every new city has", async () => {
      vi.stubEnv("VITE_DIAGNOSTIC_API_URL", DEPLOYED_API);
      // Every mastery stripped, so the demo island's own mastery-3 node does not earn a row.
      await city(
        1,
        loadWith([], {
          node_states: MOCK_NODE_STATES.map((state) => ({ ...state, mastery: 0 as const })),
        }),
      );
      const card = await openList();
      const rows = Array.from(card.querySelectorAll<HTMLElement>("[data-achievement]"));
      expect(rows.length).toBe(ACHIEVEMENTS.length);
      expect(rows.every((row) => row.dataset.earned === "false")).toBe(true);
      await shoot("list-nothing-earned-1024x580");
    });

    it("photographs the dev hatch a reviewer reaches it by", async () => {
      vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
      await city(1, loadWith(cityThrough(1)));
      const card = await openList();
      const dev = card.querySelector<HTMLElement>('[data-testid="ach-dev"]');
      expect(dev, "the dev hatch is not on the card in a local build").not.toBeNull();
      // A button per row, derived from the table, plus the reset.
      for (const achievement of ACHIEVEMENTS) {
        expect(
          card.querySelector(`[data-testid="ach-dev-fire-${achievement.id}"]`),
          `${achievement.id} has no fire button`,
        ).not.toBeNull();
      }
      expect(card.querySelector('[data-testid="ach-dev-forget"]')).not.toBeNull();
      /*
      SCROLLED TO THE END BEFORE THE SHOT, because the instrument sits at the foot of the
      same well the rows are in and at this viewport it is below the fold. That is fine for
      a dev control and useless in a frame: the first shot taken here showed its eyebrow and
      cut off every button. The rows-fit assertion belongs to the LEARNER's list and is made
      in the test above, where the hatch is gated off.
     */
      const well = card.querySelector<HTMLElement>(".achievements-body");
      if (well) {
        well.scrollTop = well.scrollHeight;
      }
      await shoot("list-with-dev-hatch-1024x580");
    });
  },
);
