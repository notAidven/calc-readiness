import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.ARCHIPELAGO_EVIDENCE_URL ?? "http://127.0.0.1:5173";
const output = path.resolve("docs/design-refs/archipelago-carousel-revised");

function pngSize(buffer) {
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function openCarousel(page, { standingEra } = {}) {
  await page.goto(`${baseUrl}/?reset`, {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: "Start" }).evaluate((button) => button.click());
  await page.getByRole("button", { name: "Menu" }).waitFor();
  if (standingEra) {
    await page.evaluate(async (eraId) => {
      const era = await import("/src/city/useCityEra.ts");
      era.setCityEra(eraId);
    }, standingEra);
    await page.waitForTimeout(1200);
  }
  await page.evaluate(() => {
    for (const selector of [
      ".ob-replay",
      '[data-testid="era-dev-skip"]',
      '[data-testid="catchup-dev-skip"]',
      '[data-testid="demo-route-panel"]',
      ".demo-mode-notice",
    ]) {
      const panel = document.querySelector(selector);
      if (panel instanceof HTMLElement) {
        panel.style.display = "none";
      }
    }
  });
  await page.getByRole("button", { name: "Menu" }).evaluate((button) => button.click());
  await page.locator('[data-testid="menu-bay"]').evaluate((button) => button.click());
  await page.locator('[data-testid="archipelago-hero-renderer"] canvas').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2200);
}

async function captureCase(browser, input) {
  const context = await browser.newContext({
    viewport: input.viewport,
    screen: input.screen,
    deviceScaleFactor: input.deviceScaleFactor,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await openCarousel(page);
  const facts = await page.evaluate(() => {
    const targets = [
      ".archipelago-close",
      ".archipelago-arrow--previous",
      ".archipelago-arrow--next",
      ".archipelago-primary-action",
    ].map((selector) => {
      const box = document.querySelector(selector)?.getBoundingClientRect();
      return {
        selector,
        width: box?.width ?? 0,
        height: box?.height ?? 0,
      };
    });
    const canvas = document.querySelector(
      '[data-testid="archipelago-hero-renderer"] canvas',
    );
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      scrollHeight: document.querySelector(".archipelago")?.scrollHeight ?? 0,
      canvasCount: document.querySelectorAll("canvas").length,
      canvasClientWidth: canvas instanceof HTMLCanvasElement ? canvas.clientWidth : 0,
      canvasWidth: canvas instanceof HTMLCanvasElement ? canvas.width : 0,
      targets,
    };
  });
  if (
    facts.canvasCount !== 1 ||
    facts.targets.some((target) => target.width < 44 || target.height < 44)
  ) {
    throw new Error(
      `${input.name}: responsive target/canvas contract failed: ${JSON.stringify(facts)}`,
    );
  }

  const top = await page.screenshot({
    path: path.join(output, `${input.name}-top.png`),
  });
  await page.evaluate(() => {
    const surface = document.querySelector(".archipelago");
    surface?.scrollTo(0, surface.scrollHeight);
  });
  await page.waitForTimeout(200);
  const bottom = await page.screenshot({
    path: path.join(output, `${input.name}-bottom.png`),
  });
  await context.close();
  return {
    ...input,
    facts,
    topRaster: pngSize(top),
    bottomRaster: pngSize(bottom),
  };
}

async function captureResetCase(browser, input) {
  const context = await browser.newContext({
    viewport: input.viewport,
    screen: input.screen,
    deviceScaleFactor: input.deviceScaleFactor,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await openCarousel(page, { standingEra: "neolithic" });
  await page
    .locator('[data-testid="archipelago-select-prehistoric"]')
    .evaluate((button) => button.click());
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-testid="archipelago-hero-renderer"]')
        ?.getAttribute("data-scene-root") === "prehistoric",
  );
  await page.waitForTimeout(1800);
  const overflowTrigger = page.getByRole("button", {
    name: "More island actions",
  });
  await overflowTrigger.waitFor();
  await overflowTrigger.evaluate((button) => button.click());
  const resetItem = page.getByRole("menuitem", {
    name: "Reset past island",
  });
  await resetItem.waitFor();
  const overflow = await page.screenshot({
    path: path.join(output, `${input.name}-reset-overflow.png`),
  });
  await resetItem.evaluate((button) => button.click());
  await page
    .getByRole("alertdialog", {
      name: "Reset past island?",
    })
    .waitFor();
  const confirmation = await page.screenshot({
    path: path.join(output, `${input.name}-reset-confirmation.png`),
  });
  const facts = await page.evaluate(() => {
    const target = document
      .querySelector(".archipelago-reset-confirm-danger")
      ?.getBoundingClientRect();
    return {
      canvasCount: document.querySelectorAll("canvas").length,
      confirmTarget: {
        width: target?.width ?? 0,
        height: target?.height ?? 0,
      },
      selectedEra: document
        .querySelector('[data-testid="archipelago-overview"]')
        ?.getAttribute("data-selected-era"),
      standingEra: document
        .querySelector('[data-testid="archipelago-overview"]')
        ?.getAttribute("data-standing-era"),
    };
  });
  if (
    facts.canvasCount !== 1 ||
    facts.confirmTarget.width < 44 ||
    facts.confirmTarget.height < 44 ||
    facts.selectedEra !== "prehistoric" ||
    facts.standingEra !== "neolithic"
  ) {
    throw new Error(
      `${input.name}: reset evidence contract failed: ${JSON.stringify(facts)}`,
    );
  }
  await context.close();
  return {
    ...input,
    facts,
    overflowRaster: pngSize(overflow),
    confirmationRaster: pngSize(confirmation),
  };
}

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const results = [];
  results.push(
    await captureCase(browser, {
      name: "390x580",
      viewport: { width: 390, height: 580 },
      screen: { width: 390, height: 580 },
      deviceScaleFactor: 1,
    }),
  );
  results.push(
    await captureCase(browser, {
      name: "1024x580-09-200-percent",
      // A 512x290 CSS viewport at DPR 2 is the effective layout and physical raster of
      // a 1024x580 screen at 200% browser zoom.
      viewport: { width: 512, height: 290 },
      screen: { width: 1024, height: 580 },
      deviceScaleFactor: 2,
    }),
  );
  const reset = [];
  reset.push(
    await captureResetCase(browser, {
      name: "1024x580",
      viewport: { width: 1024, height: 580 },
      screen: { width: 1024, height: 580 },
      deviceScaleFactor: 1,
    }),
  );
  reset.push(
    await captureResetCase(browser, {
      name: "390x580",
      viewport: { width: 390, height: 580 },
      screen: { width: 390, height: 580 },
      deviceScaleFactor: 1,
    }),
  );
  await writeFile(
    path.join(output, "responsive-evidence.json"),
    `${JSON.stringify({ responsive: results, reset }, null, 2)}\n`,
  );
} finally {
  await browser.close();
}
