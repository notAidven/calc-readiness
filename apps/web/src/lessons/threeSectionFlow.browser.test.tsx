/**
 * A teaching slide is walked in SECTIONS, and each one shows a different thing.
 *
 * The rule (`teachingSections.ts`): the advisor says the slide's line, then names an instance
 * and works it, then the widget that asks the learner to do it. The bubble speaks the
 * same line throughout; what moves is what sits BELOW it. The whole point is that the
 * widget is not sitting there to be poked at while the idea behind it is still being
 * explained, so "the widget is absent from the first two sections" is the claim, and it
 * cannot be read off a prop or a class name — it is what is mounted.
 *
 * ## Why this is a fixture and not a shipped pack
 *
 * The packs are migrated onto `worked_examples` a domain at a time, so any assertion here
 * against their prose, or against how many clicks a slide costs, would be measuring files
 * that are being edited underneath it. The fixtures below own their own content, so what is
 * asserted is the PLAYER's behaviour rather than an author's current draft. The one sweep
 * that does read shipped packs (last section) asserts only the structural half — no pack
 * puts a widget under the bubble in its opening section — and reaches each widget by
 * clicking until it appears rather than by a count.
 *
 * Every assertion in this file was shown red by injecting the corresponding defect into
 * `AdvisorLesson.tsx` or `teachingSections.ts` and re-running; the injections are named in
 * each test's comment so the next person can repeat them rather than take this on trust.
 */

import { afterEach, expect, test } from "vitest";

import { AdvisorLesson } from "./AdvisorLesson";
import { LESSON_DOMAINS } from "./domains";
import { findButton, type Harness, hasText, mount, waitFor } from "./testHarness";
import type { LessonContent } from "./types";

import "../styles.css";

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

/**
 * Two slides, both with an authored worked example, and a GATING widget on the first.
 *
 * The gate is on slide 0 deliberately: it is the same gate in all three of that slide's
 * sections, so "Next is offered here and withheld there" is a claim about the section and
 * not about two different lessons.
 */
const PACK: LessonContent = {
  node_id: "TEST",
  title: "Three-section fixture",
  mini_lesson: ["ALPHA is the first idea.", "BETA is the second idea."],
  worked_examples: [
    {
      prompt: "ALPHAPROMPT names the instance: add $3 + 4$.",
      steps: ["ALPHASTEP one, the first move.", "ALPHASTEP two, so it comes to $7$."],
    },
    {
      prompt: "BETAPROMPT names the instance: add $4 + 5$.",
      steps: ["BETASTEP one, the first move.", "BETASTEP two, so it comes to $9$."],
    },
  ],
  visuals: [
    { after: 0, id: "radical-parts-label", gates: true },
    { after: 1, id: "sqrt-square-spot" },
  ],
};

/** One slide, no worked example: the shape every unmigrated pack still has. */
const UNMIGRATED: LessonContent = {
  node_id: "TEST",
  title: "Unmigrated fixture",
  mini_lesson: ["GAMMA is the only idea."],
  visuals: [{ after: 0, id: "sqrt-square-spot" }],
};

function open(content: LessonContent): HTMLElement {
  h = mount(<AdvisorLesson content={content} />);
  return h.host;
}

function bubble(host: HTMLElement): string {
  return host.querySelector(".advisor-npc__bubble")?.textContent ?? "";
}

function stepCard(host: HTMLElement): HTMLElement | null {
  return host.querySelector<HTMLElement>(".worked-solution");
}

function figure(host: HTMLElement): HTMLElement | null {
  return host.querySelector<HTMLElement>("figure.lesson-visual");
}

function hasButton(host: HTMLElement, text: string): boolean {
  return Array.from(host.querySelectorAll("button")).some(
    (b) => (b.textContent ?? "").trim() === text,
  );
}

/** Click a control and give React a frame to re-render into. */
async function press(host: HTMLElement, text: string): Promise<void> {
  findButton(host, text).click();
  await new Promise<void>((resolve) => setTimeout(resolve, 20));
}

/** Wait for the advisor's first section to be up before anything is read off it. */
async function opened(host: HTMLElement, line: string): Promise<void> {
  await waitFor(() => hasText(host, line), `the advisor opens on "${line}"`);
}

/**
 * Name every part of the gating label widget, the way a learner does: hold a name, then
 * press blanks until one takes it. A wrong drop is refused and costs nothing.
 */
