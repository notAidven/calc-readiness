import { EARN } from "@cr/economy";
import { capacityForNode, hardWinterRepairPrices } from "@cr/game";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import {
  createDevSessionStore,
  type DevSessionStorage,
  withDevPersistence,
} from "../devPersistence/devSession";
import { createInMemoryEconomyClient } from "../economy/economySession";
import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { snapshotWithWinterDamage } from "../winter/scarLiveCity";
import { CitySurface } from "./CitySurface";
import { createCityDevSession } from "./citySession";
import { type RepairTarget, repairCrisisDamage } from "./crisisRepair";
import { CURRENT_ERA_ID } from "./eraDressing";
import { MILESTONE_CITY_RECOVERED } from "./milestones";

import "../styles.css";

/**
 * **WHAT THE TWO NEW LINES LOOK LIKE ON THE LEAD'S OWN WINDOW, over the real island.**
 *
 * `cityTellsWhatItKnows.test.tsx` proves both lines reach the DOM. That is not evidence
 * about where they SIT or what they cover: a claim about how much room a card leaves and
 * whether the island is still visible behind it is a claim about a rendered frame, and a
 * jsdom assertion cannot answer it at any viewport.
 *
 * ## 1024x580, and the frame is the whole viewport
 *
 * That is the lead's window, measured from his own screenshot of the crisis panel bleeding
 * off the bottom of it (`three/winterConclusionSheet.browser.test.tsx` carries the note).
 * Every capture here is the WHOLE viewport rather than the element that changed: cropped to
 * the callout, a picture proves nothing about the island behind it, and the island is the
 * part anybody doubted.
 *
 * ## The assertions that run in CI, and the pictures that do not
 *
 * The geometry is asserted unconditionally — the callout stays inside the window, and a real
 * share of the frame is still island rather than a sliver — because a spatial regression must
 * fail on every run. The CAPTURES are behind `VITE_WINTER_SHOTS`, following
 * `crisisAdvisorOverIsland.browser.test.tsx`: a full shadow-mapped scene with seven GLBs is
 * heavy, and a heavy scene left on in this suite starves an animation-timing assertion in a
 * different file rather than failing here.
 *
 *   VITE_WINTER_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/city/cityTellsWhatItKnows.browser.test.tsx
 *
 * ## THE FRAMES ARE COMMITTED, and they were not
 *
 * They went to `apps/web/src/city/__screenshots__/city-says/`, and `.gitignore` ignores
 * `__screenshots__` at any depth, so every frame this file has ever taken was unreachable by
 * everyone except the machine that took it. A shot nobody can open is not evidence in a
 * review, which is the reason `docs/design-refs/crisis-panel-width/` and then
 * `docs/design-refs/advisor-wardrobe/` were put where they are. This writes beside them, and
 * `docs/design-refs/city-says-what-it-knows/README.md` is the index.
 *
 * The residual is the wardrobe file's and is inherited rather than solved: this file writes
 * the frames, never reads them, and is off by default, so nothing in CI notices one being
 * deleted. A guard that read the directory would be worse than the hole it closed, because
 * `invariants.yml`'s scope filter classifies `.png` inert and a frame-deleting diff would
 * skip the step that checked.
 *
 * ## Two captures per frame, because a WebGL canvas photographs STALE under an overlay
 *
 * The finding is `winterIslandVisible.browser.test.tsx`'s and is reused rather than
 * rediscovered: a CDP capture taken with an overlay above the canvas comes back with a stale
 * canvas layer, and the first clipped capture is drawn before the device-metrics override
 * settles. So each shot is preceded by a throwaway capture and a settle.
 */

const SHOTS = Boolean(import.meta.env.VITE_WINTER_SHOTS);

/** The lead's own window. Every measurement and every picture here is taken at it. */
const LEAD = { width: 1024, height: 580 } as const;

const FRAMES = "docs/design-refs/city-says-what-it-knows";

