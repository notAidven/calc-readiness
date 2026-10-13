import {
  canDeclareWinterAction,
  createHardWinter,
  HARD_WINTER,
  type HardWinterState,
  type HardWinterView,
  hardWinterIsland,
  hardWinterReducer,
  hardWinterView,
  mixSeed,
  WINTER_TIERS,
  type WinterAction,
  type WinterActionTier,
  type WinterBatchComposition,
  type WinterCellView,
  type WinterFirePreview,
  type WinterLayout,
  type WinterResolution,
  winterActionRefusal,
  winterDamageBite,
  winterDamageBudget,
  winterFireWard,
  winterLayoutFor,
  winterLayouts,
  winterMendCost,
  winterReclaimCost,
  winterSkillOrder,
  winterSpreadSteps,
  winterWardArea,
} from "@cr/game";
import type { FrozenItem } from "@cr/item-bank";
import { type EraId, getEraOrThrow } from "@cr/skill-graph";
import { type ReactElement, type ReactNode, useMemo, useState } from "react";
import { eraMaterialSfx, playSfx } from "../audio/soundEffects";
import { useDeclareActiveCrisis } from "../city/activeCrisis";
import { loadEraId } from "../city/eraState";
import { placementLabel } from "../city/townHall";
import { materialWord } from "../economy/materialWord";
import { practicePlaceholder, revealedAnswerLine } from "../lessons/answerFormat";
import { lessonByNode } from "../lessons/domains";
import { playCorrectChime } from "../lessons/lessonSound";
import { PracticeAnswer, type PracticeAnswerValue } from "../lessons/PracticeAnswer";
import { LessonProse } from "../lessons/prose";
import { UnreadableAnswerNote } from "../lessons/UnreadableAnswerNote";
import { WorkedSolution } from "../lessons/WorkedSolution";
import { winterFrozenThisRound, winterSpentShields } from "./buildingThreat";
import { resolveCrisisEra } from "./crisisEra";
import {
  gradeWinterAnswer,
  loadWinterEligibleNodes,
  WINTER_NODE_ORDER,
  winterBatchFor,
  winterDrawSetFromIds,
  winterFrozenItem,
} from "./hardWinterItems";
import {
  type LiveCityLayout,
  type LiveCityResult,
  loadLiveCityLayout,
} from "./liveCityLayout";
import { type ScarCommit, type ScarResult, scarLiveCity } from "./scarLiveCity";
import { WinterConclusion } from "./WinterConclusion";
import { WinterDevSkip } from "./WinterDevSkip";
import { CityReturnChip } from "./WinterEntryChip";
import {
  correctNeededFor,
  describeBuilding,
  WinterGrid,
  type WinterGridMode,
} from "./WinterGrid";
import { WinterStatusStrip } from "./WinterStatusStrip";
import { resolutionEarnedItsChime, resolutionSfx, roundClosingSfx } from "./winterSfx";

import "./hard-winter.css";

/**
 * THE HARD WINTER, PLAYABLE — era one's mid-era crisis on a 2D grid, reached with
 * `?winter`.
 *
 * A prototype the team lead is meant to play and then retune, so it stands alone behind
 * its own query parameter next to `?dev`, `?three`, `?graph`, `?interactive` and `?mock`.
 * It touches nothing in the 3D city surface and adds no art.
 *
 * ## The round loop, and why the ordering is the whole design
 *
 * 1. **Declare first.** Pick a fire and a place for it, a building to reinforce, or give
 *    up the outer ring — before a single question is asked. The panel spells out the
 *    ladder while you choose, and once a cell is chosen the BOARD shows the three tier
 *    footprints nested on it, so the bet is legible in advance and the commitment is real:
 *    once declared it cannot be changed, which the engine enforces rather than the UI.
 * 2. **Then earn it.** Three real D1 practice questions, graded by the real checker.
 * 3. **Accuracy is magnitude, never permission.** The declared action always happens; how
 *    much it is worth is what the answers decide. Get none right and the fire is lit and
 *    never catches.
 *
 * Nothing advances on a clock. Every transition is a button, which is what makes the
 * encounter unfarmable by idling and replayable from its event list.
 *
 * ## Two unknowns, and only one of them is the mechanic
 *
 * The design's premise is that you commit before you know your accuracy. It was never that
 * you commit before you know your GEOMETRY, and until the nested preview existed the
 * player was betting on both at once: they chose a cell without being able to see what any
 * tier would cover from it, which is not a gamble so much as a guess. `hardWinterFirePreview`
 * resolves the second unknown and leaves the first exactly as sharp — you can now read off
 * which buildings each tier would reach and still have no idea which tier you will earn.
 *
 * ## The city varies, and so does the board
 *
 * `winterLayoutFor(encounter)` deals a different authored layout each time, cycling
 * through all of them before repeating, because in the finished game the player chooses
 * where every building goes. A compact city and a spread one are genuinely different
 * encounters, and the surface names which one it dealt so a tuning session can tell them
 * apart.
 *
 * ## What this surface deliberately does not do
 *
 * It writes no mastery (`hardWinterItems.ts` explains why, and does not import the module
 * that could), it gates no progression, and it pays nothing: the payout is DISPLAYED as
 * the descriptor the engine computes, with the economy call it would need named on screen.
 * `packages/economy` is untouched.
 */

/** Which panel the right-hand column is showing. */
type Inspect = { readonly kind: "building"; readonly node_id: string } | null;

/** The encounter a fresh mount starts on, and so the layout it is dealt. 1-based. */
const FIRST_ENCOUNTER = 1;

/**
 * Which board the winter falls on: one of the authored layouts, dealt by the encounter
 * cycle, or the city the player actually built.
 *
 * `"live"` IS A PREFERENCE, NOT A GUARANTEE, and holding it that way is deliberate. There
 * may be no saved city; there may have been one at mount and none by the time the player
 * presses "New winter", because they went and cleared it. So the preference is recorded as
 * asked and `boardLayout` is the SINGLE place that resolves it against what is actually
 * there. Resolving it at each call site instead — which is how this was first written —
 * left the fallback unreachable and therefore untested, which an injected defect went on
 * to demonstrate by passing.
 */
type BoardChoice = "authored" | "live";

function boardLayout(
  board: BoardChoice,
  live: LiveCityResult,
  encounter: number,
): WinterLayout | LiveCityLayout {
  return board === "live" && live.status === "ready"
    ? live.layout
    : winterLayoutFor(encounter);
}

/** How the era-one node prefix reads to a learner. */
function masteredPrefix(count: number): readonly string[] {
  return WINTER_NODE_ORDER.slice(0, count);
}

function tierLabel(tier: WinterActionTier): string {
  switch (tier) {
    case "strong":
      return "3 of 3";
    case "steady":
      return "2 of 3";
    case "weak":
      return "1 of 3";
    default:
      return "0 of 3";
  }
}

/**
 * What one tier does for one kind of action, in that action's own units.
 *
 * For a fire this is the GENERIC figure — the footprint on open ground, as a cell count
 * and as a share of the island — used before a cell has been chosen. Once one has,
 * `FirePreviewLadder` replaces it with the same rungs measured at that cell, which is the
 * only number that is actually true of the fire being declared.
 */
function tierEffect(
  kind: WinterAction["kind"],
  tier: WinterActionTier,
  era: EraId,
): string {
  if (kind === "fire") {
    const radius = HARD_WINTER.fire.radius_by_tier[tier];
    if (radius === null) {
      return "no fire at all, it never catches";
    }
    // The share is of the island the crisis is ACTUALLY being played on, so it moves with
    // the resolved crisis era instead of quoting era one's island at every era.
    const islandCells = hardWinterIsland(era).cells.length;
    const cells = winterWardArea(radius);
    const share = Math.round((cells / islandCells) * 100);
    return `${cells} cell${cells === 1 ? "" : "s"} warm (${share}% of the island)`;
  }
  if (kind === "reinforce") {
    const extra = HARD_WINTER.reinforce.shield_by_tier[tier];
    return extra === 0
      ? "no shield at all"
      : // The same clause as the Reinforce card's own description, deliberately: they describe
        // one mechanic and a reader meets them within a few pixels of each other. It changed
        // there because that sentence sets the crisis panel's width (see the card), and it
        // changes here so the two do not drift into two ways of saying the same thing.
        `${extra} points of shield, and the frost has to break it first`;
  }
  // Unreachable while `WinterAction` has two members, and kept rather than folded into the
  // branch above: this is a switch over the action union, and a third action should arrive here
  // visibly rather than silently borrowing the reinforce ladder's words.
  return "nothing this board offers";
}

/** The whole ladder for whichever action is being considered, strongest rung first. */
function ladderFor(kind: WinterAction["kind"] | null, era: EraId): readonly string[] {
  if (kind === null) {
    return [];
  }
  return [...WINTER_TIERS]
    .reverse()
    .map((tier) => `${tierLabel(tier)}: ${tierEffect(kind, tier, era)}`);
}

/**
 * The next encounter index that would deal `wanted`, so the dev panel can jump straight to
 * a layout without pressing "New winter" until it comes round.
 *
 * Searched forward through the cycle rather than computed, because the cycle's order is a
 * seeded shuffle and inverting it is not worth a second implementation of the shuffle. The
 * bound is one full cycle past the current encounter, which always contains every layout.
 */
