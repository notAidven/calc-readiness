import { canonicalRawAnswer, wellFormedWrongRawAnswer } from "@cr/item-bank";
import { ERA_SEQUENCE } from "@cr/skill-graph";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { practiceItemsById } from "../lessons/practiceChecker";
import type { BrowserStorage } from "../storage/runtimeStorage";
import { IslandUnlockExam } from "./IslandUnlockExam";
import type { IslandFoundingAuthority } from "./islandUnlockAuthority";
import {
  type IslandUnlockExamRecord,
  loadIslandUnlockExam,
  saveIslandUnlockExam,
} from "./islandUnlockExamPersistence";

class MemoryStorage implements BrowserStorage {
  private readonly values = new Map<string, string>();
  get length(): number {
    return this.values.size;
  }
  clear(): void {
    this.values.clear();
  }
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const CURRENT = ERA_SEQUENCE[0] as (typeof ERA_SEQUENCE)[number];
const DESTINATION = ERA_SEQUENCE[1] as (typeof ERA_SEQUENCE)[number];
const TARGET = CURRENT.nodes.length * 2;

function saved(
  storage: BrowserStorage,
  phase: IslandUnlockExamRecord["phase"],
  score = phase === "exam" ? 0 : TARGET,
): void {
  saveIslandUnlockExam(
    {
      version: 2,
      eraId: CURRENT.id,
      destinationEraId: DESTINATION.id,
      phase,
      score,
      target: TARGET,
      currentItemVersionId: null,
      scheduler: null,
      resolvedOutcome: null,
      sessionId: "ui-test-session",
      responseCount: 0,
      pendingResponse: null,
    },
    storage,
  );
}

function callbacks() {
  return {
    unlock: vi.fn(
      async (_destination: string, _authority: IslandFoundingAuthority) => undefined,
    ),
    sail: vi.fn(async () => undefined),
    keep: vi.fn(),
    exit: vi.fn(),
  };
}

function answerVisible(correct: boolean): void {
  const exam = screen.getByTestId("island-unlock-exam");
  const itemId = exam.getAttribute("data-item-version-id") ?? "";
  const item = practiceItemsById.get(itemId);
  if (!item) {
    throw new Error(`The visible exam item "${itemId}" is not registered.`);
  }
  const answer = correct ? canonicalRawAnswer(item.answer) : wellFormedWrongRawAnswer(item);
  if (typeof answer !== "string") {
    throw new Error(
      `The deterministic island-exam item "${itemId}" is not text-answerable.`,
    );
  }
  fireEvent.change(within(exam).getByRole("textbox"), { target: { value: answer } });
  fireEvent.click(within(exam).getByRole("button", { name: "Check" }));
}

describe("live island unlock exam", () => {
  it("keeps the destination, net-point contract, and voyage progress explicit", () => {
    const storage = new MemoryStorage();
    const cb = callbacks();
    render(
      <IslandUnlockExam
        eraId={CURRENT.id}
        storage={storage}
        rng={() => 0}
        enableCanvas={false}
        onUnlockIsland={cb.unlock}
        onSail={cb.sail}
        onKeepLearning={cb.keep}
        onExit={cb.exit}
      />,
    );

    expect(screen.getByTestId("island-unlock-goal")).toHaveTextContent(
      `Reach ${TARGET} net points to unlock ${DESTINATION.name}`,
    );
    expect(screen.getByTestId("island-unlock-rules")).toHaveTextContent(
      "Correct +1 · Wrong or Skip −1",
    );
    const route = screen.getByTestId("island-unlock-progress");
    expect(route).toHaveAccessibleName(
      `0 of ${TARGET} net points toward ${DESTINATION.name}`,
    );
    expect(route.querySelectorAll(".island-unlock-route__port")).toHaveLength(TARGET);
    expect(screen.getByRole("button", { name: "Skip (−1)" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Back to island · progress saved" }),
    ).toBeInTheDocument();
    const answer = screen.getByRole("textbox", { name: "Answer" });
    expect(answer).toHaveAttribute(
      "aria-describedby",
      expect.stringContaining("island-unlock-prompt"),
    );
  });

  it("asks an empty fraction field for the missing answer instead of rejecting its format", () => {
    const storage = new MemoryStorage();
    const cb = callbacks();
    render(
      <IslandUnlockExam
        eraId={CURRENT.id}
        storage={storage}
        rng={() => 0}
        enableCanvas={false}
        onUnlockIsland={cb.unlock}
        onSail={cb.sail}
        onKeepLearning={cb.keep}
        onExit={cb.exit}
      />,
    );
    const itemId =
      screen.getByTestId("island-unlock-exam").getAttribute("data-item-version-id") ?? "";
    const item = practiceItemsById.get(itemId);
    expect(
      item?.answer.answer_spec.simplification === "reduced_fraction" ||
        item?.answer.answer_spec.representation === "fraction",
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Check" }));

    expect(screen.getByText(/Enter a fraction before checking/i)).toBeInTheDocument();
    expect(screen.queryByTestId("island-unlock-answer-summary")).toBeNull();
    expect(loadIslandUnlockExam(CURRENT.id, storage)?.score).toBe(0);
  });

  it("contains keyboard focus, isolates the city, handles Escape, and restores the opener", async () => {
    const opener = document.createElement("button");
    opener.textContent = "Open unlock exam";
    document.body.append(opener);
    opener.focus();
    const storage = new MemoryStorage();
    const cb = callbacks();
    const view = render(
      <IslandUnlockExam
        eraId={CURRENT.id}
        storage={storage}
        rng={() => 0}
        reducedMotion
        enableCanvas={false}
        onUnlockIsland={cb.unlock}
        onSail={cb.sail}
        onKeepLearning={cb.keep}
        onExit={cb.exit}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Island unlock exam" });
    const first = await screen.findByRole("textbox");
    await waitFor(() => expect(first).toHaveFocus());
    expect(opener.inert).toBe(true);

    const stops = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ),
    );
    const last = stops.at(-1) as HTMLElement;
    last.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();

    first.focus();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(cb.exit).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(opener.inert).not.toBe(true);
    expect(opener).not.toHaveAttribute("inert");
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it("shows −1 on a wrong answer at zero, floors the meter, and retains worked-solution reveal", () => {
    const storage = new MemoryStorage();
    const cb = callbacks();
    render(
      <IslandUnlockExam
        eraId={CURRENT.id}
        storage={storage}
        rng={() => 0}
        enableCanvas={false}
        onUnlockIsland={cb.unlock}
        onSail={cb.sail}
        onKeepLearning={cb.keep}
        onExit={cb.exit}
      />,
    );

    answerVisible(false);

    expect(screen.getByTestId("island-unlock-delta")).toHaveTextContent("−1");
    expect(screen.getByTestId("island-unlock-score")).toHaveTextContent("0");
    const summary = screen.getByTestId("island-unlock-answer-summary");
    expect(summary).toHaveTextContent(`Incorrect · −1 · 0/${TARGET}`);
    expect(summary).toHaveFocus();
    expect(document.querySelector(".worked-solution")).not.toBeNull();
    expect(loadIslandUnlockExam(CURRENT.id, storage)?.score).toBe(0);
    expect(loadIslandUnlockExam(CURRENT.id, storage)).toMatchObject({
      responseCount: 1,
      pendingResponse: null,
    });
  });

  it("resumes a resolved in-progress question without letting refresh score it twice", () => {
    const storage = new MemoryStorage();
    const cb = callbacks();
    const props = {
      eraId: CURRENT.id,
      storage,
      rng: () => 0,
      enableCanvas: false,
      onUnlockIsland: cb.unlock,
      onSail: cb.sail,
      onKeepLearning: cb.keep,
      onExit: cb.exit,
    };
    const view = render(<IslandUnlockExam {...props} />);
    answerVisible(false);
    const itemId = screen
      .getByTestId("island-unlock-exam")
      .getAttribute("data-item-version-id");
    view.unmount();
    render(<IslandUnlockExam {...props} />);

    expect(screen.getByTestId("island-unlock-exam")).toHaveAttribute(
      "data-item-version-id",
      itemId,
    );
    expect(screen.queryByRole("button", { name: "Check" })).toBeNull();
    expect(document.querySelector(".worked-solution")).not.toBeNull();
    expect(loadIslandUnlockExam(CURRENT.id, storage)?.score).toBe(0);
  });

  it("replays one bounded pending account response after refresh without sending history", async () => {
    const storage = new MemoryStorage();
    saved(storage, "exam", 0);
    const cb = callbacks();
    const record = vi
      .fn()
      .mockRejectedValueOnce(new Error("response lost"))
      .mockResolvedValue({
        score: 0,
        target: TARGET,
        delta: -1,
        passed: false,
        responseCount: 1,
      });
    const props = {
      eraId: CURRENT.id,
      storage,
      rng: () => 0,
      enableCanvas: false,
      onUnlockIsland: cb.unlock,
      onRecordResponse: record,
      onSail: cb.sail,
      onKeepLearning: cb.keep,
      onExit: cb.exit,
    };
    const view = render(<IslandUnlockExam {...props} />);
    answerVisible(false);
    expect(
      await screen.findByRole("button", { name: "Retry response" }),
    ).toBeInTheDocument();
    const pending = loadIslandUnlockExam(CURRENT.id, storage)?.pendingResponse;
    expect(pending).toMatchObject({ responseId: "ui-test-session-0", sequence: 0 });
    expect(record).toHaveBeenCalledTimes(1);

    view.unmount();
    render(<IslandUnlockExam {...props} />);
    await waitFor(() => expect(record).toHaveBeenCalledTimes(2));
    expect(record.mock.calls[1]).toEqual(record.mock.calls[0]);
    expect(loadIslandUnlockExam(CURRENT.id, storage)).toMatchObject({
      responseCount: 1,
      pendingResponse: null,
    });
    expect(document.querySelector(".worked-solution")).not.toBeNull();
  });

  it("reaches 2N and immediately enters the one-shot founding reveal without sailing", async () => {
    const storage = new MemoryStorage();
    saved(storage, "exam", TARGET - 1);
    const cb = callbacks();
    render(
      <IslandUnlockExam
        eraId={CURRENT.id}
        storage={storage}
        rng={() => 0}
        enableCanvas={false}
        onUnlockIsland={cb.unlock}
        onSail={cb.sail}
        onKeepLearning={cb.keep}
        onExit={cb.exit}
      />,
    );

    answerVisible(true);

    const founding = await screen.findByTestId("island-unlock-founding");
    await waitFor(() => expect(founding).toHaveAttribute("data-status", "success"));
    expect(founding).toHaveAttribute("data-phase", "reveal");
    expect(screen.getByTestId("destination-town-hall")).toHaveTextContent(
      "Town Hall founded",
    );
    expect(screen.getByTestId("destination-town-hall-visual")).toHaveAccessibleName(
      /Town Hall, founded/,
    );
    await waitFor(() => expect(cb.unlock).toHaveBeenCalledTimes(1));
    expect(cb.unlock).toHaveBeenCalledWith(
      DESTINATION.id,
      expect.objectContaining({
        source: "exam",
        sessionId: "ui-test-session",
      }),
    );
    expect(cb.sail).not.toHaveBeenCalled();
    expect(loadIslandUnlockExam(CURRENT.id, storage)?.phase).toBe("reveal");
  });

  it("offers exactly Sail or Stay after durable founding, without an intermediate screen", async () => {
    const storage = new MemoryStorage();
    saved(storage, "reveal");
    const cb = callbacks();
    render(
      <IslandUnlockExam
        eraId={CURRENT.id}
        storage={storage}
        enableCanvas={false}
        onUnlockIsland={cb.unlock}
        onSail={cb.sail}
        onKeepLearning={cb.keep}
        onExit={cb.exit}
      />,
    );
    await waitFor(() => expect(cb.unlock).toHaveBeenCalledTimes(1));

    const choice = screen.getByTestId("island-unlock-choice");
    expect(within(choice).getAllByRole("button")).toHaveLength(2);
    expect(
      within(choice).getByRole("button", { name: `Sail to ${DESTINATION.name}` }),
    ).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Island founding" }), {
      key: "Escape",
    });
    expect(cb.exit).not.toHaveBeenCalled();
    fireEvent.click(
      within(choice).getByRole("button", { name: `Stay on ${CURRENT.name}` }),
    );

    expect(cb.keep).toHaveBeenCalledTimes(1);
    expect(cb.sail).not.toHaveBeenCalled();
    expect(loadIslandUnlockExam(CURRENT.id, storage)?.phase).toBe("complete");
  });

  it("Sail explicitly advances through the host callback", async () => {
    const storage = new MemoryStorage();
    saved(storage, "choice");
    const cb = callbacks();
    render(
      <IslandUnlockExam
        eraId={CURRENT.id}
        storage={storage}
        enableCanvas={false}
        onUnlockIsland={cb.unlock}
        onSail={cb.sail}
        onKeepLearning={cb.keep}
        onExit={cb.exit}
      />,
    );
    await waitFor(() => expect(cb.unlock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: `Sail to ${DESTINATION.name}` }));
    expect(cb.sail).toHaveBeenCalledTimes(1);
    expect(cb.sail).toHaveBeenCalledWith(DESTINATION.id);
    expect(cb.keep).not.toHaveBeenCalled();
  });

  it("keeps the choice open after offline Sail and coalesces repeated clicks", async () => {
    const storage = new MemoryStorage();
    saved(storage, "choice");
    const cb = callbacks();
    const sail = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline save"))
      .mockResolvedValue(undefined);
    render(
      <IslandUnlockExam
        eraId={CURRENT.id}
        storage={storage}
        enableCanvas={false}
        onUnlockIsland={cb.unlock}
        onSail={sail}
        onKeepLearning={cb.keep}
        onExit={cb.exit}
      />,
    );
    await waitFor(() => expect(cb.unlock).toHaveBeenCalledTimes(1));
    const button = screen.getByRole("button", { name: `Sail to ${DESTINATION.name}` });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(await screen.findByRole("alert")).toHaveTextContent("offline save");
    expect(sail).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("island-unlock-choice")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Stay on ${CURRENT.name}` })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: `Sail to ${DESTINATION.name}` }));
    await waitFor(() => expect(sail).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("re-enters founding after rejection and coalesces repeated retry clicks", async () => {
    const storage = new MemoryStorage();
    saved(storage, "reveal");
    const unlock = vi
      .fn<(destination: string, authority: IslandFoundingAuthority) => Promise<void>>()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValue(undefined);
    const cb = callbacks();
    render(
      <IslandUnlockExam
        eraId={CURRENT.id}
        storage={storage}
        enableCanvas={false}
        onUnlockIsland={unlock}
        onSail={cb.sail}
        onKeepLearning={cb.keep}
        onExit={cb.exit}
      />,
    );

    const retry = await screen.findByRole("button", { name: "Retry founding" });
    const founding = screen.getByTestId("island-unlock-founding");
    expect(
      within(founding).getByRole("heading", { name: "Founding paused" }),
    ).toBeInTheDocument();
    expect(within(founding).queryByText(/founded/i)).toBeNull();
    expect(unlock).toHaveBeenCalledTimes(1);
    fireEvent.click(retry);
    fireEvent.click(retry);

    await waitFor(() => expect(unlock).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole("button", { name: `Sail to ${DESTINATION.name}` }),
    ).toBeInTheDocument();
    expect(unlock).toHaveBeenCalledTimes(2);
  });

  it.each(["reveal", "choice"] as const)(
    "resumes the %s phase after refresh without replaying the exam",
    async (phase) => {
      const storage = new MemoryStorage();
      saved(storage, phase);
      const cb = callbacks();
      render(
        <IslandUnlockExam
          eraId={CURRENT.id}
          storage={storage}
          enableCanvas={false}
          onUnlockIsland={cb.unlock}
          onSail={cb.sail}
          onKeepLearning={cb.keep}
          onExit={cb.exit}
        />,
      );

      expect(await screen.findByTestId("island-unlock-founding")).toHaveAttribute(
        "data-phase",
        phase,
      );
      expect(screen.queryByTestId("island-unlock-exam")).toBeNull();
    },
  );

  it("refuses the whole exam and names coverage when one island skill has no items", () => {
    const storage = new MemoryStorage();
    const missing = CURRENT.nodes[0] as string;
    const source = [...practiceItemsById.values()].filter(
      (item) => item.node_id !== missing,
    );
    const cb = callbacks();
    render(
      <IslandUnlockExam
        eraId={CURRENT.id}
        storage={storage}
        poolSource={source}
        enableCanvas={false}
        onUnlockIsland={cb.unlock}
        onSail={cb.sail}
        onKeepLearning={cb.keep}
        onExit={cb.exit}
      />,
    );

    expect(screen.getByTestId("island-unlock-pool-refusal")).toHaveTextContent(missing);
    expect(cb.unlock).not.toHaveBeenCalled();
  });
});
