import { hashItemDefinition } from "./schema";
import { generateFromTemplate, type ItemTemplate } from "./template";

/**
 * **TEMPLATES DELIBERATELY PINNED TO ONE INSTANCE FOR A DEMONSTRATION. THE LIST IS EMPTY, AND
 * EMPTY IS ITS RESTING STATE.**
 *
 * A pinned template's `generate()` ignores its `rng` and returns a single instance, so that the
 * problem on screen is a known one — a page that has been photographed, or a slide that has to
 * show the same numbers twice. That is a degenerate generator, and the depth and variety guards
 * across this package and the web lane are right to report it: reveal-to-retry on that slot has
 * nothing distinct to hand back.
 *
 * The list held `d3.lin3.kerb-width.l1` for the scripted work-checker demonstration. That
 * demonstration is over and both halves of it are gone, so the list is empty and every guard that
 * derives a floor from it is back at full strength on its own. What survives is the mechanism,
 * because the next demonstration should reach for this rather than loosen an assertion.
 *
 * ## WHY A NAMED LIST RATHER THAN A LOOSENED ASSERTION
 *
 * The guards could each be widened to accept a shortfall. That is the same edit spelled as a
 * weakening, and it goes on accepting a shortfall for every other template, forever, long after
 * the demonstration. A template that does not owe the property and a template that lost it by
 * accident look identical from outside a guard, so an exemption is NAMED and asserted in BOTH
 * directions by `describe("the demonstration pin", ...)` in `d3.test.ts`:
 *
 *  - every id listed here must still BE degenerate, so reverting a pin fails at the exemption and
 *    the list cannot outlive the thing it excuses;
 *  - every template NOT listed here must still be varied, so a template going degenerate fails
 *    there rather than hiding behind a precedent this list appears to set.
 *
 * With the list empty the second direction sweeps the whole pool, which is the strongest this
 * pair ever is, and the first has nothing to say until something is added back.
 *
 * ## SCOPE
 *
 * Content only. Nothing here excuses an item from being gradable, self-validating, or registered:
 * a pinned template still freezes a real item and the checker still owns it. What is excused is
 * exactly the claim a demonstration pin makes false, which is that the template can fill a cell
 * with more than one distinct question.
 */
export const DEMO_PINNED_TEMPLATE_IDS: readonly string[] = [];

/** Whether `templateId` is pinned to one instance for a demonstration. */
export function isDemoPinned(templateId: string): boolean {
  return DEMO_PINNED_TEMPLATE_IDS.includes(templateId);
}

/**
 * Whether `template` draws the SAME item whatever seed it is given, which is what a demonstration
 * pin does and what every depth guard is really asking about.
 *
 * Compares `hashItemDefinition` over a spread of seeds rather than the rendered prompt, because
 * that is the identity `buildPool` and `buildVariants` deduplicate on: a template varying only in
 * a field outside the hash is degenerate as far as they are concerned, and should read as
 * degenerate here too. The seed base is disjoint from the pool's (110000) and the variants'
 * (111000) so this observes the generator rather than re-observing a frozen pool.
 */
export function drawsOneInstanceOnly(template: ItemTemplate, samples = 24): boolean {
  const seen = new Set<string>();
  for (let index = 0; index < samples; index += 1) {
    seen.add(
      hashItemDefinition(generateFromTemplate(template, "practice", 990_000 + index)),
    );
    if (seen.size > 1) {
      return false;
    }
  }
  return true;
}
