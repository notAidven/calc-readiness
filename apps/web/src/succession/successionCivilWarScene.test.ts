import type * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  CRANE_LOAD_NAME,
  CRANE_NAME,
  FIGURE_NAME,
  REMOVAL_CLEAT_NAME,
  SHUTTER_NAME,
} from "../city/three/successionScene";
import { buildForum } from "./successionForum";
import { commitSuccessionAction, successionScenario } from "./successionScenarios";
import { successionView } from "./successionView";

function named(root: THREE.Object3D, name: string): THREE.Object3D[] {
  const found: THREE.Object3D[] = [];
  root.traverse((child) => {
    if (child.name === name) {
      found.push(child);
    }
  });
  return found;
}

describe("current, proposed, and committed scene states", () => {
  it("puts state-linked civic supporters into a ward after allegiance changes", () => {
    const opening = buildForum(successionView(successionScenario("announcement").build()));
    const escalated = buildForum(
      successionView(successionScenario("correct-consequence").build()),
    );

    expect(named(opening, "succession-assembly-supporter")).toHaveLength(0);
    expect(
      named(escalated, "succession-assembly-supporter").length,
      "the rival claim changes props but leaves no civic conflict visible at the shipped view",
    ).toBeGreaterThanOrEqual(3);
  });

  it("completes the stopped port lift when the succession settles", () => {
    const opening = buildForum(successionView(successionScenario("announcement").build()));
    const settled = buildForum(
      successionView(successionScenario("partial-ending").build()),
    );
    const waitingCrane = named(opening, CRANE_NAME)[0];
    const finishedCrane = named(settled, CRANE_NAME)[0];
    const waitingLoad = named(opening, CRANE_LOAD_NAME)[0];
    const finishedLoad = named(settled, CRANE_LOAD_NAME)[0];

    expect(waitingCrane?.userData.completed).toBe(false);
    expect(finishedCrane?.userData.completed).toBe(true);
    expect(finishedLoad?.position.y ?? 0).toBeGreaterThan(waitingLoad?.position.y ?? 0);
  });

  it("draws a rally as a translucent statue before commitment and solid after", () => {
    const proposedState = successionScenario("rally-choice").build();
    const proposed = buildForum(successionView(proposedState));
    const proposedFigures = named(proposed, FIGURE_NAME).filter(
      (figure) => figure.userData.proposed === true,
    );
    expect(proposedFigures).toHaveLength(1);

    const committedState = commitSuccessionAction(proposedState, "rally");
    const committed = buildForum(successionView(committedState));
    const committedFigures = named(committed, FIGURE_NAME);
    expect(committedFigures.length).toBeGreaterThan(
      named(
        buildForum(successionView(successionScenario("correct-consequence").build())),
        FIGURE_NAME,
      ).length,
    );
    expect(committedFigures.some((figure) => figure.userData.proposed === true)).toBe(
      false,
    );
  });

  it("keeps current shutters solid and adds one removal cleat to a reopen proposal", () => {
    const proposed = buildForum(
      successionView(successionScenario("reopen-choice").build()),
    );
    expect(named(proposed, REMOVAL_CLEAT_NAME)).toHaveLength(1);
    const shutters = named(proposed, SHUTTER_NAME) as THREE.Mesh[];
    expect(shutters.length).toBeGreaterThan(1);
    for (const shutter of shutters) {
      expect((shutter.material as THREE.MeshStandardMaterial).transparent).toBe(false);
    }
  });
});
