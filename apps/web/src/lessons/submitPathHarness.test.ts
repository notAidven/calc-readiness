/**
 * The harness's own proof, before anything is measured with it.
 *
 * Two claims, and neither is worth much without the other. First, that every served item's
 * OWN canonical answer survives the whole submit path — a gate that refuses its own key is
 * the defect `submitGuards.ts` documents, and this is the sweep that can see it. Second,
 * that the guard layer is really wired: a sweep in which every guard silently no-ops would
 * pass the first claim perfectly, so a submission the guard MUST refuse is injected and the
 * result asserted to be `blocked_by_guard` and specifically NOT `incorrect`.
 *
 * The canonical answer comes from `canonicalRawAnswer`, not `answer.answer_key`. 217 served
 * items have no bare-string key (77 interactive, 140 `rational_answer`), and a sweep reading
 * the key directly submits `undefined` for all of them.
 */

// The source-reading fidelity check below is the same one `packages/item-bank/src/d6.test.ts`
// makes. `apps/web` resolves `node:fs` through Vite's own types, so no suppression is needed
// here even though the item-bank project needs one.
import { readFileSync } from "node:fs";

import {
  canonicalRawAnswer,
  D1_PRACTICE_TEMPLATES,
  D10_PRACTICE_TEMPLATES,
  D2_PRACTICE_TEMPLATES,
  D3_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D3_PRACTICE_TEMPLATES,
  D4_PRACTICE_TEMPLATES,
  D5_PRACTICE_TEMPLATES,
  D6_PRACTICE_TEMPLATES,
  D7_PRACTICE_TEMPLATES,
  D8_PRACTICE_TEMPLATES,
  D9_PRACTICE_TEMPLATES,
  DEMO_PINNED_TEMPLATE_IDS,
  generateFromTemplate,
  INTERACTIVE_TEMPLATES,
  type ItemTemplate,
} from "@cr/item-bank";
import { describe, expect, it } from "vitest";

import {
  type PracticeSurface,
  SERVED_PRACTICE_ITEMS,
  submitThroughPracticeSurface,
} from "./submitPathHarness";

function sweep(surface: PracticeSurface) {
  const byOutcome = { correct: 0, incorrect: 0, invalid_input: 0, blocked_by_guard: 0 };
  const notCorrect: string[] = [];
  for (const item of SERVED_PRACTICE_ITEMS) {
    const result = submitThroughPracticeSurface(item, canonicalRawAnswer(item.answer), {
      surface,
    });
    byOutcome[result.outcome] += 1;
    if (result.outcome !== "correct") {
      notCorrect.push(
        `${item.item_version_id} [${item.node_id} ${item.answer.answer_spec.answer_type}] ${result.outcome}` +
          ` guard=${result.guard ?? "-"} status=${result.status ?? "-"} reason=${result.reason_code ?? "-"}`,
      );
    }
  }
  return { byOutcome, notCorrect };
}

/**
 * Both sweeps below grade 2,265 items through the whole path and run past the 20s default,
 * so each states its own budget. The number is a ceiling on a machine, not a measurement.
 */
const SWEEP_TIMEOUT_MS = 300_000;

/**
 * TEMPORARY, and self-restoring. A template pinned to one instance for the scripted
 * demonstration contributes its canonical instance and NO variants, so the served population
 * drops by exactly the retry depth per pinned template. Derived from the pin list rather than
 * written down as a smaller number, so the floor climbs back to 2,265 on its own when the list
 * empties and cannot be left slack once the pin is reverted. `demoPinnedTemplates.ts` holds the
 * contract and `d3.test.ts` proves the exemption is still earned.
 */
const SERVED_ITEMS_FLOOR =
  2265 - DEMO_PINNED_TEMPLATE_IDS.length * D3_PRACTICE_RETRY_VARIANTS_PER_CELL;

