/**
 * Oru, era one's advisor character, ported from `city/art/sources/OruAdvisor.dc.html`.
 *
 * Three of the four ways this port could quietly go wrong are provable here, from the
 * markup and the sources:
 *
 * 1. **The moods come from the delivery, not from CityGuide.** Oru has `idle`/`talk`/
 *    `point`/`squint` where CityGuide has `idle`/`talk`/`wave`/`cheer`, so a mood map
 *    copied across from `CITY_GUIDE_MOOD` would name poses Oru cannot strike. The
 *    delivery's own `data-props` enum is the fixture, so the type cannot drift from it.
 * 2. **The markup is static.** Every mood-dependent part is in the DOM at every mood and
 *    `data-mood` alone decides what shows, so swapping moods mid-sentence never re-mounts
 *    (and never restarts) the character.
 * 3. **The art carries no meaning.** The character is `aria-hidden` and wordless; the
 *    advisor's line lives in the bubble's DOM.
 *
 * The fourth — that all the motion is CSS and that `prefers-reduced-motion` holds every
 * bit of it still — needs a real stylesheet and a real CSSOM, so it lives next door in
 * `oruAdvisorMotion.browser.test.tsx`. This harness runs with `css: false`.
 *
 * Sources are read with Vite's `import.meta.glob('?raw')`, the house style — see
 * `revealScope.test.ts`.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { type AdvisorMood, AdvisorNpc } from "./AdvisorNpc";
import { OruAdvisorCharacter, type OruMood } from "./OruAdvisorCharacter";

const SOURCES = import.meta.glob(
  ["./OruAdvisorCharacter.tsx", "../city/art/sources/OruAdvisor.dc.html"],
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const COMPONENT = SOURCES["./OruAdvisorCharacter.tsx"] ?? "";
const DELIVERY = SOURCES["../city/art/sources/OruAdvisor.dc.html"] ?? "";

/** The mood enum the delivery itself declares, unescaped out of its `data-props`. */
function deliveredMoods(): string[] {
  const attr = /data-props="([^"]*)"/.exec(DELIVERY)?.[1];
  if (!attr) {
    throw new Error("expected the stored delivery to declare data-props");
  }
  const props = JSON.parse(attr.replaceAll("&quot;", '"')) as {
    mood?: { options?: string[] };
  };
  const options = props.mood?.options;
  if (!options?.length) {
    throw new Error("expected the delivery's data-props to enumerate mood options");
  }
  return options;
}

const DELIVERED_MOODS = deliveredMoods();

/**
 * Exhaustive from both ends. `Record<OruMood, true>` fails to *typecheck* the moment
 * `OruMood` gains or loses a member; `DECLARED_MOODS` reads the union straight out of the
 * component's source so the same drift also fails at *runtime*, where a type has no say.
 */
const ORU_MOODS_TYPED: Record<OruMood, true> = {
  idle: true,
  talk: true,
  point: true,
  squint: true,
};
const ORU_MOODS = Object.keys(ORU_MOODS_TYPED) as OruMood[];

/** The `OruMood` union as the component literally declares it. */
function declaredMoods(): string[] {
  const union = /export type OruMood =([^;]+);/.exec(COMPONENT)?.[1];
  if (!union) {
    throw new Error("expected the component to declare an OruMood union");
  }
  return Array.from(union.matchAll(/"([^"]+)"/g)).map(([, name]) => name as string);
}

const DECLARED_MOODS = declaredMoods();

/** Same `Record` trick for the lesson-level moods `AdvisorNpc` has to map onto Oru. */
const ADVISOR_MOODS_TYPED: Record<AdvisorMood, true> = {
  neutral: true,
  happy: true,
  encouraging: true,
};
const ADVISOR_MOODS = Object.keys(ADVISOR_MOODS_TYPED) as AdvisorMood[];

describe("Oru's moods come from the delivery", () => {
  it("the fixture actually parsed a mood enum out of the stored source", () => {
    // A floor, so the comparisons below cannot pass over an empty list.
    expect(DELIVERY.length).toBeGreaterThan(1000);
    expect(DELIVERED_MOODS.length).toBeGreaterThanOrEqual(2);
  });

  it("`OruMood` is exactly the delivery's enum — not CityGuide's four", () => {
    expect(DECLARED_MOODS.length).toBeGreaterThanOrEqual(2);
    expect([...DECLARED_MOODS].sort()).toEqual([...DELIVERED_MOODS].sort());
    expect([...ORU_MOODS].sort()).toEqual([...DELIVERED_MOODS].sort());
    expect(DECLARED_MOODS).not.toContain("wave");
    expect(DECLARED_MOODS).not.toContain("cheer");
  });

  it("renders each delivered mood onto `data-mood` for the CSS to key off", () => {
    for (const mood of ORU_MOODS) {
      const { container, unmount } = render(<OruAdvisorCharacter mood={mood} />);
      const root = container.querySelector(".oru-advisor");
      expect(root).not.toBeNull();
      expect(root?.getAttribute("data-mood")).toBe(mood);
      unmount();
    }
  });
});

