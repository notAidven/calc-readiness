import { createRelay, type RelayState, relayReducer } from "@cr/game";
import { getEraOrThrow } from "@cr/skill-graph";
import type { StudentNodeState, UUID } from "@cr/state-schema";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { cdp, commands, page } from "vitest/browser";
import { ACHIEVEMENTS, markAchievementEarned } from "../city/achievements";
import { CitySurface } from "../city/CitySurface";
import { CrisisCallAdvisor } from "../city/CrisisCallAdvisor";
import { civicPlacementId } from "../city/civic";
import { crisisBriefingFor } from "../city/crisisCall";
import { TOWN_HALL_ID } from "../city/townHall";
import type { CityLoad } from "../city/types";
import { type Harness, mount, waitFor } from "../lessons/testHarness";

import "../styles.css";

const SHOTS = Boolean(import.meta.env.VITE_RELAY_SHOTS);
const WIDE = { width: 1024, height: 580 } as const;
const NARROW = { width: 390, height: 580 } as const;
const OUTPUT = "output/qa/era-09-intrusion-implementation";
const REVIEW_OUTPUT = "output/design-review/intrusion-city-integration/after";
const STUDENT = "00000000-0000-4000-8000-000000000009" as UUID;
const RELAY_PLACEMENT = civicPlacementId("information_age_food_warehouse", 1);
const INFORMATION_NODES = getEraOrThrow("information_age").nodes;
const INFORMATION_PLACEMENTS = [
  { nodeId: INFORMATION_NODES[0] as string, col: -5, row: -4, rot: 0 },
  { nodeId: INFORMATION_NODES[1] as string, col: -1, row: -5, rot: 0 },
  { nodeId: INFORMATION_NODES[2] as string, col: 4, row: -4, rot: 0 },
  { nodeId: INFORMATION_NODES[3] as string, col: -5, row: 2, rot: 0 },
  { nodeId: INFORMATION_NODES[4] as string, col: 0, row: 4, rot: 0 },
  { nodeId: INFORMATION_NODES[5] as string, col: 5, row: 2, rot: 0 },
] as const;
// `openAt` deliberately allows 20 seconds for each of the relay and WebGL mounts. Give the
// enclosing frame test enough room to report either named wait instead of the runner's shorter
// default timeout winning first under the fully loaded hosted browser shard.
vi.setConfig({ testTimeout: 45_000 });

let harness: Harness | null = null;
let original: { width: number; height: number } | null = null;

function nodeState(nodeId: string): StudentNodeState {
  return {
    student_id: STUDENT,
    node_id: nodeId,
    placement_estimate: 3,
    mastery: 2,
    mastery_updated_at: null,
    completion_status: "complete",
    lesson_stage: "done",
    last_practiced_at: null,
  };
}

const CITY: CityLoad = {
  node_states: INFORMATION_NODES.map(nodeState),
  neighborhood_state: null,
  placements: INFORMATION_PLACEMENTS,
  roads: [],
  road_gold_spent: 0,
  town_hall: { nodeId: TOWN_HALL_ID, col: 3, row: 0, rot: 0 },
  civic: [{ nodeId: RELAY_PLACEMENT, col: -1, row: 0, rot: 0 }],
  civic_material_spent: 0,
  crisis_damage: {
    next_damage_id: 1,
    ruined_buildings: [],
    ruined_cells: [],
    suspended_civic: [],
    overwritten_records: [],
  },
};

beforeAll(async () => {
  original = { width: window.innerWidth, height: window.innerHeight };
  vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "/api");
  for (const achievement of ACHIEVEMENTS) {
    markAchievementEarned(achievement.id);
  }
});

afterAll(async () => {
  await browserSession().send("Emulation.setEmulatedMedia", { features: [] });
  vi.unstubAllEnvs();
  if (original) {
    await page.viewport(original.width, original.height);
  }
});

afterEach(() => {
  harness?.cleanup();
  harness = null;
});

function browserSession(): {
  send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
} {
  return cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
}

function viewportBox(): { x: number; y: number; width: number; height: number } {
  const frame = window.frameElement as HTMLElement | null;
  if (!frame) {
    throw new Error("the browser test is not mounted in its tester frame");
  }
  const box = frame.getBoundingClientRect();
  return {
    x: box.left + window.parent.scrollX,
    y: box.top + window.parent.scrollY,
    width: box.width,
    height: box.height,
  };
}

async function shoot(
  name: string,
  view: { readonly width: number; readonly height: number } = WIDE,
): Promise<void> {
  if (SHOTS) {
    await document.fonts.ready;
    const box = viewportBox();
    const image = await browserSession().send("Page.captureScreenshot", {
      format: "png",
      clip: {
        x: box.x,
        y: box.y,
        width: Math.min(box.width, view.width),
        height: Math.min(box.height, view.height),
        scale: 1,
      },
    });
    if (SHOTS) {
      await Promise.all([
        commands.writeFile(`${OUTPUT}/${name}.png`, image.data, { encoding: "base64" }),
        commands.writeFile(`${REVIEW_OUTPUT}/${name}.png`, image.data, {
          encoding: "base64",
        }),
      ]);
    }
  }
}

