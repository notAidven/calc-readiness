import { ERA_SEQUENCE, type EraId, getProductNodes } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { LESSON_DOMAINS, lessonByNode } from "../lessons/domains";
import {
  catchUpCopySweepCorpus,
  conceptFragment,
  conceptLine,
  DISCLOSURE_LABEL,
  eraSkillCount,
  KEEP_GOING_LABEL,
  keepGoingNote,
  LESSONS_STAY_OPEN,
  ordinalLine,
  ordinalLineFor,
  STOP_HERE_COPY,
  skillsHeading,
  skillTitles,
  stopHereNote,
  stoppedStanding,
  summaryProse,
  walkFraming,
} from "./catchUpStrings";

/**
 * §10.25's SWEEP, over strings a test can actually reach.
 *
 * That record runs the sweep over its own prose and says exactly what it is worth: *"it
 * proves the absences it names."* This runs the same sweep over the shipped strings, and the
 * corpus is **derived** — every string the module can produce at every authored era — so a
 * string added later is swept without anybody remembering to add it.
 *
 * **The floor is the part that matters.** A sweep over an empty corpus passes, which is the
 * emptiness `.cursor/rules/qa-verification.mdc` says a containment assertion has to rule out,
 * so the corpus size is asserted and every era is required to have contributed.
 *
 * And the limit, in the record's own terms: **the two objections that decide whether this
 * copy works are not shapes a sweep can see** — whether *"Stop here and learn this age"* reads
 * as an invitation or as a confession, and whether three roads at four ages read as being
 * consulted or as being asked the same thing four times. Both are read by a person, and the
 * frames in `docs/design-refs/` are what they are read from.
 */

const ALL_ERAS: readonly EraId[] = ERA_SEQUENCE.map((era) => era.id);

/** §10.25's own list, plus the two ids the era copy's own sweep already forbids. */
const FORBIDDEN: readonly { readonly name: string; readonly pattern: RegExp }[] = [
  { name: "em-dash", pattern: /\u2014/ },
  { name: "exclamation", pattern: /!/ },
  { name: "are-you-sure", pattern: /are you sure/i },
  { name: "you-failed", pattern: /you failed|you got|wrong/i },
  { name: "should-have", pattern: /should have|ought to/i },
  { name: "weak", pattern: /\bweak\b/i },
  { name: "struggle", pattern: /\bstruggl/i },
  { name: "free", pattern: /\bfree\b/i },
  { name: "congrats", pattern: /congrat/i },
];

describe("§10.25's sweep, over the derived corpus", () => {
  it("has a corpus to sweep, and every era contributed to it", () => {
    // THE FLOOR. Without it every assertion below is satisfied by an empty array.
    const corpus = catchUpCopySweepCorpus(ALL_ERAS);
    expect(corpus.length).toBeGreaterThanOrEqual(80);
    for (const era of ERA_SEQUENCE) {
      // COMPOSITION, not just size: each era's own concept line is in there, so the corpus
      // is a sweep over the sequence rather than over one era ten times.
      expect(corpus).toContain(conceptLine(era.id));
      expect(corpus).toContain(summaryProse(era.id));
    }
  });

  it("contains none of the nine shapes §10.25 sweeps for", () => {
    const corpus = catchUpCopySweepCorpus(ALL_ERAS);
    for (const { name, pattern } of FORBIDDEN) {
      const offenders = corpus.filter((entry) => pattern.test(entry));
      expect(offenders, `${name} in: ${offenders.join(" | ")}`).toEqual([]);
    }
  });

  it("the sweep MEASURES something, injected rather than assumed", () => {
    // Nine patterns over 80-plus strings, all reporting zero, is exactly the shape that is
    // satisfied by a regex that matches nothing. So each pattern is fired at a string it
    // must catch. Without this the assertion above is a claim about the corpus AND about the
    // patterns, and only one of them is being tested.
    const bait: readonly string[] = [
      "an em dash \u2014 here",
      "Congratulations!",
      "Are you sure?",
      "you failed that one",
      "you should have taken the lesson",
      "this age is your weak spot",
      "if you struggle, stop",
      "six buildings free",
      "congrats on the run",
    ];
    for (const { name, pattern } of FORBIDDEN) {
      expect(
        bait.some((entry) => pattern.test(entry)),
        `the ${name} pattern matched none of the bait, so it is measuring nothing`,
      ).toBe(true);
    }
  });

  it("leaks no node id and no domain id, over every product node", () => {
    // The no-ids half, and it is inherited rather than re-argued: tier one and tier two are
    // `ERA_SUMMARIES`, already swept by `eraTimeline.test.ts` against 62-plus node ids with
    // its own counter-example. This is the same sweep over THIS corpus, because the corpus
    // also holds lesson titles and generated headings that record never saw.
    const nodeIds = getProductNodes().map((node) => node.id);
    expect(nodeIds.length).toBeGreaterThanOrEqual(62);
    const domainIds = [...new Set(getProductNodes().map((node) => node.domain))];
    expect(domainIds.length).toBeGreaterThanOrEqual(10);

    const corpus = catchUpCopySweepCorpus(ALL_ERAS).join("\n");
    for (const nodeId of nodeIds) {
      expect(corpus.includes(nodeId), `node id ${nodeId} leaked`).toBe(false);
    }
    for (const domainId of domainIds) {
      expect(
        new RegExp(`\\b${domainId}\\b`).test(corpus),
        `domain id ${domainId} leaked`,
      ).toBe(false);
    }
  });
});

