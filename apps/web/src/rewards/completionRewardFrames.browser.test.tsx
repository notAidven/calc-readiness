import {
  applyGrant,
  civicBuildingOrThrow,
  lessonCompleteGrant,
  materialForEraOrThrow,
} from "@cr/economy";
import { buildCityViewModel } from "@cr/game";
import type { StudentNodeState } from "@cr/state-schema";
import { useEffect } from "react";
import { afterEach, expect, test } from "vitest";
import { commands, page } from "vitest/browser";
import { buildingName } from "../city/buildingAssets";
import { CitySurface } from "../city/CitySurface";
import { cityVitality, civicContributionRowsOf } from "../city/citizens";
import { MOCK_CITY_LOAD, MOCK_PATH_HAPPINESS_ROADS } from "../city/mockCity";
import { roadCost } from "../city/roads";
import type { CityLoad } from "../city/types";
import { EconomyHud } from "../economy/EconomyHud";
import type { UseEconomy } from "../economy/useEconomy";
import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { CompletionRewardProvider, useCompletionRewards } from "./CompletionRewardProvider";
import {
  type CompletionRewardReceipt,
  civicCompletionReward,
  materialGrantReward,
  roadCompletionReward,
  skillCompletionReward,
} from "./completionRewards";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/** One slash-free path segment, so a capture phase cannot escape its evidence directory. */
function evidencePhase(value: string | undefined): string {
  const phase = value?.trim();
  return phase && /^[a-z0-9-]+$/i.test(phase) ? phase : "current";
}

const CAPTURE_PHASE = evidencePhase(import.meta.env.VITE_COMPLETION_REWARD_CAPTURE_PHASE);
const OUTPUT = `output/design-review/completion-rewards/${CAPTURE_PHASE}`;
const VIEWPORTS = [
  { width: 1024, height: 580 },
  { width: 390, height: 580 },
] as const;
const STONE = materialForEraOrThrow("prehistoric");
let harness: Harness | null = null;

const economy: UseEconomy = {
  wallet: {
    materials: { stone: 400 },
    spendable: 400,
    spendableMaterial: STONE,
  },
  reward: null,
  message: "",
  reconcileProgress: () => undefined,
  reportPracticeSetComplete: async () => null,
  reportInterleavedClear: async () => undefined,
  reportCivicBootstrap: async () => undefined,
  refresh: async () => undefined,
};

afterEach(() => {
  harness?.cleanup();
  harness = null;
  document.body.innerHTML = "";
});

function withCompletedWorkshop(): CityLoad {
  return {
    ...MOCK_CITY_LOAD,
    node_states: MOCK_CITY_LOAD.node_states.map((state): StudentNodeState => {
      if (state.node_id !== "NUM.3") {
        return state;
      }
      return {
        ...state,
        mastery: 2,
        mastery_updated_at: "2026-08-12T00:00:00.000Z",
        lesson_stage: "done",
        completion_status: "complete",
        last_practiced_at: "2026-08-12T00:00:00.000Z",
      };
    }),
  };
}

function totals(load: CityLoad) {
  const viewModel = buildCityViewModel({
    node_states: load.node_states,
    neighborhood_state: load.neighborhood_state ?? null,
    authoring_complete: load.authoring_complete,
    era_id: "prehistoric",
  });
  const vitality = cityVitality({
    viewModel,
    placements: load.placements ?? [],
    civic: civicContributionRowsOf(load.civic ?? []),
    roadTileCount: load.roads?.length ?? 0,
  });
  return {
    population: vitality.population,
    livability: vitality.livability.sustains,
    happiness: vitality.happiness.coverage,
  };
}

function practiceReceipt(): CompletionRewardReceipt {
  const grant = lessonCompleteGrant({
    studentId: "reward-frame",
    nodeId: "NUM.3",
    nowMs: Date.UTC(2026, 7, 12),
  });
  const committed = applyGrant({ entries: [] }, grant);
  const receipt = materialGrantReward({
    id: grant.eventId,
    groupKey: grant.eventId,
    context: "Practice complete",
    grantedMaterials: committed.grantedMaterials,
  });
  if (receipt === null) {
    throw new Error("the canonical practice grant produced no receipt");
  }
  return receipt;
}

