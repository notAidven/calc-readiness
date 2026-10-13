import { MASTERY_BAR } from "@cr/mastery-service";
import { ERA_SEQUENCE } from "@cr/skill-graph";
import type { StudentNodeState } from "@cr/state-schema";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";

import {
  createArchipelagoSession,
  type ArchipelagoSession,
} from "../archipelago/archipelagoSession";
import { createCityDevSession } from "./citySession";
import { CitySurface } from "./CitySurface";
import { clearIslandUnlockExam, saveIslandUnlockExam } from "./islandUnlockExamPersistence";
import { cityEraId, resetCityEra } from "./useCityEra";

const CURRENT = ERA_SEQUENCE[0] as (typeof ERA_SEQUENCE)[number];
const DESTINATION = ERA_SEQUENCE[1] as (typeof ERA_SEQUENCE)[number];

function state(nodeId: string, mastery: 0 | 1 | 2 = 2): StudentNodeState {
  return {
    student_id: "city-unlock-test",
    node_id: nodeId,
    placement_estimate: 0,
    mastery,
    mastery_updated_at: null,
    completion_status: mastery >= MASTERY_BAR ? "complete" : "in_progress",
    lesson_stage: mastery >= MASTERY_BAR ? "done" : "practice",
    last_practiced_at: null,
  };
}

let session: ArchipelagoSession | null = null;

beforeEach(() => {
  resetCityEra();
  clearIslandUnlockExam(CURRENT.id);
});

afterEach(() => {
  session?.dispose();
  session = null;
  clearIslandUnlockExam(CURRENT.id);
  resetCityEra();
});

function build(): ArchipelagoSession {
  const nodeStates = CURRENT.nodes.map((nodeId, index) => state(nodeId, index < 5 ? 2 : 1));
  return createArchipelagoSession({
    initial: createCityDevSession(null, { nodeStates }),
    makeIsland: (snapshot) => createCityDevSession(snapshot),
  });
}

async function openMenu(): Promise<void> {
  await screen.findByRole("button", { name: "Menu" });
  fireEvent.click(screen.getByRole("button", { name: "Menu" }));
}

function deferAnimationFrames(): () => void {
  const requestAnimationFrame = window.requestAnimationFrame;
  window.requestAnimationFrame = () => 1;
  return () => {
    window.requestAnimationFrame = requestAnimationFrame;
  };
}

function expectSafeMenuFocus(menu: HTMLButtonElement): void {
  expect(menu).toHaveFocus();
  expect(menu.isConnected).toBe(true);
  expect(menu).toBeVisible();
  expect(menu.closest("[hidden], [inert]")).toBeNull();
}

