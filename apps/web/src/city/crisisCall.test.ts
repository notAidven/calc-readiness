import { HARD_WINTER, midEraCrisisTrigger, PLAGUE, PLAGUE_ERA } from "@cr/game";
import { ERA_SEQUENCE } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { materialWord } from "../economy/materialWord";
import { crisisCallMessage } from "./announcements";
import {
  CRISIS_ACTION_ORDER,
  CRISIS_ACTION_TERMS,
  crisisBriefingFor,
  crisisBriefingLines,
  crisisBriefingTerms,
  hasPlayableCrisis,
} from "./crisisCall";
import { CURRENT_ERA_ID } from "./eraDressing";

/**
 * THE ADVISOR'S COPY, AGAINST THE REGISTER IT WAS WRITTEN TO.
 *
 * Every rule below is one the lead has ruled on directly, and every one of them is
 * currently enforced by nothing: the lesson-pack scanner does not read TSX and is not in
 * any CI step, so a `—` in a city component ships. That is exactly why these are
 * assertions rather than a note in a docblock.
 *
 * The corpus is derived from the briefing itself (`crisisBriefingLines`) plus the notice
 * and the announcement, so a sentence added to the card is swept without anyone
 * remembering to add it here.
 */

const briefing = crisisBriefingFor(CURRENT_ERA_ID);

if (briefing === null) {
  throw new Error("era one has no crisis briefing, so this whole file proves nothing");
}

/**
 * The walkthrough's slides, hoisted out of the narrowing above.
 *
 * A function body cannot see the `throw` that ruled `briefing` non-null, so the slides are
 * captured here at module scope where the narrowing does hold.
 */
const SLIDES = briefing.slides;

/** Every learner-visible string the entry sequence can speak, in one list. */
const CORPUS: readonly string[] = [
  ...crisisBriefingLines(briefing),
  briefing.title,
  crisisCallMessage(briefing.title, briefing.advisorName, 3, 6),
  crisisCallMessage(briefing.title, null, 5, 9),
];

/**
 * THE LINES A CHARACTER SAYS OUT LOUD, held apart from the ones the game writes down.
 *
 * Only one rule in this file distinguishes them — the ban on `!` — and only because the
 * lead asked for a shout on 2026-07-31 (*"a giant chat bubble that basically shouts,
 * 'Sire! ....'"*) against a sweep that had already taken the mark off this exact line once.
 * Prose that oversells the winter is still wrong; a character who does is in character. The
 * two are different registers and the rule was written for the second of them.
 *
 * It is `briefing.lead` and not a transcribed string, so the exemption cannot go on
 * excusing a sentence nobody says any more, and the assertions below pin it in both
 * directions: see *"the advisor is allowed to shout, and nothing else is"*.
 */
const SPOKEN: readonly string[] = [briefing.lead];

/** Everything else: the headings, the rules, the title and the announcement. */
const WRITTEN: readonly string[] = CORPUS.filter((line) => !SPOKEN.includes(line));

