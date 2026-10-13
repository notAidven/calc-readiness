import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { CitySurface } from "./CitySurface";
import { crisisBriefingFor, forgetCrisisBriefingRead } from "./crisisCall";
import { CURRENT_ERA_ID } from "./eraDressing";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/**
 * SCREENSHOTS OF THE ADVISOR'S DIALOGUE, at the game's real camera, because "engaging" is a
 * claim only a picture supports.
 *
 * Not a visual-regression suite: nothing here compares against a stored baseline, so it
 * cannot fail on a colour tweak and there is no snapshot to update. Its only assertions are
 * that a shot was actually taken and that the surface it photographed was the one it meant
 * to — which is what stops it reporting success over an empty run or five pictures of slide
 * one. `crisisCall.browser.test.tsx` is the file that MEASURES the dialogue; this one reads
 * it.
 *
 * **The 3D canvas is off here, and that is a deliberate division of labour.** This file
 * photographs the WORDS: every slide of the walkthrough, and the state a returning player
 * lands in. `crisisAdvisorOverIsland.browser.test.tsx` is the file that photographs the
 * COMPOSITION over a live island, at the lead's own window, and it is the one to read for
 * anything about how much of the city the advisor leaves showing. A shot list with the
 * canvas on would be slower and no better at reading a slide.
 *
 * **The game's real camera** means the whole `CitySurface` at a laptop viewport with the real
 * stylesheets and the real HUD, reached the way the demo operator reaches it (☰ Menu → Hard
 * Winter), not a component on a bare page.
 *
 * **The PNGs are deliberately NOT committed.** They land under `__screenshots__/`, which
 * `.gitignore` already excludes for the whole tree. Regenerate them with
 *
 *   npx vitest run --config vitest.browser.config.ts apps/web/src/city/crisisCallShots.browser.test.tsx
 *
 * and read them out of `apps/web/src/city/__screenshots__/crisis-call/`.
 */

let h: Harness | null = null;

/** A laptop. The headless default is phone-shaped, where the city's HUD never binds. */
const DESKTOP = { width: 1440, height: 900 };
let restore: { width: number; height: number } | null = null;

const briefing = (() => {
  const found = crisisBriefingFor(CURRENT_ERA_ID);
  if (found === null) {
    throw new Error("era one has no briefing, so this whole file proves nothing");
  }
  return found;
})();

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(DESKTOP.width, DESKTOP.height);
});

afterAll(async () => {
  forgetCrisisBriefingRead();
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

async function shoot(name: string): Promise<void> {
  await document.fonts.ready;
  // The card pops in from `scale(0.86)` over 200ms. A transformed box photographs small and
  // in the wrong place, so shoot at rest.
  await new Promise<void>((resolve) => setTimeout(resolve, 520));
  if (CAPTURE_EVIDENCE) {
    const path = await page.screenshot({ path: `__screenshots__/crisis-call/${name}.png` });
    expect(path, `no screenshot was written for ${name}`).toBeTruthy();
  }
}

function named(label: RegExp | string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll("button")).find((button) => {
    const name = (button.getAttribute("aria-label") ?? button.textContent ?? "").trim();
    return typeof label === "string" ? name === label : label.test(name);
  });
}

/**
 * Open the advisor through the PRODUCTION path the demo operator uses: ☰ Menu → Hard Winter.
 *
 * That entry goes through the crisis call rather than around it, so this is the same card a
 * learner meets when the crisis announces itself, and it is reachable below the trigger,
 * which is what makes it usable from a fresh city.
 */
async function openAdvisor(): Promise<HTMLElement> {
  h?.cleanup();
  // `onOpenSurface` is what mounts the ☰ Menu's "Other places" nav, and the Hard Winter entry
  // lives in it. A no-op here: this file photographs the card, and nothing needs to leave the
  // city to do it.
  h = mount(<CitySurface enableCanvas={false} onOpenSurface={() => undefined} />);

  await waitFor(
    () => named("Menu") !== undefined,
    "the city's ☰ Menu button appears",
    60_000,
  );
  named("Menu")?.click();
  await waitFor(
    () => named(/Hard Winter/i) !== undefined,
    "the Hard Winter entry appears",
    60_000,
  );
  named(/Hard Winter/i)?.click();
  await waitFor(
    () => document.querySelector('[data-testid="crisis-call-advisor"]') !== null,
    "the advisor card opens",
    60_000,
  );
  return document.querySelector('[data-testid="crisis-call-advisor"]') as HTMLElement;
}

test("photographs the speech bubble and every slide of the walkthrough", {
  timeout: 180_000,
}, async () => {
  forgetCrisisBriefingRead();
  const card = await openAdvisor();

  // The shot is of the card it claims to be: the advisor's own line, in the bubble.
  const bubble = card.querySelector<HTMLElement>(".crisis-call-speech__bubble");
  expect(bubble?.textContent ?? "").toContain(briefing.lead);
  await shoot("1-bubble-and-slide-1");

  // ...and then each slide, named by the slide that is actually on screen rather than by the
  // number of times Next was pressed. Without this the four PNGs could all be slide one.
  for (let index = 1; index < briefing.slides.length; index += 1) {
    const next = document.querySelector<HTMLButtonElement>(
      '[data-testid="crisis-call-next"]',
    );
    expect(next?.disabled, `Next was already held at slide ${index}`).toBe(false);
    next?.click();
    await new Promise<void>((resolve) => setTimeout(resolve, 80));
    const slide = document.querySelector<HTMLElement>('[data-testid="crisis-call-slide"]');
    const expected = briefing.slides[index];
    expect(slide?.dataset.slide, `slide ${index + 1} did not open`).toBe(expected?.id);
    expect(slide?.textContent ?? "").toContain(
      `Step ${index + 1} of ${briefing.slides.length}`,
    );
    await shoot(`${index + 1}-slide-${index + 1}-${expected?.id}`);
  }
});

test("photographs what a returning player gets: the advisor, and one button", async () => {
  // The state the demo operator lands in from the second entry onward. Reached by having read
  // the walkthrough, not by writing the flag by hand, so the picture is of a state the app
  // can actually get into.
  forgetCrisisBriefingRead();
  await openAdvisor();
  for (let index = 1; index < briefing.slides.length; index += 1) {
    document.querySelector<HTMLButtonElement>('[data-testid="crisis-call-next"]')?.click();
    await new Promise<void>((resolve) => setTimeout(resolve, 60));
  }

  const card = await openAdvisor();
  expect(card.textContent ?? "").toContain(briefing.lead);
  expect(document.querySelector('[data-testid="crisis-call-slide"]')).toBeNull();
  expect(
    document
      .querySelector('[data-testid="crisis-call-walkthrough-toggle"]')
      ?.getAttribute("aria-expanded"),
  ).toBe("false");
  await shoot("6-returning-player-collapsed");
  forgetCrisisBriefingRead();
});
