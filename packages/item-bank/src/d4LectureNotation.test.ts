import { describe, expect, it } from "vitest";

import { toProductItemVersions } from "./bank";
import { D4_PRACTICE_ITEMS, D4_PRACTICE_TEMPLATES } from "./index";
import { type FrozenItem, generateFromTemplate, type ItemTemplate } from "./template";
import { PRODUCT_CHECKER_CONFIG } from "./validate";

/**
 * THE NOTATION THE LECTURE MODELS HAS TO BE GRADABLE ON THE PRACTICE IT LEADS INTO.
 *
 * `content/lessons/d4/POL.2.json`'s fifth worked example factors a perfect-square trinomial and
 * ends *"All three conditions hold, so the two sides are identical: $x^{2} + 20x + 100 =
 * (x + 10)^{2}$"*. That is the only spelling the lecture ever shows for a repeated factor.
 *
 * `d4.pol2.trinomial.l2` draws `p` and `q` independently from `[2, 9]`, so one draw in eight has
 * `p === q` and is keyed as a REPEATED BRACKET - `(x + 5)(x + 5)` - which is the same polynomial
 * written the other way. A learner who has just been taught the squared form and types it is
 * right, and whether they are told so is a property of the checker rather than of the key, so it
 * is measured here rather than assumed.
 *
 * Measured at this pin: the ASCII squared form a learner can actually type - `(x + 5)^2` - IS
 * graded correct, and that is what this guard pins. The LaTeX-braced `(x + 5)^{2}` is refused
 * `invalid_input/parse_error`, which is NOT asserted either way here: the practice answer field
 * speaks the ASCII grammar (`lesson-katex`), a learner reading a rendered superscript types a
 * bare caret, and a guard that demanded LaTeX of this checker would be pinning a form nobody
 * enters.
 *
 * ## Population
 *
 * Derived: every served item and every parameter-space draw whose KEY repeats a bracket,
 * whatever template produced it. Scoped by the shape of the answer rather than by the template
 * that happens to author it today, because the defect is possible wherever a key repeats a
 * factor and any D4 template may draw one - `d4.pol2.difference.l2` and `d4.pol2.leading.l3`
 * both key products of two brackets and neither is excluded from drawing the same one twice by
 * anything the guard can see.
 */

const DRAWS = 200;

/** A key that repeats one bracket exactly, which is the squared form written out. */
const REPEATED_BRACKET = /^\(([^()]+)\)\(\1\)$/;

function drawOne(template: ItemTemplate, seed: number): FrozenItem {
  return generateFromTemplate(template, "practice", seed);
}

interface Candidate {
  readonly item: FrozenItem;
  readonly inner: string;
  readonly where: string;
}

function candidates(): readonly Candidate[] {
  const found: Candidate[] = [];
  const seen = new Set<string>();
  const consider = (item: FrozenItem, where: string) => {
    const key = String(item.answer.answer_key);
    const inner = REPEATED_BRACKET.exec(key)?.[1];
    if (inner === undefined || seen.has(item.item_version_id)) {
      return;
    }
    seen.add(item.item_version_id);
    found.push({ item, inner, where });
  };
  for (const item of D4_PRACTICE_ITEMS) {
    consider(item, "served");
  }
  for (const template of D4_PRACTICE_TEMPLATES) {
    for (let index = 0; index < DRAWS; index += 1) {
      consider(drawOne(template, 880_000 + index), "parameter space");
    }
  }
  return found;
}

describe("a D4 key that repeats a bracket accepts the squared spelling the lecture models", () => {
  const population = candidates();

  it("finds the repeated-bracket keys the trinomial shape draws", () => {
    const byTemplate = new Map<string, number>();
    for (const candidate of population) {
      const label = `${candidate.item.template_id} (${candidate.where})`;
      byTemplate.set(label, (byTemplate.get(label) ?? 0) + 1);
    }
    const census = [...byTemplate].map(([label, count]) => `${label}: ${count}`).join(", ");
    // A floor, because every assertion below holds trivially over an empty population, and one
    // measured at the pin rather than at 1: 22 of the 200 draws of `d4.pol2.trinomial.l2` key a
    // repeated bracket (0 of the 175 SERVED items do, so the shape is latent on the frozen pool
    // and live on every fresh draw). A floor of 1 would survive the draw being narrowed to
    // almost nothing, which is the change that would quietly empty this sweep.
    expect(
      population.length,
      `repeated-bracket keys to grade, from ${D4_PRACTICE_ITEMS.length} served items and ${D4_PRACTICE_TEMPLATES.length * DRAWS} draws (${census})`,
    ).toBeGreaterThanOrEqual(20);
  }, 120_000);

  it("grades the squared spelling correct wherever the key repeats a bracket", () => {
    const items = population.map((candidate) => candidate.item);
    const checker = PRODUCT_CHECKER_CONFIG.checker(toProductItemVersions(items));
    const failures: string[] = [];
    let graded = 0;
    for (const candidate of population) {
      for (const spelling of [
        `(${candidate.inner})^2`,
        String(candidate.item.answer.answer_key),
      ]) {
        graded += 1;
        const result = checker({
          raw_answer: spelling,
          item_version_id: candidate.item.item_version_id,
          equivalence_checker_version: PRODUCT_CHECKER_CONFIG.checkerVersion,
        });
        if (result.status !== "correct") {
          failures.push(
            `${candidate.item.template_id} (${candidate.where}): "${spelling}" refused (${result.status}/${result.reason_code}) against the key ${String(candidate.item.answer.answer_key)} for prompt "${candidate.item.prompt}"`,
          );
        }
      }
    }
    expect(failures.join("\n")).toBe("");
    expect(graded, "spellings graded").toBeGreaterThanOrEqual(population.length * 2);
  }, 120_000);
});