async function solveTheGate(host: HTMLElement): Promise<void> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const chip = host.querySelector<HTMLButtonElement>(".lesson-sorter__chip");
    if (chip === null) {
      return;
    }
    chip.click();
    for (const slot of Array.from(
      host.querySelectorAll<HTMLButtonElement>(".lesson-label__slot"),
    ).filter((s) => s.getAttribute("data-named") !== "yes")) {
      slot.click();
      if (slot.getAttribute("data-named") === "yes") {
        break;
      }
      chip.click();
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("could not name every part of the gating widget");
}

/* --------------------------------------------------- 1. what each section puts on screen */

/**
 * INJECTED RED BY: dropping the `phase.section === "activity"` test off `activityIndex` in
 * `AdvisorLesson.tsx`, so the visuals render in every section.
 */
test("the lecture is the slide's line and nothing under it", async () => {
  const host = open(PACK);
  await opened(host, "ALPHA is the first idea.");

  expect(bubble(host), "the advisor is not saying the slide's line").toContain(
    "ALPHA is the first idea.",
  );
  expect(
    figure(host),
    "the widget is on screen while the idea is still being explained",
  ).toBeNull();
  expect(stepCard(host), "the worked example is showing before its own section").toBeNull();
});

/**
 * INJECTED RED BY: making `advanceTeaching` skip the `example` section (return the last
 * section of the list instead of `sections[at + 1]`), which lands the first Next on the
 * activity and leaves no step card to find.
 */
test("the second section adds the worked example, and still no widget", async () => {
  const host = open(PACK);
  await opened(host, "ALPHA is the first idea.");
  await press(host, "Next");

  const card = stepCard(host);
  expect(card, "the second section printed no worked example").not.toBeNull();
  expect(figure(host), "the widget arrived a section early").toBeNull();
  // Still the same slide, still the same line: the bubble does not go quiet under the card.
  expect(bubble(host), "the advisor stopped speaking the slide's line").toContain(
    "ALPHA is the first idea.",
  );
});

/**
 * The card is the STEP-CARD branch of `WorkedSolution`, under its own label.
 *
 * INJECTED RED BY: dropping `label="Worked example"` from the `<WorkedSolution>` call in
 * `AdvisorLesson.tsx`, which falls back to "Worked solution" — the practice card's label,
 * which would tell a learner mid-lecture that they had reached a question they had missed.
 */
test("the worked example renders as labelled step cards, not as a figure", async () => {
  const host = open(PACK);
  await opened(host, "ALPHA is the first idea.");
  await press(host, "Next");

  const card = stepCard(host);
  if (card === null) {
    throw new Error("the second section printed no worked example");
  }
  expect(
    card.classList.contains("worked-solution--figure"),
    "a teaching slide has no item behind its steps, so it may not take the figure branch",
  ).toBe(false);
  expect(
    card.querySelector(".micro-label.worked-solution__label")?.textContent,
    "the card is not labelled as the slide's worked example",
  ).toBe("Worked example");

  const steps = Array.from(
    card.querySelectorAll<HTMLElement>(
      "ol.worked-solution__steps > li.worked-solution__step",
    ),
  );
  expect(steps.length, "the authored steps did not render one card each").toBe(2);
  expect(
    steps[steps.length - 1]?.getAttribute("data-answer"),
    "the last step is not marked as the one that names the result",
  ).toBe("true");
  expect(card.textContent, "the authored steps are not the ones printed").toContain(
    "ALPHASTEP two",
  );
});

/**
 * The card opens by saying WHICH instance it is about to work.
 *
 * Without it the steps are a solution to a question the learner was never shown, and they
 * read the moves backwards to recover the problem -- so the prompt is the part that makes
 * section 2 a worked example rather than four sentences of arithmetic. Its POSITION is half
 * the claim: printed under the steps it would be a summary of something already finished,
 * which is why the order is asserted here and not just the presence.
 *
 * INJECTED RED BY: dropping `intro={workedExample.prompt}` from the `<WorkedSolution>` call
 * in `AdvisorLesson.tsx` (fails on the missing intro), and separately by moving the intro
 * block below `<ol className="worked-solution__steps">` in `WorkedSolution.tsx` (fails on the
 * order while every other assertion in this file still passes).
 */
