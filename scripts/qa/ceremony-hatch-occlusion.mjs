/**
 * WHAT IS ON TOP OF WHAT AT THE CEREMONY, at the lead's own 1024x580 window.
 *
 * Hit-tests every control the ceremony and its dev hatch ship, at each control's own centre,
 * and reports the box of every fixed overlay on the page. A claim about occlusion is a claim
 * about a rendered frame, so this also writes the frame.
 *
 *   npm run dev
 *   node scripts/qa/ceremony-hatch-occlusion.mjs http://localhost:5173 output/ceremony-hatch
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:5173";
const outDir = process.argv[3] ?? "output/ceremony-hatch";
const VIEW = { width: 1024, height: 580 };
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: VIEW });
await page.emulateMedia({ reducedMotion: "reduce" });
page.on("pageerror", (e) => console.error("pageerror:", e.message));

await page.goto(`${base}/?reset`, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: "Take Diagnostic" }).click();
await page.locator('[data-testid="dgx-dev-skip-ace"]').click();
await page
  .locator('[data-testid="dgx-dev-skip"] .dgx-skip__note')
  .filter({ hasText: /questions asked/ })
  .waitFor({ timeout: 180000 });

const backCollision = await page.evaluate(() => {
  const button = [...document.querySelectorAll("button")].find(
    (n) => n.textContent?.trim() === "Back to city",
  );
  if (!button) return null;
  const b = button.getBoundingClientRect();
  const at = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
  return {
    button: [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)],
    onTop: at?.className || at?.tagName,
    reachable: button.contains(at) || button === at,
  };
});

await page.addStyleTag({ content: ".ob-replay { display: none !important; }" });
await page.getByRole("button", { name: /^Back to city$/ }).click();
await page
  .getByRole("button", { name: /^Close$/ })
  .first()
  .click();
await page.locator(".city-viewport canvas").waitFor({ timeout: 60000 });
await page.waitForTimeout(6000);
for (let attempt = 0; attempt < 6; attempt += 1) {
  const skipTips = page.locator('[data-testid="coach-mark-build-skip"]').first();
  if (await skipTips.isVisible().catch(() => false)) {
    await skipTips.click();
    await page.waitForTimeout(500);
  }
  if ((await page.locator(".coach-mark, [data-testid^='coach-mark']").count()) === 0) break;
  await page.waitForTimeout(800);
}
await page.locator('[aria-label="Menu"]').first().click();
await page.locator('[data-testid="menu-ceremony"]').click();
await page.locator('[data-testid="era-ceremony"]').waitFor({ timeout: 30000 });
await page.waitForTimeout(3000);

const measured = await page.evaluate(() => {
  const overlays = [...document.querySelectorAll("body *")]
    .filter((n) => {
      const style = getComputedStyle(n);
      return style.position === "fixed" || style.position === "absolute";
    })
    .filter((n) => {
      const r = n.getBoundingClientRect();
      return r.width > 40 && r.height > 16 && r.width < 1024;
    })
    .map((n) => {
      const r = n.getBoundingClientRect();
      return {
        what:
          n.getAttribute("data-testid") ??
          (typeof n.className === "string" ? n.className.split(/\s+/)[0] : n.tagName),
        z: getComputedStyle(n).zIndex,
        box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      };
    });

  const wanted = [
    "era-dev-skip",
    "era-dev-skip-fold",
    "era-dev-skip-next",
    "era-dev-skip-step",
    "era-dev-skip-top",
    "era-dev-skip-gathering",
    "era-dev-skip-expansion",
    "era-dev-skip-rebuild",
    "era-dev-skip-retheme",
    "era-ceremony-check",
    "catchup-dev-skip",
  ];
  const reach = wanted.map((id) => {
    const node = document.querySelector(`[data-testid="${id}"]`);
    if (!node) return { id, state: "absent", coveredBy: null };
    const r = node.getBoundingClientRect();
    if (r.width === 0) return { id, state: "zero-size", coveredBy: null };
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (node.contains(top) || node === top)
      return { id, state: "reachable", coveredBy: null };
    let owner = top;
    while (owner && !owner.getAttribute?.("data-testid")) owner = owner.parentElement;
    return {
      id,
      state: "COVERED",
      coveredBy: owner?.getAttribute("data-testid") ?? top?.className ?? top?.tagName,
    };
  });
  /** The ceremony's own furniture, which a dev panel must not sit on. */
  const furniture = [
    [".era-advance-speech__figure", "the advisor"],
    [".era-advance-speech__bubble", "his bubble"],
    [".era-advance-rail", "the beat rail"],
    [".hud-dock", "the HUD dock"],
    [".hud-chip-row", "the HUD chips"],
    [".city-controls", "the camera cluster"],
  ].flatMap(([selector, name]) => {
    const node = document.querySelector(selector);
    if (!node) return [];
    const r = node.getBoundingClientRect();
    return [
      {
        name,
        box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      },
    ];
  });
  return { overlays, reach, furniture };
});

const lines = [
  `# the ceremony's dev hatch at ${VIEW.width}x${VIEW.height}`,
  "",
  "diagnostic summary, before the city:",
  `  "Back to city" ${JSON.stringify(backCollision)}`,
  "",
  "every fixed overlay on the ceremony, x y w h:",
  ...measured.overlays.map(
    (o) => `  z=${String(o.z).padStart(5)}  ${o.box.join(", ").padEnd(22)}  ${o.what}`,
  ),
  "",
  "the ceremony's and the city's own furniture, x y w h:",
  ...measured.furniture.map((f) => `  ${f.box.join(", ").padEnd(22)}  ${f.name}`),
  "",
  "hit test at each control's own centre:",
  ...measured.reach.map(
    (r) => `  ${r.state.padEnd(10)} ${r.id}${r.coveredBy ? `  <- ${r.coveredBy}` : ""}`,
  ),
  "",
  `${measured.reach.filter((r) => r.state === "COVERED").length} of ${measured.reach.length} covered`,
  "",
];
console.log(lines.join("\n"));
writeFileSync(`${outDir}/measured-1024x580.txt`, lines.join("\n"));
writeFileSync(
  `${outDir}/ceremony-1024x580.png`,
  await page.screenshot({ animations: "allow" }),
);
await browser.close();
