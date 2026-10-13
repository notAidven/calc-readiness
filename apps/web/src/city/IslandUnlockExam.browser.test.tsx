import { MASTERY_BAR } from "@cr/mastery-service";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import type { StudentNodeState } from "@cr/state-schema";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import {
  createArchipelagoSession,
  type ArchipelagoSession,
} from "../archipelago/archipelagoSession";
import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { createCityDevSession } from "./citySession";
import { CitySurface } from "./CitySurface";
import { clearIslandUnlockExam, saveIslandUnlockExam } from "./islandUnlockExamPersistence";
import { resetCityEra } from "./useCityEra";

import "../styles.css";

const CURRENT = ERA_SEQUENCE[0] as (typeof ERA_SEQUENCE)[number];
const DESTINATION = ERA_SEQUENCE[1] as (typeof ERA_SEQUENCE)[number];
const VIEWPORTS = [
  { width: 1024, height: 580, name: "1024x580" },
  { width: 390, height: 580, name: "390x580" },
] as const;
const SHOTS = Boolean(import.meta.env.VITE_ISLAND_UNLOCK_SHOTS);
const SHOT_VARIANT = import.meta.env.VITE_ISLAND_UNLOCK_SHOT_VARIANT ?? "after";
const EVIDENCE_DIRECTORY = "output/island-unlock-exam";

let harness: Harness | null = null;
let session: ArchipelagoSession | null = null;
let restoreViewport: { width: number; height: number } | null = null;

function cleanupHarness(): void {
  harness?.cleanup();
  harness = null;
}

function nodeState(nodeId: string, mastered: boolean): StudentNodeState {
  return {
    student_id: "island-unlock-browser",
    node_id: nodeId,
    placement_estimate: 0,
    mastery: mastered ? MASTERY_BAR : 1,
    mastery_updated_at: null,
    completion_status: mastered ? "complete" : "in_progress",
    lesson_stage: mastered ? "done" : "practice",
    last_practiced_at: null,
  };
}

beforeAll(() => {
  restoreViewport = { width: window.innerWidth, height: window.innerHeight };
});

afterEach(async () => {
  cleanupHarness();
  session?.dispose();
  session = null;
  clearIslandUnlockExam(CURRENT.id);
  resetCityEra();
  await waitFor(
    () => document.querySelectorAll("canvas").length === 0,
    "the learner frame retained a canvas after cleanup",
    30_000,
  );
});

afterAll(async () => {
  if (restoreViewport) {
    await page.viewport(restoreViewport.width, restoreViewport.height);
  }
});

function viewportBox(): { x: number; y: number; width: number; height: number } {
  const frame = window.frameElement as HTMLElement | null;
  if (!frame) {
    throw new Error("the browser test is not running in its learner iframe");
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

async function capture(name: string): Promise<void> {
  if (SHOTS) {
    const browser = cdp() as unknown as {
      send: (
        method: string,
        params?: Record<string, unknown>,
      ) => Promise<{ readonly data: string }>;
    };
    const box = viewportBox();
    const shot = await browser.send("Page.captureScreenshot", {
      format: "png",
      clip: { ...box, scale: 1 },
    });
    if (SHOTS) {
      await commands.writeFile(`${EVIDENCE_DIRECTORY}/${SHOT_VARIANT}-${name}`, shot.data, {
        encoding: "base64",
      });
    }
  }
}

async function pressKey(key: "Tab" | "Escape", shift = false): Promise<void> {
  const browser = cdp() as unknown as {
    send: (method: string, params: Record<string, unknown>) => Promise<unknown>;
  };
  const modifiers = shift ? 8 : 0;
  await browser.send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key,
    code: key,
    modifiers,
  });
  await browser.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code: key,
    modifiers,
  });
}

function buildSession(): ArchipelagoSession {
  const states = CURRENT.nodes.map((nodeId, index) => nodeState(nodeId, index < 5));
  return createArchipelagoSession({
    initial: createCityDevSession(null, { nodeStates: states }),
    makeIsland: (snapshot) => createCityDevSession(snapshot),
  });
}

async function mountCity(
  live: ArchipelagoSession,
  onUnlockIsland: (eraId: EraId) => void | Promise<void> = live.unlockIsland,
): Promise<void> {
  harness = mount(
    <div className="city-shell">
      <CitySurface
        enableCanvas
        reducedMotion
        loadCity={live.load}
        getArchipelagoSnapshot={live.snapshot}
        onUnlockIsland={onUnlockIsland}
        onResetIsland={live.resetIsland}
      />
    </div>,
  );
  await waitFor(
    () => document.querySelector('[data-testid="city-viewport"]') !== null,
    "the learner city did not mount",
    30_000,
  );
  await document.fonts.ready;
  await new Promise<void>((resolve) => setTimeout(resolve, 700));
}