test("the worked example names its instance above the steps", async () => {
  const host = open(PACK);
  await opened(host, "ALPHA is the first idea.");

  // The lecture is the slide's line alone, so the instance has not been named yet either.
  expect(
    host.textContent,
    "the instance was named while the idea was still being explained",
  ).not.toContain("ALPHAPROMPT");

  await press(host, "Next");
  const card = stepCard(host);
  if (card === null) {
    throw new Error("the second section printed no worked example");
  }

  const intro = card.querySelector<HTMLElement>(".worked-solution__intro");
  expect(intro, "the card printed steps with no instance named above them").not.toBeNull();
  expect(intro?.textContent, "the authored prompt is not the one printed").toContain(
    "ALPHAPROMPT",
  );

  const list = card.querySelector("ol.worked-solution__steps");
  if (intro === null || list === null) {
    throw new Error("the card is missing its intro or its step list");
  }
  expect(
    Boolean(intro.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING),
    "the instance is named below the moves that work it, so it reads as a summary",
  ).toBe(true);
});

/**
 * INJECTED RED BY: rendering the worked example in every section (dropping the
 * `phase.section === "example"` test off `workedExample` in `AdvisorLesson.tsx`), which
 * leaves the step cards sitting above the widget that is asking the same question.
 */
test("the third section is the widget, with the worked example gone", async () => {
  const host = open(PACK);
  await opened(host, "ALPHA is the first idea.");
  await press(host, "Next");
  await press(host, "Next");

  await waitFor(() => figure(host) !== null, "the activity section mounts its widget");
  expect(stepCard(host), "the worked example is still up beside the widget").toBeNull();
  expect(bubble(host), "the advisor stopped speaking the slide's line").toContain(
    "ALPHA is the first idea.",
  );
});

/* ----------------------------------------------------------- 2. where the gate applies */

/**
 * The gate belongs to the section that RENDERS the widget, and to no earlier one.
 *
 * INJECTED RED BY: computing `activityIndex` for every teaching section, so `gateBlocked`
 * is true from the lecture on — Next then never appears at all and the walk cannot start.
 */
test("an unmet gate leaves Next on offer in the lecture and the worked example", async () => {
  const host = open(PACK);
  await opened(host, "ALPHA is the first idea.");

  expect(hasButton(host, "Next"), "the lecture withheld Next").toBe(true);
  await press(host, "Next");
  expect(hasButton(host, "Next"), "the worked example withheld Next").toBe(true);

  // And the gate really is unmet, rather than this fixture having no gate: one more
  // section, the same widget, and Next is gone.
  await press(host, "Next");
  await waitFor(() => figure(host) !== null, "the activity section mounts its widget");
  expect(hasButton(host, "Next"), "the activity did not withhold Next").toBe(false);
});

/**
 * INJECTED RED BY: `const gateBlocked = false;` in `AdvisorLesson.tsx` — Next is then on
 * offer beside an untouched widget and the first assertion fails.
 *
 * The landing is asserted too, because a slide's first section is where the next slide
 * starts: INJECTED RED BY making `advanceTeaching` step to `{ index: next, section:
 * "activity" }` instead of that slide's first section, which drops the learner onto slide
 * two's widget having never been told what slide two is about.
 */
test("finishing the widget releases Next, onto the NEXT slide's lecture", async () => {
  const host = open(PACK);
  await opened(host, "ALPHA is the first idea.");
  await press(host, "Next");
  await press(host, "Next");
  await waitFor(() => figure(host) !== null, "the activity section mounts its widget");

  expect(hasButton(host, "Next"), "Next was on offer before the widget was finished").toBe(
    false,
  );
  await solveTheGate(host);
  await waitFor(() => hasButton(host, "Next"), "the finished widget hands Next back");

  await press(host, "Next");
  await waitFor(() => hasText(host, "BETA is the second idea."), "slide two opens");
  expect(figure(host), "slide two opened on its widget rather than on its line").toBeNull();
  expect(stepCard(host), "slide two opened on its worked example").toBeNull();
});

/* ------------------------------------------------------------------- 3. walking back */

/**
 * Previous off a slide's FIRST section lands on the previous slide's LAST one — what the
 * learner just came through, not the start of it.
 *
 * INJECTED RED BY: landing on `sectionsFor(content, currentIndex - 1)[0]` in `goPrevious`,
 * which sends a learner who stepped back one page to the top of the page before it.
 */
test("Previous off a slide's first section lands on the previous slide's activity", async () => {
  const host = open(PACK);
  await opened(host, "ALPHA is the first idea.");
  await press(host, "Next");
  await press(host, "Next");
  await waitFor(() => figure(host) !== null, "the activity section mounts its widget");
  await solveTheGate(host);
  await waitFor(() => hasButton(host, "Next"), "the finished widget hands Next back");
  await press(host, "Next");
  await waitFor(() => hasText(host, "BETA is the second idea."), "slide two opens");

  await press(host, "Previous");

  await waitFor(() => hasText(host, "ALPHA is the first idea."), "slide one comes back");
  expect(figure(host), "it came back to slide one without its widget").not.toBeNull();
  expect(stepCard(host), "it came back to slide one's worked example").toBeNull();
});