function buildingReceipt(): CompletionRewardReceipt {
  const after = withCompletedWorkshop();
  const receipt = skillCompletionReward({
    id: "frame:building:NUM.3",
    groupKey: "lesson_complete:NUM.3",
    context: "Skill building complete",
    subject: buildingName("NUM.3"),
    headline: `${buildingName("NUM.3")} is now complete`,
    before: totals(MOCK_CITY_LOAD),
    after: totals(after),
  });
  if (receipt === null) {
    throw new Error("the canonical building transition produced no city gain");
  }
  return receipt;
}

function civicReceipt(): CompletionRewardReceipt {
  const building = civicBuildingOrThrow("prehistoric_storage_pit");
  const receipt = civicCompletionReward({
    id: "frame:civic-building",
    groupKey: "frame:civic-building",
    result: {
      status: "built",
      cost: building.cost,
      placementId: "frame:civic-building",
      economyStatus: "spent",
    },
    building,
    material: STONE,
  });
  if (receipt === null) {
    throw new Error("the canonical civic purchase produced no city gain");
  }
  return receipt;
}

function roadReceipt(): CompletionRewardReceipt {
  const cells = MOCK_PATH_HAPPINESS_ROADS.slice(0, 4);
  const result = {
    status: "committed",
    laidCount: cells.length,
    cost: roadCost(cells.length),
  };
  const receipt = roadCompletionReward({
    id: "frame:road",
    groupKey: "frame:road",
    result,
    material: STONE,
  });
  if (receipt === null) {
    throw new Error("the canonical road commit produced no city gain");
  }
  return receipt;
}

const FRAMES: readonly {
  readonly name: string;
  readonly receipt: () => CompletionRewardReceipt;
  readonly load: () => CityLoad;
}[] = [
  { name: "practice-stone", receipt: practiceReceipt, load: withCompletedWorkshop },
  { name: "building-complete", receipt: buildingReceipt, load: withCompletedWorkshop },
  { name: "civic-building", receipt: civicReceipt, load: () => MOCK_CITY_LOAD },
  {
    name: "road-connected",
    receipt: roadReceipt,
    load: () => ({ ...MOCK_CITY_LOAD, roads: MOCK_PATH_HAPPINESS_ROADS.slice(0, 4) }),
  },
];

function ReceiptTrigger({ receipt }: { readonly receipt: CompletionRewardReceipt }) {
  const rewards = useCompletionRewards();
  useEffect(() => {
    rewards.enqueue(receipt);
  }, [receipt, rewards]);
  return null;
}

async function capture(filename: string): Promise<void> {
  if (CAPTURE_EVIDENCE) {
    const shot = await page.screenshot({
      path: `__screenshots__/completion-rewards/${CAPTURE_PHASE}/${filename}`,
      base64: true,
    });
    expect(shot.path, filename).toBeTruthy();
    expect(shot.base64, filename).toBeTruthy();
    await commands.writeFile(`${OUTPUT}/${filename}`, shot.base64, { encoding: "base64" });
  }
}

function measuredBox(rect: DOMRect) {
  const rounded = (value: number) => Math.round(value * 100) / 100;
  return {
    left: rounded(rect.left),
    top: rounded(rect.top),
    right: rounded(rect.right),
    bottom: rounded(rect.bottom),
    width: rounded(rect.width),
    height: rounded(rect.height),
  };
}

function renderedEdgeProbes(element: HTMLElement, rect: DOMRect) {
  const points = {
    top: [rect.left + rect.width / 2, rect.top + 3],
    right: [rect.right - 3, rect.top + rect.height / 2],
    bottom: [rect.left + rect.width / 2, rect.bottom - 3],
    left: [rect.left + 3, rect.top + rect.height / 2],
    center: [rect.left + rect.width / 2, rect.top + rect.height / 2],
  } as const;
  return Object.fromEntries(
    Object.entries(points).map(([name, [x, y]]) => {
      const hit = document.elementFromPoint(x, y);
      return [name, hit !== null && (hit === element || element.contains(hit))];
    }),
  );
}