describe("the crisis briefing's register", () => {
  it("has something to sweep", () => {
    // The floor. A briefing that returned an empty list would satisfy every "does not
    // contain" assertion below by containing nothing.
    expect(CORPUS.length).toBeGreaterThanOrEqual(10);
    for (const line of CORPUS) {
      expect(line.trim().length).toBeGreaterThan(0);
    }
  });

  it("contains no em-dash or en-dash anywhere", () => {
    for (const line of CORPUS) {
      expect(line, line).not.toMatch(/[\u2014\u2013]/);
    }
  });

  it("never attaches a purchase word to the learner's answers", () => {
    // The ruling: results-oriented, not purchase-oriented. "cost", "price", "buy", "pay",
    // "afford" and "worth" are fine attached to MATERIAL and wrong attached to accuracy.
    // So the sweep is per sentence: a sentence that talks about answering may not also
    // talk about spending.
    const purchase = /\b(cost|costs|price|priced|buy|buys|pay|pays|afford|worth)\b/i;
    const accuracy = /\b(answer|answers|answering|accuracy|correct|score|right)\b/i;
    const sentences = CORPUS.flatMap((line) => line.split(/(?<=[.!?])\s+/));
    expect(sentences.length).toBeGreaterThanOrEqual(15);
    for (const sentence of sentences) {
      if (accuracy.test(sentence)) {
        expect(sentence, sentence).not.toMatch(purchase);
      }
    }
    // ...and the one sentence that DOES spend says what it spends, so the rule above is
    // not passing merely because nothing in the copy mentions a price at all.
    //
    // **IT NAMES THE ERA'S OWN MATERIAL RATHER THAN THE WORD "material".** The lead, 2026-08-02:
    // *"also replace 'material' with 'stone'."* So the assertion resolves the word the same way
    // the copy does, through `materialWord`, rather than pinning "stone" — which would be era
    // one's answer standing in for every era's, and era two builds with grain.
    const spending = sentences.filter((sentence) => purchase.test(sentence));
    expect(spending.length).toBeGreaterThanOrEqual(1);
    const material = materialWord(CURRENT_ERA_ID);
    expect(material, "era one's material is stone").toBe("stone");
    for (const sentence of spending) {
      expect(sentence.toLowerCase(), sentence).toContain(material);
    }
    // AND THE GENERIC WORD IS GONE FROM THE WHOLE CORPUS, which is the half a per-sentence rule
    // cannot say: a briefing that named "material" anywhere would be leaking the engine's
    // abstraction into copy a learner reads.
    for (const line of CORPUS) {
      expect(line, line).not.toMatch(/\bmaterials?\b/i);
    }
  });

  it("says what good answers EARN at least once", () => {
    // The other half of the same ruling. Describing the mechanic without ever saying what
    // answering well does would satisfy the prohibition above and miss the point of it.
    const earns = CORPUS.filter((line) => /answering well|how well you answer/i.test(line));
    expect(earns.length).toBeGreaterThanOrEqual(2);
  });

  it("keeps its sentences short", () => {
    for (const sentence of CORPUS.flatMap((line) => line.split(/(?<=[.!?])\s+/))) {
      expect(sentence.length, sentence).toBeLessThanOrEqual(120);
    }
  });

  it("does not oversell a winter", () => {
    // It is a season with consequences, not an apocalypse. A building can be ruined and
    // ground can be lost, and neither of those is the end of anything. THIS half applies to
    // the advisor's own line as much as to the rest: a character may raise his voice, and
    // he still may not tell the player the island is doomed.
    for (const line of CORPUS) {
      expect(line, line).not.toMatch(
        /\b(destroy|destroyed|devastat\w*|catastroph\w*|apocalyp\w*|doom\w*|wipe out|annihilat\w*|survival|perish)\b/i,
      );
    }
  });

  /**
   * THE SHOUT IS THE ADVISOR'S ALONE, and this is the exemption that makes it possible.
   *
   * The ban on `!` used to cover every string here, and it took the mark off *"Sire!"* once
   * already. The lead asked for it back on 2026-07-31, so the sweep is scoped to written
   * prose rather than deleted — and an exemption that is only a hole in a population is how
   * the thing it was excusing quietly stops existing. So it is asserted BOTH ways:
   *
   *  - a WRITTEN line that gains a `!` fails, which is the original rule, still whole over
   *    everything it was ever about;
   *  - a SPOKEN line that stops shouting fails, so the day the advisor goes quiet the
   *    exemption comes out with him instead of sitting here excusing nothing;
   *  - and a spoken line that is not in the corpus fails, so the list cannot name a
   *    sentence the entry sequence no longer says.
   *
   * Measured rather than argued: put the comma back in `briefing.lead` and this file
   * reports 1 failed at *"the advisor still shouts"*; move a `!` into any slide line and it
   * reports 1 failed at the ban below.
   */
  it("lets the advisor shout, and nothing else", () => {
    // The exemption is real: these lines are IN the corpus, and taking them out of it left
    // a written population big enough for the ban to mean something.
    expect(SPOKEN.length).toBeGreaterThanOrEqual(1);
    for (const line of SPOKEN) {
      expect(CORPUS, line).toContain(line);
    }
    expect(WRITTEN.length).toBe(CORPUS.length - SPOKEN.length);
    expect(WRITTEN.length).toBeGreaterThanOrEqual(14);

    // THE BAN, over everything the game says in its own voice.
    for (const line of WRITTEN) {
      expect(line, line).not.toMatch(/!/);
    }

    // AND THE EXEMPTION IS LOAD-BEARING. Every line it excuses actually uses the licence,
    // so a calm advisor cannot leave a hole in the sweep behind him.
    for (const line of SPOKEN) {
      expect(line, `the advisor still shouts: ${line}`).toMatch(/!/);
    }
  });

  it("speaks no raw node id, era slug or domain key", () => {
    for (const line of CORPUS) {
      expect(line, line).not.toMatch(/\b[A-Z]{2,4}\.[A-Z0-9]/);
      expect(line, line).not.toMatch(/\bD\d{1,2}\b/);
      for (const era of ERA_SEQUENCE) {
        expect(line, line).not.toContain(era.id);
      }
    }
  });
});