/**
 * INJECTED RED BY: `const canGoPrevious = phase.kind === "teaching";` — the very first
 * section then offers a way back to nothing.
 */
test("the very first section still offers no way back", async () => {
  const host = open(PACK);
  await opened(host, "ALPHA is the first idea.");

  expect(
    hasButton(host, "Previous"),
    "the first section of the lesson offers Previous",
  ).toBe(false);
  // And it is not that this lesson never offers one.
  await press(host, "Next");
  expect(hasButton(host, "Previous"), "the second section offers no way back").toBe(true);
});

/* ---------------------------------------------- 4. a pack that authored no worked example */

/**
 * The unmigrated packs. A slide with no `worked_examples` entry is TWO sections, so
 * those packs cost exactly one extra click per slide and change in no other way.
 *
 * INJECTED RED BY: returning `["lecture", "example", "activity"]` unconditionally from
 * `sectionsFor` in `teachingSections.ts` — the first Next then lands on an example section
 * with nothing in it, so no widget appears and the learner reads a blank page.
 */
test("a slide with no worked example is two sections, with no empty card between them", async () => {
  const host = open(UNMIGRATED);
  await opened(host, "GAMMA is the only idea.");

  expect(figure(host), "the widget is up during the lecture").toBeNull();
  await press(host, "Next");

  await waitFor(() => figure(host) !== null, "one Next reaches the widget");
  expect(
    stepCard(host),
    "a pack that authored no example still rendered a card",
  ).toBeNull();
});

/* --------------------------------------------------- 5. the shipped packs, structurally */

/**
 * THE POPULATION IS EVERY AUTHORED PACK, AND MIGRATION IS A PROPERTY IT IS ASKED FOR.
 *
 * A pack walks in three sections because it carries `worked_examples`, and for no other
 * reason: `sectionsFor` reads that array and nothing about which folder the pack came from.
 * So the population is derived from `LESSON_DOMAINS` — the one place a domain is declared,
 * so a domain cannot join the app without joining this sweep — and it is every pack the
 * registry offers, migrated or not.
 *
 * It used to iterate `d1Lessons` with a floor of 6, which is the shape
 * `.cursor/rules/qa-verification.mdc` warns about: a guard scoped to where the behaviour was
 * first implemented rather than to who exhibits it. Widening it onto every MIGRATED pack
 * closed that and left a quieter version of the same fault behind, because membership was
 * still conditional on the one field this file exists to protect: deleting `worked_examples`
 * from a pack did not fail an assertion, it removed the pack from the population, and the
 * only guards left to catch it were the floors. MEASURED at `33c411c4`, before the census
 * below existed: delete the key from `content/lessons/d6/CG.1.json` and this file reports
 * `12 passed`, unchanged. So the walk takes {@link allPacks}, and {@link migratedPacks} is
 * only what the migration floors are counted over.
 */
const allPacks: readonly {
  readonly domain: string;
  readonly content: LessonContent;
}[] = LESSON_DOMAINS.flatMap((domain) =>
  domain.lessons.map((content) => ({ domain: domain.id, content })),
);

/** The packs that authored worked examples, which is what the migration floors count. */
const migratedPacks = allPacks.filter(({ content }) =>
  Array.isArray(content.worked_examples),
);

/**
 * The one legitimate exception to the WALK, NAMED rather than filtered away.
 *
 * A pack that mounts no widget at all has none to hold back in its opening section and no
 * first widget to click to, so it is outside the behaviour rather than excused from it. But
 * a pack that never had a widget and a pack that LOST its widgets look identical from
 * inside the loop, so the skip is not left silent: the census below asserts this list in
 * both directions. Empty at this SHA, because all 62 authored packs mount at least one.
 */
const NO_WIDGET_ANYWHERE: readonly string[] = [];

