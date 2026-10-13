import { lessonMaterialAmountAfterFounding, materialForEraOrThrow } from "@cr/economy";
import { type EraId, getEraOrThrow } from "@cr/skill-graph";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { commands, page } from "vitest/browser";

import { App } from "../App";
import { resetCityEra } from "../city/useCityEra";
import { PRESENTER_LESSON_NODE_ID } from "./PresenterLessonDemo";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/** One slash-free path segment, so a capture phase cannot escape its evidence directory. */
function evidencePhase(value: string | undefined): string {
  const phase = value?.trim();
  return phase && /^[a-z0-9-]+$/i.test(phase) ? phase : "current";
}

const COMPLETION_CAPTURE_PHASE = evidencePhase(
  import.meta.env.VITE_COMPLETION_REWARD_CAPTURE_PHASE,
);

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetCityEra();
  window.history.replaceState(null, "", "/");
});

async function captureLessonCompletion(filename: string): Promise<void> {
  if (CAPTURE_EVIDENCE) {
    const shot = await page.screenshot({
      path: `__screenshots__/lesson-completion/${COMPLETION_CAPTURE_PHASE}/${filename}`,
      base64: true,
    });
    expect(shot.path, filename).toBeTruthy();
    expect(shot.base64, filename).toBeTruthy();
    await commands.writeFile(
      `output/design-review/lesson-completion/${COMPLETION_CAPTURE_PHASE}/${filename}`,
      shot.base64,
      {
        encoding: "base64",
      },
    );
  }
}

async function targetBuildingCallout(nodeId: string): Promise<string> {
  screen.getByRole<HTMLButtonElement>("button", { name: "Build" }).click();
  const shop = await screen.findByRole("dialog", {
    name: "Choose a skill to build",
  });
  const lessonTab = within(shop).getByRole<HTMLButtonElement>("tab", { name: "Lessons" });
  expect(lessonTab).toHaveAttribute("aria-selected", "true");
  await waitFor(() => expect(lessonTab).toHaveAttribute("aria-selected", "true"));
  within(shop)
    .getByRole<HTMLButtonElement>("button", { name: /^Built \d+\/\d+$/ })
    .click();
  const row = shop.querySelector<HTMLButtonElement>(`button[data-node-id="${nodeId}"]`);
  expect(row, `${nodeId} is absent from the Built shelf`).not.toBeNull();
  row?.click();
  const callout = await waitFor(() => {
    const found = document.querySelector<HTMLElement>('.building-callout[role="dialog"]');
    expect(found).not.toBeNull();
    return found as HTMLElement;
  });
  const state = (callout.textContent ?? "").replace(/\s+/g, " ").trim();
  callout.querySelector<HTMLButtonElement>(".building-callout-close")?.click();
  return state;
}

function presenterBuildingStateBytes(): string {
  const bytes =
    document.querySelector<HTMLElement>(".city-surface")?.dataset
      .presenterBuildingStateBytes;
  if (!bytes) {
    throw new Error("the Presenter city exposes no focused-building state bytes");
  }
  return bytes;
}

