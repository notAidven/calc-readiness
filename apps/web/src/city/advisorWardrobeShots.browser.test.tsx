/**
 * THE TEN COSTUMES, PHOTOGRAPHED — a contact sheet of the whole wardrobe, and every one of
 * the ten costumes on the surface the advisor actually stands on.
 *
 * D-ET8's beat one is *"the citizens gather, scaffolding goes up on the town hall, and the
 * advisor changes dress"*. A dress change is a **visual** claim, so it owes a rendered
 * frame; `advisorDress.test.ts` proves the ten costumes differ as data, and no amount of
 * data proves anybody can see the difference.
 *
 * ## THE VIEWPORT IS HALF THE EVIDENCE, and it is 1024x580
 *
 * The lead reviews in a short window. Every frame here is taken at his, named in its own
 * filename, and the island frames are the WHOLE viewport rather than a crop of the
 * character: a costume that clashes with the island it is standing on is the failure mode,
 * and cropping to the advisor photographs the one part of the picture nobody doubted.
 *
 * ## OFF BY DEFAULT, following `crisisAdvisorOverIsland.browser.test.tsx`
 *
 *   VITE_ADVISOR_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/city/advisorWardrobeShots.browser.test.tsx
 *
 * A full shadow-mapped scene with seven GLBs is heavy, and a heavy scene left on in this
 * suite starves an animation-timing assertion in a different file rather than failing here.
 * The always-on tests below are the claims that survive in CI, and they are claims a still
 * frame cannot make: that every era paints a DIFFERENT figure, measured off the rendered
 * pixels' own geometry rather than off the table the figure was built from.
 *
 * **The frames are COMMITTED**, to `docs/design-refs/advisor-wardrobe/`, following the
 * precedent `docs/design-refs/crisis-panel-width/` set: `__screenshots__/` is gitignored, so
 * a shot nobody can open is not evidence in a review.
 */

import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { OruAdvisorCharacter } from "../lessons/OruAdvisorCharacter";
import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { advisorDressFor } from "./advisorDress";
import { CitySurface } from "./CitySurface";
import { forgetCrisisBriefingRead } from "./crisisCall";
import { resetCityEra, setCityEra } from "./useCityEra";

import "../styles.css";

const SHOTS = Boolean(import.meta.env.VITE_ADVISOR_SHOTS);

/** The lead's actual window. Short, which is where an overlay stops leaving room. */
const LEAD_WINDOW = { width: 1024, height: 580 } as const;

/**
 * The eras photographed over the live island: **all ten, derived from `ERA_SEQUENCE`**.
 *
 * ## It was three, and the three were a reasoned sample rather than an oversight
 *
 * Era one as the baseline everybody already knows; era six as the middle of the run and the
 * era the palette ladder had to pull furthest from its neighbours; era ten as the end of the
 * walk and the only costume with an emissive note, which is the one that could clash hardest
 * with the ground it stands on. That reasoning picked the three eras most likely to be
 * wrong, and it was the right three to shoot first.
 *
 * ## Why a sample is nonetheless the wrong population for THIS guard
 *
 * `.cursor/rules/qa-verification.mdc`: define a population by who exhibits the behaviour,
 * not by where it is implemented or by which members look riskiest. **The behaviour is "the
 * advisor stands over the island in this era's clothes", and that is true of all ten eras
 * without exception** — the reason `advisorDressFor` is total is that D-ET9 makes the
 * advisor continuously present, so there is no era that does not owe a frame and there are
 * no declared exceptions to name.
 *
 * The sample's cost is measurable rather than hypothetical. The defect this class of frame
 * has already found — **era ten's collar putting a lit line across the advisor's mouth** —
 * was invisible to `advisorDress.test.ts`, which is green over a collar that covers a face,
 * and to the two always-on tests below, which read boxes and colours and cannot see one box
 * land on another. It was found by looking at era ten's frame. Nine tenths of the costumes
 * were not being looked at, so nine tenths of that defect class had no reader at all.
 *
 * ## Derived, so an eleventh era cannot arrive unphotographed
 *
 * Nothing here is a hand-written list of ten. `ERA_SEQUENCE` is the population, exactly as
 * it is for `ADVISOR_DRESS` — an era added there joins this sweep with no edit, which is the
 * shape that stops the population narrowing back to a sample by neglect.
 *
 * **One residual, named rather than left to be discovered:** this file WRITES the frames and
 * never reads them, and it is off by default, so nothing in CI notices a frame that is
 * deleted from `docs/design-refs/`. A guard that read the directory would be worse than the
 * hole it closed: `.github/workflows/invariants.yml`'s scope filter classifies `.png` inert,
 * so a frame-deleting diff would skip the very step that checked, and its own comment names
 * an inert misclassification as the silent direction to avoid.
 */
