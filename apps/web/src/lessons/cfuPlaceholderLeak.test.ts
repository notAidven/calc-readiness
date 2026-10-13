/**
 * The example inside a check's answer field must not be an answer to the question above it (R30).
 *
 * ## Why this is a second file rather than a wider population in `answerFormat.test.ts`
 *
 * That file's leak sweep asks, per placeholder, whether the advertised example answers a SERVED
 * PRACTICE ITEM, and it exempts `NUMERIC_LITERAL_PLACEHOLDER` on the grounds that no practice item
 * is ever shown it (`shownFor: () => false`, and `UNREACHED` records the same exemption again).
 * Both statements are true. Their consequence was not: the one placeholder in the module that no
 * practice item sees is CFU-only, so the exemption removed from the sweep the only line whose
 * whole population is the check surface -- where it is shown every time. LIN.1's check was keyed
 * `7` under a field reading *"A single number, e.g. 7"*, and the guard could not see it.
 *
 * So the population here is the behaviour's: every question a check can put in front of a learner.
 * That is both kinds of instance, because a computed re-ask draws its own key and reads its
 * placeholder off that key's notation, so a rotation can walk onto the advertised example with
 * nothing authored to blame. RAT.6's re-ask had: keyed `4` under *"Every solution: 13 or {-1, 4}"*.
 *
 * ## Graded, not string-compared
 *
 * The claim is "typing this is marked correct", so it goes through {@link gradeCfuAnswer}, which is
 * the function `cfu.tsx` calls. A string comparison against `accepted` would miss the numeric path
 * entirely: LIN.1 grades through the shared checker, where `7` never appears in a list.
 */

import { describe, expect, it } from "vitest";

import { cfuPlaceholder } from "./answerFormat";
import { gradeCfuAnswer } from "./cfuChecker";
import { cfuInstances } from "./cfuVariants";
import { allLessons } from "./domains";
import type { LessonCfuSpec } from "./types";

const CHECKS = allLessons
  .filter((lesson) => lesson.cfu !== undefined)
  .map((lesson) => [lesson.node_id, lesson.cfu as LessonCfuSpec] as const);

/**
 * The strings a learner could copy out of a placeholder and type.
 *
 * Deliberately generous, because the failure mode of a narrow extractor is a leak that ships. The
 * whole line and its example tail are what a learner reads as "write it like this"; the tail's
 * comma- and `or`-separated pieces are what the multi-example lines offer
 * (`"2*x*sqrt(2*x), abs(x^5), |x^5|"`); and every bare number anywhere in the line is the case
 * this file exists for, since a numeric check's answer IS a bare number and `{-1, 4}` shows two.
 */
export function advertisedForms(placeholder: string): readonly string[] {
  const tail = placeholder.replace(/^.*?(?::|\be\.g\.)\s*/s, "");
  return [
    ...new Set([
      placeholder,
      tail,
      ...tail.split(/,\s(?=\S)|\s+or\s+/i).map((piece) => piece.trim()),
      ...(placeholder.match(/-?\d+(?:\.\d+)?(?:\/\d+)?/g) ?? []),
    ]),
  ].filter((form) => form.length > 0);
}

describe("no check's answer field advertises an answer to its own question", () => {
  it("sweeps every question every check can ask, and says how many", () => {
    const leaks: string[] = [];
    let instances = 0;
    let graded = 0;
    for (const [nodeId, cfu] of CHECKS) {
      cfuInstances(cfu).forEach((instance, index) => {
        instances += 1;
        const placeholder = cfuPlaceholder(cfu.check, instance.accepted);
        for (const form of advertisedForms(placeholder)) {
          graded += 1;
          if (gradeCfuAnswer({ nodeId, cfu, index, value: form }).correct) {
            leaks.push(
              `${nodeId} question ${index + 1}: the field reads ${JSON.stringify(placeholder)}, and typing ${JSON.stringify(form)} out of it is graded correct against the key "${instance.answerKey}"`,
            );
          }
        }
      });
    }
    // Floors under a sweep whose only positive assertion is an empty list. Every check serves an
    // authored question and at least one re-ask, so the instance count is at least twice the
    // number of checks, and a run that graded nothing would report the same empty list.
    expect(CHECKS.length, "the sweep found no checks").toBeGreaterThanOrEqual(39);
    expect(
      instances,
      "the sweep reached fewer questions than there are checks, so it is not covering the re-asks",
    ).toBeGreaterThanOrEqual(CHECKS.length * 2);
    expect(
      graded,
      "no candidate was graded, so the empty result means nothing",
    ).toBeGreaterThan(instances);
    expect(leaks.join("\n")).toBe("");
  });
});
