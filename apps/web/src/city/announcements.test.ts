import {
  buildCityViewModel,
  CITIZEN_NODE_CAPACITY,
  type CityStormView,
  capacityForNode,
  D1_NEIGHBORHOOD_ID,
  ERA_ONE_CIVIC_TYPES,
  type EraOneCivicTypeId,
} from "@cr/game";
import { describe, expect, it } from "vitest";

import * as announcements from "./announcements";
import {
  buildingSelectionMessage,
  buildMenuMessage,
  CONSTRUCTION_STATE_LABEL,
  cityContributionMessage,
  cityLoadedMessage,
  civicPlacedMessage,
  civicRefusedMessage,
  civicSelectionMessage,
  civicUnaffordableMessage,
  crisisCallMessage,
  interleavedPracticeMessage,
  lessonActionLabel,
  lessonActionMessage,
  lessonEntryMessage,
  lightingMessage,
  lotSelectionMessage,
  MASTERY_LABEL,
  moveCancelMessage,
  moveConfirmMessage,
  moveRotateMessage,
  moveStartMessage,
  moveStepMessage,
  placementCancelMessage,
  placementMoveMessage,
  placementRefusalReason,
  placementRotateMessage,
  placementStartMessage,
  skillCompleteMessage,
  skillPlacedMessage,
  skillSelectionMessage,
  stormActionMessage,
  stormEncounterMessage,
  stormMessage,
  stormResultMessage,
  townHallSelectionMessage,
} from "./announcements";
import { D1_SKILL_IDS } from "./buildingAssets";
import { civicPlacementId } from "./civic";
import { MOCK_NODE_STATES } from "./mockCity";
import { placementLabel, TOWN_HALL_ID, TOWN_HALL_LABEL } from "./townHall";
import type { PlacementRefusal } from "./worldLayout";

const viewModel = buildCityViewModel({ node_states: MOCK_NODE_STATES });

function building(nodeId: string) {
  const found = viewModel.buildings.find((item) => item.node_id === nodeId);
  if (!found) {
    throw new Error(`missing building ${nodeId}`);
  }
  return found;
}

/**
 * The same building as the city's test-out pre-build sees it: Complete at mastery 0
 * with no practice evidence, exactly what `seedFromPlacement` writes for a passed
 * node. Built through the real view model so the derivation is under test too.
 */
const testedOutViewModel = buildCityViewModel({
  node_states: MOCK_NODE_STATES.map((state) => ({
    ...state,
    mastery: 0 as const,
    lesson_stage: "done" as const,
    completion_status: "complete" as const,
    last_practiced_at: null,
  })),
});

function testedOut(nodeId: string) {
  const found = testedOutViewModel.buildings.find((item) => item.node_id === nodeId);
  if (!found) {
    throw new Error(`missing building ${nodeId}`);
  }
  return found;
}

/**
 * Every state the placement/move family can be in: a spot that may be committed, and
 * each reason one can be refused. Enumerated (rather than "valid and invalid") so a new
 * `PlacementRefusal` member has to be added here to type-check, which puts it inside
 * both the id sweep and the copy assertions below.
 */
const REFUSALS: readonly (PlacementRefusal | null)[] = [
  null,
  "bounds",
  "overlap",
  "unreachable",
];

/**
 * EVERY BOUGHT BUILDING THE LEARNER CAN SELECT, as a placement id.
 *
 * SCOPED BY THE BEHAVIOUR, NOT BY THE LANE. The defect is not "civic ids are handled
 * somewhere wrong"; it is that a building the learner has ALREADY PAID FOR gets described
 * by copy written for one that is earned through mastery. So the population is every row
 * of the era's bought catalogue, derived from `ERA_ONE_CIVIC_TYPES` rather than listed
 * here — a fifth row added to the catalogue is swept without anyone remembering to.
 *
 * A sequence number per row, through the real minter, because a placement id carries one
 * (`civic:campfire:2`) and a guard fed hand-written ids would not be testing the strings
 * the app actually holds.
 */
const CIVIC_TYPE_IDS = Object.keys(ERA_ONE_CIVIC_TYPES) as EraOneCivicTypeId[];
const CIVIC_PLACEMENT_IDS = CIVIC_TYPE_IDS.map((type, index) =>
  civicPlacementId(type, index),
);

/** The storm in each of its three phases, so the sweep below covers every branch. */
function stormInPhase(phase: CityStormView["phase"]): CityStormView {
  return { ...viewModel.storm, phase };
}

