import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";

const RUN = Boolean(
  import.meta.env.VITE_ARCHIPELAGO_SHOTS ||
    import.meta.env.VITE_ARCHIPELAGO_PANEL_CLEAR_REPRO,
);

let harness: { cleanup: () => void } | null = null;
let session: { dispose: () => void } | null = null;
let resetEra = () => {};

function named(label: RegExp | string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll("button")).find((button) => {
    const name = (button.getAttribute("aria-label") ?? button.textContent ?? "").trim();
    return typeof label === "string" ? name === label : label.test(name);
  });
}

afterEach(() => {
  harness?.cleanup();
  harness = null;
  session?.dispose();
  session = null;
  resetEra();
  resetEra = () => {};
});

test.runIf(RUN)(
  "closes the diagnostic shop, Buildings, and Town before mounting the one carousel canvas",
  async () => {
    const [
      { seedPlacingAtEra },
      { CitySurface },
      { createCityDevSession },
      { resetCityEra },
      { mount, waitFor },
      { createArchipelagoSession },
    ] = await Promise.all([
      import("../catchup/eraPlacement"),
      import("../city/CitySurface"),
      import("../city/citySession"),
      import("../city/useCityEra"),
      import("../lessons/testHarness"),
      import("./archipelagoSession"),
      import("../styles.css"),
    ]);
    resetEra = resetCityEra;
    await page.viewport(1024, 580);
    const placement = seedPlacingAtEra("bronze_age");
    const live = createArchipelagoSession({
      initial: createCityDevSession(null),
      makeIsland: (restoreFrom) => createCityDevSession(restoreFrom),
    });
    live.seedFromPlacement(placement, Object.keys(placement));
    session = live;
    harness = mount(
      <div className="city-shell">
        <CitySurface
          bayAvailable
          enableCanvas
          reducedMotion
          loadCity={live.load}
          onPlaceSkill={live.placeSkill}
          pretestPlacement={placement}
          getArchipelagoSnapshot={live.snapshot}
          onOpenSurface={() => undefined}
        />
      </div>,
    );

    await waitFor(
      () => document.querySelector(".city-viewport canvas") !== null,
      "the learner city canvas did not mount",
      30_000,
    );
    await waitFor(
      () => named("Start building") !== undefined,
      "the diagnostic reward did not mount",
      30_000,
    );
    named("Start building")?.click();
    await waitFor(
      () => document.querySelector(".build-shop") !== null,
      "the diagnostic reward did not open the WebGL build shop",
      30_000,
    );
    await waitFor(
      () => document.querySelector('[data-testid="catchup-prompt"]') !== null,
      "the catch-up prompt did not open above the shop",
      30_000,
    );
    document
      .querySelector<HTMLButtonElement>('[data-testid="catchup-choose-stop_here"]')
      ?.click();
    await waitFor(
      () => document.querySelector('[data-testid="catchup-stopped"]') !== null,
      "the catch-up stop endpoint did not open",
      30_000,
    );
    document
      .querySelector<HTMLButtonElement>('[data-testid="catchup-stopped-enter"]')
      ?.click();

    named(/Buildings/)?.click();
    named(/Open the town status/)?.click();
    await waitFor(
      () => document.querySelectorAll("canvas").length === 7,
      "the reproduction did not reach one city plus six retained shop canvases",
      30_000,
    );
    expect(document.querySelector(".build-shop")).not.toBeNull();

    named("Menu")?.click();
    await waitFor(
      () => document.querySelector('[data-testid="menu-bay"]') !== null,
      "the archipelago menu row did not open",
      30_000,
    );
    document.querySelector<HTMLButtonElement>('[data-testid="menu-bay"]')?.click();
    await waitFor(
      () => document.querySelector('[data-testid="archipelago-overview"]') !== null,
      "the carousel did not mount",
      30_000,
    );

    expect(document.querySelector(".build-shop")).toBeNull();
    // #749 removed the old Buildings chip and the overview unmounts the remaining city HUD.
    // Absence is the current product's stronger closed state, not a missing assertion.
    expect(document.querySelector(".hud-buildings-toggle")).toBeNull();
    expect(
      document
        .querySelector('[aria-controls="city-town-popover"]')
        ?.getAttribute("aria-expanded"),
    ).toBe("false");
    expect(document.querySelectorAll("canvas")).toHaveLength(1);
  },
  120_000,
);