describe("full submit path over every served item's own canonical answer", () => {
  it(
    "accepts every canonical answer on the graded lesson surface",
    () => {
      const { byOutcome, notCorrect } = sweep("lesson_practice");
      // Floored, not pinned: the population grows with every authored pool, and a pin here
      // would be a maintenance tax on a number this file does not own.
      expect(SERVED_PRACTICE_ITEMS.length).toBeGreaterThanOrEqual(SERVED_ITEMS_FLOOR);
      expect(notCorrect.join("\n")).toBe("");
      expect(byOutcome.correct).toBe(SERVED_PRACTICE_ITEMS.length);
    },
    SWEEP_TIMEOUT_MS,
  );

  /**
   * The same sweep on the casual drill, which used to be a DIFFERENT handler.
   *
   * `InfiniteDrill` decided what to hand the checker from `isInteractiveAnswerType`, and
   * `rational_answer` is not one, so its `{ expression, excluded_values }` payload was read
   * as `""` and the empty string was graded — 140 items, 4 of 4 RAT nodes, 100% of each
   * node's drill pool. This assertion was written the other way up, pinning the divergence,
   * and it kept passing after the surface was fixed because the harness had not been
   * re-read. That is the whole hazard of a transcription and the reason for the fidelity
   * case below.
   */
  it(
    "accepts every canonical answer on the casual drill surface too",
    () => {
      const { byOutcome, notCorrect } = sweep("infinite_drill");
      const rational = SERVED_PRACTICE_ITEMS.filter(
        (item) => item.answer.answer_spec.answer_type === "rational_answer",
      );
      // The floor names the cohort the defect lived in, so an agreement asserted over a pool
      // that had lost its rational items could not pass as coverage of it.
      expect(rational.length).toBeGreaterThanOrEqual(140);
      expect(notCorrect.join("\n")).toBe("");
      expect(byOutcome.correct).toBe(SERVED_PRACTICE_ITEMS.length);
    },
    SWEEP_TIMEOUT_MS,
  );
});

/**
 * THE HARNESS IS A COPY OF SOMEBODY ELSE'S CONTROL FLOW, so it is only as true as the day it
 * was read — and it was read once, at `b88bb0c7`, and then the surface moved underneath it.
 *
 * The P0 fix changed `InfiniteDrill` to branch on the payload's SHAPE, and this module went on
 * modelling the branch on the answer TYPE for a full lane afterwards, with its own test
 * asserting the divergence it had stopped having. Nothing was wrong with either measurement in
 * isolation; the pair had simply come apart, and no assertion existed that could notice.
 *
 * So the fidelity is asserted from the sources. The two handlers must decide `raw_answer` from
 * `typeof value === "string"` and neither may decide it from `isInteractiveAnswerType` — which
 * catches a drift in EITHER direction, a surface that regresses and a surface that changes to
 * something new the harness has not been taught. It cannot prove the transcription is faithful
 * in every respect (only the browser matrix can speak to that), but it pins the one decision
 * that has already been wrong once.
 */
describe("the harness still describes the surfaces it claims to transcribe", () => {
  const SURFACE_SOURCES: readonly string[] = [
    "./LessonPractice.tsx",
    "./InfiniteDrill.tsx",
  ];

  it.each(SURFACE_SOURCES)("%s decides raw_answer from the payload shape", (path) => {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    const assignment = source.match(/const rawAnswer[\s\S]{0,200}?;/);
    expect(assignment?.[0], `${path} has no rawAnswer assignment`).toBeDefined();
    const body = assignment?.[0] ?? "";
    expect(body, path).toContain('typeof value === "string"');
    expect(body, path).toContain("normalizeTextSubmission");
    // The regression, by name: reading the ANSWER TYPE to decide what to hand the checker.
    expect(body, path).not.toContain("isInteractive");
  });

  it("covers both shipped practice surfaces and no fewer", () => {
    // A floor under the list above: `it.each` over an empty array reports nothing and passes,
    // which is exactly how a fidelity check stops checking.
    expect(SURFACE_SOURCES.length).toBe(2);
    for (const path of SURFACE_SOURCES) {
      expect(readFileSync(new URL(path, import.meta.url), "utf8").length).toBeGreaterThan(
        0,
      );
    }
  });
});

