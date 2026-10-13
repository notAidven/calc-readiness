import { fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CityReturnFromPlagueChip,
  PlagueEntryChip,
  cityHrefFromPlague,
  PLAGUE_QUERY_PARAM,
  plagueHref,
} from "./PlagueEntryChip";

/**
 * **THE DOOR IS DEV ONLY, AND THE ROUND TRIP THROUGH IT IS THE IDENTITY.**
 *
 * Two claims. The gate is covered beside the skip control in `plagueDevSkipIsGated.test.tsx`,
 * because the point there is that the two answer TOGETHER — one definition of dev per feature — and
 * splitting them across two files is how they would come apart. What is here is the half that file
 * cannot make: the URLs.
 *
 * ## WHY THE QUERY IS EDITED AS TEXT, MEASURED
 *
 * `WinterEntryChip` records the finding this copy inherits: a round trip through `URLSearchParams`
 * gives every bare flag an `=`, so `?mock&plague` would come back as `?mock=`. Every reader in this
 * app asks `has()`, so that URL still works — which is exactly what makes it the kind of drift
 * nothing catches. The assertion below is therefore an equality on the whole string rather than a
 * `has()` check: in and back out has to be byte-identical, or something the pair was not addressing
 * has been normalised on the way past.
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the two directions are one contract", () => {
  it("writes the flag bare and leaves every other entry byte-identical", () => {
    expect(plagueHref("https://app.test/")).toBe(`https://app.test/?${PLAGUE_QUERY_PARAM}`);
    // A bare neighbour stays bare, which is the whole finding: `searchParams.set` would have
    // written `?mock=`.
    expect(plagueHref("https://app.test/?mock")).toBe("https://app.test/?mock&plague");
    // Already on the route, so nothing is added twice.
    expect(plagueHref("https://app.test/?plague&mock")).toBe(
      "https://app.test/?plague&mock",
    );
    // A valued neighbour keeps its value.
    expect(plagueHref("https://app.test/?era=renaissance")).toBe(
      "https://app.test/?era=renaissance&plague",
    );
  });

  it("takes the flag back out and changes nothing else", () => {
    expect(cityHrefFromPlague("https://app.test/?plague")).toBe("https://app.test/");
    expect(cityHrefFromPlague("https://app.test/?mock&plague")).toBe(
      "https://app.test/?mock",
    );
    expect(cityHrefFromPlague("https://app.test/?plague=1&mock")).toBe(
      "https://app.test/?mock",
    );
  });

  /**
   * THE ROUND TRIP IS THE IDENTITY, over the shapes a session can actually be in.
   *
   * This is the assertion that would have caught the `?mock=` drift, and it is an equality on the
   * whole URL rather than on a `has()` read for exactly that reason.
   */
  it("is the identity in and back out", () => {
    for (const from of [
      "https://app.test/",
      "https://app.test/?mock",
      "https://app.test/?mock&reset",
      "https://app.test/?era=renaissance&mock",
    ]) {
      expect(cityHrefFromPlague(plagueHref(from)), from).toBe(from);
    }
  });
});

describe("the Care House tuning door stays out of learner builds", () => {
  it("opens the in-city form locally", () => {
    const calls: number[] = [];
    const view = render(<PlagueEntryChip onOpenInCity={() => calls.push(1)} />);
    fireEvent.click(view.getByRole("button", { name: /Care House/ }));
    expect(calls).toEqual([1]);
  });

  it("renders nothing when a production API is configured", () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "/api/diagnostic");
    const view = render(<PlagueEntryChip onOpenInCity={() => undefined} />);
    expect(view.container).toBeEmptyDOMElement();
  });
});

describe("the way back out is rendered inside the crisis", () => {
  it("is a real link, and it is honest about the title screen in between", () => {
    // `window.location.href` in jsdom, which is what the chip reads.
    const view = render(<CityReturnFromPlagueChip />);
    const link = view.getByRole("link");
    expect(link.getAttribute("href")).not.toContain(PLAGUE_QUERY_PARAM);
    expect(link.getAttribute("title")).toContain("title screen");
  });
});
