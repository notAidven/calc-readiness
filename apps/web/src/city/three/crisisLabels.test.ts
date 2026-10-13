import {
  createHardWinter,
  type HardWinterState,
  hardWinterIsland,
  hardWinterView,
  type WinterBuilding,
  winterCellKey,
} from "@cr/game";
import { describe, expect, it } from "vitest";

import {
  winterShieldedNodeIds,
  winterThreatenedNodeIds,
} from "../../winter/buildingThreat";
import { CURRENT_ERA_ID } from "../eraDressing";
import { TOWN_HALL_ID } from "../townHall";
import { crisisDressing } from "./CityScene";
import { CRISIS_STATUSES } from "./CrisisStatusMarker";
import {
  CRISIS_LABEL_STATES,
  CRISIS_LABEL_TEXT,
  type CrisisLabelState,
  crisisLabelState,
  skillLabelTargets,
} from "./SkillLabels";

/**
 * **A BUILDING'S FLOATING LABEL IS ITS CRISIS STATUS, AND THE STATUSES ARE THE ENGINE'S.**
 *
 * The lead: *"during the crisis, instead of the name of the building (e.g signed numbers) should
 * be replaced by status: e.g shielded, in danger (freezes on next turn without protection), or
 * frozen."*
 *
 * The half of that a guard can get wrong is the SET. A hand-written list of three would go on
 * looking right while the engine grew a fourth state nothing captioned, or while one of the three
 * became unreachable and the label went on promising a picture no board can produce. So the
 * population is asserted from both ends:
 *
 *  - **downward**, against `CRISIS_STATUSES` — the crisis's own published vocabulary — so a
 *    status the model can badge always has a word here. The `satisfies` in `SkillLabels.tsx`
 *    already makes the missing direction a compile error; this is the runtime half, plus the two
 *    additions named and justified rather than assumed;
 *  - **upward**, by census over a REAL PLAYED BOARD: every state this table spells is reached by
 *    some building at some point in a three-round winter, and every building at every point is
 *    given exactly one of them.
 *
 * And the label is held against `crisisDressing`, because the caption and the badge are two
 * readings of one board and a building badged `lost` captioned SHIELDED is the one failure that
 * would be worse than no caption at all.
 */

const CITY = [
  { node_id: "NUM.S", col: -4, row: -3 },
  { node_id: "NUM.F", col: 2, row: 3 },
  { node_id: "NUM.2", col: 4, row: -1 },
  { node_id: "NUM.3", col: -3, row: 2 },
  { node_id: "NUM.4", col: 1, row: -4 },
  { node_id: "NUM.5", col: -1, row: 0 },
];

const PLACED = CITY.map((b) => ({ nodeId: b.node_id, col: b.col, row: b.row, rot: 0 }));

/** The three sets the label reads, off one state, exactly as `CityScene` derives them. */
function boardOf(state: HardWinterState): {
  ruinedNodeIds: ReadonlySet<string>;
  shieldedNodeIds: ReadonlySet<string>;
  threatenedNodeIds: ReadonlySet<string>;
} {
  const rows = hardWinterView(state).rows;
  return {
    ruinedNodeIds: new Set(
      state.buildings.filter((b) => b.state === "ruin").map((b) => b.node_id),
    ),
    shieldedNodeIds: winterShieldedNodeIds(state.buildings, state.phase === "ended"),
    threatenedNodeIds: winterThreatenedNodeIds(rows),
  };
}

/**
 * Where the hall stands on the boards that include it, and it is a real cell of era one's island:
 * `createHardWinter` refuses a placement it has no rim depth for, which is what keeps this honest.
 */
const HALL = { node_id: TOWN_HALL_ID, col: 0, row: -1 };

/**
 * A winter with the frost `bands` deep, some buildings shielded and some already lost.
 *
 * `on` is the board the winter is fought over, and it defaults to the six skill buildings. The hall
 * is passed in explicitly by the one test that is about it, because the census above counts
 * `CITY.length` and a hall smuggled into every fixture would move a number that means something.
 */
function played(
  bands: number,
  shield: readonly string[],
  ruin: readonly string[],
  on: readonly { node_id: string; col: number; row: number }[] = CITY,
) {
  const island = hardWinterIsland(CURRENT_ERA_ID);
  const base = createHardWinter({ era: CURRENT_ERA_ID, buildings: on });
  const buildings: WinterBuilding[] = base.buildings.map((b) => ({
    ...b,
    shield: shield.includes(b.node_id) ? 2 : 0,
    state: ruin.includes(b.node_id) ? ("ruin" as const) : b.state,
  }));
  return {
    ...base,
    round: 2,
    frozen: island.cells.filter((key) => (island.rim_depth.get(key) as number) < bands),
    buildings,
  };
}