/**
 * What the frames measured, in the file a reviewer reads beside them.
 *
 * The `advisor-wardrobe` precedent, and it is load-bearing for one claim in particular: the
 * completion ANNOUNCEMENT is a `visually-hidden` live region, so no frame can show its
 * sentence and it would be a substitution to imply one does. The frame shows what a sighted
 * learner sees at that beat and this file carries what a screen-reader user is told.
 */
const measured: string[] = [];

const PRICES = hardWinterRepairPrices();

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(() => {
  restore = { width: window.innerWidth, height: window.innerHeight };
});

afterAll(async () => {
  if (SHOTS && measured.length > 0) {
    if (SHOTS) {
      await commands.writeFile(
        `${FRAMES}/measured-${LEAD.width}x${LEAD.height}.txt`,
        `${measured.join("\n")}\n`,
      );
    }
  }
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

function memStorage(): DevSessionStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

function query<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`nothing matched ${selector}`);
  }
  return found;
}

function named(label: RegExp | string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll("button")).find((button) => {
    const name = (button.getAttribute("aria-label") ?? button.textContent ?? "").trim();
    return typeof label === "string" ? name === label : label.test(name);
  });
}

/**
 * Click a button, and FAIL HERE if it is not on the screen.
 *
 * `named(...)?.click()` was the shape before, and the optional chain is why the CI failure
 * this file shipped with read *"the recovery milestone never rendered"*: a button that was
 * never there clicks nothing, and the next `waitFor` then times out blaming the thing the
 * click would have produced. The two causes need different fixes and the message named the
 * wrong one, so the miss is raised where it happens.
 */
function press(target: Element, key: string): void {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
  );
}

function click(label: RegExp | string): void {
  const button = named(label);
  if (!button) {
    const all = Array.from(document.querySelectorAll("button"))
      .map((b) => (b.getAttribute("aria-label") ?? b.textContent ?? "").trim())
      .filter((name) => name.length > 0);
    throw new Error(`no button matched ${String(label)}; on screen: ${all.join(" | ")}`);
  }
  button.click();
}

/**
 * How long a post-click wait gets.
 *
 * The harness default is 4000ms and every other wait in this file is already given 30000,
 * because a shadow-mapped scene with seven GLBs on a contended two-core runner is nothing
 * like a developer's machine. The two clicks below were the only waits left on the default,
 * and both blow through it there: `invariants.yml` run 30723153031 failed at *"the recovery
 * milestone never rendered"*, and forcing the same contention locally (24 busy loops over 8
 * cores) takes the milestone from **456ms to 8362ms** and times out the roster wait too.
 * Nothing about the surface changed; the budget was measured on the wrong machine.
 */
const AFTER_A_CLICK = 30000;

async function openBuiltShelf(): Promise<void> {
  if (!document.querySelector(".build-shop")) {
    click("Build");
    await waitFor(
      () => document.querySelector(".build-shop") !== null,
      "the Build dialog did not open",
      AFTER_A_CLICK,
    );
  }
  const summary = document.querySelector<HTMLButtonElement>(".build-shop-built-toggle");
  if (!summary) {
    throw new Error("the Build dialog has no Built summary");
  }
  if (summary.getAttribute("aria-expanded") !== "true") {
    summary.click();
  }
}

function testViewportBox(): { x: number; y: number; width: number; height: number } {
  const frameElement = window.frameElement as HTMLElement | null;
  if (!frameElement) {
    throw new Error("not running inside vitest's tester iframe, so nothing can be clipped");
  }
  const box = frameElement.getBoundingClientRect();
  const outer = window.parent as Window;
  return {
    x: box.left + outer.scrollX,
    y: box.top + outer.scrollY,
    width: box.width,
    height: box.height,
  };
}

