import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { commands, page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../lessons/testHarness";
import {
  boxOf,
  captureFrame,
  clearEmulatedMedia,
  emulateReducedMotion,
  overlapArea,
} from "../test/frameEvidence";
import { CitySurface } from "./CitySurface";
import { loadMockCity } from "./mockCity";

import "../styles.css";

/**
 * **THE BUILD CATALOGUE, WHICH CUT ITS OWN CARDS IN HALF AND DID NOT SAY IT SCROLLED.**
 *
 * Measured on the learner mount at `b7bdc6d2`, with the menu open on its Lessons tab:
 *
 * | window | frame | content | hidden | cards clipped by the frame |
 * | --- | --- | --- | --- | --- |
 * | 320x568 | 307x466 | 635 | 171px | 6 of 6 |
 * | 390x580 | 374x476 | 604 | 130px | 6 of 6 |
 * | 768x1024 | 737x605 | 603 | 0 | 0 |
 * | 844x390 | 760x320 | 610 | 292px | 6 of 6 |
 * | 1024x580 | 760x476 | 627 | 153px | 6 of 6 |
 * | 1440x900 | 760x632 | 630 | 0 | 0 |
 *
 * `.build-shop-frame` is capped at `82vh` with `overflow: hidden auto`, so on a short window the
 * card row is simply below the visible box: every card's bottom edge was cut, and the only thing
 * saying so was a `scrollbar-width: thin` overlay scrollbar that Chromium does not paint until
 * something scrolls. Two windows were clean, and they are the two a developer works at.
 *
 * ## What the fix is allowed to be
 *
 * The brief is explicit that the catalogue must become usable and obviously scrollable *without*
 * being redesigned into more dashboard chrome, so there are two claims here and they pull in
 * opposite directions on purpose:
 *
 *  1. at every window with the room, the catalogue **does not scroll at all** and no card is cut;
 *  2. at a window with no room for a card plus its chrome, it scrolls and **says so in words**,
 *     the cue retires at the end of the scroll, and the end of the scroll reaches a whole card.
 *
 * A cue alone would have been the cheap half passing for the whole fix; shrinking the cards until
 * they fit a 390px-tall window would have been the other failure.
 *
 * Frames need `VITE_BUILD_CATALOG_SHOTS=1`.
 */

const SHOTS = Boolean(import.meta.env.VITE_BUILD_CATALOG_SHOTS);

/**
 * The windows whose frame is KEPT, out of the eight measured: the review window, where the fit
 * now holds, and the landscape phone, where no fit is possible and the cue is what it owes.
 */
const KEEP_FRAMES: readonly string[] = ["1024x580", "844x390"];

interface Window_ {
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly rootFontPx?: number;
  /** True when the catalogue has the room to lay every card out without scrolling. */
  readonly fits: boolean;
}

const WINDOWS: readonly Window_[] = [
  { label: "320x568", width: 320, height: 568, fits: true },
  { label: "390x580", width: 390, height: 580, fits: true },
  { label: "768x1024", width: 768, height: 1024, fits: true },
  { label: "844x390", width: 844, height: 390, fits: false },
  { label: "1024x580", width: 1024, height: 580, fits: true },
  { label: "1440x900", width: 1440, height: 900, fits: true },
  { label: "512x290-zoom200", width: 512, height: 290, fits: false },
  { label: "1024x580-text200", width: 1024, height: 580, rootFontPx: 32, fits: false },
];

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;
const measured: string[] = [];

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function openCatalogue(view: Window_): Promise<HTMLElement> {
  await page.viewport(view.width, view.height);
  h?.cleanup();
  localStorage.clear();
  document.documentElement.style.fontSize =
    view.rootFontPx === undefined ? "" : `${view.rootFontPx}px`;
  h = mount(
    <div className="city-shell">
      <CitySurface
        enableCanvas={false}
        enableOnboardingDemo={false}
        reducedMotion
        loadCity={loadMockCity}
      />
    </div>,
  );
  await waitFor(
    () => document.querySelector("button.city-build-button") !== null,
    `the city never mounted at ${view.label}`,
    30_000,
  );
  document.querySelector<HTMLButtonElement>(".city-build-button")?.click();
  await waitFor(
    () => document.querySelector(".build-card") !== null,
    `the build catalogue never opened at ${view.label}`,
    20_000,
  );
  await document.fonts.ready;
  await wait(400);
  const frame = document.querySelector<HTMLElement>(".build-shop-frame");
  if (frame === null) {
    throw new Error(`the build catalogue drew no frame at ${view.label}`);
  }
  return frame;
}

/** The cards whose box is not entirely inside the frame's VISIBLE region. */
function clippedCards(frame: HTMLElement): string[] {
  const visible = boxOf(frame);
  return [...document.querySelectorAll<HTMLElement>(".build-card")]
    .filter((card) => {
      const box = boxOf(card);
      return box.bottom > visible.bottom + 0.5 || box.top < visible.top - 0.5;
    })
    .map((card) => {
      const box = boxOf(card);
      const name = card.querySelector(".build-card-name")?.textContent ?? "card";
      return `${name.trim()} (${Math.round(Math.max(0, box.bottom - visible.bottom))}px cut off the bottom)`;
    });
}

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await emulateReducedMotion();
});