describe("the briefing's numbers come from the engine", () => {
  it("quotes no figure the tuning table does not hold", () => {
    // The derivation guard. A retune moves `HARD_WINTER.rounds` and `batch_size`, and a
    // hand-typed figure left behind is a number on screen that contradicts the board the
    // learner is about to play. Any integer in the copy that is not one of the engine's
    // own fails here.
    const allowed = new Set([HARD_WINTER.rounds, HARD_WINTER.batch_size]);
    const quoted = crisisBriefingLines(briefing)
      .flatMap((line) => line.match(/\d+/g) ?? [])
      .map(Number);
    expect(quoted.length).toBeGreaterThanOrEqual(2);
    for (const value of quoted) {
      expect(allowed, `the copy quotes ${value}`).toContain(value);
    }
  });

  it("states the winter's length and its batch size", () => {
    const text = crisisBriefingLines(briefing).join(" ");
    expect(text).toContain(`${HARD_WINTER.rounds} rounds`);
    expect(text).toContain(`${HARD_WINTER.batch_size} questions`);
  });
});

describe("the action list is the board's own", () => {
  it("describes every action the engine can declare", () => {
    // `CRISIS_ACTION_TERMS` is a `Record<WinterActionKind, ...>`, so a crisis that gains an
    // action does not compile until it is described. This pins the runtime half: the
    // briefing lists one line per key, in the record's order, with nothing dropped.
    expect(CRISIS_ACTION_ORDER.length).toBeGreaterThanOrEqual(2);
    expect(briefing.actions.map((term) => term.id)).toEqual([...CRISIS_ACTION_ORDER]);
    expect(new Set(briefing.actions.map((term) => term.text)).size).toBe(
      briefing.actions.length,
    );
    for (const kind of CRISIS_ACTION_ORDER) {
      expect(CRISIS_ACTION_TERMS[kind].text.length, kind).toBeGreaterThan(20);
    }
  });

  /**
   * AND THE SET IS EXACTLY THESE TWO, asserted as an equality rather than as `toMatch`es over
   * the joined text.
   *
   * The compiler already stops the briefing falling BEHIND the board. This is the other
   * direction: a set equality is what makes a removed action come back loudly here rather than
   * quietly on the card. Written as `toMatch`es it passed with four actions on the board and
   * named three, which is the shape that let it say nothing at all about the one that was
   * removed.
   *
   * **IT HAS CAUGHT TWO REMOVALS NOW.** The mend, ruled out 2026-07-31, and the pull-back, ruled
   * out 2026-08-02 (*"the give up ground option is incredibly confusing - just discard it
   * completely and keep it to two options"*). Both of the pull-back's own assertions are kept
   * below as prohibitions, which is the direction that matters once an action is gone: the card
   * must not offer it again without somebody editing this list.
   */
  it("names exactly the two the Hard Winter ships, in the learner's words", () => {
    expect([...CRISIS_ACTION_ORDER].sort()).toEqual(["fire", "reinforce"]);

    const text = briefing.actions.map((term) => term.text).join(" ");
    expect(text).toMatch(/light a fire/i);
    expect(text).toMatch(/reinforce a building/i);
    // And no action line offers either removed action. The pull-back's two clauses were
    // asserted positively here until 2026-08-02 and are asserted negatively now.
    expect(text).not.toMatch(/pull everyone in/i);
    expect(text).not.toMatch(/ground is given up/i);
    expect(text).not.toMatch(/mend|takes damage back off/i);
  });

  /**
   * The other half of the ruling, said to the learner rather than only enforced in the
   * engine: with no in-round undo, a learner who expected one would hold a scarred building
   * back waiting for it. The briefing names both the absence and the shield that replaces it.
   */
  it("tells the learner the frost destroys, and what stops it", () => {
    const damage = slideById("damage")
      .terms.map((term) => term.text)
      .join(" ");
    /*
     * **THIS ASSERTED THE OPPOSITE COPY UNTIL 2026-08-02, and the old line is quoted because it
     * is what the lead read and disbelieved.** The slide said *"A building takes damage before it
     * is ruined. It takes more than one bad round to lose it."* and *"Nothing in the winter takes
     * damage back off."*, and this test pinned the second clause. At
     * `HARD_WINTER.damage.ruin_at: 1` the first was false and the second was true of nothing, so
     * the slide now says the frost destroys on contact and that a shield is what stops it.
     */
    expect(damage).toMatch(/destroys a building the moment it reaches one/i);
    expect(damage).toMatch(/shield/i);
    // AND IT PROMISES NO GRADED HARM, which is the half the old copy got wrong: a learner told a
    // building "takes damage before it is ruined" plans for a near miss that cannot happen.
    expect(damage).not.toMatch(/takes damage before/i);
    expect(damage).not.toMatch(/more than one bad round/i);
    // And that the island can put a ruin back, which is where the mend action's job went.
    expect(damage).toMatch(/rebuilt on the island/i);
  });
});