function encounterShowing(wanted: WinterLayout, from: number): number {
  const span = winterLayouts().length;
  for (let next = from + 1; next <= from + span; next += 1) {
    if (winterLayoutFor(next).id === wanted.id) {
      return next;
    }
  }
  return from + 1;
}

function describeAction(action: WinterAction): string {
  switch (action.kind) {
    case "fire":
      return `Light a fire at column ${action.col}, row ${action.row}`;
    default:
      return `Reinforce the ${placementLabel(action.node_id)}`;
  }
}

/**
 * Everything a board needs to draw one moment of the winter and report a pick.
 *
 * A SLOT and not a rewrite. The lead's ruling is that the crisis should happen on the island
 * the player built rather than on a screen of its own, and the board was the only part of this
 * surface that was ever a 2D grid — rounds, tiers, declarations, questions and outcomes are
 * board-agnostic already. So the island is mounted through here and every control above and
 * beside it is reused untouched.
 *
 * `?winter` keeps the grid: `renderBoard` is optional and unset on that route, which is what
 * makes this an addition rather than a replacement of a debugging surface that has tests.
 */
export interface WinterBoardSlot {
  readonly view: HardWinterView;
  readonly winter: HardWinterState;
  readonly era: EraId;
  readonly mode: WinterGridMode;
  /** The picked cell's key, in the same `"col,row"` form the grid board takes. */
  readonly selected: string | null;
  readonly onPick: (cell: WinterCellView) => void;
}

export interface HardWinterSurfaceProps {
  /** Draw the board some other way (the 3D island). Omitted, the 2D grid is drawn. */
  readonly renderBoard?: (slot: WinterBoardSlot) => ReactNode;
  /**
   * THE BOARD'S KEY, drawn into the settlement strip so the two share a row.
   *
   * A second slot rather than part of `renderBoard`, because they are wanted in two different
   * places: the board is the whole canvas and the key is one item on a status line. It is the
   * board's owner who supplies it either way, since the two boards this surface can draw wear
   * different colours — the grid's swatches are CSS and the island's are three.js ground tones.
   *
   * Omitted on `?winter`, which keeps its own fuller key under the grid where a page has the
   * room for one.
   */
  readonly renderStatusKey?: () => ReactNode;
  /**
   * The era the CITY is standing in. Omitted, it is read from the stored era, which is the
   * city's era on both routes — `?winter` opens cold and storage is the only city it can see.
   *
   * It is not necessarily the era the crisis is PLAYED in: the encounter needs ground AND an
   * item pool, and only era one has the second, so `resolveCrisisEra` decides which board
   * there is to fall on and this surface says which it got. See `crisisEra.ts` for why the pin
   * is explicit rather than nine references to a constant, and for why the LAND half of that
   * condition stopped binding when all ten budgets were authored.
   */
  readonly liveEraId?: EraId;
  /**
   * Where the live city comes from. Omitted, it is read from storage, which is right for
   * `?winter` — that route is opened cold and storage is the only city it can see.
   *
   * The in-city mount supplies its own, because there the city is not a saved blob but the
   * island on screen: reading storage from inside a running city would answer with whatever
   * the debounced save last flushed, which can be a building behind.
   */
  readonly readLiveCity?: () => LiveCityResult;
  /**
   * WHICH SKILLS THIS LEARNER HAS ACTUALLY DONE, which is the set the crisis draws from.
   *
   * Omitted, it is read from the dev session store synchronously, exactly as `DevLessons`
   * reads it and for the same reason: `?winter` is opened cold and storage is the only
   * progress it can see. There is no async path to wait for.
   *
   * The in-city mount supplies its own, on the same argument as `readLiveCity` above: a
   * learner who just finished a practice set may not have flushed, and progress re-read from
   * storage inside a running city can be a set behind the one on screen.
   *
   * This used to be nothing at all. The surface assumed every era-one node was done, so the
   * crisis could ask about a lesson the learner had never opened.
   */
  readonly readMasteredNodes?: () => readonly string[];
  /**
   * RAISE THE CRISIS BRIEFING AGAIN. Omitted, no chip is drawn and the header is unchanged.
   *
   * Supplied only by `WinterRoute`, which owns the entry sequence on the `?winter` route.
   * The card is dismissable there and the route is a demo path, so a dismissal must not be
   * one-way; the in-city mount leaves this unset because `CrisisCallNotice` is already its
   * way back to the same card.
   */
  readonly onTalkToAdvisor?: () => void;
  /** Who {@link HardWinterSurfaceProps.onTalkToAdvisor} offers to talk to. */
  readonly advisorName?: string | null;
  /**
   * Leave the winter and return to the city, supplied by the in-city mount.
   *
   * The carry-back needs it because its label promises two things — record the damage AND
   * go back — and it was only ever doing the first, so the button marked the city and then
   * left the player standing in a finished winter with no sign it had worked.
   */
  readonly onLeave?: () => void;
  /**
   * **WHERE THE CARRY-BACK'S DAMAGE ACTUALLY GOES**, supplied by the in-city mount.
   *
   * Omitted, it falls back to `scarIntoSavedCity`, which writes the saved blob — the only
   * city `?winter` can see, since that route is opened cold with no session anywhere.
   *
   * The in-city mount supplies its own, and this is the whole of the 2026-08-04 fix: the
   * city already holds a `CityDevSession`, the island is drawn from `session.load()`, and a
   * write that went round it landed somewhere nothing reads. See `scarLiveCity.ts`.
   */
  readonly onCarryDamage?: ScarCommit;
  /**
   * ONE MILESTONE LINE for the concluding card, or null. Passed straight through.
   *
   * The city decides it (`city/milestones.ts`), because whether this is the player's first
   * crisis is a fact about their island and not about this encounter. `?winter` passes
   * nothing and gets nothing, which is right: an authored board is not anybody's city.
   */
  readonly milestone?: string | null;
}

