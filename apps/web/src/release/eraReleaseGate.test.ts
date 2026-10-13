import { PRACTICE_SET_SIZE } from "@cr/mastery-service";
import { ERA_SEQUENCE, releasedEras } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import {
  CRISIS_RELEASE_EXEMPT_ERAS,
  validateCrisisReleaseGate,
  validatePracticeReleaseGate,
} from "./eraReleaseGate";

describe("era release gates", () => {
  it("checks every explicitly released era through the real practice and crisis paths", () => {
    expect(releasedEras()).toHaveLength(ERA_SEQUENCE.length);
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
    expect(validatePracticeReleaseGate()).toEqual([]);
    expect(validateCrisisReleaseGate()).toEqual([]);
  });

  it("fails a released node whose city authoring predicate is false", () => {
    const era = releasedEras()[0];
    const thin = era?.nodes[0];
    if (!era || !thin) throw new Error("release-gate fixture needs one released node");

    expect(
      validatePracticeReleaseGate({
        eras: [era],
        authoringComplete: (nodeId) => nodeId !== thin,
      }),
    ).toContainEqual({
      gate: "practice",
      era_id: era.id,
      node_id: thin,
      message: "The city would render this released node as preview.",
    });
  });

  it("fails a short or duplicate real-composer result", () => {
    const era = releasedEras()[0];
    const thin = era?.nodes[0];
    if (!era || !thin) throw new Error("release-gate fixture needs one released node");

    const issues = validatePracticeReleaseGate({
      eras: [{ ...era, nodes: [thin] }],
      authoringComplete: () => true,
      compose: () => Array.from({ length: PRACTICE_SET_SIZE }, () => "same-item"),
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("1 distinct");
  });

  it("fails crisis composition and terminal reachability independently", () => {
    const crisisEra = releasedEras().find((era) => era.id === "prehistoric");
    if (!crisisEra) throw new Error("release-gate fixture needs Prehistoric");

    const composition = validateCrisisReleaseGate({
      eras: [crisisEra],
      composeAtTrigger: () => false,
      reachesTerminal: () => true,
    });
    expect(composition.some((issue) => issue.message.includes("composer refused"))).toBe(
      true,
    );

    const terminal = validateCrisisReleaseGate({
      eras: [crisisEra],
      composeAtTrigger: () => true,
      reachesTerminal: () => false,
    });
    expect(terminal.some((issue) => issue.message.includes("terminal path"))).toBe(true);
  });

  it("pins the non-crisis debt register in both directions", () => {
    const actual = releasedEras()
      .filter(
        (era) =>
          !["prehistoric", "classical", "renaissance", "information_age"].includes(era.id),
      )
      .map((era) => era.id)
      .sort();
    expect([...CRISIS_RELEASE_EXEMPT_ERAS].sort()).toEqual(actual);
  });
});
