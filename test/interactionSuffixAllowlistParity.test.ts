/**
 * **THE DOCUMENTED SUFFIX LIST AND THE ENFORCED ONE ARE THE SAME LIST.**
 *
 * An interactive visual id has to end in an interaction-suffix word, and that allowlist
 * exists twice: as `INTERACTION_KINDS` plus `KIND_ALIASES` in
 * `.cursor/skills/author/scripts/validate-lesson-pack.mjs`, which is what REJECTS a pack,
 * and as prose in `.cursor/skills/author/reference.md`, which is what an author READS
 * before naming a widget. Nothing has ever tied the two together.
 *
 * That is not a hypothetical. The validator's own comment on `INTERACTION_KINDS` records
 * that the list "is a UNION of three versions of this file that diverged on the same
 * line", and says why the divergence was expensive: a dropped entry re-fails packs that
 * already ship, and does it twice over, because a rejected id also costs its slide the
 * gating visual it does in fact have. Three copies drifted once. The doc is the fourth
 * copy, and it is the one an author acts on, so a doc that quietly falls behind sends
 * someone to name a widget in a way the gate will refuse.
 *
 * ## Set equality both directions, because containment is free
 *
 * Per `.cursor/rules/qa-verification.mdc`: a containment assertion passes trivially over
 * an empty parse, and an empty parse is exactly what a reworded document produces. So the
 * population is asserted as a partition, and each direction catches a different drift:
 *
 *  - **a suffix the validator accepts but the doc omits** leaves an author unaware of a
 *    spelling that works, which is how `-build` came to be reached for and then flagged;
 *  - **a suffix the doc promises but the validator rejects** is the expensive direction:
 *    the author follows the document and the gate refuses the pack.
 *
 * Both are floored, so a parse that finds nothing fails instead of passing. The parse
 * anchors are asserted individually as well, so a reword fails where it broke rather than
 * silently narrowing the comparison to the empty set.
 *
 * The alias MAPPING is asserted too, not just the alias's existence. `-build` resolving to
 * `builder` rather than standing as its own kind is a load-bearing detail: admitted as its
 * own kind it would score one archetype as two and inflate the R11 variety spread the
 * validator measures. A doc that promoted it to a kind of its own would be describing a
 * different rule.
 *
 * Verified by injection rather than argued: deleting one suffix from `reference.md` fails
 * the doc-side direction naming that suffix, and adding an invented one fails the
 * validator-side direction naming it.
 */

import { readFileSync } from "node:fs";
import { posix } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const repoRoot = resolveRepoRoot();

const VALIDATOR_PATH = ".cursor/skills/author/scripts/validate-lesson-pack.mjs";
const REFERENCE_PATH = ".cursor/skills/author/reference.md";

/**
 * The lists stood at seventeen kinds and one alias when this guard was written. A floor,
 * not a census: a new interaction shape is meant to grow both sides at once, and this
 * number should never need to move for that. What it is FOR is the parse resolving to
 * nothing, where set equality over two empty sets is green.
 */
const MIN_KINDS = 17;

function read(path: string): string {
  return readFileSync(posix.join(repoRoot, path), "utf8");
}

/** `INTERACTION_KINDS` as the validator actually declares it. */
function validatorKinds(source: string): string[] {
  const block = /const INTERACTION_KINDS = \[([\s\S]*?)\];/.exec(source);
  expect(
    block,
    `could not find the INTERACTION_KINDS array in ${VALIDATOR_PATH}; if it was renamed or reshaped, repoint this parser`,
  ).not.toBeNull();
  return [...(block?.[1] ?? "").matchAll(/"([a-z]+)"/g)].map((m) => m[1] as string);
}

/** `KIND_ALIASES` as the validator declares it, as spelling -> kind it resolves to. */
function validatorAliases(source: string): Map<string, string> {
  const block = /const KIND_ALIASES = new Map\(\[([\s\S]*?)\]\);/.exec(source);
  expect(
    block,
    `could not find the KIND_ALIASES map in ${VALIDATOR_PATH}; if it was renamed or reshaped, repoint this parser`,
  ).not.toBeNull();
  const pairs = [...(block?.[1] ?? "").matchAll(/\["([a-z]+)",\s*"([a-z]+)"\]/g)];
  return new Map(pairs.map((m) => [m[1] as string, m[2] as string]));
}

