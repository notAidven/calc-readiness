import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

/**
 * The 3D city never mounts under jsdom — `react-use-measure` wants a `ResizeObserver` the
 * environment does not have — and nothing here is about the scene. `buildMenuEraAxis.test.tsx`
 * stubs it the same way for the same reason.
 */
vi.mock("./city/three/CityCanvasHost", () => ({
  CityCanvasHost: ({ fallback }: { fallback: React.ReactNode }) => (
    <div data-testid="scene-stub">{fallback}</div>
  ),
}));

/**
 * And the build cards' own previews, which are each a `<Canvas>` of their own. They are
 * lazy, so the first mount gets away with it and the second does not — which is why this
 * suite failed on its SECOND test and passed on its first.
 */
vi.mock("./city/three/BuildingThumb", () => ({
  default: () => <span data-testid="thumb" />,
}));

import { audioPrefs } from "./audio/audioPrefs";
import { installSfxProbe } from "./audio/testSfxProbe";

/**
 * **MATERIAL LEAVING THE STOCKPILE HAS A SOUND, AND IT IS NOT THE BUILDING ARRIVING.**
 *
 * Driven through `<App />` because that is where the two lanes meet: the wallet lives in
 * `@cr/economy` and the grid lives in the city session, and the composition root is the
 * only place both are in scope. Anything shallower would be testing a callback rather than
 * a purchase.
 *
 * `?mock&mastered` is the hatch that makes it reachable at all: a fresh city has no stone,
 * so every civic card reads *"You have 0 stone"* and no purchase can complete. That hatch
 * exists for exactly this — the mastered city at the bottom of the happiness range, which
 * is where buying a Campfire is visible.
 *
 * ## Two sounds on one press, and that is the design rather than stacking
 *
 * The stones land when the ledger is debited and the building thuds down when the layout
 * has been re-read, so the sequence below is asserted in ORDER and in full. They are two
 * events in the sourcing sheet's own enumeration — *"a building is placed"* already
 * sounded, and *"material spent on a civic purchase"* is the row this adds — and they do
 * not collide: the gravel is 85% of its energy above 5 kHz and the thud is a soft wooden
 * drop with nothing up there at all.
 */

const probe = installSfxProbe();

afterAll(() => probe.restore());

beforeEach(() => {
  window.history.replaceState({}, "", "/?mock&mastered");
  probe.reset();
});

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

type User = ReturnType<typeof userEvent.setup>;

/** Enter the city, open the build menu on its Civic tab, and start placing a Campfire. */
async function startBuyingACampfire(user: User): Promise<void> {
  render(<App />);
  await user.click(screen.getByRole("button", { name: "Start at Era 1" }));
  await user.click(await screen.findByRole("button", { name: "Build" }));
  await screen.findByRole("tabpanel");

  const civic = screen.getAllByRole("tab").find((tab) => tab.textContent === "Civic");
  if (civic === undefined) {
    throw new Error("the build menu has no Civic tab, so nothing here buys anything");
  }
  await user.click(civic);

  const card = screen.getByTestId("civic-card-prehistoric_campfire");
  if ((card as HTMLButtonElement).disabled) {
    throw new Error("the Campfire is unaffordable, so this test measures a refusal");
  }
  await user.click(card);
}

/** The placement tray's commit, nudged until the seat is one the layout rule accepts. */
async function buildHere(user: User): Promise<void> {
  const confirm = await screen.findByRole("button", { name: /Build here/ });
  for (
    let nudges = 0;
    (confirm as HTMLButtonElement).disabled && nudges < 12;
    nudges += 1
  ) {
    await user.click(screen.getByRole("button", { name: /Move right|Right/ }));
  }
  if ((confirm as HTMLButtonElement).disabled) {
    throw new Error("no seat on the island accepted the Campfire");
  }
  await user.click(confirm);
}

describe("buying a civic building", () => {
  it("drops the stones as the ledger is debited, then thuds the building down", async () => {
    const user = userEvent.setup();
    await startBuyingACampfire(user);

    // Choosing and placing spend nothing, so nothing has sounded yet.
    probe.reset();
    await buildHere(user);
    const receipt = await screen.findByRole("alertdialog");
    expect(within(receipt).getByText("The Campfire")).toBeInTheDocument();

    expect(probe.played()).toEqual(["civic-purchase.ogg", "place-building.ogg"]);
  }, 120000);

  it("stays silent while muted", async () => {
    const user = userEvent.setup();
    await startBuyingACampfire(user);
    probe.reset();
    audioPrefs.setMuted(true);

    await buildHere(user);

    expect(probe.played()).toEqual([]);
  }, 120000);
});