describe("the strings that carry a ruling say what the ruling says", () => {
  it("keeps the reject's string §10.19-verbatim", () => {
    // The one string whose failure would take the whole design with it: it names what the
    // road delivers and never why you would take it.
    expect(STOP_HERE_COPY.label).toBe("Stop here and learn this age");
  });

  it("keeps the accept road §10.19-verbatim, and phrased as the walk", () => {
    // §10.19: "Keep going" is "continue, phrased as the walk rather than as an assessment.
    // Not 'I know this', which would be a claim, and not 'Skip', which would name what is
    // being given up." All three of those are assertable, so all three are asserted.
    expect(KEEP_GOING_LABEL).toBe("Keep going");
    expect(KEEP_GOING_LABEL).not.toMatch(/know|skip/i);
  });

  it("states D-TH9 to the learner on the road the city places, and only there", () => {
    // §10.12: this clause is what makes the cheaper road safe to offer, because it says the
    // choice is not permanent. It rides on the city's sentence rather than in the footer,
    // which is where the lead's "the consequence is in a footnote" observation put it.
    for (const era of ERA_SEQUENCE) {
      expect(keepGoingNote(era.id, "city_places", null)).toContain(
        "You can move any of them afterwards.",
      );
      // And NOT on the learner's own road, where it would be reassurance about a placement
      // they made themselves and D-TH9 is already the city's standing rule.
      expect(keepGoingNote(era.id, "learner_places", null)).not.toContain(
        "You can move any of them afterwards.",
      );
    }
  });

  it("names the age the walk goes on to, so the accept road says where it leads", () => {
    const [first, second] = ERA_SEQUENCE;
    expect(keepGoingNote(first?.id as EraId, "city_places", second?.id as EraId)).toContain(
      `the ${second?.name}`,
    );
    // At the last handed age there is no next age in the plan to name, and the sentence
    // shortens rather than naming one anyway.
    expect(keepGoingNote(first?.id as EraId, "city_places", null)).not.toMatch(/ to the /);
    // AND IT NAMES ITS SUBJECT ONCE. Read off a 1024x580 frame, this line used to run "The
    // city puts up its five buildings and the city carries on to the Bronze Age."
    for (const era of ERA_SEQUENCE) {
      const line = keepGoingNote(era.id, "city_places", second?.id as EraId);
      expect(line.match(/The city|the city/g) ?? []).toHaveLength(1);
    }
  });

  it("promises the lessons on EVERY road, which is what replaces a confirmation", () => {
    // §10.6: there is nothing for an "Are you sure?" to guard, because the decision is not
    // irreversible in the dimension that matters. The clause is about the whole surface
    // rather than about a pair of buttons, so it may not say "either way".
    expect(LESSONS_STAY_OPEN).toContain("lessons stay open");
    expect(LESSONS_STAY_OPEN).not.toContain("either way");
  });

  it("names the disclosure's contents and never the learner's doubt", () => {
    // §10.23's first constraint: descriptive, not interrogative.
    expect(DISCLOSURE_LABEL).toBe("What this age covers");
    expect(DISCLOSURE_LABEL).not.toMatch(/\?|know|sure|check/i);
  });
});

