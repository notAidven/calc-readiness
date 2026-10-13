import {
  HARD_WINTER,
  type MidEraCrisisCall,
  midEraCrisisCall,
  PLAGUE,
  PLAGUE_ERA,
  type PlagueAction,
  SUCCESSION,
  type WinterActionKind,
} from "@cr/game";
import type { EraId } from "@cr/skill-graph";
import type { Mastery } from "@cr/state-schema";
import { useEffect, useMemo, useRef, useState } from "react";

import { playSfx } from "../audio/soundEffects";
import { materialWord } from "../economy/materialWord";
import type { AdvisorDress } from "../lessons/OruAdvisorCharacter";
import { runtimeStorage } from "../storage/runtimeStorage";
import { hasCrisisContentFor, resolveCrisisEra } from "../winter/crisisEra";
import { advisorDressFor } from "./advisorDress";
import { crisisCallMessage } from "./announcements";
import { eraAdvisor, resolveEraAdvisor } from "./eraDressing";

/**
 * THE CRISIS CALL — what the city says when an era's mid-era crisis fires, and the terms
 * the advisor explains before the learner walks into it.
 *
 * The trigger itself is `@cr/game`'s `midEraCrisisCall` (D-CRISIS-9: `ceil(n / 2)` of the
 * era's own nodes). This module is the app half: WHEN the call is surfaced, WHAT is said,
 * and nothing else. Copy lives here rather than inside the component so it can be swept by
 * a test that never mounts anything, which is how `announcements.ts` keeps its own copy
 * honest.
 *
 * ## The numbers are read from the engine, never typed here
 *
 * `HARD_WINTER.rounds` and `HARD_WINTER.batch_size` are the tuning table's own values, so
 * a retune moves the advisor's sentences with it. That is not a nicety: the encounter is a
 * first-pass design that is being rebalanced right now, and a briefing that says "five
 * rounds" beside an engine running six is worse than one that says nothing, because a
 * learner has no way to tell which half is lying.
 *
 * ## The action list is EXHAUSTIVE BY TYPE, on purpose
 *
 * {@link CRISIS_ACTION_TERMS} is a `Record<WinterActionKind, ...>`. `WinterActionKind` is
 * derived from the engine's own `WinterAction` union, so a crisis that gains an action
 * fails to COMPILE here until it is described, and one that LOSES an action fails to
 * compile until its line comes out. A written-down list would have gone on describing a
 * board that no longer exists in either direction, and nothing would have caught it: the
 * guard would have been counting its own list.
 *
 * Both directions have now been exercised for real. The type caught the mend line when the
 * lead ruled the `repair` action out on 2026-07-31, which is why `crisisCall.test.ts` also
 * pins the set to exactly the three the winter ships: the compiler stops the briefing
 * falling behind the board, and that assertion stops the board quietly regaining a member
 * the lead removed.
 */

/** One line of the briefing. `id` is what a test addresses it by, never shown. */
export interface CrisisTerm {
  readonly id: string;
  readonly text: string;
}

/**
 * ONE SLIDE OF THE WALKTHROUGH — a heading and the two or three lines under it.
 *
 * The card shows exactly one of these at a time (see `CrisisCallAdvisor`), which is the
 * shape the lead asked for on 2026-07-31: *"those sub-slides should be small and isolated
 * to one section, to prevent users from being overloaded with information."* The slides are
 * therefore the unit of PAGINATION as well as of grouping, and the split is by idea rather
 * than by convenience: a slide that needed a cross-reference to another slide to be true
 * would be the wall of text again with page breaks in it.
 */
export interface CrisisSlide {
  readonly id: string;
  /** The one claim the slide is about, shown as its heading. */
  readonly heading: string;
  readonly terms: readonly CrisisTerm[];
}

