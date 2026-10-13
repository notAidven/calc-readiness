import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SuccessionAdvisor } from "../../succession/SuccessionAdvisor";
import { CrisisCallAdvisor } from "../CrisisCallAdvisor";
import { crisisBriefingForCity } from "../crisisCall";
import { CURRENT_ERA_ID } from "../eraDressing";
import { OnboardingAdvisor } from "./OnboardingAdvisor";

/**
 * **THE ONBOARDING ADVISOR IS THE CRISIS ADVISOR'S PRESENTATION, NOT A SECOND ONE LIKE IT.**
 *
 * The team lead asked for *"the stuff that would make the advisor display on screen like he does
 * for the crisis"*, and his reason, on the winter, is that presented that way the advisor takes
 * up a large portion of the screen and *"it actually looks interactive"*, as against an in-text
 * display. So "like he does for the crisis" is the requirement itself and not a stylistic note,
 * and a requirement worth writing down is worth a guard.
 *
 * ## ⚑ THE POPULATION IS SURFACES IN THIS REGISTER, NOT FILES THAT IMPORT THE COMPONENT
 *
 * `.cursor/rules/qa-verification.mdc`: scope a guard by who exhibits the behaviour, not by where
 * the behaviour is implemented. The behaviour is *"this surface puts the advisor on screen full
 * height with a giant speech bubble over the island"*, and **a surface can do that without
 * importing a line of `AdvisorStage`** — the assembly is nine elements and six class names, so
 * the cheap way to add a third one is to copy it. That copy is exactly the defect this file
 * exists for, and a population derived from `AdvisorStage`'s importers would be blind to it by
 * construction: the drifting surface is the one that stopped importing.
 *
 * So the population is derived from the SOURCES in two ways, which between them cover both ways
 * of being in this register:
 *
 *  - {@link THROUGH_THE_STAGE} — renders `<AdvisorSpeech`, the shared way.
 *  - {@link REIMPLEMENTS_THE_STAGE} — writes the assembly's own class names itself, which is the
 *    drift. Required to be empty, with `AdvisorStage.tsx` itself asserted to contain them so the
 *    emptiness is a real absence rather than a pattern that matches nothing.
 *
 * ## AND THE TWO SURFACES ARE DRIVEN, not just counted
 *
 * A set-equality check between the derived population and the two rendered here, so a third
 * advisor surface fails until somebody drives it, on `crisisDressIsTheLiveEras.test.tsx`'s
 * `DOORS` / `DRIVEN_DOORS` precedent. Then both are mounted and their presentation skeletons are
 * compared element for element.
 *
 * ## WHAT THIS FILE CANNOT SEE, named rather than left to be discovered
 *
 * **It reads the DOM, so it is a claim about markup and not about pixels.** `styles.css` is not
 * loaded in jsdom, so nothing here knows how tall the figure is or whether the bubble covers the
 * island. That claim is `onboardingAdvisorShots.browser.test.tsx`'s, which measures the figure's
 * box at 1024x580 against the crisis's at the same viewport and writes the frames somebody has
 * to look at. The two are complementary: this one fails if the markup diverges, that one fails
 * if the same markup somehow draws smaller.
 */

/**
 * Every non-test source in the web app, as text.
 *
 * `import.meta.glob` with `?raw` rather than `node:fs`, which is the house style for a source
 * read in this lane and not a preference: the web project has no node types, so a `readFileSync`
 * version does not typecheck. The glob is the whole of `apps/web/src` on purpose, because the
 * failure this is written against is a surface growing its own advisor somewhere else.
 */