/* -------------------------------------------------------------------------- */
/* The walkthrough's shape                                                     */
/* -------------------------------------------------------------------------- */

/** One slide, by id, failing loudly rather than asserting over `undefined`. */
function slideById(id: string) {
  const found = SLIDES.find((slide) => slide.id === id);
  if (found === undefined) {
    throw new Error(
      `the briefing has no "${id}" slide, so any assertion about it proves nothing`,
    );
  }
  return found;
}

/**
 * THE SLIDES, AGAINST THE RULING THAT CREATED THEM.
 *
 * The lead asked for *"short slides … small and isolated to one section, to prevent users
 * from being overloaded with information"*, and only one slide is on screen at a time. That
 * makes two separate things assertable here, and neither is about layout:
 *
 *  1. **Nothing was lost in the paginating.** Every rule the card used to print at once is
 *     still on some slide. The population is the record-derived action list plus the
 *     briefing's own terms, floored, so a slide quietly dropped fails here rather than in a
 *     screenshot nobody takes.
 *  2. **No slide grew back into the wall of text.** A cap on lines and on characters per
 *     slide, because "isolated to one section" is only worth anything while a section is
 *     still small enough to read in one go.
 */
describe("the walkthrough is short slides, one idea each", () => {
  it("is four slides, each with a heading and at least one line", () => {
    // Derived from the briefing rather than counted here, with a floor: a briefing that
    // returned no slides would satisfy every per-slide assertion below vacuously.
    expect(briefing.slides.length).toBeGreaterThanOrEqual(4);
    expect(new Set(briefing.slides.map((slide) => slide.id)).size).toBe(
      briefing.slides.length,
    );
    for (const slide of briefing.slides) {
      expect(slide.heading.trim().length, slide.id).toBeGreaterThan(0);
      expect(slide.terms.length, slide.id).toBeGreaterThanOrEqual(1);
    }
  });

  it("keeps every slide small enough to read in one go", () => {
    for (const slide of briefing.slides) {
      // Three lines is the size of the lead's own worked example (the three actions). A
      // fourth is the point at which a slide stops being one idea.
      expect(slide.terms.length, slide.id).toBeLessThanOrEqual(3);
      const characters = slide.terms.reduce((total, term) => total + term.text.length, 0);
      expect(characters, slide.id).toBeLessThanOrEqual(360);
    }
  });

  it("loses no rule in the paginating, and repeats none", () => {
    const terms = crisisBriefingTerms(briefing);
    /*
     * The floor. Nine rules were on the old single-column card, and the slides carried all nine
     * until 2026-08-02, when the give-up-ground action was ruled out and its line came out with it.
     *
     * **DERIVED FROM THE ACTION SET RATHER THAN LOWERED TO 8**, which is the difference between a
     * floor that tracks the board and a floor that has been relaxed to fit: the non-action rules
     * are six (two on the winter, one on the round, three on damage) and the action lines are one
     * per member of `CRISIS_ACTION_ORDER`, so an action that leaves the board lowers this by
     * exactly one and a rule that goes missing still fails.
     */
    const NON_ACTION_RULES = 6;
    expect(terms.length).toBeGreaterThanOrEqual(
      NON_ACTION_RULES + CRISIS_ACTION_ORDER.length,
    );
    expect(new Set(terms.map((term) => term.id)).size).toBe(terms.length);
    expect(new Set(terms.map((term) => term.text)).size).toBe(terms.length);

    // And every action the engine can declare is on a slide, not merely in `actions`.
    const onSlides = terms.map((term) => term.text);
    for (const kind of CRISIS_ACTION_ORDER) {
      expect(onSlides, kind).toContain(CRISIS_ACTION_TERMS[kind].text);
    }
  });

  /**
   * THE MEND IS GONE, AND IT MAY NOT COME BACK AS A SENTENCE.
   *
   * The lead removed the `repair` ACTION on 2026-07-31. What survives it is repair on the
   * island after the winter has ended, which is a live system (`crisisRepair.ts`) and stays
   * said. The failure mode this guards is the two being confused on a slide: a learner
   * reading "what you can do each round" must not find an offer to undo frost damage there,
   * because a player who holds a scarred building back waiting for one loses it.
   *
   * So the assertion is placed rather than global. The word is allowed on exactly one slide,
   * in a sentence that says WHEN, and it is banned on every other.
   */
  it("offers no way to undo frost damage inside the winter", () => {
    // **`rebuild` JOINED THIS PATTERN ON 2026-08-02.** At `HARD_WINTER.damage.ruin_at: 1` the
    // frost leaves ruins rather than scars, so the after-the-winter sentence names a REBUILD where
    // it used to name a repair — and a slide offering to rebuild inside a round would be exactly
    // the confusion this test exists for, one noun further along.
    const undo = /\bmend\w*|repair\w*|rebuild\w*|un-?do\b/i;
    /** The one slide allowed to say the word, because on it the word means after. */
    const AFTER_THE_WINTER = "damage";

    // No HEADING anywhere offers it, the exempt slide included: a step called "Repair the
    // frost damage" would be the removed action back on the card whatever its lines said.
    for (const slide of briefing.slides) {
      expect(slide.heading, slide.id).not.toMatch(undo);
    }
    const others = briefing.slides.filter((slide) => slide.id !== AFTER_THE_WINTER);
    expect(others.length).toBe(briefing.slides.length - 1);
    for (const slide of others) {
      expect(slide.terms.map((term) => term.text).join(" "), slide.id).not.toMatch(undo);
    }

    // The exemption is load-bearing in both directions: the one slide that DOES say it
    // still says it, and still pins it to after the winter rather than to a round.
    const damage = slideById(AFTER_THE_WINTER)
      .terms.map((term) => term.text)
      .join(" ");
    expect(damage).toMatch(undo);
    // PINNED TO AFTER THE WINTER. It read "at the end of the winter" against a sentence about
    // repairing damage; the sentence now rebuilds a ruin, and "after the winter" is the clause
    // doing the same work.
    expect(damage).toMatch(/after the winter/i);
    // And the slide still says what stops the frost, which is the positive half of the same
    // ruling: a learner told only that nothing undoes damage has been given no instruction.
    expect(damage).toMatch(/shield is the only thing that stops it/i);
  });
});