/**
 * WHAT EACH ACTION DOES, one short sentence each.
 *
 * Keyed by the engine's action union so the set cannot fall behind the board. Every line
 * says what the action does and, where accuracy changes it, what answering well EARNS.
 * None of them says what a score buys: a learner's accuracy is not a currency, and the
 * register rule is that "cost", "price" and "pay" attach to the era's material and never to
 * answers.
 *
 * **TWO ENTRIES, AND THE TYPE IS WHY THERE ARE TWO.** A third read *"Pull everyone in off the
 * outer ring. Everything still inside gets tougher, and that ground is given up."* The lead
 * ruled that action out on 2026-08-02 — *"the give up ground option is incredibly confusing -
 * just discard it completely and keep it to two options"* — and this record stopped compiling
 * until the line came out, which is the second time the exhaustive keying has caught a removal
 * (the mend line was the first, 2026-07-31). `crisisCall.test.ts` pins the set to exactly the
 * two the winter ships, so the compiler stops the briefing falling behind the board and that
 * assertion stops the board quietly regaining a member the lead removed.
 */
export const CRISIS_ACTION_TERMS: Record<WinterActionKind, CrisisTerm> = {
  fire: {
    id: "fire",
    text: "Light a fire. It holds the frost off a patch of ground, and answering well makes it burn longer and reach further.",
  },
  reinforce: {
    id: "reinforce",
    text: "Reinforce a building. It stands through more cold rounds, and answering well adds more of them.",
  },
};

/** The order the actions are read in. Derived from the record, so nothing is dropped. */
export const CRISIS_ACTION_ORDER = Object.keys(CRISIS_ACTION_TERMS) as WinterActionKind[];

export const PLAGUE_ACTION_TERMS: Record<PlagueAction["kind"], CrisisTerm> = {
  quarantine: {
    id: "quarantine",
    text: "Quarantine a route. A barrier closes one exposed connection for one to three nights.",
  },
  care: {
    id: "care",
    text: "Send care to a building. A linen station blocks one crossing per point of strength.",
  },
};

/** Everything the advisor says, in the order it is said. */
export interface CrisisBriefing {
  readonly eraId: EraId;
  /**
   * The dialogue's accessible name, and nothing draws it any more.
   *
   * It used to be the card's title ribbon, beside a "Mid-era crisis" eyebrow. Both went
   * when the lead ruled the card out on 2026-07-31 (see `CrisisCallAdvisor`); the eyebrow
   * went with the ribbon because nothing was left to carry it, and this survives on a
   * `.visually-hidden` heading so the dialog is still announced by name.
   */
  readonly title: string;
  /** The era's advisor, who is one character across all ten eras (D-ET9). */
  readonly advisorName: string | null;
  /**
   * AND WHAT HE IS WEARING, which is the LIVE era's and not the board's.
   *
   * It rides here beside the name for the reason the name does: both are answers to *"who
   * is standing in front of me"*, both come off one `resolveEraAdvisor` call, and a card
   * that took the name from one era and the costume from another would put era one's hide
   * tunic under an era-six byline. `crisisBriefingForCity` is where the two are set
   * together; see its docblock for why the live era rather than the board's.
   */
  readonly advisorDress: AdvisorDress;
  /**
   * WHAT THE ADVISOR SAYS OUT LOUD, and the only thing in his speech bubble.
   *
   * It is the hook and not the manual: two sentences, in character, stakes first. The
   * mechanics are every one of them on the {@link CrisisBriefing.slides} below, so this
   * line carries no rule and nothing depends on having read it.
   */
  readonly lead: string;
  /** The walkthrough, one section per slide, shown one at a time. */
  readonly slides: readonly CrisisSlide[];
  /** One line per action the board offers, from {@link CRISIS_ACTION_TERMS}. */
  readonly actions: readonly CrisisTerm[];
  readonly closing: string;
  /** The primary action that enters this crisis. */
  readonly actionLabel: string;
}

/**
 * THE ERAS WITH A CRISIS A LEARNER CAN ACTUALLY ENTER.
 *
 * **THIS USED TO BE A SECOND LIST, and it is now the one `crisisEra.ts` owns.** It held
 * `[CURRENT_ERA_ID]` under exactly the reasoning `CRISIS_CONTENT_ERAS` records, which made two
 * copies of one fact free to drift; and when every era's land budget was authored the winter's
 * playability question stopped having a land half that varied, so the two questions had to be
 * stated together somewhere. `crisisEra.ts` is that somewhere, because it is what
 * `HardWinterSurface` resolves its board through.
 *
 * The trigger in `@cr/game` is era-generic and deliberately so; this is not. Nine eras have a
 * designed crisis and no encounter behind it, and announcing one to a learner who then has
 * nothing to open would be the worst of both. `crisisCall.test.ts` pins the set both ways: era
 * one is briefed, and every other era in `ERA_SEQUENCE` is not.
 */
