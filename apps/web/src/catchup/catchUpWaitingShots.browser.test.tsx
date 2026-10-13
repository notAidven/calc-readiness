import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { createCityDevSession } from "../city/citySession";
import { CitySurface } from "../city/CitySurface";
import { resetCityEra } from "../city/useCityEra";
import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { seedPlacingAtEra } from "./eraPlacement";

import "../styles.css";

/**
 * **THE "NO ROOM YET" NOTICE, PHOTOGRAPHED ON THE REAL CITY AT THE LEAD'S OWN WINDOW.**
 *
 * The lead reported *"i dont think 'let the city place the era's buildings for me' button
 * works."* It does; what it never did was SAY when the island had no room left, because the
 * shortfall went out through `CitySurface`'s `setPolite`, a `visually-hidden` `aria-live` region.
 * `catchUpSaysWhenItCannotSeat.test.tsx` is the reproduction and was red before the notice
 * existed. **This is the other half**, and `.cursor/rules/qa-verification.mdc` is why it is a
 * separate claim: a line added to a bottom-anchored well is a spatial change, and the last time
 * this surface grew by one line the three roads went **70px below the fold of a 580px window**
 * while every dimension assertion stayed green.
 *
 * ## TWO SHORTCUTS, BOTH DECLARED, BECAUSE EACH REPLACED SOMETHING THAT DID NOT WORK
 *
 * 1. **The count comes from `waitingOverride`.** The shortfall used to arise at the FOURTH
 *    handed age — the disc seated 6, 5, 5 and then 2 of the fourth age's 5 — and reaching it
 *    meant three real foundings at the shipped 45 to 60 seconds each. A version of this test
 *    that walked there **timed out at 300 seconds**. #544 moved the shortfall out to the NINTH
 *    handed age, so walking to it is now eight foundings rather than three and the seam is more
 *    necessary, not less. It overrides the count and nothing else: the sentence, its placement
 *    and the surfaces it appears on are the shipped ones, and the count itself is measured with
 *    no seam in the path by `catchUpSaysWhenItCannotSeat.test.tsx`, which walks the whole nine
 *    ages on the real session and reads three.
 * 2. **It is the real `CitySurface`**, not `CityCatchUp` on its own. A version that mounted the
 *    walk inside a hand-built `.city-shell` was fast and produced a frame in which **none of the
 *    design tokens resolved**: pale blue type on pale blue panel, true about the boxes and
 *    useless about whether a person can read it — which is the only question a frame is here to
 *    answer.
 *
 * Clipped to the whole window rather than to the well, because cropped to the element that
 * changed a screenshot proves nothing about occlusion.
 */

/**
 * WRITING THE TRACKED FRAMES IS BEHIND A FLAG, and it is `catchUpShots.browser.test.tsx`'s OWN
 * flag rather than a second one: both files photograph the same surface, so one switch should
 * regenerate both and a reviewer should not have to discover two.
 *
 * `test/testWritesStayOutOfTheTree.test.ts` requires it — a test that rewrote
 * `docs/design-refs/` on every CI run would leave the checkout dirty and make an unrelated diff
 * look like a frame changed. The assertions below run unconditionally, so what CI keeps is the
 * claim; the pictures are regenerated deliberately.
 *
 *   VITE_CATCHUP_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/catchup/catchUpWaitingShots.browser.test.tsx
 */
const SHOTS = Boolean(import.meta.env.VITE_CATCHUP_SHOTS);

/** The lead's actual window. Short, which is where a bottom-anchored well costs the most. */
const HIS_WINDOW = { width: 1024, height: 580 } as const;

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(() => {
  restore = { width: window.innerWidth, height: window.innerHeight };
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

beforeEach(() => {
  localStorage.clear();
  resetCityEra();
});

afterEach(() => {
  h?.cleanup();
  h = null;
  resetCityEra();
  localStorage.clear();
});

function query<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`nothing matched ${selector}`);
  }
  return found;
}

/** Inherited from `catchUpShots.browser.test.tsx`: vitest scales the tester iframe. */
function testViewportBox(): {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
} {
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
    scale: box.height / window.innerHeight,
  };
}

async function shoot(name: string): Promise<void> {
  await document.fonts.ready;
  const box = testViewportBox();
  expect(
    box.scale,
    `the tester iframe is scaled to ${box.scale.toFixed(3)}, so this frame is not a 1024x580 screen`,
  ).toBeCloseTo(1, 1);
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: {
      x: box.x,
      y: box.y,
      width: Math.min(box.width, HIS_WINDOW.width),
      height: Math.min(box.height, HIS_WINDOW.height),
      scale: 1,
    },
  });
  expect(shot.data, `no screenshot data for ${name}`).toBeTruthy();
  // Each destination is written at its own call with its directory as a LITERAL rather than
  // looped over a conditionally-built array. `test/testWritesStayOutOfTheTree.test.ts` resolves
  // every write destination statically to decide whether it lands in the tree, and a ternary is
  // not a shape it resolves: the first version of this file failed it as *"writes path … Name the
  // directory as a literal, or teach resolveDestination the shape"*. `catchUpShots.browser.test.tsx`
  // had already been taught the same lesson and this matches its answer rather than inventing a
  // second one.
  if (SHOTS) {
    await commands.writeFile(
      `apps/web/src/catchup/__screenshots__/catch-up-waiting/${name}.png`,
      shot.data,
      { encoding: "base64" },
    );
  }
  // The throwaway settles the device-metrics override and is a picture of an unsettled frame, so
  // it stays in the gitignored `__screenshots__` and out of the folder a reviewer reads.
  if (SHOTS && !name.startsWith("00-")) {
    if (SHOTS) {
      await commands.writeFile(`docs/design-refs/catch-up-waiting/${name}.png`, shot.data, {
        encoding: "base64",
      });
    }
    if (SHOTS) {
      await commands.writeFile(`output/catch-up-waiting-${name}.png`, shot.data, {
        encoding: "base64",
      });
    }
  }
}