/**
 * The packs that have NOT adopted `worked_examples`, named with the reason each one has.
 *
 * A backlog rather than a permanent exemption: every name here owes the migration, and the
 * list is written down so that a pack which QUIETLY loses the field cannot be mistaken for
 * one that has simply not had its turn. That is the whole difference the census below buys —
 * before it, an unmigrated pack was not a failure, it was an absence.
 *
 * EMPTY AT THIS SHA, and the backlog it held is closed: all 62 authored packs carry the
 * field. The last three were D4's POL.5, POL.6 and POL.7, authored after D4's three-section
 * round in single-node rounds that shipped the two-section shape (`249e11ff`, `b119c038`)
 * and were never swept back over. Migrating them is what took {@link D4_FLOOR} from 5 to 8,
 * {@link MIGRATED_PACK_FLOOR} from 59 to 62 and {@link BEYOND_D1_FLOOR} from 53 to 56, and
 * it is why {@link MIGRATED_PACK_FLOOR} and {@link WALKED_PACK_FLOOR} now agree: with
 * nothing excused, `migratedPacks` and the walked population are the same 62 packs.
 *
 * AN EMPTY LIST IS NOT A DEAD ONE, which is the point of asserting it both ways. The two
 * list-facing directions are what a repopulating edit has to get past — a name for a pack
 * that carries the field, or for a pack that no longer exists, fails on the way in, so the
 * list cannot be reopened as a place to park a regression. What it says over the list as it
 * stands is said by the outward direction, and emptiness is exactly what makes that
 * direction total: with nothing excused, "no pack outside the list lacks `worked_examples`"
 * is the unconditional claim that every authored pack is migrated, floored at 62 below so
 * that a shrunken registry cannot satisfy it by having nothing left to check.
 */
const NOT_YET_MIGRATED: readonly string[] = [];

/**
 * The census the floors are read against, recorded so the next person can tell a shrunken
 * population from a deliberately conservative constant.
 *
 * MEASURED off the census this file's own loop prints, not carried forward and not arithmetic
 * on the previous census: at `6b819339` with D4's POL.5/6/7 migration in the tree, 62 authored
 * packs, ALL 62 of them migrated, all 62 mounting at least one widget, over all 10 registered
 * domains — `d1=6 d10=2 d2=5 d3=5 d4=8 d5=6 d6=11 d7=4 d8=6 d9=9`, 56 of the 62 beyond D1.
 * {@link NOT_YET_MIGRATED} is empty, so there is no longer a pack this census excuses.
 *
 * These are set to EXACTLY that census, which is what a floor here is for. It has moved twice:
 * the branch base (`5bac81f0`) read 48 migrated over 9 domains with zero in D6 against
 * 48 / 9 / 42; D6's eleven packs then handed those constants eleven packs of slack, which is
 * the slack the CG.1 injection below exploited and 59 / 10 / 53 took back at `33c411c4`; and
 * D4's last three packs migrating takes them to 62 / 10 / 56 here. A figure in this comment is
 * a measurement of a tree at a SHA — re-run the loop rather than adding three to it.
 *
 * {@link BEYOND_D1_FLOOR} is the assertion that this sweep is genuinely wider than the
 * layer it used to stop at: a floor constrains size, not shape, and 62 packs of D1 and
 * nine domains' worth of nothing would clear the other two. {@link WALKED_PACK_FLOOR} is
 * the same argument for the widening in the other direction: it fails if the walk narrows
 * back to the migrated packs, which is how an unmigrating pack escaped it before.
 *
 * THE THREE RAISED CONSTANTS WERE SHOWN RED AT THEIR NEW VALUES, because a tightening owes the
 * same evidence as a fix and a constant raised to a number nobody watched fail is a constant
 * nobody has measured. Only the first touches a content file; the rest narrow the derivation
 * above. All four readings below are at `6b819339` with the D4 migration in the tree:
 *
 *  - deleting `worked_examples` from `content/lessons/d6/CG.1.json` fails at *"too few
 *    migrated packs place a widget, so most of the behaviour went unmeasured: d1=6 d10=2
 *    d2=5 d3=5 d4=8 d5=6 d6=10 d7=4 d8=6 d9=9: expected 61 to be greater than or equal to
 *    62"* (and at the census test, which names CG.1);
 *  - relabelling ten of the eleven d6 packs `d1` in the derivation above keeps 62 packs over
 *    10 domains, clears the pack and domain floors, and still fails at *"this sweep has
 *    narrowed back to (almost) the D1 packs it used to stop at: d1=16 d10=2 d2=5 d3=5 d4=8
 *    d5=6 d6=1 d7=4 d8=6 d9=9: expected 46 to be greater than or equal to 56"*;
 *  - {@link D4_FLOOR}'s own red is recorded beside it, and it is the one that fails alone;
 *  - {@link DOMAIN_FLOOR} is unchanged at 10, so its red stands as taken at `33c411c4`:
 *    relabelling ALL eleven d6 packs `d1` held the pack count at that SHA's floor and failed at
 *    *"the floor was met by too few domains, so the population has drifted back to a slice of
 *    the behaviour: d1=17 d10=2 d2=5 d3=5 d4=5 d5=6 d7=4 d8=6 d9=9: expected 9 to be greater
 *    than or equal to 10"* — the composition assertion catching a population of the right SIZE
 *    and the wrong shape. Read the census in it as the pre-D4-migration one.
 *
 * {@link WALKED_PACK_FLOOR} IS CURRENTLY UNFALSIFIABLE, AND SAYING SO IS THE POINT. Its
 * recorded injection — walking `migratedPacks` instead of `allPacks` — used to fail at
 * *"expected 59 to be greater than or equal to 62"*, because three packs were unmigrated and
 * the narrowed walk lost them. With the backlog closed the two populations are the same 62
 * packs, so MEASURED here rather than assumed: make that substitution on this tree and the
 * file reports `13 passed`. The defect it names is still caught twice over, by the census
 * test's outward direction and by {@link MIGRATED_PACK_FLOOR} (both shown above, on the CG.1
 * injection), so the assertion stays: it becomes falsifiable again the moment any pack is
 * legitimately excused, and a floor that is temporarily implied by its neighbour is not a
 * floor worth deleting. Do not re-record that red without re-taking it.
 */