/** The composited frame, clipped to this test's viewport, as a base64 PNG. */
async function capture(): Promise<string> {
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const box = testViewportBox();
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 },
  });
  if (!shot.data) {
    throw new Error("CDP returned no screenshot data");
  }
  return shot.data;
}

async function keep(name: string, shot: string): Promise<void> {
  if (SHOTS) {
    await commands.writeFile(`${FRAMES}/${name}.png`, shot, { encoding: "base64" });
  }
}

async function decode(base64: string): Promise<Sample> {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("the screenshot did not decode"));
    image.src = `data:image/png;base64,${base64}`;
  });
  const sink = document.createElement("canvas");
  sink.width = image.naturalWidth;
  sink.height = image.naturalHeight;
  const ctx = sink.getContext("2d");
  if (!ctx) {
    throw new Error("no 2D context to sample the frame with");
  }
  ctx.drawImage(image, 0, 0);
  return {
    data: ctx.getImageData(0, 0, sink.width, sink.height).data,
    width: sink.width,
    height: sink.height,
  };
}

type Sample = { data: Uint8ClampedArray; width: number; height: number };

/**
 * Differing pixels between two captures, at `eraAdvanceOnTheIsland`'s own tolerance of 12 per
 * channel so shadow dither along an edge that did not move is not counted as a change.
 *
 * `within` restricts the count to a rectangle, in CSS pixels of the captured viewport. That
 * is what lets one claim be about the card changing and a separate one be about the island
 * behind it not changing, instead of one whole-frame number that answers neither.
 */
function differs(
  a: Sample,
  b: Sample,
  within?: { x: number; y: number; width: number; height: number },
): number {
  const box = within ?? { x: 0, y: 0, width: a.width, height: a.height };
  const scale = a.width / LEAD.width;
  let differing = 0;
  for (
    let y = Math.round(box.y * scale);
    y < Math.round((box.y + box.height) * scale);
    y++
  ) {
    for (
      let x = Math.round(box.x * scale);
      x < Math.round((box.x + box.width) * scale);
      x++
    ) {
      const at = (y * a.width + x) * 4;
      const dr = Math.abs((a.data[at] ?? 0) - (b.data[at] ?? 0));
      const dg = Math.abs((a.data[at + 1] ?? 0) - (b.data[at + 1] ?? 0));
      const db = Math.abs((a.data[at + 2] ?? 0) - (b.data[at + 2] ?? 0));
      if (dr > 12 || dg > 12 || db > 12) {
        differing += 1;
      }
    }
  }
  return differing;
}

/**
 * A rectangle of nothing but island, to the right of everything the crossing touches.
 *
 * The card ends at x=682, the roster at x≈320, the camera controls begin at x≈950, the
 * lighting and Menu chips sit above y=60 and the Build button below y=500. So this band is
 * island, water and the island's own props, and under `reducedMotion` it is the region whose
 * diff the gull finding took to zero.
 */
const ISLAND_ONLY = { x: 700, y: 70, width: 240, height: 410 } as const;

