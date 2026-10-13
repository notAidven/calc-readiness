import { type MaterialBalances, materialForEra } from "@cr/economy";
import type { EraId } from "@cr/skill-graph";
import type { StudentNodeState } from "@cr/state-schema";

import { cityEraTimeline, type EraTimelineRow } from "../city/eraTimelineView";
import { type BayIsland, bayLayout } from "./bayLayout";

/**
 * **THE OVERVIEW'S VIEW MODEL: the timeline drawn as geography.**
 *
 * Authority: `docs/superpowers/specs/2026-08-04-archipelago-design.md` §5, §7 (stage 1) and
 * §8.7.
 *
 * ## IT COMPUTES NOTHING IT COULD READ, WHICH IS §6'S OWN INSTRUCTION
 *
 * §6: *"`eraTimelineView.ts` already computes per era exactly what the overview needs —
 * standing, mastered count, readiness — so the overview is the timeline drawn as
 * geography."* So this module joins two things that already exist and adds a third that is
 * pure geometry:
 *
 *  - `cityEraTimeline` supplies standing, mastery and how much of an era is authored. It is
 *    the SAME call `EraTimeline.tsx` makes, with the same arguments, so the two surfaces
 *    cannot disagree about which era a learner is in;
 *  - `WalletView.materials` supplies each island's own unspent balance. Already per-era
 *    (§8.2: *"material is already era-denominated"*), so this is a lookup rather than a
 *    derivation;
 *  - {@link bayLayout} supplies where each island sits.
 *
 * **Nothing here writes, grades, or reads a clock**, which is `eraTimelineView.ts`'s own
 * discipline and the reason both are modules rather than hooks.
 *
 * ## ⚑ A PAST ISLAND OPENS A CARD, AND SINCE STAGE 3 THE CARD IS THE DOOR
 *
 * §7, corrected: *"Stage 1 must not offer to enter a past island. A learner who clicks one
 * and finds they can only look at it is a worse first impression than one who could not click
 * at all. In stage 1 a past island opens a **card** — its name, its skills, its mastery, its
 * unspent material — and the only island you enter is the one you are on. Entry arrives with
 * stage 3, and the affordance should arrive with it."*
 *
 * **Stage 3 has landed** (`islandState.ts`, `archipelagoSession.ts`), so the affordance
 * arrives with it — and it arrives on the CARD rather than on the map, which is a deliberate
 * reading of the same ruling rather than a departure from it. A press on the map still opens
 * the card, so the picture a learner is shown before they commit is unchanged; what the card
 * now carries is a real door. Two things follow, and both are worth having:
 *
 *  - **A crossing is confirmed rather than triggered by a mis-click.** The islands are 91px
 *    circles packed nine deep along an arc, so click-to-teleport on the map is a control that
 *    is easy to hit by accident and impossible to undo without a second crossing.
 *  - **Nothing about the stage-1 reading had to be loosened.** {@link ArchipelagoIsland.opens}
 *    still says `enter` for exactly one island — the one the learner is standing on — and
 *    `archipelagoView.test.ts`'s sweep for that is unchanged. The new capability is
 *    {@link ArchipelagoIsland.revisitable}, asserted beside it rather than instead of it.
 */

/**
 * **HOW AN ISLAND READS, keyed to SEQUENCE DISTANCE and never to camera distance.**
 *
 * §5, and it is the one implementation detail the section says decides whether this works:
 * *"a distance-keyed fog resolves the moment a learner pans toward the far end, which would
 * let them count; a sequence-keyed treatment does not, so the count stays unreadable however
 * the screen is moved."*
 *
 * So this is a function of `number - currentNumber` alone. No camera, no viewport and no
 * projection reaches {@link islandStateFor}, which is what makes the property structural.
 *
 * The five are §5's own table. **What each one LOOKS like is Evan's** — see
 * `ArchipelagoOverview.tsx`'s placeholder note; this file names the states and nothing else.
 */
export type ArchipelagoIslandState =
  | "completed"
  | "current"
  | "next"
  | "distant"
  | "horizon";

/**
 * §5's thresholds: *"next"* is one ahead, *"three ahead"* is the softened band, and *"five or
 * more"* is the haze. Named here so the surface reads the band rather than the arithmetic.
 */
export const DISTANT_FROM_AHEAD = 2;
export const HORIZON_FROM_AHEAD = 5;

/**
 * Which of the five states an island is in, from its place in the sequence relative to the
 * one the learner is standing on.
 *
 * `ahead` is the whole input. A completed island is behind, the current one is zero ahead,
 * and the three locked bands are §5's own cuts.
 */
export function islandStateFor(ahead: number): ArchipelagoIslandState {
  if (ahead < 0) {
    return "completed";
  }
  if (ahead === 0) {
    return "current";
  }
  if (ahead < DISTANT_FROM_AHEAD) {
    return "next";
  }
  return ahead >= HORIZON_FROM_AHEAD ? "horizon" : "distant";
}

/**
 * What clicking an island does.
 *
 * `enter` loads the island. `card` opens a read-only panel about it. **Under stage 1 exactly
 * one island is ever `enter`** — see the header, and `archipelagoView.test.ts` sweeps every
 * position in the run for it.
 */
export type IslandAffordance = "enter" | "card";

/** What an island still holds, in its own era's material. §8.3's one line of the overview. */
export interface IslandStores {
  readonly amount: number;
  /** e.g. "stone". Lowercased for the sentence it appears in. */
  readonly material: string;
  /**
   * **"80 stone here" — §8.5's framing, and it is load-bearing rather than decorative.**
   *
   * *"A completed island reads 80 stone here — a place that still holds something. Not '80
   * stone unspent' and not '80 stone you did not spend': the same fact, and the second and
   * third are reproaches."* `archipelagoCopy.test.ts` sweeps for the two forbidden framings.
   */
  readonly line: string;
}