describe("the counts in the copy come from the era, so they cannot overstate a roster", () => {
  it("names the era's own building count, swept over the sequence", () => {
    for (const era of ERA_SEQUENCE) {
      const count = eraSkillCount(era.id);
      expect(count).toBe(era.nodes.length);
      // The label says the number in words, so the assertion is that it says the RIGHT
      // number rather than that it says a number.
      const word =
        ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"][
          count
        ] ?? String(count);
      // BOTH build modes, because D-ERA18 gives the first age one sentence and every later
      // age the other, and a count that was right in one of them would be a card that lies
      // at four ages out of five.
      expect(keepGoingNote(era.id, "learner_places", null)).toContain(
        `its ${word} buildings`,
      );
      expect(keepGoingNote(era.id, "city_places", null)).toContain(`its ${word} buildings`);
      expect(stopHereNote(era.id, [])).toContain(`its ${word} lessons`);
    }
  });

  it("omits the skills heading at a count of zero, which is the mechanism", () => {
    // §10.25: "the heading is generated from the count and is omitted when the count is
    // zero, so it cannot announce a list that is not there." Asserted against the FUNCTION
    // rather than against an era, because the population of title-less eras is empty at this
    // tip — see the next test — and a guard scoped to that population would be measuring
    // nothing while looking like it measured the ruling.
    expect(skillsHeading(0)).toBeNull();
    expect(skillsHeading(1)).toBe("The one skills");
    expect(skillsHeading(9)).toBe("The nine skills");
  });

  it("gives every era a heading today, because D6 AND D9 HAVE LANDED and §10.15 is stale", () => {
    // A FINDING EXPIRES WHEN THE TREE MOVES. §10.15 measured the Industrial era at ZERO of
    // six authored titles and Cyberpunk at zero of nine, and §10.21 leaned on that to rule
    // that tier two must lead with the summary because "a titles-only tier two opens as a
    // blank panel at two of the ten eras". At this tip `LESSON_DOMAINS` runs all ten domains
    // and only THREE nodes across two eras have no lesson, so no era's tier two is blank.
    //
    // The ruling still stands and is untouched: the summary leads on its other two reasons,
    // which are that it is compile-enforced total and that the titles are lesson HEADINGS
    // rather than learner descriptions. What has changed is that §10.22's PROJECTION has come
    // true — tier two now really does overflow at the two nine-node eras — so the scroll is
    // load-bearing today rather than a precaution against somebody else's PR (O-TX22).
    //
    // This asserts the CAUSE rather than a count, so it goes red if a domain is dropped
    // again rather than drifting silently.
    const registered = new Set(LESSON_DOMAINS.map((domain) => domain.id));
    for (const domain of ["d6", "d9"]) {
      expect(registered.has(domain), `${domain} is no longer registered`).toBe(true);
    }
    expect(registered.size).toBeGreaterThanOrEqual(10);
    for (const era of ERA_SEQUENCE) {
      const titles = skillTitles(era.id);
      expect(titles.length, `${era.id} has no authored titles`).toBeGreaterThan(0);
      expect(skillsHeading(titles.length)).not.toBeNull();
    }
  });

  it("omits an unauthored title rather than substituting a node id", () => {
    // This is what keeps the no-ids property true by construction rather than by luck: a
    // fallback to the node id would put `FUN.1` in front of a learner at two whole eras.
    for (const era of ERA_SEQUENCE) {
      const titles = skillTitles(era.id);
      const authored = era.nodes.filter((nodeId) => lessonByNode[nodeId] !== undefined);
      expect(titles).toHaveLength(authored.length);
      for (const nodeId of era.nodes) {
        expect(titles).not.toContain(nodeId);
      }
    }
  });
});