/**
 * EVERY message this module can speak about one subject, keyed by the exported
 * function that produced it — the corpus the "no raw internal id" sweep runs over.
 *
 * The label-taking placement/move family is fed through `placementLabel`, exactly as
 * `CitySurface` feeds it, since that guard is the reason those messages are safe for
 * the hub. The paths that need a `CityBuildingView` are skill-only and are omitted
 * for the hub: it is not a skill node, has no `student_node_state` row, and never
 * appears in `viewModel.buildings`.
 */
function spokenMessages(id: string): Record<string, readonly string[]> {
  const view = viewModel.buildings.find((item) => item.node_id === id) ?? null;
  const label = placementLabel(id);
  return {
    ...(view
      ? {
          buildingSelectionMessage: [buildingSelectionMessage(view)],
          lotSelectionMessage: [lotSelectionMessage(0, view), lotSelectionMessage(3, null)],
          lessonActionMessage: [lessonActionMessage(view)],
          lessonEntryMessage: [lessonEntryMessage(view)],
          skillCompleteMessage: [skillCompleteMessage(view)],
          // The capacity pair returns null for a building that holds nobody yet, and
          // the nulls are dropped rather than stringified: `"null"` in the corpus would
          // pass every "does not contain" assertion below while proving nothing.
          cityContributionMessage: [
            cityContributionMessage(view),
            cityContributionMessage(testedOut(id)),
          ].filter((line): line is string => line !== null),
        }
      : {}),
    buildMenuMessage: [buildMenuMessage(0), buildMenuMessage(1), buildMenuMessage(4)],
    cityLoadedMessage: [cityLoadedMessage(D1_NEIGHBORHOOD_ID, stormInPhase("ready"))],
    // The BOUGHT half of the catalogue (D-ERA7). Swept for the same leak as everything
    // else here: a purchase names its building through `placementLabel`, exactly like a
    // placement, so it must be as incapable of speaking a raw id.
    civicPlacedMessage: [
      // Both mixes, because the sentence branches on which dials are non-zero and a
      // corpus holding only the blend would never exercise the single-dial clause.
      civicPlacedMessage({
        name: label,
        cost: 80,
        materialLabel: "stone",
        livability: 20,
        happiness: 5,
      }),
      civicPlacedMessage({
        name: label,
        cost: 100,
        materialLabel: "stone",
        livability: 0,
        happiness: 20,
      }),
    ],
    // Only the three real refusals: unlike the placement family, this one is never
    // called for a legal spot — a purchase that is allowed is announced as BUILT, so
    // there is no `null` branch to sweep.
    civicRefusedMessage: REFUSALS.filter(
      (refusal): refusal is Exclude<(typeof REFUSALS)[number], null> => refusal !== null,
    ).map((refusal) => civicRefusedMessage(label, refusal)),
    // Fed REAL placement ids rather than this sweep's subject, because it is the one
    // message that resolves its own catalogue row from the id it is given — handing it
    // `NUM.S` would sweep the fallback branch and never the sentence a learner hears.
    civicSelectionMessage: CIVIC_PLACEMENT_IDS.map(civicSelectionMessage),
    civicUnaffordableMessage: [
      civicUnaffordableMessage({
        name: label,
        cost: 120,
        available: 40,
        materialLabel: "stone",
      }),
    ],
    // Both branches: an era with an advisor and one without, since the advisor clause is
    // dropped rather than blanked for the eight eras that have no named character yet.
    crisisCallMessage: [
      crisisCallMessage("The Hard Winter", "Oru", 3, 6),
      crisisCallMessage("The Hard Winter", null, 5, 9),
    ],
    interleavedPracticeMessage: [interleavedPracticeMessage(3)],
    lightingMessage: [lightingMessage("day"), lightingMessage("colorblind")],
    moveCancelMessage: [moveCancelMessage(label)],
    moveConfirmMessage: [moveConfirmMessage(label)],
    moveRotateMessage: REFUSALS.map((refusal) => moveRotateMessage(label, 1, refusal)),
    moveStartMessage: [moveStartMessage(label)],
    moveStepMessage: REFUSALS.map((refusal) => moveStepMessage(label, refusal)),
    placementCancelMessage: [placementCancelMessage(label)],
    placementMoveMessage: REFUSALS.map((refusal) => placementMoveMessage(label, refusal)),
    placementRotateMessage: REFUSALS.map((refusal) =>
      placementRotateMessage(label, 3, refusal),
    ),
    placementStartMessage: [placementStartMessage(label)],
    skillPlacedMessage: [skillPlacedMessage(id, false), skillPlacedMessage(id, true)],
    skillSelectionMessage: [
      skillSelectionMessage(id, view, view !== null),
      skillSelectionMessage(id, null, false),
    ],
    stormActionMessage: [stormActionMessage(D1_NEIGHBORHOOD_ID)],
    stormEncounterMessage: [stormEncounterMessage(D1_NEIGHBORHOOD_ID)],
    stormMessage: [
      stormMessage(stormInPhase("locked")),
      stormMessage(stormInPhase("ready")),
      stormMessage(stormInPhase("cleared")),
    ],
    stormResultMessage: [
      stormResultMessage(D1_NEIGHBORHOOD_ID, { cleared: false, checkpoint_cleared: false }),
      stormResultMessage(D1_NEIGHBORHOOD_ID, { cleared: true, checkpoint_cleared: false }),
      stormResultMessage(D1_NEIGHBORHOOD_ID, { cleared: true, checkpoint_cleared: true }),
    ],
    townHallSelectionMessage: [
      townHallSelectionMessage(2, 6, true),
      townHallSelectionMessage(0, 6, false),
    ],
  };
}

