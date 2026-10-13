/**
 * A learner who types the multiplication sign the worked solution taught them is graded correct,
 * whether the root after it is spelled `sqrt(...)`, `\sqrt{...}` or `√`.
 *
 * ## The defect this was written for
 *
 * `docs/qa-d2-round-1.md` P2-3. RAD.1's accepted list took the asterisk beside the glyph
 * (`6*√2/5`) and LaTeX without one (`6\sqrt{2}/5`), and not the two together, while the last
 * step of its own worked solution is what teaches the asterisk: *"the beam measures
 * $\dfrac{6\sqrt{2}}{5}$ meters, typed `6*sqrt(2)/5`"*. The same node's generated re-ask
 * already accepted `6*\sqrt{6}/7`, so one habit was marked wrong and then right inside one
 * node. The round fixed it by adding two strings to the pack, and two strings in a JSON file
 * are readable as data and assert nothing: nothing in the tree said a learner typing them is
 * graded correct.
 *
 * ## Why the probes are derived from each pack's own list
 *
 * A written-down pair of strings would test RAD.1 and say nothing about the next pack to accept
 * a typeset root, and the habit is not RAD.1's: it belongs to any answer whose coefficient sits
 * directly against a root, in any domain. So the probe is a TRANSFORMATION over what each pack
 * ALREADY accepts. Where a pack accepts a coefficient written hard against a root, it owes the
 * same spelling with the asterisk the worked solutions teach, because a learner taught to type
 * `*` between a number and a root does not stop doing it when the root is typeset. Derived that
 * way the population needs no edit when a domain lands, and a pack that adds `4\sqrt{3}` and
 * forgets `4*\sqrt{3}` fails here rather than in front of a learner.
 *
 * Graded through `gradeCfuAnswer`, which is the function `cfu.tsx` calls on the typed value
 * (`cfu.tsx:369`), so this is the decision the learner meets and not a copy of it. The two
 * strings the round added are ALSO asserted literally at the bottom, because a derived
 * population is not a reason to stop checking the instance that was reported.
 *
 * ## What this can and cannot be evidence for
 *
 * RAD.1 carries no `check` block, so `gradeCfuAnswer` grades its authored question by
 * normalised membership of the accepted list. This file therefore pins the pack's DATA through
 * the real path rather than proving anything about the shared checker:
 * `normalizeAcceptedAnswer` only trims, lowercases and strips whitespace, so `6*\sqrt{2}/5` and
 * `6\sqrt{2}/5` are two different strings to it and the asterisk genuinely has to be listed.
 * That is also why the red is available: delete either entry the round added and the matching
 * assertion below fails.
 */

import { describe, expect, it } from "vitest";

import { gradeCfuAnswer } from "./cfuChecker";
import { allLessons } from "./domains";
import type { LessonCfuSpec } from "./types";

const CHECKS: readonly (readonly [string, LessonCfuSpec])[] = allLessons
  .filter((lesson) => lesson.cfu !== undefined)
  .map((lesson) => [lesson.node_id, lesson.cfu as LessonCfuSpec] as const);

/**
 * The two ways a root is typeset in an accepted spelling, beside the ASCII `sqrt(` that already
 * carries the asterisk everywhere. Both are matched only where a DIGIT sits directly against
 * them, which is where the asterisk would go.
 */
const ROOTS: readonly { readonly name: string; readonly pattern: RegExp }[] = [
  { name: "a LaTeX root", pattern: /(\d)(\\sqrt)/ },
  { name: "the root glyph", pattern: /(\d)(\u221a)/ },
];

interface Probe {
  nodeId: string;
  cfu: LessonCfuSpec;
  /** The spelling the pack already accepts. */
  from: string;
  /** The same spelling with the taught asterisk in it. */
  typed: string;
  root: string;
}

const PROBES: readonly Probe[] = CHECKS.flatMap(([nodeId, cfu]) =>
  cfu.accepted.flatMap((from) =>
    ROOTS.flatMap(({ name, pattern }) => {
      const match = pattern.exec(from);
      if (match === null) {
        return [];
      }
      const typed = from.replace(pattern, `${match[1]}*${match[2]}`);
      return typed === from ? [] : [{ nodeId, cfu, from, typed, root: name }];
    }),
  ),
);

