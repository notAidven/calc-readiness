import {
  canonicalRawAnswer,
  DIAGNOSTIC_WALK_ITEM_PACK,
  DIAGNOSTIC_WALK_SCOPE,
} from "@cr/item-bank";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SessionProvider } from "../auth/SessionContext";
import { DiagnosticRunner } from "./DiagnosticRunner";

/**
 * The v2 default instrument is the walk, served from the CONTENT-DERIVED pool: every
 * in-product node with a practice pool and >= 3 servable walk items per form
 * (`@cr/item-bank`'s `DIAGNOSTIC_WALK_SCOPE`). That is twenty nodes across nine domains, not
 * the six D1 nodes this file used to drive, and every expectation below is derived from the
 * scope rather than pinned at 6 — so authoring items for another node widens the diagnostic
 * and this test follows it instead of failing.
 */
const ITEM_BY_ID = new Map(
  DIAGNOSTIC_WALK_ITEM_PACK.map((entry) => [entry.item_version_id, entry] as const),
);

const RESULTS = /here's what we found/i;

/** The "I don't know" control's face, matched the way a learner reads it. */
const NOT_LEARNED = /haven't learned this yet/i;

/**
 * The "I don't know" control, found by its face.
 *
 * Not `getByRole`, and not for style: testing-library pretty-prints every role on the page
 * when a role query misses, and jsdom throws out of `getComputedStyle` on this screen's
 * KaTeX output while it does. A miss then reports `Array.prototype.forEach called on null`
 * instead of "the control is not there", which is the one message this test exists to give.
 */
function notLearnedControl(): HTMLButtonElement {
  const match = Array.from(document.querySelectorAll("button")).find((button) =>
    NOT_LEARNED.test(button.textContent ?? ""),
  );
  if (!match) {
    throw new Error('no "I haven\'t learned this yet" control is on the question screen');
  }
  return match;
}

/**
 * The item guard. A walk is bounded by `DEFAULT_WALK_POLICY.maxItems` (70) and measured at a
 * median of 23 over this scope, with a worst case of 35 in 6,000 simulated walks — so 70 is
 * the engine's own bound rather than a number picked here, and a run that exceeds it is a
 * defect and not a slow test.
 */
const MAX_QUESTIONS = 70;

/** The single served question's item-version id (null once results render). */
function currentItemId(): string | null {
  return (
    document.querySelector(".diagnostic-item")?.getAttribute("data-item-version-id") ?? null
  );
}

/**
 * Answer the one visible question correctly, then submit.
 *
 * The answer row is dispatched per shape now, so this fills EVERY text field on the card
 * rather than the one it used to assume: `rational_answer` (RAT.1) renders two — the
 * simplified expression and the values the original denominator forbids — and a single-field
 * helper would submit a payload the comparator rejects as `invalid_rational_answer`, which
 * is not scorable, so the walk would re-serve the same question until the guard tripped.
 * (`mathAnswerColumn.browser.test.tsx` drives that same field order in a real browser.)
 */
async function answerCurrentQuestion(user: UserEvent): Promise<void> {
  const card = document.querySelector<HTMLElement>(".diagnostic-item");
  if (!card) {
    throw new Error("expected a question card to be visible");
  }
  const id = card.getAttribute("data-item-version-id") ?? "";
  const entry = ITEM_BY_ID.get(id);
  if (!entry) {
    throw new Error(`served an item the pack does not carry: ${id}`);
  }
  const answer = canonicalRawAnswer(entry.answer);
  const fields = within(card).getAllByRole("textbox");
  if (typeof answer === "string") {
    expect(fields).toHaveLength(1);
    fireEvent.change(fields[0] as HTMLElement, { target: { value: answer } });
  } else {
    // The rational payload: expression first, exclusions second, in the order the two
    // labelled fields appear.
    const payload = answer as { expression: string; excluded_values: unknown };
    expect(fields.length).toBeGreaterThanOrEqual(2);
    fireEvent.change(fields[0] as HTMLElement, {
      target: { value: payload.expression },
    });
    const exclusions = Array.isArray(payload.excluded_values)
      ? payload.excluded_values.join(", ")
      : String(payload.excluded_values ?? "");
    fireEvent.change(fields[1] as HTMLElement, { target: { value: exclusions } });
  }
  await user.click(within(card).getByRole("button", { name: /submit answer/i }));
}