describe("the crisis label's set is the engine's", () => {
  it("spells every status the crisis can badge, and names its two additions", () => {
    for (const status of CRISIS_STATUSES) {
      expect(
        CRISIS_LABEL_STATES,
        `the crisis badges "${status}" and no label spells it`,
      ).toContain(status);
    }
    // BOTH DIRECTIONS. The extra two are declared here with the reasons `SkillLabels.tsx` gives,
    // so a third addition cannot arrive unexplained and one that is dropped fails.
    const beyondTheBadges = CRISIS_LABEL_STATES.filter(
      (state) => !(CRISIS_STATUSES as readonly string[]).includes(state),
    ).sort();
    expect(beyondTheBadges).toEqual(["safe", "shielded"]);
    // ...and every one of them says something. A blank caption is the failure a word table can
    // have without any of the set claims noticing.
    for (const state of CRISIS_LABEL_STATES) {
      const word = CRISIS_LABEL_TEXT[state];
      expect(word.trim().length, `${state} has no word`).toBeGreaterThan(2);
      expect(word, `${state} is not shouted`).toBe(word.toUpperCase());
      // Short enough to read at the shipped camera: the label caps at 124px and a status is
      // drawn `white-space:nowrap`, so a long one would run out of its own box.
      expect(word.length, `${state} is too long to read over a building`).toBeLessThan(12);
    }
    // The lead's own three, by name, because they are the instance and not the class.
    expect(CRISIS_LABEL_TEXT.shielded).toBe("SHIELDED");
    expect(CRISIS_LABEL_TEXT.threatened).toBe("IN DANGER");
    expect(CRISIS_LABEL_TEXT.lost).toBe("FROZEN");
  });

  it("reaches every state it spells, over a played winter, and never two at once", () => {
    // Four boards across a three-round winter: nothing taken, the front at the rim, the front
    // through the settlement, and a board with losses on it. Read off `hardWinterView` rather
    // than hand-written, so the states are ones the model produces.
    const boards = [
      played(0, [], []),
      played(1, ["NUM.2"], []),
      played(3, ["NUM.S"], []),
      played(4, ["NUM.3"], ["NUM.F", "NUM.4"]),
    ];
    const seen = new Set<CrisisLabelState>();
    let labelled = 0;
    for (const state of boards) {
      const board = boardOf(state);
      for (const building of CITY) {
        const label = crisisLabelState(building.node_id, board);
        seen.add(label);
        labelled += 1;
        // Exactly one, which is what an ordered resolution buys and what a set of independent
        // flags could not: the sets genuinely overlap (a shielded building in the front's path
        // is in `threatenedNodeIds` too).
        expect(CRISIS_LABEL_STATES).toContain(label);
      }
    }
    // A floor, so the census cannot pass over an empty walk.
    expect(labelled).toBe(boards.length * CITY.length);
    expect(
      [...seen].sort(),
      "a state is spelled that no board in a three-round winter reaches",
    ).toEqual([...CRISIS_LABEL_STATES].sort());
  });

  it("never contradicts the badge over the same building", () => {
    const state = played(4, ["NUM.3", "NUM.F"], ["NUM.F", "NUM.4"]);
    const board = boardOf(state);
    let checked = 0;
    for (const building of CITY) {
      const label = crisisLabelState(building.node_id, board);
      const dressing = crisisDressing(building.node_id, {
        winter: true,
        ruinedNodeIds: board.ruinedNodeIds,
        shieldedNodeIds: board.shieldedNodeIds,
        reinforceCandidates: new Set<string>(),
        crisisThreatenedNodeIds: board.threatenedNodeIds,
      });
      checked += 1;
      // A RUIN IS A RUIN ON BOTH SURFACES. `NUM.F` is deliberately shielded AND ruined on this
      // fixture, which is the state that would let a caption say SHIELDED over rubble.
      if (dressing.status === "lost") {
        expect(label, `${building.node_id} is badged lost and captioned ${label}`).toBe(
          "lost",
        );
      }
      if (label === "lost") {
        expect(dressing.status).toBe("lost");
      }
      // ...and a caption may never claim protection over rubble. The dressing has no shield
      // field to check any more — the storm roof was scrapped on 2026-08-03 and this caption is
      // what replaced it — so the claim is the one that is left: SHIELDED is never said over a
      // building the board reports as lost.
      if (label === "shielded") {
        expect(dressing.status, `${building.node_id} is captioned SHIELDED`).not.toBe(
          "lost",
        );
      }
    }
    expect(checked).toBe(CITY.length);
    // The fixture is only worth anything if it reached the contradiction it is built to catch.
    expect(board.ruinedNodeIds.has("NUM.F")).toBe(true);
    expect(state.buildings.find((b) => b.node_id === "NUM.F")?.shield).toBeGreaterThan(0);
  });

  /**
   * **AND THE BADGE POPULATION, WHICH LOST ITS GUARD WHEN THE STORM ROOF WENT.**
   *
   * `winterShield.test.ts` swept `crisisDressing` over every combination of the four board
   * conditions and pinned two things: the statuses the badge can draw, and that a STANDING,
   * UNTHREATENED building is badged with nothing. That file was almost entirely the roof's geometry
   * and was deleted with it on 2026-08-03 — but this claim is about `CrisisStatusMarker` and not
   * about the roof, and it is the whole of the lead's 2026-08-01 ruling: a badge on every building
   * spends the one channel above a roofline saying *nothing is happening here*, and an unthreatened
   * building keeps its mastery stars through the winter because `crisisDressing` hands `null` up.
   *
   * So it is swept here, where the caption is already held against the badge, rather than left to
   * the next reader to notice was gone. The combinations are the real sixteen, not a sample.
   */
  it("badges nothing over a standing, unthreatened building, over every board", () => {
    const ID = "NUM.S";
    const flags = [false, true];
    let swept = 0;
    const badged = new Set<string>();
    for (const ruined of flags) {
      for (const shielded of flags) {
        for (const candidate of flags) {
          for (const threatened of flags) {
            const dressing = crisisDressing(ID, {
              winter: true,
              ruinedNodeIds: new Set(ruined ? [ID] : []),
              shieldedNodeIds: new Set(shielded ? [ID] : []),
              reinforceCandidates: new Set(candidate ? [ID] : []),
              crisisThreatenedNodeIds: new Set(threatened ? [ID] : []),
            });
            swept += 1;
            badged.add(String(dressing.status));
            if (!ruined && !threatened) {
              expect(
                dressing.status,
                `standing and unthreatened, but badged ${dressing.status} ` +
                  `(shielded=${shielded}, candidate=${candidate})`,
              ).toBeNull();
            } else {
              expect(
                dressing.status,
                "something happened and nothing is badged",
              ).not.toBeNull();
            }
          }
        }
      }
    }
    // FLOORS, so the sweep cannot pass by having walked nothing, and a COMPOSITION assertion, so it
    // cannot pass by producing one answer for all sixteen boards.
    expect(swept).toBe(flags.length ** 4);
    expect([...badged].sort()).toEqual(["lost", "null", "threatened"]);
    // And the badge vocabulary is the marker's own, so a status added there without a rung here
    // fails rather than being drawn by nothing.
    expect([...badged].filter((s) => s !== "null").sort()).toEqual(
      [...CRISIS_STATUSES].sort(),
    );
    // Outside a winter, nothing at all — whatever the sets say.
    expect(
      crisisDressing(ID, {
        winter: false,
        ruinedNodeIds: new Set([ID]),
        shieldedNodeIds: new Set([ID]),
        reinforceCandidates: new Set([ID]),
        crisisThreatenedNodeIds: new Set([ID]),
      }).status,
    ).toBeNull();
  });
});