export function HardWinterSurface({
  renderBoard,
  renderStatusKey,
  readLiveCity = loadLiveCityLayout,
  readMasteredNodes = loadWinterEligibleNodes,
  liveEraId,
  onTalkToAdvisor,
  onLeave,
  onCarryDamage,
  advisorName,
  milestone = null,
}: HardWinterSurfaceProps = {}): ReactElement {
  // WHOSE CRISIS THIS IS, resolved rather than pinned. The live era is what the city wears;
  // the board's era is the nearest era whose winter is built, which is era one until somebody
  // authors a second era's item pool. `crisis.board` is how the surface says which it got
  // instead of asserting era one's in copy that will go quietly wrong.
  const crisis = resolveCrisisEra(liveEraId ?? loadEraId());
  const era = crisis.eraId;

  // WHILE THIS IS MOUNTED, A CRISIS IS RUNNING, and the soundtrack takes its cue from that
  // rather than from anything about winters (`audio/eraMusic.ts`). Both doors into the
  // encounter mount this component, so one call covers `?winter` and the in-city crisis.
  // It declares the BOARD's era, which is whose crisis this is; the city may be standing
  // in a later one.
  useDeclareActiveCrisis(era);

  /**
   * Bumped by "New winter": it reseeds the question draw, DEALS THE NEXT LAYOUT, and
   * resets the island. One counter drives both because they should move together — a
   * fresh winter is a fresh city and a fresh batch, and pinning them to the same index is
   * what makes a whole encounter reproducible from a single number.
   */
  const [encounter, setEncounter] = useState(FIRST_ENCOUNTER);
  /**
   * THE REAL ELIGIBLE SET, read at mount and re-read on every restart.
   *
   * This is what the entry advisor's *"questions drawn from lessons you have already done"*
   * is a promise about, so it is the learner's own practised set rather than a stand-in.
   */
  const [realMastered, setRealMastered] = useState<readonly string[]>(readMasteredNodes);
  /**
   * A DEV OVERRIDE OF THAT SET, and null when there is none.
   *
   * The chips below exist so somebody tuning can play the encounter at one skill and at six
   * without practising six lessons first, which is a real need and the reason they stay. What
   * changed is that they are now an OVERRIDE rather than the source: at `null` the surface
   * uses the learner's own set, so the honest case is the default and the instrument is the
   * exception. It used to be the other way round, with the initial value pinned at all six.
   */
  const [devPrefix, setDevPrefix] = useState<number | null>(null);

  /**
   * THE PLAYER'S OWN CITY, read once at mount and re-read on every restart.
   *
   * The authored layouts are the right instrument for choosing a number and the wrong one
   * for judging whether it feels right, so when a saved city exists the surface opens on
   * it: whoever came here to decide whether 13 cells is generous should not have to find a
   * menu before they can see their own island.
   */
  const [live, setLive] = useState<LiveCityResult>(readLiveCity);
  const [board, setBoard] = useState<BoardChoice>(() =>
    live.status === "ready" ? "live" : "authored",
  );
  const layout = boardLayout(board, live, encounter);
  const [winter, setWinter] = useState<HardWinterState>(() =>
    createHardWinter({
      era,
      buildings: boardLayout(
        live.status === "ready" ? "live" : "authored",
        live,
        FIRST_ENCOUNTER,
      ).buildings,
    }),
  );

  const [pending, setPending] = useState<WinterAction | null>(null);
  const [mode, setMode] = useState<WinterGridMode>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [inspect, setInspect] = useState<Inspect>(null);

  /**
   * Buildings whose shield was spent to nothing by the round that just closed.
   *
   * Reset by the next `end_round` rather than by a timer, because nothing in this surface may
   * read a clock (`test/hardWinterClockless.test.ts` sweeps for it), and because the notice
   * belongs to the round the player is now standing in: it is telling them what they are no
   * longer protected by while they choose what to do about it.
   */
  const [spentShields, setSpentShields] = useState<readonly string[]>([]);

  const [batch, setBatch] = useState<WinterBatchComposition | null>(null);
  const [verdicts, setVerdicts] = useState<readonly boolean[]>([]);
  const [answer, setAnswer] = useState<PracticeAnswerValue>(null);
  const [shown, setShown] = useState<boolean | null>(null);
  /** The refusal, when the reader could not read the answer. Never a verdict. */
  const [unreadable, setUnreadable] = useState<string | null>(null);

  /**
   * WHETHER THIS WINTER HAS BEEN CARRIED BACK TO THE REAL CITY — null until it is asked for.
   *
   * The write is a BUTTON in the outcome panel and nothing else, which is what keeps the
   * sandbox: the encounter has no setting that arms it in advance, so the only way a city
   * gets marked is somebody pressing a control while looking at the damage it would accept.
   * A checkbox armed before the first round would be an opt-in too, and a worse one — the choice
   * would be made before the thing being chosen existed. The engine knows nothing about
   * either; see `scarLiveCity.ts`.
   */
  const [scar, setScar] = useState<ScarResult | null>(null);

  // The cell a fire is being aimed at, which is what turns the nested preview on. It is
  // the PENDING declaration and not the hovered cell: a footprint that chased the pointer
  // would be a decoration, where one pinned to the choice under consideration is a
  // read-out of the choice. Carried as two numbers rather than an object so the memo is
  // keyed on values and not on a fresh reference every render.
  const aimed = pending?.kind === "fire" && winter.phase === "declaring" ? pending : null;
  const aimedCol = aimed?.col ?? null;
  const aimedRow = aimed?.row ?? null;
  // There used to be a second preview under the same rule: the ring a pull-back would give up
  // was drawn while that was the declaration under consideration, so the ground it would ruin was
  // visible before it was spent. The action was ruled out on 2026-08-02, so the fire's footprint
  // is the only hypothetical the board draws.
  const view = useMemo(
    () =>
      hardWinterView(winter, {
        fire_preview:
          aimedCol === null || aimedRow === null ? null : { col: aimedCol, row: aimedRow },
      }),
    [winter, aimedCol, aimedRow],
  );
  /**
   * WHAT THIS ROUND DRAWS FROM: the learner's own practised nodes when the pool can serve a
   * batch from them, era one's authored nodes when it cannot, or the dev override when one is
   * armed. One expression, so there is no second place for the three to disagree.
   *
   * The `era` case is the fallback `winterDrawSetFromIds` documents, and it is why a fresh
   * session can play the crisis at all. It draws the questions and grants no evidence; what
   * the learner is told about it is `drawnFromEra` below.
   */
  const drawSet = winterDrawSetFromIds(realMastered);
  const mastered = devPrefix === null ? drawSet.nodeIds : masteredPrefix(devPrefix);
  /**
   * Whether the questions are coming from lessons the learner has NOT done, which the surface
   * owes them a sentence about: the entry advisor promises the opposite in as many words, and
   * a fallback the player cannot see is one they cannot account for. False under the dev
   * override, because there the dev panel's own read-out is already saying so.
   */
  const drawnFromEra = devPrefix === null && drawSet.source === "era";

  function reset(
    nextEncounter: number,
    nextDevPrefix: number | null,
    nextBoard: BoardChoice = board,
  ): void {
    // RE-READ the saved city rather than reusing the mount-time snapshot: the person
    // judging this may well alt-tab to the island, move a building and come back, and a
    // board answering from a cached layout would be answering about a city that no longer
    // exists. It may also come back to no city at all, which is why `board` is only ever a
    // PREFERENCE and `boardLayout` is the single place that resolves it against what is
    // actually there — a second copy of that rule here is a second place to get it wrong.
    const refreshed = readLiveCity();

    setLive(refreshed);
    setBoard(nextBoard);
    setEncounter(nextEncounter);
    // And re-read progress on the same argument: a learner can finish a lesson between two
    // winters, and the second winter should know about it.
    setRealMastered(readMasteredNodes());
    setDevPrefix(nextDevPrefix);
    setWinter(
      createHardWinter({
        era,
        buildings: boardLayout(nextBoard, refreshed, nextEncounter).buildings,
      }),
    );
    setPending(null);
    setMode(null);
    setRefusal(null);
    setInspect(null);
    setBatch(null);
    setVerdicts([]);
    setAnswer(null);
    setShown(null);
    setUnreadable(null);
    // A new winter has not been carried back yet. The PREFERENCE survives a restart (the
    // person who armed it meant to arm it), the RESULT does not.
    setScar(null);
  }

  function propose(action: WinterAction): void {
    const why = winterActionRefusal(winter, action);
    setRefusal(why);
    setPending(why === null ? action : null);
  }

  function commit(): void {
    if (pending === null) {
      return;
    }
    const declared = hardWinterReducer(winter, { type: "declare", action: pending });
    if (declared === winter) {
      setRefusal(winterActionRefusal(winter, pending));
      return;
    }
    // A heavy material thud for the declaration landing. AFTER the refusal branch, so a
    // declaration the engine turned down is silent — the reducer returns the same state
    // object on a refusal, which is what the identity check above is reading.
    //
    // One of the two events that name a material, so one of the two that ladders by era:
    // timber early, iron late. The board's era, not the city's, because that is the
    // island this action is being taken on.
    playSfx(eraMaterialSfx("crisis-commit", era));
    setWinter(declared);
    setMode(null);
    setRefusal(null);
    setBatch(
      winterBatchFor({
        masteredNodeIds: mastered,
        encounter,
        round: declared.round,
      }),
    );
    setVerdicts([]);
    setAnswer(null);
    setShown(null);
    setUnreadable(null);
  }

  function submitAnswer(): void {
    if (batch === null || batch.status !== "ready") {
      return;
    }
    const prompt = batch.prompts[verdicts.length];
    if (!prompt || answer === null) {
      return;
    }
    /*
     * THE READER COULD NOT READ IT, so there is no verdict to bank: `correct` is null, `shown`
     * stays null, and the question stays exactly as it was — field live, Check still there,
     * nothing added to `verdicts` and no crisis consequence. Before this, `.client_correct`
     * collapsed an unreadable answer to `false` and the round banked it as a miss.
     */
    const graded = gradeWinterAnswer(prompt.item_version_id, answer);
    if (graded.correct === null) {
      setUnreadable(graded.unreadable);
      return;
    }
    setUnreadable(null);
    setShown(graded.correct);
  }

  /**
   * Bank the verdict just shown and move on — AND, when it was the last question, resolve the
   * round in the same press.
   *
   * ## Why the commit lives here and not on a button
   *
   * It used to be a control labelled "Resolve", and the lead's ruling is that the crisis has no
   * resolve PHASE for such a control to belong to: you declare, you answer, and the outcome
   * applies. A button naming a step the encounter does not have reads as doing nothing.
   *
   * **But it was not inert.** It was the only thing in the whole app that sent the engine a
   * `resolve`, and `resolve` is what applies the declared action at the tier the batch earned.
   * So deleting the control without moving the transition would have stranded the state
   * machine in `answering` with no way out: a confusing button traded for a dead encounter.
   * The transition is therefore MOVED rather than removed, onto the last answer, which is the
   * moment the tier stops being unknown and is where the design says the outcome applies.
   *
   * `landed` is computed rather than read off `verdicts`, because the state setter has not run
   * yet: resolving on `verdicts` would score the round on two answers out of three.
   */
  function nextQuestion(): void {
    if (shown === null) {
      return;
    }
    const landed = [...verdicts, shown];
    setVerdicts(landed);
    setShown(null);
    setUnreadable(null);
    setAnswer(null);

    if (
      batch === null ||
      batch.status !== "ready" ||
      landed.length < batch.prompts.length
    ) {
      return;
    }
    const resolved = hardWinterReducer(winter, {
      type: "resolve",
      correct: landed.filter(Boolean).length,
      asked: batch.size,
    });
    setWinter(resolved);
    soundTheResolution(resolved.last_resolution);
  }

  /**
   * WHAT A RESOLVED ROUND SOUNDS LIKE. Two events land on this one press and they are
   * deliberately two: the round's verdict, and a hearth that caught.
   *
   * The verdict is the check mark the lesson layer already synthesizes rather than a new
   * asset, and it sounds only where the round EARNED something — a per-tier fanfare would
   * make a graded outcome loud, which `Game_Visual_Design_Brief.md` refuses in as many
   * words (*"Celebration amplitude stays low and earned"*), and a check mark over a round
   * that bought nothing would be a lie rather than a low celebration.
   *
   * Both decisions live in `winterSfx.ts` and are read off the engine's own resolution
   * record, so a sound cannot disagree with the board about what the round bought.
   */
  function soundTheResolution(resolution: WinterResolution | null): void {
    if (resolutionEarnedItsChime(resolution)) {
      playCorrectChime();
    }
    for (const sound of resolutionSfx(resolution)) {
      playSfx(sound);
    }
  }

  function advanceFrost(): void {
    const next = hardWinterReducer(winter, { type: "end_round" });
    // **THE ONE MOMENT A SHIELD CAN BREAK**, so it is the one place the break is noticed.
    // Closing the round is the only transition that spends a shield, and the island draws
    // shielded as BINARY — no bar, no count — so a shield reaching zero takes a whole storm
    // roof off a building in a single step. Unannounced, that reads as a rendering bug rather
    // than as the mechanic working. Captured here against the PRE-advance buildings rather
    // than diffed out of a render, so nothing depends on which renders React chose to run.
    setSpentShields(winterSpentShields(winter.buildings, next.buildings));
    soundTheRoundClosing(next);
    setWinter(next);
    setPending(null);
    setBatch(null);
    setVerdicts([]);
  }

  /**
   * WHAT CLOSING A ROUND SOUNDS LIKE — up to three events, decided in `winterSfx.ts` from
   * the round the engine just wrote rather than diffed out of a render.
   *
   * The frost bed and the crack sound together on purpose: the ground went, and it took
   * something with it. They do not collide — the bed is a sparse crackle centred at
   * 2.4 kHz and the crack is a dry transient with almost no tail — and the pair is the
   * loudest this surface ever gets. The anti-stacking argument, and the measurement that
   * showed a test could not see it from here, are on `roundClosingSfx`.
   */
  function soundTheRoundClosing(next: HardWinterState): void {
    const justEnded = next.phase === "ended" && winter.phase !== "ended";
    for (const sound of roundClosingSfx(next.log[next.log.length - 1], justEnded)) {
      playSfx(sound);
    }
  }

  /**
   * Take the state a dev skip produced, and drop the answer flow it went round.
   *
   * The batch and the part-answered verdicts are cleared rather than left, because a skip is the
   * claim that those three questions were NOT answered: carrying a stale verdict list forward would
   * be the one way this control could put a number into the encounter that nobody earned. Nothing
   * else about the round is touched — `WinterDevSkip` sends the engine the same `resolve` the last
   * answer sends, so the declared action, the frost, the damage and the round counter are all the
   * ordinary machinery.
   */
  function skipQuestions(next: HardWinterState): void {
    setWinter(next);
    setPending(null);
    setMode(null);
    setRefusal(null);
    setBatch(null);
    setVerdicts([]);
    setAnswer(null);
    setShown(null);
    setUnreadable(null);
  }

  function pickCell(cell: WinterCellView): void {
    if (mode === "fire") {
      propose({ kind: "fire", col: cell.col, row: cell.row });
      return;
    }
    if (mode === "reinforce" && cell.building) {
      propose({ kind: "reinforce", node_id: cell.building.node_id });
      return;
    }
    if (cell.building) {
      setInspect({ kind: "building", node_id: cell.building.node_id });
    }
  }

  const selectedCell =
    pending?.kind === "fire"
      ? `${pending.col},${pending.row}`
      : pending?.kind === "reinforce"
        ? (() => {
            const b = winter.buildings.find((x) => x.node_id === pending.node_id);
            return b ? `${b.col},${b.row}` : null;
          })()
        : null;

  return (
    <>
      {/*
      TWO LAYOUT HOOKS, and neither is read in this file: they exist so the in-city mount,
      where the board IS the island and the panel sits over the middle of it, can put the
      panel where the moment needs it. The grid route ignores both, because there the board
      has its own column and is never covered.

      `data-phase` IS THE ENGINE'S OWN PHASE, passed straight through. It is not a layout
      state invented here: `WinterPhase` is a union the reducer enforces, one screen renders
      per value, and out-of-phase events return the same state object. So it is keyed on
      something real, which is what makes the layout follow the encounter rather than
      approximate it. Why the layout should follow it at all is `winter-in-city.css`'s
      argument: the island and the questions are wanted at DIFFERENT MOMENTS, so a fixed
      layout has to lose one of them.

      `data-aiming` is the narrower state INSIDE `declaring`: a declaration mode is armed and
      no cell has been picked yet. It is the state the prompt line already announces in words
      ("Now choose a cell on the island"), and it stays because it still earns its keep — the
      band drops what is read before arming, so the one sentence the player needs while
      aiming is the one on screen.
    */}
      <div
        className="hw-shell"
        data-phase={winter.phase}
        data-aiming={mode !== null && pending === null}
      >
        <header className="hw-header">
          <div>
            <span className="micro-label">Mid-era crisis · prototype</span>
            <h1>The Hard Winter</h1>
            {/* The way out, beside the title rather than at the foot of the page: `?winter`
              replaces the whole app, so without this the only way back to the island is the
              address bar — and the outcome panel's success line sends the player there. */}
            <CityReturnChip />
            {/* And the way back to the briefing, on the routes that own an entry sequence. Its
                label follows `CrisisCallNotice`'s, so the same card is offered in the same
                words wherever it is reachable from. */}
            {onTalkToAdvisor && (
              <button
                type="button"
                className="hw-chip"
                data-testid="hw-talk-to-advisor"
                onClick={onTalkToAdvisor}
              >
                {advisorName ? `Talk to ${advisorName}` : "How it works"}
              </button>
            )}
          </div>
          <div className="hw-header__meta">
            <p className="hw-round">
              {winter.phase === "ended"
                ? "Winter is over"
                : `Round ${winter.round} of ${winter.rounds}`}
            </p>
            {/*
              THE FORECAST, AND NOT THE TALLY.

              #328 tightened this line to *"N of M cells frozen · N steps of frost this round"*,
              and its shorter sentence is kept while the cell count goes. That count is the
              clearest case of the lead's later diagnosis — *"theres' too much like bookeeping on
              '88 tiles ___'"* — and of D-CRISIS-30's second clause: a player has a relationship
              with their buildings and with how well they answered, and none at all with a cell
              count. Where the frost has REACHED they read off the island in one look; how far it
              moves NEXT they cannot, and that is the number a fire lit ahead of the line is aimed
              with. So the forecast survives in #328's wording and the running total does not.
            */}
            <p className="hw-frost">
              {winterSpreadSteps(winter.round)} step
              {winterSpreadSteps(winter.round) === 1 ? "" : "s"} of frost this round
            </p>
            <p className="hw-layout" data-layout={layout.id}>
              {/* "· a snapshot, not the real one" came off this line rather than out of the
                  surface: the sandbox note said the same thing at length, so the banner was the
                  second of two places saying it. In-city neither is drawn now. */}
              {layout.id === "live" ? (
                <>
                  Falling on <strong>your own city</strong>
                </>
              ) : (
                <>
                  This city: <strong>{layout.label}</strong>
                </>
              )}
            </p>
            {/*
              WHOSE CRISIS, said out loud when it is not the city's own age — and said to a
              PLAYER. The board comes from `eraBuildableRadius`, which is authored for era one
              and throws for the other nine (D-ERA25), so a city standing in a later era plays
              the only crisis there is ground for, and the honest thing is to name it rather
              than to let the player assume the age they are standing in is the age being
              tested.

              The behaviour is unchanged and the reason is unchanged; only the AUDIENCE was
              wrong. This line used to explain the seam, cite `D-ERA25` at whoever was watching,
              and carry an em-dash the repository bans in learner-facing copy. What a player
              needs from it is the two era names and which of them the winter belongs to, which
              is what is left. The engineering reason lives in this comment and in
              `crisisEra.ts`, where a reader who wants it will look.
            */}
            {crisis.board === "pinned" && (
              <p className="hw-frost" data-testid="hw-crisis-era">
                The <strong>{getEraOrThrow(crisis.eraId).name}</strong>&apos;s winter, on
                your <strong>{getEraOrThrow(crisis.liveEraId).name}</strong> island.
              </p>
            )}
          </div>
        </header>

        {/*
          THE SETTLEMENT AND THE ISLAND'S KEY ON ONE ROW, UNDER THE MASTHEAD.

          The lead's instruction was to fold this onto one line because it was *"taking up extra
          space on the bottom and bleeding over"*, and one line is only half of that: at 1024x580
          the declaring band is 290px tall, so a one-line strip at the FOOT of it is still below
          the fold, which is exactly where he found it.

          It belongs beside the round counter anyway, and inherits that line's own argument. Both
          answer *where do I stand*; the round counter is kept in the masthead because a clock that
          scrolls out of sight during the turn it is counting is not one, and *which of my buildings
          falls at the end of this round* is the same kind of fact.

          See `WinterStatusStrip.tsx`. The key arrives through a slot because whoever draws the
          board owns what its key says: the 2D grid's swatches are CSS and the island's are three.js
          ground tones, and they are not the same colours.
        */}
        <WinterStatusStrip winter={winter} renderKey={renderStatusKey} />

        {/* The ruling, in one line instead of four, from #328. It used to explain WHY mastery is
            not written ("answering under pressure is not a fair measure of what you know"), which
            is an argument a player has not asked for; the promise is what they need, and the
            argument is in `hardWinterItems.ts` where it belongs. */}
        <p className="hw-note">
          Real practice questions, graded by the real checker. They are{" "}
          <strong>not written to mastery</strong> and nothing here gates progression.
        </p>

        {/*
        The sandbox promise, said where it is needed rather than in a docblock. Somebody
        opening this to judge a tuning number is EVALUATING, and the first question they
        will have about a crisis played over their own island is whether it can wreck it.

        THE PROMISE ITSELF STAYS WHOLE while everything around it is cut, and that is a
        judgement rather than an oversight. Five sentences became two: gone are the restatement
        of the snapshot ("the same buildings, on the same cells"), the abstract form of the
        promise ("nothing here writes back unless you ask it to", which the concrete sentence
        below already makes), and the re-read instruction, which belongs to the dev panel that
        owns the New winter button.

        What is left is the sentence somebody deciding whether this is safe to open actually
        needs, in the words they need it in. A shorter paraphrase of a promise is a weaker
        promise, and this is the one line on the surface where that would cost something real.
      */}
        {layout.id === "live" && (
          <p className="hw-note hw-note--sandbox">
            This winter falls on <strong>a snapshot of your saved city</strong>. Burn it to
            the ground and your island is still exactly where you left it, unless you press{" "}
            <strong>Carry this damage back to my city</strong> when the winter ends.
          </p>
        )}

        <div className="hw-body">
          <div className="hw-board">
            {renderBoard ? (
              renderBoard({
                view,
                winter,
                era,
                mode: winter.phase === "declaring" ? mode : null,
                selected: selectedCell,
                onPick: pickCell,
              })
            ) : (
              <WinterGrid
                view={view}
                era={era}
                mode={winter.phase === "declaring" ? mode : null}
                selected={selectedCell}
                onPick={pickCell}
              />
            )}
            <WinterLegend />
          </div>

          <div className="hw-side">
            {/* THE LOSS FIRST. A frozen building is the encounter's only irreversible harm,
              and a spent shield is protection doing its job: read in the other order the
              player would meet the smaller fact first. */}
            <FrozenNotice frozen={winterFrozenThisRound(winter)} />
            <SpentShieldNotice spent={spentShields} ended={winter.phase === "ended"} />
            {winter.phase === "declaring" && (
              <DeclarePanel
                winter={winter}
                view={view}
                era={era}
                pending={pending}
                refusal={refusal}
                mode={mode}
                onMode={(next) => {
                  setMode(next);
                  setPending(null);
                  setRefusal(null);
                }}
                onPropose={propose}
                onCommit={commit}
                batchSize={HARD_WINTER.batch_size}
              />
            )}

            {winter.phase === "answering" && batch !== null && (
              <BatchPanel
                batch={batch}
                declared={winter.declared}
                verdicts={verdicts}
                answer={answer}
                shown={shown}
                unreadable={unreadable}
                drawnFromEra={drawnFromEra}
                onAnswer={setAnswer}
                onSubmit={submitAnswer}
                onNext={nextQuestion}
              />
            )}

            {winter.phase === "resolved" && (
              <ResolvedPanel winter={winter} onAdvance={advanceFrost} />
            )}

            {/* The end of the winter has no panel in this rail. It is `WinterConclusion`, below
              and outside the shell, on D-CRISIS-30's first clause: a crisis whose ending is a
              state of its own HUD has no ending. */}

            <BuildingPanel
              winter={winter}
              inspect={inspect}
              onClose={() => setInspect(null)}
            />
          </div>
        </div>

        {/* THE TRACKER IS GONE FROM THE PLAYER'S SURFACE, on the lead's ruling: *"remove the
          tracker on what actions have been taken so far - its unecessary clutter"*. It is a log
          of state transitions, which is a debugging affordance rather than something a player
          needs while choosing, and it is the same class of thing as the dev panel beside it.
          `winter-in-city.css` hides both in-city; `?winter` is an explicitly labelled tuning
          instrument and keeps both, where a replayable event list is the point. */}
        <RoundLog winter={winter} />

        <section className="hw-panel hw-panel--dev" aria-labelledby="hw-dev-title">
          <span className="section-index">DEV</span>
          <h2 id="hw-dev-title">How far has this learner got?</h2>
          <p>
            The batch draws from the skills this learner has{" "}
            <strong>actually practised</strong>, which under <strong>D-CRISIS-14</strong>
            &apos;s era-one exception is all of era one&apos;s own mastered nodes. The chips
            below override that so a whole ladder can be played without practising six
            lessons first. Change it and the winter restarts.
          </p>
          <div className="hw-dev__row">
            {/* "Real progress" first, because it is the default and the chips are the
              exception. Pressing it clears the override rather than setting a count. */}
            <button
              type="button"
              className="hw-chip hw-chip--real"
              aria-pressed={devPrefix === null}
              onClick={() => reset(encounter + 1, null)}
            >
              Real progress ({realMastered.length})
            </button>
            {WINTER_NODE_ORDER.map((nodeId, index) => (
              <button
                type="button"
                key={nodeId}
                className="hw-chip"
                aria-pressed={devPrefix === index + 1}
                onClick={() => reset(encounter + 1, index + 1)}
              >
                {index + 1} skill{index === 0 ? "" : "s"}
              </button>
            ))}
          </div>
          <p className="hw-dev__reading">
            Drawing from {mastered.length} node{mastered.length === 1 ? "" : "s"}:{" "}
            <code>{mastered.length === 0 ? "none" : mastered.join(", ")}</code>
            {devPrefix !== null
              ? ` · overridden; the real set is ${realMastered.length} node${realMastered.length === 1 ? "" : "s"}`
              : drawnFromEra
                ? ` · era one's authored nodes; this learner's real practised set is ${realMastered.length} node${realMastered.length === 1 ? "" : "s"}, which the pool cannot fill a batch from`
                : " · this learner's real practised set"}
          </p>
          {/* The no-repeat rule is only visible over a whole encounter, so the surface says
            which skills this round preferred rather than leaving it to be inferred. */}
          <p className="hw-dev__reading">
            D-CRISIS-15 order for round {winter.round}:{" "}
            <code>
              {mastered.length === 0
                ? "none"
                : winterSkillOrder({
                    eligible: mastered,
                    encounterSeed: mixSeed(encounter, 0x5eed),
                    round: winter.round,
                  })
                    .slice(0, HARD_WINTER.batch_size)
                    .join(", ")}
            </code>
          </p>

          <h2>Which city did it fall on?</h2>
          <p>
            In the real game the player chooses where every building goes, so a number tuned
            against one arrangement is tuned against a fiction. Each new winter deals the
            next of {winterLayouts().length} authored layouts, cycling through all of them
            before any repeats, so a compact city and a spread one both get played.{" "}
            <strong>Your city</strong> is not one of them: it is the layout saved in this
            browser, read as a snapshot. Playing over it changes nothing there on its own.
            Only the carry-back button at the end of a winter does, and only for this board.
          </p>
          <div className="hw-dev__row">
            <button
              type="button"
              className="hw-chip hw-chip--live"
              aria-pressed={layout.id === "live"}
              disabled={live.status !== "ready"}
              onClick={() => reset(encounter, devPrefix, "live")}
            >
              Your city
            </button>
            {winterLayouts().map((candidate) => (
              <button
                type="button"
                key={candidate.id}
                className="hw-chip"
                aria-pressed={candidate.id === layout.id}
                onClick={() =>
                  reset(encounterShowing(candidate, encounter), devPrefix, "authored")
                }
              >
                {candidate.label}
              </button>
            ))}
          </div>
          {live.status !== "ready" && (
            <p className="hw-dev__reading hw-refusal">{live.message}</p>
          )}
          <p className="hw-dev__reading">
            {layout.id === "live" ? (
              <>
                <strong>Your city</strong>, as saved in this browser
              </>
            ) : (
              <>
                Encounter {encounter} · <strong>{layout.label}</strong>
              </>
            )}
            : {layout.blurb}
          </p>

          <button
            type="button"
            className="hw-chip"
            onClick={() => reset(encounter + 1, devPrefix)}
          >
            New winter (deals the next city, reseeds the questions)
          </button>
        </section>
      </div>

      {/*
        THE CONCLUDING SCREEN, OUTSIDE THE SHELL, which is the whole of what makes it an event.
        It is a sibling and not a panel in the rail: `.hw-conclusion` is `position: fixed`, so
        being outside the shell's bounded, scrolling box is what lets it be a card over the
        island rather than a card inside a card. See `WinterConclusion.tsx` for why the verdict is
        derived and `hard-winter.css` for why it is anchored to the bottom.

        The shell is still RENDERED at this phase, and in-city it is `display: none` rather than
        unmounted: `renderBoard` is inside it and `WinterBoardBridge` is inside that, and
        unmounting the bridge publishes `null` to the city, which takes the thawed ground, the
        ruins and the scars off the island the conclusion is commenting on.
      */}
      {winter.phase === "ended" && (
        <WinterConclusion
          winter={winter}
          encounter={encounter}
          onRestart={() => reset(encounter + 1, devPrefix)}
          isLiveBoard={layout.id === "live"}
          milestone={milestone}
          scar={scar}
          onCarryBack={() => {
            // AWAITED, so the leave happens after the city has taken the damage rather than
            // beside it: the in-city commit writes the session AND refreshes the surface the
            // player is about to be standing in, and a leave racing that would put them back
            // on an island still drawing an undamaged city.
            void scarLiveCity(winter, layout.id === "live", onCarryDamage).then(
              (result) => {
                setScar(result);
                // Only on a real record: a refusal has a message to read, and leaving would
                // take the player away from the one thing that explains why nothing happened.
                if (result.status === "recorded") {
                  onLeave?.();
                }
              },
            );
          }}
        />
      )}

      {/*
        DEV: RESOLVE A ROUND AT A CHOSEN TIER INSTEAD OF ANSWERING ITS THREE QUESTIONS.

        A SIBLING OUTSIDE THE SHELL, and both halves of that are deliberate. It is fixed to the
        viewport's corner, so being outside the shell's bounded scrolling box is what lets it be a
        corner of the screen rather than a row in the rail — and the rail is the one thing it must
        not spend, because at 1024x580 the in-city band is capped at 290px and the player's own
        commit button is asserted to be inside that fold.

        It gates ITSELF on `isDevPersistenceEnabled`, which is why the mount is one element with no
        condition on it: a gate applied here would be a gate a second mount could forget.
        `WinterDevSkip.tsx` carries the whole argument, including why that is the right existing
        hatch and what proves a learner cannot reach it.

        `pending` is passed because a run-out repeats the declaration in hand, and while declaring
        that lives in this component's state rather than in the engine's. `setWinter` and the
        answer-flow resets are the whole of what it touches.
      */}
      <WinterDevSkip winter={winter} pending={pending} onSkipped={skipQuestions} />
    </>
  );
}