/**
 * THE ADVISOR'S SPOKEN LINE IS THE HOOK, NOT THE MANUAL.
 *
 * The whole point of the speech bubble is that a player who reads only it has met a
 * character rather than a tooltip, so the line is asserted for what it must NOT carry: no
 * figure off the tuning table, no action, no rule. A lead line that started summarising the
 * mechanics again would be the wall of text with a tail drawn on it.
 */
describe("the advisor's spoken line", () => {
  it("speaks in character, addressing the player and naming the stakes", () => {
    // The address is SHOUTED, which is the lead's own example twice over ("something like
    // 'Sire! The worst winter we've ever seen is upon us'", and then "a giant chat bubble
    // that basically shouts, 'Sire! ....'"). It is pinned here as well as in the register
    // sweep because the two say different things: the sweep says the exemption is used,
    // this says the address is what uses it.
    expect(briefing.lead).toMatch(/^Sire! /);
    expect(briefing.lead).toMatch(/winter/i);
    expect(briefing.lead).toMatch(/our people/i);
  });

  it("carries no mechanic, no number and no action", () => {
    expect(briefing.lead).not.toMatch(/\d/);
    expect(briefing.lead).not.toMatch(/\b(round|rounds|question|questions|answer\w*)\b/i);
    for (const kind of CRISIS_ACTION_ORDER) {
      expect(briefing.lead.toLowerCase(), kind).not.toContain(kind);
    }
  });

  /**
   * STILL TWO SENTENCES, and the count is taken after the address rather than loosened to
   * three to let one in.
   *
   * *"Sire!"* is a vocative. Splitting on terminal punctuation counts it as a sentence,
   * which would have made the shout the reason to relax a cap that exists to stop the
   * bubble filling up with prose — the wrong repair, and one that would have bought a real
   * third sentence for free. So the address is recognised and removed, and what is left is
   * held to exactly the two it always was.
   */
  it("is an address and two short sentences, so the bubble is a bubble", () => {
    const address = briefing.lead.match(/^[A-Z][a-z]+[!,]\s+/);
    expect(address, `no address opens the line: ${briefing.lead}`).not.toBeNull();
    const said = briefing.lead.slice(address?.[0].length ?? 0);
    expect(said.length, "the address is the whole line").toBeGreaterThan(20);
    expect(said.split(/(?<=[.!?])\s+/).length).toBeLessThanOrEqual(2);
    expect(briefing.lead.length).toBeLessThanOrEqual(140);
    expect(briefing.lead.length).toBeGreaterThan(40);
  });
});