/**
 * Probes whose coefficient is nested inside a bigger piece of notation, which this tree has
 * already decided a pack does not owe.
 *
 * These are not quietly filtered out, and they are not passing: both are REFUSED today.
 * They are named because the decision they turn on was made in another round and recorded in
 * `cfuAcceptanceConvention.test.tsx`, whose bar is closure over each pack's CANONICAL answer
 * and explicitly NOT closure over every accepted entry - *"it wants hundreds of further
 * spellings across these packs and most are cross-products no learner types"*. An asterisk
 * inside a `\frac` numerator, or inside a bracketed numerator that is itself inside a fraction,
 * is one of those cross-products: the top-level spellings are the habit, and RAD.1's canonical
 * `6*sqrt(2)/5` carries it.
 *
 * Asserted in both directions below, so this list cannot become permanent by neglect: an entry
 * whose base spelling leaves the pack fails, and an entry a pack starts accepting fails too and
 * has to be removed rather than left describing something that is no longer true.
 */
const NESTED_NOT_OWED: readonly { node: string; typed: string; reason: string }[] = [
  {
    node: "RAD.1",
    typed: "\\frac{6*\\sqrt{2}}{5}",
    reason:
      "the asterisk sits inside a \\frac numerator, which is the cross-product class cfuAcceptanceConvention.test.tsx declines to require: its bar is closure over the canonical answer, and RAD.1's canonical 6*sqrt(2)/5 already carries the asterisk habit at the top level.",
  },
  {
    node: "RAD.1",
    typed: "\\dfrac{6*\\sqrt{2}}{5}",
    reason:
      "the same nesting as the \\frac entry above, in the display-fraction spelling. notationVariants() in cfuAcceptanceConvention.test.tsx treats \\frac and \\dfrac as one rewrite, so the two stand or fall together and neither is owed by that file's bar.",
  },
  // `(6*√2)/5` was the third entry here and CAME OFF on 2026-08-05, at direction two of the
  // both-ways assertion below rather than by anyone reading the list: D4 QA round 2 widened the
  // authored ask to run the same speller as its own re-ask (`acceptedByForm` in `cfuChecker.ts`),
  // RAD.1 started accepting the bracketed spelling, and this file failed in CI saying so. It is
  // now in `OWED` and REQUIRED, which is the stronger claim, so the widening is held here as
  // behaviour rather than left as a decision somebody could quietly reverse. That is also the
  // second direction earning its keep: had the list only asserted membership, the entry would
  // have gone on excusing something that had stopped needing an excuse.
];

const isNested = (probe: Probe): boolean =>
  NESTED_NOT_OWED.some(
    (entry) => entry.node === probe.nodeId && entry.typed === probe.typed,
  );

/** The population that owes the property: every probe except the declared nestings. */
const OWED: readonly Probe[] = PROBES.filter((probe) => !isNested(probe));

/**
 * Floors, re-measured 2026-08-05: SEVEN probes across the tree, TWO of them declared above, so
 * FIVE owed - RAD.1's `6\sqrt{2}/5`, `6\sqrt2/5`, `6√2/5` and `(6*√2)/5`, and RAD.2's `1√10`.
 *
 * Small because the shape is rare, and floored for exactly that reason: a containment sweep
 * over five probes and one over none look identical from outside a count, and two of the five
 * are the fix this file exists to hold.
 *
 * `OWED_FLOOR` moved 4 -> 5 with the entry that came off the list, so the widening cannot be
 * undone by putting it back: re-declaring it as a nesting drops `OWED` to 4 and reds this floor.
 */
const PROBE_FLOOR = 6;
const OWED_FLOOR = 5;

/**
 * The strings the round added to `content/lessons/d2/RAD.1.json`, asserted by name.
 *
 * The derived sweep above catches their removal today. It would stop catching it if the
 * transformation ever drifted off this shape, and a fix quoted in a report should be checkable
 * without also trusting the derivation, so the instance is verified as well as the class.
 */
