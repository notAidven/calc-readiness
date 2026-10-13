#!/usr/bin/env node
/**
 * Prove the shadow freeze changes no pixels, at the viewport a player has.
 *
 * A frame-time claim is a number and a LOOK is not, so this photographs the whole surface
 * at 1024x580 with the freeze on (as shipped) and with it off (three's default), on the
 * same page, the same camera and the same seeded island, and reports how many pixels
 * differ. One page and one knob is the point: two mounts would reseed the island's RNG and
 * every difference would be the seed rather than the shadow map.
 *
 * Usage: node scripts/shadow-freeze-frames.mjs [url] [outDir]
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

import { CITY_PROFILE_PROBE } from "./lib/cityProfileProbe.mjs";

const URL_BASE = process.argv[2] ?? "http://127.0.0.1:5173";
const OUT = process.argv[3] ?? "output/frames/shadow-freeze";
const VIEWPORT = { width: 1024, height: 580 };

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});

/**
 * TWO PAIRS, because they answer two different questions and only one of them can answer
 * the identity question.
 *
 * With motion on, the citizens, carts and gulls are somewhere else six seconds later, so
 * the two frames differ by where they walked and the diff says nothing about shadows.
 * With `prefers-reduced-motion: reduce` every one of them holds still, so a difference
 * between the pair is the shadow map and nothing else. The motion-on pair is kept because
 * it is the look a player actually gets and somebody should see it.
 */
const suites = [
  { name: "reduced-motion", reducedMotion: "reduce", decisive: true },
  { name: "motion-on", reducedMotion: "no-preference", decisive: false },
];

const results = [];

for (const suite of suites) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    reducedMotion: suite.reducedMotion,
  });
  await context.addInitScript(CITY_PROFILE_PROBE);
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 200)));

  await page.goto(`${URL_BASE}/?mock`, { waitUntil: "load" });
  const start = page.getByRole("button", { name: "Start", exact: true });
  if (await start.count()) await start.first().click();
  await page.waitForSelector("canvas", { timeout: 90_000 }).catch(() => {});
  await page.waitForTimeout(8_000);

  /*
   * CLEAR THE FURNITURE, because the subject of this evidence is the ground.
   *
   * Left alone, the onboarding card and the two dev panels cover most of a 1024x580 frame
   * and the island is a strip across the top -- so a pixel diff would be dominated by UI
   * that cannot change and the shadows it is about would be a few hundred pixels. Skipping
   * the onboarding and folding the dev panels is what a demo operator does anyway.
   */
  await page.evaluate(() => {
    const byText = (text) =>
      [...document.querySelectorAll("button, a")].find(
        (el) => el.textContent?.trim() === text,
      );
    byText("Skip")?.click();
  });
  await page.waitForTimeout(1_500);
  await page.evaluate(() => {
    for (const el of [...document.querySelectorAll("button, a")]) {
      if (el.textContent?.trim() === "hide") el.click();
    }
  });
  // Long settle after the furniture goes: the island streams its dressing and the buildings
  // their models, and a frame taken early would differ by what had arrived rather than by
  // the shadow map.
  await page.waitForTimeout(10_000);

  /** The whole surface, not a crop of the thing that changed. */
  async function shot(name) {
    const path = join(OUT, `1024x580-${suite.name}-${name}.png`);
    await page.screenshot({ path });
    console.log(`wrote ${path}`);
    return path;
  }

  const shipped = await shot("after-shadow-freeze-shipped");

  // Three's default, applied live: the same scene with the map re-rendered every frame.
  await page.evaluate(() => window.__cityProbe.ablate("baseline"));
  await page.waitForTimeout(6_000);
  const unfrozen = await shot("before-shadow-map-every-frame");

  /** Count differing pixels between two PNGs, decoded in the page (no image deps here). */
  const differing = await page.evaluate(
    async ([a, b]) => {
      const load = (dataUrl) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = dataUrl;
        });
      const [imgA, imgB] = await Promise.all([load(a), load(b)]);
      const canvas = document.createElement("canvas");
      canvas.width = imgA.width;
      canvas.height = imgA.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(imgA, 0, 0);
      const dataA = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(imgB, 0, 0);
      const dataB = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let differ = 0;
      let worst = 0;
      for (let i = 0; i < dataA.length; i += 4) {
        const d = Math.max(
          Math.abs(dataA[i] - dataB[i]),
          Math.abs(dataA[i + 1] - dataB[i + 1]),
          Math.abs(dataA[i + 2] - dataB[i + 2]),
        );
        if (d > 6) differ += 1;
        if (d > worst) worst = d;
      }
      return {
        differ,
        worst,
        total: dataA.length / 4,
        width: canvas.width,
        height: canvas.height,
      };
    },
    [
      `data:image/png;base64,${readFileSync(shipped).toString("base64")}`,
      `data:image/png;base64,${readFileSync(unfrozen).toString("base64")}`,
    ],
  );

  const summary = {
    suite: suite.name,
    decisive: suite.decisive,
    viewport: VIEWPORT,
    differingPixels: differing.differ,
    totalPixels: differing.total,
    differingPct: +((differing.differ / differing.total) * 100).toFixed(3),
    worstChannelDelta: differing.worst,
    note: suite.decisive
      ? "Nothing animates under reduced motion, so the only thing that can differ between " +
        "these two frames is the shadow map. Both are the same page, the same camera and " +
        "the same seeded island; the one difference applied is renderer.shadowMap.autoUpdate."
      : "The citizens, carts and gulls animate continuously and are six seconds further " +
        "along in the second frame, so this pair is the shipped LOOK rather than an " +
        "identity check. None of those three casts a shadow.",
  };
  results.push(summary);
  console.log(JSON.stringify(summary, null, 2));
  await context.close();
}

writeFileSync(join(OUT, "pixel-diff.json"), JSON.stringify(results, null, 2));
await browser.close();