const ON_THE_ISLAND: readonly EraId[] = ERA_SEQUENCE.map((era) => era.id);

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;
/** What the island frames measured, accumulated so all ten land in one file. */
const measured: string[] = [];

beforeAll(() => {
  restore = { width: window.innerWidth, height: window.innerHeight };
});

afterAll(async () => {
  forgetCrisisBriefingRead();
  resetCityEra();
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
  resetCityEra();
});

function named(label: RegExp | string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll("button")).find((button) => {
    const name = (button.getAttribute("aria-label") ?? button.textContent ?? "").trim();
    return typeof label === "string" ? name === label : label.test(name);
  });
}

/** Where this test's viewport sits in the real window (vitest scales the tester iframe). */
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

/**
 * The composited frame, clipped to this test's viewport, as a base64 PNG.
 *
 * CDP rather than `page.screenshot`, following `crisisAdvisorOverIsland`: the locator
 * capture runs actionability checks and never gets past "waiting for element to be stable"
 * against a canvas running `frameloop="always"`.
 */
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
    await commands.writeFile(`docs/design-refs/advisor-wardrobe/${name}.png`, shot, {
      encoding: "base64",
    });
  }
}

/* -------------------------------------------------------------------------- */
/* The always-on claim: the ten are ten different PICTURES                     */
/* -------------------------------------------------------------------------- */

/**
 * Every box the character paints, as a geometry-and-colour fingerprint.
 *
 * Read off `getBoundingClientRect` and `getComputedStyle` rather than off the dress, which
 * is the whole point: a table can differ in ten ways and still draw one figure if the
 * component ignores nine of them. This is what the pixels are actually arranged into.
 */
function paintedFigure(root: HTMLElement): string[] {
  const origin = root.getBoundingClientRect();
  return Array.from(root.querySelectorAll<HTMLElement>(".oru-advisor__part"))
    .map((node) => {
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const round = (n: number) => Math.round(n * 10) / 10;
      return [
        round(box.left - origin.left),
        round(box.top - origin.top),
        round(box.width),
        round(box.height),
        style.backgroundColor,
        style.backgroundImage,
      ].join("|");
    })
    .sort();
}

/** The outline alone: where paint is, ignoring what colour it is. */
function paintedOutline(root: HTMLElement): string[] {
  return paintedFigure(root).map((part) => part.split("|").slice(0, 4).join("|"));
}

async function figure(eraId: EraId): Promise<HTMLElement> {
  h?.cleanup();
  const harness = mount(
    <div style={{ width: 320, height: 320 }}>
      <OruAdvisorCharacter mood="talk" dress={advisorDressFor(eraId)} />
    </div>,
  );
  h = harness;
  await waitFor(
    () => harness.host.querySelector(`.oru-advisor[data-dress="${eraId}"]`) !== null,
    `the advisor mounted in ${eraId}'s dress`,
  );
  return harness.host.querySelector<HTMLElement>(".oru-advisor") as HTMLElement;
}