/** Open every subject area's disclosure, which is where the per-skill rows live. */
async function openEveryArea(user: UserEvent): Promise<void> {
  for (const toggle of document.querySelectorAll<HTMLButtonElement>(".dgx-area__toggle")) {
    await user.click(toggle);
  }
}

/** Answer to completion, and report how many questions it took. */
async function completeAdministration(user: UserEvent): Promise<number> {
  // The walk serves one probe per screen, so an administration is many short questions (a
  // node takes 2-3 probes).
  for (let asked = 1; asked <= MAX_QUESTIONS; asked += 1) {
    const before = currentItemId();
    await answerCurrentQuestion(user);
    await waitFor(() => {
      const done = screen.queryByText(RESULTS);
      const now = currentItemId();
      expect(Boolean(done) || (now !== null && now !== before)).toBe(true);
    });
    if (screen.queryByText(RESULTS)) {
      return asked;
    }
  }
  throw new Error(
    `administration did not complete within ${MAX_QUESTIONS} questions, which is the engine's own instrument ceiling`,
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("DiagnosticRunner (dev mode, in-browser walk runtime)", () => {
  it("runs a full diagnostic to per-skill placements, then a retake with a gain", async () => {
    const user = userEvent.setup();
    const onPretestComplete = vi.fn();
    render(
      <SessionProvider>
        <DiagnosticRunner onPretestComplete={onPretestComplete} />
      </SessionProvider>,
    );

    // Dev identity: no auth gate, straight to the overview.
    expect(screen.getByText(/Dev identity/i)).toBeInTheDocument();
    expect(screen.getByText(/one question at a time/i)).toBeInTheDocument();
    // The overview names the widened scope, from the same derivation the engine walks.
    expect(
      screen.getAllByText(new RegExp(`${DIAGNOSTIC_WALK_SCOPE.length} skills`, "i")).length,
    ).toBeGreaterThanOrEqual(1);
    // And it does NOT name them one by one. The roster used to be here and was reported as
    // intimidating; `diagnosticIntroPromise.test.ts` owns what replaced it, and this line
    // is what fails if a list comes back on the surface this suite drives end to end.
    expect(document.querySelectorAll(".dgx-node")).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: /start the diagnostic/i }));

    // A real served question renders with the single "Submit answer" action.
    expect(
      await screen.findByRole("button", { name: /submit answer/i }),
    ).toBeInTheDocument();
    const asked = await completeAdministration(user);

    // Real finalize → per-skill placement seeds in plain language; no percentages.
    expect(screen.getByText(RESULTS)).toBeInTheDocument();
    expect(screen.queryByText("100%")).not.toBeInTheDocument();
    // The screen leads with subject areas and keeps the skills behind a disclosure each, so
    // the rows appear when they are asked for. Acing every probe tests out of the whole
    // scope, so every area opens to nothing but "Mastered".
    expect(document.querySelectorAll(".dgx-finding")).toHaveLength(0);
    expect(document.querySelectorAll(".dgx-area").length).toBeGreaterThan(1);
    await openEveryArea(user);
    expect(document.querySelectorAll(".dgx-finding")).toHaveLength(
      DIAGNOSTIC_WALK_SCOPE.length,
    );
    expect(document.querySelectorAll('.dgx-finding[data-mastered="true"]')).toHaveLength(
      DIAGNOSTIC_WALK_SCOPE.length,
    );

    // The tally reports the instrument's own length, which is the number a demo reads off.
    // Asserted against the walk actually driven above rather than against a pinned figure.
    const tally = document.querySelectorAll(".dgx-tally__value");
    expect(tally).toHaveLength(3);
    expect(tally[0]?.textContent).toBe(String(asked));
    expect(asked).toBeLessThanOrEqual(MAX_QUESTIONS);

    // The diagnostic hands its per-node placement seeds to the city — the whole scope, not
    // only the nodes it probed, because a pruned or inferred node is placed too.
    expect(onPretestComplete).toHaveBeenCalledTimes(1);
    const placement = (onPretestComplete.mock.calls[0]?.[0] ?? {}) as Record<
      string,
      number
    >;
    expect(Object.keys(placement).sort()).toEqual([...DIAGNOSTIC_WALK_SCOPE].sort());

    // …plus the unlocked (passed, placement >= 2) node ids under the test-out model.
    const unlocked = (onPretestComplete.mock.calls[0]?.[1] ?? []) as string[];
    expect(unlocked.length).toBe(
      Object.values(placement).filter((level) => level >= 2).length,
    );
    expect(unlocked.length).toBeGreaterThan(0);

    // The counterbalanced retake is offered; run it to exercise the measurement pipeline.
    await user.click(screen.getByRole("button", { name: /take it again/i }));
    expect(
      await screen.findByRole("button", { name: /submit answer/i }),
    ).toBeInTheDocument();
    await completeAdministration(user);

    // Pre + post both finalized → the §9 measurement record renders a progress read-out.
    expect(await screen.findByText(/progress since your first run/i)).toBeInTheDocument();
  }, 60_000);

  it("hands off from results straight into the city (seeding + celebration moved there)", async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    const onPretestComplete = vi.fn();
    render(
      <SessionProvider>
        <DiagnosticRunner onExit={onExit} onPretestComplete={onPretestComplete} />
      </SessionProvider>,
    );

    await user.click(screen.getByRole("button", { name: /start the diagnostic/i }));
    await completeAdministration(user);

    // The old in-diagnostic seeding + hand-off screens are gone: from results the
    // single "Build my city" action closes the overlay straight into the (now
    // seeded) city, where the "You've unlocked N buildings!" celebration lives.
    expect(screen.queryByText(/turning your results into buildings/i)).toBeNull();
    await user.click(screen.getByRole("button", { name: /build my city/i }));
    expect(onExit).toHaveBeenCalledTimes(1);

    // The diagnostic handed the unlocked (passed) node ids to the city.
    expect(onPretestComplete).toHaveBeenCalledTimes(1);
    const unlocked = (onPretestComplete.mock.calls[0]?.[1] ?? []) as string[];
    expect(unlocked.length).toBeGreaterThan(0);
  }, 60_000);

  it("surfaces a rejected city handoff and retries the finalized placement without rerunning", async () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    const user = userEvent.setup();
    const onPretestComplete = vi
      .fn()
      .mockRejectedValueOnce(new Error("transient prefix transaction failure"))
      .mockResolvedValue(undefined);
    render(
      <SessionProvider>
        <DiagnosticRunner onPretestComplete={onPretestComplete} />
      </SessionProvider>,
    );

    await user.click(screen.getByTestId("dgx-dev-skip-ace"));
    expect(await screen.findByText(RESULTS, {}, { timeout: 55_000 })).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /retry city placement/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "transient prefix transaction failure",
    );
    expect(onPretestComplete).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /retry city placement/i }));
    expect(await screen.findByRole("button", { name: /build my city/i })).toBeEnabled();
    expect(onPretestComplete).toHaveBeenCalledTimes(2);
    expect(onPretestComplete.mock.calls[1]?.[0]).toEqual(
      onPretestComplete.mock.calls[0]?.[0],
    );
  }, 60_000);

  /**
   * **THE DEV SKIP STILL ANSWERS A WHOLE ADMINISTRATION, AND THE ENVIRONMENT IS ITS ONLY DOOR.**
   *
   * The control used to take a prop that rendered it regardless of the environment, and it was
   * removed so that the gate is unroutable rather than merely defaulted
   * (`test/diagnosticDevSkipStaysDev.test.ts`). Removing a way IN is the kind of change that can
   * quietly remove the capability with it, and this capability is why the control exists: the
   * instrument is twenty nodes wide and a walk costs a median of 23 questions, so every state
   * worth looking at is behind twenty-three of them.
   *
   * So this presses a rung the way a developer does — with `VITE_DIAGNOSTIC_API_URL` unset and
   * nothing else — and drives it to the results screen. It is the same real walk through the same
   * real scorer as the typed run above; only the keystrokes are substituted, from the item bank's
   * own `canonicalRawAnswer`.
   */
  it("answers a whole administration from the dev panel, on the environment alone", async () => {
    // The developer's own environment, and the only thing that puts the panel on screen.
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    const user = userEvent.setup();
    const onPretestComplete = vi.fn();
    render(
      <SessionProvider>
        <DiagnosticRunner onPretestComplete={onPretestComplete} />
      </SessionProvider>,
    );

    // Present, and present from the OVERVIEW rather than only mid-question, which is what
    // makes "start it and answer every question" reachable without typing one first.
    const panel = screen.getByTestId("dgx-dev-skip");
    expect(within(panel).getByText(/Start it and answer every question at/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: /submit answer/i })).toBeNull();

    await user.click(screen.getByTestId("dgx-dev-skip-ace"));
    await waitFor(() => expect(screen.getByText(RESULTS)).toBeInTheDocument(), {
      timeout: 55_000,
    });

    /*
     * WHAT IT ASKED, read off the control's own note — the one consequence of the press that no
     * other part of the screen reports, and the number whoever is demonstrating this reads out.
     * Cross-checked against the results tally, because two readings of one walk that disagree
     * mean one of them is not measuring the walk.
     */
    const note = document.querySelector(".dgx-skip__note")?.textContent ?? "";
    expect(note).toMatch(/Answered the diagnostic at "All right": \d+ questions asked\./);
    const asked = Number(/(\d+) questions asked/.exec(note)?.[1]);
    expect(asked).toBeGreaterThan(0);
    expect(asked).toBeLessThanOrEqual(MAX_QUESTIONS);
    expect(document.querySelector(".dgx-tally__value")?.textContent).toBe(String(asked));

    // A real administration, finalized: every node in the scope has a finding and a placement.
    await openEveryArea(user);
    expect(document.querySelectorAll(".dgx-finding")).toHaveLength(
      DIAGNOSTIC_WALK_SCOPE.length,
    );
    expect(onPretestComplete).toHaveBeenCalledTimes(1);
    const placement = (onPretestComplete.mock.calls[0]?.[0] ?? {}) as Record<
      string,
      number
    >;
    expect(Object.keys(placement).sort()).toEqual([...DIAGNOSTIC_WALK_SCOPE].sort());
    // Acing every probe tests out of the whole scope, which is the rung's own claim and what
    // separates "the skip ran" from "the skip answered correctly".
    expect(Object.values(placement).filter((level) => level >= 2)).toHaveLength(
      DIAGNOSTIC_WALK_SCOPE.length,
    );
    const unlocked = (onPretestComplete.mock.calls[0]?.[1] ?? []) as string[];
    expect(unlocked).toHaveLength(DIAGNOSTIC_WALK_SCOPE.length);
  }, 60_000);

  /**
   * **"I HAVEN'T LEARNED THIS YET" IS A MISS THE WALK CAN SCORE, NOT A BLANK IT CANNOT.**
   *
   * The diagnostic is deliberately anxiety-sensitive and a learner who is stuck on a
   * question has, until now, had two options: guess, or sit there. The control this covers is
   * the third, and the whole of its difficulty is that "let them move on" and "record nothing"
   * are one keystroke apart.
   *
   * There is no skip in the instrument to reach for. `isScorable` admits exactly `correct`
   * and `incorrect` (`engines/diagnostic/scoring.ts`); an empty or unparseable answer is
   * `invalid_input`, which is neither scored nor treated as a fault, so the walk RE-SERVES
   * the identical question. A "move on" built that way does not move on. So the press
   * submits the item bank's own `wellFormedWrongRawAnswer` — the one existing way to be
   * wrong in this repository, already driving the dev skip's "All wrong" rung, the runtime's
   * widened-walk guard and the bank's self-consistency probe — and the miss is a real miss
   * recomputed by the authoritative scorer.
   *
   * Both halves are measured here rather than argued, because a control that quietly failed
   * to score would look identical from the outside for one press:
   *
   *  - ONE press advances the walk, and does not raise the refusal an empty submit raises;
   *  - pressing it all the way through finalizes a real administration in which NO node
   *    reaches the test-out threshold, and the nodes it was pressed on read "Tested
   *    directly" rather than "From the skill map" — that phrase is `sourceOf`'s `failed`
   *    branch, so it is the results screen saying the answers were SCORED.
   */
  it("takes 'I haven't learned this yet' as a scorable miss and moves on", async () => {
    const user = userEvent.setup();
    const onPretestComplete = vi.fn();
    render(
      <SessionProvider>
        <DiagnosticRunner onPretestComplete={onPretestComplete} />
      </SessionProvider>,
    );
    await user.click(screen.getByRole("button", { name: /start the diagnostic/i }));
    const first = await waitFor(() => {
      const id = currentItemId();
      expect(id).not.toBeNull();
      return id;
    });

    // It is a SECOND control beside Submit, not a relabelled one.
    const unsure = notLearnedControl();
    expect(unsure).not.toBe(screen.getByRole("button", { name: /submit answer/i }));

    // ONE PRESS MOVES ON. This is the half that separates it from the empty submit, which
    // is refused and leaves the same question on screen.
    await user.click(unsure);
    await waitFor(() => {
      expect(currentItemId()).not.toBe(first);
    });
    expect(screen.queryByText(/enter an answer before submitting/i)).toBeNull();

    // ...and pressing it through finishes a real administration.
    let asked = 1;
    for (; asked <= MAX_QUESTIONS; asked += 1) {
      const before = currentItemId();
      if (before === null) {
        break;
      }
      await user.click(notLearnedControl());
      await waitFor(() => {
        expect(Boolean(screen.queryByText(RESULTS)) || currentItemId() !== before).toBe(
          true,
        );
      });
      if (screen.queryByText(RESULTS)) {
        break;
      }
    }
    expect(screen.getByText(RESULTS), "the walk never finalized").toBeInTheDocument();
    expect(asked, "the run ended before a second question").toBeGreaterThan(1);

    // EVERY NODE PLACED AT THE BOTTOM: the presses were recorded as misses, over the whole
    // scope, and nothing tested out.
    const placement = (onPretestComplete.mock.calls[0]?.[0] ?? {}) as Record<
      string,
      number
    >;
    expect(Object.keys(placement).sort()).toEqual([...DIAGNOSTIC_WALK_SCOPE].sort());
    expect(
      Object.entries(placement).filter(([, level]) => level >= 2),
      "a node tested out of a run answered entirely with 'I haven't learned this yet'",
    ).toEqual([]);
    expect(onPretestComplete.mock.calls[0]?.[1] ?? []).toEqual([]);

    // AND THEY WERE SCORED RATHER THAN DROPPED. An unscorable submission is re-served, never
    // recorded, so a node it was pressed on could only ever be decided from the skill map.
    //
    // **THIS ASSERTION WAS TRANSLATED, NOT WEAKENED, when the results screen was redesigned.**
    // It used to read `getAllByText(/tested directly/i).length > 0`, matching the per-card
    // "Tested directly" footnote that sat on all sixty-two cards. That footnote is gone: the
    // provenance split is now stated once in `.dgx-provenance` above the fold, and the
    // per-skill marker is two lowercase words inside a disclosure that is CLOSED by default,
    // so no text query can reach it without opening ten doors first.
    //
    // The claim is unchanged and is still the whole point of the case: at least one node was
    // MEASURED. `provenanceLine` has exactly three branches, and the one this rules out is
    // `measured === 0`, which is the only one that says everything followed from the map. So
    // the two surviving branches are named and the all-inferred wording is refused by name --
    // asserting the negative alone would pass on a screen that had stopped saying anything.
    const provenance = document.querySelector(".dgx-provenance")?.textContent ?? "";
    expect(provenance, "the results screen states no provenance at all").not.toBe("");
    expect(
      provenance,
      "no node was measured, so nothing the control submitted was scored",
    ).toMatch(
      /asked about \d+ of these skills directly|Every one of these \d+ skills was tested directly/i,
    );
    expect(
      provenance,
      "the screen says every skill came from the map, so nothing was scored",
    ).not.toMatch(/follow from the skill map rather than from a question you answered/i);
  }, 60_000);

  it("refuses an empty answer instead of submitting one the walk cannot score", async () => {
    // `MathInput` submitted an empty field, which reaches the walk as
    // `empty_answer`/`invalid_input` — not scorable, so the identical question comes back and
    // the learner sees a press that did nothing.
    const user = userEvent.setup();
    render(
      <SessionProvider>
        <DiagnosticRunner />
      </SessionProvider>,
    );
    await user.click(screen.getByRole("button", { name: /start the diagnostic/i }));
    const first = await waitFor(() => {
      const id = currentItemId();
      expect(id).not.toBeNull();
      return id;
    });

    await user.click(screen.getByRole("button", { name: /submit answer/i }));
    expect(
      await screen.findByText(/enter an answer before submitting/i),
    ).toBeInTheDocument();
    // And the same question is still on screen, un-advanced.
    expect(currentItemId()).toBe(first);
  }, 30_000);
});