export function hasPlayableCrisis(eraId: EraId): boolean {
  return (
    eraId === "classical" ||
    eraId === PLAGUE_ERA ||
    eraId === "information_age" ||
    hasCrisisContentFor(eraId)
  );
}

/**
 * The Hard Winter's terms, in plain language.
 *
 * Read it against the rules it is written to: short sentences, no em-dashes, and every
 * accuracy clause phrased as what good answers EARN.
 *
 * ## The lead line is the hook; the slides are the manual
 *
 * The card used to open with *"Winter has reached the island. Here is how it works."* and
 * then print all nine rules at once. The lead's ruling on 2026-07-31 was that the advisor
 * should read as a character addressing the player before he reads as a tooltip: *"it
 * should have an actual speech bubble with the advisor going something like 'Sire! The
 * worst winter we've ever seen is upon us. It's up to you to protect our people'."* That
 * example is the register this line is written to, verbatim but for the contractions.
 *
 * ## THE EXCLAMATION MARK IS DELIBERATE, AND IT COST A GUARD A SCOPE
 *
 * This line shipped on 2026-07-31 as *"Sire, …"*, comma and all, because
 * `crisisCall.test.ts`'s *"does not oversell a winter"* banned `!` across every string the
 * entry sequence can speak. The lead asked for the shout back the same day: *"a giant chat
 * bubble that basically shouts, 'Sire! ....'"*
 *
 * The ban was not deleted, because what it was written for is still true — the winter takes
 * ground and damages buildings and then it ends, and PROSE that shouts would make the first
 * round a let-down. It was SCOPED instead. Prose and dialogue are two registers: a rule
 * about how the game describes itself has no business inside a character's mouth. So the
 * sweep now exempts exactly the lines the advisor says out loud, by name, and it fails both
 * ways — a written line that gains a `!` fails, and so does a spoken line that stops
 * shouting, which is what stops the exemption sitting there excusing nothing.
 *
 * ## Four slides, split by idea
 *
 * Each slide has to be TRUE ON ITS OWN, because only one of them is on screen at a time.
 * That is what set the split: the frost's advance and the clocklessness are the same idea
 * seen from two sides (the winter moves on rounds, and a round is not a second), so they
 * share a slide; the round's own shape is its own; the actions are the lead's own worked
 * example of the right size; and what a hit costs is the last, because it is the only one
 * that reaches past the end of the winter.
 */
