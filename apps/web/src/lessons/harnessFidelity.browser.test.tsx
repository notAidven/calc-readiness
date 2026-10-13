import {
  D3_PRACTICE_RETRY_VARIANTS_PER_CELL,
  DEMO_PINNED_TEMPLATE_IDS,
  type FrozenItem,
} from "@cr/item-bank";
import { afterEach, describe, expect, it } from "vitest";

import { InfiniteDrill } from "./InfiniteDrill";
import { LessonPractice } from "./LessonPractice";
import { practiceItemsById } from "./practiceChecker";
import { fixedSource } from "./practiceSurfaceFixture";
import {
  type PracticeSurface,
  submitThroughPracticeSurface,
  SERVED_PRACTICE_ITEMS,
} from "./submitPathHarness";
import { findButton, mount, setInputValue, waitFor } from "./testHarness";

import "../styles.css";

/**
 * DOES THE HARNESS SAY WHAT THE REAL SURFACE DOES? MEASURED IN A REAL BROWSER, CASE BY CASE.
 *
 * ## Why this file has to exist
 *
 * Three guards landed this round — `submitPathAcceptance`, `falsePositiveCensus` and
 * `independentAnswers` — and all three read the product through `submitThroughPracticeSurface`
 * rather than through the shipped components. That harness is a TRANSCRIPTION of
 * `LessonPractice.tsx` and `InfiniteDrill.tsx`: it re-implements the guard ladder, the
 * normalization step and the payload branch, and it can be wrong in exactly the way the
 * transcribed code is right. It has already been wrong once. The P0 this round fixed was found
 * because `InfiniteDrill` branched on `isInteractive` where `LessonPractice` branched on the
 * payload's shape, and the harness had faithfully copied the buggy branch; when the component
 * was fixed the harness went stale and its acceptance sweep started failing against a product
 * that was now correct.
 *
 * `submitPathHarness.test.ts` guards that specific drift by reading both components' source and
 * asserting the branch, which is cheap and catches the shape of the last defect. It is not the
 * same claim as "submitting this string into the real answer field produces this verdict on the
 * screen", and only the second one licenses reading 25,108 harness verdicts as facts about the
 * product.
 *
 * ## The matrix
 *
 * One case per answer type, per surface, plus the guard edges — twelve rows. Each row renders
 * the shipped component in real Chromium, types into the real answer field, submits the real
 * form, reads the verdict off the DOM, and compares it with what the harness predicted for the
 * same item and the same string. The assertion is the AGREEMENT, not the verdict: a row passes
 * when the two agree and fails when they diverge, so a harness that drifts in either direction
 * fails here whether it became too strict or too lenient.
 *
 * A guard refusal is a distinct DOM state, not a verdict — the surface paints the guard's note
 * and stamps no `data-status` at all — which is exactly the distinction the census depends on
 * and the one a coarser assertion would flatten.
 */