function settle(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Wait for the island to be drawn and for the first clipped capture to have settled. */
async function islandReady(): Promise<void> {
  await waitFor(
    () => document.querySelector(".city-viewport canvas") !== null,
    "the city canvas never mounted",
    30000,
  );
  await waitFor(() => named("Menu") !== undefined, "the city's Menu button appears", 30000);
  await document.fonts.ready;
  // The GLBs resolve behind their own Suspense boundaries, so a first frame is a bare
  // island; there is no renderer handle out here to count against.
  await settle(3000);
  await capture();
  await settle(800);
}

/**
 * The Dwellings alone, practised to mastery 1: built, holding its ten, one tier under the bar.
 *
 * The fixture for the CROSSING rather than for the mastered state, which is the only fixture
 * the announcement beat exists in: `complete` is `mastery >= 2` and the effect fires on that
 * boolean going true, so a city that mounts already mastered celebrates nothing by design.
 */
async function practisedCity() {
  const store = createDevSessionStore({
    storage: memStorage(),
    enabled: true,
    debounceMs: 0,
  });
  const session = withDevPersistence(createCityDevSession(), store);
  await session.placeSkill("NUM.2", { col: -3, row: 2, rot: 0 });
  await session.advanceMasteryDev("NUM.2", 1);
  store.flush();
  return session;
}

/** Every skill placed and mastered, so every building holds the people it can. */
async function masteredCity() {
  const store = createDevSessionStore({
    storage: memStorage(),
    enabled: true,
    debounceMs: 0,
  });
  const session = withDevPersistence(createCityDevSession(), store);
  const cells: Readonly<Record<string, { col: number; row: number }>> = {
    "NUM.S": { col: 2, row: 2 },
    "NUM.F": { col: 0, row: 3 },
    "NUM.2": { col: -3, row: 2 },
    "NUM.3": { col: 3, row: -2 },
    "NUM.4": { col: -3, row: -2 },
    "NUM.5": { col: 0, row: -3 },
  };
  for (const [nodeId, cell] of Object.entries(cells)) {
    await session.placeSkill(nodeId, { ...cell, rot: 0 });
    await session.advanceMasteryDev(nodeId, 3);
  }
  store.flush();
  return session;
}

/** One ruined building, no scarred ground, and a wallet that can pay for the repair. */
async function damagedCity() {
  const store = createDevSessionStore({
    storage: memStorage(),
    enabled: true,
    debounceMs: 0,
  });
  const built = withDevPersistence(createCityDevSession(), store);
  await built.placeSkill("NUM.2", { col: -3, row: 2, rot: 0 });
  await built.advanceMasteryDev("NUM.2", 3);
  await Promise.resolve();
  store.flush();

  const saved = store.load();
  if (saved === null) {
    throw new Error("the fixture city did not save");
  }
  store.save(snapshotWithWinterDamage(saved, { buildings: ["NUM.2"], cells: [] }));
  store.flush();
  const restored = store.load();
  if (restored?.crisis_damage === undefined) {
    throw new Error("the fixture damage did not save");
  }

  const session = withDevPersistence(createCityDevSession(restored), store);
  const economy = createInMemoryEconomyClient(null);
  const perSet = EARN.interleaved.material;
  let funded = 0;
  for (let index = 0; funded < PRICES.per_building; index += 1) {
    await economy.reportInterleavedClear({ sessionId: `seed-${index}` });
    funded += perSet;
  }
  const onRepairRuin = (target: RepairTarget) =>
    repairCrisisDamage(
      {
        damage: session.crisisDamage,
        economy,
        clearBuilding: session.repairRuinedBuilding,
        clearCell: session.reclaimRuinedCell,
        clearCivic: session.liftSuspendedCivic,
        eraId: CURRENT_ERA_ID,
      },
      target,
    );
  return { session, onRepairRuin, funded };
}

/**
 * **THE CONTRIBUTION LINE, on the callout, over the island the building stands on.**
 *
 * The spatial claims are the two a new line inside an existing card can break: the card
 * grows past the bottom of a 580px window, and the card covers the island it is anchored to.
 */
test("the contribution line leaves the island visible at 1024x580", async () => {
  await page.viewport(LEAD.width, LEAD.height);
  const session = await masteredCity();
  h = mount(
    <CitySurface
      enableCanvas
      loadCity={session.load}
      onPlaceSkill={session.placeSkill}
      onOpenSurface={() => undefined}
    />,
  );
  await islandReady();

  await openBuiltShelf();
  await waitFor(
    () => document.querySelector('button.city-plot[data-node-id="NUM.2"]') !== null,
    "the roster lists the Dwellings",
    AFTER_A_CLICK,
  );
  query<HTMLElement>('button.city-plot[data-node-id="NUM.2"]').click();
  await waitFor(
    () => document.querySelector(".building-callout-gives") !== null,
    "the contribution line never rendered",
    AFTER_A_CLICK,
  );
  await document.fonts.ready;
  await settle(500);

  // IT IS THE REAL FIGURE, so the picture below is of the claim and not of a placeholder.
  const gives = query<HTMLElement>(".building-callout-gives");
  expect(gives.textContent).toBe("Homes for 26 of your people.");

  // AND THE WHOLE CALLOUT IS INSIDE HIS WINDOW. The line is one more paragraph in a card
  // that is anchored to a building and clamped to the viewport, so the thing it can break
  // is exactly this.
  const card = query<HTMLElement>(".building-callout-card");
  const box = card.getBoundingClientRect();
  expect(
    box.bottom,
    `${Math.round(box.bottom - LEAD.height)}px below the fold`,
  ).toBeLessThanOrEqual(LEAD.height + 1);
  expect(box.top).toBeGreaterThanOrEqual(-1);
  expect(box.right).toBeLessThanOrEqual(LEAD.width + 1);
  expect(box.left).toBeGreaterThanOrEqual(-1);
  // The card is not scrolled and has nothing hidden below its own fold.
  expect(card.scrollHeight - card.clientHeight).toBeLessThanOrEqual(1);
  // AND A REAL SHARE OF THE FRAME IS STILL ISLAND. The callout is a popup over a city,
  // not a screen: a card taking most of a 1024x580 window would have replaced the view.
  const share = (box.width * box.height) / (LEAD.width * LEAD.height);
  expect(
    share,
    `the callout covers ${Math.round(share * 100)}% of the window`,
  ).toBeLessThan(0.35);

  if (SHOTS) {
    measured.push(
      `1-callout-contribution: callout ${Math.round(box.width)}x${Math.round(box.height)} at ` +
        `(${Math.round(box.left)},${Math.round(box.top)}), ${Math.round(share * 100)}% of the window, ` +
        `line "${gives.textContent ?? ""}"`,
    );
    await keep("1-callout-contribution-1024x580", await capture());
  }
}, 120000);

/**
 * **THE 10-TO-26 JUMP, PHOTOGRAPHED ON BOTH SIDES OF THE BEAT IT HAPPENS ON.**
 *
 * §4.5 calls the announcement *"the more valuable half, because it is the only way the
 * 10-to-26 jump is ever felt as an event rather than noticed later"*, and the half that had
 * never been photographed at all. What a picture can answer here is the pair of things a
 * measurement cannot: that the sentence a learner reads really does change on the crossing,
 * and that the frame around it is otherwise the city they were already looking at.
 *
 * ## THE MOUNT IS `reducedMotion`, and that is the difference between a diff and noise
 *
 * `StarterIsland`'s gulls are the only whole-frame thing on the render clock, and
 * `work-log/gabe/2026-08-02-the-photograph-guard-cannot-be-fixed-by-its-floor.md` measured
 * them at up to **0.88% of the whole frame** between two captures of a scene in which nothing
 * had changed. A comparison over that is a coin toss dressed as evidence. Under the prop the
 * same pairs went to **exactly zero differing pixels in seven of eight**, so this is mounted
 * reduced and the diff below is attributable to the card rather than to a bird.
 *
 * ## IT IS SKIPPED WITHOUT `VITE_WINTER_SHOTS`, and that is a measured cost rather than caution
 *
 * The other two tests here take one heavy scene each and this file's head already records what
 * a heavy scene does in this suite: it starves an animation-timing assertion in a DIFFERENT
 * file. A third one crossed that line, and it was reproduced rather than suspected. On the full
 * browser run with this test always-on, `three/cityFraming.browser.test.tsx` fails at *"the
 * island runs off the bottom edge, grass-30 at 1024x580: expected 1 to be greater than 11.6"*;
 * run on its own it is green; run as a pair with just this file it fails again, at the other
 * case in the same family. The renderer even reports `Context Lost` mid-run. So the scene is
 * the cause and the framing guard is the victim.
 *
 * **Gating it costs nothing that is not already asserted somewhere better**, which is the only
 * reason this is the right fix rather than a retreat. Every always-on claim it would make —
 * the callout's figure before and after, and the announcement reaching the live region — is
 * made by `cityTellsWhatItKnows.test.tsx` in jsdom, on the same real surface and the same real
 * session, with no canvas and no contention. What is left here is the part only a picture can
 * carry, so this is a frame-capture test and is gated like one, exactly as
 * `advisorWardrobeShots` and `eraAdvanceOnTheIsland` gate theirs.
 *
 * ## AND THE ANNOUNCEMENT'S OWN SENTENCE IS NOT IN THE PICTURE, which is said rather than hidden
 *
 * The completion announcement goes to a `visually-hidden` live region, because it is what a
 * screen-reader user is told at a beat a sighted learner sees as a bounce. So no frame can
 * show that sentence, and cropping or captioning one to imply it does would be exactly the
 * substitution the QA rule is about. The frame carries what is visible; the live region's
 * verbatim text goes to `measured-1024x580.txt` beside it, and the always-on assertion here
 * reads it out of the DOM.
 */
test.skipIf(!SHOTS)(
  "the jump from 10 to 26 changes the frame, and is spoken, at 1024x580",
  async () => {
    await page.viewport(LEAD.width, LEAD.height);
    const session = await practisedCity();
    h = mount(
      <CitySurface
        enableCanvas
        reducedMotion
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
        onDevAdvanceMastery={session.advanceMasteryDev}
        onOpenSurface={() => undefined}
      />,
    );
    await islandReady();

    const capacity = capacityForNode("NUM.2");
    const polite = query<HTMLElement>('[data-testid="city-live-polite"]');
    // THE FLOOR under the spoken assertion: the mastered figure is nowhere in the live region
    // on a city that merely loaded, so what arrives there later is the crossing.
    expect(polite.textContent).not.toContain(
      `Homes for ${capacity.residence_mastered} of your people`,
    );

    await openBuiltShelf();
    await waitFor(
      () => document.querySelector('button.city-plot[data-node-id="NUM.2"]') !== null,
      "the roster lists the Dwellings",
      AFTER_A_CLICK,
    );
    query<HTMLElement>('button.city-plot[data-node-id="NUM.2"]').click();
    await waitFor(
      () => document.querySelector(".building-callout-gives") !== null,
      "the contribution line never rendered before the crossing",
      AFTER_A_CLICK,
    );
    await document.fonts.ready;
    await settle(500);

    const beforeText = query<HTMLElement>(".building-callout-gives").textContent ?? "";
    expect(beforeText).toBe(
      `Homes for ${capacity.residence_built} of your people, and ${capacity.residence_mastered} at mastery.`,
    );
    const beforeShot = await capture();
    if (SHOTS) {
      await keep("2-before-the-crossing-1024x580", beforeShot);
    }

    // THE CROSSING, through the surface's own practice control. The dev panel is an overlay
    // over the card, so the callout is closed for the click and reopened for the frame: both
    // pictures are then the same surface state, and what differs between them is the sentence.
    press(query<HTMLElement>(".building-callout"), "Escape");
    await waitFor(
      () => document.querySelector(".building-callout") === null,
      "the callout stayed open over the dev panel",
      AFTER_A_CLICK,
    );
    click("Menu");
    await waitFor(
      () => named("Advance mastery") !== undefined,
      "the dev panel never offered the practice control",
      AFTER_A_CLICK,
    );
    click("Advance mastery");

    // SPOKEN, and the whole sentence: this is the announcement half, read out of the region a
    // screen-reader user actually gets rather than off the function that composes it.
    await waitFor(
      () =>
        (polite.textContent ?? "").includes(
          `Homes for ${capacity.residence_mastered} of your people.`,
        ),
      "the crossing was never announced",
      AFTER_A_CLICK,
    );
    const spoken = polite.textContent ?? "";
    expect(spoken).toContain("is built.");

    press(query<HTMLElement>(".city-menu-popover"), "Escape");
    await waitFor(
      () => named("Advance mastery") === undefined,
      "the dev panel stayed over the card the frame is of",
      AFTER_A_CLICK,
    );
    // The roster's own toggle, anchored: when it is open a "Close buildings list" control is
    // on screen too, and an unanchored match takes whichever comes first in the DOM.
    if (document.querySelector('button.city-plot[data-node-id="NUM.2"]') === null) {
      await openBuiltShelf();
    }
    await waitFor(
      () => document.querySelector('button.city-plot[data-node-id="NUM.2"]') !== null,
      "the roster stopped listing the Dwellings",
      AFTER_A_CLICK,
    );
    query<HTMLElement>('button.city-plot[data-node-id="NUM.2"]').click();
    await waitFor(
      () =>
        document.querySelector(".building-callout-gives")?.textContent ===
        `Homes for ${capacity.residence_mastered} of your people.`,
      "the callout never took the mastered figure",
      AFTER_A_CLICK,
    );
    await document.fonts.ready;
    await settle(500);

    const afterShot = await capture();
    if (SHOTS) {
      await keep("3-after-the-crossing-1024x580", afterShot);
    }

    // AND THE FRAME ACTUALLY MOVED. A sentence changing inside a card is a small diff, so the
    // floor is small; what it rules out is the frame not changing at all, which is what a
    // callout that kept its old figure would look like.
    const before = await decode(beforeShot);
    const after = await decode(afterShot);
    const changed = differs(before, after);
    expect(
      changed,
      `${changed} pixels differ across the crossing, which is a card that did not repaint`,
    ).toBeGreaterThan(200);

    /*
    AND THE ISLAND BEHIND IT DID NOT REDRAW, which is the half a whole-frame number cannot
    answer and the half worth asserting. Read against the pair of frames rather than argued:
    the whole-frame diff is about 11%, and looking at the two pictures says what that is made
    of — the sentence itself, the MASTERED counter going 0/6 to 1/6, a mastery star filling
    over the building, and the roster scrolling the selected row into view. Every one of those
    is the product working. A whole-frame ceiling tight enough to be interesting would fail on
    the roster scroll, and one loose enough to pass it stops distinguishing "a card changed"
    from "the view was replaced" at all.

    So the ceiling is on a band that holds none of them. Under `reducedMotion` the gulls are
    posed still, so an unchanged island here is a near-zero reading rather than a small one,
    and a crossing that re-rendered the scene has nowhere to hide.
  */
    const island = differs(before, after, ISLAND_ONLY);
    const islandPixels = ISLAND_ONLY.width * ISLAND_ONLY.height;
    expect(
      island / islandPixels,
      `the crossing repainted ${island} of the island band's ${islandPixels} pixels`,
    ).toBeLessThan(0.02);

    if (SHOTS) {
      measured.push(
        `2-before-the-crossing: callout line "${beforeText}"`,
        `3-after-the-crossing: callout line "${document.querySelector(".building-callout-gives")?.textContent ?? ""}"`,
        `3-after-the-crossing: ANNOUNCED (visually-hidden live region) "${spoken}"`,
        `3-after-the-crossing: ${changed} px differ from frame 2 over the whole window ` +
          `(${((changed / (LEAD.width * LEAD.height)) * 100).toFixed(2)}%), of which ${island} ` +
          `fall in the island-only band ${ISLAND_ONLY.x},${ISLAND_ONLY.y} ` +
          `${ISLAND_ONLY.width}x${ISLAND_ONLY.height}; mounted reducedMotion`,
      );
    }
  },
  120000,
);

/**
 * **THE RECOVERY MILESTONE, in the slot the damage panel has just vacated.**
 *
 * The claim a picture is owed here is that the sentence lands where the button was, over a
 * city that is visibly whole again, and takes no more room than the panel it replaced.
 */
test("the recovery milestone stands where the damage panel was, at 1024x580", async () => {
  await page.viewport(LEAD.width, LEAD.height);
  const { session, onRepairRuin, funded } = await damagedCity();
  h = mount(
    <CitySurface
      enableCanvas
      loadCity={session.load}
      onPlaceSkill={session.placeSkill}
      onRepairRuin={onRepairRuin}
      goldAvailable={funded}
      onOpenSurface={() => undefined}
    />,
  );
  await islandReady();

  // THE ISLAND IN RUINS FIRST, so the pair of frames shows what changed.
  const panel = query<HTMLElement>(".hud-repairs");
  const panelBox = panel.getBoundingClientRect();
  if (SHOTS) {
    await keep("4-crisis-damage-before-1024x580", await capture());
  }

  // THE NOTE TAKES ITSELF AWAY (`RECOVERY_NOTE_MS`, 7000ms), so nothing slow may sit
  // between it appearing and it being measured — the window is the product's, not the
  // test's, and spending it on a prelude is what turned a slow runner into a red one. The
  // font wait is hoisted above the click (`islandReady` already awaited it, and no font
  // loads on a repair) and `.hud-milestone` has no entry transition to settle, so one
  // layout tick is all the measurement below needs.
  await document.fonts.ready;
  click(new RegExp(`Repair for ${PRICES.per_building}`));
  await waitFor(
    () => document.querySelector('[data-testid="city-milestone"]') !== null,
    "the recovery milestone never rendered",
    AFTER_A_CLICK,
  );
  await settle(100);

  const note = document.querySelector<HTMLElement>('[data-testid="city-milestone"]');
  if (note === null) {
    throw new Error(
      "the recovery milestone rendered and then expired before it could be measured, so " +
        "this run says nothing about where it sits; it is a 7000ms window and this " +
        "machine was too slow to measure inside it",
    );
  }
  expect(note.textContent).toBe(MILESTONE_CITY_RECOVERED);
  // The panel it replaced is gone rather than sitting beside it.
  expect(document.querySelector(".hud-repairs")).toBeNull();

  const box = note.getBoundingClientRect();
  // SAME ANCHOR AS THE PANEL: the sentence is where the button the player pressed was.
  expect(
    Math.abs(box.right - panelBox.right),
    "the note moved off the panel's edge",
  ).toBeLessThan(2);
  // AND IT IS SMALLER THAN WHAT IT REPLACED, which is what "no new surface" looks like
  // measured. A milestone that grew chrome would be a badge.
  expect(
    box.height,
    `the note is ${Math.round(box.height)}px tall against the panel's ${Math.round(panelBox.height)}px`,
  ).toBeLessThan(panelBox.height);
  expect(box.bottom).toBeLessThanOrEqual(LEAD.height + 1);
  expect(box.top).toBeGreaterThanOrEqual(-1);
  // A real share of the frame is island, not chrome.
  const share = (box.width * box.height) / (LEAD.width * LEAD.height);
  expect(share, `the note covers ${Math.round(share * 100)}% of the window`).toBeLessThan(
    0.12,
  );

  if (SHOTS) {
    measured.push(
      `4-crisis-damage-before: repair panel ${Math.round(panelBox.width)}x${Math.round(panelBox.height)} at ` +
        `(${Math.round(panelBox.left)},${Math.round(panelBox.top)})`,
      `5-recovery-milestone: note ${Math.round(box.width)}x${Math.round(box.height)} at ` +
        `(${Math.round(box.left)},${Math.round(box.top)}), ${Math.round(share * 100)}% of the window, ` +
        `line "${note.textContent ?? ""}"`,
    );
    await keep("5-recovery-milestone-1024x580", await capture());
  }
}, 120000);
