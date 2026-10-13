/**
 * A CFU whose answer is a solution SET must not also accept the INTERVAL spelling of it.
 *
 * `[6, 20]` is the closed interval from 6 to 20, which is every real number between them;
 * `{6, 20}` is the two-value roster. A pack that accepts both marks a learner correct for
 * naming a continuum when the question asked for two numbers, and it does so on the surface
 * where the wrong notation is most likely — LIN.4's second slide is where the closed bracket
 * is taught, so a LIN.5 learner reaching for `[5, 11]` is applying the notation they were
 * just given, wrongly, and being told they are right.
 *
 * The checker half of this was fixed in `product-answer-checker.ts`, where `parseValueList`
 * stripped `[` and `]` exactly as it strips `{` and `}`. This file covers the layer that
 * bypasses the checker entirely: a CFU's `accepted` list is EXACT-STRING matched, so a
 * bracketed entry in it is accepted no matter what the checker would have said.
 *
 * ## Why the population is every served instance and not the packs
 *
 * Scoped to the behaviour rather than to where the spelling is written down. Four of the five
 * instances that carried the defect are DRAWN by `solutionSetForms`, whose generated list
 * never appears in any pack file, so a sweep over `content/lessons/**` sees one of the five.
 * Membership is read off the BRACES — an instance accepting `{5, 11}` has an answer that is a
 * set, whatever else its list spells — which is also what keeps a genuine interval CFU out:
 * LIN.6's `(-inf, 19] U [29, inf)` has no braced spelling anywhere in its list, so it is not
 * in this population and its brackets are correct. It gets its own assertion below, in both
 * directions, so an over-broad edit to `solutionSetForms` fails here rather than silently
 * withdrawing the notation LIN.6 is graded on.
 */

import { describe, expect, it } from "vitest";

import { isSolutionRosterAnswerText, normalizeAcceptedAnswer } from "./answerFormat";
import { gradeCfuAnswer } from "./cfuChecker";
import { cfuInstances } from "./cfuVariants";
import { LESSON_DOMAINS } from "./domains";
import type { LessonCfuSpec } from "./types";

/**
 * A spelling wrapped in square brackets, with whatever the pack appends after it.
 *
 * The suffix group is load-bearing: RAT.6's list carries `[6] (x = -5 is extraneous)`, so a
 * pattern anchored at both ends would miss six of the entries this is written to catch.
 */
const BRACKET_WRAPPED = /^\[([^\]]*)\](.*)$/;

interface RosterInstance {
  readonly where: string;
  readonly nodeId: string;
  readonly cfu: LessonCfuSpec;
  readonly index: number;
  readonly authored: boolean;
  readonly accepted: readonly string[];
}

/** Every instance the card can serve, in every registered domain, authored and drawn alike. */
function servedInstances(): readonly RosterInstance[] {
  return LESSON_DOMAINS.flatMap((domain) =>
    Object.entries(domain.lessonByNode).flatMap(([nodeId, lesson]) => {
      const cfu = lesson?.cfu;
      if (!cfu) {
        return [];
      }
      return cfuInstances(cfu).map((instance, index) => ({
        where: `${domain.id}:${nodeId} instance ${index} (${instance.authored ? "authored" : "drawn"})`,
        nodeId,
        cfu,
        index,
        authored: instance.authored === true,
        accepted: instance.accepted,
      }));
    }),
  );
}

const ALL_INSTANCES = servedInstances();

/** The instances whose answer is a roster: something in the list is braced. */
const ROSTER_INSTANCES = ALL_INSTANCES.filter((entry) =>
  entry.accepted.some(isSolutionRosterAnswerText),
);

/** The instances whose answer is an interval: brackets, and nothing braced anywhere. */
const INTERVAL_INSTANCES = ALL_INSTANCES.filter(
  (entry) =>
    !entry.accepted.some(isSolutionRosterAnswerText) &&
    entry.accepted.some((form) => form.includes("[")),
);

const bracketWrapped = (entry: RosterInstance) =>
  entry.accepted.filter((form) => BRACKET_WRAPPED.test(form.trim()));

