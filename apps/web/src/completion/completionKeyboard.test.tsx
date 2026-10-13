import type { UUID } from "@cr/state-schema";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { createInMemoryDiagnosticClient } from "../diagnostic/browserRuntime";
import { answerProbeCard, currentProbeId } from "../test/answerProbeCard";
import { CompletionCeremony } from "./CompletionCeremony";
import { COMPLETION_CEREMONY_STORAGE_KEY } from "./completionState";

/**
 * THE ENDING, BY KEYBOARD ONLY.
 *
 * The ceremony declares `role="dialog"` and `aria-modal="true"`, which is a promise
 * to assistive technology that the rest of the page is inert while it is open. Six
 * other overlays in this tree keep that promise the same way — a focus trap, Escape,
 * focus on open, focus restored on close — and `HowToPlay` is the one this follows.
 * A dialog that declares modality and then lets Tab walk out into the city behind it
 * is worse than one that never claimed it, because a screen reader has been told the
 * city is not there.
 *
 * Every assertion here failed before the fix it is attached to; the reds are recorded
 * in the work summary. They are behavioural claims, so a failing-then-passing test is
 * the evidence, and no frame is owed for them.
 */

const STUDENT = "00000000-0000-4000-8000-00000000ce03" as UUID;
const LAST_ERA = "cyberpunk" as const;

function sheet(): HTMLElement {
  return screen.getByTestId("completion-ceremony");
}

/** Everything the trap treats as a stop, in DOM order. The `HowToPlay` selector. */
function focusables(): HTMLElement[] {
  return Array.from(
    sheet().querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  );
}

/** The answer row is dispatched per shape now; see `test/answerProbeCard.ts`. */
async function answerVisible(user: UserEvent) {
  await answerProbeCard(user, CARD);
}

/**
 * The guard is the ENGINE's instrument ceiling (`DEFAULT_WALK_POLICY.maxItems`), not a
 * number picked to fit: the check runs the content-derived scope, measured at a median of 23
 * items with a worst case of 35 over 6,000 simulated walks, and a run that exceeds 70 is a
 * defect rather than a slow test.
 */
const MAX_QUESTIONS = 70;
const CARD = ".completion__item";

async function sitTheWholeCheck(user: UserEvent) {
  for (let asked = 0; asked < MAX_QUESTIONS; asked += 1) {
    const before = currentProbeId(CARD);
    await answerVisible(user);
    await waitFor(() => {
      const done = screen.queryByTestId("completion-reading");
      const now = currentProbeId(CARD);
      expect(Boolean(done) || (now !== null && now !== before)).toBe(true);
    });
    if (screen.queryByTestId("completion-reading")) {
      return;
    }
  }
  throw new Error(
    `the retake did not finish within ${MAX_QUESTIONS} questions, which is the engine's own instrument ceiling`,
  );
}

/** An anchor outside the sheet, standing in for the city's HUD behind it. */
function renderWithCityBehind(props: Partial<{ onExit: () => void }> = {}) {
  return render(
    <div>
      <button type="button" data-testid="city-behind">
        Build
      </button>
      <CompletionCeremony
        eraId={LAST_ERA}
        onExit={props.onExit ?? (() => {})}
        client={createInMemoryDiagnosticClient(STUDENT)}
      />
    </div>,
  );
}

beforeEach(() => {
  localStorage.removeItem(COMPLETION_CEREMONY_STORAGE_KEY);
});

