import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CitySurface } from "../city/CitySurface";
import { faceTheWinter } from "../test/faceTheWinter";
import { WinterEntryChip, winterHref } from "./WinterEntryChip";

/**
 * THE ROUTE SOMEBODY ACTUALLY TAKES, end to end.
 *
 * `WinterEntryChip.test.tsx` covers the chip in isolation; this covers the only thing that
 * matters about it, which is that a person who opens the city can FIND the winter. The chip's
 * whole reason to exist is that "append `?winter` to the address bar" is a worse answer than
 * a menu item, and a menu item nobody can reach is the same answer with extra steps.
 *
 * It lives in the winter's lane rather than beside `CitySurface.test.tsx` for the same reason
 * the component does: the winter's footprint in Evan's file is small, and the test that proves
 * it works should come out with it.
 *
 * ## Why this stopped asserting a link, and what replaced the assertion rather than dropping it
 *
 * It used to require the menu entry to be an `<a href="?winter">`, because navigating reused
 * the app's own escape hatch instead of adding a second way in. The lead then ruled that the
 * crisis must happen in the in-game screen — *"not a redirect to the same static dev site"* —
 * and a route is a different place by construction, so the menu entry cannot be a navigation
 * any more.
 *
 * The defect the old assertion caught was **"the winter became unreachable from the city"**,
 * and that is still the defect asserted below: the entry must be in the menu, beside the other
 * places, and pressing it must actually bring the winter up. What changed is where it lands.
 *
 * ## Why pressing it is now two clicks, and why the second one is still asserted here
 *
 * The entry used to call `setWinterInCity` itself, which made it a second door into the crisis
 * with the advisor missing from behind it — and the door somebody testing the crisis reaches
 * for, so the lead launched the winter from the menu and asked whether there was supposed to
 * be an advisor. There was. The entry now raises the briefing and "Face the winter" starts the
 * encounter, which is one ritual with two ways of arriving at it rather than two doors that
 * behave differently. `city/crisisEntrySequence.test.tsx` owns that sequence; what stays this
 * file's is the end of the route, so the walk below runs all the way to the board and a chip
 * wired to nothing still fails here.
 *
 * `?winter` is NOT abandoned by that, and is pinned here from both sides, because the route is
 * a debugging surface with tests of its own that this change was not allowed to break:
 *
 *  - {@link winterHref} still produces the address `App.tsx` reads, so typing or bookmarking
 *    it still works;
 *  - the chip with no in-city handler — which is how anything other than `CitySurface` renders
 *    it — is still that link, so the navigating form has not rotted behind the button.
 */

describe("finding the Hard Winter from the city", () => {
  it("is in the ☰ Menu, beside the other places, and opens ON the island", async () => {
    const user = userEvent.setup();
    // `onOpenSurface` is passed because `App.tsx` passes it: the whole "Other places" nav is
    // behind that prop, so the winter chip is exactly as available as Diagnostic and Lessons
    // are — no more and no less. Rendering without it would be testing a configuration the app
    // never ships. Checker Lab used to be named in that list and no longer belongs in it: it
    // is a development fixture and carries its own `isDevPersistenceEnabled()` gate, on the
    // winter chip's side of the line rather than the learner surfaces'.
    render(<CitySurface enableCanvas={false} onOpenSurface={() => undefined} />);
    // The city's own readiness signal, the same one its suite waits on.
    await screen.findByRole("button", { name: "Build" });

    // Nothing in the way until the menu is opened — it must be findable, not permanently in
    // the way, which is the same rule the How-to-play entry follows.
    expect(screen.queryByRole("button", { name: /Hard Winter/i })).toBeNull();
    expect(screen.queryByTestId("winter-in-city")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Menu" }));

    // In the "Other places" row, with the surfaces that were already there.
    const others = screen.getByRole("navigation", { name: "Other places" });
    const chip = within(others).getByRole("button", { name: /Hard Winter/i });
    expect(within(others).getByRole("button", { name: /Diagnostic/i })).toBeVisible();
    expect(within(others).getByRole("button", { name: /Lessons/i })).toBeVisible();

    // A control and not a navigation: the crisis happens on the island the player is already
    // standing on, so the entry may not be a link to somewhere else.
    expect(chip.tagName).toBe("BUTTON");
    expect(chip.getAttribute("href")).toBeNull();
    // And it says, on the hover, the thing somebody hesitating would want to know. That used
    // to be the flat "Nothing is written back", which was true of the whole feature when the
    // line was written and became false the moment the outcome panel grew a carry-back
    // button; the hover states the default AND its one exception, and the superseded promise
    // is asserted GONE rather than merely unmentioned.
    const title = chip.getAttribute("title") ?? "";
    expect(title).toMatch(/unless you carry the damage back/i);
    expect(title).not.toMatch(/nothing is written back/i);
    // ONE STRING, WHETHER OR NOT A CRISIS HAS CALLED. The entry now opens the advisor, and
    // the advisor is reachable from the era's first minute while the call itself is earned
    // at `ceil(n / 2)` of the era's nodes — so copy about answering a call would be a promise
    // the chip cannot keep for the learner most likely to press it. The hover says what
    // pressing it gets you and leaves the call to the surface that actually makes one.
    expect(title).not.toMatch(/\b(call|calls|called|answer|answers|answered|waiting)\b/i);

    // PRESSING IT BRINGS THE WINTER UP, through the ritual rather than around it. An enabled
    // chip that does nothing would satisfy every assertion above, and is exactly what a
    // missing `onOpenWinter` wire produces — so the walk does not stop at the card.
    await user.click(chip);
    const advisor = await screen.findByTestId("crisis-call-advisor");
    expect(advisor).toHaveAccessibleName("The Hard Winter");
    expect(screen.queryByTestId("winter-in-city")).toBeNull();

    await faceTheWinter(user);
    expect(await screen.findByTestId("winter-in-city")).toBeVisible();
  });

  it("leaves `?winter` reachable, from both ends", () => {
    // The address `App.tsx` reads. A rename here and not there produces a debugging surface
    // nobody can open.
    expect(winterHref("http://localhost:5190/?mock")).toMatch(/[?&]winter\b/);

    // ...and the NAVIGATING form of the chip is still a link, so the route has not rotted
    // behind the in-city button. This is the shape every caller other than `CitySurface`
    // renders, and the one the `?winter` route's own suite is reached through.
    render(<WinterEntryChip />);
    const link = screen.getByRole("link", { name: /Hard Winter/i });
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toMatch(/[?&]winter\b/);
  });
});
