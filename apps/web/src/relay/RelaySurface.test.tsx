import { createRelay, type RelayState, relayReducer } from "@cr/game";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { type Harness, mount, setInputValue, waitFor } from "../lessons/testHarness";
import { RelaySurface } from "./RelaySurface";

let harness: Harness | null = null;

afterEach(() => {
  harness?.cleanup();
  harness = null;
});

function query<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`nothing matched ${selector}`);
  }
  return found;
}

const text = (selector: string): string =>
  (query(selector).textContent ?? "").replace(/\s+/g, " ").trim();

function resolved(
  state: RelayState,
  action: "cut" | "restore",
  correct: number,
): RelayState {
  const armed = relayReducer(state, { type: "arm", action });
  const answering = relayReducer(armed, { type: "start_questions" });
  return relayReducer(answering, { type: "resolve_round", correct, asked: 3 });
}

async function render(surface: ReactElement): Promise<void> {
  harness = mount(surface);
  await waitFor(
    () => document.querySelector('[data-testid="relay-surface"]') !== null,
    "the relay surface renders",
  );
}

async function inspectTrace(): Promise<void> {
  query<HTMLButtonElement>('[data-testid="relay-inspect"]').click();
  await waitFor(
    () => document.querySelector('[data-action="cut"]') !== null,
    "the intervention choices appear",
  );
}

