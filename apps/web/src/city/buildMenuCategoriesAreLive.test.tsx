import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CitySurface } from "./CitySurface";
import { type CityDevSession, createCityDevSession } from "./citySession";
import { MOCK_MASTERED_NODE_STATES } from "./mockCity";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "./townHall";
import { BUILDABLE_RADIUS, defaultPlacements, type PlacedTransform } from "./worldLayout";

/**
 * **THE BUILD MENU OFFERS NO DOOR THAT OPENS ONTO NOTHING.**
 *
 * Ruled by the team lead on 2026-08-04, looking at a running build: *"remove decorations
 * and defenses from the option list."* Both were `enabled: false` placeholders carrying a
 * "Soon" pip over a panel that read *"Decorations buildings are on the way"* — a tab you
 * could focus, could not select, and would find empty if you could. Removing them is
 * `BUILD_TABS`; keeping them removed is this file.
 *
 * ## WHY THIS FILE EXISTS AT ALL, which is a rule about the guard and not about the tabs
 *
 * `CitySurface.test.tsx` used to close its census with *"…and a placeholder is still
 * genuinely disabled, so `not disabled` above means something"*, pointed at the Decorations
 * tab. That line was load-bearing: it was the witness that made `not.toHaveAttribute(
 * "aria-disabled")` on Roads and Civic a measurement rather than a tautology. Deleting the
 * placeholders deletes the witness, and `.cursor/rules/qa-verification.mdc` names exactly
 * that shape — *"a guard whose population becomes empty because you removed the category is
 * a hollow guard"*. So the negative assertion is not quietly left behind with nothing to
 * lean on; it is replaced by a positive sweep over the categories that DO exist.
 *
 * ## THE POPULATION IS EVERY CATEGORY THE STRIP RENDERS, read from the DOM
 *
 * Not a written-down list of three names, and not `BUILD_TABS` imported and looped over
 * either. Both would be this file measuring its own copy of the answer; the tablist a
 * learner is handed is the only population the claim is about, and a category added
 * tomorrow joins this sweep with no edit here.
 *
 * ## WHAT EACH ONE IS ASKED
 *
 * Selectability alone is not the property. A tab could be perfectly clickable and still
 * hand back the empty-catalogue copy, which is the placeholder defect wearing a different
 * hat — so every category has to open AND has to put at least one buildable card in the
 * panel. Between them those two are the whole of "this door leads somewhere":
 *
 *  1. it carries no `aria-disabled` and no "Soon" pip;
 *  2. clicking it makes it the selected tab;
 *  3. the panel it opens holds at least one card CTA (`[data-node-id]`), rather than one of
 *     the two "nothing here" paragraphs (`.build-shop-empty`).
 *
 * **There is no exception list, and that is a claim rather than an omission.** All three
 * categories owe all three properties; none of them is a surface that legitimately cannot
 * be entered. The day one is — a category whose catalogue is era-gated to nothing in era
 * one, say — it needs naming here with its reason and asserting in both directions, per the
 * QA rule, not filtering out of the derived population where it would be indistinguishable
 * from a regression.
 *
 * ## SHOWN RED RATHER THAN ARGUED
 *
 * A test written green may be asserting nothing, and this one is a sweep over a derived
 * population, which is the shape that fails silently. So all three claims were forced false
 * on the tree this landed on and the failures were read rather than reasoned about. Each
 * message below is quoted from the run; the LINE numbers are deliberately not, because they
 * move every time something is inserted above them and a stale citation reads as precision:
 *
 *  - **the defect it was written for.** One
 *    `{ id: "decorations", label: "Decorations", enabled: false }` put back into
 *    `BUILD_TABS` — which is what that field is still there for — fails twice, at *"these
 *    categories carry a \"Soon\" pip: expected [ 'DecorationsSoon' ] to deeply equal []"*
 *    and at *"the DecorationsSoon category is offered but cannot be selected: expected
 *    'true' to be null"*.
 *  - **the second half of the property, which selectability alone would have passed.**
 *    Emptying the civic catalogue (`civicOptionsForEra` returning nothing, the real state of
 *    an era whose four rows are not all bundled) leaves the Civic tab perfectly clickable
 *    and fails at *"the Civic category opens on to nothing to build: expected
 *    <p class=\"build-shop-empty\"></p> to be null"*. Note the first test stays GREEN under
 *    that one, which is correct rather than a gap: it reads the panel the menu opens on, and
 *    the sweep below is what walks the rest.
 *  - **the floor, so the sweep cannot pass by measuring nothing.** Deleting the Roads row
 *    fails at *"the category strip lost a tab: expected 2 to be greater than or equal to
 *    3"*, and again at the second test's own floor.
 */