for (const viewport of VIEWPORTS) {
  for (const frame of FRAMES) {
    test(`${frame.name} is visible over the whole learner city at ${viewport.width}x${viewport.height}`, async () => {
      await page.viewport(viewport.width, viewport.height);
      const receipt = frame.receipt();
      const load = frame.load();
      harness = mount(
        <CompletionRewardProvider reducedMotion>
          <div className="city-shell">
            <EconomyHud economy={economy} reducedMotion />
            <CitySurface
              enableCanvas={false}
              enableOnboardingDemo={false}
              loadCity={() => Promise.resolve(load)}
              reducedMotion
            />
          </div>
          <ReceiptTrigger receipt={receipt} />
        </CompletionRewardProvider>,
      );
      await waitFor(
        () =>
          document.querySelector(".city-viewport") !== null &&
          document.querySelector(".completion-reward-dialog") !== null,
        `${frame.name} learner frame did not render`,
      );
      await document.fonts.ready;

      const dialog = document.querySelector<HTMLElement>(".completion-reward-dialog");
      const city = document.querySelector<HTMLElement>(".city-viewport");
      const seal = dialog?.querySelector<HTMLElement>(".completion-reward-seal");
      const button = dialog?.querySelector<HTMLElement>(".completion-reward-continue");
      expect(dialog).not.toBeNull();
      expect(city).not.toBeNull();
      expect(seal).not.toBeNull();
      expect(button).not.toBeNull();
      if (dialog && city && seal && button) {
        const box = dialog.getBoundingClientRect();
        const cityBox = city.getBoundingClientRect();
        const sealBox = seal.getBoundingClientRect();
        const buttonBox = button.getBoundingClientRect();
        const sealVisibility = renderedEdgeProbes(seal, sealBox);
        const continueVisibility = renderedEdgeProbes(button, buttonBox);
        const filename = `${frame.name}-${viewport.width}x${viewport.height}.png`;
        await capture(filename);
        if (CAPTURE_EVIDENCE) {
          await commands.writeFile(
            `${OUTPUT}/${filename.replace(/\.png$/, ".json")}`,
            JSON.stringify(
              {
                viewport,
                receipt: frame.name,
                dialog: measuredBox(box),
                seal: measuredBox(sealBox),
                continue: measuredBox(buttonBox),
                renderedEdgeVisibility: {
                  seal: sealVisibility,
                  continue: continueVisibility,
                },
                dialogScroll: {
                  clientHeight: dialog.clientHeight,
                  scrollHeight: dialog.scrollHeight,
                  scrollTop: dialog.scrollTop,
                },
              },
              null,
              2,
            ),
          );
        }
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.top).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(viewport.width);
        expect(box.bottom).toBeLessThanOrEqual(viewport.height);
        if (viewport.width === 1024) {
          expect(
            box.width,
            `${frame.name} retains the full-size resource or city reward receipt`,
          ).toBeGreaterThanOrEqual(540);
        }
        expect(sealBox.left).toBeGreaterThanOrEqual(0);
        expect(sealBox.top).toBeGreaterThanOrEqual(0);
        expect(sealBox.right).toBeLessThanOrEqual(viewport.width);
        expect(sealBox.bottom).toBeLessThanOrEqual(viewport.height);
        expect(Object.values(sealVisibility)).not.toContain(false);
        expect(cityBox.width).toBeGreaterThan(0);
        expect(cityBox.height).toBeGreaterThan(0);
        expect(buttonBox.left).toBeGreaterThanOrEqual(0);
        expect(buttonBox.top).toBeGreaterThanOrEqual(0);
        expect(buttonBox.right).toBeLessThanOrEqual(viewport.width);
        expect(buttonBox.bottom).toBeLessThanOrEqual(viewport.height);
        expect(Object.values(continueVisibility)).not.toContain(false);
        expect(buttonBox.width).toBeGreaterThanOrEqual(44);
        expect(buttonBox.height).toBeGreaterThanOrEqual(44);
        expect(dialog.querySelector("h2")?.textContent).toBe(
          receipt.headline ?? receipt.primaryLine,
        );
      }
    });
  }
}