const MIGRATED_PACK_FLOOR = 62;
const DOMAIN_FLOOR = 10;
const BEYOND_D1_FLOOR = 56;
const WALKED_PACK_FLOOR = 62;

/**
 * D4 IS IN THE POPULATION, AND THE THREE FLOORS ABOVE CANNOT SAY SO.
 *
 * D4's eight packs join the derivation automatically, because they carry `worked_examples`
 * and for no other reason: that is the point of scoping by the behaviour. But an earlier round
 * widened a narrower version of this sweep onto D4 on purpose, and a floor constrains size,
 * not shape — so "D4 is measured" needs somewhere it can fail, in the same way
 * {@link BEYOND_D1_FLOOR} gives "this is wider than D1" somewhere it can fail.
 *
 * MEASURED, not argued, and re-measured here rather than incremented. This was 5 while D4's
 * migrated packs were POL.1..POL.4 and POL.8 alone; POL.5, POL.6 and POL.7 have since adopted
 * `worked_examples`, and the loop now prints `d4=8` inside
 * `d1=6 d10=2 d2=5 d3=5 d4=8 d5=6 d6=11 d7=4 d8=6 d9=9` at `6b819339` with that migration in
 * the tree. D4 is the one domain whose whole roster is in, which is why the constant above is
 * a domain total and not a floor with slack in it.
 *
 * INJECTED RED BY: relabelling D4's packs in the derivation above
 * (`domain.id === "d4" ? "d4x" : domain.id`), which leaves the pack count at 62, the domain
 * count at 10 and `beyondD1` at 56, so all three of the floors above stay green and only this
 * one fails: *"d4 has fallen out of the measured population, so this sweep no longer speaks
 * for the domain this round widened it onto: d1=6 d10=2 d2=5 d3=5 d4x=8 d5=6 d6=11 d7=4 d8=6
 * d9=9: expected 0 to be greater than or equal to 8"*. Re-taken at the new value on the tree
 * described above, and the run reported `1 failed | 12 passed`, which is the evidence for the
 * sentence it is here to support: D4 can leave this sweep entirely without any of the other
 * three constants noticing.
 */
const D4_FLOOR = 8;

/**
 * BOTH DIRECTIONS WERE SHOWN RED, and neither injection touches a content file: the packs
 * were migrating in parallel as this landed, so the defect goes into a scratch copy of one
 * pack in the derivation above (`.map(pack => pack.content.node_id === "GEO.2" ? ... : pack)`)
 * and is reverted with it.
 *
 * INJECTED RED BY: naming a pack that DOES mount a widget — `NO_WIDGET_ANYWHERE = ["GEO.2"]`
 * — which fails at *"a named exception is no longer a migrated pack that mounts no widget:
 * expected [ 'GEO.2' ] to deeply equal []"*. That is the direction that stops a name sitting
 * in the list forever excusing nothing.
 *
 * INJECTED RED BY, the other way: a scratch copy of GEO.2 with `visuals: []` against the
 * empty list, which fails at *"a migrated pack mounts no widget at all and is not a named
 * exception"* — so a pack that LOSES its widgets fails here instead of quietly dropping out
 * of the sweep below.
 */