/**
 * The prompt manifest is built from FRESH DRAWS, not served instances, so that every
 * registered template is covered including the ones no frozen pool happens to hold. A fresh
 * draw's `item_version_id` is unknown to the shipped registry, and `practiceChecker` answers
 * `scoring_error` for an id it has never seen — which would have read as several hundred
 * harness failures over answers that were right. `checkerFor` builds a checker for such an
 * item; this is the sweep that proves it grades rather than errors.
 */
describe("full submit path over a fresh draw of every registered template", () => {
  const ALL_TEMPLATES: readonly ItemTemplate[] = [
    ...D1_PRACTICE_TEMPLATES,
    ...D2_PRACTICE_TEMPLATES,
    ...D3_PRACTICE_TEMPLATES,
    ...D4_PRACTICE_TEMPLATES,
    ...D5_PRACTICE_TEMPLATES,
    ...D6_PRACTICE_TEMPLATES,
    ...D7_PRACTICE_TEMPLATES,
    ...D8_PRACTICE_TEMPLATES,
    ...D9_PRACTICE_TEMPLATES,
    ...D10_PRACTICE_TEMPLATES,
    ...INTERACTIVE_TEMPLATES,
  ];

  it("accepts the canonical answer of an unregistered draw from every template", () => {
    // Derived from source and floored: 327 at `b88bb0c7`, and the floor is what stops a
    // collapsed population from passing this as a sweep over nothing.
    expect(ALL_TEMPLATES.length).toBeGreaterThanOrEqual(320);
    const notCorrect: string[] = [];
    for (const [index, template] of ALL_TEMPLATES.entries()) {
      const item = generateFromTemplate(template, "practice", 900_000 + index * 100);
      const result = submitThroughPracticeSurface(item, canonicalRawAnswer(item.answer));
      if (result.outcome !== "correct") {
        notCorrect.push(
          `${template.template_id} ${result.outcome} guard=${result.guard ?? "-"} status=${result.status ?? "-"} reason=${result.reason_code ?? "-"}`,
        );
      }
    }
    expect(notCorrect.join("\n")).toBe("");
  });
});

describe("the guard layer is wired", () => {
  /** An item the numeric-literal gate covers: `numeric` type AND a plain-number key. */
  const plainNumeric = SERVED_PRACTICE_ITEMS.find(
    (item) =>
      item.answer.answer_spec.answer_type === "numeric" &&
      typeof item.answer.answer_key === "string" &&
      /^-?\d+$/.test(item.answer.answer_key),
  );

  it("refuses an unevaluated expression BEFORE the grader, not as a miss", () => {
    if (!plainNumeric) {
      throw new Error("no served plain-numeric item to probe");
    }
    // Value-equal to the key, so a checker reached would evaluate it and say `correct`.
    // The gate is the only thing that can produce a non-correct outcome here, which is what
    // makes this an injection rather than a restatement.
    const key = String(plainNumeric.answer.answer_key);
    const expression = `${key} + 0`;

    const blocked = submitThroughPracticeSurface(plainNumeric, expression);
    expect(blocked.outcome).toBe("blocked_by_guard");
    expect(blocked.outcome).not.toBe("incorrect");
    expect(blocked.guard).toBe("numeric_literal");
    expect(blocked.status).toBeNull();
    expect(blocked.graded).toBeUndefined();

    // And the same string DOES reach the grader on an item the gate does not cover, so the
    // refusal above is the guard's doing and not a property of the string.
    const uncovered = SERVED_PRACTICE_ITEMS.find(
      (item) => item.answer.answer_spec.answer_type === "expression",
    );
    if (!uncovered) {
      throw new Error("no served expression item to contrast with");
    }
    const graded = submitThroughPracticeSurface(uncovered, expression);
    expect(graded.outcome).not.toBe("blocked_by_guard");
    expect(graded.status).not.toBeNull();
  });

  it("refuses an unreduced fraction on a lowest-terms item before the grader", () => {
    const reduced = SERVED_PRACTICE_ITEMS.find(
      (item) => item.answer.answer_spec.simplification === "reduced_fraction",
    );
    if (!reduced) {
      throw new Error("no served reduced-fraction item to probe");
    }
    const result = submitThroughPracticeSurface(reduced, "2/4");
    expect(result.outcome).toBe("blocked_by_guard");
    expect(result.guard).toBe("reduced_fraction");
  });
});
