import { DIAGNOSTIC_WALK_ITEM_PACK, type FrozenItem } from "@cr/item-bank";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SessionProvider } from "../auth/SessionContext";
import { DIAGNOSTIC_CHECKER_VERSION, diagnosticAnswerChecker } from "./browserRuntime";
import { DiagnosticAnswer } from "./DiagnosticAnswer";
import { DiagnosticRunner } from "./DiagnosticRunner";

/**
 * WHEN THE READER CANNOT READ THE ANSWER, THE LEARNER IS TOLD — and that is not a grade.
 *
 * ## The defect this was written against
 *
 * The diagnostic is deliberately free of correctness feedback: it records and moves on, and
 * nothing on a question screen ever says right or wrong. `invalid_input` was riding that
 * silence. `DiagnosticAnswer` graded locally, read `client_correct` off the result and threw
 * the `status` away, so an answer the checker could not PARSE submitted exactly like one it
 * could. Downstream, `isScorable` refuses `invalid_input` (`engines/diagnostic/src/scoring.ts`),
 * so the walk records the row, declines to advance the adjudication and re-serves the same
 * node — while the runner increments its own question counter. The learner reads "Question 24",
 * sees the identical problem, and is told nothing at all.
 *
 * Reported on question 23 ("Composing & decomposing functions", one free-text field) as
 * *"its silently rejecting improperly formatted answers; like putting in 'a' doesnt display an
 * error bar"*, with *"i think its persistent across problem types"*. Both halves are measured
 * below: the named instance, and the population.
 *
 * ## Where the line is drawn, and why it cannot leak correctness
 *
 * The branch is taken on the checker's own `status`, never on `client_correct` and never on any
 * comparison against the answer key:
 *
 *  - `invalid_input` — the reader could not read it. Refused, with a line saying so, and NOT
 *    submitted, so no unscorable row is recorded and the walk cannot wedge on it.
 *  - `correct` / `incorrect` — the reader read it. Submitted in silence, identically. A
 *    wrong-but-parseable answer is graded `incorrect` and says nothing, which is the
 *    no-correctness-leak property and is asserted below over a derived population.
 *
 * That is exactly the boundary `docs/Answer_Equivalence_Spec.md` §12 already draws and the
 * scoring engine already reads. `a` is a perfectly good algebraic expression and is unreadable
 * only against an item that declares `allowed_symbols: ["x"]`; what makes it announceable is
 * not that it is wrong but that the instrument will not score it.
 *
 * `unsupported_expression` and `scoring_error` are deliberately NOT in the refused set. Both are
 * application faults per `Assessment_Scoring_Spec` §6 — the app broke, not the learner — and a
 * learner cannot rewrite their way out of one, so refusing the submit would strand them. They
 * keep the behaviour they have today, and no served item produces either for the inputs swept
 * here.
 */

const UNREADABLE = /couldn't read that|could not read that/i;

const ITEM_BY_ID = new Map(
  DIAGNOSTIC_WALK_ITEM_PACK.map((entry) => [entry.item_version_id, entry] as const),
);

function verdict(item: FrozenItem, raw: unknown): string {
  return diagnosticAnswerChecker({
    raw_answer: raw,
    item_version_id: item.item_version_id,
    equivalence_checker_version: DIAGNOSTIC_CHECKER_VERSION,
  }).status;
}

/** The payload shape this item's control produces for a typed string. */
function rawFor(item: FrozenItem, typed: string): unknown {
  return item.answer.answer_spec.answer_type === "rational_answer"
    ? { expression: typed, excluded_values: typed }
    : typed;
}

/**
 * Candidate keystrokes, headed by the one the report names. Each is checked against the item
 * on screen rather than assumed, so the population is derived: an item that READS `a` is
 * driven with the next candidate instead of being quietly dropped.
 */
const UNREADABLE_CANDIDATES = ["a", "√2", "#"] as const;

function unreadableInputFor(item: FrozenItem): string | null {
  for (const candidate of UNREADABLE_CANDIDATES) {
    if (verdict(item, rawFor(item, candidate)) === "invalid_input") {
      return candidate;
    }
  }
  return null;
}

/** An answer the checker READS and grades wrong, for the no-leak half. */
const WRONG_BUT_READABLE = ["-987654", "0", "1/7"] as const;