const SOURCES = import.meta.glob(["../../**/*.{ts,tsx}", "!../../**/*.test.{ts,tsx}"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/**
 * A glob key as a path under `apps/web/src`, so a failure names a file somebody can open.
 *
 * Vite normalises every key to the SHORTEST relative form from this file, which is
 * `city/onboarding/`, so one prefix strip is not enough: a sibling comes back as
 * `./OnboardingAdvisor.tsx`, the city lane as `../AdvisorStage.tsx`, and everything else as
 * `../../winter/x.tsx`. Getting this wrong is silent rather than loud, because a mis-resolved
 * key simply never matches a declared path.
 */
function underSrc(globPath: string): string {
  if (globPath.startsWith("../../")) {
    return globPath.slice("../../".length);
  }
  if (globPath.startsWith("../")) {
    return `city/${globPath.slice("../".length)}`;
  }
  return `city/onboarding/${globPath.replace(/^\.\//, "")}`;
}

const TREE: readonly (readonly [string, string])[] = Object.entries(SOURCES)
  .map(([path, source]) => [underSrc(path), source] as const)
  .sort(([left], [right]) => left.localeCompare(right));

function sourceOf(path: string): string {
  const found = TREE.find(([known]) => known === path);
  if (!found) {
    throw new Error(
      `the glob did not reach ${path}, so anything this file says about it is worthless`,
    );
  }
  return found[1];
}

/** The file that OWNS the presentation. Everything else in this register goes through it. */
const THE_STAGE = "city/AdvisorStage.tsx";

/** Renders the shared speech assembly: the sanctioned way to be in this register. */
const USES_THE_STAGE = /<AdvisorSpeech\b/;

/**
 * Writes the assembly's own class names. In `AdvisorStage.tsx` that is the implementation; in
 * any other source it is a copy of it, which is the drift.
 *
 * Two class names rather than one, and both are load-bearing: `__figure` is the character's box
 * and `__bubble` is the shout's, so a surface that reproduced one without the other would be
 * half a copy and is still not this presentation.
 */
const WRITES_THE_ASSEMBLY = /crisis-call-speech__(?:figure|bubble)/;

const THROUGH_THE_STAGE: readonly string[] = TREE.filter(([, source]) =>
  USES_THE_STAGE.test(source),
).map(([path]) => path);

const REIMPLEMENTS_THE_STAGE: readonly string[] = TREE.filter(
  ([path, source]) => path !== THE_STAGE && WRITES_THE_ASSEMBLY.test(source),
).map(([path]) => path);

/* -------------------------------------------------------------------------- */
/* The two surfaces, rendered                                                  */
/* -------------------------------------------------------------------------- */

const CRISIS = (() => {
  const found = crisisBriefingForCity(CURRENT_ERA_ID);
  if (found === null) {
    throw new Error("era one has no crisis briefing, so this whole file proves nothing");
  }
  return found;
})();

/** A surface in this register, mounted, with the stage element it produced. */
interface DrivenSurface {
  readonly path: string;
  readonly open: () => HTMLElement;
}

const DRIVEN: readonly DrivenSurface[] = [
  {
    path: "city/CrisisCallAdvisor.tsx",
    open: () => {
      render(<CrisisCallAdvisor briefing={CRISIS} onFace={vi.fn()} onLater={vi.fn()} />);
      return screen.getByTestId("crisis-call-advisor");
    },
  },
  {
    path: "city/onboarding/OnboardingAdvisor.tsx",
    open: () => {
      render(<OnboardingAdvisor eraId={CURRENT_ERA_ID} onDone={vi.fn()} />);
      return screen.getByTestId("onboarding-advisor");
    },
  },
  {
    // ERA FOUR'S CRISIS, added when the Succession got an advisor. The set equality above is
    // what made this a required edit rather than an optional one: a third surface renders
    // `<AdvisorSpeech>` and the population found it before anybody remembered to.
    path: "succession/SuccessionAdvisor.tsx",
    open: () => {
      render(<SuccessionAdvisor onBegin={vi.fn()} onLater={vi.fn()} />);
      return screen.getByTestId("sx-advisor");
    },
  },
];

/**
 * THE PRESENTATION SKELETON: the class names of the assembly's elements, in tree order, with
 * everything the caller put inside the bubble left out.
 *
 * The subject is the presentation and not the content, so this stops at the bubble's scroll box:
 * what the crisis puts in there is four paginated slides and a gated primary action, and what
 * onboarding puts in there is three moments and a skip. Those SHOULD differ. What may not differ
 * is the stage, the figure, the bubble, the tail's host, the byline and the shout, which is
 * exactly the set below.
 */
function presentationSkeleton(stage: HTMLElement): string[] {
  const said = stage.querySelector(".crisis-call-speech__said");
  const parts: string[] = [];
  const walk = (node: Element, depth: number) => {
    parts.push(`${"  ".repeat(depth)}${node.tagName.toLowerCase()}.${node.className}`);
    if (node === said) {
      // The caller's own content starts here. Descend one level so the byline and the shout
      // are still compared, and no further.
      for (const child of Array.from(node.children).slice(0, 2)) {
        parts.push(
          `${"  ".repeat(depth + 1)}${child.tagName.toLowerCase()}.${child.className}`,
        );
      }
      return;
    }
    for (const child of Array.from(node.children)) {
      walk(child, depth + 1);
    }
  };
  walk(stage, 0);
  return parts;
}

describe("the onboarding advisor is presented the way the crisis advisor is", () => {
  it("finds every surface in this register, and drives exactly the ones it found", () => {
    // FLOOR: a comparison between two rendered surfaces proves nothing if the population is
    // one, and a set equality over an empty derived set is green.
    expect(THROUGH_THE_STAGE.length).toBeGreaterThanOrEqual(2);
    // COMPOSITION: a third surface in this register fails here until it is driven below, rather
    // than being covered by the two that were.
    expect(new Set(DRIVEN.map((surface) => surface.path))).toEqual(
      new Set(THROUGH_THE_STAGE),
    );
  });

  it("leaves nobody writing the assembly for themselves", () => {
    // THE DRIFT DIRECTION. A surface that copied the nine elements and six class names instead
    // of calling the shared components would be a second advisor built to look like the first,
    // and it would pass every other assertion in this file by never being in the population.
    expect(
      REIMPLEMENTS_THE_STAGE,
      `${REIMPLEMENTS_THE_STAGE.length} sources draw the advisor assembly themselves: render <AdvisorSpeech> instead`,
    ).toEqual([]);
    // AND THE PATTERN REALLY MATCHES SOMETHING, so the absence above is an absence rather than
    // a regex that was never going to fire. `AdvisorStage.tsx` is the one file that must hold
    // it, and a rename of the stylesheet's prefix fails here rather than silently retiring the
    // check.
    expect(
      sourceOf(THE_STAGE),
      `${THE_STAGE} no longer draws the assembly, so the sweep above is vacuous`,
    ).toMatch(WRITES_THE_ASSEMBLY);
  });

  it.each(DRIVEN.map((surface) => [surface.path, surface] as const))(
    "%s renders the same presentation skeleton",
    (_path, surface) => {
      const skeleton = presentationSkeleton(surface.open());
      // A FLOOR ON THE SKELETON ITSELF: two empty arrays are equal, and a stage that rendered
      // nothing would satisfy the comparison below with nothing in it.
      expect(skeleton.length).toBeGreaterThanOrEqual(6);
      expect(skeleton.join("\n")).toContain("crisis-call-speech__figure");
      expect(skeleton.join("\n")).toContain("crisis-call-speech__bubble");
      expect(skeleton.join("\n")).toContain("crisis-call-lede");
    },
  );

  it("renders a skeleton that is identical element for element", () => {
    const [crisis, onboarding] = DRIVEN.map((surface) => {
      const skeleton = presentationSkeleton(surface.open());
      // Each surface is torn down before the next mounts, so the second query cannot pick up
      // the first surface's stage.
      document.body.replaceChildren();
      return skeleton;
    });
    // THE CLAIM. Not "both contain a figure" but "the two are the same assembly", so a padding
    // wrapper, a second bubble layer or a figure moved inside the bubble on one surface and not
    // the other fails here with the difference printed.
    expect(onboarding).toEqual(crisis);
  });

  it("puts the same dialogue semantics on both, so neither is a decorative overlay", () => {
    for (const surface of DRIVEN) {
      const stage = surface.open();
      expect(stage.getAttribute("role"), surface.path).toBe("dialog");
      expect(stage.getAttribute("aria-modal"), surface.path).toBe("true");
      // Named by a heading that is announced and not drawn, which is what survived the title
      // ribbon coming off the crisis card.
      expect(stage.className, surface.path).toContain("crisis-call-stage");
      const heading = stage.querySelector("h2");
      expect(heading?.className, surface.path).toContain("visually-hidden");
      expect((heading?.textContent ?? "").length, surface.path).toBeGreaterThan(4);
      // And the figure is decoration with the words carrying the meaning, on both.
      expect(
        stage.querySelector(".crisis-call-speech__figure")?.getAttribute("aria-hidden"),
        surface.path,
      ).toBe("true");
      expect(stage.querySelector(".oru-advisor"), surface.path).not.toBeNull();
      document.body.replaceChildren();
    }
  });
});