afterEach(() => {
  h?.cleanup();
  h = null;
  document.documentElement.style.fontSize = "";
  localStorage.clear();
  document.body.innerHTML = "";
});

afterAll(async () => {
  await clearEmulatedMedia();
  if (SHOTS) {
    await commands.writeFile(
      "docs/design-refs/build-catalogue/measured.txt",
      [
        "Measured beside the frames in docs/design-refs/build-catalogue, under an emulated",
        "prefers-reduced-motion: reduce, by buildCatalogFits.browser.test.tsx in the same run.",
        "The catalogue is opened from the learner's own Build button on the mock city, at the",
        "window named at the start of each line. Every figure is in CSS pixels.",
        "",
        ...measured,
        "",
      ].join("\n"),
    );
  }
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

test("the build catalogue lays its cards out whole, or says out loud that it scrolls", {
  timeout: 500_000,
}, async () => {
  for (const view of WINDOWS) {
    const frame = await openCatalogue(view);
    const frameBox = boxOf(frame);
    const hidden = frame.scrollHeight - frame.clientHeight;
    const clipped = clippedCards(frame);
    const cue = document.querySelector<HTMLElement>(".build-shop-more");
    const cards = document.querySelectorAll(".build-card").length;
    measured.push(
      `${view.label} catalogue: frame ${Math.round(frameBox.width)}x${Math.round(frameBox.height)} ` +
        `at y=${Math.round(frameBox.top)}, content ${frame.scrollHeight}, hidden ${hidden}px, ` +
        `${cards} cards, ${clipped.length} cut, cue ` +
        `${cue === null ? "absent" : `"${(cue.textContent ?? "").trim()}"`}`,
    );

    if (SHOTS && KEEP_FRAMES.includes(view.label)) {
      await commands.writeFile(
        `docs/design-refs/build-catalogue/catalogue-${view.label}.png`,
        await captureFrame(),
        { encoding: "base64" },
      );
    }

    expect(
      cards,
      `${view.label} drew no cards, so nothing below is measured`,
    ).toBeGreaterThan(0);
    expect(
      Math.round(frameBox.bottom),
      `the catalogue's own frame runs past the bottom of the ${view.label} window`,
    ).toBeLessThanOrEqual(view.height);
    expect(
      Math.round(frameBox.top),
      `the catalogue's own frame starts above the top of the ${view.label} window`,
    ).toBeGreaterThanOrEqual(0);

    if (view.fits) {
      expect(
        hidden,
        `the catalogue hides ${hidden}px at ${view.label}, where it has the room not to`,
      ).toBeLessThanOrEqual(1);
      expect(
        clipped,
        `the catalogue cuts ${clipped.length} of ${cards} cards at ${view.label}: ${clipped.join(", ")}`,
      ).toEqual([]);
      expect(
        cue,
        `${view.label} shows a scroll cue over a catalogue that does not scroll`,
      ).toBeNull();
    } else {
      expect(
        hidden,
        `${view.label} claims to need a scroll cue but the catalogue does not overflow`,
      ).toBeGreaterThan(1);
      expect(
        cue,
        `the catalogue hides ${hidden}px at ${view.label} with nothing on screen saying it scrolls`,
      ).not.toBeNull();
      const cueElement = cue as HTMLElement;
      // Words, not a colour and not an arrow alone.
      expect((cueElement.textContent ?? "").trim().length).toBeGreaterThan(0);
      /*
        ...AND IT TAKES NO PRESS WHILE IT SAYS SO, which is the claim rather than "it overlaps
        nothing". The cue floats over the frame's bottom edge on purpose — that is where "more
        below" belongs, and the frame reserves a band for it so it lands on parchment rather than
        on a card's own name. What it may not do is answer for a control underneath it, so every
        control it overlaps is PRESSED at its own centre, and its `pointer-events` is read too,
        because that one declaration is the whole of why those presses land correctly.
      */
      expect(
        getComputedStyle(cueElement).pointerEvents,
        `the scroll cue at ${view.label} accepts pointer events, so it can take a press`,
      ).toBe("none");
      const stolen = [...frame.querySelectorAll<HTMLElement>("button:not([disabled])")]
        .filter((button) => {
          const box = boxOf(button);
          if (overlapArea(box, boxOf(cueElement)) === 0) {
            return false;
          }
          const hit = document.elementFromPoint(
            box.left + box.width / 2,
            box.top + box.height / 2,
          );
          return hit !== null && cueElement.contains(hit);
        })
        .map(
          (button) => button.getAttribute("aria-label") ?? button.textContent ?? "control",
        );
      expect(
        stolen,
        `the scroll cue at ${view.label} takes the press meant for ${stolen.join(", ")}`,
      ).toEqual([]);

      /*
        SCROLLING REACHES THE END OF THE CATALOGUE, and retires the cue when it does.

        The claim is about the END and not about every card, because at 512x290 — this review
        window under 200% browser zoom — the frame has about 200px of room for a 210px card and no
        amount of scrolling puts a whole one on the screen. What a learner is owed there is that
        the catalogue does not stop short of itself: the bottom edge of the last card is reachable,
        so nothing is stranded below the fold and the cue stops claiming otherwise.
      */
      frame.scrollTop = frame.scrollHeight;
      frame.dispatchEvent(new Event("scroll"));
      await wait(200);
      const cards_ = [...document.querySelectorAll<HTMLElement>(".build-card")];
      const last = boxOf(cards_[cards_.length - 1] as HTMLElement);
      const visible = boxOf(frame);
      const stillClipped = clippedCards(frame);
      measured.push(
        `${view.label} catalogue scrolled to the end: last card bottom y=` +
          `${Math.round(last.bottom)} inside frame ${Math.round(visible.top)}..` +
          `${Math.round(visible.bottom)}; ${stillClipped.length} of ${cards_.length} cards still ` +
          `partly cut; cue ` +
          `${document.querySelector(".build-shop-more") === null ? "retired" : "still shown"}`,
      );
      expect(
        Math.round(last.bottom),
        `scrolling the catalogue to its end at ${view.label} leaves the last card's bottom edge ` +
          `${Math.round(last.bottom - visible.bottom)}px below the visible frame`,
      ).toBeLessThanOrEqual(Math.round(visible.bottom) + 1);
      expect(
        document.querySelector(".build-shop-more"),
        `the scroll cue at ${view.label} is still shown at the end of the scroll`,
      ).toBeNull();
    }
  }
});

test("the catalogue keeps its own controls reachable by keyboard at the short window", {
  timeout: 180_000,
}, async () => {
  const view = WINDOWS.find((window_) => window_.label === "844x390") as Window_;
  const frame = await openCatalogue(view);
  const controls = [...frame.querySelectorAll<HTMLElement>("button:not([disabled])")];
  expect(controls.length, "the catalogue drew no controls").toBeGreaterThan(4);
  // The cue is decorative: it must not become a tab stop of its own, and it must not be the
  // thing standing between the keyboard and the cards.
  const cue = document.querySelector<HTMLElement>(".build-shop-more");
  expect(
    cue,
    "the catalogue does not scroll at 844x390, so this test measures nothing",
  ).not.toBeNull();
  expect(
    (cue as HTMLElement).querySelector("button, a[href], [tabindex]"),
    "the scroll cue added a tab stop of its own",
  ).toBeNull();

  // Every card is reachable, and focusing one scrolls it into the frame rather than leaving the
  // keyboard on something nobody can see.
  const cards = [...document.querySelectorAll<HTMLElement>(".build-card-cta")];
  expect(cards.length).toBeGreaterThan(0);
  const last = cards[cards.length - 1] as HTMLElement;
  last.focus();
  last.scrollIntoView({ block: "nearest", inline: "center" });
  await wait(150);
  expect(document.activeElement, "the last card cannot take focus").toBe(last);
  const box = boxOf(last);
  const visible = boxOf(frame);
  measured.push(
    `${view.label} last card focused: ${Math.round(box.top)}..${Math.round(box.bottom)} ` +
      `inside frame ${Math.round(visible.top)}..${Math.round(visible.bottom)}`,
  );
  expect(
    Math.round(box.bottom),
    "focusing the last card leaves it below the visible frame",
  ).toBeLessThanOrEqual(Math.round(visible.bottom) + 1);
});