describe("which eras have a crisis to walk into", () => {
  it("is exactly the four implemented eras, asserted in both directions", () => {
    // The population is `ERA_SEQUENCE`, not a list written here, and the floor stops this
    // passing over an empty sequence.
    expect(ERA_SEQUENCE.length).toBe(10);
    expect(hasPlayableCrisis(CURRENT_ERA_ID)).toBe(true);
    expect(crisisBriefingFor(CURRENT_ERA_ID)).not.toBeNull();
    expect(hasPlayableCrisis("information_age")).toBe(true);
    expect(crisisBriefingFor("information_age")).not.toBeNull();
    expect(hasPlayableCrisis(PLAGUE_ERA)).toBe(true);
    expect(crisisBriefingFor(PLAGUE_ERA)?.title).toBe("The Plague");
    expect(hasPlayableCrisis("classical")).toBe(true);
    expect(crisisBriefingFor("classical")?.title).toBe("The Succession");

    const others = ERA_SEQUENCE.filter(
      (era) =>
        era.id !== CURRENT_ERA_ID &&
        era.id !== "classical" &&
        era.id !== PLAGUE_ERA &&
        era.id !== "information_age",
    );
    expect(others.length).toBe(6);
    for (const era of others) {
      // Nine eras have a DESIGNED crisis and no encounter behind it. Announcing one would
      // leave the learner with a notice and nothing to open, so the call is not raised.
      expect(hasPlayableCrisis(era.id), era.id).toBe(false);
      expect(crisisBriefingFor(era.id), era.id).toBeNull();
    }
  });

  it("names the approved restore-and-reopen rule in Oru's concise briefing", () => {
    const intrusion = crisisBriefingFor("information_age");
    expect(intrusion?.actions).toHaveLength(2);
    expect(intrusion?.actions.find((action) => action.id === "restore")?.text).toContain(
      "then every cover reopens",
    );
    expect(intrusion?.actionLabel).toBe("Go and look");
  });

  it("still knows where every era's crisis WOULD fire, so the trigger is not era one's", () => {
    // The briefing is era one's; the trigger is not. Kept adjacent so that authoring era
    // two's crisis is a briefing entry rather than a rewrite of the entry condition.
    for (const era of ERA_SEQUENCE) {
      expect(midEraCrisisTrigger(era.id), era.id).toBe(Math.ceil(era.nodes.length / 2));
    }
  });
});

