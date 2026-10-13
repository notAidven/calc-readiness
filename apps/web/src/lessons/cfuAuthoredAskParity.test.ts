/**
 * The AUTHORED ask grades a spelling of its own answer exactly as its re-ask would.
 *
 * ## The defect this was written for
 *
 * `cfuVariantGrading.test.ts` closed one half of this: a re-ask must be no stricter than the
 * authored question it replaces. The mirror image was never asserted, and it was false on every
 * D4 pack. `LessonCfuCheck.answer_type` is `"numeric" | "expression"` only, so a solution-set
 * CFU cannot carry a `check` block at all; with no check block `gradeCfuAnswer` graded the
 * authored ask by string membership against the literal strings someone typed into the pack
 * JSON, while the re-ask beside it is graded against a COMPUTED list holding every
 * equivalence-preserving spelling of its own answer. The strict grader sat on attempt one and
 * the generous one on the retry: POL.3 accepted 4 of the 48 spellings its own re-ask machinery
 * generates and POL.4 accepted 18 of 168, so `-7; 5` and `-4, \dfrac{3}{2}` were marked wrong
 * first and right second.
 *
 * ## Why the population is every pack that serves a re-ask, in every domain
 *
 * Not "the five D4 packs", and not "every pack with no check block". The behaviour is a pack
 * grading ONE answer by TWO graders, and that is exactly a pack whose resolved instance list is
 * longer than one: the authored ask reaches one path and the computed instance beside it reaches
 * the other. Nothing about it was authored by D4 — measured below, 32 packs across nine domains
 * had it — so the population is derived from `cfuInstances` over the all-domains registry,
 * called the way `cfu.tsx` calls it (the pack's own `cfu` object, so the resolver's cache and
 * its rejection loop are the ones the card runs) rather than written down.
 *
 * ## Why the owed spellings are GENERATED rather than listed
 *
 * A written-down list of spellings is a guess about what the re-ask allows. The re-ask's list is
 * not a guess: it is `cfuAcceptedForms.ts` run over the parameters the instance was drawn from.
 * So the owed set is that same speller run over the AUTHORED question's parameters — the same
 * family of spellings, evaluated at the answer the learner is looking at. The transport is
 * recomputed here rather than imported from `cfuAuthoredSpellings`, so this does not take the
 * fix's word for its own population: a fix that narrowed its resolution would redden here.
 *
 * Two things are subtracted from that set, and both are subtractions rather than exemptions:
 *
 *  - a speller whose output does not contain the pack's own answer is spelling a DIFFERENT
 *    answer, so nothing it emits is owed by anybody. `NUM.2` is the live case and it is named
 *    below rather than filtered silently, because a pack that starts spelling a different answer
 *    and a pack whose params schema never matched look identical from here;
 *  - a spelling refused by one of `gradeCfuAnswer`'s two ASK-INDEPENDENT gates is not evidence
 *    of asymmetry, because those gates read only the `check` block and the typed value and so
 *    fire on both asks alike. They are detected rather than reimplemented: a refusal carrying a
 *    NOTE came from a gate, and a refusal carrying none came from the membership decision this
 *    file is about.
 */

import { describe, expect, it } from "vitest";

import { normalizeAcceptedAnswer } from "./answerFormat";
import { checkCfuThroughChecker, gradeCfuAnswer } from "./cfuChecker";
import { cfuInstances, cfuSpell } from "./cfuVariants";
import { allLessons } from "./domains";
import type { LessonCfuSpec } from "./types";

interface Pack {
  nodeId: string;
  cfu: LessonCfuSpec;
  /** Every spelling the re-ask machinery generates for the AUTHORED answer. */
  generated: readonly string[];
  authoredKey: string;
  /** The index of the first computed instance, used to probe the ask-independent gates. */
  reAskIndex: number;
}

/**
 * Every pack that puts one answer in front of two graders: an authored ask, and at least one
 * computed instance beside it.
 */