export function crisisBriefingFor(eraId: EraId): CrisisBriefing | null {
  if (!hasPlayableCrisis(eraId)) {
    return null;
  }
  if (eraId === "classical") {
    const advisor = eraAdvisor(eraId);
    const actions: readonly CrisisTerm[] = [
      {
        id: "rally",
        text: `Rally the next ward. It takes ${SUCCESSION.actions.rally.cost} influence and raises your standing statue before the rival gets there.`,
      },
      {
        id: "reopen",
        text: `Reopen the newest closed civic. It takes ${SUCCESSION.actions.reopen.cost} influence. The rival statue stays.`,
      },
    ];
    return {
      eraId,
      title: "The Succession",
      advisorName: advisor?.name ?? null,
      advisorDress: advisorDressFor(eraId),
      lead: "Sire! The old ruler is gone and left no heir. Two assemblies are claiming the wards of this city.",
      slides: [
        {
          id: "pressure",
          heading: "Watch the next ward",
          terms: [
            {
              id: "batch",
              text: `After each batch of ${SUCCESSION.batch_size} questions, the rival takes the marked ward. Nothing runs on a timer.`,
            },
          ],
        },
        {
          id: "influence",
          heading: "Answers give you influence",
          terms: [
            {
              id: "bank",
              text: "Each right answer adds one influence. Influence stays banked until you use it.",
            },
          ],
        },
        {
          id: "response",
          heading: "Choose one response per batch",
          terms: actions,
        },
        {
          id: "city",
          heading: "This happens to this city",
          terms: [
            {
              id: "binding",
              text: "Every ward is tied to a building already standing here. Skill buildings and the Town Hall keep their lessons and capacity whatever side the ward takes.",
            },
          ],
        },
      ],
      actions,
      closing: "Call the wards when you are ready.",
      actionLabel: "Face the succession",
    };
  }
  if (eraId === "information_age") {
    const advisor = eraAdvisor(eraId);
    const actions: readonly CrisisTerm[] = [
      {
        id: "cut",
        text: "Isolate the active intake. Each right answer closes one physical cover there.",
      },
      {
        id: "restore",
        text: "Restore from the one clean copy. It puts record bands back, then every cover reopens.",
      },
    ];
    return {
      eraId,
      title: "The Intrusion",
      advisorName: advisor?.name ?? null,
      advisorDress: advisorDressFor(eraId),
      lead: "Sire! Someone is rewriting the public record. The city has opened its service routes so we can follow the trace.",
      slides: [
        {
          id: "threat",
          heading: "Follow the open service trace",
          terms: [
            {
              id: "record",
              text: `Four of nine record bands are already gone. Inspect the marked building, then answer three questions.`,
            },
          ],
        },
        {
          id: "actions",
          heading: "Act on the marked intake",
          terms: actions,
        },
      ],
      actions,
      closing: "Go and look when you are ready.",
      actionLabel: "Go and look",
    };
  }
  if (eraId === PLAGUE_ERA) {
    return {
      eraId,
      title: "The Plague",
      advisorName: eraAdvisor(eraId)?.name ?? null,
      advisorDress: advisorDressFor(eraId),
      lead: "The Plague is moving along the town's routes. We have three nights to contain it.",
      slides: [
        {
          id: "threat",
          heading: "The first infection",
          terms: [
            {
              id: "spread",
              text: `Open routes expose clean buildings. Infection moves only when you let the night pass, and the crisis ends by night ${PLAGUE.rounds}.`,
            },
          ],
        },
        {
          id: "round",
          heading: "Each round",
          terms: [
            {
              id: "questions",
              text: `Choose a route to quarantine or a building to care for, then answer ${PLAGUE.batch_size} questions. Accuracy sets its strength.`,
            },
          ],
        },
        {
          id: "actions",
          heading: "Your interventions",
          terms: [PLAGUE_ACTION_TERMS.quarantine, PLAGUE_ACTION_TERMS.care],
        },
      ],
      actions: [PLAGUE_ACTION_TERMS.quarantine, PLAGUE_ACTION_TERMS.care],
      closing: "The outbreak is already visible on your city.",
      actionLabel: "Face the outbreak",
    };
  }
  const rounds = HARD_WINTER.rounds;
  const questions = HARD_WINTER.batch_size;
  // THE ERA'S OWN MATERIAL, NAMED. The lead, 2026-08-02: *"also replace 'material' with
  // 'stone'."* It is resolved rather than typed, because "stone" is era one's answer and not
  // every era's — era two builds with grain — and this briefing is written for whichever era's
  // board `crisisBriefingForCity` resolved. `materialWord` is what the city's own repair copy
  // already uses, so the two cannot drift.
  const material = materialWord(eraId);
  const actions = CRISIS_ACTION_ORDER.map((kind) => CRISIS_ACTION_TERMS[kind]);
  return {
    eraId,
    title: "The Hard Winter",
    advisorName: eraAdvisor(eraId)?.name ?? null,
    advisorDress: advisorDressFor(eraId),
    lead: "Sire! The worst winter we have ever seen is upon us. It is up to you to protect our people.",
    slides: [
      {
        id: "winter",
        heading: "What the winter does",
        terms: [
          {
            id: "frost",
            text: `Frost comes in from the edge of the island and reaches further inward at the end of every round. Winter lasts ${rounds} rounds.`,
          },
          {
            id: "clock",
            text: "Nothing runs on a timer. The winter waits until you act.",
          },
        ],
      },
      {
        id: "round",
        heading: "How a round goes",
        terms: [
          {
            id: "round",
            text: `Each round you choose one action first. Then you answer ${questions} questions drawn from lessons you have already done. How well you answer decides how strong that action is.`,
          },
        ],
      },
      {
        id: "actions",
        heading: "What you can do each round",
        terms: actions,
      },
      {
        id: "damage",
        heading: "If the frost reaches a building",
        terms: [
          {
            // **THE LINE THE 2026-08-02 RULING REWROTE, and the old one is quoted in the
            // docblock below because it is exactly what the lead read and then disbelieved.**
            // It said *"A building takes damage before it is ruined. It takes more than one bad
            // round to lose it."*, which was true at `HARD_WINTER.damage.ruin_at: 6` and a
            // half-truth at 2. At 1 it is simply false: contact ruins.
            id: "damage",
            text: "The frost destroys a building the moment it reaches one. There is no half way.",
          },
          {
            // THE COUNTER-PLAY, and it is the whole of it. This read *"Nothing in the winter
            // takes damage back off. A shield stops the next bite, so raise one before the frost
            // arrives."* Both halves are still true and the first is no longer worth a learner's
            // attention: there is no damage to take back off, so the sentence that matters is
            // that the shield has to be up FIRST.
            id: "no-mend",
            text: "A shield is the only thing that stops it, and it has to be up before the frost arrives.",
          },
          {
            // AFTER the winter, on the island, and never as a winter action. The mend action
            // was removed on 2026-07-31; this sentence is the other half of that ruling, and it
            // is on the LAST slide rather than the actions slide so that nothing a learner reads
            // under "what you can do each round" offers it. It named DAMAGE until 2026-08-02;
            // there is none, so it names the ruin the frost actually leaves.
            id: "repair",
            text: `A ruined building can be rebuilt on the island after the winter. Rebuilding costs ${material}.`,
          },
        ],
      },
    ],
    actions,
    closing: "Face it when you are ready.",
    actionLabel: "Face the winter",
  };
}