describe("the Plague briefing", () => {
  it("is short, exhaustive over its two actions, and reads its counts from tuning", () => {
    const care = crisisBriefingFor(PLAGUE_ERA);
    expect(care).not.toBeNull();
    if (care === null) {
      throw new Error("era six has no Plague briefing");
    }
    expect(care.slides).toHaveLength(3);
    expect(care.actions.map((action) => action.id).sort()).toEqual(["care", "quarantine"]);
    expect(care.actionLabel).toBe("Face the outbreak");
    const text = crisisBriefingLines(care).join(" ");
    expect(text).toContain(`${PLAGUE.rounds}`);
    expect(text).toContain(`${PLAGUE.batch_size} questions`);
    expect(text).not.toContain("—");
    expect(new Set(crisisBriefingLines(care)).size).toBe(crisisBriefingLines(care).length);
  });
});

describe("the announcement", () => {
  it("says what arrived, that it waits, and who explains it", () => {
    const spoken = crisisCallMessage(briefing.title, briefing.advisorName, 3, 6);
    expect(spoken).toContain("The Hard Winter has reached the island");
    expect(spoken).toContain("3 of 6 skills in this age");
    expect(spoken).toContain("It waits until you are ready.");
    expect(spoken).toContain("Oru is here to explain it.");
  });

  it("drops the advisor clause rather than blanking it for an era with no character", () => {
    const spoken = crisisCallMessage(briefing.title, null, 5, 9);
    expect(spoken).toContain("5 of 9 skills in this age");
    expect(spoken).not.toMatch(/\s{2}/);
    expect(spoken).not.toMatch(/explain/);
    expect(spoken.endsWith("It waits until you are ready.")).toBe(true);
  });
});