describe("a CFU whose answer is a solution set never accepts the interval spelling of it", () => {
  it(`sweeps ${ROSTER_INSTANCES.length} roster instances across ${new Set(ROSTER_INSTANCES.map((entry) => entry.nodeId)).size} nodes, of ${ALL_INSTANCES.length} served`, () => {
    expect(
      ALL_INSTANCES.length,
      "the sweep found no CFU instances at all, so everything below is vacuous",
    ).toBeGreaterThanOrEqual(90);
    expect(
      ROSTER_INSTANCES.length,
      "no CFU instance accepts a braced roster any more, so this sweep measures nothing",
    ).toBeGreaterThanOrEqual(6);
    // A floor constrains size and not shape. Four of the five defective instances were DRAWN,
    // and a population that drifted back to the authored questions alone would clear the count
    // above with the wrong members, so the drawn half is floored on its own.
    expect(
      ROSTER_INSTANCES.filter((entry) => !entry.authored).length,
      "the drawn re-asks have left the population, which is where this defect lives",
    ).toBeGreaterThanOrEqual(4);
  });

  it("accepts no bracket-wrapped spelling on any of them", () => {
    const offenders = ROSTER_INSTANCES.flatMap((entry) =>
      bracketWrapped(entry).map((form) => `${entry.where}: ${form}`),
    );
    expect(
      offenders,
      `${offenders.length} roster instance spellings read as intervals`,
    ).toEqual([]);
  });

  /**
   * The removal orphans nothing: every bracketed spelling that goes has the SAME content still
   * reachable bare or braced, and it is graded through `gradeCfuAnswer` — the function the card
   * calls — rather than compared as a string, because string equality against the list is the
   * thing under test and would prove itself.
   *
   * Run over the roster population as it stands, so it is a real measurement before the removal
   * (where it grades the surviving siblings of forms still present) and after it (where the
   * bracketed forms are gone and it grades every roster spelling that shipped instead). The
   * floor is what stops it going vacuous: containment over an empty collection is free.
   */
  it("leaves every roster answer reachable bare or braced, graded through the real path", () => {
    let graded = 0;
    for (const entry of ROSTER_INSTANCES) {
      // No list can be emptied by the removal, and that is a fact about how the population is
      // built rather than something to assert: membership requires a BRACED form, and a braced
      // form is never bracket-wrapped, so every member keeps at least that one. An assertion
      // here would be green under every possible tree, which is the shape of a guard that
      // measures nothing.
      const survivors = entry.accepted.filter((form) => !BRACKET_WRAPPED.test(form.trim()));
      expect(
        BRACKET_WRAPPED.test((entry.accepted[0] ?? "").trim()),
        `${entry.where}: the CANONICAL spelling is the bracketed one, so removing it moves the reveal`,
      ).toBe(false);

      const wanted = new Set<string>();
      for (const form of bracketWrapped(entry)) {
        const match = BRACKET_WRAPPED.exec(form.trim());
        if (!match) continue;
        wanted.add(`${match[1] ?? ""}${match[2] ?? ""}`);
        wanted.add(`{${match[1] ?? ""}}${match[2] ?? ""}`);
      }
      // After the removal there is no bracketed form to derive a sibling from, so the roster
      // spellings the pack ships are graded instead and the assertion keeps its teeth.
      if (wanted.size === 0) {
        for (const form of entry.accepted.filter(isSolutionRosterAnswerText)) {
          wanted.add(form);
        }
      }
      const reachable = new Set(survivors.map(normalizeAcceptedAnswer));
      for (const value of wanted) {
        if (!reachable.has(normalizeAcceptedAnswer(value))) continue;
        graded += 1;
        expect(
          gradeCfuAnswer({
            nodeId: entry.nodeId,
            cfu: entry.cfu,
            index: entry.index,
            value,
          }).correct,
          `${entry.where}: "${value}" survives the removal but does not grade`,
        ).toBe(true);
      }
    }
    expect(
      graded,
      "no surviving spelling was graded, so this proved nothing",
    ).toBeGreaterThanOrEqual(6);
  });
});

/**
 * The nodes whose CFU answer really IS an interval, so their brackets are the graded skill
 * rather than a spelling of a roster. Asserted as a SET below, which fails both ways: a node
 * that loses its brackets drops out and fails, and a node that grows an interval answer without
 * being declared here fails too rather than being swept along by a count.
 */
const INTERVAL_NODES = ["FUN.2", "FUN.4", "LIN.6"];

/**
 * Interval CFUs whose ENDPOINTS are a convention the question settles rather than the skill it
 * grades, so accepting both bracket spellings is deliberate and not the defect above.
 *
 * The loosened-spelling half below rests on a premise that is true of a solution set and false
 * here: for LIN.6, `(-inf, 19]` and `(-inf, 19)` are different sets and only one solves the
 * inequality, so writing the bracket IS the measured skill. An interval of INCREASE or DECREASE
 * is not like that. A function turns at its endpoints, so the stretch is conventionally open,
 * texts differ on whether to close it, and FUN.4's prompt settles the matter by asking in words
 * for "round brackets" — `(3, 8), 11` is the spelling it requests, and the closed form is
 * carried as a courtesy to a learner who writes the other convention.
 *
 * Asserted both ways below: a listed node that leaves the interval population fails, and a
 * listed node that stops accepting both spellings fails too, so the entry cannot go on excusing
 * something it has stopped describing.
 */