function wrongReadableInputFor(item: FrozenItem): string | null {
  for (const candidate of WRONG_BUT_READABLE) {
    if (verdict(item, rawFor(item, candidate)) === "incorrect") {
      return candidate;
    }
  }
  return null;
}

/** Mount the real answer row on its own, so one named item can be driven directly. */
function mountAnswer(frozen: FrozenItem) {
  const onSubmit = vi.fn();
  const { unmount } = render(
    <DiagnosticAnswer
      frozen={frozen}
      disabled={false}
      submitLabel="Submit answer"
      onSubmit={onSubmit}
    />,
  );
  return { onSubmit, unmount };
}

afterEach(cleanup);

function typeInto(index: number, value: string): void {
  const fields = screen.getAllByRole("textbox");
  fireEvent.change(fields[index] as HTMLElement, { target: { value } });
}

/** The served question's item-version id, or null once the run has left the question phase. */
function currentItemId(): string | null {
  return (
    document.querySelector(".diagnostic-item")?.getAttribute("data-item-version-id") ?? null
  );
}

/** The rendered question number, which is what a learner reads as progress. */
function currentQuestionNumber(): number {
  const text = document.querySelector(".dgx-probe__head .dgx-eyebrow")?.textContent ?? "";
  return Number(/Question (\d+)/.exec(text)?.[1] ?? "0");
}

