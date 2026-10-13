import {
  appendEntries,
  applyGrant,
  civicBuildingOrThrow,
  lessonCompleteGrant,
  materialForEraOrThrow,
} from "@cr/economy";
import { roadHappinessCoverage } from "@cr/game";
import { ERA_SEQUENCE } from "@cr/skill-graph";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { roadCost } from "../city/roads";
import { CompletionRewardProvider, useCompletionRewards } from "./CompletionRewardProvider";
import {
  type CompletionRewardReceipt,
  civicCompletionReward,
  lessonCompletionReward,
  masteryStarReward,
  materialGrantReward,
  mergeCompletionRewards,
  roadCompletionReward,
  skillCompletionReward,
} from "./completionRewards";

const STUDENT = "completion-reward-test";
const NOW = Date.UTC(2026, 7, 12);

function firstNodeInEra(index: number): string {
  const nodeId = ERA_SEQUENCE[index]?.nodes[0];
  if (!nodeId) {
    throw new Error(`era ${index} has no node to exercise`);
  }
  return nodeId;
}

describe("lesson completion acknowledgements", () => {
  it("uses its own context and heading without claiming mastery or economic gains", () => {
    const receipt = lessonCompletionReward({ nodeId: "LF.1", subject: "Assembly Hall" });
    expect(receipt).toEqual({
      id: "lesson_taught:LF.1",
      groupKey: "lesson_taught:LF.1",
      context: "Lesson complete",
      subject: "Assembly Hall",
      gains: [],
      details: [],
      costs: [],
      primaryLine: "Lesson complete!",
      headline: "Lesson complete!",
    });
    expect(mergeCompletionRewards(receipt, receipt)).toEqual(receipt);
  });
});

describe("mastery completion receipts", () => {
  it("reports the committed star increase and the three-star total", () => {
    expect(
      masteryStarReward({
        id: "lf1-mastery",
        groupKey: "lf1-mastery",
        subject: "LF.1 building",
        before: 2,
        after: 3,
        total: 3,
      }),
    ).toMatchObject({
      context: "Mastery complete",
      subject: "LF.1 building",
      primaryLine: "+1 Mastery star",
      details: [{ amount: 3, label: "of 3 gold stars" }],
    });
    expect(
      masteryStarReward({
        id: "unchanged",
        groupKey: "unchanged",
        subject: "LF.1 building",
        before: 3,
        after: 3,
        total: 3,
      }),
    ).toBeNull();
  });
});

describe("material completion receipts", () => {
  it("uses the actual committed economy output and exact material name in every era", () => {
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);

    ERA_SEQUENCE.forEach((era, index) => {
      const grant = lessonCompleteGrant({
        studentId: STUDENT,
        nodeId: firstNodeInEra(index),
        nowMs: NOW,
      });
      const committed = applyGrant({ entries: [] }, grant);
      const material = materialForEraOrThrow(era.id);
      const actualAmount = committed.grantedMaterials[material.id];
      expect(actualAmount, `${era.id} economy output`).toBeGreaterThan(0);

      const receipt = materialGrantReward({
        id: grant.eventId,
        groupKey: grant.eventId,
        context: "Practice complete",
        grantedMaterials: committed.grantedMaterials,
      });

      expect(receipt, `${era.id} receipt`).not.toBeNull();
      expect(receipt?.gains).toContainEqual({
        kind: "material",
        amount: actualAmount,
        label: material.display_name,
        materialId: material.id,
      });
      expect(receipt?.primaryLine).toBe(`+${actualAmount} ${material.display_name}`);
    });
  });

  it("returns no receipt for replayed, empty, or zero grants", () => {
    const grant = lessonCompleteGrant({
      studentId: STUDENT,
      nodeId: firstNodeInEra(0),
      nowMs: NOW,
    });
    const first = applyGrant({ entries: [] }, grant);
    const replay = applyGrant(appendEntries({ entries: [] }, first.rows), grant);

    expect(replay.applied).toBe(false);
    expect(
      materialGrantReward({
        id: grant.eventId,
        groupKey: grant.eventId,
        context: "Practice complete",
        grantedMaterials: replay.grantedMaterials,
      }),
    ).toBeNull();
    expect(
      materialGrantReward({
        id: "empty",
        groupKey: "empty",
        context: "Practice complete",
        grantedMaterials: { stone: 0 },
      }),
    ).toBeNull();
  });
});