function click(selector: string): void {
  const element = document.querySelector<HTMLButtonElement>(selector);
  if (!element) {
    throw new Error(`No button matched ${selector}`);
  }
  element.click();
}

async function openMenu(): Promise<void> {
  const menu = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.getAttribute("aria-label") === "Menu",
  );
  if (!menu) {
    throw new Error("The learner Menu button is absent");
  }
  menu.click();
  await waitFor(
    () => document.querySelector('[data-testid="menu-island-unlock"]') !== null,
    "the unlock door did not mount",
  );
}

async function unmountCity(): Promise<void> {
  cleanupHarness();
  await waitFor(
    () => document.querySelectorAll("canvas").length === 0,
    "the learner city canvas did not clean up",
    30_000,
  );
}

function saveExam(
  phase: "exam" | "reveal",
  score: number,
  resolvedOutcome: "correct" | "wrong" | null = null,
): void {
  saveIslandUnlockExam({
    version: 2,
    eraId: CURRENT.id,
    destinationEraId: DESTINATION.id,
    phase,
    score,
    target: CURRENT.nodes.length * 2,
    currentItemVersionId: null,
    scheduler: null,
    resolvedOutcome,
    sessionId: `browser-${phase}-${score}-${resolvedOutcome ?? "open"}`,
    responseCount: resolvedOutcome === null ? 0 : 1,
    pendingResponse: null,
  });
}

function buttonNamed(name: string): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
    (candidate) => candidate.textContent?.trim() === name,
  );
  if (!button) {
    throw new Error(`No visible button was named "${name}".`);
  }
  return button;
}