/** A fully mastered, fully placed island: every category has its catalogue in reach. */
function masteredSession(): CityDevSession {
  const hall: PlacedTransform = { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM };
  return createCityDevSession(null, {
    nodeStates: MOCK_MASTERED_NODE_STATES,
    placements: defaultPlacements(
      MOCK_MASTERED_NODE_STATES.map((state) => state.node_id),
      [hall],
      BUILDABLE_RADIUS,
    ),
    townHall: hall,
  });
}

async function openShop(): Promise<HTMLElement> {
  const user = userEvent.setup();
  render(
    <CitySurface
      enableCanvas={false}
      loadCity={masteredSession().load}
      goldAvailable={200}
      materialAvailable={600}
      materialLabel="stone"
    />,
  );
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Build" })).toBeInTheDocument();
  });
  await user.click(screen.getByRole("button", { name: "Build" }));
  return screen.findByRole("dialog");
}

/** The category strip, named so the era rail's tabs cannot be read as categories. */
function categoryTabs(shop: HTMLElement): HTMLElement[] {
  const strip = within(shop).getByRole("tablist", { name: "Build categories" });
  return within(strip).getAllByRole("tab");
}

describe("the build menu's categories are all live", () => {
  it("the strip is a real population, and none of it is a placeholder", async () => {
    const shop = await openShop();
    const tabs = categoryTabs(shop);

    /*
      THE FLOOR, and it is the assertion that stops everything below passing over nothing:
      a tablist query that stopped matching would leave the sweep empty and every `for` in
      this file trivially satisfied. Three today (Lessons, Civic, Roads), and the ORDER and
      the exact names are pinned in `CitySurface.test.tsx`'s census rather than a second
      time here — this file is about whether they work, not what they are called.
    */
    expect(tabs.length, "the category strip lost a tab").toBeGreaterThanOrEqual(3);

    // The pip is the placeholder's visible signature, so it is checked as its own claim:
    // a tab wearing one is being advertised as not-yet-a-thing.
    const pipped = tabs
      .map((tab) => tab.textContent ?? "")
      .filter((text) => text.includes("Soon"));
    expect(pipped, 'these categories carry a "Soon" pip').toEqual([]);

    // And the dialog offers no "nothing here yet" paragraph on the tab it opens on.
    expect(shop.querySelectorAll(".build-shop-empty")).toHaveLength(0);
  });

  it("every category in the strip opens on to something to build", async () => {
    const user = userEvent.setup();
    const shop = await openShop();
    const names = categoryTabs(shop).map((tab) => tab.textContent ?? "");
    expect(names.length).toBeGreaterThanOrEqual(3);

    for (const name of names) {
      // Re-queried each pass: selecting a tab re-renders the panel, and React may hand
      // back new nodes for the strip.
      const tab = categoryTabs(shop).find((candidate) => candidate.textContent === name);
      expect(tab, `${name} left the strip mid-sweep`).toBeDefined();
      const category = tab as HTMLElement;

      expect(
        category.getAttribute("aria-disabled"),
        `the ${name} category is offered but cannot be selected`,
      ).toBeNull();

      await user.click(category);
      await waitFor(() => {
        const current = categoryTabs(shop).find(
          (candidate) => candidate.textContent === name,
        );
        expect(current?.getAttribute("aria-selected"), `${name} did not select`).toBe(
          "true",
        );
      });

      const panel = within(shop).getByRole("tabpanel");
      expect(
        panel.querySelector(".build-shop-empty"),
        `the ${name} category opens on to nothing to build`,
      ).toBeNull();
      expect(
        panel.querySelectorAll("button[data-node-id]").length,
        `the ${name} category offers no card to activate`,
      ).toBeGreaterThan(0);
    }
  });
});