describe("canonical city completion benefits", () => {
  it("reports only positive skill-building deltas from before and after city readouts", () => {
    const receipt = skillCompletionReward({
      id: "skill:NUM.3:2",
      groupKey: "lesson_complete:NUM.3",
      context: "Skill building complete",
      subject: "Dwellings",
      headline: "Dwellings is now complete",
      before: { population: 8, livability: 28, happiness: 0 },
      after: { population: 14, livability: 38, happiness: 2 },
    });

    expect(receipt?.context).toBe("Skill building complete");
    expect(receipt?.headline).toBe("Dwellings is now complete");
    expect(receipt?.gains).toEqual([
      { kind: "population", amount: 6, label: "people" },
      { kind: "livability", amount: 10, label: "Livability" },
      { kind: "happiness", amount: 2, label: "Happiness" },
    ]);
    expect(receipt?.primaryLine).toBe("+6 people");
  });

  it("reports civic gains from the purchased catalogue row and keeps cost out of gains", () => {
    const row = civicBuildingOrThrow("prehistoric_longhouse");
    const material = materialForEraOrThrow(row.era);
    const receipt = civicCompletionReward({
      id: "civic:longhouse:7",
      groupKey: "civic:longhouse:7",
      result: {
        status: "built",
        cost: row.cost,
        placementId: "civic:longhouse:7",
        economyStatus: "spent",
      },
      building: row,
      material,
    });

    expect(receipt?.context).toBe("Building complete");
    expect(receipt?.gains).toEqual(
      [
        row.provides.livability > 0
          ? { kind: "livability", amount: row.provides.livability, label: "Livability" }
          : null,
        row.provides.happiness > 0
          ? { kind: "happiness", amount: row.provides.happiness, label: "Happiness" }
          : null,
      ].filter(Boolean),
    );
    expect(receipt?.costs).toEqual([
      { amount: row.cost, label: material.display_name, materialId: material.id },
    ]);
    expect(receipt?.gains.some((gain) => gain.amount === row.cost)).toBe(false);
  });

  it("derives a committed road's Happiness from canonical road output and labels spending", () => {
    const laidCount = 3;
    const material = materialForEraOrThrow("prehistoric");
    const result = {
      status: "committed" as const,
      laidCount,
      cost: roadCost(laidCount),
    };
    const receipt = roadCompletionReward({
      id: "road:0,3|1,3|2,3",
      groupKey: "road:0,3|1,3|2,3",
      result,
      material,
    });

    expect(receipt?.context).toBe("Road connected");
    expect(receipt?.gains).toContainEqual({
      kind: "happiness",
      amount: roadHappinessCoverage(result.laidCount),
      label: "Happiness",
    });
    expect(receipt?.details).toContainEqual({
      amount: result.laidCount,
      label: "road tiles connected",
    });
    expect(receipt?.costs).toEqual([
      { amount: result.cost, label: material.display_name, materialId: material.id },
    ]);
    expect(
      roadCompletionReward({
        id: "road:repeat",
        groupKey: "road:repeat",
        result: { status: "empty", laidCount: 0, cost: 0 },
        material,
      }),
    ).toBeNull();
  });
});

describe("receipt coalescing and presentation", () => {
  const building: CompletionRewardReceipt = {
    id: "building",
    groupKey: "lesson_complete:NUM.3",
    context: "Skill building complete",
    subject: "Dwellings",
    gains: [{ kind: "population", amount: 6, label: "people" }],
    details: [],
    costs: [],
    primaryLine: "+6 people",
    headline: "Dwellings is now complete",
  };
  const material: CompletionRewardReceipt = {
    id: "material",
    groupKey: "lesson_complete:NUM.3",
    context: "Practice complete",
    subject: null,
    gains: [
      {
        kind: "material",
        amount: 100,
        label: "Stone",
        materialId: "stone",
      },
    ],
    details: [],
    costs: [],
    primaryLine: "+100 Stone",
    headline: null,
  };
  const mastery = masteryStarReward({
    id: "mastery",
    groupKey: "lesson_complete:NUM.3",
    subject: "Dwellings",
    before: 2,
    after: 3,
    total: 3,
  });
  if (mastery === null) {
    throw new Error("the coalescing fixture produced no mastery increase");
  }

  it("coalesces material, skill-building and three-star mastery without duplicate gains", () => {
    const merged = mergeCompletionRewards(
      mergeCompletionRewards(mergeCompletionRewards(building, material), mastery),
      material,
    );
    expect(merged.context).toBe("Skill building complete");
    expect(merged.headline).toBe("Dwellings is now complete");
    expect(merged.primaryLine).toBe("+1 Mastery star");
    expect(merged.gains).toHaveLength(3);
    expect(merged.gains.filter((gain) => gain.kind === "material")).toHaveLength(1);
    expect(merged.gains).toContainEqual({
      kind: "mastery",
      amount: 1,
      label: "Mastery star",
    });
    expect(merged.details).toContainEqual({ amount: 3, label: "of 3 gold stars" });
  });

  it("renders one announced, keyboard-dismissable dialog and queues another transaction", () => {
    function Harness() {
      const rewards = useCompletionRewards();
      return (
        <>
          <button type="button" onClick={() => rewards.enqueue(building)}>
            Building
          </button>
          <button type="button" onClick={() => rewards.enqueue(material)}>
            Material
          </button>
          <button type="button" onClick={() => rewards.enqueue(mastery)}>
            Mastery
          </button>
          <button
            type="button"
            onClick={() =>
              rewards.enqueue({
                ...building,
                id: "road",
                groupKey: "road:one",
                context: "Road connected",
                primaryLine: "+1 Happiness",
                gains: [{ kind: "happiness", amount: 1, label: "Happiness" }],
                headline: null,
              })
            }
          >
            Road
          </button>
        </>
      );
    }

    render(
      <CompletionRewardProvider reducedMotion>
        <Harness />
      </CompletionRewardProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Building" }));
    // The modal correctly makes the source controls inaccessible. Fire their held DOM
    // callbacks directly to model two async transactions landing while it is open.
    fireEvent.click(screen.getByText("Material"));
    fireEvent.click(screen.getByText("Mastery"));
    fireEvent.click(screen.getByText("Road"));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("data-reduced-motion", "true");
    expect(
      screen.getByRole("heading", { name: "Dwellings is now complete" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Skill building complete")).toBeInTheDocument();
    expect(screen.getByText("+100 Stone")).toBeInTheDocument();
    expect(screen.getByText("+1 Mastery star")).toBeInTheDocument();
    expect(dialog).toHaveTextContent("3 of 3 gold stars");
    expect(screen.getByText("+6 people")).toBeInTheDocument();
    expect(screen.queryByText("+1 Happiness")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toHaveFocus();

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.getByRole("heading", { name: "+1 Happiness" })).toBeInTheDocument();
    expect(screen.getAllByRole("alertdialog")).toHaveLength(1);
  });
});