const SERVES_RE_ASK: readonly Pack[] = allLessons.flatMap((lesson) => {
  const cfu = lesson.cfu;
  if (cfu === undefined) {
    return [];
  }
  const reAskIndex = cfuInstances(cfu).findIndex((instance) => !instance.authored);
  if (reAskIndex === -1) {
    return [];
  }
  return [
    {
      nodeId: lesson.node_id,
      cfu,
      generated: generatedSpellings(cfu),
      authoredKey: cfu.check?.answer_key ?? cfu.accepted[0] ?? "",
      reAskIndex,
    },
  ];
});

/**
 * The authored answer, spelled by the speller its re-ask uses.
 *
 * The template is the one the pack's own parameters are in the schema of — a pack may point its
 * authored figure at a sibling template, and `worked_solution_params` then describes that
 * sibling — and the key is the authored answer the reveal prints.
 */
function generatedSpellings(cfu: LessonCfuSpec): readonly string[] {
  const templateId = cfu.worked_solution_template ?? cfu.variants?.template_id;
  const params = cfu.worked_solution_params;
  if (templateId === undefined || params === undefined) {
    return [];
  }
  const key = cfu.check?.answer_key ?? cfu.accepted[0] ?? "";
  return cfuSpell(templateId, { ...params }, key) ?? [];
}

function spellsItsOwnAnswer(pack: Pack): boolean {
  const key = normalizeAcceptedAnswer(pack.authoredKey);
  return pack.generated.some((form) => normalizeAcceptedAnswer(form) === key);
}

/**
 * A pack whose declared parameters are not in its speller's schema, so the speller cannot be
 * pointed at the pack's own answer.
 *
 * `worked_solution_params` is in the FIGURE's schema and a speller reads the TEMPLATE's drawn
 * params. Those usually coincide; on these five they do not, and the symptom is either no forms
 * at all or the forms of a different answer. Both mean the same thing — the parity claim is
 * UNMEASURED on this pack, and its authored ask keeps whatever its typed list gives it — so both
 * belong on one list.
 *
 * Named, with the reason, rather than filtered out: `qa-verification.mdc` is explicit that a
 * member which does not owe the property and a member that forgot it are indistinguishable from
 * outside the guard. Asserted in three directions below, one of which is the one that bounds the
 * exposure: an exempted pack has to carry a `check` block, so its authored ask still reaches the
 * equivalence checker rather than sitting behind a typed list with nothing behind it.
 */
const PARAMS_NOT_IN_SPELLER_SCHEMA: readonly { node: string; reason: string }[] = [
  {
    node: "NUM.2",
    reason:
      "cfu.num2.precedence-chain spells integerForms(params.value), and NUM.2's worked_solution_params name lead, factor, base and power for its figure, so the speller reads no value and spells 0 against an answer of -3.",
  },
  {
    node: "NUM.4",
    reason:
      "cfu.num4.unlike-term spells squarePlusLinearForms(params.total, ...), and NUM.4's figure params name varIndex, negative and positive, so the linear coefficient reads 0 and the speller returns nothing.",
  },
  {
    node: "LIN.1",
    reason:
      "LIN.1 points its authored figure at d3.lin1.both-sides.l2 while its re-ask draws d3.lin1.balance-word.l2, and the figure params (a, b, right, d, x0, gathered) are not the ones that template's speller reads, so nothing is generated for a key of 9.",
  },
  {
    node: "RAT.6",
    reason:
      "d5.rat6.forge.l3's speller reads the drawn roots and the extraneous candidate, where RAT.6's figure params name p, r, a and b, so no roster is generated for a key of 3.",
  },
  {
    node: "LF.4",
    reason:
      "d7.lf4.elimination.l3's speller reads the drawn solution, where LF.4's figure params name both equations' coefficients plus m1, m2 and keepX, so no point is generated for a key of (2, -3).",
  },
];

const EXEMPT = new Set(PARAMS_NOT_IN_SPELLER_SCHEMA.map((entry) => entry.node));