/**
 * THE TERMS FOR A NAMED CRISIS OPENED IN A CITY — which is not the same question as
 * {@link crisisBriefingFor}, because the board's era and the city advisor's era can differ.
 *
 * {@link hasPlayableCrisis} asks *does THIS era have a crisis of its own*, and the answer is
 * yes for era one and no for the other nine. That is the right gate for the crisis
 * ANNOUNCING itself (D-CRISIS-9), and it is the wrong one for the terms, because
 * `resolveCrisisEra` means a city standing in any era has a winter to walk into: the board
 * falls back to the earliest era whose winter is built. So in era two the encounter existed
 * and the briefing in front of it did not, and the ☰ Menu fell straight through to mounting
 * the winter with no advisor.
 *
 * The caller supplies the crisis era explicitly, so two named menu actions cannot dispatch
 * through one live-era inference. The default city resolver below still chooses the crisis a
 * learner earns; the menu can separately ask for Hard Winter or the Intrusion by name.
 *
 * **The advisor is the LIVE era's**, through `resolveEraAdvisor`, which is total and names
 * somebody in every era. The board may be borrowed; the person handing it over is the
 * player's own advisor, and a card that went unsigned in era two would read as a system
 * message rather than as the character the lead asked for. In era one this is the same name
 * `crisisBriefingFor` already returns, so nothing about era one moves.
 *
 * **His CLOTHES follow the name for exactly the same reason, off the same call.** A borrowed
 * board does not put the player back in era one, and an advisor who turned up to era six's
 * winter in a hide tunic and a stone hood would be saying the city had gone backwards. This
 * is the surface where he is largest on screen, so it is also where getting that wrong would
 * be most visible.
 */
export function crisisBriefingForCityCrisis(
  liveEraId: EraId,
  crisisEraId: EraId,
): CrisisBriefing | null {
  const briefing = crisisBriefingFor(crisisEraId);
  if (briefing === null) {
    return null;
  }
  const advisor = resolveEraAdvisor(liveEraId);
  return { ...briefing, advisorName: advisor.name, advisorDress: advisor.dress };
}