describe("announcements", () => {
  it("labels every construction state with words, never color alone", () => {
    expect(CONSTRUCTION_STATE_LABEL.gold).toBe("Mastered");
    expect(CONSTRUCTION_STATE_LABEL.unfinished).toBe("Needs finishing");
    expect(CONSTRUCTION_STATE_LABEL.not_started).toBe("Not started");
  });

  it("labels each mastery level per the scoring spec (2 = mastered, 3 = gold)", () => {
    expect(MASTERY_LABEL[0]).toBe("Not started");
    expect(MASTERY_LABEL[1]).toBe("In progress");
    expect(MASTERY_LABEL[2]).toBe("Mastered");
    expect(MASTERY_LABEL[3]).toBe("Gold mastery");
  });

  it("summarizes a selected building without any economy/reward copy", () => {
    // NUM.S is mastered (mastery 3) -> the built variants collapse to the single
    // Complete stage; the gold quality shows as MasteryStars, not the state label.
    const message = buildingSelectionMessage(building("NUM.S"));
    expect(message).toContain("Selected Assembly Hall (Signed numbers), Complete.");
    // The persistent economy is deferred to §8; selection copy never mentions rewards.
    expect(message).not.toContain("Pending rewards");
    expect(message).not.toContain("Materials");
    expect(message).not.toContain("Prestige");
  });

  it("chooses a lesson verb from the construction state", () => {
    expect(lessonActionLabel(building("NUM.S"))).toBe("Review lesson");
    expect(lessonActionLabel(building("NUM.3"))).toBe("Resume lesson");
    expect(lessonActionLabel(building("NUM.5"))).toBe("Start lesson");
  });

  it("says READ, not Review, for a tested-out building's unread lesson (#103)", () => {
    expect(lessonActionLabel(testedOut("NUM.S"))).toBe("Read lesson");
    // The practised Complete building keeps "Review" — that lesson really was read.
    expect(building("NUM.S").tested_out).toBe(false);
    expect(lessonActionLabel(building("NUM.S"))).toBe("Review lesson");
  });

  it("names MASTERED as the storm gate, the word the counter behind it uses (#103)", () => {
    const locked = stormMessage(viewModel.storm);
    // "The storm OPENS once ..." rather than "Storm LOCKED until ...": CAREFUL 11 requires
    // a lock to read as "not yet" rather than as a refusal, and the requirement behind it
    // is unchanged, which is what the second assertion is about.
    expect(locked).toContain("opens once");
    expect(locked).not.toMatch(/locked/i);
    expect(locked).toContain("mastered");
    // It must not deny the "Complete" the roster is simultaneously showing on a
    // tested-out building: the gate is mastery, not construction.
    expect(locked).not.toContain("complete");
    expect(locked).toMatch(/mastery stars/);
  });

  it("keeps the selection summary free of unearned practice claims (#103)", () => {
    // A tested-out building answered zero items, so nothing may read as a score.
    const message = buildingSelectionMessage(testedOut("NUM.S"));
    expect(message).toMatch(/tested out/i);
    expect(message).not.toMatch(/4 of 5 correct\.$/);
    // The practised, mastered building still reports its real performance.
    expect(buildingSelectionMessage(building("NUM.S"))).toContain("4 of 5 correct");

    // `skillSelectionMessage` is the one of the three that CitySurface actually
    // speaks (`:979`), so assert the live ARIA path too — and that neither the
    // progress phrase nor the subject repeats the internal node id (#138 fixed the
    // first; this pass fixed the second).
    const spoken = skillSelectionMessage("NUM.F", testedOut("NUM.F"), true);
    expect(spoken).toContain("Complete. Tested out on the diagnostic");
    expect(spoken).not.toMatch(/NUM\.F/);
  });

  it("announces the checkpoint-only storm outcome (no Prestige/economy copy)", () => {
    const cleared = stormResultMessage("D1", { cleared: true, checkpoint_cleared: true });
    expect(cleared).toContain(
      "Storm cleared for the Real Numbers & Arithmetic neighborhood",
    );
    expect(cleared).not.toMatch(/prestige/i);

    // The miss line leads with the state of the storm rather than with the learner's
    // failure, and it no longer negates a loss that never existed ("No loss").
    const failed = stormResultMessage("D1", { cleared: false, checkpoint_cleared: false });
    expect(failed).toContain("still standing");
    expect(failed).not.toMatch(/not cleared|no loss/i);
    expect(failed).toMatch(/whenever you are ready/);
  });

  it("guides a relocation from start through nudge, rotate, confirm, and cancel", () => {
    // Start: names the building, the controls, and that Escape snaps it back.
    const start = moveStartMessage("Assembly Hall");
    expect(start).toContain("Moving Assembly Hall");
    expect(start).toMatch(/arrow keys/i);
    expect(start).toMatch(/R to rotate/i);
    expect(start).toMatch(/snap it back/i);

    // Nudge/drag: validity is spoken (never color alone), and the refused branch says
    // what the building NEEDS while retaining the typed placement reason.
    expect(moveStepMessage("Assembly Hall", null)).toContain("valid spot");
    expect(moveStepMessage("Assembly Hall", "overlap")).toMatch(/needs open ground/i);
    expect(moveStepMessage("Assembly Hall", "overlap")).not.toMatch(/blocked/i);

    // Rotate: reads the new facing plus validity.
    expect(moveRotateMessage("Assembly Hall", 1, null)).toContain("90 degrees");
    expect(moveRotateMessage("Assembly Hall", 1, "overlap")).toMatch(/needs open ground/i);
    expect(moveRotateMessage("Assembly Hall", 1, "overlap")).not.toMatch(/blocked/i);

    // Confirm: reassures the move was purely spatial (mastery/progress unchanged).
    const confirmed = moveConfirmMessage("Assembly Hall");
    expect(confirmed).toContain("Moved Assembly Hall");
    expect(confirmed).toMatch(/unchanged/i);

    // Cancel: makes the "returned to its old spot" outcome explicit.
    expect(moveCancelMessage("Assembly Hall")).toMatch(/snapped back/i);
  });

  it("says a building could not be REACHED, distinctly from off-island/overlap", () => {
    // The canvas is `aria-hidden`, so a rose ghost tells a screen-reader user nothing:
    // this live-region copy is the whole of their feedback. A refusal that reused the
    // "off the island or overlapping" sentence would be actively misleading — the spot
    // is neither — and "blocked" alone over plainly empty ground reads as a broken input.
    const reachability = placementRefusalReason("unreachable");
    expect(reachability).toMatch(/needs an open approach/i);
    expect(reachability).toMatch(/wall a building in|reach/i);
    // It says what to DO about it, since the player cannot see the flood fill.
    expect(reachability).toMatch(/leave a gap|open ground/i);
    // It never names a road: the rule is walkable-touching, not road-touching, and
    // roads are purely cosmetic (INV-COS-1 / D-CIT7).
    expect(reachability).not.toMatch(/road|path|paving|gold/i);

    // The two fitting refusals keep their own sentence, so the three are distinguishable.
    expect(placementRefusalReason("bounds")).toMatch(/needs open ground/i);
    expect(placementRefusalReason("overlap")).toBe(placementRefusalReason("bounds"));
    expect(reachability).not.toBe(placementRefusalReason("bounds"));

    // And every message in the family carries it through, in both modes.
    for (const spoken of [
      placementMoveMessage("Assembly Hall", "unreachable"),
      moveStepMessage("Assembly Hall", "unreachable"),
      placementRotateMessage("Assembly Hall", 1, "unreachable"),
      moveRotateMessage("Assembly Hall", 1, "unreachable"),
    ]) {
      expect(spoken).toContain("Assembly Hall");
      expect(spoken.toLowerCase()).toContain("wall a building in");
    }
  });

  /* ---------------------------------------------------------------------- */
  /* No announcement speaks a raw internal id — the leak PR #138 deferred.     */
  /* ---------------------------------------------------------------------- */

  it("never speaks a raw node id, hub sentinel, or domain id in ANY message", () => {
    for (const id of [...D1_SKILL_IDS, TOWN_HALL_ID]) {
      for (const [fn, messages] of Object.entries(spokenMessages(id))) {
        for (const message of messages) {
          // A `NUM.*` skill id — the eight leaks this issue is about.
          expect(message, `${fn}(${id})`).not.toMatch(/\bNUM\.[A-Z0-9]/);
          // The hub's sentinel, which `buildingName` hands straight back (#112).
          expect(message, `${fn}(${id})`).not.toContain(TOWN_HALL_ID);
          // A bare domain id ("D1"), the storm/loaded family's version of the same.
          expect(message, `${fn}(${id})`).not.toMatch(/\bD\d{1,2}\b/);
          // A civic PLACEMENT id (`civic:campfire:2`) — the same leak one class of
          // building later, and now reachable, since the corpus feeds real ones in.
          expect(message, `${fn}(${id})`).not.toContain("civic:");
        }
      }
    }
  });

  it("sweeps every exported *Message, so a new announcement cannot skip the check", () => {
    // The sweep above is only as good as its corpus. Pinning the corpus to the
    // module's own export list means adding a message function fails HERE until it
    // is swept, rather than quietly shipping the next leak.
    const exported = Object.entries(announcements)
      .filter(([name, value]) => name.endsWith("Message") && typeof value === "function")
      .map(([name]) => name)
      .sort();
    expect(Object.keys(spokenMessages("NUM.S")).sort()).toEqual(exported);
  });

  it("names the building and the skill it teaches, the pair the roster row shows", () => {
    // Placement: the id is gone and the parenthetical it used to duplicate now
    // carries the skill topic. Was "Placed NUM.3 (Workshop)."
    expect(skillPlacedMessage("NUM.3")).toContain(
      "Placed Workshop (Field properties & the distributive law).",
    );
    expect(skillPlacedMessage("NUM.3", true)).toMatch(/^Placed Workshop \(/);

    // Selection, placed and unplaced — the live ARIA path.
    expect(skillSelectionMessage("NUM.4", building("NUM.4"), true)).toContain(
      "Selected Commons (Simplifying & combining like terms), Breaking ground.",
    );
    expect(skillSelectionMessage("NUM.5", null, false)).toContain(
      "Selected Tower (Ratios, proportions & percents), ready to build.",
    );

    // Lot + panel summaries.
    expect(lotSelectionMessage(2, building("NUM.2"))).toContain(
      "Selected Lot 3: Dwellings (Order of operations), Complete.",
    );
    expect(buildingSelectionMessage(building("NUM.F"))).toContain(
      "Selected Store (Fractions), Complete.",
    );

    // The lesson pair names the building alone: the card they narrate is titled with
    // it, and the selection line before them has already named the skill.
    expect(lessonActionMessage(building("NUM.3"))).toBe("Resume lesson for Workshop.");
    expect(lessonEntryMessage(building("NUM.3"))).toContain(
      "Entered the Workshop lesson stand-in.",
    );

    // Completion names both, because the SKILL is what was completed and the
    // BUILDING is what got built — one bare id used to stand for both.
    const done = skillCompleteMessage(building("NUM.S"));
    expect(done).toContain("Signed numbers complete!");
    expect(done).toContain("Its building, Assembly Hall, is built.");
    // It must NOT promise a cosmetic. Finishing a skill pays XP and gold; cosmetics are
    // bought with that gold in the Shop. This line is the accessible path, so the old
    // "A cosmetic reward is on the way." told a screen-reader user the one wrong thing
    // that the visible HUD never said.
    expect(done).not.toMatch(/cosmetic/i);
  });

  it("guards the hub sentinel in the messages that take a bare id (#132's shape)", () => {
    // `buildingName` cannot resolve the hall and returns the sentinel, so any message
    // naming a possibly-hub id goes through `placementLabel`. `confirmPlacement`'s
    // active ghost really can be the hub, which is how PR #132's leak happened.
    expect(skillPlacedMessage(TOWN_HALL_ID)).toContain(`Placed ${TOWN_HALL_LABEL}.`);
    expect(skillSelectionMessage(TOWN_HALL_ID, null, false)).toContain(
      `Selected ${TOWN_HALL_LABEL}, ready to build`,
    );
    // No skill topic is invented for it: the hub is not a skill node.
    expect(skillPlacedMessage(TOWN_HALL_ID)).not.toContain("(");
  });

  it("never tells a learner to build a civic building they have already bought", () => {
    // THE FLOOR. Containment and absence both hold trivially over nothing, so an era
    // whose catalogue emptied — or a derivation that quietly stopped matching it —
    // would satisfy every assertion below while measuring no building at all.
    expect(
      CIVIC_PLACEMENT_IDS.length,
      "era one's bought catalogue is non-empty",
    ).toBeGreaterThanOrEqual(4);
    expect(new Set(CIVIC_PLACEMENT_IDS).size).toBe(CIVIC_PLACEMENT_IDS.length);

    for (const [index, nodeId] of CIVIC_PLACEMENT_IDS.entries()) {
      const row = ERA_ONE_CIVIC_TYPES[CIVIC_TYPE_IDS[index] as EraOneCivicTypeId];
      // EXACTLY THE CALL THE 3D CLICK MAKES. Clicking a placement in the scene routes
      // through `CitySurface`'s `selectSkill`, which reads `buildingByNode` (skills
      // only, so `null` here) and `placedNodeIds` (`load.placements`, which holds
      // skills — `load.civic` is a separate list, so `false` here).
      const spoken = skillSelectionMessage(nodeId, null, false);

      // The false half: it is bought, paid for, and standing.
      expect(spoken, nodeId).not.toMatch(/not built yet/i);
      expect(spoken, nodeId).not.toMatch(/choose build/i);
      // The true half, so that suppressing the sentence is not on its own enough — a
      // selection must still NAME what was clicked and say what the purchase bought,
      // which is the only per-building place those two capacities are ever spoken.
      expect(spoken, nodeId).toContain(placementLabel(nodeId));
      if (row.livability > 0) {
        expect(spoken, nodeId).toContain(`${row.livability} more people sustained`);
      }
      if (row.happiness > 0) {
        expect(spoken, nodeId).toContain(`${row.happiness} Happiness`);
      }
    }

    // THE POSITIVE SIDE, in the same test so it cannot be deleted on its own. A guard
    // that only forbids the sentence would pass over an app that had stopped inviting
    // anyone to build anything, which is the same defect pointed the other way.
    expect(
      D1_SKILL_IDS.length,
      "the island still has skill buildings to place",
    ).toBeGreaterThanOrEqual(6);
    expect(D1_SKILL_IDS.filter((id) => CIVIC_PLACEMENT_IDS.includes(id))).toEqual([]);
    for (const nodeId of D1_SKILL_IDS) {
      const spoken = skillSelectionMessage(nodeId, null, false);
      expect(spoken, nodeId).toContain("ready to build");
      expect(spoken, nodeId).not.toMatch(/not built yet/i);
      expect(spoken, nodeId).toContain("Choose Build to place it on the island.");
    }
  });

  it("speaks the neighborhood's name, not its domain id, in the storm + load lines", () => {
    expect(stormEncounterMessage("D1")).toContain(
      "Storm encounter for the Real Numbers & Arithmetic neighborhood.",
    );
    expect(stormActionMessage("D1")).toBe(
      "Storm attempt started for the Real Numbers & Arithmetic neighborhood.",
    );
    expect(cityLoadedMessage("D1", stormInPhase("locked"))).toContain(
      "Real Numbers & Arithmetic neighborhood loaded.",
    );
    // The load line still carries the storm's standing (the fold-in kept it whole).
    expect(cityLoadedMessage("D1", stormInPhase("locked"))).toContain("opens once");
    // An unmapped id degrades to itself rather than blanking the sentence.
    expect(stormActionMessage("D99")).toContain("the D99 neighborhood");
  });

  it("names skills, not the island's registry key, when every skill is placed", () => {
    // Was "Every D1 skill is already placed."
    expect(buildMenuMessage(0)).toBe(
      "Build menu open. Every skill on this island is already placed.",
    );
    expect(buildMenuMessage(1)).toContain("1 skill ready to construct");
  });
});

/* -------------------------------------------------------------------------- */
/* What a skill building gives the city (BUILD 5).                             */
/* -------------------------------------------------------------------------- */

/**
 * THE POPULATION IS THE TUNING TABLE, split by BEHAVIOUR rather than by anything about
 * how the copy is written.
 *
 * Two claims live in these tests and they belong to two different sets of buildings, so
 * naming one population and filtering it per test would be the wrong shape: the set that
 * owes a *"Homes for N"* clause is the set with homes, and the set that owes the
 * forward-looking *"and M at mastery"* half is the set whose homes RISE. Those coincide
 * in era one and there is no reason they must — a node authored with `residence_built`
 * equal to `residence_mastered` would owe the first and not the second — so they are
 * derived separately, off `CITIZEN_NODE_CAPACITY` itself.
 *
 * All three are floored, because a table that had lost its entries would satisfy every
 * per-member assertion below by having no members, and the sets are asserted for
 * COMPOSITION as well as size: a floor constrains how many, and what these tests are
 * about is which.
 */
const CAPACITY_ENTRIES = Object.entries(CITIZEN_NODE_CAPACITY);

/** Nodes with homes at all: these owe a residence clause once they hold somebody. */
const HOUSES_SOMEBODY = CAPACITY_ENTRIES.filter(
  ([, capacity]) => capacity.residence_mastered > 0,
).map(([nodeId]) => nodeId);

/** Nodes whose homes RISE at mastery: these, and only these, owe the "at mastery" half. */
const RISES_AT_MASTERY = CAPACITY_ENTRIES.filter(
  ([, capacity]) => capacity.residence_mastered > capacity.residence_built,
).map(([nodeId]) => nodeId);

/** Nodes with daytime seats and no homes: a seats clause, and never a homes clause. */
const DAYTIME_ONLY = CAPACITY_ENTRIES.filter(
  ([, capacity]) => capacity.residence_mastered === 0 && capacity.daytime > 0,
).map(([nodeId]) => nodeId);

/** The same building, mastered, so the mastered branch is reachable for every node. */
const masteredViewModel = buildCityViewModel({
  node_states: MOCK_NODE_STATES.map((state) => ({
    ...state,
    mastery: 2 as const,
    lesson_stage: "done" as const,
    completion_status: "complete" as const,
    last_practiced_at: "2026-07-01T12:00:00.000Z",
  })),
});

function mastered(nodeId: string) {
  const found = masteredViewModel.buildings.find((item) => item.node_id === nodeId);
  if (!found) {
    throw new Error(`missing building ${nodeId}`);
  }
  return found;
}

describe("what a skill building gives the city", () => {
  it("has a table to read, split into the two sets these tests are about", () => {
    // THE FLOORS, and the composition beside each of them.
    expect(CAPACITY_ENTRIES.length, "the capacity table is empty").toBeGreaterThanOrEqual(
      6,
    );
    expect(HOUSES_SOMEBODY.length).toBeGreaterThanOrEqual(4);
    expect(RISES_AT_MASTERY.length).toBeGreaterThanOrEqual(4);
    expect(DAYTIME_ONLY.length).toBeGreaterThanOrEqual(2);
    // And the two sets partition the table, so no node is outside both and none is in
    // both: a node with homes that do not rise would sit in the first alone and is what
    // the separate derivations above exist for.
    for (const nodeId of DAYTIME_ONLY) {
      expect(HOUSES_SOMEBODY, nodeId).not.toContain(nodeId);
      expect(RISES_AT_MASTERY, nodeId).not.toContain(nodeId);
    }
    expect(new Set([...HOUSES_SOMEBODY, ...DAYTIME_ONLY]).size).toBe(
      CAPACITY_ENTRIES.length,
    );
  });

  it("states the Dwellings' 10-to-26 jump, in the table's own figures", () => {
    // The headline number in the game, and the one thing nothing in the product said.
    // Read off the table rather than typed, so a retune moves this assertion with it.
    const dwellings = capacityForNode("NUM.2");
    expect(dwellings.residence_built).toBeGreaterThan(0);
    expect(dwellings.residence_mastered).toBeGreaterThan(dwellings.residence_built);

    const built = cityContributionMessage(building("NUM.2"));
    expect(built).toBe(
      `Homes for ${dwellings.residence_built} of your people, and ${dwellings.residence_mastered} at mastery.`,
    );
    // Mastered, the forward-looking half is gone rather than repeated as a total.
    expect(cityContributionMessage(mastered("NUM.2"))).toBe(
      `Homes for ${dwellings.residence_mastered} of your people.`,
    );
  });

  it("says nothing about a building that holds nobody yet", () => {
    // A TESTED-OUT building reads Complete on every surface at mastery 0 and contributes
    // zero to the roster, so a line here would be false on the one path that looks most
    // like success. The construction state is the thing that says "built"; the view's own
    // `complete` is the mastery bar and is false here, which is why the check inside
    // `cityContributionMessage` reads BOTH.
    for (const nodeId of HOUSES_SOMEBODY) {
      expect(testedOut(nodeId).construction_state, nodeId).toBe("complete");
      expect(testedOut(nodeId).tested_out, nodeId).toBe(true);
      expect(cityContributionMessage(testedOut(nodeId)), nodeId).toBeNull();
    }
    // And so does a building still under construction or on its foundation.
    expect(cityContributionMessage(building("NUM.3"))).toBeNull();
    expect(cityContributionMessage(building("NUM.4"))).toBeNull();
    expect(cityContributionMessage(building("NUM.5"))).toBeNull();
  });

  it("gives every authored node a line once it holds somebody, and invents none", () => {
    // The coverage claim, over the table's own membership: the point of item 1 is that
    // ONE sentence covers all six era-one buildings because they read one table.
    for (const nodeId of HOUSES_SOMEBODY) {
      expect(cityContributionMessage(mastered(nodeId)), nodeId).toMatch(/^Homes for \d+ /);
    }
    for (const nodeId of DAYTIME_ONLY) {
      const line = cityContributionMessage(mastered(nodeId));
      expect(line, nodeId).toMatch(/^Room for \d+ of your people here by day\.$/);
      // No homes clause for a node with no homes: "Homes for 0" is the shape a
      // template would produce and it is exactly wrong.
      expect(line, nodeId).not.toMatch(/Homes for/);
    }
    // An id the table does not carry — the island hub, and anything unauthored — gets
    // no sentence rather than a sentence about zeros.
    expect(capacityForNode(TOWN_HALL_ID).residence_mastered).toBe(0);
    expect(
      cityContributionMessage({ ...mastered("NUM.2"), node_id: "NOT.AUTHORED" }),
    ).toBeNull();
  });

  it("is informational and never a reward (BUILD 5), across every branch", () => {
    const lines = [
      ...CAPACITY_ENTRIES.map(([nodeId]) => cityContributionMessage(mastered(nodeId))),
      ...CAPACITY_ENTRIES.map(([nodeId]) => cityContributionMessage(building(nodeId))),
      ...CAPACITY_ENTRIES.map(([nodeId]) => skillCompleteMessage(mastered(nodeId))),
    ].filter((line): line is string => line !== null);
    // The floor: an empty corpus would pass every prohibition below.
    expect(lines.length).toBeGreaterThanOrEqual(8);
    for (const line of lines) {
      // No delta, no currency, no second score to chase.
      expect(line, line).not.toMatch(/[+]\d/);
      expect(line, line).not.toMatch(
        /\b(earn|earned|reward|rewarded|bonus|points?|score|xp|gold|capacity)\b/i,
      );
      // No em-dash or en-dash: colon or restructure.
      expect(line, line).not.toMatch(/[\u2014\u2013]/);
      // MASTERY is the only lever named, which is the one unifying signal (BUILD 2).
      expect(line, line).not.toMatch(/\b(level|tier|rank|streak)\b/i);
    }
  });

  it("folds the contribution into the completion announcement", () => {
    // The announcement is the more valuable half: it is the only place the gain is felt
    // as an event rather than found by clicking. And the beat it rides is already the
    // MASTERY crossing, because `CityBuildingView.complete` is `mastery >= 2` — which is
    // exactly the tick the residence figure jumps on.
    expect(mastered("NUM.2").complete).toBe(true);
    expect(
      building("NUM.2").complete,
      "the below-bar building already reads complete",
    ).toBe(false);

    const done = skillCompleteMessage(mastered("NUM.2"));
    expect(done).toContain("Its building, Dwellings, is built.");
    expect(done).toContain(
      `Homes for ${capacityForNode("NUM.2").residence_mastered} of your people.`,
    );
    // A tested-out completion has no clause to fold, and does not gain an empty one.
    const testedOutDone = skillCompleteMessage(testedOut("NUM.2"));
    expect(testedOutDone).toBe(
      "Order of operations complete! Its building, Dwellings, is built.",
    );
    expect(testedOutDone).not.toMatch(/\s{2}|\s$/);
  });

  it("carries the 'at mastery' half for exactly the nodes whose homes rise", () => {
    // Scoped by the BEHAVIOUR: a building whose homes do not move at mastery must not be
    // told they will, and a building whose homes DO move must be. Below the bar the
    // callout is the only surface a learner can read it on, which is what the line on the
    // callout is for.
    for (const nodeId of RISES_AT_MASTERY) {
      const capacity = capacityForNode(nodeId);
      const belowBar = cityContributionMessage({
        ...mastered(nodeId),
        // The below-bar finish: complete in construction, one scored set of mastery.
        construction_state: "complete",
        mastery: 1,
      });
      // `toContain` rather than `toBe`: three of the four also have daytime seats, and
      // that clause is a separate sentence with its own coverage above.
      expect(belowBar, nodeId).toContain(
        `Homes for ${capacity.residence_built} of your people, and ${capacity.residence_mastered} at mastery.`,
      );
      // Mastered, the promise is gone rather than restated.
      expect(cityContributionMessage(mastered(nodeId)), nodeId).not.toMatch(/at mastery/);
    }
    for (const nodeId of DAYTIME_ONLY) {
      expect(cityContributionMessage(mastered(nodeId)), nodeId).not.toMatch(/at mastery/);
    }
  });
});
