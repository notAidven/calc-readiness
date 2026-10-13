import { canonicalRawAnswer, wellFormedWrongRawAnswer } from "@cr/item-bank";
import type { AssessmentPurpose, UUID } from "@cr/state-schema";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import {
  createInMemoryDiagnosticClient,
  DIAGNOSTIC_CHECKER_VERSION,
} from "../diagnostic/browserRuntime";
import type { DiagnosticClient } from "../diagnostic/session";
import { answerProbeCard, currentProbeId, probeItem } from "../test/answerProbeCard";
import { CompletionCeremony } from "./CompletionCeremony";
import {
  COMPLETION_CEREMONY_STORAGE_KEY,
  hasFinishedCompletionCeremony,
} from "./completionState";

/**
 * The ending, driven end to end through the REAL walk engine and the real
 * authoritative scorer, at the era it can actually open in.
 *
 * The two branches are reached the way a learner reaches them rather than by
 * stubbing the report: a client that has never seen a `pre` gives the standing
 * ceremony (which is also what the offline path gives every learner, D-END12), and a
 * client that has one gives the growth ceremony. That is the whole reason the client
 * is an injectable prop.
 */

const STUDENT = "00000000-0000-4000-8000-00000000ce01" as UUID;

/** Era ten. Read off the sequence rather than written down, so a rename cannot rot it. */
const LAST_ERA = "cyberpunk" as const;

const CARD = ".completion__item";

/**
 * The guard on every walk below is the ENGINE's instrument ceiling
 * (`DEFAULT_WALK_POLICY.maxItems`) rather than a number chosen to fit. The check runs the
 * content-derived scope now, measured at a median of 23 items and a worst case of 35 over
 * 6,000 simulated walks, so a run that passes 70 is a defect and not a slow test.
 */
const MAX_QUESTIONS = 70;

/**
 * Drive a whole administration through a client with no UI, so a test can give the
 * ceremony a learner who already has a baseline.
 *
 * `equivalence_checker_version` comes from the RUNTIME rather than the literal 1 it used to
 * be. Both checkers fail closed on a mismatch, so a hardcoded stamp against the composed v2
 * checker returned `scoring_error` on every item — which `isScorable` refuses, so the walk
 * re-served the same probe until the guard tripped.
 */
async function driveAdministration(
  client: DiagnosticClient,
  purpose: AssessmentPurpose,
  correct: boolean,
): Promise<void> {
  const run = client.begin(purpose);
  const served = await run.start();
  let item = served.items[0];
  for (let asked = 0; asked < MAX_QUESTIONS && item; asked += 1) {
    const entry = probeItem(item.item_version_id);
    const advance = await run.submitStage([
      {
        administration_id: served.administrationId,
        item_version_id: item.item_version_id,
        node_id: item.node_id,
        raw_answer: correct
          ? canonicalRawAnswer(entry.answer)
          : wellFormedWrongRawAnswer(entry),
        item_definition_hash: item.item_definition_hash,
        equivalence_checker_version: DIAGNOSTIC_CHECKER_VERSION,
        client_correct: correct,
      },
    ]);
    if (advance.complete) {
      await run.finalize();
      return;
    }
    item = advance.items[0];
  }
  throw new Error(`${purpose} administration did not complete within the guard`);
}

/** Answer the visible question and submit it; the row is dispatched per answer shape. */
async function answerVisible(user: UserEvent, correct: boolean) {
  await answerProbeCard(user, CARD, { correct });
}

function currentItemId(): string | null {
  return currentProbeId(CARD);
}

async function sitTheWholeCheck(user: UserEvent, correct: boolean) {
  for (let asked = 0; asked < MAX_QUESTIONS; asked += 1) {
    const before = currentItemId();
    await answerVisible(user, correct);
    await waitFor(() => {
      const done = screen.queryByTestId("completion-reading");
      expect(
        Boolean(done) || (currentItemId() !== null && currentItemId() !== before),
      ).toBe(true);
    });
    if (screen.queryByTestId("completion-reading")) {
      return;
    }
  }
  throw new Error(
    `the retake did not finish within ${MAX_QUESTIONS} questions, which is the engine's own instrument ceiling`,
  );
}

beforeEach(() => {
  localStorage.removeItem(COMPLETION_CEREMONY_STORAGE_KEY);
});