/* ------------------------------------------------------------------ panels */

function WinterLegend(): ReactElement {
  return (
    <ul className="hw-legend" aria-label="Map key">
      <li>
        <span className="hw-swatch hw-cell--depth-0" /> clear ground, shaded by how far it
        is from the shore
      </li>
      <li>
        <span className="hw-swatch hw-cell--frozen hw-cell--line" /> the frost line: the
        only part that will move
      </li>
      <li>
        <span className="hw-swatch hw-cell--warded" /> warm: a fire is holding this
      </li>
      <li>
        <span className="hw-swatch hw-cell--built" /> a building ·{" "}
        <span className="hw-swatch hw-cell--built hw-cell--ruin" /> a ruin (still clickable)
      </li>
      {/*
        The preview is the one provisional state, so its key entry says so in words as well
        as showing the three strokes: nothing on the board is warm yet, and the number is
        the score that would make it so.
      */}
      <li className="hw-legend__preview">
        <span className="hw-swatch hw-cell--preview hw-cell--preview-weak">
          <span className="hw-cell__need">1</span>
        </span>
        <span className="hw-swatch hw-cell--preview hw-cell--preview-steady">
          <span className="hw-cell__need">2</span>
        </span>
        <span className="hw-swatch hw-cell--preview hw-cell--preview-strong">
          <span className="hw-cell__need">3</span>
        </span>{" "}
        <strong>not yet warm</strong>: what a fire here would hold, and how many right
        answers it takes
      </li>
      {/*
        TWO ENTRIES CAME OUT OF THIS KEY ON 2026-08-02 WITH THE ACTION THEY DESCRIBED: "ruined
        ground: given up, no fire can be lit here, and it does not come back in spring", and a
        second provisional state for the ring a pull-back would ruin. A key that names a state no
        board can reach is worse than a shorter key, because a player who cannot find it on the
        island has to work out which of the two of us is wrong.
      */}
    </ul>
  );
}