test("photographs the notice on the prompt, with every road still above the fold", {
  timeout: 120000,
}, async () => {
  await page.viewport(HIS_WINDOW.width, HIS_WINDOW.height);

  const session = createCityDevSession();
  // Six ages handed over, which is the shape of the lead's own report, and 13 is the number
  // the layout actually leaves waiting at that placement (32 roster, 19 seated).
  const seed = seedPlacingAtEra(ERA_SEQUENCE[6]?.id as EraId);
  session.seedFromPlacement(
    seed,
    Object.keys(seed).filter((nodeId) => (seed[nodeId] ?? 0) >= 2),
  );

  h = mount(
    <CitySurface
      loadCity={session.load}
      reducedMotion
      onMoveTownHall={session.moveTownHall}
      onPlaceSkill={session.placeSkill}
      onMoveSkill={session.moveSkill}
      onOpenSurface={() => undefined}
      pretestPlacement={seed}
      catchUpWaitingOverride={13}
    />,
  );

  // The diagnostic reward lands first (`catchUpYieldsToTheReward.test.tsx`), so dismiss it
  // exactly as a learner does before the walk can open.
  await waitFor(
    () => document.querySelector(".unlock-reward") !== null,
    "the diagnostic reward opens",
    20000,
  );
  const start = [
    ...query<HTMLElement>(".unlock-reward").querySelectorAll<HTMLButtonElement>("button"),
  ].find((button) => /Start building/i.test(button.textContent ?? ""));
  if (!start) {
    throw new Error("the reward has no primary action to dismiss it with");
  }
  start.click();

  await waitFor(
    () => document.querySelector('[data-testid="catchup-prompt"]') !== null,
    "the catch-up opens on the first handed age",
    20000,
  );
  await waitFor(
    () => document.querySelector(".city-viewport canvas") !== null,
    "the city canvas mounts",
    30000,
  );
  // The GLBs resolve behind their own Suspense boundaries, and the first clipped capture puts
  // a device-metrics override on the page which R3F reads as a resize. Both inherited.
  await new Promise<void>((resolve) => setTimeout(resolve, 2500));
  await shoot("00-throwaway");
  await new Promise<void>((resolve) => setTimeout(resolve, 700));

  const notice = query<HTMLElement>('[data-testid="catchup-waiting"]');
  expect(notice.textContent).toMatch(/13 buildings had no room on the island yet/);
  expect(notice.textContent).toMatch(/waiting in the build menu/);
  // INSIDE THE WINDOW, which is the spatial claim this frame is for.
  expect(notice.getBoundingClientRect().bottom).toBeLessThanOrEqual(HIS_WINDOW.height);
  // AND SO IS EVERY ROAD, measured on the BUTTONS rather than on the well — which is the
  // substitution that hid the last defect this surface had.
  //
  // ⚑ THE ROADS ARE READ OFF THE PROMPT, AND THEY USED TO BE A WRITTEN-DOWN THREE. §10.19
  // replaced `place_it_myself` and `let_the_city_place_it` with a single `keep_going`. A list
  // that names roads cannot notice a road it has stopped naming, and "is anything below the
  // fold" is exactly the question that has to cover ALL of them — so the population comes from
  // the rendered prompt, with a floor so an empty query cannot pass this by measuring nothing.
  const roads = [
    ...document.querySelectorAll<HTMLButtonElement>('[data-testid^="catchup-choose-"]'),
  ];
  expect(roads.length, "the prompt offered no roads to measure").toBeGreaterThanOrEqual(2);
  for (const button of roads) {
    const road = button.getAttribute("data-testid") ?? "";
    expect(
      button.getBoundingClientRect().bottom,
      `${road} is below the fold of a ${HIS_WINDOW.height}px window`,
    ).toBeLessThanOrEqual(HIS_WINDOW.height);
    expect(button.disabled).toBe(false);
  }
  await shoot("01-prompt-with-the-notice");

  /* ---- and on the founding, which is where the learner is looking the instant they press */

  query<HTMLButtonElement>('[data-testid="catchup-choose-keep_going"]').click();
  // D-ERA18 puts the FIRST handed age in the learner's hands, so the accept road opens the
  // hand-placing step before the founding. The notice rides that surface too — which is the
  // property being relied on here rather than assumed, so it is asserted in passing.
  await waitFor(
    () =>
      document.querySelector('[data-testid="catchup-placing"]') !== null ||
      document.querySelector('[data-testid="catchup-founding"]') !== null,
    "the accept road opens either the hand-placing step or the founding",
    20000,
  );
  const placing = document.querySelector<HTMLElement>('[data-testid="catchup-placing"]');
  if (placing !== null) {
    const onPlacing = query<HTMLElement>('[data-testid="catchup-waiting"]');
    expect(onPlacing.textContent).toMatch(/waiting in the build menu/);
    expect(onPlacing.getBoundingClientRect().bottom).toBeLessThanOrEqual(HIS_WINDOW.height);
    query<HTMLButtonElement>('[data-testid="catchup-placing-done"]').click();
  }
  await waitFor(
    () => document.querySelector('[data-testid="catchup-founding"]') !== null,
    "the founding starts",
    20000,
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 900));
  const onFounding = query<HTMLElement>('[data-testid="catchup-waiting"]');
  expect(onFounding.textContent).toMatch(/waiting in the build menu/);
  expect(onFounding.getBoundingClientRect().bottom).toBeLessThanOrEqual(HIS_WINDOW.height);
  await shoot("02-founding-with-the-notice");
});
