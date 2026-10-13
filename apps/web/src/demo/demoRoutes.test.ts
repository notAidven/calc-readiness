import { ERA_SEQUENCE, eraNumber, getEraOrThrow } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { CRISIS_PREVIEW_ROUTES, requestedCrisisPreview } from "../crisisPreviewRoutes";
import {
  DEMO_CRISES,
  demoCrisisHref,
  demoEraHref,
  ENTRY_PARAMS,
  ERA_PARAM,
  eraCaption,
  requestedEra,
} from "./demoRoutes";

/**
 * The router has two populations: learner-visible crisis previews from the canonical registry,
 * and local developer probes read directly in `App`. The production demo gets the first and
 * must never get the second.
 */

/** `App.tsx` as source text, read through Vite the way every sweep in this tree reads one. */
const APP_SOURCE = (
  import.meta.glob("../App.tsx", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>
)["../App.tsx"] as string;

/**
 * Every literal query parameter `App.tsx` reads for a developer-only route or modifier.
 *
 * `App` writes each one as `new URLSearchParams(window.location.search).has("<param>")`, so the
 * match is on that exact call rather than on the string appearing in a comment.
 */
const ROUTED_PARAMS: readonly string[] = [
  ...new Set(
    [
      ...APP_SOURCE.matchAll(
        /URLSearchParams\(window\.location\.search\)\.has\("([^"]+)"\)/g,
      ),
    ].map((match) => match[1] as string),
  ),
];

/**
 * The local-only routes and modifiers, named with the reason each is excluded from the public
 * demo, and asserted in both directions below.
 *
 * The first direction stops a deleted route sitting here forever exempting nothing; the second
 * stops the list excusing something that has become a crisis. Without the pair, a fifth crisis
 * added to `App` could be silenced by one line here and nobody would see it.
 */
const PUBLIC_DEMO_EXCEPTIONS: ReadonlyMap<string, string> = new Map([
  ["mock", "a seeded preview of the ordinary city, not a destination of its own"],
  ["dev", "the full-screen lesson list"],
  ["three", "the single-model GLB bench"],
  ["graph", "the diagnostic lane's graph-answer probe"],
  ["interactive", "the interactive-widget probe"],
  ["succession-fixture", "the authored-forum geometry fixture"],
  ["paths", "a modifier on ?mock, not a route"],
  ["mastered", "a modifier on ?mock, not a route"],
  ["bare", "a modifier on ?mock, not a route"],
]);

describe("the production demo routes learner features but never developer probes", () => {
  /**
   * THE PREMISE. Without it, "every routed crisis is on the console" is trivially true of a
   * derivation that found nothing, which is the shape `#193` shipped for weeks.
   */
  it("derives real crisis and developer-route populations", () => {
    expect(
      ROUTED_PARAMS.length,
      "the derivation found no literal query reads in App.tsx",
    ).toBeGreaterThanOrEqual(8);
    expect(CRISIS_PREVIEW_ROUTES.length).toBeGreaterThanOrEqual(4);
    expect(CRISIS_PREVIEW_ROUTES.map((route) => route.param)).toContain("winter");
  });

  /**
   * Set equality is the first direction: a local query read added to `App` must be explicitly
   * classified, and a deleted read cannot leave a stale exception behind.
   */
  it("classifies every literal App query as a public-demo exception, exactly", () => {
    expect([...ROUTED_PARAMS].sort()).toEqual([...PUBLIC_DEMO_EXCEPTIONS.keys()].sort());
    expect(PUBLIC_DEMO_EXCEPTIONS.size).toBeGreaterThanOrEqual(8);
  });

  /**
   * **THE EXEMPTION LIST'S FIRST DIRECTION**, in a case of its own so it has a red of its own.
   * Folded into the set-equality assertion above it was unreachable: the injection that deletes
   * a bench route also changes the routed set, so set-equality fired first and this direction
   * was never demonstrated. A bench that stops existing must not sit in the list forever
   * excusing nothing and hiding that it excuses nothing.
   */
  it("holds every exception to a route App.tsx still has and a recorded reason", () => {
    for (const [param, why] of PUBLIC_DEMO_EXCEPTIONS) {
      expect(
        ROUTED_PARAMS,
        `?${param} is excluded (${why}) but App.tsx no longer reads it`,
      ).toContain(param);
      expect(why.length, `?${param} has no reason recorded`).toBeGreaterThan(15);
    }
  });

  /**
   * **AND THE SECOND DIRECTION.** A bench cannot also be on the console: if one were, it would
   * be excused from the population and offered from it at once, and the exemption would have
   * stopped describing what it excuses. That is the way an exception becomes permanent by
   * neglect, so it is asserted rather than argued.
   */
  it("never both excludes a route and exposes it as a crisis preview", () => {
    const both = CRISIS_PREVIEW_ROUTES.map((crisis) => crisis.param).filter((param) =>
      PUBLIC_DEMO_EXCEPTIONS.has(param),
    );
    expect(
      both,
      "a route is both learner-visible and excluded as a developer probe",
    ).toEqual([]);
  });

  /** The registry is the router: every member resolves by the address the showcase emits. */
  it("routes every canonical crisis and exposes that same population to the showcase", () => {
    expect(DEMO_CRISES).toBe(CRISIS_PREVIEW_ROUTES);
    for (const crisis of CRISIS_PREVIEW_ROUTES) {
      expect(requestedCrisisPreview(`?${crisis.param}`)).toBe(crisis);
      expect(() => getEraOrThrow(crisis.eraId)).not.toThrow();
      expect(eraCaption(crisis.eraId)).toBe(
        `era ${eraNumber(crisis.eraId)} · ${getEraOrThrow(crisis.eraId).name}`,
      );
    }
    // The four are four different eras, so the row is a map of the game rather than a list.
    expect(new Set(CRISIS_PREVIEW_ROUTES.map((crisis) => crisis.eraId)).size).toBe(
      CRISIS_PREVIEW_ROUTES.length,
    );
  });
});