describe("the ending is reachable and escapable without a mouse", () => {
  it("takes focus into the sheet when it opens", async () => {
    renderWithCityBehind();
    // Not merely "something is focused": focus must be INSIDE the dialog. Without
    // this a keyboard learner starts at the top of the city and tabs through the
    // whole HUD to reach an ending that is already covering it.
    await waitFor(() => {
      expect(sheet().contains(document.activeElement)).toBe(true);
    });
  });

  it("keeps Tab inside the sheet, in both directions", async () => {
    const user = userEvent.setup();
    renderWithCityBehind();
    await waitFor(() => expect(sheet().contains(document.activeElement)).toBe(true));

    const stops = focusables();
    expect(stops.length, "the invitation has no focus stops to trap").toBeGreaterThan(1);

    // Forward past the last stop wraps to the first rather than landing on the city.
    stops[stops.length - 1]?.focus();
    await user.tab();
    expect(document.activeElement).toBe(stops[0]);
    expect(screen.getByTestId("city-behind")).not.toBe(document.activeElement);

    // And backward past the first wraps to the last.
    stops[0]?.focus();
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(stops[stops.length - 1]);
  });

  it("closes on Escape, like every other overlay in the city", async () => {
    const user = userEvent.setup();
    let exits = 0;
    renderWithCityBehind({ onExit: () => (exits += 1) });
    await waitFor(() => expect(sheet().contains(document.activeElement)).toBe(true));

    await user.keyboard("{Escape}");
    expect(exits).toBe(1);
    // Escaping the INVITATION is not finishing the ending (D-END2).
    expect(localStorage.getItem(COMPLETION_CEREMONY_STORAGE_KEY)).toBeNull();
  });

  it("gives focus back to whatever opened it", async () => {
    const opener = document.createElement("button");
    opener.textContent = "Advance the age";
    document.body.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    // UNMOUNTING is the real close: `onExit` is a request, and `CitySurface` answers it
    // by dropping the ceremony. Asserting against a still-mounted sheet would prove
    // nothing, because the hand-off is on the way out.
    const view = render(
      <CompletionCeremony
        eraId={LAST_ERA}
        onExit={() => {}}
        client={createInMemoryDiagnosticClient(STUDENT)}
      />,
    );
    await waitFor(() => expect(sheet().contains(document.activeElement)).toBe(true));
    view.unmount();

    // The caller may also move focus (CitySurface sends it to the ☰ Menu button) and
    // wins when it does. What the ceremony owes is that focus is not left on <body>,
    // which is where a keyboard learner loses their place entirely.
    await waitFor(() => {
      expect(document.activeElement).toBe(opener);
    });
    opener.remove();
  });

  it("does not fight a caller that has already placed focus", async () => {
    // `CitySurface` sends focus to the ☰ Menu button when the ending closes, which is
    // a better answer than the ceremony has. The restore must defer to it, or the two
    // hand-offs race and the winner depends on unmount order.
    const opener = document.createElement("button");
    const caller = document.createElement("button");
    document.body.append(opener, caller);
    opener.focus();

    const view = render(
      <CompletionCeremony
        eraId={LAST_ERA}
        onExit={() => {}}
        client={createInMemoryDiagnosticClient(STUDENT)}
      />,
    );
    await waitFor(() => expect(sheet().contains(document.activeElement)).toBe(true));
    caller.focus();
    view.unmount();

    expect(document.activeElement).toBe(caller);
    opener.remove();
    caller.remove();
  });

  it("names its close control", async () => {
    renderWithCityBehind();
    await waitFor(() => expect(sheet().contains(document.activeElement)).toBe(true));
    // The glyph is an `svg` with no text, so without the label this button announces
    // as "button" and a screen-reader user cannot tell it from the primary action.
    expect(within(sheet()).getByRole("button", { name: /close/i })).toBeVisible();
  });

  it("is labelled by an element the SHELL owns, not by whichever beat is up", async () => {
    renderWithCityBehind();
    await waitFor(() => expect(sheet().contains(document.activeElement)).toBe(true));

    const labelledBy = sheet().getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    const label = document.getElementById(labelledBy as string);
    expect(
      label,
      `the dialog is labelled by #${labelledBy}, which is not in the document`,
    ).not.toBeNull();

    // THIS is the assertion that encodes the fix, and a live-document check alone
    // would not have caught the defect: the id resolved fine on all three beats and
    // dangled only on the two branches with no heading of their own (the session
    // check and the auth gate), which are the branches nobody opens in dev. Requiring
    // the label to live in the shell's own header is what makes it structurally
    // impossible for a headingless branch to render an anonymous dialog.
    const header = sheet().querySelector(".completion__head");
    expect(
      header?.contains(label as Node),
      "the dialog's label has moved back inside a beat, so any branch without a heading of its own is an unnamed dialog again",
    ).toBe(true);
    expect(sheet()).toHaveAccessibleName(/the city is finished/i);
  });

  it("renames itself as the ending moves, so the name is live and not a placeholder", async () => {
    const user = userEvent.setup();
    renderWithCityBehind();
    await waitFor(() => expect(sheet().contains(document.activeElement)).toBe(true));
    expect(sheet()).toHaveAccessibleName(/the city is finished/i);

    await user.click(screen.getByRole("button", { name: /sit the last check/i }));
    await waitFor(() => {
      expect(document.querySelector(".completion__item")).not.toBeNull();
    });
    expect(sheet()).toHaveAccessibleName(/the last check/i);

    await sitTheWholeCheck(user);
    expect(sheet()).toHaveAccessibleName(/still holds, cold/i);
  });
});