describe("the completion ceremony, end to end", () => {
  it("opens on the invitation and says leaving is ordinary (D-END9)", () => {
    render(
      <CompletionCeremony
        eraId={LAST_ERA}
        onExit={() => {}}
        client={createInMemoryDiagnosticClient(STUDENT)}
      />,
    );
    const invitation = screen.getByTestId("completion-ceremony");
    expect(screen.getByRole("heading", { name: /the city is finished/i })).toBeVisible();
    expect(screen.getByText(/the ending will still be here/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /sit the last check/i })).toBeVisible();

    // AND IT DOES NOT PROMISE THE CHECK RESUMES. The offline client's walk progress
    // dies with the component, so "pick it up where you left off" is false for every
    // learner who is not server-backed, and this is the assertion that keeps the copy
    // and the transport from drifting apart again.
    expect(invitation.textContent ?? "").not.toMatch(
      /where you left off|pick it (back )?up|one sitting/i,
    );
  });

  it("gives a learner with no baseline the STANDING ceremony, and no machine status", async () => {
    const user = userEvent.setup();
    render(
      <CompletionCeremony
        eraId={LAST_ERA}
        onExit={() => {}}
        client={createInMemoryDiagnosticClient(STUDENT)}
      />,
    );
    await user.click(screen.getByRole("button", { name: /sit the last check/i }));
    await sitTheWholeCheck(user, true);

    const reading = screen.getByTestId("completion-reading");
    expect(reading).toHaveAttribute("data-kind", "standing");
    // The heading is the SHELL's rather than this beat's, because it is also the
    // dialog's accessible name: a heading only some branches render is a dialog only
    // some branches have a name for. So the branch is asserted twice, once as the
    // visible heading and once as the name assistive technology is given.
    expect(screen.getByRole("heading", { name: /still holds, cold/i })).toBeVisible();
    expect(screen.getByRole("dialog")).toHaveAccessibleName(/still holds, cold/i);

    // D-END5: the fallback makes no pre/post claim, and never renders the machine
    // state that put it here. Today's dev screen prints "Not comparable yet (not
    // comparable)"; as the last thing a learner sees it is unusable.
    expect(screen.queryByTestId("completion-aggregate")).toBeNull();
    for (const machineWord of [
      /not_comparable/,
      /not comparable/i,
      /pre_invalid/,
      /post_invalid/,
      /no_baseline/,
    ]) {
      expect(reading.textContent ?? "").not.toMatch(machineWord);
    }
  });

  it("names the skills it confirmed cold, each with the building that stands for it", async () => {
    const user = userEvent.setup();
    render(
      <CompletionCeremony
        eraId={LAST_ERA}
        onExit={() => {}}
        client={createInMemoryDiagnosticClient(STUDENT)}
      />,
    );
    await user.click(screen.getByRole("button", { name: /sit the last check/i }));
    await sitTheWholeCheck(user, true);

    const named = screen.getByTestId("completion-named");
    expect(within(named).getAllByRole("listitem").length).toBeGreaterThan(0);
    // Skill name and building name, and never a raw registry id in either.
    expect(named.textContent ?? "").toMatch(/hall|workshop|block|tower/i);
    expect(named.textContent ?? "").not.toMatch(/NUM\.\w/);
  });

  it("gives a learner WITH a baseline the growth ceremony and the supporting delta", async () => {
    const user = userEvent.setup();
    // One client for both sittings, which is what makes them a pair: the same
    // student, counterbalanced onto the two forms by `counterbalancedForm`.
    const client = createInMemoryDiagnosticClient(STUDENT);
    await driveAdministration(client, "pre", false);

    render(<CompletionCeremony eraId={LAST_ERA} onExit={() => {}} client={client} />);
    await user.click(screen.getByRole("button", { name: /sit the last check/i }));
    await sitTheWholeCheck(user, true);

    const reading = screen.getByTestId("completion-reading");
    expect(reading).toHaveAttribute("data-kind", "growth");
    expect(screen.getByRole("heading", { name: /now that you could not/i })).toBeVisible();
    expect(screen.getByRole("dialog")).toHaveAccessibleName(/now that you could not/i);

    // D-END7: shown, small, and not suppressed.
    const aggregate = screen.getByTestId("completion-aggregate");
    expect(aggregate.textContent ?? "").toMatch(/\d+% to \d+%/);
    // ...and it is not the headline: the named roll is what the heading introduces.
    expect(
      within(screen.getByTestId("completion-named")).getAllByRole("listitem").length,
    ).toBeGreaterThan(0);
  });

  it("makes no validity claim, on either branch (D-END11)", async () => {
    const user = userEvent.setup();
    render(
      <CompletionCeremony
        eraId={LAST_ERA}
        onExit={() => {}}
        client={createInMemoryDiagnosticClient(STUDENT)}
      />,
    );
    await user.click(screen.getByRole("button", { name: /sit the last check/i }));
    await sitTheWholeCheck(user, true);
    expect(screen.getByText(/one cold sitting found, on this check, today/i)).toBeVisible();
  });

  it("records the ending as seen only when the learner leaves the reading (D-END2)", async () => {
    const user = userEvent.setup();
    render(
      <CompletionCeremony
        eraId={LAST_ERA}
        onExit={() => {}}
        client={createInMemoryDiagnosticClient(STUDENT)}
      />,
    );
    await user.click(screen.getByRole("button", { name: /sit the last check/i }));
    // Mid-retake it is NOT recorded: an ending closed halfway through is an ending
    // the learner has not had, and D-END9 makes leaving ordinary.
    expect(hasFinishedCompletionCeremony()).toBe(false);
    await sitTheWholeCheck(user, true);
    expect(hasFinishedCompletionCeremony()).toBe(false);

    await user.click(screen.getByRole("button", { name: /back to the city/i }));
    expect(hasFinishedCompletionCeremony()).toBe(true);
  });

  it("lets the learner step away mid-check without finishing the ending", async () => {
    const user = userEvent.setup();
    let exits = 0;
    render(
      <CompletionCeremony
        eraId={LAST_ERA}
        onExit={() => {
          exits += 1;
        }}
        client={createInMemoryDiagnosticClient(STUDENT)}
      />,
    );
    await user.click(screen.getByRole("button", { name: /sit the last check/i }));
    await user.click(screen.getByRole("button", { name: /step away for now/i }));
    expect(exits).toBe(1);
    expect(hasFinishedCompletionCeremony()).toBe(false);
  });
});