const CASES: readonly {
  readonly name: string;
  readonly answerType: string;
  readonly find: (item: FrozenItem) => boolean;
  /** `null` means "submit this item's own canonical key", read at mount time. */
  readonly submit: string | null;
  readonly expect: "correct" | "incorrect" | "blocked";
}[] = [
  {
    name: "numeric accepts its own key",
    answerType: "numeric",
    find: (item) => item.node_id === "NUM.2" && typeof item.answer.answer_key === "string",
    submit: null,
    expect: "correct",
  },
  {
    name: "numeric refuses a bumped digit",
    answerType: "numeric",
    find: (item) => item.node_id === "NUM.2" && typeof item.answer.answer_key === "string",
    submit: "999999",
    expect: "incorrect",
  },
  {
    name: "expression accepts its own key",
    answerType: "expression",
    find: (item) => item.template_id.startsWith("d1.num-3"),
    submit: null,
    expect: "correct",
  },
  {
    name: "solution_set accepts its own roster",
    answerType: "solution_set",
    find: () => true,
    submit: null,
    expect: "correct",
  },
  {
    name: "solution_set refuses an added member",
    answerType: "solution_set",
    find: () => true,
    submit: "{123457}",
    expect: "incorrect",
  },
  {
    name: "interval accepts its own notation",
    answerType: "interval",
    find: () => true,
    submit: null,
    expect: "correct",
  },
  {
    name: "point accepts its own ordered pair",
    answerType: "point",
    find: () => true,
    submit: null,
    expect: "correct",
  },
  {
    name: "multiple_choice accepts its own option",
    answerType: "multiple_choice",
    find: () => true,
    submit: null,
    expect: "correct",
  },
  {
    // The F1 guard edge: an item whose prompt instructs `sqrt(...)` while keying a plain
    // number. `requiresNumericLiteral` used to arm here and swallow the attempt.
    name: "the numeric-literal guard stands down where the prompt asks for a radical",
    answerType: "numeric",
    find: (item) =>
      item.template_id === "d9.trg3.exact-value-circle.l3" && /sqrt\s*\(/.test(item.prompt),
    submit: "sqrt(3)/2",
    expect: "incorrect",
  },
  {
    // The other side of the same guard: an item that really does want a bare number blocks
    // BEFORE the grader, so no attempt is scored and no verdict is stamped.
    name: "the numeric-literal guard still blocks a pasted expression",
    answerType: "numeric",
    find: (item) =>
      item.node_id === "NUM.2" && /^-?\d+$/.test(String(item.answer.answer_key)),
    submit: "2 + 3 * 4",
    expect: "blocked",
  },
  {
    name: "an empty submission is blocked before the grader",
    answerType: "numeric",
    find: (item) => item.node_id === "NUM.2",
    submit: "",
    expect: "blocked",
  },
  {
    // The RAD.1 shape the round opened on: a radical key on a `numeric` item.
    name: "a simplified-radical key reaches the grader and is accepted",
    answerType: "numeric",
    find: (item) => item.template_id === "d2.rad1.quotient.l2",
    submit: null,
    expect: "correct",
  },
];

const SURFACES: readonly PracticeSurface[] = ["lesson_practice", "infinite_drill"];

function pick(answerType: string, find: (item: FrozenItem) => boolean): FrozenItem {
  const found = SERVED_PRACTICE_ITEMS.find(
    (item) => item.answer.answer_spec.answer_type === answerType && find(item),
  );
  if (!found) {
    throw new Error(`no served ${answerType} item matched this row's filter`);
  }
  return found;
}

let active: { cleanup: () => void } | null = null;
afterEach(() => {
  active?.cleanup();
  active = null;
});

function answerField(host: HTMLElement): HTMLInputElement {
  const input = host.querySelector<HTMLInputElement>("input[type='text']");
  if (!input) {
    throw new Error("the surface rendered no text answer field");
  }
  return input;
}

/**
 * What the SCREEN says, in the same three-way vocabulary the harness reports.
 *
 * `blocked` is read as "the feedback node carries a note and no `data-status`", which is what
 * a pre-submit refusal paints: the guard writes its own line and `submitAnswer` is never
 * called, so the engine stamps nothing.
 */
function screenVerdict(host: HTMLElement): "correct" | "incorrect" | "blocked" | "none" {
  const nodes = [...host.querySelectorAll<HTMLElement>(".lesson-player__feedback")];
  const status = nodes
    .map((node) => node.dataset.status)
    .find((value) => value !== undefined);
  if (status === "correct") {
    return "correct";
  }
  if (status !== undefined) {
    return "incorrect";
  }
  const text = nodes
    .map((node) => node.textContent ?? "")
    .join(" ")
    .trim();
  return text.length > 0 ? "blocked" : "none";
}

/** The harness's own three-way answer for the same item and string. */
function harnessVerdict(
  item: FrozenItem,
  raw: string,
  surface: PracticeSurface,
): "correct" | "incorrect" | "blocked" | "none" {
  const result = submitThroughPracticeSurface(item, raw, { surface });
  if (result.outcome === "blocked_by_guard") {
    return "blocked";
  }
  return result.outcome === "correct" ? "correct" : "incorrect";
}

describe("the real surface and the harness agree, case by case", () => {
  for (const row of CASES) {
    for (const surface of SURFACES) {
      it(`${row.name} (${surface})`, async () => {
        const item = pick(row.answerType, row.find);
        const raw = row.submit ?? String(item.answer.answer_key);

        const harness = mount(
          surface === "lesson_practice" ? (
            <LessonPractice nodeId={item.node_id} source={fixedSource(item)} />
          ) : (
            // `InfinitePractice` is a thin wrapper that picks a random item from the node, so
            // mounting the drill itself with a one-item scheduler is what names the instance.
            // Everything under test — the guard ladder and the payload branch — is in
            // `InfiniteDrill`, which is what the wrapper renders.
            <InfiniteDrill
              scheduler={{ next: () => item }}
              storageKey={`harness-fidelity:${item.item_version_id}`}
              backLabel="Back"
              onExit={() => {}}
            />
          ),
        );
        active = harness;

        await waitFor(
          () => harness.host.querySelector("input[type='text']") !== null,
          `${surface} never rendered an answer field for ${item.item_version_id}`,
        );
        setInputValue(answerField(harness.host), raw);
        findButton(harness.host, /Check/i).click();
        await waitFor(
          () => screenVerdict(harness.host) !== "none",
          `${surface} painted nothing for ${item.item_version_id} <- ${JSON.stringify(raw)}`,
        );

        const onScreen = screenVerdict(harness.host);
        const predicted = harnessVerdict(item, raw, surface);
        // THE CLAIM: the transcription and the transcribed agree. Asserted as a pair so the
        // failure message shows both sides rather than only the one that moved.
        expect(
          { onScreen, predicted },
          `${item.item_version_id} <- ${JSON.stringify(raw)} on ${surface}`,
        ).toEqual({ onScreen: row.expect, predicted: row.expect });
      });
    }
  }

  it("covers every answer type and both guard outcomes, so the matrix is not all one shape", () => {
    // Composition, not size. Twelve rows all submitting a correct numeric key would pass every
    // assertion above and prove nothing about the guard ladder or the non-string types.
    const types = new Set(CASES.map((row) => row.answerType));
    expect([...types].sort()).toEqual([
      "expression",
      "interval",
      "multiple_choice",
      "numeric",
      "point",
      "solution_set",
    ]);
    const outcomes = new Set(CASES.map((row) => row.expect));
    expect([...outcomes].sort()).toEqual(["blocked", "correct", "incorrect"]);
    expect(CASES.length).toBeGreaterThanOrEqual(12);
    // And every row names a served item, checked here so a filter that stops matching fails
    // once by name instead of twenty-four times inside the surface mount.
    for (const row of CASES) {
      expect(() => pick(row.answerType, row.find), row.name).not.toThrow();
    }
    // The pool the rows are drawn from is the one the guards sweep, floored so a fixture that
    // lost the registry would fail here rather than quietly matching nothing.
    //
    // TEMPORARY, and self-restoring. A template pinned to one instance for the scripted
    // demonstration contributes its canonical instance and NO variants, so the served population
    // drops by exactly the retry depth per pinned template. Derived from the pin list rather than
    // written down as a smaller number, so both floors climb back to 2,265 on their own when the
    // list empties. `demoPinnedTemplates.ts` holds the contract.
    const servedItemsFloor =
      2265 - DEMO_PINNED_TEMPLATE_IDS.length * D3_PRACTICE_RETRY_VARIANTS_PER_CELL;
    expect(SERVED_PRACTICE_ITEMS.length).toBeGreaterThanOrEqual(servedItemsFloor);
    expect(practiceItemsById.size).toBeGreaterThanOrEqual(servedItemsFloor);
  });
});