describe("the check, and the reading, by keyboard", () => {
  it("puts focus on the answer field as each question arrives", async () => {
    const user = userEvent.setup();
    renderWithCityBehind();
    await user.click(screen.getByRole("button", { name: /sit the last check/i }));
    await waitFor(() => {
      expect(document.querySelector(".completion__item")).not.toBeNull();
    });
    expect(document.activeElement).toBe(document.querySelector(".completion__item input"));
  });

  it("keeps the way out reachable by keyboard during the check", async () => {
    const user = userEvent.setup();
    renderWithCityBehind();
    await user.click(screen.getByRole("button", { name: /sit the last check/i }));
    await waitFor(() => {
      expect(document.querySelector(".completion__item")).not.toBeNull();
    });

    // D-END9 makes leaving ordinary, so the exit is a real focus stop inside the
    // trap and not something only a mouse can reach. It is `position: sticky`, which
    // keeps it on screen but says nothing about the tab order.
    const stepAway = within(sheet()).getByRole("button", { name: /step away for now/i });
    expect(focusables()).toContain(stepAway);
    stepAway.focus();
    expect(document.activeElement).toBe(stepAway);
    await user.keyboard("{Enter}");
    expect(screen.queryByTestId("completion-reading")).toBeNull();
  });

  it("announces which skill is being asked about, and says it once", async () => {
    const user = userEvent.setup();
    renderWithCityBehind();
    await user.click(screen.getByRole("button", { name: /sit the last check/i }));
    await waitFor(() => {
      expect(document.querySelector(".completion__item")).not.toBeNull();
    });

    // The answer field keeps focus from one question to the next, so nothing under
    // focus changes when the walk moves to a new skill. A polite live region is what
    // turns that into an announcement rather than a silent substitution.
    const counter = sheet().querySelector(".completion__counter") as HTMLElement;
    expect(counter, "the check has no counter to announce from").not.toBeNull();
    expect(counter.getAttribute("aria-live")).toBe("polite");

    // It names the skill in the learner's words. `skillDisplayName` is total over the
    // live graph since ef1f80a6, so a raw registry id here is a leak and not a gap.
    expect(counter.textContent ?? "").toMatch(/Question 1/);
    expect(counter.textContent ?? "").not.toMatch(/\b[A-Z]{2,3}\.[0-9SF]\b/);
    const skill = (counter.textContent ?? "").split("·")[1]?.trim() ?? "";
    expect(skill.length, "the counter names no skill").toBeGreaterThan(3);

    // ...and only once. Printed on the card as well, a screen reader says it twice.
    const occurrences = (sheet().textContent ?? "").split(skill).length - 1;
    expect(
      occurrences,
      `"${skill}" appears ${occurrences} times in the check; the card caption and the live counter are both printing it`,
    ).toBe(1);
  });

  it("re-announces when the walk moves to a different skill", async () => {
    const user = userEvent.setup();
    renderWithCityBehind();
    await user.click(screen.getByRole("button", { name: /sit the last check/i }));
    await waitFor(() => {
      expect(document.querySelector(".completion__item")).not.toBeNull();
    });

    // A live region that never changes announces nothing, so the claim is that the
    // text MOVES with the walk. The D1 walk probes more than one node on the way to a
    // clean pass, which is what makes this checkable rather than a single reading.
    const seen = new Set<string>();
    for (let guard = 0; guard < 40; guard += 1) {
      const counter = sheet().querySelector(".completion__counter");
      if (!counter) {
        break;
      }
      seen.add((counter.textContent ?? "").trim());
      const before = document
        .querySelector(".completion__item")
        ?.getAttribute("data-item-version-id");
      await answerVisible(user);
      await waitFor(() => {
        const now = document
          .querySelector(".completion__item")
          ?.getAttribute("data-item-version-id");
        expect(Boolean(screen.queryByTestId("completion-reading")) || now !== before).toBe(
          true,
        );
      });
      if (screen.queryByTestId("completion-reading")) {
        break;
      }
    }
    expect(
      seen.size,
      "the counter read the same thing for every question, so it announces nothing",
    ).toBeGreaterThan(1);
  });

  it("does not strand focus on the body when the reading arrives", async () => {
    const user = userEvent.setup();
    renderWithCityBehind();
    await user.click(screen.getByRole("button", { name: /sit the last check/i }));
    await waitFor(() => {
      expect(document.querySelector(".completion__item")).not.toBeNull();
    });
    await sitTheWholeCheck(user);

    // The question card unmounts under the focused field, so without a hand-off
    // focus falls to <body> and the learner's next Tab starts from the top of the
    // document, outside a dialog that claims to be modal.
    await waitFor(() => {
      expect(sheet().contains(document.activeElement)).toBe(true);
    });
    expect(document.activeElement).not.toBe(document.body);
  });

  it("finishes the ending from the keyboard", async () => {
    const user = userEvent.setup();
    let exits = 0;
    renderWithCityBehind({ onExit: () => (exits += 1) });
    await user.click(screen.getByRole("button", { name: /sit the last check/i }));
    await waitFor(() => {
      expect(document.querySelector(".completion__item")).not.toBeNull();
    });
    await sitTheWholeCheck(user);

    within(sheet())
      .getByRole("button", { name: /back to the city/i })
      .focus();
    await user.keyboard("{Enter}");
    expect(exits).toBe(1);
    expect(localStorage.getItem(COMPLETION_CEREMONY_STORAGE_KEY)).not.toBeNull();
  });
});
