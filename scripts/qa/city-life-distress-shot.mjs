/**
 * **THE CITY LIFE PANEL AND THE ISLAND, PHOTOGRAPHED IN A RUNNING BUILD.**
 *
 *   node scripts/qa/city-life-distress-shot.mjs http://localhost:5173 output/city-life-review
 *
 * The lead reviews from a running build, so the frames that answer his QA are taken from
 * one rather than from a mounted component: the dev server, the real HUD, the real scene.
 *
 * ## THE VIEWPORT IS 1024x580 AND REDUCED MOTION IS ON
 *
 * `.cursor/rules/qa-verification.mdc` requires a spatial claim to be photographed at a
 * short, realistic viewport and the viewport named beside it. Reduced motion is
 * `prefers-reduced-motion: reduce` on the context, which holds the crowd at the resting end
 * of every beat and stills the gulls, so two runs of this script photograph one frame.
 *
 * ## THE THREE STATES, AND WHICH HATCH REACHES EACH
 *
 *  - `?mock&paths` masters the city AND pre-lays 18 path tiles: coverage 27 of 44, 61
 *    percent, `Settling in`. Clear of the departure line, so the panel is CALM.
 *  - `?mock&mastered` is the same city with no paths: coverage 9 of 44, 20 percent. Deep
 *    under the line, so the panel is ALARMED and six people are away.
 *  - The same load, dollied in on the shoreline, is where the six of them are standing.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:5173";
const outDir = process.argv[3] ?? "output/city-life-review";
const SHORT = { width: 1024, height: 580 };

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: SHORT,
  reducedMotion: "reduce",
});
const page = await context.newPage();
page.on("pageerror", (e) => console.error("pageerror:", e.message));

async function openCity(query) {
  await page.goto(`${base}/?${query}`, { waitUntil: "networkidle" });
  // The title screen, then the onboarding demo reel. The reel is FIRST-VISIT ONLY, so the
  // second city this script opens has no Skip button and waiting for one hangs the run —
  // measured, on exactly that. Each button is taken if it is there and passed over if it
  // is not, which is why `Start` is waited for and `Skip` is only polled.
  const start = page.getByRole("button", { name: /^Start$/ }).first();
  await start.waitFor({ timeout: 60000 });
  await start.evaluate((el) => el.click());
  await page.waitForTimeout(2000);
  const skip = page.getByRole("button", { name: /^Skip$/ }).first();
  if ((await skip.count()) > 0) {
    await skip.evaluate((el) => el.click()).catch(() => undefined);
    await page.waitForTimeout(2000);
  }
  await page.locator("canvas").first().waitFor({ timeout: 60000 });
  // Coach marks sit over the HUD on a first visit and would cover the panel.
  for (let i = 0; i < 8; i += 1) {
    const got = page.getByRole("button", { name: /^(Got it|Next|Done)$/ }).first();
    if ((await got.count()) === 0) {
      break;
    }
    await got.evaluate((el) => el.click()).catch(() => undefined);
    await page.waitForTimeout(350);
  }
  await page.waitForTimeout(4000);
}

async function shoot(name) {
  await page.screenshot({ path: `${outDir}/${name}.png` });
  console.log(`wrote ${outDir}/${name}.png`);
}

async function shootPanel(name) {
  const panel = page.getByTestId("city-vitality");
  await panel.waitFor({ timeout: 30000 });
  const box = await panel.boundingBox();
  if (!box) {
    throw new Error("the city life panel has no box");
  }
  // Framed with a margin of the HUD and the island around it: a crop of the panel alone
  // would be a picture of the one thing nobody doubts, and half the question is whether it
  // reads as alarmed against everything else on the screen.
  await page.screenshot({
    path: `${outDir}/${name}.png`,
    clip: {
      x: Math.max(0, box.x - 24),
      y: Math.max(0, box.y - 40),
      width: Math.min(SHORT.width, box.width + 260),
      height: Math.min(SHORT.height, box.height + 90),
    },
  });
  console.log(`wrote ${outDir}/${name}.png`);
  console.log(`   text: ${(await panel.innerText()).replace(/\n/g, " | ")}`);
  console.log(`   alarm: ${await panel.getAttribute("data-alarm")}`);
}

/** Dolly the village camera in, so the shoreline fills the frame. */
async function zoom(times) {
  const viewport = page.getByTestId("city-viewport");
  await viewport.focus();
  for (let i = 0; i < times; i += 1) {
    await page.keyboard.press("Equal");
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1500);
}

/**
 * Buy one civic building of `type` and place it wherever the placement bar offers. The
 * same three clicks `CitySurface.civic.test.tsx` makes, driven through the real HUD.
 */
async function buyCivic(type) {
  await page
    .getByRole("button", { name: /^Build$|All built/ })
    .first()
    .click();
  await page.getByRole("tab", { name: /Civic/ }).first().click();
  await page.getByTestId(`civic-card-${type}`).click();
  const bar = page.getByRole("group", { name: /Placing/ });
  await bar.waitFor({ timeout: 20000 });
  await bar.getByRole("button", { name: /Build here/ }).click();
  await page.waitForTimeout(1500);
}

await openCity("mock&paths");
await shoot("01-calm-whole-screen-1024x580");
await shootPanel("02-calm-panel-1024x580");

// CONTENT: the settled end of the range, which needs a purchase on top of the paths. Two
// Campfires take coverage past the whole town, which is what `content` means (100 percent,
// section 6's "everyone" rather than "most").
await buyCivic("prehistoric_campfire");
await shootPanel("06-content-panel-1024x580");

await openCity("mock&mastered");
await shoot("03-alarmed-whole-screen-1024x580");
await shootPanel("04-alarmed-panel-1024x580");

// The shore, where the leavers are. Panned toward the near edge and dollied in, because
// the whole-island frame above is the one that answers "can you tell at a glance" and this
// one answers "what is that". Both are wanted.
await zoom(4);
for (let i = 0; i < 7; i += 1) {
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(120);
}
await page.waitForTimeout(1500);
await shoot("05-departure-on-the-island-1024x580");

await browser.close();