describe("the markup is static: a mood swap re-poses, it never re-mounts", () => {
  /** The parts only one mood shows. All of them must exist at every mood. */
  const MOOD_PARTS = [
    "oru-advisor__eyes-open",
    "oru-advisor__eyes-narrow",
    "oru-advisor__mouth-line",
    "oru-advisor__mouth-talk",
    "oru-advisor__arm",
  ];

  it("every mood-dependent part is in the DOM at every mood", () => {
    for (const mood of ORU_MOODS) {
      const { container, unmount } = render(<OruAdvisorCharacter mood={mood} />);
      for (const part of MOOD_PARTS) {
        const shown = container.querySelectorAll(`.${part}:not([hidden])`);
        expect(shown.length, `${part} at ${mood}`).toBeGreaterThan(0);
      }
      unmount();
    }
  });

  it("keeps every DOM node identical across all four moods", () => {
    const { container, rerender } = render(<OruAdvisorCharacter mood="idle" />);
    const before = Array.from(container.querySelectorAll("*"));
    expect(before.length).toBeGreaterThan(40);
    for (const mood of ORU_MOODS) {
      rerender(<OruAdvisorCharacter mood={mood} />);
      const after = Array.from(container.querySelectorAll("*"));
      expect(after.length).toBe(before.length);
      after.forEach((node, i) => {
        expect(node, `node ${i} after switching to ${mood}`).toBe(before[i]);
      });
    }
  });

  it("branches on the mood nowhere in the component — `data-mood` is the only hand-off", () => {
    expect(COMPONENT.length).toBeGreaterThan(2000);
    expect(COMPONENT).toMatch(/data-mood=\{mood\}/);
    expect(COMPONENT).not.toMatch(/mood\s*(===|!==)/);
  });

  it("carries its motion in no inline style, and pulls in no module of its own", () => {
    expect(COMPONENT).not.toMatch(/animation/i);
    expect(COMPONENT).not.toMatch(/@keyframes/);
    expect(COMPONENT).not.toMatch(/^import\s/m);
  });
});

describe("the art is decorative; the words are in the DOM", () => {
  it("is aria-hidden, wordless, and exposes no role or label", () => {
    const { container } = render(<OruAdvisorCharacter mood="talk" />);
    const root = container.querySelector(".oru-advisor");
    expect(root?.getAttribute("aria-hidden")).toBe("true");
    expect(root?.textContent).toBe("");
    expect(container.querySelector("[role]")).toBeNull();
    expect(container.querySelector("[aria-label]")).toBeNull();
  });

  it("reaches for none of the reserved mastery gold", () => {
    expect(COMPONENT.toUpperCase()).not.toContain("FFB703");
  });
});

describe("AdvisorNpc hosts Oru, not the modern hard-hat guide", () => {
  it("mounts Oru and drops CityGuide from lesson narration", () => {
    const { container } = render(<AdvisorNpc line="Count the tally marks." />);
    expect(container.querySelector(".oru-advisor")).not.toBeNull();
    expect(container.querySelector(".city-guide")).toBeNull();
  });

  it("maps every lesson mood onto a pose Oru can actually strike", () => {
    expect(ADVISOR_MOODS.length).toBe(3);
    for (const mood of ADVISOR_MOODS) {
      const { container, unmount } = render(
        <AdvisorNpc line="Count the tally marks." mood={mood} />,
      );
      const pose = container.querySelector(".oru-advisor")?.getAttribute("data-mood");
      expect(DELIVERED_MOODS, `${mood} maps to ${pose}`).toContain(pose);
      unmount();
    }
  });

  it("keeps the spoken line and the slide's claim in the DOM, not in the art", () => {
    render(<AdvisorNpc line="Count the tally marks." subtitle="Tallies group by five" />);
    expect(screen.getByText("Count the tally marks.")).toBeInTheDocument();
    expect(screen.getByText("Tallies group by five")).toBeInTheDocument();
  });
});
