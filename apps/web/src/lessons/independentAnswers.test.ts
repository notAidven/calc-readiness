import {
  D10_PRACTICE_TEMPLATES,
  D1_PRACTICE_TEMPLATES,
  D2_PRACTICE_TEMPLATES,
  D3_PRACTICE_TEMPLATES,
  D4_PRACTICE_TEMPLATES,
  D5_PRACTICE_TEMPLATES,
  D6_PRACTICE_TEMPLATES,
  D7_PRACTICE_TEMPLATES,
  D8_PRACTICE_TEMPLATES,
  D9_PRACTICE_TEMPLATES,
  generateFromTemplate,
  INTERACTIVE_TEMPLATES,
  type ItemTemplate,
} from "@cr/item-bank";
import { isInteractiveAnswerType } from "@cr/components";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

import { type PracticeSurface, submitThroughPracticeSurface } from "./submitPathHarness";

/**
 * 654 ANSWERS DERIVED BY HAND FROM THE PROMPT ALONE, FROZEN SO KEY DRIFT HAS TO BREAK THEM.
 *
 * ## What this is, and why it is not another key check
 *
 * `validateTemplates` and `validatePracticePool` submit the item's OWN declared key and assert
 * it is accepted. That is a self-consistency check: a template whose key is wrong passes it
 * happily, because the wrong key is compared against itself. Nothing in the tree ever asked
 * whether the declared key is the right answer to the question the learner is shown.
 *
 * A solver swarm answered 654 drawn instances over 327 templates from the RENDERED PROMPT,
 * without reading the answer key, and wrote its working down (`practice-solve-scratch/`). All
 * 654 agreed with the declared key. That measurement was a one-off, and its value decays the
 * moment a template's arithmetic is edited, so it is frozen here: each row is regenerated at
 * its recorded seed and the independently-derived answer is submitted through the whole check
 * path. A key that drifts away from its own prompt now fails at the row it drifted on.
 *
 * ## The seed is load-bearing
 *
 * These are not served instances. `generateFromTemplate(template, "practice", seed)` redraws
 * the exact instance the solver was shown, and `submitThroughPracticeSurface` grades an
 * unregistered draw through a checker built for it with the shipped comparators. If a
 * template's `generate()` changes what it draws at a fixed seed, the prompt the solver
 * answered no longer exists and the row SHOULD fail — that is the drift this is here to catch,
 * and the failure message says which template moved.
 */

const TEMPLATES: readonly ItemTemplate[] = [
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

const BY_ID = new Map(TEMPLATES.map((template) => [template.template_id, template]));

interface FixtureRow {
  readonly domain: string;
  readonly template_id: string;
  readonly seed: number;
  readonly answer: unknown;
  readonly answer_form: string;
}

/**
 * Read rather than `import`ed: TypeScript's wildcard `include` does not match `.json`, so an
 * import would need `apps/web/tsconfig.json` widened for one fixture. `submitPathHarness.test.ts`
 * reads its sources the same way — but with a path rather than a `new URL(..., import.meta.url)`,
 * which Vite rewrites to an http asset URL for a `.json` specifier and `readFileSync` then
 * refuses with "The URL must be of scheme file".
 */
const ROWS = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "independentAnswers.fixture.json"),
    "utf8",
  ),
) as readonly FixtureRow[];

/**
 * The rows whose answer is PROSE, excluded by name with their reason.
 *
 * These 22 rows sit on interactive widgets — five number-line templates and six `expr_builder`
 * templates — where the answer is a dragged or assembled widget state and there is no text to
 * submit. The solver described the intended state in English ("one FILLED circle at -6, no
 * shading"), which is the right record for a human ledger and is not a submission: feeding it
 * to the grader would measure the parser refusing English.
 *
 * Asserted in BOTH directions in "the prose exclusion is load-bearing" below, and the reason
 * is asserted too — a listed template whose answer type stops being interactive fails, so this
 * list cannot go on excusing a row that has become perfectly gradeable.
 */
const PROSE_TEMPLATES: readonly string[] = [
  "d2.exp.build.l3",
  "d2.rad1.build.l3",
  "d2.rad2.build.l3",
  "d2.rad3.simplify.l3",
  "d2.rad3.to-exponent.l2",
  "d2.rad3.to-radical.l2",
  "int.nl.closed.l2",
  "int.nl.half-open.l3",
  "int.nl.point.l1",
  "int.nl.right-open.l3",
  "int.nl.two-points.l2",
];

/**
 * The submission shape the answer control holds. A rational answer is TWO fields, and the
 * exclusions field is a comma-separated STRING in the shipped control (`PracticeAnswer.tsx`)
 * rather than the array `canonicalRawAnswer` returns, so a fixture that submitted the array
 * would be grading a shape no learner can produce.
 */
function toSubmission(answer: unknown): unknown {
  if (typeof answer === "string") {
    return answer;
  }
  const record = answer as Record<string, unknown>;
  if (typeof record?.expression === "string") {
    const exclusions = record.excluded_values;
    return {
      expression: record.expression,
      excluded_values: Array.isArray(exclusions)
        ? exclusions.join(", ")
        : typeof exclusions === "string"
          ? exclusions
          : "",
    };
  }
  return answer;
}

interface Graded {
  readonly row: FixtureRow;
  readonly outcome: string;
  readonly reasonCode: string | null;
  readonly surface: PracticeSurface;
}

const SURFACES: readonly PracticeSurface[] = ["lesson_practice", "infinite_drill"];

let graded: readonly Graded[] = [];
let gradeable: readonly FixtureRow[] = [];