/**
 * WHAT THE CHOSEN CELL WOULD ACTUALLY BUY, per tier — the panel half of the nested
 * preview, and the half that names the buildings.
 *
 * These are the CLIPPED counts, measured at the cell in hand, which is why the panel
 * exists at all rather than leaving the generic ladder up: a fire on the shore covers
 * fewer cells than the tuning table's figure, and "13 cells" next to a board showing seven
 * would be the surface disagreeing with itself. Where the two differ, both are shown.
 *
 * Read STRONGEST FIRST, so the eye lands on the best case the way it does on the board.
 */
function FirePreviewLadder({
  preview,
  era,
}: {
  readonly preview: WinterFirePreview;
  readonly era: EraId;
}): ReactElement {
  const islandCells = hardWinterIsland(era).cells.length;

  return (
    <div className="hw-preview">
      <p className="hw-preview__title">
        A fire at ({preview.col}, {preview.row}) would hold:
      </p>
      <ul className="hw-ladder hw-ladder--preview" aria-label="What a fire here would hold">
        {[...preview.bands].reverse().map((band) => (
          <li key={band.tier} data-tier={band.tier}>
            <span className="hw-preview__need" aria-hidden="true">
              {correctNeededFor(band.tier)}
            </span>
            <strong>{tierLabel(band.tier)}</strong>: {band.cells} cell
            {band.cells === 1 ? "" : "s"} ({Math.round((band.cells / islandCells) * 100)}%
            of the island
            {band.cells === band.cells_on_open_ground
              ? ""
              : `; the water clips it here, from ${band.cells_on_open_ground} cells inland`}
            ){band.buildings.length === 0 && ", no building"}
            {band.buildings.length > 0 && (
              <>
                , and{" "}
                <strong>
                  {band.buildings.map((nodeId) => placementLabel(nodeId)).join(" + ")}
                </strong>
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="hw-preview__note">
        You can see the ground. You still cannot see the score, and that is the bet.
      </p>
    </div>
  );
}

function DeclarePanel({
  winter,
  view,
  era,
  pending,
  refusal,
  mode,
  onMode,
  onPropose,
  onCommit,
  batchSize,
}: {
  readonly winter: HardWinterState;
  readonly view: HardWinterView;
  readonly era: EraId;
  readonly pending: WinterAction | null;
  readonly refusal: string | null;
  readonly mode: WinterGridMode;
  readonly onMode: (mode: WinterGridMode) => void;
  readonly onPropose: (action: WinterAction) => void;
  readonly onCommit: () => void;
  readonly batchSize: number;
}): ReactElement {
  const preview = view.fire_preview;
  const ladder = ladderFor(pending?.kind ?? mode, era);

  return (
    <section className="hw-panel" aria-labelledby="hw-declare-title">
      <span className="section-index">1</span>
      {/*
        THE LEAD'S OWN LINE, VERBATIM, AND IT IS THE WHOLE PANEL'S OPENING.

        This was a heading — *"Declare, before you know how you will do"* — over three sentences
        saying the action happens either way and the questions decide how far it goes. He replaced
        all four lines himself: *"Choose your action — the better your accuracy, the more effective
        it'll be."* The dash is a comma because this repository writes no em-dashes into
        learner-facing strings, and it stays the `<h2>` because the section is named by it.

        #328 cut the same four lines to two, `"Choose your action, then answer 3 questions"` over
        `"It happens either way. The better you answer, the more it does."`, on the argument that
        two facts are load-bearing: the action is committed BEFORE the questions, and accuracy
        decides HOW MUCH it does rather than WHETHER it happens. That argument is right about the
        mechanics and it is not this line's to settle — the lead wrote one line and asked for one
        line, and both of those facts are still on screen a few pixels below: the commit control
        reads "Commit and face 3 questions", which is the ordering, and the ladder under the cards
        reads out what each tier of accuracy earns, which is the scaling. If he wants "either way"
        back in words, it is one sentence and this comment is where the argument for it is.
      */}
      <h2 id="hw-declare-title">
        Choose your action, the better your accuracy, the more effective it&apos;ll be.
      </h2>

      {/*
        ONE SENTENCE PER CARD, and never with a dash. Each card ran to two, and the second
        was either the accuracy rule (now said once in the paragraph above, for all three
        actions at once) or a restatement of the first. §5 of
        `docs/superpowers/specs/2026-07-30-hard-winter-crisis-art-brief.md` owns everything
        about these cards that needs a designer, and §7 records why the repository's em-dash
        gate has never been able to see a string in this file.
      */}
      <div className="hw-actions">
        <button
          type="button"
          className="hw-action"
          aria-pressed={mode === "fire"}
          onClick={() => onMode(mode === "fire" ? null : "fire")}
        >
          Light a fire
          <small>
            Holds the frost off a patch of ground, and answering well makes it burn longer
            and reach further.
          </small>
        </button>
        <button
          type="button"
          className="hw-action"
          aria-pressed={mode === "reinforce"}
          onClick={() => onMode(mode === "reinforce" ? null : "reinforce")}
        >
          Reinforce a building
          {/*
            THIS ONE SENTENCE SETS THE CRISIS PANEL'S WIDTH, so it is shorter than it was.

            It is the only string in the in-city panel that must not wrap: the other two cards
            are long enough to take two lines at any width the panel could plausibly have, and
            everything else in there is either shorter or reflows. So `winter-in-city.css`'s
            `--hw-side` is this sentence plus the card's own padding plus the panel's chrome,
            and `crisisPanelFitsItsContent.browser.test.tsx` re-measures that every run.

            It was *"Shields one building, and the frost has to get through it first."*, which
            paints at 364.2px in DejaVu Sans — the widest family the `--font-body` stack lands
            on, and the one CI resolves. That needed a 478px panel, and the panel is 470, so it
            wrapped on the runner and took the third action card under the commit control with
            it. Swapping "get through" for "break" is 327.5px, a tenth narrower, which the
            panel holds at 470 and also at the 460 the `50vw` clamp gives at 920x800 — a width
            no cap can raise, and where this sentence had been wrapping unnoticed all along.

            The meaning is unchanged and so is the referent: "it" was the shield before and is
            the shield now, anchored by "first" — the frost has to spend the shield before it
            reaches the building. `ladderFor` says the same thing in the same words about the
            same mechanic and was changed with it.
          */}
          <small>Shields one building, and the frost has to break it first.</small>
        </button>
        {/*
          THERE IS NO MEND CARD, and the omission is a ruling rather than an oversight. A
          fourth action took frost damage back off a building, and the lead ruled it out on
          2026-07-31: it spent a whole round undoing harm while the frost advanced anyway,
          and the same damage is repairable on the island afterwards for material, so it
          traded a turn for something the player could simply buy later. Measured before it
          went, the recovery bill at 0, 1, 2 and 3 right answers was unchanged to the digit
          with it gone, because a shield raised before a bite absorbs the bite outright.

          What that leaves is that damage is answered BEFORE it lands or not at all inside
          the winter, which is what the Reinforce card above is now carrying.
        */}
      </div>

      {mode !== null && pending === null && (
        <p className="hw-prompt-line" aria-live="polite">
          {mode === "fire"
            ? "Now choose a cell on the island. A fire lit just ahead of the frost shelters the ground it is about to reach."
            : "Now choose a building on the island."}
        </p>
      )}

      {refusal && (
        <p className="hw-refusal" role="alert" data-testid="hw-refusal">
          {refusal} Nothing was spent, so choose again.
        </p>
      )}

      {preview !== null ? (
        <FirePreviewLadder preview={preview} era={era} />
      ) : (
        ladder.length > 0 && (
          <ul className="hw-ladder" aria-label="What your answers will earn">
            {ladder.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )
      )}

      <div className="hw-commit">
        <p aria-live="polite">
          {pending ? describeAction(pending) : "Nothing declared yet."}
        </p>
        <button
          type="button"
          className="primary-action"
          disabled={pending === null || !canDeclareWinterAction(winter, pending)}
          onClick={onCommit}
        >
          Commit and face {batchSize} questions
        </button>
      </div>
    </section>
  );
}

/**
 * THE SOLUTION TO THE QUESTION JUST ANSWERED, right or wrong.
 *
 * The crisis draws from lessons the player has already been taught, so a miss means
 * something has decayed and that is the moment an explanation is worth the most. It is owed
 * on a right answer too: showing it only after a miss turns the appearance of feedback into
 * an accusation, and a player who guessed right learns nothing from being told they were.
 *
 * ENTIRELY the lesson surfaces' own machinery. `WorkedSolution` is the component the lesson
 * and the endless drill render, driven by the same three fields off the same `FrozenItem`,
 * so a template that gains an SVG worked solution gains it here for free and there is no
 * second place to keep in step. `revealedAnswerLine` is the drill's own reveal line, moved
 * into `answerFormat.ts` so both surfaces read one implementation rather than two copies.
 *
 * It carries NO correctness state and no hue of its own: the verdict above it says whether
 * the answer was right, and this says what the answer was. Making the solution green on a
 * hit and red on a miss would be a fourth meaning for two colours that already have one.
 */
function QuestionSolution({ frozen }: { readonly frozen: FrozenItem }): ReactElement {
  return (
    <div className="hw-solution">
      {/* A <div> and not a <p>: `LessonProse` renders markdown, so it emits its own
          paragraph and a <p> here would nest one inside another. */}
      <div className="hw-solution__answer lesson-player__prose">
        <LessonProse markdown={revealedAnswerLine(frozen)} />
      </div>
      <WorkedSolution
        templateId={frozen.template_id}
        params={frozen.template_params}
        steps={frozen.worked_solution}
      />
    </div>
  );
}

function BatchPanel({
  batch,
  declared,
  verdicts,
  answer,
  shown,
  unreadable,
  drawnFromEra,
  onAnswer,
  onSubmit,
  onNext,
}: {
  readonly batch: WinterBatchComposition;
  readonly declared: WinterAction | null;
  readonly verdicts: readonly boolean[];
  readonly answer: PracticeAnswerValue;
  readonly shown: boolean | null;
  readonly unreadable: string | null;
  readonly drawnFromEra: boolean;
  readonly onAnswer: (value: PracticeAnswerValue) => void;
  readonly onSubmit: () => void;
  readonly onNext: () => void;
}): ReactElement {
  if (batch.status === "unavailable") {
    return (
      <section className="hw-panel" aria-labelledby="hw-batch-title">
        <span className="section-index">2</span>
        <h2 id="hw-batch-title">No batch to ask</h2>
        <p className="hw-refusal">{batch.message}</p>
      </section>
    );
  }

  const asked = batch.prompts.length;
  const prompt = batch.prompts[verdicts.length];
  const frozen = prompt ? winterFrozenItem(prompt.item_version_id) : undefined;

  return (
    <section className="hw-panel" aria-labelledby="hw-batch-title">
      <span className="section-index">2</span>
      <h2 id="hw-batch-title">{`Question ${verdicts.length + 1} of ${asked}`}</h2>

      {/*
        THE STAKE, AND IT IS THE ONE LINE ABOVE THE QUESTION THAT SURVIVED THE CUT.
        
        It supports no decision, which is the test the rest of this screen was held to, and it
        stays anyway on the principle behind that test: it is not the simulation reporting that
        it works, it is the reason these three questions matter. Without it the phase is three
        arithmetic problems with nothing riding on them, which is the same anticlimax
        D-CRISIS-30 is about arriving one screen earlier.
        
        WHAT WENT is the running tally that sat under it — *"Nothing answered yet. 3 questions
        to come."*, then *"1 of 2 right so far. 1 still to come."* It is a tracker of actions
        taken, which is the lead's own phrase for what he asked to be removed, and it said
        nothing the heading two lines above does not: the action is locked, all three questions
        must be answered, and the score is delivered the moment the round resolves. So there is
        no decision behind it and nothing it tells the player they cannot already read.
      */}
      <p className="hw-declared">
        You declared: <strong>{declared ? describeAction(declared) : "nothing"}</strong>
      </p>

      {/* The one place the era fallback is visible to the player, and it has to be here: the
          advisor told them the questions come from lessons they have already done, and under
          the fallback they do not. Said in the panel that is asking, rather than in a
          docblock. */}
      {drawnFromEra && (
        <p className="hw-note hw-note--draw">
          You have not finished a practice set in this age yet, so the winter is asking
          about all of era one&apos;s lessons rather than only the ones you have done.
          Nothing you answer here is written to your progress either way.
        </p>
      )}

      {prompt && frozen && (
        <>
          {/* NAMED, so the answer field can point at it: `PracticeAnswer` takes `promptId` and
              passes it to the input's `labelledBy`, which is how the lesson surface and the
              endless drill give their field an accessible name. Restored here after two
              independent resolutions of the same conflict disagreed and the other one dropped
              it; the prop is still live in `LessonPractice` and `InfiniteDrill`. */}
          {/* The served item's id, on the element that shows its prompt. The diagnostic's card
              carries the same attribute for the same reason: a suite driving this surface has to
              be able to answer the question ACTUALLY asked. Predicting the batch from the same
              inputs the surface uses is not equivalent — over an authored board the two came
              apart, and the suites only passed through it because an answer for the wrong item
              was banked as a miss whatever the grader made of it. */}
          <div
            id="hw-question-prompt"
            className="hw-question lesson-player__prose"
            data-item-version-id={prompt.item_version_id}
          >
            <LessonProse markdown={frozen.prompt} />
          </div>
          <form
            className="lesson-player__row"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            <PracticeAnswer
              key={prompt.item_version_id}
              frozen={frozen}
              value={answer}
              onChange={onAnswer}
              disabled={shown !== null}
              promptId="hw-question-prompt"
              placeholder={practicePlaceholder(
                frozen.answer.answer_spec,
                frozen.answer.allowed_symbols,
                frozen.answer.answer_key,
              )}
            />
            {/* The Check button goes the moment the answer is graded, which is what keeps
                the solution below feedback rather than a second chance: the field is
                disabled, there is no way to submit again, and the tally already has this
                answer in it. */}
            {shown === null && (
              <button type="submit" disabled={answer === null}>
                Check
              </button>
            )}
          </form>

          <UnreadableAnswerNote note={unreadable} />

          {shown !== null && (
            <>
              <div className="hw-verdict" data-status={shown ? "correct" : "incorrect"}>
                {/* The mark carries the state as a shape as well as a colour, and it is
                    hidden from the reading order because the sentence beside it already
                    says the same thing in words. */}
                <p aria-live="polite">
                  <span className="hw-verdict__mark" aria-hidden="true">
                    {shown ? "\u2713" : "\u2715"}
                  </span>
                  <span className="hw-verdict__word">
                    {shown ? "Right." : "Not right."}
                  </span>
                </p>
              </div>
              <QuestionSolution frozen={frozen} />
              <div className="hw-verdict__go">
                <button type="button" className="primary-action" onClick={onNext}>
                  {verdicts.length + 1 >= asked ? "See what you earned" : "Next question"}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

function ResolvedPanel({
  winter,
  onAdvance,
}: {
  readonly winter: HardWinterState;
  readonly onAdvance: () => void;
}): ReactElement {
  const resolution = winter.last_resolution;

  // The fire this resolution lit, so its size can be reported as the ground it ACTUALLY
  // holds rather than as the tuning table's inland figure. Matched on the round and the
  // cell rather than taken off the end of the list, so it stays right if the state ever
  // stops appending.
  const declared = resolution?.action;
  const lit =
    resolution !== null && declared !== undefined && declared.kind === "fire"
      ? winter.fires.find(
          (fire) =>
            fire.lit_in_round === resolution.round &&
            fire.col === declared.col &&
            fire.row === declared.row,
        )
      : undefined;
  const heldCells = lit ? winterFireWard(winter, lit).length : 0;

  return (
    <section className="hw-panel" aria-labelledby="hw-resolved-title">
      <span className="section-index">3</span>
      {/* The tier's own name ("steady", "weak") used to sit in this heading. It is an
          internal enum: the ladder the player read while declaring is keyed in right
          answers, so the score says everything the name did and nothing extra. */}
      <h2 id="hw-resolved-title">
        {resolution
          ? `${resolution.correct} of ${resolution.asked} right, so this is what you earned`
          : "Done"}
      </h2>

      {resolution && (
        <>
          {/* The acknowledgement, which used to sit on the screen the commit button owned. A
              round can end at none right, and this is the panel that now delivers that, so it
              is the panel that has to say the miss was not a dead end. */}
          {resolution.correct < resolution.asked && (
            <p className="hw-tally">Each question showed you its solution as you went.</p>
          )}
          <p>{describeAction(resolution.action)}.</p>
          <p className="hw-magnitude">
            {resolution.action.kind === "fire"
              ? resolution.magnitude === null
                ? "The fire never catches. It warms nothing."
                : `It holds ${heldCells} cell${heldCells === 1 ? "" : "s"}.`
              : resolution.magnitude === 0
                ? "It does nothing at all."
                : `${resolution.magnitude} point${resolution.magnitude === 1 ? "" : "s"} of shield raised.`}
          </p>
          {resolution.helped.length > 0 && (
            <p>Helped: {resolution.helped.map(placementLabel).join(", ")}.</p>
          )}
        </>
      )}

      <button type="button" className="primary-action" onClick={onAdvance}>
        Let the frost advance
      </button>
    </section>
  );
}

function BuildingPanel({
  winter,
  inspect,
  onClose,
}: {
  readonly winter: HardWinterState;
  readonly inspect: Inspect;
  readonly onClose: () => void;
}): ReactElement | null {
  if (inspect === null) {
    return null;
  }
  const building = winter.buildings.find((b) => b.node_id === inspect.node_id);
  if (!building) {
    return null;
  }
  const lesson = lessonByNode[building.node_id];

  return (
    <section className="hw-panel hw-panel--inspect" aria-labelledby="hw-inspect-title">
      <span className="section-index">{building.node_id}</span>
      <h2 id="hw-inspect-title">{describeBuilding(building, winter.era)}</h2>

      <p>
        {building.rim_depth} cell{building.rim_depth === 1 ? "" : "s"} from the shore ·{" "}
        {building.state === "ruin"
          ? `rebuildable for ${HARD_WINTER.rebuild_cost_per_ruin} ${materialWord(winter.era)}`
          : `${winterDamageBudget(building)} point${winterDamageBudget(building) === 1 ? "" : "s"} left in it, against a ${winterDamageBite(winter.round)}-point bite this round`}
        {building.shield > 0 ? ` · shielded ${building.shield}` : ""}
        {building.state === "standing" && building.damage > 0
          ? ` · frost-damaged ${building.damage} of ${HARD_WINTER.damage.ruin_at}, ${winterMendCost(building.damage)} ${materialWord(winter.era)} to mend`
          : ""}
      </p>

      {/*
        The ruling that a ruin is a state and not a deletion, made visible: the lesson
        behind a burnt-out shell is still reachable, so no learner can lose access to
        teaching by playing an encounter badly.
      */}
      <p className="hw-lesson">
        {lesson ? (
          <>
            Its lesson is still here: <strong>{lesson.title}</strong>
          </>
        ) : (
          <>Its lesson is still to be written.</>
        )}
      </p>

      <button type="button" className="hw-chip" onClick={onClose}>
        Close
      </button>
    </section>
  );
}

/**
 * **A SHIELD THAT BROKE, SAID OUT LOUD.**
 *
 * The island draws a reinforced building as a whole extra object — a storm roof lashed over
 * its own (`city/three/winterShield.ts`) — and draws it BINARY, with no bar and no count, on
 * the ruling that shielded is a yes-or-no on screen. The consequence of that ruling is that a
 * shield running out removes a visible structure from a building in one step, between two
 * frames the player did not ask for. **Silent, that is indistinguishable from a bug**, and the
 * player's next decision depends on knowing which buildings are now bare.
 *
 * It is deliberately not written as a failure. The shield did precisely what it was bought to
 * do: `closeRound` spends it BEFORE the building takes anything, so a shield that reached zero
 * is a bite that never landed. The line says where the player now stands, not that they erred.
 *
 * The shape is the panel's own — a label, a colon, `placementLabel`s joined, and a short
 * consequence — the same shape *"Given up: …"* and *"Helped: …"* already use two panels down.
 * `role="status"` rather than `alert`: it is worth hearing and it is not an interruption.
 *
 * **AND IT DIES WITH THE WINTER, which is the non-persistence ruling reaching the words as well
 * as the geometry.** The line is in the present tense about the round the player is standing in
 * — *it faces this round bare* — and once the winter has ended there is no such round, no shield
 * on any building to have been spent, and nothing left to do about it. A shield that broke on
 * the final round would otherwise leave this notice sitting beside the roll call, reporting a
 * loss of protection against a frost that has stopped.
 *
 * Gated on a passed-in `ended` rather than by clearing the state on the way past, so the rule is
 * visible at the only place that renders it and reads the same way `winterShieldedNodeIds` does
 * one file over — both take the phase and both empty themselves on it.
 */
function SpentShieldNotice({
  spent,
  ended,
}: {
  readonly spent: readonly string[];
  readonly ended: boolean;
}): ReactElement | null {
  if (ended || spent.length === 0) {
    return null;
  }
  return (
    <p className="hw-shield-spent" role="status" data-testid="hw-shield-spent">
      {spent.length === 1 ? "Shield spent" : "Shields spent"}:{" "}
      {spent.map(placementLabel).join(", ")}.{" "}
      {spent.length === 1 ? "It faces this round bare." : "They face this round bare."}
    </p>
  );
}

/**
 * **A BUILDING THE FROST TOOK, ANNOUNCED — because it could be lost with nothing saying so.**
 *
 * The lead, having played it: *"there also needs to be some kind of notification/pop up when a
 * city is forzen so users know."* He means a building. Nothing said so: the model swapped for a
 * ruin between two frames, its floating caption changed, and the only words about it were in a
 * round log the in-city mount hides outright (`winter-in-city.css`). The player's whole score is
 * how many buildings survived, and the moment one stops surviving was silent.
 *
 * ## IT IS LOUDER THAN THE SHIELD NOTICE ABOVE, AND THAT IS THE ONE DELIBERATE DIFFERENCE
 *
 * A spent shield is protection working, and the line above says so quietly and in the frost's
 * own blue. This is the encounter's only irreversible loss — `damage.ruin_at` is 1, so an
 * unabsorbed bite takes a whole building and nothing in the winter takes damage back off — so it
 * takes the crisis's `lost` tone, the same char the badge over the rubble wears, and
 * `role="alert"` rather than `status`: it is an interruption, which is what the ask is for.
 *
 * ## SEVERAL AT ONCE IS THE ORDINARY CASE, NOT THE EDGE
 *
 * At `ruin_at: 1` with the frost crossing the island in three rounds, one bad round reaches a
 * band of the settlement and every unwarded, unshielded building in it goes together — the
 * tuning's own ladder reads 420 / 300 / 240 / 60 across the accuracy bands, which is several
 * buildings' worth of rebuild on the weaker ones. So the plural is not an afterthought: the
 * heading counts, the list names every one of them through `placementLabel`, and
 * `winterFrozenNotice.test.tsx` asserts the several-at-once case rather than only the singular.
 *
 * Read from `winterFrozenThisRound`, which takes the round's own log entry rather than diffing
 * two states — see that function for why the two notices differ there.
 */
function FrozenNotice({
  frozen,
}: {
  readonly frozen: readonly string[];
}): ReactElement | null {
  if (frozen.length === 0) {
    return null;
  }
  return (
    <p className="hw-frozen-notice" role="alert" data-testid="hw-frozen-notice">
      <strong>
        {frozen.length === 1
          ? "A building has frozen"
          : `${frozen.length} buildings have frozen`}
        :
      </strong>{" "}
      {frozen.map(placementLabel).join(", ")}.{" "}
      {frozen.length === 1
        ? "It is lost for the rest of the winter."
        : "They are lost for the rest of the winter."}
    </p>
  );
}

function RoundLog({ winter }: { readonly winter: HardWinterState }): ReactElement | null {
  if (winter.log.length === 0) {
    return null;
  }

  return (
    <section className="hw-panel hw-log" aria-labelledby="hw-log-title">
      <h2 id="hw-log-title">What happened</h2>
      <ol>
        {/* The tier's enum name used to close each line in brackets. It said nothing the
            score did not, and it said it in the engine's vocabulary. */}
        {winter.log.map((entry) => (
          <li key={entry.round}>
            <strong>Round {entry.round}.</strong> {describeAction(entry.resolution.action)}.
            You got {entry.resolution.correct} of {entry.resolution.asked} right. The frost
            took {entry.froze} cell{entry.froze === 1 ? "" : "s"}.
            {entry.ruined.length > 0
              ? ` Lost: ${entry.ruined.map(placementLabel).join(", ")}.`
              : " Nothing was lost."}
          </li>
        ))}
      </ol>
    </section>
  );
}