test("every pack owes the sweep, and the widget-free ones are named", () => {
  const widgetless = allPacks
    .filter(({ content }) => (content.visuals ?? []).length === 0)
    .map(({ content }) => content.node_id);

  expect(
    [...NO_WIDGET_ANYWHERE].sort(),
    "a named exception is no longer a pack that mounts no widget",
  ).toEqual(NO_WIDGET_ANYWHERE.filter((id) => widgetless.includes(id)).sort());
  expect(
    widgetless.filter((id) => !NO_WIDGET_ANYWHERE.includes(id)),
    "a pack mounts no widget at all and is not a named exception",
  ).toEqual([]);
});

/**
 * UNMIGRATING A PACK IS A FAILURE HERE, NOT A DEPARTURE.
 *
 * This is the assertion the floors could not make. A floor constrains size, not shape:
 * 62 / 10 / 56 is satisfied by 61 of the right packs plus one of anything, and — before the
 * walk below took `allPacks` — it was satisfied by any 62 packs that still had the field,
 * whichever 62 those were. So the composition is asserted directly: the set of packs
 * WITHOUT `worked_examples`, read off the registry, must be exactly the set named in
 * {@link NOT_YET_MIGRATED}, which fails whichever way the list and the tree come apart.
 *
 * WITH THE LIST EMPTY, the outward direction is what carries the claim, and emptiness is what
 * makes it total: "no pack outside the list lacks `worked_examples`" stops being a statement
 * about a remainder and becomes the unconditional one that every authored pack is migrated.
 * The two list-facing directions have nothing to say about the tree as it stands — they are
 * what a repopulating edit has to get past, so the list cannot be quietly reopened as a place
 * to park a regression — and both were still shown red below, so neither is decorative.
 *
 * The floor underneath is the one the rule asks for behind any containment assertion: all
 * three equalities hold trivially over an empty registry, and they would hold just as well
 * over a list that had grown until it excused everything.
 *
 * ALL THREE DIRECTIONS WERE SHOWN RED, at `6b819339` with D4's POL.5/6/7 migration in the
 * tree. The first is the defect this test was written for and is a content edit; the other two
 * put a name into {@link NOT_YET_MIGRATED} that the tree does not support, which is the only
 * way to red a list-facing direction over an empty list:
 *
 *  - deleting `worked_examples` from `content/lessons/d6/CG.1.json` fails at *"a pack has no
 *    worked_examples and is not a named exception, so it has left the three-section
 *    structure silently: expected [ 'CG.1' ] to deeply equal []"*;
 *  - `NOT_YET_MIGRATED = ["POL.0"]`, a name no pack has, fails at *"a named exception is no
 *    longer an authored pack, so it is excusing nothing: expected [ 'POL.0' ] to deeply equal
 *    []"*;
 *  - a listed pack that carries the field needs no synthetic injection at all: the state this
 *    file was in before the list was emptied IS that defect, and it failed at *"a named
 *    exception now carries worked_examples and has not left the list: expected [ 'POL.5',
 *    'POL.6', 'POL.7' ] to deeply equal []"* — which is what the three D4 packs adopting
 *    `worked_examples` while still named here looked like from inside this assertion.
 */
test("every pack carries worked_examples, and the ones that do not are named", () => {
  const authored = new Set(allPacks.map(({ content }) => content.node_id));
  const unmigrated = allPacks
    .filter(({ content }) => !Array.isArray(content.worked_examples))
    .map(({ content }) => content.node_id);

  expect(
    NOT_YET_MIGRATED.filter((id) => !authored.has(id)),
    "a named exception is no longer an authored pack, so it is excusing nothing",
  ).toEqual([]);
  expect(
    NOT_YET_MIGRATED.filter((id) => !unmigrated.includes(id)),
    "a named exception now carries worked_examples and has not left the list",
  ).toEqual([]);
  expect(
    unmigrated.filter((id) => !NOT_YET_MIGRATED.includes(id)).sort(),
    "a pack has no worked_examples and is not a named exception, so it has left the three-section structure silently",
  ).toEqual([]);
  expect(
    migratedPacks.length,
    "the migrated population has shrunk, or the exception list has grown until it excuses most of it",
  ).toBeGreaterThanOrEqual(MIGRATED_PACK_FLOOR);
});