beforeAll(() => {
  gradeable = ROWS.filter((row) => row.answer_form !== "prose");
  const results: Graded[] = [];
  for (const row of gradeable) {
    const template = BY_ID.get(row.template_id);
    if (!template) {
      throw new Error(
        `${row.template_id} is in the fixture and not in the pool — a template was renamed or removed`,
      );
    }
    const item = generateFromTemplate(template, "practice", row.seed);
    for (const surface of SURFACES) {
      const result = submitThroughPracticeSurface(item, toSubmission(row.answer), {
        surface,
      });
      results.push({
        row,
        outcome: result.outcome,
        reasonCode: result.reason_code,
        surface,
      });
    }
  }
  graded = results;
}, 600_000);

describe("every independently-derived answer still grades correct", () => {
  it.each(SURFACES)("holds on the %s surface", (surface) => {
    const failures = graded
      .filter((entry) => entry.surface === surface && entry.outcome !== "correct")
      .map(
        (entry) =>
          `${entry.row.template_id}@${entry.row.seed}: ${entry.outcome}/${entry.reasonCode ?? "-"} for ${JSON.stringify(entry.row.answer)}`,
      );
    expect(failures.slice(0, 20)).toEqual([]);
    // The floor, because "no failures" is free over an empty sweep and the fixture is loaded
    // from a file that could be emptied without any other assertion noticing.
    expect(
      graded.filter((entry) => entry.surface === surface).length,
    ).toBeGreaterThanOrEqual(600);
    // And EXACTLY the gradeable rows: nothing is held out. The demonstration pin that once
    // excused two of them is gone, and with it the only reason a row here was ever skipped.
    expect(graded.filter((entry) => entry.surface === surface).length).toBe(
      gradeable.length,
    );
  });
});

describe("the frozen population keeps its shape", () => {
  it("still holds the whole solve, not a surviving remnant of it", () => {
    expect(ROWS.length).toBeGreaterThanOrEqual(654);
    expect(new Set(ROWS.map((row) => row.template_id)).size).toBeGreaterThanOrEqual(327);
    expect(gradeable.length).toBeGreaterThanOrEqual(632);
  });

  it("spans every domain and every answer form the solve covered", () => {
    // Composition, not size. 654 rows drawn from D1 alone would clear the floor above while
    // leaving nine domains unguarded, and a fixture that had quietly lost its rational-answer
    // rows would still grade 592 strings green.
    const byDomain = new Map<string, number>();
    for (const row of ROWS) {
      byDomain.set(row.domain, (byDomain.get(row.domain) ?? 0) + 1);
    }
    for (const domain of [
      "d1",
      "d2",
      "d3",
      "d4",
      "d5",
      "d6",
      "d7",
      "d8",
      "d9",
      "d10",
      "interactive",
    ]) {
      expect(byDomain.get(domain) ?? 0, `domain ${domain} is absent`).toBeGreaterThan(0);
    }
    expect(byDomain.size).toBe(11);

    const byForm = new Map<string, number>();
    for (const row of ROWS) {
      byForm.set(row.answer_form, (byForm.get(row.answer_form) ?? 0) + 1);
    }
    expect(byForm.get("string") ?? 0).toBeGreaterThanOrEqual(590);
    expect(byForm.get("rational") ?? 0).toBeGreaterThanOrEqual(38);
    expect(byForm.get("prose") ?? 0).toBeGreaterThanOrEqual(20);

    // And the answer TYPES the graded rows reach, read off the regenerated items rather than
    // off the fixture, so a fixture claiming breadth it does not have fails here.
    const types = new Set<string>();
    for (const row of gradeable) {
      const template = BY_ID.get(row.template_id);
      if (!template) {
        continue;
      }
      types.add(
        generateFromTemplate(template, "practice", row.seed).answer.answer_spec.answer_type,
      );
    }
    // Named rather than counted. The interactive types are absent BY CONSTRUCTION — every
    // widget row in the solve is prose and excluded above — so a count would have been
    // satisfied by any seven and would not have said which seven.
    expect([...types].sort()).toEqual([
      "expression",
      "interval",
      "multiple_choice",
      "numeric",
      "point",
      "rational_answer",
      "solution_set",
    ]);
  });

  it("the prose exclusion is load-bearing, and the list fails both ways", () => {
    const proseInFixture = new Set(
      ROWS.filter((row) => row.answer_form === "prose").map((row) => row.template_id),
    );

    // Direction one: nothing is excluded that is not listed. A new prose row on an unlisted
    // template fails here rather than silently shrinking the sweep.
    const unlisted = [...proseInFixture].filter((id) => !PROSE_TEMPLATES.includes(id));
    expect(unlisted).toEqual([]);

    // Direction two: every listed template still HAS prose rows. An entry left behind after
    // its rows were regraded or its template renamed fails, so the list cannot excuse nothing.
    const excusingNothing = PROSE_TEMPLATES.filter((id) => !proseInFixture.has(id));
    expect(excusingNothing).toEqual([]);

    // And the REASON, which is what makes this an exemption rather than an omission: each
    // listed template really does answer with a widget payload. A listed template that becomes
    // a text item fails here and owes a real submission instead of an English description.
    const notInteractive: string[] = [];
    for (const id of PROSE_TEMPLATES) {
      const template = BY_ID.get(id);
      if (!template) {
        notInteractive.push(`${id} is not in the pool`);
        continue;
      }
      const row = ROWS.find((entry) => entry.template_id === id);
      const item = generateFromTemplate(template, "practice", row?.seed ?? 900000);
      if (!isInteractiveAnswerType(item.answer.answer_spec.answer_type)) {
        notInteractive.push(
          `${id} is ${item.answer.answer_spec.answer_type}, not interactive`,
        );
      }
    }
    expect(notInteractive).toEqual([]);
    expect(PROSE_TEMPLATES.length).toBeGreaterThanOrEqual(11);
  });
});
