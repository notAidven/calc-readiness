import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { seedPlacingAtEra } from "../catchup/eraPlacement";
import { CitySurface } from "../city/CitySurface";
import { createCityDevSession } from "../city/citySession";
import { resetCityEra } from "../city/useCityEra";
import { ARCHIPELAGO_QUERY_PARAM } from "./archipelagoFlag";
import { type ArchipelagoSession, createArchipelagoSession } from "./archipelagoSession";

const REAL_SEARCH = window.location.search;
let live: ArchipelagoSession | null = null;

beforeEach(() => {
  resetCityEra();
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}?${ARCHIPELAGO_QUERY_PARAM}`,
  );
});

afterEach(() => {
  live?.dispose();
  live = null;
  resetCityEra();
  window.history.replaceState(null, "", `${window.location.pathname}${REAL_SEARCH}`);
});

describe("diagnostic-unlocked terrain hands off to the existing seeded catch-up", () => {
  it("opens at the selected era without writing evidence, layout, or founding first", async () => {
    const seed = seedPlacingAtEra("bronze_age");
    const session = createArchipelagoSession({
      initial: createCityDevSession(null),
      makeIsland: (restoreFrom) => createCityDevSession(restoreFrom),
    });
    live = session;
    session.seedFromPlacement(seed, Object.keys(seed));

    render(
      <CitySurface
        enableCanvas={false}
        reducedMotion
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
        getArchipelagoSnapshot={session.snapshot}
      />,
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Menu" }));
    await user.click(screen.getByTestId("menu-bay"));
    await screen.findByTestId("archipelago-overview");

    await user.click(screen.getByTestId("archipelago-select-neolithic"));
    expect(screen.getByTestId("archipelago-overview")).toHaveAttribute(
      "data-state",
      "diagnostic",
    );
    const beforeLoad = JSON.stringify(await session.load());
    const beforeBay = JSON.stringify(session.snapshot());

    await user.click(screen.getByTestId("archipelago-primary-action"));
    const prompt = await screen.findByTestId("catchup-prompt");
    expect(prompt).toHaveAttribute("data-era", "neolithic");
    expect(prompt).toHaveAttribute("data-build-mode", "city_places");

    await waitFor(async () => {
      expect(JSON.stringify(await session.load())).toBe(beforeLoad);
    });
    expect(JSON.stringify(session.snapshot())).toBe(beforeBay);
  });
});