/**
 * The same rule over every authored pack, asserted on what mounts rather than on any
 * wording, because the packs are rewritten domain by domain as this lands.
 *
 * A two-section pack owes this exactly as a three-section one does — its opening section is
 * a lecture too — so the walk covers all 62 while the migration counters below tally only the
 * packs that carry `worked_examples`, which at this SHA is the same 62. That split is the
 * point and it survives the two counts coinciding: `walked` cannot fall when a pack
 * unmigrates, so a pack that drops the field stays in front of every per-pack assertion here
 * and shows up as a shortfall in `packs` rather than as one fewer thing to check.
 *
 * The floors are here because both halves are absences over a derived population: an empty
 * `LESSON_DOMAINS`, a filter that had stopped matching, or a set of packs that had stopped
 * placing widgets, would satisfy every line above them.
 *
 * INJECTED RED BY: a scratch copy of ONE NON-D1 migrated pack with every `visuals[].after`
 * shifted past its last slide — the dangling index a migration that cuts slides leaves
 * behind — which fails at *"d10/GEO.2: no sequence of Next clicks reaches its first widget:
 * expected null not to be null"*. It is worth being clear about what that red proves: GEO.2
 * is a D10 pack, so the same defect was invisible to this sweep for as long as it iterated
 * `d1Lessons`, and the widened population is what names it.
 *
 * THE OPENING SECTION IS DERIVED, AND THIS SWEEP IS WHAT HOLDS THAT. Recorded here because
 * the fix lives in another file and nothing on this side of the tree records what it bought.
 * `AdvisorLesson.tsx` used to open a lesson on a LITERAL first section — a second definition
 * of the walk order, free to disagree silently with the `sectionsFor` every other transition
 * reads — and now opens on `sectionsFor(content, 0)[0]` (`AdvisorLesson.tsx:170` at the merge,
 * `:150` when it was written). Measured both ways at `68c5aa9a`, against that round's narrower
 * population: returning `["activity", "lecture", "example"]` from `sectionsFor` reds this
 * sweep with the derivation in place, and reports `1 passed` against the literal, over
 * exactly the same broken walk. Not re-measured on the merged tree, so read it as evidence
 * about `68c5aa9a`; what the merged tree does show is that the derivation is still there.
 */
test("no pack puts a widget under the bubble in its opening section", async () => {
  let walked = 0;
  let packs = 0;
  let reached = 0;
  let beyondD1 = 0;
  const perDomain = new Map<string, number>();

  for (const { domain, content } of allPacks) {
    if ((content.visuals ?? []).length === 0) {
      // Outside the behaviour, and named in NO_WIDGET_ANYWHERE by the census above.
      continue;
    }
    const host = open(content);
    await waitFor(
      () => host.querySelector(".advisor-npc__bubble") !== null,
      `${domain}/${content.node_id} opens`,
    );
    walked += 1;
    if (Array.isArray(content.worked_examples)) {
      packs += 1;
      perDomain.set(domain, (perDomain.get(domain) ?? 0) + 1);
      if (domain !== "d1") {
        beyondD1 += 1;
      }
    }
    expect(
      figure(host),
      `${domain}/${content.node_id}: the opening section already has a widget under the bubble`,
    ).toBeNull();

    // And the widget is still reachable: clicked to, not counted to, since how many
    // sections a slide has depends on whether the pack authored an example for it.
    for (let step = 0; step < 8 && figure(host) === null; step += 1) {
      if (!hasButton(host, "Next")) {
        break;
      }
      await press(host, "Next");
    }
    expect(
      figure(host),
      `${domain}/${content.node_id}: no sequence of Next clicks reaches its first widget`,
    ).not.toBeNull();
    reached += 1;

    h?.cleanup();
    h = null;
  }

  const census = [...perDomain.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([domain, count]) => `${domain}=${count}`)
    .join(" ");

  expect(
    packs,
    `too few migrated packs place a widget, so most of the behaviour went unmeasured: ${census}`,
  ).toBeGreaterThanOrEqual(MIGRATED_PACK_FLOOR);
  expect(
    walked,
    "the walk has narrowed back to the migrated packs, so a pack that drops `worked_examples` would leave this sweep rather than fail it",
  ).toBeGreaterThanOrEqual(WALKED_PACK_FLOOR);
  expect(
    perDomain.size,
    `the floor was met by too few domains, so the population has drifted back to a slice of the behaviour: ${census}`,
  ).toBeGreaterThanOrEqual(DOMAIN_FLOOR);
  expect(
    beyondD1,
    `this sweep has narrowed back to (almost) the D1 packs it used to stop at: ${census}`,
  ).toBeGreaterThanOrEqual(BEYOND_D1_FLOOR);
  expect(
    perDomain.get("d4") ?? 0,
    `d4 has fallen out of the measured population, so this sweep no longer speaks for the domain this round widened it onto: ${census}`,
  ).toBeGreaterThanOrEqual(D4_FLOOR);
  expect(reached, "a measured pack's widget was never reached").toBe(walked);
});
