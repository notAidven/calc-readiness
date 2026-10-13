import { describe, expect, it } from "vitest";

import { createCityDevSession } from "../city/citySession";
import { relayPlacement } from "../city/relayPlacement";
import { CRISIS_PREVIEW_ROUTES, requestedCrisisPreview } from "../crisisPreviewRoutes";
import { intrusionHref } from "./IntrusionEntryChip";
import { INTRUSION_PREVIEW_CITY } from "./intrusionPreviewCity";

describe("the canonical Intrusion route", () => {
  it("is a real Information Age city destination", () => {
    expect(requestedCrisisPreview("?intrusion")).toMatchObject({
      param: "intrusion",
      label: "The Intrusion",
      eraId: "information_age",
      destination: "city",
    });
  });

  it("keeps the standalone fixture on a separate development-only address", () => {
    expect(intrusionHref("https://example.test/demo?mock")).toBe(
      "https://example.test/demo?mock&intrusion-fixture",
    );
    expect(CRISIS_PREVIEW_ROUTES.map((route) => String(route.param))).not.toContain(
      "intrusion-fixture",
    );
  });

  it("seeds the real trigger, six placements, Town Hall, and relay prerequisite", () => {
    expect(INTRUSION_PREVIEW_CITY.placements).toHaveLength(6);
    expect(INTRUSION_PREVIEW_CITY.townHall?.nodeId).toBe("town-hall");
    expect(INTRUSION_PREVIEW_CITY.civic).toHaveLength(1);
    expect(INTRUSION_PREVIEW_CITY.civic?.[0]?.nodeId).toContain(
      "information_age_food_warehouse",
    );
    expect(
      INTRUSION_PREVIEW_CITY.nodeStates?.filter((state) => state.mastery >= 2),
    ).toHaveLength(3);
  });

  it("survives the city session's parser as a real relay placement", async () => {
    const loaded = await createCityDevSession(null, INTRUSION_PREVIEW_CITY).load();
    expect(loaded.placements).toHaveLength(6);
    expect(loaded.town_hall).not.toBeNull();
    expect(relayPlacement(loaded.civic ?? [])).not.toBeNull();
  });
});
