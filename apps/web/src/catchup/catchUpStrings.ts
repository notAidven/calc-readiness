import { ERA_SUMMARIES, type EraId, getEraOrThrow } from "@cr/skill-graph";

import { lessonByNode } from "../lessons/domains";
import { eraRosterNodeIds } from "./catchUpWalk";

/**
 * EVERY LEARNER-FACING STRING THE CATCH-UP SAYS, as data rather than as JSX.
 *
 * Authority: **§10.25** of
 * `docs/superpowers/specs/2026-08-01-test-out-experience-review.md` (the strings, with the
 * skills behind a two-tier disclosure), over **§10.19** (the per-age prompt) and **§10.21**
 * (tier two leads with the summary and the titles follow).
 *
 * ## WHY THE COPY IS A MODULE AND NOT INLINE
 *
 * §10.25 runs a mechanical sweep over its own strings — no em-dash, no exclamation, no
 * *"are you sure"*, no *"weak"*, no *"free"*, no node or domain ids — and says exactly what
 * it is worth: *"it proves the absences it names."* A sweep is only worth that much if it
 * can reach the strings, and strings scattered through a component are reachable by a
 * renderer and not by a test. So `catchUpStrings.test.ts` runs §10.25's sweep over
 * {@link catchUpCopySweepCorpus}, which is every string this module can produce at every
 * authored era.
 *
 * **The no-ids half is the one that is enforced rather than reviewed**, and it is inherited:
 * tier one and tier two's prose are `ERA_SUMMARIES`, whose own `eraTimeline.test.ts:67-71`
 * already sweeps all twenty strings against 62-plus node ids and ten-plus domain ids with a
 * counter-example proving the sweep measures something. The skill names are
 * `lessonByNode[nodeId].title`, which is authored prose rather than a key, so a node id
 * cannot leak from that path either.
 *
 * ## ⚑ REWRITTEN 2026-08-04 AGAINST A FRAME, AND FOUR OF THE FIVE EDITS ARE THE SPEC RESTORED
 *
 * The lead, off a running build: *"this UI looks terrible; clean it up. it makes no sense to
 * the user."* His observations, and which of them is drift and which is the ruling reading
 * badly, because those need different answers:
 *
 * | What he saw | Verdict | What changed |
 * | --- | --- | --- |
 * | *"the three roads are not three"* | **Drift.** §10.7's three-way fork is stamped superseded in its own document; §10.19 and §10.25's ruled prompt is two buttons and §10.10 rules the build mode out of the per-age question entirely | Two roads. `catchUpWalk.ts` has the argument |
 * | *"the voice is inconsistent between the two that sit together"* | **Drift, and it goes with the first.** *"I place its five buildings"* against *"The city places them"* was a first-person and a third-person answer to one question | Both roads are §10.19's own imperatives |
 * | *"stop here is doing unexplained work. Stop what?"* | **Real gap.** Nothing on the card said the learner was being walked forward | {@link ordinalLine} says what the ages are, and {@link keepGoingNote} and {@link stopHereNote} say what each road does to the walk |
 * | *"the consequence is in a footnote and it is the most important sentence"* | **Real gap**, and §10.19 put the forfeit under the buttons because it had nowhere better under a two-button row | The consequence rides under its own road, so each button carries the trade it makes |
 * | *"AGE 3 OF 4 — of four what?"* | **Real gap.** §10.19 gives the ordinal one job, *"position, not judgement"*, and it does that job and no other | The line names them |
 * | *"the subtitle is a skill description, not an era one"* | **Half.** `ERA_SUMMARIES[era].concept` is authored for exactly this slot, so the slot is right and the reading is not | The line is framed as a statement about the age. The deeper fix is an authored world line per era, which is authoring this pass did not do |
 * | *"the genuinely useful content is collapsed"* | **The ruling, working as ruled.** §10.20 is the lead's own: *"it doesn't have to show in the main screen, but it should still be viewable"* | Not overruled. §10.23 also forbids a count badge on the closed control, so the affordance is improved in weight rather than in warning |
 *
 * ## WHAT IS STILL CHANGED FROM THE RULED STRINGS, AND IT IS ONE CLAUSE
 *
 * §10.19's trailing clause is *"The lessons stay open either way"*. It is kept as *"whichever
 * you pick"* rather than reverted with the button count, because D-TH9's movability clause
 * now rides on the `Keep going` road's own note where it belongs, and *"either way"* reads as
 * a promise about two buttons where this is a fact about the whole surface. Everything the
 * clause is FOR is untouched: INV-COS-1 gates nothing, D-ERA19's shipped layer 3 opens a
 * placed building's lesson, and it is what §10.6 puts in place of a confirmation prompt, so
 * there is still no *"Are you sure?"* anywhere.
 *
 * The reject's label is §10.19's **verbatim**, because it is the one that carries the
 * admission problem: *"Stop here and learn this age"* names what the road delivers and never
 * why you would take it, so the learner who feels shaky and the learner who wants to watch
 * the age turn press the same unlabelled door.
 */