describe("the label the player reads", () => {
  it("names the skill in the ordinary city and the status during a crisis", () => {
    const fair = skillLabelTargets(PLACED);
    expect(fair.length).toBe(CITY.length);
    for (const target of fair) {
      expect(
        target.status,
        `${target.nodeId} carries a status outside a crisis`,
      ).toBeNull();
    }
    // The instance, not the class: these are the captions in the lead's own frame.
    expect(fair.map((t) => t.text)).toContain("Signed numbers");
    expect(fair.map((t) => t.text)).toContain("Fractions");

    const board = boardOf(played(3, ["NUM.2"], ["NUM.F"]));
    const winter = skillLabelTargets(PLACED, board);
    expect(winter.length).toBe(CITY.length);
    for (const target of winter) {
      expect(target.status, `${target.nodeId} has no status in a crisis`).not.toBeNull();
      expect(
        target.text,
        `${target.nodeId} still reads its skill name during the crisis`,
      ).not.toBe(fair.find((t) => t.nodeId === target.nodeId)?.text);
      expect(Object.values(CRISIS_LABEL_TEXT)).toContain(target.text);
    }
    // And the three the lead named are all on this one board, so the frame he asked for exists.
    const byNode = new Map(winter.map((t) => [t.nodeId, t.text] as const));
    expect(byNode.get("NUM.2")).toBe("SHIELDED");
    expect(byNode.get("NUM.F")).toBe("FROZEN");
    expect(
      [...byNode.values()],
      "no building reads IN DANGER on a board with the front inside the settlement",
    ).toContain("IN DANGER");
  });

  /**
   * **AND THE HUB IS CAPTIONED, WHICH IS THE POPULATION BEING THE BOARD'S RATHER THAN THE GRAPH'S.**
   *
   * The hall teaches no skill, so it earns no skill NAME and `skillLabelTargets` is right to drop it
   * from the ordinary city. A status is a different claim: the live board hands the hall to
   * `createHardWinter` with everything else (`liveCityLayout`'s `includes_hall`), the engine ruins
   * and shields it through the same fields, and the frost takes it on the same terms. So a caption
   * is owed.
   *
   * **THIS IS THE HOLE #470's OVERLAY WAS COVERING, AND IT IS WHY IT IS ASSERTED HERE.** Until
   * 2026-08-03 the hall's shield was said twice — the storm roof on it and #470's `SHIELDED` tag
   * above it, whose population deliberately included the hub for #449's reason. The roof is scrapped
   * and the tag is gone (two things saying SHIELDED over one building was the failure), so this
   * caption is the ONLY channel left that can say a shielded hall is protected: `CRISIS_STATUSES`
   * has no `shielded` badge, by design, because a shield used to be drawn on the building.
   */
  it("names the hub in ordinary play and replaces that name with one crisis status", () => {
    const withHub = [
      ...PLACED,
      { nodeId: HALL.node_id, col: HALL.col, row: HALL.row, rot: 0 },
    ];
    const boardWith = [...CITY, HALL];

    // Ordinary play carries the landmark nameplate.
    const fair = skillLabelTargets(withHub);
    expect(fair.length).toBe(CITY.length + 1);
    expect(fair.find((target) => target.nodeId === TOWN_HALL_ID)).toMatchObject({
      text: "Town Hall",
      status: null,
      kind: "hub",
      priority: 0,
    });

    // A SHIELDED HALL SAYS SO. `winterShieldedNodeIds` reads the hall's own `shield` field off the
    // engine's building list, so this is a board the live surface can hand over rather than one
    // this test invented — the hall is in that list whenever it is standing on the island.
    const board = boardOf(played(3, [TOWN_HALL_ID], [], boardWith));
    expect(
      board.shieldedNodeIds.has(TOWN_HALL_ID),
      "the fixture never shielded the hall, so the caption below proves nothing",
    ).toBe(true);
    const winter = skillLabelTargets(withHub, board);
    expect(winter.length).toBe(CITY.length + 1);
    expect(new Map(winter.map((t) => [t.nodeId, t.text])).get(TOWN_HALL_ID)).toBe(
      CRISIS_LABEL_TEXT.shielded,
    );
    expect(winter.filter((target) => target.nodeId === TOWN_HALL_ID)).toHaveLength(1);

    // ...and it takes the other states too, rather than being special-cased into one of them: the
    // same hall on a board where the front has reached it reads IN DANGER, and as a ruin, FROZEN.
    const threatened = skillLabelTargets(withHub, boardOf(played(4, [], [], boardWith)));
    expect(new Map(threatened.map((t) => [t.nodeId, t.text])).get(TOWN_HALL_ID)).toBe(
      CRISIS_LABEL_TEXT.threatened,
    );
    const lost = skillLabelTargets(
      withHub,
      boardOf(played(4, [], [TOWN_HALL_ID], boardWith)),
    );
    expect(new Map(lost.map((t) => [t.nodeId, t.text])).get(TOWN_HALL_ID)).toBe(
      CRISIS_LABEL_TEXT.lost,
    );
  });

  it("puts the skill names back the moment the crisis is off the island", () => {
    // The revert is the absence of a board rather than a second code path, which is what makes
    // it impossible to fall out of step with the entry.
    const winter = skillLabelTargets(PLACED, boardOf(played(3, [], [])));
    expect(winter.every((t) => t.status !== null)).toBe(true);
    const after = skillLabelTargets(PLACED, null);
    expect(after.map((t) => t.text)).toEqual(
      PLACED.map((p) => skillLabelTargets([p])[0]?.text),
    );
    expect(after.every((t) => t.status === null)).toBe(true);
  });
});

/** Kept honest: the fixture's frozen set really is the board's, not a literal. */
it("builds its fixtures off the island rather than off a written-down grid", () => {
  const island = hardWinterIsland(CURRENT_ERA_ID);
  const state = played(3, [], []);
  expect(state.frozen.length).toBeGreaterThan(40);
  for (const key of state.frozen) {
    expect(island.rim_depth.has(key), `${key} is not on the island`).toBe(true);
  }
  expect(state.frozen).toContain(winterCellKey(4, -1));
});
