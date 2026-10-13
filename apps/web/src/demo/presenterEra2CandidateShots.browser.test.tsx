import { getEraOrThrow } from "@cr/skill-graph";
import type { StudentNodeState } from "@cr/state-schema";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { LocalSessionProvider } from "../auth/LocalSessionProvider";
import { CitySurface } from "../city/CitySurface";
import { createCityDevSession } from "../city/citySession";
import { eraCivicPlacementIds } from "../city/inheritedCivics";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../city/townHall";
import { resetCityEra, setCityEraForPreview } from "../city/useCityEra";
import type { PlacedTransform } from "../city/worldLayout";
import { PresenterShell } from "./PresenterShell";
import { distributedPlacements } from "./presenterFixtures";

import "../styles.css";

const SHOTS = Boolean(import.meta.env.VITE_PRESENTER_ERA2_CANDIDATE_SHOTS);
const OUTPUT = "output/design-review/presenter-era2-target-selection/baseline-candidates";
const CANDIDATES = ["EXP.1", "RAD.1", "RAD.2", "RAD.3", "RAD.4"] as const;
const STAGES = ["unbuilt", "foundation", "construction", "complete"] as const;
const VIEWPORTS = [
  { width: 1024, height: 580 },
  { width: 390, height: 580 },
] as const;
const PRACTICED_AT = "2026-08-12T00:00:00.000Z";

type ReviewStage = (typeof STAGES)[number];

afterEach(() => {
  cleanup();
  resetCityEra();
  window.history.replaceState(null, "", "/");
});

function nodeState(nodeId: string, stage: ReviewStage): StudentNodeState {
  const complete = stage === "complete";
  const construction = stage === "construction";
  return {
    student_id: "presenter-era2-candidate-review",
    node_id: nodeId,
    placement_estimate: complete ? 2 : 0,
    mastery: complete ? 3 : 0,
    mastery_updated_at: complete ? PRACTICED_AT : null,
    completion_status: complete ? "complete" : construction ? "in_progress" : "locked",
    lesson_stage: complete ? "done" : construction ? "practice" : "not_started",
    last_practiced_at: complete ? PRACTICED_AT : null,
  };
}

function viewportClip(): { x: number; y: number; width: number; height: number } {
  const frame = window.frameElement as HTMLElement | null;
  if (!frame) {
    throw new Error("the Presenter candidate review has no browser frame");
  }
  const box = frame.getBoundingClientRect();
  const outer = window.parent as Window;
  return {
    x: box.left + outer.scrollX,
    y: box.top + outer.scrollY,
    width: box.width,
    height: box.height,
  };
}

async function capture(): Promise<string> {
  const browser = cdp() as unknown as {
    send(
      method: string,
      params: Record<string, unknown>,
    ): Promise<{ readonly data: string }>;
  };
  const shot = await browser.send("Page.captureScreenshot", {
    format: "png",
    clip: { ...viewportClip(), scale: 1 },
  });
  expect(shot.data).toBeTruthy();
  return shot.data;
}

function candidateCity(candidate: (typeof CANDIDATES)[number], stage: ReviewStage) {
  const era = getEraOrThrow("neolithic");
  const civicIds = eraCivicPlacementIds(era.id);
  const supportIds = ["NUM.4"] as const;
  const allPlacements = distributedPlacements(era.id, [
    ...era.nodes,
    ...supportIds,
    ...civicIds,
  ]);
  const skillIds = new Set([...era.nodes, ...supportIds]);
  const placements = allPlacements.filter(
    (placement) => skillIds.has(placement.nodeId) && placement.nodeId !== candidate,
  );
  if (stage !== "unbuilt") {
    const target = allPlacements.find((placement) => placement.nodeId === candidate);
    if (!target) {
      throw new Error(`the review layout has no lot for ${candidate}`);
    }
    placements.push(target);
  }
  const stateByNode = new Map(
    [...era.nodes, ...supportIds].map((nodeId) => [
      nodeId,
      nodeState(nodeId, nodeId === candidate ? stage : "complete"),
    ]),
  );
  return {
    nodeStates: [...stateByNode.values()],
    placements,
    townHall: { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM },
    civic: allPlacements.filter((placement): placement is PlacedTransform =>
      civicIds.includes(placement.nodeId),
    ),
  };
}

test.runIf(SHOTS)(
  "captures every Era 2 skill candidate through the full Presenter progression",
  async () => {
    const era = getEraOrThrow("neolithic");
    expect(era.nodes).toEqual(CANDIDATES);
    expect(CANDIDATES).toHaveLength(5);
    expect(STAGES).toHaveLength(4);

    for (const viewport of VIEWPORTS) {
      await page.viewport(viewport.width, viewport.height);
      for (const candidate of CANDIDATES) {
        for (const stage of STAGES) {
          cleanup();
          setCityEraForPreview("neolithic");
          window.history.replaceState(
            null,
            "",
            "/demo?presenter=1&preset=bronze-city&surface=city&era=neolithic",
          );
          const session = createCityDevSession(null, candidateCity(candidate, stage));
          const request = {
            enabled: true,
            legacy: false,
            preset: "bronze-city",
            surface: "city",
            eraId: "neolithic",
          } as const;
          render(
            <LocalSessionProvider>
              <PresenterShell request={request}>
                <div className="city-shell">
                  <CitySurface
                    enableCanvas
                    enableOnboardingDemo={false}
                    reducedMotion
                    eraId="neolithic"
                    archipelagoMetrics
                    loadCity={session.load}
                    suppressAchievementNotes
                    suppressCrisisCalls
                  />
                </div>
              </PresenterShell>
            </LocalSessionProvider>,
          );
          await screen.findByRole("button", { name: "Build" }, { timeout: 30_000 });
          await waitFor(
            () =>
              expect(
                document.querySelector<HTMLElement>('[data-testid="city-viewport"]')
                  ?.dataset.compositionReady,
                `${candidate}/${stage} did not settle at ${viewport.width}x${viewport.height}`,
              ).toBe("true"),
            { timeout: 60_000 },
          );
          if (stage === "unbuilt") {
            expect(document.querySelector(`[data-skill-label="${candidate}"]`)).toBeNull();
          } else {
            await waitFor(
              () =>
                expect(
                  document.querySelector(
                    `[data-skill-label="${candidate}"][data-footprint-screen-box]`,
                  ),
                ).not.toBeNull(),
              { timeout: 30_000 },
            );
          }
          await document.fonts.ready;
          await new Promise<void>((resolve) => setTimeout(resolve, 450));
          const filename = `${candidate.toLowerCase().replace(".", "-")}-${stage}.png`;
          const shot = await capture();
          if (viewport.width === 1024) {
            await commands.writeFile(`${OUTPUT}/1024x580/${filename}`, shot, {
              encoding: "base64",
            });
          } else {
            await commands.writeFile(`${OUTPUT}/390x580/${filename}`, shot, {
              encoding: "base64",
            });
          }
        }
      }
    }
  },
  600_000,
);