/** How many skills an age holds, which is also how many buildings it hands over. */
export function eraSkillCount(eraId: EraId): number {
  return eraRosterNodeIds(eraId).length;
}

/** A number as an English word, for the counts that appear in prose rather than in a badge. */
const WORDS: readonly string[] = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];

function inWords(count: number): string {
  return WORDS[count] ?? String(count);
}

/** The same word, opening a sentence. Read off a 1024x580 frame: *"six skills, six lessons."* */
function inWordsCapitalised(count: number): string {
  const word = inWords(count);
  return `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`;
}

/** `the Bronze Age`, `the Bronze Age and the Classical Era`, `A, B and C`. */
function nameList(eraIds: readonly EraId[]): string {
  const names = eraIds.map((eraId) => `the ${getEraOrThrow(eraId).name}`);
  if (names.length <= 1) {
    return names[0] ?? "";
  }
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * The prompt's ordinal. §10.19: *"Position, not judgement. It tells the learner the walk is
 * finite."*
 *
 * **It now names what the ages are**, which is the lead's *"AGE 3 OF 4 — of four what?"*.
 * §10.19's own job description for this line is position and nothing else, and it was doing
 * exactly that: the number was right and its subject was missing. Naming them also gives
 * *"stop here"* half of the referent it had none of, because a learner who reads *"of the 4
 * you tested out of"* knows what they are being walked through before they reach the roads.
 */
export function ordinalLine(position: number, total: number): string {
  return `Age ${position} of the ${total} you tested out of`;
}

/** The same line where the walk is one age long, so *"of the 1"* never reaches a screen. */
export function ordinalLineFor(position: number, total: number): string {
  return total === 1 ? "The age you tested out of" : ordinalLine(position, total);
}

/**
 * Tier one: the era's own one-line concept, framed as a statement about the AGE.
 *
 * **The lead read the bare line as a lesson description**, and he is right that it reads that
 * way: `ERA_SUMMARIES[era].concept` is authored as *"a short, scannable line for what the era
 * is about"*, in sentence case with no proper nouns, so on its own under a heading it is a
 * mathematical fragment where the card is asking about an age. The slot is the ruled one
 * (§10.19) and the string is authored for it, so what is wrong is neither: it is that nothing
 * said which of the two the fragment was about.
 *
 * **A lead-in fixes the reading and costs no authoring**, which is the honest limit on it. The
 * fuller fix is a per-era line naming the WORLD rather than the mathematics — every one of the
 * ten summaries already ends in one (*"Trade across a balance scale: what weight of tin
 * balances this copper"*) — and lifting those into their own field is authoring in the era
 * registry that this pass did not do.
 */
export function conceptLine(eraId: EraId): string {
  return `This age is about ${conceptFragment(eraId)}.`;
}

/**
 * The bare authored fragment, for the two places a full sentence is the wrong register.
 *
 * The hand-placing strip sets this line in the HUD's small caps, where *"THIS AGE IS ABOUT
 * FINDING ONE UNKNOWN BY KEEPING BOTH SIDES EQUAL"* is a shout rather than a reminder.
 */
export function conceptFragment(eraId: EraId): string {
  return ERA_SUMMARIES[eraId].concept;
}

/**
 * The disclosure's label, closed and open.
 *
 * §10.23's two constraints on it, both derived from rules already on the books:
 * **descriptive rather than interrogative**, because a control reading *"are you sure you
 * know this?"* beside a skip decision is a second prompt and the nag shape the visual brief
 * bans; and **no warning when closed**, because *"the learner who never opens it has done
 * nothing wrong"*. So it names its contents and never the learner's doubt.
 */
export const DISCLOSURE_LABEL = "What this age covers";

/** Tier two's heading over the list. Generated from the count, so it cannot promise an absent list. */
export function skillsHeading(count: number): string | null {
  return count === 0 ? null : `The ${inWords(count)} skills`;
}

/** Tier two's prose: the era's summary, authored *"to be read cold by someone who has played none of it"*. */
export function summaryProse(eraId: EraId): string {
  return ERA_SUMMARIES[eraId].summary;
}

/**
 * Tier two's list: the age's skills, by their lesson titles.
 *
 * **Absent titles are OMITTED rather than substituted with a node id**, which is what keeps
 * the no-ids property true by construction rather than by luck. 23 nodes across four eras
 * have no authored lesson (**O-TX21**: nineteen are `FUN.*` and `TRG.*`, absent from
 * `LESSON_DOMAINS` entirely, and four have registered domains and no lesson), so at two eras
 * this is empty and {@link skillsHeading} returns `null` over it — §10.25: *"no second
 * heading and no empty list."*
 */
export function skillTitles(eraId: EraId): readonly string[] {
  return eraRosterNodeIds(eraId).flatMap((nodeId) => {
    const title = lessonByNode[nodeId]?.title;
    return title === undefined ? [] : [title];
  });
}

/** One road: what the button says, and the trade it makes. */
export interface CatchUpOptionCopy {
  readonly label: string;
  /** One line under the label. Empty for none. */
  readonly note: string;
}

/** §10.19's accept road, verbatim. Phrased as the walk rather than as a claim about knowing. */
export const KEEP_GOING_LABEL = "Keep going";

/**
 * What `Keep going` does, said under the button rather than in a footnote.
 *
 * **This is the lead's fourth observation applied to the road he did not name.** *"The
 * consequence is in a footnote and it is the most important sentence on the card"* was about
 * the forfeit, and the same is true of the accept road's consequence, which was previously
 * split across a button label (*"The city places them"*) and a footer clause (*"You can move
 * any of them afterwards"*) with nothing joining them.
 *
 * **Who seats the buildings is D-ERA18 and is stated rather than asked** (§10.10): the first
 * age is the learner's to place, every later one is the city's, and the note says which of
 * the two this age is. D-TH9's movability clause rides on the city's sentence because that is
 * the sentence it makes safe.
 */
export function keepGoingNote(
  eraId: EraId,
  mode: "learner_places" | "city_places",
  next: EraId | null,
): string {
  const count = inWords(eraSkillCount(eraId));
  const onward = next === null ? "" : ` to the ${getEraOrThrow(next).name}`;
  // Read off a 1024x580 frame: the city's sentence used to run *"The city puts up its five
  // buildings and the city carries on to the Bronze Age"*, which names its subject twice in
  // one line. The second clause takes the first's subject instead.
  return mode === "learner_places"
    ? `You place its ${count} buildings, and the city moves on${onward}.`
    : `The city puts up its ${count} buildings and moves on${onward}. You can move any of them afterwards.`;
}

/**
 * *"reject the pre-seed completely"* — §10.19 **verbatim**, and the one string whose failure
 * would take the whole design with it.
 *
 * It names what the road delivers and never why you would take it. The lead gave two motives
 * (*"if they feel weak in the content or they just want to see the progression"*) and this is
 * one unlabelled door for both.
 */
export const STOP_HERE_COPY: CatchUpOptionCopy = {
  label: "Stop here and learn this age",
  note: "",
};

/**
 * What `Stop here` does, said under the button.
 *
 * **This is where §10.19's forfeit line moves to, and the move is the fix.** That section put
 * it under both buttons because a two-button row has nowhere else, and called it *"the hardest
 * string on the surface"*; the lead's read of the shipped card is that it *"reads as a non
 * sequitur"* down there and that it is *"the actual trade being offered"*. Under its own road
 * it is neither: it is what this button does.
 *
 * **R33's shape is kept exactly** (`.cursor/skills/author/SKILL.md`): a fact placed on the way
 * past rather than a price placed in front. It does not say what was given up, what it cost,
 * or what they might have done instead, and it takes no warning colour — see `catchUp.css`.
 */
export function stopHereNote(eraId: EraId, forfeited: readonly EraId[]): string {
  const count = inWords(eraSkillCount(eraId));
  return forfeited.length === 0
    ? `You work through its ${count} lessons, and the walk ends here.`
    : `You work through its ${count} lessons, and ${nameList(forfeited)} ${
        forfeited.length === 1 ? "comes" : "come"
      } with it.`;
}

/**
 * §10.6's clause, in §10.19's slot, widened from two roads to three.
 *
 * True by INV-COS-1 (*"gates nothing — not a lesson, not mastery, not the trial, not the era
 * advance"*) and by D-ERA19's shipped layer 3, which is what makes it a fact standing in for
 * a confirmation dialog rather than a reassurance.
 */
export const LESSONS_STAY_OPEN = "The lessons stay open whichever you pick.";

/**
 * The framing sentence: what the learner is standing in the middle of.
 *
 * **The lead's third observation, answered directly.** *"Stop here is doing unexplained work.
 * Stop what? The card never says the learner is being walked forward through ages they tested
 * out of, so 'stop' has no referent."* This is the referent, and it is one sentence because
 * §10.22's budget is real: tier one is measured at 192px against a 289px well.
 *
 * It reads once per age and says the same thing each time, which is deliberate. §10.19's whole
 * worry about a four-prompt sequence is that it *"reads as being asked the same thing four
 * times"*, and the answer to that is the ordinal telling the learner the walk is finite rather
 * than the framing changing under them.
 */
export function walkFraming(total: number): string {
  return total === 1
    ? "The city is founding the age you tested out of, and you decide what happens to it."
    : `The city is walking forward through the ${inWords(total)} ages you tested out of, one at a time.`;
}

/**
 * **THE BUILDINGS THE ISLAND HAD NO ROOM FOR, said on screen.**
 *
 * The lead reported the auto-layout road as *"i dont think 'let the city place the era's
 * buildings for me' button works."* It does: measured over a six-age placement, one press per
 * age seats **6, 5, 5, 2, 1, 0** buildings. The room runs out because `isCellBuildable` closes
 * over `BUILDABLE_RADIUS`, so the buildable island stays at era one's 88 cells however far beat
 * two grows the drawn land — separately-owned work that `worldLayout.ts` names and this surface
 * does not touch.
 *
 * **What was this surface's defect is that the shortfall was reported only to a screen reader.**
 * `CitySurface` announced it through `setPolite`, whose region is `visually-hidden`, so a
 * sighted learner pressed the button, watched nothing appear, and got no sentence about it. That
 * is the whole of the *"doesn't work"* report, and this string is the fix.
 *
 * It names the COUNT, because *"some buildings"* is not an answer to *"where are they"*, and it
 * says where they went, because a building the learner can still place is a different fact from
 * a building that vanished. **`null` when nothing is waiting**, so a complete city is never told
 * it is short — a notice that showed unconditionally would be worse than none.
 */
export function waitingLine(count: number): string | null {
  if (count <= 0) {
    return null;
  }
  const plural = count === 1 ? "building" : "buildings";
  return `${count} ${plural} had no room on the island yet. They are waiting in the build menu.`;
}

/**
 * What the learner reads when they stop — §10.19's own screen.
 *
 * **This is where the advisor speaks for the first time** (§10.17), and §10.19 leaves the
 * line itself to the ceremony-copy owner rather than guessing it, because it is the first
 * thing a character says to this learner. So this is the surface's own sentence and not a
 * character's, and **O-TX19** is the open item that owns the two lines the advisor does say.
 */
export function stoppedHeadline(eraId: EraId): string {
  return `The ${getEraOrThrow(eraId).name} is yours to build.`;
}

/** The second line of the stopped screen: what is ahead, then what is standing behind. */
export function stoppedStanding(eraId: EraId, foundedCount: number): string {
  const count = eraSkillCount(eraId);
  const ahead = `${inWordsCapitalised(count)} skills, ${inWords(count)} lessons.`;
  if (foundedCount === 0) {
    return ahead;
  }
  const ages = foundedCount === 1 ? "age" : "ages";
  return `${ahead} The ${inWords(foundedCount)} ${ages} behind you are founded and standing.`;
}

/** The headline on arrival at the age the diagnostic placed them in. */
export function arrivedHeadline(eraId: EraId): string {
  return `The ${getEraOrThrow(eraId).name} is where your game starts.`;
}

/**
 * Every string this module can produce, over every authored era, for §10.25's sweep.
 *
 * **Derived rather than listed**, which is the whole point: a corpus written by hand is a
 * corpus that goes stale the first time a string is added, and the sweep would then pass over
 * a string it never read. `catchUpStrings.test.ts` floors the count so an empty corpus cannot
 * satisfy the sweep vacuously, and asserts every era contributed.
 */
export function catchUpCopySweepCorpus(eraIds: readonly EraId[]): readonly string[] {
  const strings: string[] = [
    DISCLOSURE_LABEL,
    LESSONS_STAY_OPEN,
    KEEP_GOING_LABEL,
    STOP_HERE_COPY.label,
    STOP_HERE_COPY.note,
    walkFraming(1),
    walkFraming(eraIds.length),
    ordinalLineFor(1, 1),
  ];
  for (const eraId of eraIds) {
    strings.push(
      getEraOrThrow(eraId).name,
      conceptLine(eraId),
      conceptFragment(eraId),
      summaryProse(eraId),
      // BOTH build modes at every era, because D-ERA18 gives the first age one sentence and
      // every later age the other, and a corpus holding only the common one would sweep half
      // the copy. The onward clause is exercised in both directions for the same reason: era
      // ten has no next age and takes a shorter sentence.
      keepGoingNote(eraId, "learner_places", null),
      keepGoingNote(eraId, "city_places", null),
      keepGoingNote(eraId, "learner_places", eraId),
      keepGoingNote(eraId, "city_places", eraId),
      stopHereNote(eraId, []),
      stopHereNote(eraId, [eraId]),
      stopHereNote(eraId, eraIds.slice(0, 2)),
      stoppedHeadline(eraId),
      stoppedStanding(eraId, 2),
      arrivedHeadline(eraId),
      ordinalLine(1, eraIds.length),
      skillsHeading(eraSkillCount(eraId)) ?? "",
      ...skillTitles(eraId),
    );
  }
  return strings.filter((entry) => entry.length > 0);
}