function commit(state: RelayState, action: "cut" | "restore", correct: number): RelayState {
  const armed = relayReducer(state, { type: "arm", action });
  const answering = relayReducer(armed, { type: "start_questions" });
  return relayReducer(answering, { type: "resolve_round", correct, asked: 3 });
}

function settle(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForNarrowCutPreview(): Promise<void> {
  try {
    await waitFor(
      () => document.querySelector('[data-testid="relay-commit"]') !== null,
      "the narrow Cut preview appears",
    );
  } catch (error) {
    const surface = document.querySelector<HTMLElement>('[data-testid="relay-surface"]');
    const cut = document.querySelector<HTMLButtonElement>('[data-action="cut"]');
    const commit = document.querySelector<HTMLButtonElement>(
      '[data-testid="relay-commit"]',
    );
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}; ` +
        `phase=${surface?.dataset.phase ?? "absent"}, ` +
        `cut=${cut !== null}, cut disabled=${cut?.disabled ?? "absent"}, ` +
        `cut pressed=${cut?.getAttribute("aria-pressed") ?? "absent"}, ` +
        `armed=${document.querySelector('[data-testid="relay-armed"]') !== null}, ` +
        `commit=${commit !== null}, canvases=${document.querySelectorAll("canvas").length}, ` +
        `viewport=${window.innerWidth}x${window.innerHeight}`,
      { cause: error },
    );
  }
}

async function openAt(
  state: RelayState,
  view: { readonly width: number; readonly height: number } = WIDE,
  reducedMotion = false,
): Promise<void> {
  await page.viewport(view.width, view.height);
  await browserSession().send("Emulation.setEmulatedMedia", {
    features: [
      {
        name: "prefers-reduced-motion",
        value: reducedMotion ? "reduce" : "no-preference",
      },
    ],
  });
  harness = mount(
    <div className="city-shell">
      <CitySurface
        loadCity={async () => CITY}
        eraId="information_age"
        relayPreviewState={state}
        enableOnboardingDemo={false}
      />
    </div>,
  );
  await waitFor(
    () => document.querySelector('[data-testid="relay-surface"]') !== null,
    "the production relay rail opens over the city",
    40_000,
  );
  await waitFor(
    () => document.querySelector("canvas") !== null,
    "the actual city renderer appears behind the relay rail",
    40_000,
  );
  await settle(600);
}

test("announcement: Oru briefs the Intrusion over the actual city at 1024x580", async () => {
  await page.viewport(WIDE.width, WIDE.height);
  const briefing = crisisBriefingFor("information_age");
  if (!briefing) {
    throw new Error("the Information Age crisis has no production briefing");
  }
  harness = mount(
    <div className="city-shell">
      <CitySurface
        loadCity={async () => CITY}
        eraId="information_age"
        enableOnboardingDemo={false}
      />
      <CrisisCallAdvisor briefing={briefing} onFace={() => {}} onLater={() => {}} />
    </div>,
  );
  await waitFor(
    () => document.body.textContent?.includes("Someone is rewriting") ?? false,
    "Oru's Intrusion briefing appears",
  );
  await waitFor(
    () => document.querySelector("canvas") !== null,
    "the city renderer appears",
  );
  await settle(600);
  await shoot("01-announcement-oru-1024x580");
});

test("one trace inspection action is visible on the actual city at 1024x580", async () => {
  await openAt(createRelay());
  const inspect = document.querySelector<HTMLButtonElement>(
    '[data-testid="relay-inspect"]',
  );
  expect(inspect).not.toBeNull();
  expect(inspect?.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  expect(document.querySelectorAll('[data-testid="relay-action"]').length).toBe(0);
  expect(
    document.querySelector(".relay-rail")?.getBoundingClientRect().width,
  ).toBeLessThanOrEqual(350);
  await shoot("02-trace-found-1024x580");
});

test("Cut proposal over the actual relay at 1024x580", async () => {
  await openAt(relayReducer(createRelay(), { type: "arm", action: "cut" }));
  await shoot("03-isolation-armed-1024x580");
});

test("Restore proposal over the actual relay at 1024x580", async () => {
  await openAt(relayReducer(createRelay(), { type: "arm", action: "restore" }));
  await shoot("04-restoration-armed-1024x580");
});

test("correct Cut consequence at 1024x580", async () => {
  await openAt(commit(createRelay(), "cut", 3));
  expect(document.body.textContent).toContain("The trace stopped here");
  await shoot("05-cut-correct-result-1024x580");
});

test("incorrect Cut consequence at 1024x580", async () => {
  await openAt(commit(createRelay(), "cut", 0));
  expect(document.body.textContent).toContain("The trace moved to the next building");
  await shoot("06-trace-spread-1024x580");
});

test("spent copy and record loss after Restore at 1024x580", async () => {
  await openAt(commit(createRelay(), "restore", 0));
  document.querySelector<HTMLButtonElement>('[data-testid="relay-inspect"]')?.click();
  await waitFor(
    () => document.querySelector('[data-action="restore"]') !== null,
    "the spent restoration choice appears",
  );
  expect(
    document.querySelector<HTMLButtonElement>('[data-action="restore"]')?.disabled,
  ).toBe(true);
  await shoot("07-copy-spent-record-loss-1024x580");
});

test("best ending is a whole record at 1024x580", async () => {
  const state = commit(commit(commit(createRelay(), "cut", 3), "restore", 3), "cut", 3);
  await openAt(state);
  expect(document.querySelector('[data-ending="best"]')).not.toBeNull();
  await shoot("08-best-ending-1024x580");
});

test("partial ending keeps the visible city scar at 1024x580", async () => {
  const state = commit(commit(commit(createRelay(), "restore", 3), "cut", 3), "cut", 3);
  await openAt(state);
  expect(document.querySelector('[data-ending="partial"]')).not.toBeNull();
  await shoot("09-partial-ending-1024x580");
});

test("the 390x580 learner layout keeps a real city stage above the controls", async () => {
  await openAt(createRelay(), NARROW);
  const city = document.querySelector(".relay-city") as HTMLElement;
  const instrument = document.querySelector(".relay-rail") as HTMLElement;
  const inspect = document.querySelector<HTMLButtonElement>(
    '[data-testid="relay-inspect"]',
  );
  expect(getComputedStyle(city).display).not.toBe("none");
  expect(instrument.getBoundingClientRect().top).toBeGreaterThanOrEqual(240);
  expect(inspect?.getBoundingClientRect().bottom).toBeLessThanOrEqual(NARROW.height);
  expect(inspect?.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  expect(document.querySelector('[data-testid="relay-city-evidence"]')).not.toBeNull();
  await shoot("10-trace-found-390x580", NARROW);
});

test("the 390x580 learner layout keeps both interventions beside city evidence", async () => {
  await openAt(createRelay(), NARROW);
  document.querySelector<HTMLButtonElement>('[data-testid="relay-inspect"]')?.click();
  await waitFor(
    () => document.querySelectorAll('[data-testid="relay-action"]').length === 2,
    "both narrow intervention choices appear",
  );
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    '[data-testid="relay-action"] button',
  )) {
    expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    expect(button.getBoundingClientRect().bottom).toBeLessThanOrEqual(NARROW.height);
  }
  expect(document.querySelector('[data-testid="relay-city-evidence"]')).not.toBeNull();
  await shoot("10a-interventions-390x580", NARROW);
});

test("the 390x580 learner layout shows an armed intervention", async () => {
  await openAt(relayReducer(createRelay(), { type: "arm", action: "cut" }), NARROW);
  const commit = document.querySelector<HTMLButtonElement>('[data-testid="relay-commit"]');
  expect(commit?.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  expect(commit?.getBoundingClientRect().bottom).toBeLessThanOrEqual(NARROW.height);
  await shoot("10b-isolation-armed-390x580", NARROW);
});

test("the 390x580 learner layout shows escalation after the feed gets through", async () => {
  await openAt(commit(createRelay(), "cut", 0), NARROW);
  expect(document.body.textContent).toContain("The trace moved to the next building");
  const inspect = document.querySelector<HTMLButtonElement>(
    '[data-testid="relay-inspect"]',
  );
  expect(inspect?.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  expect(inspect?.getBoundingClientRect().bottom).toBeLessThanOrEqual(NARROW.height);
  await shoot("10c-trace-spread-390x580", NARROW);
});

test("the reduced-motion frame is the same resolved picture at 1024x580", async () => {
  await openAt(commit(createRelay(), "cut", 2), WIDE, true);
  expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
  await shoot("11-cut-result-reduced-motion-1024x580");
});

test("the 390x580 answering layout keeps the field and declared action in view", async () => {
  await openAt(createRelay(), NARROW);
  document.querySelector<HTMLButtonElement>('[data-testid="relay-inspect"]')?.click();
  await waitFor(
    () => document.querySelector('[data-action="cut"]') !== null,
    "the narrow intervention choices appear",
  );
  document.querySelector<HTMLButtonElement>('[data-action="cut"]')?.click();
  await waitForNarrowCutPreview();
  document.querySelector<HTMLButtonElement>('[data-testid="relay-commit"]')?.click();
  await waitFor(
    () => document.querySelector('[data-testid="relay-question"]') !== null,
    "the narrow question appears",
  );
  await shoot("12-answering-390x580", NARROW);
});

test("the 390x580 partial ending keeps verification and Return to my city obvious", async () => {
  const state = commit(commit(commit(createRelay(), "restore", 3), "cut", 3), "cut", 3);
  await openAt(state, NARROW);
  expect(
    document.querySelector(".relay-return")?.getBoundingClientRect().height,
  ).toBeGreaterThanOrEqual(44);
  await shoot("13-partial-ending-390x580", NARROW);
});
