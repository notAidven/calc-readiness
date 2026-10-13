import { describe, expect, it } from "vitest";

import { SUSPENDED_CAPTION } from "../suspendedCivic";
import {
  CRISIS_LABEL_STATES,
  CRISIS_LABEL_TEXT,
  createSkillLabelLayer,
  LABEL_TEXT,
  labelStateFor,
  skillLabelTargets,
} from "./SkillLabels";

/**
 * **A SHUTTERED CIVIC BUILDING SAYS SO, IN THE ORDINARY CITY.**
 *
 * #502 established the channel: while a crisis is on, a building's caption is replaced by its
 * STATUS — `FROZEN` / `SHIELDED` / `IN DANGER` / `SAFE`. A crisis suspension is that same kind
 * of fact about one building and is said the same way, which is the whole of *"find the
 * equivalent rather than inventing new art"*.
 *
 * What is NOT the same is the lifetime, and it is the only reason this needed any new code.
 * Those four are read off a live board and go with the thaw. `CrisisDamage.suspended_civic` is
 * durable damage the city carries afterwards — era four's *"whole durable consequence"* — so
 * it is captioned with no crisis on the island, over a building that has never had a caption
 * in its life.
 *
 * The three things that could go wrong here are the three things asserted:
 *
 *  - **an unsuspended civic building earns nothing**, because a caption over every bought
 *    building would spend the channel saying *nothing is happening here* — `CrisisStatusMarker`
 *    records that ruling for the badge and it is the same one;
 *  - **the word is the one the panel uses**, so the island and the repair panel are one
 *    vocabulary rather than two spellings;
 *  - **it is not a member of `CRISIS_LABEL_TEXT`**, whose census walks a real played board. A
 *    word in that table for a state no board can reach would fail `crisisLabels.test.ts`,
 *    correctly.
 */

const SKILL = { nodeId: "NUM.3", col: -3, row: 2, rot: 0 };
const LODGE = { nodeId: "civic:prehistoric_longhouse:0", col: 2, row: 2, rot: 0 };
const CAMPFIRE = { nodeId: "civic:prehistoric_campfire:1", col: -3, row: -2, rot: 0 };
const PLACED = [SKILL, LODGE, CAMPFIRE];

const NOTHING: ReadonlySet<string> = new Set<string>();
const SHUT: ReadonlySet<string> = new Set([LODGE.nodeId]);

/** A board with nothing on it, for the ranking cases that need a crisis to be running. */
function board(ruined: readonly string[] = [], threatened: readonly string[] = []) {
  return {
    ruinedNodeIds: new Set(ruined),
    shieldedNodeIds: new Set<string>(),
    threatenedNodeIds: new Set(threatened),
  };
}