describe("the forfeit rides on the road it belongs to, and names every age it costs", () => {
  it("says only this age's lessons where nothing else is forfeited", () => {
    const era = ERA_SEQUENCE[2]?.id as EraId;
    const line = stopHereNote(era, []);
    expect(line).toContain("its five lessons");
    // NO era is named where none is forfeited. §10.25's own condition: a learner at the
    // last handed age has nothing left to give up and must not read a sentence saying so.
    for (const other of ERA_SEQUENCE) {
      expect(line).not.toContain(other.name);
    }
  });

  it("names one age, two ages and three ages readably", () => {
    const [, , third, fourth, fifth] = ERA_SEQUENCE;
    const at = ERA_SEQUENCE[1]?.id as EraId;
    expect(stopHereNote(at, [third?.id as EraId])).toContain(
      `the ${third?.name} comes with it`,
    );
    expect(stopHereNote(at, [third?.id as EraId, fourth?.id as EraId])).toContain(
      `the ${third?.name} and the ${fourth?.name} come with it`,
    );
    expect(
      stopHereNote(at, [third?.id as EraId, fourth?.id as EraId, fifth?.id as EraId]),
    ).toContain(
      `the ${third?.name}, the ${fourth?.name} and the ${fifth?.name} come with it`,
    );
  });

  it("never names a cost, a miss or a should, which is R33's shape", () => {
    // A fact on the way past rather than a price in front. The sweep above covers the
    // corpus; this is the specific string, at every length it can take, at every era.
    let lines = 0;
    for (const era of ERA_SEQUENCE) {
      for (let length = 0; length <= ERA_SEQUENCE.length - 1; length += 1) {
        const line = stopHereNote(
          era.id,
          ERA_SEQUENCE.slice(0, length).map((entry) => entry.id),
        );
        expect(line).not.toMatch(/instead|cost|lose|lost|give up|miss|should/i);
        expect(line.startsWith("You work through")).toBe(true);
        lines += 1;
      }
    }
    // A FLOOR, because "no line names a cost" is trivially true of no lines.
    expect(lines).toBeGreaterThanOrEqual(100);
  });
});

describe("the surrounding lines", () => {
  it("says what the ages the ordinal counts ARE, which is the lead's own question", () => {
    // "AGE 3 OF 4 - of four what? Nothing on the card says what the four are." §10.19 gives
    // this line one job, position, and it was doing that job with its subject missing.
    expect(ordinalLine(1, 4)).toBe("Age 1 of the 4 you tested out of");
    expect(ordinalLine(4, 4)).toBe("Age 4 of the 4 you tested out of");
    expect(ordinalLine(3, 4)).toMatch(/tested out of/);
    // And a walk one age long never reads "of the 1".
    expect(ordinalLineFor(1, 1)).toBe("The age you tested out of");
    expect(ordinalLineFor(1, 1)).not.toMatch(/of the 1/);
    expect(ordinalLineFor(2, 4)).toBe(ordinalLine(2, 4));
  });

  it("gives the walk a referent before the roads, at every walk length", () => {
    // "Stop here is doing unexplained work. Stop what?" The framing sentence is the answer
    // and it has to be true at every length the walk can be, including one.
    for (let total = 1; total <= ERA_SEQUENCE.length - 1; total += 1) {
      const line = walkFraming(total);
      expect(line).toMatch(/tested out of/);
      expect(line.endsWith(".")).toBe(true);
    }
    expect(walkFraming(1)).not.toMatch(/one at a time/);
    expect(walkFraming(5)).toContain("five ages");
  });

  it("frames the concept as a statement about the AGE, and keeps the bare fragment", () => {
    // The lead: "the subtitle is a skill description, not an era one." The authored string
    // is right for the slot; what was missing was anything saying which of the two it was
    // about. The fragment survives for the small-caps register that cannot take a sentence.
    for (const era of ERA_SEQUENCE) {
      expect(conceptLine(era.id)).toBe(`This age is about ${conceptFragment(era.id)}.`);
      expect(conceptFragment(era.id)).not.toMatch(/^This age/);
    }
  });

  it("says what is standing behind, and says nothing when nothing is", () => {
    const era = ERA_SEQUENCE[2]?.id as EraId;
    expect(stoppedStanding(era, 0)).not.toMatch(/behind you/);
    expect(stoppedStanding(era, 1)).toMatch(/one age behind you/);
    expect(stoppedStanding(era, 3)).toMatch(/three ages behind you/);
  });
});