describe("the diagnostic tells a learner when their answer could not be read", () => {
  /**
   * THE NAMED INSTANCE. FUN.7 is "Composing & decomposing functions", the node the report
   * quotes, and `a` is the string it quotes. Both of its served shapes are driven: the
   * `numeric` composition value and the `expression` formula in `x`.
   */
  it("FUN.7, the reported node: `a` is announced on every served shape", () => {
    const fun7 = DIAGNOSTIC_WALK_ITEM_PACK.filter((entry) => entry.node_id === "FUN.7");
    expect(fun7.length, "FUN.7 is not in the served pack, so this asserts nothing").toBe(8);

    for (const frozen of fun7) {
      // The control: the checker really does refuse `a` here, so the assertion below is
      // about the UI and not about the grammar.
      expect(
        verdict(frozen, "a"),
        `${frozen.item_version_id} reads "a", so it is not a case of this defect`,
      ).toBe("invalid_input");

      const { onSubmit, unmount } = mountAnswer(frozen);
      typeInto(0, "a");
      fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

      expect(
        screen.getByRole("alert").textContent ?? "",
        `${frozen.item_version_id} swallowed an unreadable answer`,
      ).toMatch(UNREADABLE);
      expect(
        onSubmit,
        `${frozen.item_version_id} recorded a response the instrument cannot score`,
      ).not.toHaveBeenCalled();
      unmount();
    }
  });

  /**
   * SYSTEMIC, over the served pool rather than over one node. The population is every served
   * item for which SOME candidate keystroke is genuinely unreadable, derived by grading each
   * candidate through the same checker the surface grades with; the floor is what stops the
   * sweep passing because the population went empty.
   *
   * One item per template, because 456 mounts is a minute of jsdom and the defect is per
   * control rather than per instance — the template split is what makes the cohort a shape
   * census rather than a repetition.
   */
  it("systemic: every served answer shape announces unreadable input", () => {
    const oneEach = new Map<string, FrozenItem>();
    for (const entry of DIAGNOSTIC_WALK_ITEM_PACK) {
      if (!oneEach.has(entry.template_id)) {
        oneEach.set(entry.template_id, entry);
      }
    }
    const population = [...oneEach.values()].filter(
      (entry) => unreadableInputFor(entry) !== null,
    );
    expect(
      population.length,
      "no served item refuses any candidate keystroke, so this sweep measures nothing",
    ).toBeGreaterThanOrEqual(60);

    // The shapes are really different controls and not one repeated: a `rational_answer` is
    // the two-field one the report asks about beside the single-field ones.
    const types = new Set(population.map((item) => item.answer.answer_spec.answer_type));
    expect(types.size).toBeGreaterThanOrEqual(4);
    expect([...types]).toContain("rational_answer");

    const silent: string[] = [];
    for (const frozen of population) {
      const typed = unreadableInputFor(frozen) as string;
      const { onSubmit, unmount } = mountAnswer(frozen);
      typeInto(0, typed);
      if (frozen.answer.answer_spec.answer_type === "rational_answer") {
        // The multi-field case: BOTH halves carry the unreadable string, because the
        // comparator reads the payload as one answer.
        typeInto(1, typed);
      }
      fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
      const notice = screen.queryByRole("alert")?.textContent ?? "";
      if (!UNREADABLE.test(notice) || onSubmit.mock.calls.length > 0) {
        silent.push(
          `${frozen.item_version_id} [${frozen.template_id}] typed=${JSON.stringify(typed)} notice=${JSON.stringify(notice)} submitted=${onSubmit.mock.calls.length}`,
        );
      }
      unmount();
    }
    expect(silent, "these shapes still swallow unreadable input").toEqual([]);
  });

  /**
   * THE NO-CORRECTNESS-LEAK PROPERTY, which is the half that keeps this from becoming
   * feedback. A wrong answer the reader CAN read is submitted in silence — no alert, no line,
   * nothing that distinguishes it from a right one.
   *
   * Derived the same way as the population above, so an item whose grammar changes leaves the
   * cohort rather than being excused, and floored so it cannot pass empty.
   */
  it("a wrong-but-readable answer says nothing at all", () => {
    const oneEach = new Map<string, FrozenItem>();
    for (const entry of DIAGNOSTIC_WALK_ITEM_PACK) {
      if (!oneEach.has(entry.template_id)) {
        oneEach.set(entry.template_id, entry);
      }
    }
    const population = [...oneEach.values()].filter(
      (entry) => wrongReadableInputFor(entry) !== null,
    );
    expect(
      population.length,
      "no served item grades any candidate as a readable miss, so this sweep measures nothing",
    ).toBeGreaterThanOrEqual(20);

    const leaked: string[] = [];
    for (const frozen of population) {
      const typed = wrongReadableInputFor(frozen) as string;
      const { onSubmit, unmount } = mountAnswer(frozen);
      typeInto(0, typed);
      fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
      const alert = screen.queryByRole("alert");
      if (alert !== null || onSubmit.mock.calls.length !== 1) {
        leaked.push(
          `${frozen.item_version_id} [${frozen.template_id}] typed=${JSON.stringify(typed)} alert=${JSON.stringify(alert?.textContent ?? null)} submitted=${onSubmit.mock.calls.length}`,
        );
      }
      unmount();
    }
    expect(
      leaked,
      "a readable miss produced feedback, which is the correctness leak this instrument must not have",
    ).toEqual([]);
  });

  /**
   * THE WHOLE PATH, through the real runner and the real walk engine, because the two halves
   * of the defect live in different places: the missing line is the component's, and the
   * counter that advanced over a question the engine never accepted is the run's.
   */
  it("the real run does not count an unreadable answer as a question asked", async () => {
    const user = userEvent.setup();
    render(
      <SessionProvider>
        <DiagnosticRunner />
      </SessionProvider>,
    );
    await user.click(screen.getByRole("button", { name: /start the diagnostic/i }));
    const served = await waitFor(() => {
      const id = currentItemId();
      expect(id).not.toBeNull();
      return id as string;
    });
    const frozen = ITEM_BY_ID.get(served) as FrozenItem;
    expect(
      frozen,
      `the runner served an item the pack does not carry: ${served}`,
    ).toBeTruthy();
    expect(currentQuestionNumber()).toBe(1);

    const typed = unreadableInputFor(frozen);
    expect(
      typed,
      `${served} reads every candidate, so pick another opening item`,
    ).not.toBeNull();

    const card = document.querySelector<HTMLElement>(".diagnostic-item") as HTMLElement;
    for (const field of within(card).getAllByRole("textbox")) {
      fireEvent.change(field, { target: { value: typed as string } });
    }
    await user.click(within(card).getByRole("button", { name: /submit answer/i }));

    // Told, in words, on the surface the learner is looking at.
    expect((await screen.findByRole("alert")).textContent ?? "").toMatch(UNREADABLE);
    // And the run has not pretended to move: same item, same question number.
    expect(currentItemId()).toBe(served);
    expect(currentQuestionNumber()).toBe(1);
  }, 30_000);
});