describe("the caption over a suspended civic building", () => {
  // 2026-08-22: bought civic buildings now carry their own name tag at all times ("add
  // name tags to the civic buildings like the skill buildings do? but smaller"), so a
  // bought building is no longer captionless before a crisis shuts it — it says its own
  // name, in the smaller `civic` style, and a suspension REPLACES that name with
  // `SUSPENDED_CAPTION` rather than being the first caption the building ever earns.
  it("names a bought building smaller until a crisis shuts it, replacing the name", () => {
    const quiet = skillLabelTargets(PLACED, null, NOTHING);
    expect(quiet.map((target) => target.nodeId).sort()).toEqual(
      [SKILL.nodeId, LODGE.nodeId, CAMPFIRE.nodeId].sort(),
    );
    const byNode = new Map(quiet.map((target) => [target.nodeId, target] as const));
    expect(byNode.get(LODGE.nodeId)?.kind).toBe("civic");
    expect(byNode.get(LODGE.nodeId)?.status).toBeNull();
    expect(byNode.get(LODGE.nodeId)?.text.length).toBeGreaterThan(0);
    expect(byNode.get(CAMPFIRE.nodeId)?.kind).toBe("civic");
    expect(byNode.get(CAMPFIRE.nodeId)?.status).toBeNull();
  });

  it("captions the shut one with SUSPENDED, leaves the other bought building named, and keeps the skill name", () => {
    const shut = skillLabelTargets(PLACED, null, SHUT);
    const byNode = new Map(shut.map((target) => [target.nodeId, target] as const));

    expect(byNode.get(LODGE.nodeId)?.text).toBe(SUSPENDED_CAPTION);
    expect(byNode.get(LODGE.nodeId)?.status).toBe("suspended");
    // The Campfire was not shut, so it keeps naming itself exactly as any unsuspended
    // civic building does — a suspension replaces a name, it does not create one.
    expect(byNode.get(CAMPFIRE.nodeId)?.status).toBeNull();
    expect(byNode.get(CAMPFIRE.nodeId)?.text).toBe(
      skillLabelTargets([CAMPFIRE], null, NOTHING)[0]?.text,
    );
    // …and the skill building still names its skill, with no crisis on the island.
    expect(byNode.get(SKILL.nodeId)?.status).toBeNull();
    expect(byNode.get(SKILL.nodeId)?.text).toBe(
      skillLabelTargets([SKILL], null, NOTHING)[0]?.text,
    );
  });

  it("spells it the same word the repair panel does", () => {
    expect(LABEL_TEXT.suspended).toBe(SUSPENDED_CAPTION);
  });

  /**
   * The population census `crisisLabels.test.ts` owns walks a real played board and asserts
   * that every word in `CRISIS_LABEL_TEXT` is reached by some building. `suspended` is reached
   * by no board, because no board holds a suspension — it is durable damage — so putting it
   * in that table would break a guard that is right. This is the other half of that statement,
   * asserted here so the separation is deliberate rather than an omission.
   */
  it("is NOT one of the crisis board's four, which is what keeps that census true", () => {
    expect(Object.keys(CRISIS_LABEL_TEXT)).not.toContain("suspended");
    expect(CRISIS_LABEL_STATES).not.toContain("suspended");
    expect(Object.keys(LABEL_TEXT).sort()).toEqual(
      [...CRISIS_LABEL_STATES, "suspended"].sort(),
    );
  });
});

describe("a suspension against a live crisis board", () => {
  it("keeps saying SUSPENDED where the board would have said SAFE", () => {
    // The case this ranking exists for, and it is reachable: a winter running over a city
    // that already carries a suspension. The frost genuinely is not reaching the shuttered
    // building, so `crisisLabelState` would caption it SAFE — true of the frost and false of
    // the building.
    expect(labelStateFor(LODGE.nodeId, board(), SHUT)).toBe("suspended");
    expect(labelStateFor(LODGE.nodeId, board(), NOTHING)).toBe("safe");
  });

  it("lets a ruin outrank a suspension, because the milder word would be a lie", () => {
    expect(labelStateFor(LODGE.nodeId, board([LODGE.nodeId]), SHUT)).toBe("lost");
  });

  it("leaves every other building's status exactly where the board put it", () => {
    const withSuspension = board([], [SKILL.nodeId]);
    expect(labelStateFor(SKILL.nodeId, withSuspension, SHUT)).toBe("threatened");
    expect(labelStateFor(SKILL.nodeId, withSuspension, NOTHING)).toBe("threatened");
  });
});

describe("the overlay the player actually sees", () => {
  it("puts SUSPENDED in the DOM, on the status plate rather than the quiet one", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const layer = createSkillLabelLayer(host, skillLabelTargets(PLACED, null, SHUT), true);

    const element = layer.elements.get(LODGE.nodeId);
    expect(element?.textContent).toBe(SUSPENDED_CAPTION);
    // The status plate, which is what makes it read as something to act on rather than as a
    // name: heavier, tracked out, and in the state's own tone.
    expect(element?.dataset.labelStatus).toBe("suspended");
    expect(element?.style.fontWeight).toBe("800");
    // The skill building beside it keeps the quiet treatment, so the difference is visible in
    // one frame rather than only in the words.
    expect(layer.elements.get(SKILL.nodeId)?.dataset.labelStatus).toBeUndefined();
    expect(layer.elements.get(SKILL.nodeId)?.style.fontWeight).toBe("600");

    layer.dispose();
    host.remove();
  });
});