test("captures every learner unlock state at both short viewports", async () => {
  for (const viewport of VIEWPORTS) {
    await page.viewport(viewport.width, viewport.height);
    resetCityEra();
    clearIslandUnlockExam(CURRENT.id);
    const live = buildSession();
    session = live;
    await mountCity(live);
    await openMenu();

    const door = document.querySelector<HTMLElement>('[data-testid="menu-island-unlock"]');
    expect(door?.textContent).toContain("5 of 6 skills mastered");
    await capture(`${viewport.name}-01-ready-door.png`);

    click('[data-testid="menu-island-unlock"]');
    await waitFor(
      () => document.querySelector('[data-testid="island-unlock-exam"]') !== null,
      "the live unlock exam did not mount",
    );
    expect(document.querySelector('[data-testid="island-unlock-score"]')?.textContent).toBe(
      "0",
    );
    await capture(`${viewport.name}-02-live-exam.png`);
    expect(
      document.querySelector('[data-testid="city-viewport"]')?.closest("[inert]"),
    ).not.toBeNull();
    expect(
      document
        .querySelector("dialog.island-unlock-modal")
        ?.contains(document.activeElement),
    ).toBe(true);
    for (let press = 0; press < 8; press += 1) {
      await pressKey("Tab");
      expect(
        document
          .querySelector("dialog.island-unlock-modal")
          ?.contains(document.activeElement),
      ).toBe(true);
    }
    await pressKey("Tab", true);
    expect(
      document
        .querySelector("dialog.island-unlock-modal")
        ?.contains(document.activeElement),
    ).toBe(true);
    const requestAnimationFrame = window.requestAnimationFrame;
    let activeAfterEscape: HTMLElement | null = null;
    window.requestAnimationFrame = () => 1;
    try {
      await pressKey("Escape");
      await waitFor(
        () => document.querySelector('[data-testid="island-unlock-exam"]') === null,
        "Escape did not deliberately leave the in-progress exam",
      );
      activeAfterEscape = document.activeElement as HTMLElement | null;
    } finally {
      window.requestAnimationFrame = requestAnimationFrame;
    }
    expect(activeAfterEscape?.getAttribute("aria-label")).toBe("Menu");
    expect(activeAfterEscape?.isConnected).toBe(true);
    expect(activeAfterEscape?.closest("[hidden], [inert]")).toBeNull();
    expect(activeAfterEscape?.getClientRects().length).toBeGreaterThan(0);

    await unmountCity();

    saveExam("exam", 1, "correct");
    await mountCity(live);
    await openMenu();
    click('[data-testid="menu-island-unlock"]');
    await waitFor(
      () =>
        document.querySelector('[data-testid="island-unlock-answer-summary"]')
          ?.textContent === "Correct · +1 · 1/12",
      "the correct-answer state did not render",
    );
    expect(document.activeElement).toBe(
      document.querySelector('[data-testid="island-unlock-answer-summary"]'),
    );
    await capture(`${viewport.name}-03-correct.png`);
    await unmountCity();

    saveExam("exam", 0, "wrong");
    await mountCity(live);
    await openMenu();
    click('[data-testid="menu-island-unlock"]');
    await waitFor(
      () =>
        document.querySelector('[data-testid="island-unlock-answer-summary"]')
          ?.textContent === "Incorrect · −1 · 0/12",
      "the incorrect-answer reveal did not render",
    );
    expect(document.querySelector(".worked-solution")).not.toBeNull();
    await capture(`${viewport.name}-04-incorrect-reveal.png`);
    await unmountCity();

    saveExam("exam", 1);
    await mountCity(live);
    await openMenu();
    expect(document.querySelector('[data-testid="menu-island-unlock"]')).toHaveTextContent(
      "Resume unlock exam · 1/12",
    );
    click('[data-testid="menu-island-unlock"]');
    await waitFor(
      () =>
        document.querySelector('[data-testid="island-unlock-score"]')?.textContent === "1",
      "the resumed exam did not restore its score",
    );
    await capture(`${viewport.name}-05-resumed-exam.png`);
    await unmountCity();

    saveExam("reveal", CURRENT.nodes.length * 2);
    let rejectFounding: (reason: Error) => void = () => {
      throw new Error("The founding rejection seam was not connected.");
    };
    const firstFounding = new Promise<void>((_resolve, reject) => {
      rejectFounding = reject;
    });
    let foundingAttempt = 0;
    const founding = async (destination: EraId): Promise<void> => {
      foundingAttempt += 1;
      if (foundingAttempt === 1) {
        return firstFounding;
      }
      await live.unlockIsland(destination);
    };
    await mountCity(live, founding);
    await openMenu();
    click('[data-testid="menu-island-unlock"]');
    await waitFor(
      () =>
        document.querySelector(
          '[data-testid="island-unlock-founding"][data-status="pending"]',
        ) !== null,
      "the pending founding did not render",
    );
    await capture(`${viewport.name}-06-founding-pending.png`);

    rejectFounding(new Error("The harbour record could not be saved."));
    await waitFor(
      () =>
        document.querySelector(
          '[data-testid="island-unlock-founding"][data-status="failure"]',
        ) !== null,
      "the failed founding did not render",
    );
    expect(
      document.querySelector('[data-testid="island-unlock-founding"] h2')?.textContent,
    ).toBe("Founding paused");
    expect(
      buttonNamed("Retry founding").getBoundingClientRect().height,
    ).toBeGreaterThanOrEqual(44);
    await capture(`${viewport.name}-07-founding-failure.png`);

    buttonNamed("Retry founding").click();
    await waitFor(
      () =>
        document.querySelector(
          '[data-testid="island-unlock-founding"][data-status="success"]',
        ) !== null,
      "the successful founding did not render",
      30_000,
    );
    const choices = document.querySelectorAll(
      '[data-testid="island-unlock-choice"] button',
    );
    expect(choices).toHaveLength(2);
    expect(buttonNamed(`Sail to ${DESTINATION.name}`)).toBeVisible();
    expect(buttonNamed(`Stay on ${CURRENT.name}`)).toBeVisible();
    const foundingCard = document.querySelector<HTMLElement>(
      ".island-unlock-founding__card",
    );
    expect(foundingCard).not.toBeNull();
    if (foundingCard) {
      expect(foundingCard.scrollHeight).toBeLessThanOrEqual(foundingCard.clientHeight + 1);
    }
    await capture(`${viewport.name}-08-founding-success-sail-stay.png`);

    buttonNamed(`Stay on ${CURRENT.name}`).click();
    await waitFor(
      () => document.querySelector('[data-testid="island-unlock-founding"]') === null,
      "Stay did not close the founding payoff",
    );
    expect(live.standing()).toBe(CURRENT.id);
    expect(live.islands()).toEqual([CURRENT.id, DESTINATION.id]);

    await unmountCity();
    live.dispose();
    session = null;
    clearIslandUnlockExam(CURRENT.id);
    resetCityEra();
  }
}, 300_000);
