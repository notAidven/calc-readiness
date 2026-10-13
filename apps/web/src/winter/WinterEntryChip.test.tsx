import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  CityReturnChip,
  cityHref,
  WINTER_QUERY_PARAM,
  WinterEntryChip,
  winterHref,
} from "./WinterEntryChip";

/**
 * THE WAY IN AND THE WAY BACK OUT, and the reason both are links.
 *
 * The chip is the winter's entire footprint in `CitySurface`, so what is worth pinning is
 * the two things that would quietly break it: the query parameter it sets (which `App.tsx`
 * reads independently, so a rename in one place and not the other produces a chip that
 * goes nowhere) and the rest of the address bar surviving the trip.
 *
 * The way back is pinned for a third reason: it is what the outcome panel's success line
 * instructs, and a round trip that did not land back on the ordinary app would leave the
 * player who followed that instruction stuck on the surface that gave it.
 */

describe("the way into the winter from the city", () => {
  it("sets the flag App.tsx watches for, bare rather than empty-valued", () => {
    expect(WINTER_QUERY_PARAM).toBe("winter");

    const href = winterHref("http://localhost:5190/");
    expect(href).toBe("http://localhost:5190/?winter");
    // `searchParams.set` would render `?winter=`, which reads like a setting with a
    // missing value. `App.tsx` only asks `has("winter")`, so both work — but only one is
    // the form somebody would type by hand, and the chip should teach the URL.
    expect(href).not.toContain("winter=");
  });

  it("keeps whatever else is on the address bar", () => {
    // A `?mock` or `?reset` session must not be silently dropped on the way in: the city
    // being previewed is the city the winter should fall on.
    expect(winterHref("http://localhost:5190/?mock")).toContain("mock");
    expect(winterHref("http://localhost:5190/?mock")).toContain("winter");

    const withValue = winterHref("http://localhost:5190/?era=2&x=1");
    expect(withValue).toContain("era=2");
    expect(withValue).toContain("x=1");
    expect(withValue).toContain("winter");
    // Only the bare winter flag loses its `=`, not neighbours that carry real values.
    expect(withValue).not.toContain("winter=");
  });

  it("is idempotent, so arriving from a winter URL does not double the flag", () => {
    const once = winterHref("http://localhost:5190/?winter");
    expect(once).toBe("http://localhost:5190/?winter");
    expect(once.match(/winter/g)).toHaveLength(1);
  });

  it("renders as a real link, and its hover states the opt-in rather than a ban", () => {
    render(<WinterEntryChip />);
    const link = screen.getByRole("link", { name: /Hard Winter/i });

    // A link and not a button: it goes to another page, so it should middle-click and
    // open in a new tab like one.
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toContain("winter");
    // This assertion used to require the words "Nothing is written back", and that copy
    // was true when it was written and false once the outcome panel gained its carry-back
    // button. What the hover owes the player is the DEFAULT plus the exception, so the
    // promise is now conditional — and the flat denial is asserted GONE, because a chip
    // that still carried it would be the one sentence in the feature that lies.
    const title = link.getAttribute("title") ?? "";
    expect(title).toMatch(/unless you carry the damage back/i);
    expect(title).not.toMatch(/nothing is written back/i);
    // It wears the city's own chip class, so it sits in the menu row rather than beside it.
    expect(link.className).toBe("city-chip");
  });
});

describe("the way back to the city from the winter", () => {
  it("drops the flag App.tsx reads, and nothing else", () => {
    expect(cityHref("http://localhost:5190/?winter")).toBe("http://localhost:5190/");
    // The bare flag and the empty-valued form both have to go: `winterHref` writes the
    // first, and a hand-typed URL or a `searchParams.set` elsewhere writes the second.
    expect(cityHref("http://localhost:5190/?winter=")).toBe("http://localhost:5190/");
    expect(cityHref("http://localhost:5190/?winter=1")).toBe("http://localhost:5190/");
  });

  it("keeps the rest of the address bar, so it returns to the city it came from", () => {
    // Losing `?mock` on the way out would land the player in a DIFFERENT city from the one
    // whose snapshot the winter just fell on — and, after a carry-back, a different city
    // from the one now carrying the ruins.
    const back = cityHref("http://localhost:5190/?mock&winter&era=2");
    expect(back).toContain("mock");
    expect(back).toContain("era=2");
    expect(back).not.toContain("winter");
  });

  it("round-trips, so in and back out is where you started", () => {
    const start = "http://localhost:5190/?mock";
    expect(cityHref(winterHref(start))).toBe(start);
  });

  it("is a no-op on an address that never carried the flag", () => {
    expect(cityHref("http://localhost:5190/?mock")).toBe("http://localhost:5190/?mock");
  });

  it("leaves a neighbouring BARE flag bare, rather than giving it an `=`", () => {
    // The first draft of `cityHref` used `searchParams.delete`, and serialising a
    // `URLSearchParams` back writes `?mock=` for a flag that arrived as `?mock`. Every
    // reader in this app asks `has()`, so both forms work — which is precisely why nothing
    // downstream would have caught it, and why the shape is pinned here instead.
    expect(cityHref("http://localhost:5190/?mock&winter")).toBe(
      "http://localhost:5190/?mock",
    );
    expect(cityHref("http://localhost:5190/?winter&mock&reset")).toBe(
      "http://localhost:5190/?mock&reset",
    );
  });

  it("renders as a real link that is honest about the title screen", () => {
    render(<CityReturnChip />);
    const link = screen.getByRole("link", { name: /Back to my city/i });

    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).not.toContain("winter");
    // The hover names the step between here and the island. `App.tsx` opens every normal
    // entry on the title screen, so a chip promising the city outright would be promising
    // a destination one click further on than the one it reaches.
    expect(link.getAttribute("title")).toMatch(/title screen/i);
    expect(link.getAttribute("title")).toMatch(/Start/);
  });
});