/** The briefing for the crisis this live era earns or borrows by default. */
export function crisisBriefingForCity(liveEraId: EraId): CrisisBriefing | null {
  const crisisEraId =
    liveEraId === "classical" || liveEraId === PLAGUE_ERA || liveEraId === "information_age"
      ? liveEraId
      : resolveCrisisEra(liveEraId).eraId;
  return crisisBriefingForCityCrisis(liveEraId, crisisEraId);
}

/** Every term of the briefing, in slide order, flattened out of the slides. */
export function crisisBriefingTerms(briefing: CrisisBriefing): readonly CrisisTerm[] {
  return briefing.slides.flatMap((slide) => slide.terms);
}

/** Every sentence of a briefing, flattened. The shape a copy sweep reads. */
export function crisisBriefingLines(briefing: CrisisBriefing): readonly string[] {
  return [
    briefing.lead,
    ...briefing.slides.flatMap((slide) => [
      slide.heading,
      ...slide.terms.map((term) => term.text),
    ]),
    briefing.closing,
  ];
}

/* -------------------------------------------------------------------------- */
/* "I have read this once"                                                     */
/* -------------------------------------------------------------------------- */

/**
 * **THE BRIEFING IS NOT SKIPPABLE ON A FIRST ENTRY ANY MORE, AND THIS FLAG IS THE GATE.**
 *
 * Ruled by the team lead on 2026-08-02: *"dont let the user click face the winter until they go
 * through all the tool tips."* `CrisisCallAdvisor` disables "Face the winter" until this is true.
 *
 * ## What it used to be, because the difference is the whole change
 *
 * It was a CONVENIENCE. *"Face the winter" is focused the moment the card opens, so the
 * walkthrough never gates anything for anybody: Enter answers the call from the first frame, on
 * the first entry as much as the fiftieth.* The flag existed only so that the person who opens
 * this card ten times in an afternoon does not get four slides expanded under the bubble every
 * single time and read the card as a lecture he has already sat through. It was set on reaching
 * the last slide OR on collapsing the walkthrough, because both meant *"I do not need this
 * expanded again"*.
 *
 * ## Two things had to change when it became load-bearing
 *
 *  - **Collapsing no longer sets it.** With nothing gated, putting the walkthrough away was a
 *    fair signal that the player had had enough of it. With the button gated, collapsing on slide
 *    one would be the whole gate bypassed in one click. Only reaching the LAST slide sets it.
 *  - **The focused control depends on the gate.** A disabled button cannot take focus, so a
 *    gated card opens focused on "Next" and Enter walks the slides. The property that had to
 *    survive is that the dialogue is operable from the keyboard from the first frame, not that
 *    one particular button is the one under the cursor.
 *
 * **WHAT DID NOT CHANGE, and both are deliberate.** It is still remembered across entries, so a
 * returning player is not made to walk four slides again — the ruling is that a learner meets the
 * rules, not that they meet them every time. And "Not yet" is still ungated, along with `Escape`:
 * a learner must always be able to leave, which is D-CRISIS-10's *"the crisis announces itself,
 * and the player chooses when to answer"*.
 *
 * `localStorage`, in the shape `coachMarksCore.ts` already uses for its show-once hints: a
 * try/catch on both sides, because storage can be unavailable in private mode. **Unavailable
 * storage now costs a returning player four clicks rather than a nicety**, which is the one place
 * this got worse: the card re-gates rather than re-expanding. It is still not a trap, because
 * walking the slides is always available and leaving always is too.
 */
export const CRISIS_BRIEFING_SEEN_KEY = "cr.crisis.briefingSeen";

/** True once the player has read the walkthrough to the end, or put it away themselves. */
export function hasReadCrisisBriefing(): boolean {
  try {
    return runtimeStorage()?.getItem(CRISIS_BRIEFING_SEEN_KEY) === "true";
  } catch {
    return false;
  }
}

/** Remember it, so the next entry opens on the advisor's line rather than on slide one. */
export function markCrisisBriefingRead(): void {
  try {
    runtimeStorage()?.setItem(CRISIS_BRIEFING_SEEN_KEY, "true");
  } catch {
    // Unavailable storage means the walkthrough opens expanded again next time. See above:
    // the way past it is still one keystroke, so this is a nicety and not a correctness
    // requirement.
  }
}