test("paints a different figure in every era, measured off the rendered boxes", async () => {
  const painted = new Map<EraId, string[]>();
  for (const era of ERA_SEQUENCE) {
    painted.set(era.id, paintedFigure(await figure(era.id)));
  }

  // FLOOR FIRST. Every comparison below holds trivially over an empty sequence or over a
  // character that painted nothing, so the population and the figure both get a floor.
  expect(painted.size).toBe(ERA_SEQUENCE.length);
  expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
  for (const [eraId, parts] of painted) {
    expect(parts.length, `${eraId} paints too few parts to be a character`).toBeGreaterThan(
      35,
    );
  }

  // No two eras paint the same picture, over all 45 pairs rather than the nine adjacent
  // ones — the same reason `eraPaletteLadder.test.ts` sweeps every pair: the island keeps
  // every era's buildings, and a reviewer flipping between era four and era six is not
  // stopped by them being two apart.
  const same: string[] = [];
  const eras = [...painted.keys()];
  for (let i = 0; i < eras.length; i += 1) {
    for (let j = i + 1; j < eras.length; j += 1) {
      const [a, b] = [eras[i] as EraId, eras[j] as EraId];
      if ((painted.get(a) ?? []).join("\n") === (painted.get(b) ?? []).join("\n")) {
        same.push(`${a} and ${b} paint the same figure`);
      }
    }
  }
  expect(same).toEqual([]);
});

test("changes the OUTLINE and not only the colours, at every one of the 45 pairs", async () => {
  // The claim `City_Art_Bible.md` §3 actually makes. He is ~120px in the onboarding reel,
  // so a pair of costumes separating only on hue is one figure at the size a learner meets
  // him at. Colour is stripped out here on purpose: what is left is where paint IS.
  const outlines = new Map<EraId, string>();
  for (const era of ERA_SEQUENCE) {
    outlines.set(era.id, paintedOutline(await figure(era.id)).join("\n"));
  }

  expect(outlines.size).toBe(ERA_SEQUENCE.length);
  expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
  // A floor on the outline itself, so "they all differ" cannot pass over empty strings.
  for (const [eraId, outline] of outlines) {
    expect(outline.length, `${eraId} has no outline at all`).toBeGreaterThan(500);
  }

  const shared: string[] = [];
  const eras = [...outlines.keys()];
  for (let i = 0; i < eras.length; i += 1) {
    for (let j = i + 1; j < eras.length; j += 1) {
      const [a, b] = [eras[i] as EraId, eras[j] as EraId];
      if (outlines.get(a) === outlines.get(b)) {
        shared.push(`${a} and ${b} have the same silhouette`);
      }
    }
  }
  expect(shared).toEqual([]);
});

/* -------------------------------------------------------------------------- */
/* The frames                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * THE CONTACT SHEET: all ten side by side, on the parchment ground they are drawn against.
 *
 * This is the one frame that is not a whole viewport, and the reason is that its subject is
 * the WARDROBE rather than any one costume: ten figures at the size the onboarding reel
 * draws them, so "do these read as ten different people's clothes at 120px" is answerable
 * by looking. The ten island frames below are the ones that answer the surroundings
 * question.
 */
test.runIf(SHOTS)(
  "photographs all ten costumes on one sheet",
  async () => {
    await page.viewport(LEAD_WINDOW.width, LEAD_WINDOW.height);
    h?.cleanup();
    h = mount(
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 4,
          padding: 10,
          // The Art Bible's parchment ground (§1), because a costume is only legible
          // against the surface the city is drawn on.
          background: "#ECE4D3",
          width: `${LEAD_WINDOW.width}px`,
        }}
      >
        {ERA_SEQUENCE.map((era, index) => (
          <div key={era.id} style={{ textAlign: "center" }}>
            <div style={{ width: "100%", aspectRatio: "1 / 1" }}>
              <OruAdvisorCharacter mood="talk" dress={advisorDressFor(era.id)} />
            </div>
            <p
              style={{
                font: "600 10px/1.3 system-ui, sans-serif",
                color: "#14202E",
                margin: "2px 0 0",
              }}
            >
              {index + 1}. {era.name}
            </p>
            <p
              style={{
                font: "400 9px/1.25 system-ui, sans-serif",
                color: "#4A3A2A",
                margin: 0,
              }}
            >
              {advisorDressFor(era.id).described}
            </p>
          </div>
        ))}
      </div>,
    );
    await document.fonts.ready;
    await new Promise<void>((resolve) => setTimeout(resolve, 400));
    await keep("00-wardrobe-contact-sheet-1024x580", await capture());
  },
  120000,
);