/**
 * The subset of that list which is NOT merely unmeasured but actually exposed, and which is
 * therefore an open finding rather than an exemption.
 *
 * A pack that cannot be spelled but carries a `check` block still grades its authored ask through
 * the equivalence checker, so it is generous by another route and the missing spellings cost a
 * learner nothing. These three carry no check block, so their authored ask is graded by the
 * strings someone typed and nothing else -- which is the D4 defect, on three nodes in three other
 * domains. They are named here rather than left inside the exemption above because the two states
 * are worth different things to a reader: one is a gap in a guard, and this is a defect the guard
 * has found and cannot fix.
 *
 * Not fixed here, and the reason is ownership rather than difficulty: closing it means either
 * teaching each speller to read its pack's figure params or giving the pack a second params block,
 * and the five packs live in `content/lessons/d1`, `d3`, `d5` and `d7`, which this round's D4 lane
 * does not own. Reported in the round's write-up. The list is asserted both ways and floored, so
 * it cannot grow quietly and cannot go on excusing a pack that has been fixed.
 */
const REPORTED_AND_UNMEASURED: readonly string[] = ["NUM.4", "RAT.6", "LF.4"];

/** The measured population: a pack whose speller genuinely spells the pack's own answer. */
const MEASURED = SERVES_RE_ASK.filter((pack) => spellsItsOwnAnswer(pack));

/** The half of it where the string-membership path alone grades the authored ask. */
const CHECKLESS = MEASURED.filter((pack) => pack.cfu.check === undefined);

/**
 * Floors, and one of them is about SHAPE rather than size.
 *
 * A floor on the whole population only says the sweep found something. The defect lives on the
 * packs carrying NO check block, because those are the ones whose authored ask has nothing
 * behind its typed list, so that subset is floored separately: a population that drifted back to
 * nothing but checked packs would clear a size floor while measuring none of the behaviour
 * again. Measured at `68c5aa9a`: 32 packs, 15 of them check-less, 32,000-odd spellings.
 *
 * ## Why the check-less floor came DOWN, and gained a partner
 *
 * The CFU migration moved ten packs onto the shared checker, so the check-less half fell from
 * 30-odd to 26 by doing the thing it was supposed to do. Lowering a floor to accommodate a
 * shrink is normally how a guard is quietly retired, and the reason it is not that here is the
 * floor underneath it: the check-less half is no longer the only half worth measuring, because
 * the sweep now meets both grading paths, and a population that drifted to ALL checked packs
 * would have cleared the old floor's intent as badly as one that drifted to none. So the
 * one-sided floor is now two-sided. Between them the shape is pinned from both ends: neither
 * path can empty out, and neither can swallow the population.
 */
const PACK_FLOOR = 50;
const CHECKLESS_FLOOR = 25;
const CHECKED_FLOOR = 5;
const OWED_FLOOR = 28_000;