for (const target of [
  { eraId: "atomic_age", width: 1024 },
  { eraId: "atomic_age", width: 390 },
] as const satisfies readonly { readonly eraId: EraId; readonly width: number }[]) {
  test(`Presenter LF.1 keeps the actual Atomic building gold at ${target.width}px`, {
    timeout: 60_000,
  }, async () => {
    await page.viewport(target.width, 580);
    window.history.replaceState(
      null,
      "",
      `/demo?presenter=1&preset=progress-foundation&surface=city&era=${target.eraId}`,
    );
    render(<App />);

    await screen.findByRole("button", { name: "Build" });
    await waitFor(
      () => expect(document.querySelector(".city-canvas canvas")).not.toBeNull(),
      { timeout: 15_000 },
    );
    const city = document.querySelector(".city-surface");
    const canvas = document.querySelector(".city-canvas canvas");
    const goldState = await targetBuildingCallout("LF.1");
    expect(goldState).toMatch(/Welcome back.*already worked through this skill/i);

    within(screen.getByRole("navigation", { name: "Presenter actions" }))
      .getByRole<HTMLButtonElement>("button", { name: "Lesson" })
      .click();
    expect(
      await screen.findByRole("heading", { name: "Slope as a constant rate of change" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Rise over run")).toBeInTheDocument();
    expect(document.querySelector(".worked-solution")).not.toBeNull();
    expect(document.querySelector("figure.lesson-visual")).toBeNull();
    screen.getByRole<HTMLButtonElement>("button", { name: "Next" }).click();
    expect(
      await screen.findByRole("img", { name: /with a run of .* and a rise of/i }),
    ).toBeInTheDocument();
    screen.getByRole<HTMLButtonElement>("button", { name: "Complete lesson" }).click();
    await waitFor(() => {
      expect(new URL(window.location.href).searchParams.get("surface")).toBe("city");
      expect(document.querySelector(".world-scene")).toBeNull();
      expect(document.querySelector(".city-viewport")).not.toBeNull();
    });
    const lessonReward = await screen.findByRole("alertdialog");
    expect(lessonReward).toHaveAttribute("data-context", "Lesson complete");
    expect(lessonReward.closest(".completion-reward-layer")).toHaveAttribute(
      "data-context",
      "Lesson complete",
    );
    const lessonHeading = within(lessonReward).getByRole("heading", {
      name: "Lesson complete!",
    });
    expect(lessonHeading).toBeVisible();
    expect(lessonReward.querySelector('[data-kind="gain"], [data-kind="cost"]')).toBeNull();
    expect(lessonReward).not.toHaveTextContent(
      /mastery|stone|grain|population|livability|happiness/i,
    );
    await Promise.all(lessonReward.getAnimations().map((animation) => animation.finished));
    const rewardBox = lessonReward.getBoundingClientRect();
    expect(rewardBox.left).toBeGreaterThanOrEqual(0);
    expect(rewardBox.top).toBeGreaterThanOrEqual(0);
    expect(rewardBox.right).toBeLessThanOrEqual(target.width);
    expect(rewardBox.bottom).toBeLessThanOrEqual(580);
    if (target.width === 1024) {
      await document.fonts.ready;
      await captureLessonCompletion("presenter-lf1-1024x580.png");
      expect(
        rewardBox.width,
        "the gainless lesson acknowledgement stays substantial enough for an audience",
      ).toBeGreaterThanOrEqual(440);
      expect(
        rewardBox.width,
        "the gainless lesson acknowledgement leaves more of the city visible",
      ).toBeLessThanOrEqual(500);
      expect(
        rewardBox.height,
        "the gainless lesson acknowledgement does not dominate a short learner viewport",
      ).toBeLessThanOrEqual(300);
      expect(
        Number.parseFloat(getComputedStyle(lessonHeading).fontSize),
        "the lesson acknowledgement remains projector-readable after compacting",
      ).toBeGreaterThanOrEqual(48);
    }
    within(lessonReward)
      .getByRole<HTMLButtonElement>("button", { name: "Continue" })
      .click();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    const afterLesson = within(
      screen.getByRole("navigation", { name: "Presenter actions" }),
    )
      .getAllByRole("button")
      .map((button) => button.textContent);
    expect(afterLesson.length).toBeGreaterThanOrEqual(5);
    expect(afterLesson.length).toBeLessThanOrEqual(6);
    expect(afterLesson).toContain("Lesson");
    expect(afterLesson).toContain("Practice");
    expect(afterLesson).not.toContain("Complete lesson");
    expect(new URL(window.location.href).searchParams.get("era")).toBe(target.eraId);
    expect(await targetBuildingCallout("LF.1")).toBe(goldState);

    within(screen.getByRole("navigation", { name: "Presenter actions" }))
      .getByRole<HTMLButtonElement>("button", { name: "Practice" })
      .click();
    expect(
      await screen.findByRole("heading", { name: "Slope as a constant rate of change" }),
    ).toBeInTheDocument();
    const practice = await waitFor(() => {
      const mounted = document.querySelector<HTMLElement>(
        '.lesson-practice[data-node-id="LF.1"]',
      );
      expect(mounted).not.toBeNull();
      return mounted as HTMLElement;
    });
    expect(practice.dataset.templateId).toMatch(/^d7\.lf1\./);
    screen.getByRole<HTMLButtonElement>("button", { name: "Complete practice" }).click();

    await waitFor(() => {
      expect(new URL(window.location.href).searchParams.get("surface")).toBe("city");
      expect(document.querySelector("[data-testid='presenter-lesson-demo']")).toBeNull();
      expect(document.querySelector(".lesson-practice__result")).toBeNull();
    });
    const reward = await screen.findByRole("alertdialog");
    expect(reward).toHaveAttribute("data-context", "Practice complete");
    expect(within(reward).getByText("Practice complete")).toBeVisible();
    expect(reward).not.toHaveTextContent("Skill building complete");
    within(reward).getByRole<HTMLButtonElement>("button", { name: "Continue" }).click();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    const afterPractice = within(
      screen.getByRole("navigation", { name: "Presenter actions" }),
    )
      .getAllByRole("button")
      .map((button) => button.textContent);
    expect(afterPractice.length).toBeGreaterThanOrEqual(5);
    expect(afterPractice.length).toBeLessThanOrEqual(6);
    expect(afterPractice).toContain("Lesson");
    expect(afterPractice).toContain("Practice");
    expect(afterPractice).not.toContain("Complete practice");
    await screen.findByRole("button", { name: "Build" });

    expect(document.querySelector(".city-surface")).toBe(city);
    expect(document.querySelector(".city-canvas canvas")).toBe(canvas);
    expect(await targetBuildingCallout("LF.1")).toMatch(
      /Welcome back.*already worked through this skill/i,
    );
    expect(new URL(window.location.href).searchParams.get("era")).toBe(target.eraId);
    screen.getByRole<HTMLButtonElement>("button", { name: "Menu" }).click();
    expect(
      within(await screen.findByTestId("presenter-era-menu")).getByRole("combobox", {
        name: "Presenter target era",
      }),
    ).toHaveValue(target.eraId);
  });
}

for (const target of [
  { eraId: "neolithic", width: 1024, explicit: false },
  { eraId: "classical", width: 1024, explicit: true },
  { eraId: "industrial", width: 390, explicit: true },
] as const satisfies readonly {
  readonly eraId: EraId;
  readonly width: number;
  readonly explicit: boolean;
}[]) {
  test(`Presenter LF.1 stays separate from the visible non-Atomic ${target.eraId} city`, {
    timeout: 60_000,
  }, async () => {
    await page.viewport(target.width, 580);
    window.history.replaceState(
      null,
      "",
      `/demo?presenter=1&preset=progress-mastered&surface=city${
        target.explicit ? `&era=${target.eraId}` : ""
      }`,
    );
    render(<App />);
    await screen.findByRole("button", { name: "Build" });
    await waitFor(
      () => expect(document.querySelector(".city-canvas canvas")).not.toBeNull(),
      { timeout: 15_000 },
    );
    const focusNode = getEraOrThrow(target.eraId).nodes[0] as string;
    const material = materialForEraOrThrow("atomic_age");
    const expectedMaterial = lessonMaterialAmountAfterFounding(PRESENTER_LESSON_NODE_ID);
    const walletValue = screen.getByTestId("economy-material-value");
    const walletBefore = Number(walletValue.textContent);
    const city = document.querySelector(".city-surface");
    const canvas = document.querySelector(".city-canvas canvas");
    const before = await targetBuildingCallout(focusNode);
    const rad3Before = target.eraId === "neolithic" ? presenterBuildingStateBytes() : null;
    if (rad3Before !== null) {
      expect(rad3Before).toContain('"node_id":"RAD.3"');
    }
    expect(before.length).toBeGreaterThan(20);

    within(screen.getByRole("navigation", { name: "Presenter actions" }))
      .getByRole<HTMLButtonElement>("button", { name: "Lesson" })
      .click();
    expect(await screen.findByText("Rise over run")).toBeInTheDocument();
    expect(document.querySelector(".presenter-lesson-demo")).not.toBeNull();
    screen.getByRole<HTMLButtonElement>("button", { name: "Complete lesson" }).click();
    await waitFor(() => expect(document.querySelector(".world-scene")).toBeNull());
    const lessonReward = await screen.findByRole("alertdialog");
    expect(lessonReward).toHaveAttribute("data-context", "Lesson complete");
    expect(
      within(lessonReward).getByRole("heading", { name: "Lesson complete!" }),
    ).toBeVisible();
    within(lessonReward)
      .getByRole<HTMLButtonElement>("button", { name: "Continue" })
      .click();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(new URL(window.location.href).searchParams.get("era")).toBe(target.eraId);
    expect(await targetBuildingCallout(focusNode)).toBe(before);
    if (rad3Before !== null) {
      expect(presenterBuildingStateBytes()).toBe(rad3Before);
    }

    within(screen.getByRole("navigation", { name: "Presenter actions" }))
      .getByRole<HTMLButtonElement>("button", { name: "Practice" })
      .click();
    const practice = await waitFor(() => {
      const mounted = document.querySelector<HTMLElement>(
        '.lesson-practice[data-node-id="LF.1"]',
      );
      expect(mounted).not.toBeNull();
      return mounted as HTMLElement;
    });
    expect(practice.dataset.templateId).toMatch(/^d7\.lf1\./);
    screen.getByRole<HTMLButtonElement>("button", { name: "Complete practice" }).click();
    await waitFor(() => expect(document.querySelector(".world-scene")).toBeNull());
    const reward = await screen.findByRole("alertdialog");
    expect(screen.getAllByRole("alertdialog")).toHaveLength(1);
    expect(reward).toHaveTextContent("Practice complete");
    expect(reward).not.toHaveTextContent("Skill building complete");
    expect(reward).toHaveTextContent(`+${expectedMaterial} ${material.display_name}`);
    expect(reward).toHaveTextContent("+1 Mastery star");
    expect(reward).toHaveTextContent("3 of 3 gold stars");
    expect(Number(walletValue.textContent)).toBe(walletBefore);
    within(reward).getByRole<HTMLButtonElement>("button", { name: "Continue" }).click();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());

    expect(document.querySelector(".city-surface")).toBe(city);
    expect(document.querySelector(".city-canvas canvas")).toBe(canvas);
    expect(await targetBuildingCallout(focusNode)).toBe(before);
    if (rad3Before !== null) {
      expect(presenterBuildingStateBytes()).toBe(rad3Before);
    }
    expect(new URL(window.location.href).searchParams.get("era")).toBe(target.eraId);
  });
}
