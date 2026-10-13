import { civicCatalogueForEra } from "@cr/economy";
import { cityRosterNodeIds, SUCCESSION_MAX_CITY_WARDS } from "@cr/game";
import { afterEach, expect, test } from "vitest";

import { App } from "../App";
import { civicPlacementId } from "../city/civic";
import { TOWN_HALL_ID } from "../city/townHall";
import { resetCityEra } from "../city/useCityEra";
import { CRISIS_PREVIEW_ROUTES } from "../crisisPreviewRoutes";
import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { SUCCESSION_PARAM, SUCCESSION_QA_STORAGE_PREFIX } from "./successionRoute";

import "../styles.css";

/**
 * The browser route is the product under test.
 *
 * The reported failure was not in the standalone forum or in a hand-built `CitySurface`: the
 * canonical `?succession` address opened a real city with only its Hall, then refused the press
 * that should hand the briefing to the in-city crisis. Keep this on `<App />`, resolve the
 * Succession member by its canonical parameter, and derive its expected ward identities from the
 * era/civic registries. A string-level assertion that `autoOpenSuccession` is passed would stay
 * green over the empty city that produced the report.
 */

const enteredAt = `${window.location.pathname}${window.location.search}${window.location.hash}`;
let harness: Harness | null = null;

afterEach(() => {
  harness?.cleanup();
  harness = null;
  resetCityEra();
  localStorage.clear();
  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index);
    if (key?.startsWith(SUCCESSION_QA_STORAGE_PREFIX)) {
      sessionStorage.removeItem(key);
    }
  }
  window.history.replaceState(null, "", enteredAt);
});

function click(selector: string): void {
  const target = document.querySelector<HTMLButtonElement>(selector);
  if (!target) {
    throw new Error(`nothing matched ${selector}`);
  }
  target.click();
}

async function enterSuccession(
  expectedPhase: "ready" | "answering" = "ready",
): Promise<void> {
  window.history.replaceState(null, "", `/demo?${SUCCESSION_PARAM}`);
  harness = mount(<App />);
  await waitFor(
    () =>
      document.querySelector('[data-testid="city-viewport"]') !== null &&
      document.querySelector('[data-testid="crisis-call-advisor"]') !== null,
    `?${SUCCESSION_PARAM} did not resolve to a ready learner city and its crisis briefing`,
    30_000,
  );

  expect(document.querySelector(".title-screen")).toBeNull();
  expect(document.querySelector(".sx-fixture-label")).toBeNull();

  let face = document.querySelector<HTMLButtonElement>('[data-testid="crisis-call-face"]');
  if (!face) {
    throw new Error(`?${SUCCESSION_PARAM} has no crisis handoff`);
  }
  for (let step = 0; face.disabled && step < 10; step += 1) {
    const previousSlide = document
      .querySelector('[data-testid="crisis-call-slide"]')
      ?.getAttribute("data-slide");
    click('[data-testid="crisis-call-next"]');
    await waitFor(
      () =>
        document
          .querySelector('[data-testid="crisis-call-slide"]')
          ?.getAttribute("data-slide") !== previousSlide,
      `?${SUCCESSION_PARAM} did not advance briefing step ${step + 1}`,
      10_000,
    );
    face = document.querySelector<HTMLButtonElement>('[data-testid="crisis-call-face"]');
    if (!face) {
      throw new Error(`?${SUCCESSION_PARAM} lost its crisis handoff`);
    }
  }
  expect(face.disabled, `?${SUCCESSION_PARAM} never opened its crisis handoff`).toBe(false);
  face.click();
  await waitFor(
    () =>
      document.querySelector('[data-testid="succession-in-city"]') !== null &&
      document.querySelector(`.sx-shell[data-phase="${expectedPhase}"]`) !== null,
    `?${SUCCESSION_PARAM} left the briefing but never mounted the playable in-city crisis`,
    10_000,
  );
  expect(document.querySelector('[data-testid="onboarding-advisor"]')).toBeNull();
  expect(document.querySelector('[aria-label="Demo storage"]')).toBeNull();
}