describe("the era row", () => {
  /**
   * **ERA FOUR IS THE INSTANCE, not the class.** The lead asked for era four's Succession forum
   * by name, so era four's own link is asserted by name — and asserted through the reader
   * `App.tsx` uses rather than by comparing strings, because `?era=classical` is only worth
   * anything if `previewStartEra`'s parse gives `classical` back.
   */
  it("reaches era four, and its href parses back to classical through App's own reader", () => {
    const fourth = ERA_SEQUENCE[3];
    expect(fourth?.id).toBe("classical");
    expect(eraNumber("classical")).toBe(4);

    const href = demoEraHref("http://localhost:5173/", "classical");
    expect(href).toBe("http://localhost:5173/?era=classical");
    // The exact read `App.tsx`'s `previewStartEra()` performs, over the generated search.
    const parsed = new URLSearchParams(new URL(href).search).get(ERA_PARAM)?.trim();
    expect(ERA_SEQUENCE.find((era) => era.id === parsed)?.id).toBe("classical");
    expect(requestedEra(new URL(href).search)).toBe("classical");
  });

  /** Every era, derived from the sequence, so an eleventh joins the console by existing. */
  it("offers every era in the authored order", () => {
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
    for (const era of ERA_SEQUENCE) {
      expect(requestedEra(new URL(demoEraHref("http://localhost/", era.id)).search)).toBe(
        era.id,
      );
    }
  });

  /** A slug the sequence does not know reads as era one rather than being handed to a resolver. */
  it("declines an era the sequence does not have", () => {
    expect(requestedEra("?era=steampunk")).toBeNull();
    expect(requestedEra("?era=")).toBeNull();
    expect(requestedEra("")).toBeNull();
  });
});

describe("one press cannot ask for two destinations at once", () => {
  /**
   * **THE DEFECT THIS RULE EXISTS FOR, injected.** `successionHref` drops `winter` and
   * `succession` and leaves `plague` and `intrusion` alone, so from `?plague` its address is
   * `?plague&succession` — two routes on one URL, resolved by whichever branch `App` tests
   * first. A console offering all four at once is exactly where that bites, so every link here
   * drops every entry parameter before setting its own.
   */
  it("drops every other entry parameter, from a URL carrying all of them", () => {
    const loaded = `http://localhost:5173/?${ENTRY_PARAMS.join("&")}&era=cyberpunk&reset`;
    for (const crisis of DEMO_CRISES) {
      const search = new URL(demoCrisisHref(loaded, crisis.param)).searchParams;
      expect([...search.keys()].filter((key) => ENTRY_PARAMS.includes(key))).toEqual([
        crisis.param,
      ]);
      expect(search.has(ERA_PARAM), "a crisis link left an era queued behind it").toBe(
        false,
      );
      // ...and whatever else the presenter typed survives the trip.
      expect(search.has("reset")).toBe(true);
    }
    for (const era of ERA_SEQUENCE) {
      const search = new URL(demoEraHref(loaded, era.id)).searchParams;
      expect([...search.keys()].filter((key) => ENTRY_PARAMS.includes(key))).toEqual([]);
      expect(search.get(ERA_PARAM)).toBe(era.id);
      expect(search.has("reset")).toBe(true);
    }
  });

  /**
   * `App.tsx` only ever asks `has(param)`, and the bare form is what a reviewer types and what
   * every chip's own builder produces. A trailing `=` would still route, so this is about the
   * address bar reading the way the runbook says it does rather than about correctness.
   */
  it("writes the flag bare, the way the chips' own builders do", () => {
    for (const crisis of DEMO_CRISES) {
      const href = demoCrisisHref("http://localhost:5173/", crisis.param);
      expect(href).toBe(
        crisis.param === "succession"
          ? "http://localhost:5173/?succession&prototype"
          : `http://localhost:5173/?${crisis.param}`,
      );
      expect(new URLSearchParams(new URL(href).search).has(crisis.param)).toBe(true);
    }
  });
});