describe("the production Cut-or-Restore surface", () => {
  it("shows one inspection action before the two authoritative interventions", async () => {
    await render(<RelaySurface />);

    expect(document.querySelectorAll('[data-testid="relay-band"]').length).toBe(9);
    expect(text('[data-testid="relay-meter"]')).toContain("4 of 9");
    expect(text('[data-testid="relay-meter"]')).toContain("5 trusted");
    expect(document.querySelectorAll('[data-testid="relay-action"]').length).toBe(0);

    await inspectTrace();
    expect(document.querySelectorAll('[data-testid="relay-action"]').length).toBe(2);
  });

  it("states the approved rule: Trace uses current covers, then reopens them", async () => {
    await render(<RelaySurface />);
    await inspectTrace();

    expect(document.body.textContent).toContain(
      "It restores bands, then reopens every cover.",
    );
  });

  it("keeps a spent clean copy present, disabled, and explained", async () => {
    const spent = resolved(createRelay(), "restore", 2);
    await render(<RelaySurface initialState={spent} />);
    await inspectTrace();

    const restore = query<HTMLButtonElement>('[data-action="restore"]');
    expect(restore.disabled).toBe(true);
    expect(restore.getAttribute("aria-describedby")).toBeTruthy();
    expect(document.body.textContent).toContain(
      "You restored from it in round 1. There was one.",
    );
  });

  it("arming and cancelling move no band and return focus to the armed action", async () => {
    await render(<RelaySurface />);
    await inspectTrace();
    const before = text('[data-testid="relay-meter"]');
    const cut = query<HTMLButtonElement>('[data-action="cut"]');
    cut.focus();
    cut.click();

    await waitFor(
      () => document.querySelector('[data-testid="relay-armed"]') !== null,
      "the Cut preview appears",
    );
    expect(text('[data-testid="relay-meter"]')).toBe(before);

    query<HTMLButtonElement>('[data-testid="relay-cancel"]').click();
    await waitFor(
      () => document.querySelector('[data-testid="relay-armed"]') === null,
      "the preview closes",
    );
    expect(text('[data-testid="relay-meter"]')).toBe(before);
    expect(document.activeElement).toBe(query<HTMLButtonElement>('[data-action="cut"]'));
  });

  it("resumes an unresolved batch at its committed intervention without moving the city", async () => {
    const armed = relayReducer(createRelay(), { type: "arm", action: "cut" });
    const interrupted = relayReducer(armed, { type: "start_questions" });

    await render(<RelaySurface initialState={interrupted} />);

    expect(document.querySelector('[data-testid="relay-armed"]')).not.toBeNull();
    expect(text('[data-testid="relay-meter"]')).toContain("4 of 9");
    expect(document.body.textContent).toContain("Isolate");
    expect(document.querySelector('[data-testid="relay-question"]')).toBeNull();
  });

  it("shows the two useful score anchors before committing either action", async () => {
    await render(<RelaySurface />);
    await inspectTrace();
    query<HTMLButtonElement>('[data-action="restore"]').click();
    await waitFor(
      () => document.querySelector('[data-testid="relay-armed"]') !== null,
      "the Restore preview appears",
    );

    const preview = text('[data-testid="relay-armed"]');
    expect(preview).toContain("All three hold");
    expect(preview).toContain("No holds");
    expect(preview).toContain("covers reopen");
  });

  it("has one assertive cap region and keeps the round result box mounted", async () => {
    const capped = resolved(resolved(createRelay(), "cut", 0), "cut", 0);
    await render(<RelaySurface initialState={capped} />);

    expect(document.querySelectorAll('[aria-live="assertive"]').length).toBe(1);
    expect(text('[aria-live="assertive"]')).toContain(
      "The record is dark. 1 round remains",
    );
    expect(document.querySelector('[data-testid="relay-result"]')).not.toBeNull();
  });

  it("focuses the result sentence after a resolved round", async () => {
    const state = resolved(createRelay(), "cut", 2);
    await render(<RelaySurface initialState={state} focusResultOnMount />);
    await waitFor(
      () => document.activeElement === query('[data-testid="relay-result"]'),
      "focus reaches the round result",
    );
  });

  it("keeps unreadable input inert: same question, live field, no band or verdict", async () => {
    await render(
      <RelaySurface
        gradeAnswer={() => ({
          correct: null,
          unreadable:
            "That is not something the checker can read. Nothing has been marked and nothing has moved.",
        })}
      />,
    );
    await inspectTrace();
    query<HTMLButtonElement>('[data-action="cut"]').click();
    await waitFor(
      () => document.querySelector('[data-testid="relay-armed"]') !== null,
      "the Cut preview appears",
    );
    query<HTMLButtonElement>(".relay-commit .primary-action").click();
    await waitFor(
      () => document.querySelector('[data-testid="relay-question"]') !== null,
      "the first question appears",
    );
    const input = query<HTMLInputElement>(".relay-question input");
    setInputValue(input, "???");
    await waitFor(
      () => !query<HTMLButtonElement>('[data-testid="relay-check-answer"]').disabled,
      "the Check control accepts the typed text",
    );
    query<HTMLButtonElement>('[data-testid="relay-check-answer"]').click();
    await waitFor(
      () => document.body.textContent?.includes("Nothing has been marked") ?? false,
      "the unreadable note appears",
    );
    expect(text('[data-testid="relay-question"]')).toContain("Question 1 of 3");
    expect(input.disabled).toBe(false);
    expect(text('[data-testid="relay-meter"]')).toContain("4 of 9");
    expect(document.querySelector(".relay-verdict")).toBeNull();
  });

  it("publishes every checked answer as world feedback before the round resolves", async () => {
    const feedback: Array<{ answered: number; verdicts: readonly boolean[] }> = [];
    await render(
      <RelaySurface
        cityTargetIds={["relay", "library", "hall", "market"]}
        gradeAnswer={() => ({ correct: true, unreadable: null })}
        onFeedbackChange={(next) => feedback.push(next)}
      />,
    );
    await inspectTrace();
    query<HTMLButtonElement>('[data-action="cut"]').click();
    await waitFor(
      () => document.querySelector('[data-testid="relay-armed"]') !== null,
      "the cover preview appears",
    );
    query<HTMLButtonElement>('[data-testid="relay-commit"]').click();
    await waitFor(
      () => document.querySelector('[data-testid="relay-question"]') !== null,
      "the question appears",
    );
    setInputValue(query<HTMLInputElement>(".relay-question input"), "1");
    query<HTMLButtonElement>('[data-testid="relay-check-answer"]').click();
    await waitFor(
      () => feedback.some((entry) => entry.answered === 1),
      "the first checked answer reaches the city",
    );
    expect(feedback.at(-1)).toEqual({ answered: 1, verdicts: [true] });
    expect(text('[data-testid="relay-city-evidence"]')).toContain("1 held");
  });
});