describe("an authored ask is no stricter than its own re-ask", () => {
  it("the sweep found packs serving a re-ask, and the check-less ones among them", () => {
    // Collected rather than asserted one at a time, so forcing this red prints every count at
    // once instead of stopping at the first shortfall.
    const owed = MEASURED.reduce((total, pack) => total + pack.generated.length, 0);
    const short: string[] = [];
    if (MEASURED.length < PACK_FLOOR) {
      short.push(
        `only ${MEASURED.length} packs serve a computed re-ask and spell their own answer, under the floor of ${PACK_FLOOR}, so everything below is close to vacuous`,
      );
    }
    if (CHECKLESS.length < CHECKLESS_FLOOR) {
      short.push(
        `only ${CHECKLESS.length} of them carry no check block, under the floor of ${CHECKLESS_FLOOR}: the population has drifted off the SHAPE the defect lives on, whatever its size`,
      );
    }
    if (MEASURED.length - CHECKLESS.length < CHECKED_FLOOR) {
      short.push(
        `only ${MEASURED.length - CHECKLESS.length} of them carry a check block, under the floor of ${CHECKED_FLOOR}: the sweep has drifted onto the string-membership path alone and says nothing about the checker one`,
      );
    }
    if (owed < OWED_FLOOR) {
      short.push(
        `only ${owed} generated spellings are owed across ${MEASURED.length} packs, under the floor of ${OWED_FLOOR}`,
      );
    }
    // The exception list cannot grow until it has swallowed the population.
    if (PARAMS_NOT_IN_SPELLER_SCHEMA.length >= MEASURED.length / 4) {
      short.push(
        `the schema-mismatch exemption holds ${PARAMS_NOT_IN_SPELLER_SCHEMA.length} of ${MEASURED.length} packs, which is no longer an exception`,
      );
    }
    expect(short.join("\n")).toBe("");
  });

  it("a declared exception still exists, still cannot be spelled, and is still bounded", () => {
    const wrong: string[] = [];
    for (const { node, reason } of PARAMS_NOT_IN_SPELLER_SCHEMA) {
      const pack = SERVES_RE_ASK.find((entry) => entry.nodeId === node);
      // Direction one: an entry that stops qualifying fails, so a renamed, deleted or
      // no-longer-re-asking pack cannot sit here exempting nothing.
      if (pack === undefined) {
        wrong.push(`${node} is exempted but is not a pack serving a re-ask`);
        continue;
      }
      // Direction two: an exempted pack whose speller starts spelling its own answer has
      // adopted the property and has to come off the list, or the list goes on excusing
      // something it has stopped describing.
      if (spellsItsOwnAnswer(pack)) {
        wrong.push(
          `${node} now spells its own answer ${JSON.stringify(pack.authoredKey)}, so it belongs in the measured population and not in the exemption list`,
        );
      }
      // Direction three, which is what bounds the exemption rather than merely maintaining it:
      // an unmeasurable pack whose authored ask reaches the equivalence checker is generous
      // anyway, and one with no check block is graded by a typed list with nothing behind it,
      // which is the whole defect. So the second kind may not be excused quietly -- it has to be
      // on the reported list, where a reader can see it is a finding and not a gap.
      if (pack.cfu.check === undefined && !REPORTED_AND_UNMEASURED.includes(node)) {
        wrong.push(
          `${node} is exempted from the parity sweep AND carries no check block, so its authored ask is graded by its typed list alone and nothing measures it`,
        );
      }
      if (reason.length <= 80) {
        wrong.push(`${node}'s reason is too short to act on`);
      }
    }
    expect(wrong.join("\n")).toBe("");
  });

  it("the reported-and-unmeasured list is a subset of the exemption and still describes it", () => {
    const wrong: string[] = [];
    for (const node of REPORTED_AND_UNMEASURED) {
      // A reported entry has to be one of the exempted packs, or the two lists have come apart
      // and this one is naming something the sweep is not excusing.
      if (!EXEMPT.has(node)) {
        wrong.push(
          `${node} is reported as unmeasured but is not on the schema-mismatch exemption, so the two lists disagree about what is excused`,
        );
        continue;
      }
      const pack = SERVES_RE_ASK.find((entry) => entry.nodeId === node);
      if (pack === undefined) {
        wrong.push(`${node} is reported as unmeasured but is not a pack serving a re-ask`);
        continue;
      }
      // The other direction: a pack that acquires a check block, or becomes spellable, has
      // stopped being exposed and has to come off, or this list goes on reporting a defect the
      // tree no longer has and hides the next one.
      if (pack.cfu.check !== undefined) {
        wrong.push(
          `${node} now carries a check block, so its authored ask reaches the equivalence checker and it is no longer exposed`,
        );
      }
      if (spellsItsOwnAnswer(pack)) {
        wrong.push(
          `${node} is now spellable, so it is measured by the parity sweep and must come off the reported list`,
        );
      }
    }
    // And a floor, so the reported hole cannot grow into the population it is an exception to.
    if (REPORTED_AND_UNMEASURED.length > 3) {
      wrong.push(
        `${REPORTED_AND_UNMEASURED.length} packs are now reported as unmeasured and check-less, up from the 3 measured at 68c5aa9a: the hole is growing rather than closing`,
      );
    }
    expect(wrong.join("\n")).toBe("");
  });

  it("no unexempted pack's speller fails to spell the pack's own answer", () => {
    const wrong = SERVES_RE_ASK.filter(
      (pack) => !spellsItsOwnAnswer(pack) && !EXEMPT.has(pack.nodeId),
    ).map(
      (pack) =>
        `${pack.nodeId}: the speller's ${pack.generated.length} forms do not include the pack's own answer ${JSON.stringify(pack.authoredKey)}, so the parity claim is unmeasured on it`,
    );
    expect(wrong.join("\n")).toBe("");
  });

  it("every spelling the re-ask machinery generates, the authored ask accepts", () => {
    const stricter: string[] = [];
    let graded = 0;
    for (const pack of MEASURED) {
      const refused: string[] = [];
      let owed = 0;
      for (const form of pack.generated) {
        // An ask-independent gate refuses this shape on both asks, so its refusal on the
        // authored ask is not the asymmetry this file is about. Detected through the real
        // grading path rather than reimplemented: a refusal carrying a note came from a gate.
        // Probed only where a check block exists, since the gates read `check` and there is
        // nothing for them to fire on without one.
        if (pack.cfu.check !== undefined) {
          const onReAsk = gradeCfuAnswer({
            nodeId: pack.nodeId,
            cfu: pack.cfu,
            index: pack.reAskIndex,
            value: form,
          });
          if (!onReAsk.correct && onReAsk.note !== null) {
            continue;
          }
        }
        owed += 1;
        graded += 1;
        if (
          !gradeCfuAnswer({ nodeId: pack.nodeId, cfu: pack.cfu, index: 0, value: form })
            .correct
        ) {
          refused.push(form);
        }
      }
      if (refused.length > 0) {
        stricter.push(
          `${pack.nodeId}: the authored ask accepts ${owed - refused.length} of the ${owed} spellings its own re-ask machinery generates for ${JSON.stringify(pack.authoredKey)}; it refuses ${JSON.stringify(refused.slice(0, 4))}`,
        );
      }
    }
    expect(stricter.join("\n")).toBe("");
    expect(graded, `${graded} spellings were graded`).toBeGreaterThanOrEqual(OWED_FLOOR);
    // 30,000 grades run in about six seconds on an idle machine and have been seen to take
    // twenty on a loaded one, so the budget is named rather than left at the 20s default: a
    // sweep this wide should fail on what it measures, not on who else is building.
  }, 180_000);

  it("every string a pack itself lists as accepted grades correct on its own authored ask", () => {
    // The narrowest possible statement of the same claim, and it is the one that says the fix
    // reaches a checked pack too: before it, the authored ask of a pack carrying a check block
    // consulted no list at all, so a spelling the author had written down by hand could still
    // be refused by the checker beside it.
    const refused: string[] = [];
    let graded = 0;
    for (const pack of SERVES_RE_ASK) {
      for (const form of pack.cfu.accepted) {
        graded += 1;
        if (
          !gradeCfuAnswer({ nodeId: pack.nodeId, cfu: pack.cfu, index: 0, value: form })
            .correct
        ) {
          refused.push(
            `${pack.nodeId}: its own accepted list holds ${JSON.stringify(form)} and its authored ask refuses it`,
          );
        }
      }
    }
    expect(refused.join("\n")).toBe("");
    expect(graded, `${graded} authored spellings were graded`).toBeGreaterThanOrEqual(100);
  });

  it("POL.4's authored ask takes the decimal and the brace in any combination", () => {
    const pol4 = SERVES_RE_ASK.find((pack) => pack.nodeId === "POL.4");
    expect(pol4, "POL.4 no longer serves a re-ask").toBeDefined();
    const refused = [
      "-4, 1.5",
      "{-4, 3/2}",
      "{-4, 1.5}",
      "{1.5, -4}",
      "-4, \\dfrac{3}{2}",
      "-4.0, 1.5",
      "-4; 3/2",
      "-4 and 3/2",
    ]
      .filter(
        (value) =>
          !gradeCfuAnswer({
            nodeId: "POL.4",
            cfu: (pol4 as Pack).cfu,
            index: 0,
            value,
          }).correct,
      )
      .map((value) => `POL.4's authored ask refuses ${JSON.stringify(value)}`);
    expect(refused.join("\n")).toBe("");
  });

  it("widening the spelling does not widen the answer", () => {
    const wrong: string[] = [];
    // Round 1's P2-5: POL.3's prompt asks for every solution and says so, so a learner who
    // gives only the root that measures ground is wrong and must stay wrong.
    const pol3 = SERVES_RE_ASK.find((pack) => pack.nodeId === "POL.3");
    expect(pol3, "POL.3 no longer serves a re-ask").toBeDefined();
    for (const value of ["5", "{5}", "x = 5", "5 only", "-7", "{-7}", "[-7, 5]", "-7, 4"]) {
      if (
        gradeCfuAnswer({ nodeId: "POL.3", cfu: (pol3 as Pack).cfu, index: 0, value })
          .correct
      ) {
        wrong.push(`POL.3's authored ask now ACCEPTS ${JSON.stringify(value)}`);
      }
    }
    // POL.1 asks for standard form by name, so a correct value in the wrong order stays wrong;
    // POL.2 asks for a complete factoring, so a partial one does.
    const strictByName: readonly { node: string; values: readonly string[] }[] = [
      { node: "POL.1", values: ["6 + 13x + 2x^2", "13x + 2x^2 + 6"] },
      { node: "POL.2", values: ["2(x^2 + x - 12)", "(2x + 8)(x - 3)"] },
    ];
    for (const { node, values } of strictByName) {
      const pack = SERVES_RE_ASK.find((entry) => entry.nodeId === node);
      expect(pack, `${node} no longer serves a re-ask`).toBeDefined();
      for (const value of values) {
        if (
          gradeCfuAnswer({ nodeId: node, cfu: (pack as Pack).cfu, index: 0, value }).correct
        ) {
          wrong.push(`${node}'s authored ask now ACCEPTS ${JSON.stringify(value)}`);
        }
      }
    }
    // And the same claim across the whole population: no authored ask accepts any spelling of
    // any OTHER instance's answer. `cfuVariants.ts` rejects a draw sharing an accepted spelling
    // with an earlier instance, and it computes that against `cfu.accepted` alone -- so a
    // widening the resolver cannot see is precisely where the two could come apart.
    //
    // GRADED rather than compared as sets, which is the difference between measuring this and
    // appearing to. The set version cannot fail from any change to the grader: it would have
    // held while `acceptedByForm` was accepting every instance's list outright.
    let probed = 0;
    for (const pack of MEASURED) {
      cfuInstances(pack.cfu).forEach((instance, index) => {
        if (instance.authored) {
          return;
        }
        const leaked = instance.accepted.filter((form) => {
          probed += 1;
          return gradeCfuAnswer({
            nodeId: pack.nodeId,
            cfu: pack.cfu,
            index: 0,
            value: form,
          }).correct;
        });
        if (leaked.length > 0) {
          wrong.push(
            `${pack.nodeId}: the authored ask accepts ${leaked.length} spelling(s) of instance ${index}'s answer, e.g. ${JSON.stringify(leaked[0])}`,
          );
        }
      });
    }
    expect(wrong.join("\n")).toBe("");
    expect(
      probed,
      `${probed} spellings of another instance's answer were graded against the authored ask`,
    ).toBeGreaterThanOrEqual(20_000);
  }, 180_000);

  /**
   * D4's packs, split by whether the shared checker grades them, with each refusal named.
   *
   * This asserted that NONE of them could reach the checker, and it was true of the tree that
   * wrote it: `LessonCfuCheck.answer_type` admitted `"numeric" | "expression"`, so a roster
   * answer had no type to declare and `checkCfuThroughChecker` came back null for every
   * instance of every D4 pack. The strict grader on attempt one was a typed list with nothing
   * behind it, and that is what the assertion recorded.
   *
   * It is no longer true, and the route it named as closed is the one this change opened, so
   * the claim is now the SPLIT rather than the absence. The packs still on exact match are
   * named with the reason each stays, and the reason is the same reason in three variations:
   * the FORM is what the question assesses, so a grader indifferent to form would take the
   * answer the lesson is teaching them not to write.
   *
   * ## POL.6 was a fourth entry, and the reason it gave was not true of it
   *
   * It read: *"asks for the leading term as a coefficient times a power of x, so the whole
   * function -5(2x - 3)(x + 1)^3 would pass"*. The other three each name an answer that is
   * EQUAL to the key and written in the form the question is about — an unexpanded product
   * against a standard-form key, an unfactored trinomial against a factored one, a dividend
   * over a divisor against a quotient — and equal is what makes a form-indifferent grader
   * take them. A leading term is not equal to the polynomial it leads. Measured through the
   * product checker with POL.6's key as an `expression`, `-5(2x - 3)(x + 1)^3` comes back
   * `value_mismatch`, and so do the spaced and explicit-`*` spellings of it, because
   * `-10x^4` and that quartic differ at every input but one.
   *
   * What the entry cost while it stood is in `monomialCfuGrading.test.ts`: graded on the two
   * strings its list held, POL.6 refused `(-10)x^4` — the bracketed negative its own worked
   * solution writes at step three — with no note under it, and its re-ask refused `+20x^3`.
   * That file also holds the measurement above as a standing assertion, extracting the
   * function from POL.6's own prompt and requiring the checker to refuse it, so the argument
   * for deleting this entry is somewhere it can go red rather than only in this comment.
   *
   * Both directions, because either half going quiet is a defect and they are different
   * defects. A named pack that gains a check fails, so a form-dependent question cannot be
   * migrated without someone reading this list. A pack absent from the list that cannot reach
   * the checker fails, so a migration that silently regressed - a malformed block, a deleted
   * one - shows up here rather than as a learner being refused a correct answer.
   */
  const FORM_IS_THE_SKILL: Readonly<Record<string, string>> = {
    "POL.1":
      "asks for the area in standard form, so the unexpanded (x + 6)(2x + 1) is the right value written in the form the question is about",
    "POL.2":
      "asks to factor completely, so the unfactored 2x^2 + 2x - 24 is what a form-independent grader would take",
    "POL.8":
      "asks for the quotient of a division, so the undivided dividend over the divisor would pass",
  };

  it("D4's CFUs split into the ones the checker grades and the ones the form is the point of", () => {
    const reached = new Set<string>();
    const refused = new Set<string>();
    let probed = 0;
    for (const lesson of allLessons) {
      const cfu = lesson.cfu;
      if (cfu === undefined || !lesson.node_id.startsWith("POL.")) {
        continue;
      }
      cfuInstances(cfu).forEach((instance, index) => {
        probed += 1;
        const result = checkCfuThroughChecker({
          nodeId: lesson.node_id,
          cfu,
          index,
          value: instance.accepted[0] ?? "",
        });
        (result === null ? refused : reached).add(lesson.node_id);
      });
    }
    // Direction one: every pack the checker cannot reach is one somebody decided it should
    // not, with the decision written down beside it.
    for (const node of [...refused].sort()) {
      expect(
        FORM_IS_THE_SKILL[node],
        `${node} cannot reach the shared checker and no reason is recorded for it: either give it a check block or name what its form is teaching`,
      ).toBeDefined();
    }
    // Direction two: an entry that has stopped qualifying fails, so a pack that gained a check
    // cannot go on being excused by a list nobody re-read.
    for (const node of Object.keys(FORM_IS_THE_SKILL)) {
      expect(
        refused.has(node),
        `${node} is named as held on exact match because its form is the skill, and it now reaches the checker: read the entry before deleting it`,
      ).toBe(true);
    }
    // And the composition, so the split is a split rather than one side plus an empty set.
    expect(
      [...reached].sort(),
      "D4's checked packs have moved; the migration these five record is no longer what shipped",
    ).toEqual(["POL.3", "POL.4", "POL.5", "POL.6", "POL.7"]);
    expect(probed, `${probed} D4 instances were probed`).toBeGreaterThanOrEqual(10);
  });
});