const ENDPOINT_IS_CONVENTION: readonly { node: string; why: string }[] = [
  {
    node: "FUN.4",
    why: "the stretch of decrease is conventionally open, and the prompt asks for round brackets in words, so both spellings are accepted on purpose",
  },
];

describe("a CFU whose answer really is an interval keeps its brackets", () => {
  it(`grades the bracketed spellings of ${INTERVAL_INSTANCES.length} interval instances`, () => {
    expect(
      [...new Set(INTERVAL_INSTANCES.map((entry) => entry.nodeId))].sort(),
      "the nodes whose answer is an interval are not the nodes declared to be",
    ).toEqual(INTERVAL_NODES);

    let graded = 0;
    let refused = 0;
    for (const entry of INTERVAL_INSTANCES) {
      const bracketed = entry.accepted.filter((form) => form.includes("["));
      expect(
        bracketed.length,
        `${entry.where}: its brackets were stripped`,
      ).toBeGreaterThan(0);
      for (const form of bracketed) {
        graded += 1;
        expect(
          gradeCfuAnswer({
            nodeId: entry.nodeId,
            cfu: entry.cfu,
            index: entry.index,
            value: form,
          }).correct,
          `${entry.where}: "${form}" is an accepted interval spelling that no longer grades`,
        ).toBe(true);

        // The other direction, and it is the half that makes the first half mean anything: a
        // closed endpoint written open is a DIFFERENT set, and writing the bracket is the skill
        // LIN.6 measures, so the loosened spelling must be marked wrong. Asserted for every
        // instance the pack lists rather than skipped where the pack lists the loosened form
        // itself, because a SOLUTION SET that accepted both would BE the defect and a skip would
        // excuse it. The one exception is an interval whose endpoints are a convention the
        // question settles rather than the skill it measures, which is a different claim and is
        // named, reasoned and asserted both ways in `ENDPOINT_IS_CONVENTION` above.
        if (ENDPOINT_IS_CONVENTION.some(({ node }) => node === entry.nodeId)) continue;
        const loosened = form.replace(/\[/g, "(").replace(/\]/g, ")");
        if (loosened === form) continue;
        refused += 1;
        expect(
          gradeCfuAnswer({
            nodeId: entry.nodeId,
            cfu: entry.cfu,
            index: entry.index,
            value: loosened,
          }).correct,
          `${entry.where}: "${loosened}" opens an endpoint the answer closes and was still accepted`,
        ).toBe(false);
      }
    }
    expect(
      graded,
      "no interval spelling was graded, so this proved nothing",
    ).toBeGreaterThanOrEqual(6);
    // The two directions need two floors now that a named node sits out the second one. Without
    // this, growing `ENDPOINT_IS_CONVENTION` until it covered every interval CFU would leave the
    // loosened-spelling half asserting nothing at all while the `graded` floor above stayed
    // green, which is the emptiness the exemption list is most likely to introduce.
    expect(
      refused,
      `no loosened spelling was refused (${ENDPOINT_IS_CONVENTION.length} node(s) sit out), so the half that gives the first half its meaning proved nothing`,
    ).toBeGreaterThanOrEqual(3);
  });

  it("names only interval CFUs that still accept both bracket spellings", () => {
    expect(
      ENDPOINT_IS_CONVENTION.length,
      "every interval CFU is excused from the loosened-spelling check, so it checks nothing",
    ).toBeLessThan(INTERVAL_NODES.length);

    for (const { node } of ENDPOINT_IS_CONVENTION) {
      const instances = INTERVAL_INSTANCES.filter((entry) => entry.nodeId === node);
      expect(
        instances.length,
        `${node} is excused from the loosened-spelling check but is no longer an interval CFU`,
      ).toBeGreaterThan(0);

      // The direction that stops the excuse outliving what it excuses: the entry claims this
      // pack accepts BOTH conventions on purpose, so if it has narrowed to one the claim is
      // stale and the loosened spelling should be back under the assertion above.
      for (const entry of instances) {
        const closed = entry.accepted.filter((form) => form.includes("["));
        expect(
          closed.length,
          `${node} is excused as accepting both bracket conventions, but ${entry.where} no longer lists a closed spelling`,
        ).toBeGreaterThan(0);
        for (const form of closed) {
          const loosened = form.replace(/\[/g, "(").replace(/\]/g, ")");
          if (loosened === form) continue;
          expect(
            gradeCfuAnswer({
              nodeId: entry.nodeId,
              cfu: entry.cfu,
              index: entry.index,
              value: loosened,
            }).correct,
            `${node} is excused as accepting both bracket conventions, but ${entry.where} now refuses "${loosened}", so the entry excuses nothing`,
          ).toBe(true);
        }
      }
    }
  });
});