test("the canonical Succession route cold-loads its real seeded world and playable panel", async () => {
  const route = CRISIS_PREVIEW_ROUTES.find(
    (candidate) => candidate.param === SUCCESSION_PARAM,
  );
  expect(route, "the router lost the canonical Succession member").toBeDefined();
  if (!route) {
    return;
  }
  expect(route.destination).toBe("city");

  localStorage.setItem("ordinary-demo-sentinel", "untouched");
  const ordinaryDemoBefore = JSON.stringify(
    Object.fromEntries(Object.entries(localStorage)),
  );

  await enterSuccession();

  const civicIds = civicCatalogueForEra(route.eraId).map((row, index) =>
    civicPlacementId(row.id, index),
  );
  expect(civicIds.length, `${route.eraId} has no real civic roster`).toBeGreaterThanOrEqual(
    4,
  );
  const expectedWards = [...cityRosterNodeIds(route.eraId), TOWN_HALL_ID, ...civicIds]
    .sort()
    .slice(0, SUCCESSION_MAX_CITY_WARDS);
  expect(expectedWards.length).toBe(SUCCESSION_MAX_CITY_WARDS);

  const renderedWards = [
    ...document.querySelectorAll<HTMLElement>('[data-testid^="sx-district-city-ward:"]'),
  ].map((district) =>
    (district.dataset.testid ?? "").replace(/^sx-district-city-ward:/, ""),
  );
  expect(new Set(renderedWards).size, "the live city rendered a duplicate ward").toBe(
    renderedWards.length,
  );
  expect([...renderedWards].sort()).toEqual([...expectedWards].sort());
  expect(document.querySelectorAll('[data-testid="succession-in-city"]')).toHaveLength(1);
  expect(JSON.stringify(Object.fromEntries(Object.entries(localStorage)))).toBe(
    ordinaryDemoBefore,
  );
});

test("the isolated QA battle resumes once across a refresh-shaped remount", async () => {
  localStorage.setItem("ordinary-demo-sentinel", "untouched");
  const ordinaryDemoBefore = JSON.stringify(
    Object.fromEntries(Object.entries(localStorage)),
  );

  await enterSuccession();
  click('[data-testid="sx-answer-batch"]');
  await waitFor(
    () =>
      document.querySelector('.sx-shell[data-phase="answering"]') !== null &&
      document.querySelectorAll('[data-testid="sx-batch"]').length === 1,
    "the cold QA battle did not begin its first batch",
    15_000,
  );
  expect(
    [...Object.keys(sessionStorage)].filter((key) =>
      key.startsWith(SUCCESSION_QA_STORAGE_PREFIX),
    ).length,
  ).toBeGreaterThan(0);

  harness?.cleanup();
  harness = null;
  resetCityEra();

  await enterSuccession("answering");
  expect(document.querySelectorAll('[data-testid="succession-in-city"]')).toHaveLength(1);
  expect(document.querySelectorAll('[data-testid="sx-batch"]')).toHaveLength(1);
  expect(JSON.stringify(Object.fromEntries(Object.entries(localStorage)))).toBe(
    ordinaryDemoBefore,
  );
});

test("an unrelated city-bound route does not acquire the Succession composition", async () => {
  /**
   * Inject a second member into the router's real source rather than testing a copied selector.
   * This is the shape Intrusion is moving toward: destination `city`, but a different route
   * identity. At the reported head App selected on destination alone, bypassed the title, and
   * built the Succession QA city for this member.
   */
  const routes = CRISIS_PREVIEW_ROUTES as unknown as Array<{
    param: string;
    label: string;
    eraId: "information_age";
    glyph: string;
    destination: "city";
  }>;
  const injected = {
    param: "future-city-crisis",
    label: "Future in-city crisis",
    eraId: "information_age" as const,
    glyph: "\u26A0",
    destination: "city" as const,
  };
  routes.push(injected);

  try {
    window.history.replaceState(null, "", `/demo?${injected.param}`);
    harness = mount(<App />);
    await waitFor(
      () =>
        document.querySelector(".title-screen") !== null ||
        document.querySelector('[data-testid="city-viewport"]') !== null,
      "the injected route resolved to neither the normal title nor a city",
      30_000,
    );

    expect(document.querySelector(".title-screen")).not.toBeNull();
    expect(document.querySelector('[data-testid="city-viewport"]')).toBeNull();
    expect(document.querySelector('[data-testid="crisis-call-advisor"]')).toBeNull();
    expect(
      Object.keys(sessionStorage).filter((key) =>
        key.startsWith(SUCCESSION_QA_STORAGE_PREFIX),
      ),
    ).toEqual([]);
  } finally {
    routes.splice(routes.indexOf(injected), 1);
  }
});
