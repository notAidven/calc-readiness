import { SUCCESSION, SUCCESSION_ERA } from "@cr/game";

import { resolveEraAdvisor } from "../city/eraDressing";
import type { AdvisorDress } from "../lessons/OruAdvisorCharacter";

/**
 * **WHAT THE ADVISOR SAYS ABOUT THE SUCCESSION, and every number in it is the engine's.**
 *
 * The right-hand panel this crisis shipped with assumes the player already knows what a
 * district, a claimant, a hold, a strength and a suspension are. None of those words is
 * introduced anywhere, and four of the five mean something specific to era four: the lead's
 * verdict on the play-test was *"nothing is really clear"*, and the panel is most of why.
 *
 * ## IT IS THE WINTER'S REGISTER, RE-USED, AND THAT IS THE ASK RATHER THAN A CONVENIENCE
 *
 * The lead ruled the presentation on 2026-07-31 and has asked for it twice since: *"i just want
 * it to be like its literally just the advisor and a giant chat bubble that basically shouts,
 * 'Sire! ....'"*, with *"some short slides explaining how the game works … isolated to one
 * section, to prevent users from being overloaded with information."* `AdvisorStage.tsx` owns
 * that presentation and `SuccessionAdvisor.tsx` mounts it; this file is only the words.
 *
 * ## THE NUMBERS ARE READ, NEVER TYPED
 *
 * `crisisCall.ts` established the rule for era one and the reason carries: a briefing with a
 * literal three in it is a briefing that lies the day somebody retunes the batch. Every figure
 * below comes off `SUCCESSION` — the batch size, what a perfect batch mints, and what each of
 * the three verbs costs — so a retune changes what the advisor says without this file being
 * touched. `successionBriefing.test.ts` asserts that by moving the tuning and reading the copy.
 *
 * ## WHAT THE SLIDES HAVE TO TEACH, WHICH IS MORE THAN ERA ONE'S
 *
 * Era one's crisis is a frost you can see coming across the ground. Era four's has **no
 * position at all**: a district is an id, a label, a building and a rank in an order, and its
 * allegiance is decided by a global comparison of who is ahead. That is the reason this crisis
 * is a page of its own rather than an overlay on the player's island, and it is also why it
 * cannot be picked up by looking at it. So the slides carry the conceptual load in the order a
 * player meets it:
 *
 *  1. **what is being disputed** — two claimants, one district decides per cycle, and a decided
 *     district stays decided;
 *  2. **what turns a cycle** — an answered batch, and nothing else. This is the single most
 *     load-bearing rule on the screen, because it is what makes the board safe to read;
 *  3. **the warning** — a block set at a plinth a whole cycle before that district decides, cut
 *     with the mark of whoever would take it. Era four's fairness rests on this;
 *  4. **what influence buys** — the three verbs and their prices;
 *  5. **what it costs to wait** — a shuttered building is suspended capacity rather than a
 *     ruin, and the bank is forfeited at the settle.
 */

/** One line of the briefing. `id` is what a test addresses it by, and is never shown. */
export interface SuccessionTerm {
  readonly id: string;
  readonly text: string;
}

/** One slide of the walkthrough: the one claim it is about, and the lines under it. */
export interface SuccessionSlide {
  readonly id: string;
  readonly heading: string;
  readonly terms: readonly SuccessionTerm[];
}

export interface SuccessionBriefing {
  /** The dialogue's accessible name. Announced, never drawn. */
  readonly title: string;
  readonly advisorName: string | null;
  /** Era four's clothes, off the same call as the name so the two cannot disagree. */
  readonly advisorDress: AdvisorDress;
  /** The shout. Two sentences, in character, and it carries no rule. */
  readonly lead: string;
  readonly slides: readonly SuccessionSlide[];
  readonly closing: string;
}

/** A whole number of counters, said as words a learner reads rather than as a digit alone. */
function counters(many: number): string {
  return `${many} counter${many === 1 ? "" : "s"}`;
}

export function successionBriefing(): SuccessionBriefing {
  const advisor = resolveEraAdvisor(SUCCESSION_ERA);
  const asked = SUCCESSION.batch_size;
  /** What a perfect batch mints, which is the top of the ladder and is read off its end. */
  const perfect = SUCCESSION.influence_by_correct[asked] ?? 0;

  return {
    title: "The Succession",
    advisorName: advisor.name,
    advisorDress: advisor.dress,
    lead: "Sire! The old ruler is gone and left no heir. The rival assembly is raising statues across the city.",
    slides: [
      {
        id: "rival",
        heading: "Watch the threatened district",
        terms: [
          {
            id: "batch",
            text: `After each batch of ${asked} questions, the rival claims the named district and closes its civic building. Reading, planning and spending do not move them.`,
          },
        ],
      },
      {
        id: "influence",
        heading: "Use the influence you earn",
        terms: [
          {
            id: "earn",
            text: `Each correct answer earns one influence, up to ${perfect}. Rally the next district (${counters(SUCCESSION.actions.rally.cost)}) or reopen the newest closure (${counters(SUCCESSION.actions.reopen.cost)}). Accuracy changes influence only.`,
          },
        ],
      },
    ],
    closing: "The rival waits for the first batch.",
  };
}