/**
 * THE CITY, WITH THE ADVISOR ON IT, at every era — framed to the whole viewport.
 *
 * The subject is the SURFACE and not the character: whether era ten's emissive trim sits
 * on era ten's island or fights it, and whether the figure is still findable against the
 * ground. So no frame here is cropped to him.
 *
 * The crisis dialogue is the surface he is largest on (`clamp(132px, 30vh, 232px)`), which
 * is why it is the one opened rather than a lesson.
 */
for (const eraId of ON_THE_ISLAND) {
  test.runIf(SHOTS)(
    `photographs the ${eraId} advisor at crisis size over the live island`,
    async () => {
      await page.viewport(LEAD_WINDOW.width, LEAD_WINDOW.height);
      h?.cleanup();
      forgetCrisisBriefingRead();
      setCityEra(eraId);
      h = mount(<CitySurface enableCanvas onOpenSurface={() => undefined} />);

      await waitFor(
        () => document.querySelector(".city-viewport canvas") !== null,
        "the city canvas never mounted",
        30000,
      );
      await waitFor(
        () => named("Menu") !== undefined,
        "the city's Menu button appears",
        30000,
      );
      await document.fonts.ready;
      // The GLBs resolve behind their own Suspense boundaries, so a first frame is a bare
      // island. No renderer handle out here to count against, so this waits on the clock.
      await new Promise<void>((resolve) => setTimeout(resolve, 3000));
      // A THROWAWAY CAPTURE, and it is load-bearing: a clipped capture puts a device-metrics
      // override on the page, which R3F reads as a resize and re-renders through. The frame
      // that comes back from the FIRST capture is the one drawn before any of that settled.
      await capture();
      await new Promise<void>((resolve) => setTimeout(resolve, 800));

      named("Menu")?.click();
      await waitFor(
        () => named(/Hard Winter/i) !== undefined,
        "the Hard Winter entry appears",
      );
      named(/Hard Winter/i)?.click();
      await waitFor(
        () => document.querySelector('[data-testid="crisis-call-advisor"]') !== null,
        "the advisor never opened",
      );
      await document.fonts.ready;
      await new Promise<void>((resolve) => setTimeout(resolve, 900));

      // He is in THIS era's clothes and not in the board's. The winter board falls back to
      // era one's island (D-ERA25) and the advisor does not fall back with it, so this is
      // the assertion that the frame is of the thing it claims to be of.
      const figure = document.querySelector<HTMLElement>(
        ".crisis-call-speech .oru-advisor",
      );
      expect(figure?.dataset.dress).toBe(eraId);

      await keep(`${eraId}-crisis-1024x580`, await capture());

      /*
       * HOW MUCH OF THE COSTUME IS ACTUALLY ON SCREEN, measured off the frame rather than
       * off the stylesheet, and written beside the frames.
       *
       * The character is bottom-anchored at `clamp(132px, 30vh, 232px)`, and 30vh of a
       * 580px window is 174px. **A costume whose hem is under the fold is a costume the
       * lead cannot review**, and era four's one strong colour is a band at the hem, so
       * this is the number that decides whether a hem is a place to put anything.
       */
      const box = figure?.getBoundingClientRect();
      const seen = box
        ? Math.max(0, Math.min(box.bottom, window.innerHeight) - Math.max(box.top, 0))
        : 0;
      measured.push(
        `${eraId}: figure ${Math.round(box?.height ?? 0)}px tall, ` +
          `${Math.round(seen)}px of it inside the ${window.innerWidth}x${window.innerHeight} ` +
          `window (${Math.round((seen / (box?.height || 1)) * 100)}%), ` +
          `top at y=${Math.round(box?.top ?? 0)}, bottom at y=${Math.round(box?.bottom ?? 0)}`,
      );
      if (SHOTS) {
        await commands.writeFile(
          `docs/design-refs/advisor-wardrobe/measured-${LEAD_WINDOW.width}x${LEAD_WINDOW.height}.txt`,
          [
            `The advisor at crisis size, measured on the frame at ${LEAD_WINDOW.width}x${LEAD_WINDOW.height}.`,
            "Written by advisorWardrobeShots.browser.test.tsx, in the same run as the frames.",
            "",
            ...measured,
            "",
          ].join("\n"),
        );
      }
    },
    180000,
  );
}