const RAD1_ADDED = ["6*\\sqrt{2}/5", "6*\\sqrt2/5"] as const;

const graded = (probe: Probe, value: string): boolean =>
  gradeCfuAnswer({ nodeId: probe.nodeId, cfu: probe.cfu, index: 0, value }).correct;

describe("a coefficient against a typeset root accepts the asterisk it was taught", () => {
  it("found the spellings to probe, and the declared nestings have not swallowed them", () => {
    expect(
      PROBES.length,
      `only ${PROBES.length} accepted spelling(s) in the tree put a digit hard against a typeset root, so the sweep below asserts almost nothing`,
    ).toBeGreaterThanOrEqual(PROBE_FLOOR);
    expect(
      OWED.length,
      "every probe in the tree is declared a nesting, so nothing below is actually required of anybody",
    ).toBeGreaterThanOrEqual(OWED_FLOOR);
  });

  it.each(OWED.map((probe) => `${probe.nodeId}: ${probe.from} -> ${probe.typed}`))(
    "%s is graded correct",
    (label) => {
      const probe = OWED.find(
        (each) => `${each.nodeId}: ${each.from} -> ${each.typed}` === label,
      );
      if (probe === undefined) {
        throw new Error(`no probe ${label}`);
      }
      // The pack's own spelling first: if THIS is refused the probe is not evidence about the
      // asterisk, and the failure should say so rather than blaming the rewrite.
      expect(
        graded(probe, probe.from),
        `${probe.nodeId} does not accept ${JSON.stringify(probe.from)}, which is in its own accepted list`,
      ).toBe(true);
      expect(
        graded(probe, probe.typed),
        `${probe.nodeId} accepts ${JSON.stringify(probe.from)} and refuses ${JSON.stringify(probe.typed)}, which is the same answer with ${probe.root} and the multiplication sign its worked solution teaches`,
      ).toBe(true);
    },
  );

  // A loop rather than `it.each`, because a list that emptied would emit no tests and the file
  // would report green over an inventory nobody is checking.
  it("every declared nesting is a real probe that is still refused", () => {
    const wrong: string[] = [];
    for (const entry of NESTED_NOT_OWED) {
      const probe = PROBES.find(
        (each) => each.nodeId === entry.node && each.typed === entry.typed,
      );
      // Direction one: an entry whose base spelling has left the pack, or whose shape no longer
      // derives, cannot sit here forever exempting nothing.
      if (probe === undefined) {
        wrong.push(
          `${entry.node} declares ${JSON.stringify(entry.typed)} a nesting, but no accepted spelling in that pack derives it any more`,
        );
        continue;
      }
      if (entry.reason.length <= 60) {
        wrong.push(`${entry.node} ${entry.typed}: the reason is too short to act on`);
      }
      // Direction two: a pack that starts accepting one has to take it off this list, or the
      // list goes on excusing something that has stopped needing an excuse and hides the next
      // spelling that arrives.
      if (graded(probe, entry.typed)) {
        wrong.push(
          `${entry.node} now accepts ${JSON.stringify(entry.typed)}, so it is no longer a nesting this file declines to require and must come off the list`,
        );
      }
    }
    expect(wrong.join("\n")).toBe("");
  });
});

describe("RAD.1 grades the two spellings the round added to it", () => {
  const rad1 = CHECKS.find(([nodeId]) => nodeId === "RAD.1");

  it("RAD.1 is still a check in the tree", () => {
    expect(rad1, "RAD.1 has no CFU, so the two assertions below cannot run").not.toBe(
      undefined,
    );
  });

  it.each(RAD1_ADDED)("%s is graded correct on RAD.1's own question", (value) => {
    if (rad1 === undefined) {
      throw new Error("no RAD.1 check");
    }
    expect(
      gradeCfuAnswer({ nodeId: "RAD.1", cfu: rad1[1], index: 0, value }).correct,
      `a learner typing ${JSON.stringify(value)} on RAD.1's check is marked wrong, though the same node's re-ask accepts the asterisk beside a LaTeX root and its worked solution's last step is what teaches the asterisk`,
    ).toBe(true);
  });
});