/** Forget it. The dev seed control's reset path, and every test's `beforeEach`. */
export function forgetCrisisBriefingRead(): void {
  try {
    runtimeStorage()?.removeItem(CRISIS_BRIEFING_SEEN_KEY);
  } catch {
    // See markCrisisBriefingRead.
  }
}

/* -------------------------------------------------------------------------- */
/* When the call is surfaced                                                   */
/* -------------------------------------------------------------------------- */

/** What the city is holding about this era's crisis right now. */
export interface CrisisCallState {
  /** The engine's reading of the trigger, or null before the city has loaded. */
  readonly call: MidEraCrisisCall | null;
  readonly briefing: CrisisBriefing | null;
  /** The call has been made and not yet answered: the standing notice is shown. */
  readonly standing: boolean;
  /** The advisor is on screen explaining the terms. */
  readonly briefingOpen: boolean;
  /** Open the advisor again from the standing notice. */
  readonly openBriefing: () => void;
  /**
   * Open the advisor because THE PLAYER ASKED FOR IT, standing call or not.
   *
   * The ☰ Menu's Hard Winter entry is the caller. It used to reach past the entry sequence
   * and mount the encounter itself, so the door a person testing the crisis reaches for was
   * the one door with no advisor behind it. Now both doors open the same card and only
   * "Face the winter" starts anything.
   *
   * Deliberately NOT gated on {@link CrisisCallState.standing}: `crisisBriefingFor` depends
   * on the era alone, so an era with a playable crisis has terms to read whether or not its
   * trigger has been crossed, and the menu is at its most useful below the trigger. What
   * stays gated is the other beat — the crisis ANNOUNCING itself — because a notice that
   * appeared before `ceil(n / 2)` would be the crisis arriving unearned (D-CRISIS-9).
   *
   * A no-op in an era with no briefing, so a caller that forgets to check cannot leave the
   * hook holding a request nothing can satisfy.
   */
  readonly requestBriefing: () => void;
  /** Close the advisor and leave the call standing (the player chooses when). */
  readonly closeBriefing: () => void;
  /** Close the advisor and record that the call has been answered. */
  readonly answerCall: () => void;
}

export interface CrisisCallInput {
  readonly eraId: EraId;
  /** The learner's node states, or null while the city is still loading. */
  readonly nodeStates:
    | readonly { readonly node_id: string; readonly mastery: Mastery }[]
    | null;
  /**
   * Hold the call back. D-CRISIS-10: the crisis *"arrives without warning and then
   * waits"*, and **a player who is mid-lesson finishes the lesson** — so a lesson, a
   * drill, the reel or a winter already running defers both the announcement and the
   * advisor rather than cancelling them.
   */
  readonly deferred: boolean;
  /** Speak the announcement. `CitySurface` passes its assertive live region's setter. */
  readonly onAnnounce: (message: string) => void;
}

/**
 * WATCH FOR THE CROSSING, then hold the call until the learner is free to hear it.
 *
 * **It fires on the transition, and the first ready read only seeds the baseline.** That
 * is the `prevMasteryRef` discipline already in `CitySurface` for the skill-complete
 * celebration, and it is here for the same reason: a city that LOADS already past the
 * trigger has not just crossed it, and a popup for something that happened three sessions
 * ago is a false event. The standing affordance for that learner is the one that was
 * already there, the Hard Winter entry in the menu, which is reachable at any time — and
 * which now arrives here too, through {@link CrisisCallState.requestBriefing}, instead of
 * mounting the encounter behind the advisor's back.
 *
 * Once the call is answered the hook stops raising it for the rest of the mount. It is not
 * persisted, and it does not need to be: mastery only rises, so the crossing happens once
 * and a reload re-seeds the baseline past it.
 */