/**
 * The suffix words `reference.md` enumerates, read from the sentence that lists them.
 *
 * Scoped to that sentence deliberately. The surrounding section also mentions `-ltr` as an
 * example of a trailing VARIANT, and the kind-vs-suffix table above it names suffixes in
 * another context; a sweep of every backticked `-word` in the file would collect both and
 * compare the wrong set. The anchor is the enumeration itself: everything between the
 * colon after "suffix words" and the full stop that closes the list.
 */
function documentedKinds(reference: string): string[] {
  const sentence = /suffix words[^:]*:([^.]*)\./.exec(reference);
  expect(
    sentence,
    `could not find the "ends in one of these suffix words: ..." enumeration in ${REFERENCE_PATH}; if the section was reworded, repoint this parser`,
  ).not.toBeNull();
  return [...(sentence?.[1] ?? "").matchAll(/`-([a-z]+)`/g)].map((m) => m[1] as string);
}

/** The alias `reference.md` documents, as spelling -> kind it says it counts as. */
function documentedAliases(reference: string): Map<string, string> {
  const pairs = [
    ...reference.matchAll(/`-([a-z]+)` is\s+accepted as a spelling of `-([a-z]+)`/g),
  ];
  return new Map(pairs.map((m) => [m[1] as string, m[2] as string]));
}

const validatorSource = read(VALIDATOR_PATH);
const referenceSource = read(REFERENCE_PATH);

const enforcedKinds = validatorKinds(validatorSource);
const enforcedAliases = validatorAliases(validatorSource);
const docKinds = documentedKinds(referenceSource);
const docAliases = documentedAliases(referenceSource);

/** Everything the validator's suffix regex will accept, which is what the doc must promise. */
const enforced = new Set([...enforcedKinds, ...enforcedAliases.keys()]);
const documented = new Set([...docKinds, ...docAliases.keys()]);

describe("the interaction-suffix allowlist cannot drift from its documentation", () => {
  it("both sides parsed to a non-empty list", () => {
    // The floor under the two set assertions below. Without it a reworded document or a
    // reshaped array parses to nothing and the partition holds vacuously.
    expect(
      enforcedKinds.length,
      `parsed fewer than ${MIN_KINDS} kinds out of ${VALIDATOR_PATH}`,
    ).toBeGreaterThanOrEqual(MIN_KINDS);
    expect(
      docKinds.length,
      `parsed fewer than ${MIN_KINDS} suffix words out of ${REFERENCE_PATH}`,
    ).toBeGreaterThanOrEqual(MIN_KINDS);
    expect(
      enforcedAliases.size,
      `parsed no aliases out of ${VALIDATOR_PATH}, so the alias comparison below would be vacuous`,
    ).toBeGreaterThan(0);
  });

  it("every suffix the validator accepts is documented", () => {
    const undocumented = [...enforced].filter((k) => !documented.has(k)).sort();
    expect(
      undocumented,
      `${VALIDATOR_PATH} accepts these suffixes but ${REFERENCE_PATH} does not list them, so an author cannot know they work: ${undocumented.map((k) => `-${k}`).join(", ")}`,
    ).toEqual([]);
  });

  it("every documented suffix is one the validator accepts", () => {
    const unenforced = [...documented].filter((k) => !enforced.has(k)).sort();
    expect(
      unenforced,
      `${REFERENCE_PATH} promises these suffixes but ${VALIDATOR_PATH} would reject an id ending in them, and a pack named from the document would fail the gate: ${unenforced.map((k) => `-${k}`).join(", ")}`,
    ).toEqual([]);
  });

  it("the documented alias resolves to the same kind the validator resolves it to", () => {
    // Not merely that the alias is mentioned. An alias promoted to a kind of its own would
    // inflate the R11 variety spread, so which kind it collapses into is the claim.
    expect(
      Object.fromEntries([...docAliases].sort()),
      `${REFERENCE_PATH} and ${VALIDATOR_PATH} disagree about what the alias suffixes count as`,
    ).toEqual(Object.fromEntries([...enforcedAliases].sort()));
  });

  it("an alias is not also declared as a kind of its own", () => {
    // The inflation the alias exists to avoid, asserted on the validator side where it
    // would take effect.
    const both = [...enforcedAliases.keys()].filter((a) => enforcedKinds.includes(a));
    expect(
      both,
      `these are declared both as an alias and as a kind in ${VALIDATOR_PATH}, so they would score as two archetypes: ${both.join(", ")}`,
    ).toEqual([]);
  });
});