describe("CitySurface island progression", () => {
  it("mounts the ready door from current-island mastery and opens the real exam", async () => {
    session = build();
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        getArchipelagoSnapshot={session.snapshot}
        onUnlockIsland={session.unlockIsland}
      />,
    );
    await openMenu();

    const door = screen.getByTestId("menu-island-unlock");
    expect(door).toHaveTextContent("5 of 6 skills mastered");
    expect(door).toHaveTextContent("5 required (80%)");
    expect(door).toHaveTextContent("Exam target 12 net points");
    fireEvent.click(door);
    expect(await screen.findByTestId("island-unlock-exam")).toBeInTheDocument();
  });

  it("Stay closes to the standing island while both islands remain in the bay", async () => {
    session = build();
    await session.unlockIsland(DESTINATION.id);
    saveIslandUnlockExam({
      version: 2,
      eraId: CURRENT.id,
      destinationEraId: DESTINATION.id,
      phase: "choice",
      score: CURRENT.nodes.length * 2,
      target: CURRENT.nodes.length * 2,
      currentItemVersionId: null,
      scheduler: null,
      resolvedOutcome: null,
      sessionId: "city-surface-keep",
      responseCount: 0,
      pendingResponse: null,
    });
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        getArchipelagoSnapshot={session.snapshot}
        onUnlockIsland={session.unlockIsland}
      />,
    );
    await openMenu();
    const menu = screen.getByRole<HTMLButtonElement>("button", { name: "Menu" });
    fireEvent.click(screen.getByTestId("menu-island-unlock"));
    const restoreAnimationFrames = deferAnimationFrames();
    try {
      fireEvent.click(
        await screen.findByRole("button", { name: `Stay on ${CURRENT.name}` }),
      );
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expectSafeMenuFocus(menu);
    } finally {
      restoreAnimationFrames();
    }

    expect(cityEraId()).toBe(CURRENT.id);
    expect(session.standing()).toBe(CURRENT.id);
    expect(session.islands()).toEqual([CURRENT.id, DESTINATION.id]);
    await openMenu();
    expect(screen.getByTestId("menu-bay")).toBeInTheDocument();
  });

  it("Sail is the explicit write that changes the standing island", async () => {
    session = build();
    await session.unlockIsland(DESTINATION.id);
    saveIslandUnlockExam({
      version: 2,
      eraId: CURRENT.id,
      destinationEraId: DESTINATION.id,
      phase: "choice",
      score: CURRENT.nodes.length * 2,
      target: CURRENT.nodes.length * 2,
      currentItemVersionId: null,
      scheduler: null,
      resolvedOutcome: null,
      sessionId: "city-surface-sail",
      responseCount: 0,
      pendingResponse: null,
    });
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        getArchipelagoSnapshot={session.snapshot}
        onUnlockIsland={session.unlockIsland}
      />,
    );
    await openMenu();
    const menu = screen.getByRole<HTMLButtonElement>("button", { name: "Menu" });
    fireEvent.click(screen.getByTestId("menu-island-unlock"));
    const restoreAnimationFrames = deferAnimationFrames();
    try {
      fireEvent.click(
        await screen.findByRole("button", { name: `Sail to ${DESTINATION.name}` }),
      );
      await waitFor(() => expect(session?.standing()).toBe(DESTINATION.id));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expectSafeMenuFocus(menu);
    } finally {
      restoreAnimationFrames();
    }
    expect(cityEraId()).toBe(DESTINATION.id);
  });

  it("resumes an authoritative account reveal without an archipelago callback", async () => {
    session = build();
    saveIslandUnlockExam({
      version: 2,
      eraId: CURRENT.id,
      destinationEraId: DESTINATION.id,
      phase: "reveal",
      score: CURRENT.nodes.length * 2,
      target: CURRENT.nodes.length * 2,
      currentItemVersionId: null,
      scheduler: null,
      resolvedOutcome: null,
      sessionId: "single-island-account",
      responseCount: CURRENT.nodes.length * 2,
      pendingResponse: null,
    });
    render(
      <CitySurface
        bayAvailable={false}
        enableCanvas={false}
        loadCity={session.load}
        onRecordIslandExamResponse={async () => ({
          score: CURRENT.nodes.length * 2,
          target: CURRENT.nodes.length * 2,
          delta: 1,
          passed: true,
          responseCount: CURRENT.nodes.length * 2,
        })}
      />,
    );
    await openMenu();
    fireEvent.click(screen.getByTestId("menu-island-unlock"));

    expect(
      await screen.findByRole("button", { name: `Sail to ${DESTINATION.name}` }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry founding" })).toBeNull();
  });

  it("keeps single-island account Sail retryable until its durable landing succeeds", async () => {
    session = build();
    saveIslandUnlockExam({
      version: 2,
      eraId: CURRENT.id,
      destinationEraId: DESTINATION.id,
      phase: "choice",
      score: CURRENT.nodes.length * 2,
      target: CURRENT.nodes.length * 2,
      currentItemVersionId: null,
      scheduler: null,
      resolvedOutcome: null,
      sessionId: "single-island-sail",
      responseCount: CURRENT.nodes.length * 2,
      pendingResponse: null,
    });
    const land = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline save"))
      .mockResolvedValue(undefined);
    render(
      <CitySurface
        bayAvailable={false}
        enableCanvas={false}
        loadCity={session.load}
        onRecordIslandExamResponse={async () => ({
          score: CURRENT.nodes.length * 2,
          target: CURRENT.nodes.length * 2,
          delta: 1,
          passed: true,
          responseCount: CURRENT.nodes.length * 2,
        })}
        onSailIsland={land}
      />,
    );
    await openMenu();
    const menu = screen.getByRole<HTMLButtonElement>("button", { name: "Menu" });
    fireEvent.click(screen.getByTestId("menu-island-unlock"));
    fireEvent.click(
      await screen.findByRole("button", { name: `Sail to ${DESTINATION.name}` }),
    );

    expect(await screen.findByText("offline save")).toBeInTheDocument();
    expect(cityEraId()).toBe(CURRENT.id);
    expect(screen.getByTestId("island-unlock-choice")).toBeInTheDocument();

    const restoreAnimationFrames = deferAnimationFrames();
    try {
      fireEvent.click(screen.getByRole("button", { name: `Sail to ${DESTINATION.name}` }));
      await waitFor(() => expect(land).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expectSafeMenuFocus(menu);
    } finally {
      restoreAnimationFrames();
    }
  });
});