export function useCrisisCall({
  eraId,
  nodeStates,
  deferred,
  onAnnounce,
}: CrisisCallInput): CrisisCallState {
  const [pending, setPending] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(false);
  // The player asked for the terms rather than being called to them. Held apart from
  // `pending` because they are two different events with two different rules: one is the
  // crisis announcing itself and has to be earned, the other is a menu entry and is always
  // available. Only the first raises the notice; both raise the advisor.
  const [requested, setRequested] = useState(false);
  // Null until the first read with real node states, which is what makes the first read a
  // baseline rather than an event.
  const wasStandingRef = useRef<boolean | null>(null);
  const announcedRef = useRef(false);

  // AN ERA ADVANCE RE-ARMS EVERYTHING, because each era has its own crisis and its own
  // trigger. Without this, a learner who advanced mid-session would carry the previous
  // chapter's "already answered" forward and never be called for the next one. React's
  // documented adjust-state-during-render pattern rather than an effect, so the reset
  // lands before the crossing below is read.
  const [seenEra, setSeenEra] = useState(eraId);
  if (seenEra !== eraId) {
    setSeenEra(eraId);
    setPending(false);
    setAnswered(false);
    setBriefingOpen(false);
    setRequested(false);
    wasStandingRef.current = null;
    announcedRef.current = false;
  }

  const call = useMemo(
    () => (nodeStates === null ? null : midEraCrisisCall(eraId, nodeStates)),
    [eraId, nodeStates],
  );
  /**
   * WHETHER THE CRISIS ANNOUNCES ITSELF IN THIS ERA, which stays era one's own question.
   *
   * Held apart from `briefing` below because widening the terms must not widen the
   * announcement: the notice and the spoken message are earned at `ceil(n / 2)` of an era's
   * own nodes (D-CRISIS-9), and an era with no crisis of its own has nothing to earn. Every
   * gate in this hook reads THIS value, so the trigger is exactly where it was.
   */
  const announces = crisisBriefingFor(eraId);
  /**
   * The terms, which any era can read because any era has a winter to walk into. See
   * {@link crisisBriefingForCity}: this is what went missing on the era-two menu route.
   */
  const briefing = crisisBriefingForCity(eraId);
  const playable = call !== null && announces !== null;

  useEffect(() => {
    if (!playable || call === null) {
      return;
    }
    const was = wasStandingRef.current;
    wasStandingRef.current = call.standing;
    if (was === null || was || !call.standing) {
      return;
    }
    setPending(true);
  }, [playable, call]);

  const show = pending && !answered && !deferred;

  useEffect(() => {
    if (!show || announcedRef.current || announces === null || call === null) {
      return;
    }
    announcedRef.current = true;
    setBriefingOpen(true);
    // THE CRISIS ANNOUNCING ITSELF, behind the same once-per-era latch as the spoken
    // announcement — so the bell is tied to the event rather than to the advisor card,
    // which the player can also raise themselves from the menu at any time. A dark low
    // strike and not an alarm: D-CRISIS-10 has the crisis arrive and then WAIT, and a
    // sound that read as urgent would make the waiting into pressure.
    playSfx("crisis-call");
    onAnnounce(
      crisisCallMessage(
        announces.title,
        announces.advisorName,
        call.mastered,
        call.era_nodes,
      ),
    );
  }, [show, announces, call, onAnnounce]);

  return {
    call,
    briefing,
    standing: show,
    // Either reason will do: the crisis called, or the player went looking for it. The
    // notice is the caller's to gate on `standing`, which is what keeps the unsolicited
    // beat behind the trigger while this one is not.
    briefingOpen: (show || requested) && briefingOpen,
    openBriefing: () => setBriefingOpen(true),
    requestBriefing: () => {
      if (briefing === null) {
        return;
      }
      setRequested(true);
      setBriefingOpen(true);
    },
    closeBriefing: () => {
      setBriefingOpen(false);
      setRequested(false);
    },
    answerCall: () => {
      setBriefingOpen(false);
      setRequested(false);
      // ONLY A CALL THAT WAS ACTUALLY STANDING IS RECORDED AS ANSWERED. `answered` is the
      // latch that stops the notice for the rest of the mount, so setting it from a
      // briefing the player raised themselves would mark a call answered that was never
      // made: the learner opens the terms out of curiosity below the trigger, and the
      // announcement they earn twenty minutes later never arrives.
      if (show) {
        setAnswered(true);
      }
    },
  };
}