/** One island on the overview: where it sits, how it reads, and what it says. */
export interface ArchipelagoIsland extends BayIsland {
  readonly name: string;
  readonly concept: string;
  readonly state: ArchipelagoIslandState;
  /** How far ahead of the learner. Negative behind, `0` for the island they are on. */
  readonly ahead: number;
  readonly locked: boolean;
  readonly opens: IslandAffordance;
  /**
   * **WHETHER THE LEARNER CAN SAIL BACK TO THIS ISLAND — stage 3's door, on the card.**
   *
   * True for every island BEHIND the learner and false for the one they are on (there is
   * nowhere to sail) and for everything ahead (there is no island yet). It is deliberately a
   * separate field from {@link opens} rather than a third value of it: `opens` answers *"what
   * does pressing the island on the map do"* and this answers *"is that island a place the
   * learner may go"*, and collapsing them is what would have made the map a teleport.
   *
   * **It is keyed on sequence position, exactly like every other field here**, which is what
   * makes it agree with `archipelagoSession.ts` without either module reading the other: the
   * session founds an island the first time the era store reaches it, so the islands behind
   * the learner are precisely the islands that exist. A session asked for an era it somehow
   * has no record of founds one on the spot rather than failing, so the two cannot deadlock
   * even if a dev hatch puts the era somewhere the run never walked.
   */
  readonly revisitable: boolean;
  readonly masteredCount: number;
  readonly nodeCount: number;
  /** `null` where the island holds nothing of its own material. */
  readonly stores: IslandStores | null;
  readonly buildState: EraTimelineRow["buildState"];
}

export interface ArchipelagoView {
  readonly islands: readonly ArchipelagoIsland[];
  readonly currentEraId: EraId;
  readonly currentNumber: number;
  /** How many islands are unlocked — the learner's own island and everything behind it. */
  readonly unlockedCount: number;
}

/**
 * What one island still holds, or `null`.
 *
 * Reads `WalletView.materials`, whose own docblock calls it *"the full picture … what a
 * per-era readout wants"*, so the per-island balance is a lookup on a record that already
 * exists rather than a new economy. Deliberately NOT `WalletView.spendable`: that is the LIVE
 * era's stockpile by design, and an overview showing it against every island would report the
 * same number ten times.
 */
export function storesOn(eraId: EraId, materials: MaterialBalances): IslandStores | null {
  const material = materialForEra(eraId);
  if (material === null) {
    return null;
  }
  const amount = materials[material.id] ?? 0;
  if (amount <= 0) {
    return null;
  }
  const noun = material.display_name.toLowerCase();
  return { amount, material: noun, line: `${amount} ${noun} here` };
}

/**
 * **THE WHOLE OVERVIEW, from the two things that already exist plus the bay.**
 *
 * `liveEraId` is the era the city is STANDING in (`eraState.ts`), passed straight through to
 * `cityEraTimeline` so the marker on the map and the marker in the Timeline panel are one
 * derivation. Omit it and the fallback is the package's mastery-derived marker, which is what
 * a caller with no city gets.
 */
export function archipelagoView(input: {
  readonly nodeStates: readonly StudentNodeState[];
  readonly liveEraId?: EraId;
  readonly materials?: MaterialBalances;
}): ArchipelagoView {
  const { nodeStates, liveEraId, materials = {} } = input;
  const timeline = cityEraTimeline(nodeStates, liveEraId);
  const rowFor = new Map(timeline.rows.map((row) => [row.era.id, row]));

  /**
   * **A LEARNER WHO HAS MASTERED EVERYTHING IS STANDING ON ERA TEN, not nowhere.**
   *
   * `buildEraTimeline` returns `currentNumber: null` on a fully mastered run, because *"there
   * is no chapter left to be in"* — which is the right answer for a list and the wrong one for
   * a map. Left null, the arithmetic below would put every island behind the learner and make
   * none of them the one they are on, so the overview would offer no way back into the city.
   * The last era is where they are, and it is where `withLiveEra` would have put them had a
   * live era been supplied.
   */
  const currentNumber = timeline.currentNumber ?? timeline.rows.length;
  const currentEraId =
    timeline.currentEraId ??
    (timeline.rows[timeline.rows.length - 1] as (typeof timeline.rows)[number]).era.id;

  const islands = bayLayout().map((island): ArchipelagoIsland => {
    const row = rowFor.get(island.eraId);
    if (!row) {
      throw new Error(
        `The bay seats era "${island.eraId}" and the timeline has no row for it. Both are ` +
          "built from ERA_SEQUENCE, so this is the two coming apart rather than a bad input.",
      );
    }
    const ahead = island.number - currentNumber;
    const state = islandStateFor(ahead);
    return {
      ...island,
      name: row.era.name,
      concept: row.concept,
      state,
      ahead,
      locked: ahead > 0,
      // A press on the map opens the current island (you are already there, so it closes the
      // overview) and opens a CARD on everything else. Stage 3 put the door on the card
      // rather than here; see the header for why that is the same ruling read forward.
      opens: state === "current" ? "enter" : "card",
      revisitable: ahead < 0,
      masteredCount: row.masteredCount,
      nodeCount: row.nodeCount,
      // A locked island holds nothing, and asking would be a claim about an era nobody has
      // earned in. The check is on the STATE rather than on the balance so a seeded or
      // dev-advanced session cannot put a stockpile on an island ahead of the learner.
      stores: ahead > 0 ? null : storesOn(island.eraId, materials),
      buildState: row.buildState,
    };
  });

  return {
    islands,
    currentEraId,
    currentNumber,
    unlockedCount: islands.filter((island) => !island.locked).length,
  };
}
